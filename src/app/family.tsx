import { router } from 'expo-router';
import React from 'react';
import { Share, Text, View } from 'react-native';
import { adherence, dosesForDay } from '../lib/adherence';
import { ageInYears, toDateKey } from '../lib/dates';
import { initials } from '../lib/id';
import { useStore } from '../lib/store';
import { pickAndConfirmBundle } from '../ui/importFlow';
import { LEVEL_META } from '../lib/triage';
import { Button, Card, Notice, Pill, Screen, SectionTitle } from '../ui/components';
import { colors, space, type } from '../ui/theme';

export default function Family() {
  const { data, importProfile } = useStore();
  const today = toDateKey();
  const now = new Date();

  return (
    <Screen>
      <Notice tone="info" icon="people">
        Manage medicines, check-ins and records for children or parents you care for — all from this phone.
      </Notice>

      {data.members.map((m) => {
        const meds = data.medications.filter((x) => x.memberId === m.id);
        const week = adherence(meds, data.doseLogs, 7, now);
        const todayDoses = dosesForDay(meds, data.doseLogs, today, now);
        const missed = todayDoses.filter((d) => d.state === 'missed').length;
        const takenToday = todayDoses.filter((d) => d.state === 'taken').length;
        const lastCheck = [...data.checkIns].reverse().find((c) => c.memberId === m.id);
        const age = m.dob ? ageInYears(m.dob) : undefined;

        const share = () =>
          Share.share({
            message: [
              `Sanova update for ${m.name}`,
              todayDoses.length ? `Today: ${takenToday}/${todayDoses.length} doses taken${missed ? `, ${missed} missed` : ''}.` : 'No doses scheduled today.',
              week.rate !== null ? `7-day adherence: ${Math.round(week.rate * 100)}%.` : '',
              lastCheck ? `Last check-in (${lastCheck.date}): ${LEVEL_META[lastCheck.level].label}.` : '',
            ]
              .filter(Boolean)
              .join('\n'),
          });

        return (
          <Card key={m.id} onPress={() => router.push({ pathname: '/member/[id]', params: { id: m.id } })}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 16 }}>{initials(m.name)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={type.h3}>
                  {m.name}
                  {m.relationship === 'self' ? ' (me)' : ''}
                </Text>
                <Text style={type.small}>
                  {m.relationship !== 'self' ? m.relationship : 'You'}
                  {age !== undefined ? ` · ${age} yrs` : ''}
                  {meds.length ? ` · ${meds.length} medicine${meds.length > 1 ? 's' : ''}` : ''}
                </Text>
              </View>
              {lastCheck && <Pill label={LEVEL_META[lastCheck.level].label} color={LEVEL_META[lastCheck.level].color} bg={LEVEL_META[lastCheck.level].bg} />}
            </View>
            {todayDoses.length > 0 && (
              <View style={{ marginTop: space(3), flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={[type.body, missed ? { color: colors.danger, fontWeight: '600' } : undefined]}>
                  {missed ? `⚠ ${missed} missed today · ` : ''}
                  {takenToday}/{todayDoses.length} taken today
                  {week.rate !== null ? ` · ${Math.round(week.rate * 100)}% this week` : ''}
                </Text>
              </View>
            )}
            {m.relationship !== 'self' && (
              <View style={{ flexDirection: 'row', gap: 4, marginTop: 4 }}>
                <Button small variant="ghost" icon="share-social" title="Share update" onPress={share} style={{ paddingHorizontal: 0, marginRight: 12 }} />
                <Button small variant="ghost" icon="swap-horizontal" title="Transfer profile" onPress={() => router.push({ pathname: '/share', params: { memberId: m.id } })} style={{ paddingHorizontal: 0 }} />
              </View>
            )}
          </Card>
        );
      })}

      <Button title="Add family member" icon="person-add" onPress={() => router.push('/member-form')} />
      <Button
        title="Add from a Sanova file"
        variant="secondary"
        icon="document-attach"
        onPress={async () => {
          const bundle = await pickAndConfirmBundle('family');
          if (bundle) importProfile(bundle, false, bundle.member.relationship === 'self' ? 'Other' : bundle.member.relationship);
        }}
        style={{ marginTop: space(2) }}
      />

      <SectionTitle>Coming next</SectionTitle>
      <Text style={type.small}>
        Linking two phones (so a caregiver gets an alert on their own phone when a dose is missed) needs the Sanova cloud service, planned for the next release. For now, use "Share update" to send a summary by WhatsApp or SMS, and "Transfer profile" to give a child their own records when they get their own phone.
      </Text>
    </Screen>
  );
}
