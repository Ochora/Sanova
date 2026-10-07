import React, { useMemo, useState } from 'react';
import { Share, Switch, Text, View } from 'react-native';
import { isActiveOn } from '../lib/adherence';
import { ageInYears, formatDate, toDateKey } from '../lib/dates';
import { useStore } from '../lib/store';
import type { Settings } from '../lib/types';
import { Button, Card, Divider, Notice, Row, Screen, SectionTitle } from '../ui/components';
import { MemberPicker } from '../ui/MemberPicker';
import { QRCode } from '../ui/QRCode';
import { colors, space, type } from '../ui/theme';

type FieldKey = keyof Settings['cardFields'];
const FIELD_LABELS: Record<FieldKey, string> = {
  dob: 'Date of birth',
  bloodGroup: 'Blood group',
  allergies: 'Allergies',
  conditions: 'Conditions',
  medications: 'Current medicines',
  contacts: 'Emergency contacts',
};

export default function EmergencyCard() {
  const { data, self, setSettings } = useStore();
  const [memberId, setMemberId] = useState<string | undefined>(self?.id);
  const m = data.members.find((x) => x.id === memberId);
  const f = data.settings.cardFields;
  const today = toDateKey();

  const meds = data.medications.filter((x) => x.memberId === memberId && isActiveOn(x, today));

  const text = useMemo(() => {
    if (!m) return '';
    const lines = [`SANOVA EMERGENCY HEALTH CARD`, `Name: ${m.name}`];
    if (f.dob && m.dob) lines.push(`DOB: ${m.dob} (${ageInYears(m.dob)} yrs)`);
    if (m.sex) lines.push(`Sex: ${m.sex}`);
    if (f.bloodGroup && m.bloodGroup) lines.push(`Blood group: ${m.bloodGroup}`);
    if (m.pregnant) lines.push('PREGNANT');
    if (f.allergies) lines.push(`ALLERGIES: ${m.allergies.length ? m.allergies.join(', ') : 'None known'}`);
    if (f.conditions && m.conditions.length) lines.push(`Conditions: ${m.conditions.join(', ')}`);
    if (f.medications && meds.length) lines.push(`Medicines: ${meds.map((x) => `${x.name} ${x.dose}`).join('; ')}`);
    if (f.contacts && data.contacts.length) lines.push(`Emergency contact: ${data.contacts.map((c) => `${c.name} ${c.phone}`).join('; ')}`);
    lines.push(`Updated: ${today}`);
    return lines.join('\n');
  }, [m, f, meds, data.contacts, today]);

  if (!m) return null;

  return (
    <Screen>
      <MemberPicker value={memberId} onChange={(v) => v && setMemberId(v)} />
      <Card style={{ alignItems: 'center', paddingVertical: space(6) }}>
        <Text style={[type.label, { color: colors.danger }]}>Emergency health card</Text>
        <Text style={[type.h2, { marginTop: 4, marginBottom: space(4) }]}>{m.name}</Text>
        <QRCode value={text} size={230} />
        <Text style={[type.small, { textAlign: 'center', marginTop: space(4) }]}>
          Any phone camera can read this code — no app or internet needed.
        </Text>
      </Card>

      <Card style={{ padding: 0 }}>
        {f.bloodGroup && m.bloodGroup ? <Row icon="water" iconColor={colors.danger} title={m.bloodGroup} subtitle="Blood group" /> : null}
        {f.allergies ? (
          <>
            <Divider />
            <Row icon="warning" iconColor={colors.warning} title={m.allergies.length ? m.allergies.join(', ') : 'None known'} subtitle="Allergies" />
          </>
        ) : null}
        {f.conditions && m.conditions.length ? (
          <>
            <Divider />
            <Row icon="pulse" title={m.conditions.join(', ')} subtitle="Conditions" />
          </>
        ) : null}
        {f.medications && meds.length ? (
          <>
            <Divider />
            <Row icon="medkit" title={meds.map((x) => x.name).join(', ')} subtitle="Current medicines" />
          </>
        ) : null}
        {f.dob && m.dob ? (
          <>
            <Divider />
            <Row icon="calendar" title={formatDate(m.dob)} subtitle="Date of birth" />
          </>
        ) : null}
      </Card>

      <Button title="Share as text" icon="share-social" variant="secondary" onPress={() => Share.share({ message: text })} />

      <SectionTitle>What to include</SectionTitle>
      <Card style={{ padding: 0 }}>
        {(Object.keys(FIELD_LABELS) as FieldKey[]).map((k, i) => (
          <View key={k}>
            {i > 0 && <Divider />}
            <Row
              title={FIELD_LABELS[k]}
              right={<Switch value={f[k]} onValueChange={(v) => setSettings({ cardFields: { ...f, [k]: v } })} trackColor={{ true: colors.primary, false: colors.border }} />}
            />
          </View>
        ))}
      </Card>
      <Notice tone="info" icon="lock-closed">
        Anyone who scans this code can read what it contains. Only show it to health workers you trust.
      </Notice>
    </Screen>
  );
}
