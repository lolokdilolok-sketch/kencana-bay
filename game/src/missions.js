// The story: 12 missions in order, each with a checkpoint star in the world, a briefing,
// a contact who talks, and a payout. Reaching the checkpoint completes the mission, pays
// the cash, and opens the next one. Mission 6 (Balapan Senja) is a 4-stage race through
// the city instead of a single stop. Nothing here draws; the HUD reads this state.

import { MISSIONS } from './config.js';

export function createMissions() {
  let index = 0;
  let stage = 0;
  let done = false;
  let current = MISSIONS[0];

  // Mission 6's four race stages, in order.
  const RACE_STAGES = [
    { x: -300, z: 60 },
    { x: -60, z: -60 },
    { x: 180, z: -180 },
    { x: 300, z: 120 },
  ];

  function target() {
    if (done) return null;
    if (current.name === 'Balapan Senja') return RACE_STAGES[Math.min(stage, RACE_STAGES.length - 1)];
    return current.target;
  }

  function objectiveText() {
    if (done) return 'Story complete — Kencana Bay is yours.';
    if (current.name === 'Balapan Senja') return `Balapan Senja — Stage ${stage + 1}/4`;
    return `${current.name} — ${current.brief}`;
  }

  /** Call when the player is close to the current target. Returns the payout or 0. */
  function checkReached(x, z) {
    if (done) return { payout: 0, completed: false, finished: false };
    const t = target();
    const dist = Math.hypot(x - t.x, z - t.z);
    if (dist > 14) return { payout: 0, completed: false, finished: false };
    if (current.name === 'Balapan Senja') {
      stage += 1;
      if (stage < RACE_STAGES.length) return { payout: 0, completed: false, finished: false, stage };
    }
    const payout = current.payout;
    index += 1;
    stage = 0;
    if (index >= MISSIONS.length) {
      done = true;
      current = null;
      return { payout, completed: true, finished: true };
    }
    current = MISSIONS[index];
    return { payout, completed: true, finished: false };
  }

  function state() {
    return {
      index, stage, done,
      mission: current ? { name: current.name, payout: current.payout, brief: current.brief, contact: current.contact, line: current.line } : null,
      target: target(),
      objective: objectiveText(),
    };
  }

  function load(saved) {
    if (typeof saved === 'number' && saved >= 0 && saved < MISSIONS.length) {
      index = saved;
      stage = 0;
      done = false;
      current = MISSIONS[index];
    }
  }

  return { state, checkReached, load, count: MISSIONS.length };
}
