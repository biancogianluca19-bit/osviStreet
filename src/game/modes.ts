import type { MatchOptions } from './types';

export interface StreetTeam {
  id: string;
  name: string;
  colors: [string, string];
}

export const STREET_TEAMS: readonly StreetTeam[] = [
  { id: 'candela', name: 'Los Candela', colors: ['#ff5b35', '#ffe76d'] },
  { id: 'coyotes', name: 'Neón Coyotes', colors: ['#24d7c5', '#302b62'] },
  { id: 'avispas', name: 'Las Avispas', colors: ['#dcfb4e', '#7655de'] },
  { id: 'mareas', name: 'Mareas Bravas', colors: ['#168ac5', '#f7dd74'] },
  { id: 'ferro', name: 'Ferro Club', colors: ['#e93761', '#dedde0'] },
  { id: 'puente', name: 'Lobos del Puente', colors: ['#8b69ff', '#52e39b'] },
  { id: 'ratas', name: 'Ratas del Techo', colors: ['#ffa13b', '#423144'] },
  { id: 'fantasma', name: 'Puerto Fantasma', colors: ['#f5f3e5', '#6043a1'] },
];

export type TournamentRound = 'Cuartos' | 'Semifinal' | 'Final';

export interface BracketMatch {
  homeId: string;
  awayId: string;
  homeGoals?: number;
  awayGoals?: number;
  winnerId?: string;
  automatic?: boolean;
}

export interface TournamentState {
  seed: number;
  playerTeamId: string;
  round: 0 | 1 | 2;
  rounds: [BracketMatch[], BracketMatch[], BracketMatch[]];
  eliminated: boolean;
  championId?: string;
}

export function getStreetTeam(id: string): StreetTeam {
  return STREET_TEAMS.find((team) => team.id === id) ?? STREET_TEAMS[0]!;
}

export function teamOptions(home: StreetTeam, away: StreetTeam): Pick<MatchOptions, 'teamNames' | 'teamColors'> {
  return { teamNames: [home.name, away.name], teamColors: [home.colors, away.colors] };
}

function randomFactory(seed: number) {
  let value = seed >>> 0;
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function shuffledTeams(seed: number, playerTeamId: string): StreetTeam[] {
  const player = getStreetTeam(playerTeamId);
  const rest = STREET_TEAMS.filter((team) => team.id !== player.id);
  const random = randomFactory(seed);
  for (let index = rest.length - 1; index > 0; index--) {
    const swap = Math.floor(random() * (index + 1));
    [rest[index], rest[swap]] = [rest[swap]!, rest[index]!];
  }
  return [player, ...rest];
}

function simulateBracketMatch(homeId: string, awayId: string, random: () => number): BracketMatch {
  let homeGoals = Math.floor(random() * 5);
  let awayGoals = Math.floor(random() * 5);
  if (homeGoals === awayGoals) {
    if (random() > 0.5) homeGoals += 1;
    else awayGoals += 1;
  }
  return { homeId, awayId, homeGoals, awayGoals, winnerId: homeGoals > awayGoals ? homeId : awayId, automatic: true };
}

export function createTournament(seed = Date.now(), playerTeamId = 'candela'): TournamentState {
  const teams = shuffledTeams(seed, playerTeamId);
  const random = randomFactory(seed ^ 0xa81);
  const quarterfinals: BracketMatch[] = [{ homeId: teams[0]!.id, awayId: teams[1]!.id }];
  for (let index = 2; index < teams.length; index += 2) {
    quarterfinals.push(simulateBracketMatch(teams[index]!.id, teams[index + 1]!.id, random));
  }
  const semifinalB = simulateBracketMatch(quarterfinals[2]!.winnerId!, quarterfinals[3]!.winnerId!, random);
  const rounds: TournamentState['rounds'] = [
    quarterfinals,
    [{ homeId: '', awayId: quarterfinals[1]!.winnerId! }, semifinalB],
    [{ homeId: '', awayId: semifinalB.winnerId! }],
  ];
  return { seed, playerTeamId: teams[0]!.id, round: 0, rounds, eliminated: false };
}

export function currentTournamentMatch(tournament: TournamentState): BracketMatch | null {
  if (tournament.eliminated || tournament.championId) return null;
  return tournament.rounds[tournament.round][0] ?? null;
}

export function tournamentRoundName(round: number): TournamentRound {
  return (['Cuartos', 'Semifinal', 'Final'] as const)[Math.min(2, Math.max(0, round))]!;
}

export function recordTournamentResult(tournament: TournamentState, homeGoals: number, awayGoals: number): TournamentState {
  const next: TournamentState = structuredClone(tournament);
  const fixture = currentTournamentMatch(next);
  if (!fixture) return next;
  const tieWinner = ((next.seed + next.round) & 1) === 0 ? fixture.homeId : fixture.awayId;
  fixture.homeGoals = homeGoals;
  fixture.awayGoals = awayGoals;
  fixture.winnerId = homeGoals > awayGoals ? fixture.homeId : awayGoals > homeGoals ? fixture.awayId : tieWinner;
  if (fixture.winnerId !== next.playerTeamId) {
    next.eliminated = true;
    return next;
  }
  if (next.round === 2) {
    next.championId = next.playerTeamId;
    return next;
  }
  next.round = (next.round + 1) as TournamentState['round'];
  const nextFixture = next.rounds[next.round][0]!;
  nextFixture.homeId = next.playerTeamId;
  return next;
}

export function createQuickMatchTeams(seed = Math.random()): [StreetTeam, StreetTeam] {
  const home = STREET_TEAMS[0]!;
  const index = 1 + Math.floor(seed * (STREET_TEAMS.length - 1));
  return [home, STREET_TEAMS[index]!];
}

export const UNIFORM_STYLES = {
  candela: { name: 'Camiseta Candela', colors: ['#ff5b35', '#ffe76d'] as [string, string] },
  violet: { name: 'Sudadera violeta', colors: ['#8f4bdf', '#f6ce58'] as [string, string] },
  mint: { name: 'Remera menta', colors: ['#27bd9f', '#1f4265'] as [string, string] },
} as const;

export const BOOT_STYLES = {
  classic: { name: 'Botines clásicos', color: '#fff1d2' },
  neon: { name: 'Botines neón', color: '#dfff43' },
  gold: { name: 'Botines dorados', color: '#ffbe42' },
} as const;

export type UniformId = keyof typeof UNIFORM_STYLES;
export type BootId = keyof typeof BOOT_STYLES;
