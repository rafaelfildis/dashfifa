import { useEffect, useState } from 'react';
import './App.css';
import { H2HPage } from './components/H2HPage';
import { LeagueSelect } from './components/LeagueSelect';
import { fetchLeagues, fetchSnapshotDate, usingSnapshot } from './lib/api';
import { stamp } from './lib/format';
import type { League } from './types';

export default function App() {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [selected, setSelected] = useState<League | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [snapshotAt, setSnapshotAt] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    function load() {
      fetchLeagues()
        .then((list) => !cancelled && setLeagues(list))
        .catch((err) => !cancelled && setError(err.message));
    }

    load();
    void fetchSnapshotDate().then((at) => !cancelled && setSnapshotAt(at));

    // Against the live backend, counts fill in as the backfill lands. A
    // snapshot build is fixed, so there is nothing to poll for.
    const poll = usingSnapshot ? null : setInterval(load, 20_000);
    return () => {
      cancelled = true;
      if (poll) clearInterval(poll);
    };
  }, []);

  // A tela de confronto traz o próprio cabeçalho sticky, então dispensa a shell.
  if (selected) {
    return <H2HPage league={selected} onBack={() => setSelected(null)} snapshotAt={snapshotAt} />;
  }

  return (
    <div className="shell">
      <nav className="brand">
        <span className="brand__mark">dashfifa</span>
        {snapshotAt && <span className="brand__stamp num">dados de {stamp(snapshotAt)}</span>}
      </nav>

      <main className="shell__main">
        {error && <p className="notice notice--warn">{error}</p>}
        {!error && leagues.length === 0 && <p className="notice">Carregando ligas…</p>}
        {leagues.length > 0 && <LeagueSelect leagues={leagues} onPick={setSelected} />}
      </main>
    </div>
  );
}
