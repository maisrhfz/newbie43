"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useNotification() {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    typeof window !== "undefined" && "Notification" in window ? Notification.permission : "unsupported"
  );
  const firedKeysRef = useRef<Set<string>>(new Set());

  const requestPermission = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setPermission("unsupported");
      return;
    }
    const result = await Notification.requestPermission();
    setPermission(result);
  }, []);

  const notifyOnce = useCallback((key: string, title: string, options?: NotificationOptions) => {
    if (firedKeysRef.current.has(key)) return;
    firedKeysRef.current.add(key);
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      new Notification(title, options);
    }
  }, []);

  useEffect(() => {
    return () => { firedKeysRef.current.clear(); };
  }, []);

  return { permission, requestPermission, notifyOnce };
}