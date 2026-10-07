import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Text, View } from 'react-native';
import { SEED_FACILITIES } from '../data/facilities';
import { call, getLocation, type Fix } from '../lib/emergency';
import { directionsLink, distanceKm, estimateTravelMinutes, formatDistance, formatMinutes, searchNearbyLink } from '../lib/geo';
import { useStore } from '../lib/store';
import { Button, Card, Chip, ChipRow, Field, Notice, Pill, Screen, SectionTitle } from '../ui/components';
import { colors, space, type } from '../ui/theme';

const SEARCHES = ['Health centre', 'Pharmacy', 'Hospital', 'Maternity', 'Dental clinic', 'Laboratory'];

export default function Facilities() {
  const { data, saveFacility, removeFacility } = useStore();
  const [fix, setFix] = useState<Fix | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [kind, setKind] = useState('Clinic');

  useEffect(() => {
    getLocation().then((f) => {
      setFix(f);
      setLoading(false);
    });
  }, []);

  const list = useMemo(() => {
    const all = [...data.facilities, ...SEED_FACILITIES];
    const filtered = q.trim()
      ? all.filter((f) => `${f.name} ${f.district} ${f.type}`.toLowerCase().includes(q.trim().toLowerCase()))
      : all;
    return filtered
      .map((f) => ({ f, km: fix ? distanceKm(fix, f) : undefined }))
      .sort((a, b) => (a.km ?? 0) - (b.km ?? 0) || a.f.name.localeCompare(b.f.name));
  }, [data.facilities, fix, q]);

  const addHere = () => {
    if (!name.trim()) return Alert.alert('Name needed', 'Enter the facility name.');
    if (!fix) return Alert.alert('Location needed', 'Turn on GPS so we can save where this facility is. Stand at the facility when adding it.');
    saveFacility({ name: name.trim(), phone: phone.trim() || undefined, type: kind, district: data.profile.district ?? '', lat: fix.lat, lng: fix.lng });
    setName('');
    setPhone('');
    setAdding(false);
  };

  return (
    <Screen>
      <Field label="Search" value={q} onChangeText={setQ} placeholder="Name or district" />

      <Text style={[type.label, { marginBottom: space(2) }]}>Search on Google Maps near me</Text>
      <ChipRow>
        {SEARCHES.map((s) => (
          <Chip key={s} label={s} icon="search" onPress={() => Linking.openURL(searchNearbyLink(s, fix ?? undefined))} />
        ))}
      </ChipRow>

      <SectionTitle action={<Button small variant="ghost" icon={adding ? 'close' : 'add'} title={adding ? 'Cancel' : 'Add one'} onPress={() => setAdding((a) => !a)} />}>
        {loading ? 'Finding your location…' : fix ? 'Sorted by distance' : 'Facilities'}
      </SectionTitle>

      {adding && (
        <Card>
          <Text style={[type.small, { marginBottom: space(3) }]}>Add a clinic, health centre or pharmacy you use. Stand at the facility — we save your current location.</Text>
          <Field label="Name" value={name} onChangeText={setName} placeholder="e.g. Kisugu Health Centre III" />
          <Field label="Phone (optional)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          <ChipRow>
            {['Clinic', 'Health centre', 'Hospital', 'Pharmacy'].map((k) => (
              <Chip key={k} label={k} selected={kind === k} onPress={() => setKind(k)} />
            ))}
          </ChipRow>
          <Button title="Save at my location" icon="pin" onPress={addHere} style={{ marginTop: space(4) }} />
        </Card>
      )}

      {!loading && !fix && <Notice tone="warn">Location is off, so facilities are not sorted by distance.</Notice>}
      {loading && <ActivityIndicator color={colors.primary} style={{ marginVertical: space(4) }} />}

      {list.map(({ f, km }) => (
        <Card key={f.id}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Text style={type.h3}>{f.name}</Text>
              <Text style={type.small}>
                {f.type}
                {f.district ? ` · ${f.district}` : ''}
              </Text>
            </View>
            {f.custom ? <Pill label="Mine" color={colors.primary} bg={colors.primarySoft} /> : f.open24h ? <Pill label="24 h" color={colors.success} bg={colors.successSoft} /> : null}
          </View>
          {km !== undefined && (
            <Text style={[type.body, { marginTop: 6, fontWeight: '600' }]}>
              {formatDistance(km)} · {formatMinutes(estimateTravelMinutes(km))}
            </Text>
          )}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: space(3) }}>
            <Button small icon="navigate" title="Directions" onPress={() => Linking.openURL(directionsLink(f))} />
            {f.phone ? <Button small variant="secondary" icon="call" title="Call" onPress={() => call(f.phone!)} /> : null}
            {f.custom ? (
              <Button
                small
                variant="ghost"
                icon="trash"
                title="Remove"
                onPress={() =>
                  Alert.alert('Remove facility?', f.name, [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Remove', style: 'destructive', onPress: () => removeFacility(f.id) },
                  ])
                }
              />
            ) : null}
          </View>
        </Card>
      ))}

      <Text style={[type.small, { marginTop: space(2) }]}>
        Hospital locations are approximate in this test version. Travel times are rough estimates. Always call ahead if you can.
      </Text>
    </Screen>
  );
}
