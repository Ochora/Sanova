import * as LocalAuthentication from 'expo-local-authentication';
import * as Notifications from 'expo-notifications';
import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { EMERGENCY_NUMBERS } from '../data/emergency';
import { endDate } from '../lib/adherence';
import { toDateKey } from '../lib/dates';
import { call } from '../lib/emergency';
import { cancelIds, scheduleCheckInReminder, setupChannels } from '../lib/notifications';
import { StoreProvider, useStore } from '../lib/store';
import { Button } from '../ui/components';
import { colors, space, type } from '../ui/theme';

function ReminderMaintenance() {
  const { ready, data, update } = useStore();
  const done = useRef(false);

  useEffect(() => {
    setupChannels().catch(() => {});
    const sub = Notifications.addNotificationResponseReceivedListener((resp) => {
      const kind = resp.notification.request.content.data?.kind;
      if (kind === 'med') router.push('/meds');
      else if (kind === 'checkin') router.push('/checkin');
      else if (kind === 'mind') router.push({ pathname: '/checkin', params: { mode: 'mind' } });
    });
    return () => sub.remove();
  }, []);

  // Once per launch: cancel daily reminders for courses that have finished.
  useEffect(() => {
    if (!ready || done.current) return;
    done.current = true;
    // Refresh daily check-in reminders (adds the evening mind review for people upgrading).
    if (data.onboarded && data.settings.remindersEnabled) {
      Notifications.getPermissionsAsync()
        .then((p) => (p.granted ? scheduleCheckInReminder(true) : undefined))
        .catch(() => {});
    }
    const today = toDateKey();
    const finished = data.medications.filter((m) => {
      const end = endDate(m);
      return end !== undefined && end < today && m.notificationIds.length > 0;
    });
    if (!finished.length) return;
    cancelIds(finished.flatMap((m) => m.notificationIds)).then(() =>
      update((d) => ({
        ...d,
        medications: d.medications.map((m) => (finished.some((f) => f.id === m.id) ? { ...m, notificationIds: [] } : m)),
      })),
    );
  }, [ready, data.medications, update]);

  return null;
}

function LockGate({ children }: { children: React.ReactNode }) {
  const { ready, data } = useStore();
  const [unlocked, setUnlocked] = useState(false);
  const lockOn = ready && data.onboarded && data.settings.lockEnabled;

  const unlock = async () => {
    try {
      const res = await LocalAuthentication.authenticateAsync({ promptMessage: 'Unlock Sanova' });
      if (res.success) setUnlocked(true);
    } catch {
      setUnlocked(true); // never lock people out of their own data because of a sensor error
    }
  };

  useEffect(() => {
    if (lockOn && !unlocked) unlock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lockOn]);

  // Re-lock after the app has been in the background for more than a minute
  // (short trips to the camera, SMS app or dialer don't re-lock).
  const backgroundAt = useRef<number | null>(null);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'background') backgroundAt.current = Date.now();
      if (s === 'active' && backgroundAt.current && lockOn && Date.now() - backgroundAt.current > 60_000) {
        setUnlocked(false);
        unlock();
      }
      if (s === 'active') backgroundAt.current = null;
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lockOn]);

  if (!ready) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  const locked = lockOn && !unlocked;
  return (
    <>
      {children}
      {locked && (
      <View style={[StyleSheet.absoluteFill, styles.center, { padding: space(6) }]}>
        <Text style={[type.h1, { color: colors.primary }]}>Sanova</Text>
        <Text style={[type.small, { marginTop: 8, marginBottom: space(8), textAlign: 'center' }]}>
          Your health information is locked.
        </Text>
        <Button title="Unlock" icon="finger-print" onPress={unlock} style={{ alignSelf: 'stretch' }} />
        <View style={{ height: space(8) }} />
        <Text style={[type.label, { marginBottom: space(2) }]}>Emergency — no unlock needed</Text>
        {EMERGENCY_NUMBERS.map((n) => (
          <Button
            key={n.number}
            title={`Call ${n.number}`}
            icon="call"
            variant="danger"
            onPress={() => call(n.number)}
            style={{ alignSelf: 'stretch', marginBottom: space(2) }}
          />
        ))}
      </View>
      )}
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <StatusBar style="dark" />
        <ReminderMaintenance />
        <LockGate>
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: colors.bg },
              headerShadowVisible: false,
              headerTintColor: colors.text,
              headerTitleStyle: { fontWeight: '700' },
              contentStyle: { backgroundColor: colors.bg },
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="onboarding" options={{ headerShown: false }} />
            <Stack.Screen name="emergency" options={{ title: 'Emergency', headerStyle: { backgroundColor: colors.danger }, headerTintColor: '#fff' }} />
            <Stack.Screen name="first-aid/index" options={{ title: 'First aid' }} />
            <Stack.Screen name="first-aid/[id]" options={{ title: '' }} />
            <Stack.Screen name="facilities" options={{ title: 'Nearby facilities' }} />
            <Stack.Screen name="med-form" options={{ title: 'Medication', presentation: 'modal' }} />
            <Stack.Screen name="record-form" options={{ title: 'Add record', presentation: 'modal' }} />
            <Stack.Screen name="record/[id]" options={{ title: 'Record' }} />
            <Stack.Screen name="family" options={{ title: 'Family' }} />
            <Stack.Screen name="member-form" options={{ title: 'Family member', presentation: 'modal' }} />
            <Stack.Screen name="expenses" options={{ title: 'Health costs' }} />
            <Stack.Screen name="emergency-card" options={{ title: 'Emergency card' }} />
            <Stack.Screen name="profile" options={{ title: 'Profile & contacts' }} />
            <Stack.Screen name="settings" options={{ title: 'Settings' }} />
            <Stack.Screen name="achievements" options={{ title: 'Streaks & badges' }} />
            <Stack.Screen name="support" options={{ title: "I'm not okay", headerStyle: { backgroundColor: colors.mindSoft }, headerTintColor: colors.mind }} />
            <Stack.Screen name="breathe" options={{ title: 'Calm down together' }} />
            <Stack.Screen name="companion" options={{ title: 'Chat with Sanova', headerStyle: { backgroundColor: colors.mindSoft }, headerTintColor: colors.mind }} />
            <Stack.Screen name="share" options={{ title: 'Share & transfer', presentation: 'modal' }} />
          </Stack>
        </LockGate>
      </StoreProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
});
