# lili_signals — Project Memory
# Claude: read this before touching ANYTHING in this project.

## Project Overview
- What it does: "Worldcupilou" — a football companion app for the 2026 World Cup. Predict scores, play against the in-app predictor ("Lili"), follow a favourite team's journey, and explore tournament intelligence (routes, group drama, stadiums, confederations, world signals).
- Status: Active development. Shipping as iOS/Android (EAS) + web (Vercel). Currently version 1.0.0, build 3.
- **This is an Expo / React Native (TypeScript) app, NOT Python** — ignore the `25 I Python` folder name. There is no venv and no `main.py`.
- Main entry point: `expo-router/entry` (file-based routing). Screens live in `app/`; `app/index.tsx` is the home screen and `app/_layout.tsx` the root layout.

## Session Start Checklist
1. Read this file top to bottom
2. Check `git status`
3. Confirm `node_modules` is installed (`npm install` if missing) — there is NO Python venv
4. Ask "what are we working on today?" before starting anything

## Run / Build / Sync
- Dev: `npx expo start` (scan QR in Expo Go), or `npm run ios` / `npm run android` / `npm run web`
- Web build: `npm run build` (`expo export -p web` → `dist/`), deployed via Vercel (`vercel.json`)
- Live data sync scripts (run with `tsx`, need API key in `.env`):
  - `npm run sync:live` (live scores) — `:dry` and `:test2022` variants exist
  - `npm run build:wc-data` (rebuild generated WC data)
  - other `scripts/sync-*.ts`: fixture results, standings, squads, lineups, injuries, match events, sheets

## Data Architecture
- Tournament data is **pre-built into TypeScript files in `lib/`** (e.g. `standingsData.ts`, `fixtureResultsData.ts`, `playerProfilesData.ts`, `wc-data-generated.ts`) so the app runs with zero runtime lookups. The `scripts/sync-*.ts` bots refresh these files from the live feed.
- Two data sources: the app's launch health check hits **football-data.org v4** (`lib/apiClient.ts`); the **api-football** feed (key in `.env` as `API_KEY`) powers the sync bots.
- No key / network error → app falls back to demo data (`lib/demoData.ts`); all screens stay functional.
- Serverless API routes for web live in `api/` (live scores, lineups, fixture results, tournament intelligence), with Upstash Redis (`lib/redis.ts`) as KV cache.

## Scoring System
- Exact score = 3 pts · Correct result (W/D/L) = 1 pt · Wrong = 0. Logic in `lib/scoring.ts`.

## i18n
- Multilingual via `lib/i18n.ts` + per-domain `*I18n.ts` files (player, stadium, confederation, world signals, travel notes). Keep new user-facing strings translated. See memory `project_i18n_integration.md`.

## Known Issues & Fixes Log
<!-- ### [YYYY-MM-DD] — Issue title
Symptom / Root cause / Fix / Lesson -->
### 2026-06-13 — api-football name/own-goal mismatches
Symptom: live scoring mismatched on abbreviated player names and own goals. Fix: resolve abbreviated names + attribute own-goal to correct team (commit 6bd3db9, live-validated). Lesson: validate sync bots against the live feed before trusting output.

## What's Working (Don't Touch)
- Pre-built squad profiles (all 48 teams) so live scoring needs no lookup.
- Scoring engine (`lib/scoring.ts`) and the generated WC data pipeline.

## Architecture Decisions
- Pre-bake data into committed `.ts` files instead of fetching at runtime → instant, offline-capable app + no API rate-limit exposure on device.
- Quality bar: every new scorer needs a full profile + precise minutes in the **same commit** (see memory `feedback_scorer_quality_standard.md`). No exceptions.
- On any data misalignment, WebSearch the real schedule/draw as the tiebreaker, then fix the wrong local file (memory `feedback_verify_data_against_internet.md`).

## Dependencies & Environment
- Runtime: Node + npm (no Python). TypeScript ~5.3 (strict mode), run scripts via `tsx`.
- Expo SDK ~54 · Expo Router ~6 (file-based routing, typed routes) · React Native 0.81.5 · React 19.1
- Key libs: `@react-navigation/drawer`, `@upstash/redis`, `react-native-reanimated`, `react-native-webview`, `react-native-gesture-handler`; dev: `googleapis`, `dotenv`, `tsx`
- Env: copy keys into `.env` — needs both `API_KEY` and `EXPO_PUBLIC_API_KEY` (Expo only exposes `EXPO_PUBLIC_`-prefixed vars to the client). Private session notes go in `CLAUDE.local.md` (gitignored).
