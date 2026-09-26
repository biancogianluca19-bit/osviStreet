import { describe, expect, it } from 'vitest';
import { ACHIEVEMENTS, achievementsFor, careerProgress, challengeForDay, DAILY_CHALLENGES, dayKey, difficultyAfterWin, freshProgress, parseProgress, purchaseReward, recordCompletedMatch, refreshDailyChallenge, selectReward } from '../src/game/progress';

describe('Progreso y bienvenida', () => {
  it('marca el tutorial como pendiente en una partida nueva y conserva el dato al cargar', () => {
    expect(freshProgress().tutorialComplete).toBe(false);
    const saved = { ...freshProgress(), tutorialComplete: true };
    expect(parseProgress(JSON.stringify(saved)).tutorialComplete).toBe(true);
  });

  it('lee datos de vestuario previos sin romper y vuelve a ofrecer el tutorial', () => {
    const oldSave = JSON.stringify({ ...freshProgress(), tutorialComplete: undefined });
    expect(parseProgress(oldSave).tutorialComplete).toBe(false);
  });

  it('sube un nivel de dificultad al ganar y se detiene en PICANTE', () => {
    expect(difficultyAfterWin(0)).toBe(1);
    expect(difficultyAfterWin(1)).toBe(2);
    expect(difficultyAfterWin(2)).toBe(2);
  });

  it('guarda monedas y experiencia y avanza la barra de temporada', () => {
    const award = recordCompletedMatch(freshProgress(), true);
    expect(award.coinsEarned).toBe(40);
    expect(award.xpEarned).toBe(75);
    expect(award.progress.coins).toBe(40);
    expect(parseProgress(JSON.stringify(award.progress))).toMatchObject({ coins: 40, xp: 75 });
    expect(careerProgress(75)).toEqual({ level: 1, currentXp: 75, neededXp: 100 });
    expect(careerProgress(150)).toEqual({ level: 2, currentXp: 50, neededXp: 125 });
  });

  it('rota el reto por fecha local y lo reinicia al comenzar otro día', () => {
    const start = new Date(2026, 0, 1, 12);
    const profile = freshProgress(start);
    const nextDay = new Date(2026, 0, 2, 12);
    const refreshed = refreshDailyChallenge(profile, nextDay);
    expect(refreshed.dailyChallenge.day).toBe(dayKey(nextDay));
    expect(refreshed.dailyChallenge.value).toBe(0);
    expect(challengeForDay(dayKey(start)).id).not.toBe(challengeForDay(dayKey(nextDay)).id);
  });

  it('registra goles, trucos y racha y entrega el reto diario una sola vez', () => {
    const day = Array.from({ length: 4 }, (_, index) => new Date(2026, 0, index + 1, 12))
      .find((date) => challengeForDay(dayKey(date)).kind === 'play')!;
    const first = recordCompletedMatch(freshProgress(day), true, { goals: 2, tricks: 2 }, day);
    expect(first.dailyCompleted).toBe(true);
    expect(first.coinsEarned).toBe(90);
    expect(first.progress.records).toMatchObject({ bestMatchGoals: 2, totalGoals: 2, totalTricks: 2, winStreak: 1, bestWinStreak: 1 });
    const second = recordCompletedMatch(first.progress, true, { goals: 3, tricks: 1 }, day);
    expect(second.dailyCompleted).toBe(false);
    expect(second.progress.records).toMatchObject({ bestMatchGoals: 3, totalGoals: 5, totalTricks: 3, bestWinStreak: 2 });
  });

  it('compra un cosmético con saldo suficiente y no gasta monedas si falta saldo', () => {
    const poor = { ...freshProgress(), coins: 34 };
    expect(purchaseReward(poor, 'uniform-violet')).toMatchObject({ progress: poor, purchased: null, reason: 'coins' });
    const bought = purchaseReward({ ...poor, coins: 35 }, 'uniform-violet');
    expect(bought).toMatchObject({ purchased: { id: 'uniform-violet', priceCoins: 35 }, reason: null });
    expect(bought.progress.coins).toBe(0);
    expect(selectReward(bought.progress, 'uniform-violet').uniform).toBe('violet');
    expect(purchaseReward(bought.progress, 'uniform-violet').reason).toBe('owned');
  });

  it('migra perfiles anteriores sin reto ni récords y conserva las cuatro rotaciones', () => {
    const profile = { ...freshProgress(), dailyChallenge: undefined, records: undefined, coins: 18, xp: 42 };
    const loaded = parseProgress(JSON.stringify(profile), new Date(2026, 0, 3, 12));
    expect(loaded).toMatchObject({ coins: 18, xp: 42, dailyChallenge: { day: '2026-01-03', value: 0, complete: false }, records: { totalGoals: 0 } });
    expect(new Set(Array.from({ length: 4 }, (_, index) => challengeForDay(dayKey(new Date(2026, 0, index + 1, 12))).id)).size).toBe(4);
    expect(DAILY_CHALLENGES).toHaveLength(4);
  });

  it('mantiene quince logros medibles que se habilitan por las estadísticas guardadas', () => {
    const profile = { ...freshProgress(), matches: 1, wins: 1, records: { ...freshProgress().records, bestMatchGoals: 3, totalGoals: 10, totalTricks: 1 } };
    const achievements = achievementsFor(profile);
    expect(ACHIEVEMENTS).toHaveLength(15);
    expect(achievements.filter((achievement) => achievement.complete).map((achievement) => achievement.id))
      .toEqual(expect.arrayContaining(['debut', 'first-win', 'hat-trick', 'ten-goals', 'first-trick']));
    expect(achievements.find((achievement) => achievement.id === 'fifty-goals')).toMatchObject({ current: 10, target: 50, complete: false });
  });
});
