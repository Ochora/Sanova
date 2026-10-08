import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { syncChildReminders } from '../../lib/careReminders';
import { ageText, growthFlags, isUnderFive, MILESTONES, milestoneState, nextVaccine, vaccineStatus, type VaccineStatus } from '../../lib/childHealth';
import { formatDate, isValidDateKey, toDateKey } from '../../lib/dates';
import { ageInMonths } from '../../lib/dosing';
import { uid } from '../../lib/id';
import { emptyChildCare, useStore } from '../../lib/store';
import type { ChildCare } from '../../lib/types';
import { haptic } from '../../ui/Choice';
import { Button, Card, Empty, Field, Notice, Pill, Screen, SectionTitle } from '../../ui/components';
import { colors, radius, space, type } from '../../ui/theme';

type Tab = 'vaccines' | 'growth' | 'milestones';

const STATE_META = {
  done: { label: 'Given ✓', color: colors.success, bg: colors.successSoft },
  due: { label: 'Due now', color: colors.warning, bg: colors.warningSoft },
  overdue: { label: 'Overdue', color: colors.danger, bg: colors.dangerSoft },
  upcoming: { label: 'Upcoming', color: colors.muted, bg: colors.bg },
};

export default function ChildHealth() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, updateChildCare } = useStore();
  const child = data.members.find((m) => m.id === id);
  const care: ChildCare = data.childCare[id ?? ''] ?? emptyChildCare();
  const [tab, setTab] = useState<Tab>('vaccines');
  const [adding, setAdding] = useState(false);
  const [gDate, setGDate] = useState(toDateKey());
  const [gWeight, setGWeight] = useState('');
  const [gHeight, setGHeight] = useState('');
  const [gMuac, setGMuac] = useState('');

  if (!child) return <Empty icon="happy" title="Child not found" />;
  if (!child.dob) {
    return (
      <Screen>
        <Empty icon="calendar" title="Add a date of birth" body={`Child health tracking needs ${child.name.split(' ')[0]}'s date of birth. Edit the profile to add it.`} />
      </Screen>
    );
  }
  const first = child.name.split(' ')[0];
  const months = ageInMonths(child.dob);
  const statuses = vaccineStatus(child.dob, care);
  const next = nextVaccine(child.dob, care);
  const flags = growthFlags(care.growth, months);
  const growth = [...care.growth].sort((a, b) => a.date.localeCompare(b.date));
  const maxW = Math.max(1, ...growth.map((g) => g.weightKg ?? 0));

  const setCare = async (fn: (c: ChildCare) => ChildCare, resync = false) => {
    const next = fn(care);
    updateChildCare(child.id, () => next);
    if (resync) {
      const ids = await syncChildReminders(child, next);
      updateChildCare(child.id, (c) => ({ ...c, notificationIds: ids }));
    }
  };

  const toggleVaccine = (s: VaccineStatus) => {
    haptic();
    if (s.givenOn) {
      setCare((c) => {
        const v = { ...c.vaccines };
        delete v[s.visit.id];
        return { ...c, vaccines: v };
      }, true);
    } else {
      setCare((c) => ({ ...c, vaccines: { ...c.vaccines, [s.visit.id]: toDateKey() } }), true);
    }
  };

  const addGrowth = () => {
    if (!isValidDateKey(gDate)) return Alert.alert('Date', 'Use the format YYYY-MM-DD.');
    const w = parseFloat(gWeight.replace(',', '.'));
    const h = parseFloat(gHeight.replace(',', '.'));
    const m = parseFloat(gMuac.replace(',', '.'));
    if (!(w > 0) && !(h > 0) && !(m > 0)) return Alert.alert('Measurement', 'Enter at least one measurement.');
    setCare((c) => ({
      ...c,
      growth: [...c.growth, { id: uid('g_'), date: gDate, weightKg: w > 0 ? w : undefined, heightCm: h > 0 ? h : undefined, muacCm: m > 0 ? m : undefined }],
    }));
    setAdding(false);
    setGWeight('');
    setGHeight('');
    setGMuac('');
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: `${first}'s health` }} />
      <View style={styles.hero}>
        <Text style={{ fontSize: 44 }}>{months < 12 ? '👶' : months < 60 ? '🧒' : '🧑'}</Text>
        <Text style={styles.heroTitle}>{child.name}</Text>
        <Text style={styles.heroSub}>
          {ageText(child.dob)} old · born {formatDate(child.dob)}
          {child.birthWeightKg ? ` · ${child.birthWeightKg} kg at birth` : ''}
        </Text>
        {next && (
          <View style={[styles.nextBox, next.state === 'overdue' && { backgroundColor: colors.dangerSoft }]}>
            <Text style={{ fontSize: 22 }}>💉</Text>
            <View style={{ flex: 1 }}>
              <Text style={[type.body, { fontWeight: '800', color: next.state === 'overdue' ? colors.dangerDark : colors.child }]}>
                {next.visit.label} vaccines {next.state === 'overdue' ? 'are overdue' : next.state === 'due' ? 'are due now' : `on ${formatDate(next.due)}`}
              </Text>
              <Text style={type.small}>{next.visit.vaccines.join(', ')}</Text>
            </View>
          </View>
        )}
      </View>

      <View style={styles.tabs}>
        {([
          ['vaccines', '💉 Vaccines'],
          ['growth', '📏 Growth'],
          ['milestones', '🌱 Milestones'],
        ] as [Tab, string][]).map(([t, label]) => (
          <Pressable key={t} onPress={() => { haptic(); setTab(t); }} style={[styles.tab, tab === t && styles.tabOn]}>
            <Text style={[styles.tabText, tab === t && { color: '#fff' }]}>{label}</Text>
          </Pressable>
        ))}
      </View>

      {tab === 'vaccines' && (
        <>
          {statuses.map((s) => {
            const meta = STATE_META[s.state];
            return (
              <Card key={s.visit.id} style={s.state === 'overdue' ? { borderColor: colors.danger } : undefined}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={type.h3}>{s.visit.label}</Text>
                    <Text style={type.small}>{s.givenOn ? `Given ${formatDate(s.givenOn)}` : `Due ${formatDate(s.due)}`}</Text>
                  </View>
                  <Pill label={meta.label} color={meta.color} bg={meta.bg} />
                </View>
                <Text style={[type.body, { marginTop: 6 }]}>{s.visit.vaccines.join(' · ')}</Text>
                {s.visit.note ? <Text style={[type.small, { marginTop: 4 }]}>{s.visit.note}</Text> : null}
                {s.state !== 'upcoming' || s.givenOn ? (
                  <Button
                    small
                    variant={s.givenOn ? 'ghost' : 'primary'}
                    icon={s.givenOn ? 'arrow-undo' : 'checkmark'}
                    title={s.givenOn ? 'Undo' : 'Mark as given today'}
                    onPress={() => toggleVaccine(s)}
                    style={{ alignSelf: 'flex-start', marginTop: space(2), ...(s.givenOn ? {} : { backgroundColor: colors.child, borderColor: colors.child }) }}
                  />
                ) : null}
              </Card>
            );
          })}
          <Notice tone="info">
            Also every 6 months: Vitamin A (6 months – 5 years) and deworming (from 1 year). Girls get the HPV vaccine at 10 years. Your child health card from the clinic is the final word on which vaccines were given.
          </Notice>
        </>
      )}

      {tab === 'growth' && (
        <>
          {flags.map((f) => (
            <Notice key={f.message} tone={f.tone === 'good' ? 'success' : f.tone === 'warn' ? 'warn' : 'danger'}>
              {f.message}
            </Notice>
          ))}
          {growth.some((g) => g.weightKg) && (
            <Card>
              <Text style={[type.h3, { marginBottom: space(3) }]}>Weight (kg)</Text>
              <View style={styles.chart}>
                {growth
                  .filter((g) => g.weightKg)
                  .slice(-8)
                  .map((g) => (
                    <View key={g.id} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: colors.child }}>{g.weightKg}</Text>
                      <View style={styles.barTrack}>
                        <View style={{ height: `${(g.weightKg! / maxW) * 100}%`, backgroundColor: colors.child, borderRadius: 5 }} />
                      </View>
                      <Text style={{ fontSize: 10, color: colors.faint }}>{g.date.slice(5)}</Text>
                    </View>
                  ))}
              </View>
            </Card>
          )}
          {adding ? (
            <Card>
              <Field label="Date" value={gDate} onChangeText={setGDate} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" />
              <View style={{ flexDirection: 'row', gap: space(3) }}>
                <View style={{ flex: 1 }}>
                  <Field label="Weight (kg)" value={gWeight} onChangeText={setGWeight} keyboardType="decimal-pad" placeholder="e.g. 7.4" />
                </View>
                <View style={{ flex: 1 }}>
                  <Field label="Height (cm)" value={gHeight} onChangeText={setGHeight} keyboardType="decimal-pad" placeholder="e.g. 68" />
                </View>
              </View>
              {months >= 6 && months < 60 && (
                <Field label="Arm (MUAC, cm) — optional" value={gMuac} onChangeText={setGMuac} keyboardType="decimal-pad" placeholder="e.g. 13.5" hint="From the coloured tape at the clinic or VHT." />
              )}
              <View style={{ flexDirection: 'row', gap: space(3) }}>
                <Button title="Cancel" variant="secondary" onPress={() => setAdding(false)} style={{ flex: 1 }} />
                <Button title="Save" icon="checkmark" onPress={addGrowth} style={{ flex: 2, backgroundColor: colors.child, borderColor: colors.child }} />
              </View>
            </Card>
          ) : (
            <Button title="Add a measurement" icon="add" onPress={() => setAdding(true)} style={{ backgroundColor: colors.child, borderColor: colors.child, marginBottom: space(3) }} />
          )}
          {[...growth].reverse().map((g) => (
            <Card key={g.id} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={[type.body, { flex: 1, fontWeight: '600' }]}>{formatDate(g.date)}</Text>
              <Text style={type.small}>{[g.weightKg && `${g.weightKg} kg`, g.heightCm && `${g.heightCm} cm`, g.muacCm && `MUAC ${g.muacCm}`].filter(Boolean).join(' · ')}</Text>
            </Card>
          ))}
          {isUnderFive(child.dob) && (
            <Text style={[type.small, { marginTop: space(2) }]}>
              Weigh children under 2 every month at the clinic or by your VHT. Breastfeed only for 6 months, then add soft family foods while breastfeeding up to 2 years.
            </Text>
          )}
        </>
      )}

      {tab === 'milestones' && (
        <>
          <Text style={[type.small, { marginBottom: space(3) }]}>
            Every child grows at their own pace. Tick what {first} can do. If something is still missing a few months later, talk to a health worker — early help makes a big difference.
          </Text>
          {[...new Set(MILESTONES.map((m) => m.months))].map((age) => {
            const items = MILESTONES.filter((m) => m.months === age);
            if (age > months + 6) return null;
            return (
              <View key={age}>
                <SectionTitle>By {age < 24 ? `${age} months` : `${age / 12} years`}</SectionTitle>
                <Card style={{ padding: 0 }}>
                  {items.map((m, i) => {
                    const st = milestoneState(m, months, care);
                    const on = st === 'done';
                    return (
                      <Pressable
                        key={m.id}
                        onPress={() => {
                          haptic();
                          setCare((c) => {
                            const ms = { ...c.milestones };
                            if (on) delete ms[m.id];
                            else ms[m.id] = toDateKey();
                            return { ...c, milestones: ms };
                          });
                        }}
                        style={[styles.msRow, i > 0 && styles.border]}
                      >
                        <View style={[styles.check, on && { backgroundColor: colors.child, borderColor: colors.child }]}>{on ? <Ionicons name="checkmark" size={16} color="#fff" /> : null}</View>
                        <Text style={{ fontSize: 18 }}>{m.emoji}</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={[type.body, on && { fontWeight: '700' }]}>{m.text}</Text>
                          {st === 'late' && <Text style={[type.small, { color: colors.warning }]}>Not yet? Mention it at the next clinic visit.</Text>}
                        </View>
                      </Pressable>
                    );
                  })}
                </Card>
              </View>
            );
          })}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: colors.childSoft, borderRadius: radius.lg, padding: space(5), marginBottom: space(3), alignItems: 'center' },
  heroTitle: { fontSize: 24, fontWeight: '900', color: colors.child, marginTop: space(1) },
  heroSub: { fontSize: 14, color: colors.text, marginTop: 4, textAlign: 'center' },
  nextBox: { flexDirection: 'row', gap: 10, alignItems: 'center', alignSelf: 'stretch', backgroundColor: colors.card, borderRadius: radius.md, padding: space(3), marginTop: space(4) },
  tabs: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: radius.pill, padding: 4, marginBottom: space(4), borderWidth: 1, borderColor: colors.border },
  tab: { flex: 1, paddingVertical: 10, borderRadius: radius.pill, alignItems: 'center' },
  tabOn: { backgroundColor: colors.child },
  tabText: { fontWeight: '700', color: colors.muted, fontSize: 13 },
  chart: { flexDirection: 'row', gap: 6, alignItems: 'flex-end' },
  barTrack: { width: '70%', height: 90, justifyContent: 'flex-end' },
  msRow: { flexDirection: 'row', alignItems: 'center', gap: space(3), padding: space(4) },
  border: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  check: { width: 24, height: 24, borderRadius: 7, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
});
