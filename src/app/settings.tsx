import * as LocalAuthentication from 'expo-local-authentication';
import { router } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { deleteAllImages, writeCacheFile } from '../lib/files';
import { cancelIds, scheduleCheckInReminder, scheduleMedication, sendTestNotification } from '../lib/notifications';
import { isActiveOn } from '../lib/adherence';
import { toDateKey } from '../lib/dates';
import { useStore } from '../lib/store';
import { getApiKey, setApiKey } from '../lib/companion';
import type { Medication } from '../lib/types';
import * as Notifications from 'expo-notifications';
import { Button, Card, Divider, Notice, Row, Screen, SectionTitle } from '../ui/components';
import { colors, space, type } from '../ui/theme';

export default function SettingsScreen() {
  const { data, setSettings, update, resetAll } = useStore();
  const [aiKey, setAiKey] = useState<string | null>(null);
  const [keyInput, setKeyInput] = useState('');
  useEffect(() => {
    getApiKey().then(setAiKey);
  }, []);
  const s = data.settings;

  const toggleLock = async (on: boolean) => {
    if (on) {
      const has = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!has || !enrolled) {
        return Alert.alert('Not available', 'Set up a fingerprint, face unlock or screen lock on your phone first.');
      }
      const res = await LocalAuthentication.authenticateAsync({ promptMessage: 'Confirm to turn on app lock' });
      if (!res.success) return;
    }
    setSettings({ lockEnabled: on });
  };

  const toggleReminders = async (on: boolean) => {
    setSettings({ remindersEnabled: on });
    const today = toDateKey();
    if (!on) {
      await cancelIds(data.medications.flatMap((m) => m.notificationIds));
      update((d) => ({ ...d, medications: d.medications.map((m) => ({ ...m, notificationIds: [] })) }));
    } else {
      const next: Medication[] = [];
      for (const m of data.medications) {
        if (m.notificationIds.length || !(isActiveOn(m, today) || m.startDate > today)) {
          next.push(m);
          continue;
        }
        const ids = await scheduleMedication(m, data.members.find((x) => x.id === m.memberId));
        next.push({ ...m, notificationIds: ids });
      }
      update((d) => ({ ...d, medications: next }));
    }
    await scheduleCheckInReminder(on);
  };

  const exportData = async () => {
    const uri = writeCacheFile(`sanova-export-${toDateKey()}.json`, JSON.stringify(data, null, 2));
    if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: 'application/json', dialogTitle: 'Export Sanova data' });
  };

  const wipe = () =>
    Alert.alert('Delete all data?', 'This removes every profile, medicine, check-in, record photo and expense from this phone. It cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete everything',
        style: 'destructive',
        onPress: async () => {
          await Notifications.cancelAllScheduledNotificationsAsync().catch(() => {});
          deleteAllImages();
          await resetAll();
          router.replace('/onboarding');
        },
      },
    ]);

  return (
    <Screen>
      <SectionTitle>Privacy & security</SectionTitle>
      <Card style={{ padding: 0 }}>
        <Row
          icon="finger-print"
          title="App lock"
          subtitle="Fingerprint, face or phone PIN to open Sanova. SOS calls still work while locked."
          right={<Switch value={s.lockEnabled} onValueChange={toggleLock} trackColor={{ true: colors.primary, false: colors.border }} />}
        />
      </Card>

      <SectionTitle>Reminders</SectionTitle>
      <Card style={{ padding: 0 }}>
        <Row
          icon="notifications"
          title="Medicine & check-in reminders"
          subtitle="Morning check-in at 8:00 AM, evening review at 8:30 PM"
          right={<Switch value={s.remindersEnabled} onValueChange={toggleReminders} trackColor={{ true: colors.primary, false: colors.border }} />}
        />
        <Divider />
        <Row
          icon="alarm"
          title="Send a test reminder"
          subtitle="Arrives in about 5 seconds"
          onPress={async () => {
            const ok = await sendTestNotification();
            if (!ok) Alert.alert('Notifications blocked', 'Allow notifications for Sanova in your phone settings.');
          }}
        />
      </Card>
      <Notice tone="info">
        Some phones (Tecno, Infinix, itel, Xiaomi, Samsung) stop reminders to save battery. If reminders are late, set Sanova's battery usage to "Unrestricted" in phone settings.
      </Notice>

      <SectionTitle>AI companion</SectionTitle>
      <Card>
        <Text style={type.body}>
          {aiKey ? '✅ Sanova AI is connected.' : 'Sanova chat works offline as a simple listener. Add an Anthropic API key to turn on the full AI companion (test builds only).'}
        </Text>
        {!aiKey && (
          <TextInput
            value={keyInput}
            onChangeText={setKeyInput}
            placeholder="sk-ant-…"
            placeholderTextColor={colors.faint}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
            style={styles.keyInput}
          />
        )}
        <View style={{ flexDirection: 'row', gap: 8, marginTop: space(3) }}>
          {aiKey ? (
            <Button small variant="secondary" icon="close" title="Disconnect" onPress={async () => { await setApiKey(null); setAiKey(null); }} />
          ) : (
            <Button small icon="link" title="Connect" disabled={!keyInput.trim()} onPress={async () => { await setApiKey(keyInput.trim()); setAiKey(keyInput.trim()); setKeyInput(''); }} />
          )}
          <Button small variant="ghost" icon="chatbubbles" title="Open chat" onPress={() => router.push('/companion')} />
        </View>
        <Text style={[type.small, { marginTop: space(2) }]}>The key is stored in your phone's secure storage. For public release, AI replies will go through Sanova's own server instead.</Text>
      </Card>

      <SectionTitle>Your data</SectionTitle>
      <Card style={{ padding: 0 }}>
        <Row icon="download" title="Export my data" subtitle="Save a JSON copy of everything" onPress={exportData} />
        <Divider />
        <Row icon="trash" iconColor={colors.danger} title="Delete all data" subtitle="Start over on this phone" onPress={wipe} />
      </Card>

      <SectionTitle>About</SectionTitle>
      <Card>
        <Text style={type.h3}>Sanova 0.3 — test version</Text>
        <Text style={[type.small, { marginTop: 6 }]}>
          All information stays on this phone. Sanova provides health guidance, not diagnosis or treatment. In an emergency call 999 or 112. Always follow the advice of a qualified health worker.
        </Text>
      </Card>
      <View style={{ height: space(4) }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  keyInput: { marginTop: space(3), backgroundColor: colors.bg, borderRadius: 12, paddingHorizontal: space(4), paddingVertical: 10, fontSize: 15, color: colors.text, borderWidth: 1, borderColor: colors.border },
});
