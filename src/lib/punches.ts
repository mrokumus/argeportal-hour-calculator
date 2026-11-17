import dayjs from 'dayjs';
import type { DayPunches, ManualPunches, Snapshot } from '../types';

export const EMPTY_SNAPSHOT: Snapshot = {
  capturedAt: '',
  capturedDay: '',
  firstRecordISO: null,
  dailyTotalsSessions: {},
  dailyTotalsSpan: {},
};

function portalDays(snapshot: Snapshot): Record<string, DayPunches> {
  if (snapshot.punchesByDate) return snapshot.punchesByDate;
  if (!snapshot.firstRecordISO) return {};
  return {
    [snapshot.capturedDay]: {
      entryISO: snapshot.firstRecordISO,
      lastISO: snapshot.lastRecordISO ?? snapshot.firstRecordISO,
      open: snapshot.todayHasOpenSession !== false,
      completedMinutes: snapshot.todayCompletedSessionMinutes
        ?? snapshot.dailyTotalsSessions[snapshot.capturedDay] ?? 0,
    },
  };
}

export function mergePortalSnapshot(previous: Snapshot | null, fresh: Snapshot): Snapshot {
  const freshDays = portalDays(fresh);
  const dates = new Set([...Object.keys(freshDays), ...Object.keys(fresh.dailyTotalsSessions),
    ...Object.keys(fresh.dailyTotalsSpan)]);
  if (!dates.size) return previous ?? EMPTY_SNAPSHOT;

  const punchesByDate = { ...(previous ? portalDays(previous) : {}) };
  const dailyTotalsSessions = { ...previous?.dailyTotalsSessions };
  const dailyTotalsSpan = { ...previous?.dailyTotalsSpan };
  for (const date of dates) {
    const known = punchesByDate[date];
    const incoming = freshDays[date];
    // A truncated table can omit punches from either end of a day.
    if (known && incoming && (incoming.entryISO > known.entryISO || incoming.lastISO < known.lastISO
      || (!known.open && incoming.open && incoming.lastISO === known.lastISO))) continue;
    if (incoming) punchesByDate[date] = incoming;
    const freshSessions = fresh.dailyTotalsSessions[date];
    if (freshSessions !== undefined && (freshSessions > 0 || dailyTotalsSessions[date] === undefined)) {
      dailyTotalsSessions[date] = freshSessions;
    }
    if (fresh.dailyTotalsSpan[date] !== undefined) dailyTotalsSpan[date] = fresh.dailyTotalsSpan[date];
  }

  // Retain the current and previous month for weeks that straddle a month boundary.
  const oldest = dayjs(fresh.capturedDay).subtract(1, 'month').startOf('month').format('YYYY-MM-DD');
  for (const map of [punchesByDate, dailyTotalsSessions, dailyTotalsSpan]) {
    for (const date of Object.keys(map)) {
      if (date < oldest) delete map[date];
    }
  }
  return { ...fresh, punchesByDate, dailyTotalsSessions, dailyTotalsSpan };
}

export function getPunchTimes(snapshot: Snapshot, date: string): ManualPunches {
  const day = portalDays(snapshot)[date];
  return day ? {
    entry: dayjs(day.entryISO).format('HH:mm'),
    exit: day.open ? undefined : dayjs(day.lastISO).format('HH:mm'),
  } : {};
}

export function validPunchTimes(entry?: string, exit?: string): boolean {
  const clock = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
  return (!entry || clock.test(entry)) && (!exit || clock.test(exit)) && (!entry || !exit || exit > entry);
}

export function applyManualPunches(snapshot: Snapshot, manual: Record<string, ManualPunches>, date: string): Snapshot {
  if (!snapshot.punchesByDate && !Object.keys(manual).length) return snapshot;
  const days = { ...portalDays(snapshot) };
  const sessions = { ...snapshot.dailyTotalsSessions };
  const spans = { ...snapshot.dailyTotalsSpan };
  let today = days[date];

  for (const [key, override] of Object.entries(manual)) {
    const portal = days[key];
    const times = getPunchTimes(snapshot, key);
    const entry = override.entry ?? times.entry;
    const exit = override.exit ?? times.exit;
    if (!validPunchTimes(entry, exit) || !entry) continue;

    const entryISO = override.entry ? dayjs(`${key}T${entry}`).toISOString() : portal!.entryISO;
    const exitISO = exit ? (override.exit ? dayjs(`${key}T${exit}`).toISOString() : portal!.lastISO) : null;
    const span = exitISO ? Math.max(0, dayjs(exitISO).diff(dayjs(entryISO), 'minute')) : 0;
    const portalSpan = snapshot.dailyTotalsSpan[key];
    const portalSessions = portal?.open ? portal.completedMinutes : sessions[key];
    const breaks = portalSpan != null && portalSessions != null ? Math.max(0, portalSpan - portalSessions) : 0;
    const completed = exitISO ? Math.max(0, span - breaks) : portal?.completedMinutes ?? 0;

    if (exitISO) {
      spans[key] = span;
      sessions[key] = completed;
      days[key] = { entryISO, lastISO: exitISO, open: false, completedMinutes: completed };
    }
    if (!exitISO && !portal) days[key] = { entryISO, lastISO: entryISO, open: true, completedMinutes: 0 };
    if (key === date) {
      const lastISO = exitISO ?? (portal?.open && portal.lastISO > portal.entryISO && portal.lastISO > entryISO
        ? portal.lastISO : entryISO);
      today = { entryISO, lastISO, open: !exitISO, completedMinutes: completed };
    }
  }

  return {
    ...snapshot,
    punchesByDate: days,
    dailyTotalsSessions: sessions,
    dailyTotalsSpan: spans,
    firstRecordISO: today?.entryISO ?? null,
    lastRecordISO: today?.lastISO ?? null,
    todayHasOpenSession: today?.open,
    todayCompletedSessionMinutes: today?.completedMinutes,
  };
}
