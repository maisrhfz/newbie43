"use client";

import { useCallback, useState } from "react";
import type { LatLng } from "@/lib/types";

export type GeolocationState = {
  status: "idle" | "loading" | "success" | "error" | "unsupported";
  coords: LatLng | null;
  error: string | null;
};

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    status: "idle",
    coords: null,
    error: null,
  });

  const request = useCallback(() => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setState({ status: "unsupported", coords: null, error: "Geolocation not supported" });
      return;
    }
    setState((s) => ({ ...s, status: "loading", error: null }));
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setState({
          status: "success",
          coords: { lat: pos.coords.latitude, lng: pos.coords.longitude },
          error: null,
        });
      },
      (err) => {
        setState({ status: "error", coords: null, error: err.message });
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
    );
  }, []);

  return { ...state, request };
}