import { formOf, type FormKey } from '../lib/derive';
import { decimal, pct } from '../lib/format';
import type { H2HResult } from '../types';

const FORM_TITLE: Record<FormKey, string> = { V: 'Vitória', E: 'Empate', D: 'Derrota' };

function FormRow({ name, side, keys }: { name: string; side: 'a' | 'b'; keys: FormKey[] }) {
  return (
    <div className="form__row">
      <span className={`form__who form__who--${side}`}>{name}</span>
      <div className="form__cells">
        {keys.map((key, index) => (
          <span
            // A sequência é posicional: dois "V" seguidos são células distintas.
            key={index}
            className={`form__cell form__cell--${key.toLowerCase()}`}
            title={FORM_TITLE[key]}
          >
            {key}
          </span>
        ))}
      </div>
    </div>
  );
}

export function MatchupHero({ result }: { result: H2HResult }) {
  const { stats, playerA, playerB, goalsA, goalsB, matches } = result;
  const sample = stats.sample;
  const [winA, drawLine, winB] = stats.result;

  const all = stats.goalWindows.find((w) => w.window === null) ?? null;
  const last5 = stats.goalWindows.find((w) => w.window === 5) ?? null;

  const lead = winA.hits - winB.hits;
  const balanced = Math.abs(lead) <= 1;
  const chipTitle = balanced
    ? 'Confronto equilibrado'
    : `${lead > 0 ? playerA : playerB} lidera o retrospecto`;

  return (
    <div className="hero">
      <div className="hero__top">
        <div className="hero__side hero__side--a">
          <div className="hero__name hero__name--a">{playerA}</div>
          <div className="hero__count">
            <span className="hero__wins num">{winA.hits}</span>
            <span className="hero__caption">
              vitórias
              <br />
              {pct(winA.pct)} dos jogos
            </span>
          </div>
        </div>

        <div className="hero__mid">
          <div className="hero__sample num">{sample}</div>
          <div className="hero__mid-label">Confrontos</div>
          <div className="hero__draws">
            <div className="hero__draw-count num">{drawLine.hits}</div>
            <div className="hero__mid-label">Empates</div>
          </div>
        </div>

        <div className="hero__side hero__side--b">
          <div className="hero__name hero__name--b">{playerB}</div>
          <div className="hero__count">
            <span className="hero__caption">
              vitórias
              <br />
              {pct(winB.pct)} dos jogos
            </span>
            <span className="hero__wins num">{winB.hits}</span>
          </div>
        </div>
      </div>

      <div className="hero__split">
        <div
          className="track track--split"
          role="img"
          aria-label={`${winA.hits} vitórias de ${playerA}, ${drawLine.hits} empates, ${winB.hits} vitórias de ${playerB}`}
        >
          <div className="track__seg track__seg--a" style={{ width: `${winA.pct}%` }} />
          <div className="track__seg track__seg--draw" style={{ width: `${drawLine.pct}%` }} />
          <div className="track__seg track__seg--b" style={{ width: `${winB.pct}%` }} />
        </div>
        <div className="hero__legend num">
          <span>
            {pct(winA.pct)} {playerA}
          </span>
          <span>{pct(drawLine.pct)} empates</span>
          <span>
            {pct(winB.pct)} {playerB}
          </span>
        </div>
      </div>

      <div className="hero__kpis">
        <div className="kpi">
          <div className="kpi__label">Gols {playerA}</div>
          <div className="kpi__value num">{goalsA}</div>
          <div className="kpi__sub">{sample > 0 ? `${decimal(goalsA / sample)} por jogo` : '—'}</div>
        </div>
        <div className="kpi">
          <div className="kpi__label">Gols {playerB}</div>
          <div className="kpi__value num">{goalsB}</div>
          <div className="kpi__sub">{sample > 0 ? `${decimal(goalsB / sample)} por jogo` : '—'}</div>
        </div>
        <div className="kpi">
          <div className="kpi__label">Média do confronto</div>
          <div className="kpi__value num">{all ? decimal(all.avgTotal) : '—'}</div>
          <div className="kpi__sub">gols por jogo ({sample})</div>
        </div>
        <div className="kpi">
          <div className="kpi__label">Últimos 5</div>
          <div className="kpi__value num">{last5 ? decimal(last5.avgTotal) : '—'}</div>
          <div className="kpi__sub">{last5 ? 'gols por jogo' : `amostra de ${sample}`}</div>
        </div>
      </div>

      <div className="hero__form">
        <div>
          <div className="form__label">
            Forma nos {matches.length} confrontos
            <span className="form__label-note"> · antigo → recente</span>
          </div>
          <FormRow name={playerA} side="a" keys={formOf(matches, 'a')} />
          <FormRow name={playerB} side="b" keys={formOf(matches, 'b')} />
        </div>
        <div className="hero__chip-wrap">
          <div className="hero__chip">
            <span className="hero__chip-glyph" aria-hidden="true">
              {balanced ? '⚖' : '▲'}
            </span>
            <div>
              <div className="hero__chip-title">{chipTitle}</div>
              <div className="hero__chip-sub">
                {winA.hits}–{drawLine.hits}–{winB.hits} no histórico, saldo de gols {goalsA}–{goalsB}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
