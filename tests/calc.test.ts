import dayjs from 'dayjs';
import { computeWeekData } from '../src/lib/calc';
import type { Snapshot } from '../src/types';

describe('computeWeekData', () => {
  it('starts a workday at zero with the daily target remaining before check-in', () => {
    const now = dayjs('2026-08-07T00:03:00');
    const snapshot: Snapshot = {
      capturedAt: now.toISOString(),
      capturedDay: '2026-08-07',
      firstRecordISO: null,
      lastRecordISO: null,
      todayHasOpenSession: false,
      dailyTotalsSessions: {},
      dailyTotalsSpan: {},
    };

    const result = computeWeekData(
      snapshot,
      0,
      'sessions',
      { leave: 0, ooo: 0, autoDetected: false },
      now,
      9,
    );

    expect([result.data.todayH, result.data.todayM]).toEqual([0, 0]);
    expect([result.data.todayRemainingH, result.data.todayRemainingM]).toEqual([9, 0]);
  });

  it('reduces the weekly target by 9h for one manually entered leave day', () => {
    const now = dayjs('2026-08-06T18:03:00');
    const snapshot: Snapshot = {
      capturedAt: now.toISOString(),
      capturedDay: '2026-08-06',
      firstRecordISO: dayjs('2026-08-06T08:28:00').toISOString(),
      lastRecordISO: now.toISOString(),
      todayHasOpenSession: false,
      dailyTotalsSessions: {
        '2026-08-03': 542,
        '2026-08-04': 414,
        '2026-08-05': 652,
        '2026-08-06': 575,
      },
      dailyTotalsSpan: {},
    };

    const result = computeWeekData(
      snapshot,
      0,
      'sessions',
      { leave: 1, ooo: 0, autoDetected: false },
      now,
      11,
    );

    expect(result.data.weekTargetH).toBe(36);
  });

  it('stops the live counter after the final check-out and uses the recorded total', () => {
    const now = dayjs('2026-08-06T23:32:00');
    const snapshot: Snapshot = {
      capturedAt: now.toISOString(),
      capturedDay: '2026-08-06',
      firstRecordISO: dayjs('2026-08-06T08:28:00').toISOString(),
      lastRecordISO: dayjs('2026-08-06T18:03:00').toISOString(),
      todayHasOpenSession: false,
      dailyTotalsSessions: { '2026-08-06': 575 },
      dailyTotalsSpan: { '2026-08-06': 575 },
    };

    const result = computeWeekData(
      snapshot,
      0,
      'sessions',
      { leave: 0, ooo: 0, autoDetected: false },
      now,
    );

    expect([result.data.todayH, result.data.todayM]).toEqual([9, 35]);
    expect([result.data.todayRemainingH, result.data.todayRemainingM]).toEqual([0, 0]);
  });

  it('uses a custom daily target for today remaining and exit calculations', () => {
    const now = dayjs('2026-08-06T17:00:00');
    const snapshot: Snapshot = {
      capturedAt: now.toISOString(),
      capturedDay: '2026-08-06',
      firstRecordISO: dayjs('2026-08-06T09:00:00').toISOString(),
      dailyTotalsSessions: {},
      dailyTotalsSpan: {},
    };

    const result = computeWeekData(
      snapshot,
      0,
      'sessions',
      { leave: 0, ooo: 0, autoDetected: false },
      now,
      11,
    );

    expect([result.data.todayRemainingH, result.data.todayRemainingM]).toEqual([3, 0]);
    expect([result.data.exitRemainingH, result.data.exitRemainingM]).toEqual([3, 0]);
  });

  it('caps today at 11h when calculating the weekly remainder', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-31T23:00:00'));
    const now = dayjs('2026-07-31T23:00:00');
    const snapshot: Snapshot = {
      capturedAt: now.toISOString(),
      capturedDay: '2026-07-31',
      firstRecordISO: dayjs('2026-07-31T11:00:00').toISOString(),
      dailyTotalsSessions: {
        '2026-07-27': 480,
        '2026-07-28': 480,
        '2026-07-29': 480,
        '2026-07-30': 480,
      },
      dailyTotalsSpan: {},
    };

    const result = computeWeekData(
      snapshot,
      0,
      'sessions',
      { leave: 0, ooo: 0, autoDetected: false },
      now,
    );

    expect(result.data.weekTargetH).toBe(45);
    expect(result.data.todayH).toBe(12);
    expect([result.data.exitRemainingH, result.data.exitRemainingM]).toEqual([2, 0]);
    jest.useRealTimers();
  });

  it('moves Friday check-in one minute later for each extra minute worked on Thursday', () => {
    const snapshot: Snapshot = {
      capturedAt: dayjs('2026-08-13T17:00:00').toISOString(),
      capturedDay: '2026-08-13',
      firstRecordISO: dayjs('2026-08-13T09:00:00').toISOString(),
      todayHasOpenSession: true,
      dailyTotalsSessions: {
        '2026-08-10': 600,
        '2026-08-11': 600,
        '2026-08-12': 540,
      },
      dailyTotalsSpan: {},
    };
    const leave = { leave: 0, ooo: 0, autoDetected: false };

    const atFive = computeWeekData(snapshot, 0, 'sessions', leave, dayjs('2026-08-13T17:00:00'));
    const atFiveOhOne = computeWeekData(snapshot, 0, 'sessions', leave, dayjs('2026-08-13T17:01:00'));
    const remaining = (result: typeof atFive) => {
      const worked = result.data.weekTotalMin + result.data.todayH * 60 + result.data.todayM;
      return result.data.weekTargetH * 60 - worked;
    };
    const fridayExit = 15 * 60;

    expect(remaining(atFive)).toBe(8 * 60);
    expect(fridayExit - remaining(atFive)).toBe(7 * 60);
    expect(remaining(atFiveOhOne)).toBe(7 * 60 + 59);
    expect(fridayExit - remaining(atFiveOhOne)).toBe(7 * 60 + 1);
  });
});
