"use client";

import React, { useEffect, useState } from "react";
import { useNow } from "@/hooks/useCountdown";

export type TimeBlock = {
  id: string;
  label: string;
  startHour: number; // e.g. 9.5 for 9:30 AM
  endHour: number;   // e.g. 11.0 for 11:00 AM
  color: string;
};

type Props = {
  blocks?: TimeBlock[];
};

export function CircularTimer({ blocks = [] }: Props) {
  const [isMounted, setIsMounted] = useState(false);
  const now = useNow(1000);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return <div style={{ height: 320 }} />;

  const currentHours = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
  const currentAngle = (currentHours / 24) * 360;

  const getArcPath = (startH: number, endH: number, radius = 120) => {
    const startAngle = (startH / 24) * 360 - 90;
    const endAngle = (endH / 24) * 360 - 90;

    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    const x1 = 150 + radius * Math.cos(startRad);
    const y1 = 150 + radius * Math.sin(startRad);
    const x2 = 150 + radius * Math.cos(endRad);
    const y2 = 150 + radius * Math.sin(endRad);

    const largeArcFlag = endH - startH > 12 ? 1 : 0;

    return `M 150 150 L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
  };

  return (
    <div style={{ textAlign: "center", padding: "10px 0" }}>
      <svg width="280" height="280" viewBox="0 0 300 300" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="150" cy="150" r="130" fill="none" stroke="var(--border)" strokeWidth="4" />
        <circle cx="150" cy="150" r="120" fill="var(--surface)" />

        {blocks.map((block) => (
          <path
            key={block.id}
            d={getArcPath(block.startHour, block.endHour)}
            fill={block.color}
            opacity="0.8"
          >
            <title>{`${block.label} (${block.startHour}:00 - ${block.endHour}:00)`}</title>
          </path>
        ))}

        <circle cx="150" cy="150" r="8" fill="#3b82f6" />

        <line
          x1="150"
          y1="150"
          x2={150 + 110 * Math.cos(((currentAngle - 90) * Math.PI) / 180)}
          y2={150 + 110 * Math.sin(((currentAngle - 90) * Math.PI) / 180)}
          stroke="#ef4444"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>

      <div style={{ marginTop: "12px", fontWeight: "600" }}>
        Current Time: {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
      </div>
    </div>
  );
}