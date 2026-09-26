import { describe, expect, it } from 'vitest';
import { careerProgress, difficultyAfterWin, freshProgress, parseProgress, recordCompletedMatch } from '../src/game/progress';

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
});
