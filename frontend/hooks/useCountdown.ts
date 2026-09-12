'use client';

import { useState, useEffect } from 'react';

export interface CountdownState {
  secondsRemaining: number | null;
  formattedCountdown: string;
  status: 'safe' | 'warning' | 'urgent' | 'idle';
  bannerBgClass: string;
}

export function useCountdown(latestDeparture: Date | null): CountdownState {
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);
  const [notified, setNotified] = useState<boolean>(false);

  useEffect(() => {
    if (!latestDeparture) {
      setSecondsRemaining(null);
      setNotified(false);
      return;
    }

    const updateCountdown = () => {
      const now = new Date().getTime();
      const diff = Math.floor((latestDeparture.getTime() - now) / 1000);
      setSecondsRemaining(diff);

      // Trigger browser notification when countdown is under 5 minutes (300 seconds)
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

  // Status & Background Colors
  if (secondsRemaining === null) {
    return {
      secondsRemaining: null,
      formattedCountdown: 'Calculating...',
      status: 'idle',
      bannerBgClass: 'bg-slate-700',
    };
  }

  if (secondsRemaining <= 0) {
    return {
      secondsRemaining,
      formattedCountdown: '🚨 You should leave right now!',
      status: 'urgent',
      bannerBgClass: 'bg-red-600 animate-pulse',
    };
  }

  if (secondsRemaining <= 300) {
    const mins = Math.floor(secondsRemaining / 60);
    const secs = secondsRemaining % 60;
    return {
      secondsRemaining,
      formattedCountdown: `Leave in: ${mins}m ${secs < 10 ? '0' : ''}${secs}s`,
      status: 'warning',
      bannerBgClass: 'bg-yellow-500',
    };
  }

  const mins = Math.floor(secondsRemaining / 60);
  const secs = secondsRemaining % 60;
  return {
    secondsRemaining,
    formattedCountdown: `Leave in: ${mins}m ${secs < 10 ? '0' : ''}${secs}s`,
    status: 'safe',
    bannerBgClass: 'bg-emerald-600',
  };
}