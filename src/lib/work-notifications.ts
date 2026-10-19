import dayjs, { type Dayjs } from 'dayjs';
import type { AppSettings, CalcMode, LeaveData, Snapshot } from '../types';
import { computeWeekData } from './calc';
import { getDailyCap } from './ooo';

export interface NotificationState {
  day: string;
  sent: string[];
}

export interface WorkNotification {
  kind: 'target' | 'cap';
  minutes: number;
  key: string;
}

/** No alerts based on another day's data, a closed session, or an unconfirmed session. */
export function getDueWorkNotifications(
  snapshot: Snapshot | null, settings: AppSettings, mode: CalcMode,
  leave: LeaveData, state: NotificationState | null, now: Dayjs = dayjs(),
): WorkNotification[] {
  if (!snapshot || snapshot.capturedDay !== now.format('YYYY-MM-DD') || snapshot.todayHasOpenSession !== true
    || !settings.workdays.includes(now.day())) return [];
  const { data } = computeWeekData(snapshot, 0, mode, leave, now, settings.dailyTargetMinutes / 60, settings);
  if (!data.firstRecord) return [];
  const sent = state?.day === now.format('YYYY-MM-DD') ? state.sent : [];
  const thresholds: WorkNotification[] = [];
  if (settings.notifyDailyTarget) thresholds.push({ kind: 'target', minutes: settings.dailyTargetMinutes, key: `target:${settings.dailyTargetMinutes}` });
  const cap = getDailyCap(settings.dailyCapMinutes, leave, now.format('YYYY-MM-DD'));
  if (settings.notifyDailyCap) thresholds.push({ kind: 'cap', minutes: cap, key: `cap:${cap}` });
  return thresholds.filter(threshold => threshold.minutes > 0 && data.todayWorkedMinutes >= threshold.minutes && !sent.includes(threshold.key));
}
