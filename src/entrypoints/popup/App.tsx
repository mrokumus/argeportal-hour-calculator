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
import { calculateRemaining, calculateTime, getMondayOfWeek } from '../../lib/time-utils';
import { t } from '../../lib/i18n';
import { DAILY_TARGET_HOURS, DAILY_CAP_HOURS, REFRESH_INTERVAL_MS } from '../../config';
import { WeekNav } from '../../components/WeekNav/WeekNav';
import { Ring } from '../../components/Ring/Ring';
import { Warning } from '../../components/Warning/Warning';
import { LeaveInputs } from '../../components/LeaveInputs/LeaveInputs';
import { Footer } from '../../components/Footer/Footer';
import styles from './App.module.css';

const DEFAULT_LEAVE: LeaveData = { leave: 0, ooo: 0, autoDetected: true };

const pad = (n: number) => String(n).padStart(2, '0');

function getWeekKey(offset: number): string {
  return getMondayOfWeek(offset).toISOString().slice(0, 10);
}

function formatDuration(h: number, m: number): string {
  if (h > 0 && m > 0) return `${h} ${t('hours')} ${m} ${t('minutes')}`;
  if (h > 0) return `${h} ${t('hours')}`;
  return `${m} ${t('minutes')}`;
}

function formatCompactDuration(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h > 0 && m > 0) return `+${h}:${pad(m)}`;
  if (h > 0) return `+${h} ${t('hoursUnit')}`;
  return `+${m} ${t('minutes')}`;
}

function Row({ k, v, sub, color }: { k: string; v: string; sub?: boolean; color?: string }) {
  return (
    <div className={`${styles.row} ${sub ? styles.rowSub : ''}`}>
      <span className={styles.rowK}>{k}</span>
      <span className={styles.rowV} style={color ? { color } : undefined}>{v}</span>
    </div>
  );
}

export function App() {
  const [booted, setBooted] = useState(false);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [calcMode, setCalcMode] = useState<CalcMode>('sessions');
  const [weekOffset, setWeekOffset] = useState(0);
  const [leaveData, setLeaveData] = useState<LeaveData | null>(null);
  const [leaveWeekKey, setLeaveWeekKey] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [portalStatus, setPortalStatus] = useState<'ok' | 'not-found' | null>(null);
  const [now, setNow] = useState(Date.now());
  const [todayRingPercent, setTodayRingPercent] = useState(false);
  const [weekRingPercent, setWeekRingPercent] = useState(false);
  const [devIndex, setDevIndex] = useState(0);
  const [devLabel, setDevLabel] = useState('');
  const [devActive, setDevActive] = useState(false);

  const weekKey = getWeekKey(weekOffset);

  async function refresh() {
    setRefreshing(true);
    try {
      const res = await requestParse();
      if (res.ok) {
        await saveSnapshot(res.snapshot);
        const storedLeave = await getLeaveData(weekKey);
        setSnapshot(res.snapshot);
        setLeaveData(storedLeave);
        setLeaveWeekKey(weekKey);
        setDevActive(false);
        setDevLabel('');
        setPortalStatus('ok');
      } else {
        setPortalStatus('not-found');
      }
    } catch {
      setPortalStatus('not-found');
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    (async () => {
      const [mode, snap] = await Promise.all([getCalcMode(), getSnapshot()]);
      setCalcMode(mode);
      setSnapshot(snap);
      setBooted(true);
      await refresh();
    })();
  }, []);

  useEffect(() => {
    if (!booted) return;
    let active = true;
    getLeaveData(weekKey).then((d) => {
      if (active) {
        setLeaveData(d);
        setLeaveWeekKey(weekKey);
      }
    });
    return () => {
      active = false;
    };
  }, [booted, weekKey]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), REFRESH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  const result = useMemo(() => {
    if (!snapshot || !leaveData || leaveWeekKey !== weekKey) return null;
    return computeWeekData(snapshot, weekOffset, calcMode, leaveData, dayjs(now));
  }, [snapshot, leaveData, leaveWeekKey, weekKey, weekOffset, calcMode, now]);

  useEffect(() => {
    if (result?.leaveDataChanged && !devActive) {
      saveLeaveData(weekKey, result.data.leaveData);
      setLeaveData(result.data.leaveData);
    }
  }, [result, weekKey, devActive]);

  function handleCalcModeToggle() {
    const next: CalcMode = calcMode === 'sessions' ? 'span' : 'sessions';
    saveCalcMode(next);
    setCalcMode(next);
  }

  function handleLeaveChange(updated: LeaveData) {
    if (!devActive) saveLeaveData(weekKey, updated);
    setLeaveData(updated);
    setLeaveWeekKey(weekKey);
  }

  async function loadNextSample() {
    const { buildDevScenarios } = await import('../../lib/devSamples');
    const scenarios = buildDevScenarios(dayjs());
    const scn = scenarios[devIndex % scenarios.length];
    setWeekOffset(0);
    setSnapshot(scn.snapshot);
    setLeaveData(scn.leave);
    setLeaveWeekKey(getWeekKey(0));
    setPortalStatus('ok');
    setDevLabel(scn.name);
    setDevActive(true);
    setDevIndex((i) => i + 1);
  }

  async function restoreRealData() {
    const currentWeekKey = getWeekKey(0);
    const [snap, leave] = await Promise.all([getSnapshot(), getLeaveData(currentWeekKey)]);
    setWeekOffset(0);
    setSnapshot(snap);
    setLeaveData(leave);
    setLeaveWeekKey(currentWeekKey);
    setDevActive(false);
    setDevLabel('');
    setPortalStatus(null);
  }

  const devBar = import.meta.env.DEV ? (
    <div className={styles.devBar}>
      <button className={styles.devBtn} type="button" onClick={loadNextSample}>
        🧪 Örnek veri
      </button>
      <span className={styles.devLabel}>{devLabel || 'senaryoları gez'}</span>
      {devActive && (
        <button className={styles.devBtn} type="button" onClick={restoreRealData}>
          {t('restoreRealData')}
        </button>
      )}
    </div>
  ) : null;

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
  const cachedAfterFailedRefresh = portalStatus === 'not-found' && !!snapshot && !stale;
  const updatedText = snapshot
    ? t('lastUpdated', {
        t: stale
          ? dayjs(snapshot.capturedAt).format('DD.MM HH:mm')
          : dayjs(snapshot.capturedAt).format('HH:mm'),
      })
    : t('noData');

  const statusBar = (
    <div className={styles.statusBar}>
      <span className={`${styles.stamp} ${stale ? styles.stampStale : cachedAfterFailedRefresh ? styles.stampWarning : ''}`}>
        <span className={`${styles.dot} ${stale ? styles.dotStale : cachedAfterFailedRefresh ? styles.dotWarning : ''}`} />
        {updatedText}
      </span>
      <button className={styles.refresh} type="button" onClick={refresh} disabled={refreshing}>
        {refreshing && <span className={styles.refreshSpinner} />}
        {refreshing ? t('refreshing') : t('refresh')}
      </button>
    </div>
  );

  if (!snapshot || !result) {
    return (
      <div className={styles.app}>
        {statusBar}
        <div className={styles.empty}>
          <span>{portalStatus === 'not-found' ? t('notFoundEmpty') : t('loading')}</span>
        </div>
        {devBar}
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

  // ---- today ring ----
  const todayMin = todayH * 60 + todayM;
  const cappedTodayMin = Math.min(todayMin, DAILY_CAP_HOURS * 60);
  const todayDone = todayRemainingH === 0 && todayRemainingM === 0;
  const hasTodayRing = isCurrentWeek && !!firstRecord && today.isSame(dayjs(firstRecord), 'day');

  // ---- week ring ----
  const weekTotalWithTodayMin = weekTotalMin + cappedTodayMin;
  const wTotalH = weekTotalWithTodayMin / 60;
  const [wh, wm] = calculateTime(weekTotalMin / 60);
  const [wth, wtm] = calculateTime(wTotalH);
  const [rwth, rwtm] = calculateRemaining(wTotalH, true, weekTargetH);
  const [pastRemH, pastRemM] = calculateRemaining(weekTotalMin / 60, true, weekTargetH);
  const weekWorkedMin = isCurrentWeek ? weekTotalWithTodayMin : weekTotalMin;
  const weekPercent = weekTargetH > 0 ? (weekWorkedMin / 60 / weekTargetH) * 100 : 0;
  const [weekRemH, weekRemM] = isCurrentWeek ? [rwth, rwtm] : [pastRemH, pastRemM];
  const weekDone = weekRemH === 0 && weekRemM === 0;
  const weekTimeText = isCurrentWeek ? `${wth}:${pad(wtm)}` : `${wh}:${pad(wm)}`;
  const weekTargetText = `${parseFloat(weekTargetH.toFixed(1))} ${t('hoursUnit')}`;

  // ---- alternative weekly targets (36/27/18) ----
  // On partial weeks (target < 45h) show every alternative below the current
  // target as a group, with "done ✓" for the ones already reached.
  const todayCapacityMins = Math.max(0, DAILY_CAP_HOURS * 60 - todayMin);
  const withExit = (h: number, m: number): string => {
    const base = formatDuration(h, m);
    if (h * 60 + m > todayCapacityMins) return base;
    const exit = today.add(h, 'h').add(m, 'm');
    if (!exit.isSame(today, 'day')) return base;
    return `${base}  (${pad(exit.hour())}:${pad(exit.minute())})`;
  };
  const altTargets =
    isCurrentWeek && weekTargetH < 45
      ? [36, 27, 18]
          .filter((x) => x < weekTargetH)
          .map((x) => {
            const [h, m] = calculateRemaining(wTotalH, true, x);
            return { x, h, m, done: h === 0 && m === 0 };
          })
      : [];

  // ---- exit card ----
  let exitBig = '';
  let exitHint: string | null = null;
  let exitColor = 'var(--text)';
  if (exitRemainingH !== 0 || exitRemainingM !== 0) {
    const lt = today.add(exitRemainingH, 'h').add(exitRemainingM, 'm');
    const exitClock = `${pad(lt.hour())}:${pad(lt.minute())}`;
    exitBig = lt.isSame(today, 'day') ? `~${exitClock}` : t('tomorrowAt', { t: exitClock });
    if (weeklyExitStr) exitHint = t('weekTargetHint', { wt: weeklyExitStr });
  } else {
    exitBig = t('canLeave');
    exitColor = 'var(--accent)';
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

      <div className={`${styles.rings} ${hasTodayRing ? '' : styles.ringsSingle}`}>
        {hasTodayRing && (
          <Ring
            label={t('today')}
            timeText={`${todayH}:${pad(todayM)}`}
            targetText={`${DAILY_TARGET_HOURS} ${t('hoursUnit')}`}
            percent={(todayMin / (DAILY_TARGET_HOURS * 60)) * 100}
            chipText={todayDone ? t('done') : t('remainingChip', { h: todayRemainingH, m: todayRemainingM })}
            chipTone={todayDone ? 'green' : 'amber'}
            showPercent={todayRingPercent}
            onToggle={() => setTodayRingPercent((v) => !v)}
            overflowText={
              todayMin > DAILY_TARGET_HOURS * 60
                ? formatCompactDuration(todayMin - DAILY_TARGET_HOURS * 60)
                : undefined
            }
          />
        )}
        <Ring
          label={isCurrentWeek ? t('thisWeek') : t('weekTotal')}
          timeText={weekTimeText}
          targetText={weekTargetText}
          percent={weekPercent}
          chipText={weekDone ? t('done') : t('remainingChip', { h: weekRemH, m: weekRemM })}
          chipTone={weekDone ? 'green' : 'amber'}
          showPercent={weekRingPercent}
          onToggle={() => setWeekRingPercent((v) => !v)}
          overflowText={
            weekWorkedMin > weekTargetH * 60
              ? formatCompactDuration(weekWorkedMin - weekTargetH * 60)
              : undefined
          }
        />
      </div>

      {hasTodayRing && (
        <div className={styles.exit} title={exitTooltip}>
          <div>
            <div className={styles.exitLabel}>{t('exitTime')}</div>
            {exitHint && <div className={styles.exitHint}>{exitHint}</div>}
            <div className={styles.exitBasis}>{t('exitBasis')}</div>
          </div>
          <div className={styles.exitTime} style={{ color: exitColor }}>{exitBig}</div>
        </div>
      )}

      <div className={styles.rows}>
        {isCurrentWeek ? (
          <>
            {hasTodayRing && <Row k={t('todayPlusWeek')} v={formatDuration(wth, wtm)} />}
            {weekTotalMin > 0 && <Row k={t('completedDays')} v={formatDuration(wh, wm)} />}
            {todayMin > DAILY_TARGET_HOURS * 60 && (() => {
              const [oh, om] = calculateTime(todayMin / 60 - DAILY_TARGET_HOURS);
              return <Row k={t('todayOvertime')} v={`+${formatDuration(oh, om)}`} sub color="var(--muted)" />;
            })()}
            {todayMin > DAILY_CAP_HOURS * 60 && (
              <Row k={t('todayCapNote')} v="11h" sub color="var(--red)" />
            )}
          </>
        ) : (
          <Row
            k={t('target', { h: parseFloat(weekTargetH.toFixed(1)) })}
            v={weekDone ? t('targetDone') : t('targetMissing', { h: weekRemH, m: weekRemM })}
            color={weekDone ? 'var(--accent)' : 'var(--red)'}
          />
        )}
      </div>

      {altTargets.length > 0 && (
        <div className={styles.altCard}>
          <div className={styles.altHead}>{t('altTargets')}</div>
          {altTargets.map(({ x, h, m, done }) => (
            <div key={x} className={styles.altRow}>
              <span className={styles.altK}>{t('forHours', { h: x })}</span>
              <span className={styles.altV} style={done ? { color: 'var(--accent)' } : undefined}>
                {done ? t('altDone') : withExit(h, m)}
              </span>
            </div>
          ))}
        </div>
      )}

      {shortDays.length > 0 && shortDays.map(({ date, mins }) => {
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        const parts = date.split('-');
        return <Warning key={date} text={t('shortDayWarning', { d: `${parts[2]}.${parts[1]}`, h, m })} />;
      })}

      <LeaveInputs key={weekKey} data={leaveData ?? DEFAULT_LEAVE} disabled={refreshing} onLeaveChange={handleLeaveChange} />
      {devBar}
      <Footer />
    </div>
  );
}
