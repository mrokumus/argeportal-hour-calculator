import { DAILY_CAP_HOURS } from '../config';

export function getMondayOfWeek(offset: number): Date {
  const d = new Date();
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1) + offset * 7);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getSundayOfWeek(offset: number): Date {
  const mon = getMondayOfWeek(offset);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  sun.setHours(23, 59, 59, 999);
  return sun;
}

export function calculateTime(time: number): [number, number] {
  let minute = Math.round(time * 60);
  let hour = 0;
  while (minute >= 60) { minute -= 60; hour++; }
  return [hour, minute];
}

export function calculateRemaining(
  time: number,
  week = false,
  target = week ? 45 : 9,
): [number, number] {
  const remaining = target - time;
  if (remaining <= 0) return [0, 0];
  return calculateTime(remaining);
}

export function calculateRemainingX(
  time: number,
  x: number,
  weekTarget = 45,
): [number, number] {
  let [hour, min] = calculateRemaining(time, true, weekTarget);
  hour = hour - x;
  if (hour < 0) return [0, 0];
  return [hour, min];
}

export function timeNormalize(value: string): [string, string] {
  let [date, time] = value.split(/[ \n]/);
  date = date.split('.').reverse().join('-');
  return [
    date?.trim().replace(/(\r\n|\n|\r)/gm, ''),
    time?.trim().replace(/(\r\n|\n|\r)/gm, ''),
  ];
}

export function capDailyHours(h: number, m: number): [number, number] {
  if (h > DAILY_CAP_HOURS || (h === DAILY_CAP_HOURS && m > 0)) return [DAILY_CAP_HOURS, 0];
  return [h, m];
}

export function parseOOO(str: string | undefined | null): number {
  if (!str) return 0;
  const parts = String(str).trim().split(':');
  if (parts.length === 2) {
    return Math.max(0, parseInt(parts[0]) || 0) * 60 +
      Math.max(0, Math.min(59, parseInt(parts[1]) || 0));
  }
  return Math.max(0, parseInt(str) || 0) * 60;
}

export function formatOOO(minutes: number | null | undefined): string {
  if (!minutes) return '0:00';
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}`;
}

/**
 * Count Mon–Fri days in [weekStart, weekEnd] that are on or after monthStart.
 * Used to compute the weekly hour target for partial first weeks of a month.
 */
export function countValidWorkdays(
  weekStart: Date,
  weekEnd: Date,
  monthStart: Date,
  monthEnd?: Date,
): number {
  let count = 0;
  const d = new Date(weekStart);
  d.setHours(0, 0, 0, 0);
  const end = new Date(weekEnd);
  end.setHours(23, 59, 59, 999);
  const mStart = new Date(monthStart);
  mStart.setHours(0, 0, 0, 0);
  const mEnd = monthEnd ? new Date(monthEnd) : null;
  if (mEnd) mEnd.setHours(23, 59, 59, 999);
  while (d <= end) {
    const day = d.getDay();
    if (day >= 1 && day <= 5 && d >= mStart && (!mEnd || d <= mEnd)) count++;
    d.setDate(d.getDate() + 1);
  }
  return count;
}
