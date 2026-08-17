import { useEffect, useState } from 'react';
import { fetchH2H, fetchPlayers, fetchTeams } from '../lib/api';
import { since, stamp } from '../lib/format';
import { LeaguePerformance } from './LeaguePerformance';
import { MarketStats } from './MarketStats';
import { MatchHistory } from './MatchHistory';
import { MatchupHero } from './MatchupHero';
import { MatchupPicker } from './MatchupPicker';
import { InsightsCard, SampleCard } from './SidePanels';
import type { H2HResult, League, NamedCount } from '../types';

const SECTIONS = [
  { id: 'resumo', label: 'Resumo' },
  { id: 'mercados', label: 'Mercados' },
  { id: 'gols', label: 'Gols' },
  { id: 'handicap', label: 'Handicap' },
  { id: 'historico', label: 'Histórico' },
];

/** Marca na nav interna a seção que está à vista, sem biblioteca de scrollspy. */
function useActiveSection(enabled: boolean): string {
  const [active, setActive] = useState(SECTIONS[0].id);

  useEffect(() => {
    if (!enabled) return;

    const nodes = SECTIONS.map((s) => document.getElementById(s.id)).filter(
      (node): node is HTMLElement => node !== null,
    );
    if (nodes.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((x, y) => x.boundingClientRect.top - y.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      // O topo é o header sticky; o fundo evita que a última seção roube o foco cedo.
      { rootMargin: '-120px 0px -55% 0px' },
    );

    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [enabled]);

  return active;
}

/** O snapshot é regenerado uma vez por dia; passado isso, "online" engana. */
const STALE_AFTER_HOURS = 12;

interface Freshness {
  tone: 'live' | 'stale' | 'off';
  label: string;
  stamp: string;
  hint: string;
  /** Aviso em texto corrido, para quando o cabeçalho não couber na tela. */
  warning: string | null;
}

/**
 * O ponto de status responde por duas perguntas diferentes: se a requisição
 * funcionou e se o dado ainda é recente. Um build estático pode ter as duas
 * respostas divergindo — requisição ok, dado de ontem —, e é aí que ele fica
 * âmbar em vez de verde.
 */
function freshnessOf(snapshotAt: string | null, loadedAt: string | null, failed: boolean): Freshness {
  if (failed) {
    return {
      tone: 'off',
      label: 'Dados offline',
      stamp: snapshotAt ? `dados de ${stamp(snapshotAt)}` : 'sem conexão',
      hint: 'A última requisição falhou.',
      warning: 'A última requisição falhou. Os números na tela são os do último carregamento.',
    };
  }

  if (snapshotAt) {
    const hours = Math.floor((Date.now() - new Date(snapshotAt).getTime()) / 3_600_000);
    const stale = hours >= STALE_AFTER_HOURS;
    return {
      tone: stale ? 'stale' : 'live',
      label: stale ? 'Dados defasados' : 'Dados online',
      stamp: `dados de ${stamp(snapshotAt)}`,
      hint: `O site publicado lê um snapshot regenerado uma vez por dia. Este tem ${hours} h.`,
      warning: stale
        ? `Estes números vêm do snapshot de ${stamp(snapshotAt)}, de ${hours} h atrás. O site publicado é regenerado uma vez por dia, então partidas recentes ainda não aparecem.`
        : null,
    };
  }

  return {
    tone: 'live',
    label: 'Dados online',
    stamp: loadedAt ? `atualizado ${since(loadedAt)}` : 'carregando…',
    hint: 'Backend ao vivo: o histórico é relido continuamente.',
    warning: null,
  };
}

function Skeleton() {
  return (
    <div className="skel" aria-hidden="true">
      <div className="skel__block skel__block--hero" />
      <div className="skel__block skel__block--side" />
    </div>
  );
}

interface Props {
  league: League;
  onBack: () => void;
  /** Data do snapshot no build estático; nulo quando o backend está ao vivo. */
  snapshotAt: string | null;
}

export function H2HPage({ league, onBack, snapshotAt }: Props) {
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
  const [loadedAt, setLoadedAt] = useState<string | null>(null);
  const [, setTick] = useState(0);

  const ready = Boolean(result) && playerA !== '' && playerA !== playerB;
  const active = useActiveSection(ready);

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
    let cancelled = false;
    fetchTeams(league.id, playerA).then((t) => !cancelled && setTeamsA(t));
    return () => {
      cancelled = true;
    };
  }, [league.id, playerA]);

  useEffect(() => {
    if (!playerB) return;
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
      .then((r) => {
        if (cancelled) return;
        setResult(r);
        setLoadedAt(new Date().toISOString());
      })
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, [league.id, playerA, playerB, teamA, teamB]);

  // A idade do dado só envelhece na tela se algo redesenhar de tempos em tempos
  // — vale tanto para "há N min" quanto para o snapshot cruzar o limite de horas.
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  /** Trocar de jogador invalida o time escolhido; trocar de lado, não. */
  function pickPlayer(side: 'a' | 'b', name: string) {
    if (side === 'a') {
      setPlayerA(name);
      setTeamA('');
    } else {
      setPlayerB(name);
      setTeamB('');
    }
  }

  function pickTeam(side: 'a' | 'b', name: string) {
    if (side === 'a') setTeamA(name);
    else setTeamB(name);
  }

  function swap() {
    setPlayerA(playerB);
    setPlayerB(playerA);
    setTeamA(teamB);
    setTeamB(teamA);
    setTeamsA(teamsB);
    setTeamsB(teamsA);
  }

  const fresh = freshnessOf(snapshotAt, loadedAt, Boolean(error));

  const bothPicked = playerA !== '' && playerB !== '';
  const sameSelection = playerA !== '' && playerA === playerB;
  const stats = result?.stats ?? null;
  const hasEncounters = Boolean(stats && stats.sample > 0);

  return (
    <div className="page">
      <header className="topbar">
        <div className="wrap topbar__main">
          <div className="topbar__logo">
            <span className="topbar__word">dashfifa</span>
            <span className="topbar__dot" aria-hidden="true" />
          </div>
          <div className="topbar__rule" aria-hidden="true" />
          <div className="topbar__league">
            <span className="topbar__league-name">{league.name}</span>
            <span className="topbar__source num">{league.source}</span>
          </div>
          <div className="topbar__spacer" />
          <div className={`topbar__status topbar__status--${fresh.tone}`} title={fresh.hint}>
            <span className={`topbar__pulse topbar__pulse--${fresh.tone}`} aria-hidden="true" />
            <span className="topbar__status-text">{fresh.label}</span>
          </div>
          <span className="topbar__stamp num" title={fresh.hint}>
            {fresh.stamp}
          </span>
          <button type="button" className="pill pill--ghost" onClick={onBack}>
            Ligas
          </button>
        </div>

        <nav className="secnav wrap" aria-label="Seções da análise">
          {SECTIONS.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className={`secnav__link${active === section.id ? ' secnav__link--on' : ''}`}
              aria-current={active === section.id ? 'true' : undefined}
            >
              {section.label}
            </a>
          ))}
        </nav>
      </header>

      <main className="wrap page__main">
        <p className="sr-only" role="status" aria-live="polite">
          {ready ? `Confronto entre ${playerA} e ${playerB}, ${stats?.sample ?? 0} partidas.` : ''}
        </p>

        {error && <p className="card notice notice--warn">{error}</p>}

        {/* O cabeçalho esconde o status em telas estreitas; o aviso não. */}
        {fresh.warning && (
          <p className={`staleness staleness--${fresh.tone}`} role="status">
            <span aria-hidden="true">⚠</span> {fresh.warning}
          </p>
        )}

        {loading && <Skeleton />}

        {!loading && players.length === 0 && !error && (
          <p className="card notice">
            O histórico desta liga ainda está sendo baixado. Volte em alguns instantes.
          </p>
        )}

        {players.length > 0 && (
          <>
            <MatchupPicker
              players={players}
              teamsA={teamsA}
              teamsB={teamsB}
              playerA={playerA}
              playerB={playerB}
              teamA={teamA}
              teamB={teamB}
              onPlayer={pickPlayer}
              onTeam={pickTeam}
              onSwap={swap}
            />

            {sameSelection && (
              <p className="card notice notice--center">Selecione dois jogadores diferentes.</p>
            )}

            {!bothPicked && (
              <p className="card notice notice--center">
                Selecione dois jogadores para ver o confronto direto.
              </p>
            )}

            {bothPicked && !sameSelection && !result && !error && <Skeleton />}

            {result && !sameSelection && (
              <>
                {hasEncounters ? (
                  <section className="summary" id="resumo" aria-label="Resumo do confronto">
                    <MatchupHero result={result} />
                    <aside className="summary__aside">
                      <SampleCard result={result} />
                      <InsightsCard result={result} />
                    </aside>
                  </section>
                ) : (
                  <p className="card notice notice--center" id="resumo">
                    {teamA || teamB
                      ? 'Nenhum confronto com essa combinação de times. Volte os times para “Qualquer time” para ver todos.'
                      : 'Não existem confrontos diretos entre estes jogadores nesta liga.'}
                  </p>
                )}

                {result.stats.baseline && (
                  <LeaguePerformance a={result.stats.baseline.a} b={result.stats.baseline.b} />
                )}

                {hasEncounters && (
                  <>
                    <MarketStats result={result} />
                    <MatchHistory
                      matches={result.matches}
                      playerA={result.playerA}
                      playerB={result.playerB}
                      played={result.played}
                    />
                  </>
                )}
              </>
            )}
          </>
        )}

        <footer className="pagefoot">
          <p className="pagefoot__note">
            Frequência é o que aconteceu nestes confrontos, não uma previsão. A odd justa é 1 ÷
            frequência, sem a margem da casa. Nenhum número desta página é recomendação de aposta.
          </p>
          <span className="pagefoot__stamp num">
            {snapshotAt ? `dados de ${stamp(snapshotAt)}` : 'dados ao vivo'} · {league.source}
          </span>
        </footer>
      </main>
    </div>
  );
}
