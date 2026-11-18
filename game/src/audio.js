// Sound, all synthesized with WebAudio — no audio files, no network.
// Gamelan FM 101.1: a slow pentatonic pluck loop. One job: make noise.
export function createAudio() {
  let ctx = null;
  let radioOn = true;
  let engineOsc = null;
  const scale = [0, 2, 4, 7, 9]; // pelog-ish pentatonic
  let noteT = 0;
  function ensure() {
    if (!ctx) {
      try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { ctx = null; }
    }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function pluck(freq, when, dur = 0.5, vol = 0.12) {
    if (!ctx) return;
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = 'sine'; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, when);
    g.gain.exponentialRampToValueAtTime(0.001, when + dur);
    o.connect(g).connect(ctx.destination);
    o.start(when); o.stop(when + dur);
  }
  return {
    unlock() { ensure(); },
    get radioOn() { return radioOn; },
    toggleRadio() { radioOn = !radioOn; return radioOn; },
    step(dt, speed) {
      if (!ensure() || !radioOn) return;
      noteT -= dt;
      if (noteT <= 0) {
        noteT = 0.42;
        const base = 220;
        const n = scale[Math.floor(Math.random() * scale.length)];
        const oct = Math.random() < 0.25 ? 2 : 1;
        pluck(base * Math.pow(2, n / 12) * oct, ctx.currentTime);
        if (Math.random() < 0.3) pluck(base / 2, ctx.currentTime + 0.1, 0.7, 0.07);
      }
      if (engineOsc && speed !== undefined) engineOsc.frequency.value = 50 + speed * 2;
    },
    engine(on) {
      if (!ensure()) return;
      if (on && !engineOsc) {
        engineOsc = ctx.createOscillator(); const g = ctx.createGain();
        engineOsc.type = 'sawtooth'; engineOsc.frequency.value = 60;
        g.gain.value = 0.03; engineOsc.connect(g).connect(ctx.destination); engineOsc.start();
      } else if (!on && engineOsc) { try { engineOsc.stop(); } catch {} engineOsc = null; }
    },
    shoot() {
      if (!ensure()) return;
      const b = ctx.createBuffer(1, ctx.sampleRate * 0.12, ctx.sampleRate);
      const d = b.getChannelData(0);
      for (let i = 0; i < d.length; i += 1) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
      const s = ctx.createBufferSource(); s.buffer = b;
      const g = ctx.createGain(); g.gain.value = 0.25;
      s.connect(g).connect(ctx.destination); s.start();
    },
    cash() { if (ensure()) { pluck(660, ctx.currentTime, 0.2, 0.15); pluck(880, ctx.currentTime + 0.09, 0.3, 0.15); } },
  };
}
