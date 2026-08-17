import cors from 'cors';
import express from 'express';
import { LEAGUES } from './leagues.js';
import {
  backfillHistory,
  finishedInLeague,
  getLiveMatches,
  historyStatus,
  loadPersistedHistory,
  matchesInLeague,
  startBackgroundJobs,
} from './store.js';
import { buildBaseline, buildStats, type OrientedMatch } from './stats.js';
import type { LeagueId, Match } from './types.js';

const app = express();
app.use(cors());

const PORT = Number(process.env.PORT ?? 3001);
const VALID_LEAGUES = new Set(LEAGUES.map((l) => l.id));

function parseLeague(value: unknown): LeagueId | null {
  return typeof value === 'string' && VALID_LEAGUES.has(value as LeagueId)
    ? (value as LeagueId)
    : null;
}

app.get('/api/leagues', (_req, res) => {
  res.json(
    LEAGUES.map((league) => {
      const finished = finishedInLeague(league.id);
      const players = new Set<string>();
      for (const m of finished) {
        players.add(m.home.player);
        players.add(m.away.player);
      }
      return { ...league, players: players.size, matches: finished.length };
    }),
  );
});

app.get('/api/status', (_req, res) => {
  res.json(historyStatus());
});

app.get('/api/live', async (_req, res) => {
  try {
    const matches = await getLiveMatches();
    res.json({ leagues: LEAGUES, matches });
  } catch (err) {
    res.status(502).json({ error: 'Não foi possível carregar os jogos ao vivo', detail: String(err) });
  }
});

app.get('/api/players', (req, res) => {
  const league = parseLeague(req.query.league);
  if (!league) {
    res.status(400).json({ error: 'Informe uma liga válida' });
    return;
  }

  const counts = new Map<string, number>();
  for (const m of finishedInLeague(league)) {
    counts.set(m.home.player, (counts.get(m.home.player) ?? 0) + 1);
    counts.set(m.away.player, (counts.get(m.away.player) ?? 0) + 1);
  }

  const players = Array.from(counts, ([name, played]) => ({ name, played })).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  res.json(players);
});

app.get('/api/teams', (req, res) => {
  const league = parseLeague(req.query.league);
  if (!league) {
    res.status(400).json({ error: 'Informe uma liga válida' });
    return;
  }

  const player = typeof req.query.player === 'string' ? req.query.player : null;
  const counts = new Map<string, number>();

  for (const m of finishedInLeague(league)) {
    for (const side of [m.home, m.away]) {
      if (player && side.player !== player) continue;
      counts.set(side.team, (counts.get(side.team) ?? 0) + 1);
    }
  }

  const teams = Array.from(counts, ([name, played]) => ({ name, played })).sort(
    (a, b) => b.played - a.played || a.name.localeCompare(b.name),
  );
  res.json(teams);
});

/** Reorients a match so side A is always the first selected player. */
function orient(match: Match, a: string): OrientedMatch {
  const aWasHome = match.home.player === a;
  const sideA = aWasHome ? match.home : match.away;
  const sideB = aWasHome ? match.away : match.home;
  const scoreA = sideA.score ?? 0;
  const scoreB = sideB.score ?? 0;

  return {
    id: match.id,
    playedAt: match.playedAt,
    teamA: sideA.team,
    teamB: sideB.team,
    scoreA,
    scoreB,
    result: scoreA > scoreB ? 'A' : scoreB > scoreA ? 'B' : 'D',
    aWasHome,
    htA: sideA.halftime ?? null,
    htB: sideB.halftime ?? null,
  };
}

app.get('/api/h2h', (req, res) => {
  const league = parseLeague(req.query.league);
  const a = typeof req.query.a === 'string' ? req.query.a : '';
  const b = typeof req.query.b === 'string' ? req.query.b : '';

  if (!league) {
    res.status(400).json({ error: 'Informe uma liga válida' });
    return;
  }
  if (!a || !b || a === b) {
    res.status(400).json({ error: 'Selecione dois jogadores diferentes' });
    return;
  }

  const teamA = typeof req.query.teamA === 'string' && req.query.teamA ? req.query.teamA : null;
  const teamB = typeof req.query.teamB === 'string' && req.query.teamB ? req.query.teamB : null;
  const limit = Math.min(Number(req.query.limit) || 15, 50);

  const leagueMatches = finishedInLeague(league);

  const encounters = leagueMatches
    .filter((m) => {
      const players = [m.home.player, m.away.player];
      return players.includes(a) && players.includes(b);
    })
    .map((m) => orient(m, a))
    .filter((m) => (!teamA || m.teamA === teamA) && (!teamB || m.teamB === teamB))
    .sort((x, y) => new Date(y.playedAt).getTime() - new Date(x.playedAt).getTime());

  const recent = encounters.slice(0, limit);

  const totals = encounters.reduce(
    (acc, m) => {
      if (m.result === 'A') acc.winsA += 1;
      else if (m.result === 'B') acc.winsB += 1;
      else acc.draws += 1;
      acc.goalsA += m.scoreA;
      acc.goalsB += m.scoreB;
      return acc;
    },
    { winsA: 0, winsB: 0, draws: 0, goalsA: 0, goalsB: 0 },
  );

  // Pair samples are often tiny, so each player's whole league record travels
  // alongside as the wider reference.
  const gamesOf = (player: string) =>
    leagueMatches
      .filter((m) => m.home.player === player || m.away.player === player)
      .map((m) => {
        const isHome = m.home.player === player;
        return {
          for: (isHome ? m.home.score : m.away.score) ?? 0,
          against: (isHome ? m.away.score : m.home.score) ?? 0,
        };
      });

  const baseline = { a: buildBaseline(a, gamesOf(a)), b: buildBaseline(b, gamesOf(b)) };

  res.json({
    league,
    playerA: a,
    playerB: b,
    teamA,
    teamB,
    played: encounters.length,
    ...totals,
    matches: recent,
    stats: buildStats(encounters, a, b, baseline),
  });
});

// Kicks the backfill off without holding the request open; poll /api/status.
app.get('/api/refresh', (_req, res) => {
  void backfillHistory();
  res.json(historyStatus());
});

app.listen(PORT, async () => {
  console.log(`dashfifa server on http://localhost:${PORT}`);
  await loadPersistedHistory();
  startBackgroundJobs();
});

// Keep the live board grouped by league without a second round trip.
export type { Match };
