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
import { type ActionId, type Difficulty, type MatchState, type PlayerControls, type Vec2 } from './game/types';
import { DEFAULT_TRICK, TRICK_SWIPE_THRESHOLD, TRICKS, trickFromSwipe, type TrickId } from './game/tricks';
import { canUseSpecialShot } from './game/styleMeter';
import { MatchRenderer } from './game/renderer';
import { StreetAudio } from './game/audio';
import { BOOT_STYLES, createQuickMatchTeams, createTournament, currentTournamentMatch, getStreetTeam, recordTournamentResult, STREET_TEAMS, teamOptions, tournamentRoundName, UNIFORM_STYLES, type TournamentState } from './game/modes';
import { achievementsFor, careerProgress, challengeForDay, difficultyAfterWin, parseProgress, purchaseReward, recordCompletedMatch, refreshDailyChallenge, REWARDS, selectReward, type PlayerProgress } from './game/progress';

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
const difficultySelect = el<HTMLSelectElement>('difficulty-select');
const uniformSelect = el<HTMLSelectElement>('uniform-select');
const bootsSelect = el<HTMLSelectElement>('boots-select');
const courtSelect = el<HTMLSelectElement>('court-select');
const tournamentStatus = el<HTMLParagraphElement>('tournament-status');
const p2Joystick = el<HTMLDivElement>('joystick-p2');
const p2Knob = el<HTMLDivElement>('joystick-knob-p2');
const p2Actions = el<HTMLDivElement>('duo-actions');
const p2TrickButton = el<HTMLButtonElement>('trick-button-p2');
const soundToggle = el<HTMLButtonElement>('sound-toggle');
const audioMixToggle = el<HTMLButtonElement>('audio-mix-toggle');
const audioSettings = el<HTMLDivElement>('audio-settings');
const musicVolume = el<HTMLInputElement>('volume-music');
const effectsVolume = el<HTMLInputElement>('volume-effects');
const crowdVolume = el<HTMLInputElement>('volume-crowd');
const tutorialPanel = el<HTMLElement>('tutorial-panel');
const tutorialStepLabel = el<HTMLElement>('tutorial-step');
const tutorialTitle = el<HTMLElement>('tutorial-title');
const tutorialInstruction = el<HTMLElement>('tutorial-instruction');
const tutorialSeconds = el<HTMLElement>('tutorial-seconds');
const tutorialTimeFill = el<HTMLElement>('tutorial-time-fill');
const p2SkillReadout = el<HTMLElement>('skill-readout-p2');
const isTouch = window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
let progress: PlayerProgress = parseProgress(localStorage.getItem('osvistreet-progress'));

let game: MatchState = createMatch({ courtId: progress.court, bootColor: BOOT_STYLES[progress.boots].color });
let renderer: MatchRenderer;
try {
  renderer = new MatchRenderer(stadium, progress.court);
} catch (error) {
  console.error(error);
  stadium.innerHTML = '<div class="webgl-error"><strong>Esta cancha necesita WebGL.</strong><span>Actualizá Chrome o activá la aceleración gráfica del celular.</span></div>';
  throw error;
}
let running = false;
type GameMode = 'quick' | 'tournament' | 'local';
let currentMode: GameMode = 'quick';
let tournament: TournamentState | null = null;
let paused = false;
let difficultyChosen = false;
let beginnerAssist = false;
let tutorialActive = false;
let tutorialRemaining = 20;
let tutorialStepIndex = 0;
const tutorialSteps = [
  { action: 'move', title: 'APRENDÉ A MOVERTE', instruction: 'Joystick o WASD: acercate a la pelota.' },
  { action: 'pass', title: 'SOLTÁ LA PELOTA', instruction: 'Tocá PASE para buscar a un compañero.' },
  { action: 'shoot', title: 'CERRÁ LA JUGADA', instruction: 'Apuntá al arco y tocá REMATE.' },
] as const;
let joystickPointer: number | null = null;
let joystickCenter = { x: 0, y: 0 };
let joystickMove: Vec2 = { x: 0, z: 0 };
let p2JoystickPointer: number | null = null;
let p2JoystickCenter = { x: 0, y: 0 };
let p2JoystickMove: Vec2 = { x: 0, z: 0 };
let sprintHeld = false;
let p2SprintHeld = false;
let queuedAction: ActionId | undefined;
let p2QueuedAction: ActionId | undefined;
let slideQueued = false;
let p2SlideQueued = false;
let queuedTrick: TrickId | undefined;
let queuedActionUntil = 0;
let p2QueuedActionUntil = 0;
let slideQueuedUntil = 0;
let p2SlideQueuedUntil = 0;
let queuedTrickUntil = 0;
let p2QueuedTrickUntil = 0;
let trickPointer: number | null = null;
let trickOrigin = { x: 0, y: 0 };
let p2QueuedTrick: TrickId | undefined;
let p2TrickPointer: number | null = null;
let p2TrickOrigin = { x: 0, y: 0 };
let p2TrickId: TrickId = DEFAULT_TRICK;
let tournamentTieBreak = false;
let matchProgressRecorded = false;
let slowMotionRemaining = 0;
const audio = new StreetAudio();
try {
  const savedMix = JSON.parse(localStorage.getItem('osvistreet-audio') ?? '{}') as Partial<{ music: number; effects: number; crowd: number }>;
  audio.setVolumes(savedMix);
} catch { /* Mix defaults are used when storage contains invalid data. */ }
musicVolume.value = String(Math.round(audio.volumes.music * 100));
effectsVolume.value = String(Math.round(audio.volumes.effects * 100));
crowdVolume.value = String(Math.round(audio.volumes.crowd * 100));
if (Capacitor.isNativePlatform()) void ScreenOrientation.lock({ orientation: 'landscape' }).catch(() => undefined);

function persistProgress() {
  localStorage.setItem('osvistreet-progress', JSON.stringify(progress));
}

function fillLockerSelect(select: HTMLSelectElement, options: Array<{ value: string; label: string; unlockId: string }>, equipped: string) {
  select.replaceChildren();
  for (const optionData of options) {
    const option = document.createElement('option');
    option.value = optionData.value;
    option.dataset.unlockId = optionData.unlockId;
    const permanentlyUnlocked = ['candela', 'classic', 'court-rooftop'].includes(optionData.unlockId);
    const isUnlocked = permanentlyUnlocked || progress.unlocked.includes(optionData.unlockId);
    const reward = REWARDS.find((item) => item.id === optionData.unlockId);
    option.textContent = isUnlocked ? optionData.label : `${optionData.label} · ${reward?.priceCoins ?? 0} 🪙`;
    option.disabled = !isUnlocked && (!reward || progress.coins < reward.priceCoins);
    select.add(option);
  }
  select.value = equipped;
}

function updateMenuProfile() {
  const previousDay = progress.dailyChallenge.day;
  progress = refreshDailyChallenge(progress);
  if (progress.dailyChallenge.day !== previousDay) persistProgress();
  if (!difficultyChosen) difficultySelect.value = String(Math.min(progress.wins, 2));
  const ownedCount = progress.unlocked.filter((id) => id !== 'court-rooftop').length;
  el<HTMLElement>('locker-count').textContent = `${progress.wins} VICTORIAS · ${ownedCount} ${ownedCount === 1 ? 'ARTÍCULO' : 'ARTÍCULOS'}`;
  const career = careerProgress(progress.xp);
  el<HTMLElement>('career-level').textContent = `NIVEL ${career.level}`;
  el<HTMLElement>('career-xp').textContent = `${career.currentXp} / ${career.neededXp} XP`;
  el<HTMLElement>('career-coins').textContent = `${progress.coins} 🪙`;
  el<HTMLElement>('career-fill').style.width = `${career.currentXp / career.neededXp * 100}%`;
  const daily = challengeForDay(progress.dailyChallenge.day);
  el<HTMLElement>('daily-title').textContent = daily.title;
  el<HTMLElement>('daily-description').textContent = daily.description;
  el<HTMLElement>('daily-progress').textContent = progress.dailyChallenge.complete
    ? `COMPLETO · +${daily.rewardCoins} MONEDAS`
    : `${progress.dailyChallenge.value} / ${daily.target} · +${daily.rewardCoins} MONEDAS`;
  el<HTMLElement>('daily-fill').style.width = `${progress.dailyChallenge.value / daily.target * 100}%`;
  el<HTMLElement>('daily-card').classList.toggle('daily-complete', progress.dailyChallenge.complete);
  el<HTMLElement>('record-best').textContent = String(progress.records.bestMatchGoals);
  el<HTMLElement>('record-goals').textContent = String(progress.records.totalGoals);
  el<HTMLElement>('record-streak').textContent = String(progress.records.bestWinStreak);
  const nextReward = REWARDS.find((reward) => !progress.unlocked.includes(reward.id));
  el<HTMLElement>('next-reward-label').textContent = nextReward ? `PRÓXIMO PREMIO · ${nextReward.label.toUpperCase()}` : 'VESTUARIO COMPLETO';
  el<HTMLElement>('next-reward-count').textContent = nextReward ? `${Math.min(progress.coins, nextReward.priceCoins)} / ${nextReward.priceCoins} 🪙` : 'LISTO';
  el<HTMLElement>('next-reward-fill').style.width = nextReward ? `${Math.min(100, progress.coins / nextReward.priceCoins * 100)}%` : '100%';
  const achievements = achievementsFor(progress);
  const completedAchievements = achievements.filter((achievement) => achievement.complete).length;
  el<HTMLElement>('achievement-count').textContent = `${completedAchievements} / ${achievements.length}`;
  el<HTMLElement>('achievement-summary').textContent = `${completedAchievements} de ${achievements.length} completados`;
  const achievementGrid = el<HTMLDivElement>('achievement-grid');
  achievementGrid.replaceChildren(...achievements.map((achievement) => {
    const item = document.createElement('article');
    item.className = 'achievement-item';
    item.classList.toggle('earned', achievement.complete);
    const badge = document.createElement('b');
    badge.className = 'achievement-badge';
    badge.textContent = achievement.complete ? '✓' : '✦';
    const copy = document.createElement('div');
    copy.className = 'achievement-copy';
    const title = document.createElement('strong');
    title.textContent = achievement.title;
    const description = document.createElement('span');
    description.textContent = achievement.description;
    const count = document.createElement('b');
    count.textContent = `${achievement.current} / ${achievement.target}${achievement.complete ? ' · LOGRADO' : ''}`;
    copy.append(title, description, count);
    item.append(badge, copy);
    return item;
  }));
  fillLockerSelect(uniformSelect, [
    { value: 'candela', label: UNIFORM_STYLES.candela.name, unlockId: 'candela' },
    { value: 'violet', label: UNIFORM_STYLES.violet.name, unlockId: 'uniform-violet' },
    { value: 'mint', label: UNIFORM_STYLES.mint.name, unlockId: 'uniform-mint' },
  ], progress.uniform);
  fillLockerSelect(bootsSelect, [
    { value: 'classic', label: BOOT_STYLES.classic.name, unlockId: 'classic' },
    { value: 'neon', label: BOOT_STYLES.neon.name, unlockId: 'boots-neon' },
    { value: 'gold', label: BOOT_STYLES.gold.name, unlockId: 'boots-gold' },
  ], progress.boots);
  fillLockerSelect(courtSelect, [
    { value: 'court-rooftop', label: 'Terraza al atardecer', unlockId: 'court-rooftop' },
    { value: 'court-graffiti', label: 'Jaula Grafiti', unlockId: 'court-graffiti' },
    { value: 'court-beach', label: 'Cancha Playa', unlockId: 'court-beach' },
    { value: 'court-neon', label: 'Galpón Neón', unlockId: 'court-neon' },
  ], progress.court);
  const current = tournament && !tournament.eliminated && !tournament.championId ? currentTournamentMatch(tournament) : null;
  if (current && tournament) {
    tournamentStatus.textContent = `${tournamentRoundName(tournament.round)} · ${getStreetTeam(current.homeId).name.toUpperCase()} VS ${getStreetTeam(current.awayId).name.toUpperCase()}`;
    tournamentStatus.classList.remove('hidden');
    el<HTMLElement>('start-tournament').querySelector('b')!.textContent = '▶ CONTINUAR LA COPA';
  } else {
    tournamentStatus.textContent = tournament?.championId === tournament?.playerTeamId
      ? 'CAMPEONES · EMPEZÁ OTRA COPA PARA DEFENDER EL BARRIO'
      : tournament?.eliminated ? 'ELIMINACIÓN DIRECTA · ARMÁ TU REVANCHA'
      : 'OCHO EQUIPOS · TRES PARTIDOS HASTA LA FINAL';
    tournamentStatus.classList.toggle('hidden', !tournament);
    el<HTMLElement>('start-tournament').querySelector('b')!.textContent = tournament ? '↻ NUEVA COPA DE BARRIO' : '🏆 COPA DE BARRIO';
  }
}
let lastTime = performance.now();
let qualityWindowStart = lastTime;
let qualityFrames = 0;
let renderScale = Math.min(window.devicePixelRatio || 1, 1.5);
const keys = new Set<string>();
let lastShownEventId = 0;
let eventCalloutTimer = 0;
let playerTricksInMatch = 0;
const ACTION_BUFFER_MS = 1_400;

function showMatchControls() {
  touchUi.classList.remove('hidden');
  desktopHints.classList.toggle('hidden', isTouch);
}

function updateTutorialPanel() {
  const step = tutorialSteps[tutorialStepIndex];
  if (!step) return;
  tutorialStepLabel.textContent = `TUTORIAL · ${tutorialStepIndex + 1} / ${tutorialSteps.length}`;
  tutorialTitle.textContent = step.title;
  tutorialInstruction.textContent = step.instruction;
  tutorialSeconds.textContent = String(Math.ceil(tutorialRemaining));
  tutorialTimeFill.style.transform = `scaleX(${Math.max(0, tutorialRemaining / 20)})`;
}

function finishTutorial() {
  if (!tutorialActive) return;
  tutorialActive = false;
  tutorialPanel.classList.add('hidden');
  progress = { ...progress, tutorialComplete: true };
  persistProgress();
}

function advanceTutorial(action: typeof tutorialSteps[number]['action']) {
  if (!tutorialActive || tutorialSteps[tutorialStepIndex]?.action !== action) return;
  tutorialStepIndex += 1;
  if (tutorialStepIndex >= tutorialSteps.length) {
    finishTutorial();
    return;
  }
  updateTutorialPanel();
}

function updateTutorial(dt: number) {
  if (!tutorialActive) return;
  tutorialRemaining = Math.max(0, tutorialRemaining - dt);
  if (tutorialRemaining <= 0) {
    finishTutorial();
    return;
  }
  updateTutorialPanel();
}

function clearControlState() {
  keys.clear();
  joystickPointer = null;
  p2JoystickPointer = null;
  joystickMove = { x: 0, z: 0 };
  p2JoystickMove = { x: 0, z: 0 };
  sprintHeld = false;
  p2SprintHeld = false;
  queuedAction = undefined;
  p2QueuedAction = undefined;
  queuedActionUntil = 0;
  p2QueuedActionUntil = 0;
  slideQueued = false;
  p2SlideQueued = false;
  slideQueuedUntil = 0;
  p2SlideQueuedUntil = 0;
  queuedTrick = undefined;
  p2QueuedTrick = undefined;
  queuedTrickUntil = 0;
  p2QueuedTrickUntil = 0;
  trickPointer = null;
  p2TrickPointer = null;
  knob.style.transform = 'translate(-50%, -50%)';
  p2Knob.style.transform = 'translate(-50%, -50%)';
  touchUi.querySelectorAll('.pressed').forEach((button) => button.classList.remove('pressed'));
  trickSelector.classList.add('hidden');
}

function beginMatch(mode: GameMode = currentMode) {
  clearControlState();
  currentMode = mode;
  audio.setScene('match');
  beginnerAssist = progress.matches === 0 && mode === 'quick';
  tutorialActive = mode === 'quick' && progress.matches === 0 && !progress.tutorialComplete;
  tutorialRemaining = 20;
  tutorialStepIndex = 0;
  tutorialPanel.classList.toggle('hidden', !tutorialActive);
  if (tutorialActive) updateTutorialPanel();
  let homeTeam = STREET_TEAMS[0]!;
  let awayTeam = createQuickMatchTeams(Math.random())[1];
  if (mode === 'tournament') {
    const fixture = tournament ? currentTournamentMatch(tournament) : null;
    if (!fixture) return;
    homeTeam = getStreetTeam(fixture.homeId);
    awayTeam = getStreetTeam(fixture.awayId);
  }
  const uniformColors = UNIFORM_STYLES[progress.uniform].colors;
  renderer.setCourt(progress.court);
  renderer.resetActors();
  game = createMatch({
    difficulty: Number(difficultySelect.value) as Difficulty,
    localPlayers: mode === 'local' ? 2 : 1,
    bootColor: BOOT_STYLES[progress.boots].color,
    courtId: progress.court,
    ...teamOptions(homeTeam, awayTeam),
    teamColors: [uniformColors, awayTeam.colors],
  });
  running = true;
  paused = false;
  matchProgressRecorded = false;
  queuedAction = undefined;
  p2QueuedAction = undefined;
  queuedActionUntil = 0;
  p2QueuedActionUntil = 0;
  slideQueued = false;
  p2SlideQueued = false;
  slideQueuedUntil = 0;
  p2SlideQueuedUntil = 0;
  queuedTrick = undefined;
  p2QueuedTrick = undefined;
  queuedTrickUntil = 0;
  p2QueuedTrickUntil = 0;
  slowMotionRemaining = 0;
  lastShownEventId = game.eventId;
  playerTricksInMatch = 0;
  eventCalloutTimer = 0;
  eventCallout.classList.remove('show', 'goal-callout', 'trick-callout');
  eventCallout.textContent = '';
  intro.classList.add('hidden');
  el<HTMLElement>('career-card').classList.add('hidden');
  pausePanel.classList.add('hidden');
  resultPanel.classList.add('hidden');
  hud.classList.remove('hidden');
  showMatchControls();
  desktopHints.querySelector('.p2-hints')?.classList.toggle('hidden', mode !== 'local');
  p2Actions.classList.toggle('hidden', mode !== 'local');
  p2Joystick.classList.toggle('hidden', mode !== 'local');
  p2SkillReadout.classList.toggle('hidden', mode !== 'local');
  el<HTMLElement>('app').classList.toggle('local-duel', mode === 'local');
  document.documentElement.classList.add('match-active');
  if (Capacitor.isNativePlatform()) void ScreenOrientation.lock({ orientation: 'landscape' }).catch(() => undefined);
  updateHud();
}

function startTournament() {
  const fixture = tournament ? currentTournamentMatch(tournament) : null;
  if (!fixture) tournament = createTournament(Date.now(), 'candela');
  updateMenuProfile();
  beginMatch('tournament');
}

function pauseMatch() {
  if (!running || game.phase === 'finished') return;
  clearControlState();
  paused = true;
  audio.setScene('menu');
  pausePanel.classList.remove('hidden');
  touchUi.classList.add('hidden');
  desktopHints.classList.add('hidden');
}

function resumeMatch() {
  paused = false;
  audio.setScene('match');
  pausePanel.classList.add('hidden');
  showMatchControls();
  lastTime = performance.now();
}

function exitMatch() {
  clearControlState();
  paused = false;
  running = false;
  audio.setScene('menu');
  intro.classList.remove('hidden');
  el<HTMLElement>('career-card').classList.remove('hidden');
  hud.classList.add('hidden');
  pausePanel.classList.add('hidden');
  resultPanel.classList.add('hidden');
  tutorialPanel.classList.add('hidden');
  tutorialActive = false;
  touchUi.classList.add('hidden');
  desktopHints.classList.add('hidden');
  document.documentElement.classList.remove('match-active');
  el<HTMLElement>('app').classList.remove('local-duel');
  updateMenuProfile();
}

function finishMatch() {
  if (!resultPanel.classList.contains('hidden')) return;
  finishTutorial();
  touchUi.classList.add('hidden');
  desktopHints.classList.add('hidden');
  const home = game.teams[0].score;
  const away = game.teams[1].score;
  const tie = home === away;
  let won = home > away;
  const resultNotes: string[] = [];
  const nextRound = el<HTMLButtonElement>('next-round');
  if (currentMode === 'tournament' && tournament) {
    const round = tournament.round;
    tournamentTieBreak = tie && ((tournament.seed + tournament.round) & 1) === 0;
    tournament = recordTournamentResult(tournament, home, away);
    const priorFixture = tournament.rounds[round][0];
    won = priorFixture?.winnerId === tournament.playerTeamId;
    if (tie) resultNotes.push(tournamentTieBreak ? 'DEFINICIÓN A UN TOQUE · PASÁS DE RONDA' : 'DEFINICIÓN A UN TOQUE · EL RIVAL AVANZA');
    if (tournament.championId) {
      el<HTMLHeadingElement>('result-title').textContent = '¡CAMPEONES DE LA COPA!';
      resultNotes.push('Tres cruces ganados. La jaula es de ustedes.');
    } else if (tournament.eliminated) {
      el<HTMLHeadingElement>('result-title').textContent = 'FIN DEL TORNEO';
      resultNotes.push(`${getStreetTeam(priorFixture?.winnerId ?? '').name} sigue en carrera.`);
    } else {
      el<HTMLHeadingElement>('result-title').textContent = won ? `¡GANASTE ${tournamentRoundName(round).toUpperCase()}!` : 'LA COPA SIGUE';
      resultNotes.push(`Siguiente: ${tournamentRoundName(tournament.round)} contra ${getStreetTeam(currentTournamentMatch(tournament)?.awayId ?? '').name}.`);
    }
    nextRound.classList.toggle('hidden', tournament.eliminated || Boolean(tournament.championId));
    nextRound.textContent = tournament.championId ? 'DEFENDER LA COPA' : `JUGAR ${tournamentRoundName(tournament.round).toUpperCase()}`;
    el<HTMLButtonElement>('replay-match').classList.add('hidden');
  } else {
    el<HTMLHeadingElement>('result-title').textContent = currentMode === 'local'
      ? tie ? '¡EMPATE EN LA JAULA!' : won ? '¡GANÓ JUGADOR 1!' : '¡GANÓ JUGADOR 2!'
      : tie ? '¡EMPATE EN LA JAULA!' : won ? '¡GANASTE LA JAULA!' : 'LA JAULA TIENE NUEVO DUEÑO';
    nextRound.classList.add('hidden');
    el<HTMLButtonElement>('replay-match').classList.remove('hidden');
  }
  if (!matchProgressRecorded) {
    const awarded = recordCompletedMatch(progress, currentMode === 'local' ? home > away : won, { goals: home, tricks: playerTricksInMatch });
    progress = awarded.progress;
    persistProgress();
    resultNotes.push(`+${awarded.coinsEarned} MONEDAS · +${awarded.xpEarned} XP.`);
    if (awarded.newUnlocks.length) resultNotes.push(`Desbloqueado: ${awarded.newUnlocks.map((reward) => reward.label).join(', ')}.`);
    if (awarded.dailyCompleted) resultNotes.push('RETO DEL DÍA COMPLETADO.');
    matchProgressRecorded = true;
  }
  if (currentMode === 'quick' && won && !difficultyChosen) {
    difficultySelect.value = String(difficultyAfterWin(game.difficulty));
  }
  if (currentMode === 'quick' && !won && tie) resultNotes.push('Ganá para sumar ropa, botines y canchas nuevas.');
  el<HTMLParagraphElement>('result-score').textContent = `${home}  —  ${away}`;
  el<HTMLElement>('result-note').textContent = resultNotes.join(' ');
  resultPanel.classList.remove('hidden');
}

function updateHud() {
  el<HTMLElement>('score-home').textContent = String(game.teams[0].score);
  el<HTMLElement>('score-away').textContent = String(game.teams[1].score);
  el<HTMLElement>('team-home').textContent = game.teams[0].name.toUpperCase();
  el<HTMLElement>('team-away').textContent = game.teams[1].name.toUpperCase();
  for (const [index, side] of ['home', 'away'].entries()) {
    const team = game.teams[index as 0 | 1];
    const crest = el<HTMLElement>(`crest-${side}`);
    crest.textContent = team.crest;
    crest.style.setProperty('--crest-primary', team.primary);
    crest.style.setProperty('--crest-secondary', team.secondary);
  }
  el<HTMLElement>('match-kind').textContent = currentMode === 'tournament'
    ? tournamentRoundName(tournament?.round ?? 0).toUpperCase()
    : currentMode === 'local' ? 'DUELO LOCAL' : 'JAULA ABIERTA';
  const seconds = Math.max(0, Math.ceil(game.remaining));
  el<HTMLElement>('match-timer').textContent = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  const skill = game.skill[0];
  const ready = canUseSpecialShot(skill);
  el<HTMLElement>('skill-meter-fill').style.width = `${skill}%`;
  el<HTMLElement>('skill-meter-label').textContent = ready ? 'LISTO' : `${skill}%`;
  el<HTMLElement>('skill-readout').classList.toggle('ready', ready);
  const p2Skill = game.skill[1];
  const p2Ready = canUseSpecialShot(p2Skill);
  el<HTMLElement>('skill-meter-fill-p2').style.width = `${p2Skill}%`;
  el<HTMLElement>('skill-meter-label-p2').textContent = p2Ready ? 'LISTO' : `${p2Skill}%`;
  p2SkillReadout.classList.toggle('ready', p2Ready);
  const p2ShotButton = document.querySelector<HTMLButtonElement>('[data-p2-action="shoot"]');
  if (p2ShotButton) {
    p2ShotButton.classList.toggle('special-ready', p2Ready);
    p2ShotButton.setAttribute('aria-label', p2Ready ? 'Jugador 2: remate especial' : 'Jugador 2: remate');
    const label = p2ShotButton.querySelector('b');
    if (label) label.textContent = p2Ready ? 'ESPECIAL' : 'TIRO';
  }
  const shotButton = document.querySelector<HTMLButtonElement>('.shoot-action');
  if (shotButton) {
    shotButton.classList.toggle('special-ready', ready);
    shotButton.setAttribute('aria-label', ready ? 'Remate especial' : 'Remate');
    const label = shotButton.querySelector('b');
    if (label) label.textContent = ready ? 'ESPECIAL' : 'REMATE';
  }
}

function readMovement(player2 = false): Vec2 {
  const inputKeys = player2
    ? { up: 'p2-up', down: 'p2-down', left: 'p2-left', right: 'p2-right' }
    : { up: 'w', down: 's', left: 'a', right: 'd' };
  const stick = player2 ? p2JoystickMove : joystickMove;
  const x = (keys.has(inputKeys.right) ? 1 : 0) - (keys.has(inputKeys.left) ? 1 : 0) + stick.x;
  const z = (keys.has(inputKeys.down) ? 1 : 0) - (keys.has(inputKeys.up) ? 1 : 0) + stick.z;
  const magnitude = Math.hypot(x, z);
  const movement = magnitude > 1 ? { x: x / magnitude, z: z / magnitude } : { x, z };
  if (!player2 && magnitude > 0.18) advanceTutorial('move');
  return movement;
}

function selectedPlayerForTeam(team: 0 | 1) {
  const owner = game.players.find((player) => player.id === game.ball.ownerId);
  if (owner?.role === 'field' && owner.team === team) return owner.id;
  return game.players
    .filter((player) => player.team === team && player.role === 'field')
    .sort((a, b) => Math.hypot(a.position.x - game.ball.position.x, a.position.z - game.ball.position.z)
      - Math.hypot(b.position.x - game.ball.position.x, b.position.z - game.ball.position.z))[0]?.id;
}

function showEvents(dt: number, inputPlayers: { team0: string | undefined; team1: string | undefined }) {
  eventCalloutTimer = Math.max(0, eventCalloutTimer - dt);
  const unseen = game.events.filter((event) => event.id > lastShownEventId);
  lastShownEventId = game.eventId;
  const actionConfirmation = [...unseen].reverse().find((event) =>
    ['kick', 'special', 'tackle', 'trick'].includes(event.type)
    && ((event.team === 0 && event.playerId === inputPlayers.team0)
      || (currentMode === 'local' && event.team === 1 && event.playerId === inputPlayers.team1)));

  for (const event of unseen) {
    if (event.type === 'trick' && event.team === 0 && event.playerId === inputPlayers.team0) playerTricksInMatch += 1;
    if (event.type === 'kick' || event.type === 'special') {
      if (event.playerId === inputPlayers.team0 && event.team === 0) {
        queuedAction = undefined;
        queuedActionUntil = 0;
      }
      if (currentMode === 'local' && event.playerId === inputPlayers.team1 && event.team === 1) {
        p2QueuedAction = undefined;
        p2QueuedActionUntil = 0;
      }
    } else if (event.type === 'tackle') {
      if (event.playerId === inputPlayers.team0 && event.team === 0) {
        slideQueued = false;
        slideQueuedUntil = 0;
      }
      if (currentMode === 'local' && event.playerId === inputPlayers.team1 && event.team === 1) {
        p2SlideQueued = false;
        p2SlideQueuedUntil = 0;
      }
    } else if (event.type === 'trick') {
      if (event.playerId === inputPlayers.team0 && event.team === 0) {
        queuedTrick = undefined;
        queuedTrickUntil = 0;
      }
      if (currentMode === 'local' && event.playerId === inputPlayers.team1 && event.team === 1) {
        p2QueuedTrick = undefined;
        p2QueuedTrickUntil = 0;
      }
    }
  }

  const newest = unseen.find((event) => event.type === 'goal') ?? actionConfirmation ?? unseen.at(-1);
  if (newest) {
    if (newest.type === 'goal') {
      eventCallout.textContent = newest.text;
      eventCallout.classList.remove('trick-callout');
      eventCallout.classList.add('show', 'goal-callout');
      eventCalloutTimer = 1.25;
      const team = newest.team ?? 0;
      renderer.celebrate(team, game.teams[team].primary, newest.position);
      audio.play('goal');
      slowMotionRemaining = Math.max(slowMotionRemaining, 0.44);
    } else if (newest.type === 'trick') {
      const trick = TRICKS.find((item) => newest.text.startsWith(item.name));
      eventCallout.textContent = trick ? `${trick.direction} ${newest.text}` : newest.text;
      eventCallout.classList.remove('goal-callout');
      eventCallout.classList.add('show', 'trick-callout');
      eventCalloutTimer = 0.85;
      const color = newest.team !== undefined ? game.teams[newest.team].primary : '#ffdf5c';
      renderer.emitBurst(newest.position, color, 22, 0.78);
      audio.play('trick');
      slowMotionRemaining = Math.max(slowMotionRemaining, 0.28);
    } else if (newest.type === 'bounce' || newest.type === 'save' || newest.type === 'foul' || newest.type === 'tackle') {
      eventCallout.textContent = newest.text;
      eventCallout.classList.remove('goal-callout', 'trick-callout');
      eventCallout.classList.add('show');
      eventCalloutTimer = newest.type === 'tackle' ? 0.9 : 0.65;
      if (newest.type === 'bounce') audio.play('wall');
      if (newest.type === 'save') audio.play('save');
      if (newest.type === 'tackle') audio.play('slide');
    } else if (newest.type === 'kick' || newest.type === 'special') {
      if (actionConfirmation === newest) {
        eventCallout.textContent = newest.text;
        eventCallout.classList.remove('goal-callout', 'trick-callout');
        eventCallout.classList.add('show');
        eventCalloutTimer = 0.75;
      }
      audio.play(newest.text.toUpperCase().includes('PASE') ? 'pass' : 'kick');
    }
  }
  if (eventCalloutTimer <= 0) eventCallout.classList.remove('show', 'goal-callout', 'trick-callout');
}

function frame(now: number) {
  const dt = Math.min(0.05, Math.max(0, (now - lastTime) / 1000));
  lastTime = now;
  if (running && !paused && game.phase !== 'finished') {
    updateTutorial(dt);
    const controls: PlayerControls = {
      move: readMovement(),
      sprint: sprintHeld || keys.has('shift'),
      slide: slideQueued,
      action: queuedAction,
      trickId: queuedTrick,
    };
    const secondControls: PlayerControls = {
      move: readMovement(true),
      sprint: p2SprintHeld || keys.has('p2-sprint'),
      slide: p2SlideQueued,
      action: p2QueuedAction === 'shoot' && canUseSpecialShot(game.skill[1]) ? 'special' : p2QueuedAction,
      trickId: p2QueuedTrick,
    };
    const inputPlayers = { team0: selectedPlayerForTeam(0), team1: selectedPlayerForTeam(1) };
    const gameScale = slowMotionRemaining > 0 ? 0.38 : 1;
    slowMotionRemaining = Math.max(0, slowMotionRemaining - dt);
    game = stepMatch(game, controls, dt * gameScale, game.difficulty, false, secondControls, beginnerAssist && currentMode !== 'local');
    if (queuedAction && now >= queuedActionUntil) queuedAction = undefined;
    if (p2QueuedAction && now >= p2QueuedActionUntil) p2QueuedAction = undefined;
    if (slideQueued && now >= slideQueuedUntil) slideQueued = false;
    if (p2SlideQueued && now >= p2SlideQueuedUntil) p2SlideQueued = false;
    if (queuedTrick && now >= queuedTrickUntil) queuedTrick = undefined;
    if (p2QueuedTrick && now >= p2QueuedTrickUntil) p2QueuedTrick = undefined;
    updateHud();
    showEvents(dt, inputPlayers);
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
  if (action === 'pass') advanceTutorial('pass');
  if (action === 'shoot') advanceTutorial('shoot');
  const player = game.players.find((item) => item.id === game.selectedPlayerId);
  if (action === 'slide') {
    slideQueued = true;
    slideQueuedUntil = performance.now() + ACTION_BUFFER_MS;
  } else {
    queuedAction = action === 'shoot' && canUseSpecialShot(game.skill[0]) ? 'special' : action;
    queuedActionUntil = performance.now() + ACTION_BUFFER_MS;
    if (player?.id !== game.ball.ownerId) showControlNotice('RECUPERÁ LA PELOTA');
  }
}

function queueSecondAction(action: ActionId) {
  if (!running || paused || currentMode !== 'local') return;
  const player = game.players.find((item) => item.id === game.secondSelectedPlayerId);
  if (action === 'slide') {
    p2SlideQueued = true;
    p2SlideQueuedUntil = performance.now() + ACTION_BUFFER_MS;
  } else {
    p2QueuedAction = action;
    p2QueuedActionUntil = performance.now() + ACTION_BUFFER_MS;
    if (player?.id !== game.ball.ownerId) showControlNotice('RECUPERÁ LA PELOTA');
  }
}

function showControlNotice(text: string) {
  eventCallout.textContent = text;
  eventCallout.classList.remove('goal-callout', 'trick-callout');
  eventCallout.classList.add('show');
  eventCalloutTimer = 0.65;
}

el<HTMLButtonElement>('start-match').addEventListener('click', () => beginMatch('quick'));
el<HTMLButtonElement>('start-challenge').addEventListener('click', () => beginMatch('quick'));
const achievementsPanel = el<HTMLElement>('achievements-panel');
const achievementsButton = el<HTMLButtonElement>('achievements-button');
const closeAchievementsButton = el<HTMLButtonElement>('close-achievements');
achievementsButton.addEventListener('click', () => {
  achievementsPanel.classList.remove('hidden');
  closeAchievementsButton.focus();
});
function closeAchievements() {
  achievementsPanel.classList.add('hidden');
  achievementsButton.focus();
}
closeAchievementsButton.addEventListener('click', closeAchievements);
achievementsPanel.addEventListener('pointerdown', (event) => {
  if (event.target === achievementsPanel) closeAchievements();
});
window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !achievementsPanel.classList.contains('hidden')) closeAchievements();
});
el<HTMLButtonElement>('start-tournament').addEventListener('click', startTournament);
el<HTMLButtonElement>('start-local').addEventListener('click', () => beginMatch('local'));
el<HTMLButtonElement>('pause-match').addEventListener('click', pauseMatch);
el<HTMLButtonElement>('resume-match').addEventListener('click', resumeMatch);
el<HTMLButtonElement>('quit-match').addEventListener('click', exitMatch);
el<HTMLButtonElement>('replay-match').addEventListener('click', () => beginMatch(currentMode));
el<HTMLButtonElement>('next-round').addEventListener('click', () => {
  if (tournament?.championId) tournament = createTournament(Date.now(), 'candela');
  beginMatch('tournament');
});
el<HTMLButtonElement>('result-menu').addEventListener('click', exitMatch);
difficultySelect.addEventListener('change', () => { difficultyChosen = true; });
el<HTMLButtonElement>('skip-tutorial').addEventListener('click', finishTutorial);

function onLockerChange(event: Event) {
  const changed = event.currentTarget as HTMLSelectElement;
  const rewardId = changed.selectedOptions[0]?.dataset.unlockId;
  if (rewardId && !progress.unlocked.includes(rewardId) && !['candela', 'classic', 'court-rooftop'].includes(rewardId)) {
    const purchase = purchaseReward(progress, rewardId);
    if (!purchase.purchased) {
      el<HTMLElement>('locker-feedback').textContent = purchase.reason === 'coins' ? 'TE FALTAN MONEDAS.' : 'NO SE PUDO COMPRAR.';
      updateMenuProfile();
      return;
    }
    progress = purchase.progress;
    el<HTMLElement>('locker-feedback').textContent = `COMPRADO: ${purchase.purchased.label.toUpperCase()}`;
  } else {
    el<HTMLElement>('locker-feedback').textContent = '';
  }
  progress = selectReward(progress, uniformSelect.selectedOptions[0]?.dataset.unlockId ?? uniformSelect.value);
  progress = selectReward(progress, bootsSelect.selectedOptions[0]?.dataset.unlockId ?? bootsSelect.value);
  progress = selectReward(progress, courtSelect.selectedOptions[0]?.dataset.unlockId ?? courtSelect.value);
  persistProgress();
  updateMenuProfile();
  renderer.setCourt(progress.court);
}
uniformSelect.addEventListener('change', onLockerChange);
bootsSelect.addEventListener('change', onLockerChange);
courtSelect.addEventListener('change', onLockerChange);
soundToggle.addEventListener('click', () => {
  const enabled = audio.toggle();
  soundToggle.setAttribute('aria-label', enabled ? 'Silenciar sonido' : 'Activar sonido');
  soundToggle.title = enabled ? 'Silenciar sonido' : 'Activar sonido';
  soundToggle.classList.toggle('sound-on', enabled);
  if (enabled) audio.play('ui');
});
audioMixToggle.addEventListener('click', () => {
  const open = audioSettings.classList.toggle('hidden') === false;
  audioMixToggle.setAttribute('aria-expanded', String(open));
});
const persistAudioMix = () => {
  const mix = {
    music: Number(musicVolume.value) / 100,
    effects: Number(effectsVolume.value) / 100,
    crowd: Number(crowdVolume.value) / 100,
  };
  audio.setVolumes(mix);
  localStorage.setItem('osvistreet-audio', JSON.stringify(mix));
};
for (const slider of [musicVolume, effectsVolume, crowdVolume]) slider.addEventListener('input', persistAudioMix);
document.addEventListener('pointerdown', (event) => {
  if (!(event.target instanceof Element)) return;
  if (event.target.closest('button') && event.target.closest('#sound-toggle') === null) audio.play('ui');
}, { capture: true });

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

document.querySelectorAll<HTMLButtonElement>('[data-p2-action]').forEach((button) => {
  button.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    button.classList.add('pressed');
    queueSecondAction(button.dataset.p2Action as ActionId);
  });
  for (const end of ['pointerup', 'pointercancel', 'pointerleave']) button.addEventListener(end, () => button.classList.remove('pressed'));
});
const p2SprintButton = document.querySelector<HTMLButtonElement>('[data-p2-hold="sprint"]');
p2SprintButton?.addEventListener('pointerdown', (event) => { event.preventDefault(); p2SprintHeld = true; p2SprintButton.classList.add('pressed'); });
for (const end of ['pointerup', 'pointercancel', 'pointerleave']) p2SprintButton?.addEventListener(end, () => { p2SprintHeld = false; p2SprintButton.classList.remove('pressed'); });

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
  queuedTrickUntil = performance.now() + ACTION_BUFFER_MS;
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

p2TrickButton.addEventListener('pointerdown', (event) => {
  if (!running || paused || currentMode !== 'local') return;
  event.preventDefault();
  p2TrickPointer = event.pointerId;
  p2TrickOrigin = { x: event.clientX, y: event.clientY };
  p2TrickButton.setPointerCapture(event.pointerId);
  p2TrickButton.classList.add('pressed');
  trickSelector.classList.remove('hidden');
  selectTrickPreview(p2TrickId);
});
p2TrickButton.addEventListener('pointermove', (event) => {
  if (event.pointerId !== p2TrickPointer) return;
  const dx = event.clientX - p2TrickOrigin.x;
  const dy = event.clientY - p2TrickOrigin.y;
  if (Math.hypot(dx, dy) >= TRICK_SWIPE_THRESHOLD) {
    p2TrickId = trickFromSwipe(dx, dy);
    selectTrickPreview(p2TrickId);
  }
});
p2TrickButton.addEventListener('pointerup', (event) => {
  if (event.pointerId !== p2TrickPointer) return;
  const dx = event.clientX - p2TrickOrigin.x;
  const dy = event.clientY - p2TrickOrigin.y;
  p2QueuedTrick = Math.hypot(dx, dy) >= TRICK_SWIPE_THRESHOLD ? trickFromSwipe(dx, dy) : p2TrickId;
  p2QueuedTrickUntil = performance.now() + ACTION_BUFFER_MS;
  p2TrickPointer = null;
  p2TrickButton.classList.remove('pressed');
  window.setTimeout(() => trickSelector.classList.add('hidden'), 260);
});
p2TrickButton.addEventListener('pointercancel', () => {
  p2TrickPointer = null;
  p2TrickButton.classList.remove('pressed');
  trickSelector.classList.add('hidden');
});

joystick.addEventListener('pointerdown', (event) => {
  if (paused) return;
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

p2Joystick.addEventListener('pointerdown', (event) => {
  if (paused || currentMode !== 'local') return;
  event.preventDefault();
  p2JoystickPointer = event.pointerId;
  p2Joystick.setPointerCapture(event.pointerId);
  const rect = p2Joystick.getBoundingClientRect();
  p2JoystickCenter = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  moveSecondJoystick(event.clientX, event.clientY);
});
p2Joystick.addEventListener('pointermove', (event) => {
  if (event.pointerId === p2JoystickPointer) moveSecondJoystick(event.clientX, event.clientY);
});
const releaseP2Joy = (event: PointerEvent) => {
  if (event.pointerId !== p2JoystickPointer) return;
  p2JoystickPointer = null;
  p2JoystickMove = { x: 0, z: 0 };
  p2Knob.style.transform = 'translate(-50%, -50%)';
};
p2Joystick.addEventListener('pointerup', releaseP2Joy);
p2Joystick.addEventListener('pointercancel', releaseP2Joy);

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

function moveSecondJoystick(x: number, y: number) {
  const dx = x - p2JoystickCenter.x;
  const dy = y - p2JoystickCenter.y;
  const limit = p2Joystick.clientWidth * 0.32;
  const magnitude = Math.hypot(dx, dy);
  const scale = magnitude > limit ? limit / magnitude : 1;
  const clampedX = dx * scale;
  const clampedY = dy * scale;
  p2JoystickMove = { x: clampedX / limit, z: clampedY / limit };
  p2Knob.style.transform = `translate(calc(-50% + ${clampedX}px), calc(-50% + ${clampedY}px))`;
}

const keyMap: Record<string, string> = { ArrowUp: 'w', ArrowDown: 's', ArrowLeft: 'a', ArrowRight: 'd', ' ': 'space' };
const p2KeyMap: Record<string, string> = { ArrowUp: 'p2-up', ArrowDown: 'p2-down', ArrowLeft: 'p2-left', ArrowRight: 'p2-right' };
window.addEventListener('keydown', (event) => {
  if (currentMode === 'local' && p2KeyMap[event.key]) {
    event.preventDefault();
    keys.add(p2KeyMap[event.key]!);
    return;
  }
  if (currentMode === 'local' && /^Numpad[0-5]$/.test(event.code)) {
    event.preventDefault();
    if (event.repeat) return;
    if (event.code === 'Numpad0') keys.add('p2-sprint');
    if (event.code === 'Numpad1') queueSecondAction('pass');
    if (event.code === 'Numpad2') queueSecondAction('lob');
    if (event.code === 'Numpad3') queueSecondAction('shoot');
    if (event.code === 'Numpad4') p2SlideQueued = true;
    if (event.code === 'Numpad5') p2QueuedTrick = p2TrickId;
    return;
  }
  const key = keyMap[event.key] ?? event.key.toLowerCase();
  if (['w', 'a', 's', 'd', 'shift', 'space', 'j', 'k', 'l', 't', 'escape'].includes(key)) event.preventDefault();
  if (event.repeat) return;
  keys.add(key);
  if (key === 'space') queueAction('shoot');
  if (key === 'j') queueAction('pass');
  if (key === 'k') queueAction('lob');
  if (key === 'l') queueAction('slide');
    if (key === 't' && running && !paused) { queuedTrick = DEFAULT_TRICK; queuedTrickUntil = performance.now() + ACTION_BUFFER_MS; }
  if (key === 'escape') paused ? resumeMatch() : pauseMatch();
});
window.addEventListener('keyup', (event) => {
  keys.delete(p2KeyMap[event.key] ?? '');
  if (event.code === 'Numpad0') keys.delete('p2-sprint');
  keys.delete(keyMap[event.key] ?? event.key.toLowerCase());
});
window.addEventListener('blur', clearControlState);

updateMenuProfile();
requestAnimationFrame(frame);
