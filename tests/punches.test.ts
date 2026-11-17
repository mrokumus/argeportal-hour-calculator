import dayjs from 'dayjs';
import { computeWeekData } from '../src/lib/calc';
import { applyManualPunches, EMPTY_SNAPSHOT, getPunchTimes, mergePortalSnapshot } from '../src/lib/punches';
import { validPunchTimes } from '../src/lib/time-utils';
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

it.each([['10:00', 180], ['08:00', 300], ['13:30', 30]])(
  'adjusts completed and open sessions after overriding entry to %s', (entry, expected) => {
    const portal: Snapshot = {
      ...snapshot,
      punchesByDate: {
        [wednesday]: {
          entryISO: stamp(wednesday, '09:00'), lastISO: stamp(wednesday, '13:00'),
          open: true, completedMinutes: 180,
        },
      },
      dailyTotalsSessions: { [wednesday]: 180 },
      dailyTotalsSpan: { [wednesday]: 240 },
    };
    const effective = applyManualPunches(portal, { [wednesday]: { entry } }, wednesday);
    const result = computeWeekData(effective, 0, 'sessions',
      { leave: 0, ooo: 0, autoDetected: false }, dayjs(`${wednesday}T14:00`));
    expect(result.data.todayWorkedMinutes).toBe(expected);
    expect(portal.punchesByDate![wednesday].completedMinutes).toBe(180);
  },
);

it.each(['sessions', 'span'] as const)('keeps an exit-only past day out of automatic leave in %s mode', mode => {
  const portal: Snapshot = {
    ...EMPTY_SNAPSHOT, capturedDay: thursday, capturedAt: stamp(thursday, '12:00'),
    dailyTotalsSessions: { [monday]: 540, '2026-10-20': 540 },
    dailyTotalsSpan: { [monday]: 540, '2026-10-20': 540 },
  };
  const effective = applyManualPunches(portal, { [wednesday]: { exit: '18:00' } }, thursday);
  const result = computeWeekData(effective, 0, mode,
    { leave: 0, ooo: 0, autoDetected: true }, dayjs(`${thursday}T12:00`));
  expect(result.data.leaveData.leave).toBe(0);
  expect(result.data.weekTargetH).toBe(45);
  expect(effective.firstRecordISO).toBeNull();
  expect(effective.dailyTotalsSessions[wednesday]).toBeUndefined();
});

it('accepts corrected portal times and zero totals for a returned day', () => {
  const original: Snapshot = {
    ...snapshot,
    punchesByDate: { [wednesday]: {
      entryISO: stamp(wednesday, '09:00'), lastISO: stamp(wednesday, '18:00'),
      open: false, completedMinutes: 540,
    } },
    dailyTotalsSessions: { [wednesday]: 540 },
    dailyTotalsSpan: { [wednesday]: 540 },
  };
  const corrected = mergePortalSnapshot(original, {
    ...snapshot,
    punchesByDate: { [wednesday]: {
      entryISO: stamp(wednesday, '10:00'), lastISO: stamp(wednesday, '17:00'),
      open: false, completedMinutes: 420,
    } },
    dailyTotalsSessions: { [wednesday]: 420 },
    dailyTotalsSpan: { [wednesday]: 420 },
  });
  expect(getPunchTimes(corrected, wednesday)).toEqual({ entry: '10:00', exit: '17:00' });
  expect(corrected.dailyTotalsSessions[wednesday]).toBe(420);
  const cleared = mergePortalSnapshot(corrected, {
    ...snapshot, punchesByDate: {},
    dailyTotalsSessions: { [wednesday]: 0 }, dailyTotalsSpan: { [wednesday]: 0 },
  });
  expect(cleared.dailyTotalsSessions[wednesday]).toBe(0);
});

it('does not count a previous-day entry as today when per-day records exist', () => {
  const stale: Snapshot = {
    ...snapshot, firstRecordISO: stamp(wednesday, '09:00'),
    lastRecordISO: stamp(wednesday, '09:00'), todayHasOpenSession: true,
  };
  const result = computeWeekData(stale, 0, 'sessions',
    { leave: 0, ooo: 0, autoDetected: false }, dayjs(`${thursday}T12:00`));
  expect(result.data.firstRecord).toBeNull();
  expect(result.data.todayWorkedMinutes).toBe(0);
});
