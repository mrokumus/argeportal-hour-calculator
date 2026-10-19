import dayjs from 'dayjs';
import { computeWeekData, getPreviousWeekSummary, getWeeklyStatus } from '../src/lib/calc';
import { getDailyCap, getDailyOoo, getWeekOoo, getUnassignedOoo, setDailyOoo, assignUnassignedOoo } from '../src/lib/ooo';
import { DEFAULT_SETTINGS } from '../src/config';
import type { LeaveData, Snapshot } from '../src/types';

const settings = { ...DEFAULT_SETTINGS, workdays: [1, 2, 3, 4, 5] };
const empty: LeaveData = { leave: 0, ooo: 0, autoDetected: false };
const tuesday = '2026-10-20';
const snapshot: Snapshot = {
  capturedAt: '2026-10-20T20:00:00', capturedDay: tuesday,
  firstRecordISO: '2026-10-20T08:00:00', lastRecordISO: '2026-10-20T08:00:00',
  todayHasOpenSession: true, todayCompletedSessionMinutes: 0,
  dailyTotalsSessions: { '2026-10-19': 720 }, dailyTotalsSpan: { '2026-10-19': 720 },
};

it('adds one hour only to the assigned date cap', () => {
  const data = setDailyOoo(empty, tuesday, 60);
  expect(getDailyCap(660, data, tuesday)).toBe(720);
  expect(getDailyCap(660, data, '2026-10-19')).toBe(660);
  expect(data.ooo).toBe(60);
});
it('credits twelve hours today without raising the previous day cap', () => {
  const { data } = computeWeekData(snapshot, 0, 'sessions', setDailyOoo(empty, tuesday, 60), dayjs('2026-10-20T20:00:00'), 9, settings);
  expect(data.weekTargetH).toBe(46);
  expect(data.weekTotalMin).toBe(660);
  expect(data.weekTotalWithTodayMin).toBe(660 + 720);
  expect(data.weeklyRemainingMinutes).toBe(46 * 60 - 1380);
  expect(data.todayRemainingH).toBe(0);
});
it('keeps today at eleven hours if OOO belongs to another day', () => {
  const { data } = computeWeekData(snapshot, 0, 'span', setDailyOoo(empty, '2026-10-19', 60), dayjs('2026-10-20T20:00:00'), 9, settings);
  expect(data.weekTotalMin).toBe(720);
  expect(data.weekTotalWithTodayMin).toBe(720 + 660);
});
it('honors a configured base cap instead of hardcoding eleven hours', () => {
  expect(getDailyCap(600, setDailyOoo(empty, tuesday, 90), tuesday)).toBe(690);
});
it('updates totals when OOO changes or is removed', () => {
  let data = setDailyOoo(empty, tuesday, 60);
  data = setDailyOoo(data, '2026-10-19', 90);
  expect(data.ooo).toBe(150);
  data = setDailyOoo(data, tuesday, 30);
  expect(data.ooo).toBe(120);
  data = setDailyOoo(data, tuesday, 0);
  expect(data.ooo).toBe(90);
  expect(getDailyCap(660, data, tuesday)).toBe(660);
});
it('preserves undated legacy OOO without applying it to every day', () => {
  const legacy = { ...empty, ooo: 120 };
  const data = setDailyOoo(legacy, tuesday, 60);
  expect(data.ooo).toBe(180);
  expect(getUnassignedOoo(data)).toBe(120);
  expect(getDailyCap(660, legacy, tuesday)).toBe(660);
  expect(getDailyCap(660, data, tuesday)).toBe(720);
});
it('assigns old OOO to a chosen date without increasing the weekly target again', () => {
  const data = assignUnassignedOoo({ ...empty, ooo: 60 }, tuesday);
  expect(data.ooo).toBe(60);
  expect(getUnassignedOoo(data)).toBe(0);
  expect(getDailyOoo(data, tuesday)).toBe(60);
});
it('retains excess undated OOO when one day cannot accept all of it', () => {
  const data = assignUnassignedOoo({ ...empty, ooo: 1500 }, tuesday);
  expect(data.ooo).toBe(1500);
  expect(getDailyOoo(data, tuesday)).toBe(1440);
  expect(getUnassignedOoo(data)).toBe(60);
});
it('preserves assigned days when manually editing leave', () => {
  const data = { ...setDailyOoo(empty, tuesday, 60), leave: 1 };
  expect(getDailyOoo(data, tuesday)).toBe(60);
  expect(data.ooo).toBe(60);
});
it('ignores dated OOO outside the computed month and week', () => {
  let data = setDailyOoo(empty, '2026-06-29', 60);
  data = setDailyOoo(data, '2026-07-01', 90);
  data = setDailyOoo(data, '2026-07-06', 120);
  expect(getWeekOoo(data, dayjs('2026-06-29'), dayjs('2026-07-05'), dayjs('2026-07-06'))).toBe(90);
  const { data: calculated } = computeWeekData({ ...snapshot, capturedDay: '2026-07-06' }, -1, 'sessions', data, dayjs('2026-07-06'), 9, settings);
  expect(calculated.weekTargetH).toBe(28.5);
});
it('uses dated caps for previous-week totals and completion marks', () => {
  const leave = setDailyOoo(empty, '2026-10-19', 60);
  const data = getPreviousWeekSummary({ ...snapshot, capturedDay: '2026-10-26' }, dayjs('2026-10-26'), 'sessions', settings, leave);
  expect(data.minutes).toBe(720);
});
it('allows weekly completion in the added capacity only on the OOO date', () => {
  const leave = setDailyOoo(empty, '2026-10-23', 60);
  const now = dayjs('2026-10-23T18:00:00');
  expect(getWeeklyStatus(now, 60, 660, true,
    { ...settings, dailyCapMinutes: getDailyCap(settings.dailyCapMinutes, leave, '2026-10-23') }))
    .toEqual({ kind: 'finish', time: '19:00' });
  expect(getWeeklyStatus(now, 60, 660, true, settings).kind).toBe('daily-cap');
});
it('keeps second-level precision within the added capacity', () => {
  const leave = setDailyOoo(empty, tuesday, 60);
  const { data } = computeWeekData(snapshot, 0, 'sessions', leave, dayjs('2026-10-20T19:59:36'), 9, settings);
  expect(data.weekTotalWithTodayMin).toBe(660 + 719);
  expect(data.weeklyRemainingMinutesExact).toBeCloseTo(46 * 60 - 660 - 719.6);
});
it('validates invalid and oversized OOO values', () => {
  expect(getDailyOoo(setDailyOoo(empty, tuesday, -1), tuesday)).toBe(0);
  expect(getDailyOoo(setDailyOoo(empty, tuesday, NaN), tuesday)).toBe(0);
  expect(getDailyOoo(setDailyOoo(empty, tuesday, 2000), tuesday)).toBe(1440);
});
