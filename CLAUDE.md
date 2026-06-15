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

### 2026-06-14 — Match Heatmap had no UI entry point
**Symptom:** The `/match-heatmap` screen (shipped in recon #2) was registered in `app/_layout.tsx` but nothing in the app linked to it — only reachable by typing the URL.
**Root cause:** Screen + route registered, but no nav button/drawer entry was ever wired in.
**Fix:** Added a `🔥 Heatmap →` pill to each match row in `components/MatchTimelineSection.tsx` (shown on `worldcup-table`). It `router.push`es `{ pathname: '/match-heatmap', params: { fixtureId } }`; the screen reads `fixtureId` via `useLocalSearchParams` and preselects that game (`selected ?? fixtureId`, so a tab tap still overrides). Added `tlHeatmap` to all 11 i18n languages.
**Lesson:** Only render a feature's entry point for data that exists — the button is gated by `FIXTURES_WITH_HEAT = new Set(MATCH_STATS.map(m => m.fixtureId))` (9 played/live games) so a tap never lands on the empty "No match stats yet" screen. The heatmap is a *model* from full-match aggregates (possession/shots/xG in `lib/heatmap.ts`), so it works for FINISHED matches too — that's its best use, not just live.

### 2026-06-14 — Expo typed routes go stale after adding a screen
**Symptom:** `tsc --noEmit` errored: `'/match-heatmap' is not assignable` to the generated route union, even though the route exists and works.
**Root cause:** Expo Router's typed-route union is generated output that only refreshes on `expo start`; a screen added in a prior session left the types stale.
**Fix:** Cast the nav call `as any` — the existing codebase convention (see `app/index.tsx:404`). Route is valid; types regenerate on next `expo start`.
**Lesson:** A stale typed-route error on a route you know exists is not a real bug — cast `as any` per convention, don't restructure navigation.

### 2026-06-15 — Pass Map blank for a live, not-yet-baked match (Sweden v Tunisia)
**Symptom:** The 🕸 Pass Map tab showed "No passing data for this match yet" for Sweden v Tunisia, while every other tab (Overview, Heatmap, Shots…) rendered fine for the same game.
**Root cause:** Pass Map was the *only* tab that re-derived team stats from the pre-baked static `MATCH_STATS`/`PLAYER_MATCH_STATS` by `fixtureId` (`passStructure(match.fixtureId, team)`), instead of using the live `match` object the screen already holds. A matchday-1 game still in progress isn't baked into `matchStatsData.ts` yet — it only exists as a live overlay from `/api/match-stats` (web) — so the static lookup missed and `passStructure` returned `null`.
**Fix:** Added an optional `liveStats?: TeamMatchStats` fallback to `passStructure` (`teamMatchStats(...) ?? liveStats ?? null`); `PassMapModule` now passes `side === 'home' ? match.homeStats : match.awayStats`. Team-level cards now render from the live feed. Per-player nodes still come only from `PLAYER_MATCH_STATS` (no per-player live feed — stay honest), so the pitch shows a note ("Per-player passing map appears once the match is finalised") instead of a blank screen.
**Lesson:** When a component is handed a live `match`/data object, use it directly — don't re-look-up the same entity from static files by id, or you go blank for anything not yet synced. Check whether sibling tabs/components already do it the right way.

### 2026-06-15 — Heatmap 7-tab bar overflowed off-screen on mobile
**Symptom:** On a phone, only the first ~4.5 heatmap tabs (Overview…part of Shots) were reachable; Pass Map and Players were cut off with no way to reach them.
**Root cause:** The tab bar was a fixed `<View flexDirection:'row'>` — fine on a wide laptop, but it overflowed the narrow viewport with no scroll.
**Fix:** Converted it to a horizontal `ScrollView` (the *exact* pattern the match picker right above it already uses: `horizontal showsHorizontalScrollIndicator={false}`, `flexGrow:0`, bottom border moved to the scroll-container style so the divider still spans full width).
**Lesson:** For a row of chips/tabs that can outgrow the screen, copy the existing horizontal-`ScrollView` picker pattern in the same file rather than inventing layout — consistency + already-proven on mobile.

## Match Heatmap — Tab Architecture (`app/match-heatmap.tsx`)
The screen is the in-app "Lili match timeline" intel hub. It has **7 tabs** (the `TABS` array), each rendered by its own component and backed by an honest model in `lib/`:
1. **📊 Overview** — `OverviewModule` ← `lib/matchOverview.ts` · "why did this team win & what does it mean for the WC?": stat pairs, control %, verdict, drivers, events, standings/qualification impact.
2. **Heatmap** — `Pitch` + `Momentum` ← `lib/heatmap.ts` + `lib/matchMomentum.ts` · territory/pressure map *modelled* from possession, shots in/out box, on-goal, corners, xG + formation prior (NOT optical tracking). Blue=home, red=away, purple=contested.
3. **🏟 Home Edge** — `HomeEdgeModule` ← `lib/homeEdge.ts` · **tournament-wide** (no picker/pitch): does being the home side confer an edge this tournament? Impact % mirrors the sim's win-prob change.
4. **⚔️ Attack Zones** — `AttackZonesModule` ← `lib/attackZones.ts` · "where does this team create danger?": only bands we truly have — inside box, from distance, wide/corners. No invented left/right split.
5. **🎯 Shots** — `ShotsModule` ← `lib/shotsModel.ts` · shot splits, conversion, xG, Danger Index, finishing efficiency, GK saves vs xGA. Plotted by **area**, never fake coordinates.
6. **🕸 Pass Map** — `PassMapModule` ← `lib/passStructure.ts` · real per-player passes/accuracy + possession, laid out by formation role. **No fabricated who→whom links.** Connectivity Score, Team Style.
7. **👤 Players** — `PlayersModule` ← `lib/playerImpact.ts` · **tournament-wide** (uses selected match for hero/contributors): goals, assists, saves, ratings, clean sheets.

**Unifying principle (the whole point of these tabs):** every panel is an honest *model* from real api-football aggregates / committed data — we have NO player tracking or shot/pass coordinates, so we never fabricate positions, pixel-exact locations, or pass-pair lines. Each `lib/` model's header comment states exactly what real signal it's allowed to use. Preserve this when extending any tab.

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
