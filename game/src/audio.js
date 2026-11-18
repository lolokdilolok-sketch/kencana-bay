// Gamelan FM 101.1: a small synthesised loop — bright bell tones on a
// pentatonic row over a low gong. WebAudio only; nothing is downloaded.
const SCALE = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];
const MELODY = [0, 2, 4, 3, 2, 1, 0, 2, 4, 5, 4, 2, 1, 0, 3, 2];
const BEAT = 0.42;

export function createRadio() {
  let ctx = null;
  let master = null;
  let playing = false;
  let step = 0;
  let nextTime = 0;
  let timer = null;

  function tone(freq, when, dur, gainValue, type) {
    const osc = ctx.createOscillator();
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, when);
    gain.gain.linearRampToValueAtTime(gainValue, when + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(when);
    osc.stop(when + dur + 0.05);
  }

  function schedule() {
    if (!playing) return;
    while (nextTime < ctx.currentTime + 0.6) {
      const idx = MELODY[step % MELODY.length];
      const freq = SCALE[idx];
      tone(freq, nextTime, 1.6, 0.16, 'sine');
      tone(freq * 2, nextTime, 0.5, 0.05, 'triangle');
      if (step % 8 === 0) tone(130.81, nextTime, 2.4, 0.2, 'sine');
      if (step % 4 === 2) tone(SCALE[(idx + 2) % SCALE.length] / 2, nextTime, 1.0, 0.07, 'sine');
      step += 1;
      nextTime += BEAT;
    }
    timer = setTimeout(schedule, 120);
  }

  return {
    start() {
      if (playing) return;
      try {
        if (!ctx) {
          ctx = new (window.AudioContext || window.webkitAudioContext)();
          master = ctx.createGain();
          master.gain.value = 0.5;
          master.connect(ctx.destination);
        }
        if (ctx.state === 'suspended') void ctx.resume();
        playing = true;
        nextTime = ctx.currentTime + 0.1;
        schedule();
      } catch {
        playing = false;
      }
    },
    stop() {
      playing = false;
      if (timer) clearTimeout(timer);
    },
    toggle() {
      if (playing) this.stop();
      else this.start();
    },
    get playing() { return playing; },
  };
}
