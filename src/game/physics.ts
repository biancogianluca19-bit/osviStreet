import { FIELD, type Ball, type Vec2 } from './types';

const FIELD_X = FIELD.halfLength - FIELD.wallInset;
const FIELD_Z = FIELD.halfWidth - FIELD.wallInset;

export interface WallResult {
  bounced: boolean;
  scoredFor: 0 | 1 | null;
}

export function reflectVector(vector: Vec2, normal: Vec2, restitution = 0.74): Vec2 {
  const dot = vector.x * normal.x + vector.z * normal.z;
  return {
    x: vector.x - (1 + restitution) * dot * normal.x,
    z: vector.z - (1 + restitution) * dot * normal.z,
  };
}

export function collideBallWithWalls(ball: Ball): WallResult {
  let bounced = false;
  let scoredFor: 0 | 1 | null = null;

  if (Math.abs(ball.position.z) > FIELD_Z) {
    const normal: Vec2 = { x: 0, z: Math.sign(ball.position.z) };
    ball.position.z = normal.z * FIELD_Z;
    ball.velocity = reflectVector(ball.velocity, normal);
    bounced = true;
  }

  if (Math.abs(ball.position.x) > FIELD_X) {
    const beyondGoalMouth = Math.abs(ball.position.z) < FIELD.goalHalfWidth;
    const underCrossbar = ball.height < FIELD.goalHeight;
    if (beyondGoalMouth && underCrossbar) {
      scoredFor = ball.position.x > 0 ? 0 : 1;
    } else {
      const normal: Vec2 = { x: Math.sign(ball.position.x), z: 0 };
      ball.position.x = normal.x * FIELD_X;
      ball.velocity = reflectVector(ball.velocity, normal, 0.62);
      bounced = true;
    }
  }

  if (bounced) ball.wallBounces += 1;
  return { bounced, scoredFor };
}

export function stepBall(ball: Ball, dt: number): WallResult {
  if (ball.ownerId) return { bounced: false, scoredFor: null };
  ball.position.x += ball.velocity.x * dt;
  ball.position.z += ball.velocity.z * dt;
  ball.height += ball.verticalVelocity * dt;
  ball.verticalVelocity -= 15 * dt;
  if (ball.height < FIELD.ballRadius) {
    ball.height = FIELD.ballRadius;
    if (ball.verticalVelocity < -1.2) ball.verticalVelocity *= -0.43;
    else ball.verticalVelocity = 0;
  }
  const damp = Math.exp(-0.85 * dt);
  ball.velocity.x *= damp;
  ball.velocity.z *= damp;
  ball.verticalVelocity *= Math.exp(-0.16 * dt);
  const result = collideBallWithWalls(ball);
  if (Math.hypot(ball.velocity.x, ball.velocity.z) < 0.18 && ball.height <= FIELD.ballRadius + 0.01) {
    ball.velocity = { x: 0, z: 0 };
    ball.verticalVelocity = 0;
  }
  ball.trailTimer = Math.max(0, ball.trailTimer - dt);
  return result;
}
