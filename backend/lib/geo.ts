export type LatLng = { lat: number; lng: number };

export function haversineMeters(a: LatLng, b: LatLng): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export const WALK_SPEED_M_PER_MIN = 75; // ~4.5 km/h

export function walkingMinutes(distanceMeters: number, detourFactor = 1.3): number {
  const adjusted = distanceMeters * detourFactor;
  return Math.max(1, Math.ceil(adjusted / WALK_SPEED_M_PER_MIN));
}