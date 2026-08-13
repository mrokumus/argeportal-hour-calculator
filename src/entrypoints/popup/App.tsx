import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import type { CalcMode, LeaveData, Snapshot } from '../../types';
import { computeWeekData } from '../../lib/calc';
import {
  getCalcMode,
  getLeaveData,
  getPortalUrl,
  getSnapshot,
  saveCalcMode,
  saveLeaveData,
  savePortalUrl,
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
const EARLIEST_ENTRY_MINUTES = 4 * 60;
const LATEST_EXIT_MINUTES = 23 * 60 + 59;
const EXIT_STEP_MINUTES = 15;

function timeToMinutes(value: string): number {
  const [hours, minutes] = value.split(':').map(Number);
  return (Number.isFinite(hours) ? hours : 0) * 60 + (Number.isFinite(minutes) ? minutes : 0);
}

function minutesToTime(value: number): string {
  return `${pad(Math.floor(value / 60))}:${pad(value % 60)}`;
}

function clampDesiredExit(value: string, targetMinutes: number): string {
  const earliestExit = EARLIEST_ENTRY_MINUTES + targetMinutes;
  return minutesToTime(Math.min(LATEST_EXIT_MINUTES, Math.max(earliestExit, timeToMinutes(value))));
}

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
  const [plannerDailyTarget, setPlannerDailyTarget] = useState(DAILY_TARGET_HOURS);
  const [desiredExit, setDesiredExit] = useState('15:00');
  const [desiredExitDraft, setDesiredExitDraft] = useState('15:00');
  const [leaveData, setLeaveData] = useState<LeaveData | null>(null);
  const [leaveWeekKey, setLeaveWeekKey] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [portalStatus, setPortalStatus] = useState<'ok' | 'not-found' | null>(null);
  const [now, setNow] = useState(Date.now());
  const [todayRingPercent, setTodayRingPercent] = useState(false);
  const [weekBreakdown, setWeekBreakdown] = useState(false);
  const [devIndex, setDevIndex] = useState(0);
  const [devLabel, setDevLabel] = useState('');
  const [devActive, setDevActive] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [portalUrl, setPortalUrl] = useState('');
  const [portalUrlDraft, setPortalUrlDraft] = useState('');
  const [portalUrlError, setPortalUrlError] = useState(false);

  const weekKey = getWeekKey(0);

  async function refresh(openPortalOnFailure = false) {
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
        if (openPortalOnFailure && portalUrl) await browser.tabs.create({ url: portalUrl });
        if (openPortalOnFailure && !portalUrl) setSettingsOpen(true);
      }
    } catch {
      setPortalStatus('not-found');
      if (openPortalOnFailure && portalUrl) await browser.tabs.create({ url: portalUrl });
      if (openPortalOnFailure && !portalUrl) setSettingsOpen(true);
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    (async () => {
      const [mode, snap, storedPortalUrl] = await Promise.all([
        getCalcMode(), getSnapshot(), getPortalUrl(),
      ]);
      setCalcMode(mode);
      setSnapshot(snap);
      setPortalUrl(storedPortalUrl);
      setPortalUrlDraft(storedPortalUrl);
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
    return computeWeekData(snapshot, 0, calcMode, leaveData, dayjs(now));
  }, [snapshot, leaveData, leaveWeekKey, weekKey, calcMode, now]);

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

  function normalizePortalUrl(value: string): string | null {
    try {
      const parsed = new URL(value.trim());
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;
      return parsed.toString();
    } catch {
      return null;
    }
  }

  async function handleSavePortalUrl() {
    const normalized = normalizePortalUrl(portalUrlDraft);
    if (!normalized) {
      setPortalUrlError(true);
      return;
    }
    await savePortalUrl(normalized);
    setPortalUrl(normalized);
    setPortalUrlDraft(normalized);
    setPortalUrlError(false);
    setSettingsOpen(false);
  }

  function commitDesiredExit(value: string, targetMinutes: number) {
    const next = clampDesiredExit(value, targetMinutes);
    setDesiredExit(next);
    setDesiredExitDraft(next);
  }

  function stepDesiredExit(deltaMinutes: number, targetMinutes: number) {
    const current = timeToMinutes(clampDesiredExit(desiredExit, targetMinutes));
    const next = Math.min(LATEST_EXIT_MINUTES, Math.max(0, current + deltaMinutes));
    commitDesiredExit(minutesToTime(next), targetMinutes);
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
        🧪 Sample data
      </button>
      <span className={styles.devLabel}>{devLabel || 'browse scenarios'}</span>
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
      <div className={styles.statusActions}>
        <button
          className={styles.settingsButton}
          type="button"
          aria-expanded={settingsOpen}
          onClick={() => setSettingsOpen((open) => !open)}
        >
          {t('settings')}
        </button>
        <button className={styles.refresh} type="button" onClick={() => refresh(true)} disabled={refreshing}>
          {refreshing && <span className={styles.refreshSpinner} />}
          {refreshing ? t('refreshing') : t('refresh')}
        </button>
      </div>
    </div>
  );

  const settingsPanel = settingsOpen ? (
    <div className={styles.settingsPanel}>
      <label className={styles.settingsLabel} htmlFor="portal-url">{t('portalUrl')}</label>
      <div className={styles.settingsRow}>
        <input
          id="portal-url"
          type="url"
          placeholder="https://argeportal.example.com/"
          value={portalUrlDraft}
          onChange={(event) => { setPortalUrlDraft(event.target.value); setPortalUrlError(false); }}
          onKeyDown={(event) => { if (event.key === 'Enter') handleSavePortalUrl(); }}
        />
        <button type="button" onClick={handleSavePortalUrl}>{t('save')}</button>
      </div>
      {portalUrlError && <div className={styles.settingsError}>{t('invalidPortalUrl')}</div>}
      <div className={styles.settingsHint}>{t('portalUrlHint')}</div>
    </div>
  ) : null;

  if (!snapshot || !result) {
    return (
      <div className={styles.app}>
        {statusBar}
        {settingsPanel}
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

  const isCurrentWeek = true;
  const today = dayjs(now);

  // ---- today ring ----
  const todayMin = todayH * 60 + todayM;
  const cappedTodayMin = Math.min(todayMin, DAILY_CAP_HOURS * 60);
  const todayDone = todayRemainingH === 0 && todayRemainingM === 0;
  const isWorkday = today.day() >= 1 && today.day() <= 5;
  const hasTodayRing = isCurrentWeek && isWorkday;
  const hasStartedToday = !!firstRecord && today.isSame(dayjs(firstRecord), 'day');

  // ---- week ring ----
  const weekTotalWithTodayMin = weekTotalMin + cappedTodayMin;
  const wTotalH = weekTotalWithTodayMin / 60;
  const [wth, wtm] = calculateTime(wTotalH);
  const [rwth, rwtm] = calculateRemaining(wTotalH, true, weekTargetH);
  const [pastRemH, pastRemM] = calculateRemaining(weekTotalMin / 60, true, weekTargetH);
  const weekWorkedMin = isCurrentWeek ? weekTotalWithTodayMin : weekTotalMin;
  const weekPercent = weekTargetH > 0 ? (weekWorkedMin / 60 / weekTargetH) * 100 : 0;
  const [weekRemH, weekRemM] = isCurrentWeek ? [rwth, rwtm] : [pastRemH, pastRemM];
  const weekDone = weekRemH === 0 && weekRemM === 0;
  const weekTimeText = `${wth}:${pad(wtm)}`;
  const weekTargetText = `${parseFloat(weekTargetH.toFixed(1))} ${t('hoursUnit')}`;
  const dailyTotals = calcMode === 'span' ? snapshot.dailyTotalsSpan : snapshot.dailyTotalsSessions;
  const dayColors = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#f43f5e'];
  const weekDays = Array.from({ length: 5 }, (_, index) => {
    const date = dayjs(getMondayOfWeek(0)).add(index, 'day');
    const isToday = isCurrentWeek && date.isSame(today, 'day');
    const rawMinutes = isToday ? cappedTodayMin : dailyTotals[date.format('YYYY-MM-DD')] || 0;
    const minutes = !isToday && rawMinutes / 60 < 5
      ? 0
      : Math.min(rawMinutes, DAILY_CAP_HOURS * 60);
    return {
      label: t((['mondayShort', 'tuesdayShort', 'wednesdayShort', 'thursdayShort', 'fridayShort'] as const)[index]),
      minutes,
      value: weekTargetH > 0 ? minutes / (weekTargetH * 60) * 100 : 0,
      color: dayColors[index],
    };
  });
  const weekSegments = weekDays.filter((day) => day.value > 0);

  const planningToday = today.day() === 5 && !hasStartedToday;
  const showPlanner = planningToday || (today.day() >= 1 && today.day() <= 4);
  const planningForFriday = planningToday || today.add(1, 'day').day() === 5;
  const weeklyRemainingMinutes = weekRemH * 60 + weekRemM;
  const plannerTargetMinutes = planningForFriday
    ? weeklyRemainingMinutes
    : Math.round(plannerDailyTarget * 60);
  const plannerCanFit = plannerTargetMinutes <= DAILY_CAP_HOURS * 60;
  const boundedDesiredExit = clampDesiredExit(desiredExit, plannerTargetMinutes);
  const [desiredHour, desiredMinute] = boundedDesiredExit.split(':').map(Number);
  const requiredEntry = today
    .hour(Number.isFinite(desiredHour) ? desiredHour : 15)
    .minute(Number.isFinite(desiredMinute) ? desiredMinute : 0)
    .subtract(plannerTargetMinutes, 'minute');

  const monthlyTotalMin = Object.values(dailyTotals).reduce((sum, minutes) => sum + minutes, 0);
  const [monthlyH, monthlyM] = calculateTime(monthlyTotalMin / 60);

  // ---- exit card ----
  let exitBig = '';
  let exitHint: string | null = null;
  let exitColor = 'var(--text)';
  if (weekDone) {
    exitBig = t('weekCompleted');
    exitColor = 'var(--accent)';
  } else if (exitRemainingH !== 0 || exitRemainingM !== 0) {
    const exitBase = snapshot.todayHasOpenSession === false && snapshot.lastRecordISO
      ? dayjs(snapshot.lastRecordISO)
      : today;
    const lt = exitBase.add(exitRemainingH, 'h').add(exitRemainingM, 'm');
    const exitClock = `${pad(lt.hour())}:${pad(lt.minute())}`;
    exitBig = lt.isSame(today, 'day') ? `~${exitClock}` : t('tomorrowAt', { t: exitClock });
    if (weeklyExitStr) exitHint = t('weekTargetHint', { wt: weeklyExitStr });
  } else {
    exitBig = t('canLeave');
    exitColor = 'var(--accent)';
  }
  const exitTooltip = weeklyExitStr
    ? t('exitTimeTipWithWeek', { h: DAILY_TARGET_HOURS, wt: weeklyExitStr })
    : today.day() === 5
      ? t('exitTimeTipFriday')
      : t('exitTimeTip', { h: DAILY_TARGET_HOURS });

  return (
    <div className={styles.app}>
      <WeekNav
        calcMode={calcMode}
        onCalcModeToggle={handleCalcModeToggle}
      />

      {statusBar}
      {settingsPanel}

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
          showPercent={false}
          onToggle={() => setWeekBreakdown((v) => !v)}
          overflowText={
            weekWorkedMin > weekTargetH * 60
              ? formatCompactDuration(weekWorkedMin - weekTargetH * 60)
              : undefined
          }
          segments={weekSegments}
          dayBars={weekDays}
          showBreakdown={weekBreakdown}
        />
      </div>

      {isCurrentWeek && showPlanner && (
        <div className={styles.planner}>
          <div className={styles.plannerTitle}>{t(planningToday ? 'todayPlanner' : 'tomorrowPlanner')}</div>
          <label className={styles.plannerField}>
            <span>{planningForFriday ? t('fridayRemainingTarget') : t('dailyTarget')}</span>
            {planningForFriday ? (
              <strong className={styles.plannerTarget}>{formatDuration(weekRemH, weekRemM)}</strong>
            ) : (
              <span><input type="number" min="1" max={DAILY_CAP_HOURS} step="0.5" value={plannerDailyTarget} onChange={(e) => {
                const value = Math.min(DAILY_CAP_HOURS, Math.max(1, Number(e.target.value) || DAILY_TARGET_HOURS));
                setPlannerDailyTarget(value);
                setDesiredExit((current) => {
                  const next = clampDesiredExit(current, Math.round(value * 60));
                  setDesiredExitDraft(next);
                  return next;
                });
              }} /> {t('hoursUnit')}</span>
            )}
          </label>
          <label className={styles.plannerField}>
            <span>{t(planningToday ? 'todayPlannedExit' : 'tomorrowExit')}</span>
            <span className={styles.timeStepper}>
              <button
                type="button"
                className={styles.timeStepButton}
                aria-label={t('decreaseTime')}
                title={t('decreaseTime')}
                disabled={!plannerCanFit}
                onClick={() => stepDesiredExit(-EXIT_STEP_MINUTES, plannerTargetMinutes)}
              >−</button>
              <input
                className={styles.timeText}
                type="text"
                inputMode="numeric"
                maxLength={5}
                placeholder="15:00"
                aria-label={t(planningToday ? 'todayPlannedExit' : 'tomorrowExit')}
                value={desiredExitDraft}
                disabled={!plannerCanFit}
                onFocus={(e) => e.currentTarget.select()}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9:]/g, '');
                  if (value.length <= 5) setDesiredExitDraft(value);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    stepDesiredExit(EXIT_STEP_MINUTES, plannerTargetMinutes);
                  } else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    stepDesiredExit(-EXIT_STEP_MINUTES, plannerTargetMinutes);
                  }
                }}
                onBlur={() => {
                  const valid = /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(desiredExitDraft);
                  commitDesiredExit(valid ? desiredExitDraft : boundedDesiredExit, plannerTargetMinutes);
                }}
              />
              <button
                type="button"
                className={styles.timeStepButton}
                aria-label={t('increaseTime')}
                title={t('increaseTime')}
                disabled={!plannerCanFit}
                onClick={() => stepDesiredExit(EXIT_STEP_MINUTES, plannerTargetMinutes)}
              >+</button>
            </span>
          </label>
          <div className={styles.requiredEntry}>
            {plannerCanFit
              ? t(planningToday ? 'todayPlannedEntry' : 'tomorrowEntry', { t: `${pad(requiredEntry.hour())}:${pad(requiredEntry.minute())}` })
              : t('cannotFinishFriday')}
          </div>
        </div>
      )}

      {hasStartedToday && (
        <div className={styles.exit} title={exitTooltip}>
          <div>
            <div className={styles.exitLabel}>{weekDone ? t('weekStatus') : t('todayStatus')}</div>
            {exitHint && <div className={styles.exitHint}>{exitHint}</div>}
            <div className={styles.exitBasis}>
              {weekDone || (todayRemainingH === 0 && todayRemainingM === 0)
                ? t('todayTargetCompleted')
                : snapshot.todayHasOpenSession === false
                  ? t('closedExitBasis')
                  : t('exitBasis')}
            </div>
          </div>
          <div className={styles.exitTime} style={{ color: exitColor }}>{exitBig}</div>
        </div>
      )}

      <div className={styles.rows}>
        {isCurrentWeek ? (
          <>
            <Row k={t('weeklyTotal')} v={formatDuration(wth, wtm)} />
            <Row k={t('monthlyTotal')} v={formatDuration(monthlyH, monthlyM)} />
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
