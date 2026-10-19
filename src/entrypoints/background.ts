import dayjs from 'dayjs';
import {
  WORK_NOTIFICATION_ALARM, WORK_NOTIFICATION_INTERVAL_MINUTES,
  STORAGE_KEY_NOTIFICATION_STATE, STORAGE_KEY_SETTINGS, STORAGE_KEY_CALC_MODE, STORAGE_KEY_NOTIFICATION_INTENTS,
} from '../config';
import { getSettings, getSnapshot, getCalcMode, getLeaveData, saveSettings } from '../lib/storage';
import { getDailyCap } from '../lib/ooo';
import { getMondayOfWeek } from '../lib/time-utils';
import { getDueWorkNotifications, type NotificationState } from '../lib/work-notifications';
import { resolveNotificationIntents, type NotificationIntent, type NotificationPreferenceKey } from '../lib/notification-preferences';
import { setLocale, t } from '../lib/i18n';

export default defineBackground(() => {
  let checking: Promise<void> | null = null;

  async function hasPermission() {
    return browser.permissions.contains({ permissions: ['notifications'] });
  }

  let preferenceQueue: Promise<unknown> = Promise.resolve();
  function updatePreference(action?: { key: NotificationPreferenceKey; enabled: boolean; id: string }, cancelId?: string) {
    const run = async () => {
      const settings = await getSettings();
      const stored = await browser.storage.local.get(STORAGE_KEY_NOTIFICATION_INTENTS);
      let intents = (stored[STORAGE_KEY_NOTIFICATION_INTENTS] ?? []) as NotificationIntent[];
      if (cancelId) intents = intents.filter(intent => intent.id !== cancelId);
      if (action) {
        intents = intents.filter(intent => intent.key !== action.key);
        if (action.enabled) intents.push({ id: action.id, key: action.key, requestedAt: Date.now() });
        else settings[action.key] = false;
      }
      const result = resolveNotificationIntents(settings, intents, await hasPermission(), Date.now());
      await saveSettings(result.settings);
      await browser.storage.local.set({ [STORAGE_KEY_NOTIFICATION_INTENTS]: result.pending });
      await syncAlarm();
      return { ok: true };
    };
    const task = preferenceQueue.then(run);
    preferenceQueue = task.catch(console.warn);
    return task;
  }

  async function syncAlarm() {
    const settings = await getSettings();
    if (!(settings.notifyDailyTarget || settings.notifyDailyCap) || !await hasPermission()) {
      await browser.alarms.clear(WORK_NOTIFICATION_ALARM);
      return;
    }
    if (!await browser.alarms.get(WORK_NOTIFICATION_ALARM)) {
      await browser.alarms.create(WORK_NOTIFICATION_ALARM, { periodInMinutes: WORK_NOTIFICATION_INTERVAL_MINUTES });
    }
  }

  async function createNotification(id: string, message: string) {
    if (!await hasPermission() || await browser.notifications.getPermissionLevel() === 'denied') {
      throw new Error('Notification permission denied');
    }
    await browser.notifications.create(id, {
      type: 'basic', title: 'PDKS Time Calculator', message,
      iconUrl: browser.runtime.getURL('/icons/icon128.png'),
    });
  }

  async function check() {
    const now = dayjs();
    const weekKey = getMondayOfWeek(0, now.toDate()).toISOString().slice(0, 10);
    const [settings, snapshot, mode, leave, stored] = await Promise.all([
      getSettings(), getSnapshot(), getCalcMode(), getLeaveData(weekKey),
      browser.storage.local.get(STORAGE_KEY_NOTIFICATION_STATE),
    ]);
    if (!await hasPermission()) return;
    const state = stored[STORAGE_KEY_NOTIFICATION_STATE] as NotificationState | undefined;
    const due = getDueWorkNotifications(snapshot, settings, mode, leave, state ?? null, now);
    if (!due.length) return;
    setLocale(settings.locale);
    // After sleep/late enabling, one message for the highest crossed threshold is enough.
    const threshold = due[due.length - 1];
    await createNotification(`pdks-${now.format('YYYY-MM-DD')}-${threshold.key}`, t(threshold.kind === 'target' ? 'dailyTargetNotification' : 'dailyCapNotification', { h: Math.floor(threshold.minutes / 60), m: threshold.minutes % 60 }));
    const sent = state?.day === now.format('YYYY-MM-DD') ? state.sent : [];
    await browser.storage.local.set({ [STORAGE_KEY_NOTIFICATION_STATE]: {
      day: now.format('YYYY-MM-DD'), sent: [...new Set([...sent, ...due.map(item => item.key)])],
    } satisfies NotificationState });
  }

  function checkOnce() {
    if (!checking) checking = check().catch(console.warn).finally(() => { checking = null; });
    return checking;
  }

  browser.alarms.onAlarm.addListener(alarm => {
    if (alarm.name === WORK_NOTIFICATION_ALARM) return checkOnce();
  });
  browser.runtime.onInstalled.addListener(() => { void syncAlarm().catch(console.warn); });
  browser.runtime.onStartup.addListener(() => { void syncAlarm().catch(console.warn); });
  browser.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && (changes[STORAGE_KEY_SETTINGS] || changes[STORAGE_KEY_CALC_MODE])) {
      void syncAlarm().then(checkOnce).catch(console.warn);
    }
  });
  browser.permissions.onAdded.addListener(permissions => {
    if (permissions.permissions?.includes('notifications')) void updatePreference().catch(console.warn);
  });
  browser.permissions.onRemoved.addListener(() => { void syncAlarm().catch(console.warn); });
  browser.runtime.onMessage.addListener((message: unknown, sender) => {
    const type = (message as { type?: string })?.type;
    if (sender.id !== browser.runtime.id) return;
    if (type === 'PDKS_SET_NOTIFICATION_PREFERENCE') {
      const action = message as { key?: string; enabled?: boolean; id?: string };
      if ((action.key !== 'notifyDailyTarget' && action.key !== 'notifyDailyCap')
        || typeof action.enabled !== 'boolean' || typeof action.id !== 'string') return;
      return updatePreference({ key: action.key, enabled: action.enabled, id: action.id });
    }
    if (type === 'PDKS_COMPLETE_NOTIFICATION_PERMISSION') return updatePreference();
    if (type === 'PDKS_CANCEL_NOTIFICATION_PERMISSION') {
      const id = (message as { id?: unknown }).id;
      if (typeof id === 'string') return updatePreference(undefined, id);
      return;
    }
    if (type !== 'PDKS_PREVIEW_WORK_NOTIFICATION') return;
    return (async () => {
      try {
        const settings = await getSettings();
        setLocale(settings.locale);
        const now = dayjs();
        const weekKey = getMondayOfWeek(0, now.toDate()).toISOString().slice(0, 10);
        const leave = await getLeaveData(weekKey);
        const isTarget = Math.random() < 0.5;
        const minutes = isTarget ? settings.dailyTargetMinutes
          : getDailyCap(settings.dailyCapMinutes, leave, now.format('YYYY-MM-DD'));
        const message = t(isTarget ? 'dailyTargetNotification' : 'dailyCapNotification', {
          h: Math.floor(minutes / 60), m: minutes % 60,
        });
        await createNotification(`pdks-test-${Date.now()}`, t('testNotificationPreview', { message }));
        return { ok: true };
      } catch {
        return { ok: false };
      }
    })();
  });
  // Service workers can be stopped; recreate missing alarms whenever started.
  void syncAlarm().catch(console.warn);
});
