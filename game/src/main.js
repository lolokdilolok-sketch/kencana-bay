// Boot and the one loop: input every frame, the world in fixed 1/60 s steps, the renderer
// paints what is there. Screens: title, play, paused, map, garage. The game moves between
// them, and the HUD and the camera follow the screen. ?shot=chase|foot|map|title (with
// &seed=N) stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.

import { CITY, GARAGE, KEYS, MISSIONS, PAINTS, PHYSICS, RACE, SAVE_KEY, VERSION_STAMP, WEAPONS, weaponUnlocked } from './config.js';
import { createRandom } from './random.js';
import { createRenderer } from './render.js';
import { createWorld } from './world.js';
import { buildGaruda, buildSimpleCar, createPlayerCar, createTraffic } from './vehicles.js';
import { buildWheelman, createPedestrians } from './pedestrians.js';
import { createPolice } from './police.js';
import { createMissions } from './missions.js';
import { createGarage } from './garage.js';
import { createRace } from './race.js';
import { createHud } from './hud.js';
import { createAudio } from './audio.js';
import { ACTION_ENTER, ACTION_GARAGE, ACTION_MAP, ACTION_PAUSE, ACTION_RADIO, createInput } from './input.js';
import { stageShot } from './shots.js';

const STEP = 1 / 60;
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 1;

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const rng = createRandom(seed);

const render = createRenderer(canvas);
const world = createWorld(render.scene, rng);
const traffic = createTraffic(render.scene, rng, 16);
const pedestrians = createPedestrians(render.scene, rng, 22);
const police = createPolice(render.scene, rng);
const missions = createMissions();
const garage = createGarage(render.scene, rng);
const race = createRace();
const audio = createAudio();
const input = createInput(canvas);

const playerCar = createPlayerCar(render.scene, 0xffb400);
const playerMesh = buildWheelman();
render.scene.add(playerMesh);

// --- saved / runtime state ---
const state = {
  screen: 'title',
  inCar: false,
  hp: 100,
  cash: 12480,
  wanted: 0,
  clockMinutes: 18 * 60 + 36,
  day: 1,
  rep: 1320,
  weapon: 0,
  ammo: WEAPONS.map((w) => w.ammo),
  crew: { agus: false, bambang: false, ratna: false },
  stats: { takedowns: 0, carsStolen: 0, stunts: 0, racesWon: 0, racesRun: 0 },
  speedKmh: 0,
  radioOn: true,
  raceBest: null,
  paint: 'gold',
  player: { x: -296, z: 272, heading: Math.PI / 2 },
  nearGarage: false,
  nearRace: false,
  cleanTimer: 0,
  stuntCooldown: 0,
  policeHp: new Map(),
};

function paintHex() {
  const p = PAINTS.find((x) => x.id === state.paint);
  return p ? p.hex : 0xffb400;
}

function paintName() {
  const p = PAINTS.find((x) => x.id === state.paint);
  return p ? p.name : 'Emas Kencana';
}

function saveGame() {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify({
      cash: state.cash, mission: missions.state().index, paint: state.paint,
      carHp: playerCar.car.hp, stats: state.stats, rep: state.rep, day: state.day,
      clockMinutes: state.clockMinutes, crew: state.crew, raceBest: state.raceBest,
      player: state.player, car: { x: playerCar.car.x, z: playerCar.car.z, heading: playerCar.car.heading },
    }));
  } catch {
    // Storage can be off: the save then lasts this visit only.
  }
}

function loadGame() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const s = JSON.parse(raw);
    state.cash = s.cash ?? state.cash;
    state.stats = s.stats ?? state.stats;
    state.rep = s.rep ?? state.rep;
    state.day = s.day ?? state.day;
    state.clockMinutes = s.clockMinutes ?? state.clockMinutes;
    state.crew = s.crew ?? state.crew;
    state.raceBest = s.raceBest ?? null;
    state.paint = s.paint ?? 'gold';
    if (s.mission !== undefined) missions.load(s.mission);
    if (s.raceBest) race.load(s.raceBest);
    if (s.player) state.player = s.player;
    if (s.car) playerCar.place(s.car.x, s.car.z, s.car.heading);
    if (typeof s.carHp === 'number') playerCar.car.hp = s.carHp;
    playerCar.repaint(paintHex());
    garage.setCar(paintHex());
    return true;
  } catch {
    return false;
  }
}

function announce(message) {
  status.textContent = message;
}

function say(speaker, text, seconds) {
  hud.showDialogue(speaker, text, seconds);
}

function addCash(amount, label) {
  state.cash += amount;
  audio.cash();
  hud.toast(`${label} +$${amount}`);
}

function raiseWanted(n) {
  state.wanted = Math.min(5, state.wanted + n);
  state.cleanTimer = 0;
}

// --- collisions: circle vs building AABBs ---
function collideCircle(x, z, radius, colliders) {
  let cx = x;
  let cz = z;
  for (const c of colliders) {
    const px = Math.max(c.x0, Math.min(cx, c.x1));
    const pz = Math.max(c.z0, Math.min(cz, c.z1));
    const dx = cx - px;
    const dz = cz - pz;
    const d2 = dx * dx + dz * dz;
    if (d2 < radius * radius) {
      const d = Math.sqrt(d2) || 0.001;
      cx = px + (dx / d) * radius;
      cz = pz + (dz / d) * radius;
    }
  }
  return { x: cx, z: cz };
}

function stepPlayer(dt) {
  const axis = input.axis();
  const p = state.player;
  const running = input.isDown('ShiftLeft') || input.isDown('ShiftRight');
  const speed = running ? PHYSICS.runSpeed : PHYSICS.walkSpeed;
  p.heading += axis.x * 2.6 * dt;
  const mx = Math.sin(p.heading) * axis.y * speed * dt;
  const mz = Math.cos(p.heading) * axis.y * speed * dt;
  const resolved = collideCircle(p.x + mx, p.z + mz, 1.1, world.colliders);
  p.x = Math.max(CITY.minX + 2, Math.min(CITY.maxX - 2, resolved.x));
  p.z = Math.max(CITY.minZ + 2, Math.min(CITY.maxZ - 2, resolved.z));
  playerMesh.position.set(p.x, 0, p.z);
  playerMesh.rotation.y = p.heading;
  state.speedKmh = Math.abs(axis.y) * speed * 3.6;
}

function nearestTrafficCar() {
  const p = state.player;
  let best = null;
  let bestDist = 5;
  for (const c of traffic.cars) {
    const d = Math.hypot(c.mesh.position.x - p.x, c.mesh.position.z - p.z);
    if (d < bestDist) {
      bestDist = d;
      best = c;
    }
  }
  return best;
}

function tryEnterCar() {
  const p = state.player;
  const car = playerCar.car;
  const distToGaruda = Math.hypot(car.x - p.x, car.z - p.z);
  if (distToGaruda < 5) {
    state.inCar = true;
    playerMesh.visible = false;
    hud.toast('GARUDA GT — drive!');
    return;
  }
  const victim = nearestTrafficCar();
  if (victim) {
    // Steal it: the traffic car becomes the driven car; its driver flees on foot.
    const idx = traffic.cars.indexOf(victim);
    if (idx >= 0) traffic.cars.splice(idx, 1);
    playerCar.swapMesh(victim.mesh);
    playerCar.place(victim.mesh.position.x, victim.mesh.position.z, victim.mesh.rotation.y);
    state.inCar = true;
    playerMesh.visible = false;
    state.stats.carsStolen += 1;
    raiseWanted(1);
    hud.toast('Car stolen! KPD is on you.');
  }
}

function tryExitCar() {
  const car = playerCar.car;
  state.inCar = false;
  state.player.x = car.x + Math.cos(car.heading) * 3;
  state.player.z = car.z - Math.sin(car.heading) * 3;
  state.player.heading = car.heading;
  playerMesh.visible = true;
  playerMesh.position.set(state.player.x, 0, state.player.z);
}

function tryShoot() {
  // Fists: a close-range swing, no ammo, no noise — the nearest police car in front
  // within arm's reach takes the hit.
  if (state.weapon < 0) {
    const p = state.inCar ? playerCar.car : state.player;
    const fx = Math.sin(p.heading);
    const fz = Math.cos(p.heading);
    for (const c of police.cars) {
      const dx = c.x - p.x;
      const dz = c.z - p.z;
      const dist = Math.hypot(dx, dz);
      if (dist > 5) continue;
      const dot = (dx * fx + dz * fz) / dist;
      if (dot < 0.5) continue;
      const hp = (state.policeHp.get(c) || 2) - 1;
      if (hp <= 0) {
        state.policeHp.delete(c);
        const idx = police.cars.indexOf(c);
        if (idx >= 0) police.cars.splice(idx, 1);
        render.scene.remove(c.mesh);
        state.stats.takedowns += 1;
        state.rep += 10;
        hud.toast('Takedown! +10 REP');
      } else {
        state.policeHp.set(c, hp);
      }
      break;
    }
    return;
  }
  if (state.ammo[state.weapon] <= 0) {
    hud.toast('Reload! Press R.');
    return;
  }
  state.ammo[state.weapon] -= 1;
  audio.gunshot();
  raiseWanted(1);
  // Hit the nearest police car in front, within range.
  const p = state.inCar ? playerCar.car : state.player;
  const fx = Math.sin(p.heading);
  const fz = Math.cos(p.heading);
  for (const c of police.cars) {
    const dx = c.x - p.x;
    const dz = c.z - p.z;
    const dist = Math.hypot(dx, dz);
    if (dist > 45) continue;
    const dot = (dx * fx + dz * fz) / dist;
    if (dot < 0.5) continue;
    const hp = (state.policeHp.get(c) || 2) - 1;
    if (hp <= 0) {
      state.policeHp.delete(c);
      const idx = police.cars.indexOf(c);
      if (idx >= 0) police.cars.splice(idx, 1);
      render.scene.remove(c.mesh);
      state.stats.takedowns += 1;
      state.rep += 10;
      hud.toast('Takedown! +10 REP');
    } else {
      state.policeHp.set(c, hp);
    }
    break;
  }
}

function hireCrew(id) {
  const crew = { agus: 'agus', bambang: 'bambang', ratna: 'ratna' }[id];
  const def = { agus: 200, bambang: 350, ratna: 300 }[id];
  const names = { agus: 'Agus Prasetyo', bambang: 'Bambang', ratna: 'Ratna' };
  const lines = {
    agus: 'I drive, you shoot. That is the deal.',
    bambang: 'Bring her in dirty, take her out gold.',
    ratna: 'I know a guy. I always know a guy.',
  };
  if (state.crew[crew]) {
    say(names[id], lines[id]);
    return;
  }
  if (state.cash < def) {
    hud.toast(`Need $${def} to hire ${names[id]}.`);
    return;
  }
  state.cash -= def;
  state.crew[crew] = true;
  say(names[id], lines[id]);
  hud.toast(`${names[id]} joined the crew.`);
}

// --- garage enter / exit ---
let garageReturn = null;
function enterGarage() {
  garageReturn = {
    x: state.player.x, z: state.player.z, heading: state.player.heading, inCar: state.inCar,
  };
  state.inCar = false;
  playerMesh.visible = true;
  const spawn = garage.interiorSpawn();
  state.player.x = spawn.x;
  state.player.z = spawn.z;
  state.player.heading = spawn.heading;
  playerMesh.position.set(spawn.x, 0, spawn.z);
  garage.state.inside = true;
  state.screen = 'garage';
  hud.showGarage(true);
  hud.setGarageInfo({ cash: state.cash, repairCost: garage.REPAIR_COST, carHp: Math.round(playerCar.car.hp), paintName: paintName() });
  say('Bambang', 'Welcome to my shop. Paint her, fix her — she leaves gold.');
}

function exitGarage() {
  garage.state.inside = false;
  state.screen = 'play';
  hud.showGarage(false);
  if (garageReturn) {
    state.player.x = garageReturn.x;
    state.player.z = garageReturn.z;
    state.player.heading = garageReturn.heading;
    state.inCar = garageReturn.inCar;
    playerMesh.visible = !garageReturn.inCar;
    playerMesh.position.set(state.player.x, 0, state.player.z);
    garageReturn = null;
  }
  saveGame();
}

// --- HUD state snapshot ---
function hudState() {
  const m = missions.state();
  const r = race.state();
  const p = state.inCar ? playerCar.car : state.player;
  return {
    mission: m,
    target: m.target,
    cash: state.cash,
    clockMinutes: state.clockMinutes,
    day: state.day,
    wanted: state.wanted,
    speedKmh: state.inCar ? Math.abs(playerCar.car.speed) * 3.6 : state.speedKmh,
    speedLabel: state.inCar ? 'GARUDA GT' : 'ON FOOT',
    inCar: state.inCar,
    hp: state.inCar ? playerCar.car.hp : state.hp,
    rep: state.rep,
    weapon: state.weapon,
    ammo: state.ammo,
    radioOn: state.radioOn,
    crew: state.crew,
    stats: state.stats,
    player: { x: p.x, z: p.z, heading: p.heading },
    police: police.cars.map((c) => ({ x: c.x, z: c.z })),
    race: r.active ? { active: true, elapsed: r.elapsed, gateIndex: r.gateIndex, total: r.total, nextGate: race.nextGate(), nextDist: r.nextDist } : { active: false },
    nearGarage: state.nearGarage,
    nearRace: state.nearRace,
  };
}

const hud = createHud({
  onStart() {
    audio.unlock();
    state.screen = 'play';
    hud.showTitle(false);
    const m = missions.state();
    if (m.mission) say(m.mission.contact, m.mission.line);
    announce('Playing. Follow the gold star.');
  },
  onSave() {
    saveGame();
    hud.toast('Game saved.');
  },
  onLoad() {
    if (loadGame()) hud.toast('Save loaded.');
    else hud.toast('No save yet.');
  },
  onEnd() {
    saveGame();
    state.screen = 'title';
    hud.showTitle(true);
  },
  onResume() {
    state.screen = 'play';
    hud.showPause(false);
  },
  onQuitToTitle() {
    saveGame();
    state.screen = 'title';
    hud.showPause(false);
    hud.showTitle(true);
  },
  onGarageExit() {
    exitGarage();
  },
  onRepair() {
    if (state.cash < garage.REPAIR_COST) {
      hud.toast(`Repair costs $${garage.REPAIR_COST}.`);
      return;
    }
    state.cash -= garage.REPAIR_COST;
    playerCar.car.hp = 100;
    hud.setGarageInfo({ cash: state.cash, repairCost: garage.REPAIR_COST, carHp: 100, paintName: paintName() });
    hud.toast('Garuda repaired — good as gold.');
    say('Bambang', 'She purrs again. Take care of her out there.');
  },
  onTalkBambang() {
    say('Bambang', 'The gold paint is my signature. The pink one wins races, they say.');
  },
  onRepaint(paintId) {
    state.paint = paintId;
    playerCar.repaint(paintHex());
    garage.setCar(paintHex());
    hud.setGarageInfo({ cash: state.cash, repairCost: garage.REPAIR_COST, carHp: Math.round(playerCar.car.hp), paintName: paintName() });
    hud.toast(`Repainted: ${paintName()}.`);
    saveGame();
  },
});

// Debug handle for playtests (and nothing else): lets an automated probe move the
// player and read state. It changes no gameplay.
window.__game = { state, playerCar, missions, race, garage, hud, render, world };

 // --- title staging: the beach postcard behind the title screen ---
/** Staging for the title screen: gold car + wheelman on the open sand south of the ferris
 * wheel, camera looking north at the wheel, the beach and the sea — the flag and the wheel
 * legs stay 50+ units away, out of the car's frame. The wheelman stands AT the driver's
 * door (the car's left side), a hand's breadth from it, facing the camera three-quarter —
 * like the poster shot, car and man big together in the lower foreground. */
function stageTitleBackdrop() {
  const car = playerCar.car;
  const h = Math.PI / 2 + 0.15;
  // Far south-west on the sand: the race flag at (-300, 300) falls out of frame, the
  // ferris wheel at (-318, 290) sits in frame left behind the car.
  playerCar.place(-322, 352, h);
  const fx = Math.sin(h);
  const fz = Math.cos(h);
  const lx = -Math.cos(h);
  const lz = Math.sin(h);
  const wx = -322 + lx * 2.1 - fx * 0.4;
  const wz = 352 + lz * 2.1 - fz * 0.4;
  playerMesh.position.set(wx, 0, wz);
  playerMesh.rotation.y = 0.8; // toward the title camera, three-quarter
  playerMesh.visible = true;
  state.inCar = false;
  state.player.x = wx;
  state.player.z = wz;
  state.player.heading = 0.8;
  return { car, wheelman: state.player };
}

let titleStaging = stageTitleBackdrop();

function resize() {
  render.resize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', resize);
resize();

let time = 0;
let autosaveTimer = 0;

function stepWorld(dt) {
  time += dt;
  state.clockMinutes += dt * 0.5;
  if (state.clockMinutes >= 24 * 60) {
    state.clockMinutes -= 24 * 60;
    state.day += 1;
  }
  world.update(dt);
  traffic.step(dt);
  pedestrians.step(dt, time);
  const p = state.inCar ? playerCar.car : state.player;
  police.step(dt, time, p, state.wanted);
  audio.update(dt, state.inCar ? Math.abs(playerCar.car.speed) / PHYSICS.carMaxSpeed : 0, state.wanted);

  // Wanted decays while the player stays clean.
  if (state.wanted > 0) {
    state.cleanTimer += dt;
    if (state.cleanTimer > 25) {
      state.wanted -= 1;
      state.cleanTimer = 0;
    }
  }

  // Mission progress.
  const m = missions.state();
  if (!m.done && m.target) {
    const result = missions.checkReached(p.x, p.z);
    if (result.completed) {
      addCash(result.payout, `Mission complete`);
      state.rep += 40;
      const next = missions.state();
      // Weapon unlocks: finishing mission 5 earns the Garuda rifle, mission 9 the Launcher.
      if (next.index === 4) hud.toast('Garuda rifle unlocked! Press 4.');
      if (next.index === 8) hud.toast('Launcher unlocked! Press 5.');
      if (result.finished) {
        say('Ratna', 'That is the whole story, kid. Kencana Bay is yours.');
        hud.toast('STORY COMPLETE!');
      } else if (next.mission) {
        say(next.mission.contact, next.mission.line);
      }
      saveGame();
    } else if (result.stage !== undefined) {
      hud.toast(`Balapan Senja — Stage ${result.stage + 1}/4`);
    }
  }

  // Race progress.
  if (race.state().active) {
    const r = race.update(dt, playerCar.car.x, playerCar.car.z);
    if (r && r.event === 'gate') {
      hud.toast(`Gate ${r.gateIndex + 1}/${r.total} — ${Math.round(r.elapsed)}s`);
    } else if (r && r.event === 'finish') {
      state.stats.racesRun += 1;
      if (r.won) state.stats.racesWon += 1;
      state.raceBest = r.best;
      addCash(r.payout, r.won ? 'Race won!' : 'Race finished');
      hud.toast(r.won ? `Race won in ${Math.round(r.elapsed)}s!` : `Finished in ${Math.round(r.elapsed)}s — under par next time.`);
      saveGame();
    }
  }
  // The active race gate's beam burns bright; all beams dim when no race runs.
  world.setActiveGate(race.state().active ? race.state().gateIndex : null);

  autosaveTimer += dt;
  if (autosaveTimer > 30) {
    autosaveTimer = 0;
    if (state.screen === 'play') saveGame();
  }
}

function stepPlay(dt) {
  const actions = input.takeActions();
  if (actions & ACTION_PAUSE) {
    state.screen = 'paused';
    hud.showPause(true);
    audio.setMuted(true);
    return;
  }
  if (actions & ACTION_MAP) {
    state.screen = 'map';
    hud.showMap(true);
    return;
  }
  if (actions & ACTION_RADIO) {
    state.radioOn = audio.toggleRadio();
    hud.toast(state.radioOn ? 'GAMELAN FM 101.1' : 'Radio off');
  }
  if (input.wasPressed(KEYS.shoot)) tryShoot();
  if (input.wasPressed(KEYS.reload)) {
    if (state.weapon >= 0) {
      state.ammo[state.weapon] = WEAPONS[state.weapon].ammo;
      hud.toast(`${WEAPONS[state.weapon].name} reloaded.`);
    }
  }
  // Weapon keys: 0 is the fist, 1-5 are the guns. Locked guns stay locked with a toast.
  if (input.wasPressed('Digit0')) state.weapon = -1;
  for (let i = 0; i < KEYS.weapons.length; i += 1) {
    if (input.wasPressed(KEYS.weapons[i])) {
      if (weaponUnlocked(i, missions.state().index)) state.weapon = i;
      else hud.toast(`${WEAPONS[i].name} — LOCKED. Finish mission ${i === 3 ? 5 : 9} first.`);
    }
  }
  if (input.wasPressed(KEYS.crewAgus)) hireCrew('agus');
  if (input.wasPressed(KEYS.crewBambang)) hireCrew('bambang');
  if (input.wasPressed(KEYS.crewRatna)) hireCrew('ratna');

  // Proximity flags for the HUD hints.
  state.nearGarage = !state.inCar && garage.nearDoor(state.player.x, state.player.z);
  state.nearRace = state.inCar && Math.hypot(playerCar.car.x - RACE.start.x, playerCar.car.z - RACE.start.z) < 14;

  if (actions & ACTION_GARAGE && state.nearGarage) {
    enterGarage();
    return;
  }
  if (actions & ACTION_ENTER) {
    if (state.inCar) {
      if (state.nearRace && !race.state().active) {
        const r = race.start();
        state.stats.racesRun += 0; // counted at the finish line
        hud.toast(`Race started! ${r.total} gates — beat ${RACE.parTime}s for $${RACE.winPayout}.`);
        say('Agus', 'Go! First gate is north on the beach road!');
      } else {
        tryExitCar();
      }
    } else {
      tryEnterCar();
    }
  }

  // Move the player or the car, then advance the world.
  if (state.inCar) {
    const result = playerCar.step(dt, input, world.colliders);
    state.speedKmh = Math.abs(playerCar.car.speed) * 3.6;
    if (result.drifting) {
      state.stuntCooldown -= dt;
      if (state.stuntCooldown <= 0) {
        state.stuntCooldown = 2;
        state.stats.stunts += 50;
        state.cash += 50;
        hud.toast('DRIFT +$50');
      }
    }
    if (playerCar.car.hp <= 0) {
      hud.toast('The Garuda is wrecked — Bambang can fix her at the garage.');
      playerCar.car.hp = 1;
      raiseWanted(1);
    }
  } else {
    stepPlayer(dt);
  }
  stepWorld(dt);
}

function stepGarage(dt) {
  const actions = input.takeActions();
  if (actions & ACTION_GARAGE) {
    const p = state.player;
    if (garage.nearExit(p.x, p.z)) exitGarage();
    return;
  }
  // Walk inside the room, clamped to its walls.
  const axis = input.axis();
  const p = state.player;
  p.heading += axis.x * 2.6 * dt;
  const mx = Math.sin(p.heading) * axis.y * PHYSICS.walkSpeed * dt;
  const mz = Math.cos(p.heading) * axis.y * PHYSICS.walkSpeed * dt;
  const room = garage.room;
  p.x = Math.max(room.x - 11, Math.min(room.x + 11, p.x + mx));
  p.z = Math.max(room.z - 7, Math.min(room.z + 7, p.z + mz));
  playerMesh.position.set(p.x, 0, p.z);
  playerMesh.rotation.y = p.heading;
  world.update(dt);
}

function stepMap() {
  const actions = input.takeActions();
  if (actions & ACTION_MAP || actions & ACTION_PAUSE) {
    state.screen = 'play';
    hud.showMap(false);
  }
}

function stepPaused() {
  const actions = input.takeActions();
  if (actions & ACTION_PAUSE) {
    state.screen = 'play';
    hud.showPause(false);
    audio.setMuted(false);
  }
}

function draw() {
  if (state.screen === 'garage') {
    render.garageCamera(garage.room, 1 / 60, false);
  } else if (state.inCar) {
    render.chaseCamera(playerCar.car, 1 / 60, false);
  } else if (state.screen === 'title') {
    render.titleCamera(playerCar.car, state.player, 1 / 60, false);
  } else {
    render.footCamera(state.player, 1 / 60, false);
  }
  render.render();
}

function runShot(name) {
  const scene = stageShot(name, {
    render, world, traffic, pedestrians, police, missions, garage, race,
    playerCar, playerMesh, state, hud, audio, input,
    stageTitleBackdrop, stepWorld, stepPlayer, hudState,
  });
  // Snap the camera once so the first painted frame already frames the shot.
  const snap = scene.cameraMode === 'chase'
    ? () => render.chaseCamera(playerCar.car, 1 / 60, true)
    : scene.cameraMode === 'garage'
      ? () => render.garageCamera(garage.room, 1 / 60, true)
      : scene.cameraMode === 'title'
        ? () => render.titleCamera(playerCar.car, state.player, 1 / 60, true)
        : () => render.footCamera(state.player, 1 / 60, true);
  snap();
  let painted = 0;
  function paint() {
    draw();
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
  return scene;
}

function runGame() {
  let accumulator = 0;
  let last = performance.now();
  hud.showTitle(true);
  announce('Kencana Bay. Press Enter or click MULAI to start.');

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    while (accumulator >= STEP) {
      accumulator -= STEP;
      if (state.screen === 'title') {
        world.update(STEP);
        traffic.step(STEP);
        pedestrians.step(STEP, time);
        time += STEP;
      } else if (state.screen === 'play') {
        stepPlay(STEP);
      } else if (state.screen === 'garage') {
        stepGarage(STEP);
      } else if (state.screen === 'map') {
        stepMap();
      } else if (state.screen === 'paused') {
        stepPaused();
      }
    }
    hud.update(hudState(), 1 / 60);
    draw();
  }
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
