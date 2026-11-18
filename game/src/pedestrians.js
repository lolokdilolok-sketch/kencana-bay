// Pedestrians: the people on the sidewalks, built like brick minifigures — a cylinder head
// with a smiling face and readable eyes, a shaped hair cap, a printed torso, arms that end
// in C-shaped hands, and two separate legs with shoes. The wheelman (orange patterned
// shirt, navy pants, white shoes, sunglasses) and Bambang (teal overalls, cap) reuse the
// same builder. Arms and legs swing from shoulder/hip pivots while they walk.

import { THREE } from './three-shim.js';
import { CITY } from './config.js';
import { pick, range } from './random.js';

const SHIRTS = [0xff7a2a, 0x3f7fbf, 0xe06a9a, 0x6fb98a, 0xffd34d, 0xb06ae0, 0xe8e8e8, 0x2a2e36];
const HAIRS = [0x1a1a1a, 0x3a2a1a, 0x6a6a6a, 0x8a5a2a];

/** A smiling minifig face: two eyes and a curved smile, drawn as small dark pieces on the
 * front of the cylinder head. The head is a cylinder, so the face reads from every angle
 * the camera can see it from. */
function minifigFace(head, y, withGlasses) {
  const dark = new THREE.MeshStandardMaterial({ color: 0x14141a, roughness: 0.4 });
  if (!withGlasses) {
    for (const s of [-0.07, 0.07]) {
      const eye = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.08, 0.02), dark);
      eye.position.set(s, y + 0.03, 0.215);
      head.add(eye);
    }
  }
  // Smile: the lower half of a thin torus, so the curve opens upward.
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.016, 6, 12, Math.PI), dark);
  smile.position.set(0, y - 0.07, 0.215);
  smile.rotation.z = Math.PI;
  head.add(smile);
}

/** Hair: a cap on top of the cylinder head plus a slab down the back, so the head reads as
 * a person from the front, the side and behind. */
function minifigHair(head, hairColor) {
  const mat = new THREE.MeshStandardMaterial({ color: hairColor, roughness: 1 });
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.23, 0.13, 12), mat);
  top.position.y = 0.16;
  head.add(top);
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.2, 0.12), mat);
  back.position.set(0, 0.04, -0.14);
  head.add(back);
  for (const s of [-0.18, 0.18]) {
    const side = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.16, 0.3), mat);
    side.position.set(s, 0.08, 0);
    head.add(side);
  }
}

/** A minifig arm: shoulder pivot, upper arm, and the iconic C-shaped hand at the end. */
function minifigArm(shirtMat, skinMat, side) {
  const pivot = new THREE.Group();
  pivot.position.set(side * 0.4, 1.24, 0);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.48, 0.18), shirtMat);
  arm.position.y = -0.24;
  arm.castShadow = true;
  pivot.add(arm);
  // C-hand: a torus arc, opening facing down-forward, like a brick figure's claw hand.
  const hand = new THREE.Mesh(new THREE.TorusGeometry(0.095, 0.038, 6, 10, Math.PI * 1.25), skinMat);
  hand.position.y = -0.54;
  hand.rotation.z = -0.5;
  pivot.add(hand);
  return pivot;
}

/** A minifig leg: hip pivot, leg, and a shoe that sticks out at the toe. */
function minifigLeg(pantsMat, shoeMat, side) {
  const pivot = new THREE.Group();
  pivot.position.set(side * 0.13, 0.74, 0);
  const leg = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.68, 0.26), pantsMat);
  leg.position.y = -0.34;
  leg.castShadow = true;
  pivot.add(leg);
  const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.1, 0.4), shoeMat);
  shoe.position.set(0, -0.69, 0.06);
  pivot.add(shoe);
  return pivot;
}

/** A minifig standing figure: cylinder head with face, printed torso, C-hands, two legs.
 * Height ~1.9 units. `pattern` paints small squares on the chest; `cap` swaps the hair
 * for a mechanic's cap; `glasses` hides the eyes behind black shades. */
export function buildCharacter({
  shirt = 0xff7a2a, pants = 0x2a2e36, skin = 0xd9a066, hair = 0x1a1a1a,
  cap = null, pattern = null, glasses = false, whiteShoes = false,
} = {}) {
  const person = new THREE.Group();
  const shirtMat = new THREE.MeshStandardMaterial({ color: shirt, roughness: 0.85 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: pants, roughness: 0.95 });
  const skinMat = new THREE.MeshStandardMaterial({ color: skin, roughness: 0.8 });
  const shoeMat = new THREE.MeshStandardMaterial({ color: whiteShoes ? 0xf2f2f2 : 0x1a1a1a, roughness: 0.6 });

  // Legs (hip pivots, so the walk swing rotates them naturally).
  const legs = [];
  for (const s of [-1, 1]) {
    const leg = minifigLeg(pantsMat, shoeMat, s);
    person.add(leg);
    legs.push(leg);
  }

  // Torso: a LEGO-style trapezoid — wide chest, narrower waist — with a printed front.
  const chest = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.5, 0.36), shirtMat);
  chest.position.y = 1.0;
  chest.castShadow = true;
  person.add(chest);
  const waist = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.22, 0.33), shirtMat);
  waist.position.y = 0.72;
  person.add(waist);
  // Shirt print: small accent squares on the chest, like a patterned Hawaiian shirt.
  if (pattern) {
    const patMat = new THREE.MeshStandardMaterial({ color: pattern, roughness: 0.8 });
    for (const [px, py] of [[-0.16, 1.08], [0.16, 1.08], [-0.16, 0.88], [0.16, 0.88]]) {
      const sq = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.11, 0.02), patMat);
      sq.position.set(px, py, 0.19);
      person.add(sq);
    }
  }
  // Collar line at the neck.
  const collar = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.05, 0.02), new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 }));
  collar.position.set(0, 1.24, 0.19);
  person.add(collar);

  // Arms (shoulder pivots).
  const arms = [];
  for (const s of [-1, 1]) {
    const arm = minifigArm(shirtMat, skinMat, s);
    person.add(arm);
    arms.push(arm);
  }

  // Neck + cylinder head with a face.
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.12, 8), skinMat);
  neck.position.y = 1.32;
  person.add(neck);
  const head = new THREE.Group();
  head.position.y = 1.55;
  const skull = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.32, 14), skinMat);
  skull.castShadow = true;
  head.add(skull);
  minifigFace(head, 0, glasses);
  if (glasses) {
    const shades = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.09, 0.04), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.2 }));
    shades.position.set(0, 0.05, 0.21);
    head.add(shades);
  }
  if (cap) {
    const capMat = new THREE.MeshStandardMaterial({ color: cap, roughness: 0.8 });
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.1, 12), capMat);
    crown.position.y = 0.18;
    head.add(crown);
    const brim = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.04, 0.22), capMat);
    brim.position.set(0, 0.14, 0.24);
    head.add(brim);
  } else {
    minifigHair(head, hair);
  }
  person.add(head);

  person.userData.arms = arms;
  person.userData.legs = legs;
  person.userData.head = head;
  return person;
}

/** The wheelman, as the title screen shows him: orange patterned shirt, navy pants, white
 * shoes, black hair, sunglasses, and a smile under the shades. */
export function buildWheelman() {
  return buildCharacter({
    shirt: 0xff7a2a, pants: 0x1a2a4a, skin: 0xd9a066, hair: 0x1a1a1a,
    pattern: 0xffd34d, glasses: true, whiteShoes: true,
  });
}

/** Bambang the mechanic: teal overalls and a cap. */
export function buildBambang() {
  return buildCharacter({
    shirt: 0x2a7a7a, pants: 0x1a4a4a, skin: 0xd9a066, hair: 0x1a1a1a, cap: 0x3fd2c0,
  });
}

export function createPedestrians(scene, rng, count = 22) {
  const walkers = [];
  for (let i = 0; i < count; i += 1) {
    const mesh = buildCharacter({
      shirt: pick(rng, SHIRTS),
      pants: pick(rng, [0x2a2e36, 0x4a3a2a, 0x1a2a4a]),
      hair: pick(rng, HAIRS),
      pattern: rng() < 0.5 ? pick(rng, [0xffd34d, 0xf2f2f2, 0x1a1a1a]) : null,
    });
    scene.add(mesh);
    const horizontal = rng() < 0.5;
    const line = Math.floor(range(rng, -3, 4)) * 120 + (rng() < 0.5 ? 9 : -9);
    walkers.push({
      mesh, horizontal, line,
      pos: range(rng, -400, 400),
      dir: rng() < 0.5 ? 1 : -1,
      speed: range(rng, 1.2, 2.4),
      phase: rng() * Math.PI * 2,
    });
  }
  function step(dt, time) {
    for (const w of walkers) {
      w.pos += w.dir * w.speed * dt;
      if (w.pos > 420) w.pos = -420;
      if (w.pos < -420) w.pos = 420;
      if (w.horizontal) {
        w.mesh.position.set(w.pos, 0, w.line);
        w.mesh.rotation.y = w.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
      } else {
        w.mesh.position.set(w.line, 0, w.pos);
        w.mesh.rotation.y = w.dir > 0 ? Math.PI : 0;
      }
      // A simple walk swing on the arm and leg pivots.
      const swing = Math.sin(time * 6 + w.phase) * 0.5;
      const arms = w.mesh.userData.arms || [];
      const legs = w.mesh.userData.legs || [];
      if (arms[0]) arms[0].rotation.x = swing;
      if (arms[1]) arms[1].rotation.x = -swing;
      if (legs[0]) legs[0].rotation.x = -swing;
      if (legs[1]) legs[1].rotation.x = swing;
    }
  }
  return { walkers, step };
}
