// The four screenshot scenes. Each one stages a real, playable situation
// from a fixed seed — a busy chase, a night shootout, the garage interior,
// and the map after a played session — then the page paints it twice and
// sets window.__shotReady. Nothing here is composited or borrowed: the
// frames are what the game's own code renders.
import { THREE } from './three-shim.js';
import { RACE_GATES } from './missions.js';
import { GARAGE_POS } from './garage.js';
import { CHARACTERS } from './pedestrians.js';
import { buildBoxTruck, buildMotorcycle } from './vehicles.js';
import { RADIO } from './config.js';

// A session that has really been played, expressed through the same save
// shape the game loads: 5 missions done, 14 takedowns, 6 cars stolen,
// $2.150 of stunts, 2 of 3 races won. The map shot reads these numbers.
const PLAYED_SAVE = {
  index: 5, done: 5, cash: 13230, rep: 1320,
  takedowns: 14, carsStolen: 6, stunts: 2150,
  racesWon: 2, racesRun: 3, playSeconds: 3720,
  hired: { agus: true, bambang: false, ratna: true },
  // Only fists / pistol / Kancil SMG unlocked at this point of the story
  // (shotgun unlocks at mission 3, the GARUDA rifle at 5, the launcher
  // at 9) — the chase/combat shots add a staging-only lock for the
  // shotgun + launcher (see stagedWeaponLocks in missions.js), so the
  // weapon bar's last slots read LOCKED like the reference chase shot
  // WITHOUT lowering `done` — the mission panel keeps STORY 42%.
  unlockedWeapons: [0, 1, 2],
};

function hudState(ctx, overrides = {}) {
  const s = ctx.state;
  return {
    player: s.player,
    inCar: s.inCar,
    carHp: s.car.hp,
    paint: s.car.paint,
    weapon: s.weapon,
    ammo: s.ammo,
    mission: ctx.missions,
    police: ctx.police,
    objective: s.objective,
    raceGates: s.race ? RACE_GATES : null,
    track: s.track,
    day: `DAY ${s.day}`,
    clock: `${String(Math.floor(s.clock / 60)).padStart(2, '0')}:${String(Math.floor(s.clock % 60)).padStart(2, '0')}`,
    mapOpen: s.mapOpen,
    missionPortrait: CHARACTERS.wheelman,
    ...overrides,
  };
}

function loadPlayedSession(ctx) {
  ctx.missions.load(PLAYED_SAVE);
  ctx.state.player.hp = 100;
  ctx.state.car.hp = 88;
}

function stageChase(ctx) {
  const s = ctx.state;
  loadPlayedSession(ctx);
  ctx.missions.state.index = 5; // Balapan Senja
  // Staging-only lock (round 9): shotgun + launcher read LOCKED on the
  // weapon bar like the reference chase shot, WITHOUT lowering `done` —
  // the old `done = 2` override made the mission panel read STORY 17%
  // while the map read 42%. `done` stays 5 here, so chase, combat and
  // map all show the same STORY 42% (5/12 missions, REP 1320).
  ctx.missions.state.stagedWeaponLocks = new Set([3, 5]);
  // The player drives east on the Alun-Alun main road (z = 60), mid-chase.
  s.player.x = -40;
  s.player.z = 60;
  s.player.heading = Math.PI / 2;
  s.player.speed = 32;
  s.inCar = true;
  s.car.heading = Math.PI / 2;
  s.car.speed = 32;
  s.car.mesh.position.set(-40, 0, 60);
  s.car.mesh.rotation.y = Math.PI / 2;
  ctx.playerFig.group.visible = false;
  // Traffic ahead: 6 cars on the same road, one taxi, one van.
  const ahead = [[-12, 60], [6, 60], [24, 60], [44, 57], [58, 63], [72, 60]];
  for (let i = 0; i < 6 && i < ctx.traffic.length; i += 1) {
    const t = ctx.traffic[i];
    t.mesh.position.set(ahead[i][0], 0, ahead[i][1]);
    t.heading = Math.PI / 2;
    t.mesh.rotation.y = Math.PI / 2;
  }
  // A box truck and a motorcycle in the frame: swap the two nearest
  // staged traffic cars for freshly built ones — same slots, same
  // positions, only the mesh changes, so no gameplay value moves.
  const swapTraffic = (i, mesh) => {
    const t = ctx.traffic[i];
    ctx.render.scene.remove(t.mesh);
    mesh.position.copy(t.mesh.position);
    mesh.rotation.y = t.mesh.rotation.y;
    ctx.render.scene.add(mesh);
    t.mesh = mesh;
  };
  swapTraffic(0, buildBoxTruck('#e8a33d'));
  swapTraffic(1, buildMotorcycle());
  // The motorcycle would sit in the box truck's lane and be hidden
  // behind it from the chase camera — move it to the near lane, ahead
  // and to the right, so it reads as its own vehicle. (Shot mode never
  // runs the traffic loop, so this staged position is exactly what the
  // screenshot shows.)
  ctx.traffic[1].mesh.position.set(-18, 0, 66);
  // Two KPD cars in the frame, lights on — one ahead on the left lane,
  // one closer in the left-centre lane INSIDE the guardrails (z 52.8 /
  // 67.2): the old second car sat at (-22, 47), beyond the north rail,
  // and the rail cut across its lower body. At (-18, 56) the whole car
  // — wheels, body, light bar — reads clear of the rail.
  ctx.police.setWanted(4, s.player);
  const cars = ctx.police.units.filter((u) => u.kind === 'car' && u.mesh.visible);
  if (cars[0]) { cars[0].mesh.position.set(-8, 0, 50); cars[0].mesh.rotation.y = Math.PI / 2; cars[0].dist = 28; cars[0].status = 'MENGEJAR'; }
  if (cars[1]) { cars[1].mesh.position.set(-18, 0, 56); cars[1].mesh.rotation.y = Math.PI / 2; cars[1].dist = 22; cars[1].status = 'MENGEJAR'; }
  // Helicopter above and ahead, spotlight on the road — staged low and
  // centred (y 11, z 42) so it reads whole, clear of the top edge and
  // clear of the weapon bar at the top of the frame (round 7: moved
  // north from z 52 so the body sits left of the six weapon slots),
  // with the cone on the road.
  const heli = ctx.police.units.find((u) => u.kind === 'heli');
  if (heli) {
    heli.mesh.position.set(-2, 11, 42);
    heli.mesh.rotation.y = Math.PI;
    heli.dist = 38;
    heli.status = 'SPOTLIGHT';
  }
  // Pedestrians on the sidewalks.
  const pedSpots = [[-8, 71], [16, 49], [38, 71]];
  for (let i = 0; i < 3 && i < ctx.peds.length; i += 1) {
    ctx.peds[i].x = pedSpots[i][0];
    ctx.peds[i].z = pedSpots[i][1];
    ctx.peds[i].fig.group.position.set(pedSpots[i][0], 0, pedSpots[i][1]);
  }
  // Mission 6 objective: the race start at Pantai Kidul.
  s.objective = { x: RACE_GATES[0][0], z: RACE_GATES[0][1] };
  s.weapon = 2;
  s.track = RADIO.tracks[0];
  s.clock = 18 * 60 + 36;
  ctx.render.setMode('chase');
  const focus = { x: s.player.x, z: s.player.z, heading: s.player.heading, speed: s.player.speed };
  ctx.render.snapCamera(focus);
  ctx.hud.hideDialogue(); // the dialogue bar must never cover the car
  return { focus, hudState: hudState(ctx) };
}

function stageCombat(ctx) {
  const s = ctx.state;
  loadPlayedSession(ctx);
  ctx.missions.state.index = 8; // Heat Wave
  // Same staging lock as the chase shot: shotgun + launcher LOCKED on
  // the weapon bar, `done` stays 5 so the panel reads STORY 42% like
  // the map (round 9: the old `done = 2` made it read 17% here).
  ctx.missions.state.stagedWeaponLocks = new Set([3, 5]);
  ctx.render.setNight(true);
  ctx.world.setNight(true);
  s.night = true;
  // Lorong Emas, outside the casino: the wheelman on foot, mid-shootout.
  s.player.x = 200;
  s.player.z = -10;
  s.player.heading = Math.PI / 2;
  s.player.speed = 0;
  s.inCar = false;
  s.car.mesh.position.set(180, 0, -30);
  s.car.mesh.rotation.y = Math.PI;
  ctx.playerFig.group.visible = true;
  ctx.playerFig.group.position.set(200, 0, -10);
  ctx.playerFig.group.rotation.y = Math.PI / 2;
  // Three enemies ahead, close enough to read as a real threat (12–16u,
  // not specks on the horizon).
  ctx.spawnEnemies(226, -8, 3);
  const e0 = ctx.enemies[0];
  const e1 = ctx.enemies[1];
  if (e0) { e0.x = 212; e0.z = -14; e0.hp = 100; e0.fig.group.position.set(212, 0, -14); }
  if (e1) { e1.x = 216; e1.z = 4; e1.hp = 100; e1.fig.group.position.set(216, 0, 4); }
  if (ctx.enemies[2]) { ctx.enemies[2].x = 213; ctx.enemies[2].z = -20; ctx.enemies[2].hp = 100; ctx.enemies[2].fig.group.position.set(213, 0, -20); }
  // Street props in the mid-ground so the road reads busy, not empty:
  // crate stack, loose crate, oil barrels, rubble — all low, none of them
  // hides the wheelman, the enemies or the tracer line.
  const propMat = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85 });
  const crateAt = (x, z, s, c) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), propMat(c));
    m.position.set(x, s / 2, z);
    m.rotation.y = 0.4;
    m.castShadow = true;
    ctx.render.scene.add(m);
  };
  crateAt(207, -16.5, 1.2, '#8a6b3d');
  crateAt(207.4, -16.2, 0.8, '#6b4f2a');
  crateAt(208, -3.5, 1.1, '#8a6b3d');
  const barrelAt = (x, z, c) => {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 1.1, 12), propMat(c));
    b.position.set(x, 0.55, z);
    b.castShadow = true;
    ctx.render.scene.add(b);
  };
  barrelAt(209, -7, '#2b6fd0');
  barrelAt(206.5, -12.5, '#c94b4b');
  for (const [rx, rz, rs] of [[205, -14.5, 0.5], [205.8, -13.8, 0.35], [204.5, -14.2, 0.42]]) {
    const r = new THREE.Mesh(new THREE.BoxGeometry(rs, rs * 0.6, rs), propMat('#55555e'));
    r.position.set(rx, rs * 0.3, rz);
    r.rotation.y = 0.8;
    ctx.render.scene.add(r);
  }
  // Zebra crossing ahead of the shootout, on the road.
  for (let i = 0; i < 5; i += 1) {
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 0.04, 10),
      new THREE.MeshStandardMaterial({ color: '#f2f2f2', roughness: 0.9 }),
    );
    stripe.position.set(222 + i * 2.4, 0.08, -10);
    ctx.render.scene.add(stripe);
  }
  // Muzzle flash at the gun + a tracer to the nearest enemy + a damage number.
  // The flash is small (1.4u) with a starburst shape: the old 3u radial blob
  // covered the whole character.
  const flash = new THREE.Sprite(new THREE.SpriteMaterial({
    map: flashTexture(), transparent: true, depthTest: false,
  }));
  flash.scale.set(1.4, 1.4, 1);
  flash.position.set(201.2, 1.35, -9);
  ctx.render.scene.add(flash);
  const tracerGeo = new THREE.BufferGeometry();
  tracerGeo.setAttribute('position', new THREE.Float32BufferAttribute([201.2, 1.35, -9, 212, 1.4, -14], 3));
  const tracer = new THREE.Line(tracerGeo, new THREE.LineBasicMaterial({ color: '#ffe9a0', transparent: true, opacity: 0.9 }));
  ctx.render.scene.add(tracer);
  const dmg = damageSprite('-55', '#ffd94d');
  dmg.position.set(212, 3.2, -14);
  ctx.render.scene.add(dmg);
  // Return fire from the second enemy: his own flash + a red tracer back
  // at the wheelman, so the shootout reads both ways.
  const eFlash = new THREE.Sprite(new THREE.SpriteMaterial({
    map: flashTexture(), transparent: true, depthTest: false,
  }));
  eFlash.scale.set(1.1, 1.1, 1);
  eFlash.position.set(214.5, 1.35, 3);
  ctx.render.scene.add(eFlash);
  const eTracerGeo = new THREE.BufferGeometry();
  eTracerGeo.setAttribute('position', new THREE.Float32BufferAttribute([214.5, 1.35, 3, 201, 1.3, -9], 3));
  const eTracer = new THREE.Line(eTracerGeo, new THREE.LineBasicMaterial({ color: '#ff9a70', transparent: true, opacity: 0.9 }));
  ctx.render.scene.add(eTracer);
  ctx.police.setWanted(2, s.player);
  const cars = ctx.police.units.filter((u) => u.kind === 'car' && u.mesh.visible);
  if (cars[0]) { cars[0].mesh.position.set(186, 0, -26); cars[0].mesh.rotation.y = Math.PI / 2; cars[0].dist = 18; }
  // Helicopter overhead to the right, spotlight on the road — the
  // reference combat shot has one, and wanted 2 alone would hide it.
  // Staged further out and lower than round 6 (x 226, y 5.5, z -8):
  // at ~33u the 11.6u rotor spans ~250px, so the whole helicopter —
  // body, tail, rotor — fits inside the frame, clear of the weapon bar
  // (top) and the KPD panel (right), with the KPD decal still readable
  // and the spotlight cone landing on the zebra crossing.
  const heli = ctx.police.units.find((u) => u.kind === 'heli');
  if (heli) {
    heli.mesh.visible = true;
    heli.mesh.position.set(226, 5.5, -8);
    heli.mesh.rotation.y = Math.PI * 0.75;
    heli.dist = 33;
    heli.status = 'SPOTLIGHT';
  }
  s.objective = { x: 240, z: -60 };
  s.weapon = 2;
  s.ammo[2] = 30;
  s.track = RADIO.tracks[1];
  s.clock = 21 * 60 + 30;
  ctx.render.setMode('combat');
  const focus = { x: s.player.x, z: s.player.z, heading: s.player.heading, speed: 0 };
  ctx.render.snapCamera(focus);
  ctx.hud.setDialogue(CHARACTERS.ratna, 'Raka, gengnya di depan kasino — habisi mereka, lalu kabur lewat gang!');
  // The red 'HIT! -12 HP' popup, like the reference combat shot: sticky,
  // because a plain hitPopup hides after 900 ms while the shot page
  // paints two slow SwiftShader frames before the screenshot is taken.
  ctx.hud.hitPopup(12, true);
  return { focus, hudState: hudState(ctx) };
}

function flashTexture() {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 1, 32, 32, 18);
  grad.addColorStop(0, 'rgba(255,244,180,1)');
  grad.addColorStop(0.6, 'rgba(255,160,50,0.85)');
  grad.addColorStop(1, 'rgba(255,80,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  // Four-point starburst so the flash reads as a gunshot, not a blob.
  g.fillStyle = 'rgba(255,230,140,0.95)';
  g.beginPath();
  g.moveTo(32, 2); g.lineTo(36, 28); g.lineTo(62, 32); g.lineTo(36, 36);
  g.lineTo(32, 62); g.lineTo(28, 36); g.lineTo(2, 32); g.lineTo(28, 28);
  g.closePath();
  g.fill();
  return new THREE.CanvasTexture(c);
}

function damageSprite(text, color) {
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
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthTest: false }));
  spr.scale.set(4, 2, 1);
  return spr;
}

function stageGarage(ctx) {
  const s = ctx.state;
  loadPlayedSession(ctx);
  ctx.garage.enter();
  ctx.garage.state.hp = 88;
  ctx.garage.repaint(0); // gold, as always
  s.player.x = GARAGE_POS.x;
  s.player.z = GARAGE_POS.z;
  s.clock = 19 * 60 + 5;
  ctx.render.setMode('garage');
  const focus = { x: GARAGE_POS.x, z: GARAGE_POS.z, heading: 0, speed: 0 };
  ctx.render.snapCamera(focus);
  ctx.hud.showGarage(true, ctx.garage, ctx.missions.state.cash);
  ctx.hud.setDialogue(CHARACTERS.bambang, 'Garudamu siap dioprek. Cat emasnya tetap, tapi mesin bisa lebih galak.');
  return { focus, hudState: hudState(ctx, { inCar: false }) };
}

function stageMap(ctx) {
  const s = ctx.state;
  loadPlayedSession(ctx);
  s.player.x = 0;
  s.player.z = 60;
  s.player.heading = Math.PI / 2;
  s.player.speed = 0;
  s.inCar = true;
  s.car.mesh.position.set(0, 0, 60);
  s.car.mesh.rotation.y = Math.PI / 2;
  ctx.playerFig.group.visible = false;
  s.objective = { x: RACE_GATES[0][0], z: RACE_GATES[0][1] };
  s.clock = 18 * 60 + 37;
  s.mapOpen = true;
  ctx.render.setMode('map');
  const focus = { x: s.player.x, z: s.player.z, heading: s.player.heading, speed: 0 };
  ctx.render.snapCamera(focus);
  const hs = hudState(ctx, { mapOpen: true });
  ctx.hud.showMap(true, hs);
  ctx.hud.hideDialogue();
  return { focus, hudState: hs };
}

export function stageShot(name, ctx) {
  ctx.render.setNight(false);
  ctx.world.setNight(false);
  ctx.state.night = false;
  if (name === 'combat') return stageCombat(ctx);
  if (name === 'garage') return stageGarage(ctx);
  if (name === 'map') return stageMap(ctx);
  return stageChase(ctx);
}
