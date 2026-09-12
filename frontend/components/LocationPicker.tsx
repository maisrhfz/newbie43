"use client";

import { useEffect, useRef, useState } from "react";
import type { LatLng } from "@/lib/types";
import { LOCATION_PRESETS } from "@/lib/presets";
import { useGeolocation } from "@/hooks/useGeolocation";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

type Props = {
  title: string;
  allowGeolocation?: boolean;
  onResolved: (coords: LatLng, label: string) => void;
  resolvedLabel: string | null;
};

type SearchResult = { lat: number; lng: number; label: string };

export function LocationPicker({ title, allowGeolocation, onResolved, resolvedLabel }: Props) {
  const geo = useGeolocation();
  const [manualLat, setManualLat] = useState("");
  const [manualLng, setManualLng] = useState("");
  const [manualError, setManualError] = useState<string | null>(null);
  const lastGeoKeyRef = useRef<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const handleGeolocate = () => geo.request();

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

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchError(null);
    setSearchResults([]);
    try {
      const res = await fetch(`${API_BASE}/api/geocode`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery.trim() }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Search failed (${res.status})`);
      }
      const { results } = await res.json();
      if (!results || results.length === 0) {
        setSearchError("No matches found — try a more specific name.");
      } else {
        setSearchResults(results);
      }
    } catch (err: any) {
      setSearchError(err.message ?? "Search failed");
    } finally {
      setSearching(false);
    }
  };

  const handlePickResult = (r: SearchResult) => {
    onResolved({ lat: r.lat, lng: r.lng }, r.label);
    setSearchResults([]);
    setSearchQuery("");
  };

  return (
    <div className="location-picker">
      <div className="location-picker-title">{title}</div>

      {allowGeolocation && (
        <button type="button" className="btn btn-secondary" onClick={handleGeolocate}>
          {geo.status === "loading" ? "Locating…" : "Use my location"}
        </button>
      )}
      {geo.status === "error" && (
        <p className="hint hint-error">
          Couldn&apos;t get your location ({geo.error}). Pick a preset or search below.
        </p>
      )}
      {geo.status === "unsupported" && (
        <p className="hint hint-error">Geolocation isn&apos;t available here — use search or the options below.</p>
      )}

      <div className="place-search">
        <label className="field">
          <span>Search by name</span>
          <div className="place-search-row">
            <input
              type="text"
              placeholder="e.g. 안암역, 고려대학교 정문"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSearch(); } }}
            />
            <button type="button" className="btn btn-secondary" onClick={handleSearch} disabled={searching || !searchQuery.trim()}>
              {searching ? "Searching…" : "Search"}
            </button>
          </div>
        </label>
        {searchError && <p className="hint hint-error">{searchError}</p>}
        {searchResults.length > 0 && (
          <ul className="place-search-results">
            {searchResults.map((r, i) => (
              <li key={i}>
                <button type="button" className="place-search-result" onClick={() => handlePickResult(r)}>
                  {r.label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

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