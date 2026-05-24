# Lili Signals

Football prediction learning lab — Expo React Native (TypeScript).

---

## Quick Start

```bash
npm install
npx expo start
```

Scan the QR code in **Expo Go** on your phone.

---

## Environment

Expo requires a `EXPO_PUBLIC_` prefix for client-side env vars. Add both lines to your `.env`:

```
API_KEY=your_key_here
EXPO_PUBLIC_API_KEY=your_key_here
```

The app reads `EXPO_PUBLIC_API_KEY`. Without it, the API check returns `unavailable` and the app runs in demo mode — all screens stay functional.

---

## API

Connects to [football-data.org](https://www.football-data.org/) v4.

| Status | Meaning |
|---|---|
| connected | Live data available |
| unavailable | Network error or key missing — demo mode |
| unauthorized | Key rejected (403/401) — demo mode |

The health check fires on app launch with a 5-second timeout.

---

## Scoring System

| Outcome | Points |
|---|---|
| Exact score | 3 |
| Correct result (W / D / L) | 1 |
| Wrong | 0 |

---

## Brain Folder

The Python companion script writes JSONL files to:

```
GoogleDrive / 00 I Carl / 01 - Training / 25 I Python / 03 - Guides / Lili_Signals_Brain
```

On device, the app maintains its own local brain directory inside the app's document sandbox (`brain/` subfolder). `lib/storageJsonl.ts` handles both the path constant and mobile I/O.

---

## Project Structure

```
app/
  _layout.tsx          Root Stack layout + SafeAreaProvider
  index.tsx            Home — logo, API status, 4 nav cards
  journey.tsx          Favourite Team Journey
  lili-simulation.tsx  Play Against Lili
  cumulative-graph.tsx Cumulative Journey Graph
  worldcup-table.tsx   48-Team World Cup Table

components/
  LogoHeader.tsx       Blue lobster logo + title + subtitle
  ApiStatusCard.tsx    Live API connection indicator
  NavigationCard.tsx   Reusable card with icon, title, chevron

lib/
  apiClient.ts         football-data.org v4 client + health check
  demoData.ts          Fallback data for offline / no-key mode
  scoring.ts           Exact score & result scoring logic
  liliPrediction.ts    Prediction types + Lili placeholder
  simulationEngine.ts  Round-by-round simulation + cumulative scores
  storageJsonl.ts      JSONL read/write (local sandbox + brain path ref)

assets/
  blue_lobster.png     App logo
```

---

## Tech Stack

- Expo SDK 52
- Expo Router 4 (file-based routing)
- React Native 0.76
- TypeScript strict mode
