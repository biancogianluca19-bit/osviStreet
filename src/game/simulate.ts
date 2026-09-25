import { createMatch, stepMatch } from './rules';
import type { Difficulty, MatchState, PlayerControls } from './types';

export interface SimulatedResult {
  homeGoals: number;
  awayGoals: number;
  goals: number;
  shots: number;
  saves: number;
  wallBounces: number;
  tricks: number;
}

export interface SimulationSummary {
  matches: number;
  averageGoals: number;
  averageShots: number;
  noShotMatches: number;
  homeWins: number;
  awayWins: number;
  draws: number;
  results: SimulatedResult[];
}

export function simulateAiMatch(seed: number, difficulty: Difficulty = 1): SimulatedResult {
  const state: MatchState = createMatch({ seed, difficulty });
  const idle: PlayerControls = { move: { x: 0, z: 0 }, sprint: false, slide: false };
  const maxFrames = Math.ceil(state.remaining * 60) + 120;
  let tricks = 0;
  let seenEventId = state.eventId;
  for (let frame = 0; frame < maxFrames && state.phase !== 'finished'; frame++) {
    stepMatch(state, idle, 1 / 60, difficulty, true);
    for (const event of state.events) {
      if (event.id <= seenEventId) continue;
      if (event.type === 'trick') tricks += 1;
    }
    seenEventId = state.eventId;
  }
  return {
    homeGoals: state.teams[0].score,
    awayGoals: state.teams[1].score,
    goals: state.teams[0].score + state.teams[1].score,
    shots: state.teams[0].shots + state.teams[1].shots,
    saves: state.teams[0].saves + state.teams[1].saves,
    wallBounces: state.ball.wallBounces,
    tricks,
  };
}

export function simulateAiMatches(count = 200, difficulty: Difficulty = 1, firstSeed = 26_092_500): SimulationSummary {
  if (!Number.isInteger(count) || count < 1) throw new RangeError('count debe ser un entero positivo');
  const results: SimulatedResult[] = [];
  for (let i = 0; i < count; i++) results.push(simulateAiMatch(firstSeed + i, difficulty));
  const totalGoals = results.reduce((sum, match) => sum + match.goals, 0);
  const totalShots = results.reduce((sum, match) => sum + match.shots, 0);
  return {
    matches: count,
    averageGoals: totalGoals / count,
    averageShots: totalShots / count,
    noShotMatches: results.filter((match) => match.shots === 0).length,
    homeWins: results.filter((match) => match.homeGoals > match.awayGoals).length,
    awayWins: results.filter((match) => match.awayGoals > match.homeGoals).length,
    draws: results.filter((match) => match.homeGoals === match.awayGoals).length,
    results,
  };
}
