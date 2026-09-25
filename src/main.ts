import { Capacitor } from '@capacitor/core';
import { ScreenOrientation } from '@capacitor/screen-orientation';
import '@fontsource/barlow-condensed/600.css';
import '@fontsource/barlow-condensed/700.css';
import '@fontsource/barlow-condensed/800.css';
import '@fontsource/barlow-condensed/900.css';
import '@fontsource/dm-sans/500.css';
import '@fontsource/dm-sans/600.css';
import '@fontsource/dm-sans/700.css';
import '@fontsource/dm-sans/800.css';
import './style.css';
import { createMatch, stepMatch } from './game/rules';
import { type ActionId, type MatchState, type PlayerControls, type Vec2 } from './game/types';
import { DEFAULT_TRICK, TRICK_SWIPE_THRESHOLD, TRICKS, trickFromSwipe, type TrickId } from './game/tricks';
import { canUseSpecialShot } from './game/styleMeter';
import { MatchRenderer } from './game/renderer';

const el = <T extends HTMLElement>(id: string) => {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Falta el elemento #${id}`);
  return element as T;
};

const stadium = el<HTMLDivElement>('stadium');
const intro = el<HTMLElement>('intro-panel');
const hud = el<HTMLElement>('match-hud');
const touchUi = el<HTMLElement>('touch-ui');
const desktopHints = el<HTMLElement>('desktop-hints');
const pausePanel = el<HTMLElement>('pause-panel');
const resultPanel = el<HTMLElement>('result-panel');
const joystick = el<HTMLDivElement>('joystick');
const knob = el<HTMLDivElement>('joystick-knob');
const eventCallout = el<HTMLDivElement>('event-callout');
const trickButton = el<HTMLButtonElement>('trick-button');
const trickSelector = el<HTMLDivElement>('trick-selector');
const trickPreview = el<HTMLElement>('trick-preview');
const isTouch = window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;

let game: MatchState = createMatch();
let renderer: MatchRenderer;
try {
  renderer = new MatchRenderer(stadium);
} catch (error) {
  console.error(error);
  stadium.innerHTML = '<div class="webgl-error"><strong>Esta cancha necesita WebGL.</strong><span>Actualizá Chrome o activá la aceleración gráfica del celular.</span></div>';
  throw error;
}
let running = false;
let paused = false;
let joystickPointer: number | null = null;
let joystickCenter = { x: 0, y: 0 };
let joystickMove: Vec2 = { x: 0, z: 0 };
let sprintHeld = false;
let queuedAction: ActionId | undefined;
let slideQueued = false;
let queuedTrick: TrickId | undefined;
let trickPointer: number | null = null;
let trickOrigin = { x: 0, y: 0 };
let lastTime = performance.now();
let qualityWindowStart = lastTime;
let qualityFrames = 0;
let renderScale = Math.min(window.devicePixelRatio || 1, 1.5);
const keys = new Set<string>();
const latestEvents = new Set<number>();
let eventCalloutTimer = 0;

function beginMatch() {
  game = createMatch();
  running = true;
  paused = false;
  queuedAction = undefined;
  slideQueued = false;
  latestEvents.clear();
  intro.classList.add('hidden');
  pausePanel.classList.add('hidden');
  resultPanel.classList.add('hidden');
  hud.classList.remove('hidden');
  if (isTouch) touchUi.classList.remove('hidden');
  else desktopHints.classList.remove('hidden');
  document.documentElement.classList.add('match-active');
  if (Capacitor.isNativePlatform()) void ScreenOrientation.lock({ orientation: 'landscape' }).catch(() => undefined);
  updateHud();
}

function pauseMatch() {
  if (!running || game.phase === 'finished') return;
  paused = true;
  pausePanel.classList.remove('hidden');
  touchUi.classList.add('hidden');
  desktopHints.classList.add('hidden');
}

function resumeMatch() {
  paused = false;
  pausePanel.classList.add('hidden');
  if (isTouch) touchUi.classList.remove('hidden');
  else desktopHints.classList.remove('hidden');
  lastTime = performance.now();
}

function exitMatch() {
  paused = false;
  running = false;
  intro.classList.remove('hidden');
  hud.classList.add('hidden');
  pausePanel.classList.add('hidden');
  resultPanel.classList.add('hidden');
  touchUi.classList.add('hidden');
  desktopHints.classList.add('hidden');
  document.documentElement.classList.remove('match-active');
}

function finishMatch() {
  if (!resultPanel.classList.contains('hidden')) return;
  touchUi.classList.add('hidden');
  desktopHints.classList.add('hidden');
  const home = game.teams[0].score;
  const away = game.teams[1].score;
  const won = home > away;
  el<HTMLHeadingElement>('result-title').textContent = home === away ? '¡EMPATE EN LA JAULA!' : won ? '¡GANASTE LA JAULA!' : 'LA JAULA TIENE NUEVO DUEÑO';
  el<HTMLParagraphElement>('result-score').textContent = `${home}  —  ${away}`;
  resultPanel.classList.remove('hidden');
}

function updateHud() {
  el<HTMLElement>('score-home').textContent = String(game.teams[0].score);
  el<HTMLElement>('score-away').textContent = String(game.teams[1].score);
  el<HTMLElement>('team-home').textContent = game.teams[0].name.toUpperCase();
  el<HTMLElement>('team-away').textContent = game.teams[1].name.toUpperCase();
  const seconds = Math.max(0, Math.ceil(game.remaining));
  el<HTMLElement>('match-timer').textContent = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  const skill = game.skill[0];
  const ready = canUseSpecialShot(skill);
  el<HTMLElement>('skill-meter-fill').style.width = `${skill}%`;
  el<HTMLElement>('skill-meter-label').textContent = ready ? 'LISTO' : `${skill}%`;
  el<HTMLElement>('skill-readout').classList.toggle('ready', ready);
  const shotButton = document.querySelector<HTMLButtonElement>('.shoot-action');
  if (shotButton) {
    shotButton.classList.toggle('special-ready', ready);
    shotButton.setAttribute('aria-label', ready ? 'Remate especial' : 'Remate');
    const label = shotButton.querySelector('b');
    if (label) label.textContent = ready ? 'ESPECIAL' : 'REMATE';
  }
}

function readMovement(): Vec2 {
  const x = (keys.has('d') ? 1 : 0) - (keys.has('a') ? 1 : 0) + joystickMove.x;
  const z = (keys.has('s') ? 1 : 0) - (keys.has('w') ? 1 : 0) + joystickMove.z;
  const magnitude = Math.hypot(x, z);
  return magnitude > 1 ? { x: x / magnitude, z: z / magnitude } : { x, z };
}

function showEvents(dt: number) {
  eventCalloutTimer = Math.max(0, eventCalloutTimer - dt);
  const newest = game.events.at(-1);
  if (newest && !latestEvents.has(newest.id)) {
    latestEvents.add(newest.id);
    if (latestEvents.size > 16) latestEvents.clear();
    if (newest.type === 'goal') {
      eventCallout.textContent = newest.text;
      eventCallout.classList.add('show', 'goal-callout');
      eventCalloutTimer = 1.25;
      renderer.celebrate(newest.team ?? 0);
    } else if (newest.type === 'trick') {
      const trick = TRICKS.find((item) => newest.text.startsWith(item.name));
      eventCallout.textContent = trick ? `${trick.direction} ${newest.text}` : newest.text;
      eventCallout.classList.remove('goal-callout');
      eventCallout.classList.add('show', 'trick-callout');
      eventCalloutTimer = 0.85;
    } else if (newest.type === 'bounce' || newest.type === 'save' || newest.type === 'foul') {
      eventCallout.textContent = newest.text;
      eventCallout.classList.remove('goal-callout');
      eventCallout.classList.add('show');
      eventCalloutTimer = 0.65;
    }
  }
  if (eventCalloutTimer <= 0) eventCallout.classList.remove('show', 'goal-callout');
}

function frame(now: number) {
  const dt = Math.min(0.05, Math.max(0, (now - lastTime) / 1000));
  lastTime = now;
  if (running && !paused && game.phase !== 'finished') {
    const controls: PlayerControls = {
      move: readMovement(),
      sprint: sprintHeld || keys.has('shift'),
      slide: slideQueued,
      action: queuedAction,
      trickId: queuedTrick,
    };
    game = stepMatch(game, controls, dt);
    queuedAction = undefined;
    slideQueued = false;
    queuedTrick = undefined;
    updateHud();
    showEvents(dt);
    if (game.phase === 'finished') finishMatch();
  }
  renderer.render(game, dt);
  qualityFrames += 1;
  if (now - qualityWindowStart >= 1000) {
    const fps = qualityFrames * 1000 / (now - qualityWindowStart);
    const nextScale = fps < 52 ? Math.max(0.8, renderScale - 0.15) : fps > 58 ? Math.min(1.5, renderScale + 0.1) : renderScale;
    if (nextScale !== renderScale) {
      renderScale = nextScale;
      renderer.setPixelScale(renderScale);
    }
    qualityFrames = 0;
    qualityWindowStart = now;
  }
  requestAnimationFrame(frame);
}

function queueAction(action: ActionId) {
  if (!running || paused) return;
  if (action === 'slide') slideQueued = true;
  else queuedAction = action === 'shoot' && canUseSpecialShot(game.skill[0]) ? 'special' : action;
}

el<HTMLButtonElement>('start-match').addEventListener('click', beginMatch);
el<HTMLButtonElement>('pause-match').addEventListener('click', pauseMatch);
el<HTMLButtonElement>('resume-match').addEventListener('click', resumeMatch);
el<HTMLButtonElement>('quit-match').addEventListener('click', exitMatch);
el<HTMLButtonElement>('replay-match').addEventListener('click', beginMatch);
el<HTMLButtonElement>('result-menu').addEventListener('click', exitMatch);

document.querySelectorAll<HTMLButtonElement>('[data-action]').forEach((button) => {
  button.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    button.classList.add('pressed');
    queueAction(button.dataset.action as ActionId);
  });
  for (const end of ['pointerup', 'pointercancel', 'pointerleave']) button.addEventListener(end, () => button.classList.remove('pressed'));
});
const sprintButton = document.querySelector<HTMLButtonElement>('[data-hold="sprint"]');
sprintButton?.addEventListener('pointerdown', (event) => { event.preventDefault(); sprintHeld = true; sprintButton.classList.add('pressed'); });
for (const end of ['pointerup', 'pointercancel', 'pointerleave']) sprintButton?.addEventListener(end, () => { sprintHeld = false; sprintButton.classList.remove('pressed'); });

function selectTrickPreview(trickId: TrickId) {
  const trick = TRICKS.find((item) => item.id === trickId) ?? TRICKS[2];
  trickPreview.textContent = `${trick.direction} ${trick.name} · SOLTÁ PARA HACERLO`;
  trickSelector.querySelectorAll<HTMLElement>('[data-trick]').forEach((option) => {
    option.classList.toggle('selected', option.dataset.trick === trickId);
  });
}

trickButton.addEventListener('pointerdown', (event) => {
  if (!running || paused) return;
  event.preventDefault();
  trickPointer = event.pointerId;
  trickOrigin = { x: event.clientX, y: event.clientY };
  trickButton.setPointerCapture(event.pointerId);
  trickButton.classList.add('pressed');
  trickSelector.classList.remove('hidden');
  trickPreview.textContent = 'DESLIZÁ PARA ELEGIR';
  selectTrickPreview(DEFAULT_TRICK);
});
trickButton.addEventListener('pointermove', (event) => {
  if (event.pointerId !== trickPointer) return;
  const dx = event.clientX - trickOrigin.x;
  const dy = event.clientY - trickOrigin.y;
  if (Math.hypot(dx, dy) >= TRICK_SWIPE_THRESHOLD) selectTrickPreview(trickFromSwipe(dx, dy));
});
trickButton.addEventListener('pointerup', (event) => {
  if (event.pointerId !== trickPointer) return;
  const dx = event.clientX - trickOrigin.x;
  const dy = event.clientY - trickOrigin.y;
  queuedTrick = Math.hypot(dx, dy) >= TRICK_SWIPE_THRESHOLD ? trickFromSwipe(dx, dy) : DEFAULT_TRICK;
  const selected = TRICKS.find((item) => item.id === queuedTrick) ?? TRICKS[2];
  trickPreview.textContent = `${selected.direction} ${selected.name}`;
  trickPointer = null;
  trickButton.classList.remove('pressed');
  window.setTimeout(() => trickSelector.classList.add('hidden'), 260);
});
trickButton.addEventListener('pointercancel', () => {
  trickPointer = null;
  trickButton.classList.remove('pressed');
  trickSelector.classList.add('hidden');
});

joystick.addEventListener('pointerdown', (event) => {
  if (!isTouch || paused) return;
  event.preventDefault();
  joystickPointer = event.pointerId;
  joystick.setPointerCapture(event.pointerId);
  const rect = joystick.getBoundingClientRect();
  joystickCenter = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  moveJoystick(event.clientX, event.clientY);
});
joystick.addEventListener('pointermove', (event) => {
  if (event.pointerId === joystickPointer) moveJoystick(event.clientX, event.clientY);
});
const releaseJoy = (event: PointerEvent) => {
  if (event.pointerId !== joystickPointer) return;
  joystickPointer = null;
  joystickMove = { x: 0, z: 0 };
  knob.style.transform = 'translate(-50%, -50%)';
};
joystick.addEventListener('pointerup', releaseJoy);
joystick.addEventListener('pointercancel', releaseJoy);

function moveJoystick(x: number, y: number) {
  const dx = x - joystickCenter.x;
  const dy = y - joystickCenter.y;
  const limit = joystick.clientWidth * 0.32;
  const magnitude = Math.hypot(dx, dy);
  const scale = magnitude > limit ? limit / magnitude : 1;
  const clampedX = dx * scale;
  const clampedY = dy * scale;
  joystickMove = { x: clampedX / limit, z: clampedY / limit };
  knob.style.transform = `translate(calc(-50% + ${clampedX}px), calc(-50% + ${clampedY}px))`;
}

const keyMap: Record<string, string> = { ArrowUp: 'w', ArrowDown: 's', ArrowLeft: 'a', ArrowRight: 'd', ' ': 'space' };
window.addEventListener('keydown', (event) => {
  const key = keyMap[event.key] ?? event.key.toLowerCase();
  if (['w', 'a', 's', 'd', 'shift', 'space', 'j', 'k', 'l', 't', 'escape'].includes(key)) event.preventDefault();
  if (event.repeat) return;
  keys.add(key);
  if (key === 'space') queueAction('shoot');
  if (key === 'j') queueAction('pass');
  if (key === 'k') queueAction('lob');
  if (key === 'l') queueAction('slide');
  if (key === 't' && running && !paused) queuedTrick = DEFAULT_TRICK;
  if (key === 'escape') paused ? resumeMatch() : pauseMatch();
});
window.addEventListener('keyup', (event) => keys.delete(keyMap[event.key] ?? event.key.toLowerCase()));
window.addEventListener('blur', () => { keys.clear(); sprintHeld = false; joystickMove = { x: 0, z: 0 }; });

requestAnimationFrame(frame);
