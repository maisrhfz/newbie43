'use client';

import React, { useState, useEffect } from 'react';

interface DepartureBannerProps {
  latestDeparture: Date;
  nearestStation?: string;
  travelTimeMinutes?: number;
  isFallback?: boolean;
}

export default function DepartureBanner({
  latestDeparture,
  nearestStation = 'Local Stop',
  travelTimeMinutes,
  isFallback = false,
}: DepartureBannerProps) {
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);
  const [notified, setNotified] = useState<boolean>(false);

  // Live Ticking Countdown
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date().getTime();
      const diff = Math.floor((latestDeparture.getTime() - now) / 1000);
      setSecondsRemaining(diff);

      // Trigger Browser Notification when under 5 minutes (300 seconds)
      if (diff <= 300 && diff > 0 && !notified) {
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Time to Leave Soon!', {
            body: 'You need to head out shortly to make your event on time.',
          });
          setNotified(true);
        } else if ('Notification' in window && Notification.permission !== 'denied') {
          Notification.requestPermission();
        }
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [latestDeparture, notified]);

  // Color-coded Banner Logic
  const getBannerColor = () => {
    if (secondsRemaining === null) return 'bg-slate-700';
    if (secondsRemaining <= 0) return 'bg-red-600 animate-pulse'; // Urgent / Late
    if (secondsRemaining <= 300) return 'bg-yellow-500'; // Under 5 mins
    return 'bg-emerald-600'; // Safe
  };

  const formatCountdown = (totalSeconds: number) => {
    if (totalSeconds <= 0) return '🚨 You should leave right now!';
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `Leave in: ${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
  };

  return (
    <div className={`p-5 rounded-xl text-white shadow-md transition-colors ${getBannerColor()}`}>
      <div className="text-xs uppercase font-medium opacity-80 tracking-wide">
        Latest Departure Window
      </div>
      
      <div className="text-3xl font-black my-1">
        {latestDeparture.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </div>

      <div className="text-sm font-semibold">
        {secondsRemaining !== null ? formatCountdown(secondsRemaining) : 'Calculating...'}
      </div>

      <div className="mt-3 pt-3 border-t border-white/20 text-xs flex justify-between items-center">
        <span>Stop: {nearestStation}</span>
        {travelTimeMinutes !== undefined && <span>Est. travel: {travelTimeMinutes} mins</span>}
      </div>

      {isFallback && (
        <div className="mt-2 text-[10px] bg-black/20 p-1 rounded text-center">
          ⚠️ Simulated speed route (Add ODSAY_API_KEY for live data)
        </div>
      )}
    </div>
  );
}