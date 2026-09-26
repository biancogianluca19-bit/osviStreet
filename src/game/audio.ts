export type SoundEvent = 'kick' | 'wall' | 'trick' | 'goal' | 'save' | 'pass' | 'slide' | 'ui';
export type MusicScene = 'menu' | 'match';

export interface AudioMix {
  music: number;
  effects: number;
  crowd: number;
}

const DEFAULT_MIX: AudioMix = { music: 0.35, effects: 0.72, crowd: 0.2 };
const clampVolume = (value: number) => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));

export function effectiveAudioMix(mix: AudioMix, paused: boolean): AudioMix {
  return {
    music: mix.music * (paused ? 0.18 : 1),
    effects: mix.effects,
    crowd: mix.crowd * (paused ? 0.12 : 1),
  };
}

const MUSIC = {
  menuChords: [[146.83, 185, 220], [123.47, 146.83, 185], [98, 123.47, 146.83], [110, 138.59, 164.81]],
  matchChords: [[196, 246.94, 293.66], [146.83, 185, 220], [164.81, 196, 246.94], [130.81, 164.81, 196]],
  menuBass: [73.42, 61.74, 49, 55],
  matchBass: [49, 36.71, 41.2, 32.7],
  menuLead: [587.33, 659.25, 740, 880, 740, 659.25, 587.33, 493.88],
  matchLead: [392, 493.88, 587.33, 659.25, 587.33, 493.88, 440, 392],
  leadSteps: new Set([0, 1, 3, 4, 5, 7]),
} as const;

/** Audio generated locally with Web Audio; it starts after the player's first tap. */
export class StreetAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private effectsBus: GainNode | null = null;
  private crowdBus: GainNode | null = null;
  private crowdSource: AudioBufferSourceNode | null = null;
  private musicTimer = 0;
  private enabled = false;
  private paused = false;
  private musicStep = 0;
  private nextMusicTime = 0;
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
      this.applyBusVolumes();
      this.startMelody();
    } else {
      this.master.gain.setTargetAtTime(0, this.context.currentTime, 0.08);
      window.clearInterval(this.musicTimer);
      this.musicTimer = 0;
    }
  }

  setVolumes(mix: Partial<AudioMix>) {
    this.mix = {
      music: clampVolume(mix.music ?? this.mix.music),
      effects: clampVolume(mix.effects ?? this.mix.effects),
      crowd: clampVolume(mix.crowd ?? this.mix.crowd),
    };
    if (!this.context) return;
    this.applyBusVolumes();
  }

  setPaused(paused: boolean) {
    this.paused = paused;
    this.applyBusVolumes();
  }

  private applyBusVolumes() {
    if (!this.context) return;
    const now = this.context.currentTime;
    const levels = effectiveAudioMix(this.mix, this.paused);
    this.musicBus?.gain.setTargetAtTime(levels.music, now, 0.12);
    this.effectsBus?.gain.setTargetAtTime(levels.effects, now, 0.05);
    this.crowdBus?.gain.setTargetAtTime(levels.crowd, now, 0.18);
  }

  setScene(scene: MusicScene) {
    if (scene === this.scene) return;
    this.scene = scene;
    this.musicStep = 0;
    this.nextMusicTime = this.context?.currentTime ?? 0;
    if (this.enabled) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = 0;
      this.startMelody();
    }
  }

  play(event: SoundEvent) {
    if (!this.enabled || !this.context || !this.effectsBus) return;
    const now = this.context.currentTime;
    if (event === 'kick') {
      this.tone(138, 'sine', 0.11, 0.16, 48);
      this.noise(0.035, 0.04, 3600, this.effectsBus, now, 'highpass');
    } else if (event === 'pass') {
      this.tone(235, 'triangle', 0.09, 0.09, 330);
      this.tone(520, 'sine', 0.055, 0.035, 360);
    } else if (event === 'slide') {
      this.noise(0.22, 0.13, 1600, this.effectsBus, now, 'highpass');
      this.tone(92, 'sine', 0.16, 0.045, 42);
    } else if (event === 'wall') {
      this.noise(0.11, 0.18, 1100);
      this.tone(116, 'triangle', 0.12, 0.075, 64);
    } else if (event === 'trick') {
      const note = 494 + Math.random() * 165;
      this.tone(note, 'sine', 0.12, 0.09, note * 1.25);
      this.tone(note * 1.25, 'triangle', 0.15, 0.045, note * 1.5, undefined, now + 0.055);
      this.tone(note * 1.5, 'sine', 0.19, 0.035, note * 1.2, undefined, now + 0.11);
    } else if (event === 'ui') {
      this.tone(690, 'sine', 0.055, 0.055, 830);
      this.tone(930, 'sine', 0.065, 0.028, 1080, undefined, now + 0.025);
    } else if (event === 'goal') {
      this.tone(392, 'triangle', 0.34, 0.16, 494);
      this.tone(493.88, 'triangle', 0.42, 0.09, 587.33, undefined, now + 0.075);
      this.tone(587.33, 'sine', 0.48, 0.12, 784, undefined, now + 0.15);
      this.noise(0.58, 0.1, 720, this.crowdBus, now, 'bandpass');
      this.noise(0.43, 0.055, 1450, this.crowdBus, now + 0.07, 'bandpass');
    } else {
      this.noise(0.32, 0.12, 680, this.crowdBus);
      this.tone(246, 'sine', 0.22, 0.06, 320);
    }
  }

  dispose() {
    window.clearInterval(this.musicTimer);
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
    if (this.musicTimer || !this.context) return;
    this.nextMusicTime = this.context.currentTime + 0.04;
    this.musicTimer = window.setInterval(() => this.scheduleMusic(), 25);
    this.scheduleMusic();
  }

  private scheduleMusic() {
    const context = this.context;
    if (!context || !this.enabled || !this.musicBus) return;
    const bpm = this.scene === 'menu' ? 106 : 126;
    const stepDuration = 60 / bpm / 4;
    const horizon = context.currentTime + 0.12;
    if (context.currentTime - this.nextMusicTime > 0.5) {
      this.musicStep = (Math.ceil(this.musicStep / 16) * 16) % 64;
      this.nextMusicTime = context.currentTime + 0.04;
    }

    while (this.nextMusicTime < horizon) {
      const step = this.musicStep;
      const bar = Math.floor(step / 16) % 4;
      const beatStep = step % 16;
      const at = this.nextMusicTime;
      const chords = this.scene === 'menu' ? MUSIC.menuChords : MUSIC.matchChords;
      const bassLine = this.scene === 'menu' ? MUSIC.menuBass : MUSIC.matchBass;
      const lead = this.scene === 'menu' ? MUSIC.menuLead : MUSIC.matchLead;
      const chord = chords[bar]!;

      if (beatStep === 0) {
        for (const [index, note] of chord.entries()) {
          this.tone(note, index === 0 ? 'sine' : 'triangle', 0.42, index === 0 ? 0.055 : 0.033, note * 0.995, this.musicBus, at);
        }
        this.tone(bassLine[bar]!, 'triangle', 0.31, 0.09, bassLine[bar]! * 0.72, this.musicBus, at);
      } else if (beatStep === 8) {
        this.tone(bassLine[bar]! * 1.5, 'triangle', 0.2, 0.055, bassLine[bar]!, this.musicBus, at);
      }

      if (beatStep === 0 || beatStep === 8) {
        this.tone(this.scene === 'menu' ? 86 : 104, 'sine', 0.14, 0.08, 38, this.musicBus, at);
      }
      if (beatStep === 4 || beatStep === 12) {
        this.noise(0.1, this.scene === 'menu' ? 0.018 : 0.028, 2600, this.musicBus, at, 'highpass');
        this.tone(188, 'triangle', 0.065, 0.018, 82, this.musicBus, at);
      } else if (beatStep % 2 === 0) {
        this.noise(0.035, 0.009, 6800, this.musicBus, at, 'highpass');
      }

      const eighthStep = beatStep / 2;
      if (beatStep % 2 === 0 && MUSIC.leadSteps.has(eighthStep)) {
        const note = lead[(eighthStep + bar * 3) % lead.length]!;
        this.tone(note, 'triangle', this.scene === 'menu' ? 0.2 : 0.14, this.scene === 'menu' ? 0.044 : 0.052, note * 1.006, this.musicBus, at);
      }

      this.musicStep = (step + 1) % 64;
      this.nextMusicTime += stepDuration;
    }
  }

  private tone(frequency: number, type: OscillatorType, duration: number, volume: number, endFrequency = frequency, bus = this.effectsBus, when = this.context?.currentTime ?? 0) {
    if (!this.context || !bus) return;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    const now = Math.max(when, this.context.currentTime);
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

  private noise(duration: number, volume: number, filterFrequency: number, bus = this.effectsBus, when = this.context?.currentTime ?? 0, filterType: BiquadFilterType = 'lowpass') {
    if (!this.context || !bus) return;
    const sampleRate = this.context.sampleRate;
    const buffer = this.context.createBuffer(1, Math.max(1, Math.floor(sampleRate * duration)), sampleRate);
    const channel = buffer.getChannelData(0);
    for (let index = 0; index < channel.length; index++) channel[index] = Math.random() * 2 - 1;
    const source = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    const gain = this.context.createGain();
    const now = Math.max(when, this.context.currentTime);
    source.buffer = buffer;
    filter.type = filterType;
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
