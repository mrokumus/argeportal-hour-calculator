import type { AppSettings, CalcMode, LeaveData, Snapshot } from '../types';
import {
  DAILY_CAP_HOURS,
  DAILY_TARGET_HOURS,
  STORAGE_KEY_CALC_MODE,
  STORAGE_KEY_DAILY_TARGET,
  STORAGE_KEY_SNAPSHOT,
  STORAGE_KEY_PORTAL_URL,
  STORAGE_KEY_SETTINGS,
  STORAGE_PREFIX,
  DEFAULT_SETTINGS,
} from '../config';

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

export async function saveSnapshot(snapshot: Snapshot): Promise<void> {
  await browser.storage.local.set({ [STORAGE_KEY_SNAPSHOT]: snapshot });
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
    ? stored as Partial<AppSettings> & { defaultExit?: string }
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
