/**
 * Builds the static snapshot the GitHub Pages site runs on: one compact file
 * per league plus an index. Run after a backfill, before `vite build`.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LEAGUES } from '../../shared/leagues.js';
import { encodeSnapshot, type SnapshotIndex } from '../../shared/snapshot.js';
import { backfillHistory, finishedInLeague, historyStatus, loadPersistedHistory } from './store.js';

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'public', 'data');

async function main() {
  await loadPersistedHistory();

  if (process.env.SKIP_BACKFILL !== '1') {
    await backfillHistory();
  }

  await mkdir(OUT_DIR, { recursive: true });

  const generatedAt = new Date().toISOString();
  const index: SnapshotIndex = {
    generatedAt,
    windowDays: historyStatus().windowDays,
    leagues: [],
  };

  for (const league of LEAGUES) {
    const matches = finishedInLeague(league.id).sort(
      (a, b) => new Date(b.playedAt).getTime() - new Date(a.playedAt).getTime(),
    );

    const snapshot = encodeSnapshot(league.id, matches, generatedAt);
    await writeFile(join(OUT_DIR, `${league.id}.json`), JSON.stringify(snapshot), 'utf8');

    index.leagues.push({
      id: league.id,
      matches: matches.length,
      players: snapshot.players.length,
      from: matches.at(-1)?.playedAt ?? generatedAt,
      to: matches[0]?.playedAt ?? generatedAt,
    });

    console.log(
      `[export] ${league.id}: ${matches.length} matches, ${snapshot.players.length} players`,
    );
  }

  await writeFile(join(OUT_DIR, 'index.json'), JSON.stringify(index), 'utf8');
  console.log(`[export] wrote ${index.leagues.length} leagues to ${OUT_DIR}`);
}

main().catch((err) => {
  console.error('[export] failed:', err);
  process.exit(1);
});
