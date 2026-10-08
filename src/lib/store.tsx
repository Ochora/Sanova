import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { upsertLog } from './adherence';
import { toDateKey } from './dates';
import { writeImportedPhotos } from './files';
import { uid } from './id';
import { importBundle, type SanovaBundle } from './portable';
import type {
  AppData,
  CheckIn,
  DoseStatus,
  EmergencyContact,
  Expense,
  Facility,
  HealthRecord,
  Medication,
  Member,
  MoodLog,
  Pregnancy,
  Visit,
  ChildCare,
  Settings,
} from './types';

const STORAGE_KEY = 'sanova:data:v1';

export function emptyData(): AppData {
  return {
    version: 1,
    onboarded: false,
    profile: { language: 'en', createdAt: new Date().toISOString() },
    members: [],
    contacts: [],
    medications: [],
    doseLogs: [],
    checkIns: [],
    moodLogs: [],
    pregnancies: [],
    visits: [],
    childCare: {},
    records: [],
    expenses: [],
    facilities: [],
    settings: {
      lockEnabled: false,
      remindersEnabled: true,
      cardFields: { dob: true, bloodGroup: true, allergies: true, conditions: true, medications: true, contacts: true, support: true },
    },
  };
}

export function emptyChildCare(): ChildCare {
  return { vaccines: {}, growth: [], milestones: {}, notificationIds: [] };
}

function migrate(raw: unknown): AppData {
  const base = emptyData();
  if (!raw || typeof raw !== 'object') return base;
  const d = raw as Partial<AppData>;
  return {
    ...base,
    ...d,
    profile: { ...base.profile, ...(d.profile ?? {}) },
    settings: {
      ...base.settings,
      ...(d.settings ?? {}),
      cardFields: { ...base.settings.cardFields, ...(d.settings?.cardFields ?? {}) },
    },
  };
}

type Updater = (d: AppData) => AppData;

interface Store {
  ready: boolean;
  data: AppData;
  self: Member | undefined;
  update: (fn: Updater) => void;
  // members & profile
  saveMember: (m: Omit<Member, 'id'> & { id?: string }) => Member;
  removeMember: (id: string) => void;
  saveContact: (c: Omit<EmergencyContact, 'id'> & { id?: string }) => void;
  removeContact: (id: string) => void;
  // medications
  saveMedication: (m: Medication) => void;
  removeMedication: (id: string) => void;
  logDose: (medId: string, date: string, time: string, status: DoseStatus | null) => void;
  // other entities
  addCheckIn: (c: Omit<CheckIn, 'id' | 'at' | 'date'>) => CheckIn;
  addMood: (m: Omit<MoodLog, 'id' | 'at' | 'date'>) => MoodLog;
  importProfile: (bundle: SanovaBundle, asSelf: boolean, relationship?: string) => string;
  saveRecord: (r: Omit<HealthRecord, 'id' | 'createdAt'> & { id?: string }) => void;
  removeRecord: (id: string) => void;
  saveExpense: (e: Omit<Expense, 'id' | 'createdAt'> & { id?: string }) => void;
  removeExpense: (id: string) => void;
  saveFacility: (f: Omit<Facility, 'id' | 'custom'>) => void;
  removeFacility: (id: string) => void;
  setSettings: (s: Partial<Settings>) => void;
  savePregnancy: (p: Pregnancy) => void;
  saveVisit: (v: Visit) => void;
  removeVisit: (id: string) => void;
  updateChildCare: (memberId: string, fn: (c: ChildCare) => ChildCare) => void;
  resetAll: () => Promise<void>;
}

const Ctx = createContext<Store | null>(null);

function upsert<T extends { id: string }>(list: T[], item: T): T[] {
  const i = list.findIndex((x) => x.id === item.id);
  if (i === -1) return [...list, item];
  const next = list.slice();
  next[i] = item;
  return next;
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData>(emptyData);
  const [ready, setReady] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(data);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((s) => {
        if (s) {
          const d = migrate(JSON.parse(s));
          latest.current = d;
          setData(d);
        }
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const persist = useCallback((d: AppData) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(d)).catch(() => {});
    }, 250);
  }, []);

  const update = useCallback(
    (fn: Updater) => {
      const next = fn(latest.current);
      latest.current = next;
      setData(next);
      persist(next);
    },
    [persist],
  );

  const store = useMemo<Store>(() => {
    const self = data.members.find((m) => m.relationship === 'self');
    return {
      ready,
      data,
      self,
      update,
      saveMember: (m) => {
        const member: Member = { ...m, id: m.id ?? uid('m_') };
        update((d) => ({ ...d, members: upsert(d.members, member) }));
        return member;
      },
      removeMember: (id) =>
        update((d) => ({
          ...d,
          members: d.members.filter((m) => m.id !== id),
          medications: d.medications.filter((x) => x.memberId !== id),
          checkIns: d.checkIns.filter((x) => x.memberId !== id),
          moodLogs: d.moodLogs.filter((x) => x.memberId !== id),
          pregnancies: d.pregnancies.filter((x) => x.memberId !== id),
          visits: d.visits.filter((x) => x.memberId !== id),
          childCare: Object.fromEntries(Object.entries(d.childCare).filter(([k]) => k !== id)),
          expenses: d.expenses.filter((x) => x.memberId !== id),
          records: d.records.filter((x) => x.memberId !== id),
        })),
      saveContact: (c) => update((d) => ({ ...d, contacts: upsert(d.contacts, { ...c, id: c.id ?? uid('c_') }) })),
      removeContact: (id) => update((d) => ({ ...d, contacts: d.contacts.filter((c) => c.id !== id) })),
      saveMedication: (m) => update((d) => ({ ...d, medications: upsert(d.medications, m) })),
      removeMedication: (id) =>
        update((d) => ({
          ...d,
          medications: d.medications.filter((m) => m.id !== id),
          doseLogs: d.doseLogs.filter((l) => l.medId !== id),
        })),
      logDose: (medId, date, time, status) =>
        update((d) => ({ ...d, doseLogs: upsertLog(d.doseLogs, medId, date, time, status) })),
      addCheckIn: (c) => {
        const now = new Date();
        const entry: CheckIn = { ...c, id: uid('ci_'), at: now.toISOString(), date: toDateKey(now) };
        update((d) => ({ ...d, checkIns: [...d.checkIns, entry] }));
        return entry;
      },
      addMood: (m) => {
        const now = new Date();
        const entry: MoodLog = { ...m, id: uid('mo_'), at: now.toISOString(), date: toDateKey(now) };
        update((d) => ({ ...d, moodLogs: [...d.moodLogs, entry] }));
        return entry;
      },
      importProfile: (bundle, asSelf, relationship) => {
        const r = importBundle(latest.current, bundle, asSelf, relationship);
        const uris = writeImportedPhotos(r.photos);
        update(() => ({
          ...r.data,
          records: r.data.records.map((x) => (uris[x.id] ? { ...x, imageUri: uris[x.id] } : x)),
        }));
        return r.memberId;
      },
      saveRecord: (r) =>
        update((d) => ({
          ...d,
          records: upsert(d.records, { ...r, id: r.id ?? uid('r_'), createdAt: new Date().toISOString() }),
        })),
      removeRecord: (id) => update((d) => ({ ...d, records: d.records.filter((r) => r.id !== id) })),
      saveExpense: (e) =>
        update((d) => ({
          ...d,
          expenses: upsert(d.expenses, { ...e, id: e.id ?? uid('e_'), createdAt: new Date().toISOString() }),
        })),
      removeExpense: (id) => update((d) => ({ ...d, expenses: d.expenses.filter((e) => e.id !== id) })),
      saveFacility: (f) =>
        update((d) => ({ ...d, facilities: [...d.facilities, { ...f, id: uid('f_'), custom: true }] })),
      removeFacility: (id) => update((d) => ({ ...d, facilities: d.facilities.filter((f) => f.id !== id) })),
      savePregnancy: (p) => update((d) => ({ ...d, pregnancies: upsert(d.pregnancies, p) })),
      saveVisit: (v) => update((d) => ({ ...d, visits: upsert(d.visits, v) })),
      removeVisit: (id) =>
        update((d) => ({
          ...d,
          visits: d.visits.filter((v) => v.id !== id),
          records: d.records.map((r) => (r.visitId === id ? { ...r, visitId: undefined } : r)),
        })),
      updateChildCare: (memberId, fn) =>
        update((d) => ({ ...d, childCare: { ...d.childCare, [memberId]: fn(d.childCare[memberId] ?? emptyChildCare()) } })),
      setSettings: (s) => update((d) => ({ ...d, settings: { ...d.settings, ...s } })),
      resetAll: async () => {
        if (saveTimer.current) clearTimeout(saveTimer.current);
        const fresh = emptyData();
        latest.current = fresh;
        setData(fresh);
        await AsyncStorage.removeItem(STORAGE_KEY);
      },
    };
  }, [data, ready, update]);

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore must be used inside StoreProvider');
  return s;
}

export function useMember(id: string | undefined): Member | undefined {
  const { data } = useStore();
  return data.members.find((m) => m.id === id);
}
