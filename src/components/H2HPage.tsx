import { useEffect, useState } from 'react';
import { fetchH2H, fetchPlayers, fetchTeams } from '../lib/api';
import { MarketStats } from './MarketStats';
import type { H2HResult, League, NamedCount } from '../types';

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface SideProps {
  side: 'a' | 'b';
  label: string;
  players: NamedCount[];
  teams: NamedCount[];
  player: string;
  team: string;
  onPlayer: (value: string) => void;
  onTeam: (value: string) => void;
}

function SidePicker({ side, label, players, teams, player, team, onPlayer, onTeam }: SideProps) {
  return (
    <div className={`picker picker--${side}`}>
      <span className="picker__label">{label}</span>
      <select
        className="picker__select picker__select--player"
        value={player}
        onChange={(e) => onPlayer(e.target.value)}
        aria-label={label}
      >
        {players.map((p) => (
          <option key={p.name} value={p.name}>
            {p.name}
          </option>
        ))}
      </select>
      <select
        className="picker__select"
        value={team}
        onChange={(e) => onTeam(e.target.value)}
        aria-label={`Time de ${label}`}
      >
        <option value="">Qualquer time</option>
        {teams.map((t) => (
          <option key={t.name} value={t.name}>
            {t.name} ({t.played})
          </option>
        ))}
      </select>
    </div>
  );
}

export function H2HPage({ league, onBack }: { league: League; onBack: () => void }) {
  const [players, setPlayers] = useState<NamedCount[]>([]);
  const [playerA, setPlayerA] = useState('');
  const [playerB, setPlayerB] = useState('');
  const [teamsA, setTeamsA] = useState<NamedCount[]>([]);
  const [teamsB, setTeamsB] = useState<NamedCount[]>([]);
  const [teamA, setTeamA] = useState('');
  const [teamB, setTeamB] = useState('');
  const [result, setResult] = useState<H2HResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchPlayers(league.id)
      .then((list) => {
        if (cancelled) return;
        setPlayers(list);
        setPlayerA(list[0]?.name ?? '');
        setPlayerB(list[1]?.name ?? '');
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [league.id]);

  useEffect(() => {
    if (!playerA) return;
    setTeamA('');
    let cancelled = false;
    fetchTeams(league.id, playerA).then((t) => !cancelled && setTeamsA(t));
    return () => {
      cancelled = true;
    };
  }, [league.id, playerA]);

  useEffect(() => {
    if (!playerB) return;
    setTeamB('');
    let cancelled = false;
    fetchTeams(league.id, playerB).then((t) => !cancelled && setTeamsB(t));
    return () => {
      cancelled = true;
    };
  }, [league.id, playerB]);

  useEffect(() => {
    if (!playerA || !playerB || playerA === playerB) {
      setResult(null);
      return;
    }
    let cancelled = false;
    setError(null);
    fetchH2H(league.id, playerA, playerB, teamA, teamB)
      .then((r) => !cancelled && setResult(r))
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, [league.id, playerA, playerB, teamA, teamB]);

  const sameSelection = playerA !== '' && playerA === playerB;
  const filtered = Boolean(teamA || teamB);
  const total = result ? result.winsA + result.draws + result.winsB : 0;
  const pct = (n: number) => (total > 0 ? (n / total) * 100 : 0);

  return (
    <section className="h2h">
      <header className="h2h__head">
        <button className="backlink" onClick={onBack}>
          <span aria-hidden="true">←</span> Ligas
        </button>
        <div className="h2h__league">
          <h1 className="h2h__league-name">{league.name}</h1>
          <span className="h2h__league-meta">{league.matchMinutes} min · {league.source}</span>
        </div>
      </header>

      {loading && <p className="notice">Carregando jogadores…</p>}
      {error && !loading && <p className="notice notice--warn">{error}</p>}

      {!loading && players.length === 0 && !error && (
        <p className="notice">
          O histórico desta liga ainda está sendo baixado. Volte em alguns instantes.
        </p>
      )}

      {players.length > 0 && (
        <>
          <div className="pitch">
            <div className="pitch__line" aria-hidden="true" />

            <div className="pickers">
              <SidePicker
                side="a"
                label="Jogador A"
                players={players}
                teams={teamsA}
                player={playerA}
                team={teamA}
                onPlayer={setPlayerA}
                onTeam={setTeamA}
              />
              <SidePicker
                side="b"
                label="Jogador B"
                players={players}
                teams={teamsB}
                player={playerB}
                team={teamB}
                onPlayer={setPlayerB}
                onTeam={setTeamB}
              />
            </div>

            {sameSelection && (
              <p className="notice notice--center">Selecione dois jogadores diferentes.</p>
            )}

            {result && !sameSelection && (
              <>
                <div className="tally">
                  <div className="tally__side tally__side--a">
                    <span className="tally__count">{result.winsA}</span>
                    <span className="tally__label">vitórias</span>
                    <span className="tally__goals">{result.goalsA} gols</span>
                  </div>
                  <div className="tally__circle">
                    <span className="tally__count tally__count--draw">{result.draws}</span>
                    <span className="tally__label">empates</span>
                  </div>
                  <div className="tally__side tally__side--b">
                    <span className="tally__count">{result.winsB}</span>
                    <span className="tally__label">vitórias</span>
                    <span className="tally__goals">{result.goalsB} gols</span>
                  </div>
                </div>

                {total > 0 && (
                  <div className="bar" role="img" aria-label={`${result.winsA} vitórias de ${playerA}, ${result.draws} empates, ${result.winsB} vitórias de ${playerB}`}>
                    <span className="bar__seg bar__seg--a" style={{ width: `${pct(result.winsA)}%` }} />
                    <span className="bar__seg bar__seg--d" style={{ width: `${pct(result.draws)}%` }} />
                    <span className="bar__seg bar__seg--b" style={{ width: `${pct(result.winsB)}%` }} />
                  </div>
                )}
              </>
            )}
          </div>

          {result && !sameSelection && result.stats.sample > 0 && (
            <MarketStats stats={result.stats} />
          )}

          {result && !sameSelection && (
            <div className="encounters">
              <div className="encounters__head">
                <h2 className="encounters__title section-title">
                  {result.matches.length > 0
                    ? `Últimos ${result.matches.length} confrontos`
                    : 'Confrontos'}
                </h2>
                <span className="encounters__scope">
                  {filtered ? 'com os times escolhidos' : 'com qualquer time'}
                  {result.played > result.matches.length && ` · ${result.played} no total`}
                </span>
              </div>

              {result.matches.length === 0 ? (
                <p className="notice">
                  {filtered
                    ? 'Nenhum confronto com essa combinação de times. Volte os times para “Qualquer time” para ver todos.'
                    : 'Esses dois jogadores ainda não se enfrentaram nesta liga.'}
                </p>
              ) : (
                <ol className="encounters__list">
                  {result.matches.map((m) => (
                    <li key={m.id} className={`encounter encounter--${m.result.toLowerCase()}`}>
                      <span className="encounter__date">{formatDate(m.playedAt)}</span>
                      <span className="encounter__team encounter__team--a">{m.teamA}</span>
                      <span className="encounter__score">
                        <b>{m.scoreA}</b>
                        <i>:</i>
                        <b>{m.scoreB}</b>
                      </span>
                      <span className="encounter__team encounter__team--b">{m.teamB}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
