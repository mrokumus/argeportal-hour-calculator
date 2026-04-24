import type { LeaveData } from '../types';
import { STORAGE_PREFIX } from '../config';

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
