import { resolveNotificationIntents, NOTIFICATION_INTENT_TTL_MS } from '../src/lib/notification-preferences';
import { DEFAULT_SETTINGS } from '../src/config';
const settings = { ...DEFAULT_SETTINGS, workdays: [1, 2, 3, 4, 5] };
const intent = { id: 'request', key: 'notifyDailyTarget' as const, requestedAt: 1000 };

it('keeps the request while the permission prompt is open', () => {
  const result = resolveNotificationIntents(settings, [intent], false, 2000);
  expect(result.pending).toEqual([intent]);
  expect(result.settings.notifyDailyTarget).toBe(false);
});
it('enables only the requested preference when permission arrives after popup closure', () => {
  const pending = resolveNotificationIntents(settings, [intent], false, 2000).pending;
  const result = resolveNotificationIntents(settings, pending, true, 3000);
  expect(result.settings.notifyDailyTarget).toBe(true);
  expect(result.settings.notifyDailyCap).toBe(false);
  expect(result.pending).toEqual([]);
});
it('also resolves a grant received before the worker stages the request', () => {
  expect(resolveNotificationIntents(settings, [intent], true, 1000).settings.notifyDailyTarget).toBe(true);
});
it('preserves unrelated settings and the other notification preference', () => {
  const result = resolveNotificationIntents({ ...settings, dailyTargetMinutes: 510, notifyDailyCap: true }, [intent], true, 2000);
  expect(result.settings.dailyTargetMinutes).toBe(510);
  expect(result.settings.notifyDailyCap).toBe(true);
});
it('does not enable old requests after unrelated permission grants', () => {
  const result = resolveNotificationIntents(settings, [intent], true, 1000 + NOTIFICATION_INTENT_TTL_MS);
  expect(result.settings.notifyDailyTarget).toBe(false);
  expect(result.pending).toEqual([]);
});
it('does not enable anything when there is no pending intent', () => {
  expect(resolveNotificationIntents(settings, [], true, 2000).settings).toEqual(settings);
});
