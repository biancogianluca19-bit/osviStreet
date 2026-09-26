import { describe, expect, it } from 'vitest';
import { collideBallWithWalls } from '../src/game/physics';
import { createMatch, stepMatch } from '../src/game/rules';
import { FIELD, type Ball } from '../src/game/types';

const ball = (): Ball => ({
  position: { x: 0, z: 0 }, height: FIELD.ballRadius,
  velocity: { x: 0, z: 0 }, verticalVelocity: 0, ownerId: null, lastKickerId: null,
  lastTouch: 0, wallBounces: 0, trailTimer: 0, specialShot: false,
});

describe('Fase 1: partido callejero', () => {
  it('crea dos equipos con cuatro jugadores de campo y un arquero', () => {
    const state = createMatch();
    expect(state.players).toHaveLength(10);
    for (const team of [0, 1] as const) {
      expect(state.players.filter((player) => player.team === team && player.role === 'field')).toHaveLength(4);
      expect(state.players.filter((player) => player.team === team && player.role === 'keeper')).toHaveLength(1);
    }
  });

  it('rebota en las bandas y suma el rebote', () => {
    const ballState = ball();
    ballState.position.z = FIELD.halfWidth;
    ballState.velocity.z = 7;
    const result = collideBallWithWalls(ballState);
    expect(result.bounced).toBe(true);
    expect(ballState.velocity.z).toBeLessThan(0);
    expect(ballState.wallBounces).toBe(1);
  });

  it('deja pasar la pelota por el arco, pero rebota contra la pared fuera del arco', () => {
    const goalBall = ball();
    goalBall.position.x = FIELD.halfLength;
    expect(collideBallWithWalls(goalBall).scoredFor).toBe(0);

    const wallBall = ball();
    wallBall.position.x = FIELD.halfLength;
    wallBall.position.z = FIELD.goalHalfWidth + 0.4;
    expect(collideBallWithWalls(wallBall).bounced).toBe(true);
    expect(wallBall.velocity.x).toBe(0);
  });

  it('permite rematar con la pelota controlada', () => {
    const state = createMatch();
    state.phase = 'playing';
    state.ball.ownerId = 't0-p1';
    stepMatch(state, { move: { x: 1, z: 0 }, sprint: false, slide: false, action: 'shoot' });
    expect(state.ball.ownerId).toBeNull();
    expect(state.teams[0].shots).toBe(1);
    expect(state.ball.velocity.x).toBeGreaterThan(0);
  });

  it('hace viajar un pase y no devuelve la pelota al pasador', () => {
    const state = createMatch();
    state.phase = 'playing';
    state.ball.ownerId = 't0-p1';
    const controls = { move: { x: 1, z: 0 }, sprint: false, slide: false, action: 'pass' as const };

    stepMatch(state, controls);
    stepMatch(state, { ...controls, action: undefined });

    expect(state.ball.ownerId).not.toBe('t0-p1');
    expect(state.events.some((event) => event.type === 'kick' && event.playerId === 't0-p1' && event.text === 'PASE')).toBe(true);
    expect(state.ball.lastKickerId).toBe('t0-p1');
  });

  it('registra la barrida al tocar la acción aunque no haya un rival cerca', () => {
    const state = createMatch();
    state.phase = 'playing';
    state.ball.ownerId = null;

    stepMatch(state, { move: { x: 0, z: 0 }, sprint: false, slide: true });

    expect(state.events.some((event) => event.type === 'tackle' && event.team === 0 && event.text === 'BARRIDA')).toBe(true);
  });

  it('termina el partido al alcanzar el quinto gol', () => {
    const state = createMatch();
    state.phase = 'playing';
    state.teams[0].score = 4;
    state.ball.ownerId = null;
    state.ball.position.x = FIELD.halfLength - 0.2;
    state.ball.position.z = 0;
    state.ball.velocity.x = 10;
    stepMatch(state, { move: { x: 0, z: 0 }, sprint: false, slide: false });
    expect(state.teams[0].score).toBe(5);
    expect(state.phase).toBe('finished');
  });

  it('termina el partido cuando se agotan los tres minutos', () => {
    const state = createMatch({ duration: 1 / 50 });
    state.phase = 'playing';
    stepMatch(state, { move: { x: 0, z: 0 }, sprint: false, slide: false }, 1 / 60);
    stepMatch(state, { move: { x: 0, z: 0 }, sprint: false, slide: false }, 1 / 60);
    expect(state.remaining).toBe(0);
    expect(state.phase).toBe('finished');
  });
});
