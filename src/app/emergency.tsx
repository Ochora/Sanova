import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, Text, View } from 'react-native';
import { EMERGENCY_NUMBERS } from '../data/emergency';
import { SEED_FACILITIES } from '../data/facilities';
import { GUIDES } from '../data/firstAid';
import { call, getLocation, sendSos, sosMessage, whatsapp, type Fix } from '../lib/emergency';
import { directionsLink, distanceKm, estimateTravelMinutes, formatDistance, formatMinutes, mapsLink, searchNearbyLink } from '../lib/geo';
import { supportLine } from '../lib/inclusion';
import { useStore } from '../lib/store';
import { Button, Card, Chip, ChipRow, Notice, Row, Screen, SectionTitle, Divider } from '../ui/components';
import { colors, space, type } from '../ui/theme';

export default function Emergency() {
  const { data, self } = useStore();
  const [fix, setFix] = useState<Fix | null>(null);
  const [locating, setLocating] = useState(true);
  const [smsState, setSmsState] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const f = await getLocation();
      if (!alive) return;
      setFix(f);
      setLocating(false);
      if (data.contacts.length) {
        const r = await sendSos(data.contacts, sosMessage(self?.name ?? '', f, supportLine(self)));
        if (alive) setSmsState(r);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const nearest = useMemo(() => {
    if (!fix) return [];
    return [...SEED_FACILITIES, ...data.facilities]
      .map((f) => ({ f, km: distanceKm(fix, f) }))
      .sort((a, b) => a.km - b.km)
      .slice(0, 3);
  }, [fix, data.facilities]);

  const message = sosMessage(self?.name ?? '', fix, supportLine(self));
  const urgentGuides = GUIDES.filter((g) => g.urgent).slice(0, 6);

  return (
    <Screen>
      <Text style={[type.label, { marginBottom: space(2) }]}>Call for help</Text>
      {EMERGENCY_NUMBERS.map((n) => (
        <Button key={n.number} title={`Call ${n.number} — ${n.label}`} icon="call" variant="danger" onPress={() => call(n.number)} style={{ marginBottom: space(2) }} />
      ))}

      <Pressable onPress={() => router.push('/support')} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.mindSoft, borderRadius: 14, padding: space(3), marginTop: space(1) }}>
        <Text style={{ fontSize: 22 }}>💜</Text>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.mind, fontWeight: '800', fontSize: 15 }}>Not a physical emergency?</Text>
          <Text style={type.small}>If you're not okay emotionally — talk to a counsellor, a friend, or Sanova.</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.mind} />
      </Pressable>

      <SectionTitle>Your location</SectionTitle>
      <Card>
        {locating ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <ActivityIndicator color={colors.danger} />
            <Text style={type.body}>Getting your GPS location…</Text>
          </View>
        ) : fix ? (
          <>
            <Text style={type.h3}>
              {fix.lat.toFixed(5)}, {fix.lng.toFixed(5)}
            </Text>
            <Text style={type.small}>
              {fix.accuracy ? `Accurate to about ${Math.round(fix.accuracy)} m` : 'Accuracy unknown'}
              {fix.approximate ? ' · last known position' : ''}
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: space(3) }}>
              <Button small variant="secondary" icon="map" title="Open map" onPress={() => Linking.openURL(mapsLink(fix))} />
            </View>
          </>
        ) : (
          <Text style={type.body}>Location unavailable. Turn on location (GPS) and allow Sanova to use it, or describe where you are when you call.</Text>
        )}
      </Card>

      <SectionTitle>Alert your contacts</SectionTitle>
      {data.contacts.length === 0 ? (
        <Notice tone="warn">
          You have no emergency contacts yet. Add one in Profile so SOS can alert them next time.
        </Notice>
      ) : (
        <>
          {smsState === 'sent' && <Notice tone="success">SOS message sent to your contacts.</Notice>}
          {smsState === 'cancelled' && <Notice tone="warn">The SOS SMS was not sent. Tap "Send SMS again" below.</Notice>}
          <Card style={{ padding: 0 }}>
            {data.contacts.map((c, i) => (
              <View key={c.id}>
                {i > 0 && <Divider />}
                <Row
                  icon="person"
                  title={c.name}
                  subtitle={`${c.phone}${c.relationship ? ` · ${c.relationship}` : ''}`}
                  right={
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      <Button small variant="secondary" icon="logo-whatsapp" title="" onPress={() => whatsapp(c.phone, message)} />
                      <Button small icon="call" title="Call" onPress={() => call(c.phone)} />
                    </View>
                  }
                />
              </View>
            ))}
          </Card>
          <Button
            variant="secondary"
            icon="chatbubbles"
            title="Send SMS again"
            onPress={async () => setSmsState(await sendSos(data.contacts, message))}
          />
        </>
      )}

      <SectionTitle>Nearest hospitals</SectionTitle>
      {nearest.length ? (
        <Card style={{ padding: 0 }}>
          {nearest.map(({ f, km }, i) => (
            <View key={f.id}>
              {i > 0 && <Divider />}
              <Row
                icon="medical"
                iconColor={colors.danger}
                title={f.name}
                subtitle={`${formatDistance(km)} · ${formatMinutes(estimateTravelMinutes(km))}${f.open24h ? ' · 24 hours' : ''}`}
                right={
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    {f.phone ? <Button small variant="secondary" icon="call" title="" onPress={() => call(f.phone!)} /> : null}
                    <Button small icon="navigate" title="Go" onPress={() => Linking.openURL(directionsLink(f))} />
                  </View>
                }
              />
            </View>
          ))}
        </Card>
      ) : null}
      <Button
        variant="secondary"
        icon="search"
        title="Find any clinic near me (Google Maps)"
        onPress={() => Linking.openURL(searchNearbyLink('hospital OR health centre', fix ?? undefined))}
      />

      <SectionTitle>First aid while you wait</SectionTitle>
      <ChipRow>
        {urgentGuides.map((g) => (
          <Chip key={g.id} label={g.title} icon={g.icon as 'heart'} onPress={() => router.push({ pathname: '/first-aid/[id]', params: { id: g.id } })} />
        ))}
      </ChipRow>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: space(6) }}>
        <Ionicons name="information-circle-outline" size={16} color={colors.faint} />
        <Text style={[type.small, { flex: 1 }]}>Stay calm, stay on the line with the call taker, and keep your phone with you.</Text>
      </View>
    </Screen>
  );
}
