"use client";

import { useState, useMemo } from "react";
import { EventForm, type TripPlan } from "@/components/EventForm";
import { DepartureBanner } from "@/components/DepartureBanner";
import { CircularTimer, type TimeBlock } from "@/components/CircularTimer";
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

// Helper: Converts decimal hours (e.g. 17.8333) into a clean clock string (e.g. "17:50")
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

  // Dynamic To-Do List State
  const [tasks, setTasks] = useState<TimeBlock[]>([
    { id: "1", label: "Morning Study", startHour: 9, endHour: 12, color: "#3b82f6" },
    { id: "2", label: "Lunch", startHour: 12, endHour: 13, color: "#10b981" },
  ]);

  // Task Input Form State
  const [taskLabel, setTaskLabel] = useState("");
  const [startHour, setStartHour] = useState("14");
  const [endHour, setEndHour] = useState("16");

  const dateToDecimalHours = (dateString: string): number => {
    const d = new Date(dateString);
    return d.getHours() + d.getMinutes() / 60;
  };

  // Add a custom task to the schedule
  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskLabel.trim()) return;

    const newTask: TimeBlock = {
      id: Date.now().toString(),
      label: taskLabel.trim(),
      startHour: parseFloat(startHour),
      endHour: parseFloat(endHour),
      color: "#8b5cf6", // Purple for custom tasks
    };

    setTasks([...tasks, newTask]);
    setTaskLabel("");
  };

  const removeTask = (id: string) => {
    setTasks(tasks.filter((t) => t.id !== id));
  };

  // Combine custom To-Do tasks with the calculated NAVER commute window
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
        color: "#03C75A", // NAVER Green
      });
    }

    return allBlocks;
  }, [tasks, result]);

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

      {/* 24-Hour Ring & Task Manager Section */}
      <section className="card" style={{ marginTop: 20 }}>
        <h2>Daily Routine & Live Ring</h2>
        <CircularTimer blocks={combinedBlocks} />

        {/* Add Task Form */}
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

        {/* Task List */}
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

      {/* Trip Results & NAVER Map Button */}
      {result && lastPlan && (
        <section className="card" style={{ marginTop: 20 }}>
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