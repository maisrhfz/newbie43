"use client";

import { useState, useMemo, useEffect } from "react";
import { EventForm, type TripPlan } from "@/components/EventForm";
import { DepartureBanner } from "@/components/DepartureBanner";
import { CircularTimer, type TimeBlock } from "@/components/CircularTimer";
import { GroupMeetupPlanner, type GroupParticipant } from "@/components/GroupMeetupPlanner";
import { MapEmbed } from "@/components/MapEmbed";
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

const timeStringToDecimal = (timeStr: string): number => {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(":").map(Number);
  return (hours || 0) + (minutes || 0) / 60;
};

export default function Home() {
  const [isLoaded, setIsLoaded] = useState(false);

  // Persistent states using localStorage
  const [result, setResult] = useState<ApiResponse | null>(null);
  const [lastPlan, setLastPlan] = useState<TripPlan | null>(null);
  const [tasks, setTasks] = useState<TimeBlock[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Load saved state on mount
  useEffect(() => {
    try {
      const savedTasks = localStorage.getItem("scheduled_tasks");
      if (savedTasks) setTasks(JSON.parse(savedTasks));

      const savedResult = localStorage.getItem("trip_result");
      if (savedResult) setResult(JSON.parse(savedResult));

      const savedPlan = localStorage.getItem("trip_plan");
      if (savedPlan) setLastPlan(JSON.parse(savedPlan));
    } catch {
      // Ignore parse errors
    }
    setIsLoaded(true);
  }, []);

  // Sync state to localStorage
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("scheduled_tasks", JSON.stringify(tasks));
    }
  }, [tasks, isLoaded]);

  useEffect(() => {
    if (isLoaded) {
      if (result) localStorage.setItem("trip_result", JSON.stringify(result));
      else localStorage.removeItem("trip_result");
    }
  }, [result, isLoaded]);

  useEffect(() => {
    if (isLoaded) {
      if (lastPlan) localStorage.setItem("trip_plan", JSON.stringify(lastPlan));
      else localStorage.removeItem("trip_plan");
    }
  }, [lastPlan, isLoaded]);

  const buildShareText = (): string => {
    if (!result || !lastPlan) return "";
    const eventTime = new Date(result.eventTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const lines = [`📍 Heading to ${lastPlan.destinationLabel ?? "the event"} (starts ${eventTime})`];

    const successful = participants
      .filter((p) => p.status === "success" && p.departureDeadline)
      .sort((a, b) => new Date(a.departureDeadline!).getTime() - new Date(b.departureDeadline!).getTime());

    if (successful.length > 0) {
      successful.forEach((p) => {
        const leaveTime = new Date(p.departureDeadline!).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        lines.push(`⏰ ${p.name}: leave by ${leaveTime}`);
      });
    } else {
      const leaveTime = new Date(result.departureDeadline).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      lines.push(`⏰ Leaving by ${leaveTime}`);
    }

    lines.push(`Made with "Will I be late?" 🕒`);
    return lines.join("\n");
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

  // Task Input Form State with minute-level precision
  const [taskLabel, setTaskLabel] = useState("");
  const [startTime, setStartTime] = useState("14:00");
  const [endTime, setEndTime] = useState("16:00");

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

  // Chronologically sorted blocks (susunan ikut masa)
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
    return allBlocks.sort((a, b) => a.startHour - b.startHour);
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
    <main className="page">
      {/* Column 1: Route Calculator & Planner */}
      <section className="card">
        <h1>Departure Planner</h1>
        <p className="subtitle">
          Set your commute route and plan your daily task schedule on a live visual clock ring.
        </p>
        <EventForm onSubmit={handleSubmit} submitting={submitting} />
        {apiError && <p className="hint hint-error" style={{ marginTop: 12 }}>{apiError}</p>}
      </section>

      {/* Column 2: 24-Hour Ring & Modern Task Manager Section */}
      <section className="card">
        <h1>Daily Routine & Live Ring</h1>
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
          <h3 style={{ fontSize: "0.95rem", color: "var(--text-muted)", marginBottom: "12px" }}>
            Today&apos;s Scheduled Tasks
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {!isLoaded ? null : combinedBlocks.length === 0 ? (
              <p style={{ fontSize: "0.85rem", color: "#64748b", fontStyle: "italic" }}>
                No tasks added yet.
              </p>
            ) : (
              combinedBlocks.map((task) => (
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
              ))
            )}
          </div>
        </div>
      </section>

      {/* Side-by-Side Grid for Group Meetup & Trip Breakdown */}
      {lastPlan && (
        <div style={{ gridColumn: "1 / -1", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))", gap: "20px" }}>
          <section className="card">
            <h2>Group meetup</h2>
            <p className="subtitle">Add everyone else coming to this event — we&apos;ll work out each person&apos;s own leave-by time.</p>
            <GroupMeetupPlanner participants={participants} onAdd={addParticipant} onRemove={removeParticipant} />
          </section>

          {result && (
            <section className="card">
              <DepartureBanner eventTime={result.eventTime} departureDeadline={result.departureDeadline} />

              <div className="trip-breakdown" style={{ marginTop: 20 }}>
                <h2>Trip breakdown</h2>
                <ul style={{ paddingLeft: 20, lineHeight: 1.6 }}>
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
        </div>
      )}
    </main>
  );
}