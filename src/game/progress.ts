import type { BootId, UniformId } from './modes';

export interface Reward {
  id: string;
  label: string;
  kind: 'uniform' | 'boots' | 'court';
  winsRequired: number;
}

export const REWARDS: readonly Reward[] = [
  { id: 'uniform-violet', label: 'Sudadera violeta', kind: 'uniform', winsRequired: 1 },
  { id: 'boots-neon', label: 'Botines neón', kind: 'boots', winsRequired: 2 },
  { id: 'court-graffiti', label: 'Cancha Grafiti', kind: 'court', winsRequired: 3 },
  { id: 'uniform-mint', label: 'Remera menta', kind: 'uniform', winsRequired: 4 },
  { id: 'boots-gold', label: 'Botines dorados', kind: 'boots', winsRequired: 5 },
  { id: 'court-beach', label: 'Cancha Playa', kind: 'court', winsRequired: 6 },
  { id: 'court-neon', label: 'Cancha Galpón Neón', kind: 'court', winsRequired: 8 },
];

export interface PlayerProgress {
  wins: number;
  matches: number;
  unlocked: string[];
  uniform: UniformId;
  boots: BootId;
  court: string;
}

export function freshProgress(): PlayerProgress {
  return { wins: 0, matches: 0, unlocked: ['court-rooftop'], uniform: 'candela', boots: 'classic', court: 'court-rooftop' };
}

export function recordCompletedMatch(progress: PlayerProgress, won: boolean): { progress: PlayerProgress; newUnlocks: Reward[] } {
  const wins = progress.wins + Number(won);
  const matches = progress.matches + 1;
  const unlocked = new Set(progress.unlocked);
  unlocked.add('court-rooftop');
  const newUnlocks: Reward[] = [];
  for (const reward of REWARDS) {
    if (wins >= reward.winsRequired && !unlocked.has(reward.id)) {
      unlocked.add(reward.id);
      newUnlocks.push(reward);
    }
  }
  return { progress: { ...progress, wins, matches, unlocked: [...unlocked] }, newUnlocks };
}

export function parseProgress(serialized: string | null): PlayerProgress {
  if (!serialized) return freshProgress();
  try {
    const parsed = JSON.parse(serialized) as Partial<PlayerProgress>;
    const defaults = freshProgress();
    if (!Number.isInteger(parsed.wins) || !Number.isInteger(parsed.matches) || !Array.isArray(parsed.unlocked)) return defaults;
    return {
      wins: Math.max(0, parsed.wins!),
      matches: Math.max(0, parsed.matches!),
      unlocked: [...new Set([...defaults.unlocked, ...parsed.unlocked.filter((id): id is string => typeof id === 'string')])],
      uniform: parsed.uniform === 'violet' || parsed.uniform === 'mint' ? parsed.uniform : 'candela',
      boots: parsed.boots === 'neon' || parsed.boots === 'gold' ? parsed.boots : 'classic',
      court: typeof parsed.court === 'string' && parsed.unlocked.includes(parsed.court) ? parsed.court : 'court-rooftop',
    };
  } catch {
    return freshProgress();
  }
}

export function selectReward(progress: PlayerProgress, id: string): PlayerProgress {
  if (!progress.unlocked.includes(id)) return progress;
  if (id === 'uniform-violet') return { ...progress, uniform: 'violet' };
  if (id === 'uniform-mint') return { ...progress, uniform: 'mint' };
  if (id === 'boots-neon') return { ...progress, boots: 'neon' };
  if (id === 'boots-gold') return { ...progress, boots: 'gold' };
  if (id.startsWith('court-')) return { ...progress, court: id };
  return progress;
}
