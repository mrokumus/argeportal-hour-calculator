import dayjs, { type Dayjs } from 'dayjs';
import type { LeaveData, Snapshot } from '../types';

/**
 * Development-only fake data. Because so much of the UI is conditional on data
 * that never co-occurs in one real day (overtime, the 11h cap, alt-target rows,
 * short-day warnings, "you can leave"), this lets the popup be exercised through
 * a handful of representative scenarios without a live ARGEPORTAL session.
 *
 * "Today worked" is derived live as now − firstRecord, so a scenario controls it
 * by setting firstRecordISO = now − <worked minutes>.
 */
export interface DevScenario {
  name: string;
  nowISO: string;
  snapshot: Snapshot;
  leave: LeaveData;
}

const DEFAULT_LEAVE: LeaveData = { leave: 0, ooo: 0, autoDetected: true };

export function buildDevScenarios(now: Dayjs = dayjs()): DevScenario[] {
  const key = (d: Dayjs) => d.format('YYYY-MM-DD');

  // Every weekday of the current month strictly before today, so navigating to
  // earlier (in-month) weeks shows worked hours too — not just the current week.
  const monthWeekdays: Dayjs[] = [];
  for (let d = now.startOf('month'); d.isBefore(now, 'day'); d = d.add(1, 'day')) {
    const dow = d.day();
    if (dow >= 1 && dow <= 5) monthWeekdays.push(d);
  }

  // Assign per-day minutes to each completed weekday; `shortMin` marks the most
  // recent one as a < 5h day (lands in the current week on most days).
  const fill = (perDay: number, shortMin?: number): Record<string, number> => {
    const map: Record<string, number> = {};
    monthWeekdays.forEach((d, i) => {
      map[key(d)] = shortMin != null && i === monthWeekdays.length - 1 ? shortMin : perDay;
    });
    return map;
  };

  // "Today worked" = now − firstRecord, so a scenario's worked-minutes can only
  // be realized if now is that far past midnight. Clamp firstRecord to the start
  // of today so the Today ring still appears when testing late at night (it just
  // shows fewer hours than the scenario nominally asks for).
  const firstRecordFor = (scenarioNow: Dayjs, workedTodayMin: number | null): string | null => {
    if (workedTodayMin == null) return null;
    const candidate = scenarioNow.subtract(workedTodayMin, 'minute');
    return (candidate.isBefore(scenarioNow.startOf('day')) ? scenarioNow.startOf('day') : candidate).toISOString();
  };

  const snap = (
    workedTodayMin: number | null,
    totals: Record<string, number>,
    scenarioNow: Dayjs = now,
  ): Snapshot => ({
    capturedAt: scenarioNow.toISOString(),
    capturedDay: scenarioNow.format('YYYY-MM-DD'),
    firstRecordISO: firstRecordFor(scenarioNow, workedTodayMin),
    lastRecordISO: workedTodayMin == null ? null : scenarioNow.toISOString(),
    todayHasOpenSession: workedTodayMin != null,
    dailyTotalsSessions: totals,
    dailyTotalsSpan: totals,
  });

  const monday = now.startOf('day').subtract((now.day() + 6) % 7, 'day');
  const plannerFriday = monday.add(4, 'day').hour(8);
  const plannerSaturday = monday.add(5, 'day').hour(8);
  const fridayTotals = [638, 529, 552, 558].reduce<Record<string, number>>((totals, minutes, offset) => {
    totals[key(monday.add(offset, 'day'))] = minutes;
    return totals;
  }, {});
  const saturdayTotals = [540, 540, 540, 540, 540].reduce<Record<string, number>>((totals, minutes, offset) => {
    totals[key(monday.add(offset, 'day'))] = minutes;
    return totals;
  }, {});

  return [
    {
      // Mid-day: today in progress, a short day earlier this week, exit time visible.
      name: 'Midday',
      nowISO: now.toISOString(),
      snapshot: snap(372, fill(545, 220)), // today 6:12, ~9h days + one 3:40 short day
      leave: { ...DEFAULT_LEAVE },
    },
    {
      // Overtime: today already past 9h → "you can leave", overtime row.
      name: 'Overtime / can leave',
      nowISO: now.toISOString(),
      snapshot: snap(585, fill(560)), // today 9:45
      leave: { ...DEFAULT_LEAVE },
    },
    {
      // Partial week with reduced target → the 36h alt-target row appears.
      name: 'Partial week (lower targets)',
      nowISO: now.toISOString(),
      snapshot: snap(240, fill(500)), // today 4:00
      leave: { leave: 1, ooo: 90, autoDetected: false }, // target ≈ 37.5h
    },
    {
      // Stale: snapshot captured yesterday, no check-in today.
      name: 'Stale data',
      nowISO: now.toISOString(),
      snapshot: {
        ...snap(null, fill(540)),
        capturedAt: now.subtract(1, 'day').hour(18).minute(30).toISOString(),
        capturedDay: now.subtract(1, 'day').format('YYYY-MM-DD'),
      },
      leave: { ...DEFAULT_LEAVE },
    },
    {
      // With Mon-Sat selected, Friday projects the normal daily target and plans Saturday.
      name: 'Planner: Friday → Saturday',
      nowISO: plannerFriday.toISOString(),
      snapshot: snap(null, fridayTotals, plannerFriday),
      leave: { ...DEFAULT_LEAVE },
    },
    {
      // With all seven days selected, Saturday plans Sunday as the final workday.
      name: 'Planner: Saturday → Sunday',
      nowISO: plannerSaturday.toISOString(),
      snapshot: snap(null, saturdayTotals, plannerSaturday),
      leave: { ...DEFAULT_LEAVE },
    },
  ];
}
