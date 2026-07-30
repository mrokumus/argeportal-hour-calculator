import dayjs from 'dayjs';
import type { ParseResult, Snapshot } from '../types';
import { timeNormalize } from './time-utils';
import { waitForElement } from './dom-watcher';
import { t } from './i18n';
import {
  SELECTOR_MAIN_GRID,
  SELECTOR_FLEX_GRID,
  SELECTOR_PERIOD_SELECT,
  SELECTOR_PDKS_FOLDER,
  MENU_FOLDER_ID,
  MENU_CARD_CLICK_DELAY_MS,
  PERIOD_CHANGE_DELAY_MS,
} from '../config';

const sleep = (ms: number) => new Promise<void>((res) => setTimeout(res, ms));

/**
 * Drive the portal to the "Giriş-Çıkış Bilgileri Kartı" grid if it isn't
 * already shown. All steps are in-page AJAX (no full reload), which is why the
 * whole parse can run inside a single injected content script.
 */
async function openPdksPanel(): Promise<void> {
  const pdksFolderA = Array.from(
    document.querySelectorAll<HTMLAnchorElement>(SELECTOR_PDKS_FOLDER),
  ).find((a) => a.textContent?.includes('PDKS'));

  if (!pdksFolderA) {
    throw new Error(t('pdksMissing'));
  }

  pdksFolderA.click();
  await sleep(MENU_CARD_CLICK_DELAY_MS);

  const pdksUl = document.querySelector<HTMLElement>(`ul#${MENU_FOLDER_ID}`);
  const kartA = pdksUl
    ? Array.from(pdksUl.querySelectorAll<HTMLAnchorElement>('li.EndLineMenu > a')).find((a) =>
        a.textContent?.includes('Giriş-Çıkış'),
      )
    : null;

  if (!kartA) {
    throw new Error(t('pdksCardMissing'));
  }

  kartA.click();
  await waitForElement(SELECTOR_MAIN_GRID);
  await sleep(700);
}

/** Force the period dropdown to the current month if it isn't already there. */
async function ensureCurrentMonthSelected(): Promise<void> {
  const monthSelect = document.querySelector(SELECTOR_PERIOD_SELECT) as HTMLSelectElement | null;
  if (!monthSelect) return;

  const currentMonthText = new Date()
    .toLocaleString('tr-TR', { month: 'long' })
    .toLocaleUpperCase('tr-TR');
  const currentYearShort = String(new Date().getFullYear()).slice(-2);

  const selected = monthSelect.options[monthSelect.selectedIndex];
  if (selected?.textContent?.includes(currentMonthText)) return;

  for (let i = 0; i < monthSelect.options.length; i++) {
    const opt = monthSelect.options[i];
    if (
      opt.textContent?.includes(currentMonthText) &&
      opt.textContent?.includes(currentYearShort)
    ) {
      monthSelect.selectedIndex = i;
      monthSelect.dispatchEvent(new Event('change', { bubbles: true }));
      await sleep(PERIOD_CHANGE_DELAY_MS);
      return;
    }
  }
}

/** Whole-month per-day worked minutes from the monthly totals table (sessions mode). */
function scrapeSessions(rows: NodeListOf<Element>): Record<string, number> {
  const map: Record<string, number> = {};
  rows.forEach((row) => {
    try {
      const [dateStr] = timeNormalize(
        (row.querySelector('td:nth-child(3)') as HTMLElement).innerText,
      );
      const raw = (row.querySelector('td:nth-child(6)') as HTMLElement).innerText;
      const [wh, wm] = raw.split(':');
      const mins = (parseInt(wh) || 0) * 60 + (parseInt(wm) || 0);
      map[dateStr] = (map[dateStr] || 0) + mins;
    } catch {
      // skip malformed rows
    }
  });
  return map;
}

/**
 * Whole-month per-day worked minutes from the raw punch table (span mode):
 * last punch − first punch. Bounded to the selected (current) month so stray
 * rows from adjacent months don't leak in.
 */
function scrapeSpan(
  rows: NodeListOf<Element>,
  monthStart: dayjs.Dayjs,
  monthEnd: dayjs.Dayjs,
): Record<string, number> {
  const dayData: Record<string, { first: number; last: number }> = {};
  rows.forEach((row) => {
    try {
      const raw = (row.querySelector('td:nth-child(6)') as HTMLElement).innerText;
      const [dateStr, timeStr] = timeNormalize(raw);
      if (!timeStr) return;
      const rowDay = dayjs(dateStr);
      if (rowDay.isBefore(monthStart, 'day') || rowDay.isAfter(monthEnd, 'day')) return;
      const [h, m] = timeStr.split(':').map(Number);
      const mins = h * 60 + m;
      if (!dayData[dateStr]) {
        dayData[dateStr] = { first: mins, last: mins };
      } else {
        dayData[dateStr].first = Math.min(dayData[dateStr].first, mins);
        dayData[dateStr].last = Math.max(dayData[dateStr].last, mins);
      }
    } catch {
      // skip malformed rows
    }
  });
  const result: Record<string, number> = {};
  for (const [date, { first, last }] of Object.entries(dayData)) {
    result[date] = Math.max(0, last - first);
  }
  return result;
}

/** First check-in of today from the raw punch table, second-adjusted, as ISO. */
function scrapeFirstRecord(rows: NodeListOf<Element>, today: dayjs.Dayjs): string | null {
  let firstRecord: dayjs.Dayjs | null = null;
  rows.forEach((row) => {
    const rowTime = (row.querySelector('td:nth-child(6)') as HTMLElement | null)?.innerText;
    if (!rowTime) return;
    const [currentDate, currentTime] = timeNormalize(rowTime);
    const time = dayjs(`${currentDate} ${currentTime}`);
    if (today.isSame(time, 'day') && !firstRecord) {
      firstRecord = time.add(time.get('second') > 1 ? 60 - time.get('second') : 1, 'second');
    }
  });
  return firstRecord ? (firstRecord as dayjs.Dayjs).toISOString() : null;
}

/**
 * Parse the ARGEPORTAL page into a serializable Snapshot. Navigates to the PDKS
 * grid and selects the current month first. Returns { ok: false } (rather than
 * throwing) when the page isn't ARGEPORTAL or the grid can't be reached, so the
 * popup can fall back to cached data.
 */
export async function parseSnapshot(): Promise<ParseResult> {
  try {
    const alreadyOpen = !!document.querySelector(SELECTOR_MAIN_GRID);
    if (!alreadyOpen) {
      await openPdksPanel();
    }
    await ensureCurrentMonthSelected();

    const tables = document.querySelectorAll(SELECTOR_FLEX_GRID);
    const [tableOne, tableTwo] = tables;
    if (!tableOne || !tableTwo) {
      return { ok: false, reason: t('selectMonthFirst') };
    }

    const now = dayjs();
    const monthStart = now.startOf('month');
    const monthEnd = now.endOf('month');
    const punchRows = tableOne.querySelectorAll('tbody > tr');

    const snapshot: Snapshot = {
      capturedAt: now.toISOString(),
      capturedDay: now.format('YYYY-MM-DD'),
      firstRecordISO: scrapeFirstRecord(punchRows, now),
      dailyTotalsSessions: scrapeSessions(tableTwo.querySelectorAll('tbody > tr')),
      dailyTotalsSpan: scrapeSpan(punchRows, monthStart, monthEnd),
    };

    return { ok: true, snapshot };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : t('panelFailed') };
  }
}
