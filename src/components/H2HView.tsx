import { useEffect, useMemo, useState } from 'react';
import { fetchH2H, fetchPlayers } from '../lib/api';
import type { H2HResponse, LeagueId } from '../types';

const LEAGUE_OPTIONS: { id: LeagueId; name: string }[] = [
  { id: 'battle', name: 'E-Soccer Battle' },
  { id: 'gt-leagues', name: 'GT Leagues' },
  { id: 'h2h-gg', name: 'H2H GG League' },
  { id: 'battle-volta', name: 'Battle Volta' },
];

export function H2HView() {
  const [league, setLeague] = useState<LeagueId>('h2h-gg');
  const [players, setPlayers] = useState<string[]>([]);
  const [playerA, setPlayerA] = useState('');
  const [playerB, setPlayerB] = useState('');
  const [summary, setSummary] = useState<H2HResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setPlayers([]);
    setPlayerA('');
    setPlayerB('');
    setSummary(null);

    fetchPlayers(league)
      .then((names) => {
        if (cancelled) return;
        setPlayers(names);
        if (names.length >= 2) {
          setPlayerA(names[0]);
          setPlayerB(names[1]);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Erro ao carregar jogadores');
      });

    return () => {
      cancelled = true;
    };
  }, [league]);

  const sameSelection = playerA !== '' && playerA === playerB;

  useEffect(() => {
    if (!playerA || !playerB || sameSelection) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchH2H(playerA, playerB, league)
      .then((res) => {
        if (!cancelled) setSummary(res);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Erro ao carregar H2H');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [playerA, playerB, league, sameSelection]);

  const finishedMatches = useMemo(
    () => summary?.matches.filter((m) => m.status === 'finished') ?? [],
    [summary],
  );

  return (
    <div className="h2h-view">
      <div className="h2h-view__league">
        <select value={league} onChange={(e) => setLeague(e.target.value as LeagueId)}>
          {LEAGUE_OPTIONS.map((l) => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </select>
      </div>

      <div className="h2h-view__selectors">
        <select value={playerA} onChange={(e) => setPlayerA(e.target.value)} disabled={players.length === 0}>
          {players.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <span className="h2h-view__vs">VS</span>
        <select value={playerB} onChange={(e) => setPlayerB(e.target.value)} disabled={players.length === 0}>
          {players.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      {players.length === 0 && !error && <p className="h2h-view__hint">Carregando jogadores...</p>}
      {error && <p className="h2h-view__hint">{error}</p>}
      {sameSelection && <p className="h2h-view__hint">Selecione dois jogadores diferentes para comparar.</p>}

      {!sameSelection && loading && <p className="h2h-view__hint">Calculando confronto...</p>}

      {!sameSelection && summary && !loading && (
        <>
          <div className="h2h-summary">
            <div className="h2h-summary__card">
              <span className="h2h-summary__name">{summary.playerA}</span>
              <span className="h2h-summary__stat">{summary.winsA} vitórias</span>
              {summary.goalsA != null && <span className="h2h-summary__goals">{summary.goalsA} gols</span>}
            </div>
            <div className="h2h-summary__draws">
              <span>{summary.draws}</span>
              <span className="h2h-summary__draws-label">empates</span>
            </div>
            <div className="h2h-summary__card">
              <span className="h2h-summary__name">{summary.playerB}</span>
              <span className="h2h-summary__stat">{summary.winsB} vitórias</span>
              {summary.goalsB != null && <span className="h2h-summary__goals">{summary.goalsB} gols</span>}
            </div>
          </div>

          {summary.source === 'sampled' && (
            <p className="h2h-view__hint">
              Amostra coletada desde que o dashboard está rodando (esta liga não expõe histórico H2H via API).
            </p>
          )}

          <div className="h2h-history">
            <h3>Confrontos encerrados ({finishedMatches.length})</h3>
            {finishedMatches.length === 0 ? (
              <p className="h2h-view__hint">Nenhum confronto encerrado registrado ainda entre esses jogadores.</p>
            ) : (
              <ul>
                {finishedMatches.map((m) => (
                  <li key={m.id} className="h2h-history__row">
                    <span className="h2h-history__match">
                      {m.home.team} ({m.home.player}) {m.home.score} x {m.away.score} ({m.away.player}) {m.away.team}
                    </span>
                    <span className="h2h-history__status">{new Date(m.playedAt).toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
