export function minutesUntil(target: Date, from: Date = new Date()): number {
  return Math.round((target.getTime() - from.getTime()) / 60000);
}

export type Urgency = "plenty" | "soon" | "leave-now" | "late";

export function urgencyFor(minutesLeft: number): Urgency {
  if (minutesLeft <= 0) return "late";
  if (minutesLeft <= 5) return "leave-now";
  if (minutesLeft <= 20) return "soon";
  return "plenty";
}

export function formatClock(d: Date): string {
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function formatCountdown(minutes: number): string {
  const sign = minutes < 0 ? "-" : "";
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  if (h > 0) return `${sign}${h}h ${m}m`;
  return `${sign}${m}m`;
}