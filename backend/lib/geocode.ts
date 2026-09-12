export type GeocodeResult = { lat: number; lng: number; label: string };

export async function geocodePlace(query: string): Promise<GeocodeResult[]> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "wont-be-late-hackathon-app/1.0",
      "Accept-Language": "ko,en",
    },
  });
  if (!res.ok) throw new Error(`Geocoding failed (${res.status})`);
  const data = await res.json();
  return (data as any[]).map((d) => ({
    lat: parseFloat(d.lat),
    lng: parseFloat(d.lon),
    label: d.display_name as string,
  }));
}