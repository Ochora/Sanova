import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { syncChildReminders } from '../../lib/careReminders';
import { isValidDateKey, toDateKey } from '../../lib/dates';
import { cancelIds } from '../../lib/notifications';
import { emptyChildCare, useStore } from '../../lib/store';
import type { Sex } from '../../lib/types';
import { Button, Card, Chip, ChipRow, Field, Screen } from '../../ui/components';
import { Confetti } from '../../ui/Streak';
import { colors, radius, space, type } from '../../ui/theme';

interface BabyDraft {
  name: string;
  sex?: Sex;
  weight: string;
}

function babyRelation(motherRelation: string): string {
  if (motherRelation === 'self' || motherRelation === 'Spouse') return 'Child';
  if (motherRelation === 'Child') return 'Grandchild';
  return 'Relative';
}

export default function BabyBorn() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, savePregnancy, saveMember, updateChildCare } = useStore();
  const p = data.pregnancies.find((x) => x.id === id);
  const mother = data.members.find((m) => m.id === p?.memberId);
  const surname = mother?.name.split(' ').slice(1).join(' ') ?? '';
  const [date, setDate] = useState(toDateKey());
  const [count, setCount] = useState(1);
  const [babies, setBabies] = useState<BabyDraft[]>([{ name: '', weight: '' }, { name: '', weight: '' }, { name: '', weight: '' }]);
  const [place, setPlace] = useState(p?.plannedFacility ?? '');
  const [kind, setKind] = useState<'normal' | 'caesarean' | 'assisted'>('normal');
  const [busy, setBusy] = useState(false);

  if (!p || !mother) return null;

  const setBaby = (i: number, patch: Partial<BabyDraft>) => setBabies((bs) => bs.map((b, j) => (j === i ? { ...b, ...patch } : b)));

  const save = async () => {
    if (!isValidDateKey(date) || date > toDateKey()) return Alert.alert('Date of birth', 'Use the format YYYY-MM-DD (not a future date).');
    setBusy(true);
    const ids: string[] = [];
    for (let i = 0; i < count; i++) {
      const b = babies[i];
      const w = parseFloat(b.weight.replace(',', '.'));
      const name = b.name.trim() || `Baby ${count > 1 ? i + 1 : ''}${surname ? ` ${surname}` : ''}`.replace(/\s+/g, ' ').trim();
      const baby = saveMember({
        name,
        relationship: babyRelation(mother.relationship),
        dob: date,
        sex: b.sex,
        conditions: [],
        allergies: [],
        birthWeightKg: w > 0 && w < 7 ? w : undefined,
      });
      ids.push(baby.id);
      updateChildCare(baby.id, (c) => ({
        ...c,
        growth: w > 0 && w < 7 ? [{ id: `g_${baby.id}`, date, weightKg: w }] : c.growth,
      }));
      const nids = await syncChildReminders(baby, emptyChildCare());
      updateChildCare(baby.id, (c) => ({ ...c, notificationIds: nids }));
    }
    await cancelIds(p.notificationIds);
    savePregnancy({
      ...p,
      status: 'delivered',
      notificationIds: [],
      delivery: { date, place: place.trim() || undefined, type: kind, babyIds: ids },
    });
    saveMember({ ...mother, pregnant: false });
    setBusy(false);
    router.replace({ pathname: '/pregnancy/[id]', params: { id: p.id } });
  };

  return (
    <View style={{ flex: 1 }}>
      <Screen>
        <View style={styles.hero}>
          <Text style={{ fontSize: 54 }}>🎉👶</Text>
          <Text style={styles.heroTitle}>Congratulations!</Text>
          <Text style={styles.heroSub}>A few details to start the baby's health record. You can change them later.</Text>
        </View>
        <Field label="Date of birth" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" />
        <Text style={styles.label}>How many babies?</Text>
        <ChipRow>
          {[1, 2, 3].map((n) => (
            <Chip key={n} label={n === 1 ? 'One' : n === 2 ? 'Twins' : 'Triplets'} selected={count === n} onPress={() => setCount(n)} color={colors.child} />
          ))}
        </ChipRow>
        <View style={{ height: space(4) }} />
        {babies.slice(0, count).map((b, i) => (
          <Card key={i}>
            {count > 1 && <Text style={[type.label, { color: colors.child, marginBottom: space(2) }]}>Baby {i + 1}</Text>}
            <Field label="Name (optional for now)" value={b.name} onChangeText={(t) => setBaby(i, { name: t })} placeholder={`e.g. Baby ${surname}`.trim()} autoCapitalize="words" />
            <Text style={styles.label}>Sex</Text>
            <ChipRow>
              <Chip label="Girl" selected={b.sex === 'female'} onPress={() => setBaby(i, { sex: 'female' })} color={colors.child} />
              <Chip label="Boy" selected={b.sex === 'male'} onPress={() => setBaby(i, { sex: 'male' })} color={colors.child} />
            </ChipRow>
            <View style={{ height: space(3) }} />
            <Field label="Birth weight (kg)" value={b.weight} onChangeText={(t) => setBaby(i, { weight: t })} keyboardType="decimal-pad" placeholder="e.g. 3.2" hint={parseFloat(b.weight) > 0 && parseFloat(b.weight) < 2.5 ? 'Under 2.5 kg is low birth weight — keep the baby warm (skin-to-skin) and follow the health worker’s advice closely.' : undefined} />
          </Card>
        ))}
        <Field label="Where was the baby born?" value={place} onChangeText={setPlace} placeholder="e.g. Kawempe National Referral Hospital" />
        <Text style={styles.label}>Type of birth</Text>
        <ChipRow>
          <Chip label="Normal" selected={kind === 'normal'} onPress={() => setKind('normal')} color={colors.child} />
          <Chip label="Caesarean (C-section)" selected={kind === 'caesarean'} onPress={() => setKind('caesarean')} color={colors.child} />
          <Chip label="Assisted" selected={kind === 'assisted'} onPress={() => setKind('assisted')} color={colors.child} />
        </ChipRow>
        <Button title="Save & start baby's health record" icon="heart" loading={busy} onPress={save} style={{ marginTop: space(6), backgroundColor: colors.child, borderColor: colors.child }} />
        <Text style={[type.small, { marginTop: space(3) }]}>
          {mother.relationship === 'self' ? 'You' : mother.name.split(' ')[0]} will move to postnatal care for 6 weeks, and the baby gets their own profile with vaccine reminders, growth and milestones.
        </Text>
      </Screen>
      <Confetti count={16} />
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: colors.childSoft, borderRadius: radius.lg, padding: space(5), marginBottom: space(4), alignItems: 'center' },
  heroTitle: { fontSize: 26, fontWeight: '900', color: colors.child, marginTop: space(2) },
  heroSub: { fontSize: 15, color: colors.text, marginTop: 4, textAlign: 'center' },
  label: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 6 },
});
