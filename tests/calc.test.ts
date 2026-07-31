import dayjs from 'dayjs';
import { computeWeekData } from '../src/lib/calc';
import type { Snapshot } from '../src/types';

describe('computeWeekData', () => {
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
});
