const {
  calculateTime,
  calculateRemaining,
  calculateRemainingX,
  capDailyHours,
  timeNormalize,
  parseOOO,
  formatOOO,
} = require('../src/utils');

// ── calculateTime ──────────────────────────────────────────────
describe('calculateTime', () => {
  test('0 saat → [0, 0]', () => expect(calculateTime(0)).toEqual([0, 0]));
  test('1.5 saat → [1, 30]', () => expect(calculateTime(1.5)).toEqual([1, 30]));
  test('9 saat → [9, 0]', () => expect(calculateTime(9)).toEqual([9, 0]));
  test('0.25 saat → [0, 15]', () => expect(calculateTime(0.25)).toEqual([0, 15]));
  test('8.75 saat → [8, 45]', () => expect(calculateTime(8.75)).toEqual([8, 45]));
});

// ── calculateRemaining ─────────────────────────────────────────
describe('calculateRemaining', () => {
  describe('günlük (9s hedef)', () => {
    test('8 saat çalışıldı → 1s kalan', () => expect(calculateRemaining(8)).toEqual([1, 0]));
    test('9 saat çalışıldı → tamamlandı', () => expect(calculateRemaining(9)).toEqual([0, 0]));
    test('10 saat çalışıldı → tamamlandı (aşım)', () => expect(calculateRemaining(10)).toEqual([0, 0]));
    test('4.5 saat → [4, 30]', () => expect(calculateRemaining(4.5)).toEqual([4, 30]));
  });

  describe('haftalık (varsayılan 45s)', () => {
    test('40 saat → 5s kalan', () => expect(calculateRemaining(40, true)).toEqual([5, 0]));
    test('45 saat → tamamlandı', () => expect(calculateRemaining(45, true)).toEqual([0, 0]));
    test('50 saat → tamamlandı (aşım)', () => expect(calculateRemaining(50, true)).toEqual([0, 0]));
  });

  describe('özel hedef (OOO ile)', () => {
    test('40s çalışıldı, 46.5s hedef → 6s 30dk kalan', () =>
      expect(calculateRemaining(40, true, 46.5)).toEqual([6, 30]));
    test('36s hedef, 36s çalışıldı → tamamlandı', () =>
      expect(calculateRemaining(36, true, 36)).toEqual([0, 0]));
    test('izin ile 27s hedef, 20s çalışıldı → 7s kalan', () =>
      expect(calculateRemaining(20, true, 27)).toEqual([7, 0]));
  });
});

// ── calculateRemainingX ────────────────────────────────────────
describe('calculateRemainingX', () => {
  test('36 saat eşiği — 30s çalışıldı: 6s kalan 36e', () =>
    expect(calculateRemainingX(30, 9, 45)).toEqual([6, 0]));
  test('36 eşiği aşıldı → [0, 0]', () =>
    expect(calculateRemainingX(40, 9, 45)).toEqual([0, 0]));
  test('27 saat eşiği — 20s çalışıldı: 7s kalan', () =>
    expect(calculateRemainingX(20, 18, 45)).toEqual([7, 0]));
});

// ── capDailyHours ──────────────────────────────────────────────
describe('capDailyHours', () => {
  test('normal gün: 8s 30dk → değişmez', () => expect(capDailyHours(8, 30)).toEqual([8, 30]));
  test('tam 11 saat: 11s 0dk → değişmez', () => expect(capDailyHours(11, 0)).toEqual([11, 0]));
  test('11s 1dk → 11s 0dk\'ya kesilir', () => expect(capDailyHours(11, 1)).toEqual([11, 0]));
  test('11s 59dk → 11s 0dk\'ya kesilir', () => expect(capDailyHours(11, 59)).toEqual([11, 0]));
  test('12 saat → 11s 0dk\'ya kesilir', () => expect(capDailyHours(12, 0)).toEqual([11, 0]));
  test('14s 30dk → 11s 0dk\'ya kesilir', () => expect(capDailyHours(14, 30)).toEqual([11, 0]));
  test('0s 0dk → değişmez', () => expect(capDailyHours(0, 0)).toEqual([0, 0]));
});

// ── timeNormalize ──────────────────────────────────────────────
describe('timeNormalize', () => {
  test('standart format', () =>
    expect(timeNormalize('01.04.2026 08:13:00')).toEqual(['2026-04-01', '08:13:00']));
  test('farklı ay', () =>
    expect(timeNormalize('15.12.2025 17:30:00')).toEqual(['2025-12-15', '17:30:00']));
  test('satır sonu temizleme', () =>
    expect(timeNormalize('01.04.2026\n08:13:00')).toEqual(['2026-04-01', '08:13:00']));
});

// ── parseOOO ──────────────────────────────────────────────────
describe('parseOOO', () => {
  test('boş string → 0', () => expect(parseOOO('')).toBe(0));
  test('undefined → 0', () => expect(parseOOO(undefined)).toBe(0));
  test('"0:00" → 0', () => expect(parseOOO('0:00')).toBe(0));
  test('"1:30" → 90 dakika', () => expect(parseOOO('1:30')).toBe(90));
  test('"2:15" → 135 dakika', () => expect(parseOOO('2:15')).toBe(135));
  test('"0:45" → 45 dakika', () => expect(parseOOO('0:45')).toBe(45));
  test('"2" (saat) → 120 dakika', () => expect(parseOOO('2')).toBe(120));
  test('dakika 59 üst sınır: "1:75" → 1*60+59=119', () => expect(parseOOO('1:75')).toBe(119));
  test('negatif → 0', () => expect(parseOOO('-1:00')).toBe(0));
});

// ── formatOOO ─────────────────────────────────────────────────
describe('formatOOO', () => {
  test('0 → "0:00"', () => expect(formatOOO(0)).toBe('0:00'));
  test('null → "0:00"', () => expect(formatOOO(null)).toBe('0:00'));
  test('90 → "1:30"', () => expect(formatOOO(90)).toBe('1:30'));
  test('135 → "2:15"', () => expect(formatOOO(135)).toBe('2:15'));
  test('60 → "1:00"', () => expect(formatOOO(60)).toBe('1:00'));
  test('5 → "0:05"', () => expect(formatOOO(5)).toBe('0:05'));

  test('parseOOO ve formatOOO birbirinin tersi', () => {
    const cases = ['1:30', '2:15', '0:45', '3:00', '0:05'];
    cases.forEach(s => expect(formatOOO(parseOOO(s))).toBe(s));
  });
});
