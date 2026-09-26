import { describe, expect, it } from 'vitest';
import { createTeamAiControls, keeperTargetZ } from '../src/game/ai';
import { createMatch, stepMatch } from '../src/game/rules';

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

  it('mantiene en movimiento a los compañeros del usuario y los manda a ofrecerse', () => {
    const state = createMatch({ seed: 23 });
    state.phase = 'playing';
    state.ball.ownerId = 't0-p1';
    const supportPlayers = state.players.filter((player) => player.team === 0 && player.role === 'field' && player.id !== state.selectedPlayerId);
    const initialPositions = new Map(supportPlayers.map((player) => [player.id, { ...player.position }]));
    const idle = { move: { x: 0, z: 0 }, sprint: false, slide: false };

    for (let frame = 0; frame < 30; frame++) stepMatch(state, idle, 1 / 60);

    for (const player of supportPlayers) {
      const start = initialPositions.get(player.id)!;
      expect(Math.hypot(player.position.x - start.x, player.position.z - start.z), player.id).toBeGreaterThan(0.2);
    }
  });

  it('la primera partida asiste al jugador quieto mientras sus compañeros suben líneas', () => {
    const state = createMatch({ seed: 28, difficulty: 0 });
    state.phase = 'playing';
    state.ball.ownerId = 't0-p1';
    const carrier = state.players.find((player) => player.id === 't0-p1')!;
    const idle = { move: { x: 0, z: 0 }, sprint: false, slide: false };

    for (let frame = 0; frame < 8; frame++) stepMatch(state, idle, 1 / 60, 0, false, undefined, true);

    expect(carrier.velocity.x).toBeGreaterThan(0.02);
    const easyChaser = createTeamAiControls(state, 1, 0).get('t1-p0')!;
    const normalChaser = createTeamAiControls(state, 1, 1).get('t1-p0')!;
    expect(Math.hypot(normalChaser.move.x, normalChaser.move.z)).toBeGreaterThan(Math.hypot(easyChaser.move.x, easyChaser.move.z));
  });

  it('da una primera victoria a quien todavía no conoce los controles', () => {
    const state = createMatch({ seed: 2026, difficulty: 0 });
    const idle = { move: { x: 0, z: 0 }, sprint: false, slide: false };
    for (let frame = 0; frame < 10_920 && state.phase !== 'finished'; frame++) {
      stepMatch(state, idle, 1 / 60, 0, false, undefined, true);
    }
    expect(state.phase).toBe('finished');
    expect(state.teams[0].score).toBeGreaterThan(state.teams[1].score);
  }, 30_000);

  it('también activa a los compañeros de ambos jugadores en el duelo local', () => {
    const state = createMatch({ seed: 24, localPlayers: 2 });
    state.phase = 'playing';
    state.ball.ownerId = 't1-p1';
    const supportPlayers = state.players.filter((player) => player.team === 1 && player.role === 'field' && player.id !== 't1-p1');
    const initialPositions = new Map(supportPlayers.map((player) => [player.id, { ...player.position }]));
    const idle = { move: { x: 0, z: 0 }, sprint: false, slide: false };

    for (let frame = 0; frame < 30; frame++) stepMatch(state, idle, 1 / 60, state.difficulty, false, idle);

    for (const player of supportPlayers) {
      const start = initialPositions.get(player.id)!;
      expect(Math.hypot(player.position.x - start.x, player.position.z - start.z), player.id).toBeGreaterThan(0.2);
    }
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
