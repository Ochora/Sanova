# Sanova — holistic health companion (v0.1, Android test build)

Sanova is the mobile app from the *Afya360 Product & Systems Design Document*, built here as the **Phase 1 MVP** of the Patient & Family App. It is an Expo / React Native app (the stack the blueprint specifies) and works **fully offline** — every feature below runs on the phone with no server.

## What works in this version

| Area | What you can test |
| --- | --- |
| **Onboarding** | 5-step profile: name, DOB, sex, district, language, conditions, allergies, blood group, pregnancy, emergency contact, notification permission. |
| **SOS** | Hold the red button 2 s → captures GPS (falls back to last known), opens a pre-filled SMS with a Google Maps link to all emergency contacts, one-tap calls to 999 / 112 and each contact, WhatsApp share, the 3 nearest hospitals with directions, and first-aid shortcuts. |
| **First aid** | 12 offline guides: CPR, severe bleeding, choking (adult & infant), burns, road crash, snake bite, fits in children, drowning, labour danger signs, poisoning, diarrhoea/ORS. |
| **Facilities** | 24 referral hospitals sorted by distance from you, estimated travel time, directions, Google Maps search for clinics/pharmacies near you, and "add a facility at my location". |
| **Daily check-in** | Emoji mood, danger-sign and symptom chips, temperature, free text. Rule-based triage (🟢 🟡 🟠 🔴) with Uganda context (test-all-fevers malaria guidance, TB cough >2 weeks, IMCI danger signs for under-5s, maternal danger signs, 3-day recurring-symptom escalation). Red results jump straight to SOS. |
| **Medicines** | Add medicines with presets (once…4×/day, 3 days…ongoing), custom times, local daily reminders (work offline), Taken / Skip / Undo, missed-dose detection (2 h), 7-day adherence % and chart, completed courses, shareable summary. |
| **Medicine safety** | Allergy alerts (penicillin, sulfa, NSAIDs) and a curated set of well-known interactions relevant in Uganda (e.g. rifampicin + dolutegravir/contraceptives, Septrin + Fansidar/SP, warfarin + NSAIDs, efavirenz + Coartem), plus practical tips (e.g. Flagyl & alcohol). Brand names like Coartem, TLD, Septrin, Fansidar are recognised. |
| **Family** | Add children/parents; every medicine, check-in and record can belong to a family member; missed doses show on Home; "Share update" sends a summary via WhatsApp/SMS. |
| **Records vault** | Photograph or pick lab results, prescriptions, discharge summaries, X-rays, vaccination cards; categorised, dated, stored privately in the app; share with a health worker. |
| **Emergency health card** | QR code (readable by any phone camera, offline) with name, blood group, allergies, conditions, current medicines and contacts — you choose which fields. |
| **Health costs** | Log spending in UGX by category and person; monthly total, 6-month chart, category breakdown, simple insight. |
| **Settings** | Fingerprint/face app lock (SOS still callable while locked), reminders on/off, test notification, export all data (JSON), delete all data. |

## Test it on an Android phone (quickest — Expo Go)

1. On your computer: install **Node.js 20+**, then
   ```bash
   git clone https://github.com/Ochora/Sanova.git
   cd Sanova
   npm install
   npx expo start
   ```
2. On the phone: install **Expo Go** from the Play Store, open it and scan the QR code shown in the terminal (phone and computer on the same Wi-Fi; if not, run `npx expo start --tunnel`).

Everything above works in Expo Go, including local medicine reminders.

## Build a standalone APK (installable without Expo Go)

```bash
npm install -g eas-cli
eas login            # free Expo account
eas build -p android --profile preview
```
EAS builds in the cloud and gives you a download link for an `.apk` you can install on any Android phone or share with testers.

## Developer commands

```bash
npm run typecheck    # TypeScript
npm test             # unit tests for triage, adherence, drug checks, dates, geo
npx expo start       # dev server
```

Code layout: screens live in `src/app` (Expo Router), business logic in `src/lib` (pure, tested), content in `src/data`, UI kit in `src/ui`.

## Not in this version (needs the backend / partners from the blueprint)

- Phone-number OTP login and cloud sync/backup (data is on-device only for now).
- Caregiver alerts on a *second* phone, school sick-bay, hospital/CHW portals, MOH dashboard.
- AI language model features (NLP in Luganda/Runyankole/Acholi/Lusoga, RITA trend analysis, environmental alerts from live UNMA data). The triage here is a transparent rule engine.
- USSD/SMS reminder fallback (Africa's Talking), insurance and pharmacy integrations.
- Translations — the language choice is stored; UI is English until reviewed translations exist.

## Before any public release

- **Clinical review**: triage rules (`src/lib/triage.ts`), first-aid content (`src/data/firstAid.ts`) and drug checks (`src/lib/drugs.ts`) must be signed off by the Clinical Advisory Board.
- **Facility data**: replace the approximate seed coordinates in `src/data/facilities.ts` with the MOH master facility list.
- **Emergency numbers**: add verified ambulance / MOH hotlines in `src/data/emergency.ts`.
- **Data protection**: on-device storage is not yet encrypted beyond Android's app sandbox; add encryption before storing real patient data at scale (DPPA 2019).

Sanova provides health guidance, not diagnosis. In an emergency call 999 or 112.
