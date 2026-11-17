import dayjs from 'dayjs';
import { computeWeekData } from '../src/lib/calc';
import { applyManualPunches, EMPTY_SNAPSHOT, getPunchTimes, mergePortalSnapshot, validPunchTimes } from '../src/lib/punches';
import type { Snapshot } from '../src/types';

const wednesday = '2026-10-21';
const thursday = '2026-10-22';
const monday = '2026-10-19';
const stamp = (date: string, clock: string) => dayjs(`${date}T${clock}`).toISOString();
const snapshot: Snapshot = {
  ...EMPTY_SNAPSHOT,
  capturedDay: wednesday,
  capturedAt: stamp(wednesday, '12:00'),
  punchesByDate: {
    [wednesday]: { entryISO: stamp(wednesday, '09:00'), lastISO: stamp(wednesday, '09:00'), open: true, completedMinutes: 0 },
  },
  dailyTotalsSessions: { [monday]: 480 },
  dailyTotalsSpan: { [monday]: 540, [wednesday]: 0 },
};

it('keeps the previous capture when the portal returns no records', () => {
  expect(mergePortalSnapshot(snapshot, { ...EMPTY_SNAPSHOT, capturedDay: thursday })).toBe(snapshot);
});

it('keeps earlier totals and fills in a checkout learned on a later day', () => {
  const closed = { ...snapshot.punchesByDate![wednesday], lastISO: stamp(wednesday, '18:00'), open: false, completedMinutes: 540 };
  const merged = mergePortalSnapshot(snapshot, {
    ...EMPTY_SNAPSHOT, capturedDay: thursday, punchesByDate: { [wednesday]: closed },
    dailyTotalsSessions: { [wednesday]: 540 }, dailyTotalsSpan: { [wednesday]: 540 },
  });
  expect(getPunchTimes(merged, wednesday)).toEqual({ entry: '09:00', exit: '18:00' });
  expect(merged.dailyTotalsSessions).toEqual({ [monday]: 480, [wednesday]: 540 });
  expect(applyManualPunches(merged, {}, thursday).firstRecordISO).toBeNull();
});

it('preserves the old first entry when migrating a cache without per-day punches', () => {
  const legacy = { ...snapshot, punchesByDate: undefined, firstRecordISO: stamp(wednesday, '09:00'), todayHasOpenSession: true };
  const merged = mergePortalSnapshot(legacy, { ...EMPTY_SNAPSHOT, capturedDay: thursday, dailyTotalsSessions: { [thursday]: 60 } });
  expect(getPunchTimes(merged, wednesday)).toEqual({ entry: '09:00', exit: undefined });
});

it('completes a previously open day with a manual exit', () => {
  const effective = applyManualPunches(snapshot, { [wednesday]: { exit: '18:15' } }, thursday);
  expect(effective.dailyTotalsSessions[wednesday]).toBe(555);
  expect(effective.dailyTotalsSpan[wednesday]).toBe(555);
  expect(snapshot.dailyTotalsSessions[wednesday]).toBeUndefined();
});

it('counts a manual entry live without a portal and leaves the previous day incomplete', () => {
  const manual = { [wednesday]: { entry: '09:00' } };
  const now = dayjs(`${wednesday}T12:00`);
  const leave = { leave: 0, ooo: 0, autoDetected: true };
  expect(computeWeekData(applyManualPunches(EMPTY_SNAPSHOT, manual, wednesday), 0, 'sessions', leave, now).data.todayWorkedMinutes).toBe(180);
  expect(computeWeekData(applyManualPunches(EMPTY_SNAPSHOT, manual, thursday), 0, 'sessions', leave, now.add(1, 'day')).data.leaveData.leave).toBe(0);
});

it('retains an exit entered first so a later entry can complete the day', () => {
  expect(applyManualPunches(EMPTY_SNAPSHOT, { [wednesday]: { exit: '18:00' } }, wednesday).dailyTotalsSessions[wednesday]).toBeUndefined();
  expect(applyManualPunches(EMPTY_SNAPSHOT, { [wednesday]: { entry: '09:00', exit: '18:00' } }, wednesday).dailyTotalsSessions[wednesday]).toBe(540);
  expect(validPunchTimes('18:00', '09:00')).toBe(false);
});
