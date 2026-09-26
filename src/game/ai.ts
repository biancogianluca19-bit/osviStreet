import { FIELD, type Difficulty, type Footballer, type MatchState, type PlayerControls, type TeamId, type Vec2 } from './types';
import { TRICKS } from './tricks';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const distance = (a: Vec2, b: Vec2) => Math.hypot(a.x - b.x, a.z - b.z);
const normalize = (value: Vec2): Vec2 => {
  const magnitude = Math.hypot(value.x, value.z) || 1;
  return { x: value.x / magnitude, z: value.z / magnitude };
};
const toward = (from: Vec2, to: Vec2) => normalize({ x: to.x - from.x, z: to.z - from.z });

function randomFor(state: MatchState, player: Footballer, salt = 0): number {
  const playerIndex = Number(player.id.slice(-1)) || 0;
  let value = (state.seed * 1664525 + state.frame * 1013904223 + playerIndex * 374761393 + salt * 668265263) | 0;
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  value ^= value >>> 16;
  return (value >>> 0) / 4294967296;
}

function moveToward(player: Footballer, target: Vec2, difficulty: Difficulty, sprint = false): PlayerControls {
  const pace = difficulty === 0 ? 0.76 : difficulty === 1 ? 0.92 : 1;
  const direction = toward(player.position, target);
  return {
    move: { x: direction.x * pace, z: direction.z * pace },
    sprint: sprint && difficulty > 0,
    slide: false,
  };
}

export function keeperTargetZ(state: MatchState, team: TeamId, difficulty: Difficulty): number {
  const goalX = team === 0 ? -10.35 : 10.35;
  const attackSign = team === 0 ? 1 : -1;
  const velocityTowardGoal = state.ball.velocity.x * -attackSign;
  const reaction = difficulty === 0 ? 0.56 : difficulty === 1 ? 0.2 : 0.1;
  let targetZ = state.ball.position.z * 0.38;
  if (velocityTowardGoal > 2) {
    const distanceToLine = goalX - state.ball.position.x;
    const drag = Math.hypot(state.ball.velocity.x, state.ball.velocity.z) > 10 ? 0.34 : 0.85;
    const travelFraction = 1 - drag * distanceToLine / state.ball.velocity.x;
    const timeToLine = travelFraction > 0 ? -Math.log(travelFraction) / drag : Infinity;
    if (timeToLine > 0 && timeToLine < 1.7) {
      const lead = Math.max(0, timeToLine - reaction);
      targetZ = state.ball.position.z + state.ball.velocity.z * (1 - Math.exp(-drag * lead)) / drag;
      const shotBias = Math.sin((state.seed + team * 97) * 12.9898) * 43758.5453;
      const stableRoll = shotBias - Math.floor(shotBias);
      const errorRange = (difficulty === 0 ? 1.6 : difficulty === 1 ? 1 : 0.56) +
        (state.ball.specialShot ? (difficulty === 0 ? 1.15 : difficulty === 1 ? 0.95 : 0.7) : 0);
      targetZ += (stableRoll - 0.5) * errorRange * 2;
    }
  }
  const keeperReachLimit = FIELD.goalHalfWidth - 0.18;
  return clamp(targetZ, -keeperReachLimit, keeperReachLimit);
}

function nearestField(players: Footballer[], point: Vec2) {
  return players.filter((player) => player.role === 'field').sort((a, b) => distance(a.position, point) - distance(b.position, point))[0];
}

function openForwardTeammate(state: MatchState, player: Footballer, team: TeamId): Footballer | undefined {
  const attack = team === 0 ? 1 : -1;
  return state.players
    .filter((candidate) => candidate.team === team && candidate.role === 'field' && candidate.id !== player.id)
    .filter((candidate) => (candidate.position.x - player.position.x) * attack > 1.25)
    .filter((candidate) => !state.players.some((opponent) => {
      if (opponent.team === team || opponent.role !== 'field') return false;
      const dx = candidate.position.x - player.position.x;
      const dz = candidate.position.z - player.position.z;
      const denominator = dx * dx + dz * dz || 1;
      const t = clamp(((opponent.position.x - player.position.x) * dx + (opponent.position.z - player.position.z) * dz) / denominator, 0, 1);
      const closest = { x: player.position.x + dx * t, z: player.position.z + dz * t };
      return distance(opponent.position, closest) < 1.1;
    }))
    .sort((a, b) => distance(a.position, player.position) - distance(b.position, player.position))[0];
}

function keeperControls(state: MatchState, player: Footballer, team: TeamId, difficulty: Difficulty): PlayerControls {
  const goalX = team === 0 ? -10.35 : 10.35;
  const targetZ = keeperTargetZ(state, team, difficulty);
  const keeperPace = difficulty === 0 ? 0.62 : difficulty === 1 ? 0.94 : 1;
  return {
    move: {
      x: clamp((goalX - player.position.x) * 1.1, -1, 1) * keeperPace,
      z: clamp((targetZ - player.position.z) * 1.35, -1, 1) * keeperPace,
    },
    sprint: difficulty === 2 && Math.abs(targetZ - player.position.z) > 0.6,
    slide: false,
  };
}

function supportTarget(
  state: MatchState,
  player: Footballer,
  anchor: Vec2,
  team: TeamId,
  teammates: Footballer[],
  opponents: Footballer[],
): Vec2 {
  const attack = team === 0 ? 1 : -1;
  const index = Number(player.id.slice(-1)) || 0;
  const lane = [-4.6, -1.7, 1.7, 4.6][index] ?? 0;
  const run = Math.sin(state.elapsed * 1.18 + index * 1.9);
  const overlap = Math.sin(state.elapsed * 1.75 + index * 2.4) * 1.12;
  const sway = Math.sin(state.elapsed * 0.76 + index * 2.3) * 1.05;
  const forwardRun = index % 2 === 0 ? 2.9 : 4.45;
  const target = {
    x: clamp(anchor.x + attack * (forwardRun + run * 1.05 + overlap), -9.7, 9.7),
    z: clamp(lane * 0.72 + clamp(anchor.z * 0.28, -1.6, 1.6) + sway, -5.8, 5.8),
  };

  const marker = nearestField(opponents, target);
  if (marker && distance(marker.position, target) < 2.55) {
    const openSide = target.z >= marker.position.z ? 1 : -1;
    target.z = clamp(target.z + openSide * 1.8, -5.8, 5.8);
  }
  const nearbyTeammate = nearestField(teammates.filter((candidate) => candidate.id !== player.id), target);
  if (nearbyTeammate && distance(nearbyTeammate.position, target) < 1.7) {
    const openSide = target.z >= nearbyTeammate.position.z ? 1 : -1;
    target.z = clamp(target.z + openSide * 1.15, -5.8, 5.8);
  }
  return target;
}

/** Choose a pressure, cover, support, keeper, or ball-carrying role for each AI player. */
export function createTeamAiControls(state: MatchState, team: TeamId, difficulty: Difficulty): Map<string, PlayerControls> {
  const teammates = state.players.filter((player) => player.team === team);
  const fieldPlayers = teammates.filter((player) => player.role === 'field');
  const opponents = state.players.filter((player) => player.team !== team && player.role === 'field');
  const owner = state.players.find((player) => player.id === state.ball.ownerId);
  const attack = team === 0 ? 1 : -1;
  const goal = { x: attack * (FIELD.halfLength + 1), z: 0 };
  const chaser = nearestField(fieldPlayers, owner?.team === team ? owner.position : state.ball.position);
  const ballCarrier = owner?.team === team ? owner : undefined;
  const carrierDistanceToGoal = ballCarrier ? FIELD.halfLength - ballCarrier.position.x * attack : Infinity;
  const controls = new Map<string, PlayerControls>();

  for (const player of teammates) {
    if (player.role === 'keeper') {
      const keeperMove = keeperControls(state, player, team, difficulty);
      if (owner?.id === player.id) keeperMove.action = 'pass';
      controls.set(player.id, keeperMove);
      continue;
    }

    if (player.id === ballCarrier?.id) {
      const pressure = nearestField(opponents, player.position);
      const pressureDistance = pressure ? distance(pressure.position, player.position) : Infinity;
      const laneMate = openForwardTeammate(state, player, team);
      const hasWallLane = Math.abs(player.position.z) > 2.7 && carrierDistanceToGoal > 7;
      const roll = randomFor(state, player);
      const move = moveToward(player, goal, difficulty, true);
      if (pressureDistance < 1.55 && player.trickCooldown <= 0 && roll < (difficulty === 0 ? 0.16 : difficulty === 1 ? 0.3 : 0.46)) {
        move.trickId = TRICKS[Math.floor(randomFor(state, player, 1) * TRICKS.length)].id;
      }
      const shootsNow = carrierDistanceToGoal < 10.2 ||
        (carrierDistanceToGoal < 12.5 && !laneMate && pressureDistance < 2.5) ||
        (carrierDistanceToGoal < 14 && roll > 0.88);
      if (shootsNow) {
        const goalkeeper = state.players.find((candidate) => candidate.team !== team && candidate.role === 'keeper');
        const openSide = goalkeeper && Math.abs(goalkeeper.position.z) > 0.24
          ? -Math.sign(goalkeeper.position.z)
          : randomFor(state, player, 3) > 0.5 ? 1 : -1;
        const aimError = difficulty === 0 ? 2.1 : difficulty === 1 ? 1.3 : 0.72;
        const aim = { x: goal.x, z: openSide * (FIELD.goalHalfWidth - 0.1) + (randomFor(state, player, 4) - 0.5) * aimError };
        const shotControls = moveToward(player, aim, difficulty, true);
        Object.assign(move, shotControls);
        move.action = 'shoot';
      } else if (hasWallLane && (roll < 0.42 || Math.abs(player.position.z) > 5.6)) {
        move.action = 'wallpass';
      } else if (laneMate && roll < (difficulty === 0 ? 0.4 : difficulty === 1 ? 0.63 : 0.78)) {
        move.action = difficulty === 0 && randomFor(state, player, 4) < 0.18 ? 'lob' : 'pass';
      }
      controls.set(player.id, move);
      continue;
    }

    if (owner?.team === team) {
      const support = supportTarget(state, player, owner.position, team, teammates, opponents);
      controls.set(player.id, moveToward(player, support, difficulty, distance(player.position, support) > 3));
      continue;
    }

    if (owner?.team !== undefined && owner.team !== team) {
      if (player.id === chaser?.id) {
        const move = moveToward(player, owner.position, difficulty, true);
        const pressureDistance = distance(player.position, owner.position);
        const tackleOdds = difficulty === 0 ? 0.3 : difficulty === 1 ? 0.65 : 0.88;
        if (pressureDistance < 1.35 && player.tackleCooldown <= 0 && randomFor(state, player, 5) < tackleOdds) move.slide = true;
        controls.set(player.id, move);
      } else {
        const index = Number(player.id.slice(-1)) || 0;
        const mark = opponents[index % Math.max(1, opponents.length)];
        const cover = mark ? { x: mark.position.x * 0.42 + (team === 0 ? -8.1 : 8.1) * 0.58, z: mark.position.z * 0.58 } : { x: owner.position.x - attack * 3, z: owner.position.z };
        controls.set(player.id, moveToward(player, cover, difficulty, distance(player.position, cover) > 3));
      }
      continue;
    }

    if (player.id === chaser?.id) {
      controls.set(player.id, moveToward(player, state.ball.position, difficulty, true));
    } else {
      const support = supportTarget(state, player, state.ball.position, team, teammates, opponents);
      controls.set(player.id, moveToward(player, support, difficulty, distance(player.position, support) > 4));
    }
  }
  return controls;
}
