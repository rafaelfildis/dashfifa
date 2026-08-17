import type { League, LeagueId } from '../types';

/** Each league carries a different piece of pitch chalk, so the cards read apart at a glance. */
function PitchMark({ league }: { league: LeagueId }) {
  const common = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.5,
    vectorEffect: 'non-scaling-stroke' as const,
  };

  return (
    <svg className="balloon__mark" viewBox="0 0 120 120" aria-hidden="true">
      {league === 'battle' && (
        <>
          <circle cx="60" cy="60" r="38" {...common} />
          <line x1="60" y1="0" x2="60" y2="120" {...common} />
          <circle cx="60" cy="60" r="3" fill="currentColor" stroke="none" />
        </>
      )}
      {league === 'gt-leagues' && (
        <>
          <rect x="14" y="18" width="92" height="84" rx="1" {...common} />
          <rect x="14" y="40" width="46" height="40" rx="1" {...common} />
          <path d="M60 44 a 22 22 0 0 1 0 32" {...common} />
        </>
      )}
      {league === 'h2h-gg' && (
        <>
          <path d="M10 10 h100 v100" {...common} />
          <path d="M10 34 a 24 24 0 0 0 24 -24" {...common} />
          <path d="M10 72 a 62 62 0 0 0 62 -62" {...common} />
        </>
      )}
      {league === 'battle-volta' && (
        <>
          <rect x="10" y="24" width="100" height="72" rx="34" {...common} />
          <rect x="30" y="44" width="60" height="32" rx="16" {...common} />
          <line x1="60" y1="24" x2="60" y2="96" {...common} />
        </>
      )}
    </svg>
  );
}

interface Props {
  leagues: League[];
  onPick: (league: League) => void;
}

export function LeagueSelect({ leagues, onPick }: Props) {
  return (
    <section className="landing">
      <header className="landing__head">
        <p className="eyebrow">Confrontos diretos de e-soccer</p>
        <h1 className="landing__title">
          Escolha a liga<span className="landing__dot">.</span>
        </h1>
        <p className="landing__lede">
          Cada liga joga em um formato diferente. Escolha uma para comparar dois jogadores e ver
          como eles se saíram frente a frente.
        </p>
      </header>

      <ul className="balloons">
        {leagues.map((league) => (
          <li key={league.id}>
            <button
              className="balloon"
              onClick={() => onPick(league)}
              aria-label={`${league.name}, partidas de ${league.matchMinutes} minutos`}
            >
              <PitchMark league={league.id} />
              <span className="balloon__duration">
                {league.matchMinutes}
                <span className="balloon__unit">min</span>
              </span>
              <span className="balloon__name">{league.name}</span>
              <span className="balloon__meta">
                {league.matches > 0
                  ? `${league.players} jogadores · ${league.matches.toLocaleString('pt-BR')} jogos`
                  : 'Carregando histórico…'}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
