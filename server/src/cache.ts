import type { Match } from './types.js';
import { fetchEsportsBattleMatches } from './sources/esportsbattle.js';
import { fetchGtLeaguesMatches } from './sources/gtleagues.js';
import { fetchH2hgglMatches } from './sources/h2hggl.js';

const REFRESH_INTERVAL_MS = 15_000;
const HISTORY_LIMIT = 2000;

let snapshot: Match[] = [];
let lastFetchedAt = 0;
let inFlight: Promise<Match[]> | null = null;

// Rolling pool of every match we've observed since the server started, used
// as a best-effort source for head-to-head history on leagues that don't
// expose their own pairwise stats API (everything except H2H GG League).
const history = new Map<string, Match>();

async function refresh(): Promise<Match[]> {
  const results = await Promise.allSettled([
    fetchEsportsBattleMatches(),
    fetchGtLeaguesMatches(),
    fetchH2hgglMatches(),
  ]);

  const matches: Match[] = [];
  for (const r of results) {
    if (r.status === 'fulfilled') matches.push(...r.value);
    else console.error('[dashfifa] source fetch failed:', r.reason?.message ?? r.reason);
  }

  for (const m of matches) {
    history.set(m.id, m);
  }
  if (history.size > HISTORY_LIMIT) {
    const overflow = history.size - HISTORY_LIMIT;
    const oldestKeys = Array.from(history.keys()).slice(0, overflow);
    for (const key of oldestKeys) history.delete(key);
  }

  snapshot = matches;
  lastFetchedAt = Date.now();
  return snapshot;
}

export async function getLiveMatches(): Promise<Match[]> {
  const age = Date.now() - lastFetchedAt;
  if (age < REFRESH_INTERVAL_MS && snapshot.length > 0) return snapshot;
  if (inFlight) return inFlight;
  inFlight = refresh().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

export function getHistory(): Match[] {
  return Array.from(history.values());
}
