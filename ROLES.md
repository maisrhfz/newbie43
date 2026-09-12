# Team split — 4 roles

`main` (and every branch — they're all identical right now) has just the scaffold:
project configs, the shared contracts everyone codes against, base theme/utility CSS, and
placeholder pages. **No feature code is written yet — that's on your team.** This file is
the spec for what each branch should end up building, not a description of code that
already exists.

## Already in the scaffold (don't build these — just use them)

- `frontend/lib/types.ts`: `LatLng = { lat: number; lng: number }`,
  `TransportMode = "walk" | "transit" | "drive"`.
- `frontend/app/globals.css`: CSS variables for the theme (light + `[data-theme="dark"]`),
  plus shared utility classes already styled — `.field`, `.btn`, `.btn-primary`,
  `.btn-secondary`, `.hint`, `.hint-error`, `input`/`select`. Reuse these instead of
  reinventing form/button styles; add your own component-specific classes below them.
- Placeholder `app/page.tsx` / `app/layout.tsx` on both projects, and the config files
  (`package.json`, `tsconfig.json`, etc.) — already correct, no changes needed there unless
  you need a new dependency.

## The contract everyone must match

`POST /api/route`

Request: `{ origin: LatLng, destination: LatLng, eventTime: string (ISO), bufferMinutes: number, mode: TransportMode }`

Response (suggested shape — Role 2 owns the exact fields, but the frontend roles should
expect something like this): `{ estimate: {...}, eventTime, bufferMinutes, departureDeadline, odsayConfigured }`

**Agree on the exact response shape as a team before Role 2 starts** — everyone else builds
against whatever you settle on.

---

## Role 1 — Location Input

**Branch:** `feature/location-input`

**Build:**
- `hooks/useGeolocation.ts` — wrap the browser Geolocation API
  (`navigator.geolocation.getCurrentPosition`). Return status/coords/error, don't throw.
- `lib/presets.ts` — a short list of `{ id, label, coords }` for places near the venue
  (정운오IT교양관, 안암역, 고려대역, KU main gate — look up real coordinates).
- `components/LocationPicker.tsx` — a geolocation button + a preset dropdown + a manual
  lat/lng fallback (always visible, not just on geolocation failure — permission gets
  denied a lot during demos). Resolves to a `LatLng` + a label, reported up to whoever uses
  it via a callback prop.

**Test it:** temporarily render `<LocationPicker />` from the placeholder `app/page.tsx` to
see it work in isolation, or wait for Role 4's form to wire it in for real.

---

## Role 2 — Transit Routing & ETA API

**Branch:** `feature/routing-api`

**Build:**
- `lib/geo.ts` — haversine distance between two `LatLng`s, and a walking-time estimate.
- `lib/odsay.ts` — wrapper around [ODsay Lab](https://lab.odsay.com)'s API
  (`pointSearch` for nearby stations, `searchPubTransPathT` for a transit route) —
  needs `ODSAY_API_KEY`.
- `lib/transit.ts` — the estimator: real ODsay routing when a key is configured, otherwise
  (or if ODsay fails/finds no path) a fallback estimate from `lib/geo.ts`, so the demo never
  hard-fails without a key.
- `lib/time.ts` — `computeDepartureDeadline(eventTime, totalTravelMinutes, bufferMinutes)`:
  event time minus (travel time + buffer).
- `app/api/route/route.ts` — the actual endpoint: validate the request, call your
  estimator + deadline function, return JSON, with CORS headers (the frontend is a
  different domain).

**Test it:** `curl` against `http://localhost:4000/api/route` directly — no frontend
needed.

---

## Role 3 — Departure Countdown & Alerts

**Branch:** `feature/departure-countdown`

**Build:**
- `hooks/useCountdown.ts` — a hook that re-renders once a second (`setInterval` +
  `useState`) so a countdown can update live.
- `hooks/useNotification.ts` — wrap the browser `Notification` API: request permission,
  fire once (dedupe so it doesn't spam while re-rendering).
- `lib/time.ts` (frontend copy — separate file from the backend's) — display helpers:
  format a clock time, format "Xh Ym" countdowns, and bucket minutes-left into an urgency
  level (e.g. plenty / soon / leave-now / late).
- `components/DepartureBanner.tsx` — takes `eventTime` + `departureDeadline` as props,
  shows a live color-coded countdown, fires a notification once it's urgent.

**Test it:** render `<DepartureBanner eventTime={...} departureDeadline={...} />` with
hardcoded props near-future to see the urgency colors and alert fire.

---

## Role 4 — Trip Form, Theme & Integration

**Branch:** `feature/app-shell`

**Build:**
- `components/EventForm.tsx` — event time input, buffer-minutes input, walk/transit/drive
  toggle, and two `LocationPicker`s (from Role 1) for origin/destination. Submits a
  `{ origin, destination, eventTime, bufferMinutes, mode }`-shaped object up.
- `components/ThemeToggle.tsx` — light/dark toggle using a `data-theme` attribute on
  `<html>` + `localStorage`.
- Real `app/layout.tsx` — header with the toggle, footer.
- Real `app/page.tsx` — renders `EventForm`, calls `POST /api/route` on the backend
  (`fetch`, using `NEXT_PUBLIC_API_BASE_URL` as the base URL since it's a different
  domain), and renders `DepartureBanner` (Role 3) with the result.

**Heads up:** this is the integration point — it needs Location, Routing, and Countdown to
exist to actually run end-to-end. Build against stubs/hardcoded data first if the others
aren't done yet, then swap in the real imports once their branches are merged.

---

## Suggested workflow

1. Agree on the exact `/api/route` response shape as a team before anyone writes code.
2. Everyone branches off `main`, builds their piece, pushes, opens a PR.
3. Merge order: Location + Routing first (fully independent of everything else), then
   Countdown, then App Shell last (it's the one that actually needs the others).
4. Rebase or merge `main` into your branch if you're still working after another PR lands,
   so you're building against the latest merged code.
5. Leave real time before the submission deadline to run the whole thing together — that's
   when integration bugs between roles show up.
