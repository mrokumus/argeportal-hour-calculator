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
