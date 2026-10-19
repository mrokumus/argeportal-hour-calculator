import type { AppSettings } from '../types';

export type NotificationPreferenceKey = 'notifyDailyTarget' | 'notifyDailyCap';
export interface NotificationIntent {
  id: string;
  key: NotificationPreferenceKey;
  requestedAt: number;
}
export const NOTIFICATION_INTENT_TTL_MS = 5 * 60_000;

/** A permission grant can arrive after the popup and its React state disappear. */
export function resolveNotificationIntents(settings: AppSettings, intents: NotificationIntent[], granted: boolean, now: number) {
  const pending = intents.filter(intent => now - intent.requestedAt >= 0 && now - intent.requestedAt < NOTIFICATION_INTENT_TTL_MS);
  const updated = { ...settings };
  if (granted) for (const intent of pending) updated[intent.key] = true;
  return { settings: updated, pending: granted ? [] : pending };
}
