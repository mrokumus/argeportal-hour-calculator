export interface LeaveData {
  leave: number;
  ooo: number;
  autoDetected: boolean;
}

export interface DailyTotal {
  dateStr: string;
  minutes: number;
}

export type Locale = 'tr' | 'en';

export type CalcMode = 'sessions' | 'span';

/**
 * A once-a-day snapshot of the ARGEPORTAL data, persisted to
 * browser.storage.local. Everything the popup needs to compute the day's
 * numbers offline lives here: the first check-in time (so "today worked" =
 * now − firstRecord) plus the whole month's per-day totals (so previous-week
 * navigation works without the page). Fully serializable — no dayjs objects.
 */
export interface Snapshot {
  /** ISO timestamp of when the parse ran. */
  capturedAt: string;
  /** 'YYYY-MM-DD' local day the snapshot was captured on. */
  capturedDay: string;
  /** First check-in of the captured day (already second-adjusted), ISO — or null. */
  firstRecordISO: string | null;
  /** Whole-month per-day worked minutes, sessions mode (sum of session columns). */
  dailyTotalsSessions: Record<string, number>;
  /** Whole-month per-day worked minutes, span mode (last punch − first punch). */
  dailyTotalsSpan: Record<string, number>;
}

/** Result of a parse attempt driven from the popup. */
export type ParseResult =
  | { ok: true; snapshot: Snapshot }
  | { ok: false; reason: string };

/** Computed, display-ready week figures derived from a Snapshot + current time. */
export interface WeekData {
  leaveData: LeaveData;
  weekTargetH: number;
  // today
  todayH: number;
  todayM: number;
  todayRemainingH: number;
  todayRemainingM: number;
  firstRecord: ReturnType<typeof import('dayjs')> | null;
  // week
  weekTotalMin: number;
  weeklyExitStr: string | null;
  shortDays: Array<{ date: string; mins: number }>;
  // exit time override on Friday
  exitRemainingH: number;
  exitRemainingM: number;
}

export interface WeekStats {
  isCurrentWeek: boolean;
  weekKey: string;
  weekTargetH: number;
  validWorkdays: number;
  // today
  todayH: number;
  todayM: number;
  todayRemainingH: number;
  todayRemainingM: number;
  firstRecord: ReturnType<typeof import('dayjs')> | null;
  // week
  weekTotalMin: number;
  weeklyExitStr: string | null;
  shortDays: Array<{ date: string; mins: number }>;
  // per-day map
  dailyTotals: Record<string, number>;
}
