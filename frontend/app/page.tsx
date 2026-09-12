"use client";

import { useState, useMemo } from "react";
import { EventForm, type TripPlan } from "@/components/EventForm";
import { DepartureBanner } from "@/components/DepartureBanner";
import { CircularTimer, type TimeBlock } from "@/components/CircularTimer";
import { MapEmbed } from "@/components/MapEmbed";
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

const formatDecimalToTime = (decimalHours: number): string => {
  const hours = Math.floor(decimalHours);
  const minutes = Math.round((decimalHours - hours) * 60);

  const formattedH = String(hours % 24).padStart(2, "0");
  const formattedM = String(minutes).padStart(2, "0");

  return `${formattedH}:${formattedM}`;
};

const timeStringToDecimal = (timeStr: string): number => {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(":").map(Number);
  return (hours || 0) + (minutes || 0) / 60;
};

export default function Home() {
  const [result, setResult] = useState<ApiResponse | null>(null);
  const [lastPlan, setLastPlan] = useState<TripPlan | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Dynamic To-Do List State
  const [tasks, setTasks] = useState<TimeBlock[]>([
    { id: "1", label: "Morning Study", startHour: 9, endHour: 12, color: "#6366f1" },
    { id: "2", label: "Lunch", startHour: 12, endHour: 13, color: "#10b981" },
  ]);

  // Task Input Form State with minute-level precision
  const [taskLabel, setTaskLabel] = useState("");
  const [startTime, setStartTime] = useState("14:00");
  const [endTime, setEndTime] = useState("16:00");

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
      startHour: timeStringToDecimal(startTime),
      endHour: timeStringToDecimal(endTime),
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
    <main className="page" style={{ maxWidth: 850, margin: "0 auto", padding: 16 }}>
      {/* Route Calculator Card */}
      <section className="card">
        <h1>24-Hour Visual Day & Departure Planner</h1>
        <p className="subtitle">
          Set your commute route and plan your daily task schedule on a live visual clock ring.
        </p>
        <EventForm onSubmit={handleSubmit} submitting={submitting} />
        {apiError && <p className="hint hint-error" style={{ marginTop: 12 }}>{apiError}</p>}
      </section>

      {/* 24-Hour Ring & Modern Task Manager Section */}
      <section className="card" style={{ marginTop: 20 }}>
        <h2>Daily Routine & Live Ring</h2>
        <CircularTimer blocks={combinedBlocks} />

        {/* Modern Control Bar with Precise Time Selection */}
        <form
          onSubmit={handleAddTask}
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "10px",
            alignItems: "center",
            backgroundColor: "rgba(255, 255, 255, 0.03)",
            padding: "10px",
            borderRadius: "16px",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            marginTop: "20px",
            marginBottom: "20px",
          }}
        >
          <input
            type="text"
            placeholder="New task name..."
            value={taskLabel}
            onChange={(e) => setTaskLabel(e.target.value)}
            style={{
              flex: "1 1 200px",
              padding: "10px 14px",
              borderRadius: "10px",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              backgroundColor: "rgba(15, 23, 42, 0.6)",
              color: "#f8fafc",
              fontSize: "0.9rem",
              outline: "none",
            }}
          />

          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              style={{
                padding: "9px 12px",
                borderRadius: "10px",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                backgroundColor: "rgba(15, 23, 42, 0.6)",
                color: "#f8fafc",
                fontSize: "0.9rem",
                outline: "none",
                colorScheme: "dark",
              }}
            />

            <span style={{ color: "#64748b", fontSize: "0.85rem" }}>to</span>

            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              style={{
                padding: "9px 12px",
                borderRadius: "10px",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                backgroundColor: "rgba(15, 23, 42, 0.6)",
                color: "#f8fafc",
                fontSize: "0.9rem",
                outline: "none",
                colorScheme: "dark",
              }}
            />
          </div>

          <button
            type="submit"
            style={{
              padding: "10px 20px",
              borderRadius: "10px",
              border: "none",
              background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
              color: "#ffffff",
              fontWeight: "600",
              fontSize: "0.9rem",
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(99, 102, 241, 0.3)",
            }}
          >
            + Add Task
          </button>
        </form>

        {/* Scheduled Task List */}
        <div>
          <h3 style={{ fontSize: "0.95rem", color: "var(--text-secondary)", marginBottom: "12px" }}>
            Today&apos;s Scheduled Tasks
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {combinedBlocks.map((task) => (
              <div
                key={task.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px 16px",
                  borderRadius: "12px",
                  backgroundColor: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid rgba(255, 255, 255, 0.06)",
                  borderLeft: `4px solid ${task.color}`,
                }}
              >
                <span style={{ fontSize: "0.92rem", color: "#f8fafc" }}>
                  <strong style={{ fontWeight: 600 }}>{task.label}</strong> ({formatDecimalToTime(task.startHour)} – {formatDecimalToTime(task.endHour)})
                </span>
                {task.id !== "commute-naver" && (
                  <button
                    onClick={() => removeTask(task.id)}
                    style={{
                      color: "#ef4444",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontSize: "1.1rem",
                      padding: "0 4px",
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trip Results, Interactive Map & NAVER Button */}
      {result && lastPlan && (
        <section className="card" style={{ marginTop: 20 }}>
          <DepartureBanner eventTime={result.eventTime} departureDeadline={result.departureDeadline} />

          <div className="trip-breakdown" style={{ marginTop: 20 }}>
            <h2>Trip breakdown</h2>
            <ul style={{ paddingLeft: 20, lineHeight: 1.6 }}>
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

            {/* Embedded Live Map Display */}
            {lastPlan.origin && lastPlan.destination && (
              <>
                <MapEmbed origin={lastPlan.origin} destination={lastPlan.destination} />

                <div style={{ marginTop: "1rem" }}>
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
                      padding: "0.85rem",
                      backgroundColor: "#03C75A",
                      color: "#ffffff",
                      fontWeight: "bold",
                      textAlign: "center",
                      borderRadius: "12px",
                      textDecoration: "none",
                      boxShadow: "0 4px 12px rgba(3, 199, 90, 0.25)",
                    }}
                  >
                    🗺️ Open Route in NAVER Map
                  </a>
                </div>
              </>
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