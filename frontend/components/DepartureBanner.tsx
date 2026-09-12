"use client";

import { useEffect } from "react";
import { useNow } from "@/hooks/useCountdown";
import { useNotification } from "@/hooks/useNotification";
import { formatClock, formatCountdown, minutesUntil, urgencyFor } from "@/lib/time";

type Props = { eventTime: string; departureDeadline: string };

const URGENCY_COPY: Record<string, string> = {
  plenty: "You're on track",
  soon: "Get ready to leave",
  "leave-now": "Leave now!",
  late: "You're going to be late",
};

export function DepartureBanner({ eventTime, departureDeadline }: Props) {
  const now = useNow(1000);
  const deadline = new Date(departureDeadline);
  const event = new Date(eventTime);
  const minutesLeft = minutesUntil(deadline, now);
  const urgency = urgencyFor(minutesLeft);
  const { permission, requestPermission, notifyOnce } = useNotification();

  useEffect(() => {
    if (permission === "default") requestPermission();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const key = `${departureDeadline}:${urgency}`;
    if (urgency === "leave-now") {
      notifyOnce(key, "Time to leave!", { body: `Leave now to make it by ${formatClock(event)}.` });
    } else if (urgency === "late") {
      notifyOnce(key, "You're running late", { body: `Departure deadline was ${formatClock(deadline)}.` });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urgency, departureDeadline]);

  return (
    <div className={`departure-banner urgency-${urgency}`} role="status" aria-live="polite">
      <div className="departure-banner-headline">{URGENCY_COPY[urgency]}</div>
      <div className="departure-banner-countdown">
        {urgency === "late" ? "Deadline passed " : "Leave in "}
        <strong>{formatCountdown(minutesLeft)}</strong>
      </div>
      <div className="departure-banner-details">
        Latest departure: <strong>{formatClock(deadline)}</strong> · Event starts <strong>{formatClock(event)}</strong>
      </div>
      {permission === "denied" && (
        <p className="hint">Browser notifications are blocked — keep this tab open to see the countdown update.</p>
      )}
    </div>
  );
}