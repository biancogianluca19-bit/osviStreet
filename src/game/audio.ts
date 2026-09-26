export type SoundEvent = 'kick' | 'wall' | 'trick' | 'goal' | 'save' | 'pass' | 'slide' | 'ui';
export type MusicScene = 'menu' | 'match';

export interface AudioMix {
  music: number;
  effects: number;
  crowd: number;
}

const DEFAULT_MIX: AudioMix = { music: 0.35, effects: 0.72, crowd: 0.2 };
const clampVolume = (value: number) => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));

/** Audio generated locally with Web Audio; it starts after the player's first tap. */
export class StreetAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private effectsBus: GainNode | null = null;
  private crowdBus: GainNode | null = null;
  private crowdSource: AudioBufferSourceNode | null = null;
  private melodyTimer = 0;
  private enabled = false;
  private melodyIndex = 0;
  private scene: MusicScene = 'menu';
  private mix: AudioMix = { ...DEFAULT_MIX };

  get isEnabled() { return this.enabled; }
  get volumes(): AudioMix { return { ...this.mix }; }

  toggle() {
    this.setEnabled(!this.enabled);
    return this.enabled;
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!this.context && enabled) this.initialize();
    if (!this.context || !this.master) return;
    if (enabled) {
      void this.context.resume();
      this.master.gain.setTargetAtTime(0.82, this.context.currentTime, 0.08);
      this.startMelody();
    } else {
      this.master.gain.setTargetAtTime(0, this.context.currentTime, 0.08);
      window.clearInterval(this.melodyTimer);
      this.melodyTimer = 0;
    }
  }

  setVolumes(mix: Partial<AudioMix>) {
    this.mix = {
      music: clampVolume(mix.music ?? this.mix.music),
      effects: clampVolume(mix.effects ?? this.mix.effects),
      crowd: clampVolume(mix.crowd ?? this.mix.crowd),
    };
    if (!this.context) return;
    const now = this.context.currentTime;
    this.musicBus?.gain.setTargetAtTime(this.mix.music, now, 0.05);
    this.effectsBus?.gain.setTargetAtTime(this.mix.effects, now, 0.05);
    this.crowdBus?.gain.setTargetAtTime(this.mix.crowd, now, 0.05);
  }

  setScene(scene: MusicScene) {
    if (scene === this.scene) return;
    this.scene = scene;
    this.melodyIndex = 0;
    if (this.enabled) {
      window.clearInterval(this.melodyTimer);
      this.melodyTimer = 0;
      this.startMelody();
    }
  }

  play(event: SoundEvent) {
    if (!this.enabled || !this.context || !this.effectsBus) return;
    if (event === 'kick') this.tone(155, 'triangle', 0.075, 0.12, 80);
    else if (event === 'pass') this.tone(235, 'triangle', 0.09, 0.085, 330);
    else if (event === 'slide') this.noise(0.18, 0.12, 620);
    else if (event === 'wall') this.noise(0.09, 0.16, 950);
    else if (event === 'trick') this.tone(530 + Math.random() * 180, 'sine', 0.14, 0.13, 240);
    else if (event === 'ui') this.tone(720, 'sine', 0.055, 0.07, 910);
    else if (event === 'goal') {
      this.tone(392, 'triangle', 0.34, 0.16, 494);
      window.setTimeout(() => this.tone(587, 'sine', 0.48, 0.13, 784), 90);
      this.noise(0.42, 0.11, 500, this.crowdBus);
    } else {
      this.noise(0.32, 0.12, 680, this.crowdBus);
      this.tone(246, 'sine', 0.22, 0.06, 320);
    }
  }

  dispose() {
    window.clearInterval(this.melodyTimer);
    this.crowdSource?.stop();
    void this.context?.close();
  }

  private initialize() {
    this.context = new AudioContext();
    this.master = this.context.createGain();
    this.master.gain.value = 0;
    this.master.connect(this.context.destination);
    this.musicBus = this.context.createGain();
    this.effectsBus = this.context.createGain();
    this.crowdBus = this.context.createGain();
    this.musicBus.gain.value = this.mix.music;
    this.effectsBus.gain.value = this.mix.effects;
    this.crowdBus.gain.value = this.mix.crowd;
    this.musicBus.connect(this.master);
    this.effectsBus.connect(this.master);
    this.crowdBus.connect(this.master);

    const sampleRate = this.context.sampleRate;
    const buffer = this.context.createBuffer(1, sampleRate * 2, sampleRate);
    const channel = buffer.getChannelData(0);
    for (let index = 0; index < channel.length; index++) channel[index] = (Math.random() * 2 - 1) * 0.2;
    const low = this.context.createBiquadFilter();
    low.type = 'lowpass';
    low.frequency.value = 400;
    this.crowdSource = this.context.createBufferSource();
    this.crowdSource.buffer = buffer;
    this.crowdSource.loop = true;
    this.crowdSource.connect(low);
    low.connect(this.crowdBus);
    this.crowdSource.start();

    for (const [frequency, volume] of [[110, 0.024], [164.81, 0.014]] as const) {
      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      gain.gain.value = volume;
      oscillator.connect(gain);
      gain.connect(this.musicBus);
      oscillator.start();
    }
  }

  private startMelody() {
    if (this.melodyTimer) return;
    const menuNotes = [293.66, 369.99, 440, 587.33, 440, 369.99, 329.63, 493.88];
    const matchNotes = [392, 392, 493.88, 587.33, 493.88, 440, 392, 329.63];
    this.melodyTimer = window.setInterval(() => {
      if (!this.enabled) return;
      const notes = this.scene === 'menu' ? menuNotes : matchNotes;
      const note = notes[this.melodyIndex++ % notes.length]!;
      this.tone(note, 'triangle', this.scene === 'menu' ? 0.24 : 0.18, this.scene === 'menu' ? 0.028 : 0.038, note * 1.5, this.musicBus);
    }, this.scene === 'menu' ? 390 : 300);
  }

  private tone(frequency: number, type: OscillatorType, duration: number, volume: number, endFrequency = frequency, bus = this.effectsBus) {
    if (!this.context || !bus) return;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    const now = this.context.currentTime;
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(25, endFrequency), now + duration);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    oscillator.connect(gain);
    gain.connect(bus);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.015);
  }

  private noise(duration: number, volume: number, filterFrequency: number, bus = this.effectsBus) {
    if (!this.context || !bus) return;
    const sampleRate = this.context.sampleRate;
    const buffer = this.context.createBuffer(1, Math.max(1, Math.floor(sampleRate * duration)), sampleRate);
    const channel = buffer.getChannelData(0);
    for (let index = 0; index < channel.length; index++) channel[index] = Math.random() * 2 - 1;
    const source = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    const gain = this.context.createGain();
    const now = this.context.currentTime;
    source.buffer = buffer;
    filter.type = 'lowpass';
    filter.frequency.value = filterFrequency;
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(bus);
    source.start(now);
    source.stop(now + duration + 0.02);
  }
}
