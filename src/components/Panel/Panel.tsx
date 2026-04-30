import { useEffect, useRef, useState } from 'react';
import dayjs from 'dayjs';
import type { LeaveData } from '../../types';
import { useWeekData } from '../../hooks/useWeekData';
import { getLeaveData } from '../../lib/storage';
import { calculateRemaining, calculateTime, getMondayOfWeek, getSundayOfWeek } from '../../lib/time-utils';
import { t } from '../../lib/i18n';
import { waitForElement } from '../../lib/dom-watcher';
import {
  SELECTOR_MAIN_GRID,
  SELECTOR_PDKS_FOLDER,
  SELECTOR_PERIOD_SELECT,
  MENU_FOLDER_ID,
  DAILY_TARGET_HOURS,
  DAILY_CAP_HOURS,
  REFRESH_INTERVAL_MS,
  MENU_CARD_CLICK_DELAY_MS,
  PERIOD_CHANGE_DELAY_MS,
} from '../../config';
import { WeekNav } from '../WeekNav/WeekNav';
import { StatsRow } from '../StatsRow/StatsRow';
import { ProgressBar } from '../ProgressBar/ProgressBar';
import { Warning } from '../Warning/Warning';
import { LeaveInputs } from '../LeaveInputs/LeaveInputs';
import { Footer } from '../Footer/Footer';
import styles from './Panel.module.css';

function getWeekKey(offset: number): string {
  return getMondayOfWeek(offset).toISOString().slice(0, 10);
}

function formatDuration(h: number, m: number): string {
  if (h > 0 && m > 0) return `${h} ${t('hours')} ${m} ${t('minutes')}`;
  if (h > 0) return `${h} ${t('hours')}`;
  return `${m} ${t('minutes')}`;
}

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
      await new Promise<void>((res) => setTimeout(res, PERIOD_CHANGE_DELAY_MS));
      return;
    }
  }
}

async function openPdksPanel(): Promise<void> {
  const pdksFolderA = Array.from(
    document.querySelectorAll<HTMLAnchorElement>(SELECTOR_PDKS_FOLDER),
  ).find((a) => a.textContent?.includes('PDKS'));

  if (!pdksFolderA) {
    throw new Error(t('pdksMissing'));
  }

  pdksFolderA.click();
  await new Promise<void>((res) => setTimeout(res, MENU_CARD_CLICK_DELAY_MS));

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
  await new Promise<void>((res) => setTimeout(res, 700));
}

export function Panel() {
  const panelRef = useRef<HTMLDivElement>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [ready, setReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const monthStart = dayjs().startOf('month');

  const weekKey = getWeekKey(weekOffset);
  const { data, isLoading, run } = useWeekData(weekOffset);

  // Initial panel setup
  useEffect(() => {
    const alreadyOpen = !!document.querySelector(SELECTOR_MAIN_GRID);

    (async () => {
      try {
        if (!alreadyOpen) {
          await openPdksPanel();
        }
        await ensureCurrentMonthSelected();
        setReady(true);
      } catch (err) {
        setInitError(err instanceof Error ? err.message : t('panelFailed'));
      }
    })();
  }, []);

  // Run calculation when ready or weekOffset changes
  useEffect(() => {
    if (ready) run();
  }, [ready, weekOffset]);

  // 60-second auto-refresh for current week
  useEffect(() => {
    if (!ready) return;
    const timer = setInterval(() => {
      if (weekOffset === 0) run();
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [ready, weekOffset]);

  function handleLeaveChange(updated: LeaveData) {
    run(updated);
  }

  if (initError) {
    return (
      <div ref={panelRef} className={styles.panel}>
        <div className={styles.loading}>{initError}</div>
        <Footer />
      </div>
    );
  }

  if (!ready || isLoading || !data) {
    return (
      <div ref={panelRef} className={styles.panel}>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <span>{t('loading')}</span>
        </div>
      </div>
    );
  }

  const {
    weekTargetH,
    todayH,
    todayM,
    todayRemainingH,
    todayRemainingM,
    firstRecord,
    weekTotalMin,
    weeklyExitStr,
    shortDays,
    exitRemainingH,
    exitRemainingM,
    selectMonthWarning,
    leaveData,
  } = data;

  const isCurrentWeek = weekOffset === 0;
  const today = dayjs();

  // Derived weekly values
  const weekTotalWithTodayMin = weekTotalMin + todayH * 60 + todayM;
  const wTotalH = weekTotalWithTodayMin / 60;
  const [wh, wm] = calculateTime(weekTotalMin / 60);
  const [wth, wtm] = calculateTime(wTotalH);
  const [rwth, rwtm] = calculateRemaining(wTotalH, true, weekTargetH);
  const [r36h, r36m] = calculateRemaining(wTotalH, true, 36);
  const [r27h, r27m] = calculateRemaining(wTotalH, true, 27);
  const [r18h, r18m] = calculateRemaining(wTotalH, true, 18);

  const todayCapacityMins = Math.max(0, DAILY_CAP_HOURS * 60 - (todayH * 60 + todayM));
  const withTodayExit = (duration: string, h: number, m: number): string => {
    if (h * 60 + m > todayCapacityMins) return duration;
    const exit = today.add(h, 'h').add(m, 'm');
    if (!exit.isSame(today, 'day')) return duration;
    return `${duration}  (${String(exit.hour()).padStart(2, '0')}:${String(exit.minute()).padStart(2, '0')})`;
  };

  // Exit time value
  let exitValueText = '';
  let exitValueColor = '#111';
  if (exitRemainingH !== 0 || exitRemainingM !== 0) {
    const lt = today.add(exitRemainingH, 'h').add(exitRemainingM, 'm');
    const dailyStr = `~ ${String(lt.hour()).padStart(2, '0')}:${String(lt.minute()).padStart(2, '0')}`;
    exitValueText = weeklyExitStr ? `${dailyStr}  (${t('weekShort')}: ${weeklyExitStr})` : dailyStr;
  } else {
    exitValueText = t('canLeave');
    exitValueColor = '#10b981';
  }

  // Exit tooltip
  const exitTooltip = weeklyExitStr
    ? t('exitTimeTipWithWeek', { wt: weeklyExitStr })
    : today.day() === 5
      ? t('exitTimeTipFriday')
      : t('exitTimeTip');

  return (
    <div ref={panelRef} className={styles.panel}>
      <WeekNav
        weekOffset={weekOffset}
        monthStart={monthStart}
        disabled={isLoading}
        panelRef={panelRef}
        onPrev={() => { if (!isLoading) setWeekOffset((o) => o - 1); }}
        onNext={() => { if (!isLoading) setWeekOffset((o) => o + 1); }}
      />

      {selectMonthWarning && <Warning text={t('selectMonthFirst')} />}

      {/* Today section */}
      {isCurrentWeek && firstRecord && today.isSame(dayjs(firstRecord), 'day') && (
        <>
          <StatsRow label={t('today')} value={formatDuration(todayH, todayM)} />
          <StatsRow
            label={t('todayRemaining')}
            value={formatDuration(todayRemainingH, todayRemainingM)}
            color="#f59e0b"
          />
          {todayH * 60 + todayM > DAILY_TARGET_HOURS * 60 && (() => {
            const [oh, om] = calculateTime((todayH * 60 + todayM) / 60 - DAILY_TARGET_HOURS);
            return (
              <StatsRow
                label={t('todayOvertime')}
                value={`+${formatDuration(oh, om)}`}
                small
                color="#6b7280"
              />
            );
          })()}
          {todayH > DAILY_CAP_HOURS && (
            <StatsRow label={t('todayCapNote')} value="11h" small color="#ef4444" />
          )}
        </>
      )}

      {/* Week section */}
      {weekTotalWithTodayMin > 0 && (
        <>
          <div className={styles.divider} />
          {isCurrentWeek ? (
            <>
              <StatsRow label={t('thisWeek')} value={formatDuration(wh, wm)} />
              <StatsRow label={t('todayPlusWeek')} value={formatDuration(wth, wtm)} />
              <ProgressBar percent={(wTotalH / weekTargetH) * 100} targetH={weekTargetH} />
              <StatsRow
                label={t('weekRemaining')}
                value={rwth === 0 && rwtm === 0 ? t('done') : formatDuration(rwth, rwtm)}
                color={rwth === 0 && rwtm === 0 ? '#10b981' : '#f59e0b'}
              />
              {(r36h > 0 || r36m > 0) && Math.abs(36 - weekTargetH) < 9 && (
                <StatsRow
                  label={t('for36h')}
                  value={withTodayExit(formatDuration(r36h, r36m), r36h, r36m)}
                  small
                />
              )}
              {(r27h > 0 || r27m > 0) && Math.abs(27 - weekTargetH) < 9 && (
                <StatsRow
                  label={t('for27h')}
                  value={withTodayExit(formatDuration(r27h, r27m), r27h, r27m)}
                  small
                />
              )}
              {(r18h > 0 || r18m > 0) && Math.abs(18 - weekTargetH) < 9 && (
                <StatsRow
                  label={t('for18h')}
                  value={withTodayExit(formatDuration(r18h, r18m), r18h, r18m)}
                  small
                />
              )}
            </>
          ) : (
            <>
              <StatsRow label={t('weekTotal')} value={formatDuration(wh, wm)} />
              <ProgressBar percent={(weekTotalMin / 60 / weekTargetH) * 100} targetH={weekTargetH} />
              {(() => {
                const [rwh2, rwm2] = calculateRemaining(weekTotalMin / 60, true, weekTargetH);
                const done = rwh2 === 0 && rwm2 === 0;
                return (
                  <StatsRow
                    label={t('target', { h: weekTargetH })}
                    value={done ? t('targetDone') : t('targetMissing', { h: rwh2, m: rwm2 })}
                    color={done ? '#10b981' : '#ef4444'}
                  />
                );
              })()}
            </>
          )}
        </>
      )}

      {/* Exit time */}
      {isCurrentWeek && firstRecord && (
        <>
          <div className={styles.divider} />
          <div className={styles.exitRow}>
            <div className={styles.exitLabelWrap}>
              <span className={styles.exitLabel}>{t('exitTime')}</span>
              <div className={styles.exitTooltip}>{exitTooltip}</div>
            </div>
            <span className={styles.exitValue} style={{ color: exitValueColor }}>
              {exitValueText}
            </span>
          </div>
        </>
      )}

      {/* Short day warnings */}
      {shortDays.length > 0 && (
        <>
          <div className={styles.divider} />
          {shortDays.map(({ date, mins }) => {
            const h = Math.floor(mins / 60);
            const m = mins % 60;
            const parts = date.split('-');
            const fmtDate = `${parts[2]}.${parts[1]}`;
            return (
              <Warning key={date} text={t('shortDayWarning', { d: fmtDate, h, m })} />
            );
          })}
        </>
      )}

      <LeaveInputs weekKey={weekKey} disabled={isLoading} onLeaveChange={handleLeaveChange} />
      <Footer />
    </div>
  );
}
