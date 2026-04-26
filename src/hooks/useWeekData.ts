import { useState, useCallback } from 'react';
import dayjs from 'dayjs';
import type { LeaveData } from '../types';
import {
  getMondayOfWeek,
  getSundayOfWeek,
  calculateTime,
  calculateRemaining,
  capDailyHours,
  timeNormalize,
  countValidWorkdays,
} from '../lib/time-utils';
import { getLeaveData, saveLeaveData } from '../lib/storage';
import {
  SELECTOR_FLEX_GRID,
  DAILY_TARGET_HOURS,
  SHORT_DAY_THRESHOLD_HOURS,
  DAILY_CAP_HOURS,
} from '../config';

export interface WeekData {
  leaveData: LeaveData;
  weekTargetH: number;
  // today
  todayH: number;
  todayM: number;
  todayRemainingH: number;
  todayRemainingM: number;
  firstRecord: ReturnType<typeof dayjs> | null;
  // week
  weekTotalMin: number;
  weeklyExitStr: string | null;
  shortDays: Array<{ date: string; mins: number }>;
  // exit time override on Friday
  exitRemainingH: number;
  exitRemainingM: number;
  // warnings
  selectMonthWarning: boolean;
}

function getWeekKey(offset: number): string {
  return getMondayOfWeek(offset).toISOString().slice(0, 10);
}

function computeDailyTotals(rows: NodeListOf<Element>): Record<string, number> {
  const map: Record<string, number> = {};
  rows.forEach((row) => {
    try {
      const [dateStr] = timeNormalize(
        (row.querySelector('td:nth-child(3)') as HTMLElement).innerText,
      );
      const raw = (row.querySelector('td:nth-child(6)') as HTMLElement).innerText;
      const [wh, wm] = raw.split(':');
      const mins = (parseInt(wh) || 0) * 60 + (parseInt(wm) || 0);
      map[dateStr] = (map[dateStr] || 0) + mins;
    } catch {
      // skip malformed rows
    }
  });
  return map;
}

export function useWeekData(weekOffset: number) {
  const [data, setData] = useState<WeekData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const compute = useCallback(
    (currentLeaveData?: LeaveData) => {
      const tables = document.querySelectorAll(SELECTOR_FLEX_GRID);
      const [tableOne, tableTwo] = tables;

      if (!tableOne || !tableTwo) {
        setData({
          leaveData: { leave: 0, ooo: 0, autoDetected: true },
          weekTargetH: 0,
          todayH: 0,
          todayM: 0,
          todayRemainingH: 0,
          todayRemainingM: 0,
          firstRecord: null,
          weekTotalMin: 0,
          weeklyExitStr: null,
          shortDays: [],
          exitRemainingH: 0,
          exitRemainingM: 0,
          selectMonthWarning: true,
        });
        return;
      }

      const today = dayjs();
      const isCurrentWeek = weekOffset === 0;
      const weekStart = dayjs(getMondayOfWeek(weekOffset));
      const weekEnd = dayjs(getSundayOfWeek(weekOffset));
      const weekKey = getWeekKey(weekOffset);
      const monthStart = dayjs().startOf('month');

      const leaveData = currentLeaveData ?? getLeaveData(weekKey);
      const monthlyList = tableTwo.querySelectorAll('tbody > tr');
      const dailyTotals = computeDailyTotals(monthlyList);
      const validWorkdays = countValidWorkdays(
        weekStart.toDate(),
        weekEnd.toDate(),
        monthStart.toDate(),
      );

      // Auto-detect leave days
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
          saveLeaveData(weekKey, leaveData);
        }
      }

      const weekTargetH =
        validWorkdays * DAILY_TARGET_HOURS -
        leaveData.leave * DAILY_TARGET_HOURS +
        leaveData.ooo / 60;

      // Today
      let todayH = 0;
      let todayM = 0;
      let todayRemainingH = weekTargetH;
      let todayRemainingM = 0;
      let firstRecord: ReturnType<typeof dayjs> | null = null;

      if (isCurrentWeek) {
        tableOne.querySelectorAll('tbody > tr').forEach((row) => {
          const rowTime = (row.querySelector('td:nth-child(6)') as HTMLElement | null)
            ?.innerText;
          if (!rowTime) return;
          const [currentDate, currentTime] = timeNormalize(rowTime);
          const time = dayjs(`${currentDate} ${currentTime}`);
          if (today.isSame(time, 'day') && !firstRecord) {
            firstRecord = time.add(
              time.get('second') > 1 ? 60 - time.get('second') : 1,
              'second',
            );
          }
        });

        if (firstRecord && today.isSame(dayjs(firstRecord), 'day')) {
          const diff = today.diff(firstRecord, 'hour', true);
          [todayH, todayM] = calculateTime(diff);
          [todayRemainingH, todayRemainingM] = calculateRemaining(diff, false, DAILY_TARGET_HOURS);
        }
      }

      // Week totals
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
        const weekTotalWithTodayMin = weekTotalMin + todayH * 60 + todayM;
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

        // On Friday, the exit time drives the weekly target (not daily 9h)
        if (today.day() === 5 && rwth < DAILY_TARGET_HOURS) {
          exitRemainingH = rwth;
          exitRemainingM = rwtm;
          weeklyExitStr = null;
        }
      }

      setData({
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
        selectMonthWarning: false,
      });
    },
    [weekOffset],
  );

  function run(currentLeaveData?: LeaveData) {
    if (isLoading) return;
    setIsLoading(true);
    compute(currentLeaveData);
    setIsLoading(false);
  }

  return { data, isLoading, run };
}
