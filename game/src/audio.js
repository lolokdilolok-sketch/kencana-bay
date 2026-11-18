// Sound, all synthesized with WebAudio — no audio files, no network. Gamelan FM is a
// pentatonic pluck pattern (slendro-ish), the engine is a sawtooth whose pitch follows speed,
// the siren is a two-tone wail, gunshots are filtered noise bursts. Everything runs through
// one master gain so T (radio) and P (pause) can hush it at once. The AudioContext is created
// lazily on the first user gesture, since browsers block sound before one.

const GAMELAN_SCALE = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25];
const GAMELAN_PATTERN = [0, 2, 4, 7, 4, 2, 5, 3, 0, 4, 5, 7, 5, 2, 1, 0];

export function createAudio() {
  let ctx = null;
  let master = null;
  let radioGain = null;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let radioOn = true;
  let nextNote = 0;
  let nextNoteTime = 0;
  let step = 0;

  function ensure() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return true;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
      radioGain = ctx.createGain();
      radioGain.gain.value = 0.5;
      radioGain.connect(master);
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 60;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0.0;
      engineOsc.connect(engineGain);
      engineGain.connect(master);
      engineOsc.start();
      sirenOsc = ctx.createOscillator();
      sirenOsc.type = 'triangle';
      sirenOsc.frequency.value = 700;
      sirenGain = ctx.createGain();
      sirenGain.gain.value = 0.0;
      sirenOsc.connect(sirenGain);
      sirenGain.connect(master);
      sirenOsc.start();
      nextNoteTime = ctx.currentTime + 0.1;
      return true;
    } catch {
      return false;
    }
  }

  function pluck(freq, when, volume) {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, when);
    gain.gain.exponentialRampToValueAtTime(0.001, when + 0.9);
    osc.connect(gain);
    gain.connect(radioGain);
    osc.start(when);
    osc.stop(when + 1.0);
    // A metallic overtone an octave and a fifth up, quieter, makes it read as a bonang.
    const overtone = ctx.createOscillator();
    overtone.type = 'sine';
    overtone.frequency.value = freq * 3;
    const ogain = ctx.createGain();
    ogain.gain.setValueAtTime(volume * 0.25, when);
    ogain.gain.exponentialRampToValueAtTime(0.001, when + 0.4);
    overtone.connect(ogain);
    ogain.connect(radioGain);
    overtone.start(when);
    overtone.stop(when + 0.5);
  }

  /** Call every frame: schedules the next radio notes and follows speed/wanted. */
  function update(dt, speed01, wanted) {
    if (!ctx || !radioOn) return;
    const now = ctx.currentTime;
    while (nextNoteTime < now + 0.25) {
      const degree = GAMELAN_PATTERN[step % GAMELAN_PATTERN.length];
      pluck(GAMELAN_SCALE[degree], nextNoteTime, 0.16);
      if (step % 4 === 0) pluck(GAMELAN_SCALE[degree] / 2, nextNoteTime, 0.12);
      step += 1;
      nextNoteTime += 0.42;
    }
    if (engineOsc) engineOsc.frequency.value = 55 + speed01 * 160;
    if (sirenOsc && wanted >= 1) {
      const t = now % 1.2;
      sirenOsc.frequency.value = t < 0.6 ? 700 : 950;
      sirenGain.gain.value = 0.05;
    } else if (sirenGain) {
      sirenGain.gain.value = 0.0;
    }
    if (engineGain) engineGain.gain.value = 0.02 + speed01 * 0.05;
  }

  function blip(freq, dur, volume) {
    if (!ensure()) return;
    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = freq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start();
    osc.stop(ctx.currentTime + dur + 0.05);
  }

  function gunshot() {
    if (!ensure()) return;
    const len = Math.floor(ctx.sampleRate * 0.12);
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1800;
    const gain = ctx.createGain();
    gain.gain.value = 0.35;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start();
  }

  function cash() {
    blip(1320, 0.09, 0.12);
    setTimeout(() => blip(1760, 0.12, 0.12), 90);
  }

  return {
    unlock() { ensure(); },
    update,
    toggleRadio() {
      radioOn = !radioOn;
      if (radioGain) radioGain.gain.value = radioOn ? 0.5 : 0.0;
      return radioOn;
    },
    radioOn() { return radioOn; },
    gunshot,
    cash,
    blip,
    setMuted(muted) {
      if (master) master.gain.value = muted ? 0.0 : 0.5;
    },
  };
}
