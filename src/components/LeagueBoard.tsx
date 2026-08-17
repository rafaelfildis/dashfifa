import { useEffect, useState } from 'react';
import { fetchLive } from '../lib/api';
import type { League, LiveResponse, Match } from '../types';

const REFRESH_MS = 15_000;

function formatClock(match: Match, now: number): string {
  if (match.status === 'finished') return 'Final';
  if (match.status === 'scheduled') {
    return new Date(match.playedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  const elapsedMs = Math.max(0, now - new Date(match.playedAt).getTime());
  const totalSeconds = Math.floor(elapsedMs / 1000);
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function MatchRow({ match, now }: { match: Match; now: number }) {
  return (
    <div className="match-row">
      <div className="match-row__teams">
        <div className="match-row__team">
          <span className="team-name">{match.home.team}</span>
          <span className="player-name">({match.home.player})</span>
        </div>
        <div className="match-row__team">
          <span className="team-name">{match.away.team}</span>
          <span className="player-name">({match.away.player})</span>
        </div>
      </div>
      <div className="match-row__scores">
        <span>{match.home.score ?? '-'}</span>
        <span>{match.away.score ?? '-'}</span>
      </div>
      <div className="match-row__clock">
        <span className={match.status === 'live' ? 'clock live' : 'clock'}>{formatClock(match, now)}</span>
      </div>
    </div>
  );
}

function LeagueSection({ league, matches, now }: { league: League; matches: Match[]; now: number }) {
  if (matches.length === 0) return null;
  return (
    <section className="league-section">
      <header className="league-section__header">
        <span>{league.name} - {league.matchMinutes} minutos de jogo</span>
        <span className="league-section__odds-label">{matches.length} jogos</span>
      </header>
      <div className="league-section__matches">
        {matches.map((m) => (
          <MatchRow key={m.id} match={m} now={now} />
        ))}
      </div>
    </section>
  );
}

export function LeagueBoard() {
  const [data, setData] = useState<LiveResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const live = await fetchLive();
        if (!cancelled) {
          setData(live);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
      }
    }

    load();
    const interval = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);

  if (error) return <p className="league-board__error">Não foi possível carregar os jogos: {error}</p>;
  if (!data) return <p className="league-board__loading">Carregando jogos ao vivo...</p>;

  const liveOrUpcoming = data.matches.filter((m) => m.status !== 'finished');

  return (
    <div className="league-board">
      {data.leagues.map((league) => (
        <LeagueSection
          key={league.id}
          league={league}
          matches={liveOrUpcoming.filter((m) => m.leagueId === league.id)}
          now={now}
        />
      ))}
    </div>
  );
}
