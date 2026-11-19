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
  wheelman: { name: 'Raka', role: 'Wheelman', hair: 'black', shirt: '#e87f2e', shirtPat: '#ffd94d', pants: '#232c4a', skin: '#f2c184' },
  ratna: { name: 'Ratna', role: 'Fixer · Contacts', hair: 'ponytail', shirt: '#8a4bd0', shirtPat: '#ff9ad5', pants: '#2a2a33', skin: '#f7d0a8', earrings: true },
  agus: { name: 'Agus Prasetyo', role: 'Driver · Getaway', hair: 'buzz', shirt: '#3d6fb5', shirtPat: '#9ac2ff', pants: '#232c4a', skin: '#d9a06a', moustache: 'thin' },
  bambang: { name: 'Bambang', role: 'Mechanic · Bengkel', hair: 'bandana', shirt: '#4b7d4b', shirtPat: '#c9c9c9', pants: '#3a3a3a', skin: '#c68a52', moustache: 'thick', rolledSleeves: true },
  wanto: { name: 'Wanto', role: 'Komisaris KPD', hair: 'cap', shirt: '#2b4a8a', shirtPat: '#ffd94d', pants: '#1c2440', skin: '#e8b078' },
  enemy: { name: 'Geng Segara', role: 'Musuh', hair: 'spiky', shirt: '#c94b4b', shirtPat: '#5a1f1f', pants: '#2a2a2a', skin: '#b98a5a', scar: true },
  ped: { name: 'Warga', role: 'Pejalan kaki', hair: 'bun', shirt: '#7fb5d0', shirtPat: '#ffffff', pants: '#4a4a55', skin: '#e2ac7e' },
};

const HAIR_COLORS = { black: '#1c1c1c', brown: '#6b4a2b', pink: '#ff7fb5', bandana: '#c94b4b', cap: '#2b4a8a', ponytail: '#ff7fb5', buzz: '#1c1c1c', spiky: '#1c1c1c', bun: '#6b4a2b' };

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
  for (const sx of [-0.05, 0.05]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), dark);
    eye.position.set(sx, 1.62, 0.124);
    g.add(eye);
    const brow = box(0.055, 0.012, 0.01, '#1c1c1c');
    brow.position.set(sx, 1.665, 0.118);
    g.add(brow);
  }
  const nose = box(0.03, 0.06, 0.03, def.skin);
  nose.position.set(0, 1.58, 0.128);
  g.add(nose);
  const mouth = box(0.07, 0.012, 0.012, '#5a2a2a');
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
  // Sunglasses for the wheelman.
  if (def === CHARACTERS.wheelman) {
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
  // Eyes + smile.
  x.fillStyle = '#1c1c1c';
  x.beginPath(); x.arc(size * 0.42, size * 0.42, size * 0.035, 0, Math.PI * 2); x.fill();
  x.beginPath(); x.arc(size * 0.58, size * 0.42, size * 0.035, 0, Math.PI * 2); x.fill();
  x.strokeStyle = '#1c1c1c';
  x.lineWidth = size * 0.03;
  x.beginPath(); x.arc(size / 2, size * 0.46, size * 0.1, 0.15 * Math.PI, 0.85 * Math.PI); x.stroke();
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
