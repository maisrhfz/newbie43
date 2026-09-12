"use client";

import React, { useEffect, useState } from "react";
import { useNow } from "@/hooks/useCountdown";

export type TimeBlock = {
  id: string;
  label: string;
  startHour: number;
  endHour: number;
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
  
  // 24-hour circle math: 24 hours = 360 degrees. 
  // We subtract 90 degrees so that 00:00 starts at the top (12 o'clock position).
  const currentAngle = (currentHours / 24) * 360 - 90;

  const getArcPath = (startH: number, endH: number, radius = 115) => {
    const startAngle = (startH / 24) * 360 - 90;
    const endAngle = (endH / 24) * 360 - 90;

    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    const x1 = 150 + radius * Math.cos(startRad);
    const y1 = 150 + radius * Math.sin(startRad);
    const x2 = 150 + radius * Math.cos(endRad);
    const y2 = 150 + radius * Math.sin(endRad);

    const diff = endH - startH;
    const largeArcFlag = diff > 12 || (diff < 0 && (24 + diff) > 12) ? 1 : 0;

    return `M 150 150 L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
  };

  return (
    <div style={{ textAlign: "center", padding: "16px 0" }}>
      <svg
        width="290"
        height="290"
        viewBox="0 0 300 300"
        style={{
          filter: "drop-shadow(0px 8px 24px rgba(0, 0, 0, 0.35))",
        }}
      >
        <defs>
          <linearGradient id="ringBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>

          <linearGradient id="handGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ff4b5c" />
            <stop offset="100%" stopColor="#ff6b81" />
          </linearGradient>

          <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        <circle cx="150" cy="150" r="132" fill="none" stroke="#334155" strokeWidth="1.5" opacity="0.6" />
        <circle cx="150" cy="150" r="126" fill="url(#ringBg)" stroke="#1e293b" strokeWidth="4" />

        {/* 24-Hour Tick Marks */}
        {Array.from({ length: 24 }).map((_, i) => {
          const angle = ((i / 24) * 360 - 90) * (Math.PI / 180);
          const x1 = 150 + 120 * Math.cos(angle);
          const y1 = 150 + 120 * Math.sin(angle);
          const x2 = 150 + 124 * Math.cos(angle);
          const y2 = 150 + 124 * Math.sin(angle);
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={i % 6 === 0 ? "#94a3b8" : "#475569"}
              strokeWidth={i % 6 === 0 ? 2 : 1}
              opacity={0.7}
            />
          );
        })}

        {/* Dynamic Task Arcs */}
        {blocks.map((block) => (
          <path
            key={block.id}
            d={getArcPath(block.startHour, block.endHour)}
            fill={block.color}
            opacity="0.85"
            style={{ transition: "all 0.3s ease" }}
          >
            <title>{`${block.label} (${block.startHour}:00 - ${block.endHour}:00)`}</title>
          </path>
        ))}

        <circle cx="150" cy="150" r="75" fill="#0f172a" stroke="#1e293b" strokeWidth="2" />

        {/* Live Sweeping Hand */}
        <line
          x1="150"
          y1="150"
          x2={150 + 112 * Math.cos((currentAngle * Math.PI) / 180)}
          y2={150 + 112 * Math.sin((currentAngle * Math.PI) / 180)}
          stroke="url(#handGradient)"
          strokeWidth="3.5"
          strokeLinecap="round"
          filter="url(#neonGlow)"
        />

        <circle cx="150" cy="150" r="7" fill="#ff4b5c" />
        <circle cx="150" cy="150" r="3" fill="#ffffff" />
      </svg>

      <div
        style={{
          marginTop: "16px",
          fontSize: "1rem",
          fontWeight: "600",
          letterSpacing: "0.05em",
          color: "#f8fafc",
          fontFamily: "monospace",
        }}
      >
        {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
      </div>
    </div>
  );
}