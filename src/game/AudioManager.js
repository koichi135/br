// Every sound in this game is synthesized with the Web Audio API at runtime.
// No sample files -- just oscillators, filtered noise, and envelopes, which
// keeps things small and lets everything glitch in a consistently cheap way.

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.ready = false;
  }

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.ctx = ctx;

    this.master = ctx.createGain();
    this.master.gain.value = 0.85;
    this.master.connect(ctx.destination);

    this.ambientGain = ctx.createGain();
    this.ambientGain.gain.value = 1;
    this.ambientGain.connect(this.master);

    this.sfxGain = ctx.createGain();
    this.sfxGain.connect(this.master);

    this.heartGain = ctx.createGain();
    this.heartGain.gain.value = 0;
    this.heartGain.connect(this.master);

    this.noiseBuffer = this._makeNoiseBuffer(2);

    this._startHum();
    this._startBuzz();
    this._startHeartbeatLoop();

    this.ready = true;
  }

  _makeNoiseBuffer(seconds) {
    const ctx = this.ctx;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  _noiseSource() {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;
    return src;
  }

  _startHum() {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 54;
    const gain = ctx.createGain();
    gain.gain.value = 0.05;
    osc.connect(gain).connect(this.ambientGain);
    osc.start();

    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = 60.5;
    const gain2 = ctx.createGain();
    gain2.gain.value = 0.03;
    osc2.connect(gain2).connect(this.ambientGain);
    osc2.start();
  }

  _startBuzz() {
    const ctx = this.ctx;
    const src = this._noiseSource();
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 3200;
    filter.Q.value = 4;
    const gain = ctx.createGain();
    gain.gain.value = 0.012;
    src.connect(filter).connect(gain).connect(this.ambientGain);
    src.start();
    this._buzzGain = gain;

    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.15;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.008;
    lfo.connect(lfoGain).connect(gain.gain);
    lfo.start();
  }

  duckAmbient(duck) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.ambientGain.gain.cancelScheduledValues(t);
    this.ambientGain.gain.setValueAtTime(this.ambientGain.gain.value, t);
    this.ambientGain.gain.linearRampToValueAtTime(duck ? 0.35 : 1, t + 0.4);
  }

  footstep(sprinting) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = sprinting ? 900 : 500;
    const gain = ctx.createGain();
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(sprinting ? 0.16 : 0.1, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    src.connect(filter).connect(gain).connect(this.sfxGain);
    src.start(now);
    src.stop(now + 0.1);
  }

  playStatic() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const src = this._noiseSourceOneShot();
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 1200;
    const gain = ctx.createGain();
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.22, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    src.connect(filter).connect(gain).connect(this.sfxGain);
    src.start(now);
    src.stop(now + 0.55);
  }

  _noiseSourceOneShot() {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = false;
    return src;
  }

  jumpscareStinger() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    const src = this._noiseSourceOneShot();
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(6000, now);
    filter.frequency.exponentialRampToValueAtTime(200, now + 0.4);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.7, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    src.connect(filter).connect(gain).connect(this.sfxGain);
    src.start(now);
    src.stop(now + 0.55);

    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.5);
    const oGain = ctx.createGain();
    oGain.gain.setValueAtTime(0.35, now);
    oGain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    osc.connect(oGain).connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.6);
  }

  _startHeartbeatLoop() {
    this._heartIntensity = 0;
    const tick = () => {
      if (!this.ctx) return;
      const intensity = this._heartIntensity;
      if (intensity > 0.01) this._thump(intensity);
      const interval = 900 - intensity * 500;
      this._heartTimer = setTimeout(tick, Math.max(320, interval));
    };
    tick();
  }

  _thump(intensity) {
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(58, now);
    osc.frequency.exponentialRampToValueAtTime(38, now + 0.18);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.5 * intensity, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
    osc.connect(gain).connect(this.heartGain);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  setHeartbeatIntensity(v) {
    this._heartIntensity = Math.max(0, Math.min(1, v));
    if (this.heartGain) this.heartGain.gain.value = 1;
  }

  dialupSweep(durationSec = 3) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const steps = 10;
    for (let i = 0; i < steps; i++) {
      const t0 = now + (i / steps) * durationSec;
      const osc = ctx.createOscillator();
      osc.type = i % 2 === 0 ? 'square' : 'sine';
      const freq = 400 + Math.random() * 2200;
      osc.frequency.setValueAtTime(freq, t0);
      osc.frequency.linearRampToValueAtTime(freq * (0.6 + Math.random()), t0 + durationSec / steps);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.001, t0);
      gain.gain.linearRampToValueAtTime(0.12, t0 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + durationSec / steps);
      osc.connect(gain).connect(this.sfxGain);
      osc.start(t0);
      osc.stop(t0 + durationSec / steps + 0.02);
    }
  }
}
