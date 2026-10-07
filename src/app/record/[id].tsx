import { router, Stack, useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React from 'react';
import { Alert, Image, Text, View } from 'react-native';
import { formatDate } from '../../lib/dates';
import { deleteImage } from '../../lib/files';
import { RECORD_CAT } from '../../lib/records';
import { useStore } from '../../lib/store';
import { Button, Card, Empty, Pill, Screen } from '../../ui/components';
import { colors, radius, space, type } from '../../ui/theme';

export default function RecordView() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, removeRecord } = useStore();
  const r = data.records.find((x) => x.id === id);
  if (!r) return <Empty icon="document" title="Record not found" />;
  const c = RECORD_CAT[r.category];
  const owner = data.members.find((m) => m.id === r.memberId);

  const share = async () => {
    if (r.imageUri && (await Sharing.isAvailableAsync())) {
      await Sharing.shareAsync(r.imageUri, { dialogTitle: r.title });
    }
  };

  const remove = () =>
    Alert.alert('Delete record?', r.title, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteImage(r.imageUri);
          removeRecord(r.id);
          router.back();
        },
      },
    ]);

  return (
    <Screen>
      <Stack.Screen options={{ title: c.label }} />
      {r.imageUri ? (
        <Image source={{ uri: r.imageUri }} style={{ width: '100%', aspectRatio: 3 / 4, borderRadius: radius.lg, backgroundColor: colors.border, marginBottom: space(4) }} resizeMode="contain" />
      ) : null}
      <Card>
        <Pill label={c.label} color={c.color} bg={c.color + '1A'} />
        <Text style={[type.h2, { marginTop: space(2) }]}>{r.title}</Text>
        <Text style={type.small}>
          {formatDate(r.date)}
          {owner ? ` · ${owner.name}` : ''}
        </Text>
        {r.notes ? <Text style={[type.body, { marginTop: space(3) }]}>{r.notes}</Text> : null}
      </Card>
      <View style={{ gap: space(2) }}>
        {r.imageUri ? <Button title="Share with a health worker" icon="share-social" onPress={share} /> : null}
        <Button title="Delete" variant="ghost" icon="trash" onPress={remove} />
      </View>
    </Screen>
  );
}
