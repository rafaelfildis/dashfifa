import { useMemo, useState } from 'react';
import { players } from '../data/seed';
import { getLeague, getPlayer, getTeam, headToHead } from '../lib/stats';

export function H2HView() {
  const [playerAId, setPlayerAId] = useState(players[0].id);
  const [playerBId, setPlayerBId] = useState(players[1].id);

  const summary = useMemo(() => headToHead(playerAId, playerBId), [playerAId, playerBId]);

  const playerA = getPlayer(playerAId);
  const playerB = getPlayer(playerBId);
  const sameSelection = playerAId === playerBId;

  return (
    <div className="h2h-view">
      <div className="h2h-view__selectors">
        <select value={playerAId} onChange={(e) => setPlayerAId(e.target.value)}>
          {players.map((p) => (
            <option key={p.id} value={p.id}>{p.nickname}</option>
          ))}
        </select>
        <span className="h2h-view__vs">VS</span>
        <select value={playerBId} onChange={(e) => setPlayerBId(e.target.value)}>
          {players.map((p) => (
            <option key={p.id} value={p.id}>{p.nickname}</option>
          ))}
        </select>
      </div>

      {sameSelection ? (
        <p className="h2h-view__hint">Selecione dois jogadores diferentes para comparar.</p>
      ) : (
        <>
          <div className="h2h-summary">
            <div className="h2h-summary__card">
              <span className="h2h-summary__name">{playerA?.nickname}</span>
              <span className="h2h-summary__stat">{summary.winsA} vitórias</span>
              <span className="h2h-summary__goals">{summary.goalsA} gols</span>
            </div>
            <div className="h2h-summary__draws">
              <span>{summary.draws}</span>
              <span className="h2h-summary__draws-label">empates</span>
            </div>
            <div className="h2h-summary__card">
              <span className="h2h-summary__name">{playerB?.nickname}</span>
              <span className="h2h-summary__stat">{summary.winsB} vitórias</span>
              <span className="h2h-summary__goals">{summary.goalsB} gols</span>
            </div>
          </div>

          <div className="h2h-history">
            <h3>Confrontos ({summary.playedMatches.length})</h3>
            {summary.playedMatches.length === 0 ? (
              <p className="h2h-view__hint">Nenhum confronto registrado entre esses jogadores ainda.</p>
            ) : (
              <ul>
                {summary.playedMatches.map((m) => {
                  const league = getLeague(m.leagueId);
                  const homeTeam = getTeam(m.home.teamId);
                  const awayTeam = getTeam(m.away.teamId);
                  const homePlayer = getPlayer(m.home.playerId);
                  const awayPlayer = getPlayer(m.away.playerId);
                  return (
                    <li key={m.id} className="h2h-history__row">
                      <span className="h2h-history__league">{league?.name}</span>
                      <span className="h2h-history__match">
                        {homeTeam?.name} ({homePlayer?.nickname}) {m.home.score} x {m.away.score} ({awayPlayer?.nickname}) {awayTeam?.name}
                      </span>
                      <span className="h2h-history__status">{m.status === 'finished' ? 'encerrado' : m.status === 'live' ? 'ao vivo' : 'agendado'}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
