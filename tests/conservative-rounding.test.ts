import dayjs from 'dayjs';
import { computeWeekData, getWeeklyStatus } from '../src/lib/calc';
import { calculateRemaining, calculateTime, roundCheckInUp } from '../src/lib/time-utils';
import { DEFAULT_SETTINGS } from '../src/config';
import type { Snapshot } from '../src/types';

const settings = { ...DEFAULT_SETTINGS, workdays: [1, 2, 3, 4, 5] };
const leave = { leave: 0, ooo: 0, autoDetected: false };
const snapshot: Snapshot = {
  capturedAt: '2026-08-07T09:01:00', capturedDay: '2026-08-07',
  firstRecordISO: '2026-08-07T09:01:00', lastRecordISO: '2026-08-07T09:01:00',
  todayHasOpenSession: true, todayCompletedSessionMinutes: 0,
  dailyTotalsSessions: { '2026-08-03': 540, '2026-08-04': 540, '2026-08-05': 540, '2026-08-06': 540 },
  dailyTotalsSpan: { '2026-08-03': 540, '2026-08-04': 540, '2026-08-05': 540, '2026-08-06': 540 },
};

it('floors worked duration and ceils any positive remainder', () => {
  expect(calculateTime(539.6 / 60)).toEqual([8, 59]);
  expect(calculateRemaining(539.6 / 60)).toEqual([0, 1]);
});

it.each(['sessions', 'span'] as const)('preserves the exact target instant in %s mode', mode => {
  for (const [clock, worked, remaining] of [
    ['17:59:31', [8, 58], [0, 2]],
    ['18:00:36', [8, 59], [0, 1]],
    ['18:00:59', [8, 59], [0, 1]],
    ['18:01:00', [9, 0], [0, 0]],
  ] as const) {
    const now = dayjs(`2026-08-07T${clock}`);
    const { data } = computeWeekData(snapshot, 0, mode, leave, now, 9, settings);
    expect([data.todayH, data.todayM]).toEqual(worked);
    expect([data.todayRemainingH, data.todayRemainingM]).toEqual(remaining);
    const dailyExit = roundCheckInUp(now.add(Math.round(data.todayRemainingMinutesExact * 60_000), 'millisecond'));
    expect(dailyExit.format('HH:mm')).toBe('18:01');
    const status = getWeeklyStatus(now, data.weeklyRemainingMinutesExact, data.todayWorkedMinutes, true, settings);
    expect(status).toEqual(clock === '18:01:00' ? { kind: 'complete' } : { kind: 'finish', time: '18:01' });
  }
});

it('rounds a completion with seconds up rather than hiding its seconds', () => {
  expect(getWeeklyStatus(dayjs('2026-08-07T17:00:36'), 60, 480, true, settings))
    .toEqual({ kind: 'finish', time: '18:01' });
});
