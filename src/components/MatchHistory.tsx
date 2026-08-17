import { useState } from 'react';
import { dayMonth, hourMinute } from '../lib/format';
import type { H2HMatch } from '../types';

type Filter = 'all' | 'aWon' | 'bWon' | 'draw';

function keep(match: H2HMatch, filter: Filter): boolean {
  if (filter === 'all') return true;
  if (filter === 'draw') return match.result === 'D';
  return match.result === (filter === 'aWon' ? 'A' : 'B');
}

interface Props {
  matches: H2HMatch[];
  playerA: string;
  playerB: string;
  /** Total encontrado, que pode ser maior que a lista exibida. */
  played: number;
}

export function MatchHistory({ matches, playerA, playerB, played }: Props) {
  const [filter, setFilter] = useState<Filter>('all');

  // As contagens dos botões saem dos dados, não são fixas.
  const options: { id: Filter; label: string; count: number }[] = [
    { id: 'all', label: 'Todos', count: matches.length },
    { id: 'aWon', label: `${playerA} venceu`, count: matches.filter((m) => m.result === 'A').length },
    { id: 'bWon', label: `${playerB} venceu`, count: matches.filter((m) => m.result === 'B').length },
    { id: 'draw', label: 'Empates', count: matches.filter((m) => m.result === 'D').length },
  ];

  const shown = matches.filter((m) => keep(m, filter));

  return (
    <section className="section" id="historico" aria-label="Histórico dos confrontos">
      <div className="sechead">
        <h2 className="sechead__title">Últimos {matches.length} confrontos</h2>
        <div className="hist__filters">
          {options.map((option) => (
            <button
              key={option.id}
              type="button"
              className={`pill${filter === option.id ? ' pill--on' : ''}`}
              aria-pressed={filter === option.id}
              onClick={() => setFilter(option.id)}
            >
              {option.label} <span className="num pill__count">{option.count}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="hist">
        {shown.map((match) => {
          const aWon = match.result === 'A';
          const bWon = match.result === 'B';
          const badge = aWon ? `${playerA} venceu` : bWon ? `${playerB} venceu` : 'Empate';

          return (
            <div key={match.id} className="hrow">
              <div className="hrow__when num">
                {dayMonth(match.playedAt)}
                <br />
                <span className="hrow__time">{hourMinute(match.playedAt)}</span>
              </div>
              <div className="hrow__club hrow__club--a">
                <div className="hrow__club-name">{match.teamA}</div>
                <div className="hrow__tag hrow__tag--a">{playerA}</div>
              </div>
              <div className="hrow__score">
                <span className={`hrow__goals num${aWon ? ' hrow__goals--a' : ''}`}>
                  {match.scoreA}
                </span>
                <span className="hrow__colon" aria-hidden="true">
                  :
                </span>
                <span className={`hrow__goals num${bWon ? ' hrow__goals--b' : ''}`}>
                  {match.scoreB}
                </span>
              </div>
              <div className="hrow__club hrow__club--b">
                <div className="hrow__club-name">{match.teamB}</div>
                <div className="hrow__tag hrow__tag--b">{playerB}</div>
              </div>
              <div className="hrow__verdict">
                <span
                  className={`badge${aWon ? ' badge--a' : ''}${bWon ? ' badge--b' : ''}`}
                >
                  {badge}
                </span>
              </div>
            </div>
          );
        })}

        {shown.length === 0 && <p className="hist__empty">Nenhum confronto neste filtro.</p>}
      </div>

      {played > matches.length && (
        <p className="section__foot">
          {played} confrontos no total; a lista mostra os {matches.length} mais recentes. As
          estatísticas acima consideram todos.
        </p>
      )}
    </section>
  );
}
