import { describe, expect, it } from 'vitest';
import { createTeamAiControls, keeperTargetZ } from '../src/game/ai';
import { createMatch } from '../src/game/rules';

describe('Fase 3: decisiones de IA', () => {
  it('presiona con un jugador y ajusta el ritmo según dificultad', () => {
    const state = createMatch({ seed: 7 });
    state.phase = 'playing';
    state.ball.ownerId = 't0-p1';
    const easy = createTeamAiControls(state, 1, 0).get('t1-p0')!;
    const hard = createTeamAiControls(state, 1, 2).get('t1-p0')!;
    expect(Math.hypot(easy.move.x, easy.move.z)).toBeCloseTo(0.76);
    expect(Math.hypot(hard.move.x, hard.move.z)).toBeCloseTo(1);
  });

  it('el arquero predice la trayectoria y reacciona antes en dificultad alta', () => {
    const state = createMatch();
    state.ball.position = { x: 4, z: 0 };
    state.ball.velocity = { x: 10, z: 1 };
    const easy = keeperTargetZ(state, 1, 0);
    const hard = keeperTargetZ(state, 1, 2);
    expect(easy).toBeGreaterThan(0);
    expect(hard).toBeGreaterThan(easy);
    expect(hard).toBeLessThanOrEqual(1.32);
  });

  it('usa un pase de pared para abrir la cancha cuando conduce junto a la banda', () => {
    const state = createMatch({ seed: 19 });
    state.phase = 'playing';
    state.ball.ownerId = 't0-p1';
    const carrier = state.players.find((player) => player.id === 't0-p1')!;
    carrier.position = { x: 0, z: 6 };
    const controls = createTeamAiControls(state, 0, 2).get(carrier.id);
    expect(controls?.action).toBe('wallpass');
  });

  it('elige trucos si un defensor queda a distancia de regate', () => {
    const state = createMatch({ seed: 1 });
    state.phase = 'playing';
    state.ball.ownerId = 't0-p1';
    const carrier = state.players.find((player) => player.id === 't0-p1')!;
    const defender = state.players.find((player) => player.id === 't1-p0')!;
    defender.position = { x: carrier.position.x + 0.8, z: carrier.position.z };
    const decisions = Array.from({ length: 60 }, (_, seed) => {
      state.seed = seed;
      return createTeamAiControls(state, 0, 2).get(carrier.id)?.trickId;
    });
    expect(decisions.some(Boolean)).toBe(true);
  });

  it('el arquero distribuye la pelota cuando la controla', () => {
    const state = createMatch();
    state.phase = 'playing';
    state.ball.ownerId = 't1-keeper';
    expect(createTeamAiControls(state, 1, 1).get('t1-keeper')?.action).toBe('pass');
  });
});
