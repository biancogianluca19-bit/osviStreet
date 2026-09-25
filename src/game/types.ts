import type { TrickId } from './tricks';

export type TeamId = 0 | 1;
export type PlayerRole = 'field' | 'keeper';
export type MatchPhase = 'kickoff' | 'playing' | 'goal' | 'finished';
export type ActionId = 'pass' | 'lob' | 'wallpass' | 'shoot' | 'slide' | 'trick' | 'special';
export type Difficulty = 0 | 1 | 2;

export interface Vec2 {
  x: number;
  z: number;
}

export interface Footballer {
  id: string;
  team: TeamId;
  role: PlayerRole;
  position: Vec2;
  velocity: Vec2;
  facing: Vec2;
  stamina: number;
  actionCooldown: number;
  stun: number;
  tackleCooldown: number;
  saveCooldown: number;
  trickCooldown: number;
  trickId?: TrickId;
  trickTimer: number;
  celebration: number;
}

export interface Ball {
  position: Vec2;
  height: number;
  velocity: Vec2;
  verticalVelocity: number;
  ownerId: string | null;
  lastTouch: TeamId | null;
  wallBounces: number;
  trailTimer: number;
  specialShot: boolean;
}

export interface Team {
  id: TeamId;
  name: string;
  primary: string;
  secondary: string;
  score: number;
  shots: number;
  saves: number;
}

export interface GameEvent {
  id: number;
  type: 'kick' | 'bounce' | 'goal' | 'save' | 'tackle' | 'trick' | 'special' | 'foul';
  text: string;
  team?: TeamId;
  playerId?: string;
  position: Vec2;
  timer: number;
}

export interface MatchState {
  phase: MatchPhase;
  elapsed: number;
  remaining: number;
  frame: number;
  seed: number;
  difficulty: Difficulty;
  targetScore: number;
  teams: [Team, Team];
  players: Footballer[];
  ball: Ball;
  events: GameEvent[];
  eventId: number;
  kickoffTimer: number;
  kickoffTeam: TeamId;
  selectedPlayerId: string;
  nextAiAction: number[];
  skill: [number, number];
}

export interface PlayerControls {
  move: Vec2;
  sprint: boolean;
  slide: boolean;
  action?: ActionId;
  special?: boolean;
  trickId?: TrickId;
}

export interface MatchOptions {
  seed?: number;
  duration?: number;
  targetScore?: number;
  teamNames?: [string, string];
  teamColors?: [[string, string], [string, string]];
  difficulty?: Difficulty;
}

export const FIELD = {
  halfLength: 12,
  halfWidth: 7,
  wallInset: 0.45,
  goalHalfWidth: 1.5,
  goalHeight: 2.8,
  playerRadius: 0.42,
  ballRadius: 0.24,
  targetScore: 5,
  duration: 180,
} as const;
