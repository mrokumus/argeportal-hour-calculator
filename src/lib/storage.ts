import dayjs from 'dayjs';
import type { AppSettings, CalcMode, LeaveData, ManualPunches, Snapshot } from '../types';
import {
  DAILY_CAP_HOURS,
  DAILY_TARGET_HOURS,
  STORAGE_KEY_CALC_MODE,
  STORAGE_KEY_DAILY_TARGET,
  STORAGE_KEY_SNAPSHOT,
  STORAGE_KEY_PORTAL_URL,
  STORAGE_KEY_SETTINGS,
  STORAGE_PREFIX,
  STORAGE_PREFIX_MANUAL_PUNCH,
  DEFAULT_SETTINGS,
} from '../config';
import { mergePortalSnapshot } from './punches';

const DEFAULT: LeaveData = { leave: 0, ooo: 0, autoDetected: true };

/**
 * All persistence goes through browser.storage.local (async) rather than the
 * page's localStorage: the popup runs on a chrome-extension:// origin and
 * cannot read the ARGEPORTAL page's localStorage.
 */

export async function getLeaveData(weekKey: string): Promise<LeaveData> {
  try {
    const key = `${STORAGE_PREFIX}${weekKey}`;
    const stored = (await browser.storage.local.get(key))[key] as LeaveData | undefined;
    return stored ? { ...DEFAULT, ...stored } : { ...DEFAULT };
  } catch {
    return { ...DEFAULT };
  }
}

export async function saveLeaveData(weekKey: string, data: LeaveData): Promise<void> {
  await browser.storage.local.set({ [`${STORAGE_PREFIX}${weekKey}`]: data });
}

export async function getCalcMode(): Promise<CalcMode> {
  const stored = (await browser.storage.local.get(STORAGE_KEY_CALC_MODE))[STORAGE_KEY_CALC_MODE];
  return stored === 'span' ? 'span' : 'sessions';
}

export async function saveCalcMode(mode: CalcMode): Promise<void> {
  await browser.storage.local.set({ [STORAGE_KEY_CALC_MODE]: mode });
}

export async function getDailyTarget(): Promise<number> {
  const stored = (await browser.storage.local.get(STORAGE_KEY_DAILY_TARGET))[STORAGE_KEY_DAILY_TARGET];
  return typeof stored === 'number' && stored >= 1 && stored <= DAILY_CAP_HOURS
    ? stored
    : DAILY_TARGET_HOURS;
}

export async function saveDailyTarget(hours: number): Promise<void> {
  await browser.storage.local.set({ [STORAGE_KEY_DAILY_TARGET]: hours });
}

export async function getSnapshot(): Promise<Snapshot | null> {
  const stored = (await browser.storage.local.get(STORAGE_KEY_SNAPSHOT))[STORAGE_KEY_SNAPSHOT];
  return (stored as Snapshot | undefined) ?? null;
}

let snapshotQueue: Promise<unknown> = Promise.resolve();

export function saveSnapshot(fresh: Snapshot): Promise<Snapshot> {
  const save = snapshotQueue.then(async () => {
    const merged = mergePortalSnapshot(await getSnapshot(), fresh);
    await browser.storage.local.set({ [STORAGE_KEY_SNAPSHOT]: merged });
    return merged;
  });
  snapshotQueue = save.catch(() => {});
  return save;
}

export async function getManualPunches(): Promise<Record<string, ManualPunches>> {
  const keys: string[] = [];
  const now = dayjs();
  for (let day = now.subtract(1, 'month').startOf('month'); !day.isAfter(now.endOf('month'), 'day'); day = day.add(1, 'day')) {
    keys.push(STORAGE_PREFIX_MANUAL_PUNCH + day.format('YYYY-MM-DD'));
  }
  const stored = await browser.storage.local.get(keys);
  return Object.fromEntries(Object.entries(stored)
    .filter(([key]) => key.startsWith(STORAGE_PREFIX_MANUAL_PUNCH))
    .map(([key, value]) => [key.slice(STORAGE_PREFIX_MANUAL_PUNCH.length), value as ManualPunches]));
}

export async function saveManualPunches(date: string, punches: ManualPunches): Promise<void> {
  const key = STORAGE_PREFIX_MANUAL_PUNCH + date;
  if (punches.entry || punches.exit) await browser.storage.local.set({ [key]: punches });
  else await browser.storage.local.remove(key);
}

export async function getPortalUrl(): Promise<string> {
  const stored = (await browser.storage.local.get(STORAGE_KEY_PORTAL_URL))[STORAGE_KEY_PORTAL_URL];
  return typeof stored === 'string' ? stored : '';
}

export async function savePortalUrl(url: string): Promise<void> {
  await browser.storage.local.set({ [STORAGE_KEY_PORTAL_URL]: url });
}

export async function getSettings(): Promise<AppSettings> {
  const stored = (await browser.storage.local.get(STORAGE_KEY_SETTINGS))[STORAGE_KEY_SETTINGS];
  const legacyTarget = await getDailyTarget();
  const candidate = stored && typeof stored === 'object'
    ? stored as Partial<AppSettings> & { defaultExit?: string; notifyNineHours?: boolean; notifyElevenHours?: boolean }
    : {};
  const locale = candidate.locale === 'tr' || candidate.locale === 'en' || candidate.locale === 'auto'
    ? candidate.locale
    : DEFAULT_SETTINGS.locale;
  return {
    ...DEFAULT_SETTINGS,
    ...candidate,
    dailyTargetMinutes: candidate.dailyTargetMinutes ?? Math.round(legacyTarget * 60),
    earliestExit: candidate.earliestExit ?? candidate.defaultExit ?? DEFAULT_SETTINGS.earliestExit,
    locale,
    notifyDailyTarget: candidate.notifyDailyTarget ?? candidate.notifyNineHours ?? DEFAULT_SETTINGS.notifyDailyTarget,
    notifyDailyCap: candidate.notifyDailyCap ?? candidate.notifyElevenHours ?? DEFAULT_SETTINGS.notifyDailyCap,
    workdays: Array.isArray(candidate.workdays) && candidate.workdays.length
      ? candidate.workdays.filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
      : [...DEFAULT_SETTINGS.workdays],
  };
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await browser.storage.local.set({
    [STORAGE_KEY_SETTINGS]: settings,
    [STORAGE_KEY_DAILY_TARGET]: settings.dailyTargetMinutes / 60,
  });
}
