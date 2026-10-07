import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { Medication, Member } from './types';

export const MED_CHANNEL = 'medication-reminders';
export const CHECKIN_CHANNEL = 'daily-checkin';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function setupChannels() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(MED_CHANNEL, {
    name: 'Medication reminders',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#0E6E5C',
  });
  await Notifications.setNotificationChannelAsync(CHECKIN_CHANNEL, {
    name: 'Daily check-in',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

export async function ensurePermission(): Promise<boolean> {
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    const req = await Notifications.requestPermissionsAsync();
    return req.granted;
  } catch {
    return false;
  }
}

function parse(t: string) {
  const [hour, minute] = t.split(':').map(Number);
  return { hour, minute };
}

export async function cancelIds(ids: string[]) {
  await Promise.all(ids.map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => {})));
}

/**
 * Schedules one repeating daily reminder per dose time. Returns the notification ids.
 * Reminders for a finished course are cleaned up on app start (see syncMedicationReminders).
 */
export async function scheduleMedication(med: Medication, member: Member | undefined): Promise<string[]> {
  const ok = await ensurePermission();
  if (!ok) return [];
  const who = member && member.relationship !== 'self' ? `${member.name}: ` : '';
  const ids: string[] = [];
  for (const t of med.times) {
    const { hour, minute } = parse(t);
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: `💊 ${who}time for ${med.name}`,
        body: `${med.dose}${med.instructions ? ` · ${med.instructions}` : ''}. Tap to mark it taken.`,
        data: { kind: 'med', medId: med.id, time: t },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute, channelId: MED_CHANNEL },
    });
    ids.push(id);
  }
  return ids;
}

export async function scheduleCheckInReminder(enabled: boolean) {
  const existing = await Notifications.getAllScheduledNotificationsAsync();
  await cancelIds(existing.filter((n) => n.content.data?.kind === 'checkin').map((n) => n.identifier));
  if (!enabled) return;
  if (!(await ensurePermission())) return;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'How are you feeling today?',
      body: 'Take 30 seconds for your Sanova check-in.',
      data: { kind: 'checkin' },
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: 8, minute: 0, channelId: CHECKIN_CHANNEL },
  });
}

export async function sendTestNotification() {
  if (!(await ensurePermission())) return false;
  await Notifications.scheduleNotificationAsync({
    content: { title: '💊 Test reminder', body: 'Medication reminders are working on this phone.' },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 5, channelId: MED_CHANNEL },
  });
  return true;
}
