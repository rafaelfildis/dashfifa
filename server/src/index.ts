import cors from 'cors';
import express from 'express';
import { getHistory, getLiveMatches } from './cache.js';
import { LEAGUES } from './leagues.js';
import { fetchH2hgglParticipantNames, fetchH2hgglPastMatches } from './sources/h2hggl.js';
import type { LeagueId, Match } from './types.js';

const app = express();
app.use(cors());

const PORT = Number(process.env.PORT ?? 3001);

app.get('/api/live', async (_req, res) => {
  try {
    const matches = await getLiveMatches();
    res.json({ leagues: LEAGUES, matches });
  } catch (err) {
    res.status(502).json({ error: 'Failed to fetch live data', detail: String(err) });
  }
});

app.get('/api/players', async (req, res) => {
  const league = req.query.league as LeagueId | undefined;

  if (league === 'h2h-gg') {
    try {
      const names = await fetchH2hgglParticipantNames();
      res.json(names.sort());
      return;
    } catch (err) {
      res.status(502).json({ error: 'Failed to fetch player list', detail: String(err) });
      return;
    }
  }

  const pool = league ? getHistory().filter((m) => m.leagueId === league) : getHistory();
  const names = new Set<string>();
  for (const m of pool) {
    names.add(m.home.player);
    names.add(m.away.player);
  }
  res.json(Array.from(names).sort());
});

function aggregateFromHistory(matches: Match[], a: string, b: string) {
  const played = matches.filter((m) => {
    const players = [m.home.player, m.away.player];
    return players.includes(a) && players.includes(b) && a !== b;
  });

  let winsA = 0;
  let winsB = 0;
  let draws = 0;
  let goalsA = 0;
  let goalsB = 0;

  for (const m of played) {
    const aIsHome = m.home.player === a;
    const scoreA = aIsHome ? m.home.score : m.away.score;
    const scoreB = aIsHome ? m.away.score : m.home.score;
    if (scoreA == null || scoreB == null) continue;

    goalsA += scoreA;
    goalsB += scoreB;

    if (m.status !== 'finished') continue;
    if (scoreA > scoreB) winsA += 1;
    else if (scoreB > scoreA) winsB += 1;
    else draws += 1;
  }

  return { playerA: a, playerB: b, winsA, winsB, draws, goalsA, goalsB, matches: played, source: 'sampled' as const };
}

app.get('/api/h2h', async (req, res) => {
  const league = req.query.league as LeagueId | undefined;
  const a = req.query.a as string | undefined;
  const b = req.query.b as string | undefined;

  if (!a || !b) {
    res.status(400).json({ error: 'Missing query params a and b' });
    return;
  }

  if (league === 'h2h-gg') {
    try {
      const pastA = await fetchH2hgglPastMatches(a);

      const headToHeadMatches = pastA
        .filter((m) => m.participantAName === b || m.participantBName === b)
        .map((m): Match => {
          const aIsSideA = m.participantAName === a;
          return {
            id: `h2h-${m.externalId}`,
            leagueId: 'h2h-gg',
            playedAt: m.startDate,
            status: m.matchStatus === 'MATCH_ENDED' ? 'finished' : 'scheduled',
            home: {
              player: aIsSideA ? a : b,
              team: aIsSideA ? m.teamAName : m.teamBName,
              score: aIsSideA ? m.teamAScore : m.teamBScore,
            },
            away: {
              player: aIsSideA ? b : a,
              team: aIsSideA ? m.teamBName : m.teamAName,
              score: aIsSideA ? m.teamBScore : m.teamAScore,
            },
          };
        });

      const aggregated = aggregateFromHistory(headToHeadMatches, a, b);
      res.json({ ...aggregated, source: 'native' });
      return;
    } catch (err) {
      res.status(502).json({ error: 'Failed to fetch H2H GG League pairwise stats', detail: String(err) });
      return;
    }
  }

  const pool = getHistory().filter((m) => !league || m.leagueId === league);
  res.json(aggregateFromHistory(pool, a, b));
});

app.listen(PORT, () => {
  console.log(`dashfifa server listening on http://localhost:${PORT}`);
});
