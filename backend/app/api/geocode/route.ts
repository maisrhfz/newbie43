import { NextRequest, NextResponse } from "next/server";
import { geocodePlace } from "@/lib/geocode";

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN ?? "*";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json();
    if (!query || typeof query !== "string" || !query.trim()) {
      return NextResponse.json({ error: "query is required" }, { status: 400, headers: corsHeaders() });
    }
    const results = await geocodePlace(query.trim());
    return NextResponse.json({ results }, { headers: corsHeaders() });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Geocoding failed" }, { status: 500, headers: corsHeaders() });
  }
}