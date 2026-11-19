// Every vehicle is built from boxes and one lofted body: the Garuda GT is a
// low, wide sports car with a closed glass cabin and a human driver visible
// inside; traffic, taxis and KPD cars are real-looking sedans and vans with
// glasshouses, door lines and alloy wheels.
import { THREE, box, cylinder, canvasTexture, loftGeometry } from './three-shim.js';
import { buildMinifig, CHARACTERS } from './pedestrians.js';

/** Tinted glass for cabins, windshields and windows. */
const glassMat = new THREE.MeshStandardMaterial({
  color: '#0e1a26', roughness: 0.35, metalness: 0.1,
  transparent: true, opacity: 0.65, depthWrite: false,
});

/** White text on a transparent background, for KPD decals and signs. */
function textTexture(text, fg, size = 56) {
  return canvasTexture(256, 96, (x, w, h) => {
    x.clearRect(0, 0, w, h);
    x.fillStyle = fg;
    x.font = `bold ${size}px system-ui, sans-serif`;
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.fillText(text, w / 2, h / 2);
  });
}

/** An alloy wheel: tyre, dark rim disc, five spokes and a hub. */
function wheel(r = 0.46) {
  const g = new THREE.Group();
  const tire = new THREE.Mesh(
    new THREE.CylinderGeometry(r, r, 0.32, 20),
    new THREE.MeshStandardMaterial({ color: '#141414', roughness: 0.9 }),
  );
  tire.rotation.z = Math.PI / 2;
  tire.castShadow = true;
  g.add(tire);
  const rim = new THREE.Mesh(
    new THREE.CylinderGeometry(r * 0.66, r * 0.66, 0.34, 24),
    new THREE.MeshStandardMaterial({ color: '#3a3f46', roughness: 0.3, metalness: 0.8 }),
  );
  rim.rotation.z = Math.PI / 2;
  g.add(rim);
  for (const fx of [-0.18, 0.18]) {
    for (let i = 0; i < 5; i += 1) {
      const a = (i / 5) * Math.PI * 2;
      const spoke = box(0.05, r * 1.05, 0.12, '#c9ced6', { metal: 0.8, rough: 0.3 });
      spoke.position.set(fx, Math.cos(a) * r * 0.3, Math.sin(a) * r * 0.3);
      spoke.rotation.x = a;
      g.add(spoke);
    }
    const hub = new THREE.Mesh(
      new THREE.CylinderGeometry(r * 0.2, r * 0.2, 0.05, 12),
      new THREE.MeshStandardMaterial({ color: '#c9ced6', roughness: 0.3, metalness: 0.8 }),
    );
    hub.rotation.z = Math.PI / 2;
    hub.position.x = fx;
    g.add(hub);
  }
  return g;
}

/**
 * A sports car from lofted cross-sections. `color` is the body paint, `opts`
 * chooses stripes, spoiler, roof and whether a driver sits inside.
 * The car faces -z when driving forward... it faces +z in the scene: the
 * nose is at +z, so a heading of 0 drives toward +z.
 */
export function buildSportsCar(color, opts = {}) {
  const g = new THREE.Group();
  const L = opts.length ?? 5.7;
  const W = opts.width ?? 2.3;
  const sections = [
    { z: L / 2, w: W * 0.82, y0: 0.42, y1: 0.62 }, // pointed low nose
    { z: L * 0.28, w: W * 0.96, y0: 0.38, y1: 0.82 }, // hood
    { z: L * 0.02, w: W, y0: 0.38, y1: 0.92 }, // cowl
    { z: -L * 0.22, w: W * 0.97, y0: 0.38, y1: 0.88 }, // cabin base
    { z: -L / 2, w: W * 0.88, y0: 0.4, y1: 0.86 }, // tail
  ];
  const bodyMat = new THREE.MeshStandardMaterial({
    color, roughness: 0.25, metalness: 0.55,
  });
  const body = new THREE.Mesh(loftGeometry(sections), bodyMat);
  body.castShadow = true;
  body.receiveShadow = true;
  g.add(body);
  // Double white stripes over the hood and rear deck.
  for (const sx of [-0.32, 0.32]) {
    const stripe = box(0.22, 0.06, L * 0.62, '#f5f5f0', { metal: 0.2, rough: 0.4 });
    stripe.position.set(sx, 0.9, L * 0.12);
    stripe.rotation.x = -0.06;
    g.add(stripe);
  }
  // Closed glass cabin: sloped windshield, roof, side glass and rear
  // glass, so the car reads as a real coupe — not an open tub.
  const shield = new THREE.Mesh(
    new THREE.BoxGeometry(W * 0.8, 0.05, 1.25),
    glassMat,
  );
  shield.position.set(0, 1.1, L * 0.09);
  shield.rotation.x = 0.55;
  g.add(shield);
  const roof = box(W * 0.8, 0.1, 1.6, color, { metal: 0.5, rough: 0.3 });
  roof.position.set(0, 1.4, -L * 0.12);
  roof.rotation.x = -0.1;
  g.add(roof);
  // C-pillars + rear deck close the cabin from behind, so the rear view
  // reads as a coupe instead of an open tub.
  for (const sx of [-1, 1]) {
    const pillar = box(0.09, 0.5, 0.12, color, { metal: 0.5, rough: 0.3 });
    pillar.position.set(sx * W * 0.4, 1.18, -L * 0.3);
    pillar.rotation.x = -0.35;
    g.add(pillar);
  }
  const deck = box(W * 0.86, 0.05, 0.6, color, { metal: 0.5, rough: 0.3 });
  deck.position.set(0, 0.9, -L * 0.42);
  g.add(deck);
  for (const sx of [-1, 1]) {
    const sideGlass = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.42, 1.5),
      glassMat,
    );
    sideGlass.position.set(sx * W * 0.42, 1.16, -L * 0.12);
    g.add(sideGlass);
    const pillar = box(0.07, 0.55, 0.07, color, { metal: 0.5, rough: 0.3 });
    pillar.position.set(sx * W * 0.4, 1.2, L * 0.14);
    pillar.rotation.x = 0.5;
    g.add(pillar);
  }
  const rearGlass = new THREE.Mesh(
    new THREE.BoxGeometry(W * 0.78, 0.05, 1.0),
    glassMat,
  );
  rearGlass.position.set(0, 1.12, -L * 0.32);
  rearGlass.rotation.x = -0.5;
  g.add(rearGlass);
  // Interior: seats, dashboard, steering wheel.
  for (const sx of [-0.42, 0.42]) {
    const seat = box(0.5, 0.42, 0.5, '#7a1f1f');
    seat.position.set(sx, 0.98, -L * 0.16);
    g.add(seat);
  }
  const dash = box(W * 0.7, 0.18, 0.4, '#1c1c22');
  dash.position.set(0, 1.0, L * 0.02);
  g.add(dash);
  const wheelRim = new THREE.Mesh(
    new THREE.TorusGeometry(0.22, 0.03, 8, 20),
    new THREE.MeshStandardMaterial({ color: '#1c1c1c', roughness: 0.5 }),
  );
  wheelRim.position.set(0.42, 1.06, L * 0.0);
  wheelRim.rotation.x = -0.5;
  g.add(wheelRim);
  // Human driver, seated low so head and shoulders show through the glass.
  if (opts.driver !== false) {
    const d = buildMinifig(CHARACTERS.wheelman, 0.72);
    d.group.position.set(0.42, 0.15, -L * 0.14);
    d.group.rotation.y = 0;
    g.add(d.group);
  }
  // Headlights, grille, chrome bumper, splitter.
  for (const sx of [-0.72, 0.72]) {
    const light = box(0.42, 0.14, 0.08, '#fff8d0', { glow: 0xfff2b0 });
    light.position.set(sx, 0.62, L / 2 + 0.02);
    g.add(light);
  }
  const grille = box(0.9, 0.16, 0.06, '#1c1c1c');
  grille.position.set(0, 0.52, L / 2 + 0.02);
  g.add(grille);
  const emblem = box(0.16, 0.16, 0.04, '#ffd94d', { metal: 0.8, rough: 0.25 });
  emblem.position.set(0, 0.72, L / 2 + 0.04);
  g.add(emblem);
  const bumper = box(W * 0.94, 0.14, 0.14, '#d8d8d8', { metal: 0.85, rough: 0.25 });
  bumper.position.set(0, 0.44, L / 2 + 0.04);
  g.add(bumper);
  const splitter = box(W * 0.9, 0.06, 0.5, '#1c1c1c');
  splitter.position.set(0, 0.36, L / 2 + 0.2);
  g.add(splitter);
  // Full-width rear light bar, diffuser, dual exhausts.
  const tail = box(W * 0.86, 0.12, 0.06, '#d21f2b', { glow: 0xd21f2b });
  tail.position.set(0, 0.72, -L / 2 - 0.02);
  g.add(tail);
  const diffuser = box(W * 0.7, 0.16, 0.3, '#1c1c1c');
  diffuser.position.set(0, 0.4, -L / 2 - 0.1);
  g.add(diffuser);
  for (const sx of [-0.4, 0.4]) {
    const ex = cylinder(0.09, 0.09, 0.2, '#c9c9c9', { metal: 0.9, rough: 0.2 });
    ex.rotation.x = Math.PI / 2;
    ex.position.set(sx, 0.44, -L / 2 - 0.22);
    g.add(ex);
  }
  // Big spoiler with white edges.
  if (opts.spoiler !== false) {
    const wing = box(W * 0.96, 0.07, 0.55, color, { metal: 0.5, rough: 0.3 });
    wing.position.set(0, 1.18, -L / 2 + 0.28);
    g.add(wing);
    for (const sx of [-W * 0.48, W * 0.48]) {
      const edge = box(0.06, 0.18, 0.55, '#f5f5f0');
      edge.position.set(sx, 1.18, -L / 2 + 0.28);
      g.add(edge);
    }
    for (const sx of [-0.7, 0.7]) {
      const strut = box(0.08, 0.3, 0.08, '#222222');
      strut.position.set(sx, 1.0, -L / 2 + 0.28);
      g.add(strut);
    }
  }
  // Wheels tucked under fender flares.
  for (const [wx, wz] of [[-1.0, L * 0.3], [1.0, L * 0.3], [-1.0, -L * 0.3], [1.0, -L * 0.3]]) {
    const wh = wheel(0.46);
    wh.position.set(wx, 0.46, wz);
    g.add(wh);
    const flare = box(0.24, 0.1, 1.1, color, { metal: 0.5, rough: 0.3 });
    flare.position.set(wx * 1.02, 0.86, wz);
    g.add(flare);
  }
  // Side skirts + mirrors.
  for (const sx of [-1.12, 1.12]) {
    const skirt = box(0.08, 0.12, L * 0.55, '#1c1c1c');
    skirt.position.set(sx, 0.4, 0);
    g.add(skirt);
    const mirror = box(0.16, 0.1, 0.12, '#1c1c1c');
    mirror.position.set(sx * 1.05, 0.98, L * 0.16);
    g.add(mirror);
  }
  g.userData.bodyMat = bodyMat;
  return g;
}

/** A real-looking sedan / taxi / van: glasshouse with a roof, sloped
 * windshield and rear glass, door lines, handles, bumpers, mirrors and
 * alloy wheels. */
export function buildStreetCar(kind = 'sedan', color = '#8a8f96') {
  const g = new THREE.Group();
  const L = kind === 'van' ? 5.2 : 4.6;
  const W = 2.0;
  const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.4 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(W, 0.85, L), bodyMat);
  body.position.y = 0.78;
  body.castShadow = true;
  g.add(body);
  // Glasshouse: tinted glass band with a body-colour roof, sloped
  // windshield and rear glass.
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(W * 0.84, 0.5, L * 0.46),
    glassMat,
  );
  cabin.position.set(0, 1.45, kind === 'van' ? 0.3 : -0.2);
  g.add(cabin);
  const roof = box(W * 0.88, 0.08, L * 0.5, color, { metal: 0.4, rough: 0.4 });
  roof.position.set(0, 1.74, kind === 'van' ? 0.3 : -0.2);
  g.add(roof);
  const shield = new THREE.Mesh(
    new THREE.BoxGeometry(W * 0.8, 0.05, 0.95),
    glassMat,
  );
  shield.position.set(0, 1.5, kind === 'van' ? 1.45 : 0.95);
  shield.rotation.x = 0.45;
  g.add(shield);
  const rearGlass = new THREE.Mesh(
    new THREE.BoxGeometry(W * 0.8, 0.05, 0.9),
    glassMat,
  );
  rearGlass.position.set(0, 1.5, kind === 'van' ? -0.85 : -1.35);
  rearGlass.rotation.x = -0.45;
  g.add(rearGlass);
  // Door shut lines, handles, bumpers, grille, mirrors.
  for (const sx of [-1, 1]) {
    for (const dz of [0.55, -0.65]) {
      const line = box(0.02, 0.5, 0.03, '#1c1c1c');
      line.position.set(sx * (W / 2 + 0.01), 0.85, dz);
      g.add(line);
    }
    const handle = box(0.04, 0.05, 0.2, '#222831');
    handle.position.set(sx * (W / 2 + 0.02), 1.02, 0.3);
    g.add(handle);
    const stalk = box(0.1, 0.04, 0.06, '#1c1c1c');
    stalk.position.set(sx * (W / 2 + 0.05), 1.28, 0.9);
    g.add(stalk);
    const mirror = box(0.06, 0.12, 0.16, '#1c1c1c');
    mirror.position.set(sx * (W / 2 + 0.12), 1.3, 0.9);
    g.add(mirror);
  }
  for (const sz of [1, -1]) {
    const bumper = box(W * 0.96, 0.16, 0.12, '#222831');
    bumper.position.set(0, 0.45, sz * (L / 2 + 0.02));
    g.add(bumper);
  }
  const grille = box(0.9, 0.18, 0.06, '#1c1c1c');
  grille.position.set(0, 0.78, L / 2 + 0.02);
  g.add(grille);
  if (kind === 'taxi') {
    const sign = box(0.7, 0.22, 0.3, '#ffd94d', { glow: 0xffd94d });
    sign.position.set(0, 1.85, -0.2);
    g.add(sign);
    for (const sx of [-0.5, 0.5]) {
      const stripe = box(0.1, 0.2, L, '#ffd94d');
      stripe.position.set(sx, 0.8, 0);
      g.add(stripe);
    }
  }
  for (const sx of [-0.7, 0.7]) {
    const light = box(0.3, 0.12, 0.06, '#fff8d0', { glow: 0xfff2b0 });
    light.position.set(sx, 0.8, L / 2 + 0.02);
    g.add(light);
    const tail = box(0.3, 0.12, 0.06, '#d21f2b', { glow: 0xd21f2b });
    tail.position.set(sx, 0.8, -L / 2 - 0.02);
    g.add(tail);
  }
  for (const [wx, wz] of [[-0.9, L * 0.32], [0.9, L * 0.32], [-0.9, -L * 0.32], [0.9, -L * 0.32]]) {
    const wh = wheel(0.42);
    wh.position.set(wx, 0.42, wz);
    g.add(wh);
  }
  g.userData.bodyMat = bodyMat;
  return g;
}

/** A KPD patrol car: blue-white livery, KPD decals, push bar, red-blue light bar. */
export function buildPoliceCar() {
  const g = buildStreetCar('sedan', '#f2f2f2');
  const blue = box(2.02, 0.3, 4.62, '#2b6fd0', { metal: 0.3, rough: 0.4 });
  blue.position.y = 0.62;
  g.add(blue);
  const decal = box(2.04, 0.34, 1.6, '#2b6fd0');
  decal.position.set(0, 0.95, 0.4);
  g.add(decal);
  const bar = box(2.0, 0.1, 0.14, '#1c1c1c');
  bar.position.set(0, 0.5, 2.32);
  g.add(bar);
  for (const [sx, col] of [[-0.5, '#ff2e2e'], [0.5, '#2b6fd0']]) {
    const lamp = box(0.5, 0.14, 0.3, col, { glow: col === '#ff2e2e' ? 0xff2e2e : 0x2b6fd0 });
    lamp.position.set(sx, 1.82, -0.2);
    g.add(lamp);
  }
  // KPD door decals on both sides.
  const kpdTex = textTexture('KPD', '#ffffff', 64);
  for (const sx of [-1, 1]) {
    const decal = new THREE.Mesh(
      new THREE.PlaneGeometry(1.2, 0.45),
      new THREE.MeshStandardMaterial({ map: kpdTex, transparent: true, roughness: 0.5 }),
    );
    decal.position.set(sx * 1.03, 0.95, 0.4);
    decal.rotation.y = sx * Math.PI / 2;
    g.add(decal);
  }
  return g;
}

/**
 * The KPD helicopter, built like a real one: white-blue body with a stripe,
 * a glass bubble canopy with a human pilot visible inside, an engine deck,
 * a long tail with fin and stabilizer, a 4-blade main rotor with a faint
 * blur disc, tail rotor, skids, a searchlight and a spotlight cone.
 * Scale ~1.6x a car, so it reads from the ground.
 */
export function buildHelicopter() {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: '#f2f2f2', roughness: 0.4, metalness: 0.3 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.6, 4.2), bodyMat);
  body.castShadow = true;
  g.add(body);
  const stripe = box(2.44, 0.4, 4.24, '#2b6fd0');
  stripe.position.y = -0.2;
  g.add(stripe);
  // Engine deck hump on top, with exhaust stubs.
  const deck = box(1.8, 0.5, 2.2, '#e8e8e8', { metal: 0.4, rough: 0.4 });
  deck.position.set(0, 1.0, -0.6);
  g.add(deck);
  for (const sx of [-1.0, 1.0]) {
    const exhaust = cylinder(0.14, 0.14, 0.5, '#444444', { metal: 0.7, rough: 0.4 });
    exhaust.rotation.z = Math.PI / 2;
    exhaust.position.set(sx, 0.9, -1.4);
    g.add(exhaust);
  }
  // KPD decals on both flanks.
  const kpdTex = textTexture('KPD', '#2b6fd0', 64);
  for (const sx of [-1, 1]) {
    const decal = new THREE.Mesh(
      new THREE.PlaneGeometry(1.6, 0.6),
      new THREE.MeshStandardMaterial({ map: kpdTex, transparent: true, roughness: 0.5 }),
    );
    decal.position.set(sx * 1.22, 0.1, 0.3);
    decal.rotation.y = sx * Math.PI / 2;
    g.add(decal);
  }
  const nose = new THREE.Mesh(
    new THREE.SphereGeometry(1.15, 14, 10),
    new THREE.MeshStandardMaterial({ color: '#7fd0e8', roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.55 }),
  );
  nose.scale.set(1, 0.85, 1.1);
  nose.position.set(0, 0.15, 1.9);
  g.add(nose);
  // Human pilot seated in the cockpit, head visible through the canopy.
  const pilot = buildMinifig(CHARACTERS.wanto, 0.62);
  pilot.group.position.set(0.45, -0.64, 1.55);
  g.add(pilot.group);
  // Dashboard + second seat.
  const dash = box(1.8, 0.3, 0.5, '#222831');
  dash.position.set(0, 0.1, 1.35);
  g.add(dash);
  const seat2 = box(0.5, 0.5, 0.5, '#2b2b33');
  seat2.position.set(-0.45, -0.1, 1.2);
  g.add(seat2);
  // Tail boom, fin, stabilizer, KPD decal.
  const boom = box(0.7, 0.7, 4.6, '#f2f2f2', { metal: 0.3, rough: 0.4 });
  boom.position.set(0, 0.35, -4.2);
  g.add(boom);
  const fin = box(0.16, 1.6, 1.2, '#2b6fd0');
  fin.position.set(0, 1.1, -6.2);
  g.add(fin);
  const stab = box(2.0, 0.12, 0.7, '#2b6fd0');
  stab.position.set(0, 0.6, -5.6);
  g.add(stab);
  // Main rotor: 4 long blades on a mast.
  const rotor = new THREE.Group();
  const mast = cylinder(0.16, 0.16, 0.7, '#333333');
  mast.position.y = 1.1;
  rotor.add(mast);
  for (let i = 0; i < 4; i += 1) {
    const blade = box(5.4, 0.06, 0.34, '#222222');
    blade.position.set(0, 1.45, 0);
    const holder = new THREE.Group();
    holder.rotation.y = (i * Math.PI) / 2;
    holder.add(blade);
    blade.position.x = 2.9;
    rotor.add(holder);
  }
  g.add(rotor);
  g.userData.rotor = rotor;
  // Faint blur disc: at rest it reads as a spinning rotor.
  const blur = new THREE.Mesh(
    new THREE.CircleGeometry(5.8, 32),
    new THREE.MeshBasicMaterial({ color: '#888888', transparent: true, opacity: 0.07, side: THREE.DoubleSide, depthWrite: false }),
  );
  blur.rotation.x = -Math.PI / 2;
  blur.position.y = 1.5;
  g.add(blur);
  // Tail rotor.
  const tailRotor = new THREE.Group();
  for (let i = 0; i < 2; i += 1) {
    const blade = box(1.3, 0.06, 0.16, '#222222');
    const holder = new THREE.Group();
    holder.rotation.z = (i * Math.PI) / 2;
    blade.position.x = 0.7;
    holder.add(blade);
    tailRotor.add(holder);
  }
  tailRotor.position.set(0.45, 0.8, -6.3);
  tailRotor.rotation.z = Math.PI / 2;
  g.add(tailRotor);
  g.userData.tailRotor = tailRotor;
  // Skids.
  for (const sx of [-1.0, 1.0]) {
    const skid = box(0.12, 0.12, 4.4, '#333333');
    skid.position.set(sx, -1.05, 0.2);
    g.add(skid);
    for (const sz of [-1.2, 1.2]) {
      const strut = box(0.1, 0.5, 0.1, '#333333');
      strut.position.set(sx, -0.8, sz);
      g.add(strut);
    }
  }
  // Winch + cable.
  const winch = box(0.5, 0.4, 0.5, '#444444');
  winch.position.set(0, -0.9, -0.8);
  g.add(winch);
  const cable = cylinder(0.03, 0.03, 1.6, '#888888');
  cable.position.set(0, -1.8, -0.8);
  g.add(cable);
  // Red-blue light bar + searchlight + spotlight cone (translucent, aimed down).
  for (const [sx, col] of [[-0.6, '#ff2e2e'], [0.6, '#2b6fd0']]) {
    const lamp = box(0.5, 0.12, 0.3, col, { glow: col === '#ff2e2e' ? 0xff2e2e : 0x2b6fd0 });
    lamp.position.set(sx, -0.85, 1.2);
    g.add(lamp);
  }
  const search = cylinder(0.18, 0.22, 0.3, '#333333', { metal: 0.6, rough: 0.4 });
  search.rotation.x = Math.PI / 2;
  search.position.set(0, -0.75, 2.1);
  g.add(search);
  const searchLens = new THREE.Mesh(
    new THREE.CircleGeometry(0.16, 14),
    new THREE.MeshBasicMaterial({ color: '#fff8d0' }),
  );
  searchLens.position.set(0, -0.75, 2.27);
  g.add(searchLens);
  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(3.2, 14, 20, 1, true),
    new THREE.MeshBasicMaterial({ color: '#fff2b0', transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false }),
  );
  cone.position.set(0, -8, 1.2);
  cone.rotation.x = Math.PI;
  g.add(cone);
  g.userData.cone = cone;
  return g;
}
