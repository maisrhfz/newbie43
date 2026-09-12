"use client";

import { useState } from "react";
import type { LatLng } from "@/lib/types";
import { LocationPicker } from "./LocationPicker";

export type GroupParticipant = {
  id: string;
  name: string;
  origin: LatLng;
  originLabel: string;
  status: "loading" | "success" | "error";
  departureDeadline?: string;
  totalTravelMinutes?: number;
  error?: string;
};

type Props = {
  participants: GroupParticipant[];
  onAdd: (name: string, origin: LatLng, originLabel: string) => void;
  onRemove: (id: string) => void;
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function GroupMeetupPlanner({ participants, onAdd, onRemove }: Props) {
  const [name, setName] = useState("");
  const [pendingOrigin, setPendingOrigin] = useState<LatLng | null>(null);
  const [pendingLabel, setPendingLabel] = useState<string | null>(null);

  const handleAdd = () => {
    if (!name.trim() || !pendingOrigin) return;
    onAdd(name.trim(), pendingOrigin, pendingLabel ?? "Starting point");
    setName("");
    setPendingOrigin(null);
    setPendingLabel(null);
  };

  const successful = [...participants]
    .filter((p) => p.status === "success" && p.departureDeadline)
    .sort((a, b) => new Date(a.departureDeadline!).getTime() - new Date(b.departureDeadline!).getTime());
  const nonSuccessful = participants.filter((p) => p.status !== "success");
  const ordered = [...successful, ...nonSuccessful];
  const earliest = successful[0];

  return (
    <div className="group-meetup">
      {earliest && (
        <p className="group-meetup-summary">
          Group must be moving by <strong>{formatTime(earliest.departureDeadline!)}</strong> — {earliest.name} has the tightest timing.
        </p>
      )}

      {ordered.length > 0 && (
        <ul className="group-meetup-list">
          {ordered.map((p) => (
            <li key={p.id} className="group-meetup-row">
              <span className="group-meetup-name">{p.name}</span>
              <span className="group-meetup-origin">{p.originLabel}</span>
              {p.status === "loading" && <span className="hint">Calculating…</span>}
              {p.status === "error" && <span className="hint hint-error">{p.error}</span>}
              {p.status === "success" && p.departureDeadline && (
                <span className="group-meetup-time">
                  Leave by <strong>{formatTime(p.departureDeadline)}</strong>
                </span>
              )}
              {p.id !== "you" && (
                <button type="button" className="group-meetup-remove" onClick={() => onRemove(p.id)} aria-label={`Remove ${p.name}`}>
                  ✕
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="group-meetup-add">
        <label className="field">
          <span>Name</span>
          <input type="text" placeholder="e.g. Minji" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <LocationPicker
          title="Where are they starting from?"
          allowGeolocation={false}
          onResolved={(coords, label) => { setPendingOrigin(coords); setPendingLabel(label); }}
          resolvedLabel={pendingLabel}
        />
        <button type="button" className="btn btn-primary" onClick={handleAdd} disabled={!name.trim() || !pendingOrigin}>
          + Add to group
        </button>
      </div>
    </div>
  );
}