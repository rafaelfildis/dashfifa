import { useState } from 'react';
import type { AsianLine, GoalWindow, H2HStats, MarketLine, PlayerBaseline } from '../types';

const SMALL_SAMPLE = 10;

type Tone = 'a' | 'b' | 'draw';

/** One market outcome, normalised so every card renders the same row. */
interface Pick {
  key: string;
  label: string;
  pct: number;
  fairOdds: number | null;
  tone?: Tone;
  detail?: string;
}

function fromLine(key: string, l: MarketLine, tone?: Tone): Pick {
  return { key, label: l.label, pct: l.pct, fairOdds: l.fairOdds, tone };
}

function fromAsian(key: string, l: AsianLine): Pick {
  const record = `${l.wins} vitórias · ${l.halfWins} meia-vitória · ${l.pushes} anuladas · ${l.halfLosses} meia-derrota · ${l.losses} derrotas`;
  return {
    key: `${key}-${l.line}`,
    label: l.label,
    pct: l.pct,
    fairOdds: l.fairOdds,
    detail: record,
  };
}

function windowLabel(w: GoalWindow) {
  return w.window === null ? `Todos (${w.matches})` : `Últimos ${w.window}`;
}

interface RowProps {
  pick: Pick;
  comparing: boolean;
  odd: string;
  onOdd: (key: string, value: string) => void;
}

// Defined at module scope: nesting these inside MarketStats would give React a
// new component type on every keystroke and remount the inputs mid-typing.
function Row({ pick, comparing, odd, onOdd }: RowProps) {
  const typed = Number(odd.replace(',', '.'));
  const hasOdd = odd.trim() !== '' && Number.isFinite(typed) && typed > 1;
  const edge = hasOdd ? (pick.pct / 100) * typed - 1 : null;

  return (
    <li className={`mkt__row${pick.tone ? ` mkt__row--${pick.tone}` : ''}`} title={pick.detail}>
      <span className="mkt__fill" style={{ width: `${pick.pct}%` }} aria-hidden="true" />
      <span className="mkt__label">{pick.label}</span>
      <span className="mkt__pct">{pick.pct.toFixed(1)}%</span>
      <span className="mkt__odd">{pick.fairOdds ? pick.fairOdds.toFixed(2) : '—'}</span>
      {comparing && (
        <>
          <input
            className="mkt__input"
            inputMode="decimal"
            placeholder="—"
            value={odd}
            onChange={(e) => onOdd(pick.key, e.target.value)}
            aria-label={`Odd da casa para ${pick.label}`}
          />
          <span
            className={`mkt__edge${
              edge === null ? '' : edge > 0 ? ' mkt__edge--up' : ' mkt__edge--down'
            }`}
          >
            {edge === null ? '' : `${edge > 0 ? '+' : ''}${(edge * 100).toFixed(0)}%`}
          </span>
        </>
      )}
    </li>
  );
}

interface CardProps {
  title: string;
  note?: string;
  picks?: Pick[];
  wide?: boolean;
  empty?: string;
  comparing: boolean;
  odds: Record<string, string>;
  onOdd: (key: string, value: string) => void;
}

function Card({ title, note, picks, wide, empty, comparing, odds, onOdd }: CardProps) {
  return (
    <section className={`mkt${wide ? ' mkt--wide' : ''}`}>
      <header className="mkt__head">
        <h3 className="mkt__title">{title}</h3>
        {note && <span className="mkt__note">{note}</span>}
      </header>
      {empty ? (
        <p className="mkt__empty">{empty}</p>
      ) : (
        <>
          <div className="mkt__cols">
            <span>Freq.</span>
            <span>Justa</span>
            {comparing && <span>Casa</span>}
            {comparing && <span>Valor</span>}
          </div>
          <ul className="mkt__rows">
            {picks?.map((p) => (
              <Row key={p.key} pick={p} comparing={comparing} odd={odds[p.key] ?? ''} onOdd={onOdd} />
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function BaselineRow({ b, tone }: { b: PlayerBaseline; tone: 'a' | 'b' }) {
  return (
    <li className={`base__row base__row--${tone}`}>
      <span className="base__name">{b.player}</span>
      <span className="base__stat">
        <b>{b.matches}</b> jogos
      </span>
      <span className="base__stat">
        marca <b>{b.avgFor.toFixed(2)}</b>
      </span>
      <span className="base__stat">
        sofre <b>{b.avgAgainst.toFixed(2)}</b>
      </span>
      <span className="base__stat">
        vence <b>{b.winPct.toFixed(1)}%</b>
      </span>
      <span className="base__stat">
        empata <b>{b.drawPct.toFixed(1)}%</b>
      </span>
    </li>
  );
}

export function MarketStats({ stats }: { stats: H2HStats }) {
  const [comparing, setComparing] = useState(false);
  const [odds, setOdds] = useState<Record<string, string>>({});

  if (stats.sample === 0) return null;

  const small = stats.sample < SMALL_SAMPLE;
  const onOdd = (key: string, value: string) => setOdds((prev) => ({ ...prev, [key]: value }));
  const shared = { comparing, odds, onOdd };

  return (
    <div className="stats">
      <section className="goals">
        <header className="goals__head">
          <h2 className="section-title">Média de gols por confronto</h2>
        </header>
        <ul className="goals__grid">
          {stats.goalWindows.map((w) => (
            <li key={w.window ?? 'all'} className="goals__cell">
              <span className="goals__window">{windowLabel(w)}</span>
              <span className="goals__total">{w.avgTotal.toFixed(2)}</span>
              <span className="goals__split">
                <b className="goals__a">{w.avgA.toFixed(1)}</b>
                <i>·</i>
                <b className="goals__b">{w.avgB.toFixed(1)}</b>
              </span>
            </li>
          ))}
        </ul>
      </section>

      {stats.baseline && (
        <section className="base">
          <header className="goals__head">
            <h2 className="section-title">Cada um na liga inteira</h2>
            <span className="markets__scope">amostra maior que a do confronto direto</span>
          </header>
          <ul className="base__list">
            <BaselineRow b={stats.baseline.a} tone="a" />
            <BaselineRow b={stats.baseline.b} tone="b" />
          </ul>
        </section>
      )}

      <section className="markets">
        <header className="markets__head">
          <h2 className="section-title">Mercados</h2>
          <div className="markets__tools">
            <span className="markets__scope">{stats.sample} confrontos na amostra</span>
            <button
              className={`toggle${comparing ? ' toggle--on' : ''}`}
              onClick={() => setComparing((v) => !v)}
            >
              {comparing ? 'Ocultar odds da casa' : 'Comparar odds da casa'}
            </button>
          </div>
        </header>

        {small && (
          <p className="notice notice--warn">
            Amostra pequena: {stats.sample} confrontos. As frequências ainda oscilam muito — use a
            base da liga acima como referência.
          </p>
        )}

        <div className={`markets__grid${comparing ? ' markets__grid--compare' : ''}`}>
          <Card
            title="Resultado final"
            picks={[
              fromLine('r-a', stats.result[0], 'a'),
              fromLine('r-d', stats.result[1], 'draw'),
              fromLine('r-b', stats.result[2], 'b'),
            ]}
            {...shared}
          />

          <Card
            title="Empate anula"
            note="handicap 0.0"
            picks={[
              fromLine('d-a', stats.drawNoBet[0], 'a'),
              fromLine('d-b', stats.drawNoBet[1], 'b'),
            ]}
            {...shared}
          />

          <Card title="Ambas marcam" picks={[fromLine('btts', stats.bothScore)]} {...shared} />

          <Card
            title="Handicap asiático"
            note={`linhas para ${stats.result[0].label}`}
            wide
            picks={stats.asian.map((l) => fromAsian('ah', l))}
            {...shared}
          />

          <Card
            title="Total de gols · Mais de"
            picks={stats.totals.map((t) => fromLine(`o-${t.line}`, t.over))}
            {...shared}
          />

          <Card
            title="Total de gols · Menos de"
            picks={stats.totals.map((t) => fromLine(`u-${t.line}`, t.under))}
            {...shared}
          />

          {stats.halftime ? (
            <>
              <Card
                title="1º tempo · handicap"
                note={`média ${stats.halftime.avgTotal.toFixed(2)} gols`}
                wide
                picks={stats.halftime.asian.map((l) => fromAsian('hah', l))}
                {...shared}
              />
              <Card
                title="1º tempo · Mais de"
                picks={stats.halftime.totals.map((t) => fromLine(`ho-${t.line}`, t.over))}
                {...shared}
              />
              <Card
                title="1º tempo · Menos de"
                picks={stats.halftime.totals.map((t) => fromLine(`hu-${t.line}`, t.under))}
                {...shared}
              />
            </>
          ) : (
            <Card title="1º tempo" empty="Esta liga não publica o placar do intervalo." {...shared} />
          )}
        </div>

        <p className="markets__caption">
          Freq. é o que aconteceu nestes confrontos, não uma previsão. A odd justa é 1 ÷ freq., sem
          a margem da casa. No handicap asiático, meia-vitória e meia-derrota contam metade e as
          linhas anuladas ficam de fora — passe o mouse na linha para ver o retrospecto.
          {comparing && ' Valor positivo quer dizer que a odd da casa paga acima do histórico.'}
        </p>
      </section>
    </div>
  );
}
