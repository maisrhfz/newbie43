"use client";

import { useState, useMemo, useEffect } from "react";
import { EventForm, type TripPlan } from "@/components/EventForm";
import { DepartureBanner } from "@/components/DepartureBanner";
import { CircularTimer, type TimeBlock } from "@/components/CircularTimer";
import { GroupMeetupPlanner, type GroupParticipant } from "@/components/GroupMeetupPlanner";
import { getNaverMapUrl } from "@/lib/presets";
import type { LatLng } from "@/lib/types";

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

const formatDecimalToTime = (decimalHours: number): string => {
  const hours = Math.floor(decimalHours);
  const minutes = Math.round((decimalHours - hours) * 60);
  const formattedH = String(hours % 24).padStart(2, "0");
  const formattedM = String(minutes).padStart(2, "0");
  return `${formattedH}:${formattedM}`;
};

export default function Home() {
  const [result, setResult] = useState<ApiResponse | null>(null);
  const [lastPlan, setLastPlan] = useState<TripPlan | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const buildShareText = (): string => {

    if (!result || !lastPlan) return "";
    const leaveTime = new Date(result.departureDeadline).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const eventTime = new Date(result.eventTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const modeLabel = result.estimate.mode === "walk" ? "🚶 walking" : result.estimate.mode === "transit" ? "🚇 transit" : "🚗 driving";
    return `📍 Heading to ${lastPlan.destinationLabel ?? "the event"} (starts ${eventTime})\n⏰ Leaving by ${leaveTime} — ${modeLabel}, ~${result.estimate.totalTravelMinutes} min\nMade with "Will I be late?" 🕒`;
  };

  const handleShare = async () => {
    const text = buildShareText();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const [tasks, setTasks] = useState<TimeBlock[]>([
    { id: "1", label: "Morning Study", startHour: 9, endHour: 12, color: "#3b82f6" },
    { id: "2", label: "Lunch", startHour: 12, endHour: 13, color: "#10b981" },
  ]);

  const [taskLabel, setTaskLabel] = useState("");
  const [startHour, setStartHour] = useState("14");
  const [endHour, setEndHour] = useState("16");

  const [participants, setParticipants] = useState<GroupParticipant[]>([]);

  const dateToDecimalHours = (dateString: string): number => {
    const d = new Date(dateString);
    return d.getHours() + d.getMinutes() / 60;
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskLabel.trim()) return;
    const newTask: TimeBlock = {
      id: Date.now().toString(),
      label: taskLabel.trim(),
      startHour: parseFloat(startHour),
      endHour: parseFloat(endHour),
      color: "#8b5cf6",
    };
    setTasks([...tasks, newTask]);
    setTaskLabel("");
  };

  const removeTask = (id: string) => {
    setTasks(tasks.filter((t) => t.id !== id));
  };

  const combinedBlocks = useMemo(() => {
    const allBlocks = [...tasks];
    if (result) {
      const depH = dateToDecimalHours(result.departureDeadline);
      const eventH = dateToDecimalHours(result.eventTime);
      allBlocks.push({
        id: "commute-naver",
        label: "NAVER Commute & Trip",
        startHour: depH,
        endHour: eventH > depH ? eventH : depH + 1,
        color: "#03C75A",
      });
    }
    return allBlocks;
  }, [tasks, result]);

  // Keep "You" (the main submitter) synced as a participant in the group list
  useEffect(() => {
    if (result && lastPlan) {
      setParticipants((prev) => {
        const others = prev.filter((p) => p.id !== "you");
        return [
          {
            id: "you",
            name: "You",
            origin: lastPlan.origin,
            originLabel: lastPlan.originLabel,
            status: "success",
            departureDeadline: result.departureDeadline,
            totalTravelMinutes: result.estimate.totalTravelMinutes,
          },
          ...others,
        ];
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, lastPlan]);

  const addParticipant = async (name: string, origin: LatLng, originLabel: string) => {
    if (!lastPlan) {
      setApiError("Submit the event details above first, then add group members.");
      return;
    }
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setParticipants((prev) => [...prev, { id, name, origin, originLabel, status: "loading" }]);

    try {
      const res = await fetch(`${API_BASE}/api/route`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin,
          originLabel,
          destination: lastPlan.destination,
          destinationLabel: lastPlan.destinationLabel,
          eventTime: lastPlan.eventTime,
          bufferMinutes: lastPlan.bufferMinutes,
          mode: lastPlan.mode,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Request failed (${res.status})`);
      }
      const data = await res.json();
      setParticipants((prev) =>
        prev.map((p) =>
          p.id === id
            ? { ...p, status: "success", departureDeadline: data.departureDeadline, totalTravelMinutes: data.estimate.totalTravelMinutes }
            : p
        )
      );
    } catch (err: any) {
      setParticipants((prev) => prev.map((p) => (p.id === id ? { ...p, status: "error", error: err.message ?? "Request failed" } : p)));
    }
  };

  const removeParticipant = (id: string) => setParticipants((prev) => prev.filter((p) => p.id !== id));

  const handleSubmit = async (plan: TripPlan) => {
    const originLat = plan.origin?.lat ?? 0;
    const originLng = plan.origin?.lng ?? 0;
    const destLat = plan.destination?.lat ?? 0;
    const destLng = plan.destination?.lng ?? 0;

    if (originLat.toFixed(4) === destLat.toFixed(4) && originLng.toFixed(4) === destLng.toFixed(4)) {
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
    <main className="page" style={{ maxWidth: 900, margin: "0 auto", padding: 16 }}>
      <section className="card">
        <h1>24-Hour Visual Day & Departure Planner</h1>
        <p className="subtitle">
          Set your commute route and plan your daily task schedule on a live visual clock ring.
        </p>
        <EventForm onSubmit={handleSubmit} submitting={submitting} />
        {apiError && <p className="hint hint-error">{apiError}</p>}
      </section>

      <section className="card" style={{ marginTop: 20 }}>
        <h2>Daily Routine & Live Ring</h2>
        <CircularTimer blocks={combinedBlocks} />

        <form onSubmit={handleAddTask} style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
          <input
            type="text"
            placeholder="New task name..."
            value={taskLabel}
            onChange={(e) => setTaskLabel(e.target.value)}
            style={{ flex: 2, padding: 8, borderRadius: 6, border: "1px solid var(--border)" }}
          />
          <select value={startHour} onChange={(e) => setStartHour(e.target.value)} style={{ padding: 8 }}>
            {Array.from({ length: 24 }).map((_, i) => (
              <option key={i} value={i}>{`${i}:00`}</option>
            ))}
          </select>
          <select value={endHour} onChange={(e) => setEndHour(e.target.value)} style={{ padding: 8 }}>
            {Array.from({ length: 24 }).map((_, i) => (
              <option key={i} value={i}>{`${i}:00`}</option>
            ))}
          </select>
          <button type="submit" style={{ padding: "8px 16px", borderRadius: 6, cursor: "pointer" }}>
            Add Task
          </button>
        </form>

        <div style={{ marginTop: 16 }}>
          <h3>Today&apos;s Scheduled Tasks</h3>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {combinedBlocks.map((task) => (
              <li
                key={task.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "8px 12px",
                  marginBottom: 6,
                  borderRadius: 6,
                  borderLeft: `6px solid ${task.color}`,
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                }}
              >
                <span>
                  <strong>{task.label}</strong> ({formatDecimalToTime(task.startHour)} – {formatDecimalToTime(task.endHour)})
                </span>
                {task.id !== "commute-naver" && (
                  <button
                    onClick={() => removeTask(task.id)}
                    style={{ color: "red", border: "none", background: "none", cursor: "pointer" }}
                  >
                    ✕
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {lastPlan && (
        <section className="card" style={{ marginTop: 20 }}>
          <h2>Group meetup</h2>
          <p className="subtitle">Add everyone else coming to this event — we&apos;ll work out each person&apos;s own leave-by time.</p>
          <GroupMeetupPlanner participants={participants} onAdd={addParticipant} onRemove={removeParticipant} />
        </section>
      )}

      {result && lastPlan && (
        <section className="card" style={{ marginTop: 20 }}>
          <DepartureBanner eventTime={result.eventTime} departureDeadline={result.departureDeadline} />

          <div className="trip-breakdown">
            <h2>Trip breakdown</h2>
            <ul>
              {(() => {
                    const distanceKm = result.estimate.distanceMeters / 1000;
                    const isLongWalk = result.estimate.mode === "walk" && distanceKm > 3;
                    const isLongDistance = distanceKm > 15;
                    if (!isLongWalk && !isLongDistance) return null;
                    return (
                      <p className="distance-warning">
                        {isLongDistance
                          ? `⚠️ This event is ${distanceKm.toFixed(1)} km away — that's beyond what this app's estimator is built for (campus-area walking/bus/subway). For trips this long, double-check real bus/train schedules directly, since this number may not be accurate.`
                          : `⚠️ That's a ${distanceKm.toFixed(1)} km walk — likely 30+ minutes on foot. Consider switching to Transit or Drive above for a more realistic time.`}
                      </p>
                    );
                  })()}
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

            <button type="button" className="btn btn-secondary" style={{ width: "100%", marginTop: "0.75rem" }} onClick={handleShare}>
              {copied ? "✓ Copied to clipboard!" : "📋 Share this plan"}
            </button>
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
                  Open Route in NAVER Map
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