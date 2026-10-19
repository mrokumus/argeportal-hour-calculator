import dayjs from 'dayjs';
import { computeWeekData } from '../src/lib/calc';
import { clampLeaveDays, roundCheckInUp } from '../src/lib/time-utils';
import { DEFAULT_SETTINGS } from '../src/config';
import type { Snapshot } from '../src/types';

const now = dayjs('2026-08-07T15:00:00');
const snapshot: Snapshot = {
  capturedAt: now.toISOString(), capturedDay: '2026-08-07',
  firstRecordISO: '2026-08-07T09:00:00', lastRecordISO: '2026-08-07T13:00:00',
  todayHasOpenSession: true, todayCompletedSessionMinutes: 180,
  dailyTotalsSessions: { '2026-08-06': 540, '2026-08-07': 180 },
  dailyTotalsSpan: { '2026-08-06': 540, '2026-08-07': 240 },
};
const leave = { leave: 0, ooo: 0, autoDetected: false };

describe('live session and monthly totals', () => {
  it('excludes the lunch break in sessions mode and updates the monthly total once', () => {
    const { data } = computeWeekData(snapshot, 0, 'sessions', leave, now);
    expect([data.todayH, data.todayM]).toEqual([5, 0]);
    expect([data.todayRemainingH, data.todayRemainingM]).toEqual([4, 0]);
    expect(data.weekTotalWithTodayMin).toBe(840);
    expect(data.monthlyTotalMin).toBe(840);
  });
  it('includes the lunch break in span mode', () => {
    const { data } = computeWeekData(snapshot, 0, 'span', leave, now);
    expect(data.todayH).toBe(6);
    expect(data.monthlyTotalMin).toBe(900);
  });
  it('does not jump by the break duration when a new session starts', () => {
    const { data } = computeWeekData(snapshot, 0, 'sessions', leave, dayjs('2026-08-07T13:00:00'));
    expect([data.todayH, data.todayM]).toEqual([3, 0]);
  });
  it('keeps recorded totals after check-out', () => {
    const { data } = computeWeekData({ ...snapshot, todayHasOpenSession: false,
      dailyTotalsSessions: { '2026-08-06': 540, '2026-08-07': 300 } }, 0, 'sessions', leave, now);
    expect(data.todayH).toBe(5);
    expect(data.monthlyTotalMin).toBe(840);
  });
  it('adds an open first session even when no today total was scraped', () => {
    const { data } = computeWeekData({ ...snapshot, lastRecordISO: snapshot.firstRecordISO,
      todayCompletedSessionMinutes: 0, dailyTotalsSessions: {} }, 0, 'sessions', leave, now);
    expect(data.monthlyTotalMin).toBe(360);
  });
  it('uses stored monthly totals when the snapshot is stale', () => {
    const { data } = computeWeekData(snapshot, 0, 'sessions', leave, dayjs('2026-08-08T15:00:00'));
    expect(data.monthlyTotalMin).toBe(720);
  });
  it('supports older snapshots without the completed-session field', () => {
    const { data } = computeWeekData({ ...snapshot, todayCompletedSessionMinutes: undefined }, 0, 'sessions', leave, now);
    expect(data.todayH).toBe(5);
  });
});

describe('fractional daily targets and leave limits', () => {
  it('shows 8h 30m before check-in for an 8.5h target', () => {
    const { data } = computeWeekData({ ...snapshot, firstRecordISO: null }, 0, 'sessions', leave, now, 8.5);
    expect([data.todayRemainingH, data.todayRemainingM]).toEqual([8, 30]);
  });
  it.each([6, 7])('supports %i configured workdays and bounds excessive stored leave', days => {
    const settings = { ...DEFAULT_SETTINGS, workdays: days === 6 ? [1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5, 6, 0] };
    const { data, leaveDataChanged } = computeWeekData(snapshot, 0, 'sessions', { ...leave, leave: 20 }, now, 9, settings);
    expect(data.validWorkdays).toBe(days);
    expect(data.leaveData.leave).toBe(days);
    expect(data.weekTargetH).toBe(0);
    expect(leaveDataChanged).toBe(true);
  });
  it('bounds leave to workdays in the current month in a split week', () => {
    const { data } = computeWeekData(snapshot, 0, 'sessions', { ...leave, leave: 5 }, dayjs('2026-09-01T15:00:00'));
    expect(data.validWorkdays).toBe(4);
    expect(data.leaveData.leave).toBe(4);
    expect(data.weekTargetH).toBe(0);
  });
  it('normalizes manual leave input', () => {
    expect(clampLeaveDays(7, 6)).toBe(6);
    expect(clampLeaveDays(-1, 6)).toBe(0);
    expect(clampLeaveDays(6, 7)).toBe(6);
    expect(clampLeaveDays(2.5, 7)).toBe(2);
  });
});


describe('conservative check-in rounding', () => {
  it.each([
    ['09:00:00.000', '09:00:00'],
    ['09:00:00.001', '09:01:00'],
    ['09:00:01.000', '09:01:00'],
    ['09:00:30.000', '09:01:00'],
    ['09:00:59.000', '09:01:00'],
  ])('rounds %s up to %s without changing exact minutes', (input, expected) => {
    const rounded = roundCheckInUp(dayjs(`2026-08-07T${input}`));
    expect(rounded.format('HH:mm:ss')).toBe(expected);
    expect(roundCheckInUp(rounded).valueOf()).toBe(rounded.valueOf());
  });
  it.each(['sessions', 'span'] as const)('keeps one minute remaining at 18:00 in %s mode', mode => {
    const time = dayjs('2026-08-07T18:00:00');
    const { data } = computeWeekData({ ...snapshot,
      firstRecordISO: roundCheckInUp(dayjs('2026-08-07T09:00:30')).toISOString(),
      lastRecordISO: '2026-08-07T09:00:30', todayCompletedSessionMinutes: 0,
      dailyTotalsSessions: {}, dailyTotalsSpan: {},
    }, 0, mode, leave, time);
    expect([data.todayH, data.todayM]).toEqual([8, 59]);
    expect([data.todayRemainingH, data.todayRemainingM]).toEqual([0, 1]);
  });
  it('rounds the re-entry after a break up too', () => {
    const { data } = computeWeekData({ ...snapshot, lastRecordISO: '2026-08-07T13:00:30' }, 0, 'sessions', leave, now);
    expect([data.todayH, data.todayM]).toEqual([4, 59]);
    expect([data.todayRemainingH, data.todayRemainingM]).toEqual([4, 1]);
  });
});
