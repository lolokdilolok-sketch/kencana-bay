// Boot and the one loop: input every frame, the world advances in fixed
// 1/60 s steps, the renderer paints. Screens: title, play, map, garage,
// mission-passed, paused. ?shot=chase|combat|garage|map (with &seed=N)
// stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { STEP, SAVE_KEY, PLAYER, WEAPONS, PAINTS, MISSIONS, CREW, RADIO } from './config.js';
import { createRandom } from './random.js';
import { createWorld } from './world.js';
import { buildSportsCar, buildStreetCar } from './vehicles.js';
import { buildMinifig, CHARACTERS } from './pedestrians.js';
import { createPolice } from './police.js';
import { createMissions, RACE_GATES } from './missions.js';
import { createGarage, GARAGE_POS } from './garage.js';
import { createRender } from './render.js';
import { createHud } from './hud.js';
import { createAudio } from './audio.js';
import { createInput, ACTION_CONFIRM, ACTION_PAUSE, ACTION_ENTER, ACTION_SHOOT, ACTION_RELOAD, ACTION_MAP, ACTION_GARAGE, ACTION_RADIO } from './input.js';
import { stageShot } from './shots.js';
import { THREE } from './three-shim.js';

const MAX_FRAME = 0.25;
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 1;
const rand = createRandom(seed);

const canvas = document.getElementById('game');
const statusEl = document.getElementById('status');

const world = createWorld(seed);
const render = createRender(canvas, world.group);
const hud = createHud(world);
const audio = createAudio();
const missions = createMissions();
const garage = createGarage(render.scene);
const police = createPolice(world, render.scene, rand);

// --- Player, hero car, parked cars.
const playerFig = buildMinifig(CHARACTERS.wheelman, 1);
render.scene.add(playerFig.group);

const heroCar = buildSportsCar(PAINTS[0].color, { driver: true });
render.scene.add(heroCar);
const parkedCars = [];
const parkedDefs = [
  { x: 60, z: -180, color: '#d21f2b', kind: 'sports' },
  { x: -180, z: 60, color: '#2b6fd0', kind: 'sedan' },
  { x: 180, z: -60, color: '#e8a33d', kind: 'taxi' },
  { x: -60, z: -240, color: '#8a8f96', kind: 'sedan' },
  { x: 240, z: 60, color: '#3d8a4b', kind: 'van' },
];
for (const d of parkedDefs) {
  const mesh = d.kind === 'sports' ? buildSportsCar(d.color, { driver: false, length: 5.2, width: 2.2 }) : buildStreetCar(d.kind, d.color);
  mesh.position.set(d.x, 0, d.z);
  mesh.rotation.y = rand.range(0, Math.PI * 2);
  render.scene.add(mesh);
  parkedCars.push({ mesh, color: d.color, kind: d.kind, x: d.x, z: d.z, heading: mesh.rotation.y });
}

// --- Traffic and pedestrians.
const traffic = [];
const trafficColors = ['#8a8f96', '#c94b4b', '#2b6fd0', '#e8a33d', '#3d8a4b', '#d0d0d0', '#7a5a8a'];
for (let i = 0; i < 14; i += 1) {
  const p = world.randomRoadPoint();
  const horizontal = Math.abs(p.z - Math.round(p.z / 120) * 120) < 1 || rand.chance(0.5);
  const mesh = buildStreetCar(rand.pick(['sedan', 'sedan', 'taxi', 'van', 'truck', 'motorcycle']), rand.pick(trafficColors));
  mesh.position.set(p.x, 0, p.z);
  const heading = horizontal ? (rand.chance(0.5) ? Math.PI / 2 : -Math.PI / 2) : (rand.chance(0.5) ? 0 : Math.PI);
  mesh.rotation.y = heading;
  render.scene.add(mesh);
  traffic.push({ mesh, heading, speed: rand.range(9, 15), horizontal });
}
const peds = [];
const pedDefs = [CHARACTERS.ped, CHARACTERS.agus, CHARACTERS.ratna, CHARACTERS.enemy];
for (let i = 0; i < 22; i += 1) {
  const def = i < 18 ? CHARACTERS.ped : pedDefs[i % pedDefs.length];
  const fig = buildMinifig(def, 1);
  const p = world.randomRoadPoint();
  const x = p.x + rand.range(-9, 9);
  const z = p.z + rand.range(-9, 9);
  fig.group.position.set(x, 0, z);
  render.scene.add(fig.group);
  peds.push({ fig, x, z, heading: rand.range(0, Math.PI * 2), speed: rand.range(1.2, 2.4), panic: 0 });
}
// Enemies for shootouts (spawned by missions).
const enemies = [];
function spawnEnemies(cx, cz, n) {
  for (let i = 0; i < n; i += 1) {
    const fig = buildMinifig(CHARACTERS.enemy, 1);
    const x = cx + rand.range(-12, 12);
    const z = cz + rand.range(-12, 12);
    fig.group.position.set(x, 0, z);
    render.scene.add(fig.group);
    enemies.push({ fig, x, z, hp: 100, heading: rand.range(0, Math.PI * 2), shootT: rand.range(1, 2) });
  }
}

// --- Game state.
const state = {
  screen: 'title',
  player: { x: -280, z: 210, heading: Math.PI / 2, speed: 0, hp: 100, walkPhase: 0 },
  inCar: false,
  car: { mesh: heroCar, heading: Math.PI / 2, speed: 0, hp: 100, paint: 0 },
  weapon: 1,
  ammo: WEAPONS.map((w) => w.ammo),
  reserve: WEAPONS.map((w) => w.max),
  track: RADIO.tracks[0],
  clock: 18 * 60 + 36,
  day: 1,
  night: false,
  mapOpen: false,
  race: null,
  raceGateMeshes: [],
  objective: null,
  drift: 0,
  nearMissCd: 0,
  elapsed: 0,
  saveTimer: 0,
  paused: false,
  titleT: 0,
  damageSprites: [],
  muzzleT: 0,
};

function saveGame() {
  try {
    const s = {
      ...missions.save(),
      paint: state.car.paint,
      player: { x: state.player.x, z: state.player.z },
      tune: garage.state.tune,
      armour: garage.state.armour,
      day: state.day,
      clock: state.clock,
    };
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(s));
  } catch { /* storage off */ }
}
function loadSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function announce(msg) { if (statusEl) statusEl.textContent = msg; }

// The paint index of a car mesh, by exact colour match (0 = gold when the
// colour is not one of the five garage paints, e.g. a stolen taxi).
function paintIndexFor(mesh) {
  const mat = mesh && mesh.userData ? mesh.userData.bodyMat : null;
  if (!mat) return 0;
  const hex = `#${mat.color.getHexString()}`;
  const idx = PAINTS.findIndex((p) => p.color.toLowerCase() === hex.toLowerCase());
  return idx >= 0 ? idx : 0;
}

// --- Floating damage numbers (sprites that rise and fade).
function damageNumber(x, y, z, text, color) {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 64;
  const g = c.getContext('2d');
  g.font = 'bold 40px system-ui, sans-serif';
  g.textAlign = 'center';
  g.fillStyle = color;
  g.strokeStyle = '#1c1c1c';
  g.lineWidth = 6;
  g.strokeText(text, 64, 44);
  g.fillText(text, 64, 44);
  const tex = new THREE.CanvasTexture(c);
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
  spr.scale.set(4, 2, 1);
  spr.position.set(x, y, z);
  render.scene.add(spr);
  state.damageSprites.push({ spr, t: 0 });
}

// --- Muzzle flash: a bright sprite at the gun, gone in 60 ms.
let muzzle = null;
function showMuzzle(x, y, z) {
  if (!muzzle) {
    const c = document.createElement('canvas');
    c.width = 64;
    c.height = 64;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(32, 32, 2, 32, 32, 30);
    grad.addColorStop(0, 'rgba(255,240,160,1)');
    grad.addColorStop(0.5, 'rgba(255,140,40,0.8)');
    grad.addColorStop(1, 'rgba(255,80,0,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    const tex = new THREE.CanvasTexture(c);
    muzzle = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
    muzzle.scale.set(2.4, 2.4, 1);
    render.scene.add(muzzle);
  }
  muzzle.position.set(x, y, z);
  muzzle.visible = true;
  state.muzzleT = 0.06;
}

// --- Objective + mission flow.
function refreshObjective() {
  const m = missions.active();
  if (!m) { state.objective = null; return; }
  if (m.type === 'race') state.objective = { x: RACE_GATES[0][0], z: RACE_GATES[0][1] };
  else state.objective = { x: m.target[0], z: m.target[1] };
  if (m.type === 'shootout' && enemies.length === 0) spawnEnemies(m.target[0], m.target[1], 3);
}

function arriveAtObjective() {
  const m = missions.active();
  if (!m || !state.objective) return;
  const d = Math.hypot(state.objective.x - state.player.x, state.objective.z - state.player.z);
  if (d > 9) return;
  if (m.type === 'goto' || m.type === 'escape' && police.wanted === 0) {
    finishMission();
  } else if (m.type === 'steal') {
    finishMission();
  } else if (m.type === 'race') {
    startRace();
  }
}

function finishMission() {
  const passed = missions.completeMission();
  if (!passed) return;
  audio.sting();
  hud.showPassed(passed);
  state.screen = 'passed';
  state.passedT = 0;
  saveGame();
  refreshObjective();
  police.setWanted(Math.max(0, police.wanted - 1), state.player);
}

function startRace() {
  if (state.race) return;
  state.race = missions.startRace();
  state.raceGate = 0;
  state.raceTime = 0;
  hud.toast('BALAPAN DIMULAI', 'Lewati 5 checkpoint secepat mungkin — $500 kalau menang');
  // Gate banners: tall orange arches with beams.
  for (const [gx, gz] of RACE_GATES) {
    const g = new THREE.Group();
    for (const sx of [-4, 4]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.5, 7, 0.5), new THREE.MeshStandardMaterial({ color: '#ff8a3d', emissive: 0x662200, emissiveIntensity: 0.7 }));
      post.position.set(sx, 3.5, 0);
      g.add(post);
    }
    const beam = new THREE.Mesh(
      new THREE.BoxGeometry(8.5, 1.2, 0.4),
      new THREE.MeshStandardMaterial({ color: '#ffd94d', emissive: 0xaa8800, emissiveIntensity: 0.9 }),
    );
    beam.position.y = 7;
    g.add(beam);
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(3, 1.6), new THREE.MeshStandardMaterial({ color: '#ff2e63', emissive: 0x881133, emissiveIntensity: 0.8, side: THREE.DoubleSide }));
    flag.position.set(0, 5.4, 0);
    g.add(flag);
    g.position.set(gx, 0, gz);
    render.scene.add(g);
    state.raceGateMeshes.push(g);
  }
  state.objective = { x: RACE_GATES[0][0], z: RACE_GATES[0][1] };
}

function raceStep(dt) {
  if (!state.race) return;
  state.raceTime += dt;
  state.race.time = state.raceTime; // the win condition (< 75 s) reads this
  const gate = RACE_GATES[state.raceGate];
  if (!gate) return;
  const d = Math.hypot(gate[0] - state.player.x, gate[1] - state.player.z);
  if (d < 11) {
    const res = missions.raceGate();
    state.raceGate += 1;
    if (res && typeof res === 'object') {
      hud.toast(res.win ? 'BALAPAN MENANG!' : 'BALAPAN SELESAI', `+$${res.pay} · ${Math.round(res.time)} detik`);
      for (const g of state.raceGateMeshes) render.scene.remove(g);
      state.raceGateMeshes = [];
      state.race = null;
      state.raceGate = 0;
      refreshObjective();
    } else {
      const next = RACE_GATES[state.raceGate];
      if (next) {
        state.objective = { x: next[0], z: next[1] };
        hud.toast(`GATE ${state.raceGate}/${RACE_GATES.length}`, 'Checkpoint berikutnya');
      }
    }
  }
}

// --- Driving / walking.
function collide(x, z, r) {
  if (Math.abs(x) > 328 || Math.abs(z) > 328) return true;
  return world.inCollider(x, z, r);
}

function stepPlayer(dt, axis) {
  const p = state.player;
  if (state.inCar) {
    const car = state.car;
    const tune = garage.state.tune;
    const maxSpeed = PLAYER.carMax + tune * 4;
    if (axis.throttle > 0) car.speed += PLAYER.carAccel * dt * (car.speed < 0 ? 2.2 : 1);
    else if (axis.throttle < 0) car.speed -= PLAYER.carBrake * dt * 0.6;
    else car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 14 * dt);
    if (axis.brake) car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 34 * dt);
    car.speed = Math.max(-12, Math.min(maxSpeed, car.speed));
    const turn = axis.steer * PLAYER.carTurn * dt * Math.min(1, Math.abs(car.speed) / 10 + 0.25) * Math.sign(car.speed || 1);
    car.heading += turn;
    const nx = p.x + Math.sin(car.heading) * car.speed * dt;
    const nz = p.z + Math.cos(car.heading) * car.speed * dt;
    if (!collide(nx, nz, 2.2)) {
      // Drift: hard steering at speed.
      const lateral = Math.abs(axis.steer) * Math.abs(car.speed);
      if (lateral > 26 && Math.abs(car.speed) > 18) {
        state.drift += dt;
        if (state.drift > 0.9) {
          state.drift = 0;
          missions.addStunt(150);
          hud.toast('DRIFT x3 +$150', 'Gaya juga kamu');
          audio.blip(880);
        }
      } else state.drift = 0;
      p.x = nx;
      p.z = nz;
    } else {
      car.speed *= 0.4;
      // Armour plating shrugs off bumps; without it, a crash costs 1% condition.
      const dmg = garage.state.armour > 0 ? 0 : 1;
      state.car.hp = Math.max(0, state.car.hp - dmg);
    }
    p.heading = car.heading;
    p.speed = car.speed;
    car.mesh.position.set(p.x, 0, p.z);
    car.mesh.rotation.y = car.heading;
    // Near miss with traffic.
    state.nearMissCd -= dt;
    for (const t of traffic) {
      const d = Math.hypot(t.mesh.position.x - p.x, t.mesh.position.z - p.z);
      if (d < 3.4 && Math.abs(car.speed) > 24 && state.nearMissCd <= 0) {
        state.nearMissCd = 2;
        missions.addStunt(250);
        hud.toast('NEAR MISS +$250', 'Hampir saja!');
        audio.blip(990);
        break;
      }
    }
  } else {
    const sp = PLAYER.walkSpeed;
    const mx = Math.sin(p.heading) * axis.throttle + Math.cos(p.heading) * axis.steer;
    const mz = Math.cos(p.heading) * axis.throttle - Math.sin(p.heading) * axis.steer;
    const len = Math.hypot(mx, mz);
    if (len > 0.01) {
      const nx = p.x + (mx / len) * sp * dt;
      const nz = p.z + (mz / len) * sp * dt;
      if (!collide(nx, nz, 1)) { p.x = nx; p.z = nz; }
      p.heading = Math.atan2(mx, mz);
      p.walkPhase += dt * 9;
      p.speed = sp;
    } else p.speed = 0;
    playerFig.group.position.set(p.x, 0, p.z);
    playerFig.group.rotation.y = p.heading;
    const swing = Math.sin(p.walkPhase) * (p.speed > 0 ? 0.5 : 0);
    playerFig.legL.rotation.x = swing;
    playerFig.legR.rotation.x = -swing;
    playerFig.armL.rotation.x = -swing * 0.7;
    playerFig.armR.rotation.x = swing * 0.7;
  }
}

function stepTraffic(dt) {
  for (const t of traffic) {
    const sp = t.speed * dt;
    let nx = t.mesh.position.x + Math.sin(t.heading) * sp;
    let nz = t.mesh.position.z + Math.cos(t.heading) * sp;
    if (nx > 326 || nx < -326 || nz > 326 || nz < -326) {
      const p = world.randomRoadPoint();
      t.mesh.position.set(p.x, 0, p.z);
      t.heading = rand.range(0, Math.PI * 2);
      t.mesh.rotation.y = t.heading;
      continue;
    }
    if (world.inCollider(nx, nz, 2)) {
      // Turn at the next intersection instead of driving through a building.
      t.heading += Math.PI / 2;
      t.mesh.rotation.y = t.heading;
      continue;
    }
    t.mesh.position.x = nx;
    t.mesh.position.z = nz;
  }
}

function stepPeds(dt) {
  for (const p of peds) {
    if (p.panic > 0) {
      p.panic -= dt;
      p.speed = 5;
    } else p.speed = 1.6;
    const nx = p.x + Math.sin(p.heading) * p.speed * dt;
    const nz = p.z + Math.cos(p.heading) * p.speed * dt;
    if (!world.inCollider(nx, nz, 1) && Math.abs(nx) < 326 && Math.abs(nz) < 326) {
      p.x = nx;
      p.z = nz;
    } else {
      p.heading += Math.PI / 2 + rand.range(-0.5, 0.5);
    }
    if (rand.chance(dt * 0.05)) p.heading += rand.range(-1, 1);
    p.fig.group.position.set(p.x, 0, p.z);
    p.fig.group.rotation.y = p.heading;
    const swing = Math.sin(state.elapsed * 8 + p.x) * 0.4;
    p.fig.legL.rotation.x = swing;
    p.fig.legR.rotation.x = -swing;
  }
}

function stepEnemies(dt) {
  for (let i = enemies.length - 1; i >= 0; i -= 1) {
    const e = enemies[i];
    const dx = state.player.x - e.x;
    const dz = state.player.z - e.z;
    const d = Math.hypot(dx, dz);
    e.heading = Math.atan2(dx, dz);
    if (d > 14) {
      const nx = e.x + Math.sin(e.heading) * 3.4 * dt;
      const nz = e.z + Math.cos(e.heading) * 3.4 * dt;
      if (!world.inCollider(nx, nz, 1)) { e.x = nx; e.z = nz; }
    }
    e.fig.group.position.set(e.x, 0, e.z);
    e.fig.group.rotation.y = e.heading;
    e.shootT -= dt;
    if (e.shootT <= 0 && d < 40) {
      e.shootT = rand.range(1.2, 2.2);
      showMuzzle(e.x + Math.sin(e.heading) * 0.8, 1.3, e.z + Math.cos(e.heading) * 0.8);
      audio.shot();
      if (Math.random() < 0.4) {
        state.player.hp = Math.max(0, state.player.hp - 6);
        hud.hitPopup(6);
        hud.toast('TERTEMBAK!', 'Cari perlindungan');
      }
    }
    if (e.hp <= 0) {
      damageNumber(e.x, 2.2, e.z, 'DOWN', '#ff5e5e');
      render.scene.remove(e.fig.group);
      enemies.splice(i, 1);
      missions.addTakedown();
      const m = missions.active();
      if (m && m.type === 'shootout' && enemies.length === 0) finishMission();
    }
  }
}

function shoot() {
  if (state.inCar || state.screen !== 'play') return;
  const w = WEAPONS[state.weapon];
  if (!missions.weaponUnlocked(state.weapon)) {
    hud.toast(`${w.name} TERKUNCI`, `Selesaikan misi ${w.unlock + 1} dulu · $${w.price.toLocaleString('en-US')}`);
    return;
  }
  if (state.ammo[state.weapon] <= 0) {
    hud.toast('AMMO HABIS', 'Tekan R untuk reload');
    return;
  }
  state.ammo[state.weapon] -= 1;
  audio.shot();
  const p = state.player;
  const gx = p.x + Math.sin(p.heading) * 0.9;
  const gz = p.z + Math.cos(p.heading) * 0.9;
  showMuzzle(gx, 1.35, gz);
  police.addHeat(0.08);
  for (const ped of peds) {
    if (Math.hypot(ped.x - p.x, ped.z - p.z) < 25) ped.panic = 3;
  }
  // Hit the nearest enemy inside a 25-degree cone, within 45 units.
  let best = null;
  let bestD = 45;
  for (const e of enemies) {
    const dx = e.x - p.x;
    const dz = e.z - p.z;
    const d = Math.hypot(dx, dz);
    if (d > bestD) continue;
    const ang = Math.abs(Math.atan2(dx, dz) - p.heading);
    const a = Math.min(ang, Math.PI * 2 - ang);
    if (a < 0.45) { best = e; bestD = d; }
  }
  if (best) {
    const dmg = state.weapon === 0 ? 25 : state.weapon === 2 ? 55 : state.weapon === 3 ? 40 : 30;
    best.hp -= dmg;
    damageNumber(best.x, 2.4, best.z, `-${dmg}`, '#ffd94d');
    if (best.hp <= 0) hud.toast('MUSUH JATUH', '+15 REP');
  }
}

// --- Screen transitions.
function startGame() {
  state.screen = 'play';
  hud.showTitle(false);
  audio.unlock();
  audio.startRadio();
  hud.setDialogue(CHARACTERS.ratna, 'Raka, akhirnya pulang. Kencana sudah berubah — tapi peluangnya masih sama besarnya.');
  refreshObjective();
  announce('Bermain. Misi 1: Selamat Datang.');
}

function enterCar() {
  if (state.inCar) {
    // Exit the car.
    state.inCar = false;
    state.player.x += Math.sin(state.player.heading + Math.PI / 2) * 2.4;
    state.player.z += Math.cos(state.player.heading + Math.PI / 2) * 2.4;
    playerFig.group.visible = true;
    audio.setEngine(0, false);
    return;
  }
  // Near the hero car or a parked car?
  const p = state.player;
  const cars = [{ mesh: state.car.mesh, kind: 'hero', x: state.car.mesh.position.x, z: state.car.mesh.position.z }];
  for (const pc of parkedCars) cars.push({ mesh: pc.mesh, kind: 'parked', x: pc.x, z: pc.z, def: pc });
  for (const c of cars) {
    const d = Math.hypot(c.x - p.x, c.z - p.z);
    if (d < 5) {
      if (c.kind === 'parked') {
        // Steal it: swap the player's car for this one.
        const old = state.car.mesh;
        const oldPos = { x: old.position.x, z: old.position.z, h: old.rotation.y };
        render.scene.remove(old);
        state.car.mesh = c.mesh;
        state.car.paint = 0;
        const def = c.def;
        parkedCars.splice(parkedCars.indexOf(def), 1);
        parkedCars.push({ mesh: old, color: '#ffb400', kind: 'sports', x: oldPos.x, z: oldPos.z, heading: oldPos.h });
        old.position.set(oldPos.x, 0, oldPos.z);
        old.rotation.y = oldPos.h;
        render.scene.add(old);
        missions.addStolen();
        police.addHeat(0.3);
        hud.toast('MOBIL DICURI', 'Seorang saksi menelepon KPD');
      }
      state.inCar = true;
      playerFig.group.visible = false;
      state.car.heading = state.car.mesh.rotation.y;
      state.car.speed = 0;
      // The garage works on the car you drive: keep its paint and condition
      // in sync with the car you just entered (hero or stolen).
      state.car.paint = paintIndexFor(state.car.mesh);
      garage.state.paint = state.car.paint;
      garage.state.hp = state.car.hp;
      audio.setEngine(0, true);
      return;
    }
  }
}

function toggleMap() {
  if (state.screen === 'garage') return;
  state.mapOpen = !state.mapOpen;
  state.screen = state.mapOpen ? 'map' : 'play';
  hud.showMap(state.mapOpen, hudState());
  if (state.mapOpen) audio.blip(520);
}

function toggleGarage() {
  const nearGarage = Math.hypot(state.player.x - 240, state.player.z - 240) < 22;
  if (state.screen === 'garage') {
    garage.exit();
    state.screen = 'play';
    state.player.x = 240;
    state.player.z = 262;
    state.player.heading = Math.PI;
    hud.showGarage(false);
    return;
  }
  if (!nearGarage || state.screen !== 'play') return;
  // The garage shows the car you drove in, not a fresh gold one.
  garage.displayCar.userData.bodyMat.color.set(state.car.mesh.userData.bodyMat.color);
  garage.state.paint = state.car.paint;
  garage.state.hp = state.car.hp;
  garage.enter();
  state.screen = 'garage';
  hud.showGarage(true, garage, missions.state.cash);
  hud.setDialogue(CHARACTERS.bambang, 'Raka! Garudamu butuh sentuhan. Cat, mesin, armour — semua bisa di sini.');
}

// --- HUD state snapshot.
function hudState() {
  return {
    player: state.player,
    inCar: state.inCar,
    carHp: state.car.hp,
    paint: state.car.paint,
    weapon: state.weapon,
    ammo: state.ammo,
    mission: missions,
    police,
    objective: state.objective,
    raceGates: state.race ? RACE_GATES : null,
    track: state.track,
    day: `DAY ${state.day}`,
    clock: `${String(Math.floor(state.clock / 60)).padStart(2, '0')}:${String(Math.floor(state.clock % 60)).padStart(2, '0')}`,
    mapOpen: state.mapOpen,
    missionPortrait: CHARACTERS.wheelman,
  };
}

// --- Main loop.
const input = createInput();
let last = performance.now();
let accumulator = 0;

function step(dt) {
  state.elapsed += dt;
  state.clock += dt * 0.35;
  if (state.clock >= 24 * 60) { state.clock -= 24 * 60; state.day += 1; }
  const hour = state.clock / 60;
  const night = hour >= 20 || hour < 5.5;
  if (night !== state.night) {
    state.night = night;
    render.setNight(night);
    world.setNight(night);
  }
  world.step(dt);
  if (state.screen === 'play' || state.screen === 'map') {
    const axis = input.axis();
    stepPlayer(dt, axis);
    stepTraffic(dt);
    stepPeds(dt);
    stepEnemies(dt);
    police.step(dt, state.player);
    raceStep(dt);
    arriveAtObjective();
    // Damage sprites float up.
    for (let i = state.damageSprites.length - 1; i >= 0; i -= 1) {
      const d = state.damageSprites[i];
      d.t += dt;
      d.spr.position.y += dt * 2;
      d.spr.material.opacity = Math.max(0, 1 - d.t);
      if (d.t > 1) { render.scene.remove(d.spr); state.damageSprites.splice(i, 1); }
    }
    if (state.muzzleT > 0) {
      state.muzzleT -= dt;
      if (state.muzzleT <= 0 && muzzle) muzzle.visible = false;
    }
    audio.setEngine(state.inCar ? Math.abs(state.car.speed) / 46 : 0, state.inCar);
    audio.setSiren(police.wanted >= 3);
    if (state.player.hp <= 0) {
      state.player.hp = 100;
      state.player.x = -30;
      state.player.z = 30;
      police.setWanted(0, state.player);
      hud.toast('KAMU TUMBANG', 'Bangun di safehouse — $500 hilang');
      missions.addCash(-500);
    }
    state.saveTimer += dt;
    if (state.saveTimer > 20) { state.saveTimer = 0; saveGame(); }
  }
  if (state.screen === 'passed') {
    state.passedT += dt;
    if (state.passedT > 3) {
      hud.showPassed(null);
      state.screen = 'play';
    }
  }
}

function handleActions() {
  const a = input.takeActions();
  if (a & ACTION_CONFIRM) {
    if (state.screen === 'title') startGame();
    else if (state.screen === 'pause') { state.screen = 'play'; hud.showPause(false); }
  }
  if (a & ACTION_PAUSE) {
    if (state.screen === 'play') { state.screen = 'pause'; hud.showPause(true, hudState()); }
    else if (state.screen === 'pause') { state.screen = 'play'; hud.showPause(false); }
    else if (state.screen === 'map') toggleMap();
    else if (state.screen === 'garage') toggleGarage();
  }
  if (a & ACTION_ENTER && state.screen === 'play') enterCar();
  if (a & ACTION_SHOOT && state.screen === 'play') shoot();
  if (a & ACTION_RELOAD && state.screen === 'play') {
    const w = WEAPONS[state.weapon];
    if (w.ammo !== Infinity) {
      const need = w.ammo - state.ammo[state.weapon];
      const take = Math.min(need, state.reserve[state.weapon]);
      state.ammo[state.weapon] += take;
      state.reserve[state.weapon] -= take;
      audio.blip(440);
    }
  }
  if (a & ACTION_MAP && (state.screen === 'play' || state.screen === 'map')) toggleMap();
  if (a & ACTION_GARAGE && (state.screen === 'play' || state.screen === 'garage')) toggleGarage();
  if (a & ACTION_RADIO) {
    const i = (RADIO.tracks.indexOf(state.track) + 1) % RADIO.tracks.length;
    state.track = RADIO.tracks[i];
    audio.blip(760);
  }
  const w = input.takeWeapon();
  if (w >= 0 && state.screen === 'play') {
    if (w === 0) state.weapon = 0;
    else if (w <= 5) state.weapon = w;
    audio.blip(600);
  }
  const c = input.takeCrew();
  if (c && state.screen === 'play') {
    const crew = CREW.find((x) => x.key === c);
    if (crew) {
      if (missions.hire(crew.id)) {
        hud.setDialogue(crew.id === 'agus' ? CHARACTERS.agus : crew.id === 'bambang' ? CHARACTERS.bambang : CHARACTERS.ratna, `${crew.name} bergabung dengan krumu. $${crew.hire}.`);
        audio.blip(880);
      } else {
        hud.toast('TIDAK BISA HIRE', missions.state.hired[crew.id] ? `${crew.name} sudah di kru` : 'Uang tidak cukup');
      }
    }
  }
  // Garage menu: number keys 1-4 buy while inside.
  if (state.screen === 'garage' && w >= 1 && w <= 4) {
    const res = garage.buy(w - 1, missions.state.cash);
    if (res.ok) {
      missions.addCash(-res.cost);
      // A repaint or a repair in the garage changes the car itself, not
      // just the show car on the lift.
      state.car.paint = garage.state.paint;
      state.car.hp = garage.state.hp;
      state.car.mesh.userData.bodyMat.color.set(PAINTS[garage.state.paint].color);
      hud.toast('BENGKEL', res.msg);
      audio.blip(880);
    } else {
      hud.toast('BENGKEL', res.msg);
    }
    hud.showGarage(true, garage, missions.state.cash);
  }
}

function frame(now) {
  requestAnimationFrame(frame);
  accumulator += Math.min((now - last) / 1000, MAX_FRAME);
  last = now;
  handleActions();
  while (accumulator >= STEP) {
    step(STEP);
    accumulator -= STEP;
  }
  // Camera focus + HUD.
  const focus = state.screen === 'garage'
    ? { x: GARAGE_POS.x, z: GARAGE_POS.z, heading: 0, speed: 0 }
    : state.screen === 'title'
      ? { x: -280, z: 210, heading: 0, speed: 0 }
      : { x: state.player.x, z: state.player.z, heading: state.player.heading, speed: state.player.speed };
  const mode = state.screen === 'garage' ? 'garage' : state.screen === 'title' ? 'title' : state.screen === 'map' ? 'map' : state.inCar ? 'chase' : 'combat';
  render.setMode(mode);
  render.draw(STEP, focus);
  if (state.screen !== 'title') hud.update(hudState());
}

// --- Boot.
function boot() {
  // Hero staging for the title: gold Garuda on the beach road, ferris wheel
  // behind, wheelman standing beside the driver's door (close enough that
  // E enters the car: 3.6 units away, the enter radius is 5).
  state.car.mesh.position.set(-280, 0, 210);
  state.car.mesh.rotation.y = Math.PI / 2 + 0.5;
  state.player.x = -277;
  state.player.z = 212;
  state.player.heading = Math.PI / 2;
  playerFig.group.position.set(-277, 0, 212);
  playerFig.group.rotation.y = Math.PI / 2;
  const save = loadSave();
  if (save) {
    missions.load(save);
    state.day = save.day ?? 1;
    state.clock = save.clock ?? 18 * 60 + 36;
    if (save.paint !== undefined) {
      state.car.paint = save.paint;
      state.car.mesh.userData.bodyMat.color.set(PAINTS[save.paint].color);
    }
  }
  refreshObjective();
  hud.showTitle(true, {
    hasSave: !!save,
    mission: (missions.state.index || 0) + 1,
    cash: missions.state.cash,
    day: `DAY ${state.day}`,
  });
  hud.update(hudState());
  // Title buttons: MULAI / LANJUTKAN / LOAD start the game, END GAME saves
  // and reloads back to the title.
  const onStart = () => { if (state.screen === 'title') startGame(); };
  const btnStart = document.getElementById('btn-start');
  const btnContinue = document.getElementById('btn-continue');
  const btnLoad = document.getElementById('btn-load');
  const btnEnd = document.getElementById('btn-end');
  if (btnStart) btnStart.onclick = onStart;
  if (btnContinue) btnContinue.onclick = onStart;
  if (btnLoad) btnLoad.onclick = onStart;
  if (btnEnd) btnEnd.onclick = () => { saveGame(); window.location.reload(); };
  // Crew bar (bottom-left) and the map action buttons (TUTUP / TITLE).
  hud.buildCrewBar();
  const btnMapClose = document.getElementById('map-close');
  const btnMapTitle = document.getElementById('map-title-btn');
  if (btnMapClose) btnMapClose.onclick = () => toggleMap();
  if (btnMapTitle) btnMapTitle.onclick = () => { saveGame(); window.location.reload(); };
  // Debug handle for the automated playtest (state inspection only).
  window.__kencana = { state, missions, police, garage, world, render };
  announce('Kencana Bay. Tekan Spasi atau klik untuk mulai.');
  requestAnimationFrame(frame);
}

if (shot) {
  // Screenshot mode: stage the scene, paint twice, signal readiness.
  const staged = stageShot(shot, {
    world, render, hud, missions, police, garage, state,
    playerFig, heroCar, traffic, peds, enemies, spawnEnemies, saveGame,
  });
  let painted = 0;
  function paint() {
    render.draw(STEP, staged.focus);
    if (staged.hudState) hud.update(staged.hudState);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
} else {
  boot();
}
