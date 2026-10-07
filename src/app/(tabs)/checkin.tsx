import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { EMERGENCY_NUMBERS } from '../../data/emergency';
import { ageInYears, formatDate } from '../../lib/dates';
import { call } from '../../lib/emergency';
import { useStore } from '../../lib/store';
import { LEVEL_META, SYMPTOM_BY_ID, symptomsFor, triage, type TriageResult } from '../../lib/triage';
import { Button, Card, Chip, ChipRow, Field, Notice, Pill, Screen, SectionTitle } from '../../ui/components';
import { MemberPicker } from '../../ui/MemberPicker';
import { colors, radius, space, type } from '../../ui/theme';

const FEELINGS = [
  { v: 1, emoji: '😣', label: 'Very bad' },
  { v: 2, emoji: '🙁', label: 'Bad' },
  { v: 3, emoji: '😐', label: 'Okay' },
  { v: 4, emoji: '🙂', label: 'Good' },
  { v: 5, emoji: '😄', label: 'Great' },
];

export default function CheckInScreen() {
  const { data, self, addCheckIn } = useStore();
  const [memberId, setMemberId] = useState<string | undefined>(self?.id);
  const [feeling, setFeeling] = useState<number | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [temp, setTemp] = useState('');
  const [notes, setNotes] = useState('');
  const [result, setResult] = useState<TriageResult | null>(null);

  const member = data.members.find((m) => m.id === memberId);
  const age = member?.dob ? ageInYears(member.dob) : undefined;
  const ctx = { ageYears: age, pregnant: member?.pregnant };
  const available = useMemo(() => symptomsFor(ctx), [age, member?.pregnant]);
  const danger = available.filter((s) => s.group === 'danger');
  const common = available.filter((s) => s.group === 'common');
  const isSelf = member?.relationship === 'self';
  const history = data.checkIns.filter((c) => c.memberId === memberId).slice(-10).reverse();

  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const submit = () => {
    if (!memberId || feeling === null) return;
    const t = temp ? parseFloat(temp.replace(',', '.')) : undefined;
    const temperature = t !== undefined && t > 30 && t < 45 ? t : undefined;
    const r = triage(
      { feeling, symptoms: selected, temperature, notes },
      { ...ctx, history: data.checkIns.filter((c) => c.memberId === memberId) },
    );
    addCheckIn({
      memberId,
      feeling,
      symptoms: [...new Set([...selected, ...r.matchedFromNotes])],
      temperature,
      notes: notes.trim() || undefined,
      level: r.level,
    });
    setResult(r);
  };

  const reset = () => {
    setResult(null);
    setFeeling(null);
    setSelected([]);
    setTemp('');
    setNotes('');
  };

  if (result) {
    const meta = LEVEL_META[result.level];
    return (
      <Screen key="result">
        <Card style={{ backgroundColor: meta.bg, borderColor: meta.bg }}>
          <Pill label={meta.label} color="#fff" bg={meta.color} />
          <Text style={[type.h1, { color: meta.color, marginTop: space(3) }]}>{result.title}</Text>
          {result.reasons.length > 0 && (
            <Text style={[type.body, { marginTop: space(2) }]}>Because: {result.reasons.join('; ')}.</Text>
          )}
        </Card>

        {result.level === 'red' && (
          <>
            <Button title="Open emergency SOS" icon="alert-circle" variant="danger" onPress={() => router.push('/emergency')} style={{ marginBottom: space(2) }} />
            <Button title={`Call ${EMERGENCY_NUMBERS[0].number}`} icon="call" variant="danger" onPress={() => call(EMERGENCY_NUMBERS[0].number)} style={{ marginBottom: space(3) }} />
          </>
        )}
        {result.level === 'orange' && (
          <Button title="Find a health facility" icon="location" onPress={() => router.push('/facilities')} style={{ marginBottom: space(3) }} />
        )}

        <SectionTitle>What to do</SectionTitle>
        <Card>
          {result.actions.map((a) => (
            <View key={a} style={styles.bullet}>
              <View style={[styles.dot, { backgroundColor: meta.color }]} />
              <Text style={[type.body, { flex: 1 }]}>{a}</Text>
            </View>
          ))}
        </Card>

        {result.homeCare.length > 0 && result.level !== 'red' && (
          <>
            <SectionTitle>Home care</SectionTitle>
            <Card>
              {result.homeCare.map((a) => (
                <View key={a} style={styles.bullet}>
                  <View style={[styles.dot, { backgroundColor: colors.primary }]} />
                  <Text style={[type.body, { flex: 1 }]}>{a}</Text>
                </View>
              ))}
            </Card>
          </>
        )}

        {result.level === 'orange' && (
          <>
            <SectionTitle>Questions to ask the health worker</SectionTitle>
            <Card>
              {['What do you think is causing this?', 'Do I need a test (malaria, blood, urine)?', 'Is this safe with the medicines I already take?', 'Which danger signs mean I should come back immediately?'].map((q) => (
                <Text key={q} style={[type.body, { marginBottom: 6 }]}>• {q}</Text>
              ))}
            </Card>
          </>
        )}

        <Notice tone="info">This is guidance based on what you entered, not a diagnosis. If you are worried, see a health worker.</Notice>
        <Button title="Done" variant="secondary" onPress={reset} />
      </Screen>
    );
  }

  return (
    <Screen>
      <MemberPicker value={memberId} onChange={(v) => v && setMemberId(v)} />
      <Text style={type.h2}>{isSelf ? 'How are you feeling today?' : `How is ${member?.name.split(' ')[0]} feeling?`}</Text>

      <View style={styles.feelings}>
        {FEELINGS.map((f) => (
          <Pressable key={f.v} onPress={() => setFeeling(f.v)} style={[styles.feeling, feeling === f.v && styles.feelingOn]}>
            <Text style={{ fontSize: 30 }}>{f.emoji}</Text>
            <Text style={[type.small, { fontSize: 11 }, feeling === f.v && { color: colors.primary, fontWeight: '700' }]}>{f.label}</Text>
          </Pressable>
        ))}
      </View>

      {feeling !== null && (
        <>
          <SectionTitle>Danger signs — tick any</SectionTitle>
          <ChipRow>
            {danger.map((s) => (
              <Chip key={s.id} label={s.label} selected={selected.includes(s.id)} onPress={() => toggle(s.id)} color={colors.danger} />
            ))}
          </ChipRow>
          <SectionTitle>Other symptoms</SectionTitle>
          <ChipRow>
            {common.map((s) => (
              <Chip key={s.id} label={s.label} selected={selected.includes(s.id)} onPress={() => toggle(s.id)} />
            ))}
          </ChipRow>
          <View style={{ height: space(4) }} />
          <Field label="Temperature °C (if you have a thermometer)" value={temp} onChangeText={setTemp} keyboardType="decimal-pad" placeholder="e.g. 37.8" />
          <Field label="Anything else? Describe in your own words" value={notes} onChangeText={setNotes} multiline placeholder="e.g. headache since yesterday, worse in the evening" />
        </>
      )}

      <Button title="Check in" icon="checkmark" onPress={submit} disabled={feeling === null} style={{ marginTop: space(2) }} />

      {history.length > 0 && (
        <>
          <SectionTitle>Recent check-ins</SectionTitle>
          <Card style={{ padding: 0 }}>
            {history.map((c, i) => (
              <View key={c.id} style={[styles.hist, i > 0 && styles.border]}>
                <Text style={{ fontSize: 22 }}>{FEELINGS.find((f) => f.v === c.feeling)?.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[type.body, { fontWeight: '600' }]}>{formatDate(c.date)}</Text>
                  <Text style={type.small} numberOfLines={2}>
                    {c.symptoms.length ? c.symptoms.map((s) => SYMPTOM_BY_ID[s]?.label ?? s).join(', ') : 'No symptoms'}
                    {c.temperature ? ` · ${c.temperature}°C` : ''}
                  </Text>
                </View>
                <View style={[styles.levelDot, { backgroundColor: LEVEL_META[c.level].color }]} />
              </View>
            ))}
          </Card>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  feelings: { flexDirection: 'row', justifyContent: 'space-between', marginTop: space(4), gap: 6 },
  feeling: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: space(3),
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  feelingOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft, borderWidth: 2 },
  bullet: { flexDirection: 'row', gap: 10, marginBottom: 10, alignItems: 'flex-start' },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 7 },
  hist: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: space(4) },
  border: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  levelDot: { width: 12, height: 12, borderRadius: 6 },
});
