import dayjs from 'dayjs';
import {
  findEarliestPunch,
  findLatestPunch,
  parseDurationMinutes,
  parsePortalDateTime,
} from '../src/lib/parser-utils';

describe('parser-utils', () => {
  test('finds earliest and latest punches regardless of row order', () => {
    const today = dayjs('2026-08-13T12:00:00');
    const punches = [
      '13.08.2026 17:00:00',
      '13.08.2026 13:00:00',
      '13.08.2026 08:00:00',
      '13.08.2026 12:00:00',
    ];

    expect(findEarliestPunch(punches, today)?.format('HH:mm:ss')).toBe('08:00:00');
    expect(findLatestPunch(punches, today)?.format('HH:mm:ss')).toBe('17:00:00');
  });

  test('ignores punches from another day', () => {
    const today = dayjs('2026-08-13T12:00:00');
    const punches = ['12.08.2026 07:00:00', '13.08.2026 09:15:00'];

    expect(findEarliestPunch(punches, today)?.format('HH:mm:ss')).toBe('09:15:00');
  });

  test.each([
    'not-a-date',
    '31.02.2026 09:00:00',
    '13.08.2026 24:00:00',
    '13.08.2026 12:60:00',
    '13.08.2026 xx:yy:zz',
  ])('rejects malformed portal datetime: %s', (value) => {
    expect(parsePortalDateTime(value)).toBeNull();
  });

  test('accepts valid portal datetime without seconds', () => {
    expect(parsePortalDateTime('13.08.2026 09:05')?.format('YYYY-MM-DD HH:mm:ss'))
      .toBe('2026-08-13 09:05:00');
  });

  test.each(['abc', '1:75', '-1:30', '1.5:30'])('rejects malformed duration: %s', (value) => {
    expect(parseDurationMinutes(value)).toBeNull();
  });

  test('parses valid durations', () => {
    expect(parseDurationMinutes('9:30')).toBe(570);
    expect(parseDurationMinutes('12:05')).toBe(725);
  });
});
