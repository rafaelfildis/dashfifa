import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchEsportsBattleHistory, fetchEsportsBattleLive } from './sources/esportsbattle.js';
import { fetchGtLeaguesHistory, fetchGtLeaguesLive } from './sources/gtleagues.js';
import { fetchH2hgglHistory, fetchH2hgglLive } from './sources/h2hggl.js';
import type { LeagueId, Match } from './types.js';

const DATA_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'data');
const HISTORY_FILE = join(DATA_DIR, 'history.json');

const LIVE_TTL_MS = 15_000;
const HISTORY_REFRESH_MS = 10 * 60 * 1000;
const HISTORY_DAYS = 4;

const matches = new Map<string, Match>();

let liveSnapshot: Match[] = [];
let liveFetchedAt = 0;
let liveInFlight: Promise<Match[]> | null = null;

let historyState: 'empty' | 'loading' | 'ready' = 'empty';
let historyUpdatedAt = 0;

function absorb(incoming: Match[]) {
  for (const m of incoming) {
    const existing = matches.get(m.id);
    // A finished record always wins over an earlier live/scheduled one.
    if (existing && existing.status === 'finished' && m.status !== 'finished') continue;
    matches.set(m.id, m);
  }
}

async function persist() {
  try {
    await mkdir(DATA_DIR, { recursive: true });
    await writeFile(HISTORY_FILE, JSON.stringify(Array.from(matches.values())), 'utf8');
  } catch (err) {
    console.error('[dashfifa] could not persist history:', err);
  }
}

export async function loadPersistedHistory() {
  try {
    const raw = await readFile(HISTORY_FILE, 'utf8');
    absorb(JSON.parse(raw) as Match[]);
    if (matches.size > 0) historyState = 'ready';
    console.log(`[dashfifa] loaded ${matches.size} matches from disk`);
  } catch {
    // No cache yet - the first backfill will create it.
  }
}

async function settle(label: string, task: Promise<Match[]>): Promise<Match[]> {
  try {
    return await task;
  } catch (err) {
    console.error(`[dashfifa] ${label} failed:`, err instanceof Error ? err.message : err);
    return [];
  }
}

async function refreshLive(): Promise<Match[]> {
  const results = await Promise.all([
    settle('esportsbattle live', fetchEsportsBattleLive()),
    settle('gtleagues live', fetchGtLeaguesLive()),
    settle('h2hggl live', fetchH2hgglLive()),
  ]);

  const fresh = results.flat();
  if (fresh.length > 0) {
    absorb(fresh);
    liveSnapshot = fresh;
    liveFetchedAt = Date.now();
  }
  return liveSnapshot;
}

export async function getLiveMatches(): Promise<Match[]> {
  if (Date.now() - liveFetchedAt < LIVE_TTL_MS && liveSnapshot.length > 0) return liveSnapshot;
  if (liveInFlight) return liveInFlight;

  liveInFlight = refreshLive().finally(() => {
    liveInFlight = null;
  });
  return liveInFlight;
}

export async function backfillHistory() {
  if (historyState === 'loading') return;
  historyState = matches.size > 0 ? 'ready' : 'loading';
  console.log(`[dashfifa] backfilling ${HISTORY_DAYS} days of history...`);

  const results = await Promise.all([
    settle('esportsbattle history', fetchEsportsBattleHistory(HISTORY_DAYS)),
    settle('gtleagues history', fetchGtLeaguesHistory(HISTORY_DAYS)),
    settle('h2hggl history', fetchH2hgglHistory(HISTORY_DAYS)),
  ]);

  absorb(results.flat());
  historyState = 'ready';
  historyUpdatedAt = Date.now();
  console.log(`[dashfifa] history ready: ${matches.size} matches`);
  await persist();
}

export function startBackgroundJobs() {
  void backfillHistory();
  setInterval(() => void backfillHistory(), HISTORY_REFRESH_MS);
}

export function historyStatus() {
  return { state: historyState, matches: matches.size, updatedAt: historyUpdatedAt };
}

export function matchesInLeague(leagueId: LeagueId): Match[] {
  return Array.from(matches.values()).filter((m) => m.leagueId === leagueId);
}

export function finishedInLeague(leagueId: LeagueId): Match[] {
  return matchesInLeague(leagueId).filter(
    (m) => m.status === 'finished' && m.home.score != null && m.away.score != null,
  );
}
