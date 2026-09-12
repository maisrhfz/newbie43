"use client";

import { useEffect, useRef, useState } from "react";
import type { LatLng } from "@/lib/types";
import { LOCATION_PRESETS } from "@/lib/presets";
import { useGeolocation } from "@/hooks/useGeolocation";

type Props = {
  title: string;
  allowGeolocation?: boolean;
  onResolved: (coords: LatLng, label: string) => void;
  resolvedLabel: string | null;
};

export function LocationPicker({ title, allowGeolocation, onResolved, resolvedLabel }: Props) {
  const geo = useGeolocation();
  const [manualLat, setManualLat] = useState("");
  const [manualLng, setManualLng] = useState("");
  const [manualError, setManualError] = useState<string | null>(null);
  const lastGeoKeyRef = useRef<string | null>(null);

  const handleGeolocate = () => geo.request();

  // Must be a useEffect, not an if-check during render — calling onResolved()
  // while THIS component is rendering would update the PARENT's state mid-render,
  // which React disallows. The ref stops it re-firing on every re-render once
  // we've already reported this exact coordinate.
  useEffect(() => {
    if (geo.status === "success" && geo.coords) {
      const key = `${geo.coords.lat},${geo.coords.lng}`;
      if (lastGeoKeyRef.current !== key) {
        lastGeoKeyRef.current = key;
        onResolved(geo.coords, "My location");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo.status, geo.coords?.lat, geo.coords?.lng]);

  const handlePreset = (id: string) => {
    const preset = LOCATION_PRESETS.find((p) => p.id === id);
    if (preset) onResolved(preset.coords, preset.label);
  };

  const handleManualSubmit = () => {
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      setManualError("Enter valid latitude/longitude (e.g. 37.5898, 127.0326)");
      return;
    }
    setManualError(null);
    onResolved({ lat, lng }, `Custom (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
  };

  return (
    <div className="location-picker">
      <div className="location-picker-title">{title}</div>

      {allowGeolocation && (
        <button type="button" className="btn btn-secondary" onClick={handleGeolocate}>
          {geo.status === "loading" ? "Locating…" : "📍 Use my location"}
        </button>
      )}
      {geo.status === "error" && (
        <p className="hint hint-error">
          Couldn&apos;t get your location ({geo.error}). Pick a preset or enter coordinates below.
        </p>
      )}
      {geo.status === "unsupported" && (
        <p className="hint hint-error">Geolocation isn&apos;t available here — use the manual options below.</p>
      )}

      <label className="field">
        <span>Quick pick</span>
        <select defaultValue="" onChange={(e) => e.target.value && handlePreset(e.target.value)}>
          <option value="" disabled>Choose a nearby place…</option>
          {LOCATION_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>{p.label}</option>
          ))}
        </select>
      </label>

      <details className="manual-entry">
        <summary>Manual coordinates</summary>
        <div className="manual-entry-row">
          <input type="text" inputMode="decimal" placeholder="Latitude" value={manualLat} onChange={(e) => setManualLat(e.target.value)} />
          <input type="text" inputMode="decimal" placeholder="Longitude" value={manualLng} onChange={(e) => setManualLng(e.target.value)} />
          <button type="button" className="btn btn-secondary" onClick={handleManualSubmit}>Set</button>
        </div>
        {manualError && <p className="hint hint-error">{manualError}</p>}
      </details>

      {resolvedLabel && <p className="resolved-label">✓ {resolvedLabel}</p>}
    </div>
  );
}