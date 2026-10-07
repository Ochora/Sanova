import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { adherence, dailyRates, dosesForDay, endDate, isActiveOn, type ScheduledDose } from '../../lib/adherence';
import { formatDate, formatTime12, fromDateKey, toDateKey } from '../../lib/dates';
import { useStore } from '../../lib/store';
import { Button, Card, Empty, Notice, Pill, Screen, SectionTitle } from '../../ui/components';
import { MemberPicker } from '../../ui/MemberPicker';
import { colors, radius, space, type } from '../../ui/theme';

const DAY = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function stateStyle(d: ScheduledDose) {
  switch (d.state) {
    case 'taken':
      return { label: 'Taken', color: colors.success, bg: colors.successSoft };
    case 'skipped':
      return { label: 'Skipped', color: colors.muted, bg: colors.border };
    case 'missed':
      return { label: 'Missed', color: colors.danger, bg: colors.dangerSoft };
    case 'due':
      return { label: 'Due now', color: colors.warning, bg: colors.warningSoft };
    default:
      return { label: 'Later', color: colors.muted, bg: colors.bg };
  }
}

export default function Meds() {
  const { data, logDose } = useStore();
  const [memberId, setMemberId] = useState<string | undefined>(undefined);
  const today = toDateKey();
  const now = new Date();

  const meds = useMemo(
    () => data.medications.filter((m) => !memberId || m.memberId === memberId),
    [data.medications, memberId],
  );
  const doses = dosesForDay(meds, data.doseLogs, today, now);
  const week = adherence(meds, data.doseLogs, 7, now);
  const bars = dailyRates(meds, data.doseLogs, 7, now);
  const active = meds.filter((m) => isActiveOn(m, today) || m.startDate > today);
  const finished = meds.filter((m) => !active.includes(m));
  const nameOf = (id: string) => data.members.find((x) => x.id === id);

  const shareSummary = () => {
    const who = memberId ? nameOf(memberId)?.name : 'our family';
    const lines = [
      `Sanova medication summary for ${who} (last 7 days)`,
      week.rate === null ? 'No doses due yet.' : `Adherence: ${Math.round(week.rate * 100)}% — ${week.taken} taken, ${week.missed} missed, ${week.skipped} skipped.`,
      '',
      ...active.map((m) => {
        const s = adherence([m], data.doseLogs, 7, now);
        const owner = nameOf(m.memberId);
        return `• ${m.name} ${m.dose} at ${m.times.map(formatTime12).join(', ')}${owner && owner.relationship !== 'self' ? ` (${owner.name})` : ''}${s.rate !== null ? ` — ${Math.round(s.rate * 100)}%` : ''}`;
      }),
    ];
    Share.share({ message: lines.join('\n') });
  };

  if (data.medications.length === 0) {
    return (
      <Screen>
        <Empty icon="medkit" title="No medicines yet" body="Add a prescription and Sanova will remind you at the right times — even with no internet.">
          <Button title="Add medicine" icon="add" onPress={() => router.push('/med-form')} />
        </Empty>
      </Screen>
    );
  }

  return (
    <Screen>
      <MemberPicker value={memberId} onChange={setMemberId} allowAll />

      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <View>
            <Text style={type.label}>7-day adherence</Text>
            <Text style={[type.h1, { fontSize: 34, color: week.rate === null ? colors.muted : week.rate >= 0.8 ? colors.success : week.rate >= 0.5 ? colors.warning : colors.danger }]}>
              {week.rate === null ? '—' : `${Math.round(week.rate * 100)}%`}
            </Text>
            <Text style={type.small}>
              {week.taken} taken · {week.missed} missed · {week.skipped} skipped
            </Text>
          </View>
          <View style={styles.bars}>
            {bars.map((b) => (
              <View key={b.date} style={{ alignItems: 'center', gap: 4 }}>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        height: `${Math.max(b.rate ?? 0, b.rate === null ? 0 : 0.06) * 100}%`,
                        backgroundColor: b.rate === null ? colors.border : b.rate >= 0.8 ? colors.success : b.rate >= 0.5 ? colors.accent : colors.danger,
                      },
                    ]}
                  />
                </View>
                <Text style={{ fontSize: 10, color: colors.faint }}>{DAY[fromDateKey(b.date).getDay()]}</Text>
              </View>
            ))}
          </View>
        </View>
        <Button small variant="ghost" icon="share-social" title="Share with family, doctor or a contact" onPress={() => router.push({ pathname: '/share', params: memberId ? { memberId } : {} })} style={{ alignSelf: 'flex-start', marginTop: space(2), paddingHorizontal: 0 }} />
      </Card>

      <SectionTitle>Today · {formatDate(today)}</SectionTitle>
      {doses.length === 0 ? (
        <Notice tone="info">No doses scheduled today.</Notice>
      ) : (
        <Card style={{ padding: 0 }}>
          {doses.map((d, i) => {
            const st = stateStyle(d);
            const owner = nameOf(d.med.memberId);
            const logged = d.state === 'taken' || d.state === 'skipped';
            return (
              <View key={`${d.med.id}-${d.time}`} style={[styles.dose, i > 0 && styles.border]}>
                <View style={{ flex: 1 }}>
                  <Text style={type.small}>{formatTime12(d.time)}</Text>
                  <Text style={[type.h3, { marginTop: 2 }]}>{d.med.name}</Text>
                  <Text style={type.small}>
                    {d.med.dose}
                    {owner && owner.relationship !== 'self' ? ` · ${owner.name}` : ''}
                  </Text>
                  <View style={{ marginTop: 6 }}>
                    <Pill label={st.label} color={st.color} bg={st.bg} />
                  </View>
                </View>
                {logged ? (
                  <Button small variant="ghost" title="Undo" onPress={() => logDose(d.med.id, d.date, d.time, null)} />
                ) : (
                  <View style={{ gap: 6 }}>
                    <Button small icon="checkmark" title="Taken" onPress={() => logDose(d.med.id, d.date, d.time, 'taken')} />
                    <Button small variant="secondary" title="Skip" onPress={() => logDose(d.med.id, d.date, d.time, 'skipped')} />
                  </View>
                )}
              </View>
            );
          })}
        </Card>
      )}

      <SectionTitle action={<Button small variant="ghost" icon="add" title="Add" onPress={() => router.push('/med-form')} />}>
        Current medicines
      </SectionTitle>
      {active.length === 0 && <Notice tone="info">No active medicines.</Notice>}
      {active.map((m) => {
        const s = adherence([m], data.doseLogs, 7, now);
        const end = endDate(m);
        const owner = nameOf(m.memberId);
        return (
          <Pressable key={m.id} onPress={() => router.push({ pathname: '/med-form', params: { id: m.id } })}>
            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={styles.pillIcon}>
                  <Ionicons name="medical" size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={type.h3}>{m.name}</Text>
                  <Text style={type.small}>
                    {m.dose} · {m.times.map(formatTime12).join(', ')}
                  </Text>
                  <Text style={type.small}>
                    {owner && owner.relationship !== 'self' ? `${owner.name} · ` : ''}
                    {m.startDate > today ? `Starts ${formatDate(m.startDate)}` : end ? `Until ${formatDate(end)}` : 'Ongoing'}
                    {m.notificationIds.length ? '' : ' · reminders off'}
                  </Text>
                </View>
                {s.rate !== null && <Text style={[type.h3, { color: s.rate >= 0.8 ? colors.success : colors.warning }]}>{Math.round(s.rate * 100)}%</Text>}
              </View>
            </Card>
          </Pressable>
        );
      })}

      {finished.length > 0 && (
        <>
          <SectionTitle>Completed courses</SectionTitle>
          {finished.map((m) => (
            <Pressable key={m.id} onPress={() => router.push({ pathname: '/med-form', params: { id: m.id } })}>
              <Card style={{ opacity: 0.75 }}>
                <Text style={type.h3}>{m.name}</Text>
                <Text style={type.small}>
                  {m.dose} · finished {endDate(m) ? formatDate(endDate(m)!) : ''}
                  {m.reason ? ` · for ${m.reason}` : ''}
                </Text>
              </Card>
            </Pressable>
          ))}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  dose: { flexDirection: 'row', alignItems: 'center', padding: space(4), gap: 12 },
  border: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  bars: { flexDirection: 'row', gap: 6, alignItems: 'flex-end' },
  barTrack: { width: 12, height: 56, borderRadius: 6, backgroundColor: colors.bg, justifyContent: 'flex-end', overflow: 'hidden' },
  barFill: { width: '100%', borderRadius: 6 },
  pillIcon: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
});
