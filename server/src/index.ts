import cors from 'cors';
import express from 'express';
import { computeH2H, playersIn, teamsIn } from '../../shared/h2h.js';
import { LEAGUES } from '../../shared/leagues.js';
import type { LeagueId } from '../../shared/types.js';
import {
  backfillHistory,
  finishedInLeague,
  getLiveMatches,
  historyStatus,
  loadPersistedHistory,
  startBackgroundJobs,
} from './store.js';

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
    res
      .status(502)
      .json({ error: 'Não foi possível carregar os jogos ao vivo', detail: String(err) });
  }
});

app.get('/api/players', (req, res) => {
  const league = parseLeague(req.query.league);
  if (!league) {
    res.status(400).json({ error: 'Informe uma liga válida' });
    return;
  }
  res.json(playersIn(finishedInLeague(league)));
});

app.get('/api/teams', (req, res) => {
  const league = parseLeague(req.query.league);
  if (!league) {
    res.status(400).json({ error: 'Informe uma liga válida' });
    return;
  }
  const player = typeof req.query.player === 'string' ? req.query.player : null;
  res.json(teamsIn(finishedInLeague(league), player));
});

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

  const result = computeH2H(finishedInLeague(league), {
    a,
    b,
    teamA: typeof req.query.teamA === 'string' && req.query.teamA ? req.query.teamA : null,
    teamB: typeof req.query.teamB === 'string' && req.query.teamB ? req.query.teamB : null,
    limit: Math.min(Number(req.query.limit) || 15, 50),
  });

  res.json({ league, ...result });
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
