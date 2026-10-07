export interface LatLng {
  lat: number;
  lng: number;
}

/** Great-circle distance in kilometres. */
export function distanceKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}

/**
 * Very rough travel-time estimate by road (straight line × 1.4 detour factor).
 * Uses ~25 km/h within ~15 km (urban traffic / boda) and ~50 km/h beyond.
 */
export function estimateTravelMinutes(km: number): number {
  const road = km * 1.4;
  const mins = road <= 15 ? (road / 25) * 60 : (15 / 25) * 60 + ((road - 15) / 50) * 60;
  return Math.max(2, Math.round(mins));
}

export function formatMinutes(m: number): string {
  if (m < 60) return `~${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `~${h} h ${r} min` : `~${h} h`;
}

export function mapsLink(p: LatLng): string {
  return `https://maps.google.com/?q=${p.lat.toFixed(6)},${p.lng.toFixed(6)}`;
}

export function directionsLink(dest: LatLng): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${dest.lat},${dest.lng}`;
}

export function searchNearbyLink(query: string, near?: LatLng): string {
  const base = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  return near ? `${base}%20near%20${near.lat.toFixed(5)},${near.lng.toFixed(5)}` : base;
}
