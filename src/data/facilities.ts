import type { Facility } from '../lib/types';

/**
 * Seed list of major public and mission referral hospitals so the facility finder works
 * fully offline on day one. Coordinates are APPROXIMATE (good enough for "which is
 * nearest" and to start navigation) and must be replaced by the verified Ministry of
 * Health master facility list before launch. Users can add their own facilities.
 */
export const SEED_FACILITIES: Facility[] = [
  { id: 'mulago', name: 'Mulago National Referral Hospital', type: 'National referral', district: 'Kampala', lat: 0.3383, lng: 32.5757, open24h: true },
  { id: 'kiruddu', name: 'Kiruddu National Referral Hospital', type: 'National referral', district: 'Kampala', lat: 0.2716, lng: 32.6011, open24h: true },
  { id: 'kawempe', name: 'Kawempe National Referral Hospital', type: 'National referral (maternal & child)', district: 'Kampala', lat: 0.3791, lng: 32.5583, open24h: true },
  { id: 'naguru', name: 'China-Uganda Friendship Hospital, Naguru', type: 'Regional referral', district: 'Kampala', lat: 0.3461, lng: 32.6127, open24h: true },
  { id: 'mengo', name: 'Mengo Hospital', type: 'Private not-for-profit', district: 'Kampala', lat: 0.3044, lng: 32.5595, open24h: true },
  { id: 'nsambya', name: "St. Francis Hospital Nsambya", type: 'Private not-for-profit', district: 'Kampala', lat: 0.2995, lng: 32.5856, open24h: true },
  { id: 'lubaga', name: 'Lubaga Hospital', type: 'Private not-for-profit', district: 'Kampala', lat: 0.3036, lng: 32.5527, open24h: true },
  { id: 'kibuli', name: 'Kibuli Muslim Hospital', type: 'Private not-for-profit', district: 'Kampala', lat: 0.3069, lng: 32.5961, open24h: true },
  { id: 'entebbe', name: 'Entebbe Regional Referral Hospital', type: 'Regional referral', district: 'Wakiso', lat: 0.0573, lng: 32.4636, open24h: true },
  { id: 'jinja', name: 'Jinja Regional Referral Hospital', type: 'Regional referral', district: 'Jinja', lat: 0.4284, lng: 33.2073, open24h: true },
  { id: 'masaka', name: 'Masaka Regional Referral Hospital', type: 'Regional referral', district: 'Masaka', lat: -0.3377, lng: 31.7334, open24h: true },
  { id: 'mbarara', name: 'Mbarara Regional Referral Hospital', type: 'Regional referral', district: 'Mbarara', lat: -0.6097, lng: 30.6566, open24h: true },
  { id: 'kabale', name: 'Kabale Regional Referral Hospital', type: 'Regional referral', district: 'Kabale', lat: -1.2486, lng: 29.9872, open24h: true },
  { id: 'fortportal', name: 'Fort Portal Regional Referral Hospital', type: 'Regional referral', district: 'Fort Portal', lat: 0.6594, lng: 30.2747, open24h: true },
  { id: 'hoima', name: 'Hoima Regional Referral Hospital', type: 'Regional referral', district: 'Hoima', lat: 1.4331, lng: 31.3477, open24h: true },
  { id: 'mubende', name: 'Mubende Regional Referral Hospital', type: 'Regional referral', district: 'Mubende', lat: 0.5585, lng: 31.3897, open24h: true },
  { id: 'mbale', name: 'Mbale Regional Referral Hospital', type: 'Regional referral', district: 'Mbale', lat: 1.0806, lng: 34.1753, open24h: true },
  { id: 'soroti', name: 'Soroti Regional Referral Hospital', type: 'Regional referral', district: 'Soroti', lat: 1.7146, lng: 33.6111, open24h: true },
  { id: 'lira', name: 'Lira Regional Referral Hospital', type: 'Regional referral', district: 'Lira', lat: 2.2499, lng: 32.8999, open24h: true },
  { id: 'gulu', name: 'Gulu Regional Referral Hospital', type: 'Regional referral', district: 'Gulu', lat: 2.7746, lng: 32.2990, open24h: true },
  { id: 'lacor', name: "St. Mary's Hospital Lacor", type: 'Private not-for-profit', district: 'Gulu', lat: 2.7966, lng: 32.2551, open24h: true },
  { id: 'arua', name: 'Arua Regional Referral Hospital', type: 'Regional referral', district: 'Arua', lat: 3.0201, lng: 30.9110, open24h: true },
  { id: 'moroto', name: 'Moroto Regional Referral Hospital', type: 'Regional referral', district: 'Moroto', lat: 2.5345, lng: 34.6666, open24h: true },
  { id: 'kayunga', name: 'Kayunga Regional Referral Hospital', type: 'Regional referral', district: 'Kayunga', lat: 0.7025, lng: 32.8886, open24h: true },
];
