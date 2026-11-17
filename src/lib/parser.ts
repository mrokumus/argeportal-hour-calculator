import dayjs from 'dayjs';
import type { DayPunches, ParseResult, Snapshot } from '../types';
import { calculateSessionTotalsFromPunches, mergeSessionTotals, timeNormalize, roundCheckInUp } from './time-utils';
import {
  parseDurationMinutes,
  parsePortalDateTime,
} from './parser-utils';
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
  const matchesPeriod = (option: HTMLOptionElement | undefined) =>
    option?.textContent?.includes(currentMonthText) && option.textContent.includes(currentYearShort);
  if (matchesPeriod(selected)) return;

  for (let i = 0; i < monthSelect.options.length; i++) {
    const opt = monthSelect.options[i];
    if (matchesPeriod(opt)) {
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
      const dateRaw = (row.querySelector('td:nth-child(3)') as HTMLElement | null)?.innerText;
      const durationRaw = (row.querySelector('td:nth-child(6)') as HTMLElement | null)?.innerText;
      if (!dateRaw || !durationRaw) return;

      const [dateStr] = timeNormalize(dateRaw);
      const date = dayjs(dateStr);
      const mins = parseDurationMinutes(durationRaw);
      if (
        !dateStr ||
        !date.isValid() ||
        date.format('YYYY-MM-DD') !== dateStr ||
        mins == null
      ) return;

      map[dateStr] = (map[dateStr] || 0) + mins;
    } catch {
      // skip malformed rows
    }
  });
  return map;
}

function scrapePunches(rows: NodeListOf<Element>, month: dayjs.Dayjs) {
  const byDate: Record<string, dayjs.Dayjs[]> = {};
  rows.forEach(row => {
    try {
      const raw = row.querySelector<HTMLElement>('td:nth-child(6)')?.innerText;
      const punch = raw && parsePortalDateTime(raw);
      if (punch && punch.isSame(month, 'month')) {
        (byDate[punch.format('YYYY-MM-DD')] ??= []).push(punch);
      }
    } catch {
      // Skip malformed rows while retaining the rest of the day's records.
    }
  });

  const punchesByDate: Record<string, DayPunches> = {};
  const spans: Record<string, number> = {};
  const minutesByDate: Record<string, number[]> = {};
  for (const [date, punches] of Object.entries(byDate)) {
    punches.sort((a, b) => a.valueOf() - b.valueOf());
    minutesByDate[date] = punches.map(punch => punch.hour() * 60 + punch.minute());
    const minutes = minutesByDate[date];
    spans[date] = minutes[minutes.length - 1] - minutes[0];
  }

  const sessions = calculateSessionTotalsFromPunches(minutesByDate);
  for (const [date, punches] of Object.entries(byDate)) {
    const open = punches.length % 2 === 1;
    const last = punches[punches.length - 1];
    punchesByDate[date] = {
      entryISO: roundCheckInUp(punches[0]).toISOString(),
      lastISO: (open ? roundCheckInUp(last) : last).toISOString(),
      open,
      completedMinutes: sessions[date] ?? 0,
    };
  }

  return { punchesByDate, sessions, spans };
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
    const { punchesByDate, sessions, spans } = scrapePunches(tableOne.querySelectorAll('tbody > tr'), now);
    const summarySessions = scrapeSessions(tableTwo.querySelectorAll('tbody > tr'));
    for (const date of Object.keys(summarySessions)) {
      if (!dayjs(date).isSame(now, 'month')) delete summarySessions[date];
    }
    const today = punchesByDate[now.format('YYYY-MM-DD')];

    const snapshot: Snapshot = {
      capturedAt: now.toISOString(),
      capturedDay: now.format('YYYY-MM-DD'),
      firstRecordISO: today?.entryISO ?? null,
      lastRecordISO: today?.lastISO ?? null,
      todayHasOpenSession: today?.open ?? false,
      todayCompletedSessionMinutes: today?.completedMinutes ?? 0,
      punchesByDate,
      dailyTotalsSessions: mergeSessionTotals(summarySessions, sessions),
      dailyTotalsSpan: spans,
    };

    return { ok: true, snapshot };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : t('panelFailed') };
  }
}
