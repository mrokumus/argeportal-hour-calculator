import dayjs from 'dayjs';
import { getDueWorkNotifications } from '../src/lib/work-notifications';
import { DEFAULT_SETTINGS } from '../src/config';
import type { Snapshot } from '../src/types';

const settings = { ...DEFAULT_SETTINGS, workdays: [1, 2, 3, 4, 5], notifyDailyTarget: true, notifyDailyCap: true };
const leave = { leave: 0, ooo: 0, autoDetected: false };
const snapshot: Snapshot = {
  capturedAt: '2026-10-19T09:01:00', capturedDay: '2026-10-19',
  firstRecordISO: '2026-10-19T09:01:00', lastRecordISO: '2026-10-19T09:01:00',
  todayHasOpenSession: true, todayCompletedSessionMinutes: 0,
  dailyTotalsSessions: {}, dailyTotalsSpan: {},
};
const due = (clock: string, sent: string[] = []) => getDueWorkNotifications(snapshot, settings, 'sessions', leave,
  { day: '2026-10-19', sent }, dayjs(`2026-10-19T${clock}`)).map(item => item.key);
it('does not notify a second before the target', () => { expect(due('18:00:59')).toEqual([]); });
it('notifies at the configured target', () => { expect(due('18:01:00')).toEqual(['target:540']); });
it('does not repeat a sent target', () => { expect(due('18:30:00', ['target:540'])).toEqual([]); });
it('notifies the cap separately', () => { expect(due('20:01:00', ['target:540'])).toEqual(['cap:660']); });
it('returns both after missing both thresholds', () => { expect(due('21:01:00')).toEqual(['target:540', 'cap:660']); });
it('resets the notification state on a new day', () => {
  expect(getDueWorkNotifications(snapshot, settings, 'sessions', leave,
    { day: '2026-10-18', sent: ['target:540', 'cap:660'] }, dayjs('2026-10-19T18:01:00')).map(item => item.key)).toEqual(['target:540']);
});
it('respects disabled thresholds', () => {
  expect(getDueWorkNotifications(snapshot, { ...settings, notifyDailyTarget: false }, 'sessions', leave, null,
    dayjs('2026-10-19T20:01:00')).map(item => item.key)).toEqual(['cap:660']);
});
it('respects both disabled switches', () => {
  expect(getDueWorkNotifications(snapshot, { ...DEFAULT_SETTINGS, workdays: [1, 2, 3, 4, 5], notifyDailyTarget: false, notifyDailyCap: false }, 'sessions', leave, null,
    dayjs('2026-10-19T20:01:00'))).toEqual([]);
});
it.each([false, undefined])('does not notify a closed or unconfirmed session (%s)', open => {
  expect(getDueWorkNotifications({ ...snapshot, todayHasOpenSession: open }, settings, 'sessions', leave, null,
    dayjs('2026-10-19T20:01:00'))).toEqual([]);
});
it('does not use yesterday or a missing check-in', () => {
  expect(getDueWorkNotifications(snapshot, settings, 'sessions', leave, null, dayjs('2026-10-20T20:01:00'))).toEqual([]);
  expect(getDueWorkNotifications({ ...snapshot, firstRecordISO: null }, settings, 'sessions', leave, null,
    dayjs('2026-10-19T20:01:00'))).toEqual([]);
});
it('respects configured workdays', () => {
  expect(getDueWorkNotifications(snapshot, { ...settings, workdays: [2, 3, 4, 5] }, 'sessions', leave, null,
    dayjs('2026-10-19T20:01:00'))).toEqual([]);
});
it('excludes breaks in sessions mode', () => {
  const paused = { ...snapshot, firstRecordISO: '2026-10-19T09:00:00', lastRecordISO: '2026-10-19T13:00:00', todayCompletedSessionMinutes: 180 };
  const now = dayjs('2026-10-19T18:00:00');
  expect(getDueWorkNotifications(paused, settings, 'sessions', leave, null, now)).toEqual([]);
  expect(getDueWorkNotifications(paused, settings, 'span', leave, null, now).map(item => item.key)).toEqual(['target:540']);
});
it('uses custom fractional daily targets', () => {
  const custom = { ...settings, dailyTargetMinutes: 510 };
  expect(getDueWorkNotifications(snapshot, custom, 'sessions', leave, null, dayjs('2026-10-19T17:30:59'))).toEqual([]);
  expect(getDueWorkNotifications(snapshot, custom, 'sessions', leave, null, dayjs('2026-10-19T17:31:00')).map(item => item.key)).toEqual(['target:510']);
});
it('adds only today OOO to a custom cap', () => {
  const custom = { ...settings, dailyCapMinutes: 600 };
  const dated = { ...leave, ooo: 90, oooByDate: { '2026-10-19': 90 } };
  expect(getDueWorkNotifications(snapshot, custom, 'sessions', dated, { day: '2026-10-19', sent: ['target:540'] }, dayjs('2026-10-19T20:01:00'))).toEqual([]);
  expect(getDueWorkNotifications(snapshot, custom, 'sessions', dated, { day: '2026-10-19', sent: ['target:540'] }, dayjs('2026-10-19T20:31:00')).map(item => item.key)).toEqual(['cap:690']);
});
it('does not increase the cap for another day or undated OOO', () => {
  for (const data of [{ ...leave, ooo: 90 }, { ...leave, ooo: 90, oooByDate: { '2026-10-20': 90 } }]) {
    expect(getDueWorkNotifications(snapshot, settings, 'sessions', data, null, dayjs('2026-10-19T20:01:00')).map(item => item.key)).toEqual(['target:540', 'cap:660']);
  }
});
it('uses the new cap after OOO changes without repeating the daily target', () => {
  expect(getDueWorkNotifications(snapshot, settings, 'sessions', { ...leave, ooo: 60, oooByDate: { '2026-10-19': 60 } },
    { day: '2026-10-19', sent: ['target:540', 'cap:660'] }, dayjs('2026-10-19T21:01:00')).map(item => item.key)).toEqual(['cap:720']);
});


it('disables new notification preferences by default', () => {
  expect(DEFAULT_SETTINGS.notifyDailyTarget).toBe(false);
  expect(DEFAULT_SETTINGS.notifyDailyCap).toBe(false);
});
