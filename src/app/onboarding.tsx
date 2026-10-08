import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import { isValidDateKey } from '../lib/dates';
import { splitList, uid } from '../lib/id';
import { ensurePermission, scheduleCheckInReminder } from '../lib/notifications';
import { useStore } from '../lib/store';
import { pickAndConfirmBundle } from '../ui/importFlow';
import { SupportFields, type SupportValue } from '../ui/SupportFields';
import type { Sex } from '../lib/types';
import { Button, Chip, ChipRow, Field, Notice, Screen } from '../ui/components';
import { colors, space, type } from '../ui/theme';

const LANGUAGES = [
  { id: 'en', label: 'English', ready: true },
  { id: 'lg', label: 'Luganda', ready: false },
  { id: 'nyn', label: 'Runyankole', ready: false },
  { id: 'ach', label: 'Acholi', ready: false },
  { id: 'xog', label: 'Lusoga', ready: false },
];
const BLOOD = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', "Don't know"];
const STEPS = 5;

export default function Onboarding() {
  const { update, importProfile } = useStore();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [sex, setSex] = useState<Sex | undefined>();
  const [district, setDistrict] = useState('');
  const [language, setLanguage] = useState('en');
  const [conditions, setConditions] = useState('');
  const [allergies, setAllergies] = useState('');
  const [blood, setBlood] = useState<string | undefined>();
  const [pregnant, setPregnant] = useState(false);
  const [support, setSupport] = useState<SupportValue>({ disabilities: [], assistive: '', supportNeeds: '' });
  const [cName, setCName] = useState('');
  const [cPhone, setCPhone] = useState('');
  const [cRel, setCRel] = useState('');
  const [error, setError] = useState('');

  const next = () => {
    setError('');
    if (step === 1) {
      if (!name.trim()) return setError('Please enter your name.');
      if (dob && !isValidDateKey(dob)) return setError('Date of birth must look like 1990-05-21.');
    }
    if (step === 3 && cPhone && cPhone.replace(/\D/g, '').length < 9) return setError('That phone number looks too short.');
    setStep((s) => s + 1);
  };

  const finish = async () => {
    const selfId = uid('m_');
    update((d) => ({
      ...d,
      onboarded: true,
      profile: { ...d.profile, district: district.trim() || undefined, language },
      members: [
        {
          id: selfId,
          name: name.trim(),
          relationship: 'self',
          dob: dob || undefined,
          sex,
          bloodGroup: blood && blood !== "Don't know" ? blood : undefined,
          conditions: splitList(conditions),
          allergies: splitList(allergies),
          pregnant: sex === 'female' ? pregnant : undefined,
          disabilities: support.disabilities,
          assistive: support.assistive.trim() || undefined,
          supportNeeds: support.supportNeeds.trim() || undefined,
        },
      ],
      contacts: cName.trim() && cPhone.trim() ? [{ id: uid('c_'), name: cName.trim(), phone: cPhone.trim(), relationship: cRel.trim() || undefined }] : [],
    }));
    const granted = await ensurePermission();
    if (granted) await scheduleCheckInReminder(true);
    if (sex === 'female' && pregnant) {
      router.replace({ pathname: '/pregnancy/setup', params: { memberId: selfId, first: '1' } });
      return;
    }
    router.replace('/');
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen topInset>
        <View style={{ flexDirection: 'row', gap: 6, marginBottom: space(6) }}>
          {Array.from({ length: STEPS }).map((_, i) => (
            <View key={i} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i <= step ? colors.primary : colors.border }} />
          ))}
        </View>

        {step === 0 && (
          <View>
            <View style={{ width: 72, height: 72, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: space(5) }}>
              <Ionicons name="pulse" size={40} color="#fff" />
            </View>
            <Text style={type.h1}>Welcome to Sanova</Text>
            <Text style={[type.body, { color: colors.muted, marginTop: space(2), marginBottom: space(6) }]}>
              Your family health companion — emergencies, medicines, check-ins and records, in one place. It works without internet.
            </Text>
            {[
              ['alert-circle', 'One-tap SOS that sends your location to family'],
              ['medkit', 'Medicine reminders and adherence tracking'],
              ['chatbubble-ellipses', 'Daily check-in that tells you when to see a health worker'],
              ['document-text', 'Your health records and costs, always with you'],
            ].map(([icon, text]) => (
              <View key={text} style={{ flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: space(3) }}>
                <Ionicons name={icon as 'medkit'} size={22} color={colors.primary} />
                <Text style={[type.body, { flex: 1 }]}>{text}</Text>
              </View>
            ))}
            <Notice tone="info" icon="lock-closed">
              Everything you enter stays on this phone. Sanova does not upload your health data in this version.
            </Notice>
            <Notice tone="warn">
              Sanova gives guidance, not a diagnosis. Always follow the advice of a health worker.
            </Notice>
            <Button title="Get started" onPress={() => setStep(1)} />
            <Button
              title="I have a Sanova file from my parent or guardian"
              variant="ghost"
              icon="document-attach"
              onPress={async () => {
                const bundle = await pickAndConfirmBundle('self');
                if (!bundle) return;
                importProfile(bundle, true);
                const granted = await ensurePermission();
                if (granted) await scheduleCheckInReminder(true);
                router.replace('/');
              }}
              style={{ marginTop: space(2) }}
            />
          </View>
        )}

        {step === 1 && (
          <View>
            <Text style={type.h2}>About you</Text>
            <Text style={[type.small, { marginBottom: space(5) }]}>Takes under a minute. Only your name is required.</Text>
            <Field label="Full name" value={name} onChangeText={setName} placeholder="e.g. Grace Akello" autoCapitalize="words" />
            <Field label="Date of birth" value={dob} onChangeText={setDob} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" hint="Helps tailor advice for children and older adults." />
            <Text style={{ fontSize: 14, fontWeight: '600', marginBottom: 6 }}>Sex</Text>
            <ChipRow>
              <Chip label="Female" selected={sex === 'female'} onPress={() => setSex('female')} />
              <Chip label="Male" selected={sex === 'male'} onPress={() => setSex('male')} />
            </ChipRow>
            <View style={{ height: space(4) }} />
            <Field label="District" value={district} onChangeText={setDistrict} placeholder="e.g. Kampala, Gulu, Mbarara" autoCapitalize="words" />
            <Text style={{ fontSize: 14, fontWeight: '600', marginBottom: 6 }}>Preferred language</Text>
            <ChipRow>
              {LANGUAGES.map((l) => (
                <Chip key={l.id} label={l.ready ? l.label : `${l.label} (soon)`} selected={language === l.id} onPress={() => setLanguage(l.id)} />
              ))}
            </ChipRow>
            {language !== 'en' && (
              <Text style={[type.small, { marginTop: 8 }]}>We'll switch the app to this language as soon as the reviewed translation is ready. English is used for now.</Text>
            )}
          </View>
        )}

        {step === 2 && (
          <View>
            <Text style={type.h2}>Health essentials</Text>
            <Text style={[type.small, { marginBottom: space(5) }]}>Used for medicine safety checks and your emergency card. Skip anything you prefer not to share.</Text>
            <Field label="Known conditions" value={conditions} onChangeText={setConditions} placeholder="e.g. Hypertension, Asthma" hint="Separate with commas." />
            <Field label="Allergies" value={allergies} onChangeText={setAllergies} placeholder="e.g. Penicillin, Sulfa drugs" hint="Medicine allergies are checked when you add a medication." />
            <Text style={{ fontSize: 14, fontWeight: '600', marginBottom: 6 }}>Blood group</Text>
            <ChipRow>
              {BLOOD.map((b) => (
                <Chip key={b} label={b} selected={blood === b} onPress={() => setBlood(b)} />
              ))}
            </ChipRow>
            {sex === 'female' && (
              <>
                <View style={{ height: space(4) }} />
                <Text style={{ fontSize: 14, fontWeight: '600', marginBottom: 6 }}>Are you currently pregnant?</Text>
                <ChipRow>
                  <Chip label="No" selected={!pregnant} onPress={() => setPregnant(false)} />
                  <Chip label="Yes" selected={pregnant} onPress={() => setPregnant(true)} />
                </ChipRow>
                {pregnant && <Text style={[type.small, { marginTop: 6 }]}>🤰 Congratulations! Next, Sanova can set up a week-by-week pregnancy guide for you.</Text>}
              </>
            )}
            <View style={{ height: space(5) }} />
            <SupportFields value={support} onChange={setSupport} />
          </View>
        )}

        {step === 3 && (
          <View>
            <Text style={type.h2}>Emergency contact</Text>
            <Text style={[type.small, { marginBottom: space(5) }]}>When you press SOS, Sanova prepares an SMS with your location for this person. You can add more later.</Text>
            <Field label="Name" value={cName} onChangeText={setCName} placeholder="e.g. Okello James" autoCapitalize="words" />
            <Field label="Phone number" value={cPhone} onChangeText={setCPhone} placeholder="07XX XXX XXX" keyboardType="phone-pad" />
            <Field label="Relationship" value={cRel} onChangeText={setCRel} placeholder="e.g. Brother, Wife, Neighbour" />
          </View>
        )}

        {step === 4 && (
          <View>
            <Text style={type.h2}>You're all set{name ? `, ${name.split(' ')[0]}` : ''}</Text>
            <Text style={[type.body, { color: colors.muted, marginVertical: space(4) }]}>
              Next, allow notifications so Sanova can remind you to take medicines and do your daily check-in.
            </Text>
            {[
              ['Hold the red SOS button for 2 seconds in an emergency.', 'alert-circle'],
              ['Add your medicines in the Medicines tab.', 'medkit'],
              ['Add children or parents you care for under More → Family.', 'people'],
              ['First-aid guides work even with no internet.', 'bandage'],
            ].map(([t, i]) => (
              <View key={t} style={{ flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: space(3) }}>
                <Ionicons name={i as 'people'} size={20} color={colors.primary} />
                <Text style={[type.body, { flex: 1 }]}>{t}</Text>
              </View>
            ))}
          </View>
        )}

        {error ? <Notice tone="danger">{error}</Notice> : null}

        {step > 0 && (
          <View style={{ flexDirection: 'row', gap: space(3), marginTop: space(4) }}>
            <Button title="Back" variant="secondary" onPress={() => setStep((s) => s - 1)} style={{ flex: 1 }} />
            {step < STEPS - 1 ? (
              <Button title={step === 3 && !cPhone ? 'Skip' : 'Continue'} onPress={next} style={{ flex: 2 }} />
            ) : (
              <Button title="Allow & finish" icon="checkmark" onPress={finish} style={{ flex: 2 }} />
            )}
          </View>
        )}
      </Screen>
    </KeyboardAvoidingView>
  );
}
