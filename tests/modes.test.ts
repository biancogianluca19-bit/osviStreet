import { describe, expect, it } from 'vitest';
import { createTournament, currentTournamentMatch, recordTournamentResult, STREET_TEAMS, teamOptions } from '../src/game/modes';
import { freshProgress, parseProgress, purchaseReward, recordCompletedMatch, selectReward } from '../src/game/progress';
import { createMatch, stepMatch } from '../src/game/rules';

describe('Fase 4: modos y recompensas', () => {
  it('arma una copa directa con ocho equipos ficticios y tres rondas', () => {
    const cup = createTournament(71);
    expect(STREET_TEAMS).toHaveLength(8);
    expect(new Set(cup.rounds[0].flatMap((match) => [match.homeId, match.awayId])).size).toBe(8);
    expect(cup.rounds).toHaveLength(3);
    expect(cup.rounds[0].slice(1).every((match) => Boolean(match.winnerId))).toBe(true);
  });

  it('asigna escudos originales y distintos a los ocho equipos', () => {
    const crests = STREET_TEAMS.map((team) => team.crest);
    expect(new Set(crests).size).toBe(8);
    const [home, away] = STREET_TEAMS;
    const match = createMatch(teamOptions(home!, away!));
    expect(match.teams.map((team) => team.crest)).toEqual([home!.crest, away!.crest]);
  });

  it('avanza por cuartos, semifinal y final hasta ser campeón', () => {
    let cup = createTournament(8);
    cup = recordTournamentResult(cup, 5, 1);
    expect(cup.round).toBe(1);
    expect(currentTournamentMatch(cup)?.homeId).toBe(cup.playerTeamId);
    cup = recordTournamentResult(cup, 3, 2);
    expect(cup.round).toBe(2);
    cup = recordTournamentResult(cup, 5, 4);
    expect(cup.championId).toBe(cup.playerTeamId);
  });

  it('convierte monedas de partidos en cosméticos equipables que persisten', () => {
    let profile = { ...freshProgress(), coins: 140 };
    expect(selectReward(profile, 'uniform-violet').uniform).toBe('candela');
    profile = purchaseReward(profile, 'uniform-violet').progress;
    profile = selectReward(profile, 'uniform-violet');
    expect(profile).toMatchObject({ coins: 105, uniform: 'violet' });
    profile = purchaseReward(profile, 'court-graffiti').progress;
    profile = selectReward(profile, 'court-graffiti');
    expect(parseProgress(JSON.stringify(profile))).toMatchObject({ court: 'court-graffiti', unlocked: expect.arrayContaining(['uniform-violet', 'court-graffiti']) });
    expect(profile.coins).toBe(15);
  });

  it('el saldo y los récords avanzan al completar partidos y nunca regalan artículos', () => {
    const result = recordCompletedMatch(freshProgress(), true, { goals: 2, tricks: 1 });
    expect(result.newUnlocks).toEqual([]);
    expect(result.progress).toMatchObject({ wins: 1, matches: 1, coins: expect.any(Number), records: { bestMatchGoals: 2, totalGoals: 2, totalTricks: 1 } });
  });

  it('deja controlar y rematar con el jugador 2 en el mismo dispositivo', () => {
    const game = createMatch({ localPlayers: 2 });
    game.phase = 'playing';
    game.ball.ownerId = 't1-p1';
    const controls = { move: { x: -1, z: 0 }, sprint: false, slide: false, action: 'shoot' as const };
    stepMatch(game, { move: { x: 0, z: 0 }, sprint: false, slide: false }, 1 / 60, game.difficulty, false, controls);
    expect(game.players.some((player) => player.id === game.selectedPlayerId && player.team === 0)).toBe(true);
    expect(game.secondSelectedPlayerId).toBe('t1-p1');
    expect(game.teams[1].shots).toBe(1);
    expect(game.ball.velocity.x).toBeLessThan(0);
  });
});
