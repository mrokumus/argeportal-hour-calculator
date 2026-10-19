import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import type { AppSettings, CalcMode, LeaveData, Snapshot } from '../../types';
import { computeWeekData, getWeeklyStatus, getPreviousWeekSummary } from '../../lib/calc';
import {
  getCalcMode,
  getLeaveData,
  getPortalUrl,
  getSettings,
  getSnapshot,
  saveCalcMode,
  saveLeaveData,
  savePortalUrl,
  saveSettings,
  saveSnapshot,
} from '../../lib/storage';
import { requestParse } from '../../lib/refresh';
import { calculateRemaining, calculateTime, getMondayOfWeek, roundCheckInUp } from '../../lib/time-utils';
import { setLocale, t, formatDateRange } from '../../lib/i18n';
import { DEFAULT_SETTINGS, REFRESH_INTERVAL_MS } from '../../config';
import { Warning } from '../../components/Warning/Warning';
import { DailyOooEditor } from '../../components/DailyOooEditor/DailyOooEditor';
import { getDailyOoo, getDailyCap, getWeekOoo } from '../../lib/ooo';
import { LeaveInputs } from '../../components/LeaveInputs/LeaveInputs';
import { Footer } from '../../components/Footer/Footer';
import styles from './App.module.css';

const DEFAULT_LEAVE: LeaveData = { leave: 0, ooo: 0, autoDetected: true };

const pad = (n: number) => String(n).padStart(2, '0');
const EXIT_STEP_MINUTES = 15;

const initialSettings = (): AppSettings => ({
  ...DEFAULT_SETTINGS,
  workdays: [...DEFAULT_SETTINGS.workdays],
});

function timeToMinutes(value: string): number {
  const [hours, minutes] = value.split(':').map(Number);
  return (Number.isFinite(hours) ? hours : 0) * 60 + (Number.isFinite(minutes) ? minutes : 0);
}

function minutesToTime(value: number): string {
  return `${pad(Math.floor(value / 60))}:${pad(value % 60)}`;
}

function clampDesiredExit(value: string, targetMinutes: number, settings: AppSettings): string {
  const earliestExit = Math.max(
    timeToMinutes(settings.earliestExit),
    timeToMinutes(settings.earliestEntry) + targetMinutes,
  );
  const latestExit = timeToMinutes(settings.latestExit);
  return minutesToTime(Math.min(latestExit, Math.max(earliestExit, timeToMinutes(value))));
}

function getWeekKey(offset: number): string {
  return getMondayOfWeek(offset).toISOString().slice(0, 10);
}

function formatWeekRange(): string {
  const monday = dayjs(getMondayOfWeek(0));
  const sunday = monday.add(6, 'day');
  return `${monday.format('DD.MM')} – ${sunday.format('DD.MM')}`;
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

export function App() {
  const [booted, setBooted] = useState(false);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [calcMode, setCalcMode] = useState<CalcMode>('sessions');
  const [settings, setSettings] = useState<AppSettings>(initialSettings);
  const [settingsDraft, setSettingsDraft] = useState<AppSettings>(initialSettings);
  const [plannerDailyTarget, setPlannerDailyTarget] = useState(DEFAULT_SETTINGS.dailyTargetMinutes / 60);
  const [desiredExit, setDesiredExit] = useState<string>(DEFAULT_SETTINGS.earliestExit);
  const [desiredExitDraft, setDesiredExitDraft] = useState<string>(DEFAULT_SETTINGS.earliestExit);
  const [leaveData, setLeaveData] = useState<LeaveData | null>(null);
  const [previousLeave, setPreviousLeave] = useState<{ key: string; data: LeaveData } | null>(null);
  const [leaveWeekKey, setLeaveWeekKey] = useState<string | null>(null);
  const [oooDate, setOooDate] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [portalStatus, setPortalStatus] = useState<'ok' | 'not-found' | null>(null);
  const [now, setNow] = useState(Date.now());
  const [devIndex, setDevIndex] = useState(0);
  const [devLabel, setDevLabel] = useState('');
  const [devActive, setDevActive] = useState(false);
  const [devNow, setDevNow] = useState<number | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [portalUrl, setPortalUrl] = useState('');
  const [portalUrlDraft, setPortalUrlDraft] = useState('');
  const [portalUrlError, setPortalUrlError] = useState(false);
  const [settingsError, setSettingsError] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);

  const effectiveNow = devNow ?? now;
  const weekKey = getWeekKey(0);
  const previousWeekKey = getWeekKey(-1);

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
        setDevNow(null);
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
      const [mode, snap, storedPortalUrl, storedSettings] = await Promise.all([
        getCalcMode(), getSnapshot(), getPortalUrl(), getSettings(),
      ]);
      setCalcMode(mode);
      setSnapshot(snap);
      setPortalUrl(storedPortalUrl);
      setPortalUrlDraft(storedPortalUrl);
      setLocale(storedSettings.locale);
      setSettings(storedSettings);
      setSettingsDraft(storedSettings);
      setPlannerDailyTarget(storedSettings.dailyTargetMinutes / 60);
      setDesiredExit(storedSettings.earliestExit);
      setDesiredExitDraft(storedSettings.earliestExit);
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
    let active = true;
    if (booted && !devActive) {
      getLeaveData(previousWeekKey).then(data => {
        if (active) setPreviousLeave({ key: previousWeekKey, data });
      });
    }
    return () => { active = false; };
  }, [booted, previousWeekKey, devActive]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), REFRESH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  const result = useMemo(() => {
    if (!snapshot || !leaveData || leaveWeekKey !== weekKey) return null;
    return computeWeekData(
      snapshot,
      0,
      calcMode,
      leaveData,
      dayjs(effectiveNow),
      settings.dailyTargetMinutes / 60,
      settings,
    );
  }, [snapshot, leaveData, leaveWeekKey, weekKey, calcMode, effectiveNow, settings]);

  useEffect(() => {
    if (result?.leaveDataChanged && !devActive) {
      saveLeaveData(weekKey, result.data.leaveData);
      setLeaveData(result.data.leaveData);
    }
  }, [result, weekKey, devActive]);

  function normalizePortalUrl(value: string): string | null {
    try {
      const parsed = new URL(value.trim());
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;
      return parsed.toString();
    } catch {
      return null;
    }
  }

  async function handleSaveAllSettings(closeAfterSave = false): Promise<boolean> {
    const portalUrlValue = portalUrlDraft.trim();
    const normalized = portalUrlValue ? normalizePortalUrl(portalUrlValue) : '';
    if (normalized === null) {
      setPortalUrlError(true);
      return false;
    }
    const earliestEntryMinutes = timeToMinutes(settingsDraft.earliestEntry);
    const latestExitMinutes = timeToMinutes(settingsDraft.latestExit);
    const earliestExitMinutes = timeToMinutes(settingsDraft.earliestExit);
    const validTimes = earliestEntryMinutes < latestExitMinutes
      && earliestExitMinutes > earliestEntryMinutes
      && earliestExitMinutes <= latestExitMinutes;
    const validDurations = settingsDraft.shortDayThresholdMinutes <= settingsDraft.dailyTargetMinutes
      && settingsDraft.dailyTargetMinutes <= settingsDraft.dailyCapMinutes;
    if (!validTimes || !validDurations || settingsDraft.workdays.length === 0) {
      setSettingsError(true);
      return false;
    }
    const nextSettings = { ...settingsDraft, workdays: [...settingsDraft.workdays] };
    await Promise.all([savePortalUrl(normalized), saveSettings(nextSettings)]);
    setPortalUrl(normalized);
    setPortalUrlDraft(normalized);
    setLocale(nextSettings.locale);
    setSettings(nextSettings);
    setPlannerDailyTarget(nextSettings.dailyTargetMinutes / 60);
    setDesiredExit(nextSettings.earliestExit);
    setDesiredExitDraft(nextSettings.earliestExit);
    setPortalUrlError(false);
    setSettingsError(false);
    setSettingsSaved(true);
    if (closeAfterSave) setSettingsOpen(false);
    return true;
  }

  function commitDesiredExit(value: string, targetMinutes: number) {
    const next = clampDesiredExit(value, targetMinutes, settings);
    setDesiredExit(next);
    setDesiredExitDraft(next);
  }

  function stepDesiredExit(deltaMinutes: number, targetMinutes: number) {
    const current = timeToMinutes(clampDesiredExit(desiredExit, targetMinutes, settings));
    const next = Math.min(timeToMinutes(settings.latestExit), Math.max(0, current + deltaMinutes));
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
    setDevNow(dayjs(scn.nowISO).valueOf());
    setDevIndex((i) => i + 1);
  }

  async function restoreRealData() {
    const currentWeekKey = getWeekKey(0);
    const [snap, leave] = await Promise.all([getSnapshot(), getLeaveData(currentWeekKey)]);
    setSnapshot(snap);
    setLeaveData(leave);
    setLeaveWeekKey(currentWeekKey);
    setDevActive(false);
    setDevNow(null);
    setDevLabel('');
    setPortalStatus(null);
  }

  const devBar = (import.meta.env.DEV || import.meta.env.MODE === 'test') ? (
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

  const stale = snapshot ? snapshot.capturedDay !== dayjs(effectiveNow).format('YYYY-MM-DD') : false;
  const cachedAfterFailedRefresh = portalStatus === 'not-found' && !!snapshot && !stale;
  const updatedText = snapshot
    ? t('lastUpdated', {
        t: stale
          ? dayjs(snapshot.capturedAt).format('DD.MM HH:mm')
          : dayjs(snapshot.capturedAt).format('HH:mm'),
      })
    : t('noData');

  const dashboardHeader = (
    <header className={styles.appHeader}>
      <div className={styles.headerCopy}>
        <strong>{t('thisWeek')}</strong>
        <span className={`${stale ? styles.stampStale : cachedAfterFailedRefresh ? styles.stampWarning : ''}`}>
          {formatWeekRange()} · {updatedText}
        </span>
      </div>
      <div className={styles.headerActions}>
        <button
          className={styles.settingsButton}
          type="button"
          aria-expanded={settingsOpen}
          onClick={() => {
            setSettingsSaved(false);
            if (settingsOpen) {
              void handleSaveAllSettings(true);
            } else {
              setSettingsDraft({ ...settings, workdays: [...settings.workdays] });
              setPortalUrlDraft(portalUrl);
              setSettingsOpen(true);
            }
          }}
        >
          {t('settings')}
        </button>
        <button className={styles.refresh} type="button" onClick={() => refresh(true)} disabled={refreshing}>
          {refreshing && <span className={styles.refreshSpinner} />}
          {refreshing ? t('refreshing') : t('refresh')}
        </button>
      </div>
    </header>
  );

  if (settingsOpen) {
    const durationFields: Array<{ key: 'shortDayThresholdMinutes' | 'dailyTargetMinutes' | 'dailyCapMinutes'; label: 'minimumDailyHours' | 'dashboardDailyTarget' | 'maximumDailyHours'; hint: 'minimumDailyHoursHint' | 'dailyTargetHint' | 'maximumDailyHoursHint' }> = [
      { key: 'shortDayThresholdMinutes', label: 'minimumDailyHours', hint: 'minimumDailyHoursHint' },
      { key: 'dailyTargetMinutes', label: 'dashboardDailyTarget', hint: 'dailyTargetHint' },
      { key: 'dailyCapMinutes', label: 'maximumDailyHours', hint: 'maximumDailyHoursHint' },
    ];
    const weekdays = [
      { value: 1, label: t('mondayShort') },
      { value: 2, label: t('tuesdayShort') },
      { value: 3, label: t('wednesdayShort') },
      { value: 4, label: t('thursdayShort') },
      { value: 5, label: t('fridayShort') },
      { value: 6, label: t('saturdayShort') },
      { value: 0, label: t('sundayShort') },
    ];

    return (
      <div className={`${styles.app} ${styles.settingsApp}`}>
        <header className={styles.appHeader}>
          <div className={styles.headerCopy}>
            <strong>{t('settingsTitle')}</strong>
            <span>{t('settingsIntro')}</span>
          </div>
          <button className={styles.settingsButton} type="button" onClick={() => void handleSaveAllSettings(true)}>
            {t('dashboard')}
          </button>
        </header>
        <main className={styles.settingsPage}>
          <section className={styles.settingsSection}>
            <h2>{t('workRules')}</h2>
            <div className={styles.settingsGrid}>
              {durationFields.map((field) => (
                <label className={styles.settingsField} key={field.key}>
                  <span>{t(field.label)}</span>
                  <input
                    type="time"
                    step={900}
                    value={minutesToTime(settingsDraft[field.key])}
                    onChange={(event) => {
                      setSettingsDraft((current) => ({ ...current, [field.key]: timeToMinutes(event.target.value) }));
                      setSettingsError(false);
                      setSettingsSaved(false);
                    }}
                  />
                  <small>{t(field.hint)}</small>
                </label>
              ))}
            </div>
          </section>

          <section className={styles.settingsSection}>
            <h2>{t('plannerLimits')}</h2>
            <div className={styles.settingsGrid}>
              <label className={styles.settingsField}>
                <span>{t('earliestEntry')}</span>
                <input
                  type="time"
                  step={900}
                  value={settingsDraft.earliestEntry}
                  onChange={(event) => setSettingsDraft((current) => ({ ...current, earliestEntry: event.target.value }))}
                />
              </label>
              <label className={styles.settingsField}>
                <span>{t('latestExit')}</span>
                <input
                  type="time"
                  step={900}
                  value={settingsDraft.latestExit}
                  onChange={(event) => setSettingsDraft((current) => ({ ...current, latestExit: event.target.value }))}
                />
              </label>
              <label className={styles.settingsField}>
                <span>{t('earliestExit')}</span>
                <input
                  type="time"
                  step={900}
                  value={settingsDraft.earliestExit}
                  onChange={(event) => setSettingsDraft((current) => ({ ...current, earliestExit: event.target.value }))}
                />
              </label>
            </div>

            <div className={styles.settingsFieldWide}>
              <span>{t('workdays')}</span>
              <div className={styles.dayChoices}>
                {weekdays.map((day) => (
                  <label key={day.value} className={settingsDraft.workdays.includes(day.value) ? styles.dayChoiceActive : ''}>
                    <input
                      type="checkbox"
                      checked={settingsDraft.workdays.includes(day.value)}
                      onChange={() => setSettingsDraft((current) => ({
                        ...current,
                        workdays: current.workdays.includes(day.value)
                          ? current.workdays.filter((value) => value !== day.value)
                          : [...current.workdays, day.value].sort(),
                      }))}
                    />
                    {day.label}
                  </label>
                ))}
              </div>
            </div>

            <label className={styles.toggleField}>
              <span>
                <strong>{t('autoDetectLeave')}</strong>
                <small>{t('autoDetectLeaveHint')}</small>
              </span>
              <input
                type="checkbox"
                checked={settingsDraft.autoDetectLeave}
                onChange={(event) => setSettingsDraft((current) => ({ ...current, autoDetectLeave: event.target.checked }))}
              />
            </label>
          </section>

          <section className={styles.settingsSection}>
            <h2>{t('connection')}</h2>
            <label className={styles.settingsFieldWide}>
              <span>{t('language')}</span>
              <select
                value={settingsDraft.locale}
                onChange={(event) => {
                  setSettingsDraft((current) => ({
                    ...current,
                    locale: event.target.value as AppSettings['locale'],
                  }));
                  setSettingsSaved(false);
                }}
              >
                <option value="auto">{t('languageAuto')}</option>
                <option value="tr">{t('languageTurkish')}</option>
                <option value="en">{t('languageEnglish')}</option>
              </select>
            </label>
            <label className={styles.settingsFieldWide}>
              <span>{t('calculationMethod')}</span>
              <select value={calcMode} onChange={(event) => {
                const next = event.target.value as CalcMode;
                setCalcMode(next);
                saveCalcMode(next);
              }}>
                <option value="sessions">{t('calcModeSessionsLabel')}</option>
                <option value="span">{t('calcModeSpanLabel')}</option>
              </select>
            </label>
            <label className={styles.settingsFieldWide} htmlFor="portal-url">
              <span>{t('portalUrl')}</span>
              <input
                id="portal-url"
                type="url"
                placeholder="https://argeportal.example.com/"
                value={portalUrlDraft}
                onChange={(event) => { setPortalUrlDraft(event.target.value); setPortalUrlError(false); setSettingsSaved(false); }}
              />
              <small>{t('portalUrlHint')}</small>
            </label>
            {portalUrlError && <div className={styles.settingsError}>{t('invalidPortalUrl')}</div>}
            {settingsError && <div className={styles.settingsError}>{t('invalidSettings')}</div>}
            {settingsSaved && <div className={styles.settingsSuccess}>{t('settingsSaved')}</div>}
          </section>

        </main>
        <div className={styles.settingsFooter}>
          <button type="button" className={styles.resetButton} onClick={() => {
            setSettingsDraft(initialSettings());
            setSettingsError(false);
            setSettingsSaved(false);
          }}>{t('restoreDefaults')}</button>
          <button type="button" className={styles.saveButton} onClick={() => void handleSaveAllSettings(true)}>{t('save')}</button>
        </div>
        <Footer />
      </div>
    );
  }

  if (!snapshot || !result) {
    return (
      <div className={styles.app}>
        {dashboardHeader}
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
    validWorkdays,
    monthlyTotalMin,
    todayWorkedMinutes,
    todayRemainingMinutesExact,
    weeklyRemainingMinutesExact,
    todayH,
    todayM,
    todayRemainingH,
    todayRemainingM,
    firstRecord,
    weekTotalMin,
    weekTotalWithTodayMin,
    weeklyRemainingMinutes,
    shortDays,
  } = data;

  const isCurrentWeek = true;
  const today = dayjs(effectiveNow);
  const dailyTargetMin = settings.dailyTargetMinutes;
  const dailyCapMin = getDailyCap(settings.dailyCapMinutes, data.leaveData, today.format('YYYY-MM-DD'));

  // ---- today ring ----
  const todayMin = todayH * 60 + todayM;
  const cappedTodayMin = Math.min(todayMin, dailyCapMin);
  const todayDone = todayRemainingH === 0 && todayRemainingM === 0;
  const isWorkday = settings.workdays.includes(today.day());
  const hasTodayRing = isCurrentWeek && isWorkday;
  const hasStartedToday = !!firstRecord && today.isSame(dayjs(firstRecord), 'day');

  // ---- week ring ----
  const wTotalH = weekTotalWithTodayMin / 60;
  const [wth, wtm] = calculateTime(wTotalH);
  const [rwth, rwtm] = calculateRemaining(wTotalH, true, weekTargetH);
  const [pastRemH, pastRemM] = calculateRemaining(weekTotalMin / 60, true, weekTargetH);
  const [weekRemH, weekRemM] = isCurrentWeek ? [rwth, rwtm] : [pastRemH, pastRemM];
  const weekDone = weekRemH === 0 && weekRemM === 0;
  const weekTimeText = `${wth}:${pad(wtm)}`;
  const weekTargetText = minutesToTime(Math.round(weekTargetH * 60));
  const previousWeek = getPreviousWeekSummary(snapshot, today, calcMode, settings,
    previousLeave?.key === previousWeekKey && !devActive ? previousLeave.data : undefined);
  const dailyTotals = calcMode === 'span' ? snapshot.dailyTotalsSpan : snapshot.dailyTotalsSessions;
  const weekDayDefinitions = [
    { day: 1, label: 'mondayShort' as const },
    { day: 2, label: 'tuesdayShort' as const },
    { day: 3, label: 'wednesdayShort' as const },
    { day: 4, label: 'thursdayShort' as const },
    { day: 5, label: 'fridayShort' as const },
    { day: 6, label: 'saturdayShort' as const },
    { day: 0, label: 'sundayShort' as const },
  ];
  const weekDayFullLabels = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
  ] as const;
  const weekDays = weekDayDefinitions
    .filter(({ day }) => settings.workdays.includes(day))
    .map((definition) => {
      const offset = definition.day === 0 ? 6 : definition.day - 1;
      const date = dayjs(getMondayOfWeek(0)).add(offset, 'day');
      const isToday = date.isSame(today, 'day');
      const dateKey = date.format('YYYY-MM-DD');
      const rawMinutes = isToday ? cappedTodayMin : dailyTotals[dateKey] || 0;
      const ooo = getDailyOoo(data.leaveData, dateKey);
      return {
        label: t(definition.label),
        date: dateKey,
        ooo,
        editable: date.isSame(today, 'month'),
        minutes: Math.min(rawMinutes, getDailyCap(settings.dailyCapMinutes, data.leaveData, dateKey)),
        isPast: date.isBefore(today, 'day'),
        isToday,
        isLeave: date.isBefore(today, 'day')
          && date.isSame(today, 'month')
          && rawMinutes < settings.shortDayThresholdMinutes,
      };
    });

  const workdayOffsets = settings.workdays.map((day) => day === 0 ? 6 : day - 1);
  const lastWorkdayOffset = Math.max(...workdayOffsets);
  const todayOffset = today.day() === 0 ? 6 : today.day() - 1;
  const planningToday = isWorkday
    && !hasStartedToday
    && todayOffset === lastWorkdayOffset;
  const tomorrow = today.add(1, 'day');
  const tomorrowOffset = tomorrow.day() === 0 ? 6 : tomorrow.day() - 1;
  const tomorrowIsWorkday = settings.workdays.includes(tomorrow.day())
    && tomorrowOffset > todayOffset;
  const showPlanner = planningToday || tomorrowIsWorkday;
  const plannedDate = planningToday ? today : tomorrow;
  const plannedDayLabel = t(weekDayFullLabels[plannedDate.day()]);
  const plannedDayOffset = plannedDate.day() === 0 ? 6 : plannedDate.day() - 1;
  const planningForWeekCompletion = plannedDayOffset === lastWorkdayOffset;
  const expectedAdditionalToday = !planningToday
    && isWorkday
    && (!hasStartedToday || snapshot.todayHasOpenSession !== false)
    ? Math.max(0, dailyTargetMin - cappedTodayMin)
    : 0;
  const plannerTargetMinutes = planningForWeekCompletion
    ? Math.max(0, weeklyRemainingMinutes - expectedAdditionalToday)
    : Math.round(plannerDailyTarget * 60);
  const plannerCapMin = getDailyCap(settings.dailyCapMinutes, data.leaveData, plannedDate.format('YYYY-MM-DD'));
  const plannerCanFit = plannerTargetMinutes <= plannerCapMin
    && timeToMinutes(settings.earliestEntry) + plannerTargetMinutes <= timeToMinutes(settings.latestExit);
  const boundedDesiredExit = clampDesiredExit(desiredExit, plannerTargetMinutes, settings);
  const [desiredHour, desiredMinute] = boundedDesiredExit.split(':').map(Number);
  const requiredEntry = today
    .hour(Number.isFinite(desiredHour) ? desiredHour : 15)
    .minute(Number.isFinite(desiredMinute) ? desiredMinute : 0)
    .subtract(plannerTargetMinutes, 'minute');
  const requiredEntryTime = `${pad(requiredEntry.hour())}:${pad(requiredEntry.minute())}`;

  const [monthlyH, monthlyM] = calculateTime(monthlyTotalMin / 60);

  let dailyCapTimeText: string | undefined;
  if (
    hasStartedToday
    && snapshot.todayHasOpenSession !== false
    && dailyCapMin > dailyTargetMin
  ) {
    const remainingToCap = Math.max(0, dailyCapMin - todayWorkedMinutes);
    if (remainingToCap === 0) {
      dailyCapTimeText = t('dailyMaximumReached', {
        h: formatDuration(Math.floor(dailyCapMin / 60), dailyCapMin % 60),
      });
    } else {
      const capTime = roundCheckInUp(today.add(Math.round(remainingToCap * 60_000), 'millisecond'));
      dailyCapTimeText = t('dailyMaximumAt', {
        h: formatDuration(Math.floor(dailyCapMin / 60), dailyCapMin % 60),
        t: `${pad(capTime.hour())}:${pad(capTime.minute())}`,
      });
    }
  }

  let compactTodayStatus = t('targetCompleteCompact');
  if (snapshot.todayHasOpenSession === false) {
    compactTodayStatus = t('checkedOutCompact');
  } else if (todayRemainingH !== 0 || todayRemainingM !== 0) {
    const lt = roundCheckInUp(today.add(Math.round(todayRemainingMinutesExact * 60_000), 'millisecond'));
    const exitClock = `${pad(lt.hour())}:${pad(lt.minute())}`;
    compactTodayStatus = lt.isSame(today, 'day')
      ? t('compactExitTime', { t: exitClock })
      : t('tomorrowAt', { t: exitClock });
  }

  const weeklyState = getWeeklyStatus(today, weeklyRemainingMinutesExact, todayWorkedMinutes,
    hasStartedToday && snapshot.todayHasOpenSession !== false, { ...settings, dailyCapMinutes: dailyCapMin });
  const weeklyCompletionTime = weeklyState.kind === 'finish' ? weeklyState.time : null;
  let weeklyStatus: string | null = null;
  switch (weeklyState.kind) {
    case 'complete': weeklyStatus = t('canLeave'); break;
    case 'daily-cap': weeklyStatus = t('weeklyCannotFinish', {
      h: formatDuration(Math.floor(dailyCapMin / 60), dailyCapMin % 60),
    }); break;
    case 'day-end': weeklyStatus = t('weeklyPastMidnight'); break;
    case 'latest-exit': weeklyStatus = t('weeklyPastLatestExit', { t: settings.latestExit }); break;
    case 'remaining': weeklyStatus = t('weeklyWorkRemaining', { h: weekRemH, m: weekRemM }); break;
    case 'finish': weeklyStatus = t('weeklyFinishAt', { t: weeklyState.time }); break;
  }

  return (
    <div className={styles.app}>
      {dashboardHeader}

      {stale && <Warning text={t('staleWarning')} />}
      {portalStatus === 'not-found' && !stale && <Warning text={t('notFoundCached')} />}

      <main className={styles.dashboardMain}>
        <section className={styles.dashboardCard}>
          {hasTodayRing && (
            <>
              <div className={styles.cardRow}>
                <span className={styles.mutedLabel}>{t('today')}</span>
              </div>
              <div className={styles.todayMetricRow}>
                <div className={styles.bigMetric}>
                  {todayH}:{pad(todayM)}
                  <small>
                    / {minutesToTime(dailyTargetMin)}
                    {todayMin > dailyTargetMin ? ` · ${formatCompactDuration(todayMin - dailyTargetMin)}` : ''}
                  </small>
                </div>
                <span className={`${styles.statusTag} ${styles.exitTimeStatus}`}>
                  {hasStartedToday ? compactTodayStatus : t('remainingChip', { h: todayRemainingH, m: todayRemainingM })}
                </span>
              </div>
              <div className={styles.progressBar}>
                <i style={{ width: `${Math.min((todayMin / dailyTargetMin) * 100, 100)}%` }} />
              </div>
              {dailyCapTimeText && <div className={styles.mutedText}>{dailyCapTimeText}</div>}
              <div className={styles.cardSeparator} />
            </>
          )}

          <div className={styles.cardRow}>
            <span className={styles.mutedLabel}>{t('thisWeek')}</span>
            <span className={styles.weekMetric}>
              <b>{weekTimeText}</b> <span>/ {weekTargetText}</span>
            </span>
          </div>
          <div className={styles.daysGrid} style={{ gridTemplateColumns: `repeat(${weekDays.length}, 1fr)` }}>
            {weekDays.map((day) => (
              <button type="button"
                className={`${styles.dayCard} ${day.isPast ? styles.dayPast : ''} ${day.isToday ? styles.dayToday : ''} ${day.isLeave ? styles.dayLeave : ''}`}
                key={day.date}
                disabled={refreshing || !day.editable}
                aria-label={t('editOooForDay', { date: day.date })}
                aria-pressed={oooDate === day.date}
                onClick={() => setOooDate(oooDate === day.date ? null : day.date)}
              >
                {day.label}
                <b>{day.isLeave ? t('leaveBarLabel') : `${Math.floor(day.minutes / 60)}:${pad(day.minutes % 60)}`}</b>
                {day.ooo > 0 && <small>OOO {minutesToTime(day.ooo)}</small>}
              </button>
            ))}
          </div>
          {oooDate && (oooDate === today.format('YYYY-MM-DD') || weekDays.some(day => day.date === oooDate && day.editable)) && (
            <DailyOooEditor key={oooDate} date={oooDate} data={data.leaveData} baseCap={settings.dailyCapMinutes}
              disabled={refreshing} onChange={handleLeaveChange} onClose={() => setOooDate(null)} />
          )}
          {isCurrentWeek && weeklyStatus && (
            <div className={`${styles.statusTag} ${styles.todayStatus}`}>
              {weeklyCompletionTime ? (
                <>
                  {t('weeklyFinishAt', { t: '{time}' }).split('{time}')[0]}
                  <strong>{weeklyCompletionTime}</strong>
                  {t('weeklyFinishAt', { t: '{time}' }).split('{time}')[1]}
                </>
              ) : weeklyStatus}
            </div>
          )}
        </section>

        {isCurrentWeek && showPlanner && (
          <section className={`${styles.dashboardCard} ${styles.planCard}`}>
            <div className={styles.cardRow}>
              <span className={styles.mutedLabel}>{t(planningToday ? 'todayPlanner' : 'tomorrowPlanner')}</span>
              <span className={styles.mutedText}>
                {planningForWeekCompletion
                  ? t('weekRemainingDayTarget', { day: plannedDayLabel })
                  : t('dailyTarget')}&nbsp;
                {formatDuration(Math.floor(plannerTargetMinutes / 60), plannerTargetMinutes % 60)}
              </span>
            </div>
            {plannerCanFit ? (
              <div className={styles.planRow}>
                <div className={styles.planTime}>{requiredEntryTime} → {boundedDesiredExit}</div>
                <span className={styles.planStepper}>
                  <button type="button" aria-label={t('decreaseTime')} onClick={() => stepDesiredExit(-EXIT_STEP_MINUTES, plannerTargetMinutes)}>−</button>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={5}
                    aria-label={t(planningToday ? 'todayPlannedExit' : 'tomorrowExit')}
                    value={desiredExitDraft}
                    onFocus={(event) => event.currentTarget.select()}
                    onChange={(event) => {
                      const value = event.target.value.replace(/[^0-9:]/g, '');
                      if (value.length <= 5) setDesiredExitDraft(value);
                    }}
                    onBlur={() => {
                      const valid = /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(desiredExitDraft);
                      commitDesiredExit(valid ? desiredExitDraft : boundedDesiredExit, plannerTargetMinutes);
                    }}
                  />
                  <button type="button" aria-label={t('increaseTime')} onClick={() => stepDesiredExit(EXIT_STEP_MINUTES, plannerTargetMinutes)}>+</button>
                </span>
              </div>
            ) : (
              <div className={styles.mutedText}>
                {t('dailyTargetExceedsCap', {
                  h: formatDuration(Math.floor(plannerCapMin / 60), plannerCapMin % 60),
                })}
              </div>
            )}
          </section>
        )}

        <div className={styles.dashboardFoot}>
          <span>{t('monthlyTotal')} <b>{formatDuration(monthlyH, monthlyM)}</b></span>
          {previousWeek.visible && (
            <span className={styles.previousWeekSummary}>
              {t('lastWeek')} <b>{previousWeek.complete ? formatDuration(Math.floor(previousWeek.minutes / 60), previousWeek.minutes % 60) : '—'}</b>
              {previousWeek.targetMet && <span className={styles.previousWeekComplete} role="img" aria-label={t('weekCompleted')}> ✓</span>}
              {previousWeek.complete && !previousWeek.targetMet && previousLeave?.key === previousWeekKey && !devActive && (
                <span className={styles.previousWeekIncomplete} role="img" aria-label={t('weekIncomplete')}> ✕</span>
              )}
              <small>{formatDateRange(previousWeek.periodStart, previousWeek.periodEnd)}</small>
              {!previousWeek.complete && <small>{t('previousWeekUnavailable')}</small>}
            </span>
          )}
        </div>
      </main>

      {shortDays.length > 0 && shortDays.map(({ date, mins }) => {
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        const parts = date.split('-');
        return <Warning key={date} text={t('shortDayWarning', {
          d: `${parts[2]}.${parts[1]}`,
          h,
          m,
          threshold: formatDuration(Math.floor(settings.shortDayThresholdMinutes / 60), settings.shortDayThresholdMinutes % 60),
        })} />;
      })}

      <LeaveInputs key={weekKey} maxLeaveDays={validWorkdays} data={data.leaveData} disabled={refreshing} onLeaveChange={handleLeaveChange}
        oooTotal={getWeekOoo(data.leaveData, dayjs(getMondayOfWeek(0, today.toDate())), dayjs(getMondayOfWeek(0, today.toDate())).add(6, 'day'), today)}
        onEditOoo={() => setOooDate(today.format('YYYY-MM-DD'))} />
      {devBar}
      <Footer />
    </div>
  );
}
