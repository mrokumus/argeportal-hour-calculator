import dayjs, { type Dayjs } from 'dayjs';
import type { CalcMode, LeaveData, Snapshot, WeekData } from '../types';
import {
  getMondayOfWeek,
  getSundayOfWeek,
  calculateTime,
  calculateRemaining,
  capDailyHours,
  countValidWorkdays,
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
): ComputeResult {
  const today = now;
  const isCurrentWeek = weekOffset === 0;
  const weekStart = dayjs(getMondayOfWeek(weekOffset));
  const weekEnd = dayjs(getSundayOfWeek(weekOffset));
  const monthStart = today.startOf('month');
  const monthEnd = today.endOf('month');

  const leaveData: LeaveData = { ...leaveDataIn };
  let leaveDataChanged = false;

  const dailyTotals =
    calcMode === 'span' ? snapshot.dailyTotalsSpan : snapshot.dailyTotalsSessions;

  const validWorkdays = countValidWorkdays(
    weekStart.toDate(),
    weekEnd.toDate(),
    monthStart.toDate(),
    monthEnd.toDate(),
  );

  // Auto-detect leave days (weekdays before today with < threshold hours)
  if (leaveData.autoDetected !== false) {
    let autoLeave = 0;
    for (let c = weekStart; !c.isAfter(weekEnd, 'day'); c = c.add(1, 'day')) {
      if (c.isBefore(monthStart, 'day')) continue;
      if (c.day() >= 1 && c.day() <= 5 && c.isBefore(today, 'day')) {
        const totalMins = dailyTotals[c.format('YYYY-MM-DD')] || 0;
        if (totalMins / 60 < SHORT_DAY_THRESHOLD_HOURS) autoLeave++;
      }
    }
    if (autoLeave !== leaveData.leave) {
      leaveData.leave = autoLeave;
      leaveDataChanged = true;
    }
  }

  const weekTargetH =
    validWorkdays * DAILY_TARGET_HOURS -
    leaveData.leave * DAILY_TARGET_HOURS +
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
  let todayRemainingH = dailyTargetH;
  let todayRemainingM = 0;

  if (firstRecord) {
    const recordedTodayMins = dailyTotals[today.format('YYYY-MM-DD')];
    const workedHours = snapshot.todayHasOpenSession === false && recordedTodayMins != null
      ? recordedTodayMins / 60
      : today.diff(firstRecord, 'hour', true);
    [todayH, todayM] = calculateTime(workedHours);
    [todayRemainingH, todayRemainingM] = calculateRemaining(workedHours, false, dailyTargetH);
  }

  // Week totals (completed days only — excludes today for the current week)
  let weekTotalMin = 0;
  let weeklyExitStr: string | null = null;
  const shortDays: Array<{ date: string; mins: number }> = [];

  Object.entries(dailyTotals).forEach(([dateStr, totalMins]) => {
    const rowDay = dayjs(dateStr);
    if (rowDay.isBefore(weekStart, 'day') || rowDay.isAfter(weekEnd, 'day')) return;
    if (rowDay.isBefore(monthStart, 'day')) return;
    if (isCurrentWeek && today.isSame(rowDay, 'day')) return;

    if (totalMins / 60 < SHORT_DAY_THRESHOLD_HOURS) {
      if (totalMins > 0) shortDays.push({ date: dateStr, mins: totalMins });
      return;
    }

    let [wh, wm] = [Math.floor(totalMins / 60), totalMins % 60];
    [wh, wm] = capDailyHours(wh, wm);
    weekTotalMin += wh * 60 + wm;
  });

  // Weekly exit time
  let exitRemainingH = todayRemainingH;
  let exitRemainingM = todayRemainingM;

  if (isCurrentWeek && firstRecord) {
    const cappedTodayMin = Math.min(todayH * 60 + todayM, DAILY_CAP_HOURS * 60);
    const weekTotalWithTodayMin = weekTotalMin + cappedTodayMin;
    const wTotalH = weekTotalWithTodayMin / 60;
    const [rwth, rwtm] = calculateRemaining(wTotalH, true, weekTargetH);

    const todayCapacityMins = Math.max(0, DAILY_CAP_HOURS * 60 - (todayH * 60 + todayM));
    const weeklyRemainingMins = rwth * 60 + rwtm;

    if (weeklyRemainingMins > 0 && weeklyRemainingMins <= todayCapacityMins) {
      const weekExit = today.add(rwth, 'h').add(rwtm, 'm');
      if (weekExit.isSame(today, 'day')) {
        weeklyExitStr = `${String(weekExit.hour()).padStart(2, '0')}:${String(weekExit.minute()).padStart(2, '0')}`;
      }
    }

    // On Friday, the exit time is driven by the weekly target (not daily 9h)
    if (today.day() === 5 && rwth < dailyTargetH) {
      exitRemainingH = rwth;
      exitRemainingM = rwtm;
      weeklyExitStr = null;
    }
  }

  return {
    data: {
      leaveData,
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
    },
    leaveDataChanged,
  };
}
