// Web Audio synth engine. Three sound packs. No audio files.

import type { SoundPack } from './types';

type AC = AudioContext & { state: AudioContextState };

let ctx: AC | null = null;
let volume = 0.4;
let enabled = true;
let pack: SoundPack = 'mechanical';

function ensure(): AC | null {
  if (!ctx) {
    try {
      // @ts-ignore — webkit prefix
      const Ctor = window.AudioContext || window.webkitAudioContext;
      ctx = new Ctor() as AC;
    } catch { /* unsupported */ }
  }
  if (ctx && ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function blip(freq: number, dur = 0.06, type: OscillatorType = 'square', gain = 0.5): void {
  if (!enabled) return;
  const c = ensure();
  if (!c) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, c.currentTime);
  g.gain.setValueAtTime(gain * volume, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
  o.connect(g).connect(c.destination);
  o.start();
  o.stop(c.currentTime + dur);
}

export const SynthAudio = {
  correct(): void {
    if (pack === 'typewriter') {
      blip(140, 0.04, 'sawtooth', 0.35);
      blip(900, 0.02, 'square', 0.18);
    } else if (pack === 'soft') {
      blip(420, 0.045, 'sine', 0.32);
    } else {
      blip(180, 0.035, 'square', 0.32);
      blip(720, 0.015, 'triangle', 0.12);
    }
  },
  wrong(): void { blip(90, 0.12, 'sawtooth', 0.28); },
  word(): void {
    blip(660, 0.06, 'triangle', 0.22);
    setTimeout(() => blip(880, 0.06, 'triangle', 0.18), 35);
  },
  complete(): void {
    [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => blip(f, 0.18, 'triangle', 0.3), i * 110));
  },
  best(): void {
    [523, 784, 1047, 1319, 1568].forEach((f, i) => setTimeout(() => blip(f, 0.14, 'triangle', 0.32), i * 90));
  },
  setVolume(v: number): void { volume = v; },
  setEnabled(v: boolean): void { enabled = v; },
  setPack(p: SoundPack): void { pack = p; },
};
