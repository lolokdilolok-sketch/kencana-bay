// Realistic people: proportional humans ~1.75 units tall — a round head
// with a face (eyes, nose, mouth, brows), hair, a clothed torso, arms with
// hands, legs with shoes that swing when walking. The same builder makes
// the wheelman, the crew, the enemies and the pedestrians; portraits are
// painted on small canvases for the HUD. The export keeps the old name and
// return shape ({ group, head, legL, legR, armL, armR }) so every call
// site keeps working.
import { THREE, box, cylinder } from './three-shim.js';

export const CHARACTERS = {
  wheelman: { name: 'Raka', role: 'Wheelman', hair: 'black', shirt: '#e87f2e', shirtPat: '#ffd94d', pants: '#232c4a', skin: '#f2c184' },
  ratna: { name: 'Ratna', role: 'Fixer · Contacts', hair: 'pink', shirt: '#8a4bd0', shirtPat: '#ff9ad5', pants: '#2a2a33', skin: '#f2c184' },
  agus: { name: 'Agus Prasetyo', role: 'Driver · Getaway', hair: 'black', shirt: '#3d6fb5', shirtPat: '#9ac2ff', pants: '#232c4a', skin: '#e8b078' },
  bambang: { name: 'Bambang', role: 'Mechanic · Bengkel', hair: 'bandana', shirt: '#4b7d4b', shirtPat: '#c9c9c9', pants: '#3a3a3a', skin: '#e8b078' },
  wanto: { name: 'Wanto', role: 'Komisaris KPD', hair: 'cap', shirt: '#2b4a8a', shirtPat: '#ffd94d', pants: '#1c2440', skin: '#f2c184' },
  enemy: { name: 'Geng Segara', role: 'Musuh', hair: 'black', shirt: '#c94b4b', shirtPat: '#5a1f1f', pants: '#2a2a2a', skin: '#d8a878' },
  ped: { name: 'Warga', role: 'Pejalan kaki', hair: 'brown', shirt: '#7fb5d0', shirtPat: '#ffffff', pants: '#4a4a55', skin: '#e8b078' },
};

const HAIR_COLORS = { black: '#1c1c1c', brown: '#6b4a2b', pink: '#ff7fb5', bandana: '#c94b4b', cap: '#2b4a8a' };

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
  function arm(side) {
    const a = new THREE.Group();
    const upper = box(0.12, 0.32, 0.14, def.shirt);
    upper.position.y = -0.16;
    a.add(upper);
    const fore = box(0.11, 0.3, 0.12, def.skin);
    fore.position.y = -0.46;
    a.add(fore);
    const hand = box(0.1, 0.15, 0.06, def.skin);
    hand.position.y = -0.64;
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
  function hairCap(y = 1.63, z = -0.01) {
    const hair = new THREE.Mesh(
      new THREE.SphereGeometry(0.15, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.52),
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
  } else if (def.hair === 'pink') {
    g.add(hairCap());
    for (const sx of [-0.13, 0.13]) {
      const lock = box(0.09, 0.4, 0.12, hairColor);
      lock.position.set(sx, 1.42, -0.02);
      g.add(lock);
    }
    const back = box(0.26, 0.42, 0.08, hairColor);
    back.position.set(0, 1.42, -0.12);
    g.add(back);
  } else {
    g.add(hairCap());
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
  if (def.hair === 'pink') {
    x.beginPath(); x.arc(size / 2, size * 0.36, size * 0.26, Math.PI, 0); x.fill();
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
  // Shoulders.
  x.fillStyle = def.shirt;
  x.beginPath(); x.arc(size / 2, size * 1.05, size * 0.42, Math.PI, 0); x.fill();
  x.fillStyle = def.shirtPat;
  x.fillRect(size * 0.42, size * 0.72, size * 0.16, size * 0.28);
  return c;
}
