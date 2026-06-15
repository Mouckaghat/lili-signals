import { Platform } from 'react-native';

// The app's own serverless /api/* routes (live scores, match stats, lineups,
// fixture results) are deployed on Vercel. On web the app is served from that
// same origin, so a relative path works and hits the Vercel edge cache. On
// native (iOS/Android) there is no page origin, so we need the absolute
// production URL. Override via EXPO_PUBLIC_API_ORIGIN for preview/staging
// builds (set it to '' to disable native live polling → app stays on the
// committed pre-baked data).
const PROD_ORIGIN = 'https://worldcupilou2.vercel.app';

const NATIVE_ORIGIN = (process.env.EXPO_PUBLIC_API_ORIGIN ?? PROD_ORIGIN).replace(/\/+$/, '');

// '' on web (same-origin relative fetch); the absolute origin on native.
export const API_ORIGIN = Platform.OS === 'web' ? '' : NATIVE_ORIGIN;

// True when the live /api/* routes are reachable for this platform/build:
// always on web; on native only when an origin is configured. Hooks guard on
// this so a build with no origin cleanly falls back to committed data.
export const LIVE_API_ENABLED = Platform.OS === 'web' || NATIVE_ORIGIN.length > 0;

// Build a fetchable URL for an /api/* path that works on web and native.
export function apiUrl(path: string): string {
  return `${API_ORIGIN}${path}`;
}
