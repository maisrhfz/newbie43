import { NextRequest, NextResponse } from "next/server";
import { getRouteEstimate, type TransportMode } from "@/lib/transit";
import { computeDepartureDeadline } from "@/lib/time";
import { hasOdsayKey } from "@/lib/odsay";
import type { LatLng } from "@/lib/geo";

type RequestBody = {
  origin: LatLng;
  destination: LatLng;
  eventTime: string;
  bufferMinutes: number;
  mode: TransportMode;
};

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN ?? "*";

function corsHeaders(): HeadersInit {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

function isLatLng(v: unknown): v is LatLng {
  return typeof v === "object" && v !== null && typeof (v as any).lat === "number" && typeof (v as any).lng === "number" && Number.isFinite((v as any).lat) && Number.isFinite((v as any).lng);
}

export async function POST(req: NextRequest) {
  const headers = corsHeaders();
  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400, headers });
  }

  const { origin, destination, eventTime, bufferMinutes, mode } = body;

  if (!isLatLng(origin) || !isLatLng(destination)) {
    return NextResponse.json({ error: "origin and destination must be { lat, lng } numbers" }, { status: 400, headers });
  }
  const parsedEventTime = new Date(eventTime);
  if (Number.isNaN(parsedEventTime.getTime())) {
    return NextResponse.json({ error: "eventTime is not a valid date" }, { status: 400, headers });
  }
  if (!["walk", "transit", "drive"].includes(mode)) {
    return NextResponse.json({ error: "mode must be walk, transit, or drive" }, { status: 400, headers });
  }
  const buffer = Number.isFinite(bufferMinutes) ? Math.max(0, bufferMinutes) : 10;

  const estimate = await getRouteEstimate(origin, destination, mode);
  const deadline = computeDepartureDeadline(parsedEventTime, estimate.totalTravelMinutes, buffer);

  return NextResponse.json(
    { estimate, eventTime: parsedEventTime.toISOString(), bufferMinutes: buffer, departureDeadline: deadline.toISOString(), odsayConfigured: hasOdsayKey() },
    { headers }
  );
}