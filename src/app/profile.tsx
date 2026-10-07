import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { ageInYears } from '../lib/dates';
import { call } from '../lib/emergency';
import { useStore } from '../lib/store';
import { Button, Card, Divider, Field, Row, Screen, SectionTitle } from '../ui/components';
import { colors, space, type } from '../ui/theme';

export default function Profile() {
  const { data, self, saveContact, removeContact, update } = useStore();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [rel, setRel] = useState('');
  const [district, setDistrict] = useState(data.profile.district ?? '');

  const add = () => {
    if (!name.trim() || phone.replace(/\D/g, '').length < 9) return Alert.alert('Contact', 'Enter a name and a full phone number.');
    saveContact({ name: name.trim(), phone: phone.trim(), relationship: rel.trim() || undefined });
    setName('');
    setPhone('');
    setRel('');
  };

  return (
    <Screen>
      {self && (
        <Card onPress={() => router.push({ pathname: '/member-form', params: { id: self.id } })}>
          <Text style={type.h2}>{self.name}</Text>
          <Text style={type.small}>
            {[self.dob ? `${ageInYears(self.dob)} yrs` : null, self.sex, self.bloodGroup, data.profile.district].filter(Boolean).join(' · ') || 'Tap to complete your health profile'}
          </Text>
          <Text style={[type.small, { marginTop: 6 }]}>
            Allergies: {self.allergies.length ? self.allergies.join(', ') : 'none recorded'} · Conditions: {self.conditions.length ? self.conditions.join(', ') : 'none recorded'}
          </Text>
          <Text style={{ color: colors.primary, fontWeight: '700', marginTop: space(3) }}>Edit health profile →</Text>
        </Card>
      )}

      <Field
        label="District"
        value={district}
        onChangeText={setDistrict}
        onBlur={() => update((d) => ({ ...d, profile: { ...d.profile, district: district.trim() || undefined } }))}
        placeholder="e.g. Kampala"
      />

      <SectionTitle>Emergency contacts</SectionTitle>
      <Text style={[type.small, { marginBottom: space(3) }]}>These people receive your SOS SMS with your location.</Text>
      {data.contacts.length > 0 && (
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
                    <Button small variant="secondary" icon="call" title="" onPress={() => call(c.phone)} />
                    <Button
                      small
                      variant="ghost"
                      icon="trash"
                      title=""
                      onPress={() =>
                        Alert.alert('Remove contact?', c.name, [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Remove', style: 'destructive', onPress: () => removeContact(c.id) },
                        ])
                      }
                    />
                  </View>
                }
              />
            </View>
          ))}
        </Card>
      )}
      <Card>
        <Text style={[type.h3, { marginBottom: space(3) }]}>Add a contact</Text>
        <Field label="Name" value={name} onChangeText={setName} autoCapitalize="words" />
        <Field label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="07XX XXX XXX" />
        <Field label="Relationship" value={rel} onChangeText={setRel} placeholder="e.g. Sister" />
        <Button title="Add contact" icon="person-add" onPress={add} />
      </Card>
    </Screen>
  );
}
