// The four screenshot scenes. Each one stages a real, playable situation
// from a fixed seed — a busy noon chase, a NIGHT shootout, the garage
// interior, and the map after a played session — then the page paints it
// twice and sets window.__shotReady. Nothing here is composited or
// borrowed: the frames are what the game's own code renders. Round 20:
// chase 16:00 stays bright-blue noon, combat is NIGHT 23:40 now (big
// moon + huge heli spotlight cone, like the reference combat shot) —
// the combat shot was a night scene until round 14, golden hour 15-19.
import { THREE } from './three-shim.js';
import { RACE_GATES } from './missions.js';
import { GARAGE_POS } from './garage.js';
import { CHARACTERS } from './pedestrians.js';
import { buildBoxTruck, buildMotorcycle, buildScooter, buildStreetCar } from './vehicles.js';
import { CHASE_HOUR, COMBAT_HOUR, RADIO } from './config.js';

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
  // Round 19: an SUV in the traffic ahead (slot 2, centre-right), so
  // the new lofted SUV reads in the chase frame, not only in the
  // traffic rotation.
  swapTraffic(2, buildStreetCar('suv', '#c94b4b'));
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
  // Round 17: all FOUR KPD cars ahead, like the top-1 chase shot — the
  // other two sit further up the road (86/98), white with light bars,
  // closing the pursuit ahead of the traffic.
  ctx.police.setWanted(4, s.player);
  const cars = ctx.police.units.filter((u) => u.kind === 'car' && u.mesh.visible);
  if (cars[0]) { cars[0].mesh.position.set(-8, 0, 50); cars[0].mesh.rotation.y = Math.PI / 2; cars[0].dist = 28; cars[0].status = 'MENGEJAR'; }
  if (cars[1]) { cars[1].mesh.position.set(-18, 0, 56); cars[1].mesh.rotation.y = Math.PI / 2; cars[1].dist = 22; cars[1].status = 'MENGEJAR'; }
  if (cars[2]) { cars[2].mesh.position.set(86, 0, 57); cars[2].mesh.rotation.y = Math.PI / 2; cars[2].dist = 120; cars[2].status = 'MENGEJAR'; }
  if (cars[3]) { cars[3].mesh.position.set(98, 0, 63); cars[3].mesh.rotation.y = Math.PI / 2; cars[3].dist = 132; cars[3].status = 'MENGEJAR'; }
  // Helicopter above and ahead, spotlight on the road — staged low and
  // to the north side (round 15c: x -2, y 6.5, z 50 — over the road it
  // sat dead-centre in front of the gantry board; on the north side it
  // reads left-of-centre against the buildings, and the cone lands on
  // the north sidewalk by the road), clear of the weapon bar.
  // Round 17b: (-10, 8, 46) — at (-2, 6.5, 50) the palm at (0, 51) and
  // the gantry board's edge clipped it; higher + further west it reads
  // whole against the hotel towers instead of the bright sky.
  const heli = ctx.police.units.find((u) => u.kind === 'heli');
  if (heli) {
    // Round 19: BIGGER + CLOSER + HIGHER (was -10, 8, 46, scale 1) —
    // at 8u the heli sat on the horizon line against the buildings and
    // read as a dark speck; at (-14, 11, 48) scaled 1.35 it sits ~12°
    // above the horizon against the SKY, and the rotor blur disc reads.
    heli.mesh.position.set(-14, 11, 48);
    heli.mesh.rotation.y = Math.PI;
    heli.mesh.scale.set(1.35, 1.35, 1.35);
    heli.dist = 34;
    heli.status = 'SPOTLIGHT';
    // Round 15: a pool of light on the asphalt under the heli, where
    // its spotlight cone lands — the cone alone is too faint to read
    // as a pool on the road from the chase camera. Round 16: 14u,
    // opacity 0.7 (was 13u / 0.55) — the pool must read as a lit patch
    // against the bright dusk asphalt, not a faint smudge.
    const pool = new THREE.Mesh(
      new THREE.PlaneGeometry(16, 16),
      new THREE.MeshBasicMaterial({ map: heliPoolTexture(), transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(-14, 0.09, 48);
    ctx.render.scene.add(pool);
  }
  // Pedestrians on the sidewalks (round 15: a crowd, not 3 figures —
  // 14 peds on both sidewalks, so neither side of the frame is empty).
  const pedSpots = [[-52, 49], [-34, 71], [-28, 71], [-24, 49], [-20, 49], [-4, 71], [8, 49], [22, 71], [34, 49], [46, 71], [58, 49], [68, 71], [-58, 71], [76, 49]];
  for (let i = 0; i < pedSpots.length && i < ctx.peds.length; i += 1) {
    ctx.peds[i].x = pedSpots[i][0];
    ctx.peds[i].z = pedSpots[i][1];
    ctx.peds[i].fig.group.position.set(pedSpots[i][0], 0, pedSpots[i][1]);
    ctx.peds[i].fig.group.rotation.y = (i * 1.3) % (Math.PI * 2);
  }
  // Round 17 (top-1 recipe): a pink scooter + rider on the right
  // sidewalk (z 71, the camera's right), riding east past the chase,
  // plus two parked scooters further up the same sidewalk.
  // Round 17b: (-32, 71) — at (-24, 71) the scooter was a 10px pink
  // dot 55u from the camera; 8u closer it reads as a rider, not a speck.
  const scooter = buildScooter('#ff9ec7');
  scooter.position.set(-32, 0, 71);
  scooter.rotation.y = Math.PI / 2;
  ctx.render.scene.add(scooter);
  for (const [sx, sz, rot] of [[40, 71, Math.PI / 2], [55, 49, -Math.PI / 2]]) {
    const parked = buildScooter(sx === 40 ? '#2ec4b6' : '#ffd166');
    // Parked scooters have no rider — take the rider out of the group.
    parked.remove(parked.children[parked.children.length - 1]);
    parked.position.set(sx, 0, sz);
    parked.rotation.y = rot;
    ctx.render.scene.add(parked);
  }
  // Mission 6 objective: the race start at Pantai Kidul.
  s.objective = { x: RACE_GATES[0][0], z: RACE_GATES[0][1] };
  s.weapon = 2;
  s.track = RADIO.tracks[0];
  s.clock = CHASE_HOUR * 60; // Round 17: bright-blue 16:00 (was 17:45 golden hour)
  ctx.render.setTimeOfDay(CHASE_HOUR);
  ctx.render.setMode('chase');
  const focus = { x: s.player.x, z: s.player.z, heading: s.player.heading, speed: s.player.speed };
  ctx.render.snapCamera(focus);
  ctx.hud.hideDialogue(); // the dialogue bar must never cover the car
  // Round 15: a district title card at the top of the frame, like the
  // top-10 title cards — it takes the slot the version stamp used to
  // occupy (the stamp is gone in round 15).
  ctx.hud.showDistrictCard('PANTAI KIDUL', 'BALAPAN SENJA · 16:00');
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
  // Round 20: NIGHT combat (23:40), like the reference combat shot —
  // a dark sky, a BIG moon, lit windows, and the heli's spotlight cone
  // HUGE overhead. stageShot() cleared night first; this turns it back
  // on for this shot only. The rain streaks come with world.setNight
  // (the old night shot had them too).
  s.night = true;
  // Lorong Emas, outside the casino: the wheelman on foot, mid-shootout.
  s.player.x = 200;
  s.player.z = -10;
  s.player.heading = Math.PI / 2;
  s.player.speed = 0;
  s.inCar = false;
  // Round 20: the gold Garuda parks at the right of the frame, side
  // profile (nose south, toward the camera's right), like the red car
  // in the reference combat shot — it used to sit west of the player,
  // behind the combat camera, invisible. Round 20b: (215, -3), not
  // (218, 6) — the first spot sat 40° right of the camera axis and
  // was cut off by the frame edge / KPD panel. Clear of the planter
  // (215, 3) by 3u, of the van (210, 4) by 1.1u, of the barrier
  // (217, -8.5) by 2.5u and of the enemies by 5u.
  s.car.mesh.position.set(215, 0, -3);
  s.car.mesh.rotation.y = 0;
  ctx.playerFig.group.visible = true;
  ctx.playerFig.group.position.set(200, 0, -10);
  ctx.playerFig.group.rotation.y = Math.PI / 2;
  // Round 15: the wheelman aims — both arms forward, like the top-10
  // shooting poses (the old staging left his arms hanging at his sides).
  ctx.playerFig.armR.rotation.x = -1.2;
  ctx.playerFig.armL.rotation.x = -1.2;
  // Three enemies ahead, close enough to read as a real threat. Round
  // 15c: closer still (was 12–16u, read as specks) — 9–13u, so faces,
  // red shirts and aiming poses read in the frame.
  ctx.spawnEnemies(226, -8, 3);
  const e0 = ctx.enemies[0];
  const e1 = ctx.enemies[1];
  if (e0) { e0.x = 209; e0.z = -13; e0.hp = 100; e0.fig.group.position.set(209, 0, -13); }
  if (e1) { e1.x = 208; e1.z = 0; e1.hp = 100; e1.fig.group.position.set(208, 0, 0); }
  if (ctx.enemies[2]) { ctx.enemies[2].x = 208; ctx.enemies[2].z = -17; ctx.enemies[2].hp = 100; ctx.enemies[2].fig.group.position.set(208, 0, -17); }
  // Round 15: the enemies face the wheelman and aim back at him —
  // facing + aiming pose, so the shootout reads both ways even before
  // the tracers. (spawnEnemies leaves random headings and hanging arms.)
  for (const e of ctx.enemies) {
    e.fig.group.rotation.y = Math.atan2(s.player.x - e.x, s.player.z - e.z);
    e.fig.armR.rotation.x = -1.2;
    e.fig.armL.rotation.x = -1.2;
  }
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
  // Round 16: fill the MIDDLE of the plaza — the round 15 shot still
  // read as an empty beige field between the shootout and the zebra.
  // Planters with bushes, a striped barrier and a second parked car,
  // all east of the enemies (x >= 213) or south of the zebra band
  // (z -15..-5 at x 222+), so none of them hides the wheelman, the
  // enemies or the tracer lines.
  const planterAt = (x, z) => {
    const p = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.6, 1.5), propMat('#7a6a55'));
    p.position.set(x, 0.3, z);
    p.castShadow = true;
    ctx.render.scene.add(p);
    const bush = new THREE.Mesh(new THREE.SphereGeometry(0.75, 10, 8), propMat('#3d8a4b'));
    bush.position.set(x, 1.0, z);
    bush.scale.y = 0.8;
    bush.castShadow = true;
    ctx.render.scene.add(bush);
  };
  planterAt(215, -20);
  planterAt(215, 3);
  // Round 19: warm the middle of the plaza — a FLOWER planter (the
  // round-16 planters are green blobs on brown dirt; blooms break the
  // brown field with colour), a wooden bench and a lamp post, all east
  // of x 213 so none of them hides the wheelman, the enemies or the
  // tracer lines. The forecourt pavement itself is in world.js.
  const flowerPlanterAt = (x, z) => {
    planterAt(x, z);
    const blooms = ['#e84a5f', '#ffd94d', '#f2f2f2', '#ff8a3d', '#c94b8a'];
    for (let i = 0; i < 5; i += 1) {
      const b = new THREE.Mesh(
        new THREE.SphereGeometry(0.16, 8, 6),
        new THREE.MeshStandardMaterial({ color: blooms[i], roughness: 0.7 }),
      );
      b.position.set(x - 0.5 + (i % 3) * 0.5, 1.45, z - 0.4 + Math.floor(i / 3) * 0.7);
      ctx.render.scene.add(b);
    }
  };
  flowerPlanterAt(214, -14);
  const benchSeat = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.12, 0.5), propMat('#8a6b3d'));
  benchSeat.position.set(219, 0.5, -2);
  benchSeat.rotation.y = 0.3;
  benchSeat.castShadow = true;
  ctx.render.scene.add(benchSeat);
  const benchBack = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.5, 0.1), propMat('#8a6b3d'));
  benchBack.position.set(219.1, 0.85, -2.25);
  benchBack.rotation.y = 0.3;
  ctx.render.scene.add(benchBack);
  for (const bx of [-0.7, 0.7]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.5, 0.45), propMat('#2a2a33'));
    leg.position.set(219 + bx * Math.cos(0.3), 0.25, -2 - bx * Math.sin(0.3));
    ctx.render.scene.add(leg);
  }
  const lampPole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3.2, 8), propMat('#2a2a33'));
  lampPole.position.set(220, 1.6, -24);
  ctx.render.scene.add(lampPole);
  const lampHead = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 10, 8),
    new THREE.MeshBasicMaterial({ color: '#fff8d0' }),
  );
  lampHead.position.set(220, 3.3, -24);
  ctx.render.scene.add(lampHead);
  const barrier = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.8, 0.4), propMat('#b8b0a0'));
  barrier.position.set(217, 0.4, -8.5);
  barrier.rotation.y = 0.3;
  barrier.castShadow = true;
  ctx.render.scene.add(barrier);
  const barrierStripe = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.14, 0.42), propMat('#e87a1a'));
  barrierStripe.position.set(217, 0.78, -8.5);
  barrierStripe.rotation.y = 0.3;
  ctx.render.scene.add(barrierStripe);
  const parked2 = buildStreetCar('hatchback', '#2b6fd0');
  parked2.position.set(224, 0, -27);
  parked2.rotation.y = Math.PI / 2;
  ctx.render.scene.add(parked2);
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
  // covered the whole character. Round 16: flash 2.0u (was 1.4) + a real
  // beam cylinder — the 1px tracer line was nearly invisible against the
  // bright plaza, so the shootout read as silent from the rear camera.
  const flash = new THREE.Sprite(new THREE.SpriteMaterial({
    map: flashTexture(), transparent: true, depthTest: false,
  }));
  flash.scale.set(2.0, 2.0, 1);
  flash.position.set(201.2, 1.35, -9);
  ctx.render.scene.add(flash);
  const tracerGeo = new THREE.BufferGeometry();
  tracerGeo.setAttribute('position', new THREE.Float32BufferAttribute([201.2, 1.35, -9, 209, 1.4, -13], 3));
  const tracer = new THREE.Line(tracerGeo, new THREE.LineBasicMaterial({ color: '#ffe9a0', transparent: true, opacity: 0.9 }));
  ctx.render.scene.add(tracer);
  ctx.render.scene.add(beam([201.2, 1.35, -9], [209, 1.4, -13], '#ffe9a0', 0.05));
  // Round 16: the damage number moved up + toward the camera-side
  // (was 209, 3.2, -13) — at (209, 3.2, -13) it sat directly over the
  // big STOP sign at the forecourt crossing and the two overlapped.
  const dmg = damageSprite('-55', '#ffd94d');
  dmg.position.set(208.5, 4.6, -10.5);
  ctx.render.scene.add(dmg);
  // Return fire from the second enemy: his own flash + a red tracer back
  // at the wheelman, so the shootout reads both ways. Round 15c: the
  // flash sits at the second enemy's gun (208, 0) — he moved closer.
  // Round 16: flash 1.7u (was 1.1) + a red beam, same readability fix.
  const eFlash = new THREE.Sprite(new THREE.SpriteMaterial({
    map: flashTexture(), transparent: true, depthTest: false,
  }));
  eFlash.scale.set(1.7, 1.7, 1);
  eFlash.position.set(207.3, 1.35, -0.7);
  ctx.render.scene.add(eFlash);
  const eTracerGeo = new THREE.BufferGeometry();
  eTracerGeo.setAttribute('position', new THREE.Float32BufferAttribute([207.3, 1.35, -0.7, 201, 1.3, -9], 3));
  const eTracer = new THREE.Line(eTracerGeo, new THREE.LineBasicMaterial({ color: '#ff9a70', transparent: true, opacity: 0.9 }));
  ctx.render.scene.add(eTracer);
  ctx.render.scene.add(beam([207.3, 1.35, -0.7], [201, 1.3, -9], '#ff9a70', 0.05));
  // Round 16: a red glow pool under each enemy — from the rear camera
  // their faces + hair are small, so each shooter gets a ground marker
  // that reads as a threat even at 9-13u.
  const markerTex = enemyMarkerTexture();
  for (const e of ctx.enemies) {
    const marker = new THREE.Mesh(
      new THREE.PlaneGeometry(2.4, 2.4),
      new THREE.MeshBasicMaterial({ map: markerTex, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    marker.rotation.x = -Math.PI / 2;
    marker.position.set(e.x, 0.06, e.z);
    ctx.render.scene.add(marker);
  }
  ctx.police.setWanted(2, s.player);
  const cars = ctx.police.units.filter((u) => u.kind === 'car' && u.mesh.visible);
  // Round 18: the police car must READ in the frame — at (186, -26) it
  // sat west of the player, behind the combat camera, invisible. Now it
  // parks east of the enemies, left of frame, clear of the planter at
  // (215, -20), the crates (x <= 208) and the tracer line. Round 18d:
  // (212, -22) — the (217, -21) spot sat right beside the planter bush
  // at (215, -20), which hid the car's nose.
  if (cars[0]) { cars[0].mesh.position.set(212, 0, -22); cars[0].mesh.rotation.y = Math.PI / 2; cars[0].dist = 18; }
  // Round 18: a tall white VAN in the frame too (right of frame, east of
  // the enemies, north of the zebra band) — the old shot had no van
  // anywhere near the camera, only a far hatchback + a far sedan.
  // Round 18d: (210, 4) — the (213, 6) spot sat at the frame's right
  // edge, half cut off; 3u closer + 2u south it reads whole, clear of
  // the planter at (215, 3) and of enemy e1 at (208, 0).
  const combatVan = buildStreetCar('van', '#e8e8e8');
  combatVan.position.set(210, 0, 4);
  combatVan.rotation.y = Math.PI / 2;
  ctx.render.scene.add(combatVan);
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
    // Round 15b: up + east (was 226, 5.5, -8) — the first round 15
    // position put the heli dead-centre, its cone whiting out the
    // enemies. Now it sits top-right, its cone landing east of the
    // shootout, clear of the CASINO sign and the KPD panel.
    heli.mesh.position.set(238, 10, -12);
    heli.mesh.rotation.y = Math.PI * 0.75;
    heli.dist = 38;
    heli.status = 'SPOTLIGHT';
    // Round 20: the spotlight cone is HUGE at night (1.5x wide, 1.25x
    // long, opacity 0.5) — the reference combat shot's cone dominates
    // the frame, and the old 0.35 cone was a faint streak. The cone
    // mesh lives on the heli (userData.cone); this only scales the
    // staged one, the chase heli is untouched.
    const cone = heli.mesh.userData.cone;
    if (cone) {
      cone.scale.set(1.5, 1.25, 1.5);
      cone.material.opacity = 0.5;
    }
    // Round 15: a pool of light on the plaza under the heli, where its
    // cone lands — the second light source the dark plaza was missing.
    // Round 16: 14u, opacity 0.7 (was 11u / 0.5) — same reason as chase.
    const cPool = new THREE.Mesh(
      new THREE.PlaneGeometry(14, 14),
      new THREE.MeshBasicMaterial({ map: heliPoolTexture(), transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    cPool.rotation.x = -Math.PI / 2;
    cPool.position.set(238, 0.09, -12);
    ctx.render.scene.add(cPool);
  }
  // Round 15: bystanders on the casino forecourt sidewalks + a parked
  // car, so the plaza is a street with people, not an empty field.
  const combatPeds = [[196, -22], [206, 2], [222, -24], [230, 4]];
  for (let i = 0; i < combatPeds.length && 12 + i < ctx.peds.length; i += 1) {
    const p = ctx.peds[12 + i];
    p.x = combatPeds[i][0];
    p.z = combatPeds[i][1];
    p.fig.group.position.set(combatPeds[i][0], 0, combatPeds[i][1]);
    p.fig.group.rotation.y = (i * 1.7) % (Math.PI * 2);
  }
  const parked = buildStreetCar('sedan', '#3d8a4b');
  parked.position.set(234, 0, -24);
  parked.rotation.y = Math.PI / 2;
  ctx.render.scene.add(parked);
  s.objective = { x: 240, z: -60 };
  s.weapon = 2;
  s.ammo[2] = 30;
  s.track = RADIO.tracks[1];
  s.clock = COMBAT_HOUR * 60; // Round 20: NIGHT 23:40 (was 18:15 golden hour)
  // Round 20: the night sky comes from render/world setNight (dark sky
  // + big moon + rain streaks), not the day table — the old golden-hour
  // call below is gone.
  ctx.render.setNight(true);
  ctx.world.setNight(true);
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

/** A visible tracer beam between two points (round 16): a thin glowing
 * cylinder, additive — a 1px LineBasicMaterial line is nearly invisible
 * at screenshot distance against the bright plaza, and the shootout
 * read as silent. The old line is kept underneath for crispness. */
function beam(from, to, color, radius = 0.05) {
  const a = new THREE.Vector3(from[0], from[1], from[2]);
  const b = new THREE.Vector3(to[0], to[1], to[2]);
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const m = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, len, 6, 1, true),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  m.position.copy(a).addScaledVector(dir, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  return m;
}

/** A soft red pool under an enemy (round 16): a radial glow disc, so
 * each shooter reads as a marked figure in the bright plaza even from
 * behind, where faces and hair are small. */
function enemyMarkerTexture() {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 1, 32, 32, 30);
  grad.addColorStop(0, 'rgba(255,60,50,0.75)');
  grad.addColorStop(0.6, 'rgba(255,60,50,0.3)');
  grad.addColorStop(1, 'rgba(255,60,50,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

/** A soft radial light pool for the heli spotlight on the asphalt
 * (round 15): the cone lands in this pool, so the road reads lit. */
function heliPoolTexture() {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 2, 64, 64, 62);
  grad.addColorStop(0, 'rgba(255,242,176,0.85)');
  grad.addColorStop(0.55, 'rgba(255,230,150,0.4)');
  grad.addColorStop(1, 'rgba(255,230,150,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
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
  // Round 20: wanted 4 (so the map STATS read ★★★★☆ like the
  // reference map) + four KPD cars placed on the roads near the GPS
  // route, so the map's BLUE checkpoint dots are real unit positions
  // — the units spawn at (0,0,0) invisible by default, no dots at all
  // without this. setWanted(4) also shows the heli + a roadblock; the
  // heli is hidden again right after (it would sit at ground level at
  // the origin in the map backdrop), the roadblock at (60, 60) stays —
  // a police presence under the map veil.
  ctx.police.setWanted(4, s.player);
  const kpdSpots = [[-180, 60], [-60, 240], [60, 180], [120, 60]];
  const kpdCars = ctx.police.units.filter((u) => u.kind === 'car');
  kpdCars.forEach((u, i) => {
    if (!kpdSpots[i]) return;
    u.mesh.visible = true;
    u.mesh.position.set(kpdSpots[i][0], 0, kpdSpots[i][1]);
    u.mesh.rotation.y = Math.PI / 2;
    u.dist = Math.round(Math.hypot(kpdSpots[i][0] - s.player.x, kpdSpots[i][1] - s.player.z));
    u.status = 'MENCARI';
  });
  const mapHeli = ctx.police.units.find((u) => u.kind === 'heli');
  if (mapHeli) mapHeli.mesh.visible = false;
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
