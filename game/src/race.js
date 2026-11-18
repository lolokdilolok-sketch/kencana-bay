// Street races: the side activity. A checkered flag at Pantai Kidul starts a 5-gate
// checkpoint race across the city against the clock. Win under the par time and take
// $500; finish slower and take $150. Races are repeatable, count in the stats, and the
// HUD shows the timer and the next gate while one runs. This is a real playable system,
// not a menu label: the gates are in the world and the car has to drive through them.

import { RACE } from './config.js';

export function createRace() {
  let active = false;
  let gateIndex = 0;
  let elapsed = 0;
  let best = null;
  let nextDist = null; // metres to the next gate, for the HUD — null when no race runs.

  function start() {
    active = true;
    gateIndex = 0;
    elapsed = 0;
    return { gate: RACE.gates[0], total: RACE.gates.length };
  }

  function nextGate() {
    return active ? RACE.gates[gateIndex] : null;
  }

  /** Advance the timer; call when the player is near the current gate. Returns a result or null. */
  function update(dt, x, z) {
    if (!active) return null;
    elapsed += dt;
    const gate = RACE.gates[gateIndex];
    const dist = Math.hypot(x - gate.x, z - gate.z);
    nextDist = dist;
    if (dist > 16) return null;
    gateIndex += 1;
    if (gateIndex < RACE.gates.length) {
      return { event: 'gate', gate: RACE.gates[gateIndex], gateIndex, total: RACE.gates.length, elapsed };
    }
    const won = elapsed <= RACE.parTime;
    const payout = won ? RACE.winPayout : RACE.losePayout;
    if (best === null || elapsed < best) best = elapsed;
    active = false;
    return { event: 'finish', won, payout, elapsed, best };
  }

  function state() {
    return { active, gateIndex, elapsed, best, total: RACE.gates.length, parTime: RACE.parTime, nextDist };
  }

  function load(savedBest) {
    if (typeof savedBest === 'number' && savedBest > 0) best = savedBest;
  }

  return { start, nextGate, update, state, load };
}
