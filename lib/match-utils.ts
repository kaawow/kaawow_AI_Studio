'use client';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const msg = error instanceof Error ? error.message : String(error);
  console.error(`Firestore Error [${operationType}] at ${path}: ${msg}`);
  throw error instanceof Error ? error : new Error(msg);
}

export interface Match {
  homeTeamIndex: number;
  awayTeamIndex: number;
  homeScore: number;
  awayScore: number;
}

export interface MatchDay {
  id?: string;
  date: string;
  teams: string[];
  matches: Match[];
  createdAt: any;
}

export interface TeamStats {
  name: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  points: number;
  form: string[]; // ['W', 'D', 'L', ...]
}

export function calculateRanking(matchDay: MatchDay): TeamStats[] {
  const stats: TeamStats[] = matchDay.teams.map(name => ({
    name,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    gf: 0,
    ga: 0,
    gd: 0,
    points: 0,
    form: []
  }));

  matchDay.matches.forEach(m => {
    // Only count matches that have some participation (indices within range)
    if (m.homeTeamIndex >= stats.length || m.awayTeamIndex >= stats.length) return;

    const home = stats[m.homeTeamIndex];
    const away = stats[m.awayTeamIndex];

    home.played++;
    away.played++;
    home.gf += m.homeScore;
    home.ga += m.awayScore;
    away.gf += m.awayScore;
    away.ga += m.homeScore;

    if (m.homeScore > m.awayScore) {
      home.won++;
      home.points += 3;
      home.form.push('W');
      away.lost++;
      away.form.push('L');
    } else if (m.homeScore < m.awayScore) {
      away.won++;
      away.points += 3;
      away.form.push('W');
      home.lost++;
      home.form.push('L');
    } else {
      home.drawn++;
      away.drawn++;
      home.points += 1;
      home.form.push('D');
      away.points += 1;
      away.form.push('D');
    }
  });

  stats.forEach(s => {
    s.gd = s.gf - s.ga;
    // Keep only last 6 for form if needed, though they play 6 matches each in a 3-team round robin x 3? 
    // Actually 9 matches total means each team plays 6 matches if they all play each other equally.
    // We'll keep all as requested.
  });

  return stats.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.gd !== a.gd) return b.gd - a.gd;
    return b.gf - a.gf;
  });
}

export function getTeamColorClass(colorName: string | undefined): string {
  if (!colorName) return 'bg-slate-200';
  const name = colorName.toLowerCase().trim();
  const maps: Record<string, string> = {
    red: 'bg-red-500',
    blue: 'bg-blue-500',
    green: 'bg-emerald-500',
    yellow: 'bg-yellow-400',
    orange: 'bg-orange-500',
    purple: 'bg-purple-500',
    pink: 'bg-pink-500',
    black: 'bg-slate-900',
    white: 'bg-white border border-slate-200',
    gray: 'bg-slate-500',
  };
  return maps[name] || 'bg-slate-200';
}

export function getTeamTextColorClass(colorName: string | undefined): string {
  if (!colorName) return 'text-slate-500';
  const name = colorName.toLowerCase().trim();
  const lightColors = ['white', 'yellow', 'pink'];
  if (lightColors.includes(name)) return 'text-slate-900';
  return 'text-white';
}

import { format, isValid } from 'date-fns';

export function formatDateSafe(date: string | undefined | null, formatStr: string): string {
  if (!date) return 'N/A';
  const d = new Date(date);
  if (!isValid(d)) return 'Invalid Date';
  return format(d, formatStr);
}
