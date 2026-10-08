import { useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React, { useMemo, useState } from 'react';
import { Alert, Share, Switch, Text, View } from 'react-native';
import { whatsapp } from '../lib/emergency';
import { writeBundleFile } from '../lib/files';
import { buildBundle, healthSummary, type SummaryOptions } from '../lib/portable';
import { useStore } from '../lib/store';
import * as SMS from 'expo-sms';
import { Button, Card, Divider, Field, Notice, Row, Screen, SectionTitle } from '../ui/components';
import { MemberPicker } from '../ui/MemberPicker';
import { colors, space, type } from '../ui/theme';

export default function ShareScreen() {
  const params = useLocalSearchParams<{ memberId?: string }>();
  const { data, self } = useStore();
  const [memberId, setMemberId] = useState<string | undefined>(params.memberId ?? self?.id);
  const [opts, setOpts] = useState<SummaryOptions>({ medicines: true, conditions: true, recentCheckIns: true, adherence: true, visits: true });
  const [guardianPhone, setGuardianPhone] = useState('');
  const [includeMood, setIncludeMood] = useState(true);
  const [busy, setBusy] = useState(false);

  const member = data.members.find((m) => m.id === memberId);
  const isSelf = member?.relationship === 'self';
  const text = useMemo(() => (memberId ? healthSummary(data, memberId, opts) : ''), [data, memberId, opts]);

  const toggle = (k: keyof SummaryOptions, label: string, i: number) => (
    <View key={k}>
      {i > 0 && <Divider />}
      <Row title={label} right={<Switch value={!!opts[k]} onValueChange={(v) => setOpts({ ...opts, [k]: v })} trackColor={{ true: colors.primary, false: colors.border }} />} />
    </View>
  );

  const sendSms = async (phone: string) => {
    if (await SMS.isAvailableAsync().catch(() => false)) await SMS.sendSMSAsync([phone], text);
  };

  const exportFile = async () => {
    if (!memberId || !member) return;
    setBusy(true);
    try {
      const bundle = buildBundle(data, memberId, {
        includeMood,
        guardian: !isSelf && guardianPhone.trim() && self ? { name: self.name, phone: guardianPhone.trim() } : undefined,
      });
      const uris = Object.fromEntries(data.records.filter((r) => r.memberId === memberId).map((r) => [r.id, r.imageUri]));
      const uri = await writeBundleFile(bundle, uris);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/json', dialogTitle: `${member.name}'s Sanova profile` });
      } else {
        Alert.alert('Saved', 'Sharing is not available on this device.');
      }
    } catch (e) {
      Alert.alert('Could not create the file', String(e));
    } finally {
      setBusy(false);
    }
  };

  if (!member) return null;

  return (
    <Screen>
      <MemberPicker value={memberId} onChange={(v) => v && setMemberId(v)} />

      <SectionTitle>1 · Share a health summary</SectionTitle>
      <Text style={[type.small, { marginBottom: space(3) }]}>
        For a doctor, pharmacist, caregiver or family member. Mental-health check-ins are never included.
      </Text>
      <Card style={{ padding: 0 }}>
        {toggle('conditions', 'Allergies & conditions', 0)}
        {toggle('medicines', 'Current medicines', 1)}
        {toggle('adherence', 'How well doses are being taken', 2)}
        {toggle('recentCheckIns', 'Recent check-ins', 3)}
        {toggle('visits', 'Hospital visits & diagnoses', 4)}
      </Card>
      <Card style={{ backgroundColor: colors.bg }}>
        <Text style={[type.small, { color: colors.text, fontFamily: undefined }]}>{text}</Text>
      </Card>
      <Button title="Share via WhatsApp, SMS, email…" icon="share-social" onPress={() => Share.share({ message: text })} />
      {data.contacts.length > 0 && (
        <>
          <Text style={[type.label, { marginTop: space(4), marginBottom: space(2) }]}>Or send straight to an emergency contact</Text>
          <Card style={{ padding: 0 }}>
            {data.contacts.map((c, i) => (
              <View key={c.id}>
                {i > 0 && <Divider />}
                <Row
                  icon="person"
                  title={c.name}
                  subtitle={c.relationship ?? c.phone}
                  right={
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      <Button small variant="secondary" icon="logo-whatsapp" title="" onPress={() => whatsapp(c.phone, text)} />
                      <Button small icon="chatbubble" title="SMS" onPress={() => sendSms(c.phone)} />
                    </View>
                  }
                />
              </View>
            ))}
          </Card>
        </>
      )}

      <SectionTitle>2 · Transfer the full profile</SectionTitle>
      <Notice tone="info" icon="swap-horizontal">
        {isSelf
          ? 'Moving to a new phone? Export your full profile — medicines, history, records and photos — and open it in Sanova on the new phone.'
          : `${member.name}'s information is kept separate from yours. When ${member.name.split(' ')[0]} gets their own phone, send this file and they choose "I have a Sanova file" when they sign up — everything moves to their own app.`}
      </Notice>
      {!isSelf && (
        <Field
          label="Your phone number (optional)"
          value={guardianPhone}
          onChangeText={setGuardianPhone}
          keyboardType="phone-pad"
          placeholder="07XX XXX XXX"
          hint={`Adds you as ${member.name.split(' ')[0]}'s emergency contact on their phone.`}
        />
      )}
      <Card style={{ padding: 0 }}>
        <Row
          title="Include mood & mind check-ins"
          subtitle="Private — only include if they're comfortable"
          right={<Switch value={includeMood} onValueChange={setIncludeMood} trackColor={{ true: colors.primary, false: colors.border }} />}
        />
      </Card>
      <Button title={`Export ${isSelf ? 'my' : `${member.name.split(' ')[0]}'s`} Sanova file`} icon="download" onPress={exportFile} loading={busy} />
      <Text style={[type.small, { marginTop: space(3) }]}>
        The file contains private health information. Only send it to the person it belongs to, or someone they trust.
      </Text>
    </Screen>
  );
}
