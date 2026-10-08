import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { syncPregnancyReminders } from '../../lib/careReminders';
import { addDays, formatDate, isValidDateKey, toDateKey } from '../../lib/dates';
import { uid } from '../../lib/id';
import { eddFromLmp, eddFromWeeks, gestation, lmpFromEdd, weekInfo } from '../../lib/pregnancy';
import { useStore } from '../../lib/store';
import type { Pregnancy } from '../../lib/types';
import { BounceCard, haptic } from '../../ui/Choice';
import { Button, Field, Notice, Screen } from '../../ui/components';
import { colors, radius, space, type } from '../../ui/theme';

type Method = 'lmp' | 'edd' | 'weeks';

export default function PregnancySetup() {
  const { memberId, first } = useLocalSearchParams<{ memberId: string; first?: string }>();
  const { data, savePregnancy } = useStore();
  const member = data.members.find((m) => m.id === memberId);
  const isSelf = member?.relationship === 'self';
  const firstName = member?.name.split(' ')[0] ?? '';
  const [step, setStep] = useState<'ask' | 'date'>('ask');
  const [method, setMethod] = useState<Method>('lmp');
  const [value, setValue] = useState('');
  const [weeks, setWeeks] = useState(12);
  const [facility, setFacility] = useState('');
  const today = toDateKey();

  const edd = useMemo(() => {
    if (method === 'weeks') return eddFromWeeks(weeks, today);
    if (!isValidDateKey(value)) return null;
    return method === 'lmp' ? eddFromLmp(value) : value;
  }, [method, value, weeks, today]);
  const g = edd ? gestation(edd, today) : null;
  const valid = !!edd && !!g && g.totalDays > 0 && edd >= addDays(today, -14) && edd <= addDays(today, 280);

  const start = async () => {
    if (!valid || !edd || !memberId) return;
    const p: Pregnancy = {
      id: uid('pg_'),
      memberId,
      lmp: method === 'lmp' ? value : lmpFromEdd(edd),
      edd,
      createdAt: new Date().toISOString(),
      status: 'active',
      ancVisits: [],
      checklist: facility.trim() ? ['facility'] : [],
      plannedFacility: facility.trim() || undefined,
      notificationIds: [],
    };
    savePregnancy(p);
    const ids = await syncPregnancyReminders(p, member);
    savePregnancy({ ...p, notificationIds: ids });
    router.replace({ pathname: '/pregnancy/[id]', params: { id: p.id } });
  };

  const skip = () => (first ? router.replace('/') : router.back());

  if (!member) return null;

  if (step === 'ask') {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Pregnancy journey' }} />
        <View style={styles.hero}>
          <Text style={{ fontSize: 56 }}>🤰</Text>
          <Text style={styles.heroTitle}>{isSelf ? 'Congratulations!' : `Congratulations to ${firstName}!`}</Text>
          <Text style={styles.heroSub}>
            Would you like Sanova to walk with {isSelf ? 'you' : firstName} through this pregnancy — week by week, with antenatal visit reminders, what to do and what to avoid, and a birth plan?
          </Text>
        </View>
        <BounceCard onPress={() => setStep('date')} style={{ borderColor: colors.mama, backgroundColor: colors.mamaSoft }}>
          <Text style={{ fontSize: 28 }}>💗</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.optTitle}>Yes, start the journey</Text>
            <Text style={type.small}>Takes 30 seconds</Text>
          </View>
        </BounceCard>
        <BounceCard onPress={skip}>
          <Text style={{ fontSize: 28 }}>⏭️</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.optTitle}>Not now</Text>
            <Text style={type.small}>You can start it later from the profile</Text>
          </View>
        </BounceCard>
        <Text style={[type.small, { marginTop: space(3) }]}>
          Every pregnancy and every decision is personal. Whatever is happening, a health worker can talk you through your options and care in confidence.
        </Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Pregnancy journey' }} />
      <Text style={styles.question}>How far along {isSelf ? 'are you' : `is ${firstName}`}?</Text>
      <View style={styles.tabs}>
        {([
          ['lmp', 'Last period'],
          ['edd', 'Due date'],
          ['weeks', 'Weeks'],
        ] as [Method, string][]).map(([m, label]) => (
          <Pressable key={m} onPress={() => { haptic(); setMethod(m); setValue(''); }} style={[styles.tab, method === m && styles.tabOn]}>
            <Text style={[styles.tabText, method === m && { color: '#fff' }]}>{label}</Text>
          </Pressable>
        ))}
      </View>

      {method === 'lmp' && (
        <Field label="First day of the last period" value={value} onChangeText={setValue} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" hint="If you're not sure, choose 'Weeks' or use the date from your scan." />
      )}
      {method === 'edd' && (
        <Field label="Expected due date (from the clinic or scan)" value={value} onChangeText={setValue} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" />
      )}
      {method === 'weeks' && (
        <View style={styles.stepper}>
          <Pressable onPress={() => { haptic(); setWeeks((w) => Math.max(1, w - 1)); }} style={styles.stepBtn}>
            <Text style={styles.stepTxt}>−</Text>
          </Pressable>
          <View style={{ alignItems: 'center', minWidth: 120 }}>
            <Text style={{ fontSize: 44, fontWeight: '900', color: colors.mama }}>{weeks}</Text>
            <Text style={type.small}>weeks pregnant</Text>
          </View>
          <Pressable onPress={() => { haptic(); setWeeks((w) => Math.min(42, w + 1)); }} style={styles.stepBtn}>
            <Text style={styles.stepTxt}>+</Text>
          </Pressable>
        </View>
      )}

      {g && valid && (
        <View style={styles.preview}>
          <Text style={{ fontSize: 36 }}>{weekInfo(g.weeks).emoji}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[type.h3, { color: colors.mama }]}>
              {g.weeks} weeks {g.days} days · trimester {g.trimester}
            </Text>
            <Text style={type.body}>Due around {formatDate(edd!)}</Text>
            <Text style={type.small}>Baby is about the size of {weekInfo(g.weeks).size}</Text>
          </View>
        </View>
      )}
      {!valid && method !== 'weeks' && value.length >= 10 && <Notice tone="warn">Please check the date — it should be within the last 9 months (or the next 9 months for a due date).</Notice>}

      <Field label="Where do you plan to give birth? (optional)" value={facility} onChangeText={setFacility} placeholder="e.g. Kawempe National Referral Hospital" />
      <Button title="Start my pregnancy journey" icon="heart" onPress={start} disabled={!valid} style={{ backgroundColor: colors.mama, borderColor: colors.mama }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: colors.mamaSoft, borderRadius: radius.lg, padding: space(5), marginBottom: space(4), alignItems: 'center' },
  heroTitle: { fontSize: 24, fontWeight: '800', color: colors.mama, marginTop: space(2), textAlign: 'center' },
  heroSub: { fontSize: 15, color: colors.text, marginTop: space(2), lineHeight: 22, textAlign: 'center' },
  optTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  question: { fontSize: 24, fontWeight: '800', color: colors.text, marginBottom: space(4) },
  tabs: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: radius.pill, padding: 4, marginBottom: space(4), borderWidth: 1, borderColor: colors.border },
  tab: { flex: 1, paddingVertical: 10, borderRadius: radius.pill, alignItems: 'center' },
  tabOn: { backgroundColor: colors.mama },
  tabText: { fontWeight: '700', color: colors.muted },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space(5), marginBottom: space(4) },
  stepBtn: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.mamaSoft, alignItems: 'center', justifyContent: 'center' },
  stepTxt: { fontSize: 30, color: colors.mama, fontWeight: '700' },
  preview: { flexDirection: 'row', gap: space(3), alignItems: 'center', backgroundColor: colors.card, borderRadius: radius.lg, padding: space(4), marginBottom: space(4), borderWidth: 1, borderColor: colors.mamaSoft },
});
