import type { CalcMode, LeaveData } from '../types';
import { STORAGE_KEY_CALC_MODE, STORAGE_PREFIX } from '../config';

const DEFAULT: LeaveData = { leave: 0, ooo: 0, autoDetected: true };

export function getLeaveData(weekKey: string): LeaveData {
  try {
    return JSON.parse(
      localStorage.getItem(`${STORAGE_PREFIX}${weekKey}`) ?? JSON.stringify(DEFAULT),
    );
  } catch {
    return { ...DEFAULT };
  }
}

export function saveLeaveData(weekKey: string, data: LeaveData): void {
  localStorage.setItem(`${STORAGE_PREFIX}${weekKey}`, JSON.stringify(data));
}

export function getCalcMode(): CalcMode {
  return localStorage.getItem(STORAGE_KEY_CALC_MODE) === 'span' ? 'span' : 'sessions';
}

export function saveCalcMode(mode: CalcMode): void {
  localStorage.setItem(STORAGE_KEY_CALC_MODE, mode);
}
