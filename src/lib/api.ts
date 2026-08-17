import type { H2HResponse, LeagueId, LiveResponse } from '../types';

export async function fetchLive(): Promise<LiveResponse> {
  const res = await fetch('/api/live');
  if (!res.ok) throw new Error(`Failed to fetch live data (${res.status})`);
  return res.json();
}

export async function fetchPlayers(league?: LeagueId): Promise<string[]> {
  const query = league ? `?league=${encodeURIComponent(league)}` : '';
  const res = await fetch(`/api/players${query}`);
  if (!res.ok) throw new Error(`Failed to fetch players (${res.status})`);
  return res.json();
}

export async function fetchH2H(a: string, b: string, league?: LeagueId): Promise<H2HResponse> {
  const params = new URLSearchParams({ a, b });
  if (league) params.set('league', league);
  const res = await fetch(`/api/h2h?${params.toString()}`);
  if (!res.ok) throw new Error(`Failed to fetch head-to-head (${res.status})`);
  return res.json();
}
