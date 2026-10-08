import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { syncPregnancyReminders } from '../../lib/careReminders';
import { addDays, formatDate, isValidDateKey, toDateKey } from '../../lib/dates';
import { call } from '../../lib/emergency';
import { uid } from '../../lib/id';
import {
  ANC_WEEKS,
  ancSchedule,
  BIRTH_PLAN,
  DANGER_SIGNS,
  DONTS,
  DOS,
  gestation,
  inPostnatal,
  lmpFromEdd,
  MOTHER_DANGER,
  NEWBORN_DANGER,
  nextAnc,
  PNC_CHECKS,
  POSTNATAL_CARE,
  POSTNATAL_DAYS,
  postnatalDay,
  weekInfo,
  WEEKS,
} from '../../lib/pregnancy';
import { cancelIds } from '../../lib/notifications';
import { useStore } from '../../lib/store';
import type { Pregnancy } from '../../lib/types';
import { haptic } from '../../ui/Choice';
import { Button, Card, Empty, Field, Notice, Screen, SectionTitle } from '../../ui/components';
import { colors, radius, space, type } from '../../ui/theme';

type Tab = 'week' | 'calendar' | 'visits' | 'dos' | 'plan';
const TABS: [Tab, string][] = [
  ['week', 'This week'],
  ['calendar', 'Calendar'],
  ['visits', 'Clinic visits'],
  ['dos', "Do's & don'ts"],
  ['plan', 'Birth plan'],
];

function Bullets({ items, color }: { items: string[]; color: string }) {
  return (
    <>
      {items.map((t) => (
        <View key={t} style={{ flexDirection: 'row', gap: 8, marginBottom: 6 }}>
          <Text style={{ color, fontWeight: '900' }}>•</Text>
          <Text style={[type.body, { flex: 1 }]}>{t}</Text>
        </View>
      ))}
    </>
  );
}

function Postnatal({ p }: { p: Pregnancy }) {
  const { data } = useStore();
  const day = postnatalDay(p.delivery!.date);
  const babies = data.members.filter((m) => p.delivery!.babyIds.includes(m.id));
  const done = day > POSTNATAL_DAYS;
  return (
    <>
      <View style={[styles.hero, { backgroundColor: colors.childSoft }]}>
        <Text style={{ fontSize: 46 }}>{done ? '🌟' : '👶'}</Text>
        <Text style={[styles.heroTitle, { color: colors.child }]}>{done ? 'Postnatal period complete' : `Postnatal day ${day} of ${POSTNATAL_DAYS}`}</Text>
        <Text style={styles.heroSub}>
          {done
            ? 'Well done, mama! You are back to everyday Sanova. Your baby’s health continues in Child health.'
            : `Born ${formatDate(p.delivery!.date)}${p.delivery!.place ? ` at ${p.delivery!.place}` : ''}. Rest, eat well and keep your postnatal checks.`}
        </Text>
        <View style={[styles.track, { backgroundColor: 'rgba(37,99,168,0.15)' }]}>
          <View style={[styles.fill, { width: `${Math.min(1, day / POSTNATAL_DAYS) * 100}%`, backgroundColor: colors.child }]} />
        </View>
      </View>
      {babies.map((b) => (
        <Pressable key={b.id} onPress={() => router.push({ pathname: '/child/[id]', params: { id: b.id } })} style={styles.babyRow}>
          <Text style={{ fontSize: 28 }}>🍼</Text>
          <View style={{ flex: 1 }}>
            <Text style={[type.h3, { color: colors.child }]}>{b.name}</Text>
            <Text style={type.small}>Vaccines, growth and milestones</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.child} />
        </Pressable>
      ))}
      {!done && (
        <>
          <SectionTitle>Postnatal checks</SectionTitle>
          <Card>
            {PNC_CHECKS.map((c) => {
              const date = addDays(p.delivery!.date, c.day - 1);
              const past = day > c.day + (c.day === 10 ? 4 : 0);
              return (
                <View key={c.day} style={styles.timelineRow}>
                  <View style={[styles.dot, { backgroundColor: past ? colors.success : colors.child }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[type.body, { fontWeight: '700' }]}>{c.label}</Text>
                    <Text style={type.small}>{formatDate(date)}</Text>
                  </View>
                </View>
              );
            })}
          </Card>
          <SectionTitle>Caring for you and baby</SectionTitle>
          <Card>
            {POSTNATAL_CARE.map((c) => (
              <View key={c.text} style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
                <Text style={{ fontSize: 20 }}>{c.emoji}</Text>
                <Text style={[type.body, { flex: 1 }]}>{c.text}</Text>
              </View>
            ))}
          </Card>
          <SectionTitle>Go to a health facility now if</SectionTitle>
          <Card style={{ backgroundColor: colors.dangerSoft, borderColor: colors.dangerSoft }}>
            <Text style={[type.h3, { marginBottom: 6 }]}>Mother</Text>
            <Bullets items={MOTHER_DANGER} color={colors.danger} />
            <Text style={[type.h3, { marginVertical: 6 }]}>Baby</Text>
            <Bullets items={NEWBORN_DANGER} color={colors.danger} />
          </Card>
          <Button title="Feeling low? Talk to someone" variant="secondary" icon="heart" onPress={() => router.push('/support')} style={{ marginBottom: space(3) }} />
        </>
      )}
    </>
  );
}

export default function PregnancyJourney() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, savePregnancy, saveMember } = useStore();
  const p = data.pregnancies.find((x) => x.id === id);
  const member = data.members.find((m) => m.id === p?.memberId);
  const [tab, setTab] = useState<Tab>('week');
  const [openWeek, setOpenWeek] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [vDate, setVDate] = useState(toDateKey());
  const [vFacility, setVFacility] = useState(p?.plannedFacility ?? '');
  const [vWeight, setVWeight] = useState('');
  const [vBp, setVBp] = useState('');
  const [vNotes, setVNotes] = useState('');
  const [vNext, setVNext] = useState('');

  if (!p || !member) return <Empty icon="heart" title="Pregnancy not found" />;
  const firstName = member.name.split(' ')[0];

  if (p.status === 'delivered' && p.delivery) {
    return (
      <Screen>
        <Stack.Screen options={{ title: inPostnatal(p) ? 'After the birth' : 'Birth & recovery' }} />
        <Postnatal p={p} />
      </Screen>
    );
  }
  if (p.status === 'ended') {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Pregnancy' }} />
        <View style={[styles.hero, { backgroundColor: colors.mindSoft }]}>
          <Text style={{ fontSize: 46 }}>💜</Text>
          <Text style={[styles.heroTitle, { color: colors.mind }]}>We're so sorry</Text>
          <Text style={styles.heroSub}>
            Losing a pregnancy can be very painful, physically and emotionally. Please see a health worker for a check-up, and be gentle with yourself.
          </Text>
        </View>
        <Card style={{ backgroundColor: colors.dangerSoft, borderColor: colors.dangerSoft }}>
          <Text style={[type.h3, { marginBottom: 6 }]}>Go to a health facility now if you have</Text>
          <Bullets items={['Heavy bleeding (soaking a pad in under an hour)', 'Fever or chills', 'Severe pain in the belly', 'Bad-smelling discharge', 'Feeling faint or dizzy']} color={colors.danger} />
        </Card>
        <Button title="Talk to someone" icon="heart" onPress={() => router.push('/support')} style={{ backgroundColor: colors.mind, borderColor: colors.mind }} />
      </Screen>
    );
  }

  const g = gestation(p.edd);
  const info = weekInfo(g.weeks);
  const next = nextAnc(p);
  const lmp = p.lmp ?? lmpFromEdd(p.edd);
  const schedule = ancSchedule(p);

  const update = async (next: Pregnancy) => {
    savePregnancy(next);
    const ids = await syncPregnancyReminders(next, member);
    savePregnancy({ ...next, notificationIds: ids });
  };

  const addVisit = async () => {
    if (!isValidDateKey(vDate)) return Alert.alert('Date', 'Use the format YYYY-MM-DD.');
    if (vNext && !isValidDateKey(vNext)) return Alert.alert('Next visit', 'Use the format YYYY-MM-DD.');
    const w = parseFloat(vWeight);
    await update({
      ...p,
      ancVisits: [
        ...p.ancVisits,
        { id: uid('anc_'), date: vDate, facility: vFacility.trim() || undefined, weightKg: w > 0 ? w : undefined, bp: vBp.trim() || undefined, notes: vNotes.trim() || undefined, nextDate: vNext || undefined },
      ],
    });
    setAdding(false);
    setVWeight('');
    setVBp('');
    setVNotes('');
    setVNext('');
  };

  const endPregnancy = () =>
    Alert.alert('Is this pregnancy no longer continuing?', 'Sanova will stop the pregnancy reminders. Your records stay saved.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Yes',
        style: 'destructive',
        onPress: async () => {
          await cancelIds(p.notificationIds);
          savePregnancy({ ...p, status: 'ended', endedAt: toDateKey(), notificationIds: [] });
          saveMember({ ...member, pregnant: false });
        },
      },
    ]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen options={{ title: member.relationship === 'self' ? 'My pregnancy' : `${firstName}'s pregnancy` }} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={styles.tabs}>
        {TABS.map(([t, label]) => (
          <Pressable key={t} onPress={() => { haptic(); setTab(t); }} style={[styles.tab, tab === t && styles.tabOn]}>
            <Text style={[styles.tabText, tab === t && { color: '#fff' }]}>{label}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <Screen>
        {tab === 'week' && (
          <>
            <View style={styles.hero}>
              <Text style={{ fontSize: 60 }}>{info.emoji}</Text>
              <Text style={styles.heroTitle}>
                {g.overdue ? 'Past the due date' : `Week ${g.weeks}`}
                {!g.overdue && g.days ? ` + ${g.days} day${g.days > 1 ? 's' : ''}` : ''}
              </Text>
              <Text style={styles.heroSub}>Baby is about the size of {info.size}</Text>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${g.progress * 100}%` }]} />
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignSelf: 'stretch', marginTop: 6 }}>
                <Text style={styles.heroMeta}>Trimester {g.trimester}</Text>
                <Text style={styles.heroMeta}>{g.overdue ? 'See your health worker' : `${g.daysLeft} days to go · due ${formatDate(p.edd)}`}</Text>
              </View>
            </View>
            {next && (
              <Pressable onPress={() => setTab('visits')}>
                <Card style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                  <Text style={{ fontSize: 28 }}>🏥</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={type.h3}>Next antenatal visit</Text>
                    <Text style={type.body}>
                      Visit {next.n} of 8 · {next.due < toDateKey() ? 'due now' : formatDate(next.due)}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.faint} />
                </Card>
              </Pressable>
            )}
            <Card>
              <Text style={[type.label, { color: colors.mama }]}>👶 Your baby this week</Text>
              <Text style={[type.body, { marginTop: 6 }]}>{info.baby}</Text>
              <Text style={[type.label, { color: colors.mama, marginTop: space(4) }]}>🤰 For you</Text>
              <Text style={[type.body, { marginTop: 6 }]}>{info.mum}</Text>
            </Card>
            <Card style={{ backgroundColor: colors.dangerSoft, borderColor: colors.dangerSoft }}>
              <Text style={[type.h3, { color: colors.dangerDark, marginBottom: space(2) }]}>🚨 Danger signs — go to a health facility now</Text>
              <Bullets items={DANGER_SIGNS} color={colors.danger} />
              <Button small variant="danger" icon="call" title="Call 999 / ambulance" onPress={() => call('999')} style={{ alignSelf: 'flex-start', marginTop: space(2) }} />
            </Card>
            <Button title="🎉 The baby is born" onPress={() => router.push({ pathname: '/pregnancy/born', params: { id: p.id } })} style={{ backgroundColor: colors.child, borderColor: colors.child, marginBottom: space(2) }} />
            <Button title="This pregnancy is not continuing" variant="ghost" onPress={endPregnancy} />
          </>
        )}

        {tab === 'calendar' && (
          <>
            <Text style={[type.small, { marginBottom: space(3) }]}>Tap a week to read about it. 🏥 marks the 8 recommended antenatal visits.</Text>
            {WEEKS.map((w, i) => {
              const start = addDays(lmp, w.week * 7);
              const isNow = g.weeks >= w.week && (i === WEEKS.length - 1 || g.weeks < WEEKS[i + 1].week);
              const past = g.weeks >= (WEEKS[i + 1]?.week ?? 99);
              const anc = ANC_WEEKS.filter((a) => a >= w.week && a < (WEEKS[i + 1]?.week ?? 99)).map((a) => schedule.find((s) => s.week === a)!);
              const trimesterStart = w.week === 4 ? 1 : w.week === 14 ? 2 : w.week === 28 ? 3 : 0;
              const open = openWeek === w.week || (openWeek === null && isNow);
              return (
                <View key={w.week}>
                  {trimesterStart > 0 && <Text style={[type.label, { color: colors.mama, marginTop: space(3), marginBottom: space(2) }]}>Trimester {trimesterStart}</Text>}
                  <Pressable onPress={() => setOpenWeek(open ? -1 : w.week)} style={[styles.weekRow, isNow && styles.weekNow, past && { opacity: 0.6 }]}>
                    <View style={[styles.weekNum, isNow && { backgroundColor: colors.mama }]}>
                      <Text style={[styles.weekNumText, isNow && { color: '#fff' }]}>{w.week}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[type.body, { fontWeight: '700' }]}>
                        {w.emoji} {w.size}
                        {isNow ? '  ← now' : ''}
                      </Text>
                      <Text style={type.small}>
                        From {formatDate(start)}
                        {anc.length ? `  ·  🏥 ${anc.map((a) => `Visit ${a.n}${a.done ? ' ✓' : ''}`).join(', ')}` : ''}
                      </Text>
                      {open && (
                        <>
                          <Text style={[type.body, { marginTop: space(2) }]}>👶 {w.baby}</Text>
                          <Text style={[type.body, { marginTop: space(2) }]}>🤰 {w.mum}</Text>
                        </>
                      )}
                    </View>
                  </Pressable>
                </View>
              );
            })}
          </>
        )}

        {tab === 'visits' && (
          <>
            <Card>
              <Text style={[type.h3, { marginBottom: space(2) }]}>8 recommended antenatal visits</Text>
              {schedule.map((s) => (
                <View key={s.n} style={styles.timelineRow}>
                  <View style={[styles.dot, { backgroundColor: s.done ? colors.success : s.due < toDateKey() ? colors.warning : colors.border }]} />
                  <Text style={[type.body, { flex: 1 }, s.done && { color: colors.success, fontWeight: '700' }]}>
                    Visit {s.n} · week {s.week}
                  </Text>
                  <Text style={type.small}>{s.done ? 'Done ✓' : formatDate(s.due)}</Text>
                </View>
              ))}
              <Text style={[type.small, { marginTop: space(2) }]}>
                At visits: iron & folic acid, Td vaccine, malaria prevention (IPTp-SP) from 13 weeks, HIV/syphilis/hepatitis B tests, blood pressure and baby checks.
              </Text>
            </Card>
            {adding ? (
              <Card>
                <Text style={[type.h3, { marginBottom: space(3) }]}>Record a clinic visit</Text>
                <Field label="Date" value={vDate} onChangeText={setVDate} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" />
                <Field label="Health facility" value={vFacility} onChangeText={setVFacility} placeholder="e.g. Kisenyi HC IV" />
                <View style={{ flexDirection: 'row', gap: space(3) }}>
                  <View style={{ flex: 1 }}>
                    <Field label="Weight (kg)" value={vWeight} onChangeText={setVWeight} keyboardType="decimal-pad" placeholder="e.g. 64" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Field label="Blood pressure" value={vBp} onChangeText={setVBp} placeholder="e.g. 120/80" />
                  </View>
                </View>
                <Field label="What did the health worker say?" value={vNotes} onChangeText={setVNotes} multiline placeholder="e.g. Hb 11, got Td 1 and SP, baby growing well" />
                <Field label="Next appointment" value={vNext} onChangeText={setVNext} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" hint="Sanova will remind you the evening before." />
                <View style={{ flexDirection: 'row', gap: space(3) }}>
                  <Button title="Cancel" variant="secondary" onPress={() => setAdding(false)} style={{ flex: 1 }} />
                  <Button title="Save visit" icon="checkmark" onPress={addVisit} style={{ flex: 2, backgroundColor: colors.mama, borderColor: colors.mama }} />
                </View>
              </Card>
            ) : (
              <Button title="Record a clinic visit" icon="add" onPress={() => setAdding(true)} style={{ backgroundColor: colors.mama, borderColor: colors.mama, marginBottom: space(3) }} />
            )}
            {[...p.ancVisits].reverse().map((v) => (
              <Card key={v.id}>
                <Text style={type.h3}>
                  {formatDate(v.date)}
                  {v.facility ? ` · ${v.facility}` : ''}
                </Text>
                <Text style={type.small}>{[v.weightKg ? `${v.weightKg} kg` : null, v.bp ? `BP ${v.bp}` : null].filter(Boolean).join(' · ')}</Text>
                {v.notes ? <Text style={[type.body, { marginTop: 4 }]}>{v.notes}</Text> : null}
                {v.nextDate ? <Text style={[type.small, { marginTop: 4, color: colors.mama }]}>Next: {formatDate(v.nextDate)}</Text> : null}
              </Card>
            ))}
          </>
        )}

        {tab === 'dos' && (
          <>
            <Card style={{ backgroundColor: colors.successSoft, borderColor: colors.successSoft }}>
              <Text style={[type.h3, { color: colors.success, marginBottom: space(3) }]}>✅ Do</Text>
              {DOS.map((d) => (
                <View key={d.text} style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
                  <Text style={{ fontSize: 20 }}>{d.emoji}</Text>
                  <Text style={[type.body, { flex: 1 }]}>{d.text}</Text>
                </View>
              ))}
            </Card>
            <Card style={{ backgroundColor: colors.dangerSoft, borderColor: colors.dangerSoft }}>
              <Text style={[type.h3, { color: colors.dangerDark, marginBottom: space(3) }]}>⛔ Don't</Text>
              {DONTS.map((d) => (
                <View key={d.text} style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
                  <Text style={{ fontSize: 20 }}>{d.emoji}</Text>
                  <Text style={[type.body, { flex: 1 }]}>{d.text}</Text>
                </View>
              ))}
            </Card>
            <Notice tone="info">When adding medicines, Sanova checks them against your pregnancy and allergies — but always ask a health worker before taking anything new.</Notice>
          </>
        )}

        {tab === 'plan' && (
          <>
            <Text style={[type.body, { marginBottom: space(3) }]}>
              Being ready saves lives. Tick each step as you prepare — {p.checklist.length} of {BIRTH_PLAN.length} done.
            </Text>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${(p.checklist.length / BIRTH_PLAN.length) * 100}%` }]} />
            </View>
            <View style={{ height: space(4) }} />
            {BIRTH_PLAN.map((b) => {
              const on = p.checklist.includes(b.id);
              return (
                <Pressable
                  key={b.id}
                  onPress={() => {
                    haptic();
                    savePregnancy({ ...p, checklist: on ? p.checklist.filter((x) => x !== b.id) : [...p.checklist, b.id] });
                  }}
                  style={[styles.planRow, on && { borderColor: colors.mama, backgroundColor: colors.mamaSoft }]}
                >
                  <View style={[styles.check, on && { backgroundColor: colors.mama, borderColor: colors.mama }]}>{on ? <Ionicons name="checkmark" size={16} color="#fff" /> : null}</View>
                  <Text style={[type.body, { flex: 1 }, on && { fontWeight: '700' }]}>{b.text}</Text>
                </Pressable>
              );
            })}
            {p.plannedFacility ? <Text style={[type.small, { marginTop: space(2) }]}>Planned place of birth: {p.plannedFacility}</Text> : null}
            <Button title="Find a facility" variant="secondary" icon="location" onPress={() => router.push('/facilities')} style={{ marginTop: space(3) }} />
          </>
        )}
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: { gap: 8, paddingHorizontal: space(4), paddingTop: space(2), paddingBottom: space(1) },
  tab: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: radius.pill, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  tabOn: { backgroundColor: colors.mama, borderColor: colors.mama },
  tabText: { fontWeight: '700', color: colors.muted, fontSize: 14 },
  hero: { backgroundColor: colors.mamaSoft, borderRadius: radius.lg, padding: space(5), marginBottom: space(3), alignItems: 'center' },
  heroTitle: { fontSize: 26, fontWeight: '900', color: colors.mama, marginTop: space(1), textAlign: 'center' },
  heroSub: { fontSize: 15, color: colors.text, marginTop: 4, textAlign: 'center', lineHeight: 21 },
  heroMeta: { fontSize: 12, color: colors.muted, fontWeight: '600' },
  track: { alignSelf: 'stretch', height: 10, borderRadius: 5, backgroundColor: 'rgba(184,61,116,0.15)', marginTop: space(4), overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: colors.mama, borderRadius: 5 },
  weekRow: { flexDirection: 'row', gap: space(3), backgroundColor: colors.card, borderRadius: radius.md, padding: space(3), marginBottom: space(2), borderWidth: 1, borderColor: colors.border },
  weekNow: { borderColor: colors.mama, borderWidth: 2 },
  weekNum: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.mamaSoft, alignItems: 'center', justifyContent: 'center' },
  weekNumText: { fontWeight: '900', color: colors.mama },
  timelineRow: { flexDirection: 'row', alignItems: 'center', gap: space(3), paddingVertical: 6 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  planRow: { flexDirection: 'row', alignItems: 'center', gap: space(3), padding: space(4), borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card, marginBottom: space(2) },
  check: { width: 24, height: 24, borderRadius: 7, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  babyRow: { flexDirection: 'row', alignItems: 'center', gap: space(3), backgroundColor: colors.card, borderRadius: radius.lg, padding: space(4), marginBottom: space(3), borderWidth: 1.5, borderColor: colors.childSoft },
});
