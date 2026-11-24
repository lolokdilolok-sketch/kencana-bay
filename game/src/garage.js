// Round 23 reseal — garage staging: neon sign smaller + moved west so the whole "BENGKEL BAMBANG" fits in frame, GARUDA GT poster moved west + up clear of the car, warm headlight pool on the floor ahead of the lift; this line is written in the round 23 reseal recorded session (01a20c1f-b578-7008-8695-0658c39f79a9).
// Round 20: no logic change — the garage interior is untouched; the display cars just get the new round-20 wedge builder from vehicles.js; this line is written in the round 20 recorded session.
// Round 17: no logic change — the garage interior keeps the round 16 fixes; the display cars just get the new clearcoat paint from vehicles.js; this line is written in the round 17 recorded session.
// The enterable garage: Bengkel Bambang. A real room in the same scene, far
// outside the city (x = -900), so the player and the Garuda teleport into it
// through the garage door. Inside: the Garuda on a hydraulic lift, tool
// benches with parts bins, a tall tool cabinet, a wall clock, a coiled air
// hose, tyre stacks, a neon sign, Bambang at his workbench — and the
// upgrade menu (repair / respray / engine tune / armour) with prices.
import { THREE, box, cylinder, canvasTexture } from './three-shim.js';
import { PAINTS, GARAGE_MENU } from './config.js';
import { buildMinifig, CHARACTERS, CROWD_DEFS } from './pedestrians.js';
import { buildSportsCar } from './vehicles.js';

export const GARAGE_POS = { x: -900, z: 0 };

/** Bright tiled concrete for the garage floor (round 15): light
 * warm-grey tiles with darker grout, so the floor reads as a real
 * workshop floor instead of one flat dark slab. */
function garageFloorTexture() {
  return canvasTexture(256, 256, (x, w, h) => {
    x.fillStyle = '#8a8a90';
    x.fillRect(0, 0, w, h);
    for (let r = 0; r < 4; r += 1) {
      for (let c = 0; c < 4; c += 1) {
        const v = 128 + ((r * 4 + c) % 3) * 8;
        x.fillStyle = `rgb(${v},${v},${v + 4})`;
        x.fillRect(c * 64 + 2, r * 64 + 2, 60, 60);
      }
    }
    x.strokeStyle = 'rgba(0,0,0,0.35)';
    x.lineWidth = 3;
    for (let i = 0; i <= 4; i += 1) {
      x.beginPath(); x.moveTo(0, i * 64); x.lineTo(w, i * 64); x.stroke();
      x.beginPath(); x.moveTo(i * 64, 0); x.lineTo(i * 64, h); x.stroke();
    }
    // A few faint stains, so the tiles are not showroom-clean.
    x.fillStyle = 'rgba(30,30,36,0.12)';
    for (let i = 0; i < 8; i += 1) {
      x.beginPath(); x.arc((i * 53) % w, (i * 89) % h, 12 + (i % 3) * 6, 0, Math.PI * 2); x.fill();
    }
  });
}

/** A soft radial glow for the hanging lamps (round 15): one texture for
 * the glow sprites and for the light pools on the floor under each lamp. */
function lampGlowTexture() {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 1, 32, 32, 30);
  grad.addColorStop(0, 'rgba(255,233,160,0.9)');
  grad.addColorStop(0.5, 'rgba(255,220,140,0.35)');
  grad.addColorStop(1, 'rgba(255,220,140,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

export function createGarage(scene) {
  const room = new THREE.Group();
  room.position.set(GARAGE_POS.x, 0, GARAGE_POS.z);
  const wallMat = new THREE.MeshStandardMaterial({ color: '#3a4a3a', roughness: 0.95 });
  // Round 15: a bright tiled floor (was flat dark #55565e) and a warm
  // mid-grey ceiling (was near-black #2a2a30), so the room reads lit
  // instead of dark above and empty below.
  const floorTex = garageFloorTexture();
  floorTex.wrapS = THREE.RepeatWrapping;
  floorTex.wrapT = THREE.RepeatWrapping;
  floorTex.repeat.set(5, 4);
  const floorMat = new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.55, metalness: 0.15 });
  // Floor, walls, ceiling.
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 22), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  room.add(floor);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(30, 22), new THREE.MeshStandardMaterial({ color: '#6a5f52', roughness: 1 }));
  ceil.rotation.x = Math.PI / 2;
  ceil.position.y = 8;
  room.add(ceil);
  // Round 16: a shadow-casting roof slab above the ceiling — the dusk
  // sun (low, from the north-west) shone straight through the ceiling
  // plane and blew the Garuda's up-facing hood white (sun + full
  // hemisphere + ambient ≈ 3.7x on the bonnet). The slab blocks the sun
  // so the room is lit by its lamps + hemisphere, like a real workshop;
  // it sits above the ceiling, so it is never visible from inside, and
  // the garage is 900u from the city, so it never shades the streets.
  // It is offset north-west (-18, -8): at the sun's low angle the rays
  // that hit the car cross y 8.4 about 13-18u north-west of it.
  const roofSlab = new THREE.Mesh(
    new THREE.BoxGeometry(30, 0.5, 22),
    new THREE.MeshStandardMaterial({ color: '#1c1c22', roughness: 1 }),
  );
  roofSlab.position.set(-18, 8.4, -8);
  roofSlab.castShadow = true;
  room.add(roofSlab);
  // Round 15: ceiling light panels — bright emissive rectangles, so the
  // ceiling reads as a lit workshop ceiling instead of a black void.
  // Round 16: emissive 0.7 (was 0.9) — the panels + lamps washed the
  // Garuda's gold hood white in the shot.
  for (const px of [-8, 0, 8]) {
    const panel = new THREE.Mesh(
      new THREE.BoxGeometry(4, 0.12, 1.2),
      new THREE.MeshStandardMaterial({ color: '#f2f2f2', emissive: 0xffffff, emissiveIntensity: 0.7, roughness: 0.4 }),
    );
    panel.position.set(px, 7.9, 0);
    room.add(panel);
  }
  for (const [w, d, x, z] of [[30, 0.5, 0, -11], [30, 0.5, 0, 11], [0.5, 22, -15, 0], [0.5, 22, 15, 0]]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(w, 8, d), wallMat);
    wall.position.set(x, 4, z);
    wall.receiveShadow = true;
    room.add(wall);
  }
  // Big roller door on the south wall (the way in).
  const door = new THREE.Mesh(
    new THREE.BoxGeometry(8, 6, 0.3),
    new THREE.MeshStandardMaterial({ color: '#8a8f96', roughness: 0.5, metalness: 0.6 }),
  );
  door.position.set(0, 3, 10.9);
  room.add(door);
  // Neon sign.
  const signTex = canvasTexture(512, 128, (x, w, h) => {
    x.fillStyle = '#101018';
    x.fillRect(0, 0, w, h);
    x.fillStyle = '#7dff9a';
    x.font = 'bold 52px system-ui, sans-serif';
    x.textAlign = 'center';
    x.fillText('BENGKEL BAMBANG', w / 2, 82);
  });
  const sign = new THREE.Mesh(
    // Round 23: 6x1.5 at (-4.2, 6.1) — the round-16 8x2 sign at
    // (-2.5, 6.2) still ran past the right frame edge (the garage
    // camera looks diagonally across the room, so the north wall's
    // east end is ~54 deg off-axis) and the final "G" was cut. Two
    // units narrower + centred further west, the whole
    // "BENGKEL BAMBANG" sits inside the frame with margin.
    new THREE.PlaneGeometry(6, 1.5),
    new THREE.MeshStandardMaterial({ map: signTex, emissive: 0xffffff, emissiveMap: signTex, emissiveIntensity: 0.9, roughness: 0.6 }),
  );
  sign.position.set(-4.2, 6.1, -10.7);
  room.add(sign);
  // Hydraulic lift + the Garuda on it.
  const liftBase = box(3.4, 0.3, 7, '#333a44');
  liftBase.position.set(0, 0.15, 0);
  room.add(liftBase);
  const liftPost = box(1.2, 1.0, 1.2, '#c9a227', { metal: 0.6, rough: 0.4 });
  liftPost.position.set(0, 0.8, 0);
  room.add(liftPost);
  const liftPad = box(3.2, 0.25, 6.4, '#c9a227', { metal: 0.6, rough: 0.4 });
  liftPad.position.set(0, 1.35, 0);
  room.add(liftPad);
  // Round 15: the Garuda sits front-three-quarter to the garage camera
  // (was rotation -0.5, side-on and small) and its headlight ground
  // pools are off — they would float above the floor under the lifted car.
  const displayCar = buildSportsCar('#ffb400', { driver: true, groundPool: false });
  displayCar.position.set(0, 1.5, 0);
  displayCar.rotation.y = 0.6;
  // Round 16: the display car is matte, not glossy (metal 0 / rough 0.9,
  // was 0.55 / 0.25) — under the garage's overhead lamps + the dusk sun
  // shining through the roof, the glossy hood threw a broad white
  // specular sheen across the whole bonnet. The matte finish reads as
  // gold paint, like the roof panels (same recipe). The chase car keeps
  // its showroom gloss (separate mesh).
  displayCar.userData.bodyMat.metalness = 0;
  displayCar.userData.bodyMat.roughness = 0.9;
  room.add(displayCar);
  // Round 23: a warm pool of headlight on the floor ahead of the
  // lift — the rebuilt headlights (vehicles.js) now glow, and the
  // beam lands here: the Garuda's nose points south-east
  // (rotation 0.6), so the pool sits at (2.6, 4.3), 2.5u ahead of
  // the nose tip, clear of the lift pad, the bay lines and the mat.
  // It sells the lamps as ON, not just bright boxes.
  const headPool = new THREE.Mesh(
    new THREE.PlaneGeometry(4.5, 4.5),
    new THREE.MeshBasicMaterial({ map: lampGlowTexture(), transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  headPool.rotation.x = -Math.PI / 2;
  headPool.position.set(2.6, 0.03, 4.3);
  room.add(headPool);
  // A second car in the back (customer's sedan, red).
  const backCar = buildSportsCar('#d21f2b', { driver: false, length: 4.9, width: 2.1, groundPool: false });
  backCar.position.set(-10, 0, -6);
  backCar.rotation.y = 0.7;
  room.add(backCar);
  // Tool benches along the north wall.
  for (const bx of [-11, 11]) {
    const bench = box(5, 1.0, 1.6, '#6b4a2b');
    bench.position.set(bx, 0.5, -9.6);
    room.add(bench);
    for (let i = 0; i < 5; i += 1) {
      const tool = box(0.5, 0.3, 0.3, ['#c94b4b', '#2b6fd0', '#e8a33d', '#888888', '#3d8a4b'][i]);
      tool.position.set(bx - 1.8 + i * 0.9, 1.15, -9.6);
      room.add(tool);
    }
    const peg = box(5, 2.4, 0.15, '#4a3a2a');
    peg.position.set(bx, 2.6, -10.8);
    room.add(peg);
  }
  // Parts bins on the right bench, behind the hand tools.
  for (let i = 0; i < 3; i += 1) {
    const bin = box(0.55, 0.35, 0.4, ['#c94b4b', '#2b6fd0', '#e8a33d'][i]);
    bin.position.set(9.4 + i * 0.9, 1.18, -10.15);
    room.add(bin);
    const parts = box(0.45, 0.06, 0.3, '#333333');
    parts.position.set(9.4 + i * 0.9, 1.38, -10.15);
    room.add(parts);
  }
  // Tall tool cabinet on the north wall, between the benches, with
  // drawers; and a wall clock above it, below the neon sign.
  const cabinet = new THREE.Group();
  const cabBody = box(2.2, 2.6, 0.8, '#8a2b2b', { metal: 0.3, rough: 0.5 });
  cabBody.position.y = 1.3;
  cabinet.add(cabBody);
  for (let i = 0; i < 4; i += 1) {
    const drawer = box(1.9, 0.45, 0.06, '#e8e8e8', { metal: 0.4, rough: 0.4 });
    drawer.position.set(0, 0.45 + i * 0.6, 0.43);
    cabinet.add(drawer);
    const pull = box(0.5, 0.05, 0.04, '#333333');
    pull.position.set(0, 0.45 + i * 0.6, 0.47);
    cabinet.add(pull);
  }
  cabinet.position.set(-3.5, 0, -10.3);
  room.add(cabinet);
  const clock = new THREE.Group();
  const clockFace = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.5, 0.08, 24),
    new THREE.MeshStandardMaterial({ color: '#f2f2f2', roughness: 0.4 }),
  );
  clockFace.rotation.x = Math.PI / 2;
  clock.add(clockFace);
  const clockRim = new THREE.Mesh(
    new THREE.TorusGeometry(0.5, 0.05, 8, 24),
    new THREE.MeshStandardMaterial({ color: '#1c1c1c', roughness: 0.5 }),
  );
  clock.add(clockRim);
  const hourHand = box(0.05, 0.28, 0.02, '#1c1c1c');
  hourHand.position.set(0.06, 0.12, 0.06);
  hourHand.rotation.z = -0.9;
  clock.add(hourHand);
  const minHand = box(0.04, 0.4, 0.02, '#1c1c1c');
  minHand.position.set(-0.05, 0.16, 0.06);
  minHand.rotation.z = 0.5;
  clock.add(minHand);
  clock.position.set(-2.2, 4.3, -10.65);
  room.add(clock);
  // Tyre stacks.
  for (const [tx, tz, n] of [[12.5, -8, 4], [12.5, 8, 3], [-12.5, 8, 3]]) {
    for (let i = 0; i < n; i += 1) {
      const tyre = new THREE.Mesh(
        new THREE.TorusGeometry(0.55, 0.22, 8, 16),
        new THREE.MeshStandardMaterial({ color: '#141414', roughness: 0.95 }),
      );
      tyre.rotation.x = Math.PI / 2;
      tyre.position.set(tx, 0.25 + i * 0.45, tz);
      tyre.castShadow = true;
      room.add(tyre);
    }
  }
  // Round 22: two POSTERS on the north wall, so the upper wall stops
  // reading as empty green — a gold GARUDA GT poster left of the
  // neon sign and a red TUNE UP poster right of it, both above the
  // benches/shelf and clear of the clock (0, 4.4) and the sign itself.
  const posterTexture = (title, sub, bg, fg) => canvasTexture(256, 320, (x, w, h) => {
    x.fillStyle = bg;
    x.fillRect(0, 0, w, h);
    x.strokeStyle = fg;
    x.lineWidth = 8;
    x.strokeRect(6, 6, w - 12, h - 12);
    x.fillStyle = fg;
    x.font = 'bold 44px system-ui, sans-serif';
    x.textAlign = 'center';
    x.fillText(title, w / 2, 90);
    x.font = 'bold 22px system-ui, sans-serif';
    x.fillText(sub, w / 2, 130);
    x.fillStyle = 'rgba(255,255,255,0.85)';
    x.fillRect(28, 170, w - 56, 90);
    x.fillStyle = '#1c1c1c';
    x.font = 'bold 18px system-ui, sans-serif';
    x.fillText('BENGKEL BAMBANG', w / 2, 200);
    x.fillText('SEJAK 1998', w / 2, 226);
  });
  // Round 23: the GARUDA GT poster moves to the EAST end of the
  // north wall (0.9, 5.0, 1.8x1.9) — at (-6.8, 4.2) its right half
  // hid behind the Garuda's tail, and at (-9.5, 4.9) only its top
  // corner peeked over the roof: every sightline to the west wall
  // crosses the car's roof, so a poster there can never read whole.
  // East of x -3.5 the sightline passes east of the car entirely,
  // so this spot reads whole, clear of the sign (ends x -1.2), the
  // clock (moved west, below) and the shelf (top 2.6, poster bottom
  // 4.05). The clock moves to (-2.2, 4.3) to make room.
  for (const [px, py, pw, ph, tex] of [
    [0.9, 5.0, 1.8, 1.9, posterTexture('GARUDA GT', 'EMAS KENCANA', '#c9a227', '#1c1c1c')],
    [6.5, 4.2, 3.0, 3.75, posterTexture('TUNE UP', 'MESIN · CAT · ARMOUR', '#8a2b2b', '#f2f2f2')],
  ]) {
    const poster = new THREE.Mesh(
      new THREE.PlaneGeometry(pw, ph),
      new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 }),
    );
    poster.position.set(px, py, -10.7);
    room.add(poster);
  }
  // Round 22: a second TOOL BOARD on the west wall (the first pegboard
  // is at z 5; this one is at z -3, behind the back car from the
  // camera but visible left of the lift) — board + wrenches + spanners
  // in a row, so the west wall is not one bare green slab.
  const board2 = box(0.15, 2.4, 4.5, '#4a3a2a', { rough: 0.9 });
  board2.position.set(-14.7, 3.2, -3);
  room.add(board2);
  for (let i = 0; i < 5; i += 1) {
    const tool = box(0.2, 0.55, 0.3, ['#c94b4b', '#2b6fd0', '#e8a33d', '#888888', '#3d8a4b'][i]);
    tool.position.set(-14.55, 2.6 + (i % 2) * 0.7, -4.6 + i * 0.85);
    room.add(tool);
  }
  // Hanging lamps.
  const glowTex = lampGlowTexture();
  for (const lx of [-6, 0, 6]) {
    const cord = cylinder(0.04, 0.04, 1.6, '#222222');
    cord.position.set(lx, 7.2, 0);
    room.add(cord);
    const lamp = new THREE.Mesh(
      new THREE.SphereGeometry(0.4, 10, 8),
      new THREE.MeshBasicMaterial({ color: '#ffe9a0' }),
    );
    lamp.position.set(lx, 6.3, 0);
    room.add(lamp);
    const shade = new THREE.Mesh(
      new THREE.ConeGeometry(0.7, 0.6, 12, 1, true),
      new THREE.MeshStandardMaterial({ color: '#2b6f4b', roughness: 0.6, side: THREE.DoubleSide }),
    );
    shade.position.set(lx, 6.6, 0);
    room.add(shade);
    // Round 15: each lamp is a real light — a warm PointLight + a glow
    // sprite + a pool on the floor, so the room is lit by its lamps and
    // the glow is visible in the shot, not just the bare bulb.
    // Round 16: intensity 1.0 (was 1.4), glow 2.2 (was 2.6), pool 0.3
    // (was 0.4) — the three lamps at 1.4 washed the Garuda's hood and
    // roof white in the shot; the room stays bright, the car keeps gold.
    const pl = new THREE.PointLight(0xffe9a0, 1.0, 22, 1);
    pl.position.set(lx, 6.0, 0);
    room.add(pl);
    const lampGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false }));
    lampGlow.scale.set(2.2, 2.2, 1);
    lampGlow.position.set(lx, 6.3, 0);
    room.add(lampGlow);
    const pool = new THREE.Mesh(
      new THREE.PlaneGeometry(7, 7),
      new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(lx, 0.03, 0);
    room.add(pool);
  }
  // Round 22: a SECOND row of hanging lamps over the north half of the
  // room (z -6) — the round-21 shot's north wall was lit only by the
  // ceiling panels, and the back car sat in gloom. Two lamps with glow
  // sprites + floor pools, and one shared PointLight between them (the
  // room already has three PointLights; a fourth shared one is enough).
  const pl2 = new THREE.PointLight(0xffe9a0, 0.8, 22, 1);
  pl2.position.set(0, 6.0, -6);
  room.add(pl2);
  for (const lx of [-6, 6]) {
    const cord = cylinder(0.04, 0.04, 1.6, '#222222');
    cord.position.set(lx, 7.2, -6);
    room.add(cord);
    const lamp = new THREE.Mesh(
      new THREE.SphereGeometry(0.4, 10, 8),
      new THREE.MeshBasicMaterial({ color: '#ffe9a0' }),
    );
    lamp.position.set(lx, 6.3, -6);
    room.add(lamp);
    const shade = new THREE.Mesh(
      new THREE.ConeGeometry(0.7, 0.6, 12, 1, true),
      new THREE.MeshStandardMaterial({ color: '#2b6f4b', roughness: 0.6, side: THREE.DoubleSide }),
    );
    shade.position.set(lx, 6.6, -6);
    room.add(shade);
    const lampGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false }));
    lampGlow.scale.set(2.2, 2.2, 1);
    lampGlow.position.set(lx, 6.3, -6);
    room.add(lampGlow);
    const pool = new THREE.Mesh(
      new THREE.PlaneGeometry(7, 7),
      new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(lx, 0.03, -6);
    room.add(pool);
  }
  // Round 22: more FLOOR props in the foreground south-east corner,
  // which read as empty tiles in the round-21 shot — a crate stack, an
  // oil drum and a loose wheel rim, all clear of the car, the lift,
  // the dialogue box and the garage panel. Round 22b: the first spots
  // (8.5, 7) / (10.5, 4.5) were BEHIND the garage camera (at 4.6,
  // 3.8, looking north-west), so the first render showed none of
  // them. Now they sit east of the lift, in the frame's foreground
  // right: (5.2, -0.5), (6.0, -1.2) and the drum at (6.8, 0.8).
  const gc1 = box(0.8, 0.8, 0.8, '#8a6b3d', { rough: 0.85 });
  gc1.position.set(5.2, 0.4, -0.5);
  gc1.rotation.y = 0.3;
  gc1.castShadow = true;
  room.add(gc1);
  const gc2 = box(0.6, 0.6, 0.6, '#6b4f2a', { rough: 0.85 });
  gc2.position.set(6.0, 0.3, -1.2);
  gc2.rotation.y = 0.7;
  gc2.castShadow = true;
  room.add(gc2);
  const gdrum = cylinder(0.45, 0.45, 1.1, '#2b6fd0', { metal: 0.4, rough: 0.5 });
  gdrum.position.set(6.8, 0.55, 0.8);
  gdrum.castShadow = true;
  room.add(gdrum);
  // Oil stains + floor markings.
  for (const [ox, oz] of [[-4, 4], [5, -5], [8, 5]]) {
    const stain = new THREE.Mesh(
      new THREE.CircleGeometry(1.4, 14),
      new THREE.MeshStandardMaterial({ color: '#1c1c22', roughness: 0.4, transparent: true, opacity: 0.7 }),
    );
    stain.rotation.x = -Math.PI / 2;
    stain.position.set(ox, 0.02, oz);
    room.add(stain);
  }
  // Painted yellow bay lines around the lift, so the work area reads.
  for (const [w, d, x, z] of [[5.4, 0.18, 0, 4.6], [5.4, 0.18, 0, -4.6], [0.18, 9.2, 2.7, 0], [0.18, 9.2, -2.7, 0]]) {
    const line = box(w, 0.02, d, '#e8d44d', { rough: 0.7 });
    line.position.set(x, 0.015, z);
    room.add(line);
  }
  // Two more oil stains, right by the lift where the work happens.
  for (const [ox, oz, r] of [[-2.2, 3.2, 0.9], [4.2, -3.4, 1.1]]) {
    const stain = new THREE.Mesh(
      new THREE.CircleGeometry(r, 14),
      new THREE.MeshStandardMaterial({ color: '#1c1c22', roughness: 0.4, transparent: true, opacity: 0.7 }),
    );
    stain.rotation.x = -Math.PI / 2;
    stain.position.set(ox, 0.02, oz);
    room.add(stain);
  }
  // Red rolling toolbox, foreground right — drawers facing the camera.
  const toolCart = new THREE.Group();
  const cartBody = box(1.5, 0.85, 0.7, '#c94b4b', { metal: 0.3, rough: 0.5 });
  cartBody.position.y = 0.62;
  toolCart.add(cartBody);
  for (let i = 0; i < 3; i += 1) {
    const drawer = box(1.34, 0.18, 0.06, '#e8e8e8', { metal: 0.4, rough: 0.4 });
    drawer.position.set(0, 0.35 + i * 0.26, 0.38);
    toolCart.add(drawer);
  }
  const cartHandle = box(1.5, 0.06, 0.06, '#333333');
  cartHandle.position.set(0, 1.1, -0.3);
  toolCart.add(cartHandle);
  for (const [wx, wz] of [[-0.6, -0.25], [0.6, -0.25], [-0.6, 0.25], [0.6, 0.25]]) {
    const wheel = cylinder(0.09, 0.09, 0.08, '#141414');
    wheel.rotation.x = Math.PI / 2;
    wheel.position.set(wx, 0.09, wz);
    toolCart.add(wheel);
  }
  toolCart.position.set(-7.5, 0, 4.8);
  toolCart.rotation.y = 0.9;
  room.add(toolCart);
  // Oil drums against the west wall.
  for (const [dx, dz, col] of [[-13.4, 1.6, '#2b6fd0'], [-13.4, 2.9, '#c94b4b']]) {
    const drum = cylinder(0.45, 0.45, 1.1, col, { metal: 0.4, rough: 0.5 });
    drum.position.set(dx, 0.55, dz);
    drum.castShadow = true;
    room.add(drum);
  }
  // Coiled air hose on the west wall, by the oil drums.
  const hose = new THREE.Mesh(
    new THREE.TorusGeometry(0.55, 0.09, 8, 20),
    new THREE.MeshStandardMaterial({ color: '#e8a33d', roughness: 0.7 }),
  );
  hose.rotation.y = Math.PI / 2;
  hose.position.set(-14.6, 2.4, -2);
  room.add(hose);
  const hoseNozzle = box(0.3, 0.12, 0.12, '#333333');
  hoseNozzle.position.set(-14.5, 1.75, -2);
  room.add(hoseNozzle);
  // Creeper board lying on the floor, foreground left.
  const creeper = box(1.7, 0.1, 0.65, '#7a2b2b', { rough: 0.8 });
  creeper.position.set(-3.2, 0.08, 3.6);
  creeper.rotation.y = 0.4;
  room.add(creeper);
  // Jack stands flanking the lift — low, so they never hide the car.
  for (const [jx, jz] of [[3.4, -2.2], [-3.4, -1.8]]) {
    const base = box(0.5, 0.12, 0.5, '#c9a227', { metal: 0.6, rough: 0.4 });
    base.position.set(jx, 0.06, jz);
    room.add(base);
    const post = cylinder(0.09, 0.12, 0.55, '#c9a227', { metal: 0.6, rough: 0.4 });
    post.position.set(jx, 0.4, jz);
    room.add(post);
  }
  // A loose spare tyre flat on the floor near the lift.
  const spare = new THREE.Mesh(
    new THREE.TorusGeometry(0.55, 0.22, 8, 16),
    new THREE.MeshStandardMaterial({ color: '#141414', roughness: 0.95 }),
  );
  spare.rotation.x = Math.PI / 2;
  spare.position.set(5.0, 0.25, -4.0);
  spare.castShadow = true;
  room.add(spare);
  // Parts shelf on the east wall: boards + small parts boxes.
  const shelf = new THREE.Group();
  for (const px of [-0.9, 0.9]) {
    const post = box(0.12, 2.6, 0.7, '#4a3a2a');
    post.position.set(px, 1.3, 0);
    shelf.add(post);
  }
  for (let i = 0; i < 3; i += 1) {
    const board = box(2.0, 0.08, 0.8, '#6b4a2b');
    board.position.set(0, 0.5 + i * 0.85, 0);
    shelf.add(board);
    const part = box(0.45, 0.35, 0.5, ['#c94b4b', '#2b6fd0', '#e8a33d'][i]);
    part.position.set(-0.5 + i * 0.5, 0.72 + i * 0.85, 0);
    shelf.add(part);
  }
  // Parts shelf on the north wall, below the neon sign, close to the
  // sign's centre so it reads whole in the frame (at x 7.5 it was cut
  // in half by the right edge; the east wall is behind the garage
  // camera, so a shelf there never shows in the shot).
  shelf.position.set(3.5, 0, -10.2);
  room.add(shelf);
  // Front-left floor props: the lower-left of the shot was empty pink
  // floor. A rubber mat in front of the lift, a crate, oil cans and a
  // pegboard on the west wall — none of them hides the car, the price
  // panel or Bambang's dialogue.
  const mat = box(4.5, 0.04, 2.6, '#26262e', { rough: 0.9 });
  mat.position.set(2, 0.02, 7.5);
  room.add(mat);
  const frontCrate = box(0.7, 0.7, 0.7, '#8a6b3d', { rough: 0.85 });
  frontCrate.position.set(0.8, 0.35, 7.6);
  frontCrate.rotation.y = 0.4;
  frontCrate.castShadow = true;
  room.add(frontCrate);
  for (const [cx, cz, col] of [[4.5, 8.2, '#c94b4b'], [5.1, 7.6, '#2b6fd0']]) {
    const can = cylinder(0.22, 0.22, 0.55, col, { metal: 0.4, rough: 0.5 });
    can.position.set(cx, 0.28, cz);
    can.castShadow = true;
    room.add(can);
  }
  const peg = box(0.15, 2.2, 4.5, '#4a3a2a', { rough: 0.9 });
  peg.position.set(-14.7, 2.8, 5);
  room.add(peg);
  for (let i = 0; i < 3; i += 1) {
    const tool = box(0.2, 0.5, 0.3, ['#c94b4b', '#2b6fd0', '#e8a33d'][i]);
    tool.position.set(-14.55, 2.3 + i * 0.6, 3.6 + i * 1.2);
    room.add(tool);
  }
  // Engine on a stand, foreground LEFT — the classic garage centrepiece
  // that was missing: a block on an A-frame stand, valve cover, intake
  // and pulley, with wrenches and an oil stain at its feet. It sits at
  // (-2, 6.5), ~11u from the garage camera: far enough that the whole
  // stand (base to valve cover) fits in the frame, left of the centred
  // dialogue box and below the garage panel, facing the camera (the
  // intake + pulley point at +x/+z, rotation 1.48). At its old spot
  // (7, 5.5) it was 3u from the camera — huge, cut off by the bottom
  // edge and half hidden behind the dialogue box.
  const engineStand = new THREE.Group();
  const standPost = box(0.16, 1.1, 0.16, '#333a44', { metal: 0.6, rough: 0.4 });
  standPost.position.y = 0.55;
  engineStand.add(standPost);
  const standBase = box(0.9, 0.1, 0.9, '#333a44', { metal: 0.6, rough: 0.4 });
  standBase.position.y = 0.05;
  engineStand.add(standBase);
  const standHead = box(0.5, 0.3, 0.3, '#c9a227', { metal: 0.6, rough: 0.4 });
  standHead.position.set(0, 1.15, 0);
  engineStand.add(standHead);
  const block = box(0.9, 0.6, 0.7, '#2a2a30', { metal: 0.5, rough: 0.5 });
  block.position.set(0, 1.5, 0);
  engineStand.add(block);
  const valveCover = box(0.7, 0.18, 0.5, '#c94b4b', { metal: 0.4, rough: 0.4 });
  valveCover.position.set(0, 1.88, 0);
  engineStand.add(valveCover);
  const intake = box(0.5, 0.22, 0.4, '#c9ced6', { metal: 0.8, rough: 0.3 });
  intake.position.set(0, 1.55, 0.45);
  engineStand.add(intake);
  for (let i = 0; i < 4; i += 1) {
    const cyl = cylinder(0.09, 0.09, 0.3, '#444444', { metal: 0.7, rough: 0.4 });
    cyl.position.set(-0.3 + i * 0.2, 1.95, 0);
    engineStand.add(cyl);
  }
  const pulley = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.22, 0.1, 16),
    new THREE.MeshStandardMaterial({ color: '#c9ced6', roughness: 0.3, metalness: 0.8 }),
  );
  pulley.rotation.x = Math.PI / 2;
  pulley.position.set(0, 1.5, 0.42);
  engineStand.add(pulley);
  engineStand.position.set(-2, 0, 6.5);
  engineStand.rotation.y = 1.48;
  room.add(engineStand);
  // Wrenches scattered on the floor by the engine stand and the lift.
  for (const [wx, wz, rot] of [[5.6, 4.6, 0.5], [6.2, 6.4, 1.2], [-4.8, 5.8, 0.9], [3.2, 6.2, 0.2]]) {
    const wrench = box(0.5, 0.05, 0.12, '#c9ced6', { metal: 0.8, rough: 0.3 });
    wrench.position.set(wx, 0.04, wz);
    wrench.rotation.y = rot;
    room.add(wrench);
  }
  // Oil stains under the engine stand and by the back car.
  for (const [ox, oz, r] of [[-2, 6.5, 0.8], [-10, -3, 1.0]]) {
    const stain = new THREE.Mesh(
      new THREE.CircleGeometry(r, 14),
      new THREE.MeshStandardMaterial({ color: '#1c1c22', roughness: 0.4, transparent: true, opacity: 0.7 }),
    );
    stain.rotation.x = -Math.PI / 2;
    stain.position.set(ox, 0.02, oz);
    room.add(stain);
  }
  // Bambang at the bench.
  const bambang = buildMinifig(CHARACTERS.bambang, 1);
  bambang.group.position.set(-11, 0, -7.6);
  bambang.group.rotation.y = 2.4;
  room.add(bambang.group);
  // Round 15: a second mechanic at work beside the Garuda + a customer
  // waiting by the door — the round 14 shot had no people in the room
  // besides Bambang at his bench (and only his portrait in the dialogue).
  // Round 15d: the mechanic stands on the car's LEFT side (-2.5, 2.8),
  // not the right — at (3.4, 2.4) he stood in front of the car and
  // blocked its nose from the closer camera. The customer waits by the
  // north shelf (4, -7): the door itself sits behind the garage camera
  // and the far north wall hides behind the car, so the waiting customer
  // is staged at the visible end of the north wall instead.
  const mech = buildMinifig(CHARACTERS.bambang, 1);
  mech.group.position.set(-2.5, 0, 2.8);
  mech.group.rotation.y = Math.atan2(2.5, -2.8);
  mech.armR.rotation.x = -0.9; // leaning over the engine bay
  room.add(mech.group);
  // Round 16: the customer moved 3u toward the door, to open floor
  // south-east of the lift (3.5, -4) — standing AT the door is still
  // impossible (the door is behind the garage camera), but he no longer
  // waits by the north shelf; he faces the car from the entrance side.
  const customer = buildMinifig(CROWD_DEFS[2], 1);
  customer.group.position.set(3.5, 0, -4);
  customer.group.rotation.y = Math.atan2(-3.5, 4); // facing the car from the south-east floor
  room.add(customer.group);
  room.visible = false;
  scene.add(room);

  // Round 16: the garage's harsh overhead light (the dusk sun shines
  // straight through the roof + three hanging lamps) washes
  // full-strength paint white on the hood — the display car keeps a
  // deeper gold (x0.55, close to the roof panels' x0.45) so it reads as
  // gold, not white, under the lamps. The chase car is a separate mesh
  // and keeps its full paint.
  const garagePaint = (color) => new THREE.Color(color).multiplyScalar(0.55);

  const state = {
    inside: false,
    paint: 0,
    tune: 0, // 0..2 engine tunes
    armour: 0, // 0..1
    hp: 100,
  };

  function stats() {
    return {
      top: 166 + state.tune * 18,
      accel: 7.2 - state.tune * 0.9,
      armour: 40 + state.armour * 60,
      handling: 72 + state.tune * 8,
    };
  }

  return {
    room, state,
    enter() {
      state.inside = true;
      room.visible = true;
      return { x: GARAGE_POS.x, z: GARAGE_POS.z };
    },
    exit() {
      state.inside = false;
      room.visible = false;
    },
    repaint(i) {
      state.paint = i;
      const color = PAINTS[i].color;
      displayCar.userData.bodyMat.color.copy(garagePaint(color));
      return PAINTS[i].name;
    },
    buy(i, cash) {
      const item = GARAGE_MENU[i];
      if (!item) return { ok: false, msg: 'Tidak ada.' };
      if (i === 0) {
        if (cash < item.price) return { ok: false, msg: 'Uang tidak cukup.' };
        state.hp = 100;
        return { ok: true, cost: item.price, msg: 'Body diperbaiki 100%.' };
      }
      if (i === 1) {
        if (cash < item.price) return { ok: false, msg: 'Uang tidak cukup.' };
        state.paint = (state.paint + 1) % PAINTS.length;
        displayCar.userData.bodyMat.color.copy(garagePaint(PAINTS[state.paint].color));
        return { ok: true, cost: item.price, msg: `Cat baru: ${PAINTS[state.paint].name}. Panas hilang.` };
      }
      if (i === 2) {
        if (state.tune >= 2) return { ok: false, msg: 'Mesin sudah maksimal.' };
        if (cash < item.price) return { ok: false, msg: 'Uang tidak cukup.' };
        state.tune += 1;
        return { ok: true, cost: item.price, msg: `Engine tune ${state.tune}/2 terpasang.` };
      }
      if (state.armour >= 1) return { ok: false, msg: 'Armour sudah maksimal.' };
      if (cash < item.price) return { ok: false, msg: 'Uang tidak cukup.' };
      state.armour = 1;
      return { ok: true, cost: item.price, msg: 'Armour plating terpasang.' };
    },
    stats,
    displayCar,
  };
}
