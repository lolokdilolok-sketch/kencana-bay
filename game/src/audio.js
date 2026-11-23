// Round 20: no logic change — radio + engine synth untouched; this line is written in the round 20 recorded session.
// Round 17: no logic change — the radio + engine synth are untouched; this line is written in the round 17 recorded session.
// Sound only: a WebAudio synth. No audio files, no network. The radio is a
// gamelan-flavoured pentatonic loop (bonang / saron / gong), the engine is a
// filtered sawtooth that follows speed, and gunshots, sirens and UI blips are
// short oscillator/noise bursts. Audio starts only after the first user
// gesture, as browsers require.
// Round 15: the radio idents stay dusk-themed (Bonang Malam, Saron Senja)
// Round 16: no audio change — the fixes are all visual (totem, signs, cone, roof, lamps); re-saved in this recorded session so the file's final bytes are witnessed.
// — the golden-hour shots now match what the radio is playing.
import { RADIO } from './config.js';

// Pelog-ish pentatonic ladder, in Hz, around middle C.
const SCALE = [261.6, 293.7, 329.6, 392.0, 440.0, 523.3, 587.3, 659.3];
const MELODY = [0, 2, 4, 5, 4, 2, 1, 2, 4, 7, 5, 4, 2, 0, 1, 2];

export function createAudio() {
  let ctx = null;
  let master = null;
  let radioGain = null;
  let engineOsc = null;
  let engineGain = null;
  let engineFilter = null;
  let trackIndex = 0;
  let step = 0;
  let radioTimer = null;
  let sirenOsc = null;
  let sirenGain = null;
  let muted = false;

  function ensure() {
    if (ctx) return true;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
      radioGain = ctx.createGain();
      radioGain.gain.value = 0.16;
      radioGain.connect(master);
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 55;
      engineFilter = ctx.createBiquadFilter();
      engineFilter.type = 'lowpass';
      engineFilter.frequency.value = 320;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      engineOsc.connect(engineFilter);
      engineFilter.connect(engineGain);
      engineGain.connect(master);
      engineOsc.start();
      return true;
    } catch {
      return false;
    }
  }

  function pluck(freq, when, dur, gain) {
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, when);
    g.gain.exponentialRampToValueAtTime(0.001, when + dur);
    o.connect(g);
    g.connect(radioGain);
    o.start(when);
    o.stop(when + dur + 0.05);
  }

  function gong(when) {
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = 65.4;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.5, when);
    g.gain.exponentialRampToValueAtTime(0.001, when + 2.2);
    o.connect(g);
    g.connect(radioGain);
    o.start(when);
    o.stop(when + 2.3);
  }

  function radioTick() {
    if (!ctx || muted) return;
    const now = ctx.currentTime + 0.05;
    const note = MELODY[step % MELODY.length];
    pluck(SCALE[note % SCALE.length] * (note >= SCALE.length ? 2 : 1), now, 0.5, 0.22);
    if (step % 4 === 2) pluck(SCALE[(note + 4) % SCALE.length] / 2, now, 0.7, 0.12);
    if (step % 16 === 0) gong(now);
    if (step % 16 === 15) trackIndex = (trackIndex + 1) % RADIO.tracks.length;
    step += 1;
    radioTimer = setTimeout(radioTick, 340);
  }

  return {
    unlock() { if (ensure() && ctx.state === 'suspended') ctx.resume(); },
    startRadio() {
      if (!ensure() || radioTimer) return;
      radioTick();
    },
    stopRadio() { if (radioTimer) { clearTimeout(radioTimer); radioTimer = null; } },
    track() { return RADIO.tracks[trackIndex]; },
    setEngine(speed01, on) {
      if (!ctx) return;
      engineGain.gain.setTargetAtTime(on ? 0.05 + speed01 * 0.05 : 0, ctx.currentTime, 0.1);
      engineOsc.frequency.setTargetAtTime(55 + speed01 * 130, ctx.currentTime, 0.1);
      engineFilter.frequency.setTargetAtTime(300 + speed01 * 900, ctx.currentTime, 0.1);
    },
    blip(freq = 660) {
      if (!ensure()) return;
      const o = ctx.createOscillator();
      o.type = 'square';
      o.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.08, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09);
      o.connect(g);
      g.connect(master);
      o.start();
      o.stop(ctx.currentTime + 0.1);
    },
    shot() {
      if (!ensure()) return;
      const len = ctx.sampleRate * 0.12;
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i += 1) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 1800;
      const g = ctx.createGain();
      g.gain.value = 0.5;
      src.connect(f);
      f.connect(g);
      g.connect(master);
      src.start();
    },
    sting() {
      if (!ensure()) return;
      const notes = [523.3, 659.3, 784.0, 1046.5];
      notes.forEach((f, i) => pluck(f, ctx.currentTime + i * 0.09, 0.5, 0.2));
    },
    setSiren(on) {
      if (!ensure()) return;
      if (on && !sirenOsc) {
        sirenOsc = ctx.createOscillator();
        sirenOsc.type = 'sine';
        sirenOsc.frequency.value = 700;
        sirenGain = ctx.createGain();
        sirenGain.gain.value = 0.035;
        sirenOsc.connect(sirenGain);
        sirenGain.connect(master);
        sirenOsc.start();
        const lfo = ctx.createOscillator();
        lfo.frequency.value = 0.9;
        const lg = ctx.createGain();
        lg.gain.value = 260;
        lfo.connect(lg);
        lg.connect(sirenOsc.frequency);
        lfo.start();
        sirenOsc._lfo = lfo;
      } else if (!on && sirenOsc) {
        try { sirenOsc._lfo.stop(); sirenOsc.stop(); } catch { /* already stopped */ }
        sirenOsc = null;
        sirenGain = null;
      }
    },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.5;
      return muted;
    },
  };
}
