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

/** Lighter glass for the Garuda's rear window, so the driver shows through. */
const rearGlassMat = new THREE.MeshStandardMaterial({
  color: '#1a2a3a', roughness: 0.25, metalness: 0.1,
  transparent: true, opacity: 0.3, depthWrite: false,
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
  const disc = new THREE.Mesh(
    new THREE.CylinderGeometry(r * 0.5, r * 0.5, 0.05, 16),
    new THREE.MeshStandardMaterial({ color: '#c9ced6', roughness: 0.3, metalness: 0.8 }),
  );
  disc.rotation.z = Math.PI / 2;
  g.add(disc);
  // Red brake caliper at the top of the disc, visible through the spokes.
  const caliper = box(0.1, r * 0.4, 0.12, '#c94b4b');
  caliper.position.set(0, r * 0.35, 0);
  g.add(caliper);
  for (const fx of [-0.18, 0.18]) {
    for (let i = 0; i < 7; i += 1) {
      const a = (i / 7) * Math.PI * 2;
      const spoke = box(0.045, r * 1.05, 0.12, '#c9ced6', { metal: 0.8, rough: 0.3 });
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
  // Arched roof: two panels meeting at a crown ridge above the cabin, so
  // the roof reads as a curve from behind instead of a flat board.
  // Roof in a DEEPER shade of the body paint, low metalness (round 9):
  // the roof panels face the sky, and at metal 0.5 they mirrored the
  // pink sunset and read pale cream from behind instead of the body
  // colour. Darkened + rougher, the roof keeps its gold from the chase
  // camera. Round 10: even duller (metal 0.12, rough 0.68) and the
  // crown ridge — the highest edge, where the sun highlight sat — gets
  // its own darker, almost-matte material, so the roof reads evenly
  // gold without a bright top line. Round 11: highlight killed outright —
  // metal 0 and rough 0.92/0.95, so the panels are diffuse-only and the
  // directional sun can no longer put a specular line on the top edge
  // (round 10 still showed a very soft line at metal 0.12/0.08).
  // Derived from `color`, so every paint keeps its own roof.
  const roofColor = `#${new THREE.Color(color).multiplyScalar(0.6).getHexString()}`;
  const roofOpts = { metal: 0, rough: 0.92 };
  const ridgeColor = `#${new THREE.Color(color).multiplyScalar(0.45).getHexString()}`;
  const ridgeOpts = { metal: 0, rough: 0.95 };
  const roofFront = box(W * 0.8, 0.08, 0.95, roofColor, roofOpts);
  roofFront.position.set(0, 1.47, -L * 0.12 + 0.4);
  roofFront.rotation.x = 0.17;
  g.add(roofFront);
  const roofRear = box(W * 0.8, 0.08, 0.95, roofColor, roofOpts);
  roofRear.position.set(0, 1.47, -L * 0.12 - 0.47);
  roofRear.rotation.x = -0.17;
  g.add(roofRear);
  const ridge = box(W * 0.8, 0.05, 0.14, ridgeColor, ridgeOpts);
  ridge.position.set(0, 1.55, -L * 0.12 - 0.03);
  g.add(ridge);
  // C-pillars + rear deck close the cabin from behind, so the rear view
  // reads as a coupe instead of an open tub.
  for (const sx of [-1, 1]) {
    const pillar = box(0.09, 0.5, 0.12, roofColor, roofOpts);
    pillar.position.set(sx * W * 0.4, 1.18, -L * 0.3);
    pillar.rotation.x = -0.35;
    g.add(pillar);
  }
  const deck = box(W * 0.86, 0.05, 0.6, roofColor, roofOpts);
  deck.position.set(0, 0.9, -L * 0.42);
  g.add(deck);
  for (const sx of [-1, 1]) {
    const sideGlass = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.42, 1.5),
      glassMat,
    );
    sideGlass.position.set(sx * W * 0.42, 1.16, -L * 0.12);
    g.add(sideGlass);
    const pillar = box(0.07, 0.55, 0.07, roofColor, roofOpts);
    pillar.position.set(sx * W * 0.4, 1.2, L * 0.14);
    pillar.rotation.x = 0.5;
    g.add(pillar);
  }
  // Rear glass: bigger, more sloped and lighter than the side glass, so
  // the driver reads through it from the chase camera behind the car.
  const rearGlass = new THREE.Mesh(
    new THREE.BoxGeometry(W * 0.82, 0.05, 1.2),
    rearGlassMat,
  );
  rearGlass.position.set(0, 1.14, -L * 0.30);
  rearGlass.rotation.x = -0.58;
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
  // Human driver, seated so head and shoulders show through the rear
  // glass from the chase camera, with a headrest behind him — and a
  // matching passenger headrest. He sits a touch lower now (y 0.16) so
  // his head clears the headliner.
  if (opts.driver !== false) {
    const d = buildMinifig(CHARACTERS.wheelman, 0.72);
    d.group.position.set(0.42, 0.16, -L * 0.14);
    d.group.rotation.y = 0;
    g.add(d.group);
    for (const sx of [-0.42, 0.42]) {
      const headrest = box(0.34, 0.24, 0.1, '#7a1f1f');
      headrest.position.set(sx, 1.28, -L * 0.14 - 0.22);
      g.add(headrest);
      for (const px of [-0.1, 0.1]) {
        const post = box(0.04, 0.16, 0.04, '#1c1c1c');
        post.position.set(sx + px, 1.18, -L * 0.14 - 0.22);
        g.add(post);
      }
    }
  }
  // Hood shut lines: the panel gaps over the front wheels.
  for (const sx of [-0.8, 0.8]) {
    const seam = box(0.03, 0.02, L * 0.5, '#1c1c1c');
    seam.position.set(sx, 0.88, L * 0.12);
    seam.rotation.x = -0.06;
    g.add(seam);
  }
  // Door shut lines + handles + side indicators, so the flanks read as
  // real doors, not one smooth slab (round 7, like the reference car).
  for (const sx of [-1, 1]) {
    for (const dz of [0.62, -0.72]) {
      const line = box(0.02, 0.42, 0.03, '#1c1c1c');
      line.position.set(sx * (W / 2 + 0.01), 0.72, dz);
      g.add(line);
    }
    const handle = box(0.04, 0.05, 0.22, '#d8d8d8', { metal: 0.85, rough: 0.25 });
    handle.position.set(sx * (W / 2 + 0.02), 0.86, 0.1);
    g.add(handle);
    const indicator = box(0.03, 0.07, 0.14, '#ff8a3d', { glow: 0xff8a3d });
    indicator.position.set(sx * (W / 2 + 0.02), 0.72, L * 0.3);
    g.add(indicator);
  }
  // Headlights, grille, chrome bumper, splitter, fog lights.
  for (const sx of [-0.72, 0.72]) {
    const light = box(0.5, 0.18, 0.08, '#fff8d0', { glow: 0xfff2b0 });
    light.position.set(sx, 0.62, L / 2 + 0.02);
    g.add(light);
  }
  for (const sx of [-0.85, 0.85]) {
    const fog = box(0.14, 0.08, 0.04, '#fff8d0', { glow: 0xfff2b0 });
    fog.position.set(sx, 0.44, L / 2 + 0.12);
    g.add(fog);
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
  // Full-width rear light bar, chrome strip above it, reverse lights,
  // trunk-lid seam, license plate, diffuser, dual exhausts. The tail bar
  // is taller and the chrome strip thicker than round 6, and the plate
  // is bigger (0.72u) with a dark border, so the rear details read from
  // the chase camera instead of blurring into one gold slab.
  const tail = box(W * 0.86, 0.18, 0.06, '#d21f2b', { glow: 0xd21f2b });
  tail.position.set(0, 0.72, -L / 2 - 0.02);
  g.add(tail);
  const chrome = box(W * 0.86, 0.07, 0.03, '#d8d8d8', { metal: 0.85, rough: 0.25 });
  chrome.position.set(0, 0.83, -L / 2 - 0.04);
  g.add(chrome);
  for (const sx of [-1, 1]) {
    const rev = box(0.2, 0.12, 0.04, '#f2f2f2', { glow: 0xffffff });
    rev.position.set(sx * (W * 0.86 / 2 - 0.12), 0.72, -L / 2 - 0.04);
    g.add(rev);
  }
  // Trunk lid seam across the rear deck.
  const lidSeam = box(W * 0.7, 0.015, 0.03, '#1c1c1c');
  lidSeam.position.set(0, 0.93, -L * 0.42 + 0.28);
  g.add(lidSeam);
  // License plate: KB·1998 on white, dark border for contrast against
  // the gold body.
  const plateTex = canvasTexture(160, 44, (x, w, h) => {
    x.fillStyle = '#1c1c1c';
    x.fillRect(0, 0, w, h);
    x.fillStyle = '#f2f2f2';
    x.fillRect(3, 3, w - 6, h - 6);
    x.fillStyle = '#1c1c1c';
    x.font = 'bold 26px system-ui, sans-serif';
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.fillText('KB·1998', w / 2, h / 2 + 1);
  });
  const plate = new THREE.Mesh(
    new THREE.PlaneGeometry(0.72, 0.2),
    new THREE.MeshStandardMaterial({ map: plateTex, roughness: 0.5 }),
  );
  plate.position.set(0, 0.56, -L / 2 - 0.06);
  plate.rotation.y = Math.PI;
  g.add(plate);
  const diffuser = box(W * 0.7, 0.16, 0.3, '#1c1c1c');
  diffuser.position.set(0, 0.4, -L / 2 - 0.1);
  g.add(diffuser);
  for (const sx of [-0.4, 0.4]) {
    const ex = cylinder(0.09, 0.09, 0.2, '#c9c9c9', { metal: 0.9, rough: 0.2 });
    ex.rotation.x = Math.PI / 2;
    ex.position.set(sx, 0.44, -L / 2 - 0.22);
    g.add(ex);
  }
  // Thin rear wing with white edges (round 7: slimmer than before, like
  // the reference car's low rear wing).
  if (opts.spoiler !== false) {
    const wing = box(W * 0.96, 0.05, 0.55, color, { metal: 0.5, rough: 0.3 });
    wing.position.set(0, 1.18, -L / 2 + 0.28);
    g.add(wing);
    for (const sx of [-W * 0.48, W * 0.48]) {
      const edge = box(0.06, 0.14, 0.55, '#f5f5f0');
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

/** A real-looking sedan / taxi / van / hatchback: glasshouse with a roof,
 * sloped windshield and rear glass, door lines, handles, bumpers, mirrors
 * and alloy wheels. Every second 'sedan' request builds a hatchback
 * instead (a deterministic counter, so traffic stops being one repeated
 * sedan body) — pass { forceSedan: true } to keep a real sedan. */
let sedanCount = 0;
export function buildStreetCar(kind = 'sedan', color = '#8a8f96', opts = {}) {
  if (kind === 'truck') return buildBoxTruck(color);
  if (kind === 'motorcycle') return buildMotorcycle();
  if (kind === 'sedan' && !opts.forceSedan) {
    sedanCount += 1;
    if (sedanCount % 2 === 0) kind = 'hatchback';
  }
  const g = new THREE.Group();
  const hb = kind === 'hatchback';
  const L = opts.length ?? (kind === 'van' ? 5.2 : hb ? 4.1 : 4.6);
  const W = 2.0;
  const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.4 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(W, 0.85, L), bodyMat);
  body.position.y = 0.78;
  body.castShadow = true;
  g.add(body);
  // Glasshouse: tinted glass band with a body-colour roof, sloped
  // windshield and rear glass. The hatchback's glasshouse runs longer and
  // its tailgate glass stands more upright.
  const cabinZ = kind === 'van' ? 0.3 : hb ? -0.05 : -0.2;
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(W * 0.84, 0.5, hb ? L * 0.52 : L * 0.46),
    glassMat,
  );
  cabin.position.set(0, 1.45, cabinZ);
  g.add(cabin);
  const roof = box(W * 0.88, 0.08, hb ? L * 0.58 : L * 0.5, color, { metal: 0.4, rough: 0.4 });
  roof.position.set(0, 1.74, cabinZ);
  g.add(roof);
  const shield = new THREE.Mesh(
    new THREE.BoxGeometry(W * 0.8, 0.05, 0.95),
    glassMat,
  );
  shield.position.set(0, 1.5, kind === 'van' ? 1.45 : hb ? 0.8 : 0.95);
  shield.rotation.x = 0.45;
  g.add(shield);
  const rearGlass = new THREE.Mesh(
    new THREE.BoxGeometry(W * 0.8, 0.05, 0.9),
    glassMat,
  );
  rearGlass.position.set(0, 1.5, kind === 'van' ? -0.85 : hb ? -1.5 : -1.35);
  rearGlass.rotation.x = hb ? -0.3 : -0.45;
  g.add(rearGlass);
  if (hb) {
    // Roof spoiler lip over the tailgate + a rear wiper on the glass.
    const lip = box(W * 0.88, 0.06, 0.32, color, { metal: 0.4, rough: 0.4 });
    lip.position.set(0, 1.76, -1.3);
    g.add(lip);
    const wiper = box(0.04, 0.32, 0.02, '#1c1c1c');
    wiper.position.set(0.3, 1.38, -1.85);
    wiper.rotation.x = -0.3;
    g.add(wiper);
  }
  // Hood + trunk shut lines, side skirts, roof antenna fin, side indicators.
  for (const sz of [1, -1]) {
    const seam = box(W * 0.7, 0.015, 0.03, '#1c1c1c');
    seam.position.set(0, 1.21, sz * L * 0.28);
    g.add(seam);
  }
  for (const sx of [-1, 1]) {
    const skirt = box(0.06, 0.1, L * 0.5, '#1c1c1c');
    skirt.position.set(sx * (W / 2 + 0.02), 0.42, 0);
    g.add(skirt);
    const indicator = box(0.03, 0.06, 0.12, '#ff8a3d', { glow: 0xff8a3d });
    indicator.position.set(sx * (W / 2 + 0.02), 1.05, 0.85);
    g.add(indicator);
  }
  const fin = box(0.04, 0.12, 0.3, '#1c1c1c');
  fin.position.set(0, 1.82, -0.6);
  g.add(fin);
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

/**
 * A cab-over delivery truck, built like a real one: a cab with a sloped
 * windshield, grille, bumper, mirrors and roof marker lights, a white
 * cargo box with a blue stripe and a KENCANA EXPRESS logo, rear doors,
 * six wheels. Faces +z like every other vehicle.
 */
export function buildBoxTruck(color = '#e8a33d') {
  const g = new THREE.Group();
  const W = 2.5;
  // Chassis.
  const chassis = box(W * 0.8, 0.3, 6.0, '#1c1c1c');
  chassis.position.set(0, 0.45, 0);
  g.add(chassis);
  // Cargo box: white, blue stripe, logo on both flanks.
  const cargo = new THREE.Mesh(
    new THREE.BoxGeometry(W, 2.8, 4.4),
    new THREE.MeshStandardMaterial({ color: '#f2f2f2', roughness: 0.5, metalness: 0.1 }),
  );
  cargo.position.set(0, 1.9, -1.2);
  cargo.castShadow = true;
  g.add(cargo);
  const stripe = box(W + 0.04, 0.5, 4.44, '#2b6fd0');
  stripe.position.set(0, 1.5, -1.2);
  g.add(stripe);
  // Logo texture drawn wide (512x192) so 'KENCANA EXPRESS' fits whole —
  // the old 256-wide texture clipped both ends of the name.
  const logoTex = canvasTexture(512, 192, (x, w, h) => {
    x.clearRect(0, 0, w, h);
    x.fillStyle = '#2b6fd0';
    x.font = 'bold 48px system-ui, sans-serif';
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.fillText('KENCANA EXPRESS', w / 2, h / 2);
  });
  for (const sx of [-1, 1]) {
    const logo = new THREE.Mesh(
      new THREE.PlaneGeometry(3.4, 1.28),
      new THREE.MeshStandardMaterial({ map: logoTex, transparent: true, roughness: 0.5 }),
    );
    logo.position.set(sx * (W / 2 + 0.02), 2.5, -1.2);
    logo.rotation.y = sx * Math.PI / 2;
    g.add(logo);
  }
  // Logo on the REAR doors too: the chase camera sees the truck's tail,
  // not its flanks, so the flanks alone never read in the screenshot.
  const rearLogo = new THREE.Mesh(
    new THREE.PlaneGeometry(2.2, 0.82),
    new THREE.MeshStandardMaterial({ map: logoTex, transparent: true, roughness: 0.5 }),
  );
  rearLogo.position.set(0, 2.5, -3.46);
  rearLogo.rotation.y = Math.PI;
  g.add(rearLogo);
  // Rear doors: shut lines, handles, taillights.
  for (const sx of [-0.55, 0.55]) {
    const line = box(0.02, 2.4, 0.03, '#888888');
    line.position.set(sx, 1.9, -3.42);
    g.add(line);
    const handle = box(0.14, 0.08, 0.04, '#333333');
    handle.position.set(sx, 1.9, -3.44);
    g.add(handle);
    const tail = box(0.3, 0.2, 0.06, '#d21f2b', { glow: 0xd21f2b });
    tail.position.set(sx * 1.8, 0.75, -3.44);
    g.add(tail);
  }
  const rearBumper = box(W * 0.96, 0.2, 0.12, '#222831');
  rearBumper.position.set(0, 0.5, -3.44);
  g.add(rearBumper);
  // Cab: box cab with a sloped windshield, grille, bumper, mirrors,
  // door lines and roof marker lights.
  const cab = new THREE.Mesh(
    new THREE.BoxGeometry(W, 2.2, 1.8),
    new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.4 }),
  );
  cab.position.set(0, 1.55, 1.9);
  cab.castShadow = true;
  g.add(cab);
  const shield = new THREE.Mesh(
    new THREE.BoxGeometry(W * 0.84, 0.06, 1.0),
    glassMat,
  );
  shield.position.set(0, 1.95, 2.55);
  shield.rotation.x = 0.45;
  g.add(shield);
  const grille = box(1.2, 0.4, 0.08, '#1c1c1c');
  grille.position.set(0, 0.85, 2.82);
  g.add(grille);
  const bumper = box(W * 0.96, 0.24, 0.14, '#d8d8d8', { metal: 0.85, rough: 0.25 });
  bumper.position.set(0, 0.5, 2.84);
  g.add(bumper);
  for (const sx of [-0.85, 0.85]) {
    const light = box(0.34, 0.16, 0.08, '#fff8d0', { glow: 0xfff2b0 });
    light.position.set(sx, 0.85, 2.82);
    g.add(light);
    const marker = box(0.12, 0.08, 0.05, '#ff8a3d', { glow: 0xff8a3d });
    marker.position.set(sx * 0.9, 2.68, 2.78);
    g.add(marker);
  }
  const markerMid = box(0.12, 0.08, 0.05, '#ff8a3d', { glow: 0xff8a3d });
  markerMid.position.set(0, 2.68, 2.78);
  g.add(markerMid);
  for (const sx of [-1, 1]) {
    const line = box(0.02, 1.0, 0.03, '#1c1c1c');
    line.position.set(sx * (W / 2 + 0.01), 1.2, 1.3);
    g.add(line);
    const handle = box(0.04, 0.06, 0.24, '#222831');
    handle.position.set(sx * (W / 2 + 0.02), 1.5, 1.5);
    g.add(handle);
    const mirror = box(0.06, 0.18, 0.2, '#1c1c1c');
    mirror.position.set(sx * (W / 2 + 0.14), 2.0, 2.5);
    g.add(mirror);
  }
  // Six wheels: one front axle, two rear axles.
  for (const [wx, wz] of [[-1.05, 2.2], [1.05, 2.2], [-1.05, -1.8], [1.05, -1.8], [-1.05, -2.8], [1.05, -2.8]]) {
    const wh = wheel(0.5);
    wh.position.set(wx, 0.5, wz);
    g.add(wh);
  }
  return g;
}

/**
 * A motorcycle with a rider: torus tyres, disc rims, fuel tank, seat,
 * tail, fork, handlebar with grips and mirrors, headlight, exhaust,
 * and a seated rider with legs forward to the pegs and arms to the bars.
 * Faces +z like every other vehicle.
 */
export function buildMotorcycle(color = '#c94b4b') {
  const g = new THREE.Group();
  function bikeWheel(z) {
    const w = new THREE.Group();
    const tire = new THREE.Mesh(
      new THREE.TorusGeometry(0.34, 0.09, 10, 20),
      new THREE.MeshStandardMaterial({ color: '#141414', roughness: 0.9 }),
    );
    tire.rotation.y = Math.PI / 2;
    tire.castShadow = true;
    w.add(tire);
    const rim = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.22, 0.08, 16),
      new THREE.MeshStandardMaterial({ color: '#c9ced6', roughness: 0.3, metalness: 0.8 }),
    );
    rim.rotation.z = Math.PI / 2;
    w.add(rim);
    const hub = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.07, 0.12, 10),
      new THREE.MeshStandardMaterial({ color: '#333333', roughness: 0.5 }),
    );
    hub.rotation.z = Math.PI / 2;
    w.add(hub);
    w.position.set(0, 0.34, z);
    return w;
  }
  g.add(bikeWheel(0.75), bikeWheel(-0.75));
  const tank = box(0.42, 0.34, 0.7, color, { metal: 0.5, rough: 0.3 });
  tank.position.set(0, 0.72, 0.15);
  g.add(tank);
  const seat = box(0.36, 0.12, 0.55, '#1c1c1c');
  seat.position.set(0, 0.78, -0.45);
  g.add(seat);
  const tail = box(0.34, 0.1, 0.4, color, { metal: 0.5, rough: 0.3 });
  tail.position.set(0, 0.82, -0.85);
  tail.rotation.x = 0.15;
  g.add(tail);
  for (const sx of [-0.14, 0.14]) {
    const fork = cylinder(0.035, 0.035, 0.85, '#c9ced6', { metal: 0.8, rough: 0.3 });
    fork.position.set(sx, 0.62, 0.72);
    fork.rotation.x = 0.35;
    g.add(fork);
  }
  const bar = cylinder(0.03, 0.03, 0.62, '#1c1c1c');
  bar.rotation.z = Math.PI / 2;
  bar.position.set(0, 1.0, 0.42);
  g.add(bar);
  for (const sx of [-0.31, 0.31]) {
    const grip = cylinder(0.04, 0.04, 0.14, '#1c1c1c');
    grip.rotation.z = Math.PI / 2;
    grip.position.set(sx, 1.0, 0.42);
    g.add(grip);
    const mirror = box(0.1, 0.07, 0.03, '#1c1c1c');
    mirror.position.set(sx, 1.12, 0.4);
    g.add(mirror);
  }
  const head = new THREE.Mesh(
    new THREE.CircleGeometry(0.12, 14),
    new THREE.MeshBasicMaterial({ color: '#fff8d0' }),
  );
  head.position.set(0, 0.78, 0.82);
  g.add(head);
  const tailLight = box(0.2, 0.07, 0.04, '#d21f2b', { glow: 0xd21f2b });
  tailLight.position.set(0, 0.84, -1.06);
  g.add(tailLight);
  const exhaust = cylinder(0.07, 0.07, 0.9, '#c9c9c9', { metal: 0.9, rough: 0.2 });
  exhaust.rotation.x = Math.PI / 2;
  exhaust.position.set(0.22, 0.42, -0.2);
  g.add(exhaust);
  // Rider: seated, legs forward to the pegs, arms forward to the bars.
  const r = buildMinifig(CHARACTERS.ped, 0.85);
  r.group.position.set(0, 0.12, -0.35);
  r.legL.rotation.x = -1.25;
  r.legR.rotation.x = -1.25;
  r.armL.rotation.x = -1.0;
  r.armR.rotation.x = -1.0;
  g.add(r.group);
  return g;
}

/** A KPD patrol car, like the reference photo (IMG_9359): a LONG low white
 * sedan (5.2u) with a BLACK hood and trunk, a red+blue light bar on the
 * roof, big red taillights, a black rear window, a rear plate and blue
 * door badges with white KPD letters — no blue side stripe anymore. */
export function buildPoliceCar() {
  const L = 5.2;
  const g = buildStreetCar('sedan', '#f2f2f2', { forceSedan: true, length: L });
  // Black hood + black trunk panels on top of the white body.
  const hood = box(1.7, 0.04, 1.4, '#141414', { metal: 0.4, rough: 0.4 });
  hood.position.set(0, 1.22, L * 0.28);
  g.add(hood);
  const trunk = box(1.7, 0.04, 1.1, '#141414', { metal: 0.4, rough: 0.4 });
  trunk.position.set(0, 1.22, -L * 0.28);
  g.add(trunk);
  // Black rear window: a solid black panel over the sloped rear glass,
  // so the tail reads black glass from the chase camera.
  const rearWin = box(1.5, 0.5, 0.04, '#0a0a0a', { metal: 0.2, rough: 0.25 });
  rearWin.position.set(0, 1.52, -L * 0.29);
  rearWin.rotation.x = -0.45;
  g.add(rearWin);
  // Push bar on the nose.
  const bar = box(2.0, 0.1, 0.14, '#1c1c1c');
  bar.position.set(0, 0.5, L / 2 + 0.02);
  g.add(bar);
  // Light bar on the roof: a black base + a red lamp (left) + a blue
  // lamp (right). Unlit basic materials, so the red/blue read as pure
  // saturated colour instead of washing out to peach under the bright
  // sunset exposure (the old emissive lamps did).
  const base = box(1.5, 0.1, 0.5, '#1c1c1c');
  base.position.set(0, 1.84, -0.2);
  g.add(base);
  for (const [sx, col] of [[-0.38, '#ff2020'], [0.38, '#2266ff']]) {
    const lamp = new THREE.Mesh(
      new THREE.BoxGeometry(0.62, 0.2, 0.42),
      new THREE.MeshBasicMaterial({ color: col }),
    );
    lamp.position.set(sx, 1.95, -0.2);
    g.add(lamp);
  }
  // Big red taillights, proud of the small stock ones (same unlit
  // material, so they read red, not peach).
  for (const sx of [-0.62, 0.62]) {
    const tail = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.22, 0.06),
      new THREE.MeshBasicMaterial({ color: '#ff2020' }),
    );
    tail.position.set(sx, 0.8, -L / 2 - 0.05);
    g.add(tail);
  }
  // Rear license plate: KPD·1998 on white, like the Garuda's KB·1998.
  const plateTex = canvasTexture(160, 44, (x, w, h) => {
    x.fillStyle = '#1c1c1c';
    x.fillRect(0, 0, w, h);
    x.fillStyle = '#f2f2f2';
    x.fillRect(3, 3, w - 6, h - 6);
    x.fillStyle = '#1c1c1c';
    x.font = 'bold 24px system-ui, sans-serif';
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.fillText('KPD·1998', w / 2, h / 2 + 1);
  });
  const plate = new THREE.Mesh(
    new THREE.PlaneGeometry(0.72, 0.2),
    new THREE.MeshStandardMaterial({ map: plateTex, roughness: 0.5 }),
  );
  plate.position.set(0, 0.56, -L / 2 - 0.08);
  plate.rotation.y = Math.PI;
  g.add(plate);
  // Blue door badges with white KPD letters on both sides.
  const kpdTex = textTexture('KPD', '#ffffff', 64);
  for (const sx of [-1, 1]) {
    const badge = box(0.05, 0.5, 1.6, '#2b6fd0', { metal: 0.3, rough: 0.4 });
    badge.position.set(sx * 1.02, 0.95, 0.3);
    g.add(badge);
    const decal = new THREE.Mesh(
      new THREE.PlaneGeometry(1.2, 0.45),
      new THREE.MeshStandardMaterial({ map: kpdTex, transparent: true, roughness: 0.5 }),
    );
    decal.position.set(sx * 1.06, 0.95, 0.3);
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
  // Belly fairing: a wider lower fuselage, so the body reads as a real
  // helicopter hull instead of a plain box.
  const belly = box(2.6, 0.5, 1.6, '#e8e8e8', { metal: 0.3, rough: 0.4 });
  belly.position.set(0, -0.75, 0.2);
  g.add(belly);
  // Tail boom, fin, stabilizer, KPD decal.
  const boom = box(0.7, 0.7, 4.6, '#f2f2f2', { metal: 0.3, rough: 0.4 });
  boom.position.set(0, 0.35, -4.2);
  g.add(boom);
  const boomTex = textTexture('KPD', '#2b6fd0', 48);
  for (const sx of [-1, 1]) {
    const decal = new THREE.Mesh(
      new THREE.PlaneGeometry(1.0, 0.35),
      new THREE.MeshStandardMaterial({ map: boomTex, transparent: true, roughness: 0.5 }),
    );
    decal.position.set(sx * 0.37, 0.5, -4.2);
    decal.rotation.y = sx * Math.PI / 2;
    g.add(decal);
  }
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
    // Yellow tip cap, so the blade ends read from the ground.
    const tip = box(0.3, 0.07, 0.36, '#ffd94d');
    tip.position.set(5.4, 1.45, 0);
    holder.add(tip);
    rotor.add(holder);
  }
  g.add(rotor);
  g.userData.rotor = rotor;
  // Blur disc: at rest it reads as a spinning rotor — stronger now, with
  // a rim ring so the disc edge reads in daylight.
  const blur = new THREE.Mesh(
    new THREE.CircleGeometry(5.8, 32),
    new THREE.MeshBasicMaterial({ color: '#888888', transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false }),
  );
  blur.rotation.x = -Math.PI / 2;
  blur.position.y = 1.5;
  g.add(blur);
  const blurRim = new THREE.Mesh(
    new THREE.RingGeometry(5.4, 5.8, 32),
    new THREE.MeshBasicMaterial({ color: '#aaaaaa', transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false }),
  );
  blurRim.rotation.x = -Math.PI / 2;
  blurRim.position.y = 1.5;
  g.add(blurRim);
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
