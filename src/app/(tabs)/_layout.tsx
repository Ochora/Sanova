import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import React from 'react';
import type { ColorValue } from 'react-native';
import { useStore } from '../../lib/store';
import { colors } from '../../ui/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const tab = (title: string, icon: IconName, iconActive: IconName) => ({
  title,
  tabBarIcon: ({ focused, color }: { focused: boolean; color: ColorValue }) => (
    <Ionicons name={focused ? iconActive : icon} size={24} color={color} />
  ),
});

export default function TabsLayout() {
  const { data } = useStore();
  if (!data.onboarded) return <Redirect href="/onboarding" />;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.faint,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        headerStyle: { backgroundColor: colors.bg },
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: '800', fontSize: 22 },
      }}
    >
      <Tabs.Screen name="index" options={{ ...tab('Home', 'home-outline', 'home'), headerShown: false }} />
      <Tabs.Screen name="meds" options={tab('Medicines', 'medkit-outline', 'medkit')} />
      <Tabs.Screen name="checkin" options={tab('Check-in', 'chatbubble-ellipses-outline', 'chatbubble-ellipses')} />
      <Tabs.Screen name="records" options={tab('Records', 'folder-open-outline', 'folder-open')} />
      <Tabs.Screen name="more" options={tab('More', 'grid-outline', 'grid')} />
    </Tabs>
  );
}
