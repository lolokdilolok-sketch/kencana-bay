// Kencana Bay — boot, the fixed-step loop, screens, save/load, shooting,
// crew hiring, and the staged scenes behind ?shot= for screenshots.
import { GAME, MISSIONS, SPEAKERS, TUNING, WEAPONS, districtAt } from './config.js';
import { makeRng } from './random.js';
import { createInput, PRESS_ENTER, PRESS_MAP, PRESS_PAUSE, PRESS_RELOAD, PRESS_RADIO } from './input.js';
import { buildWorld } from './world.js';
import { createCar, makeSeatedDriver, makeWheelman, stepCar } from './vehicles.js';
import { createPedestrians, createTraffic, stepPedestrians, stepTraffic } from './pedestrians.js';
import { addHeat, createPolice, setWanted, stepPolice } from './police.js';
import { createMissions, currentMission, currentPoint, damageEnemies, startMission, stepMissions } from './missions.js';
import { createHud } from './hud.js';
import { createRadio } from './audio.js';
import { createScene } from './render.js';
import { THREE } from './three-shim.js';
import { stageShot } from './shots.js';

const STEP = 1 / 60;
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : GAME.seed;

const hud = createHud();
const radio = createRadio();
const view = createScene();
const scene = view.scene;
const world = buildWorld(seed);
scene.add(world.group);
const rng = makeRng(seed + 5);

const player = {
  x: -240, z: 276.5, heading: 0, hp: 100, inCar: false, car: null,
  cash: 12480, rep: 1320, takedowns: 14, stolen: 6, stunts: 2150,
  day: 1, clock: 18.6, weapon: 0, crew: [], driftPaid: false,
};
const ammo = WEAPONS.map((w) => w.ammo);
let lastShotAt = 0;
let screen = 'title';
let mapOpen = false;
let paused = false;
let elapsed = 0;
let autosaveTimer = 0;

// The hero car: parked on the beach road for the title, stealable in play.
// It stands on the open road at x = -240, clear of every building box,
// facing east-north-east (heading 1.9): from the title camera in the
// south-east that shows its front three-quarter and its sunlit flank,
// and it points the way to the first mission's safehouse. The spawn sits
// beside the ferris wheel, so the beach, the wheel and the sea are the
// first things a new player sees.
const heroCar = createCar('garuda', -240, 280, 1.9);
heroCar.group.add(makeSeatedDriver());
scene.add(heroCar.group);
const heroDriver = heroCar.group.children[heroCar.group.children.length - 1];
heroDriver.position.set(0, 0.55, -0.9);
heroDriver.visible = false;

const wheelman = makeWheelman();
wheelman.position.set(-236, 0, 276);
wheelman.rotation.y = 0.8;
scene.add(wheelman);

const traffic = createTraffic(seed);
for (const car of traffic) scene.add(car.group);
const peds = createPedestrians(seed, THREE);
for (const ped of peds) scene.add(ped.group);
const police = createPolice(THREE);
scene.add(police.heli.group);
const missions = createMissions(scene);

function saveGame() {
  try {
    window.localStorage.setItem(GAME.saveKey, JSON.stringify({
      cash: player.cash, rep: player.rep, mission: missions.index,
      takedowns: player.takedowns, stolen: player.stolen, stunts: player.stunts,
      day: player.day, clock: player.clock, crew: player.crew,
    }));
  } catch { /* storage can be off */ }
}

function loadGame() {
  try {
    const raw = window.localStorage.getItem(GAME.saveKey);
    if (!raw) return false;
    const data = JSON.parse(raw);
    player.cash = data.cash ?? player.cash;
    player.rep = data.rep ?? player.rep;
    player.takedowns = data.takedowns ?? player.takedowns;
    player.stolen = data.stolen ?? player.stolen;
    player.stunts = data.stunts ?? player.stunts;
    player.day = data.day ?? 1;
    player.clock = data.clock ?? 18.6;
    player.crew = data.crew ?? [];
    startMission(missions, Math.min(data.mission ?? 0, MISSIONS.length - 1), police);
    return true;
  } catch {
    return false;
  }
}

function clockText() {
  const h = Math.floor(player.clock);
  const m = Math.floor((player.clock - h) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function hireCrew(id) {
  const member = player.crew.includes(id);
  if (member) return;
  const def = { agus: 200, bambang: 350, ratna: 300 }[id];
  if (player.cash < def) {
    hud.say(SPEAKERS.RATNA, 'Not enough cash, kid. Come back when the wallet is heavier.');
    return;
  }
  player.cash -= def;
  player.crew.push(id);
  const names = { agus: 'Agus', bambang: 'Bambang', ratna: 'Ratna' };
  hud.say(SPEAKERS.AGUS, `${names[id]} is in. The crew is stronger now.`);
  saveGame();
}

function enterCar(car) {
  player.inCar = true;
  player.car = car;
  player.x = car.x;
  player.z = car.z;
  player.heading = car.heading;
  wheelman.visible = false;
  if (car.kind === 'garuda' && !car.stolen) {
    car.stolen = true;
    player.stolen += 1;
    addHeat(police, 1);
    hud.say(SPEAKERS.AGUS, 'The Garuda GT is ours. Drive like you stole it — because you did.');
  }
  if (car.kind === 'garuda') {
    heroDriver.visible = true;
  }
}

function exitCar() {
  if (!player.car) return;
  player.inCar = false;
  const car = player.car;
  player.car = null;
  player.x = car.x + Math.sin(car.heading + Math.PI / 2) * 3;
  player.z = car.z + Math.cos(car.heading + Math.PI / 2) * 3;
  wheelman.visible = true;
  wheelman.position.set(player.x, 0, player.z);
  wheelman.rotation.y = player.heading;
  if (car.kind === 'garuda') heroDriver.visible = false;
}

function nearestStealable() {
  const cars = [heroCar, ...traffic];
  let best = null;
  let bestDist = 5;
  for (const car of cars) {
    const d = Math.hypot(car.x - player.x, car.z - player.z);
    if (d < bestDist) {
      best = car;
      bestDist = d;
    }
  }
  return best;
}

function shoot(now) {
  const w = WEAPONS[player.weapon];
  if (ammo[player.weapon] <= 0) return;
  if (now - lastShotAt < w.rate) return;
  lastShotAt = now;
  ammo[player.weapon] -= 1;
  addHeat(police, 0.08);
  const origin = { x: player.x, z: player.z };
  const kills = damageEnemies(missions, origin, w.range, w.damage);
  if (kills > 0) {
    player.takedowns += kills;
    player.cash += kills * 50;
    hud.say(SPEAKERS.WANTO, 'Shots fired in my city. The KPD will remember this.');
  }
  // A police car ahead of the player takes damage too.
  for (const unit of police.units) {
    const d = Math.hypot(unit.car.x - player.x, unit.car.z - player.z);
    if (d < w.range) {
      unit.car.hp -= w.damage;
      if (unit.car.hp <= 0) {
        unit.car.hp = 100;
        unit.car.x = player.x + 120;
        unit.car.z = player.z + 120;
        player.takedowns += 1;
      }
    }
  }
}

function updatePlayer(input, dt) {
  if (player.inCar && player.car) {
    stepCar(player.car, input, dt, world.colliders);
    player.x = player.car.x;
    player.z = player.car.z;
    player.heading = player.car.heading;
    if (player.car.drift > 1.5 && !player.driftPaid) {
      player.driftPaid = true;
      player.cash += TUNING.driftBonus;
      player.stunts += TUNING.driftBonus;
      hud.say(SPEAKERS.AGUS, `Clean drift! +$${TUNING.driftBonus} stunt cash.`);
    }
    if (player.car.drift === 0) player.driftPaid = false;
    if (player.crew.includes('bambang')) {
      player.car.hp = Math.min(100, player.car.hp + 2 * dt);
    }
  } else {
    let mx = 0;
    let mz = 0;
    if (input.forward()) mz += 1;
    if (input.back()) mz -= 1;
    if (input.left()) mx -= 1;
    if (input.right()) mx += 1;
    if (mx !== 0 || mz !== 0) {
      const len = Math.hypot(mx, mz);
      const targetHeading = Math.atan2(mx / len, mz / len);
      let diff = targetHeading - player.heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      player.heading += Math.max(-6 * dt, Math.min(6 * dt, diff));
      player.x += Math.sin(player.heading) * TUNING.walkSpeed * dt;
      player.z += Math.cos(player.heading) * TUNING.walkSpeed * dt;
      player.x = Math.max(-350, Math.min(350, player.x));
      player.z = Math.max(-350, Math.min(350, player.z));
      wheelman.position.set(player.x, 0, player.z);
      wheelman.rotation.y = player.heading;
      wheelman.position.y = Math.abs(Math.sin(elapsed * 8)) * 0.06;
    }
  }
  player.speed = player.inCar && player.car ? Math.abs(player.car.speed) : 0;
}

function updateHud() {
  const m = currentMission(missions);
  const p = currentPoint(missions);
  const dist = p ? Math.hypot(player.x - p.x, player.z - p.z) : 0;
  hud.setMission(m, missions.point, dist);
  hud.setCrew(player.crew, player.cash);
  const units = police.units.map((u) => ({ dist: Math.hypot(u.car.x - player.x, u.car.z - player.z) }));
  hud.setKpd(units, police.wanted >= 3, police.wanted, player.cash, clockText(), player.day, 'GAMELAN FM 101.1 — Bonang Malam');
  const d = districtAt(player.x, player.z);
  hud.setVitals(player.hp, player.rep, d.name, d.landmark);
  hud.setWeapons(player.weapon);
  hud.setSpeed((player.speed || 0) * 3.6, player.inCar && player.car ? (player.car.kind === 'garuda' ? 'GARUDA GT' : player.car.kind.toUpperCase()) : 'ON FOOT');
  hud.drawMinimap(player, p, police.units);
  hud.tickDialogue(STEP);
  if (mapOpen) {
    hud.drawMap(player, p, missions, {
      rep: player.rep, cash: player.cash, time: clockText(), day: player.day,
      wanted: police.wanted, takedowns: player.takedowns, stolen: player.stolen, stunts: player.stunts,
    });
  }
}

function step(dt, input, now) {
  elapsed += dt;
  player.clock += dt / 90;
  if (player.clock >= 24) {
    player.clock -= 24;
    player.day += 1;
  }
  const presses = input.takePresses();
  if (presses.pressed & PRESS_MAP) {
    mapOpen = !mapOpen;
    hud.showMap(mapOpen);
  }
  if (presses.pressed & PRESS_PAUSE) {
    paused = !paused;
  }
  if (presses.pressed & PRESS_RADIO) radio.toggle();
  if (presses.pressed & PRESS_RELOAD) {
    ammo[player.weapon] = WEAPONS[player.weapon].maxAmmo;
  }
  if (presses.pressed & PRESS_ENTER) {
    if (player.inCar) exitCar();
    else {
      const car = nearestStealable();
      if (car) enterCar(car);
    }
  }
  const wk = input.weaponKey();
  if (wk >= 0) player.weapon = wk;
  if (input.shootHeld()) shoot(now);

  updatePlayer(input, dt);
  stepTraffic(traffic, dt);
  stepPedestrians(peds, dt, elapsed);
  stepPolice(police, player, dt, scene, elapsed);
  const event = stepMissions(missions, player, police, dt);
  if (event) {
    if (event.type === 'paid' || event.type === 'allDone') {
      let payout = event.payout;
      if (player.crew.includes('ratna')) payout = Math.round(payout * 1.1);
      player.cash += payout;
      player.rep += 120;
      hud.say(SPEAKERS.RATNA, `${event.mission.name} done. +$${payout}. The crew is talking about you.`);
      saveGame();
    } else if (event.type === 'point') {
      hud.say(SPEAKERS.AGUS, 'Checkpoint! Next one — keep it smooth.');
    }
  }
  if (player.hp <= 0) {
    player.hp = 100;
    player.x = -240;
    player.z = 276.5;
    player.heading = 0;
    if (player.inCar) {
      player.car = null;
      player.inCar = false;
      wheelman.visible = true;
    }
    wheelman.position.set(player.x, 0, player.z);
    setWanted(police, 0, scene);
    hud.say(SPEAKERS.BAMBANG, 'You got flattened. The crew dragged you back to the beach.');
  }
  autosaveTimer += dt;
  if (autosaveTimer > 20) {
    autosaveTimer = 0;
    saveGame();
  }
  updateHud();
}

function bindTitleButtons() {
  document.getElementById('btn-start').addEventListener('click', () => {
    hud.showTitle(false);
    screen = 'play';
    radio.start();
    startMission(missions, 0, police);
    hud.say(SPEAKERS.RATNA, 'Welcome back to Teluk Kencana. The safehouse is waiting — drive.');
  });
  document.getElementById('btn-save').addEventListener('click', () => {
    saveGame();
    hud.say(SPEAKERS.BAMBANG, 'Progress saved. The garage keeps your keys safe.');
  });
  document.getElementById('btn-load').addEventListener('click', () => {
    if (loadGame()) {
      hud.showTitle(false);
      screen = 'play';
      radio.start();
      hud.say(SPEAKERS.RATNA, 'Loaded. Back to work.');
    } else {
      hud.say(SPEAKERS.RATNA, 'No save found yet. Start a new story.');
    }
  });
  document.getElementById('btn-end').addEventListener('click', () => {
    saveGame();
    hud.showTitle(true);
    screen = 'title';
    radio.stop();
  });
  // Crew hire keys are handled in the loop; the panel is a read-out.
  window.addEventListener('keydown', (event) => {
    if (screen !== 'play') return;
    if (event.code === 'KeyZ') hireCrew('agus');
    else if (event.code === 'KeyX') hireCrew('bambang');
    else if (event.code === 'KeyC') hireCrew('ratna');
  });
}

function runGame() {
  const input = createInput();
  bindTitleButtons();
  hud.setVersionStamp(`KENCANA BAY · ${GAME.version}`);
  hud.showTitle(true);
  hud.setMission(MISSIONS[0], 0, 180);
  hud.setCrew([], player.cash);
  hud.setKpd([], false, 0, player.cash, clockText(), player.day, 'GAMELAN FM 101.1 — Bonang Malam');
  hud.setVitals(100, player.rep, 'Pantai Kidul', 'Ferris Wheel');
  hud.setWeapons(0);
  hud.setSpeed(0, 'ON FOOT');
  startMission(missions, 0, police);
  let last = performance.now();
  let accumulator = 0;

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    if (screen === 'title') {
      view.titleCamera(heroCar.x, heroCar.z, heroCar.heading, STEP, elapsed);
      stepTraffic(traffic, STEP);
      stepPedestrians(peds, STEP, elapsed);
      elapsed += STEP;
      world.wheelSpinner.rotation.z += STEP * 0.4;
      view.render();
      return;
    }
    if (!paused && !mapOpen) {
      while (accumulator >= STEP) {
        step(STEP, input, now);
        accumulator -= STEP;
      }
    } else {
      // The world is frozen while the map or pause is up, but the map
      // and pause keys themselves must still be read here: step() does
      // not run in this branch, so a press read only inside step()
      // could never close the map again.
      accumulator = 0;
      const presses = input.takePresses();
      if (presses.pressed & PRESS_MAP) {
        mapOpen = !mapOpen;
        hud.showMap(mapOpen);
      }
      if (presses.pressed & PRESS_PAUSE) {
        paused = !paused;
      }
    }
    if (mapOpen) {
      view.render();
      return;
    }
    view.chaseCamera(player, STEP);
    view.render();
  }
  requestAnimationFrame(frame);
}

function setMapOpen(open) {
  mapOpen = open;
  hud.showMap(open);
}

if (shotName) {
  stageShot(shotName, {
    view, hud, radio, scene, world, traffic, peds, police, missions,
    player, heroCar, wheelman, heroDriver, startMission, step, updateHud,
    enterCar, setWanted, saveGame, setMapOpen,
  });
} else {
  runGame();
}
