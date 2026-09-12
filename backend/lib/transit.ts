import { haversineMeters, walkingMinutes, type LatLng } from "./geo";
import { hasOdsayKey, findNearbyStations, searchTransitPath } from "./odsay";

export type TransportMode = "walk" | "transit" | "drive";

export type RouteEstimate = {
  mode: TransportMode;
  distanceMeters: number;
  totalTravelMinutes: number;
  nearestStation: string | null;
  walkToStationMinutes: number | null;
  inTransitMinutes: number | null;
  walkFromStationMinutes: number | null;
  usingRealApi: boolean;
  notes: string | null;
};

const DRIVE_SPEED_M_PER_MIN = 400; // ~24 km/h
const TRANSIT_SPEED_M_PER_MIN = 500; // ~30 km/h
const TRANSIT_WAIT_MINUTES = 5;

async function estimateTransitReal(origin: LatLng, destination: LatLng): Promise<RouteEstimate | null> {
  try {
    const [nearby, path] = await Promise.all([
      findNearbyStations(origin).catch(() => []),
      searchTransitPath(origin, destination),
    ]);
    if (!path) return null;
    const distanceMeters = haversineMeters(origin, destination);
    return {
      mode: "transit",
      distanceMeters,
      totalTravelMinutes: path.totalTimeMinutes,
      nearestStation: nearby[0]?.name ?? null,
      walkToStationMinutes: null,
      inTransitMinutes: path.totalTimeMinutes,
      walkFromStationMinutes: null,
      usingRealApi: true,
      notes: path.legs.length > 0 ? path.legs.map((l) => l.description).join(" → ") : null,
    };
  } catch {
    return null;
  }
}

function estimateMock(origin: LatLng, destination: LatLng, mode: TransportMode): RouteEstimate {
  const distanceMeters = haversineMeters(origin, destination);

  if (mode === "walk") {
    return { mode, distanceMeters, totalTravelMinutes: walkingMinutes(distanceMeters), nearestStation: null, walkToStationMinutes: null, inTransitMinutes: null, walkFromStationMinutes: null, usingRealApi: false, notes: null };
  }
  if (mode === "drive") {
    const driveMinutes = Math.max(1, Math.ceil(distanceMeters / DRIVE_SPEED_M_PER_MIN));
    return { mode, distanceMeters, totalTravelMinutes: driveMinutes, nearestStation: null, walkToStationMinutes: null, inTransitMinutes: null, walkFromStationMinutes: null, usingRealApi: false, notes: null };
  }

  const walkToStation = Math.min(8, walkingMinutes(Math.min(distanceMeters * 0.15, 500)));
  const walkFromStation = Math.min(8, walkingMinutes(Math.min(distanceMeters * 0.1, 400)));
  const lineHaulDistance = Math.max(distanceMeters * 0.75, 0);
  const inTransit = Math.max(1, Math.ceil(lineHaulDistance / TRANSIT_SPEED_M_PER_MIN)) + TRANSIT_WAIT_MINUTES;

  return {
    mode,
    distanceMeters,
    totalTravelMinutes: walkToStation + inTransit + walkFromStation,
    nearestStation: null,
    walkToStationMinutes: walkToStation,
    inTransitMinutes: inTransit,
    walkFromStationMinutes: walkFromStation,
    usingRealApi: false,
    notes: "Estimated — add an ODsay API key for real routes.",
  };
}

export async function getRouteEstimate(origin: LatLng, destination: LatLng, mode: TransportMode): Promise<RouteEstimate> {
  if (mode === "transit" && hasOdsayKey()) {
    const real = await estimateTransitReal(origin, destination);
    if (real) return real;
  }
  return estimateMock(origin, destination, mode);
}