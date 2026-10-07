import type { AppData } from '../types';

export function emptyDataForTest(): AppData {
  return {
    version: 1,
    onboarded: true,
    profile: { language: 'en', createdAt: '' },
    members: [
      { id: 'me', name: 'Norman', relationship: 'self', conditions: [], allergies: [] },
      { id: 'kid', name: 'Grace', relationship: 'Child', dob: '2019-03-14', conditions: [], allergies: ['Penicillin'] },
    ],
    contacts: [],
    medications: [
      { id: 'm1', memberId: 'kid', name: 'Coartem', dose: '2 tablets', times: ['08:00', '20:00'], startDate: '2026-10-07', durationDays: 3, notificationIds: ['n1'], createdAt: '' },
      { id: 'm2', memberId: 'me', name: 'Metformin', dose: '500 mg', times: ['08:00'], startDate: '2026-01-01', notificationIds: [], createdAt: '' },
    ],
    doseLogs: [
      { medId: 'm1', date: '2026-10-07', time: '08:00', status: 'taken', at: '' },
      { medId: 'm2', date: '2026-10-07', time: '08:00', status: 'taken', at: '' },
    ],
    checkIns: [{ id: 'c1', memberId: 'kid', at: '', date: '2026-10-07', feeling: 2, symptoms: ['fever'], level: 'orange' }],
    moodLogs: [{ id: 'mo', memberId: 'me', at: '', date: '2026-10-07', kind: 'morning', mood: 4, feelings: [] }],
    records: [{ id: 'r1', memberId: 'kid', title: 'Malaria RDT', category: 'lab', date: '2026-10-07', imageUri: 'file:///x.jpg', createdAt: '' }],
    expenses: [],
    facilities: [],
    settings: {
      lockEnabled: false,
      remindersEnabled: true,
      cardFields: { dob: true, bloodGroup: true, allergies: true, conditions: true, medications: true, contacts: true },
    },
  };
}
