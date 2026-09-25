import { FIELD, type ActionId, type Ball, type Footballer, type GameEvent, type MatchOptions, type MatchState, type PlayerControls, type TeamId, type Vec2 } from './types';
import { stepBall } from './physics';

const DEFAULT_TEAMS: [string, string] = ['Los Candela', 'Barrio Norte'];
const DEFAULT_COLORS: [[string, string], [string, string]] = [['#ff5b35', '#ffe76d'], ['#2bd9c0', '#332b62']];
const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));
const length = (v: Vec2) => Math.hypot(v.x, v.z);
const normalize = (v: Vec2): Vec2 => {
  const magnitude = length(v) || 1;
  return { x: v.x / magnitude, z: v.z / magnitude };
};
const toward = (from: Vec2, to: Vec2) => normalize({ x: to.x - from.x, z: to.z - from.z });

export function createMatch(options: MatchOptions = {}): MatchState {
  const names = options.teamNames ?? DEFAULT_TEAMS;
  const colors = options.teamColors ?? DEFAULT_COLORS;
  const players: Footballer[] = [];
  const fieldRows = [-3.45, -1.15, 1.15, 3.45];
  for (const team of [0, 1] as const) {
    const attack = team === 0 ? 1 : -1;
    const base = team === 0 ? -7.8 : 7.8;
    fieldRows.forEach((z, index) => {
      players.push({
        id: `t${team}-p${index}`,
        team,
        role: 'field',
        position: { x: base - attack * (index % 2) * 1.45, z },
        velocity: { x: 0, z: 0 },
        facing: { x: attack, z: 0 },
        stamina: 1,
        actionCooldown: 0,
        stun: 0,
        tackleCooldown: 0,
        trickCooldown: 0,
        celebration: 0,
      });
    });
    players.push({
      id: `t${team}-keeper`, team, role: 'keeper',
      position: { x: team === 0 ? -10.35 : 10.35, z: 0 },
      velocity: { x: 0, z: 0 }, facing: { x: attack, z: 0 }, stamina: 1,
      actionCooldown: 0, stun: 0, tackleCooldown: 0, trickCooldown: 0, celebration: 0,
    });
  }
  const ball: Ball = {
    position: { x: 0, z: 0 }, height: FIELD.ballRadius,
    velocity: { x: 0, z: 0 }, verticalVelocity: 0, ownerId: 't0-p1', lastTouch: 0,
    wallBounces: 0, trailTimer: 0, specialShot: false,
  };
  const state: MatchState = {
    phase: 'kickoff', elapsed: 0, remaining: options.duration ?? FIELD.duration,
    frame: 0, seed: options.seed ?? 2025,
    teams: [
      { id: 0, name: names[0], primary: colors[0][0], secondary: colors[0][1], score: 0, shots: 0, saves: 0 },
      { id: 1, name: names[1], primary: colors[1][0], secondary: colors[1][1], score: 0, shots: 0, saves: 0 },
    ],
    players, ball, events: [], eventId: 0, kickoffTimer: 0.65,
    selectedPlayerId: 't0-p1', nextAiAction: [0.6, 0.3], skill: [0, 0],
  };
  pushEvent(state, 'kick', '¡A jugar!', 0, { x: 0, z: 0 });
  return state;
}

function pushEvent(state: MatchState, type: GameEvent['type'], text: string, team: TeamId | undefined, position: Vec2, playerId?: string, timer = 0.9) {
  state.events.push({ id: ++state.eventId, type, text, team, position: { ...position }, playerId, timer });
  if (state.events.length > 10) state.events.splice(0, state.events.length - 10);
}

function kick(state: MatchState, player: Footballer, action: ActionId) {
  const towardGoal = player.team === 0 ? 1 : -1;
  const available = state.players.filter((p) => p.team === player.team && p.id !== player.id && p.role === 'field');
  const receiver = available.sort((a, b) => {
    const da = Math.hypot(a.position.x - player.position.x, a.position.z - player.position.z);
    const db = Math.hypot(b.position.x - player.position.x, b.position.z - player.position.z);
    return da - db;
  })[0];
  const aim = action === 'pass' || action === 'lob'
    ? toward(player.position, receiver?.position ?? { x: player.position.x + towardGoal, z: player.position.z })
    : (length(player.facing) > 0.1 ? normalize(player.facing) : { x: towardGoal, z: 0 });
  const shot = action === 'shoot' || action === 'special';
  const speed = action === 'lob' ? 10.8 : shot ? (action === 'special' ? 19 : 15.5) : 9.3;
  state.ball.ownerId = null;
  state.ball.lastTouch = player.team;
  state.ball.position = {
    x: player.position.x + aim.x * 0.5,
    z: player.position.z + aim.z * 0.5,
  };
  state.ball.velocity = { x: aim.x * speed, z: aim.z * speed };
  state.ball.height = FIELD.ballRadius;
  state.ball.verticalVelocity = action === 'lob' ? 6.2 : action === 'special' ? 3 : 0;
  state.ball.specialShot = action === 'special';
  state.ball.trailTimer = action === 'special' ? 0.7 : shot ? 0.18 : 0;
  if (shot) state.teams[player.team].shots += 1;
  player.actionCooldown = shot ? 0.45 : 0.32;
  pushEvent(state, action === 'special' ? 'special' : 'kick', action === 'lob' ? 'PASE ALTO' : shot ? '¡REMATE!' : 'PASE', player.team, player.position, player.id, 0.45);
}

function nearestFieldPlayer(state: MatchState, team: TeamId, position: Vec2) {
  return state.players.filter((p) => p.team === team && p.role === 'field').sort((a, b) =>
    Math.hypot(a.position.x - position.x, a.position.z - position.z) - Math.hypot(b.position.x - position.x, b.position.z - position.z))[0];
}

function basicAi(state: MatchState, team: TeamId, dt: number): PlayerControls[] {
  const targetPlayer = nearestFieldPlayer(state, team, state.ball.position);
  return state.players.filter((p) => p.team === team).map((player) => {
    if (player.role === 'keeper') {
      const goalX = team === 0 ? -10.3 : 10.3;
      const targetZ = clamp(state.ball.position.z * 0.43, -1.65, 1.65);
      return { move: { x: clamp((goalX - player.position.x) * 0.9, -1, 1), z: clamp((targetZ - player.position.z) * 1.3, -1, 1) }, sprint: false, slide: false };
    }
    const attacking = team === 0 ? 1 : -1;
    const target = player === targetPlayer || state.ball.ownerId === player.id
      ? state.ball.position
      : { x: (team === 0 ? -4.8 : 4.8) + attacking * ((player.id.charCodeAt(3) % 3) * 0.35), z: (Number(player.id.slice(-1)) - 1.5) * 1.75 };
    const direction = toward(player.position, target);
    const controls: PlayerControls = { move: direction, sprint: true, slide: false };
    const distance = Math.hypot(player.position.x - state.ball.position.x, player.position.z - state.ball.position.z);
    if (state.ball.ownerId === player.id && player.actionCooldown <= 0) {
      controls.action = Math.abs(state.ball.position.x) > 8 ? 'shoot' : 'pass';
    } else if (state.ball.ownerId && state.ball.lastTouch !== team && distance < 1.25 && player.tackleCooldown <= 0) {
      controls.slide = true;
    }
    void dt;
    return controls;
  });
}

function movePlayer(player: Footballer, control: PlayerControls, dt: number) {
  const inputLength = Math.min(1, length(control.move));
  const input = inputLength > 0 ? normalize(control.move) : { x: 0, z: 0 };
  const maxSpeed = player.role === 'keeper' ? 4.2 : control.sprint && player.stamina > 0.03 ? 7.5 : 5.4;
  if (player.stun <= 0) {
    const target = { x: input.x * maxSpeed * inputLength, z: input.z * maxSpeed * inputLength };
    const response = 1 - Math.exp(-11 * dt);
    player.velocity.x += (target.x - player.velocity.x) * response;
    player.velocity.z += (target.z - player.velocity.z) * response;
  }
  const friction = player.stun > 0 ? 0.96 : 1 - Math.exp(-2.5 * dt);
  player.position.x += player.velocity.x * dt;
  player.position.z += player.velocity.z * dt;
  if (inputLength > 0.1) player.facing = input;
  player.position.x = clamp(player.position.x, -FIELD.halfLength + 0.8, FIELD.halfLength - 0.8);
  player.position.z = clamp(player.position.z, -FIELD.halfWidth + 0.65, FIELD.halfWidth - 0.65);
  player.velocity.x *= friction;
  player.velocity.z *= friction;
  player.stamina = clamp(player.stamina + (control.sprint ? -0.2 : 0.08) * dt, 0, 1);
  player.stun = Math.max(0, player.stun - dt);
  player.actionCooldown = Math.max(0, player.actionCooldown - dt);
  player.tackleCooldown = Math.max(0, player.tackleCooldown - dt);
  player.trickCooldown = Math.max(0, player.trickCooldown - dt);
  player.celebration = Math.max(0, player.celebration - dt);
}

function resolveBallPlayerContact(state: MatchState) {
  if (state.ball.ownerId) {
    const owner = state.players.find((p) => p.id === state.ball.ownerId);
    if (owner) {
      const front = owner.facing;
      state.ball.position = { x: owner.position.x + front.x * 0.57, z: owner.position.z + front.z * 0.57 };
      state.ball.height = FIELD.ballRadius;
      state.ball.velocity = { x: owner.velocity.x * 0.82, z: owner.velocity.z * 0.82 };
      return;
    }
    state.ball.ownerId = null;
  }
  if (state.ball.height > 1.2) return;
  const nearest = state.players
    .filter((p) => p.role === 'field' || (Math.abs(p.position.x - state.ball.position.x) < 1.4))
    .map((p) => ({ player: p, distance: Math.hypot(p.position.x - state.ball.position.x, p.position.z - state.ball.position.z) }))
    .sort((a, b) => a.distance - b.distance)[0];
  if (nearest && nearest.distance < 0.75 && Math.hypot(state.ball.velocity.x, state.ball.velocity.z) < 11) {
    state.ball.ownerId = nearest.player.id;
    state.ball.lastTouch = nearest.player.team;
    nearest.player.actionCooldown = Math.max(nearest.player.actionCooldown, 0.16);
    return;
  }
  for (const player of state.players) {
    const dx = state.ball.position.x - player.position.x;
    const dz = state.ball.position.z - player.position.z;
    const distance = Math.hypot(dx, dz);
    if (distance < 0.68 && distance > 0.001) {
      const normal = { x: dx / distance, z: dz / distance };
      const impact = state.ball.velocity.x * normal.x + state.ball.velocity.z * normal.z;
      if (impact > 0) continue;
      state.ball.velocity = { x: state.ball.velocity.x - 1.5 * impact * normal.x, z: state.ball.velocity.z - 1.5 * impact * normal.z };
      if (player.role === 'keeper') {
        state.teams[player.team].saves += 1;
        state.ball.trailTimer = 0;
        pushEvent(state, 'save', '¡ATAJADÓN!', player.team, player.position, player.id, 0.7);
      }
      break;
    }
  }
}

function scoreGoal(state: MatchState, team: TeamId) {
  state.teams[team].score += 1;
  state.phase = state.teams[team].score >= FIELD.targetScore ? 'finished' : 'goal';
  state.kickoffTimer = 1.45;
  state.ball.ownerId = null;
  state.ball.velocity = { x: 0, z: 0 };
  state.ball.position = { x: 0, z: 0 };
  state.ball.height = FIELD.ballRadius;
  state.ball.verticalVelocity = 0;
  state.players.forEach((p) => { p.velocity = { x: 0, z: 0 }; if (p.team === team) p.celebration = 1.15; });
  pushEvent(state, 'goal', `¡GOL DE ${state.teams[team].name.toUpperCase()}!`, team, { x: team === 0 ? 9 : -9, z: 0 }, undefined, 1.6);
}

export function stepMatch(state: MatchState, userControls: PlayerControls, dt = 1 / 60, aiDifficulty: 0 | 1 | 2 = 1): MatchState {
  if (state.phase === 'finished') return state;
  const slice = Math.min(dt, 1 / 20);
  state.frame += 1;
  state.elapsed += slice;
  state.remaining = Math.max(0, state.remaining - slice);
  state.events.forEach((event) => { event.timer = Math.max(0, event.timer - slice); });
  state.events = state.events.filter((event) => event.timer > 0);

  if (state.phase === 'goal' || state.phase === 'kickoff') {
    state.kickoffTimer -= slice;
    if (state.kickoffTimer <= 0) {
      state.phase = 'playing';
      state.ball.ownerId = state.teams[0].score > state.teams[1].score ? 't1-p1' : 't0-p1';
      state.ball.lastTouch = state.ball.ownerId.startsWith('t1') ? 1 : 0;
    }
    if (state.remaining <= 0) state.phase = 'finished';
    return state;
  }

  const owner = state.players.find((p) => p.id === state.ball.ownerId);
  if (owner?.team === 0 && owner.role === 'field') state.selectedPlayerId = owner.id;
  else if (owner?.team !== 0 || !owner) {
    const closest = nearestFieldPlayer(state, 0, state.ball.position);
    if (closest) state.selectedPlayerId = closest.id;
  }
  const targetPlayer = state.players.find((p) => p.id === state.selectedPlayerId);
  if (targetPlayer && targetPlayer.role === 'field') {
    if (userControls.slide && targetPlayer.tackleCooldown <= 0) {
      targetPlayer.velocity.x += targetPlayer.facing.x * 6.5;
      targetPlayer.velocity.z += targetPlayer.facing.z * 6.5;
      targetPlayer.tackleCooldown = 1.05;
      const victim = state.players.find((p) => p.team !== 0 && Math.hypot(p.position.x - targetPlayer.position.x, p.position.z - targetPlayer.position.z) < 0.95);
      if (victim && victim.role === 'field') {
        victim.stun = 0.65;
        if (Math.hypot(targetPlayer.velocity.x, targetPlayer.velocity.z) > 7.8) pushEvent(state, 'foul', 'FALTA FUERTE', 1, victim.position, victim.id, 0.8);
        state.ball.ownerId = targetPlayer.id;
        state.ball.lastTouch = 0;
      }
      pushEvent(state, 'tackle', 'BARRIDA', 0, targetPlayer.position, targetPlayer.id, 0.5);
    }
  }

  const aiControls = basicAi(state, 1, slice);
  state.players.forEach((player) => {
    const controls = player.id === state.selectedPlayerId ? userControls : player.team === 1
      ? aiControls[state.players.filter((p) => p.team === 1).findIndex((p) => p.id === player.id)]
      : { move: { x: 0, z: 0 }, sprint: false, slide: false };
    movePlayer(player, controls, slice);
    if (player.id === state.ball.ownerId && controls.action && player.actionCooldown <= 0) kick(state, player, controls.action);
  });
  if (!state.ball.ownerId) {
    const result = stepBall(state.ball, slice);
    if (result.bounced) pushEvent(state, 'bounce', '¡REBOTE EN LA PARED!', state.ball.lastTouch ?? undefined, state.ball.position, undefined, 0.55);
    if (result.scoredFor !== null) scoreGoal(state, result.scoredFor);
  }
  resolveBallPlayerContact(state);
  if (state.remaining <= 0) state.phase = 'finished';
  void aiDifficulty;
  return state;
}

export function applyAction(state: MatchState, action: ActionId) {
  const player = state.players.find((p) => p.id === state.selectedPlayerId);
  if (!player || player.team !== 0) return;
  player.actionCooldown = Math.max(0, player.actionCooldown);
  if (action === 'special' && state.skill[0] < 100) return;
  if (state.ball.ownerId !== player.id) return;
  kick(state, player, action);
}
