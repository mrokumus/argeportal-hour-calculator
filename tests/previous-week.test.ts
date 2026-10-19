import dayjs from 'dayjs';
import { getPreviousWeekSummary } from '../src/lib/calc';
import { DEFAULT_SETTINGS } from '../src/config';
import type { Snapshot } from '../src/types';

const settings = { ...DEFAULT_SETTINGS, workdays: [1, 2, 3, 4, 5] };
const snapshot: Snapshot = {
  capturedAt: '2026-10-19T15:00:00', capturedDay: '2026-10-19', firstRecordISO: null,
  dailyTotalsSessions: { '2026-10-12': 600, '2026-10-13': 720, '2026-10-14': 359, '2026-10-16': 540, '2026-10-19': 120 },
  dailyTotalsSpan: { '2026-10-12': 660, '2026-10-13': 780, '2026-10-14': 400, '2026-10-16': 600 },
};

it('sums the previous Monday–Sunday using daily caps and short-day rules', () => {
  const result = getPreviousWeekSummary(snapshot, dayjs('2026-10-19'), 'sessions', settings);
  expect(result).toEqual({ minutes: 1800, complete: true, start: '2026-10-12', end: '2026-10-18' });
});
it('uses the selected calculation mode', () => {
  expect(getPreviousWeekSummary(snapshot, dayjs('2026-10-19'), 'span', settings).minutes).toBe(2320);
});
it('uses configured caps and thresholds', () => {
  expect(getPreviousWeekSummary(snapshot, dayjs('2026-10-19'), 'sessions',
    { ...settings, dailyCapMinutes: 600, shortDayThresholdMinutes: 300 }).minutes).toBe(2099);
});
it('includes weekend work and keeps a stable Monday boundary on Sunday', () => {
  const result = getPreviousWeekSummary({ ...snapshot,
    dailyTotalsSessions: { '2026-10-17': 400, '2026-10-18': 450 } }, dayjs('2026-10-25'), 'sessions', settings);
  expect(result.minutes).toBe(850);
  expect(result.start).toBe('2026-10-12');
});
it.each([
  ['2026-07-03', 540, 1620],
  ['2026-07-04', 540, 2160],
])('counts only current-month days in a split week through %s', (lastDate, minutes, expected) => {
  // June 29 is Monday; June has 30 days. July starts on Wednesday.
  const totals: Record<string, number> = {
    '2026-06-29': 540, '2026-06-30': 540,
    '2026-07-01': 540, '2026-07-02': 540, '2026-07-03': 540,
  };
  totals[lastDate] = minutes;
  const result = getPreviousWeekSummary({ ...snapshot, capturedDay: '2026-07-06',
    dailyTotalsSessions: totals }, dayjs('2026-07-06'), 'sessions', settings);
  expect(result.minutes).toBe(expected);
  expect(result.complete).toBe(true);
});
it('excludes prior-year days when the previous week crosses New Year', () => {
  const result = getPreviousWeekSummary({ ...snapshot, capturedDay: '2026-01-05',
    dailyTotalsSessions: { '2025-12-29': 540, '2025-12-31': 600, '2026-01-02': 660 },
  }, dayjs('2026-01-05'), 'sessions', settings);
  expect(result.minutes).toBe(660);
  expect(result.complete).toBe(true);
});
it('shows zero when the entire previous week belongs to the previous month', () => {
  const result = getPreviousWeekSummary({ ...snapshot, capturedDay: '2026-06-01',
    dailyTotalsSessions: { '2026-05-29': 540 },
  }, dayjs('2026-06-01'), 'sessions', settings);
  expect(result.minutes).toBe(0);
  expect(result.complete).toBe(true);
});
it('does not use a snapshot from another month as complete coverage', () => {
  expect(getPreviousWeekSummary(snapshot, dayjs('2026-11-02'), 'sessions', settings).complete).toBe(false);
});
it('does not present a snapshot captured during that week as a completed total', () => {
  expect(getPreviousWeekSummary({ ...snapshot, capturedDay: '2026-10-14' },
    dayjs('2026-10-19'), 'sessions', settings).complete).toBe(false);
});
it('shows a genuinely empty covered week as zero', () => {
  const result = getPreviousWeekSummary({ ...snapshot, dailyTotalsSessions: {} }, dayjs('2026-10-19'), 'sessions', settings);
  expect(result.complete).toBe(true);
  expect(result.minutes).toBe(0);
});
