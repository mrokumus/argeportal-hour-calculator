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
  const startOfToday = now.startOf('day');
  const firstRecordFor = (workedTodayMin: number | null): string | null => {
    if (workedTodayMin == null) return null;
    const candidate = now.subtract(workedTodayMin, 'minute');
    return (candidate.isBefore(startOfToday) ? startOfToday : candidate).toISOString();
  };

  const snap = (workedTodayMin: number | null, totals: Record<string, number>): Snapshot => ({
    capturedAt: now.toISOString(),
    capturedDay: now.format('YYYY-MM-DD'),
    firstRecordISO: firstRecordFor(workedTodayMin),
    lastRecordISO: workedTodayMin == null ? null : now.toISOString(),
    todayHasOpenSession: workedTodayMin != null,
    dailyTotalsSessions: totals,
    dailyTotalsSpan: totals,
  });

  return [
    {
      // Mid-day: today in progress, a short day earlier this week, exit time visible.
      name: 'Gün ortası',
      snapshot: snap(372, fill(545, 220)), // today 6:12, ~9h days + one 3:40 short day
      leave: { ...DEFAULT_LEAVE },
    },
    {
      // Overtime: today already past 9h → "you can leave", overtime row.
      name: 'Fazla mesai / çıkabilir',
      snapshot: snap(585, fill(560)), // today 9:45
      leave: { ...DEFAULT_LEAVE },
    },
    {
      // Partial week with reduced target → the 36h alt-target row appears.
      name: 'Kısmi hafta (alt hedefler)',
      snapshot: snap(240, fill(500)), // today 4:00
      leave: { leave: 1, ooo: 90, autoDetected: false }, // target ≈ 37.5h
    },
    {
      // Stale: snapshot captured yesterday, no check-in today.
      name: 'Veri güncel değil',
      snapshot: {
        ...snap(null, fill(540)),
        capturedAt: now.subtract(1, 'day').hour(18).minute(30).toISOString(),
        capturedDay: now.subtract(1, 'day').format('YYYY-MM-DD'),
      },
      leave: { ...DEFAULT_LEAVE },
    },
  ];
}
