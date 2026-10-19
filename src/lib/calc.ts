import dayjs, { type Dayjs } from 'dayjs';
import type { AppSettings, CalcMode, LeaveData, Snapshot, WeekData } from '../types';
import {
  getMondayOfWeek,
  getSundayOfWeek,
  calculateTime,
  calculateRemaining,
  capDailyHours,
  clampLeaveDays,
} from './time-utils';
import { DAILY_TARGET_HOURS, SHORT_DAY_THRESHOLD_HOURS, DAILY_CAP_HOURS } from '../config';

export interface ComputeResult {
  data: WeekData;
  /** True when auto-leave detection changed the leave count — caller should persist. */
  leaveDataChanged: boolean;
}

/**
 * Pure recomputation of a week's figures from a cached Snapshot and the current
 * time. This is the offline equivalent of the old DOM-reading hook: "today" is
 * derived from the snapshot's first check-in vs. now, and completed days come
 * from the snapshot's whole-month per-day totals.
 */
export function computeWeekData(
  snapshot: Snapshot,
  weekOffset: number,
  calcMode: CalcMode,
  leaveDataIn: LeaveData,
  now: Dayjs = dayjs(),
  dailyTargetH: number = DAILY_TARGET_HOURS,
  settings?: AppSettings,
): ComputeResult {
  const today = now;
  const isCurrentWeek = weekOffset === 0;
  const weekStart = dayjs(getMondayOfWeek(weekOffset, today.toDate()));
  const weekEnd = dayjs(getSundayOfWeek(weekOffset, today.toDate()));
  const monthStart = today.startOf('month');
  const monthEnd = today.endOf('month');

  const leaveData: LeaveData = { ...leaveDataIn };
  let leaveDataChanged = false;

  const dailyTotals =
    calcMode === 'span' ? snapshot.dailyTotalsSpan : snapshot.dailyTotalsSessions;

  let validWorkdays = 0;
  for (let c = weekStart; !c.isAfter(weekEnd, 'day'); c = c.add(1, 'day')) {
    const configuredWorkday = settings ? settings.workdays.includes(c.day()) : c.day() >= 1 && c.day() <= 5;
    if (configuredWorkday && !c.isBefore(monthStart, 'day') && !c.isAfter(monthEnd, 'day')) validWorkdays++;
  }
  const targetHours = settings ? settings.dailyTargetMinutes / 60 : DAILY_TARGET_HOURS;
  const capHours = settings ? settings.dailyCapMinutes / 60 : DAILY_CAP_HOURS;
  const shortDayThresholdHours = settings
    ? settings.shortDayThresholdMinutes / 60
    : SHORT_DAY_THRESHOLD_HOURS;

  // Auto-detect leave days (weekdays before today with < threshold hours)
  if ((settings?.autoDetectLeave ?? true) && leaveData.autoDetected !== false) {
    let autoLeave = 0;
    for (let c = weekStart; !c.isAfter(weekEnd, 'day'); c = c.add(1, 'day')) {
      if (c.isBefore(monthStart, 'day')) continue;
      if ((settings?.workdays ?? [1, 2, 3, 4, 5]).includes(c.day()) && c.isBefore(today, 'day')) {
        const totalMins = dailyTotals[c.format('YYYY-MM-DD')] || 0;
        if (totalMins / 60 < shortDayThresholdHours) autoLeave++;
      }
    }
    if (autoLeave !== leaveData.leave) {
      leaveData.leave = autoLeave;
      leaveDataChanged = true;
    }
  }

  const boundedLeave = clampLeaveDays(leaveData.leave, validWorkdays);
  if (boundedLeave !== leaveData.leave) {
    leaveData.leave = boundedLeave;
    leaveDataChanged = true;
  }

  const weekTargetH =
    validWorkdays * targetHours -
    leaveData.leave * targetHours +
    leaveData.ooo / 60;

  // Today — only meaningful on the current week and when the snapshot's first
  // check-in belongs to the same calendar day we're computing for.
  const sameDay = snapshot.capturedDay === today.format('YYYY-MM-DD');
  let firstRecord: Dayjs | null =
    isCurrentWeek && sameDay && snapshot.firstRecordISO
      ? dayjs(snapshot.firstRecordISO)
      : null;
  if (firstRecord && !today.isSame(firstRecord, 'day')) firstRecord = null;

  let todayH = 0;
  let todayM = 0;
  let [todayRemainingH, todayRemainingM] = calculateTime(dailyTargetH);

  if (firstRecord) {
    const recordedTodayMins = dailyTotals[today.format('YYYY-MM-DD')];
    let workedHours = snapshot.todayHasOpenSession === false && recordedTodayMins != null
      ? recordedTodayMins / 60
      : today.diff(firstRecord, 'hour', true);
    if (calcMode === 'sessions' && snapshot.todayHasOpenSession !== false && snapshot.lastRecordISO) {
      const openStart = dayjs(snapshot.lastRecordISO);
      if (openStart.isValid() && openStart.isSame(today, 'day')) {
        const completed = snapshot.todayCompletedSessionMinutes ?? recordedTodayMins ?? 0;
        workedHours = completed / 60 + Math.max(0, today.diff(openStart, 'hour', true));
      }
    }
    [todayH, todayM] = calculateTime(workedHours);
    [todayRemainingH, todayRemainingM] = calculateRemaining(workedHours, false, dailyTargetH);
  }

  // Week totals (completed days only — excludes today for the current week)
  let weekTotalMin = 0;
  const shortDays: Array<{ date: string; mins: number }> = [];

  Object.entries(dailyTotals).forEach(([dateStr, totalMins]) => {
    const rowDay = dayjs(dateStr);
    if (rowDay.isBefore(weekStart, 'day') || rowDay.isAfter(weekEnd, 'day')) return;
    if (rowDay.isBefore(monthStart, 'day')) return;
    if (isCurrentWeek && today.isSame(rowDay, 'day')) return;

    if (totalMins / 60 < shortDayThresholdHours) {
      if (totalMins > 0) shortDays.push({ date: dateStr, mins: totalMins });
      return;
    }

    let [wh, wm] = [Math.floor(totalMins / 60), totalMins % 60];
    [wh, wm] = capDailyHours(wh, wm, capHours);
    weekTotalMin += wh * 60 + wm;
  });

  const todayKey = today.format('YYYY-MM-DD');
  const monthlyTotalMin = Object.entries(dailyTotals)
    .filter(([date]) => dayjs(date).isSame(today, 'month'))
    .reduce((sum, [date, minutes]) => sum + (firstRecord && date === todayKey ? 0 : minutes), 0)
    + (firstRecord ? todayH * 60 + todayM : 0);

  const weekTotalWithTodayMin = weekTotalMin + Math.min(todayH * 60 + todayM, capHours * 60);
  const weeklyRemainingMinutes = Math.max(0, Math.round(weekTargetH * 60) - weekTotalWithTodayMin);

  return {
    data: {
      leaveData,
      weekTargetH,
      validWorkdays,
      monthlyTotalMin,
      todayH,
      todayM,
      todayRemainingH,
      todayRemainingM,
      firstRecord,
      weekTotalMin,
      weekTotalWithTodayMin,
      weeklyRemainingMinutes,
      shortDays,
    },
    leaveDataChanged,
  };
}

export type WeeklyStatus =
  | { kind: 'complete' | 'hidden' | 'daily-cap' | 'day-end' | 'latest-exit' | 'remaining' }
  | { kind: 'finish'; time: string };

export function getWeeklyStatus(
  now: Dayjs,
  remainingMinutes: number,
  todayMinutes: number,
  hasOpenSession: boolean,
  settings: AppSettings,
): WeeklyStatus {
  if (remainingMinutes <= 0) return { kind: 'complete' };
  const offset = (day: number) => day === 0 ? 6 : day - 1;
  if (!settings.workdays.includes(now.day()) ||
      offset(now.day()) !== Math.max(...settings.workdays.map(offset))) return { kind: 'hidden' };
  if (remainingMinutes > Math.max(0, settings.dailyCapMinutes - todayMinutes)) return { kind: 'daily-cap' };
  const [entryHour, entryMinute] = settings.earliestEntry.split(':').map(Number);
  const earliestStart = now.hour(entryHour).minute(entryMinute).second(0).millisecond(0);
  const start = !hasOpenSession && now.isBefore(earliestStart) ? earliestStart : now;
  const completion = start.add(remainingMinutes, 'minute');
  if (!completion.isSame(now, 'day')) return { kind: 'day-end' };
  const [hour, minute] = settings.latestExit.split(':').map(Number);
  if (completion.isAfter(now.hour(hour).minute(minute).endOf('minute'))) return { kind: 'latest-exit' };
  if (!hasOpenSession) return { kind: 'remaining' };
  return { kind: 'finish', time: completion.format('HH:mm') };
}
