// Boot and the one loop: input every frame, world advances in fixed 1/60 s
// steps, renderer paints what is there. Screens: menu, play, paused, map,
// game over. ?shot=title|chase|foot|map stages a screenshot scene instead
// of running the loop, then sets window.__shotReady.
import { THREE } from './three-shim.js';
import { STEP, PLAYER, WEAPONS, MISSIONS, SAVE_KEY, CREW } from './config.js';
import { createRandom } from './random.js';
import { ACTION_CONFIRM, ACTION_PAUSE, ACTION_MAP, ACTION_SHOOT, ACTION_RELOAD, ACTION_ENTER, ACTION_RADIO, ACTION_GARAGE, createInput } from './input.js';
import { createCity, districtAt } from './world.js';
import { makeCharacter, makeCar, createDriver } from './vehicles.js';
import { createTraffic, createPedestrians } from './pedestrians.js';
import { createPolice } from './police.js';
import { createMissions } from './missions.js';
import { createAudio } from './audio.js';
import { createHud } from './hud.js';
import { createRenderer, SCREEN_TITLE, SCREEN_PLAY, SCREEN_PAUSED, SCREEN_OVER, SCREEN_MAP } from './render.js';

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 1;
const random = createRandom(seed);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const renderer = createRenderer(canvas);
const scene = renderer.scene;
createCity(scene, random);
const traffic = createTraffic(scene, random, 14);
const pedestrians = createPedestrians(scene, random, 22);
const police = createPolice(scene);
const missions = createMissions();
const audio = createAudio();
const hud = createHud();
const input = createInput(canvas);

const player = makeCharacter();
player.position.set(-295, 0, 108); // live title: wheelman stands by the parked Garuda on the beach road
player.rotation.y = 0.6;
scene.add(player);
const garuda = makeCar('#ffb400', { type: 'sports' });
garuda.position.set(-300, 0, 110);
garuda.rotation.y = 0.85;
scene.add(garuda);
const driver = createDriver(garuda);
let heading = Math.PI;
let camHeading = heading;

// Objective beacon: floating gold ring + pillar of light.
const beacon = new THREE.Group();
const beaconRing = new THREE.Mesh(new THREE.TorusGeometry(6, 0.5, 8, 24), new THREE.MeshBasicMaterial({ color: 0xffd24d }));
beaconRing.rotation.x = Math.PI / 2; beaconRing.position.y = 2; beacon.add(beaconRing);
const beaconBeam = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 60, 8, 1, true), new THREE.MeshBasicMaterial({ color: 0xffd24d, transparent: true, opacity: 0.25, side: THREE.DoubleSide }));
beaconBeam.position.y = 30; beacon.add(beaconBeam);
scene.add(beacon);

const state = {
  screen: SCREEN_TITLE, cash: 0, rep: 1320, hp: PLAYER.hp, clockMin: 18 * 60 + 36,
  weapon: 1, ammo: WEAPONS.map((w) => w.ammo), reserve: WEAPONS.map((w) => w.reserve),
  fireT: 0, hired: [], takedowns: 14, carsStolen: 6, stunts: 2150,
  inCar: false, speedKmh: 0, dialogName: 'RATNA', dialogRole: 'FIXER',
  dialogText: 'Selamat datang di Kencana. Temui saya di Kampung Batik.',
  enemies: [], driftCashT: 0,
};
let screen = SCREEN_TITLE;
let paused = false;
let best = 0;
try { best = Number.parseInt(window.localStorage.getItem('kencana.best.v1') ?? '0', 10) || 0; } catch {}

function saveGame() {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify({
      cash: state.cash, rep: state.rep, missionIndex: missions.index, done: missions.done,
      hired: state.hired, takedowns: state.takedowns, carsStolen: state.carsStolen, stunts: state.stunts,
    }));
  } catch {}
}
function loadGame() {
  try {
    const s = JSON.parse(window.localStorage.getItem(SAVE_KEY) ?? 'null');
    if (!s) return false;
    state.cash = s.cash || 0; state.rep = s.rep || 1320;
    state.hired = s.hired || []; state.takedowns = s.takedowns || 0;
    state.carsStolen = s.carsStolen || 0; state.stunts = s.stunts || 0;
    return true;
  } catch { return false; }
}
function announce(m) { status.textContent = m; }

function setDialog(name, role, text) { state.dialogName = name; state.dialogRole = role; state.dialogText = text; }

function spawnEnemies(n, centre) {
  for (const e of state.enemies) scene.remove(e.mesh);
  state.enemies = [];
  for (let i = 0; i < n; i += 1) {
    const g = makeCharacter();
    g.children.forEach((c) => { if (c.material) c.material = c.material.clone(); });
    const shirt = g.children[3]; if (shirt) shirt.material.color.set('#c23b3b');
    g.position.set(centre[0] + (Math.random() - 0.5) * 24, 0, centre[1] + (Math.random() - 0.5) * 24);
    scene.add(g);
    state.enemies.push({ mesh: g, hp: 40 });
  }
}

function startMission() {
  const m = missions.start();
  const obj = missions.objective;
  beacon.position.set(obj[0], 0, obj[1]);
  if (m.type === 'clear') spawnEnemies(4, m.target);
  const c = missions.contact();
  setDialog(c.name, c.role, m.text);
  hud.toast(`MISSION ${missions.index + 1}/12 — ${m.name.toUpperCase()}`, 2.5);
}

function completeMission() {
  const m = MISSIONS[missions.index];
  let pay = missions.complete();
  if (state.hired.includes('RATNA')) pay = Math.round(pay * 1.15);
  state.cash += pay; state.rep += 60;
  audio.cash();
  hud.toast(`MISSION COMPLETE · +$${pay}`, 3);
  setDialog('RATNA', 'FIXER', `Bagus. $${pay} sudah masuk. Misi berikutnya: ${MISSIONS[Math.min(missions.index, 11)].name}.`);
  saveGame();
  if (!missions.finished) startMission();
  else { screen = SCREEN_OVER; announce(`Story complete. Cash $${state.cash}.`); }
}

function nearestCar(maxDist = 7) {
  let bestCar = null, bd = maxDist;
  const all = [garuda, ...traffic.cars.map((c) => c.mesh)];
  const px = player.position.x, pz = player.position.z;
  for (const c of all) {
    const d = Math.hypot(c.position.x - px, c.position.z - pz);
    if (d < bd) { bd = d; bestCar = c; }
  }
  return bestCar;
}

function enterCar(car) {
  state.inCar = true;
  driver.heading = car === garuda ? heading : car.rotation.y;
  driver.speed = 0;
  if (car !== garuda) {
    state.carsStolen += 1;
    police.addHeat(20, 'Car theft reported');
    hud.toast('CAR STOLEN · KPD NOTIFIED', 2);
  }
  player.visible = false;
  audio.engine(true);
  setDialog('AGUS', 'FIXER', 'Sunset race across four checkpoints. Win it for the crew.');
}

function exitCar() {
  state.inCar = false;
  player.visible = true;
  player.position.set(garuda.position.x + 3, 0, garuda.position.z + 3);
  player.rotation.y = heading;
  audio.engine(false);
}

function shoot() {
  const w = WEAPONS[state.weapon];
  if (state.fireT > 0 || state.ammo[state.weapon] <= 0) return;
  state.fireT = w.rate;
  state.ammo[state.weapon] -= 1;
  audio.shoot();
  const origin = state.inCar ? garuda.position : player.position;
  let bestE = null, bd = 45;
  for (const e of state.enemies) {
    const d = Math.hypot(e.mesh.position.x - origin.x, e.mesh.position.z - origin.z);
    if (d < bd) { bd = d; bestE = e; }
  }
  if (bestE) {
    bestE.hp -= w.damage;
    if (bestE.hp <= 0) {
      scene.remove(bestE.mesh);
      state.enemies = state.enemies.filter((e) => e !== bestE);
      state.takedowns += 1;
      police.addHeat(8, 'Shots fired');
      hud.toast('HIT! · TAKEDOWN', 1.2);
      if (missions.current().type === 'clear' && state.enemies.length === 0) completeMission();
    } else hud.toast('HIT! -' + w.damage + ' HP', 0.8);
  }
}

function stepWorld(dt) {
  const axis = input.axis();
  state.fireT = Math.max(0, state.fireT - dt);
  missions.tick(dt);
  traffic.step(dt);
  pedestrians.step(dt);
  police.step(dt, state.inCar ? garuda.position : player.position, state.hired.includes('AGUS PRASETYO'));
  audio.step(dt, Math.abs(driver.speed));
  state.clockMin += dt / 60;

  if (state.inCar) {
    driver.step(dt, axis.y, -axis.x);
    state.speedKmh = driver.speed * 3.6;
    heading = driver.heading;
    if (driver.drift > 1) {
      state.driftCashT -= dt;
      if (state.driftCashT <= 0) {
        state.driftCashT = 1.2;
        state.stunts += 300; state.cash += 50;
        hud.toast('+300 DRIFT · COMBO x2', 1);
      }
    }
    if (state.hired.includes('BAMBANG') && driver.hp < 100) driver.hp = Math.min(100, driver.hp + dt * 2);
  } else {
    const sp = input.keys.has('shift') ? PLAYER.runSpeed : PLAYER.walkSpeed;
    const mx = Math.sin(heading) * axis.y + Math.cos(heading) * axis.x;
    const mz = Math.cos(heading) * axis.y - Math.sin(heading) * axis.x;
    player.position.x += mx * sp * dt;
    player.position.z += mz * sp * dt;
    player.position.x = Math.max(-295, Math.min(295, player.position.x));
    player.position.z = Math.max(-295, Math.min(295, player.position.z));
    player.rotation.y = heading;
    state.speedKmh = Math.abs(axis.y) > 0 ? sp * 3.6 : 0;
    if (Math.abs(axis.y) > 0) player.position.y = Math.abs(Math.sin(performance.now() / 160)) * 0.15;
    else player.position.y = 0;
  }
  camHeading += input.takeMouseDX() * 0.0035;
  if (!state.inCar) heading = camHeading;

  // Mission progress.
  const m = missions.current();
  const obj = missions.objective;
  if (obj) {
    const px = state.inCar ? garuda.position.x : player.position.x;
    const pz = state.inCar ? garuda.position.z : player.position.z;
    const dist = Math.hypot(obj[0] - px, obj[1] - pz);
    state.objectiveDist = dist;
    if (m.type === 'race') {
      if (dist < 14) {
        if (missions.advanceCheckpoint()) completeMission();
        else { beacon.position.set(missions.objective[0], 0, missions.objective[1]); hud.toast(`CHECKPOINT ${missions.stage}/${m.checkpoints.length}`, 1.2); }
      }
      if (missions.timer <= 0) { hud.toast('RACE FAILED · TRY AGAIN', 2.5); startMission(); }
    } else if (m.type === 'escape') {
      if (police.wanted === 0 && state.inCar) completeMission();
    } else if (m.type !== 'clear' && dist < 12) {
      if (m.type === 'steal' && !state.inCar) { /* need to be in the stolen car */ }
      else completeMission();
    }
  }
  beaconRing.rotation.z += dt * 1.5;
  beacon.position.y = Math.sin(performance.now() / 500) * 0.4;
}

function hudState() {
  const m = missions.current();
  const px = state.inCar ? garuda.position.x : player.position.x;
  const pz = state.inCar ? garuda.position.z : player.position.z;
  const hh = Math.floor(state.clockMin / 60) % 24, mm2 = Math.floor(state.clockMin % 60);
  return {
    missionIndex: missions.index, missionsDone: missions.done, missionStage: missions.stage,
    objective: missions.objective, objectiveDist: state.objectiveDist || 0,
    cash: state.cash, rep: state.rep, hp: state.hp, clock: `${String(hh).padStart(2, '0')}:${String(mm2).padStart(2, '0')}`,
    wanted: police.wanted, policeUnits: police.units.map((u) => ({ dist: u.mesh.position.distanceTo(state.inCar ? garuda.position : player.position), mesh: u.mesh })),
    heli: police.heli, roadblock: police.roadblock, dispatch: police.dispatch,
    weapon: state.weapon, ammo: state.ammo, reserve: state.reserve,
    speedKmh: state.speedKmh, vehicleName: state.inCar ? 'GARUDA GT' : 'ON FOOT',
    px, pz, heading, traffic: traffic.cars, hired: state.hired,
    dialogName: state.dialogName, dialogRole: state.dialogRole, dialogText: state.dialogText,
    takedowns: state.takedowns, carsStolen: state.carsStolen, stunts: state.stunts,
  };
}

function handleActions() {
  const a = input.takeActions();
  if (a & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_OVER)) startGame();
  else if (a & ACTION_PAUSE && screen === SCREEN_PLAY) { screen = SCREEN_PAUSED; announce('Paused.'); }
  else if (a & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) { screen = SCREEN_PLAY; announce('Playing.'); }
  else if (a & ACTION_MAP && screen === SCREEN_PLAY) { screen = SCREEN_MAP; hud.els.mapScreen.style.display = 'block'; hud.els.hud.classList.add('hidden'); }
  else if (a & ACTION_MAP && screen === SCREEN_MAP) { screen = SCREEN_PLAY; hud.els.mapScreen.style.display = 'none'; hud.els.hud.classList.remove('hidden'); }
  if (screen !== SCREEN_PLAY) return;
  if (a & ACTION_SHOOT || input.mouseDown) shoot();
  if (a & ACTION_RELOAD) {
    const w = WEAPONS[state.weapon];
    const need = w.ammo - state.ammo[state.weapon];
    const take = Math.min(need, state.reserve[state.weapon]);
    state.ammo[state.weapon] += take; state.reserve[state.weapon] -= take;
  }
  if (a & ACTION_ENTER) {
    if (state.inCar) exitCar();
    else { const c = nearestCar(); if (c) enterCar(c); }
  }
  if (a & ACTION_RADIO) { const on = audio.toggleRadio(); hud.toast(on ? 'GAMELAN FM 101.1 · ON' : 'RADIO OFF', 1); }
  if (a & ACTION_GARAGE) hud.toast('GARAGE · Garuda GT ready · Bambang on call', 1.5);
  for (let i = 0; i < 5; i += 1) if (input.keys.has(String(i + 1))) state.weapon = i;
  for (const c of CREW) {
    if (input.keys.has(c.key.toLowerCase()) && !state.hired.includes(c.name) && state.cash >= c.cost) {
      state.cash -= c.cost; state.hired.push(c.name);
      hud.toast(`${c.name} HIRED · ${c.effect.toUpperCase()}`, 2);
    }
  }
}

function startGame() {
  audio.unlock();
  hud.showGame();
  screen = SCREEN_PLAY;
  missions.start();
  startMission();
  announce('Playing. Mission 1: Selamat Datang.');
}

function frame(now) {
  requestAnimationFrame(frame);
  if (screen === SCREEN_MAP) { handleActions(); hud.renderMap(hudState()); return; }
  if (screen === SCREEN_TITLE) {
    // Slow cinematic drift around the parked Garuda GT, so the live
    // title screen shows the hero car big on the right instead of an
    // empty street far away.
    const t = now / 1000;
    renderer.camera.position.set(-284 + Math.sin(t * 0.08) * 3, 4.5, 122 + Math.cos(t * 0.05) * 3);
    renderer.camera.lookAt(-300, 1.5, 106);
    traffic.step(STEP); pedestrians.step(STEP);
    renderer.draw();
    return;
  }
  if (screen === SCREEN_PAUSED) { renderer.draw(); return; }
  if (screen === SCREEN_OVER) { renderer.draw(); return; }
  handleActions();
  if (screen === SCREEN_PLAY) stepWorld(STEP);
  // The seated driver shows only while driving (convertible).
  if (garuda.userData.driver) garuda.userData.driver.visible = state.inCar;
  const target = state.inCar ? garuda.position : player.position;
  // In-car: close three-quarter chase cam (car fills the frame, wedge /
  // stripe / white rims / spoiler all visible); on foot: wider view.
  if (state.inCar) renderer.follow(target, driver.heading, 11, 4.8, 2.0, 3.4);
  else renderer.follow(target, camHeading, 11, 5.5, 3);
  renderer.draw();
  hud.render(hudState());
  hud.tickToast(STEP);
  if (state.cash > best) { best = state.cash; try { window.localStorage.setItem('kencana.best.v1', String(best)); } catch {} }
}

document.getElementById('btnStart').addEventListener('click', startGame);
document.getElementById('btnSave').addEventListener('click', () => { saveGame(); hud.toast('SAVED', 1.5); });
document.getElementById('btnLoad').addEventListener('click', () => { if (loadGame()) { hud.toast('LOADED', 1.5); } else hud.toast('NO SAVE FOUND', 1.5); });
document.getElementById('btnEnd').addEventListener('click', () => { screen = SCREEN_TITLE; hud.showMenu(); });
document.getElementById('btnCloseMap').addEventListener('click', () => { screen = SCREEN_PLAY; hud.els.mapScreen.style.display = 'none'; hud.els.hud.classList.remove('hidden'); });
document.getElementById('btnTitle2').addEventListener('click', () => { screen = SCREEN_TITLE; hud.els.mapScreen.style.display = 'none'; hud.els.hud.classList.remove('hidden'); hud.showMenu(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && screen === SCREEN_PLAY) screen = SCREEN_PAUSED; });

// Screenshot staging: deterministic scenes from the real game, same seed.
function runShot(name) {
  hud.showGame();
  screen = SCREEN_PLAY;
  state.cash = 12480; state.rep = 1320;
  if (name === 'title') {
    hud.showMenu();
    screen = SCREEN_TITLE;
    // Poster staging: the wheelman stands NEXT TO the Garuda, hero car
    // large on the right of frame, three-quarter front view, nose
    // toward camera-LEFT. Camera is close (12 units) and low, so car +
    // character fill the lower frame under the centered logo — not an
    // empty street far away.
    player.visible = true;
    player.position.set(-295, 0, 108); player.rotation.y = 0.6;
    garuda.position.set(-300, 0, 110); garuda.rotation.y = 0.85;
    if (garuda.userData.driver) garuda.userData.driver.visible = true;
    renderer.camera.position.set(-290, 4.5, 120);
    renderer.camera.lookAt(-302, 2, 100);
  } else if (name === 'chase') {
    missions.jump(5, 5); startMission();
    state.inCar = true; player.visible = false;
    garuda.position.set(0, 0, 60); driver.heading = Math.PI; driver.speed = 14;
    heading = Math.PI; camHeading = Math.PI;
    police.addHeat(65, 'Sunset race');
    for (let i = 0; i < 240; i += 1) stepWorld(STEP);
    driver.speed = 14.2; state.speedKmh = 51;
    // Stage two KPD units right behind the Garuda for the chase frame.
    police.units.forEach((u, i) => {
      u.mesh.position.set(garuda.position.x + (i ? -8 : 8), 0, garuda.position.z - 14 - i * 6);
      u.mesh.rotation.y = driver.heading;
    });
    document.getElementById('toast').textContent = '';
    const target = garuda.position;
    // Close three-quarter chase cam: the Garuda fills the lower frame,
    // wedge + side stripe + white rims + spoiler + tail bar all visible.
    if (garuda.userData.driver) garuda.userData.driver.visible = true;
    renderer.follow(target, driver.heading, 9, 4.2, 1.8, 5.5);
  } else if (name === 'foot') {
    missions.jump(6, 6); startMission();
    state.cash = 13230;
    // On the Alun-Alun crossroads: camera behind the player stays on the road.
    player.position.set(0, 0, 0); heading = Math.PI; camHeading = Math.PI;
    // Park the Garuda right next to the player so the car is visible
    // in the foot shot too; placed fully in frame, not clipped at the edge.
    garuda.position.set(5.5, 0, 2); garuda.rotation.y = -0.4;
    police.addHeat(45, 'Warehouse raid');
    spawnEnemies(3, [18, -28]);
    for (let i = 0; i < 120; i += 1) stepWorld(STEP);
    document.getElementById('toast').textContent = '';
    renderer.follow(player.position, camHeading, 17, 8, 3);
  } else if (name === 'map') {
    missions.jump(5, 5); startMission();
    // Paint the 3D city once first: the map is transparent, so the live
    // street behind it must already be on the canvas.
    player.position.set(0, 0, 60); heading = Math.PI; camHeading = Math.PI;
    renderer.follow(player.position, camHeading, 17, 8, 3);
    renderer.draw();
    screen = SCREEN_MAP;
    hud.els.mapScreen.style.display = 'block';
    hud.els.hud.classList.add('hidden');
    hud.renderMap(hudState());
  }
  if (screen !== SCREEN_MAP) {
    renderer.draw();
    hud.render(hudState());
  }
  let painted = 0;
  function paint() {
    if (screen !== SCREEN_MAP) { renderer.draw(); hud.render(hudState()); }
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

if (shot) runShot(shot);
else requestAnimationFrame(frame);
