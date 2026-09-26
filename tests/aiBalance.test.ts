import { describe, expect, it } from 'vitest';
import { simulateAiMatches } from '../src/game/simulate';

describe('Simulación de balance', () => {
  it('juega 200 partidos, genera remates y promedia cerca de seis goles', () => {
    const summary = simulateAiMatches(200, 1);
    console.info('IA balance 200:', JSON.stringify({ matches: summary.matches, averageGoals: summary.averageGoals, averageShots: summary.averageShots, averageSaves: summary.results.reduce((sum, match) => sum + match.saves, 0) / summary.matches, noShotMatches: summary.noShotMatches, homeWins: summary.homeWins, awayWins: summary.awayWins, draws: summary.draws }));
    expect(summary.matches).toBe(200);
    expect(summary.averageGoals).toBeGreaterThanOrEqual(5);
    expect(summary.averageGoals).toBeLessThanOrEqual(7);
    expect(summary.noShotMatches).toBe(0);
    expect(summary.results.every((match) => match.homeGoals <= 5 && match.awayGoals <= 5)).toBe(true);
  }, 1_200_000);
});
