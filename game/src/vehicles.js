// Vehicles: every car the game shows, built like brick sports cars. The Garuda GT is the
// hero — a long low roadster with a real lofted body (pointed nose, rising hood, wide rear
// deck), hood vents, sharp headlights and a grille, a sloped windshield, an open cockpit
// with a visible minifig driver at the wheel, a big wing on struts, and big wheels with
// five-spoke star rims tucked under body-coloured arches. Traffic cars are cheaper
// silhouettes with distinct shapes per type; the KPD car is blue-white with POLICE doors
// and a flashing light bar. This file also owns the player car's arcade physics and the
// traffic loop; the police file owns pursuit.

import { THREE } from './three-shim.js';
import { CITY, PHYSICS } from './config.js';
import { pick, range } from './random.js';

const TRAFFIC_COLORS = [0xe8e8e8, 0x3f7fbf, 0xd9a45f, 0x6fb98a, 0xb06ae0, 0xc9c9c9, 0x8a5a3a];

/** Loft a closed body from cross-sections, front (high z) to rear (low z). Each section is
 * a hexagon: flat bottom, vertical sides, a slightly narrower flat top — so the body has a
 * real top profile (low nose, rising hood, level deck) instead of a flat slab. Non-indexed
 * geometry + computeVertexNormals gives the faceted low-poly look. */
function loftGeometry(sections) {
  const profile = (s) => {
    const wt = s.w * 0.92;
    const ym = (s.y0 + s.y1) / 2;
    return [
      [-s.w, s.y0], [-s.w, ym], [-wt, s.y1],
      [wt, s.y1], [s.w, ym], [s.w, s.y0],
    ];
  };
  const rings = sections.map(profile);
  const pos = [];
  for (let i = 0; i < rings.length - 1; i += 1) {
    const a = rings[i];
    const b = rings[i + 1];
    const za = sections[i].z;
    const zb = sections[i + 1].z;
    for (let j = 0; j < 6; j += 1) {
      const k = (j + 1) % 6;
      pos.push(
        a[j][0], a[j][1], za, a[k][0], a[k][1], za, b[k][0], b[k][1], zb,
        a[j][0], a[j][1], za, b[k][0], b[k][1], zb, b[j][0], b[j][1], zb,
      );
    }
  }
  // End caps: triangle fans around each end ring's centroid. The ring order is CCW seen
  // from the front (+z), so the front fan winds (centre, j, k) and the rear fan reverses.
  const cap = (ring, z, front) => {
    let cx = 0;
    let cy = 0;
    for (const p of ring) { cx += p[0]; cy += p[1]; }
    cx /= ring.length;
    cy /= ring.length;
    for (let j = 0; j < 6; j += 1) {
      const k = (j + 1) % 6;
      if (front) pos.push(cx, cy, z, ring[j][0], ring[j][1], z, ring[k][0], ring[k][1], z);
      else pos.push(cx, cy, z, ring[k][0], ring[k][1], z, ring[j][0], ring[j][1], z);
    }
  };
  cap(rings[0], sections[0].z, true);
  cap(rings[rings.length - 1], sections[sections.length - 1].z, false);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.computeVertexNormals();
  return geo;
}

function box(w, h, d, mat, x, y, z, rx = 0, ry = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.rotation.x = rx;
  m.rotation.y = ry;
  m.castShadow = true;
  return m;
}

function std(color, roughness = 0.4, metalness = 0.5) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function textTexture(line1, line2, fg, bg) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 192;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 512, 192);
  ctx.fillStyle = fg;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 96px system-ui, sans-serif';
  ctx.fillText(line1, 256, line2 ? 78 : 96);
  if (line2) {
    ctx.font = 'bold 56px system-ui, sans-serif';
    ctx.fillText(line2, 256, 152);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** A big wheel with a five-spoke star rim, like the brick sports car: black tire, silver
 * rim, five spokes radiating from the hub on the outer face. */
function wheelMesh(rimWhite) {
  const group = new THREE.Group();
  const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.34, 16), std(0x14141a, 0.95, 0));
  tire.rotation.z = Math.PI / 2;
  tire.castShadow = true;
  group.add(tire);
  const rimMat = std(rimWhite ? 0xf2f2f2 : 0x9a9aa2, 0.3, 0.65);
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.36, 10), rimMat);
  rim.rotation.z = Math.PI / 2;
  group.add(rim);
  // Five spokes on the outer face, fanned around the axle (the wheel's axis is X, so each
  // spoke is a radial bar in the YZ plane, spun around X by its holder group).
  for (let i = 0; i < 5; i += 1) {
    const holder = new THREE.Group();
    holder.rotation.x = (i / 5) * Math.PI * 2;
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.28, 0.09), rimMat);
    spoke.position.set(0.19, 0.15, 0);
    holder.add(spoke);
    group.add(holder);
  }
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.38, 8), std(0x1a1a1a, 0.4, 0.6));
  hub.rotation.z = Math.PI / 2;
  group.add(hub);
  return group;
}

/** The Garuda GT's lofted body: a pointed low nose, a hood that rises to the cowl, a level
 * rear deck, and a tail kicked up a touch. 5.8 long, 2.3 wide, body top ~0.92. */
function loftBody(colorHex) {
  const sections = [
    { z: 2.9, w: 0.42, y0: 0.34, y1: 0.58 }, // pointed nose tip
    { z: 2.5, w: 0.92, y0: 0.26, y1: 0.66 },
    { z: 1.7, w: 1.12, y0: 0.2, y1: 0.8 }, // hood
    { z: 0.8, w: 1.16, y0: 0.2, y1: 0.92 }, // cowl — highest point of the hood
    { z: -0.2, w: 1.16, y0: 0.2, y1: 0.9 },
    { z: -1.4, w: 1.13, y0: 0.2, y1: 0.87 }, // rear deck
    { z: -2.4, w: 1.06, y0: 0.24, y1: 0.84 },
    { z: -2.9, w: 0.82, y0: 0.3, y1: 0.76 }, // tail, kicked up
  ];
  const mat = std(colorHex, 0.28, 0.55);
  const body = new THREE.Mesh(loftGeometry(sections), mat);
  body.castShadow = true;
  return { mesh: body, mat };
}

function stripes(parent) {
  const mat = std(0xffffff, 0.4, 0.1);
  // Double white stripes down the hood, following its slope, and onto the rear deck.
  for (const s of [-0.3, 0.3]) {
    parent.add(box(0.24, 0.04, 2.0, mat, s, 0.87, 1.35, 0.15));
    parent.add(box(0.24, 0.04, 1.4, mat, s, 0.9, -1.95, -0.04));
  }
  // Side stripes along the doors.
  for (const s of [-1, 1]) {
    parent.add(box(0.04, 0.1, 3.4, mat, s * 1.17, 0.55, 0));
  }
}

function spoiler(parent, colorHex) {
  const mat = std(colorHex, 0.3, 0.5);
  const wing = box(2.5, 0.07, 0.7, mat, 0, 1.3, -2.68, -0.08);
  parent.add(wing);
  // White trailing edge on the wing, like the brick car's wing stripe.
  parent.add(box(2.5, 0.02, 0.1, std(0xffffff, 0.4, 0.1), 0, 1.34, -2.96, -0.08));
  for (const s of [-1.22, 1.22]) {
    parent.add(box(0.06, 0.3, 0.6, mat, s, 1.28, -2.68));
  }
  for (const s of [-0.7, 0.7]) {
    parent.add(box(0.1, 0.42, 0.1, mat, s, 1.08, -2.62));
  }
}

function frontEnd(parent) {
  // Black grille band across the nose, gold emblem, sharp headlights with dark surrounds.
  parent.add(box(1.3, 0.16, 0.1, std(0x14141a, 0.7, 0.2), 0, 0.52, 2.86));
  parent.add(box(0.14, 0.14, 0.05, std(0xffd34d, 0.3, 0.8), 0, 0.52, 2.92));
  const headMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff2c0, emissiveIntensity: 1.2 });
  for (const s of [-0.68, 0.68]) {
    parent.add(box(0.62, 0.2, 0.06, std(0x14141a, 0.7, 0.2), s, 0.64, 2.9));
    parent.add(box(0.5, 0.14, 0.06, headMat, s, 0.64, 2.94));
  }
  // Chrome bumper + dark splitter blade under the nose.
  parent.add(box(2.15, 0.14, 0.16, std(0xc9c9c9, 0.3, 0.8), 0, 0.36, 2.9));
  parent.add(box(2.0, 0.05, 0.45, std(0x1a1a1a, 0.8, 0.2), 0, 0.22, 2.8));
  // Hood vents, like the brick sports car's black bonnet vents.
  for (const s of [-0.48, 0.48]) {
    parent.add(box(0.32, 0.05, 0.6, std(0x14141a, 0.7, 0.2), s, 0.84, 1.55, 0.15));
  }
}

function rearEnd(parent) {
  // Full-width red taillight bar, chrome bumper, black diffuser with fins, twin exhausts.
  const tailMat = new THREE.MeshStandardMaterial({ color: 0xd21f2b, emissive: 0x881111, emissiveIntensity: 0.9 });
  parent.add(box(2.0, 0.16, 0.08, tailMat, 0, 0.66, -2.92));
  parent.add(box(2.1, 0.12, 0.14, std(0xc9c9c9, 0.3, 0.8), 0, 0.36, -2.9));
  parent.add(box(1.9, 0.18, 0.3, std(0x1a1a1a, 0.8, 0.2), 0, 0.3, -2.82));
  for (const x of [-0.6, 0, 0.6]) {
    parent.add(box(0.05, 0.2, 0.25, std(0x1a1a1a, 0.8, 0.2), x, 0.3, -2.9));
  }
  for (const s of [-0.5, 0.5]) {
    const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.3, 8), std(0x8a8a92, 0.25, 0.9));
    exhaust.rotation.x = Math.PI / 2;
    exhaust.position.set(s, 0.38, -2.95);
    parent.add(exhaust);
  }
  // Side mirrors on stalks.
  for (const s of [-1, 1]) {
    parent.add(box(0.05, 0.05, 0.25, std(0x1a1a1a, 0.7, 0.2), s * 1.18, 1.0, 0.55));
    parent.add(box(0.16, 0.12, 0.06, std(0xffb400, 0.3, 0.55), s * 1.28, 1.02, 0.62));
  }
}

/** Open cockpit: dark tub, two seats, a sloped windshield, a roll bar that sits ON the
 * rear deck, and the steering wheel. The driver sits in the open air, head above the
 * deck — like the brick roadster, so he reads from the chase camera. */
function cockpit(parent) {
  const tub = box(1.7, 0.3, 1.9, std(0x14141c, 0.9, 0), 0, 0.85, -0.35);
  parent.add(tub);
  const seatMat = std(0x3a2a1a, 0.9, 0);
  for (const s of [-0.45, 0.45]) {
    parent.add(box(0.55, 0.15, 0.5, seatMat, s, 0.98, -0.6));
    parent.add(box(0.55, 0.6, 0.14, seatMat, s, 1.2, -0.88, -0.15));
  }
  // Sloped windshield.
  const shield = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.75), new THREE.MeshStandardMaterial({ color: 0x9fd2e8, roughness: 0.1, metalness: 0.5, transparent: true, opacity: 0.6, side: THREE.DoubleSide }));
  shield.position.set(0, 1.12, 0.55);
  shield.rotation.x = -0.55;
  parent.add(shield);
  // Roll bar: two struts rising from the deck, one crossbar across the top.
  const rollMat = std(0x1a1a22, 0.4, 0.6);
  for (const s of [-0.85, 0.85]) {
    const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.55, 8), rollMat);
    strut.position.set(s, 1.15, -1.3);
    parent.add(strut);
  }
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.9, 8), rollMat);
  bar.rotation.z = Math.PI / 2;
  bar.position.set(0, 1.42, -1.3);
  parent.add(bar);
}

/** A seated minifig driver in an orange shirt and sunglasses, hands on the wheel — built
 * like the standing minifigs, but seated: torso, cylinder head with face, arms reaching
 * forward to the steering wheel. */
export function buildDriver() {
  const driver = new THREE.Group();
  const shirt = std(0xff7a2a, 0.9, 0);
  const skin = std(0xd9a066, 0.8, 0);
  const torso = box(0.52, 0.5, 0.3, shirt, 0, 0.25, 0, -0.12);
  driver.add(torso);
  // Yellow pattern squares on the chest, like the wheelman's shirt.
  const pat = std(0xffd34d, 0.8, 0);
  for (const [px, py] of [[-0.13, 0.32], [0.13, 0.32]]) {
    driver.add(box(0.09, 0.09, 0.02, pat, px, py, 0.16, -0.12));
  }
  const head = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.28, 12), skin);
  head.position.set(0, 0.68, 0);
  driver.add(head);
  const hair = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.11, 12), std(0x1a1a1a, 1, 0));
  hair.position.set(0, 0.84, 0);
  driver.add(hair);
  const glasses = box(0.36, 0.08, 0.04, std(0x111111, 0.2, 0.2), 0, 0.72, 0.18);
  driver.add(glasses);
  // Smile under the shades.
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.014, 6, 12, Math.PI), std(0x14141a, 0.4, 0));
  smile.position.set(0, 0.6, 0.185);
  smile.rotation.z = Math.PI;
  driver.add(smile);
  // Arms reaching forward to the wheel.
  for (const s of [-0.3, 0.3]) {
    driver.add(box(0.13, 0.13, 0.55, shirt, s, 0.32, 0.28, 0.55));
  }
  // Steering wheel, tilted toward the driver.
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.03, 6, 16), std(0x1a1a1a, 0.6, 0.3));
  wheel.position.set(0, 0.35, 0.5);
  wheel.rotation.x = -0.5;
  driver.add(wheel);
  return driver;
}

/** The hero car. `withDriver` puts the wheelman in the seat (chase + title shots). */
export function buildGaruda(colorHex, withDriver) {
  const car = new THREE.Group();
  const { mesh: body } = loftBody(colorHex);
  car.add(body);
  stripes(car);
  cockpit(car);
  spoiler(car, colorHex);
  frontEnd(car);
  rearEnd(car);
  const wheels = [];
  for (const [x, z] of [[-1.02, 1.85], [1.02, 1.85], [-1.02, -1.85], [1.02, -1.85]]) {
    const w = wheelMesh(true);
    w.position.set(x, 0.46, z);
    car.add(w);
    wheels.push(w);
    // Dark wheel well behind the wheel, so you cannot see through the car.
    car.add(box(0.12, 0.6, 1.15, std(0x0a0a0e, 1, 0), x * 0.9, 0.55, z));
    // Body-coloured fender arch over the wheel (half torus in the wheel plane).
    const arch = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.13, 6, 12, Math.PI), std(colorHex, 0.35, 0.5));
    arch.position.set(x, 0.46, z);
    arch.rotation.y = Math.PI / 2;
    car.add(arch);
  }
  let driver = null;
  if (withDriver) {
    driver = buildDriver();
    driver.position.set(-0.45, 0.92, -0.55);
    car.add(driver);
  }
  car.userData.wheels = wheels;
  car.userData.driver = driver;
  return car;
}

function trafficBody(colorHex, kind) {
  const bodyH = kind === 'truck' ? 1.3 : 0.85;
  const bodyL = kind === 'truck' || kind === 'van' ? 6.4 : 4.8;
  const half = bodyL / 2;
  const sections = [
    { z: half, w: 0.7, y0: 0.3, y1: 0.55 },
    { z: half - 0.4, w: 1.02, y0: 0.25, y1: 0.7 },
    { z: 0.8, w: 1.05, y0: 0.25, y1: bodyH },
    { z: -0.8, w: 1.05, y0: 0.25, y1: bodyH },
    { z: -half + 0.4, w: 1.02, y0: 0.25, y1: 0.7 },
    { z: -half, w: 0.7, y0: 0.3, y1: 0.55 },
  ];
  const mesh = new THREE.Mesh(loftGeometry(sections), std(colorHex, 0.5, 0.3));
  mesh.castShadow = true;
  return { mesh, bodyH, bodyL };
}

export function buildSimpleCar(colorHex, kind) {
  const car = new THREE.Group();
  const { mesh: body, bodyH, bodyL } = trafficBody(colorHex, kind);
  body.position.y = 0;
  car.add(body);
  // Glass cabin: dark, sloped at the front, sitting on the body — not a floating box.
  const cabL = kind === 'van' ? 5.2 : kind === 'truck' ? 1.6 : 2.2;
  const cabZ = kind === 'truck' ? bodyL / 2 - 1.4 : kind === 'van' ? 0 : 0.5;
  const cab = box(1.8, 0.65, cabL, std(0x1a2a3a, 0.15, 0.6), 0, bodyH + 0.3, cabZ);
  car.add(cab);
  const shield = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.6), new THREE.MeshStandardMaterial({ color: 0x9fd2e8, roughness: 0.1, metalness: 0.5, transparent: true, opacity: 0.55, side: THREE.DoubleSide }));
  shield.position.set(0, bodyH + 0.32, cabZ + cabL / 2 + 0.05);
  shield.rotation.x = -0.45;
  car.add(shield);
  if (kind === 'taxi') {
    const sign = box(0.9, 0.25, 0.5, new THREE.MeshStandardMaterial({ color: 0xffb400, emissive: 0xaa7700, emissiveIntensity: 0.7 }), 0, bodyH + 0.75, 0.5);
    car.add(sign);
  }
  if (kind === 'truck') {
    const cargo = box(2.2, 1.6, 3.4, std(0x8a8a92, 0.8, 0), 0, bodyH + 0.6, -1.2);
    car.add(cargo);
  }
  const headMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff2c0, emissiveIntensity: 0.8 });
  for (const s of [-0.65, 0.65]) {
    car.add(box(0.4, 0.15, 0.08, headMat, s, 0.55, bodyL / 2 + 0.02));
  }
  const tailMat = new THREE.MeshStandardMaterial({ color: 0xd21f2b, emissive: 0x881111, emissiveIntensity: 0.7 });
  car.add(box(1.8, 0.14, 0.08, tailMat, 0, 0.55, -bodyL / 2 - 0.02));
  car.add(box(2.0, 0.12, 0.12, std(0xc9c9c9, 0.3, 0.8), 0, 0.32, bodyL / 2 + 0.02));
  for (const [x, z] of [[-1.0, bodyL / 2 - 0.9], [1.0, bodyL / 2 - 0.9], [-1.0, -bodyL / 2 + 0.9], [1.0, -bodyL / 2 + 0.9]]) {
    const w = wheelMesh(false);
    w.scale.setScalar(0.92);
    w.position.set(x, 0.42, z);
    car.add(w);
  }
  return car;
}

/** KPD police car: blue body, white hood and roof panels, KPD / POLICE door decals, black
 * push bar, and the flashing red/blue light bar on the roof. */
export function buildPoliceCar() {
  const car = new THREE.Group();
  const { mesh: body, bodyH, bodyL } = trafficBody(0x1a4a9a, 'sedan');
  car.add(body);
  // White hood panel and white roof panel, like the brick police car.
  car.add(box(1.9, 0.05, 1.9, std(0xf2f2f2, 0.4, 0.2), 0, 0.84, 1.4, 0.06));
  const cab = box(1.8, 0.6, 2.2, std(0x1a2a3a, 0.15, 0.6), 0, bodyH + 0.28, 0.5);
  car.add(cab);
  car.add(box(1.84, 0.06, 2.24, std(0xf2f2f2, 0.4, 0.2), 0, bodyH + 0.6, 0.5));
  const shield = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.55), new THREE.MeshStandardMaterial({ color: 0x9fd2e8, roughness: 0.1, metalness: 0.5, transparent: true, opacity: 0.55, side: THREE.DoubleSide }));
  shield.position.set(0, bodyH + 0.3, 1.62);
  shield.rotation.x = -0.45;
  car.add(shield);
  // KPD / POLICE door decals on both sides.
  const decal = new THREE.MeshBasicMaterial({ map: textTexture('KPD', 'POLICE', '#ffffff', 'rgba(0,0,0,0)'), transparent: true });
  for (const s of [-1, 1]) {
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.64), decal);
    plate.position.set(s * 1.06, 0.62, -0.2);
    plate.rotation.y = s * Math.PI / 2;
    car.add(plate);
  }
  // Blue side stripe under the decal.
  for (const s of [-1, 1]) {
    car.add(box(0.04, 0.14, 4.4, std(0xf2f2f2, 0.4, 0.2), s * 1.06, 0.42, 0));
  }
  // Black push bar on the nose.
  car.add(box(2.0, 0.5, 0.12, std(0x1a1a1a, 0.7, 0.3), 0, 0.55, bodyL / 2 + 0.08));
  car.add(box(2.0, 0.1, 0.1, std(0x1a1a1a, 0.7, 0.3), 0, 0.85, bodyL / 2 + 0.08));
  const headMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff2c0, emissiveIntensity: 0.8 });
  for (const s of [-0.65, 0.65]) {
    car.add(box(0.4, 0.15, 0.08, headMat, s, 0.6, bodyL / 2 + 0.02));
  }
  // Red + blue light bar, big enough to read at chase distance. The two halves flash
  // alternately (police.js drives lightBars).
  const barGroup = new THREE.Group();
  const redMat = new THREE.MeshStandardMaterial({ color: 0xd21f2b, emissive: 0xcc1111, emissiveIntensity: 1.6 });
  const blueMat = new THREE.MeshStandardMaterial({ color: 0x2255ff, emissive: 0x1133cc, emissiveIntensity: 1.6 });
  const lightBars = [];
  for (const [s, mat] of [[-0.35, redMat], [0.35, blueMat]]) {
    const half = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.22, 0.45), mat);
    half.position.set(s, 0, 0);
    barGroup.add(half);
    lightBars.push(half);
  }
  barGroup.position.set(0, bodyH + 0.75, 0.5);
  car.add(barGroup);
  car.userData.lightBars = lightBars;
  for (const [x, z] of [[-1.0, bodyL / 2 - 0.9], [1.0, bodyL / 2 - 0.9], [-1.0, -bodyL / 2 + 0.9], [1.0, -bodyL / 2 + 0.9]]) {
    const w = wheelMesh(false);
    w.scale.setScalar(0.92);
    w.position.set(x, 0.42, z);
    car.add(w);
  }
  return car;
}

/** Arcade driving for the player's car: accelerate, steer, drift, collide with buildings. */
export function createPlayerCar(scene, colorHex) {
  let mesh = buildGaruda(colorHex, true);
  scene.add(mesh);
  const car = {
    mesh, x: -300, z: 280, heading: Math.PI / 2, speed: 0, hp: 100,
    color: colorHex, steering: 0,
  };
  function place(x, z, heading) {
    car.x = x;
    car.z = z;
    car.heading = heading;
    car.speed = 0;
    mesh.position.set(x, 0, z);
    mesh.rotation.y = heading;
  }
  function step(dt, input, colliders) {
    const axis = input.axis();
    const drifting = input.isDown('Space');
    const targetSteer = axis.x * PHYSICS.carSteer * (car.speed >= 0 ? 1 : -1);
    car.steering += (targetSteer - car.steering) * Math.min(1, dt * 8);
    if (axis.y > 0) car.speed += PHYSICS.carAccel * dt;
    else if (axis.y < 0) car.speed -= (car.speed > 0.5 ? PHYSICS.carBrake : PHYSICS.carAccel * 0.5) * dt;
    else car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 8 * dt);
    car.speed = Math.max(-PHYSICS.carReverse, Math.min(PHYSICS.carMaxSpeed, car.speed));
    const grip = drifting ? PHYSICS.driftGrip : 1;
    car.heading += car.steering * dt * Math.min(1, Math.abs(car.speed) / 8) * grip;
    const nx = car.x + Math.sin(car.heading) * car.speed * dt;
    const nz = car.z + Math.cos(car.heading) * car.speed * dt;
    // Circle-vs-AABB collision against the buildings: slide along, lose speed on impact.
    let cx = nx;
    let cz = nz;
    for (const c of colliders) {
      const px = Math.max(c.x0, Math.min(cx, c.x1));
      const pz = Math.max(c.z0, Math.min(cz, c.z1));
      const dx = cx - px;
      const dz = cz - pz;
      const d2 = dx * dx + dz * dz;
      if (d2 < 2.6 * 2.6) {
        const d = Math.sqrt(d2) || 0.001;
        cx = px + (dx / d) * 2.6;
        cz = pz + (dz / d) * 2.6;
        car.speed *= 0.55;
        car.hp = Math.max(0, car.hp - Math.abs(car.speed) * 0.02);
      }
    }
    car.x = Math.max(CITY.minX + 6, Math.min(CITY.maxX - 6, cx));
    car.z = Math.max(CITY.minZ + 6, Math.min(CITY.maxZ - 6, cz));
    mesh.position.set(car.x, 0, car.z);
    mesh.rotation.y = car.heading;
    // Spin the wheels with speed; tilt the body a little into the drift.
    const spin = car.speed * dt * 2.2;
    const wheels = mesh.userData.wheels || [];
    for (const w of wheels) w.rotation.x += spin;
    mesh.rotation.z = -car.steering * 0.06 * Math.min(1, Math.abs(car.speed) / 20);
    return { drifting: drifting && Math.abs(car.speed) > 18 };
  }
  function repaint(hex) {
    car.color = hex;
    const newMesh = buildGaruda(hex, true);
    newMesh.position.copy(mesh.position);
    newMesh.rotation.copy(mesh.rotation);
    scene.remove(mesh);
    scene.add(newMesh);
    mesh = newMesh;
    car.mesh = newMesh;
  }
  /** Steal a traffic car: swap the driven mesh for the stolen one, keeping position and physics. */
  function swapMesh(newMesh) {
    scene.remove(mesh);
    newMesh.position.set(car.x, 0, car.z);
    newMesh.rotation.y = car.heading;
    scene.add(newMesh);
    mesh = newMesh;
    car.mesh = newMesh;
    car.color = null;
  }
  place(car.x, car.z, car.heading);
  return { car, place, step, repaint, swapMesh, mesh: () => mesh };
}

/** Traffic: a pool of cars looping along the grid roads, wrapping at the city edge. */
export function createTraffic(scene, rng, count = 16) {
  const cars = [];
  const kinds = ['sedan', 'sedan', 'taxi', 'van', 'truck', 'sedan'];
  for (let i = 0; i < count; i += 1) {
    const kind = pick(rng, kinds);
    const mesh = buildSimpleCar(pick(rng, TRAFFIC_COLORS), kind);
    scene.add(mesh);
    const horizontal = rng() < 0.5;
    const line = (Math.floor(range(rng, -3, 4)) * 120);
    cars.push({
      mesh, kind, horizontal, line,
      pos: range(rng, -400, 400),
      dir: rng() < 0.5 ? 1 : -1,
      speed: PHYSICS.trafficSpeed * range(rng, 0.8, 1.25),
    });
  }
  function step(dt) {
    for (const c of cars) {
      c.pos += c.dir * c.speed * dt;
      if (c.pos > 420) c.pos = -420;
      if (c.pos < -420) c.pos = 420;
      if (c.horizontal) {
        c.mesh.position.set(c.pos, 0, c.line + 3.5 * c.dir);
        c.mesh.rotation.y = c.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
      } else {
        c.mesh.position.set(c.line + 3.5 * c.dir, 0, c.pos);
        c.mesh.rotation.y = c.dir > 0 ? Math.PI : 0;
      }
    }
  }
  return { cars, step };
}
