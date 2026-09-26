import { describe, expect, it } from 'vitest';
import { crowdPose } from '../src/game/crowd';

describe('animación de hinchada', () => {
  it('mantiene un movimiento leve antes del gol', () => {
    const pose = crowdPose(Math.PI / 12.8, 0, 0);
    expect(pose.bounce).toBeCloseTo(0.025);
    expect(pose.bodyScale).toBe(1);
    expect(pose.arms[0].rotationZ).toBeCloseTo(0.5);
    expect(pose.arms[1].rotationZ).toBeCloseTo(-0.5);
  });

  it('levanta y mueve los brazos cuando sube la energía del gol', () => {
    const pose = crowdPose(0, 0, 1);
    const jumping = crowdPose(Math.PI / 12.8, 0, 1);
    expect(jumping.bounce).toBeCloseTo(0.345);
    expect(pose.bodyScale).toBeCloseTo(1.1);
    expect(Math.abs(pose.arms[0].rotationZ)).toBeLessThan(0.2);
    expect(Math.abs(pose.arms[1].rotationZ)).toBeLessThan(0.2);
  });

  it('limita la energía recibida al rango permitido', () => {
    expect(crowdPose(0, 0, -1)).toEqual(crowdPose(0, 0, 0));
    expect(crowdPose(0, 0, 2)).toEqual(crowdPose(0, 0, 1));
    expect(crowdPose(0, 0, Number.NaN)).toEqual(crowdPose(0, 0, 0));
  });
});
