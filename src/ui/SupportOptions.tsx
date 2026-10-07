import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as SMS from 'expo-sms';
import React from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { EMERGENCY_LINE, SUPPORT_LINES } from '../data/support';
import { call, whatsapp } from '../lib/emergency';
import { useStore } from '../lib/store';
import { Card, Divider } from './components';
import { colors, radius, space, type } from './theme';

export const REACH_OUT_MESSAGE = "Hi, I'm not feeling okay right now. Could you call me or come by when you can? 💜";

async function textPerson(phone: string, message: string) {
  try {
    if (await SMS.isAvailableAsync()) {
      await SMS.sendSMSAsync([phone], message);
      return;
    }
  } catch {
    // fall back below
  }
  Linking.openURL(`sms:${phone}?body=${encodeURIComponent(message)}`).catch(() => {});
}

function Action({ icon, label, onPress, color = colors.mind }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; onPress: () => void; color?: string }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.action, { borderColor: color }, pressed && { opacity: 0.8 }]}>
      <Ionicons name={icon} size={16} color={color} />
      <Text style={{ color, fontWeight: '700', fontSize: 14 }}>{label}</Text>
    </Pressable>
  );
}

/** Everything someone needs when they're not okay: people, lines, AI, calming tools. */
export function SupportOptions({ compact }: { compact?: boolean }) {
  const { data } = useStore();

  return (
    <View>
      <Text style={styles.section}>💬 Reach out to someone you trust</Text>
      <Card style={{ padding: 0 }}>
        {data.contacts.length === 0 ? (
          <Pressable onPress={() => router.push('/profile')} style={styles.row}>
            <Text style={[type.body, { flex: 1 }]}>Add a friend or family member to reach out to quickly.</Text>
            <Ionicons name="person-add" size={20} color={colors.mind} />
          </Pressable>
        ) : (
          data.contacts.map((c, i) => (
            <View key={c.id}>
              {i > 0 && <Divider />}
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={[type.body, { fontWeight: '700' }]}>{c.name}</Text>
                  <Text style={type.small}>{c.relationship ?? c.phone}</Text>
                </View>
              </View>
              <View style={styles.actions}>
                <Action icon="chatbubble" label="Text" onPress={() => textPerson(c.phone, REACH_OUT_MESSAGE)} />
                <Action icon="logo-whatsapp" label="WhatsApp" onPress={() => whatsapp(c.phone, REACH_OUT_MESSAGE)} />
                <Action icon="call" label="Call" onPress={() => call(c.phone)} />
              </View>
            </View>
          ))
        )}
      </Card>
      {!compact && (
        <Text style={[type.small, { marginTop: -space(1), marginBottom: space(3) }]}>
          We'll prepare a message for you: "{REACH_OUT_MESSAGE}" — you can edit it before sending.
        </Text>
      )}

      <Text style={styles.section}>📞 Talk to a trained counsellor</Text>
      <Card style={{ padding: 0 }}>
        {SUPPORT_LINES.map((l, i) => (
          <View key={l.id}>
            {i > 0 && <Divider />}
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={[type.body, { fontWeight: '700' }]}>{l.name}</Text>
                <Text style={type.small}>{l.what}</Text>
                <Text style={[type.small, { color: colors.success, fontWeight: '600' }]}>
                  {l.free ? 'Free · ' : ''}
                  {l.hours}
                </Text>
              </View>
            </View>
            <View style={styles.actions}>
              {l.phone && <Action icon="call" label={`Call ${l.display ?? l.phone}`} onPress={() => call(l.phone!)} color={colors.primary} />}
              {l.whatsapp && <Action icon="logo-whatsapp" label="WhatsApp" onPress={() => whatsapp(l.whatsapp!, 'Hello, I would like to talk to a counsellor.')} color={colors.primary} />}
            </View>
          </View>
        ))}
      </Card>

      <Text style={styles.section}>🤖 Talk it through right now</Text>
      <Pressable onPress={() => router.push('/companion')} style={({ pressed }) => [styles.big, { backgroundColor: colors.mind }, pressed && { opacity: 0.9 }]}>
        <Text style={{ fontSize: 26 }}>💜</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.bigTitle}>Chat with Sanova</Text>
          <Text style={styles.bigSub}>A kind AI listener, any time of day</Text>
        </View>
        <Ionicons name="chevron-forward" size={22} color="#fff" />
      </Pressable>
      <Pressable onPress={() => router.push('/breathe')} style={({ pressed }) => [styles.big, { backgroundColor: colors.primary }, pressed && { opacity: 0.9 }]}>
        <Text style={{ fontSize: 26 }}>🌬️</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.bigTitle}>Calm down together</Text>
          <Text style={styles.bigSub}>Guided breathing and grounding, 1–3 minutes</Text>
        </View>
        <Ionicons name="chevron-forward" size={22} color="#fff" />
      </Pressable>

      <View style={styles.danger}>
        <Ionicons name="warning" size={20} color={colors.dangerDark} />
        <Text style={{ flex: 1, color: colors.dangerDark, fontSize: 14, lineHeight: 20 }}>
          If you might act on thoughts of harming yourself, or you are in danger right now, call {EMERGENCY_LINE.phone} or {EMERGENCY_LINE.alt}, or go to the nearest hospital.
        </Text>
      </View>
      <Pressable onPress={() => call(EMERGENCY_LINE.phone)} style={[styles.action, { borderColor: colors.danger, alignSelf: 'stretch', justifyContent: 'center', paddingVertical: 12 }]}>
        <Ionicons name="call" size={18} color={colors.danger} />
        <Text style={{ color: colors.danger, fontWeight: '800', fontSize: 16 }}>Call {EMERGENCY_LINE.phone}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { fontSize: 16, fontWeight: '800', color: colors.text, marginTop: space(3), marginBottom: space(2) },
  row: { flexDirection: 'row', alignItems: 'center', gap: space(3), paddingHorizontal: space(4), paddingTop: space(3), paddingBottom: space(2) },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: space(4), paddingBottom: space(3) },
  action: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 7 },
  big: { flexDirection: 'row', alignItems: 'center', gap: space(3), padding: space(4), borderRadius: radius.lg, marginBottom: space(3) },
  bigTitle: { color: '#fff', fontSize: 17, fontWeight: '800' },
  bigSub: { color: '#EDE7FA', fontSize: 13, marginTop: 2 },
  danger: { flexDirection: 'row', gap: 10, backgroundColor: colors.dangerSoft, padding: space(3), borderRadius: radius.md, marginTop: space(2), marginBottom: space(3) },
});
