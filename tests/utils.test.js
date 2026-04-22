const {
  calculateTime,
  calculateRemaining,
  calculateRemainingX,
  capDailyHours,
  timeNormalize,
  parseOOO,
  formatOOO,
  countValidWorkdays,
} = require('../src/utils');

const d = (str) => new Date(str); // helper: 'YYYY-MM-DD' → Date

// ── calculateTime ──────────────────────────────────────────────
describe('calculateTime', () => {
  test('0 hours → [0, 0]', () => expect(calculateTime(0)).toEqual([0, 0]));
  test('1.5 hours → [1, 30]', () => expect(calculateTime(1.5)).toEqual([1, 30]));
  test('9 hours → [9, 0]', () => expect(calculateTime(9)).toEqual([9, 0]));
  test('0.25 hours → [0, 15]', () => expect(calculateTime(0.25)).toEqual([0, 15]));
  test('8.75 hours → [8, 45]', () => expect(calculateTime(8.75)).toEqual([8, 45]));
});

// ── calculateRemaining ─────────────────────────────────────────
describe('calculateRemaining', () => {
  describe('daily (9h target)', () => {
    test('8h worked → 1h remaining', () => expect(calculateRemaining(8)).toEqual([1, 0]));
    test('9h worked → done', () => expect(calculateRemaining(9)).toEqual([0, 0]));
    test('10h worked → done (overage)', () => expect(calculateRemaining(10)).toEqual([0, 0]));
    test('4.5h → [4, 30]', () => expect(calculateRemaining(4.5)).toEqual([4, 30]));
  });

  describe('weekly (default 45h)', () => {
    test('40h → 5h remaining', () => expect(calculateRemaining(40, true)).toEqual([5, 0]));
    test('45h → done', () => expect(calculateRemaining(45, true)).toEqual([0, 0]));
    test('50h → done (overage)', () => expect(calculateRemaining(50, true)).toEqual([0, 0]));
  });

  describe('custom target (with OOO)', () => {
    test('40h worked, 46.5h target → 6h 30m remaining', () =>
      expect(calculateRemaining(40, true, 46.5)).toEqual([6, 30]));
    test('36h target, 36h worked → done', () =>
      expect(calculateRemaining(36, true, 36)).toEqual([0, 0]));
    test('27h target with leave, 20h worked → 7h remaining', () =>
      expect(calculateRemaining(20, true, 27)).toEqual([7, 0]));
  });
});

// ── calculateRemainingX ────────────────────────────────────────
describe('calculateRemainingX', () => {
  test('36h threshold — 30h worked: 6h remaining for 36', () =>
    expect(calculateRemainingX(30, 9, 45)).toEqual([6, 0]));
  test('36h threshold exceeded → [0, 0]', () =>
    expect(calculateRemainingX(40, 9, 45)).toEqual([0, 0]));
  test('27h threshold — 20h worked: 7h remaining', () =>
    expect(calculateRemainingX(20, 18, 45)).toEqual([7, 0]));
});

// ── capDailyHours ──────────────────────────────────────────────
describe('capDailyHours', () => {
  test('normal day: 8h 30m → unchanged', () => expect(capDailyHours(8, 30)).toEqual([8, 30]));
  test('exactly 11h: 11h 0m → unchanged', () => expect(capDailyHours(11, 0)).toEqual([11, 0]));
  test('11h 1m → capped to 11h 0m', () => expect(capDailyHours(11, 1)).toEqual([11, 0]));
  test('11h 59m → capped to 11h 0m', () => expect(capDailyHours(11, 59)).toEqual([11, 0]));
  test('12h → capped to 11h 0m', () => expect(capDailyHours(12, 0)).toEqual([11, 0]));
  test('14h 30m → capped to 11h 0m', () => expect(capDailyHours(14, 30)).toEqual([11, 0]));
  test('0h 0m → unchanged', () => expect(capDailyHours(0, 0)).toEqual([0, 0]));
});

// ── timeNormalize ──────────────────────────────────────────────
describe('timeNormalize', () => {
  test('standard format', () =>
    expect(timeNormalize('01.04.2026 08:13:00')).toEqual(['2026-04-01', '08:13:00']));
  test('different month', () =>
    expect(timeNormalize('15.12.2025 17:30:00')).toEqual(['2025-12-15', '17:30:00']));
  test('strips line breaks', () =>
    expect(timeNormalize('01.04.2026\n08:13:00')).toEqual(['2026-04-01', '08:13:00']));
});

// ── parseOOO ──────────────────────────────────────────────────
describe('parseOOO', () => {
  test('empty string → 0', () => expect(parseOOO('')).toBe(0));
  test('undefined → 0', () => expect(parseOOO(undefined)).toBe(0));
  test('"0:00" → 0', () => expect(parseOOO('0:00')).toBe(0));
  test('"1:30" → 90 minutes', () => expect(parseOOO('1:30')).toBe(90));
  test('"2:15" → 135 minutes', () => expect(parseOOO('2:15')).toBe(135));
  test('"0:45" → 45 minutes', () => expect(parseOOO('0:45')).toBe(45));
  test('"2" (hours) → 120 minutes', () => expect(parseOOO('2')).toBe(120));
  test('minutes capped at 59: "1:75" → 1*60+59=119', () => expect(parseOOO('1:75')).toBe(119));
  test('negative → 0', () => expect(parseOOO('-1:00')).toBe(0));
});

// ── countValidWorkdays ─────────────────────────────────────────
describe('countValidWorkdays', () => {
  describe('full week, all days in same month', () => {
    // Mon 2026-04-06 … Sun 2026-04-12, monthStart = 2026-04-01
    test('5 workdays in a normal week', () =>
      expect(countValidWorkdays(d('2026-04-06'), d('2026-04-12'), d('2026-04-01'))).toBe(5));
  });

  describe('partial first week — some days in previous month', () => {
    // Week Mon 2026-03-30 … Sun 2026-04-05, monthStart = 2026-04-01
    // Wed 1 Apr, Thu 2 Apr, Fri 3 Apr belong to April → 3 valid workdays
    test('Mon-Tue in March, Wed-Fri in April → 3', () =>
      expect(countValidWorkdays(d('2026-03-30'), d('2026-04-05'), d('2026-04-01'))).toBe(3));

    // Week Mon 2026-03-30 … Sun 2026-04-05, monthStart = 2026-03-01 (full week in March context)
    test('same week, March context → 5', () =>
      expect(countValidWorkdays(d('2026-03-30'), d('2026-04-05'), d('2026-03-01'))).toBe(5));
  });

  describe('monthStart falls mid-week', () => {
    // 2026-01-01 is a Thursday. Week Mon 2025-12-29 … Sun 2026-01-04, monthStart = 2026-01-01
    // Thu 1 Jan, Fri 2 Jan belong to January → 2 valid workdays
    test('monthStart on Thursday → 2 valid workdays', () =>
      expect(countValidWorkdays(d('2025-12-29'), d('2026-01-04'), d('2026-01-01'))).toBe(2));

    // 2026-06-01 is a Monday. Week Mon 2026-06-01 … Sun 2026-06-07, monthStart = 2026-06-01
    test('monthStart on Monday → full 5 workdays', () =>
      expect(countValidWorkdays(d('2026-06-01'), d('2026-06-07'), d('2026-06-01'))).toBe(5));
  });

  describe('edge cases', () => {
    // Week is entirely before monthStart
    test('entire week before monthStart → 0', () =>
      expect(countValidWorkdays(d('2026-03-23'), d('2026-03-29'), d('2026-04-01'))).toBe(0));

    // Weekend-only week edge (shouldn't happen, but robust)
    test('weekend days only counted as 0 workdays', () =>
      expect(countValidWorkdays(d('2026-04-04'), d('2026-04-05'), d('2026-04-01'))).toBe(0));
  });
});

// ── formatOOO ─────────────────────────────────────────────────
describe('formatOOO', () => {
  test('0 → "0:00"', () => expect(formatOOO(0)).toBe('0:00'));
  test('null → "0:00"', () => expect(formatOOO(null)).toBe('0:00'));
  test('90 → "1:30"', () => expect(formatOOO(90)).toBe('1:30'));
  test('135 → "2:15"', () => expect(formatOOO(135)).toBe('2:15'));
  test('60 → "1:00"', () => expect(formatOOO(60)).toBe('1:00'));
  test('5 → "0:05"', () => expect(formatOOO(5)).toBe('0:05'));

  test('parseOOO and formatOOO are inverses', () => {
    const cases = ['1:30', '2:15', '0:45', '3:00', '0:05'];
    cases.forEach(s => expect(formatOOO(parseOOO(s))).toBe(s));
  });
});
