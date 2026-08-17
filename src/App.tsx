import { useEffect, useState } from 'react';
import './App.css';
import { H2HPage } from './components/H2HPage';
import { LeagueSelect } from './components/LeagueSelect';
import { fetchLeagues, fetchSnapshotDate, usingSnapshot } from './lib/api';
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

  return (
    <div className="shell">
      <nav className="brand">
        <button className="brand__mark" onClick={() => setSelected(null)}>
          dashfifa
        </button>
        {snapshotAt && (
          <span className="brand__stamp">
            dados de{' '}
            {new Date(snapshotAt).toLocaleString('pt-BR', {
              day: '2-digit',
              month: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        )}
      </nav>

      <main className="shell__main">
        {error && <p className="notice notice--warn">{error}</p>}
        {!error && leagues.length === 0 && <p className="notice">Carregando ligas…</p>}

        {selected ? (
          <H2HPage league={selected} onBack={() => setSelected(null)} />
        ) : (
          leagues.length > 0 && <LeagueSelect leagues={leagues} onPick={setSelected} />
        )}
      </main>
    </div>
  );
}
