// Round 22 reseal — characters untouched, no logic change; this line is written in the round 22 reseal recorded session (01a2092d-3178-7290-b1e2-da8c5e84af71).
// Round 20: no logic change — characters untouched; this line is written in the round 20 recorded session.
// Realistic people: proportional humans ~1.75 units tall — a round head
// with a face (eyes, nose, mouth, brows), hair, a clothed torso, arms with
// hands, legs with shoes that swing when walking. Every character reads
// apart at a glance: distinct hair (ponytail, buzz, spiky, bun, bandana,
// cap), skin tone and shirt, plus small tells — a thin moustache for Agus,
// a thick one and rolled sleeves for Bambang, earrings for Ratna, a cheek
// scar for the enemy. The same builder makes the wheelman, the crew, the
// enemies and the pedestrians; portraits are painted on small canvases
// for the HUD. The export keeps the old name and
// return shape ({ group, head, legL, legR, armL, armR }) so every call
// site keeps working.
import { THREE, box, cylinder } from './three-shim.js';

export const CHARACTERS = {
  wheelman: { name: 'Raka', role: 'Wheelman', hair: 'black', shirt: '#3d8a4b', shirtPat: '#ffd94d', pants: '#232c4a', skin: '#f2c184' },
  ratna: { name: 'Ratna', role: 'Fixer · Contacts', hair: 'ponytail', shirt: '#8a4bd0', shirtPat: '#ff9ad5', pants: '#2a2a33', skin: '#f7d0a8', earrings: true },
  agus: { name: 'Agus Prasetyo', role: 'Driver · Getaway', hair: 'buzz', shirt: '#3d6fb5', shirtPat: '#9ac2ff', pants: '#232c4a', skin: '#d9a06a', moustache: 'thin' },
  bambang: { name: 'Bambang', role: 'Mechanic · Bengkel', hair: 'bandana', shirt: '#4b7d4b', shirtPat: '#c9c9c9', pants: '#3a3a3a', skin: '#c68a52', moustache: 'thick', rolledSleeves: true },
  slamet: { name: 'Slamet', role: 'Driver · Balapan', hair: 'black', shirt: '#e87fb5', shirtPat: '#ffd94d', pants: '#2a2a33', skin: '#d9a06a' },
  wanto: { name: 'Wanto', role: 'Komisaris KPD', hair: 'cap', shirt: '#2b4a8a', shirtPat: '#ffd94d', pants: '#1c2440', skin: '#e8b078' },
  enemy: { name: 'Geng Segara', role: 'Musuh', hair: 'spiky', shirt: '#c94b4b', shirtPat: '#5a1f1f', pants: '#2a2a2a', skin: '#b98a5a', scar: true },
  ped: { name: 'Warga', role: 'Pejalan kaki', hair: 'bun', shirt: '#7fb5d0', shirtPat: '#ffffff', pants: '#4a4a55', skin: '#e2ac7e' },
};

const HAIR_COLORS = { black: '#1c1c1c', brown: '#6b4a2b', pink: '#ff7fb5', bandana: '#c94b4b', cap: '#2b4a8a', ponytail: '#ff7fb5', buzz: '#1c1c1c', spiky: '#1c1c1c', bun: '#6b4a2b', strawhat: '#d8b25a', longhair: '#6b4a2b' };

/** Crowd variety (round 15, top-10 study): the street crowd is NOT one
 * repeated figure — 8 civilians with different shirts, hair, skin and
 * hats, so the sidewalks read as a crowd instead of clones. main.js
 * cycles the 18 generic pedestrians through these.
 * Round 16: the garage customer is CROWD_DEFS[2] (moved toward the door
 * in garage.js); the enemy figures are unchanged — their readability
 * fix is the red ground markers + beam tracers in shots.js. */
export const CROWD_DEFS = [
  { name: 'Warga', role: 'Pejalan kaki', hair: 'strawhat', shirt: '#ff8a3d', shirtPat: '#ffffff', pants: '#4a4a55', skin: '#e2ac7e' },
  { name: 'Warga', role: 'Pejalan kaki', hair: 'longhair', shirt: '#ff2e63', shirtPat: '#ffd94d', pants: '#2a2a33', skin: '#c68a52' },
  { name: 'Warga', role: 'Pejalan kaki', hair: 'bun', shirt: '#2ec4b6', shirtPat: '#ffffff', pants: '#232c4a', skin: '#f2c184' },
  { name: 'Warga', role: 'Pejalan kaki', hair: 'cap', shirt: '#ffd94d', shirtPat: '#1c1c1c', pants: '#3a3a3a', skin: '#8a5a3a' },
  { name: 'Warga', role: 'Pejalan kaki', hair: 'buzz', shirt: '#8a4bd0', shirtPat: '#ff9ad5', pants: '#2a2a2a', skin: '#d9a06a' },
  { name: 'Warga', role: 'Pejalan kaki', hair: 'ponytail', shirt: '#3d6fb5', shirtPat: '#9ac2ff', pants: '#4a4a55', skin: '#f7d0a8' },
  { name: 'Warga', role: 'Pejalan kaki', hair: 'spiky', shirt: '#e8a33d', shirtPat: '#1c1c1c', pants: '#232c4a', skin: '#b98a5a' },
  { name: 'Warga', role: 'Pejalan kaki', hair: 'strawhat', shirt: '#3d8a4b', shirtPat: '#ffd94d', pants: '#2a2a33', skin: '#e8b078' },
  // Round 17 (top-1 archetypes): a neon tourist and a magenta jogger,
  // so the crowd has the same high-contrast pops as the top-1 street.
  { name: 'Turis', role: 'Pejalan kaki', hair: 'cap', shirt: '#ff6b6b', shirtPat: '#ffe66d', pants: '#2ec4b6', skin: '#f2c184' },
  { name: 'Jogger', role: 'Pejalan kaki', hair: 'buzz', shirt: '#ff2e9a', shirtPat: '#2b6fd0', pants: '#1c1c22', skin: '#d9a06a' },
];

/** Build a realistic human ~1.75 units tall, facing +z. Returns { group, head, legL, legR, armL, armR }. */
export function buildMinifig(def, scale = 1) {
  const g = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({ color: def.skin, roughness: 0.6 });
  const shirt = new THREE.MeshStandardMaterial({ color: def.shirt, roughness: 0.8 });
  const pants = new THREE.MeshStandardMaterial({ color: def.pants, roughness: 0.85 });
  const hairColor = HAIR_COLORS[def.hair] ?? '#1c1c1c';
  const hairMat = new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.75 });
  const dark = new THREE.MeshStandardMaterial({ color: '#1c1c1c', roughness: 0.5 });

  // Legs: hip pivot at y 0.85 — thigh, shin, shoe with a toe forward.
  function leg(side) {
    const hip = new THREE.Group();
    const thigh = box(0.17, 0.42, 0.19, def.pants);
    thigh.position.y = -0.21;
    hip.add(thigh);
    const shin = box(0.15, 0.4, 0.16, def.pants);
    shin.position.y = -0.62;
    hip.add(shin);
    const shoe = box(0.16, 0.09, 0.3, '#1c1c1c');
    shoe.position.set(0, -0.8, 0.05);
    hip.add(shoe);
    // White sole under the shoe, so the feet read at a glance.
    const sole = box(0.17, 0.03, 0.32, '#f2f2f2');
    sole.position.set(0, -0.855, 0.05);
    hip.add(sole);
    hip.position.set(side * 0.11, 0.85, 0);
    return hip;
  }
  const legL = leg(-1);
  const legR = leg(1);
  g.add(legL, legR);
  // Torso: waist narrower than the shoulders, belt at the waist, a chest
  // pocket and a collar so the shirt reads as clothing, not a print.
  const torso = box(0.44, 0.52, 0.24, def.shirt);
  torso.position.y = 1.13;
  g.add(torso);
  const shoulders = box(0.5, 0.12, 0.26, def.shirt);
  shoulders.position.y = 1.38;
  g.add(shoulders);
  const belt = box(0.45, 0.07, 0.25, '#2a2a2a');
  belt.position.y = 0.88;
  g.add(belt);
  const pocket = box(0.1, 0.12, 0.02, def.shirtPat);
  pocket.position.set(-0.11, 1.28, 0.13);
  g.add(pocket);
  const collar = box(0.24, 0.05, 0.03, def.shirtPat);
  collar.position.set(0, 1.42, 0.12);
  g.add(collar);
  // Patterned shirt (round 7, like the reference character's patterned
  // red shirt): a 2x2 motif of accent squares on the chest and two on
  // the back, so the shirt reads as patterned cloth, not a flat print.
  for (const px of [-0.09, 0.09]) {
    for (const py of [1.06, 1.24]) {
      const motif = box(0.08, 0.08, 0.015, def.shirtPat);
      motif.position.set(px, py, 0.125);
      g.add(motif);
    }
  }
  for (const px of [-0.09, 0.09]) {
    const motif = box(0.08, 0.08, 0.015, def.shirtPat);
    motif.position.set(px, 1.15, -0.125);
    g.add(motif);
  }
  // Arms: shoulder pivot — upper arm (sleeve), forearm (skin), hand.
  // Rolled sleeves (Bambang the mechanic) show more forearm.
  function arm(side) {
    const a = new THREE.Group();
    const sleeveH = def.rolledSleeves ? 0.2 : 0.32;
    const foreH = def.rolledSleeves ? 0.42 : 0.3;
    const upper = box(0.12, sleeveH, 0.14, def.shirt);
    upper.position.y = -sleeveH / 2;
    a.add(upper);
    const fore = box(0.11, foreH, 0.12, def.skin);
    fore.position.y = -(sleeveH + foreH / 2);
    a.add(fore);
    const hand = box(0.1, 0.15, 0.06, def.skin);
    hand.position.y = -(sleeveH + foreH + 0.075);
    a.add(hand);
    a.position.set(side * 0.28, 1.38, 0);
    return a;
  }
  const armL = arm(-1);
  const armR = arm(1);
  g.add(armL, armR);
  // Neck + head: a slightly oval sphere with a real face — eyes, brows,
  // nose and mouth as small 3D features, so the face reads from any angle.
  const neck = cylinder(0.06, 0.07, 0.1, def.skin);
  neck.position.y = 1.45;
  g.add(neck);
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.135, 18, 14),
    skin,
  );
  head.scale.set(0.95, 1.15, 0.92);
  head.position.y = 1.6;
  head.castShadow = true;
  g.add(head);
  // Eyes + brows + mouth: a simple face, differentiated per character.
  // Ratna: bigger eyes, thin arched brows, small smile. Enemy: small eyes,
  // slanted angry brows, flat mouth. Bambang: thick brows, wide smile.
  // Agus: flat thin mouth. Slamet: tidy brows, small smile.
  const eyeR = def.hair === 'ponytail' ? 0.022 : def.hair === 'spiky' ? 0.015 : 0.018;
  const browH = def.hair === 'bandana' ? 0.02 : def.hair === 'ponytail' ? 0.008 : 0.012;
  for (const sx of [-0.05, 0.05]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(eyeR, 8, 6), dark);
    eye.position.set(sx, 1.62, 0.124);
    g.add(eye);
    const brow = box(0.055, browH, 0.01, '#1c1c1c');
    brow.position.set(sx, def.hair === 'ponytail' ? 1.672 : 1.665, 0.118);
    if (def.hair === 'spiky') brow.rotation.z = -Math.sign(sx) * 0.35; // angry slant
    g.add(brow);
  }
  // Round 17: the nose is a small cone pointing forward (top-1 recipe)
  // instead of a flat box — it catches the light and reads as a nose
  // from the side, where the box vanished.
  const nose = new THREE.Mesh(
    new THREE.ConeGeometry(0.022, 0.07, 8),
    skin,
  );
  nose.rotation.x = Math.PI / 2;
  nose.position.set(0, 1.58, 0.14);
  g.add(nose);
  const mouthW = def.hair === 'bandana' ? 0.09 : def.hair === 'buzz' ? 0.07 : def.hair === 'spiky' ? 0.06 : 0.07;
  const mouthH = def.hair === 'buzz' || def.hair === 'spiky' ? 0.008 : 0.012;
  const mouth = box(mouthW, mouthH, 0.012, '#5a2a2a');
  mouth.position.set(0, 1.525, 0.12);
  g.add(mouth);
  // Hair / hat. The cap is tilted so the front hairline sits above the
  // eyes while the back still covers the head.
  function hairCap(y = 1.63, z = -0.01, r = 0.15) {
    const hair = new THREE.Mesh(
      new THREE.SphereGeometry(r, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.52),
      hairMat,
    );
    hair.position.set(0, y, z);
    hair.rotation.x = -0.25;
    hair.castShadow = true;
    return hair;
  }
  if (def.hair === 'cap') {
    const capTop = cylinder(0.16, 0.16, 0.1, '#1c2440');
    capTop.position.y = 1.72;
    g.add(capTop);
    const brim = box(0.4, 0.03, 0.22, '#1c2440');
    brim.position.set(0, 1.68, 0.14);
    g.add(brim);
    const badge = box(0.08, 0.06, 0.02, '#ffd94d');
    badge.position.set(0, 1.72, 0.15);
    g.add(badge);
  } else if (def.hair === 'bandana') {
    g.add(hairCap());
    const band = cylinder(0.152, 0.152, 0.09, '#c94b4b');
    band.position.y = 1.68;
    g.add(band);
    const knot = box(0.1, 0.14, 0.06, '#c94b4b');
    knot.position.set(0.14, 1.66, -0.12);
    g.add(knot);
  } else if (def.hair === 'ponytail') {
    g.add(hairCap());
    // A long tail down the back, tied with a band in her accent colour.
    const tail = box(0.11, 0.46, 0.09, hairColor);
    tail.position.set(0, 1.38, -0.16);
    tail.rotation.x = 0.12;
    g.add(tail);
    const tie = box(0.13, 0.05, 0.11, def.shirtPat);
    tie.position.set(0, 1.6, -0.15);
    g.add(tie);
  } else if (def.hair === 'buzz') {
    // A buzz cut hugs the skull: a lower, tighter cap than full hair.
    g.add(hairCap(1.62, -0.01, 0.14));
  } else if (def.hair === 'spiky') {
    g.add(hairCap());
    // Five spikes fanning out over the top of the head.
    for (let i = 0; i < 5; i += 1) {
      const a = (i / 5) * Math.PI * 2;
      const spike = cylinder(0.001, 0.045, 0.16, hairColor);
      spike.position.set(Math.cos(a) * 0.07, 1.78, Math.sin(a) * 0.07 - 0.01);
      spike.rotation.z = -Math.cos(a) * 0.5;
      spike.rotation.x = Math.sin(a) * 0.5;
      g.add(spike);
    }
  } else if (def.hair === 'bun') {
    g.add(hairCap());
    const bun = new THREE.Mesh(new THREE.SphereGeometry(0.085, 12, 10), hairMat);
    bun.position.set(0, 1.76, -0.11);
    bun.castShadow = true;
    g.add(bun);
  } else if (def.hair === 'strawhat') {
    // A wide straw hat: a flat brim + a low dome, in straw yellow.
    g.add(hairCap(1.6, -0.01, 0.13));
    const brim = cylinder(0.24, 0.24, 0.03, '#d8b25a');
    brim.position.y = 1.7;
    g.add(brim);
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(0.13, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5),
      new THREE.MeshStandardMaterial({ color: '#d8b25a', roughness: 0.8 }),
    );
    dome.position.y = 1.7;
    g.add(dome);
  } else if (def.hair === 'longhair') {
    g.add(hairCap());
    // Long hair down the back, past the shoulders.
    const back = box(0.2, 0.5, 0.08, hairColor);
    back.position.set(0, 1.38, -0.15);
    g.add(back);
  } else {
    g.add(hairCap());
  }
  // Moustache (Agus thin, Bambang thick), earrings (Ratna) and a cheek
  // scar (enemy) — small features that tell the crew apart at a glance.
  if (def.moustache) {
    const thick = def.moustache === 'thick';
    const mo = box(thick ? 0.11 : 0.09, thick ? 0.035 : 0.02, 0.025, '#1c1c1c');
    mo.position.set(0, 1.55, 0.126);
    g.add(mo);
  }
  if (def.earrings) {
    for (const sx of [-0.13, 0.13]) {
      const ear = new THREE.Mesh(
        new THREE.SphereGeometry(0.02, 8, 6),
        new THREE.MeshStandardMaterial({ color: '#ffd94d', roughness: 0.3, metalness: 0.8 }),
      );
      ear.position.set(sx, 1.56, 0);
      g.add(ear);
    }
  }
  if (def.scar) {
    const scar = box(0.015, 0.09, 0.012, '#8a4a3a');
    scar.position.set(0.06, 1.57, 0.115);
    scar.rotation.z = 0.5;
    g.add(scar);
  }
  // Sunglasses for the wheelman and the KPD commissioner (round 17:
  // the top-1 player + police both wear black shades).
  if (def === CHARACTERS.wheelman || def === CHARACTERS.wanto) {
    for (const sx of [-0.05, 0.05]) {
      const lens = box(0.085, 0.06, 0.02, '#111111');
      lens.position.set(sx, 1.62, 0.128);
      g.add(lens);
    }
    const bridge = box(0.03, 0.015, 0.02, '#111111');
    bridge.position.set(0, 1.62, 0.128);
    g.add(bridge);
  }
  g.scale.setScalar(scale);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return { group: g, head, legL, legR, armL, armR };
}

/** The smiling face, painted once per character and reused as a texture. */
const faceCache = new Map();
export function faceTexture(def) {
  if (faceCache.has(def.name)) return faceCache.get(def.name);
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 64;
  const x = c.getContext('2d');
  x.fillStyle = def.skin;
  x.fillRect(0, 0, 128, 64);
  x.fillStyle = '#1c1c1c';
  // Eyes.
  x.beginPath(); x.arc(44, 26, 5, 0, Math.PI * 2); x.fill();
  x.beginPath(); x.arc(84, 26, 5, 0, Math.PI * 2); x.fill();
  // Smile.
  x.strokeStyle = '#1c1c1c';
  x.lineWidth = 4;
  x.beginPath(); x.arc(64, 34, 16, 0.15 * Math.PI, 0.85 * Math.PI); x.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  faceCache.set(def.name, t);
  return t;
}

/** A rounded-square portrait card for the HUD dialogue / mission list. */
export function portraitCanvas(def, size = 96) {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(size / 2, size * 0.35, 6, size / 2, size / 2, size * 0.75);
  g.addColorStop(0, def.shirtPat);
  g.addColorStop(1, def.shirt);
  x.fillStyle = g;
  x.fillRect(0, 0, size, size);
  // Head.
  x.fillStyle = def.skin;
  x.beginPath(); x.arc(size / 2, size * 0.42, size * 0.24, 0, Math.PI * 2); x.fill();
  // Hair.
  x.fillStyle = HAIR_COLORS[def.hair] ?? '#1c1c1c';
  x.beginPath(); x.arc(size / 2, size * 0.36, size * 0.24, Math.PI, 0); x.fill();
  if (def.hair === 'ponytail') {
    // The tail hangs down beside the head, tied with a band.
    x.fillRect(size * 0.64, size * 0.3, size * 0.12, size * 0.24);
    x.beginPath(); x.arc(size * 0.7, size * 0.54, size * 0.09, 0, Math.PI * 2); x.fill();
    x.fillStyle = def.shirtPat;
    x.fillRect(size * 0.64, size * 0.32, size * 0.12, size * 0.05);
  }
  if (def.hair === 'buzz') {
    // A buzz cut is a thin cap hugging the skull.
    x.beginPath(); x.arc(size / 2, size * 0.38, size * 0.22, Math.PI, 0); x.fill();
  }
  if (def.hair === 'spiky') {
    for (let i = 0; i < 3; i += 1) {
      const sx = size * (0.36 + i * 0.14);
      x.beginPath();
      x.moveTo(sx - size * 0.05, size * 0.2);
      x.lineTo(sx, size * 0.08);
      x.lineTo(sx + size * 0.05, size * 0.2);
      x.closePath(); x.fill();
    }
  }
  if (def.hair === 'bun') {
    x.beginPath(); x.arc(size / 2, size * 0.12, size * 0.09, 0, Math.PI * 2); x.fill();
  }
  if (def.hair === 'cap') {
    x.fillStyle = '#1c2440';
    x.fillRect(size * 0.26, size * 0.16, size * 0.48, size * 0.1);
    x.fillStyle = '#ffd94d';
    x.fillRect(size * 0.46, size * 0.18, size * 0.08, size * 0.06);
  }
  if (def.hair === 'bandana') {
    x.fillStyle = '#c94b4b';
    x.fillRect(size * 0.26, size * 0.2, size * 0.48, size * 0.09);
  }
  // Eyes — size and lashes differ per character.
  const eyeR = def.hair === 'ponytail' ? size * 0.045 : def.hair === 'spiky' ? size * 0.028 : size * 0.035;
  x.fillStyle = '#1c1c1c';
  for (const s of [-1, 1]) {
    x.beginPath(); x.arc(size * (0.5 + s * 0.08), size * 0.42, eyeR, 0, Math.PI * 2); x.fill();
    if (def.hair === 'ponytail') {
      // lashes: two tiny strokes above each eye
      x.strokeStyle = '#1c1c1c';
      x.lineWidth = size * 0.012;
      x.beginPath();
      x.moveTo(size * (0.5 + s * 0.08) - size * 0.02, size * 0.42 - eyeR);
      x.lineTo(size * (0.5 + s * 0.08) - size * 0.03, size * 0.42 - eyeR - size * 0.04);
      x.moveTo(size * (0.5 + s * 0.08) + size * 0.02, size * 0.42 - eyeR);
      x.lineTo(size * (0.5 + s * 0.08) + size * 0.03, size * 0.42 - eyeR - size * 0.04);
      x.stroke();
    }
  }
  // Brows — shape differs per character.
  x.strokeStyle = HAIR_COLORS[def.hair] ?? '#1c1c1c';
  if (def.hair === 'bandana') {
    x.lineWidth = size * 0.04; // thick straight
    x.beginPath();
    x.moveTo(size * 0.36, size * 0.34);
    x.lineTo(size * 0.47, size * 0.34);
    x.moveTo(size * 0.53, size * 0.34);
    x.lineTo(size * 0.64, size * 0.34);
    x.stroke();
  } else if (def.hair === 'ponytail') {
    x.lineWidth = size * 0.014; // thin arched
    x.beginPath();
    x.arc(size * 0.42, size * 0.35, size * 0.055, Math.PI * 1.15, Math.PI * 1.85);
    x.arc(size * 0.58, size * 0.35, size * 0.055, Math.PI * 1.15, Math.PI * 1.85);
    x.stroke();
  } else if (def.hair === 'spiky') {
    x.lineWidth = size * 0.024; // slanted angry
    x.beginPath();
    x.moveTo(size * 0.37, size * 0.33);
    x.lineTo(size * 0.47, size * 0.36);
    x.moveTo(size * 0.63, size * 0.33);
    x.lineTo(size * 0.53, size * 0.36);
    x.stroke();
  } else {
    x.lineWidth = size * 0.02; // straight thin
    x.beginPath();
    x.moveTo(size * 0.37, size * 0.34);
    x.lineTo(size * 0.46, size * 0.34);
    x.moveTo(size * 0.54, size * 0.34);
    x.lineTo(size * 0.63, size * 0.34);
    x.stroke();
  }
  // Mouth — smile differs per character.
  x.strokeStyle = '#6a3a2a';
  if (def.hair === 'buzz' || def.hair === 'spiky') {
    x.lineWidth = size * 0.02; // flat thin line
    x.beginPath();
    x.moveTo(size * 0.45, size * 0.56);
    x.lineTo(size * 0.55, size * 0.56);
    x.stroke();
  } else if (def.hair === 'bandana') {
    x.lineWidth = size * 0.02; // wide smile
    x.beginPath();
    x.arc(size / 2, size * 0.5, size * 0.11, Math.PI * 0.15, Math.PI * 0.85);
    x.stroke();
  } else if (def.hair === 'ponytail') {
    x.lineWidth = size * 0.02; // small smile, pink lips
    x.strokeStyle = '#e87fb5';
    x.beginPath();
    x.arc(size / 2, size * 0.52, size * 0.06, Math.PI * 0.15, Math.PI * 0.85);
    x.stroke();
  } else {
    x.lineWidth = size * 0.02; // default smile
    x.beginPath();
    x.arc(size / 2, size * 0.46, size * 0.1, 0.15 * Math.PI, 0.85 * Math.PI);
    x.stroke();
  }
  if (def === CHARACTERS.wheelman) {
    x.fillStyle = '#111111';
    x.fillRect(size * 0.34, size * 0.38, size * 0.32, size * 0.07);
  }
  // Moustache, earrings and scar, matching the 3D model.
  if (def.moustache) {
    x.fillStyle = '#1c1c1c';
    const mh = def.moustache === 'thick' ? size * 0.035 : size * 0.02;
    x.fillRect(size * 0.44, size * 0.5, size * 0.12, mh);
  }
  if (def.earrings) {
    x.fillStyle = '#ffd94d';
    x.beginPath(); x.arc(size * 0.26, size * 0.44, size * 0.02, 0, Math.PI * 2); x.fill();
    x.beginPath(); x.arc(size * 0.74, size * 0.44, size * 0.02, 0, Math.PI * 2); x.fill();
  }
  if (def.scar) {
    x.strokeStyle = '#8a4a3a';
    x.lineWidth = size * 0.02;
    x.beginPath(); x.moveTo(size * 0.6, size * 0.34); x.lineTo(size * 0.65, size * 0.44); x.stroke();
  }
  // Shoulders.
  x.fillStyle = def.shirt;
  x.beginPath(); x.arc(size / 2, size * 1.05, size * 0.42, Math.PI, 0); x.fill();
  x.fillStyle = def.shirtPat;
  x.fillRect(size * 0.42, size * 0.72, size * 0.16, size * 0.28);
  return c;
}
