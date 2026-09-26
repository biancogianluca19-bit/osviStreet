import { describe, expect, it } from 'vitest';
import { ACTION_BUFFER_MS, actionWaitNotice, GOAL_RESTART_DELAY_SECONDS } from '../src/game/timing';

describe('buffer y aviso de acciones', () => {
  it('conserva la acción durante todo el reinicio después de un gol', () => {
    expect(ACTION_BUFFER_MS).toBeGreaterThan(GOAL_RESTART_DELAY_SECONDS * 1_000);
    expect(ACTION_BUFFER_MS - GOAL_RESTART_DELAY_SECONDS * 1_000).toBeGreaterThanOrEqual(250);
  });

  it('distingue el saque pendiente de la falta de posesión', () => {
    expect(actionWaitNotice('goal', false)).toBe('ESPERA EL SAQUE');
    expect(actionWaitNotice('kickoff', false)).toBe('ESPERA EL SAQUE');
    expect(actionWaitNotice('playing', false)).toBe('RECUPERA LA PELOTA');
    expect(actionWaitNotice('playing', true)).toBeUndefined();
    expect(actionWaitNotice('finished', false)).toBeUndefined();
  });
});
