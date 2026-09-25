import { describe, expect, it } from 'vitest';
import { createMatch, performTrick, stepMatch } from '../src/game/rules';
import { addStyle, canUseSpecialShot, spendSpecialShot } from '../src/game/styleMeter';
import { DEFAULT_TRICK, TRICKS, trickFromSwipe } from '../src/game/tricks';

describe('Fase 2: trucos y estilo', () => {
  it('incluye ocho trucos distintos y selecciona los ocho con un deslizamiento', () => {
    expect(TRICKS).toHaveLength(8);
    expect(new Set(TRICKS.map((trick) => trick.id)).size).toBe(8);
    const swipes = [[50, 0], [50, 50], [0, 50], [-50, 50], [-50, 0], [-50, -50], [0, -50], [50, -50]] as const;
    expect(swipes.map(([x, y]) => trickFromSwipe(x, y))).toEqual(TRICKS.map((trick) => trick.id));
    expect(trickFromSwipe(5, -4)).toBe(DEFAULT_TRICK);
  });

  it('cada truco activa su gesto, evento y puntos de estilo', () => {
    for (const trick of TRICKS) {
      const state = createMatch();
      state.phase = 'playing';
      expect(performTrick(state, 't0-p1', trick.id)).toBe(true);
      expect(state.players.find((player) => player.id === 't0-p1')?.trickId).toBe(trick.id);
      expect(state.skill[0]).toBeGreaterThanOrEqual(10);
      expect(state.events.at(-1)?.type).toBe('trick');
    }
  });

  it('el caño y el sombrerito recompensan la humillación y pueden robar la pelota', () => {
    const state = createMatch();
    state.phase = 'playing';
    const attacker = state.players.find((player) => player.id === 't0-p1')!;
    const victim = state.players.find((player) => player.id === 't1-p0')!;
    victim.position = { x: attacker.position.x + 0.5, z: attacker.position.z };
    state.ball.ownerId = victim.id;
    expect(performTrick(state, attacker.id, 'canio')).toBe(true);
    expect(state.ball.ownerId).toBe(attacker.id);
    expect(state.skill[0]).toBe(28);
    expect(victim.stun).toBeGreaterThan(0);
  });

  it('el estilo se limita a 100 y solo ese valor habilita el remate especial', () => {
    expect(addStyle(94, 10)).toBe(100);
    expect(addStyle(2, -8)).toBe(0);
    expect(canUseSpecialShot(99)).toBe(false);
    expect(canUseSpecialShot(100)).toBe(true);
    expect(spendSpecialShot(99)).toBe(99);
    expect(spendSpecialShot(100)).toBe(0);
  });

  it('un remate con la barra llena se vuelve especial y consume el estilo', () => {
    const state = createMatch();
    state.phase = 'playing';
    state.skill[0] = 100;
    state.ball.ownerId = 't0-p1';
    stepMatch(state, { move: { x: 1, z: 0 }, sprint: false, slide: false, action: 'shoot' });
    expect(state.ball.specialShot).toBe(true);
    expect(state.skill[0]).toBe(0);
  });
});
