import type { GoalWindow, H2HStats, MarketLine } from '../types';

const SMALL_SAMPLE = 10;

function windowLabel(w: GoalWindow) {
  return w.window === null ? `Todos (${w.matches})` : `Últimos ${w.window}`;
}

function Row({ line, tone }: { line: MarketLine; tone?: 'a' | 'b' | 'draw' }) {
  return (
    <li className={`mkt__row${tone ? ` mkt__row--${tone}` : ''}`}>
      <span className="mkt__fill" style={{ width: `${line.pct}%` }} aria-hidden="true" />
      <span className="mkt__label">{line.label}</span>
      <span className="mkt__pct">{line.pct.toFixed(1)}%</span>
      <span className="mkt__odd">{line.fairOdds ? line.fairOdds.toFixed(2) : '—'}</span>
    </li>
  );
}

function Card({
  title,
  note,
  columns = true,
  children,
}: {
  title: string;
  note?: string;
  columns?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="mkt">
      <header className="mkt__head">
        <h3 className="mkt__title">{title}</h3>
        {note && <span className="mkt__note">{note}</span>}
      </header>
      {columns && (
        <div className="mkt__cols">
          <span>Frequência</span>
          <span>Odd justa</span>
        </div>
      )}
      <ul className="mkt__rows">{children}</ul>
    </section>
  );
}

export function MarketStats({ stats }: { stats: H2HStats }) {
  if (stats.sample === 0) return null;

  const small = stats.sample < SMALL_SAMPLE;

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

      <section className="markets">
        <header className="markets__head">
          <h2 className="section-title">Mercados</h2>
          <span className="markets__scope">{stats.sample} confrontos na amostra</span>
        </header>

        {small && (
          <p className="notice notice--warn">
            Amostra pequena: {stats.sample} confrontos. As frequências ainda oscilam muito — leia
            como tendência, não como probabilidade estável.
          </p>
        )}

        <div className="markets__grid">
          <Card title="Resultado final">
            <Row line={stats.result[0]} tone="a" />
            <Row line={stats.result[1]} tone="draw" />
            <Row line={stats.result[2]} tone="b" />
          </Card>

          <Card title="Empate anula" note="handicap asiático 0.0">
            <Row line={stats.drawNoBet[0]} tone="a" />
            <Row line={stats.drawNoBet[1]} tone="b" />
          </Card>

          <Card title="Total de gols">
            {stats.overUnder.map((l) => (
              <Row key={l.label} line={l} />
            ))}
          </Card>

          <Card
            title="1º tempo"
            note={stats.halftime ? `média ${stats.halftime.avgTotal.toFixed(2)} gols` : undefined}
            columns={stats.halftime !== null}
          >
            {stats.halftime ? (
              stats.halftime.lines.map((l) => <Row key={l.label} line={l} />)
            ) : (
              <li className="mkt__empty">Esta liga não publica o placar do intervalo.</li>
            )}
          </Card>

          <Card title="Ambas marcam">
            <Row line={stats.bothScore} />
          </Card>
        </div>

        <p className="markets__caption">
          Frequência é o que aconteceu nestes confrontos, não uma previsão. A odd justa é
          1 ÷ frequência, sem a margem da casa — compare com a odd ofertada para achar valor.
        </p>
      </section>
    </div>
  );
}
