import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { dosesForDay } from '../../lib/adherence';
import { formatTime12, greeting, toDateKey } from '../../lib/dates';
import { useStore } from '../../lib/store';
import { LEVEL_META } from '../../lib/triage';
import { Button, Card, Notice, Pill, Screen, SectionTitle, type IconName } from '../../ui/components';
import { SOSButton } from '../../ui/SOSButton';
import { colors, radius, space, type } from '../../ui/theme';

function seasonalTip(month: number): { title: string; body: string } {
  // Uganda's main rainy seasons are roughly March–May and September–November.
  if ([2, 3, 4, 8, 9, 10].includes(month))
    return {
      title: 'Rainy season — malaria risk is higher',
      body: 'Sleep under a treated mosquito net every night, clear standing water around the home, and test any fever for malaria within 24 hours.',
    };
  return {
    title: 'Dry season — stay hydrated',
    body: 'Drink plenty of clean, boiled water, and keep using your mosquito net — malaria is present all year round.',
  };
}

export default function Home() {
  const { data, self, logDose } = useStore();
  const today = toDateKey();
  const now = new Date();
  const firstName = self?.name.split(' ')[0] ?? '';

  const doses = useMemo(() => dosesForDay(data.medications, data.doseLogs, today, now), [data.medications, data.doseLogs, today]);
  const pending = doses.filter((d) => d.state === 'due' || d.state === 'missed' || d.state === 'upcoming');
  const missed = doses.filter((d) => d.state === 'missed');
  const memberName = (id: string) => data.members.find((m) => m.id === id);

  const myCheckIn = [...data.checkIns].reverse().find((c) => c.memberId === self?.id && c.date === today);
  const tip = seasonalTip(now.getMonth());

  const quick: { icon: IconName; label: string; href: string; color: string }[] = [
    { icon: 'bandage', label: 'First aid', href: '/first-aid', color: colors.danger },
    { icon: 'location', label: 'Facilities', href: '/facilities', color: colors.primary },
    { icon: 'qr-code', label: 'Emergency card', href: '/emergency-card', color: '#6B4EAD' },
    { icon: 'wallet', label: 'Health costs', href: '/expenses', color: colors.warning },
  ];

  return (
    <Screen topInset>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={type.small}>{greeting(now)}</Text>
          <Text style={type.h1}>{firstName || 'Sanova'}</Text>
        </View>
        <Pressable onPress={() => router.push('/profile')} style={styles.avatar}>
          <Ionicons name="person" size={20} color={colors.primary} />
        </Pressable>
      </View>

      <Card style={{ alignItems: 'center', paddingVertical: space(6) }}>
        <SOSButton onTrigger={() => router.push('/emergency')} />
        <Text style={[type.small, { textAlign: 'center', marginTop: space(4) }]}>
          Hold to alert {data.contacts.length ? `${data.contacts.length} emergency contact${data.contacts.length > 1 ? 's' : ''}` : 'help'} with your location and get emergency numbers.
        </Text>
        {!data.contacts.length && (
          <Button title="Add an emergency contact" variant="ghost" small icon="person-add" onPress={() => router.push('/profile')} />
        )}
      </Card>

      {missed.length > 0 && (
        <Notice tone="warn" icon="alarm">
          {missed.length} dose{missed.length > 1 ? 's' : ''} missed today
          {missed.some((d) => memberName(d.med.memberId)?.relationship !== 'self')
            ? ` (including ${[...new Set(missed.map((d) => memberName(d.med.memberId)?.name.split(' ')[0]).filter(Boolean))].join(', ')})`
            : ''}
          . Open Medicines to log or catch up.
        </Notice>
      )}

      <SectionTitle action={<Text style={styles.link} onPress={() => router.push('/meds')}>All</Text>}>Today's medicines</SectionTitle>
      {doses.length === 0 ? (
        <Card onPress={() => router.push('/med-form')}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Ionicons name="add-circle" size={26} color={colors.primary} />
            <Text style={[type.body, { flex: 1 }]}>Add a medicine to get reminders and track doses.</Text>
          </View>
        </Card>
      ) : pending.length === 0 ? (
        <Notice tone="success">All of today's doses are logged. Well done!</Notice>
      ) : (
        <Card style={{ padding: 0 }}>
          {pending.slice(0, 4).map((d, i) => {
            const m = memberName(d.med.memberId);
            return (
              <View key={`${d.med.id}-${d.time}`} style={[styles.doseRow, i > 0 && styles.doseBorder]}>
                <View style={{ width: 70 }}>
                  <Text style={[type.h3, d.state === 'missed' && { color: colors.danger }]}>{formatTime12(d.time).replace(' ', '\n')}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[type.body, { fontWeight: '600' }]}>{d.med.name}</Text>
                  <Text style={type.small}>
                    {d.med.dose}
                    {m && m.relationship !== 'self' ? ` · ${m.name.split(' ')[0]}` : ''}
                    {d.state === 'missed' ? ' · missed' : d.state === 'due' ? ' · due now' : ''}
                  </Text>
                </View>
                <Button small title="Taken" icon="checkmark" onPress={() => logDose(d.med.id, d.date, d.time, 'taken')} />
              </View>
            );
          })}
        </Card>
      )}

      <SectionTitle>Daily check-in</SectionTitle>
      {myCheckIn ? (
        <Card onPress={() => router.push('/checkin')}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={[styles.dot, { backgroundColor: LEVEL_META[myCheckIn.level].color }]} />
            <View style={{ flex: 1 }}>
              <Text style={type.h3}>Checked in today</Text>
              <Text style={type.small}>Tap to check in again if anything changes.</Text>
            </View>
            <Pill label={LEVEL_META[myCheckIn.level].label} color={LEVEL_META[myCheckIn.level].color} bg={LEVEL_META[myCheckIn.level].bg} />
          </View>
        </Card>
      ) : (
        <Card onPress={() => router.push('/checkin')} style={{ backgroundColor: colors.primary, borderColor: colors.primary }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Ionicons name="chatbubble-ellipses" size={26} color="#fff" />
            <View style={{ flex: 1 }}>
              <Text style={[type.h3, { color: '#fff' }]}>How are you feeling today?</Text>
              <Text style={[type.small, { color: '#CFE8E1' }]}>30-second check-in</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#fff" />
          </View>
        </Card>
      )}

      <SectionTitle>Quick access</SectionTitle>
      <View style={styles.grid}>
        {quick.map((q) => (
          <Pressable key={q.label} onPress={() => router.push(q.href as never)} style={({ pressed }) => [styles.tile, pressed && { opacity: 0.8 }]}>
            <View style={[styles.tileIcon, { backgroundColor: q.color + '1A' }]}>
              <Ionicons name={q.icon} size={22} color={q.color} />
            </View>
            <Text style={[type.body, { fontWeight: '600' }]}>{q.label}</Text>
          </Pressable>
        ))}
      </View>

      <SectionTitle>Health tip</SectionTitle>
      <Card style={{ backgroundColor: colors.accentSoft, borderColor: colors.accentSoft }}>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Ionicons name="rainy" size={22} color={colors.warning} />
          <View style={{ flex: 1 }}>
            <Text style={type.h3}>{tip.title}</Text>
            <Text style={[type.small, { color: colors.text, marginTop: 4 }]}>{tip.body}</Text>
          </View>
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: space(4) },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  link: { color: colors.primary, fontWeight: '700', fontSize: 14 },
  doseRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: space(4) },
  doseBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  dot: { width: 12, height: 12, borderRadius: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space(3) },
  tile: {
    width: '47.8%',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: space(4),
    gap: space(3),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  tileIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
