import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Image, Text, View } from 'react-native';
import { isValidDateKey, toDateKey } from '../lib/dates';
import { persistImage } from '../lib/files';
import { uid } from '../lib/id';
import { RECORD_CATEGORIES } from '../lib/records';
import { useStore } from '../lib/store';
import type { RecordCategory } from '../lib/types';
import { Button, Chip, ChipRow, Field, Screen } from '../ui/components';
import { MemberPicker } from '../ui/MemberPicker';
import { colors, radius, space, type } from '../ui/theme';

export default function RecordForm() {
  const { self, saveRecord } = useStore();
  const params = useLocalSearchParams<{ visitId?: string; memberId?: string }>();
  const [memberId, setMemberId] = useState<string | undefined>(params.memberId ?? self?.id);
  const [imageUri, setImageUri] = useState<string | undefined>();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<RecordCategory>('lab');
  const [date, setDate] = useState(toDateKey());
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  const pick = async (fromCamera: boolean) => {
    try {
      const perm = fromCamera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return Alert.alert('Permission needed', `Allow Sanova to use your ${fromCamera ? 'camera' : 'photos'} in phone settings.`);
      const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.7, allowsEditing: false };
      const res = fromCamera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
      if (!res.canceled && res.assets[0]) setImageUri(res.assets[0].uri);
    } catch (e) {
      Alert.alert('Could not open', String(e));
    }
  };

  const save = () => {
    if (!title.trim()) return Alert.alert('Title needed', 'e.g. "Malaria test", "Full blood count".');
    if (!isValidDateKey(date)) return Alert.alert('Date', 'Use the format YYYY-MM-DD.');
    if (!memberId) return;
    setBusy(true);
    try {
      const id = uid('r_');
      const stored = imageUri ? persistImage(imageUri, id) : undefined;
      saveRecord({ id, memberId, title: title.trim(), category, date, notes: notes.trim() || undefined, imageUri: stored, visitId: params.visitId });
      router.back();
    } catch (e) {
      Alert.alert('Could not save the photo', String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <MemberPicker value={memberId} onChange={(v) => v && setMemberId(v)} />
      {imageUri ? (
        <View style={{ marginBottom: space(4) }}>
          <Image source={{ uri: imageUri }} style={{ width: '100%', height: 260, borderRadius: radius.lg, backgroundColor: colors.border }} resizeMode="cover" />
          <Button small variant="ghost" icon="refresh" title="Retake / choose another" onPress={() => pick(true)} style={{ alignSelf: 'flex-start', paddingHorizontal: 0 }} />
        </View>
      ) : (
        <View style={{ flexDirection: 'row', gap: space(3), marginBottom: space(4) }}>
          <Button title="Take photo" icon="camera" onPress={() => pick(true)} style={{ flex: 1 }} />
          <Button title="From gallery" icon="images" variant="secondary" onPress={() => pick(false)} style={{ flex: 1 }} />
        </View>
      )}
      <Field label="Title" value={title} onChangeText={setTitle} placeholder="e.g. Malaria RDT, Full blood count" />
      <Text style={{ fontSize: 14, fontWeight: '600', marginBottom: 6 }}>Type</Text>
      <ChipRow>
        {RECORD_CATEGORIES.map((c) => (
          <Chip key={c.id} label={c.label} selected={category === c.id} onPress={() => setCategory(c.id)} />
        ))}
      </ChipRow>
      <View style={{ height: space(4) }} />
      <Field label="Date on the document" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" />
      <Field label="Notes" value={notes} onChangeText={setNotes} multiline placeholder="e.g. Result: negative. Hb 11.2. Facility: Kisenyi HC IV" />
      <Button title="Save record" icon="checkmark" onPress={save} loading={busy} />
      <Text style={[type.small, { marginTop: space(3) }]}>Photos are stored privately inside Sanova on this phone.</Text>
    </Screen>
  );
}
