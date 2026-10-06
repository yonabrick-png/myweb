// Time helpers shared by the build (vite.config.ts) and the content check.

/** "1:32:30" or "19:45" → seconds. */
export function toSec(t) {
  const parts = String(t).trim().split(':').map(Number);
  if (parts.some((n) => !Number.isFinite(n))) throw new Error(`bad time "${t}"`);
  return parts.reduce((acc, n) => acc * 60 + n, 0);
}

/** seconds → "m:ss" or "h:mm:ss". */
export function fmt(sec) {
  const s = Math.round(sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${r}` : `${m}:${r}`;
}

/** Pace per kilometre as "m:ss". */
export const pacePerKm = (sec, meters) => fmt(sec / (meters / 1000));
