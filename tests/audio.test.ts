import { describe, expect, it } from 'vitest';
import { effectiveAudioMix, type AudioMix } from '../src/game/audio';

describe('mezcla durante la pausa', () => {
  const mix: AudioMix = { music: 0.5, effects: 0.7, crowd: 0.4 };

  it('baja la música y la hinchada, y conserva los efectos de interfaz', () => {
    expect(effectiveAudioMix(mix, true)).toEqual({ music: 0.09, effects: 0.7, crowd: 0.048 });
  });

  it('restaura los volúmenes elegidos al reanudar', () => {
    expect(effectiveAudioMix(mix, false)).toEqual(mix);
  });
});
