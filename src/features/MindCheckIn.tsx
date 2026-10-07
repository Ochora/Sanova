import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fromDateKey, greeting, toDateKey } from '../lib/dates';
import {
  evaluateMind,
  FEELING_BY_ID,
  FEELINGS,
  kindForNow,
  MOOD_SCALE,
  moodTrend,
  promptFor,
  SCREEN_ANSWERS,
  SCREEN_QUESTIONS,
  shouldOfferDeeperCheck,
  type MindResult,
} from '../lib/mind';
import { useStore } from '../lib/store';
import { checkInStreak, earnedBadges, streakMessage, type Badge } from '../lib/streaks';
import type { MoodKind } from '../lib/types';
import { BounceCard, haptic } from '../ui/Choice';
import { Button, Card } from '../ui/components';
import { MemberPicker } from '../ui/MemberPicker';
import { Confetti, StreakHero } from '../ui/Streak';
import { colors, radius, space, type } from '../ui/theme';
import { SupportOptions } from '../ui/SupportOptions';

type Step = 'mood' | 'feelings' | 'body' | 'offer' | 'phq0' | 'phq1' | 'gad0' | 'gad1' | 'safety' | 'reflect' | 'result';

const SLEEP = [
  { v: 5, emoji: '😴', label: 'Slept great' },
  { v: 4, emoji: '🙂', label: 'Pretty well' },
  { v: 3, emoji: '😐', label: 'So-so' },
  { v: 2, emoji: '😩', label: 'Badly' },
  { v: 1, emoji: '🥴', label: 'Barely slept' },
];
const STRESS = [
  { v: 1, emoji: '🧘', label: 'Relaxed' },
  { v: 2, emoji: '🙂', label: 'A little busy' },
  { v: 3, emoji: '😅', label: 'Some pressure' },
  { v: 4, emoji: '😫', label: 'Very stressful' },
  { v: 5, emoji: '🤯', label: 'Overwhelming' },
];
const DAY = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function MindCheckIn() {
  const insets = useSafeAreaInsets();
  const { data, self, addMood } = useStore();
  const [memberId, setMemberId] = useState<string | undefined>(self?.id);
  const [kind, setKind] = useState<MoodKind>(kindForNow());
  const [step, setStep] = useState<Step>('mood');
  const [trail, setTrail] = useState<Step[]>([]);
  const [mood, setMood] = useState<number | null>(null);
  const [feelings, setFeelings] = useState<string[]>([]);
  const [sleep, setSleep] = useState<number | undefined>();
  const [stress, setStress] = useState<number | undefined>();
  const [phq, setPhq] = useState<[number, number]>([-1, -1]);
  const [gad, setGad] = useState<[number, number]>([-1, -1]);
  const [screened, setScreened] = useState(false);
  const [safetyFlag, setSafetyFlag] = useState(false);
  const [text1, setText1] = useState('');
  const [text2, setText2] = useState('');
  const [result, setResult] = useState<MindResult | null>(null);
  const [newBadge, setNewBadge] = useState<Badge | null>(null);

  const member = data.members.find((m) => m.id === memberId);
  const firstName = member?.name.split(' ')[0] ?? '';
  const isSelf = member?.relationship === 'self';
  const past = data.moodLogs.filter((l) => l.memberId === memberId);
  const todays = past.filter((l) => l.date === toDateKey());
  const doneThis = past.some((l) => l.kind === kind && l.date === toDateKey());
  const trend = moodTrend(data.moodLogs, memberId, 7);
  const streak = checkInStreak(data.checkIns, memberId, data.moodLogs);

  const go = (next: Step) => {
    setTrail((t) => [...t, step]);
    setStep(next);
  };
  const back = () => {
    const prev = trail[trail.length - 1];
    if (!prev) return;
    setTrail((t) => t.slice(0, -1));
    setStep(prev);
  };
  const reset = () => {
    setStep('mood');
    setTrail([]);
    setMood(null);
    setFeelings([]);
    setSleep(undefined);
    setStress(undefined);
    setPhq([-1, -1]);
    setGad([-1, -1]);
    setScreened(false);
    setSafetyFlag(false);
    setText1('');
    setText2('');
    setResult(null);
    setNewBadge(null);
  };

  /** After the body-question step: decide whether to offer the deeper check. */
  const afterBody = () => {
    const offer = shouldOfferDeeperCheck(mood ?? 3, feelings, past);
    if (offer === 'recommended') go('phq0');
    else if (offer === 'optional') go('offer');
    else if ((mood ?? 3) <= 1) go('safety');
    else go('reflect');
  };

  const afterScreen = (finalGad: [number, number]) => {
    setScreened(true);
    // Ask the safety question when someone reports feeling down/hopeless or very low mood.
    if (phq[1] >= 1 || (mood ?? 3) <= 1 || Math.max(0, finalGad[0]) + Math.max(0, finalGad[1]) >= 5) go('safety');
    else go('reflect');
  };

  const finish = (flag: boolean = safetyFlag) => {
    if (!memberId || mood === null) return;
    const log = {
      memberId,
      kind,
      mood,
      feelings,
      sleep: kind === 'morning' ? sleep : undefined,
      energy: undefined,
      stress: kind === 'evening' ? stress : undefined,
      intention: kind === 'morning' ? text1.trim() || undefined : undefined,
      wentWell: kind === 'evening' ? text1.trim() || undefined : undefined,
      gratitude: kind === 'evening' ? text2.trim() || undefined : undefined,
      screen: screened ? { phq: phq.map((v) => Math.max(0, v)) as [number, number], gad: gad.map((v) => Math.max(0, v)) as [number, number] } : undefined,
      safetyFlag: flag || undefined,
    };
    const r = evaluateMind(log);
    const before = earnedBadges(streak.best).map((b) => b.id);
    const after = streak.doneToday ? streak.current : streak.current + 1;
    setNewBadge(earnedBadges(Math.max(streak.best, after)).find((b) => !before.includes(b.id)) ?? null);
    addMood(log);
    setResult(r);
    setTrail([]);
    setStep('result');
    Haptics.notificationAsync(r.level === 'urgent' || r.level === 'support' ? Haptics.NotificationFeedbackType.Warning : Haptics.NotificationFeedbackType.Success).catch(() => {});
  };

  const progressOrder: Step[] = ['mood', 'feelings', 'body', 'offer', 'phq0', 'phq1', 'gad0', 'gad1', 'safety', 'reflect'];
  const pct = Math.min(1, (progressOrder.indexOf(step) + 1) / progressOrder.length);

  let body: React.ReactNode = null;

  if (step === 'mood') {
    body = (
      <>
        <View style={styles.hero}>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: space(4) }}>
            {(['morning', 'evening'] as MoodKind[]).map((k) => (
              <Pressable key={k} onPress={() => { haptic(); setKind(k); }} style={[styles.kindPill, kind === k && styles.kindPillOn]}>
                <Text style={[styles.kindText, kind === k && { color: colors.text }]}>
                  {k === 'morning' ? '☀️ Start my day' : '🌙 Review my day'}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.heroTitle}>
            {kind === 'morning' ? `${greeting()}${firstName ? `, ${firstName}` : ''} ☀️` : `Winding down${firstName ? `, ${firstName}` : ''} 🌙`}
          </Text>
          <Text style={styles.heroSub}>
            {doneThis
              ? `You've already done this ${kind === 'morning' ? 'morning' : 'evening'} check — you can add another.`
              : kind === 'morning'
                ? 'A one-minute check to set up your mind for the day.'
                : 'A gentle look back at how today went.'}
          </Text>
          <View style={styles.trend}>
            {trend.map((t) => (
              <View key={t.date} style={{ alignItems: 'center', gap: 4, flex: 1 }}>
                <Text style={{ fontSize: 20, opacity: t.mood === null ? 0.25 : 1 }}>
                  {t.mood === null ? '○' : MOOD_SCALE.find((m) => m.v === Math.round(t.mood!))?.emoji}
                </Text>
                <Text style={{ fontSize: 11, color: '#E6E1F5' }}>{DAY[fromDateKey(t.date).getDay()]}</Text>
              </View>
            ))}
          </View>
        </View>

        <MemberPicker value={memberId} onChange={(v) => v && setMemberId(v)} />

        <Text style={styles.question}>
          {kind === 'morning'
            ? isSelf ? 'How is your mind this morning?' : `How is ${firstName}'s mood this morning?`
            : isSelf ? 'Overall, how was your day?' : `How was ${firstName}'s day?`}
        </Text>
        {MOOD_SCALE.map((m) => (
          <BounceCard
            key={m.v}
            selected={mood === m.v}
            style={mood === m.v ? { borderColor: colors.mind, backgroundColor: colors.mindSoft } : undefined}
            onPress={() => {
              setMood(m.v);
              setTimeout(() => go('feelings'), 220);
            }}
          >
            <Text style={{ fontSize: 32 }}>{m.emoji}</Text>
            <Text style={[styles.optionTitle, { flex: 1 }]}>{m.label}</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.faint} />
          </BounceCard>
        ))}

        <Pressable onPress={() => router.push('/support')} style={styles.notOkay}>
          <Text style={{ fontSize: 22 }}>💜</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.optionTitle, { color: colors.mind }]}>I'm not okay right now</Text>
            <Text style={type.small}>Talk to someone, text a friend, or calm down together</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.mind} />
        </Pressable>
        {todays.length > 0 && <Text style={[type.small, { textAlign: 'center' }]}>Today: {todays.map((t) => MOOD_SCALE.find((m) => m.v === t.mood)?.emoji).join(' ')}</Text>}
      </>
    );
  }

  if (step === 'feelings') {
    body = (
      <>
        <Text style={styles.question}>Which words fit {isSelf ? 'you' : firstName} right now?</Text>
        <Text style={[type.small, { marginTop: -space(2), marginBottom: space(4) }]}>Pick any — there are no wrong answers.</Text>
        <View style={styles.grid}>
          {FEELINGS.map((f) => {
            const on = feelings.includes(f.id);
            return (
              <Pressable
                key={f.id}
                onPress={() => {
                  haptic();
                  setFeelings((x) => (on ? x.filter((y) => y !== f.id) : [...x, f.id]));
                }}
                style={[styles.feel, on && styles.feelOn]}
              >
                <Text style={{ fontSize: 26 }}>{f.emoji}</Text>
                <Text style={[styles.feelText, on && { color: colors.mind, fontWeight: '800' }]}>{f.label}</Text>
              </Pressable>
            );
          })}
        </View>
        <Button title={feelings.length ? 'Continue' : 'Skip'} icon="arrow-forward" onPress={() => go('body')} style={{ marginTop: space(4), backgroundColor: colors.mind, borderColor: colors.mind }} />
      </>
    );
  }

  if (step === 'body') {
    const opts = kind === 'morning' ? SLEEP : STRESS;
    const val = kind === 'morning' ? sleep : stress;
    body = (
      <>
        <Text style={styles.big}>{kind === 'morning' ? '🛏️' : '⚖️'}</Text>
        <Text style={styles.question}>{kind === 'morning' ? 'How did you sleep last night?' : 'How stressful was today?'}</Text>
        {opts.map((o) => (
          <BounceCard
            key={o.v}
            selected={val === o.v}
            style={val === o.v ? { borderColor: colors.mind, backgroundColor: colors.mindSoft } : undefined}
            onPress={() => {
              if (kind === 'morning') setSleep(o.v);
              else setStress(o.v);
              setTimeout(afterBody, 200);
            }}
          >
            <Text style={{ fontSize: 28 }}>{o.emoji}</Text>
            <Text style={[styles.optionTitle, { flex: 1 }]}>{o.label}</Text>
          </BounceCard>
        ))}
      </>
    );
  }

  if (step === 'offer') {
    body = (
      <>
        <Text style={styles.big}>🧠</Text>
        <Text style={styles.question}>Want to do a 1-minute deeper check?</Text>
        <Text style={[type.body, { color: colors.muted, marginTop: -space(2), marginBottom: space(4) }]}>
          Four quick questions about the last two weeks. It helps you notice patterns early. Once a week is plenty.
        </Text>
        <BounceCard onPress={() => go('phq0')} style={{ borderColor: colors.mind, backgroundColor: colors.mindSoft }}>
          <Text style={{ fontSize: 26 }}>👍</Text>
          <Text style={[styles.optionTitle, { flex: 1 }]}>Sure, let's do it</Text>
        </BounceCard>
        <BounceCard onPress={() => go('reflect')}>
          <Text style={{ fontSize: 26 }}>⏭️</Text>
          <Text style={[styles.optionTitle, { flex: 1 }]}>Not today</Text>
        </BounceCard>
      </>
    );
  }

  const screenStep = (label: string, value: number, set: (v: number) => void, next: () => void, idx: number) => (
    <>
      <Text style={[type.label, { color: colors.mind }]}>Question {idx} of 4 · last 2 weeks</Text>
      <Text style={[styles.question, { marginTop: space(2) }]}>How often have you been bothered by: {label.toLowerCase()}?</Text>
      {SCREEN_ANSWERS.map((a) => (
        <BounceCard
          key={a.v}
          selected={value === a.v}
          style={value === a.v ? { borderColor: colors.mind, backgroundColor: colors.mindSoft } : undefined}
          onPress={() => {
            set(a.v);
            setTimeout(next, 200);
          }}
        >
          <View style={[styles.dotScale, { backgroundColor: ['#CDEBDD', '#F6E7B3', '#F7D2B4', '#F3C0BA'][a.v] }]} />
          <Text style={[styles.optionTitle, { flex: 1 }]}>{a.label}</Text>
        </BounceCard>
      ))}
    </>
  );

  if (step === 'phq0') body = screenStep(SCREEN_QUESTIONS.phq[0], phq[0], (v) => setPhq([v, phq[1]]), () => go('phq1'), 1);
  if (step === 'phq1') body = screenStep(SCREEN_QUESTIONS.phq[1], phq[1], (v) => setPhq([phq[0], v]), () => go('gad0'), 2);
  if (step === 'gad0') body = screenStep(SCREEN_QUESTIONS.gad[0], gad[0], (v) => setGad([v, gad[1]]), () => go('gad1'), 3);
  if (step === 'gad1')
    body = screenStep(
      SCREEN_QUESTIONS.gad[1],
      gad[1],
      (v) => {
        const g: [number, number] = [gad[0], v];
        setGad(g);
        setTimeout(() => afterScreen(g), 0);
      },
      () => {},
      4,
    );

  if (step === 'safety') {
    body = (
      <>
        <Text style={styles.big}>💜</Text>
        <Text style={styles.question}>One more question, asked with care</Text>
        <Text style={[type.body, { marginTop: -space(2), marginBottom: space(4), lineHeight: 23 }]}>
          Sometimes when people feel this low, they have thoughts of hurting themselves, or that they would be better off not here.{'\n\n'}
          Have you had thoughts like that recently?
        </Text>
        <BounceCard
          onPress={() => {
            setSafetyFlag(false);
            go('reflect');
          }}
        >
          <Text style={{ fontSize: 24 }}>🙂</Text>
          <Text style={[styles.optionTitle, { flex: 1 }]}>No</Text>
        </BounceCard>
        <BounceCard
          onPress={() => {
            setSafetyFlag(true);
            finish(true);
          }}
          style={{ borderColor: colors.mind }}
        >
          <Text style={{ fontSize: 24 }}>🤝</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.optionTitle}>Yes, I have</Text>
            <Text style={type.small}>Thank you for being honest — let's get you support</Text>
          </View>
        </BounceCard>
      </>
    );
  }

  if (step === 'reflect') {
    body = (
      <>
        <Text style={styles.big}>{kind === 'morning' ? '🌱' : '✍️'}</Text>
        <Text style={styles.question}>{promptFor(kind)}</Text>
        <TextInput
          value={text1}
          onChangeText={setText1}
          multiline
          placeholder={kind === 'morning' ? 'e.g. Take a short walk at lunch' : 'e.g. Finished my work early'}
          placeholderTextColor={colors.faint}
          style={styles.input}
        />
        {kind === 'evening' && (
          <>
            <Text style={[styles.fieldLabel, { marginTop: space(4) }]}>🙏 One thing you're grateful for</Text>
            <TextInput value={text2} onChangeText={setText2} multiline placeholder="e.g. A call with my sister" placeholderTextColor={colors.faint} style={styles.input} />
          </>
        )}
        <Button
          title={text1 || text2 ? 'Finish' : 'Skip & finish'}
          icon="checkmark-done"
          onPress={() => finish()}
          style={{ marginTop: space(5), backgroundColor: colors.mind, borderColor: colors.mind }}
        />
      </>
    );
  }

  if (step === 'result' && result) {
    const serious = result.level === 'urgent' || result.level === 'support';
    const s = checkInStreak(data.checkIns, memberId, data.moodLogs);
    body = (
      <>
        {!serious && (
          <Card style={{ paddingVertical: space(6), overflow: 'hidden' }}>
            <StreakHero days={s.current} label={streakMessage(s.current)} />
            {newBadge && (
              <View style={styles.badgeBox}>
                <Text style={{ fontSize: 28 }}>{newBadge.emoji}</Text>
                <View>
                  <Text style={[type.label, { color: colors.warning }]}>New badge unlocked!</Text>
                  <Text style={type.h3}>{newBadge.title}</Text>
                </View>
              </View>
            )}
          </Card>
        )}
        <Card style={{ backgroundColor: colors.mindSoft, borderColor: colors.mindSoft }}>
          <Text style={[type.h2, { color: colors.mind }]}>{result.title}</Text>
          <Text style={[type.body, { marginTop: space(2) }]}>{result.message}</Text>
          {feelings.length > 0 && (
            <Text style={[type.small, { marginTop: space(3) }]}>You felt: {feelings.map((f) => `${FEELING_BY_ID[f].emoji} ${FEELING_BY_ID[f].label}`).join('  ')}</Text>
          )}
        </Card>

        {serious ? (
          <SupportOptions compact={false} />
        ) : (
          result.suggestions.length > 0 && (
            <Card>
              <Text style={[type.h3, { marginBottom: space(2) }]}>Small things that help</Text>
              {result.suggestions.map((sg) => {
                const href = sg.id === 'breathe' ? '/breathe' : sg.id === 'ground' ? '/breathe' : sg.id === 'ai' ? '/companion' : sg.id === 'text' || sg.id === 'talk' ? '/support' : null;
                return (
                  <Pressable key={sg.id} disabled={!href} onPress={() => href && router.push(href as never)} style={styles.sugg}>
                    <Text style={{ fontSize: 18 }}>{{ breathe: '🌬️', ground: '🖐️', text: '💬', talk: '📞', ai: '🤖', walk: '🚶', water: '💧', sleep: '😴', journal: '📓' }[sg.id]}</Text>
                    <Text style={[type.body, { flex: 1 }]}>{sg.label}</Text>
                    {href ? <Ionicons name="chevron-forward" size={18} color={colors.mind} /> : null}
                  </Pressable>
                );
              })}
            </Card>
          )
        )}
        <Button title="Done" variant="secondary" onPress={reset} style={{ marginTop: space(2) }} />
        <Text style={[type.small, { textAlign: 'center', marginTop: space(3) }]}>
          This check helps you notice how you are doing. It is not a diagnosis.
        </Text>
      </>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {step !== 'mood' && step !== 'result' && (
        <View style={styles.topBar}>
          <Pressable onPress={back} hitSlop={12} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </Pressable>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${pct * 100}%` }]} />
          </View>
        </View>
      )}
      <ScrollView key={step} contentContainerStyle={{ padding: space(4), paddingBottom: insets.bottom + space(10) }} keyboardShouldPersistTaps="handled">
        {body}
      </ScrollView>
      {step === 'result' && result && (result.level === 'great' || result.level === 'okay') && <Confetti count={14} />}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: colors.mind, borderRadius: radius.lg, padding: space(4), marginBottom: space(4) },
  heroTitle: { color: '#fff', fontSize: 20, fontWeight: '800' },
  heroSub: { color: '#E6E1F5', fontSize: 13, marginTop: 4 },
  trend: { flexDirection: 'row', marginTop: space(4) },
  kindPill: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.15)' },
  kindPillOn: { backgroundColor: '#fff' },
  kindText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  question: { fontSize: 24, fontWeight: '800', color: colors.text, marginBottom: space(4), lineHeight: 31, letterSpacing: -0.3 },
  big: { fontSize: 50, marginBottom: space(2) },
  optionTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space(2) },
  feel: {
    width: '31.5%',
    alignItems: 'center',
    gap: 4,
    paddingVertical: space(3),
    paddingHorizontal: 4,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  feelOn: { borderColor: colors.mind, backgroundColor: colors.mindSoft },
  feelText: { fontSize: 13, color: colors.text, textAlign: 'center', fontWeight: '600' },
  dotScale: { width: 22, height: 22, borderRadius: 11 },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: space(4),
    minHeight: 84,
    fontSize: 16,
    color: colors.text,
    textAlignVertical: 'top',
  },
  fieldLabel: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 6 },
  notOkay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(3),
    padding: space(4),
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.mindSoft,
    backgroundColor: '#FBF9FF',
    marginTop: space(2),
    marginBottom: space(3),
  },
  badgeBox: { flexDirection: 'row', alignItems: 'center', gap: space(3), backgroundColor: colors.accentSoft, borderRadius: radius.md, padding: space(3), marginTop: space(4) },
  sugg: { flexDirection: 'row', alignItems: 'center', gap: space(3), paddingVertical: 10 },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: space(3), paddingHorizontal: space(4), paddingTop: space(3) },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card },
  track: { flex: 1, height: 8, borderRadius: 4, backgroundColor: colors.border, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: colors.mind, borderRadius: 4 },
});
