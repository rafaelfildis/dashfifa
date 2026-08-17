import { leagues } from '../data/seed';
import { getLeague, getPlayer, getTeam, matchesForLeague } from '../lib/stats';
import type { Match } from '../types';

function MatchRow({ match }: { match: Match }) {
  const homeTeam = getTeam(match.home.teamId);
  const awayTeam = getTeam(match.away.teamId);
  const homePlayer = getPlayer(match.home.playerId);
  const awayPlayer = getPlayer(match.away.playerId);

  return (
    <div className="match-row">
      <div className="match-row__teams">
        <div className="match-row__team">
          <span className="team-name">{homeTeam?.name}</span>
          <span className="player-name">({homePlayer?.nickname})</span>
        </div>
        <div className="match-row__team">
          <span className="team-name">{awayTeam?.name}</span>
          <span className="player-name">({awayPlayer?.nickname})</span>
        </div>
      </div>
      <div className="match-row__scores">
        <span>{match.home.score}</span>
        <span>{match.away.score}</span>
      </div>
      <div className="match-row__clock">
        <span className={match.status === 'live' ? 'clock live' : 'clock'}>{match.clock}</span>
      </div>
    </div>
  );
}

export function LeagueBoard() {
  return (
    <div className="league-board">
      {leagues.map((league) => {
        const leagueMatches = matchesForLeague(league.id).filter((m) => m.status !== 'finished');
        if (leagueMatches.length === 0) return null;
        const info = getLeague(league.id);
        return (
          <section key={league.id} className="league-section">
            <header className="league-section__header">
              <span>{info?.name} - {info?.matchMinutes} minutos de jogo</span>
              <span className="league-section__odds-label">1&nbsp;&nbsp;&nbsp;X&nbsp;&nbsp;&nbsp;2</span>
            </header>
            <div className="league-section__matches">
              {leagueMatches.map((m) => (
                <MatchRow key={m.id} match={m} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
