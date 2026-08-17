import type { Match } from '../types.js';

const API_BASE = 'https://api.gtleagues.com/api';
const MATCH_MINUTES = 12;
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (dashfifa)',
  Origin: 'https://www.gtleagues.com',
  Referer: 'https://www.gtleagues.com/',
  Accept: 'application/json',
};

interface RawParticipantEntry {
  side: 'home' | 'away';
  participant: {
    player: { nickname: string };
    team: { name: string };
  };
}

interface RawFixture {
  id: string;
  kickoff: string;
  result: { stats: { home_score: number | null; away_score: number | null } };
  participants: RawParticipantEntry[];
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`GT Leagues request failed: ${url} (${res.status})`);
  return res.json() as Promise<T>;
}

function sideOf(fixture: RawFixture, side: 'home' | 'away') {
  const entry = fixture.participants.find((p) => p.side === side);
  return {
    player: entry?.participant.player.nickname ?? '?',
    team: entry?.participant.team.name ?? '?',
  };
}

export async function fetchGtLeaguesMatches(): Promise<Match[]> {
  const now = new Date();
  const from = new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString();
  const to = new Date(now.getTime() + 3 * 60 * 60 * 1000).toISOString();

  const url =
    `${API_BASE}/fixtures?kickoff=between:${from},${to}` +
    `&limit=100&offset=0&sort=-kickoff,-matchNr&status=in:1,2,3,4,5,6`;

  const fixtures = await fetchJson<RawFixture[]>(url);

  return fixtures.map((f): Match => {
    const homeScore = f.result?.stats?.home_score ?? null;
    const awayScore = f.result?.stats?.away_score ?? null;
    const kickoff = new Date(f.kickoff).getTime();
    const finished = homeScore != null && awayScore != null;
    // GT Leagues schedules matches in a queue; kickoff timestamps are nominal
    // slots that slip when earlier matches run long, so only trust "live"
    // within a tight window after the scheduled time (match length + buffer).
    const elapsedMs = now.getTime() - kickoff;
    const isRecentEnoughToBeLive = elapsedMs >= 0 && elapsedMs <= (MATCH_MINUTES + 5) * 60 * 1000;
    const status = finished ? 'finished' : isRecentEnoughToBeLive ? 'live' : 'scheduled';

    const home = sideOf(f, 'home');
    const away = sideOf(f, 'away');

    return {
      id: `gt-${f.id}`,
      leagueId: 'gt-leagues',
      playedAt: f.kickoff,
      status,
      home: { player: home.player, team: home.team, score: homeScore },
      away: { player: away.player, team: away.team, score: awayScore },
    };
  });
}
