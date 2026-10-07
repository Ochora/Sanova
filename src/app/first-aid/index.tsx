import { router } from 'expo-router';
import React from 'react';
import { Text, View } from 'react-native';
import { GUIDES } from '../../data/firstAid';
import { Card, Divider, Notice, Row, Screen, SectionTitle } from '../../ui/components';
import { colors, type } from '../../ui/theme';

export default function FirstAidList() {
  const urgent = GUIDES.filter((g) => g.urgent);
  const other = GUIDES.filter((g) => !g.urgent);
  const list = (items: typeof GUIDES) => (
    <Card style={{ padding: 0 }}>
      {items.map((g, i) => (
        <View key={g.id}>
          {i > 0 && <Divider />}
          <Row
            icon={g.icon as 'heart'}
            iconColor={g.urgent ? colors.danger : colors.primary}
            title={g.title}
            subtitle={g.summary}
            onPress={() => router.push({ pathname: '/first-aid/[id]', params: { id: g.id } })}
          />
        </View>
      ))}
    </Card>
  );
  return (
    <Screen>
      <Notice tone="info" icon="cloud-offline">
        These guides are stored on your phone and work without internet.
      </Notice>
      <Text style={[type.small, { marginBottom: 4 }]}>In a life-threatening emergency, call 999 or 112 first.</Text>
      <SectionTitle>Emergencies</SectionTitle>
      {list(urgent)}
      <SectionTitle>Everyday first aid</SectionTitle>
      {list(other)}
    </Screen>
  );
}
