import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import type { CalcMode, LeaveData, Snapshot } from '../../types';
import { computeWeekData } from '../../lib/calc';
import {
  getCalcMode,
  getLeaveData,
  getSnapshot,
  saveCalcMode,
  saveLeaveData,
  saveSnapshot,
} from '../../lib/storage';
import { requestParse } from '../../lib/refresh';
import {
  calculateRemaining,
  calculateTime,
  getMondayOfWeek,
} from '../../lib/time-utils';
import { t } from '../../lib/i18n';
import { DAILY_TARGET_HOURS, DAILY_CAP_HOURS, REFRESH_INTERVAL_MS } from '../../config';
import { WeekNav } from '../../components/WeekNav/WeekNav';
import { StatsRow } from '../../components/StatsRow/StatsRow';
import { ProgressBar } from '../../components/ProgressBar/ProgressBar';
import { Warning } from '../../components/Warning/Warning';
import { LeaveInputs } from '../../components/LeaveInputs/LeaveInputs';
import { Footer } from '../../components/Footer/Footer';
import styles from './App.module.css';

const DEFAULT_LEAVE: LeaveData = { leave: 0, ooo: 0, autoDetected: true };

function getWeekKey(offset: number): string {
  return getMondayOfWeek(offset).toISOString().slice(0, 10);
}

function formatDuration(h: number, m: number): string {
  if (h > 0 && m > 0) return `${h} ${t('hours')} ${m} ${t('minutes')}`;
  if (h > 0) return `${h} ${t('hours')}`;
  return `${m} ${t('minutes')}`;
}

export function App() {
  const [booted, setBooted] = useState(false);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [calcMode, setCalcMode] = useState<CalcMode>('sessions');
  const [weekOffset, setWeekOffset] = useState(0);
  const [leaveData, setLeaveData] = useState<LeaveData | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [portalStatus, setPortalStatus] = useState<'ok' | 'not-found' | null>(null);
  const [now, setNow] = useState(Date.now());

  const weekKey = getWeekKey(weekOffset);

  async function refresh() {
    setRefreshing(true);
    const res = await requestParse();
    if (res.ok) {
      await saveSnapshot(res.snapshot);
      setSnapshot(res.snapshot);
      setPortalStatus('ok');
    } else {
      setPortalStatus('not-found');
    }
    setRefreshing(false);
  }

  // Initial load: read cached state, then attempt a fresh parse of the active tab.
  useEffect(() => {
    (async () => {
      const [mode, snap] = await Promise.all([getCalcMode(), getSnapshot()]);
      setCalcMode(mode);
      setSnapshot(snap);
      setBooted(true);
      await refresh();
    })();
  }, []);

  // Load the leave/OOO record for whichever week is shown.
  useEffect(() => {
    if (!booted) return;
    let active = true;
    getLeaveData(weekKey).then((d) => {
      if (active) setLeaveData(d);
    });
    return () => {
      active = false;
    };
  }, [booted, weekKey]);

  // Tick every minute so "today" keeps counting while the popup is open.
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), REFRESH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  const result = useMemo(() => {
    if (!snapshot || !leaveData) return null;
    return computeWeekData(snapshot, weekOffset, calcMode, leaveData, dayjs(now));
  }, [snapshot, leaveData, weekOffset, calcMode, now]);

  // Persist auto-detected leave changes back to storage.
  useEffect(() => {
    if (result?.leaveDataChanged) {
      saveLeaveData(weekKey, result.data.leaveData);
      setLeaveData(result.data.leaveData);
    }
  }, [result, weekKey]);

  function handleCalcModeToggle() {
    const next: CalcMode = calcMode === 'sessions' ? 'span' : 'sessions';
    saveCalcMode(next);
    setCalcMode(next);
  }

  function handleLeaveChange(updated: LeaveData) {
    saveLeaveData(weekKey, updated);
    setLeaveData(updated);
  }

  if (!booted) {
    return (
      <div className={styles.app}>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <span>{t('loading')}</span>
        </div>
      </div>
    );
  }

  const stale = snapshot ? snapshot.capturedDay !== dayjs(now).format('YYYY-MM-DD') : false;
  const updatedText = snapshot
    ? stale
      ? t('lastUpdated', { t: dayjs(snapshot.capturedAt).format('DD.MM HH:mm') })
      : t('lastUpdated', { t: dayjs(snapshot.capturedAt).format('HH:mm') })
    : '';

  const statusBar = (
    <div className={styles.statusBar}>
      <span className={`${styles.updated} ${stale ? styles.updatedStale : ''}`}>
        {snapshot ? updatedText : t('noData')}
      </span>
      <button className={styles.refreshBtn} onClick={refresh} disabled={refreshing}>
        {refreshing && <span className={styles.refreshSpinner} />}
        {refreshing ? t('refreshing') : t('refresh')}
      </button>
    </div>
  );

  // No snapshot at all — nothing to show but a prompt to open ARGEPORTAL.
  if (!snapshot || !result) {
    return (
      <div className={styles.app}>
        {statusBar}
        <div className={styles.empty}>
          <span>{portalStatus === 'not-found' ? t('notFoundEmpty') : t('loading')}</span>
        </div>
        <Footer />
      </div>
    );
  }

  const data = result.data;
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
  } = data;

  const isCurrentWeek = weekOffset === 0;
  const today = dayjs(now);
  const monthStart = today.startOf('month');

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

  const exitTooltip = weeklyExitStr
    ? t('exitTimeTipWithWeek', { wt: weeklyExitStr })
    : today.day() === 5
      ? t('exitTimeTipFriday')
      : t('exitTimeTip');

  return (
    <div className={styles.app}>
      <WeekNav
        weekOffset={weekOffset}
        monthStart={monthStart}
        disabled={refreshing}
        calcMode={calcMode}
        onCalcModeToggle={handleCalcModeToggle}
        onPrev={() => { if (!refreshing) setWeekOffset((o) => o - 1); }}
        onNext={() => { if (!refreshing) setWeekOffset((o) => o + 1); }}
      />

      {statusBar}

      {stale && <Warning text={t('staleWarning')} />}
      {portalStatus === 'not-found' && !stale && <Warning text={t('notFoundCached')} />}

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
            return <Warning key={date} text={t('shortDayWarning', { d: fmtDate, h, m })} />;
          })}
        </>
      )}

      <LeaveInputs key={weekKey} data={leaveData ?? DEFAULT_LEAVE} disabled={refreshing} onLeaveChange={handleLeaveChange} />
      <Footer />
    </div>
  );
}
