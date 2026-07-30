import type { CalcMode, LeaveData, Snapshot } from '../types';
import { STORAGE_KEY_CALC_MODE, STORAGE_KEY_SNAPSHOT, STORAGE_PREFIX } from '../config';

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

export async function getSnapshot(): Promise<Snapshot | null> {
  const stored = (await browser.storage.local.get(STORAGE_KEY_SNAPSHOT))[STORAGE_KEY_SNAPSHOT];
  return (stored as Snapshot | undefined) ?? null;
}

export async function saveSnapshot(snapshot: Snapshot): Promise<void> {
  await browser.storage.local.set({ [STORAGE_KEY_SNAPSHOT]: snapshot });
}
