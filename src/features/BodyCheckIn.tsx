import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EMERGENCY_NUMBERS } from '../data/emergency';
import { ageInYears, formatDate } from '../lib/dates';
import { call } from '../lib/emergency';
import { useStore } from '../lib/store';
import { checkInStreak, earnedBadges, nextBadge, streakMessage, type Badge } from '../lib/streaks';
import { AREAS, LEVEL_META, SYMPTOM_BY_ID, symptomsFor, triage, type SymptomArea, type TriageResult } from '../lib/triage';
import { Button, Card } from '../ui/components';
import { MemberPicker } from '../ui/MemberPicker';
import { Confetti, StreakChip, StreakHero, WeekDots } from '../ui/Streak';
import { BounceCard, Check, haptic } from '../ui/Choice';
import { colors, radius, space, type } from '../ui/theme';

type Step = 'mood' | 'anything' | 'symptoms' | 'safety' | 'extra' | 'result';

const MOODS = [
  { v: 5, emoji: '😄', label: 'Great', sub: 'Full of energy', color: '#1F7A45', bg: '#E3F3E9' },
  { v: 4, emoji: '🙂', label: 'Good', sub: 'Feeling fine', color: '#2E7D6B', bg: '#DDEFE9' },
  { v: 3, emoji: '😐', label: 'Okay', sub: 'Could be better', color: '#8A6A00', bg: '#FBF1CC' },
  { v: 2, emoji: '🙁', label: 'Not well', sub: 'Something is off', color: '#B4520B', bg: '#FCE6D3' },
  { v: 1, emoji: '😣', label: 'Really bad', sub: 'I feel very unwell', color: '#B42318', bg: '#FBE0DC' },
];

export function BodyCheckIn() {
  const insets = useSafeAreaInsets();
  const { data, self, addCheckIn } = useStore();
  const [memberId, setMemberId] = useState<string | undefined>(self?.id);
  const [step, setStep] = useState<Step>('mood');
  const [history, setHistory] = useState<Step[]>([]);
  const [feeling, setFeeling] = useState<number | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [openArea, setOpenArea] = useState<SymptomArea | null>(null);
  const [hasTemp, setHasTemp] = useState(false);
  const [temp, setTemp] = useState(37.0);
  const [notes, setNotes] = useState('');
  const [result, setResult] = useState<TriageResult | null>(null);
  const [newBadge, setNewBadge] = useState<Badge | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const member = data.members.find((m) => m.id === memberId);
  const firstName = member?.name.split(' ')[0] ?? '';
  const isSelf = member?.relationship === 'self';
  const age = member?.dob ? ageInYears(member.dob) : undefined;
  const ctx = { ageYears: age, pregnant: member?.pregnant };
  const available = useMemo(() => symptomsFor(ctx), [age, member?.pregnant]);
  const danger = available.filter((s) => s.group === 'danger');
  const streak = checkInStreak(data.checkIns, memberId, data.moodLogs);
  const past = data.checkIns.filter((c) => c.memberId === memberId).slice(-10).reverse();

  const go = (next: Step) => {
    setHistory((h) => [...h, step]);
    setStep(next);
  };
  const back = () => {
    const prev = history[history.length - 1];
    if (!prev) return;
    setHistory((h) => h.slice(0, -1));
    setStep(prev);
  };
  const toggle = (id: string) => {
    haptic();
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  };

  const reset = () => {
    setStep('mood');
    setHistory([]);
    setFeeling(null);
    setSelected([]);
    setOpenArea(null);
    setHasTemp(false);
    setTemp(37.0);
    setNotes('');
    setResult(null);
    setNewBadge(null);
  };

  const submit = (symptoms: string[] = selected) => {
    if (!memberId || feeling === null) return;
    const temperature = hasTemp ? Math.round(temp * 10) / 10 : undefined;
    const r = triage(
      { feeling, symptoms, temperature, notes },
      { ...ctx, history: data.checkIns.filter((c) => c.memberId === memberId) },
    );
    const before = earnedBadges(streak.best).map((b) => b.id);
    const afterCurrent = streak.doneToday ? streak.current : streak.current + 1;
    const gained = earnedBadges(Math.max(streak.best, afterCurrent)).find((b) => !before.includes(b.id)) ?? null;
    addCheckIn({
      memberId,
      feeling,
      symptoms: [...new Set([...symptoms, ...r.matchedFromNotes])],
      temperature,
      notes: notes.trim() || undefined,
      level: r.level,
    });
    setNewBadge(gained);
    setResult(r);
    setHistory([]);
    setStep('result');
    Haptics.notificationAsync(r.level === 'red' ? Haptics.NotificationFeedbackType.Warning : Haptics.NotificationFeedbackType.Success).catch(() => {});
  };

  const stepIndex: Record<Step, number> = { mood: 0, anything: 1, symptoms: 1, safety: 2, extra: 3, result: 4 };
  const showProgress = step !== 'result' && step !== 'mood';

  // ---------- Screens ----------
  let body: React.ReactNode = null;

  if (step === 'mood') {
    body = (
      <>
        <View style={styles.streakCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space(4) }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.streakTitle}>
                {streak.current > 0 ? `${streak.current}-day streak` : 'Start a streak today'}
              </Text>
              <Text style={styles.streakSub}>
                {streak.doneToday
                  ? 'Checked in today ✓ See you tomorrow!'
                  : streak.atRisk
                    ? 'Check in today to keep your flame alive!'
                    : 'Check in every day to grow your 🔥'}
              </Text>
            </View>
            <StreakChip streak={streak} light />
          </View>
          <WeekDots streak={streak} light />
        </View>

        <MemberPicker value={memberId} onChange={(v) => v && setMemberId(v)} />

        <Text style={styles.question}>
          {isSelf ? `Hey ${firstName} 👋` : `Checking in for ${firstName} 👋`}
          {'\n'}
          {isSelf ? 'How are you feeling today?' : `How is ${firstName} feeling today?`}
        </Text>

        {MOODS.map((m) => (
          <BounceCard
            key={m.v}
            selected={feeling === m.v}
            style={feeling === m.v ? { borderColor: m.color, backgroundColor: m.bg } : undefined}
            onPress={() => {
              setFeeling(m.v);
              setTimeout(() => go(m.v >= 4 ? 'anything' : 'symptoms'), 220);
            }}
          >
            <Text style={{ fontSize: 34 }}>{m.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.optionTitle, feeling === m.v && { color: m.color }]}>{m.label}</Text>
              <Text style={type.small}>{m.sub}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.faint} />
          </BounceCard>
        ))}

        {past.length > 0 && (
          <Pressable onPress={() => setShowHistory((v) => !v)} style={styles.historyToggle}>
            <Text style={{ color: colors.primary, fontWeight: '700' }}>{showHistory ? 'Hide' : 'Show'} past check-ins</Text>
            <Ionicons name={showHistory ? 'chevron-up' : 'chevron-down'} size={16} color={colors.primary} />
          </Pressable>
        )}
        {showHistory && (
          <Card style={{ padding: 0 }}>
            {past.map((c, i) => (
              <View key={c.id} style={[styles.hist, i > 0 && styles.border]}>
                <Text style={{ fontSize: 22 }}>{MOODS.find((f) => f.v === c.feeling)?.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[type.body, { fontWeight: '600' }]}>{formatDate(c.date)}</Text>
                  <Text style={type.small} numberOfLines={2}>
                    {c.symptoms.length ? c.symptoms.map((s) => SYMPTOM_BY_ID[s]?.label ?? s).join(', ') : 'All good'}
                    {c.temperature ? ` · ${c.temperature}°C` : ''}
                  </Text>
                </View>
                <View style={[styles.levelDot, { backgroundColor: LEVEL_META[c.level].color }]} />
              </View>
            ))}
          </Card>
        )}
      </>
    );
  }

  if (step === 'anything') {
    body = (
      <>
        <Text style={styles.big}>{feeling === 5 ? '🎉' : '😊'}</Text>
        <Text style={styles.question}>Love that! Is anything bothering {isSelf ? 'you' : firstName} at all?</Text>
        <BounceCard onPress={() => submit([])} style={{ borderColor: colors.success, backgroundColor: colors.successSoft }}>
          <Text style={{ fontSize: 30 }}>✨</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.optionTitle, { color: colors.success }]}>Nope, all good!</Text>
            <Text style={type.small}>Finish check-in and earn today's 🔥</Text>
          </View>
        </BounceCard>
        <BounceCard onPress={() => go('symptoms')}>
          <Text style={{ fontSize: 30 }}>🤏</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.optionTitle}>Yes, a little something</Text>
            <Text style={type.small}>Tell me what you're noticing</Text>
          </View>
        </BounceCard>
      </>
    );
  }

  if (step === 'symptoms') {
    const commonCount = selected.filter((id) => SYMPTOM_BY_ID[id]?.group === 'common').length;
    body = (
      <>
        <Text style={styles.question}>Where do you feel it?</Text>
        <Text style={[type.small, { marginBottom: space(4), marginTop: -space(2) }]}>Tap an area, then pick what fits. Choose as many as you like.</Text>
        {AREAS.map((a) => {
          const items = available.filter((s) => s.group === 'common' && s.area === a.id);
          const count = items.filter((s) => selected.includes(s.id)).length;
          const open = openArea === a.id;
          return (
            <View key={a.id} style={[styles.area, (open || count > 0) && styles.areaOn]}>
              <Pressable
                onPress={() => {
                  haptic();
                  setOpenArea(open ? null : a.id);
                }}
                style={styles.areaHead}
              >
                <Text style={{ fontSize: 28 }}>{a.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.optionTitle}>{a.label}</Text>
                  <Text style={type.small}>{count ? `${count} selected` : a.prompt}</Text>
                </View>
                {count > 0 && !open ? (
                  <View style={styles.badge}>
                    <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>{count}</Text>
                  </View>
                ) : (
                  <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={20} color={colors.muted} />
                )}
              </Pressable>
              {open &&
                items.map((s) => (
                  <Pressable key={s.id} onPress={() => toggle(s.id)} style={styles.symRow}>
                    <Check on={selected.includes(s.id)} />
                    <Text style={[type.body, { flex: 1 }]}>{s.label}</Text>
                  </Pressable>
                ))}
            </View>
          );
        })}
        <Button
          title={commonCount ? `Continue (${commonCount})` : 'Continue'}
          icon="arrow-forward"
          onPress={() => go('safety')}
          style={{ marginTop: space(3) }}
        />
      </>
    );
  }

  if (step === 'safety') {
    const dangerSel = selected.filter((id) => SYMPTOM_BY_ID[id]?.group === 'danger');
    body = (
      <>
        <Text style={styles.big}>🛡️</Text>
        <Text style={styles.question}>Quick safety check</Text>
        <Text style={[type.body, { color: colors.muted, marginTop: -space(2), marginBottom: space(4) }]}>
          Is any of this happening {isSelf ? 'to you' : `to ${firstName}`} right now?
        </Text>
        <Card style={{ padding: 0 }}>
          {danger.map((s, i) => (
            <Pressable key={s.id} onPress={() => toggle(s.id)} style={[styles.symRow, { paddingHorizontal: space(4) }, i > 0 && styles.border]}>
              <Check on={selected.includes(s.id)} danger />
              <Text style={[type.body, { flex: 1 }, selected.includes(s.id) && { color: colors.danger, fontWeight: '700' }]}>{s.label}</Text>
            </Pressable>
          ))}
        </Card>
        {dangerSel.length ? (
          <Button title="Continue" variant="danger" icon="arrow-forward" onPress={() => submit()} />
        ) : (
          <Button title="None of these 👍" onPress={() => go('extra')} />
        )}
      </>
    );
  }

  if (step === 'extra') {
    body = (
      <>
        <Text style={styles.big}>🌡️</Text>
        <Text style={styles.question}>Almost done!</Text>
        <Text style={[type.body, { color: colors.muted, marginTop: -space(2), marginBottom: space(4) }]}>Did you take a temperature reading?</Text>
        <View style={{ flexDirection: 'row', gap: space(3), marginBottom: space(4) }}>
          <BounceCard onPress={() => setHasTemp(true)} selected={hasTemp} style={{ flex: 1, justifyContent: 'center' }}>
            <Text style={styles.optionTitle}>Yes</Text>
          </BounceCard>
          <BounceCard onPress={() => setHasTemp(false)} selected={!hasTemp} style={{ flex: 1, justifyContent: 'center' }}>
            <Text style={styles.optionTitle}>No thermometer</Text>
          </BounceCard>
        </View>
        {hasTemp && (
          <Card style={{ alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space(5) }}>
              <Pressable onPress={() => { haptic(); setTemp((t) => Math.max(34, Math.round((t - 0.1) * 10) / 10)); }} style={styles.stepBtn}>
                <Ionicons name="remove" size={28} color={colors.primary} />
              </Pressable>
              <Text style={[styles.tempNum, temp >= 37.5 && { color: colors.warning }, temp >= 39 && { color: colors.danger }]}>
                {temp.toFixed(1)}°
              </Text>
              <Pressable onPress={() => { haptic(); setTemp((t) => Math.min(42, Math.round((t + 0.1) * 10) / 10)); }} style={styles.stepBtn}>
                <Ionicons name="add" size={28} color={colors.primary} />
              </Pressable>
            </View>
            <Text style={[type.small, { marginTop: space(2) }]}>
              {temp >= 37.5 ? 'That is a fever 🤒' : temp < 35.5 ? 'That is quite low' : 'Normal range 👍'}
            </Text>
          </Card>
        )}
        <Text style={[styles.fieldLabel, { marginTop: space(2) }]}>Anything else to add? (optional)</Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          multiline
          placeholder="In your own words, e.g. headache since yesterday"
          placeholderTextColor={colors.faint}
          style={styles.notes}
        />
        <Button title="Finish check-in" icon="checkmark-done" onPress={() => submit()} style={{ marginTop: space(4) }} />
      </>
    );
  }

  if (step === 'result' && result) {
    const meta = LEVEL_META[result.level];
    const urgent = result.level === 'red';
    const s = checkInStreak(data.checkIns, memberId, data.moodLogs);
    const next = nextBadge(s.current);
    const triageCard = (
      <>
        <Card style={{ backgroundColor: meta.bg, borderColor: meta.bg }}>
          <Text style={[type.label, { color: meta.color }]}>{meta.label}</Text>
          <Text style={[type.h2, { color: meta.color, marginTop: 4 }]}>{result.title}</Text>
          {result.reasons.length > 0 && <Text style={[type.body, { marginTop: space(2) }]}>Because: {result.reasons.join('; ')}.</Text>}
          <View style={{ marginTop: space(3), gap: 8 }}>
            {result.actions.map((a) => (
              <View key={a} style={{ flexDirection: 'row', gap: 8 }}>
                <Text style={{ color: meta.color, fontWeight: '900' }}>•</Text>
                <Text style={[type.body, { flex: 1 }]}>{a}</Text>
              </View>
            ))}
          </View>
        </Card>
        {urgent && (
          <>
            <Button title="Open emergency SOS" icon="alert-circle" variant="danger" onPress={() => router.push('/emergency')} style={{ marginBottom: space(2) }} />
            <Button title={`Call ${EMERGENCY_NUMBERS[0].number}`} icon="call" variant="danger" onPress={() => call(EMERGENCY_NUMBERS[0].number)} style={{ marginBottom: space(3) }} />
          </>
        )}
        {result.level === 'orange' && (
          <Button title="Find a health facility" icon="location" onPress={() => router.push('/facilities')} style={{ marginBottom: space(3) }} />
        )}
        {result.homeCare.length > 0 && !urgent && (
          <Card>
            <Text style={[type.h3, { marginBottom: space(2) }]}>🏠 Home care tips</Text>
            {result.homeCare.map((a) => (
              <Text key={a} style={[type.body, { marginBottom: 6 }]}>• {a}</Text>
            ))}
          </Card>
        )}
      </>
    );

    body = urgent ? (
      <>
        {triageCard}
        <Text style={[type.small, { textAlign: 'center', marginTop: space(2) }]}>Check-in saved · 🔥 {s.current}-day streak</Text>
      </>
    ) : (
      <>
        <Card style={{ paddingVertical: space(6), overflow: 'hidden' }}>
          <StreakHero days={s.current} label={streakMessage(s.current)} />
          {newBadge && (
            <View style={styles.badgeBox}>
              <Text style={{ fontSize: 30 }}>{newBadge.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[type.label, { color: colors.warning }]}>New badge unlocked!</Text>
                <Text style={type.h3}>{newBadge.title}</Text>
              </View>
            </View>
          )}
          {next && (
            <Text style={[type.small, { textAlign: 'center', marginTop: space(3) }]}>
              {next.days - s.current} more day{next.days - s.current === 1 ? '' : 's'} to unlock {next.emoji} {next.title}
            </Text>
          )}
        </Card>
        {result.level === 'green' ? (
          <Card style={{ backgroundColor: colors.successSoft, borderColor: colors.successSoft }}>
            <Text style={[type.h3, { color: colors.success }]}>💚 {result.title}</Text>
            <Text style={[type.body, { marginTop: 6 }]}>{result.actions[0]}</Text>
          </Card>
        ) : (
          triageCard
        )}
      </>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {showProgress && (
        <View style={styles.topBar}>
          <Pressable onPress={back} hitSlop={12} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </Pressable>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${(stepIndex[step] / 4) * 100}%` }]} />
          </View>
        </View>
      )}
      <ScrollView key={step} contentContainerStyle={{ padding: space(4), paddingBottom: insets.bottom + space(10) }} keyboardShouldPersistTaps="handled">
        {body}
        {step === 'result' && (
          <>
            <Button title="Done" variant="secondary" onPress={reset} style={{ marginTop: space(2) }} />
            <Text style={[type.small, { textAlign: 'center', marginTop: space(3) }]}>
              Guidance based on what you shared — not a diagnosis. If you're worried, see a health worker.
            </Text>
          </>
        )}
      </ScrollView>
      {step === 'result' && result && (result.level === 'green' || result.level === 'yellow') && <Confetti />}
    </View>
  );
}

const styles = StyleSheet.create({
  streakCard: { backgroundColor: colors.primary, borderRadius: radius.lg, padding: space(4), marginBottom: space(4) },
  streakTitle: { color: '#fff', fontSize: 20, fontWeight: '800' },
  streakSub: { color: '#CFE8E1', fontSize: 13, marginTop: 2 },
  question: { fontSize: 24, fontWeight: '800', color: colors.text, marginBottom: space(4), lineHeight: 31, letterSpacing: -0.3 },
  big: { fontSize: 52, marginBottom: space(2) },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(3),
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.border,
    paddingVertical: space(3),
    paddingHorizontal: space(4),
    marginBottom: space(3),
    minHeight: 64,
  },
  optionOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  optionTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  area: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 2, borderColor: colors.border, marginBottom: space(3), overflow: 'hidden' },
  areaOn: { borderColor: colors.primary },
  areaHead: { flexDirection: 'row', alignItems: 'center', gap: space(3), padding: space(4) },
  symRow: { flexDirection: 'row', alignItems: 'center', gap: space(3), paddingVertical: 13, paddingHorizontal: space(5) },
  check: { width: 24, height: 24, borderRadius: 7, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  badge: { minWidth: 26, height: 26, borderRadius: 13, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  stepBtn: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  tempNum: { fontSize: 44, fontWeight: '900', color: colors.text, minWidth: 120, textAlign: 'center' },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 6 },
  notes: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: space(4),
    minHeight: 80,
    fontSize: 16,
    color: colors.text,
    textAlignVertical: 'top',
  },
  badgeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(3),
    backgroundColor: colors.accentSoft,
    borderRadius: radius.md,
    padding: space(3),
    marginTop: space(4),
  },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: space(3), paddingHorizontal: space(4), paddingTop: space(3) },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card },
  progressTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: colors.border, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.accent, borderRadius: 4 },
  historyToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: space(3) },
  hist: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: space(4) },
  border: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  levelDot: { width: 12, height: 12, borderRadius: 6 },
});
