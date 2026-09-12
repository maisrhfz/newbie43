import type { LatLng } from "./geo";

const ODSAY_BASE = "https://api.odsay.com/v1/api/";

export type OdsayStation = { name: string; coords: LatLng; type: "subway" | "bus" | "unknown" };
export type OdsayPathResult = {
  totalTimeMinutes: number;
  fare: number | null;
  legs: { trafficType: "subway" | "bus" | "walk"; description: string }[];
};

function apiKey(): string | null {
  const key = process.env.ODSAY_API_KEY;
  return key && key.trim().length > 0 ? key : null;
}

export function hasOdsayKey(): boolean {
  return apiKey() !== null;
}

function trafficTypeFromCode(code: number): "subway" | "bus" | "walk" {
  if (code === 1) return "subway";
  if (code === 2) return "bus";
  return "walk";
}

export async function findNearbyStations(point: LatLng, radiusMeters = 700): Promise<OdsayStation[]> {
  const key = apiKey();
  if (!key) throw new Error("ODSAY_API_KEY not configured");
  const url = new URL(ODSAY_BASE + "pointSearch");
  url.searchParams.set("apiKey", key);
  url.searchParams.set("x", String(point.lng));
  url.searchParams.set("y", String(point.lat));
  url.searchParams.set("radius", String(radiusMeters));
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`ODsay pointSearch failed: ${res.status}`);
  const data = await res.json();
  const points = data?.result?.point ?? [];
  return points.map((p: any) => ({
    name: p.name,
    coords: { lat: Number(p.y), lng: Number(p.x) },
    type: p.type === 1 ? "subway" : p.type === 2 ? "bus" : "unknown",
  }));
}

export async function searchTransitPath(origin: LatLng, destination: LatLng): Promise<OdsayPathResult | null> {
  const key = apiKey();
  if (!key) throw new Error("ODSAY_API_KEY not configured");
  const url = new URL(ODSAY_BASE + "searchPubTransPathT");
  url.searchParams.set("apiKey", key);
  url.searchParams.set("SX", String(origin.lng));
  url.searchParams.set("SY", String(origin.lat));
  url.searchParams.set("EX", String(destination.lng));
  url.searchParams.set("EY", String(destination.lat));
  url.searchParams.set("OPT", "0");
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`ODsay searchPubTransPathT failed: ${res.status}`);
  const data = await res.json();
  const paths = data?.result?.path;
  if (!paths || paths.length === 0) return null;
  const best = paths[0];
  const legs = (best.subPath ?? []).map((sp: any) => ({
    trafficType: trafficTypeFromCode(sp.trafficType),
    description: sp.trafficType === 1 ? `${sp.lane?.[0]?.name ?? "지하철"}` : sp.trafficType === 2 ? `${sp.lane?.[0]?.busNo ?? "버스"}` : "도보",
  }));
  return {
    totalTimeMinutes: Number(best.info?.totalTime ?? 0),
    fare: best.info?.payment != null ? Number(best.info.payment) : null,
    legs,
  };
}