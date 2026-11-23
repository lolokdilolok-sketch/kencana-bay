// Round 22 reseal — Garuda front + rear caps rebuilt (white full-width tail bar, gold ducktail, bigger silver wheels out to the flanks, slimmer glass, sharper lower nose, thin corner headlights); this line is written in the round 22 reseal recorded session (01a2092d-3178-7290-b1e2-da8c5e84af71).
// Every vehicle is built from boxes and one lofted body: the Garuda GT is a
// low, wide sports car with a closed glass cabin and a human driver visible
// inside; traffic, taxis and KPD cars are real-looking sedans and vans with
// glasshouses, door lines and alloy wheels.
// Round 20: the Garuda is a FLAT WEDGE now (belt 1.16, roof 1.49, crown 0,
// tumble 0.10, white corner tail lamps, small black wing, wheels r 0.46 at
// the flanks) and every street car + the KPD car follow the same flat
// construction — the R19 crowned loft read as a beetle (see
// top2-car-spec-round20.md §3 + ref-round20.md §5).
// Round 17 (top-1 recipe): clearcoat paint + dark glass + 5-spoke silver
// wheels, the sports car follows the top-1 silhouette curves, sedans are
// lofted too, and a pink scooter with a rider joins the traffic.
import { THREE, box, cylinder, canvasTexture, loftGeometry } from './three-shim.js';
import { buildMinifig, CHARACTERS } from './pedestrians.js';

/** Tinted glass for cabins, windshields and windows. Round 17: the
 * top-1 glass (0x1d2b38, roughness 0.04, metalness 0.9, envMap 1.2) —
 * dark and reflective instead of pale blue. */
const glassMat = new THREE.MeshStandardMaterial({
  color: '#1d2b38', roughness: 0.04, metalness: 0.9, envMapIntensity: 1.2,
  transparent: true, opacity: 0.85, depthWrite: false,
});

/** Round 17b: the sky environment map must not wash the paint out —
 * keep the body paint / glass bright, but cap every other material on
 * the vehicle (trim, roofs, interiors, tyres) at 0.4, so the car reads
 * as coloured bodywork instead of a pale blob under the day sky.
 * Round 19: a material may carry `userData.keepEnv` — chrome that MUST
 * stay bright (alloy rims, exhaust tips) opts out of the cap, or a
 * metalness-0.95 rim with a 0.4 env reads as a black disc (the R18
 * garage shot's wheels were black for exactly this reason). */
function tameEnv(g, keep = new Map()) {
  g.traverse((o) => {
    if (o.isMesh && o.material && o.material.isMeshStandardMaterial) {
      o.material.envMapIntensity = o.material.userData.keepEnv ?? keep.get(o.material) ?? 0.4;
    }
  });
}

/** Dark glass for the Garuda's rear window, so the seats read as an
 * interior behind glass — not red boxes sitting on the rear deck.
 * Round 18b: the old 0.3-opacity glass was nearly invisible from the
 * chase camera, so the red seats showed through as cargo on the deck.
 * Round 18c: 0.6 still showed them — the rear glass is now as dark as
 * the side glass (0.85); the driver still reads through the side glass
 * and windshield. */
const rearGlassMat = new THREE.MeshStandardMaterial({
  color: '#1d2b38', roughness: 0.04, metalness: 0.9,
  transparent: true, opacity: 0.85, depthWrite: false,
});

/** A soft radial glow texture for headlight halos, lamp glows and light
 * pools on the asphalt (round 15, top-10 study: lights bloom at dusk). */
let glowTexCache = null;
function glowTexture() {
  if (glowTexCache) return glowTexCache;
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 1, 32, 32, 30);
  grad.addColorStop(0, 'rgba(255,246,213,0.9)');
  grad.addColorStop(0.5, 'rgba(255,240,180,0.35)');
  grad.addColorStop(1, 'rgba(255,240,180,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  glowTexCache = new THREE.CanvasTexture(c);
  return glowTexCache;
}

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

/** An alloy wheel: tyre, dark rim disc, five spokes and a hub. Round 17:
 * top-1 wheels — a dark tyre (0x18181a), a silver 5-spoke rim (0xd8dbe2,
 * metalness 0.95) and a dark arch well, so the wheel reads as a real
 * alloy wheel instead of a grey disc. */
function wheel(r = 0.46) {
  const g = new THREE.Group();
  const tire = new THREE.Mesh(
    new THREE.CylinderGeometry(r, r, 0.32, 20),
    new THREE.MeshStandardMaterial({ color: '#18181a', roughness: 0.92 }),
  );
  tire.rotation.z = Math.PI / 2;
  tire.castShadow = true;
  g.add(tire);
  // Round 19: one shared rim material with keepEnv 1.2 — the R18 rim
  // was metalness 0.95 capped at env 0.4, so it rendered nearly black
  // and the wheels read as black discs with a gold ring in the garage.
  // Round 22d: emissive '#e8ebf0' × 0.35 — the v3 title wheels were
  // STILL dark discs: the title flank gets no direct sun and a
  // diffuse-only rim goes dark there, whatever the metalness. A small
  // emissive lifts the shaded face to light grey in every scene; the
  // sun-lit chase side just reads a touch brighter. Spokes share this
  // material now (was a separate box() metal material).
  const rimMat = new THREE.MeshStandardMaterial({ color: '#e8ebf0', roughness: 0.45, metalness: 0.25, emissive: '#e8ebf0', emissiveIntensity: 0.35 });
  rimMat.userData.keepEnv = 1.2;
  // Round 22: a BIGGER bright rim (0.72r, was 0.66r) + a wider disc
  // (0.56r, was 0.5r) — the old rim was a small silver dot inside a
  // big black tyre, so the wheels read as dark discs from the chase
  // camera. The spokes below are thicker for the same reason.
  const rim = new THREE.Mesh(
    new THREE.CylinderGeometry(r * 0.72, r * 0.72, 0.34, 24),
    rimMat,
  );
  rim.rotation.z = Math.PI / 2;
  g.add(rim);
  const disc = new THREE.Mesh(
    new THREE.CylinderGeometry(r * 0.56, r * 0.56, 0.05, 16),
    rimMat,
  );
  disc.rotation.z = Math.PI / 2;
  g.add(disc);
  // Red brake caliper at the top of the disc, visible through the spokes.
  const caliper = box(0.1, r * 0.4, 0.12, '#c94b4b');
  caliper.position.set(0, r * 0.35, 0);
  g.add(caliper);
  for (const fx of [-0.18, 0.18]) {
    for (let i = 0; i < 5; i += 1) {
      const a = (i / 5) * Math.PI * 2;
      // Round 22: thicker spokes (0.07 wide, 1.15r long, was 0.05 /
      // 1.05r) — the old hairline spokes vanished at screenshot
      // distance and the wheel read as a plain dark disc.
      // Round 22d: spokes use the shared rimMat (emissive lift) so
      // they read silver on the shaded title flank too.
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.07, r * 1.15, 0.14), rimMat);
      spoke.position.set(fx, Math.cos(a) * r * 0.32, Math.sin(a) * r * 0.32);
      spoke.rotation.x = a;
      g.add(spoke);
    }
    const hub = new THREE.Mesh(
      new THREE.CylinderGeometry(r * 0.2, r * 0.2, 0.05, 12),
      rimMat,
    );
    hub.rotation.z = Math.PI / 2;
    hub.position.x = fx;
    g.add(hub);
  }
  return g;
}

/**
 * A sports car from lofted cross-sections. `color` is the body paint, `opts`
 * chooses length / width / roof and whether a driver sits inside.
 * The car faces -z when driving forward... it faces +z in the scene: the
 * nose is at +z, so a heading of 0 drives toward +z.
 */
export function buildSportsCar(color, opts = {}) {
  const g = new THREE.Group();
  // Round 20: REBUILT AGAIN, AS A WEDGE — the R19 car was a crowned
  // loft (crown 0.05-0.10, tumble 0.42-0.55, cabin rise 0.72) and read
  // as a gold beetle; the top-2 + reference cars are the opposite: a
  // FLAT extrusion with near-vertical sides, a flat belt, a shallow
  // glass wedge and a low flat roof (top2-car-spec-round20.md §3,
  // ref-round20.md §5). Numbers, scaled to L=6.0: belt 1.16, roof
  // 1.49, glass rise 0.33, crown 0, tumble 0.10, hood 2.0 (cabin
  // front at z +1.0), wheels r 0.46 at the flanks. The body is
  // ONE flat-topped profile: tail face near-vertical (y1 1.03), a
  // small step up to the flat belt (1.16, deck + hood one level line),
  // then the nose falling to a low pointed tip (0.70). No crown, no
  // dome anywhere — the deck is a table ONLY in the sense the top-2
  // deck is: one flat level line, not a curved beetle back.
  const L = opts.length ?? 6.0;
  const W = opts.width ?? 2.5;
  const sections = [
    { z: -L / 2, w: 1.95, y0: 0.29, y1: 1.03, tumble: 0.10, crown: 0 }, // tail face, near-vertical
    { z: -L * 0.45, w: 2.15, y0: 0.22, y1: 1.03, tumble: 0.10, crown: 0 },
    { z: -L * 0.40, w: 2.35, y0: 0.22, y1: 1.16, tumble: 0.10, crown: 0 }, // step up to the flat belt
    { z: -L * 0.30, w: 2.50, y0: 0.22, y1: 1.16, tumble: 0.10, crown: 0 }, // rear haunch / rear wheel
    { z: -L * 0.10, w: 2.50, y0: 0.22, y1: 1.16, tumble: 0.10, crown: 0 }, // deck, flat
    { z: L * 0.10, w: 2.45, y0: 0.22, y1: 1.16, tumble: 0.10, crown: 0 }, // cowl, flat
    { z: L * 0.167, w: 2.40, y0: 0.22, y1: 1.16, tumble: 0.10, crown: 0 }, // cabin front (hood starts here)
    { z: L * 0.30, w: 2.30, y0: 0.22, y1: 1.05, tumble: 0.10, crown: 0 }, // hood falling
    { z: L * 0.433, w: 2.05, y0: 0.22, y1: 0.80, tumble: 0.10, crown: 0 },
    // Round 22: a LOWER, SHARPER nose (tip y1 0.62, was 0.70; width
    // 1.55, was 1.70) — the old nose was a tall blunt blob in the
    // garage 3/4-front shot, with the headlights reading as two white
    // ovals on it. Ratios stay top-2: L/W 2.31 (6.0/2.6 with the wider
    // haunch), roof/L 0.249, glass rise 0.33.
    { z: L / 2, w: 1.55, y0: 0.30, y1: 0.62, tumble: 0.10, crown: 0 }, // pointed low nose
  ];
  // Half-width of the lofted body at z (linear between sections) — door
  // lines, handles, intakes, skirts and mirrors sit ON the flank, not
  // floating beside it.
  const flankAt = (z) => {
    if (z <= sections[0].z) return sections[0].w / 2;
    for (let i = 0; i < sections.length - 1; i += 1) {
      const a = sections[i];
      const b = sections[i + 1];
      if (z >= a.z && z <= b.z) {
        const t = (z - a.z) / (b.z - a.z);
        return (a.w + (b.w - a.w) * t) / 2;
      }
    }
    return sections[sections.length - 1].w / 2;
  };
  // Round 17: clearcoat paint (top-1 recipe) — the sky environment map
  // makes the paint read wet and bright instead of flat matte gold.
  const bodyMat = new THREE.MeshPhysicalMaterial({
    color, roughness: 0.32, metalness: 0.45,
    clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 0.7,
  });
  const body = new THREE.Mesh(loftGeometry(sections), bodyMat);
  body.castShadow = true;
  body.receiveShadow = true;
  g.add(body);
  // Round 18: NO stripes — the top cars run clean paint, and the two
  // white strips read as stickers on the old flat deck.
  // Glasshouse: ONE SHALLOW WEDGE (round 20) — a single dark glass
  // band, not a tall cabin: rise 0.33 over the 1.16 belt (roof 1.49),
  // steep short slopes front and rear, a FLAT roof between them. The
  // wedge sinks 0.08 into the deck at its base (y0 1.08 vs belt 1.16),
  // so no glass edge floats. The roof panel is a thin FLAT gold strip
  // (crown 0) only as wide as the glass top — the R19 domed panel read
  // as a gold bubble; now the gold is a flat strip with dark glass
  // showing on both sides of it, like the top-2 cars.
  // Round 22: a SLIMMER dark glass strip (W*0.72, was W*0.80) — the
  // old 2.0u-wide glasshouse read as one big black slab from the
  // front, and its rear slope was a black wall above the gold deck.
  // The gold roof panel is WIDER now (W*0.66, was W*0.58) so it
  // follows the greenhouse as a real gold roof, not a thin strip.
  const glassSecs = [
    { z: L * 0.178, w: W * 0.72, y0: 1.08, y1: 1.30, tumble: 0.10, crown: 0 }, // windshield base
    { z: L * 0.12, w: W * 0.72, y0: 1.08, y1: 1.49, tumble: 0.10, crown: 0 }, // windshield top (flat roof starts)
    { z: -L * 0.233, w: W * 0.72, y0: 1.08, y1: 1.49, tumble: 0.10, crown: 0 }, // flat roof ends
    { z: -L * 0.278, w: W * 0.68, y0: 1.08, y1: 1.30, tumble: 0.10, crown: 0 }, // rear glass meets the deck
  ];
  const glasshouse = new THREE.Mesh(loftGeometry(glassSecs), glassMat);
  glasshouse.castShadow = true;
  g.add(glasshouse);
  const roofSecs = [
    { z: L * 0.12, w: W * 0.66, y0: 1.46, y1: 1.51, tumble: 0.05, crown: 0 },
    { z: 0, w: W * 0.66, y0: 1.46, y1: 1.51, tumble: 0.05, crown: 0 },
    { z: -L * 0.233, w: W * 0.66, y0: 1.46, y1: 1.51, tumble: 0.05, crown: 0 },
  ];
  const roofPanel = new THREE.Mesh(loftGeometry(roofSecs), bodyMat);
  roofPanel.castShadow = true;
  g.add(roofPanel);
  // Round 20: A/B pillars, SHORT now — the wedge rise is only 0.33,
  // so the pillars are 0.45 tall, not 0.85. Same construction (tilt
  // in both planes so the top leans inward with the glass), feet
  // inside the bodywork, emerging through the glass at mid-height.
  // Windshield slope: run 0.35 for rise 0.19 -> rotation.x -0.50;
  // rear slope: run 0.27 for drop 0.19 -> rotation.x +0.61.
  // Round 22: pillars move in with the slimmer glass (x ±0.74, was
  // ±0.82), so they sit on the glass edge instead of floating outside it.
  for (const sx of [-1, 1]) {
    const pillarA = box(0.07, 0.5, 0.07, color, { metal: 0.5, rough: 0.3 });
    pillarA.position.set(sx * 0.74, 1.30, L * 0.148);
    pillarA.rotation.x = -0.50;
    pillarA.rotation.z = sx * 0.28;
    g.add(pillarA);
    const pillarB = box(0.07, 0.5, 0.07, color, { metal: 0.5, rough: 0.3 });
    pillarB.position.set(sx * 0.74, 1.30, -L * 0.255);
    pillarB.rotation.x = 0.61;
    pillarB.rotation.z = sx * 0.28;
    g.add(pillarB);
  }
  // Interior, lowered to the wedge cabin (belt 1.16, roof 1.49):
  // seats + dash + wheel sit lower than the R19 cabin, and the
  // driver's head (top ~1.30) clears the flat roof.
  for (const sx of [-0.42, 0.42]) {
    const seat = box(0.5, 0.42, 0.5, '#8a6b45');
    seat.position.set(sx, 0.92, -L * 0.083);
    g.add(seat);
  }
  const dash = box(W * 0.7, 0.18, 0.4, '#1c1c22');
  dash.position.set(0, 1.02, L * 0.092);
  g.add(dash);
  const wheelRim = new THREE.Mesh(
    new THREE.TorusGeometry(0.22, 0.03, 8, 20),
    new THREE.MeshStandardMaterial({ color: '#1c1c1c', roughness: 0.5 }),
  );
  wheelRim.position.set(0.42, 1.05, L * 0.058);
  wheelRim.rotation.x = -0.5;
  g.add(wheelRim);
  // Human driver, seated so head and shoulders show through the rear
  // glass from the chase camera, with a headrest behind him — and a
  // matching passenger headrest. He sits a touch lower now (y 0.10) so
  // his head clears the flat roofline.
  if (opts.driver !== false) {
    const d = buildMinifig(CHARACTERS.wheelman, 0.72);
    d.group.position.set(0.42, 0.10, -L * 0.083);
    d.group.rotation.y = 0;
    g.add(d.group);
    for (const sx of [-0.42, 0.42]) {
      const headrest = box(0.34, 0.24, 0.1, '#8a6b45');
      headrest.position.set(sx, 1.22, -L * 0.083 - 0.25);
      g.add(headrest);
      for (const px of [-0.1, 0.1]) {
        const post = box(0.04, 0.16, 0.04, '#1c1c1c');
        post.position.set(sx + px, 1.12, -L * 0.083 - 0.25);
        g.add(post);
      }
    }
  }
  // Round 19: NO hood shut lines — the R18 seams were flat bars on a
  // curved hood (they floated over the dips and sank under the fender
  // swell). The top-1/top-2 cars run a clean hood; the panel gaps live
  // on the doors instead (below).
  // Door shut lines + handles + side indicators, on the flank (not
  // floating beside it) — round 20: the lines sit at y 0.72, height
  // 0.5, inside the taller side panel (0.22..1.16), and the handles
  // at y 0.95, just under the belt.
  for (const sx of [-1, 1]) {
    for (const dz of [0.62, -0.72]) {
      const line = box(0.02, 0.5, 0.03, '#1c1c1c');
      line.position.set(sx * (flankAt(dz) + 0.005), 0.72, dz);
      g.add(line);
    }
    const handle = box(0.04, 0.05, 0.22, '#d8d8d8', { metal: 0.85, rough: 0.25 });
    handle.position.set(sx * (flankAt(0.1) + 0.01), 0.95, 0.1);
    g.add(handle);
    const indicator = box(0.03, 0.07, 0.14, '#ff8a3d', { glow: 0xff8a3d });
    indicator.position.set(sx * (flankAt(L * 0.3) + 0.01), 0.95, L * 0.3);
    g.add(indicator);
  }
  // Headlights: THIN corner slits (round 22 — 0.42 x 0.12, top-2
  // recipe) on the lowered nose, with glow sprites. The round-20
  // sphere lenses (scaled balls) read as two big white ovals on the
  // bulbous nose in the garage shot; flat boxes sit flush in the
  // nose face instead. They sit at the corners (x ±0.72, just under
  // the nose top line 0.62 at the tip).
  for (const sx of [-0.72, 0.72]) {
    const lens = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.12, 0.08),
      new THREE.MeshBasicMaterial({ color: '#fff6d5' }),
    );
    lens.position.set(sx, 0.55, L / 2 - 0.02);
    lens.rotation.y = -sx * 0.22;
    g.add(lens);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), transparent: true, opacity: 0.55, depthWrite: false }));
    halo.scale.set(1.0, 1.0, 1);
    halo.position.set(sx, 0.55, L / 2 + 0.25);
    g.add(halo);
  }
  // Round 15: the headlight beams pool on the asphalt ahead (additive
  // gradient planes, like the top-10 cars' light pools). Skipped for the
  // garage display cars (opts.groundPool false) — the pool would float
  // 1.5u above the garage floor, under the car on its lift.
  // Round 17: fainter in daylight (0.3, was 0.5) — a bright pool on
  // sunlit asphalt reads as a white smudge, not a beam.
  if (opts.groundPool !== false) {
    for (const sx of [-0.55, 0.55]) {
      const pool = new THREE.Mesh(
        new THREE.PlaneGeometry(1.6, 3.2),
        new THREE.MeshBasicMaterial({ map: glowTexture(), transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false }),
      );
      pool.rotation.x = -Math.PI / 2;
      pool.position.set(sx, 0.09, L / 2 + 1.8);
      g.add(pool);
    }
  }
  // Round 22: the fog spheres are GONE — two extra white blobs under
  // the nose only added to the bulbous front. The grille is slimmer
  // (0.7 wide, was 0.9) on the lowered nose.
  const grille = box(0.7, 0.10, 0.06, '#1c1c1c');
  grille.position.set(0, 0.40, L / 2 + 0.02);
  g.add(grille);
  const emblem = box(0.12, 0.12, 0.04, '#ffd94d', { metal: 0.8, rough: 0.25 });
  emblem.position.set(0, 0.48, L / 2 + 0.04);
  g.add(emblem);
  // Round 20: the bumper is a SLIM dark lip under the nose (y 0.34),
  // and the black plate under the front bumper is GONE — the R19
  // splitter (a flat black slab sticking out under the nose) read as
  // a separate black plank; the top-2 nose has only the slim TRIM lip.
  const bumper = box(1.60, 0.10, 0.12, '#17181c');
  bumper.position.set(0, 0.34, L / 2 + 0.04);
  g.add(bumper);
  // Tail (round 22): a FULL-WIDTH WHITE tail light bar across the
  // near-vertical tail face (y 0.29..1.03) — the round-20 two corner
  // lamps were small white strips on a flat gold wall, so the rear
  // still read as a blank gold slab from the chase camera. One
  // continuous 1.90u bar (top-2 / reference recipe) breaks the wall
  // up, with a glow sprite at each end. No thick red bar anywhere.
  const tailBar = new THREE.Mesh(
    new THREE.BoxGeometry(1.90, 0.12, 0.06),
    new THREE.MeshBasicMaterial({ color: '#fff6d5' }),
  );
  tailBar.position.set(0, 0.98, -L / 2 - 0.02);
  g.add(tailBar);
  for (const sx of [-1, 1]) {
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: '#fff6d5', transparent: true, opacity: 0.55, depthWrite: false }));
    glow.scale.set(1.2, 1.2, 1);
    glow.position.set(sx * 0.88, 0.98, -L / 2 - 0.18);
    g.add(glow);
    const rev = box(0.18, 0.10, 0.04, '#f2f2f2', { glow: 0xffffff });
    rev.position.set(sx * 0.55, 0.62, -L / 2 - 0.04);
    g.add(rev);
  }
  // Round 22: the black lower bumper lip is WIDER (W*0.82, was
  // W*0.68) and a touch taller, so the tail face ends in a dark base
  // instead of floating gold above the diffuser.
  const tailBumper = box(W * 0.82, 0.14, 0.12, '#17181c');
  tailBumper.position.set(0, 0.32, -L / 2 - 0.04);
  g.add(tailBumper);
  // Round 19: NO trunk lid seam — the R18 seam was a flat bar across a
  // crowned deck (buried in the middle, floating at the edges). The
  // deck is defined by the loft + the tail kick alone.
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
  const diffuser = box(W * 0.7, 0.12, 0.3, '#1c1c1c');
  diffuser.position.set(0, 0.38, -L / 2 - 0.1);
  g.add(diffuser);
  // Round 19: BRIGHT chrome exhausts — the R18 tips were #c9c9c9 at
  // metalness 0.9 capped to env 0.4 by tameEnv, so they rendered dark
  // grey, not chrome. Now: metalness 1.0, roughness 0.08, keepEnv 1.5,
  // plus a lit white mouth ring and a dark bore, so the tip reads as
  // polished chrome from the chase camera even in daylight.
  // Round 19c: tips enlarged (r 0.12, was 0.10) — the first round-19
  // tips read as two tiny dots under the plate; chrome only reads
  // when the tip is big enough to catch the light.
  for (const sx of [-0.4, 0.4]) {
    const tipMat = new THREE.MeshStandardMaterial({ color: '#e8e8ec', roughness: 0.08, metalness: 1.0 });
    tipMat.userData.keepEnv = 1.5;
    const ex = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.24, 16), tipMat);
    ex.rotation.x = Math.PI / 2;
    ex.position.set(sx, 0.44, -L / 2 - 0.24);
    g.add(ex);
    const mouth = new THREE.Mesh(
      new THREE.CircleGeometry(0.09, 16),
      new THREE.MeshBasicMaterial({ color: '#fdfdfd' }),
    );
    mouth.position.set(sx, 0.44, -L / 2 - 0.37);
    mouth.rotation.y = Math.PI;
    g.add(mouth);
    const bore = new THREE.Mesh(
      new THREE.CircleGeometry(0.06, 16),
      new THREE.MeshBasicMaterial({ color: '#222222' }),
    );
    bore.position.set(sx, 0.44, -L / 2 - 0.372);
    bore.rotation.y = Math.PI;
    g.add(bore);
  }
  // Round 22: a GOLD DUCKTAIL spoiler on the top edge of the tail
  // (body colour, 1.90u wide) — the round-20 small black wing read as
  // a dark plank floating above the gold deck from the chase camera,
  // and the top-1 cars run a body-colour ducktail lip. The blade sits
  // just above the deck (1.03) on two short gold feet, tilted up at
  // the tail edge like a kicked-up lip.
  const wing = box(1.90, 0.06, 0.34, color, { metal: 0.5, rough: 0.3 });
  wing.position.set(0, 1.07, -L * 0.487);
  wing.rotation.x = -0.10;
  g.add(wing);
  for (const sx of [-0.6, 0.6]) {
    const foot = box(0.05, 0.07, 0.05, color, { metal: 0.5, rough: 0.3 });
    foot.position.set(sx, 1.02, -L * 0.487);
    g.add(foot);
  }
  // Wheels OUT to the flank (round 22): r 0.48 (was 0.46) — diameter
  // 0.96 = 0.64 of the 1.49 roof, the top-2 ratio — wheelbase 3.6u
  // (61% of the length), outer tyre face just proud of the flank
  // (x = flank - 0.10, was -0.13), under a FLAT body-colour arch ring
  // + a dark wheel well. The tyre top (0.96) still sits well below
  // the flat belt (1.16). The well is tighter now (r + 0.03, was
  // +0.07) so it no longer swallows the rim in a big black disc.
  for (const wz of [L * 0.3, -L * 0.3]) {
    const flank = flankAt(wz);
    const wx = flank - 0.10;
    for (const sx of [-1, 1]) {
      const wh = wheel(0.48);
      wh.position.set(sx * wx, 0.48, wz);
      g.add(wh);
      const well = new THREE.Mesh(
        new THREE.CircleGeometry(0.51, 20, 0, Math.PI),
        new THREE.MeshBasicMaterial({ color: '#050506', side: THREE.DoubleSide }),
      );
      well.position.set(sx * (flank - 0.02), 0.48, wz);
      well.rotation.y = sx * Math.PI / 2;
      g.add(well);
      const arch = new THREE.Mesh(
        new THREE.RingGeometry(0.50, 0.57, 24, 1, (115 * Math.PI) / 180, (310 * Math.PI) / 180),
        bodyMat,
      );
      arch.position.set(sx * (flank + 0.002), 0.48, wz);
      arch.rotation.y = sx * Math.PI / 2;
      g.add(arch);
    }
  }
  // Round 20: side intakes + skirts + mirrors on the taller flank —
  // intake at y 0.85, mirrors in BODY colour at belt height (1.08)
  // by the cabin front (z +1.0), skirts tucked to the flank at y 0.35.
  for (const sx of [-1, 1]) {
    const intake = box(0.04, 0.16, 0.6, '#141414', { metal: 0.3, rough: 0.5 });
    intake.position.set(sx * (flankAt(-L * 0.22) + 0.005), 0.85, -L * 0.22);
    g.add(intake);
  }
  // Side skirts + mirrors.
  for (const sx of [-1, 1]) {
    const skirt = box(0.08, 0.12, L * 0.55, '#1c1c1c');
    skirt.position.set(sx * (flankAt(0) - 0.01), 0.35, 0);
    g.add(skirt);
    const mirror = box(0.16, 0.1, 0.12, color, { metal: 0.5, rough: 0.3 });
    mirror.position.set(sx * (flankAt(L * 0.167) + 0.06), 1.08, L * 0.167);
    g.add(mirror);
  }
  g.userData.bodyMat = bodyMat;
  tameEnv(g, new Map([[bodyMat, 0.7], [glassMat, 1.2], [rearGlassMat, 1.2]]));
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
  const suv = kind === 'suv';
  const pickup = kind === 'pickup';
  const minibus = kind === 'minibus';
  const L = opts.length ?? (kind === 'van' ? 5.2 : suv ? 4.8 : pickup ? 5.3 : minibus ? 5.8 : hb ? 4.1 : 4.6);
  const W = 2.0;
  // Round 17: the sedan / hatchback / van body is a loft like the sports
  // car (top-1 recipe) — a sculpted beltline at y 1.15 with a low nose
  // and a wide tail, instead of one flat box. The glasshouse sits on
  // the beltline, so its heights moved down with it (cabin 1.30,
  // roof 1.58, fin 1.66).
  const bodyMat = new THREE.MeshPhysicalMaterial({
    color, roughness: 0.32, metalness: 0.45,
    clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 0.7,
  });
  // Round 20: every street-car body rides the FLAT wedge construction
  // now (crown 0, tumble 0.1 — same as the Garuda): the R19 crowned
  // loft domed every sedan/van/SUV roof. Three new kinds (SUV, pickup,
  // minibus) keep their shapes, only the dome is gone.
  const bodySecs = kind === 'van' ? [
    { z: L / 2, w: W * 0.78, y0: 0.42, y1: 0.70, crown: 0, tumble: 0.1 },
    { z: L * 0.32, w: W * 0.93, y0: 0.38, y1: 0.90, crown: 0, tumble: 0.1 },
    { z: L * 0.1, w: W * 0.98, y0: 0.38, y1: 1.30, crown: 0, tumble: 0.1 },
    { z: -L * 0.15, w: W, y0: 0.38, y1: 1.32, crown: 0, tumble: 0.1 },
    { z: -L * 0.35, w: W * 0.97, y0: 0.38, y1: 1.32, crown: 0, tumble: 0.1 },
    { z: -L / 2, w: W * 0.86, y0: 0.40, y1: 1.28, crown: 0, tumble: 0.1 },
  ] : suv ? [
    { z: L / 2, w: W * 0.78, y0: 0.45, y1: 0.75, crown: 0, tumble: 0.1 },
    { z: L * 0.32, w: W * 0.93, y0: 0.40, y1: 1.05, crown: 0, tumble: 0.1 },
    { z: L * 0.1, w: W * 0.98, y0: 0.40, y1: 1.32, crown: 0, tumble: 0.1 },
    { z: -L * 0.15, w: W, y0: 0.40, y1: 1.35, crown: 0, tumble: 0.1 },
    { z: -L * 0.35, w: W * 0.97, y0: 0.40, y1: 1.35, crown: 0, tumble: 0.1 },
    { z: -L / 2, w: W * 0.86, y0: 0.42, y1: 1.30, crown: 0, tumble: 0.1 },
  ] : pickup ? [
    // The rear stays LOW (y1 ~0.85-1.05): the loft top IS the bed
    // floor, and bed walls (below) rise above it — a tall rear loft
    // would read as a covered bed, not an open one.
    { z: L / 2, w: W * 0.78, y0: 0.42, y1: 0.70, crown: 0, tumble: 0.1 },
    { z: L * 0.32, w: W * 0.94, y0: 0.38, y1: 0.95, crown: 0, tumble: 0.1 },
    { z: L * 0.1, w: W * 0.98, y0: 0.38, y1: 1.12, crown: 0, tumble: 0.1 },
    { z: -L * 0.15, w: W, y0: 0.38, y1: 1.08, crown: 0, tumble: 0.1 },
    { z: -L * 0.35, w: W * 0.97, y0: 0.38, y1: 0.98, crown: 0, tumble: 0.1 },
    { z: -L / 2, w: W * 0.86, y0: 0.40, y1: 0.95, crown: 0, tumble: 0.1 },
  ] : minibus ? [
    { z: L / 2, w: W * 0.78, y0: 0.42, y1: 0.70, crown: 0, tumble: 0.1 },
    { z: L * 0.32, w: W * 0.93, y0: 0.38, y1: 0.90, crown: 0, tumble: 0.1 },
    { z: L * 0.1, w: W * 0.98, y0: 0.38, y1: 1.32, crown: 0, tumble: 0.1 },
    { z: -L * 0.15, w: W, y0: 0.38, y1: 1.35, crown: 0, tumble: 0.1 },
    { z: -L * 0.35, w: W * 0.97, y0: 0.38, y1: 1.35, crown: 0, tumble: 0.1 },
    { z: -L / 2, w: W * 0.86, y0: 0.40, y1: 1.30, crown: 0, tumble: 0.1 },
  ] : [
    { z: L / 2, w: W * 0.78, y0: 0.42, y1: 0.62, crown: 0, tumble: 0.1 },
    { z: L * 0.32, w: W * 0.93, y0: 0.38, y1: 0.80, crown: 0, tumble: 0.1 },
    { z: L * 0.1, w: W * 0.98, y0: 0.38, y1: 1.12, crown: 0, tumble: 0.1 },
    { z: -L * 0.15, w: W, y0: 0.38, y1: 1.15, crown: 0, tumble: 0.1 },
    { z: -L * 0.35, w: W * 0.97, y0: 0.38, y1: 1.15, crown: 0, tumble: 0.1 },
    { z: -L / 2, w: W * 0.86, y0: 0.40, y1: 1.10, crown: 0, tumble: 0.1 },
  ];
  const flankAt = (z) => {
    const sorted = [...bodySecs].sort((a, b) => a.z - b.z);
    if (z <= sorted[0].z) return sorted[0].w / 2;
    for (let i = 0; i < sorted.length - 1; i += 1) {
      const a = sorted[i];
      const b = sorted[i + 1];
      if (z >= a.z && z <= b.z) {
        const t = (z - a.z) / (b.z - a.z);
        return (a.w + (b.w - a.w) * t) / 2;
      }
    }
    return sorted[sorted.length - 1].w / 2;
  };
  const body = new THREE.Mesh(loftGeometry(bodySecs), bodyMat);
  body.castShadow = true;
  body.receiveShadow = true;
  g.add(body);
  // Glasshouse: tinted glass band with a body-colour roof, sloped
  // windshield and rear glass. The hatchback's glasshouse runs longer and
  // its tailgate glass stands more upright. Round 19: the tall kinds
  // (van / SUV / minibus) share one tall cabin; the pickup's cabin
  // covers the FRONT third only, so the rear stays an open bed.
  const tall = kind === 'van' || suv || minibus;
  const cabinH = tall ? 0.75 : 0.5;
  const cabinY = tall ? 1.65 : 1.30;
  const roofY = tall ? 2.06 : 1.58;
  const cabinZ = pickup ? L * 0.18 : kind === 'van' ? 0.3 : minibus ? -0.3 : suv ? -0.1 : hb ? -0.05 : -0.2;
  const cabinLen = pickup ? L * 0.30 : minibus ? L * 0.60 : suv ? L * 0.50 : hb ? L * 0.52 : L * 0.46;
  const roofLen = pickup ? L * 0.34 : minibus ? L * 0.64 : hb ? L * 0.58 : L * 0.5;
  const shieldZ = pickup ? 1.80 : minibus ? 1.55 : suv ? 1.20 : kind === 'van' ? 1.45 : hb ? 0.8 : 0.95;
  const shieldY = pickup ? 1.22 : tall ? 1.72 : 1.34;
  const rearZ = pickup ? 0.15 : minibus ? -2.15 : suv ? -1.40 : kind === 'van' ? -0.85 : hb ? -1.5 : -1.35;
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(W * 0.84, cabinH, cabinLen),
    glassMat,
  );
  cabin.position.set(0, cabinY, cabinZ);
  g.add(cabin);
  const roof = box(W * 0.88, 0.08, roofLen, color, { metal: 0.4, rough: 0.4 });
  roof.position.set(0, roofY, cabinZ);
  g.add(roof);
  if (kind === 'van' || suv || minibus) {
    // Cabin side windows (+ sliding-door rail on van / minibus), so
    // the tall kinds read as vans/SUVs from the side, not tall boxes.
    const winDefs = minibus
      ? [[1.1, 1.2], [-0.1, 1.2], [-1.3, 1.2]]
      : suv ? [[0.3, 1.2], [-0.9, 0.9]] : [[0.2, 1.6], [-1.15, 0.9]];
    for (const sx of [-1, 1]) {
      for (const [wz, wl] of winDefs) {
        const win = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.42, wl), glassMat);
        win.position.set(sx * (W * 0.42 + 0.02), 1.65, wz);
        g.add(win);
      }
      if (kind === 'van' || minibus) {
        const rail = box(0.04, 0.05, 1.8, '#1c1c1c');
        rail.position.set(sx * (W / 2 + 0.01), 1.32, 0.1);
        g.add(rail);
      }
    }
  }
  if (pickup) {
    // Open bed: a dark floor on the low rear deck + body-colour walls
    // and tailgate rising above it + a toolbox, so the rear reads as
    // a working bed, not a covered trunk.
    const bedFloor = box(W * 0.86, 0.06, L * 0.42, '#1c1c1c');
    bedFloor.position.set(0, 0.98, -L * 0.27);
    g.add(bedFloor);
    for (const sx of [-1, 1]) {
      const wall = box(0.08, 0.34, L * 0.42, color, { metal: 0.4, rough: 0.4 });
      wall.position.set(sx * (W / 2 - 0.04), 1.08, -L * 0.27);
      g.add(wall);
    }
    const gate = box(W * 0.96, 0.34, 0.08, color, { metal: 0.4, rough: 0.4 });
    gate.position.set(0, 1.08, -L / 2 + 0.04);
    g.add(gate);
    const toolbox = box(0.9, 0.25, 0.4, '#c9c9c9', { metal: 0.8, rough: 0.3 });
    toolbox.position.set(0, 1.13, -0.6);
    g.add(toolbox);
  }
  const shield = new THREE.Mesh(
    new THREE.BoxGeometry(W * 0.8, 0.05, 0.95),
    glassMat,
  );
  shield.position.set(0, shieldY, shieldZ);
  shield.rotation.x = 0.45;
  g.add(shield);
  const rearGlass = new THREE.Mesh(
    new THREE.BoxGeometry(W * 0.8, 0.05, 0.9),
    glassMat,
  );
  rearGlass.position.set(0, shieldY, rearZ);
  rearGlass.rotation.x = hb ? -0.3 : -0.45;
  g.add(rearGlass);
  if (hb) {
    // Roof spoiler lip over the tailgate + a rear wiper on the glass.
    const lip = box(W * 0.88, 0.06, 0.32, color, { metal: 0.4, rough: 0.4 });
    lip.position.set(0, 1.60, -1.3);
    g.add(lip);
    const wiper = box(0.04, 0.32, 0.02, '#1c1c1c');
    wiper.position.set(0.3, 1.28, -1.85);
    wiper.rotation.x = -0.3;
    g.add(wiper);
  }
  // Hood + trunk shut lines, side skirts, roof antenna fin, side indicators.
  for (const sz of [1, -1]) {
    const seam = box(W * 0.7, 0.015, 0.03, '#1c1c1c');
    seam.position.set(0, 1.16, sz * L * 0.28);
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
  fin.position.set(0, tall ? 2.14 : 1.66, pickup ? 0.65 : -0.6);
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
  grille.position.set(0, tall ? 0.64 : 0.78, L / 2 + 0.02);
  g.add(grille);
  if (kind === 'taxi') {
    const sign = box(0.7, 0.22, 0.3, '#ffd94d', { glow: 0xffd94d });
    sign.position.set(0, 1.68, -0.2);
    g.add(sign);
    for (const sx of [-0.5, 0.5]) {
      const stripe = box(0.1, 0.2, L, '#ffd94d');
      stripe.position.set(sx, 0.8, 0);
      g.add(stripe);
    }
  }
  for (const sx of [-0.7, 0.7]) {
    const light = box(0.3, 0.12, 0.06, '#fff8d0', { glow: 0xfff2b0 });
    light.position.set(sx, tall ? 0.66 : 0.8, L / 2 + 0.02);
    g.add(light);
    const tail = box(0.3, 0.12, 0.06, '#d21f2b', { glow: 0xd21f2b });
    tail.position.set(sx, tall ? 0.66 : 0.8, -L / 2 - 0.02);
    g.add(tail);
  }
  // Round 20: wheels out to the flank under a FLAT partial arch ring
  // (same construction as the Garuda — no torus, so no ring can stick
  // up above the fender line) + a dark well. Round 20: bigger wheels
  // (SUV 0.46, the rest 0.44 — was 0.44/0.42), like the Garuda.
  const wr = suv ? 0.46 : 0.44;
  for (const wz of [L * 0.32, -L * 0.32]) {
    const flank = flankAt(wz);
    const wx = flank - 0.32 / 2 + 0.015;
    for (const sx of [-1, 1]) {
      const wh = wheel(wr);
      wh.position.set(sx * wx, wr, wz);
      g.add(wh);
      const well = new THREE.Mesh(
        new THREE.CircleGeometry(wr + 0.06, 20, 0, Math.PI),
        new THREE.MeshBasicMaterial({ color: '#050506', side: THREE.DoubleSide }),
      );
      well.position.set(sx * (flank - 0.02), wr, wz);
      well.rotation.y = sx * Math.PI / 2;
      g.add(well);
      const arch = new THREE.Mesh(
        new THREE.RingGeometry(wr + 0.02, wr + 0.08, 24, 1, (115 * Math.PI) / 180, (310 * Math.PI) / 180),
        bodyMat,
      );
      arch.position.set(sx * (flank + 0.002), wr, wz);
      arch.rotation.y = sx * Math.PI / 2;
      g.add(arch);
    }
  }
  g.userData.bodyMat = bodyMat;
  tameEnv(g, new Map([[bodyMat, 0.7], [glassMat, 1.2]]));
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
  tameEnv(g, new Map([[glassMat, 1.2]]));
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
    // Round 18: five spokes in the rim, so the wheels read as spoked
    // instead of flat discs.
    for (let i = 0; i < 5; i += 1) {
      const spoke = box(0.05, 0.4, 0.05, '#c9ced6', { metal: 0.8, rough: 0.3 });
      spoke.position.set(0, 0, 0);
      spoke.rotation.x = (i / 5) * Math.PI;
      w.add(spoke);
    }
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
  // Round 18: the fuel tank is a SCALED SPHERE (not a box) and the bike
  // gets a front fairing — the boxy tank was the part that read as a toy.
  const tank = new THREE.Mesh(
    new THREE.SphereGeometry(0.35, 16, 12),
    new THREE.MeshStandardMaterial({ color, roughness: 0.3, metalness: 0.5 }),
  );
  tank.scale.set(0.65, 0.55, 1.1);
  tank.position.set(0, 0.72, 0.15);
  tank.castShadow = true;
  g.add(tank);
  const fairing = new THREE.Mesh(
    new THREE.SphereGeometry(0.3, 14, 10),
    new THREE.MeshStandardMaterial({ color, roughness: 0.3, metalness: 0.5 }),
  );
  fairing.scale.set(0.6, 0.7, 0.8);
  fairing.position.set(0, 0.68, 0.55);
  g.add(fairing);
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
  tameEnv(g, new Map([[glassMat, 1.2]]));
  return g;
}

/**
 * A small scooter with a rider (round 17, top-1 recipe): the pink
 * scooter + rider on the right sidewalk of the top-1 chase shot. A
 * low deck, a front shield, small wheels, a headlight, and a rider in
 * the 'ride' pose — knees forward, hands on the bars, body leaned
 * forward. A prop, not a drivable vehicle. Faces +z like every other
 * vehicle.
 */
export function buildScooter(color = '#ff9ec7') {
  const g = new THREE.Group();
  const paint = new THREE.MeshPhysicalMaterial({
    color, roughness: 0.32, metalness: 0.45,
    clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 0.7,
  });
  // Round 18: the wheels are the SHARED 5-spoke wheel() (squashed
  // sideways to scooter width), not plain discs.
  function scooterWheel(z) {
    const w = wheel(0.2);
    w.scale.set(0.45, 1, 1);
    w.position.set(0, 0.2, z);
    return w;
  }
  g.add(scooterWheel(0.55), scooterWheel(-0.55));
  // Round 18: the front mudguard is a round torus over the front wheel.
  const guard = new THREE.Mesh(
    new THREE.TorusGeometry(0.24, 0.05, 8, 16, Math.PI),
    paint,
  );
  guard.position.set(0, 0.2, 0.55);
  guard.rotation.y = Math.PI / 2;
  g.add(guard);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.12, 1.0), paint);
  deck.position.set(0, 0.32, -0.05);
  deck.castShadow = true;
  g.add(deck);
  // Round 18: the body is a TAPERED POD (scaled sphere), not a box —
  // the boxy body was the part that read as a toy.
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 12), paint);
  body.scale.set(0.7, 0.75, 1.1);
  body.position.set(0, 0.55, 0.28);
  body.castShadow = true;
  g.add(body);
  const shield = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 0.5, 0.05),
    glassMat,
  );
  shield.position.set(0, 0.85, 0.5);
  shield.rotation.x = 0.35;
  g.add(shield);
  const seat = box(0.38, 0.1, 0.5, '#1c1c1c');
  seat.position.set(0, 0.62, -0.35);
  g.add(seat);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.16, 0.3), paint);
  tail.position.set(0, 0.58, -0.68);
  g.add(tail);
  const bar = cylinder(0.025, 0.025, 0.55, '#1c1c1c');
  bar.rotation.z = Math.PI / 2;
  bar.position.set(0, 0.98, 0.42);
  g.add(bar);
  for (const sx of [-0.27, 0.27]) {
    const grip = cylinder(0.035, 0.035, 0.12, '#1c1c1c');
    grip.rotation.z = Math.PI / 2;
    grip.position.set(sx, 0.98, 0.42);
    g.add(grip);
  }
  const head = new THREE.Mesh(
    new THREE.CircleGeometry(0.09, 14),
    new THREE.MeshBasicMaterial({ color: '#fff8d0' }),
  );
  head.position.set(0, 0.6, 0.56);
  g.add(head);
  const tailLight = box(0.18, 0.06, 0.04, '#d21f2b', { glow: 0xd21f2b });
  tailLight.position.set(0, 0.62, -0.84);
  g.add(tailLight);
  // Rider in the 'ride' pose: knees forward, hands to the bars, body
  // leaned forward over the deck.
  const r = buildMinifig({
    name: 'Warga', role: 'Pejalan kaki', hair: 'cap', shirt: '#ff9ec7',
    shirtPat: '#ffffff', pants: '#2a2a33', skin: '#e2ac7e',
  }, 0.85);
  r.group.position.set(0, 0.18, -0.3);
  r.group.rotation.x = 0.12; // lean forward
  r.legL.rotation.x = -1.25;
  r.legR.rotation.x = -1.25;
  r.armL.rotation.x = -1.05;
  r.armR.rotation.x = -1.05;
  g.add(r.group);
  tameEnv(g, new Map([[glassMat, 1.2]]));
  return g;
}

/** A KPD patrol car, like the reference photo (IMG_9359): a LONG low white
 * sedan (5.2u) with a BLACK hood and trunk, a red+blue light bar on the
 * roof, big red taillights, a black rear window, a rear plate and blue
 * door badges with white KPD letters — no blue side stripe anymore. */
export function buildPoliceCar() {
  const L = 5.2;
  const g = buildStreetCar('sedan', '#f2f2f2', { forceSedan: true, length: L });
  // Black hood + black trunk panels that FOLLOW the lofted top curve
  // (thin lofts, not flat boxes) — round 18: the flat panels floated
  // above the curved beltline. Round 19: recomputed from the NEW
  // sedan curve (y1 0.67/0.75/0.83/0.93 on the hood, 1.15 on the
  // trunk). Round 20: FLAT now (crown 0, was 0.03), following the
  // flat sedan curve, so they hug the body.
  const hoodSecs = [
    { z: L * 0.44, w: 1.7, y0: 0.61, y1: 0.67, tumble: 0.1, crown: 0 },
    { z: L * 0.365, w: 1.7, y0: 0.69, y1: 0.75, tumble: 0.1, crown: 0 },
    { z: L * 0.29, w: 1.7, y0: 0.77, y1: 0.83, tumble: 0.1, crown: 0 },
    { z: L * 0.23, w: 1.7, y0: 0.87, y1: 0.93, tumble: 0.1, crown: 0 },
  ];
  const hood = new THREE.Mesh(
    loftGeometry(hoodSecs),
    new THREE.MeshStandardMaterial({ color: '#141414', roughness: 0.4, metalness: 0.4 }),
  );
  g.add(hood);
  const trunkSecs = [
    { z: -L * 0.23, w: 1.7, y0: 1.09, y1: 1.15, tumble: 0.1, crown: 0 },
    { z: -L * 0.35, w: 1.7, y0: 1.09, y1: 1.15, tumble: 0.1, crown: 0 },
    { z: -L * 0.44, w: 1.7, y0: 1.06, y1: 1.12, tumble: 0.1, crown: 0 },
  ];
  const trunk = new THREE.Mesh(
    loftGeometry(trunkSecs),
    new THREE.MeshStandardMaterial({ color: '#141414', roughness: 0.4, metalness: 0.4 }),
  );
  g.add(trunk);
  // Black rear window: a solid black panel over the sloped rear glass,
  // so the tail reads black glass from the chase camera.
  const rearWin = box(1.5, 0.5, 0.04, '#0a0a0a', { metal: 0.2, rough: 0.25 });
  rearWin.position.set(0, 1.36, -L * 0.29);
  rearWin.rotation.x = -0.45;
  g.add(rearWin);
  // Push bar on the nose.
  const bar = box(2.0, 0.1, 0.14, '#1c1c1c');
  bar.position.set(0, 0.5, L / 2 + 0.02);
  g.add(bar);
  // Light bar on the roof: a black base + a red lamp (left) + a blue
  // lamp (right). Unlit basic materials, so the red/blue read as pure
  // saturated colour instead of washing out to peach under the bright
  // sunset exposure (the old emissive lamps did). Round 15: the lamp
  // meshes + their glow sprites are kept on userData, so police.js can
  // flash them alternately (red / blue) in live play.
  const base = box(1.5, 0.1, 0.5, '#1c1c1c');
  base.position.set(0, 1.67, -0.2);
  g.add(base);
  const barRefs = {};
  for (const [sx, col, key] of [[-0.38, '#ff2020', 'Red'], [0.38, '#2266ff', 'Blue']]) {
    const lamp = new THREE.Mesh(
      new THREE.BoxGeometry(0.62, 0.2, 0.42),
      new THREE.MeshBasicMaterial({ color: col }),
    );
    lamp.position.set(sx, 1.78, -0.2);
    g.add(lamp);
    barRefs[`light${key}`] = lamp;
    barRefs[`light${key}Bright`] = col;
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: col, transparent: true, opacity: 0.55, depthWrite: false }));
    glow.scale.set(3.2, 3.2, 1);
    glow.position.set(sx, 1.78, -0.2);
    g.add(glow);
    barRefs[`glow${key}`] = glow;
  }
  Object.assign(g.userData, barRefs);
  // Round 15: a blue side stripe (top-10 police livery) along each flank.
  for (const sx of [-1, 1]) {
    const stripe = box(0.04, 0.22, L * 0.62, '#1f57c3', { metal: 0.3, rough: 0.4 });
    stripe.position.set(sx * 1.01, 0.62, 0);
    g.add(stripe);
  }
  // Slim red taillights at the rear corners, proud of the small stock
  // ones (same unlit material, so they read red, not peach).
  for (const sx of [-0.62, 0.62]) {
    const tail = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.14, 0.06),
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
  tameEnv(g, new Map([[g.userData.bodyMat, 0.7], [glassMat, 1.2]]));
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
  // Round 15b: a DARK NAVY body (was white #f2f2f2) — the white heli
  // blew out to an unreadable blob against the bright golden-hour sky;
  // the top-10 helis are dark-hulled, so the silhouette reads. The
  // belly stays light, the stripe stays blue, the KPD decals are white.
  const bodyMat = new THREE.MeshStandardMaterial({ color: '#22344d', roughness: 0.4, metalness: 0.3 });
  // Round 18: the fuselage is a LOFTED TEARDROP (wide round nose,
  // tapering toward the tail boom), not a box — the box hull was the
  // part that read as a toy from the ground.
  const fuseSecs = [
    { z: 2.1, w: 1.5, y0: -0.55, y1: 0.55, tumble: 0.12 },
    { z: 1.4, w: 2.3, y0: -0.8, y1: 0.85, tumble: 0.12 },
    { z: 0.2, w: 2.4, y0: -0.8, y1: 0.9, tumble: 0.12 },
    { z: -1.0, w: 2.0, y0: -0.75, y1: 0.8, tumble: 0.12 },
    { z: -2.2, w: 0.9, y0: -0.4, y1: 0.45, tumble: 0.1 },
  ];
  const body = new THREE.Mesh(loftGeometry(fuseSecs), bodyMat);
  body.castShadow = true;
  g.add(body);
  // White belly band following the fuselage (a thin loft slab slightly
  // wider than the hull, wrapping its lower half).
  const bellyBandSecs = [
    { z: 1.2, w: 2.34, y0: -0.82, y1: -0.30, tumble: 0.12 },
    { z: 0.2, w: 2.44, y0: -0.82, y1: -0.30, tumble: 0.12 },
    { z: -0.8, w: 2.10, y0: -0.78, y1: -0.30, tumble: 0.12 },
  ];
  const bellyBand = new THREE.Mesh(
    loftGeometry(bellyBandSecs),
    new THREE.MeshStandardMaterial({ color: '#e8e8e8', roughness: 0.4, metalness: 0.3 }),
  );
  g.add(bellyBand);
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
  // KPD decals on both flanks (white on the dark navy body, round 15b).
  const kpdTex = textTexture('KPD', '#ffffff', 64);
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
    new THREE.MeshStandardMaterial({ color: '#1d2b38', roughness: 0.04, metalness: 0.9, transparent: true, opacity: 0.6, envMapIntensity: 1.2 }),
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
  // (The white belly band above replaces the old box belly fairing.)
  // Tail boom, fin, stabilizer, KPD decal. Round 15b: the boom is dark
  // navy like the body (was white), the fin/stabilizer stay blue.
  const boom = box(0.7, 0.7, 4.6, '#22344d', { metal: 0.3, rough: 0.4 });
  boom.position.set(0, 0.35, -4.2);
  g.add(boom);
  const boomTex = textTexture('KPD', '#ffffff', 48);
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
  // Blur disc: 0.18 (round 19 — the 0.12 disc was nearly invisible
  // against the bright 16:00 sky in the chase shot, so the heli read
  // as a dark speck; 0.22 in round 17 read as a solid grey plate, so
  // 0.18 splits the difference).
  const blur = new THREE.Mesh(
    new THREE.CircleGeometry(5.8, 32),
    new THREE.MeshBasicMaterial({ color: '#888888', transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false }),
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
  // Skids: CYLINDERS (not boxes) + cylinder struts.
  for (const sx of [-1.0, 1.0]) {
    const skid = cylinder(0.06, 0.06, 4.4, '#333333');
    skid.rotation.x = Math.PI / 2;
    skid.position.set(sx, -1.05, 0.2);
    g.add(skid);
    for (const sz of [-1.2, 1.2]) {
      const strut = cylinder(0.05, 0.05, 0.5, '#333333');
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
  // Round 18: red + blue BEACON BALLS under the belly.
  for (const [sx, col] of [[-0.5, '#ff2e2e'], [0.5, '#2b6fd0']]) {
    const beacon = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 10, 8),
      new THREE.MeshBasicMaterial({ color: col }),
    );
    beacon.position.set(sx, -0.95, 0.6);
    g.add(beacon);
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
  // Round 15b: the cone is a normal (not additive) cool-white beam at
  // 0.32 opacity — additive vanished against the bright orange dusk sky,
  // and the first round 15 render showed the beam as a faint streak.
  // Round 16: opacity 0.55, radius 4.5, warm-white #fff3c4 — at 0.32 the
  // cone was still a faint streak against the bright dusk sky in both
  // shots (the asphalt pool read, the beam itself did not).
  // Round 17: 0.6 — the bright-blue 16:00 sky washes the beam out even
  // more than the dusk sky did.
  // Round 17b: 0.35 — at 0.6 the cone read as a solid white funnel
  // dominating the combat frame; a searchlight beam is a hint, not a wall.
  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(4.5, 18, 20, 1, true),
    new THREE.MeshBasicMaterial({ color: '#fff3c4', transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }),
  );
  cone.position.set(0, -8, 1.2);
  cone.rotation.x = Math.PI;
  g.add(cone);
  g.userData.cone = cone;
  tameEnv(g);
  return g;
}
