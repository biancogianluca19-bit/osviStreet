type SoundEvent = 'kick' | 'wall' | 'trick' | 'goal' | 'save';

/** Small synthesized sound bed; audio starts only after the player taps the sound button. */
export class StreetAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private crowd: GainNode | null = null;
  private crowdSource: AudioBufferSourceNode | null = null;
  private melodyTimer = 0;
  private enabled = false;
  private melodyIndex = 0;

  get isEnabled() { return this.enabled; }

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
      this.master.gain.setTargetAtTime(0.72, this.context.currentTime, 0.08);
      if (this.crowd) this.crowd.gain.setTargetAtTime(0.16, this.context.currentTime, 0.18);
      this.startMelody();
    } else {
      this.master.gain.setTargetAtTime(0, this.context.currentTime, 0.08);
      if (this.crowd) this.crowd.gain.setTargetAtTime(0, this.context.currentTime, 0.08);
      window.clearInterval(this.melodyTimer);
    }
  }

  play(event: SoundEvent) {
    if (!this.enabled || !this.context || !this.master) return;
    if (event === 'kick') this.tone(155, 'triangle', 0.075, 0.12, 80);
    else if (event === 'wall') this.noise(0.09, 0.16, 950);
    else if (event === 'trick') this.tone(530 + Math.random() * 180, 'sine', 0.14, 0.13, 240);
    else if (event === 'goal') {
      this.tone(392, 'triangle', 0.34, 0.16, 494);
      window.setTimeout(() => this.tone(587, 'sine', 0.48, 0.13, 784), 90);
      this.noise(0.42, 0.09, 500);
    } else {
      this.noise(0.32, 0.12, 680);
      this.tone(246, 'sine', 0.22, 0.06, 320);
    }
  }

  dispose() {
    window.clearInterval(this.melodyTimer);
    this.crowdSource?.stop();
    void this.context?.close();
  }

  private initialize() {
    const AudioContextClass = window.AudioContext;
    this.context = new AudioContextClass();
    this.master = this.context.createGain();
    this.master.gain.value = 0;
    this.master.connect(this.context.destination);
    const low = this.context.createBiquadFilter();
    low.type = 'lowpass';
    low.frequency.value = 400;
    this.crowd = this.context.createGain();
    this.crowd.gain.value = 0;
    low.connect(this.crowd);
    this.crowd.connect(this.master);
    const sampleRate = this.context.sampleRate;
    const buffer = this.context.createBuffer(1, sampleRate * 2, sampleRate);
    const channel = buffer.getChannelData(0);
    for (let index = 0; index < channel.length; index++) channel[index] = (Math.random() * 2 - 1) * 0.2;
    this.crowdSource = this.context.createBufferSource();
    this.crowdSource.buffer = buffer;
    this.crowdSource.loop = true;
    this.crowdSource.connect(low);
    this.crowdSource.start();
    for (const [frequency, volume] of [[110, 0.024], [164.81, 0.014]] as const) {
      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      gain.gain.value = volume;
      oscillator.connect(gain);
      gain.connect(this.master);
      oscillator.start();
    }
  }

  private startMelody() {
    if (this.melodyTimer) return;
    const notes = [293.66, 369.99, 440, 587.33, 440, 369.99, 329.63, 493.88];
    this.melodyTimer = window.setInterval(() => {
      if (!this.enabled) return;
      const note = notes[this.melodyIndex++ % notes.length]!;
      this.tone(note, 'triangle', 0.24, 0.028, note * 1.5);
    }, 390);
  }

  private tone(frequency: number, type: OscillatorType, duration: number, volume: number, endFrequency = frequency) {
    if (!this.context || !this.master) return;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    const now = this.context.currentTime;
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(25, endFrequency), now + duration);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    oscillator.connect(gain);
    gain.connect(this.master);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.015);
  }

  private noise(duration: number, volume: number, filterFrequency: number) {
    if (!this.context || !this.master) return;
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
    gain.connect(this.master);
    source.start(now);
    source.stop(now + duration + 0.02);
  }
}
