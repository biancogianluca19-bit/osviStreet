import { describe, expect, it } from 'vitest';
import { difficultyAfterWin, freshProgress, parseProgress } from '../src/game/progress';

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
});
