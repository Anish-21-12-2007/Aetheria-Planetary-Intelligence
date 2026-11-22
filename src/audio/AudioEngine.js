/* ============================================================================
 * AETHERIA STUDIO v2.0 — Adaptive Multi-World Soundtrack 2.0, Mic Input & FFT
 * ============================================================================ */
(function (global) {
  'use strict';

  const WORLD_PROFILES = {
    'event-horizon':         { root: 55.0,  scale: [1, 1.125, 1.333, 1.5, 1.68, 2.0], cutoff: 900,  wave: 'sawtooth' },
    'aether-swarm':          { root: 65.41, scale: [1, 1.125, 1.25, 1.414, 1.5, 1.875], cutoff: 1800, wave: 'triangle' },
    'bioluminescent-abyss':  { root: 61.74, scale: [1, 1.189, 1.335, 1.498, 1.782, 2.0], cutoff: 1200, wave: 'sine' },
    'hyperion-cathedral':    { root: 73.42, scale: [1, 1.125, 1.25, 1.5, 1.667, 2.0], cutoff: 1500, wave: 'sawtooth' },
    'fractal-lab':           { root: 58.27, scale: [1, 1.06, 1.26, 1.414, 1.5, 1.89], cutoff: 1600, wave: 'triangle' },
    'sonic-terrain':         { root: 65.41, scale: [1, 1.2, 1.333, 1.5, 1.78, 2.0], cutoff: 2400, wave: 'sawtooth' },
    'quantum-fluid':         { root: 69.30, scale: [1, 1.125, 1.25, 1.414, 1.5, 1.75], cutoff: 1400, wave: 'triangle' },
    'aetherium-cloudscape':  { root: 82.41, scale: [1, 1.125, 1.25, 1.414, 1.5, 1.875], cutoff: 2100, wave: 'sine' },
    'neo-metropolis':        { root: 49.00, scale: [1, 1.189, 1.335, 1.498, 1.682, 2.0], cutoff: 1350, wave: 'sawtooth' },
    'quantum-morphogenesis': { root: 77.78, scale: [1, 1.125, 1.333, 1.5, 1.78, 2.0], cutoff: 1650, wave: 'triangle' }
  };

  const SYNTH_PADS = [
    { name: 'C2 Sub',   freq: 65.41,  type: 'sub',   color: '#38bdf8' },
    { name: 'G2 Deep',  freq: 98.00,  type: 'sub',   color: '#818cf8' },
    { name: 'C4 Maj',   freq: 261.63, type: 'chord', color: '#c084fc' },
    { name: 'D4 Lyd',   freq: 293.66, type: 'chord', color: '#e879f9' },
    { name: 'E4 Air',   freq: 329.63, type: 'chord', color: '#f472b6' },
    { name: 'F#4 Halo', freq: 369.99, type: 'bell',  color: '#fb923c' },
    { name: 'G4 Nova',  freq: 392.00, type: 'bell',  color: '#facc15' },
    { name: 'B4 Apex',  freq: 493.88, type: 'bell',  color: '#2dd4bf' }
  ];

  class AudioEngine {
    constructor(gl) {
      this.gl = gl;
      this.ctx = null;
      this.masterGain = null;
      this.masterFilter = null;
      this.analyser = null;
      this.reverb = null;
      this.streamDest = null;
      this.isPlaying = false;
      this.micActive = false;
      this._micStream = null;
      this._micSource = null;

      this.volume = 0.55;
      this.mood = 0;
      this.profile = WORLD_PROFILES['event-horizon'];

      this.freqData = new Uint8Array(64);
      this.smoothBands = new Float32Array(64);
      this.bass = 0; this.mid = 0; this.treble = 0; this.energy = 0; this.pulse = 0;

      this._chordIdx = 0;
      this._arpStep = 0;
      this._timers = [];
      this._droneOscs = [];

      this.fftTexture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, this.fftTexture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, 64, 1, 0, gl.RED, gl.UNSIGNED_BYTE, this.freqData);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.bindTexture(gl.TEXTURE_2D, null);
    }

    _ensureContext() {
      if (this.ctx) {
        if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
        return true;
      }
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      const ctx = new AC();
      this.ctx = ctx;

      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -14; comp.knee.value = 18; comp.ratio.value = 6;

      // Master filter for Bullet-Time slow-motion sweep
      this.masterFilter = ctx.createBiquadFilter();
      this.masterFilter.type = 'lowpass';
      this.masterFilter.frequency.value = 18000;

      this.masterGain = ctx.createGain();
      this.masterGain.gain.value = 0.0001;

      this.analyser = ctx.createAnalyser();
      this.analyser.fftSize = 128;
      this.analyser.smoothingTimeConstant = 0.80;

      this.reverb = ctx.createConvolver();
      this.reverb.buffer = this._buildImpulseResponse(ctx, 2.4, 2.8);
      this.reverbGain = ctx.createGain();
      this.reverbGain.gain.value = 0.44;

      this.dryBus = ctx.createGain();
      this.dryBus.gain.value = 0.75;

      this.dryBus.connect(comp);
      this.reverb.connect(this.reverbGain);
      this.reverbGain.connect(comp);
      comp.connect(this.masterFilter);
      this.masterFilter.connect(this.masterGain);
      this.masterGain.connect(this.analyser);
      this.analyser.connect(ctx.destination);

      if (ctx.createMediaStreamDestination) {
        this.streamDest = ctx.createMediaStreamDestination();
        this.masterGain.connect(this.streamDest);
      }

      this._startSubDrone();
      return true;
    }

    _buildImpulseResponse(ctx, duration, decay) {
      const rate = ctx.sampleRate, len = Math.floor(rate * duration);
      const buf = ctx.createBuffer(2, len, rate);
      for (let ch = 0; ch < 2; ch++) {
        const data = buf.getChannelData(ch);
        for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      }
      return buf;
    }

    _startSubDrone() {
      const ctx = this.ctx;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass'; filter.frequency.value = 145; filter.Q.value = 2.2;
      const lfo = ctx.createOscillator(), lfoGain = ctx.createGain();
      lfo.frequency.value = 0.09; lfoGain.gain.value = 55;
      lfo.connect(lfoGain); lfoGain.connect(filter.frequency); lfo.start();
      const droneGain = ctx.createGain(); droneGain.gain.value = 0.21;
      filter.connect(droneGain); droneGain.connect(this.dryBus); droneGain.connect(this.reverb);
      [1.0, 1.005, 2.0].forEach((mul, i) => {
        const osc = ctx.createOscillator();
        osc.type = i === 2 ? 'triangle' : 'sawtooth';
        osc.frequency.value = this.profile.root * mul;
        osc.connect(filter); osc.start();
        this._droneOscs.push({ osc, mul });
      });
    }

    setWorldProfile(worldId) {
      const p = WORLD_PROFILES[worldId] || WORLD_PROFILES['event-horizon'];
      this.profile = p;
      if (this.ctx && this._droneOscs.length) {
        const now = this.ctx.currentTime;
        this._droneOscs.forEach((d) => {
          d.osc.frequency.setTargetAtTime(p.root * d.mul, now, 0.45);
        });
      }
    }

    setBulletTime(active) {
      if (!this.ctx || !this.masterFilter) return;
      const now = this.ctx.currentTime;
      this.masterFilter.frequency.setTargetAtTime(active ? 520 : 18000, now, 0.14);
    }

    playPortalWhoosh() {
      if (!this.isPlaying || !this.ctx) return;
      const ctx = this.ctx, now = ctx.currentTime;
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(620, now + 0.25);
      osc.frequency.exponentialRampToValueAtTime(95, now + 0.65);
      const env = ctx.createGain();
      env.gain.setValueAtTime(0.0001, now);
      env.gain.linearRampToValueAtTime(0.14, now + 0.15);
      env.gain.exponentialRampToValueAtTime(0.0001, now + 0.68);
      osc.connect(env); env.connect(this.reverb); env.connect(this.dryBus);
      osc.start(now); osc.stop(now + 0.72);
    }

    async toggleMicInput() {
      if (this.micActive) {
        if (this._micSource) this._micSource.disconnect();
        if (this._micStream) this._micStream.getTracks().forEach((t) => t.stop());
        this.micActive = false;
        return false;
      }
      if (!this._ensureContext() || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return false;
      try {
        this._micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        this._micSource = this.ctx.createMediaStreamSource(this._micStream);
        this._micSource.connect(this.analyser);
        this.micActive = true;
        return true;
      } catch (e) {
        return false;
      }
    }

    start() {
      if (!this._ensureContext()) return;
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      this.isPlaying = true;
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setTargetAtTime(this.volume, now, 0.25);
      if (this._timers.length === 0) {
        this._playPadChord();
        this._timers.push(setInterval(() => { if (this.isPlaying) this._playPadChord(); }, 6200));
        this._timers.push(setInterval(() => { if (this.isPlaying) this._playArpNote(); }, 340));
      }
    }

    stop() {
      this.isPlaying = false;
      if (this.ctx && this.masterGain) {
        const now = this.ctx.currentTime;
        this.masterGain.gain.cancelScheduledValues(now);
        this.masterGain.gain.setTargetAtTime(0.0001, now, 0.18);
      }
    }

    toggle() { if (this.isPlaying) this.stop(); else this.start(); return this.isPlaying; }

    _playPadChord() {
      if (!this.ctx) return;
      const ctx = this.ctx, now = ctx.currentTime, p = this.profile;
      const sc = p.scale;
      const base = p.root * 2.0 * sc[(this._chordIdx + this.mood) % 3];
      this._chordIdx = (this._chordIdx + 1) % 4;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(300, now);
      filter.frequency.exponentialRampToValueAtTime(p.cutoff, now + 2.6);
      filter.frequency.exponentialRampToValueAtTime(380, now + 6.2);

      const env = ctx.createGain();
      env.gain.setValueAtTime(0.0001, now);
      env.gain.linearRampToValueAtTime(0.10, now + 1.8);
      env.gain.exponentialRampToValueAtTime(0.0001, now + 6.4);
      filter.connect(env); env.connect(this.dryBus); env.connect(this.reverb);

      [1.0, sc[2], sc[3], sc[4]].forEach((ratio) => {
        [-4, 4].forEach((det) => {
          const osc = ctx.createOscillator();
          osc.type = p.wave; osc.frequency.value = base * ratio; osc.detune.value = det;
          osc.connect(filter); osc.start(now); osc.stop(now + 6.5);
        });
      });
    }

    _playArpNote() {
      if (!this.ctx || Math.random() < 0.22) return;
      const ctx = this.ctx, now = ctx.currentTime, p = this.profile;
      const sc = p.scale;
      const idx = (this._arpStep * 3 + Math.floor(Math.random() * 2)) % sc.length;
      this._arpStep++;
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = p.root * 4.0 * sc[idx];
      const env = ctx.createGain();
      env.gain.setValueAtTime(0.0001, now);
      env.gain.linearRampToValueAtTime(0.08, now + 0.02);
      env.gain.exponentialRampToValueAtTime(0.0001, now + 0.62);
      osc.connect(env); env.connect(this.dryBus); env.connect(this.reverb);
      osc.start(now); osc.stop(now + 0.66);
    }

    playUIChime(pitchMul = 1.0) {
      if (!this.isPlaying || !this.ctx) return;
      const ctx = this.ctx, now = ctx.currentTime;
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520 * pitchMul, now);
      osc.frequency.exponentialRampToValueAtTime(780 * pitchMul, now + 0.09);
      const env = ctx.createGain();
      env.gain.setValueAtTime(0.0001, now);
      env.gain.linearRampToValueAtTime(0.055, now + 0.01);
      env.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
      osc.connect(env); env.connect(this.dryBus);
      osc.start(now); osc.stop(now + 0.18);
    }

    triggerPad(index) {
      const pad = SYNTH_PADS[index % SYNTH_PADS.length];
      this.pulse = Math.min(1.8, this.pulse + (pad.type === 'sub' ? 1.25 : 0.75));
      if (!this._ensureContext()) return pad;
      if (!this.isPlaying) this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.02);
      const ctx = this.ctx, now = ctx.currentTime;
      const freqs = pad.type === 'chord' ? [pad.freq, pad.freq * 1.25, pad.freq * 1.5]
        : pad.type === 'sub' ? [pad.freq, pad.freq * 0.5] : [pad.freq, pad.freq * 2.0];
      freqs.forEach((f, i) => {
        const osc = ctx.createOscillator();
        osc.type = pad.type === 'sub' ? 'sine' : pad.type === 'chord' ? 'sawtooth' : 'triangle';
        osc.frequency.setValueAtTime(f, now);
        if (pad.type === 'sub') osc.frequency.exponentialRampToValueAtTime(f * 0.72, now + 0.65);
        const filt = ctx.createBiquadFilter();
        filt.type = 'lowpass';
        filt.frequency.setValueAtTime(pad.type === 'sub' ? 240 : 2800, now);
        filt.frequency.exponentialRampToValueAtTime(pad.type === 'sub' ? 75 : 420, now + 1.1);
        const env = ctx.createGain();
        env.gain.setValueAtTime(0.0001, now);
        env.gain.linearRampToValueAtTime(pad.type === 'sub' ? 0.38 : 0.14 / (i + 1), now + 0.015);
        env.gain.exponentialRampToValueAtTime(0.0001, now + (pad.type === 'sub' ? 0.95 : 1.4));
        osc.connect(filt); filt.connect(env); env.connect(this.dryBus); env.connect(this.reverb);
        osc.start(now); osc.stop(now + 1.5);
      });
      return pad;
    }

    update(dt, timeSec) {
      this.pulse = Math.max(0, this.pulse - dt * 2.2);
      if (this.analyser && (this.isPlaying || this.micActive)) {
        this.analyser.getByteFrequencyData(this.freqData);
      } else {
        for (let i = 0; i < 64; i++) {
          const f = i / 64;
          const wave = 0.5 + 0.5 * Math.sin(timeSec * (1.8 + f * 4.5) - f * 5.0);
          const beat = Math.pow(0.5 + 0.5 * Math.sin(timeSec * 2.6), 4.0) * (1.0 - f);
          const v = Math.min(1.0, (wave * 0.25 + beat * 0.42 + this.pulse * (1.0 - f * 0.6)) * 0.75);
          this.freqData[i] = Math.floor(v * 255);
        }
      }
      let bSum = 0, mSum = 0, tSum = 0;
      for (let i = 0; i < 64; i++) {
        const target = Math.min(1, this.freqData[i] / 255 + this.pulse * 0.25 * (1 - i / 64));
        this.smoothBands[i] = this.smoothBands[i] * 0.78 + target * 0.22;
        this.freqData[i] = Math.min(255, Math.floor(this.smoothBands[i] * 255));
        if (i < 10) bSum += this.smoothBands[i];
        else if (i < 34) mSum += this.smoothBands[i];
        else tSum += this.smoothBands[i];
      }
      this.bass = bSum / 10; this.mid = mSum / 24; this.treble = tSum / 30;
      this.energy = this.bass * 0.45 + this.mid * 0.35 + this.treble * 0.20;

      const gl = this.gl;
      gl.bindTexture(gl.TEXTURE_2D, this.fftTexture);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 64, 1, gl.RED, gl.UNSIGNED_BYTE, this.freqData);
      gl.bindTexture(gl.TEXTURE_2D, null);
    }
  }

  global.AetheriaAudio = { AudioEngine, SYNTH_PADS, WORLD_PROFILES };
})(typeof window !== 'undefined' ? window : globalThis);
