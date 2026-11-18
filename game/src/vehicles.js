// Every vehicle in Kencana Bay: the gold Garuda GT hero car (a lofted
// wedge body built from cross-sections), the traffic cars, the KPD police
// cars and the helicopter, plus the wheelman and driver figures.
// Cars face local +z; heading 0 means facing +z in the world.
import { THREE } from './three-shim.js';
import { TUNING } from './config.js';
import { makeRng, range } from './random.js';

function lambert(color, extra = {}) {
  return new THREE.MeshLambertMaterial({ color, ...extra });
}

function part(w, h, d, mat, x, y, z, ry = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  if (ry) m.rotation.y = ry;
  m.castShadow = true;
  return m;
}

// A hull from cross-sections: each section is { z, w, y0, y1 }.
// The four corners of every section are joined into a closed shell.
export function loftBody(sections, material) {
  const rings = sections.map((s) => ([
    [-s.w / 2, s.y0, s.z],
    [s.w / 2, s.y0, s.z],
    [s.w / 2, s.y1, s.z],
    [-s.w / 2, s.y1, s.z],
  ]));
  const positions = [];
  const indices = [];
  let base = 0;
  for (const ring of rings) {
    for (const p of ring) positions.push(p[0], p[1], p[2]);
  }
  for (let i = 0; i < rings.length - 1; i += 1) {
    const a = base + i * 4;
    const b = base + (i + 1) * 4;
    for (let k = 0; k < 4; k += 1) {
      const k2 = (k + 1) % 4;
      indices.push(a + k, b + k, b + k2, a + k, b + k2, a + k2);
    }
  }
  // Nose and tail caps as fans around each ring's centre.
  function cap(ringIndex, flip) {
    const ring = rings[ringIndex];
    const cx = (ring[0][0] + ring[1][0]) / 2;
    const cy = (ring[0][1] + ring[2][1]) / 2;
    const cz = ring[0][2];
    const centre = positions.length / 3;
    positions.push(cx, cy, cz);
    const off = base + ringIndex * 4;
    for (let k = 0; k < 4; k += 1) {
      const k2 = (k + 1) % 4;
      if (flip) indices.push(centre, off + k2, off + k);
      else indices.push(centre, off + k, off + k2);
    }
  }
  cap(0, true);
  cap(rings.length - 1, false);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, material);
  mesh.castShadow = true;
  return mesh;
}

function makeWheel(rimColor) {
  const g = new THREE.Group();
  const tire = new THREE.Mesh(
    new THREE.CylinderGeometry(0.45, 0.45, 0.34, 16),
    lambert(0x141414),
  );
  tire.rotation.z = Math.PI / 2;
  tire.castShadow = true;
  g.add(tire);
  const rim = new THREE.Mesh(
    new THREE.CylinderGeometry(0.3, 0.3, 0.36, 12),
    lambert(rimColor || 0xffffff),
  );
  rim.rotation.z = Math.PI / 2;
  g.add(rim);
  // Five star spokes: small bright boxes across the rim face.
  const spokeMat = lambert(0xffffff);
  for (let i = 0; i < 5; i += 1) {
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.52, 0.05), spokeMat);
    spoke.position.set(0, 0, 0);
    const holder = new THREE.Group();
    holder.rotation.x = (i / 5) * Math.PI * 2;
    holder.add(spoke);
    holder.position.x = 0.19;
    g.add(holder);
  }
  return g;
}

export function makeGarudaGT() {
  const g = new THREE.Group();
  const gold = new THREE.MeshPhongMaterial({
    color: 0xffb400, shininess: 220, specular: 0xffd27d,
  });
  const sections = [
    { z: -2.85, w: 2.3, y0: 0.28, y1: 0.95 },
    { z: -1.6, w: 2.38, y0: 0.24, y1: 1.02 },
    { z: -0.4, w: 2.32, y0: 0.22, y1: 1.06 },
    { z: 0.9, w: 2.2, y0: 0.2, y1: 0.9 },
    { z: 2.0, w: 1.9, y0: 0.16, y1: 0.64 },
    { z: 2.85, w: 1.15, y0: 0.16, y1: 0.5 },
  ];
  g.add(loftBody(sections, gold));

  // Black roof panel behind the open cockpit — kept narrow so the gold
  // deck still shows from above instead of the car reading as black.
  g.add(part(1.3, 0.1, 1.1, lambert(0x111111), 0, 1.02, -1.9));
  // Sloped windshield.
  const shield = part(1.9, 0.08, 1.3, new THREE.MeshPhongMaterial({ color: 0x1a2a3a, shininess: 160 }), 0, 0.95, -0.15);
  shield.rotation.x = -0.5;
  g.add(shield);
  // Dark cockpit tub, two seats and a roll bar.
  g.add(part(1.5, 0.5, 1.2, lambert(0x181818), 0, 0.62, -0.9));
  g.add(part(0.7, 0.7, 0.5, lambert(0x222222), -0.45, 0.9, -1.15));
  g.add(part(0.7, 0.7, 0.5, lambert(0x222222), 0.45, 0.9, -1.15));
  // Roll bar: a low white arch over the cockpit. It sits low (its feet
  // at the body's top edge) with short struts at both ends, so from
  // behind it reads as bolted to the body instead of floating above it.
  const bar = new THREE.Mesh(
    new THREE.TorusGeometry(0.85, 0.09, 8, 16, Math.PI),
    lambert(0xdddddd),
  );
  bar.position.set(0, 0.92, -1.7);
  g.add(bar);
  for (const sx of [-0.85, 0.85]) {
    g.add(part(0.12, 0.35, 0.12, lambert(0xdddddd), sx, 0.85, -1.7));
  }
  // Double white stripes following the hood slope — thin enough that
  // the gold hood still reads as gold.
  for (const sx of [-0.42, 0.42]) {
    const stripe = part(0.24, 0.05, 2.2, lambert(0xffffff), sx, 0.78, 1.35);
    stripe.rotation.x = 0.22;
    g.add(stripe);
  }
  // White side stripe.
  for (const sx of [-1, 1]) {
    g.add(part(0.05, 0.12, 4.6, lambert(0xffffff), sx * 1.16, 0.55, 0));
  }
  // Front splitter, chrome bumper, square headlights, grille.
  g.add(part(2.1, 0.16, 0.5, lambert(0x222222), 0, 0.22, 2.75));
  g.add(part(2.0, 0.14, 0.18, lambert(0xcccccc), 0, 0.42, 2.86));
  for (const sx of [-0.68, 0.68]) {
    g.add(part(0.5, 0.2, 0.08, new THREE.MeshBasicMaterial({ color: 0xfff6c9 }), sx, 0.52, 2.88));
  }
  g.add(part(0.9, 0.16, 0.08, lambert(0x111111), 0, 0.42, 2.88));
  // Full-width red taillight bar, diffuser fins, dual exhausts.
  g.add(part(2.1, 0.16, 0.08, new THREE.MeshBasicMaterial({ color: 0xff2a2a }), 0, 0.72, -2.87));
  for (const sx of [-0.5, 0, 0.5]) {
    g.add(part(0.12, 0.3, 0.5, lambert(0x111111), sx, 0.3, -2.8));
  }
  for (const sx of [-0.35, 0.35]) {
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.4, 10), lambert(0xcccccc));
    pipe.rotation.x = Math.PI / 2;
    pipe.position.set(sx, 0.3, -2.9);
    g.add(pipe);
  }
  // Big rear spoiler with end plates and struts. The blade is gold like
  // the body, so the rear of the car reads gold from a chase camera
  // instead of black; only the end plates stay black.
  g.add(part(2.2, 0.08, 0.7, gold, 0, 1.28, -2.75));
  for (const sx of [-1.05, 1.05]) {
    g.add(part(0.08, 0.5, 0.7, lambert(0x111111), sx, 1.05, -2.75));
    g.add(part(0.08, 0.4, 0.1, lambert(0x666666), sx, 0.95, -2.6));
  }
  // The hood stripes continue over the rear deck, outboard of the black
  // roof panel, so they read from a chase camera too.
  for (const sx of [-0.75, 0.75]) {
    g.add(part(0.22, 0.05, 2.0, lambert(0xffffff), sx, 1.05, -1.6));
  }
  // Side skirts and mirrors.
  for (const sx of [-1, 1]) {
    g.add(part(0.1, 0.18, 3.6, lambert(0x111111), sx * 1.18, 0.26, -0.2));
    g.add(part(0.28, 0.16, 0.2, lambert(0x111111), sx * 1.32, 0.92, 0.35));
  }
  // Wheels tucked under fender flares.
  const wheelSpots = [[-1.02, 1.95], [1.02, 1.95], [-1.02, -1.95], [1.02, -1.95]];
  for (const [wx, wz] of wheelSpots) {
    const wheel = makeWheel(0xffffff);
    wheel.position.set(wx, 0.45, wz);
    g.add(wheel);
    g.add(part(0.5, 0.3, 1.1, gold, wx, 0.62, wz));
  }
  return g;
}

function makeSimpleCar(bodyColor, kind) {
  const g = new THREE.Group();
  const body = lambert(bodyColor);
  if (kind === 'truck') {
    g.add(part(2.3, 1.6, 2.0, lambert(0xeeeeee), 0, 0.8, 2.2));
    g.add(part(2.4, 2.2, 3.6, lambert(0x7a8a99), 0, 1.1, -1.2));
  } else if (kind === 'van') {
    g.add(part(2.3, 1.9, 4.8, body, 0, 0.95, 0));
    g.add(part(2.0, 0.7, 0.3, new THREE.MeshPhongMaterial({ color: 0x223344, shininess: 120 }), 0, 1.5, 2.42));
  } else {
    g.add(part(2.1, 0.85, 4.6, body, 0, 0.55, 0));
    g.add(part(1.8, 0.7, 2.4, new THREE.MeshPhongMaterial({ color: 0x223344, shininess: 120 }), 0, 1.2, -0.3));
  }
  if (kind === 'taxi') {
    g.add(part(0.9, 0.35, 0.6, lambert(0xffb400), 0, 1.65, -0.3));
    for (const sx of [-0.9, 0.9]) g.add(part(0.2, 0.3, 4.4, lambert(0x111111), sx, 0.6, 0));
  }
  const wheelSpots = [[-1.0, 1.6], [1.0, 1.6], [-1.0, -1.6], [1.0, -1.6]];
  for (const [wx, wz] of wheelSpots) {
    const wheel = makeWheel(0x888888);
    wheel.scale.setScalar(0.9);
    wheel.position.set(wx, 0.42, wz);
    g.add(wheel);
  }
  return g;
}

export function makePoliceCar() {
  const g = makeSimpleCar(0xf2f2f2, 'sedan');
  g.add(part(2.14, 0.3, 4.62, lambert(0x2456c8), 0, 0.62, 0));
  const bar = part(1.3, 0.22, 0.5, lambert(0x222222), 0, 1.62, -0.3);
  g.add(bar);
  g.add(part(0.5, 0.24, 0.52, new THREE.MeshBasicMaterial({ color: 0xff2222 }), -0.32, 1.62, -0.3));
  g.add(part(0.5, 0.24, 0.52, new THREE.MeshBasicMaterial({ color: 0x2244ff }), 0.32, 1.62, -0.3));
  return g;
}

export function makeHelicopter() {
  const g = new THREE.Group();
  g.add(part(2.6, 1.6, 5.4, lambert(0xe8e8e8), 0, 0, 0));
  g.add(part(2.2, 1.2, 2.0, new THREE.MeshPhongMaterial({ color: 0x223344, shininess: 120 }), 0, 0.4, 2.0));
  const rotor = part(9, 0.12, 0.5, lambert(0x222222), 0, 1.2, 0);
  rotor.name = 'rotor';
  g.add(rotor);
  const tail = part(0.8, 0.8, 5, lambert(0xe8e8e8), 0, 0.3, -4.6);
  g.add(tail);
  const fin = part(0.2, 1.6, 1.2, lambert(0x2456c8), 0, 0.8, -6.8);
  g.add(fin);
  const spot = new THREE.SpotLight(0xfff2b0, 60, 90, 0.35, 0.5);
  spot.position.set(0, -1, 1);
  spot.target.position.set(0, -20, 4);
  g.add(spot, spot.target);
  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(6, 22, 16, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.14, side: THREE.DoubleSide, depthWrite: false }),
  );
  cone.rotation.x = Math.PI;
  cone.position.set(0, -12, 4);
  g.add(cone);
  return g;
}

export function makeWheelman() {
  const g = new THREE.Group();
  const skin = lambert(0xd99a6c);
  const shirt = lambert(0xe86a1c);
  const pants = lambert(0x1f2a44);
  // Legs and shoes.
  for (const sx of [-0.22, 0.22]) {
    g.add(part(0.32, 0.85, 0.36, pants, sx, 0.42, 0));
    g.add(part(0.34, 0.14, 0.55, lambert(0xffffff), sx, 0.07, 0.08));
  }
  // Orange shirt with a yellow square pattern, drawn as small bright boxes.
  const torso = part(0.95, 0.95, 0.5, shirt, 0, 1.35, 0);
  g.add(torso);
  const sqMat = lambert(0xffd23f);
  for (const [sx, sy] of [[-0.25, 1.55], [0.25, 1.55], [-0.25, 1.15], [0.25, 1.15]]) {
    g.add(part(0.2, 0.2, 0.06, sqMat, sx, sy, 0.27));
  }
  // Arms, one bent as if holding keys.
  for (const sx of [-0.62, 0.62]) {
    const arm = part(0.26, 0.8, 0.3, shirt, sx, 1.35, 0);
    arm.rotation.z = sx < 0 ? 0.25 : -0.25;
    g.add(arm);
  }
  g.add(part(0.3, 0.3, 0.3, skin, -0.72, 0.95, 0.1));
  g.add(part(0.3, 0.3, 0.3, skin, 0.72, 0.95, 0.1));
  // Head, black hair, sunglasses.
  g.add(part(0.55, 0.55, 0.5, skin, 0, 2.15, 0));
  g.add(part(0.58, 0.2, 0.53, lambert(0x111111), 0, 2.42, 0));
  g.add(part(0.5, 0.14, 0.06, lambert(0x0a0a0a), 0, 2.18, 0.27));
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

export function makeSeatedDriver() {
  const g = new THREE.Group();
  const skin = lambert(0xd99a6c);
  g.add(part(0.8, 0.7, 0.45, lambert(0xe86a1c), 0, 0.35, 0));
  g.add(part(0.5, 0.5, 0.45, skin, 0, 0.95, 0));
  g.add(part(0.54, 0.18, 0.48, lambert(0x111111), 0, 1.2, 0));
  g.add(part(0.46, 0.12, 0.05, lambert(0x0a0a0a), 0, 0.98, 0.24));
  for (const sx of [-0.5, 0.5]) {
    const arm = part(0.22, 0.6, 0.24, lambert(0xe86a1c), sx, 0.45, 0.35);
    arm.rotation.x = -0.9;
    g.add(arm);
  }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

// A drivable car: { group, kind, speed, heading, hp, stolen }.
// Heading 0 faces +z; forward is (sin h, 0, cos h). The colour of a
// plain traffic car comes from the caller so the seeded traffic
// generator can pick it deterministically; the hero and police cars
// always use their own fixed colours.
const TRAFFIC_COLORS = [0x7fb069, 0xef476f, 0x4fc3f7, 0xd8d8d8, 0x8a6f8a];
export function createCar(kind, x, z, heading, colour) {
  let group;
  if (kind === 'garuda') group = makeGarudaGT();
  else if (kind === 'police') group = makePoliceCar();
  else group = makeSimpleCar(kind === 'taxi' ? 0xffc400 : (colour ?? TRAFFIC_COLORS[0]), kind);
  group.position.set(x, 0, z);
  group.rotation.y = heading;
  const car = { group, kind, x, z, heading, speed: 0, hp: 100, stolen: false, drift: 0 };
  return car;
}

export function stepCar(car, input, dt, colliders) {
  const accel = input.forward() ? TUNING.carAccel : input.back() ? -TUNING.carBrake : 0;
  if (accel !== 0) {
    car.speed += accel * dt;
  } else {
    car.speed *= Math.max(0, 1 - 1.4 * dt);
  }
  const maxFwd = TUNING.carMaxSpeed;
  const maxRev = -TUNING.carReverse;
  car.speed = Math.max(maxRev, Math.min(maxFwd, car.speed));
  const steer = (input.left() ? 1 : 0) - (input.right() ? 1 : 0);
  const moving = Math.abs(car.speed) > 0.5;
  if (moving) {
    const dirSign = car.speed >= 0 ? 1 : -1;
    car.heading += steer * TUNING.carTurn * dt * dirSign * Math.min(1, Math.abs(car.speed) / 12);
    // Drifting: hard steering at speed builds a drift bonus.
    if (Math.abs(steer) > 0 && Math.abs(car.speed) > 26) {
      car.drift += dt;
    } else if (car.drift > 0) {
      car.drift = 0;
    }
  }
  const nx = car.x + Math.sin(car.heading) * car.speed * dt;
  const nz = car.z + Math.cos(car.heading) * car.speed * dt;
  // Soft arcade collision: slide along building boxes, never pass through.
  let cx = nx;
  let cz = nz;
  for (const b of colliders) {
    if (cx > b.x0 - 1.6 && cx < b.x1 + 1.6 && cz > b.z0 - 1.6 && cz < b.z1 + 1.6) {
      const dxl = cx - (b.x0 - 1.6);
      const dxr = (b.x1 + 1.6) - cx;
      const dzl = cz - (b.z0 - 1.6);
      const dzr = (b.z1 + 1.6) - cz;
      const m = Math.min(dxl, dxr, dzl, dzr);
      if (m === dxl) cx = b.x0 - 1.6;
      else if (m === dxr) cx = b.x1 + 1.6;
      else if (m === dzl) cz = b.z0 - 1.6;
      else cz = b.z1 + 1.6;
      car.speed *= 0.4;
    }
  }
  car.x = Math.max(-350, Math.min(350, cx));
  car.z = Math.max(-350, Math.min(350, cz));
  car.group.position.set(car.x, 0, car.z);
  car.group.rotation.y = car.heading;
}

export function makeTrafficCar(rng, kinds) {
  const kind = kinds[Math.floor(rng() * kinds.length)];
  const colors = [0x7fb069, 0xef476f, 0x4fc3f7, 0xd8d8d8, 0x8a6f8a];
  const car = createCar(kind, 0, 0, 0, colors[Math.floor(rng() * colors.length)]);
  return car;
}

export { range };
