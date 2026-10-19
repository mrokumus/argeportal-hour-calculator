import dayjs, { type Dayjs } from 'dayjs';
import type { LeaveData } from '../types';

export function getDailyOoo(data: LeaveData, date: string): number {
  const minutes = data.oooByDate?.[date];
  return typeof minutes === 'number' && Number.isFinite(minutes)
    ? Math.max(0, Math.min(1440, Math.floor(minutes))) : 0;
}

/** Legacy weekly OOO has no date and must not silently increase today's cap. */
export function getUnassignedOoo(data: LeaveData): number {
  const assigned = Object.keys(data.oooByDate ?? {}).reduce((sum, date) => sum + getDailyOoo(data, date), 0);
  return Math.max(0, (Number.isFinite(data.ooo) ? data.ooo : 0) - assigned);
}

export function setDailyOoo(data: LeaveData, date: string, minutes: number): LeaveData {
  const unassigned = getUnassignedOoo(data);
  const oooByDate = { ...data.oooByDate };
  const bounded = Number.isFinite(minutes) ? Math.max(0, Math.min(1440, Math.floor(minutes))) : 0;
  if (bounded) oooByDate[date] = bounded;
  else delete oooByDate[date];
  const updated = { ...data, oooByDate };
  return { ...updated, ooo: unassigned + Object.keys(oooByDate).reduce((sum, day) => sum + getDailyOoo(updated, day), 0) };
}

export function assignUnassignedOoo(data: LeaveData, date: string): LeaveData {
  const unassigned = getUnassignedOoo(data);
  const available = Math.max(0, 1440 - getDailyOoo(data, date));
  const assigned = Math.min(unassigned, available);
  const updated = setDailyOoo(data, date, getDailyOoo(data, date) + assigned);
  return { ...updated, ooo: updated.ooo - assigned };
}

/** Current-month OOO only; legacy values retain their former weekly behavior. */
export function getWeekOoo(data: LeaveData, start: Dayjs, end: Dayjs, month: Dayjs): number {
  return getUnassignedOoo(data) + Object.keys(data.oooByDate ?? {}).reduce((sum, date) => {
    const day = dayjs(date);
    return day.isValid() && day.isSame(month, 'month') && !day.isBefore(start, 'day') && !day.isAfter(end, 'day')
      ? sum + getDailyOoo(data, date) : sum;
  }, 0);
}

export function getDailyCap(baseMinutes: number, data: LeaveData, date: string): number {
  return baseMinutes + getDailyOoo(data, date);
}
