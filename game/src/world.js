// The city itself: ground, sea, roads, districts, buildings, palms, beach, landmarks.
// One job: build Kencana Bay once from a seeded rng and hand back the colliders, the
// landmarks the other systems need, and an update for the things that move (the ferris
// wheel, the sea). Nothing here knows about missions, police or the HUD.
//
// Buildings are NOT plain repeated boxes any more: every district builds its own family —
// glass towers with sunset reflections in Alun-Alun and Lorong Emas, brick shophouses
// with awnings and shop signs, pitched tile roofs in Kampung Batik, warehouses and cranes
// at the docks, market stalls in Pasar Senja — with real windows in regular grids,
// balconies, rooftop AC boxes and water tanks, sidewalks, zebra crossings, street trees
// and lamps along the roads.

import { THREE } from './three-shim.js';
import { CITY, DISTRICTS, GARAGE, RACE, SUNSET, districtAt } from './config.js';
import { pick, range, rangeInt } from './random.js';

// --- canvas textures (drawn once, reused by every building of that kind) ---

function glassTowerTexture(rng) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  // Sunset reflected in the glass: purple top, orange-pink middle, gold bottom.
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#5a3a8a');
  grad.addColorStop(0.45, '#ff8a5c');
  grad.addColorStop(0.8, '#ffc46b');
  grad.addColorStop(1, '#ffe9a8');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 256);
  // Dark mullions: vertical strips and floor lines, so the tower reads as windows.
  ctx.fillStyle = 'rgba(20,18,30,0.85)';
  for (let col = 0; col < 8; col += 1) ctx.fillRect(col * 16 + 7, 0, 2, 256);
  for (let row = 0; row < 16; row += 1) ctx.fillRect(0, row * 16 + 7, 128, 2);
  // A few lit floors.
  for (let row = 0; row < 16; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      if (rng() < 0.3) {
        ctx.fillStyle = rng() < 0.7 ? 'rgba(255,233,138,0.9)' : 'rgba(255,211,77,0.9)';
        ctx.fillRect(col * 16 + 1, row * 16 + 1, 14, 13);
      }
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function windowGridTexture(rng, base, cols, rows, litRatio) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 128, 256);
  const cw = 128 / cols;
  const rh = 256 / rows;
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const lit = rng() < litRatio;
      ctx.fillStyle = lit ? (rng() < 0.8 ? '#ffe98a' : '#ffd34d') : '#20242e';
      ctx.fillRect(col * cw + cw * 0.18, row * rh + rh * 0.2, cw * 0.64, rh * 0.55);
      // Window frame + sill.
      ctx.fillStyle = 'rgba(20,18,26,0.9)';
      ctx.fillRect(col * cw + cw * 0.18, row * rh + rh * 0.2, cw * 0.64, 2);
      ctx.fillRect(col * cw + cw * 0.14, row * rh + rh * 0.78, cw * 0.72, 3);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function brickTexture(base, mortar) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = mortar;
  ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = base;
  for (let row = 0; row < 8; row += 1) {
    const off = row % 2 === 0 ? 0 : 8;
    for (let col = -1; col < 8; col += 1) {
      ctx.fillRect(col * 16 + off + 1, row * 16 + 1, 14, 14);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function signTexture(text, fg, bg) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 512, 128);
  ctx.fillStyle = fg;
  ctx.font = 'bold 64px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 68);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function stripeTexture(colorA, colorB) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  for (let i = 0; i < 8; i += 1) {
    ctx.fillStyle = i % 2 === 0 ? colorA : colorB;
    ctx.fillRect(i * 16, 0, 16, 64);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function zebraTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#2e3138';
  ctx.fillRect(0, 0, 128, 64);
  ctx.fillStyle = '#f2f2f2';
  for (let i = 0; i < 6; i += 1) ctx.fillRect(8 + i * 20, 4, 10, 56);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function billboardTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 512, 0);
  grad.addColorStop(0, '#ff2e63');
  grad.addColorStop(1, '#ffb400');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 256);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 84px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('KENCANA', 256, 100);
  ctx.font = 'bold 64px system-ui, sans-serif';
  ctx.fillText('FM 101.1', 256, 180);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const FACADE_COLORS = ['#d96a5f', '#e0a45f', '#7fb0d9', '#9a7fd9', '#6fb98a', '#d97fb0', '#c9b458'];
const SHOP_NAMES = {
  batik: ['BATIK SARI', 'BATIK LARAS', 'TENUN JAYA'],
  alun: ['WARUNG KOPI', 'BAKSO 88', 'TOKO EMAS', 'APOTEK'],
  emas: ['BAR NEON', 'KARAOKE', 'KASINO'],
  senja: ['PASAR SENJA', 'BUAH SEGAR', 'SATE MADURA', 'ES TEH'],
  kidul: ['SURF SHOP', 'KELAPA MUDA', 'SEWA PAYUNG'],
  segara: ['GUDANG 7', 'LOGISTIK'],
};
const SHOP_COLORS = ['#ff2e63', '#3fd2c0', '#ffb400', '#b06ae0', '#ff8a3d'];

export function createWorld(scene, rng) {
  const colliders = [];
  const animated = [];
  const glassTex = glassTowerTexture(rng);
  const gridTex = windowGridTexture(rng, '#8a7a6a', 6, 10, 0.55);
  const gridTexWarm = windowGridTexture(rng, '#a08a6a', 5, 8, 0.6);
  const brickTex = brickTexture('#b06a4a', '#7a4a3a');
  const brickTexRed = brickTexture('#9a4a3a', '#6a2a2a');
  const zebraTex = zebraTexture();

  const glassMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: glassTex, emissive: 0xff9a5c, emissiveMap: glassTex, emissiveIntensity: 0.35, roughness: 0.25, metalness: 0.5 });
  const concreteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: gridTex, emissive: 0xffd98a, emissiveMap: gridTex, emissiveIntensity: 0.4, roughness: 0.9 });
  const warmMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: gridTexWarm, emissive: 0xffd98a, emissiveMap: gridTexWarm, emissiveIntensity: 0.4, roughness: 0.9 });
  const brickMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: brickTex, roughness: 1 });
  const brickRedMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: brickTexRed, roughness: 1 });
  const plainMats = FACADE_COLORS.map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9 }));
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x4a3a34, roughness: 1 });
  const roofDark = new THREE.MeshStandardMaterial({ color: 0x2a2e36, roughness: 1 });
  const tileMat = new THREE.MeshStandardMaterial({ color: 0xa84a2a, roughness: 0.9 });
  const roadMat = new THREE.MeshStandardMaterial({ color: 0x2e3138, roughness: 0.95 });
  const dashMat = new THREE.MeshStandardMaterial({ color: 0xf2e9c9, roughness: 0.8 });
  const sandMat = new THREE.MeshStandardMaterial({ color: 0xe8c98a, roughness: 1 });
  const seaMat = new THREE.MeshStandardMaterial({ color: 0x2a6db0, roughness: 0.25, metalness: 0.1 });
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x7a5230, roughness: 1 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x2f9e5f, roughness: 0.9 });
  const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0x8a8a92, roughness: 1 });
  const steelMat = new THREE.MeshStandardMaterial({ color: 0x6a6a72, roughness: 0.6, metalness: 0.5 });
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf2e6c9, roughness: 0.9 });

  function box(w, h, d, mat, x, y, z, ry = 0, rx = 0) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, y, z);
    mesh.rotation.y = ry;
    mesh.rotation.x = rx;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    return mesh;
  }

  function addCollider(x0, z0, x1, z1) {
    colliders.push({ x0, z0, x1, z1 });
  }

  /** A box with different materials per face: front/back get the facade texture, the top
   * gets a plain roof, the sides get the facade or a plain wall — so windows never appear
   * on a roof. Material order: +x, -x, +y, -y, +z, -z. */
  function facedBox(w, h, d, faceMat, sideMat, x, y, z) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [sideMat, sideMat, roofMat, roofDark, faceMat, faceMat]);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    return mesh;
  }

  function roofDressing(x, z, w, d, h) {
    // Rooftop AC box + water tank, so the skyline is not a row of flat slabs.
    if (rng() < 0.6) {
      box(w * 0.3, 2.5, d * 0.3, steelMat, x - w * 0.2, h + 1.2, z - d * 0.15);
    }
    if (rng() < 0.5) {
      const tank = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 4, 10), new THREE.MeshStandardMaterial({ color: 0x3a4a5a, roughness: 0.8 }));
      tank.position.set(x + w * 0.25, h + 2, z + d * 0.2);
      tank.castShadow = true;
      scene.add(tank);
    }
    if (rng() < 0.4) {
      const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 8, 6), steelMat);
      antenna.position.set(x, h + 4, z);
      scene.add(antenna);
      const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff2e2e }));
      beacon.position.set(x, h + 8.2, z);
      scene.add(beacon);
    }
  }

  // --- ground, sea, beach ---
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(1100, 1100), new THREE.MeshStandardMaterial({ color: 0x55565e, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, 0, 0);
  ground.receiveShadow = true;
  scene.add(ground);

  const sea = new THREE.Mesh(new THREE.PlaneGeometry(300, 1100), seaMat);
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(-510, 0.2, 0);
  sea.receiveShadow = true;
  scene.add(sea);
  const foam = new THREE.Mesh(new THREE.PlaneGeometry(8, 1100), new THREE.MeshStandardMaterial({ color: 0xf2f6ff, roughness: 0.6 }));
  foam.rotation.x = -Math.PI / 2;
  foam.position.set(-362, 0.3, 0);
  scene.add(foam);

  const beach = new THREE.Mesh(new THREE.PlaneGeometry(70, 220), sandMat);
  beach.rotation.x = -Math.PI / 2;
  beach.position.set(-330, 0.25, 290);
  beach.receiveShadow = true;
  scene.add(beach);

  // District ground plates: the bright mosaic the map shows.
  for (const d of DISTRICTS) {
    const plate = new THREE.Mesh(
      new THREE.PlaneGeometry(d.x1 - d.x0, d.z1 - d.z0),
      new THREE.MeshStandardMaterial({ color: new THREE.Color(d.color), roughness: 1, transparent: true, opacity: 0.28 }),
    );
    plate.rotation.x = -Math.PI / 2;
    plate.position.set((d.x0 + d.x1) / 2, 0.4, (d.z0 + d.z1) / 2);
    plate.receiveShadow = true;
    scene.add(plate);
  }

  // --- roads: strips along every grid line, with dashes, sidewalks and zebras ---
  const lines = [];
  for (let v = CITY.minX; v <= CITY.maxX; v += CITY.roadGap) lines.push(v);
  for (const v of lines) {
    box(14, 0.2, 860, roadMat, v, 0.1, 0);
    box(860, 0.2, 14, roadMat, 0, 0.1, v);
    // Sidewalks on both sides of every road.
    box(5, 0.3, 860, sidewalkMat, v - 9.5, 0.15, 0);
    box(5, 0.3, 860, sidewalkMat, v + 9.5, 0.15, 0);
    box(860, 0.3, 5, sidewalkMat, 0, 0.15, v - 9.5);
    box(860, 0.3, 5, sidewalkMat, 0, 0.15, v + 9.5);
    for (let t = -400; t <= 400; t += 40) {
      box(0.8, 0.25, 5, dashMat, v, 0.15, t);
      box(5, 0.25, 0.8, dashMat, t, 0.15, v);
    }
  }
  // Zebra crossings at the central intersections (one plane per crossing direction).
  for (const vx of [-240, -120, 0, 120, 240]) {
    for (const vz of [-240, -120, 0, 120, 240]) {
      for (const ry of [0, Math.PI / 2]) {
        const zebra = new THREE.Mesh(new THREE.PlaneGeometry(13, 5), new THREE.MeshBasicMaterial({ map: zebraTex }));
        zebra.rotation.x = -Math.PI / 2;
        zebra.rotation.z = ry;
        zebra.position.set(vx, 0.22, vz);
        zebra.receiveShadow = true;
        scene.add(zebra);
      }
    }
  }

  // --- building families ---

  function shopSign(x, z, name, colorHex) {
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(10, 2.5), new THREE.MeshBasicMaterial({ map: signTexture(name, '#ffffff', colorHex) }));
    sign.position.set(x, 3.4, z);
    scene.add(sign);
    return sign;
  }

  function awning(x, y, z, colorA) {
    const stripe = new THREE.Mesh(new THREE.PlaneGeometry(9, 3), new THREE.MeshBasicMaterial({ map: stripeTexture(colorA, '#f2f2f2'), side: THREE.DoubleSide }));
    stripe.position.set(x, y, z);
    stripe.rotation.x = -0.5;
    scene.add(stripe);
    return stripe;
  }

  function balcony(x, y, z, w) {
    box(w, 0.25, 1.4, sidewalkMat, x, y, z);
    box(w, 0.7, 0.12, steelMat, x, y + 0.5, z + 0.65);
    for (const s of [-1, 1]) box(0.12, 0.7, 0.12, steelMat, x + s * (w / 2 - 0.1), y + 0.5, z + 0.65);
  }

  function shophouse(x, z, w, d, floors, districtId) {
    const h = floors * 5 + 3;
    const faceMat = pick(rng, [concreteMat, warmMat]);
    facedBox(w, h, d, faceMat, pick(rng, plainMats), x, h / 2, z);
    // Parapet + roof dressing instead of a bare slab.
    box(w + 0.6, 0.8, d + 0.6, roofMat, x, h + 0.4, z);
    roofDressing(x, z, w, d, h);
    // Ground-floor shopfront: sign band + glass + striped awning, facing the street (+z).
    const names = SHOP_NAMES[districtId] || SHOP_NAMES.alun;
    const shopColor = pick(rng, SHOP_COLORS);
    shopSign(x, z + d / 2 + 0.3, pick(rng, names), shopColor);
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.7, 2.6), new THREE.MeshStandardMaterial({ color: 0x9fd2e8, roughness: 0.1, metalness: 0.4, transparent: true, opacity: 0.55 }));
    glass.position.set(x, 1.6, z + d / 2 + 0.1);
    scene.add(glass);
    awning(x, 3.2, z + d / 2 + 1.4, shopColor);
    // Balcony on the top floor, half the time.
    if (floors >= 2 && rng() < 0.6) balcony(x, h - 2.2, z + d / 2 + 0.7, w * 0.6);
    addCollider(x - w / 2, z - d / 2, x + w / 2, z + d / 2);
  }

  function tower(x, z, w, d, h) {
    const glass = rng() < 0.6;
    const faceMat = glass ? glassMat : concreteMat;
    facedBox(w, h, d, faceMat, glass ? glassMat : pick(rng, plainMats), x, h / 2, z);
    // Setback top floor + rooftop plant, so the tower has a crown.
    box(w * 0.65, 4, d * 0.65, roofDark, x, h + 2, z);
    roofDressing(x, z, w, d, h + 4);
    const signMat = new THREE.MeshStandardMaterial({ color: 0xffe98a, emissive: 0xffd34d, emissiveIntensity: 0.9 });
    box(w * 0.4, 2.5, 0.8, signMat, x, h - 3, z + d / 2 + 0.4);
    addCollider(x - w / 2, z - d / 2, x + w / 2, z + d / 2);
  }

  function kampungHouse(x, z, w, d) {
    const h = range(rng, 5, 7);
    const mat = pick(rng, [brickMat, brickRedMat, warmMat]);
    facedBox(w, h, d, mat, mat, x, h / 2, z);
    // Pitched tile roof: two sloped slabs meeting at a ridge + ridge beam.
    const slopeLen = d / 2 + 2;
    box(w + 1.5, 0.5, slopeLen, tileMat, x, h + 1.6, z + d / 4 + 0.4, 0, 0.55);
    box(w + 1.5, 0.5, slopeLen, tileMat, x, h + 1.6, z - d / 4 - 0.4, 0, -0.55);
    box(w + 1.6, 0.5, 0.8, tileMat, x, h + 3.1, z);
    // Small shuttered windows on the front.
    for (const s of [-w / 4, w / 4]) {
      box(2.2, 2.6, 0.15, new THREE.MeshStandardMaterial({ color: 0x2a4a6a, roughness: 0.6 }), x + s, h * 0.55, z + d / 2 + 0.1);
    }
    // Front porch + low fence.
    box(w * 0.5, 0.4, 3, sidewalkMat, x, 0.2, z + d / 2 + 2);
    addCollider(x - w / 2, z - d / 2, x + w / 2, z + d / 2);
  }

  function warehouse(x, z, w, d) {
    const h = 12;
    const mat = new THREE.MeshStandardMaterial({ color: pick(rng, [0x8a7a6a, 0x6a7a8a, 0x9a8a7a]), roughness: 1 });
    box(w, h, d, mat, x, h / 2, z);
    // Gable roof: two sloped slabs + skylight strip.
    box(w + 1, 0.6, d / 2 + 2, roofMat, x, h + 1.8, z + d / 4, 0, 0.4);
    box(w + 1, 0.6, d / 2 + 2, roofMat, x, h + 1.8, z - d / 4, 0, -0.4);
    box(w * 0.5, 0.4, 2, new THREE.MeshStandardMaterial({ color: 0x9fd2e8, roughness: 0.2, metalness: 0.4 }), x, h + 2.6, z);
    // Big sliding door + vents on the front.
    box(w * 0.4, 7, 0.8, new THREE.MeshStandardMaterial({ color: 0x3a3f4a, roughness: 0.8 }), x, 3.5, z + d / 2 + 0.2);
    for (const s of [-w / 3, w / 3]) box(2, 2, 0.4, steelMat, x + s, h - 2, z + d / 2 + 0.1);
    addCollider(x - w / 2, z - d / 2, x + w / 2, z + d / 2);
  }

  function containerYard(x, z) {
    const colors = [0xd21f2b, 0x3f7fbf, 0x3fd2c0, 0xffb400, 0x8a5a3a];
    for (let i = 0; i < 5; i += 1) {
      const cx = x + (i % 3) * 13 - 13;
      const cz = z + Math.floor(i / 3) * 7;
      const stacked = i < 2;
      box(12, 5, 5, new THREE.MeshStandardMaterial({ color: pick(rng, colors), roughness: 0.8 }), cx, 2.5, cz);
      if (stacked) box(12, 5, 5, new THREE.MeshStandardMaterial({ color: pick(rng, colors), roughness: 0.8 }), cx, 7.5, cz);
    }
    addCollider(x - 20, z - 8, x + 20, z + 10);
  }

  function marketStall(x, z, ry) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = ry;
    const colorA = pick(rng, SHOP_COLORS);
    const postMat = new THREE.MeshStandardMaterial({ color: 0x7a5230, roughness: 1 });
    for (const [px, pz] of [[-2.4, -2], [2.4, -2], [-2.4, 2], [2.4, 2]]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.25, 3.4, 0.25), postMat);
      post.position.set(px, 1.7, pz);
      post.castShadow = true;
      g.add(post);
    }
    const counter = new THREE.Mesh(new THREE.BoxGeometry(5.4, 1.1, 3.6), new THREE.MeshStandardMaterial({ color: 0x8a6a4a, roughness: 1 }));
    counter.position.set(0, 0.55, 0);
    counter.castShadow = true;
    g.add(counter);
    // Striped awning, sloped.
    const awn = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 4.6), new THREE.MeshBasicMaterial({ map: stripeTexture(colorA, '#f2f2f2'), side: THREE.DoubleSide }));
    awn.rotation.x = -Math.PI / 2 + 0.35;
    awn.position.set(0, 3.6, 0.4);
    g.add(awn);
    // Goods: bright fruit piles on the counter.
    const goods = [0xff2e63, 0xffb400, 0x3fd2c0, 0xff8a3d, 0xb06ae0];
    for (let i = 0; i < 6; i += 1) {
      const pile = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 6), new THREE.MeshStandardMaterial({ color: goods[i % goods.length], roughness: 0.7 }));
      pile.position.set(-2 + (i % 3) * 2, 1.35, (Math.floor(i / 3) - 0.5) * 1.6);
      g.add(pile);
    }
    scene.add(g);
    addCollider(x - 3, z - 3, x + 3, z + 3);
  }

  // Blocks: for each grid cell, build the family its district asks for.
  const LANDMARK_CELLS = [[0, -60], [60, 60], [300, 0], [180, 240], [300, 240], [300, 300], [-60, -60], [-300, -300]];
  for (let gx = -360; gx < 360; gx += 120) {
    for (let gz = -360; gz < 360; gz += 120) {
      const cx = gx + 60;
      const cz = gz + 60;
      if (cx < -340) continue; // the sea strip has no blocks
      // Keep the beach and the race start clear.
      if (cz > 240 && cx < -160) continue;
      if (LANDMARK_CELLS.some(([lx, lz]) => Math.abs(cx - lx) < 40 && Math.abs(cz - lz) < 40)) continue;
      const district = districtAt(cx, cz);
      const id = district ? district.id : 'alun';
      if (id === 'segara') {
        if (rng() < 0.55) warehouse(cx, cz, range(rng, 34, 44), range(rng, 26, 34));
        else containerYard(cx, cz);
      } else if (id === 'batik') {
        kampungHouse(cx - 16, cz - 8, 22, 18);
        kampungHouse(cx + 18, cz + 10, 20, 16);
        shophouse(cx, cz - 16, 24, 18, 2, 'batik');
      } else if (id === 'alun') {
        if (rng() < 0.6) tower(cx + range(rng, -14, 14), cz + range(rng, -14, 14), range(rng, 22, 30), range(rng, 22, 30), range(rng, 34, 72));
        else {
          shophouse(cx - 16, cz, 26, 22, rangeInt(rng, 2, 3), 'alun');
          shophouse(cx + 18, cz + 6, 24, 20, rangeInt(rng, 2, 3), 'alun');
        }
      } else if (id === 'emas') {
        if (rng() < 0.65) tower(cx + range(rng, -14, 14), cz + range(rng, -14, 14), range(rng, 22, 30), range(rng, 22, 30), range(rng, 30, 64));
        else shophouse(cx, cz, 26, 22, rangeInt(rng, 2, 3), 'emas');
      } else if (id === 'kidul') {
        shophouse(cx, cz, 24, 20, rangeInt(rng, 1, 2), 'kidul');
      } else if (id === 'senja') {
        shophouse(cx - 14, cz, 26, 22, rangeInt(rng, 2, 3), 'senja');
        if (rng() < 0.6) marketStall(cx + 20, cz + 14, rng() * Math.PI);
      } else {
        shophouse(cx - 16, cz, 26, 22, rangeInt(rng, 2, 3), 'alun');
        shophouse(cx + 18, cz + 6, 24, 20, rangeInt(rng, 2, 3), 'alun');
      }
    }
  }

  // --- palms along the beach road and the avenues ---
  function palm(x, z) {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.8, 9, 6), trunkMat);
    trunk.position.set(x, 4.5, z);
    trunk.castShadow = true;
    scene.add(trunk);
    for (let i = 0; i < 6; i += 1) {
      const frond = new THREE.Mesh(new THREE.ConeGeometry(1.1, 5.5, 4), leafMat);
      const a = (i / 6) * Math.PI * 2;
      frond.position.set(x + Math.cos(a) * 2.2, 9.6, z + Math.sin(a) * 2.2);
      frond.rotation.z = Math.cos(a) * 1.1;
      frond.rotation.x = -Math.sin(a) * 1.1;
      frond.castShadow = true;
      scene.add(frond);
    }
  }
  for (let z = -360; z <= 360; z += 60) {
    palm(-348, z + 12);
    if (rng() < 0.5) palm(348, z - 12);
  }
  for (let x = -300; x <= -120; x += 45) palm(x, 330);

  // --- leafy street trees along the sidewalks ---
  function streetTree(x, z) {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 4, 6), trunkMat);
    trunk.position.set(x, 2, z);
    trunk.castShadow = true;
    scene.add(trunk);
    for (const [ox, oy, oz, r] of [[0, 5.2, 0, 2.6], [-1.4, 4.2, 0.6, 1.8], [1.3, 4.4, -0.5, 1.7]]) {
      const crown = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), leafMat);
      crown.position.set(x + ox, oy, z + oz);
      crown.castShadow = true;
      scene.add(crown);
    }
  }
  for (const v of [-240, -120, 0, 120, 240]) {
    for (let t = -300; t <= 300; t += 120) {
      if (rng() < 0.6) streetTree(v + 10, t + 30);
      if (rng() < 0.4) streetTree(v - 10, t - 30);
    }
  }

  // --- landmarks ---
  // Hotel in Alun-Alun: glass tower, gold sign, rooftop crown.
  tower(0, -60, 34, 30, 80);
  const hotelSign = new THREE.Mesh(new THREE.PlaneGeometry(26, 6.5), new THREE.MeshBasicMaterial({ map: signTexture('HOTEL KENCANA', '#ffd34d', '#1a1a22') }));
  hotelSign.position.set(0, 82, -44);
  scene.add(hotelSign);
  // Mansion in Alun-Alun: white, columns, pitched roof, garden wall.
  box(40, 14, 30, whiteMat, 60, 7, 60);
  box(42, 1, 32, roofMat, 60, 14.5, 60);
  box(44, 0.6, 1.6, tileMat, 60, 15.8, 60 + 8, 0, 0.4);
  box(44, 0.6, 1.6, tileMat, 60, 15.8, 60 - 8, 0, -0.4);
  for (const s of [-14, -5, 5, 14]) {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(1, 1.1, 12, 8), whiteMat);
    col.position.set(60 + s, 6, 76);
    col.castShadow = true;
    scene.add(col);
  }
  box(46, 1.2, 1, whiteMat, 60, 0.6, 82);
  addCollider(40, 45, 80, 75);
  // Park in Alun-Alun, around the safehouse: lawn, trees, benches, fountain.
  const lawn = new THREE.Mesh(new THREE.PlaneGeometry(70, 70), new THREE.MeshStandardMaterial({ color: 0x4a8a4a, roughness: 1 }));
  lawn.rotation.x = -Math.PI / 2;
  lawn.position.set(-60, 0.35, -60);
  lawn.receiveShadow = true;
  scene.add(lawn);
  streetTree(-84, -84);
  streetTree(-36, -84);
  streetTree(-84, -36);
  for (const [bx, bz] of [[-40, -80], [-80, -40]]) {
    box(4, 0.4, 1.4, new THREE.MeshStandardMaterial({ color: 0x7a5230, roughness: 1 }), bx, 1, bz);
    box(4, 1, 0.4, new THREE.MeshStandardMaterial({ color: 0x7a5230, roughness: 1 }), bx, 0.5, bz + 0.8);
  }
  const basin = new THREE.Mesh(new THREE.CylinderGeometry(6, 6.5, 1.2, 14), new THREE.MeshStandardMaterial({ color: 0x9a9aa2, roughness: 0.8 }));
  basin.position.set(-40, 0.6, -40);
  scene.add(basin);
  const water = new THREE.Mesh(new THREE.CylinderGeometry(5.4, 5.4, 0.3, 14), new THREE.MeshStandardMaterial({ color: 0x3fa8d9, roughness: 0.2, metalness: 0.3 }));
  water.position.set(-40, 1.2, -40);
  scene.add(water);
  const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 2.4, 8), new THREE.MeshStandardMaterial({ color: 0x9a9aa2, roughness: 0.8 }));
  spout.position.set(-40, 2.2, -40);
  scene.add(spout);
  // Casino in Lorong Emas (purple, neon trim, entrance canopy).
  box(44, 22, 36, new THREE.MeshStandardMaterial({ color: 0x6a2a9a, roughness: 0.7, emissive: 0x3a1a5a, emissiveIntensity: 0.6 }), 300, 11, 0);
  const neonMat = new THREE.MeshBasicMaterial({ color: 0xff2e63 });
  box(44.5, 0.6, 0.6, neonMat, 300, 22.2, 18);
  box(44.5, 0.6, 0.6, neonMat, 300, 22.2, -18);
  box(0.6, 0.6, 36.5, new THREE.MeshBasicMaterial({ color: 0x3fd2c0 }), 322, 22.2, 0);
  box(20, 1, 8, roofDark, 300, 6, 22);
  for (const s of [-8, 8]) box(0.5, 6, 0.5, steelMat, 300 + s, 3, 24);
  const casinoSign = new THREE.Mesh(new THREE.PlaneGeometry(34, 8.5), new THREE.MeshBasicMaterial({ map: signTexture('CASINO EMAS', '#ff2e63', '#1a0a22') }));
  casinoSign.position.set(300, 24, 19);
  scene.add(casinoSign);
  addCollider(278, -18, 322, 18);
  // Market hall in Pasar Senja + stalls around it.
  box(48, 10, 30, new THREE.MeshStandardMaterial({ color: 0xd9a45f, roughness: 1 }), 180, 5, 240);
  box(50, 1.5, 32, new THREE.MeshStandardMaterial({ color: 0xff2e63, roughness: 0.8 }), 180, 11, 240);
  const marketSign = new THREE.Mesh(new THREE.PlaneGeometry(30, 7.5), new THREE.MeshBasicMaterial({ map: signTexture('PASAR SENJA', '#fff', '#8a2a1a') }));
  marketSign.position.set(180, 8, 256);
  scene.add(marketSign);
  addCollider(156, 225, 204, 255);
  marketStall(150, 268, 0.4);
  marketStall(210, 268, -0.3);
  marketStall(150, 216, 2.8);
  // Showroom in Pasar Senja (glass box, gold car inside is implied by the glow).
  box(30, 12, 22, new THREE.MeshStandardMaterial({ color: 0x9fd2e8, roughness: 0.1, metalness: 0.4, transparent: true, opacity: 0.55 }), 300, 6, 240);
  const showSign = new THREE.Mesh(new THREE.PlaneGeometry(24, 6), new THREE.MeshBasicMaterial({ map: signTexture('SHOWROOM', '#ffd34d', '#1a1a22') }));
  showSign.position.set(300, 13.5, 252);
  scene.add(showSign);
  addCollider(285, 229, 315, 251);
  // Docks: two cranes, container stacks, a wooden pier and a fishing boat.
  function crane(x, z) {
    const yellow = new THREE.MeshStandardMaterial({ color: 0xffb400, roughness: 0.7 });
    box(3, 40, 3, yellow, x, 20, z);
    box(26, 2, 2, yellow, x + 10, 40, z);
    box(8, 2.5, 2.5, yellow, x - 6, 40, z);
    box(4, 3, 4, steelMat, x, 41.5, z);
    const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 12, 6), new THREE.MeshStandardMaterial({ color: 0x1a1a1a }));
    cable.position.set(x + 20, 34, z);
    scene.add(cable);
    box(2, 2, 2, steelMat, x + 20, 27.5, z);
    addCollider(x - 2, z - 2, x + 2, z + 2);
  }
  crane(-300, -300);
  crane(-240, -330);
  for (let i = 0; i < 5; i += 1) {
    box(12, 5, 5, new THREE.MeshStandardMaterial({ color: pick(rng, [0xd21f2b, 0x3f7fbf, 0x3fd2c0, 0xffb400]), roughness: 0.8 }), -330 + i * 14, 2.5, -330);
  }
  addCollider(-340, -340, -280, -320);
  // Wooden pier into the sea + a fishing boat.
  box(34, 0.6, 8, new THREE.MeshStandardMaterial({ color: 0x8a6a4a, roughness: 1 }), -378, 0.5, -180);
  for (let i = 0; i < 4; i += 1) box(0.8, 3, 0.8, trunkMat, -392 + i * 9, 0.5, -183);
  const hull = box(9, 1.6, 3.2, new THREE.MeshStandardMaterial({ color: 0x3f7fbf, roughness: 0.8 }), -398, 0.8, -160);
  hull.rotation.y = 0.5;
  const bow = box(2.5, 1.4, 2.6, new THREE.MeshStandardMaterial({ color: 0x3f7fbf, roughness: 0.8 }), -394, 0.8, -157, 0, 0.9);
  bow.rotation.y = 0.5;
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 7, 6), trunkMat);
  mast.position.set(-398, 4.5, -160);
  scene.add(mast);
  const sail = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 4.6), new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.9, side: THREE.DoubleSide }));
  sail.position.set(-397, 4.2, -158);
  sail.rotation.y = 0.5;
  scene.add(sail);

  // Garage exterior in Pasar Senja: workshop with the neon sign and a glowing door.
  box(34, 12, 24, new THREE.MeshStandardMaterial({ color: 0x5a6a7a, roughness: 0.9 }), GARAGE.door.x, 6, GARAGE.door.z);
  const garageSign = new THREE.Mesh(new THREE.PlaneGeometry(28, 7), new THREE.MeshBasicMaterial({ map: signTexture('BENGKEL BAMBANG', '#3fd2c0', '#12201c') }));
  garageSign.position.set(GARAGE.door.x, 13.5, GARAGE.door.z + 12.5);
  scene.add(garageSign);
  const doorGlow = new THREE.Mesh(new THREE.PlaneGeometry(9, 8), new THREE.MeshBasicMaterial({ color: 0x3fd2c0 }));
  doorGlow.position.set(GARAGE.door.x, 4, GARAGE.door.z + 12.1);
  scene.add(doorGlow);
  // Tire stacks by the door.
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x14141a, roughness: 0.95 });
  for (const [tx, tz, n] of [[GARAGE.door.x - 20, GARAGE.door.z + 10, 3], [GARAGE.door.x + 20, GARAGE.door.z + 10, 2]]) {
    for (let i = 0; i < n; i += 1) {
      const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.5, 12), tireMat);
      tire.position.set(tx, 0.25 + i * 0.5, tz);
      tire.castShadow = true;
      scene.add(tire);
    }
  }
  addCollider(GARAGE.door.x - 17, GARAGE.door.z - 12, GARAGE.door.x + 17, GARAGE.door.z + 12);

  // KENCANA FM billboard on the beach road.
  const board = new THREE.Mesh(new THREE.PlaneGeometry(22, 11), new THREE.MeshBasicMaterial({ map: billboardTexture() }));
  board.position.set(-330, 14, 180);
  board.rotation.y = Math.PI / 2;
  scene.add(board);
  box(1.5, 14, 1.5, new THREE.MeshStandardMaterial({ color: 0x3a3f4a }), -331, 7, 180);

  // Beach umbrellas + towels — kept west of the beach road (x -307), so no umbrella
  // hangs over the road the car drives. Plus a lifeguard tower.
  const umbrellaColors = [0xff2e63, 0x3fd2c0, 0xffb400, 0xb06ae0, 0xff8a3d];
  for (let i = 0; i < 8; i += 1) {
    const ux = -348 + (i % 4) * 12;
    const uz = 250 + Math.floor(i / 4) * 30;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 4, 6), trunkMat);
    pole.position.set(ux, 2, uz);
    scene.add(pole);
    const top = new THREE.Mesh(new THREE.ConeGeometry(4.5, 2.2, 8), new THREE.MeshStandardMaterial({ color: umbrellaColors[i % umbrellaColors.length], roughness: 0.8 }));
    top.position.set(ux, 5, uz);
    top.castShadow = true;
    scene.add(top);
    const towel = new THREE.Mesh(new THREE.PlaneGeometry(3, 1.6), new THREE.MeshStandardMaterial({ color: umbrellaColors[(i + 2) % umbrellaColors.length], roughness: 1 }));
    towel.rotation.x = -Math.PI / 2;
    towel.position.set(ux + 5, 0.35, uz + 2);
    scene.add(towel);
  }
  // Lifeguard tower on the sand.
  for (const [sx, sz] of [[-14, -14], [14, -14], [-14, 14], [14, 14]]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 7, 6), trunkMat);
    leg.position.set(-330 + sx * 0.4, 3.5, 262 + sz * 0.4);
    scene.add(leg);
  }
  box(7, 0.5, 7, new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.9 }), -330, 7.2, 262);
  box(5, 3, 5, new THREE.MeshStandardMaterial({ color: 0xff2e63, roughness: 0.8 }), -330, 9, 262);
  box(7.5, 0.4, 7.5, new THREE.MeshStandardMaterial({ color: 0xffb400, roughness: 0.8 }), -330, 10.8, 262);

  // Ferris wheel at Pantai Kidul: rim, spokes, cabins, slow rotation.
  const wheelGroup = new THREE.Group();
  wheelGroup.position.set(-318, 42, 290);
  const rimMat = new THREE.MeshStandardMaterial({ color: 0xff2e63, roughness: 0.6, emissive: 0x881133, emissiveIntensity: 0.4 });
  const rim = new THREE.Mesh(new THREE.TorusGeometry(26, 1.1, 8, 40), rimMat);
  wheelGroup.add(rim);
  const rim2 = new THREE.Mesh(new THREE.TorusGeometry(18, 0.8, 8, 32), rimMat);
  wheelGroup.add(rim2);
  const cabinColors = [0xffb400, 0x3fd2c0, 0xff2e63, 0xb06ae0, 0xff8a3d, 0x3f7fbf, 0xffd34d, 0x2f9e5f];
  const cabins = [];
  for (let i = 0; i < 8; i += 1) {
    const a = (i / 8) * Math.PI * 2;
    const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 26, 6), rimMat);
    spoke.position.set(Math.cos(a) * 13, Math.sin(a) * 13, 0);
    spoke.rotation.z = a + Math.PI / 2;
    wheelGroup.add(spoke);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(4.5, 4, 4.5), new THREE.MeshStandardMaterial({ color: cabinColors[i], roughness: 0.6 }));
    cabin.position.set(Math.cos(a) * 26, Math.sin(a) * 26, 0);
    wheelGroup.add(cabin);
    cabins.push(cabin);
  }
  scene.add(wheelGroup);
  // Legs (static, not rotating with the wheel) — slim and light so they read as a
  // structure, not a dark beam across the sky in the title and foot shots.
  for (const s of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 1.0, 44, 6), new THREE.MeshStandardMaterial({ color: 0x6a6f7a, roughness: 0.8 }));
    leg.position.set(-318 + s * 12, 21, 290);
    leg.rotation.z = s * 0.28;
    leg.castShadow = true;
    scene.add(leg);
  }
  animated.push((dt) => {
    wheelGroup.rotation.z += dt * 0.12;
    for (const cabin of cabins) cabin.rotation.z = -wheelGroup.rotation.z;
  });

  // Streetlights along the main avenues: pole, curved arm, glowing head.
  const lampMat = new THREE.MeshStandardMaterial({ color: 0x2a2e36, roughness: 0.8 });
  const lampGlowMat = new THREE.MeshBasicMaterial({ color: 0xffe9a8 });
  for (let v = -360; v <= 360; v += 120) {
    for (let t = -300; t <= 300; t += 240) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 9, 6), lampMat);
      pole.position.set(v + 9, 4.5, t);
      scene.add(pole);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 2.4), lampMat);
      arm.position.set(v + 9, 8.8, t - 1);
      arm.rotation.x = 0.25;
      scene.add(arm);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.7, 8, 6), lampGlowMat);
      lamp.position.set(v + 9, 8.6, t - 2.1);
      scene.add(lamp);
      const glow = new THREE.Mesh(new THREE.ConeGeometry(2.6, 6, 10, 1, true), new THREE.MeshBasicMaterial({ color: 0xffe9a8, transparent: true, opacity: 0.1, side: THREE.DoubleSide, depthWrite: false }));
      glow.position.set(v + 9, 5.6, t - 2.1);
      scene.add(glow);
    }
  }

  // Race start flag at Pantai Kidul: checkered banner on two poles.
  const flagCanvas = document.createElement('canvas');
  flagCanvas.width = 64;
  flagCanvas.height = 64;
  const fctx = flagCanvas.getContext('2d');
  for (let r = 0; r < 8; r += 1) {
    for (let c = 0; c < 8; c += 1) {
      fctx.fillStyle = (r + c) % 2 === 0 ? '#111' : '#fff';
      fctx.fillRect(c * 8, r * 8, 8, 8);
    }
  }
  const flagTex = new THREE.CanvasTexture(flagCanvas);
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), new THREE.MeshBasicMaterial({ map: flagTex, side: THREE.DoubleSide }));
  flag.position.set(RACE.start.x, 9, RACE.start.z);
  scene.add(flag);
  for (const s of [-1, 1]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 12, 6), lampMat);
    pole.position.set(RACE.start.x + s * 5, 6, RACE.start.z);
    scene.add(pole);
  }
  const raceSign = new THREE.Mesh(new THREE.PlaneGeometry(16, 4), new THREE.MeshBasicMaterial({ map: signTexture('BALAPAN', '#111', '#fff') }));
  raceSign.position.set(RACE.start.x, 14, RACE.start.z);
  scene.add(raceSign);

  // Race gates, one per checkpoint: a checkered banner on poles plus a light beam the
  // driver can spot from across the city. The active gate's beam burns bright; the rest
  // stay faint so the course reads without cluttering the skyline.
  const gateBeams = [];
  for (const gate of RACE.gates) {
    const banner = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), new THREE.MeshBasicMaterial({ map: flagTex, side: THREE.DoubleSide }));
    banner.position.set(gate.x, 7, gate.z);
    scene.add(banner);
    for (const s of [-1, 1]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 10, 6), lampMat);
      pole.position.set(gate.x + s * 4, 5, gate.z);
      scene.add(pole);
    }
    const beamMat = new THREE.MeshBasicMaterial({ color: 0xffc93c, transparent: true, opacity: 0.08, side: THREE.DoubleSide, depthWrite: false });
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 30, 10, 1, true), beamMat);
    beam.position.set(gate.x, 15, gate.z);
    scene.add(beam);
    gateBeams.push(beamMat);
  }
  function setActiveGate(i) {
    gateBeams.forEach((m, j) => { m.opacity = i === j ? 0.45 : 0.08; });
  }

  // Safehouse marker in Alun-Alun (green beacon column).
  const safehouse = new THREE.Mesh(
    new THREE.CylinderGeometry(2.5, 2.5, 30, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0x3fd2c0, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false }),
  );
  safehouse.position.set(-60, 15, -60);
  scene.add(safehouse);

  function update(dt) {
    for (const fn of animated) fn(dt);
  }

  return {
    colliders, update, setActiveGate,
    spawn: { x: -300, z: 280, heading: Math.PI / 2 },
    garageDoor: { ...GARAGE.door },
    raceStart: { ...RACE.start },
    ferrisWheel: wheelGroup.position,
  };
}
