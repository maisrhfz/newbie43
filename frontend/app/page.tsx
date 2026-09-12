"use client";

import { useState } from "react";
import { EventForm, type TripPlan } from "@/components/EventForm";
import { DepartureBanner } from "@/components/DepartureBanner";
import { getNaverMapUrl } from "@/lib/presets";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

type ApiResponse = {
  estimate: {
    mode: string;
    distanceMeters: number;
    totalTravelMinutes: number;
    nearestStation: string | null;
    walkToStationMinutes: number | null;
    inTransitMinutes: number | null;
    walkFromStationMinutes: number | null;
    usingRealApi: boolean;
    notes: string | null;
  };
  eventTime: string;
  bufferMinutes: number;
  departureDeadline: string;
  odsayConfigured: boolean;
};

export default function Home() {
  const [result, setResult] = useState<ApiResponse | null>(null);
  const [lastPlan, setLastPlan] = useState<TripPlan | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const handleSubmit = async (plan: TripPlan) => {
    // Extract coordinates safely matching TripPlan flat structure
    const originLat = plan.origin?.lat ?? 0;
    const originLng = plan.origin?.lng ?? 0;
    const destLat = plan.destination?.lat ?? 0;
    const destLng = plan.destination?.lng ?? 0;

    // Validation: Prevent calculation if origin and destination coordinates match
    if (
      originLat.toFixed(4) === destLat.toFixed(4) &&
      originLng.toFixed(4) === destLng.toFixed(4)
    ) {
      setApiError("Origin and destination cannot be the exact same location.");
      setResult(null);
      return;
    }

    setSubmitting(true);
    setApiError(null);
    setLastPlan(plan);

    try {
      const res = await fetch(`${API_BASE}/api/route`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin: plan.origin,
          originLabel: plan.originLabel,
          destination: plan.destination,
          destinationLabel: plan.destinationLabel,
          eventTime: plan.eventTime,
          bufferMinutes: plan.bufferMinutes,
          mode: plan.mode,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Request failed (${res.status})`);
      }

      setResult(await res.json());
    } catch (err: any) {
      setApiError(
        API_BASE
          ? err.message ?? "Something went wrong"
          : `${err.message ?? "Request failed"} — is NEXT_PUBLIC_API_BASE_URL set?`
      );
      setResult(null);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="page">
      <section className="card">
        <h1>Will I be late?</h1>
        <p className="subtitle">
          Set your event and where you&apos;re starting from — we&apos;ll tell you the latest minute you can walk out the door.
        </p>
        <EventForm onSubmit={handleSubmit} submitting={submitting} />
        {apiError && <p className="hint hint-error">{apiError}</p>}
      </section>

      {result && lastPlan && (
        <section className="card">
          <DepartureBanner eventTime={result.eventTime} departureDeadline={result.departureDeadline} />

          <div className="trip-breakdown">
            <h2>Trip breakdown</h2>
            <ul>
              <li>Mode: {result.estimate.mode}</li>
              <li>Distance: {(result.estimate.distanceMeters / 1000).toFixed(2)} km</li>
              <li>Total travel time: {result.estimate.totalTravelMinutes} min</li>
              {result.estimate.nearestStation && <li>Nearest station: {result.estimate.nearestStation}</li>}
              {result.estimate.walkToStationMinutes != null && (
                <li>Walk to station: {result.estimate.walkToStationMinutes} min</li>
              )}
              {result.estimate.inTransitMinutes != null && (
                <li>In transit: {result.estimate.inTransitMinutes} min</li>
              )}
              {result.estimate.walkFromStationMinutes != null && (
                <li>Walk from station: {result.estimate.walkFromStationMinutes} min</li>
              )}
              <li>Buffer added: {result.bufferMinutes} min</li>
            </ul>

            {/* NAVER Map Direct Link Button */}
            {lastPlan.origin && lastPlan.destination && (
              <div style={{ marginTop: "1.25rem" }}>
                <a
                  href={getNaverMapUrl(
                    lastPlan.origin,
                    lastPlan.destination,
                    lastPlan.destinationLabel ?? "Destination",
                    lastPlan.mode
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "block",
                    width: "100%",
                    padding: "0.75rem",
                    backgroundColor: "#03C75A",
                    color: "#ffffff",
                    fontWeight: "bold",
                    textAlign: "center",
                    borderRadius: "8px",
                    textDecoration: "none",
                  }}
                >
                  🗺️ Open Route in NAVER Map
                </a>
              </div>
            )}

            <p className="hint" style={{ marginTop: "1rem" }}>
              {result.odsayConfigured
                ? result.estimate.usingRealApi
                  ? "Live ODsay transit data."
                  : "ODsay key is set, but this trip fell back to the estimator."
                : "Using the built-in estimator — add an ODSAY_API_KEY on the backend for live subway/bus routing."}
              {result.estimate.notes ? ` ${result.estimate.notes}` : ""}
            </p>
          </div>
        </section>
      )}
    </main>
  );
}