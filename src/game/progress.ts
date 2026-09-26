import type { BootId, UniformId } from './modes';
import type { CourtId } from './types';

export interface Reward {
  id: string;
  label: string;
  kind: 'uniform' | 'boots' | 'court';
  priceCoins: number;
}

export const REWARDS: readonly Reward[] = [
  { id: 'uniform-violet', label: 'Sudadera violeta', kind: 'uniform', priceCoins: 35 },
  { id: 'boots-neon', label: 'Botines neón', kind: 'boots', priceCoins: 60 },
  { id: 'court-graffiti', label: 'Cancha Grafiti', kind: 'court', priceCoins: 90 },
  { id: 'uniform-mint', label: 'Remera menta', kind: 'uniform', priceCoins: 110 },
  { id: 'boots-gold', label: 'Botines dorados', kind: 'boots', priceCoins: 130 },
  { id: 'court-beach', label: 'Cancha Playa', kind: 'court', priceCoins: 150 },
  { id: 'court-neon', label: 'Cancha Galpón Neón', kind: 'court', priceCoins: 180 },
];

export type ChallengeKind = 'play' | 'win' | 'goals' | 'tricks';
export interface DailyChallengeDefinition {
  id: string;
  title: string;
  description: string;
  kind: ChallengeKind;
  target: number;
  rewardCoins: number;
  rewardXp: number;
}

export const DAILY_CHALLENGES: readonly DailyChallengeDefinition[] = [
  { id: 'play-one', title: 'CALENTAR LA JAULA', description: 'Jugá un partido rápido.', kind: 'play', target: 1, rewardCoins: 50, rewardXp: 40 },
  { id: 'win-one', title: 'QUE EL BARRIO HABLE', description: 'Ganá un partido.', kind: 'win', target: 1, rewardCoins: 60, rewardXp: 45 },
  { id: 'score-three', title: 'PUNTERÍA FINA', description: 'Marcá 3 goles en total.', kind: 'goals', target: 3, rewardCoins: 55, rewardXp: 45 },
  { id: 'tricks-three', title: 'HACÉLOS BAILAR', description: 'Completá 3 trucos.', kind: 'tricks', target: 3, rewardCoins: 55, rewardXp: 45 },
];

export interface DailyChallengeProgress {
  day: string;
  id: string;
  value: number;
  complete: boolean;
}

export interface CareerRecords {
  bestMatchGoals: number;
  totalGoals: number;
  totalTricks: number;
  winStreak: number;
  bestWinStreak: number;
}

export interface PlayerProgress {
  wins: number;
  matches: number;
  coins: number;
  xp: number;
  unlocked: string[];
  uniform: UniformId;
  boots: BootId;
  court: CourtId;
  tutorialComplete: boolean;
  dailyChallenge: DailyChallengeProgress;
  records: CareerRecords;
}

type AchievementMetric = 'matches' | 'wins' | 'bestMatchGoals' | 'totalGoals' | 'totalTricks' | 'bestWinStreak' | 'cosmetics';
export interface AchievementDefinition {
  id: string;
  title: string;
  description: string;
  metric: AchievementMetric;
  target: number;
}
export interface AchievementStatus extends AchievementDefinition {
  current: number;
  complete: boolean;
}

export const ACHIEVEMENTS: readonly AchievementDefinition[] = [
  { id: 'debut', title: 'PRIMER PARTIDO', description: 'Jugá tu primer partido.', metric: 'matches', target: 1 },
  { id: 'first-win', title: 'LA PRIMERA', description: 'Ganá una vez.', metric: 'wins', target: 1 },
  { id: 'hat-trick', title: 'HAT TRICK', description: 'Marcá 3 goles en un partido.', metric: 'bestMatchGoals', target: 3 },
  { id: 'ten-goals', title: 'DE CARA AL GOL', description: 'Llegá a 10 goles totales.', metric: 'totalGoals', target: 10 },
  { id: 'twenty-five-goals', title: 'ROMPERREDES', description: 'Llegá a 25 goles totales.', metric: 'totalGoals', target: 25 },
  { id: 'fifty-goals', title: 'LEYENDA DEL BARRIO', description: 'Llegá a 50 goles totales.', metric: 'totalGoals', target: 50 },
  { id: 'first-trick', title: 'PRIMER BAILE', description: 'Completá un truco.', metric: 'totalTricks', target: 1 },
  { id: 'ten-tricks', title: 'SUELA CALIENTE', description: 'Completá 10 trucos.', metric: 'totalTricks', target: 10 },
  { id: 'twenty-five-tricks', title: 'SHOWMAN', description: 'Completá 25 trucos.', metric: 'totalTricks', target: 25 },
  { id: 'triple-crown', title: 'TRICAMPEÓN', description: 'Ganá 3 partidos.', metric: 'wins', target: 3 },
  { id: 'ten-wins', title: 'REYES DE LA JAULA', description: 'Ganá 10 partidos.', metric: 'wins', target: 10 },
  { id: 'streak-three', title: 'TRES AL HILO', description: 'Ganá 3 partidos seguidos.', metric: 'bestWinStreak', target: 3 },
  { id: 'streak-five', title: 'IMPARABLES', description: 'Ganá 5 partidos seguidos.', metric: 'bestWinStreak', target: 5 },
  { id: 'ten-matches', title: 'DE PASEO', description: 'Jug&aacute; 10 partidos.', metric: 'matches', target: 10 },
  { id: 'collector', title: 'VESTUARIO COMPLETO', description: 'Comprá 6 artículos cosméticos.', metric: 'cosmetics', target: 6 },
];

export function achievementsFor(progress: PlayerProgress): AchievementStatus[] {
  const values: Record<AchievementMetric, number> = {
    matches: progress.matches,
    wins: progress.wins,
    bestMatchGoals: progress.records.bestMatchGoals,
    totalGoals: progress.records.totalGoals,
    totalTricks: progress.records.totalTricks,
    bestWinStreak: progress.records.bestWinStreak,
    cosmetics: progress.unlocked.filter((id) => id !== 'court-rooftop').length,
  };
  return ACHIEVEMENTS.map((achievement) => {
    const current = Math.min(achievement.target, values[achievement.metric]);
    return { ...achievement, current, complete: current >= achievement.target };
  });
}

const COURT_IDS: readonly CourtId[] = ['court-rooftop', 'court-graffiti', 'court-beach', 'court-neon'];
const EMPTY_RECORDS: CareerRecords = { bestMatchGoals: 0, totalGoals: 0, totalTricks: 0, winStreak: 0, bestWinStreak: 0 };

export function dayKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function challengeForDay(day = dayKey()): DailyChallengeDefinition {
  const [year, month, date] = day.split('-').map(Number);
  const utcDay = Math.floor(Date.UTC(year, month - 1, date) / 86_400_000);
  const index = ((utcDay % DAILY_CHALLENGES.length) + DAILY_CHALLENGES.length) % DAILY_CHALLENGES.length;
  return DAILY_CHALLENGES[index]!;
}

export function refreshDailyChallenge(progress: PlayerProgress, now = new Date()): PlayerProgress {
  const today = dayKey(now);
  if (progress.dailyChallenge.day === today && progress.dailyChallenge.id === challengeForDay(today).id) return progress;
  return { ...progress, dailyChallenge: { day: today, id: challengeForDay(today).id, value: 0, complete: false } };
}

export function freshProgress(now = new Date()): PlayerProgress {
  const day = dayKey(now);
  return {
    wins: 0, matches: 0, coins: 0, xp: 0, unlocked: ['court-rooftop'],
    uniform: 'candela', boots: 'classic', court: 'court-rooftop', tutorialComplete: false,
    dailyChallenge: { day, id: challengeForDay(day).id, value: 0, complete: false },
    records: { ...EMPTY_RECORDS },
  };
}

export function careerProgress(xp: number): { level: number; currentXp: number; neededXp: number } {
  let remaining = Math.max(0, Math.floor(xp));
  let level = 1;
  let neededXp = 100;
  while (remaining >= neededXp) {
    remaining -= neededXp;
    level += 1;
    neededXp = 100 + (level - 1) * 25;
  }
  return { level, currentXp: remaining, neededXp };
}

export function difficultyAfterWin(difficulty: number): number {
  return Math.min(2, Math.max(0, difficulty) + 1);
}

export function recordCompletedMatch(
  source: PlayerProgress,
  won: boolean,
  stats: { goals?: number; tricks?: number } = {},
  now = new Date(),
): { progress: PlayerProgress; newUnlocks: Reward[]; coinsEarned: number; xpEarned: number; dailyCompleted: boolean } {
  const progress = refreshDailyChallenge(source, now);
  const wins = progress.wins + Number(won);
  const matches = progress.matches + 1;
  const goals = Math.max(0, Math.floor(stats.goals ?? 0));
  const tricks = Math.max(0, Math.floor(stats.tricks ?? 0));
  const challenge = challengeForDay(progress.dailyChallenge.day);
  const increment = challenge.kind === 'play' ? 1 : challenge.kind === 'win' ? Number(won) : challenge.kind === 'goals' ? goals : tricks;
  const nextValue = Math.min(challenge.target, progress.dailyChallenge.value + increment);
  const dailyCompleted = !progress.dailyChallenge.complete && nextValue >= challenge.target;
  const dailyChallenge = { ...progress.dailyChallenge, value: nextValue, complete: progress.dailyChallenge.complete || dailyCompleted };
  const coinsEarned = (won ? 40 : 15) + (dailyCompleted ? challenge.rewardCoins : 0);
  const xpEarned = (won ? 75 : 35) + (dailyCompleted ? challenge.rewardXp : 0);
  const winStreak = won ? progress.records.winStreak + 1 : 0;
  return {
    progress: {
      ...progress,
      wins,
      matches,
      coins: progress.coins + coinsEarned,
      xp: progress.xp + xpEarned,
      dailyChallenge,
      records: {
        bestMatchGoals: Math.max(progress.records.bestMatchGoals, goals),
        totalGoals: progress.records.totalGoals + goals,
        totalTricks: progress.records.totalTricks + tricks,
        winStreak,
        bestWinStreak: Math.max(progress.records.bestWinStreak, winStreak),
      },
    },
    newUnlocks: [],
    coinsEarned,
    xpEarned,
    dailyCompleted,
  };
}

export function purchaseReward(progress: PlayerProgress, id: string): { progress: PlayerProgress; purchased: Reward | null; reason: 'unknown' | 'owned' | 'coins' | null } {
  const reward = REWARDS.find((item) => item.id === id);
  if (!reward) return { progress, purchased: null, reason: 'unknown' };
  if (progress.unlocked.includes(id)) return { progress, purchased: null, reason: 'owned' };
  if (progress.coins < reward.priceCoins) return { progress, purchased: null, reason: 'coins' };
  return {
    progress: { ...progress, coins: progress.coins - reward.priceCoins, unlocked: [...progress.unlocked, id] },
    purchased: reward,
    reason: null,
  };
}

export function parseProgress(serialized: string | null, now = new Date()): PlayerProgress {
  if (!serialized) return freshProgress(now);
  try {
    const parsed = JSON.parse(serialized) as Partial<PlayerProgress>;
    const defaults = freshProgress(now);
    if (!Number.isInteger(parsed.wins) || !Number.isInteger(parsed.matches) || !Array.isArray(parsed.unlocked)) return defaults;
    const unlocked = [...new Set([...defaults.unlocked, ...parsed.unlocked.filter((id): id is string => typeof id === 'string')])];
    const savedChallenge = parsed.dailyChallenge;
    const challengeTarget = challengeForDay(defaults.dailyChallenge.day).target;
    const savedValue = savedChallenge && Number.isFinite(savedChallenge.value) ? Math.min(challengeTarget, Math.max(0, Math.floor(savedChallenge.value))) : 0;
    const dailyChallenge = savedChallenge && savedChallenge.day === defaults.dailyChallenge.day && savedChallenge.id === defaults.dailyChallenge.id
      ? { day: defaults.dailyChallenge.day, id: defaults.dailyChallenge.id, value: savedValue, complete: savedChallenge.complete === true || savedValue >= challengeTarget }
      : defaults.dailyChallenge;
    const records = parsed.records ?? EMPTY_RECORDS;
    const nonnegative = (value: unknown) => Number.isFinite(value) ? Math.max(0, Math.floor(value as number)) : 0;
    return {
      wins: nonnegative(parsed.wins),
      matches: nonnegative(parsed.matches),
      coins: nonnegative(parsed.coins),
      xp: nonnegative(parsed.xp),
      unlocked,
      uniform: parsed.uniform === 'violet' && unlocked.includes('uniform-violet') ? 'violet'
        : parsed.uniform === 'mint' && unlocked.includes('uniform-mint') ? 'mint' : 'candela',
      boots: parsed.boots === 'neon' && unlocked.includes('boots-neon') ? 'neon'
        : parsed.boots === 'gold' && unlocked.includes('boots-gold') ? 'gold' : 'classic',
      court: typeof parsed.court === 'string' && COURT_IDS.includes(parsed.court as CourtId) && unlocked.includes(parsed.court) ? parsed.court as CourtId : 'court-rooftop',
      tutorialComplete: parsed.tutorialComplete === true,
      dailyChallenge,
      records: {
        bestMatchGoals: nonnegative(records.bestMatchGoals),
        totalGoals: nonnegative(records.totalGoals),
        totalTricks: nonnegative(records.totalTricks),
        winStreak: nonnegative(records.winStreak),
        bestWinStreak: nonnegative(records.bestWinStreak),
      },
    };
  } catch {
    return freshProgress(now);
  }
}

export function selectReward(progress: PlayerProgress, id: string): PlayerProgress {
  if (!progress.unlocked.includes(id)) return progress;
  if (id === 'uniform-violet') return { ...progress, uniform: 'violet' };
  if (id === 'uniform-mint') return { ...progress, uniform: 'mint' };
  if (id === 'boots-neon') return { ...progress, boots: 'neon' };
  if (id === 'boots-gold') return { ...progress, boots: 'gold' };
  if (COURT_IDS.includes(id as CourtId)) return { ...progress, court: id as CourtId };
  return progress;
}
