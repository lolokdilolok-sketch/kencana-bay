// The city of Kencana Bay: ground, sea, roads, buildings, palms, the
// ferris wheel, the billboard and the sunset sky. Everything is built
// from a seeded generator, so the same seed gives the same city.
import { THREE } from './three-shim.js';
import { DISTRICTS, WORLD, districtAt } from './config.js';
import { makeRng, range } from './random.js';

function box(w, h, d, color, opts = {}) {
  const mat = new THREE.MeshLambertMaterial({
    color,
    emissive: opts.emissive || 0x000000,
    emissiveIntensity: opts.glow || 0,
  });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(opts.x || 0, (opts.y || 0) + h / 2, opts.z || 0);
  if (opts.ry) mesh.rotation.y = opts.ry;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function skyTexture() {
  return canvasTexture(64, 512, (g, w, h) => {
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#2b1b4d');
    grad.addColorStop(0.35, '#8a2f6d');
    grad.addColorStop(0.6, '#e06a9a');
    grad.addColorStop(0.8, '#ff9a5c');
    grad.addColorStop(1, '#ffd27d');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
  });
}

function billboardTexture() {
  return canvasTexture(512, 256, (g, w, h) => {
    g.fillStyle = '#101018';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#ffb400';
    g.font = 'bold 64px system-ui, sans-serif';
    g.textAlign = 'center';
    g.fillText('KENCANA', w / 2, 100);
    g.fillStyle = '#ff5e8a';
    g.font = 'bold 72px system-ui, sans-serif';
    g.fillText('FM 101.1', w / 2, 190);
  });
}

function litWindows(rng, parent, w, h, d, x, y, z) {
  // Warm glowing windows on all four faces of a building, so no side
  // ever reads as a blank flat wall from the street.
  const winGeo = new THREE.PlaneGeometry(2.4, 3.2);
  const winMat = new THREE.MeshBasicMaterial({ color: 0xffe98a });
  const darkMat = new THREE.MeshBasicMaterial({ color: 0x2a2f3d });
  function put(wx, wy, wz, ry) {
    if (rng() < 0.22) return; // some windows stay dark
    const win = new THREE.Mesh(winGeo, rng() < 0.78 ? winMat : darkMat);
    win.position.set(wx, wy, wz);
    win.rotation.y = ry;
    parent.add(win);
  }
  const rows = Math.max(1, Math.floor(h / 7));
  const cols = Math.max(1, Math.floor(w / 6));
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const wx = x - w / 2 + 3 + (c + 0.5) * ((w - 6) / cols);
      const wy = y + 4 + (r + 0.5) * ((h - 6) / rows);
      put(wx, wy, z + d / 2 + 0.06, 0);
      put(wx, wy, z - d / 2 - 0.06, Math.PI);
    }
  }
  const sideCols = Math.max(1, Math.floor(d / 6));
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < sideCols; c += 1) {
      const wz = z - d / 2 + 3 + (c + 0.5) * ((d - 6) / sideCols);
      const wy = y + 4 + (r + 0.5) * ((h - 6) / rows);
      put(x + w / 2 + 0.06, wy, wz, Math.PI / 2);
      put(x - w / 2 - 0.06, wy, wz, -Math.PI / 2);
    }
  }
}

function makePalm(rng) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.8, 11, 6),
    new THREE.MeshLambertMaterial({ color: 0x8a5a33 }),
  );
  trunk.position.y = 5.5;
  trunk.rotation.z = (rng() - 0.5) * 0.25;
  trunk.castShadow = true;
  g.add(trunk);
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x2fae5f });
  for (let i = 0; i < 7; i += 1) {
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(1.1, 7, 4), leafMat);
    const a = (i / 7) * Math.PI * 2;
    leaf.position.set(Math.cos(a) * 2.6, 11.4, Math.sin(a) * 2.6);
    leaf.rotation.z = Math.cos(a) * 1.1;
    leaf.rotation.x = -Math.sin(a) * 1.1;
    leaf.castShadow = true;
    g.add(leaf);
  }
  return g;
}

function makeFerrisWheel() {
  // The rim, spokes and cabins spin; the two legs stay planted.
  // The spinner subgroup is returned so the loop can turn it without
  // turning the legs with it.
  const g = new THREE.Group();
  const spinner = new THREE.Group();
  const rimMat = new THREE.MeshBasicMaterial({ color: 0xff5e8a });
  const rim = new THREE.Mesh(new THREE.TorusGeometry(22, 0.9, 8, 40), rimMat);
  rim.position.y = 26;
  spinner.add(rim);
  const spokeMat = new THREE.MeshLambertMaterial({ color: 0xeeeeee });
  for (let i = 0; i < 4; i += 1) {
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.7, 44, 0.7), spokeMat);
    spoke.position.y = 26;
    spoke.rotation.z = (i * Math.PI) / 4;
    spinner.add(spoke);
  }
  const cabinColors = [0xff5e5e, 0xffb400, 0x2ec4b6, 0x7b2fbe, 0x4fc3f7, 0x7fb069, 0xef476f, 0xe08a2e];
  for (let i = 0; i < 8; i += 1) {
    const a = (i / 8) * Math.PI * 2;
    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(4, 3.4, 3),
      new THREE.MeshLambertMaterial({ color: cabinColors[i] }),
    );
    cabin.position.set(Math.cos(a) * 22, 26 + Math.sin(a) * 22, 0);
    cabin.castShadow = true;
    spinner.add(cabin);
  }
  g.add(spinner);
  const legA = new THREE.Mesh(new THREE.BoxGeometry(1.2, 28, 1.2), spokeMat);
  legA.position.set(-8, 13, 0);
  legA.rotation.z = 0.35;
  const legB = legA.clone();
  legB.position.x = 8;
  legB.rotation.z = -0.35;
  g.add(legA, legB);
  return { group: g, spinner };
}

function makeCrane() {
  const g = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color: 0xd8a020 });
  const leg1 = new THREE.Mesh(new THREE.BoxGeometry(2, 34, 2), mat);
  leg1.position.set(-4, 17, 0);
  const leg2 = leg1.clone();
  leg2.position.x = 4;
  const beam = new THREE.Mesh(new THREE.BoxGeometry(30, 2, 2), mat);
  beam.position.set(6, 34, 0);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(5, 4, 4), mat);
  cab.position.set(-2, 30, 0);
  g.add(leg1, leg2, beam, cab);
  return g;
}

export function buildWorld(seed) {
  const rng = makeRng(seed);
  const group = new THREE.Group();
  const colliders = [];
  const palms = [];

  // Sky dome and fog colour live with the renderer; the dome is local here.
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(900, 24, 16),
    new THREE.MeshBasicMaterial({ map: skyTexture(), side: THREE.BackSide, fog: false }),
  );
  group.add(sky);

  // Ground: one big slab, then the sea and sand on the west edge.
  const ground = new THREE.Mesh(
    new THREE.BoxGeometry(WORLD.maxX - WORLD.minX + 200, 1, WORLD.maxZ - WORLD.minZ + 200),
    new THREE.MeshLambertMaterial({ color: 0x4a7a4f }),
  );
  ground.position.set(0, -0.5, 0);
  ground.receiveShadow = true;
  group.add(ground);

  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(120, WORLD.maxZ - WORLD.minZ + 200),
    new THREE.MeshLambertMaterial({ color: 0x2a7fae }),
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(WORLD.seaX - 60, 0.15, 0);
  group.add(sea);

  const sand = new THREE.Mesh(
    new THREE.BoxGeometry(WORLD.sandX - WORLD.seaX + 8, 0.6, WORLD.maxZ - WORLD.minZ + 40),
    new THREE.MeshLambertMaterial({ color: 0xf2d492 }),
  );
  sand.position.set((WORLD.seaX + WORLD.sandX) / 2, 0.1, 0);
  sand.receiveShadow = true;
  group.add(sand);

  // Roads: dark strips with pale dashed centrelines.
  const roadMat = new THREE.MeshLambertMaterial({ color: 0x33363e });
  const dashMat = new THREE.MeshBasicMaterial({ color: 0xf5d76e });
  for (const x of WORLD.roadXs) {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(WORLD.roadWidth, 0.5, WORLD.maxZ - WORLD.minZ), roadMat);
    strip.position.set(x, 0.05, 0);
    strip.receiveShadow = true;
    group.add(strip);
    for (let z = -330; z < 330; z += 24) {
      const dash = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.1, 7), dashMat);
      dash.position.set(x, 0.32, z);
      group.add(dash);
    }
  }
  for (const z of WORLD.roadZs) {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(WORLD.maxX - WORLD.minX, 0.5, WORLD.roadWidth), roadMat);
    strip.position.set(0, 0.05, z);
    strip.receiveShadow = true;
    group.add(strip);
    for (let x = -330; x < 330; x += 24) {
      const dash = new THREE.Mesh(new THREE.BoxGeometry(7, 0.1, 0.8), dashMat);
      dash.position.set(x, 0.32, z);
      group.add(dash);
    }
  }

  // Buildings: walk the blocks between roads and raise one building per
  // block corner, archetype by district, with lit windows.
  const archetypes = [
    { w: [16, 24], h: [34, 70], d: [16, 24], colors: [0x8a6f8a, 0x6f7f9a, 0x9a7f6f, 0x5f8a7a] },
    { w: [14, 20], h: [12, 22], d: [14, 20], colors: [0xc98a5a, 0x7fae9a, 0xb56a6a, 0x8a9a5a] },
    { w: [22, 34], h: [9, 14], d: [18, 26], colors: [0x7a7f8a, 0x9a8a7a, 0x6a7a8a] },
  ];
  const blockXs = [-300, -180, -60, 60, 180, 300];
  const blockZs = [-300, -180, -60, 60, 180, 300];
  for (const bx of blockXs) {
    for (const bz of blockZs) {
      const d = districtAt(bx + 30, bz + 30);
      const arch = archetypes[Math.floor(rng() * archetypes.length)];
      const w = range(rng, arch.w[0], arch.w[1]);
      const h = range(rng, arch.h[0], arch.h[1]);
      const dep = range(rng, arch.d[0], arch.d[1]);
      const cx = bx + 30 + range(rng, -8, 8);
      const cz = bz + 30 + range(rng, -8, 8);
      const color = arch.colors[Math.floor(rng() * arch.colors.length)];
      const b = box(w, h, dep, color, { x: cx, y: 0, z: cz });
      group.add(b);
      litWindows(rng, group, w, h, dep, cx, 0, cz);
      // A darker roof cap and a small rooftop box.
      const cap = box(w + 1, 1.2, dep + 1, 0x2e2a33, { x: cx, y: h, z: cz });
      group.add(cap);
      if (rng() < 0.5) {
        const hut = box(4, 3, 4, 0x4a4a52, { x: cx + range(rng, -4, 4), y: h + 1.2, z: cz + range(rng, -4, 4) });
        group.add(hut);
      }
      colliders.push({ x0: cx - w / 2, x1: cx + w / 2, z0: cz - dep / 2, z1: cz + dep / 2 });
      void d;
    }
  }

  // One landmark per district.
  const crane = makeCrane();
  crane.position.set(-220, 0, -280);
  group.add(crane);
  const containers = [0xe05a3a, 0x3a7bd5, 0x2fae5f, 0xe0a020];
  containers.forEach((c, i) => {
    const cont = box(12, 3.4, 3.4, c, { x: -250 + (i % 2) * 16, y: 0, z: -310 + Math.floor(i / 2) * 8 });
    group.add(cont);
  });

  const hotel = box(30, 78, 22, 0xd8c9a8, { x: -140, y: 0, z: -40 });
  group.add(hotel);
  litWindows(rng, group, 30, 78, 22, -140, 0, -40);
  const mansion = box(26, 16, 20, 0xe8dcc0, { x: -200, y: 0, z: 40 });
  group.add(mansion);
  colliders.push({ x0: -155, x1: -125, z0: -51, z1: -29 }, { x0: -213, x1: -187, z0: 30, z1: 50 });

  const casino = box(34, 20, 26, 0x5a2a6a, { x: 120, y: 0, z: -40 });
  group.add(casino);
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(11, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshLambertMaterial({ color: 0xd4af37, emissive: 0x554400, emissiveIntensity: 0.6 }),
  );
  dome.position.set(120, 20, -40);
  dome.castShadow = true;
  group.add(dome);
  colliders.push({ x0: 103, x1: 137, z0: -53, z1: -27 });

  const wheel = makeFerrisWheel();
  wheel.group.position.set(-285, 0, 240);
  group.add(wheel.group);
  colliders.push({ x0: -295, x1: -275, z0: 230, z1: 250 });

  // Beach umbrellas and towels along Pantai Kidul.
  const umbrellaColors = [0xff5e5e, 0xffb400, 0x2ec4b6, 0x7b2fbe, 0x4fc3f7];
  for (let i = 0; i < 10; i += 1) {
    const ux = -285 + range(rng, -6, 6);
    const uz = 140 + i * 20 + range(rng, -4, 4);
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.25, 0.25, 5, 6),
      new THREE.MeshLambertMaterial({ color: 0xdddddd }),
    );
    pole.position.set(ux, 2.5, uz);
    group.add(pole);
    const top = new THREE.Mesh(
      new THREE.ConeGeometry(4.5, 2.2, 8),
      new THREE.MeshLambertMaterial({ color: umbrellaColors[i % umbrellaColors.length] }),
    );
    top.position.set(ux, 6, uz);
    top.castShadow = true;
    group.add(top);
    const towel = new THREE.Mesh(
      new THREE.BoxGeometry(3.4, 0.2, 2),
      new THREE.MeshLambertMaterial({ color: umbrellaColors[(i + 2) % umbrellaColors.length] }),
    );
    towel.position.set(ux + 5, 0.4, uz + 3);
    group.add(towel);
  }

  const showroom = box(36, 12, 24, 0x9ac8d8, { x: 180, y: 0, z: 240, emissive: 0x223344, glow: 0.5 });
  group.add(showroom);
  for (let i = 0; i < 5; i += 1) {
    const stall = box(6, 3.4, 5, [0xe05a3a, 0x2fae5f, 0xffb400, 0x7b2fbe, 0x4fc3f7][i], { x: 80 + i * 14, y: 0, z: 300 });
    group.add(stall);
  }
  colliders.push({ x0: 162, x1: 198, z0: 228, z1: 252 });

  // Batik workshop: low building with a striped awning.
  const workshop = box(24, 10, 18, 0xb56a3a, { x: 120, y: 0, z: -280 });
  group.add(workshop);
  const awning = new THREE.Mesh(
    new THREE.BoxGeometry(26, 0.8, 6),
    new THREE.MeshLambertMaterial({ color: 0x7b2fbe }),
  );
  awning.position.set(120, 7, -269);
  group.add(awning);
  colliders.push({ x0: 108, x1: 132, z0: -289, z1: -271 });

  // Palms along the beach and a few along the main roads.
  for (let z = -320; z <= 320; z += 40) {
    const palm = makePalm(rng);
    palm.position.set(-268, 0, z + range(rng, -6, 6));
    group.add(palm);
    palms.push(palm);
  }
  for (let i = 0; i < 14; i += 1) {
    const palm = makePalm(rng);
    palm.position.set(range(rng, -230, 230), 0, range(rng, -320, 320));
    group.add(palm);
    palms.push(palm);
  }

  // The big KENCANA FM billboard above the beach road.
  const board = new THREE.Mesh(
    new THREE.BoxGeometry(26, 13, 1),
    new THREE.MeshBasicMaterial({ map: billboardTexture() }),
  );
  board.position.set(-268, 16, 180);
  board.rotation.y = Math.PI / 2;
  group.add(board);
  const post1 = box(1.4, 12, 1.4, 0x444444, { x: -268, y: 0, z: 172 });
  const post2 = box(1.4, 12, 1.4, 0x444444, { x: -268, y: 0, z: 188 });
  group.add(post1, post2);

  // The low sun, drawn as a glowing disc low in the west sky.
  const sun = new THREE.Mesh(
    new THREE.CircleGeometry(34, 32),
    new THREE.MeshBasicMaterial({ color: 0xff8a3d, fog: false }),
  );
  sun.position.set(-700, 120, 60);
  sun.lookAt(0, 40, 0);
  group.add(sun);

  return { group, colliders, palms, wheel: wheel.group, wheelSpinner: wheel.spinner };
}
