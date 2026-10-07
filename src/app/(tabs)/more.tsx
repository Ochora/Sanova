import { router } from 'expo-router';
import React from 'react';
import { Text, View } from 'react-native';
import { useStore } from '../../lib/store';
import { Card, Divider, Row, Screen, SectionTitle, type IconName } from '../../ui/components';
import { colors, space, type } from '../../ui/theme';

export default function More() {
  const { data } = useStore();
  const groups: { title: string; items: { icon: IconName; color?: string; title: string; subtitle: string; href: string }[] }[] = [
    {
      title: 'Emergency',
      items: [
        { icon: 'alert-circle', color: colors.danger, title: 'SOS', subtitle: 'Share location and call for help', href: '/emergency' },
        { icon: 'bandage', color: colors.danger, title: 'First aid guides', subtitle: 'Works offline', href: '/first-aid' },
        { icon: 'location', title: 'Nearby facilities', subtitle: 'Hospitals, clinics, pharmacies', href: '/facilities' },
        { icon: 'qr-code', color: '#6B4EAD', title: 'Emergency health card', subtitle: 'QR code for health workers', href: '/emergency-card' },
      ],
    },
    {
      title: 'Family & money',
      items: [
        { icon: 'flame', color: colors.accent, title: 'Streaks & badges', subtitle: 'Your check-in streak and rewards', href: '/achievements' },
        { icon: 'people', title: 'Family', subtitle: `${data.members.length} ${data.members.length === 1 ? 'person' : 'people'}`, href: '/family' },
        { icon: 'wallet', color: colors.warning, title: 'Health costs', subtitle: 'Track what you spend on care', href: '/expenses' },
      ],
    },
    {
      title: 'Account',
      items: [
        { icon: 'person-circle', title: 'Profile & emergency contacts', subtitle: `${data.contacts.length} contact${data.contacts.length === 1 ? '' : 's'}`, href: '/profile' },
        { icon: 'settings', color: colors.muted, title: 'Settings', subtitle: 'App lock, reminders, your data', href: '/settings' },
      ],
    },
  ];

  return (
    <Screen>
      {groups.map((g) => (
        <View key={g.title}>
          <SectionTitle>{g.title}</SectionTitle>
          <Card style={{ padding: 0 }}>
            {g.items.map((it, i) => (
              <View key={it.title}>
                {i > 0 && <Divider />}
                <Row icon={it.icon} iconColor={it.color} title={it.title} subtitle={it.subtitle} onPress={() => router.push(it.href as never)} />
              </View>
            ))}
          </Card>
        </View>
      ))}
      <Text style={[type.small, { textAlign: 'center', marginTop: space(4) }]}>Sanova 0.2 · Made for Uganda</Text>
    </Screen>
  );
}
