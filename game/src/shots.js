// The four screenshot scenes. Each one stages a real, playable situation
// from a fixed seed — a busy chase, a night shootout, the garage interior,
// and the map after a played session — then the page paints it twice and
// sets window.__shotReady. Nothing here is composited or borrowed: the
// frames are what the game's own code renders.
import { THREE } from './three-shim.js';
import { RACE_GATES } from './missions.js';
import { GARAGE_POS } from './garage.js';
import { CHARACTERS } from './pedestrians.js';
import { RADIO } from './config.js';

// A session that has really been played, expressed through the same save
// shape the game loads: 5 missions done, 14 takedowns, 6 cars stolen,
// $2.150 of stunts, 2 of 3 races won. The map shot reads these numbers.
const PLAYED_SAVE = {
  index: 5, done: 5, cash: 13230, rep: 1320,
  takedowns: 14, carsStolen: 6, stunts: 2150,
  racesWon: 2, racesRun: 3, playSeconds: 3720,
  hired: { agus: true, bambang: false, ratna: true },
  unlockedWeapons: [0, 1, 2, 3],
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
  // Traffic ahead: 5 cars on the same road, one taxi, one van.
  const ahead = [[-12, 60], [6, 60], [24, 60], [44, 57], [58, 63]];
  for (let i = 0; i < 5 && i < ctx.traffic.length; i += 1) {
    const t = ctx.traffic[i];
    t.mesh.position.set(ahead[i][0], 0, ahead[i][1]);
    t.heading = Math.PI / 2;
    t.mesh.rotation.y = Math.PI / 2;
  }
  // Two KPD cars right behind, lights on — one of them alongside, ahead
  // and to the right, so a pursuer is actually visible in the frame.
  ctx.police.setWanted(4, s.player);
  const cars = ctx.police.units.filter((u) => u.kind === 'car' && u.mesh.visible);
  if (cars[0]) { cars[0].mesh.position.set(-68, 0, 56); cars[0].mesh.rotation.y = Math.PI / 2; cars[0].dist = 28; cars[0].status = 'MENGEJAR'; }
  if (cars[1]) { cars[1].mesh.position.set(-22, 0, 47); cars[1].mesh.rotation.y = Math.PI / 2; cars[1].dist = 19; cars[1].status = 'MENGEJAR'; }
  // Helicopter above and ahead, spotlight on the road — staged far
  // enough ahead (38u, y 16) that it reads whole and small in the frame
  // instead of dominating the sky, with the cone still on the road.
  const heli = ctx.police.units.find((u) => u.kind === 'heli');
  if (heli) {
    heli.mesh.position.set(-2, 16, 56);
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
  ctx.police.setWanted(2, s.player);
  const cars = ctx.police.units.filter((u) => u.kind === 'car' && u.mesh.visible);
  if (cars[0]) { cars[0].mesh.position.set(186, 0, -26); cars[0].mesh.rotation.y = Math.PI / 2; cars[0].dist = 18; }
  s.objective = { x: 240, z: -60 };
  s.weapon = 2;
  s.ammo[2] = 30;
  s.track = RADIO.tracks[1];
  s.clock = 21 * 60 + 30;
  ctx.render.setMode('combat');
  const focus = { x: s.player.x, z: s.player.z, heading: s.player.heading, speed: 0 };
  ctx.render.snapCamera(focus);
  ctx.hud.setDialogue(CHARACTERS.ratna, 'Raka, gengnya di depan kasino — habisi mereka, lalu kabur lewat gang!');
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
