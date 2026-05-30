/* Web Audio synth — short ticks, error blips, chimes. */
const Audio = (() => {
  let ctx = null;
  let volume = 0.4;
  let enabled = true;
  let pack = 'mechanical'; // mechanical | soft | typewriter

  const ensure = () => {
    if (!ctx) {
      try { ctx = new (window.AudioContext || window.webkitAudioContext)(); }
      catch (e) { /* unavailable */ }
    }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  };

  const blip = (freq, dur = 0.06, type = 'square', gain = 0.5) => {
    if (!enabled) return;
    const c = ensure(); if (!c) return;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, c.currentTime);
    g.gain.setValueAtTime(gain * volume, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
    o.connect(g).connect(c.destination);
    o.start();
    o.stop(c.currentTime + dur);
  };

  const correct = () => {
    if (pack === 'typewriter') { blip(140, 0.04, 'sawtooth', 0.35); blip(900, 0.02, 'square', 0.18); }
    else if (pack === 'soft') { blip(420, 0.045, 'sine', 0.32); }
    else { blip(180, 0.035, 'square', 0.32); blip(720, 0.015, 'triangle', 0.12); }
  };
  const wrong = () => blip(90, 0.12, 'sawtooth', 0.28);
  const word  = () => { blip(660, 0.06, 'triangle', 0.22); setTimeout(() => blip(880, 0.06, 'triangle', 0.18), 35); };
  const complete = () => {
    [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => blip(f, 0.18, 'triangle', 0.3), i * 110));
  };
  const best = () => {
    [523, 784, 1047, 1319, 1568].forEach((f, i) => setTimeout(() => blip(f, 0.14, 'triangle', 0.32), i * 90));
  };

  return {
    correct, wrong, word, complete, best,
    setVolume: v => volume = v,
    setEnabled: v => enabled = v,
    setPack: p => pack = p,
    get enabled() { return enabled; },
  };
})();
window.Audio = Audio;
