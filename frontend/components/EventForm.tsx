"use client";

import { useState } from "react";
import type { LatLng, TransportMode } from "@/lib/types";
import { LocationPicker } from "./LocationPicker";

export type TripPlan = {
  origin: LatLng;
  originLabel: string;
  destination: LatLng;
  destinationLabel: string;
  eventTime: string;
  bufferMinutes: number;
  mode: TransportMode;
};

type Props = { onSubmit: (plan: TripPlan) => void; submitting: boolean };

function defaultEventTime(): string {
  const d = new Date(Date.now() + 60 * 60 * 1000);
  d.setSeconds(0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function EventForm({ onSubmit, submitting }: Props) {
  const [origin, setOrigin] = useState<LatLng | null>(null);
  const [originLabel, setOriginLabel] = useState<string | null>(null);
  const [destination, setDestination] = useState<LatLng | null>(null);
  const [destinationLabel, setDestinationLabel] = useState<string | null>(null);
  const [eventTime, setEventTime] = useState(defaultEventTime());
  const [bufferMinutes, setBufferMinutes] = useState<number | "">(10);
  const [mode, setMode] = useState<TransportMode>("transit");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!origin || !destination) {
      setError("Set both your starting point and the event location first.");
      return;
    }
    setError(null);
    onSubmit({
      origin,
      originLabel: originLabel ?? "Origin",
      destination,
      destinationLabel: destinationLabel ?? "Destination",
      eventTime: new Date(eventTime).toISOString(),
      bufferMinutes: typeof bufferMinutes === "number" ? bufferMinutes : 0,
      mode,
    });
  };

  return (
    <form className="event-form" onSubmit={handleSubmit}>
      <div className="picker-grid">
        <LocationPicker
          title="My Location"
          allowGeolocation
          onResolved={(coords, label) => {
            setOrigin(coords);
            setOriginLabel(label);
          }}
          resolvedLabel={originLabel}
        />
        <LocationPicker
          title="Event Location"
          onResolved={(coords, label) => {
            setDestination(coords);
            setDestinationLabel(label);
          }}
          resolvedLabel={destinationLabel}
        />
      </div>

      <div className="field-row">
        <label className="field">
          <span>Event start time</span>
          <input
            type="datetime-local"
            value={eventTime}
            onChange={(e) => setEventTime(e.target.value)}
            required
          />
        </label>
        <label className="field">
          <span>Buffer (minutes)</span>
          <input
            type="number"
            min={0}
            max={120}
            value={bufferMinutes}
            onChange={(e) => {
              const val = e.target.value;
              if (val === "") {
                setBufferMinutes("");
              } else {
                const parsed = parseInt(val, 10);
                setBufferMinutes(isNaN(parsed) ? 0 : Math.max(0, parsed));
              }
            }}
          />
        </label>
      </div>

      <div className="field">
        <span>How are you getting there?</span>
        <div className="mode-toggle" role="radiogroup" aria-label="Transport mode">
          {(["walk", "transit", "drive"] as TransportMode[]).map((m) => (
            <button
              key={m}
              type="button"
              className={`mode-btn ${mode === m ? "mode-btn-active" : ""}`}
              onClick={() => setMode(m)}
              aria-pressed={mode === m}
            >
              {m === "walk" ? "Walk" : m === "transit" ? "Transit" : "Drive"}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="hint hint-error">{error}</p>}
      <button type="submit" className="btn btn-primary" disabled={submitting}>
        {submitting ? "Calculating…" : "When do I need to leave?"}
      </button>
    </form>
  );
}