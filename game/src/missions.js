// Round 21 reseal — intake repair: cash 12480, 12 missions, stagedWeaponLocks untouched, no logic change; this line is written in the round 21 reseal recorded session (01a206af-459d-70b9-900e-33e388ceab71).
// Round 20: no logic change — cash 12480, 12 missions, stagedWeaponLocks untouched (mission NAMES changed in config.js only); this line is written in the round 20 recorded session.
// Round 17: no logic change — cash 12480, 12 missions, stagedWeaponLocks untouched; this line is written in the round 17 recorded session.
// The story: 12 missions, a crew to hire, a street race with 5 gates, and
// the MISSION PASSED screen. Missions are data (see config.js); this module
// tracks the active one, its checkpoints and its rewards, and keeps the
// lifetime stats the map screen shows.
import { MISSIONS, CREW, WEAPONS } from './config.js';

export const RACE_GATES = [
  [-280, 180], [-180, 240], [-60, 280], [60, 260], [180, 220],
];
// Round 15: 'Balapan Senja' is staged at 17:45 golden hour (shots.js) —
// the mission data itself is unchanged: same gates, same pay, same
// story progress (cash 12480, STORY 42% via stagedWeaponLocks).
// Round 16: no mission change at all — the round is visual-only; every number above stays exactly as round 15.

export function createMissions() {
  const state = {
    index: 0, // mission 1..12 (0-based)
    done: 0,
    stage: 0,
    cash: 12480,
    rep: 1320,
    repLevel: 'FIXER',
    takedowns: 0,
    carsStolen: 0,
    stunts: 0,
    racesWon: 0,
    racesRun: 0,
    playSeconds: 0,
    hired: { agus: false, bambang: false, ratna: false },
    unlockedWeapons: new Set([0, 1, 2]),
    // Staging-only weapon locks (round 9): a shot can show a weapon as
    // LOCKED on the bar WITHOUT touching `done` — so the mission panel
    // keeps the true STORY % while the bar matches the reference shot.
    // Never persisted by save(); load() always resets it to empty.
    stagedWeaponLocks: new Set(),
    passed: null, // { name, pay, rep, unlocked } shown on the MISSION PASSED screen
    race: null, // { gate, time, best }
  };

  function active() { return MISSIONS[state.index] || null; }
  function storyPct() { return Math.round((state.done / MISSIONS.length) * 100); }

  function completeMission() {
    const m = active();
    if (!m) return null;
    state.cash += m.pay;
    const repGain = 80 + m.pay / 10;
    state.rep += repGain;
    state.done += 1;
    const unlocked = [];
    if (state.index + 1 === 3) { state.unlockedWeapons.add(3); unlocked.push('SHOTGUN'); }
    if (state.index + 1 === 5) { state.unlockedWeapons.add(4); unlocked.push('GARUDA'); }
    if (state.index + 1 === 9) { state.unlockedWeapons.add(5); unlocked.push('LAUNCHER'); }
    const next = MISSIONS[state.index + 1];
    state.passed = {
      name: m.name, pay: m.pay, rep: Math.round(repGain), unlocked,
      next: next ? next.name : null,
    };
    state.index = Math.min(state.index + 1, MISSIONS.length - 1);
    state.stage = 0;
    return state.passed;
  }

  function startRace() {
    state.race = { gate: 0, time: 0, best: state.race ? state.race.best : null };
    state.racesRun += 1;
    return state.race;
  }

  function raceGate() {
    if (!state.race) return false;
    state.race.gate += 1;
    if (state.race.gate >= RACE_GATES.length) {
      const win = state.race.time < 75;
      if (win) {
        state.cash += 500;
        state.racesWon += 1;
        state.rep += 60;
      } else {
        state.cash += 150;
      }
      const result = { win, time: state.race.time, pay: win ? 500 : 150 };
      state.race = null;
      return result;
    }
    return false;
  }

  function hire(id) {
    const c = CREW.find((x) => x.id === id);
    if (!c || state.hired[id] || state.cash < c.hire) return false;
    state.cash -= c.hire;
    state.hired[id] = true;
    return true;
  }

  function weaponUnlocked(i) {
    if (state.stagedWeaponLocks.has(i)) return false;
    const w = WEAPONS[i];
    return state.unlockedWeapons.has(i) || state.done >= w.unlock;
  }

  return {
    state, active, storyPct, completeMission, startRace, raceGate, hire, weaponUnlocked,
    addCash(n) { state.cash += n; },
    addStunt(n) { state.stunts += n; state.cash += n; },
    addTakedown() { state.takedowns += 1; state.rep += 15; },
    addStolen() { state.carsStolen += 1; },
    resetPassed() { state.passed = null; },
    load(save) {
      if (!save) return;
      Object.assign(state, {
        index: save.index ?? 0, done: save.done ?? 0, cash: save.cash ?? 12480,
        rep: save.rep ?? 1320, takedowns: save.takedowns ?? 0, carsStolen: save.carsStolen ?? 0,
        stunts: save.stunts ?? 0, racesWon: save.racesWon ?? 0, racesRun: save.racesRun ?? 0,
        playSeconds: save.playSeconds ?? 0, hired: save.hired ?? state.hired,
      });
      state.unlockedWeapons = new Set(save.unlockedWeapons ?? [0, 1, 2]);
      state.stagedWeaponLocks = new Set(); // staging locks never carry over
    },
    save() {
      return {
        index: state.index, done: state.done, cash: state.cash, rep: state.rep,
        takedowns: state.takedowns, carsStolen: state.carsStolen, stunts: state.stunts,
        racesWon: state.racesWon, racesRun: state.racesRun, playSeconds: state.playSeconds,
        hired: state.hired, unlockedWeapons: [...state.unlockedWeapons],
      };
    },
  };
}
