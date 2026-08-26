import dayjs, { type Dayjs } from 'dayjs';
import { timeNormalize } from './time-utils';

const PORTAL_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const PORTAL_TIME_RE = /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/;
const DURATION_RE = /^\d+:[0-5]\d$/;

export function parsePortalDateTime(raw: string): Dayjs | null {
  const [date, time] = timeNormalize(raw);
  if (!date || !time || !PORTAL_DATE_RE.test(date) || !PORTAL_TIME_RE.test(time)) return null;

  const normalizedTime = time.length === 5 ? `${time}:00` : time;
  const parsed = dayjs(`${date}T${normalizedTime}`);
  if (!parsed.isValid()) return null;

  if (parsed.format('YYYY-MM-DD') !== date || parsed.format('HH:mm:ss') !== normalizedTime) {
    return null;
  }

  return parsed;
}

export function parseDurationMinutes(raw: string): number | null {
  const value = raw.trim();
  if (!DURATION_RE.test(value)) return null;

  const [hours, minutes] = value.split(':').map(Number);
  if (!Number.isSafeInteger(hours) || !Number.isSafeInteger(minutes)) return null;

  const total = hours * 60 + minutes;
  return Number.isSafeInteger(total) ? total : null;
}

export function findEarliestPunch(punches: string[], today: Dayjs): Dayjs | null {
  let earliest: Dayjs | null = null;

  for (const raw of punches) {
    const punch = parsePortalDateTime(raw);
    if (!punch || !today.isSame(punch, 'day')) continue;
    if (!earliest || punch.isBefore(earliest)) earliest = punch;
  }

  return earliest;
}

export function findLatestPunch(punches: string[], today: Dayjs): Dayjs | null {
  let latest: Dayjs | null = null;

  for (const raw of punches) {
    const punch = parsePortalDateTime(raw);
    if (!punch || !today.isSame(punch, 'day')) continue;
    if (!latest || punch.isAfter(latest)) latest = punch;
  }

  return latest;
}
