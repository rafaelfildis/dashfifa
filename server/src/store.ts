import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mapLimit } from './http.js';
import {
  fetchEsportsBattleLive,
  fetchEsportsBattleTournament,
  listEsportsBattleTournamentsForDay,
  type TournamentRef,
} from './sources/esportsbattle.js';
import { fetchGtLeaguesDay, fetchGtLeaguesLive } from './sources/gtleagues.js';
import { fetchH2hgglDay, fetchH2hgglLive } from './sources/h2hggl.js';
import type { LeagueId, Match } from '../../shared/types.js';

const DATA_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'data');
const HISTORY_FILE = join(DATA_DIR, 'history.json');

const LIVE_TTL_MS = 15_000;
const HISTORY_REFRESH_MS = 10 * 60 * 1000;
const HISTORY_DAYS = Number(process.env.HISTORY_DAYS ?? 45);

/** A day only stops changing once it is well past; until then, always refetch. */
const SETTLE_MS = 36 * 60 * 60 * 1000;

const matches = new Map<string, Match>();
/** Units of work already pulled in full, so a rerun only fetches what is new. */
const doneUnits = new Set<string>();

let liveSnapshot: Match[] = [];
let liveFetchedAt = 0;
let liveInFlight: Promise<Match[]> | null = null;

let historyState: 'empty' | 'loading' | 'ready' = 'empty';
let historyUpdatedAt = 0;
let backfilling = false;

function absorb(incoming: Match[]) {
  for (const m of incoming) {
    const existing = matches.get(m.id);
    // A finished record always wins over an earlier live/scheduled one.
    if (existing && existing.status === 'finished' && m.status !== 'finished') continue;
    matches.set(m.id, m);
  }
}

function windowStart(): number {
  return Date.now() - HISTORY_DAYS * 24 * 60 * 60 * 1000;
}

function isSettled(dateIso: string): boolean {
  return new Date(dateIso).getTime() < Date.now() - SETTLE_MS;
}

function daysBack(days: number): string[] {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    return d.toISOString().slice(0, 10);
  });
}

async function persist() {
  try {
    await mkdir(DATA_DIR, { recursive: true });
    const cutoff = windowStart();
    const kept = Array.from(matches.values()).filter(
      (m) => new Date(m.playedAt).getTime() >= cutoff,
    );
    await writeFile(
      HISTORY_FILE,
      JSON.stringify({ units: Array.from(doneUnits), matches: kept }),
      'utf8',
    );
  } catch (err) {
    console.error('[dashfifa] could not persist history:', err);
  }
}

export async function loadPersistedHistory() {
  try {
    const raw = JSON.parse(await readFile(HISTORY_FILE, 'utf8'));
    // Older builds wrote a bare array; accept both shapes.
    const stored: Match[] = Array.isArray(raw) ? raw : raw.matches;
    const units: string[] = Array.isArray(raw) ? [] : (raw.units ?? []);
    absorb(stored);
    for (const u of units) doneUnits.add(u);
    if (matches.size > 0) historyState = 'ready';
    console.log(`[dashfifa] loaded ${matches.size} matches, ${doneUnits.size} units from disk`);
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

/**
 * Pulls every unit in the window that we have not already completed. Units from
 * the last day and a half are always refetched, since matches are still landing.
 */
export async function backfillHistory() {
  if (backfilling) return;
  backfilling = true;
  if (matches.size === 0) historyState = 'loading';

  const startedAt = Date.now();
  let fetched = 0;

  try {
    const days = daysBack(HISTORY_DAYS);

    // Listing per day is cached too, so a later run only asks about new days.
    const listings = await mapLimit(
      days.filter((d) => !doneUnits.has(`ebday:${d}`)),
      3,
      async (day) => {
        try {
          const refs = await listEsportsBattleTournamentsForDay(day);
          if (isSettled(`${day}T23:59:59Z`)) doneUnits.add(`ebday:${day}`);
          return refs;
        } catch (err) {
          console.error(`[dashfifa] esportsbattle listing ${day} failed:`, (err as Error).message);
          return [] as TournamentRef[];
        }
      },
    );

    const pending = listings.flat().filter((t) => !doneUnits.has(`eb:${t.id}`));
    await mapLimit(pending, 5, async (t) => {
      const found = await settle(
        `esportsbattle tournament ${t.id}`,
        fetchEsportsBattleTournament(t),
      );
      if (found.length > 0) {
        absorb(found);
        fetched += found.length;
        if (isSettled(t.startDate)) doneUnits.add(`eb:${t.id}`);
      }
    });

    await mapLimit(
      days.filter((d) => !doneUnits.has(`gt:${d}`)),
      3,
      async (day) => {
        const found = await settle(`gtleagues ${day}`, fetchGtLeaguesDay(day));
        absorb(found);
        fetched += found.length;
        if (isSettled(`${day}T23:59:59Z`)) doneUnits.add(`gt:${day}`);
      },
    );

    await mapLimit(
      days.filter((d) => !doneUnits.has(`h2h:${d}`)),
      3,
      async (day) => {
        const found = await settle(`h2hggl ${day}`, fetchH2hgglDay(day));
        absorb(found);
        fetched += found.length;
        if (isSettled(`${day}T23:59:59Z`)) doneUnits.add(`h2h:${day}`);
      },
    );

    historyState = 'ready';
    historyUpdatedAt = Date.now();
    const seconds = Math.round((Date.now() - startedAt) / 1000);
    console.log(
      `[dashfifa] backfill done in ${seconds}s: +${fetched} fetched, ${matches.size} stored`,
    );
    await persist();
  } finally {
    backfilling = false;
  }
}

export function startBackgroundJobs() {
  void backfillHistory();
  setInterval(() => void backfillHistory(), HISTORY_REFRESH_MS);
}

export function historyStatus() {
  const times = Array.from(matches.values(), (m) => new Date(m.playedAt).getTime());
  return {
    state: historyState,
    matches: matches.size,
    updatedAt: historyUpdatedAt,
    windowDays: HISTORY_DAYS,
    backfilling,
    from: times.length ? new Date(Math.min(...times)).toISOString() : null,
    to: times.length ? new Date(Math.max(...times)).toISOString() : null,
  };
}

export function matchesInLeague(leagueId: LeagueId): Match[] {
  return Array.from(matches.values()).filter((m) => m.leagueId === leagueId);
}

export function finishedInLeague(leagueId: LeagueId): Match[] {
  return matchesInLeague(leagueId).filter(
    (m) => m.status === 'finished' && m.home.score != null && m.away.score != null,
  );
}
