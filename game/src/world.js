// The city of Teluk Kencana: six districts on a road grid, a sea to the west,
// a beach to the south, and landmarks in every district. Buildings are real
// facades — canvas textures with window grids, frames, lit glass, AC units,
// ground-floor entrances and shopfronts, plus 3D cornices, canopies,
// balconies with railings, rooftop tanks and antennas. Every building
// registers an AABB collider.
import { THREE, box, cylinder, canvasTexture } from './three-shim.js';
import { WORLD, DISTRICTS, PALETTE } from './config.js';
import { createRandom } from './random.js';

/** Lighten (+) or darken (-) a #rrggbb colour by an amount 0..255. */
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, (n >> 16) + amt));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 0xff) + amt));
  const b = Math.max(0, Math.min(255, (n & 0xff) + amt));
  return `rgb(${r},${g},${b})`;
}

/**
 * A real facade: a wall with a vertical gradient, floor bands, big windows
 * with frames, glass gradients and mullions (some lit warm, some with
 * curtains), AC units drawn under some windows, and a ground floor with an
 * entrance door, a shopfront and an awning band.
 */
function facadeTexture(base, litColor, floors) {
  return canvasTexture(512, 512, (x, w, h) => {
    const grad = x.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, shade(base, 18));
    grad.addColorStop(1, shade(base, -14));
    x.fillStyle = grad;
    x.fillRect(0, 0, w, h);
    // Pilasters at the edges.
    x.fillStyle = 'rgba(0,0,0,0.18)';
    x.fillRect(0, 0, 14, h);
    x.fillRect(w - 14, 0, 14, h);
    const floorH = h / floors;
    const cols = 4;
    const winW = 76;
    const winH = Math.min(floorH * 0.52, 110);
    for (let f = 0; f < floors - 1; f += 1) {
      const y0 = f * floorH;
      x.fillStyle = 'rgba(0,0,0,0.28)';
      x.fillRect(0, y0 + floorH - 6, w, 6);
      x.fillStyle = 'rgba(255,255,255,0.07)';
      x.fillRect(0, y0, w, 3);
      for (let c = 0; c < cols; c += 1) {
        const wx = 36 + c * ((w - 72) / cols);
        const wy = y0 + (floorH - winH) / 2;
        x.fillStyle = '#232830';
        x.fillRect(wx - 5, wy - 5, winW + 10, winH + 10);
        const lit = ((f * 7 + c * 3 + 1) % 10) < 3;
        if (lit) {
          x.fillStyle = litColor;
        } else {
          const gg = x.createLinearGradient(wx, wy, wx, wy + winH);
          gg.addColorStop(0, '#9db8cc');
          gg.addColorStop(0.55, '#5a7a96');
          gg.addColorStop(1, '#2c3e55');
          x.fillStyle = gg;
        }
        x.fillRect(wx, wy, winW, winH);
        x.fillStyle = 'rgba(20,26,34,0.85)';
        x.fillRect(wx + winW / 2 - 2, wy, 4, winH);
        x.fillRect(wx, wy + winH / 2 - 2, winW, 4);
        if (!lit && ((f * 5 + c * 7) % 9) < 2) {
          x.fillStyle = 'rgba(240,230,210,0.55)';
          x.fillRect(wx + 4, wy + 4, winW / 2 - 6, winH - 8);
        }
        if ((f * 3 + c * 5) % 8 < 2) {
          x.fillStyle = '#8a8f96';
          x.fillRect(wx + 10, wy + winH + 6, 42, 20);
          x.fillStyle = '#3a3f46';
          x.beginPath(); x.arc(wx + 31, wy + winH + 16, 7, 0, Math.PI * 2); x.fill();
        }
      }
    }
    // Ground floor: entrance door, shopfront glass, awning band.
    const gy = (floors - 1) * floorH;
    x.fillStyle = 'rgba(0,0,0,0.3)';
    x.fillRect(0, gy, w, 8);
    x.fillStyle = '#2b2f38';
    x.fillRect(40, gy + 26, 74, floorH - 40);
    x.fillStyle = '#5a7a96';
    x.fillRect(48, gy + 34, 58, floorH - 56);
    x.fillStyle = '#232830';
    x.fillRect(48, gy + 34, 58, 6);
    x.fillStyle = 'rgba(210,230,245,0.9)';
    x.fillRect(150, gy + 22, w - 190, floorH - 44);
    x.fillStyle = '#232830';
    for (let i = 0; i < 4; i += 1) x.fillRect(150 + i * ((w - 190) / 4), gy + 22, 5, floorH - 44);
    x.fillRect(150, gy + 22, w - 190, 6);
    x.fillStyle = shade(base, 34);
    x.fillRect(0, gy + 8, w, 12);
    // Parapet band at the top.
    x.fillStyle = 'rgba(0,0,0,0.35)';
    x.fillRect(0, 0, w, 10);
  });
}

function tileTexture(base) {
  return canvasTexture(128, 128, (x, w, h) => {
    x.fillStyle = base;
    x.fillRect(0, 0, w, h);
    x.strokeStyle = 'rgba(0,0,0,0.35)';
    x.lineWidth = 3;
    for (let r = 0; r < 8; r += 1) {
      x.beginPath(); x.moveTo(0, r * 16); x.lineTo(w, r * 16); x.stroke();
    }
    for (let c = 0; c < 8; c += 1) {
      x.beginPath(); x.moveTo(c * 16, 0); x.lineTo(c * 16, h); x.stroke();
    }
  });
}

function shopTexture(name, bg, fg) {
  return canvasTexture(256, 128, (x, w, h) => {
    x.fillStyle = bg;
    x.fillRect(0, 0, w, h);
    x.fillStyle = '#f2ead8';
    x.fillRect(0, 0, w, 34);
    x.fillStyle = '#1c1c1c';
    x.font = 'bold 24px system-ui, sans-serif';
    x.textAlign = 'center';
    x.fillText(name, w / 2, 26);
    for (let i = 0; i < 8; i += 1) {
      x.fillStyle = i % 2 ? '#ff2e63' : '#ffd94d';
      x.fillRect(i * 32, 34, 32, 14);
    }
    x.fillStyle = 'rgba(255,240,180,0.9)';
    x.fillRect(16, 64, 96, 48);
    x.fillRect(144, 64, 96, 48);
    x.fillStyle = '#222831';
    x.fillRect(16, 64, 96, 6);
    x.fillRect(144, 64, 96, 6);
  });
}

function roadTexture() {
  return canvasTexture(256, 256, (x, w, h) => {
    x.fillStyle = PALETTE.road;
    x.fillRect(0, 0, w, h);
    x.fillStyle = PALETTE.roadLine;
    x.fillRect(w / 2 - 3, 0, 6, 40);
    x.fillRect(w / 2 - 3, 80, 6, 40);
    x.fillRect(w / 2 - 3, 160, 6, 40);
    x.fillStyle = 'rgba(255,255,255,0.25)';
    x.fillRect(0, 0, 8, h);
    x.fillRect(w - 8, 0, 8, h);
  });
}

function palm(rand) {
  const g = new THREE.Group();
  const h = rand.range(7, 11);
  const trunk = cylinder(0.22, 0.34, h, '#8a6a4b');
  trunk.position.y = h / 2;
  trunk.rotation.z = rand.range(-0.08, 0.08);
  g.add(trunk);
  for (let i = 0; i < 7; i += 1) {
    const frond = new THREE.Mesh(
      new THREE.ConeGeometry(0.5, 3.4, 4),
      new THREE.MeshStandardMaterial({ color: '#3d8a4b', roughness: 0.9, flatShading: true }),
    );
    frond.scale.set(1, 1, 0.18);
    frond.position.y = h + 0.4;
    frond.rotation.set(Math.PI / 2 + rand.range(0.5, 0.9), (i / 7) * Math.PI * 2, 0);
    frond.castShadow = true;
    g.add(frond);
  }
  const nuts = new THREE.Mesh(
    new THREE.SphereGeometry(0.3, 8, 6),
    new THREE.MeshStandardMaterial({ color: '#6b4a2b', roughness: 0.9 }),
  );
  nuts.position.y = h - 0.2;
  g.add(nuts);
  return g;
}

function streetLamp() {
  const g = new THREE.Group();
  const pole = cylinder(0.09, 0.12, 6, '#2a2a33');
  pole.position.y = 3;
  g.add(pole);
  const head = box(0.5, 0.22, 0.9, '#ffd94d', { glow: 0xffd94d });
  head.position.set(0.3, 6.1, 0);
  g.add(head);
  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(0.55, 10, 8),
    new THREE.MeshBasicMaterial({ color: '#ffe9a0', transparent: true, opacity: 0.35 }),
  );
  glow.position.set(0.3, 6.1, 0);
  g.add(glow);
  g.userData.glow = glow;
  return g;
}

function ferrisWheel() {
  const g = new THREE.Group();
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(9, 0.5, 10, 28),
    new THREE.MeshStandardMaterial({ color: '#ff5e8a', roughness: 0.5, metalness: 0.3, emissive: 0x881133, emissiveIntensity: 0.6 }),
  );
  rim.castShadow = true;
  g.add(rim);
  const wheel = new THREE.Group();
  for (let i = 0; i < 8; i += 1) {
    const spoke = box(0.3, 17.6, 0.3, '#ffd94d');
    spoke.rotation.z = (i / 8) * Math.PI;
    wheel.add(spoke);
    const cabin = box(1.8, 1.6, 1.6, ['#ff2e63', '#2b6fd0', '#ffd94d', '#3d8a4b'][i % 4]);
    const a = (i / 8) * Math.PI * 2;
    cabin.position.set(Math.cos(a) * 8.2, Math.sin(a) * 8.2, 0);
    wheel.add(cabin);
  }
  const hub = cylinder(0.7, 0.7, 1.2, '#f2f2f2');
  hub.rotation.x = Math.PI / 2;
  wheel.add(hub);
  g.add(wheel);
  g.userData.wheel = wheel;
  for (const sx of [-1.6, 1.6]) {
    const leg = box(0.8, 10, 0.8, '#e8e8e8');
    leg.position.set(sx * 3, -5, 0);
    leg.rotation.z = -sx * 0.28;
    g.add(leg);
  }
  g.position.y = 10.5;
  return g;
}

export function createWorld(seed = 1) {
  const rand = createRandom(seed);
  const group = new THREE.Group();
  const colliders = [];
  const lamps = [];
  const wheels = [];
  const neonSigns = [];
  const buildings = [];

  function addCollider(x, z, hw, hd) {
    colliders.push({ x0: x - hw, x1: x + hw, z0: z - hd, z1: z + hd });
  }
  function inCollider(x, z, r = 0) {
    for (const c of colliders) {
      if (x > c.x0 - r && x < c.x1 + r && z > c.z0 - r && z < c.z1 + r) return true;
    }
    return false;
  }

  // Ground, sea, beach.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD.half * 2 + 260, WORLD.half * 2 + 40),
    new THREE.MeshStandardMaterial({ color: '#6a6a72', roughness: 1 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, -0.05, 0);
  ground.receiveShadow = true;
  group.add(ground);
  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(300, WORLD.half * 2 + 400),
    new THREE.MeshStandardMaterial({ color: PALETTE.sea, roughness: 0.25, metalness: 0.35 }),
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(-WORLD.half - 150, 0.02, 0);
  sea.receiveShadow = true;
  group.add(sea);
  const sand = new THREE.Mesh(
    new THREE.PlaneGeometry(36, 260),
    new THREE.MeshStandardMaterial({ color: PALETTE.sand, roughness: 1 }),
  );
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(-WORLD.half - 18, 0.03, 200);
  sand.receiveShadow = true;
  group.add(sand);
  // Park grass in Alun-Alun.
  const park = new THREE.Mesh(
    new THREE.PlaneGeometry(70, 50),
    new THREE.MeshStandardMaterial({ color: PALETTE.grass, roughness: 1 }),
  );
  park.rotation.x = -Math.PI / 2;
  park.position.set(-30, 0.04, 30);
  park.receiveShadow = true;
  group.add(park);

  // Roads: dark strips with dashed centre lines, plus sidewalks.
  const roadTex = roadTexture();
  for (const r of WORLD.roads) {
    for (const [w, h, x, z] of [
      [WORLD.half * 2, WORLD.roadWidth, 0, r],
      [WORLD.roadWidth, WORLD.half * 2, r, 0],
    ]) {
      const tex = roadTex.clone();
      tex.needsUpdate = true;
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(w / 40, 1);
      const road = new THREE.Mesh(
        new THREE.PlaneGeometry(w, h),
        new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }),
      );
      road.rotation.x = -Math.PI / 2;
      road.position.set(x, 0.06, z);
      road.receiveShadow = true;
      group.add(road);
    }
  }

  // Sidewalks: light strips with a curb step along every road, so the
  // buildings stand on pavement instead of flat grey ground.
  const walkMat = new THREE.MeshStandardMaterial({ color: PALETTE.sidewalk, roughness: 1 });
  for (const r of WORLD.roads) {
    for (const s of [-1, 1]) {
      const off = r + s * (WORLD.roadWidth / 2 + 3);
      const swH = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.half * 2, 6), walkMat);
      swH.rotation.x = -Math.PI / 2;
      swH.position.set(0, 0.05, off);
      swH.receiveShadow = true;
      group.add(swH);
      const swV = new THREE.Mesh(new THREE.PlaneGeometry(6, WORLD.half * 2), walkMat);
      swV.rotation.x = -Math.PI / 2;
      swV.position.set(off, 0.055, 0);
      swV.receiveShadow = true;
      group.add(swV);
    }
  }

  // Zebra crossings at the central junction.
  for (let i = 0; i < 6; i += 1) {
    const stripe = box(1.6, 0.04, 12, '#f2f2f2', { shadow: false });
    stripe.position.set(-60 + i * 3.4 - 8.5, 0.08, 14);
    group.add(stripe);
  }

  // Buildings, one per block, district-flavoured.
  const blockMin = -300 + 10;
  const blockMax = 300 - 10;
  function onRoad(v) { return WORLD.roads.some((r) => Math.abs(v - r) < 12); }
  const districtOf = (x, z) => DISTRICTS.find((d) => x >= d.x0 && x < d.x1 && z >= d.z0 && z < d.z1) || DISTRICTS[2];

  const shopNames = ['TOKO BATIK', 'WARUNG SENJA', 'KEDAI KOPI', 'BENGKEL', 'TOKO EMAS', 'PASAR IKAN', 'FARO BOOKS', 'MANGO GYM', 'CAFE B', 'TIDELINE'];
  let shopIdx = 0;
  for (let bx = blockMin; bx <= blockMax; bx += 120) {
    for (let bz = blockMin; bz <= blockMax; bz += 120) {
      const cx = bx + 60;
      const cz = bz + 60;
      if (cx > -80 && cx < 40 && cz > 0 && cz < 80) continue; // keep the park clear
      if (cx > -320 && cx < -240 && cz > 180 && cz < 300) continue; // ferris wheel + beach
      const d = districtOf(cx, cz);
      const count = d.kind === 'downtown' || d.kind === 'casino' ? 2 : 3;
      for (let i = 0; i < count; i += 1) {
        const w = rand.range(16, 26);
        const dep = rand.range(14, 22);
        const x = cx + rand.range(-28, 28);
        const z = cz + rand.range(-28, 28);
        if (onRoad(x) || onRoad(z)) continue;
        let h;
        let wallTex;
        let roofColor = '#3a3a44';
        if (d.kind === 'downtown') {
          h = rand.range(38, 72);
          wallTex = facadeTexture(rand.pick(['#5a6a8a', '#7a5a8a', '#4a7a8a']), '#ffe98a', Math.max(4, Math.floor(h / 9)));
        } else if (d.kind === 'casino') {
          h = rand.range(26, 52);
          wallTex = facadeTexture('#8a6a2a', '#ffd94d', Math.max(4, Math.floor(h / 9)));
        } else if (d.kind === 'kampung') {
          h = rand.range(7, 13);
          wallTex = facadeTexture(rand.pick(['#c98a5b', '#b57a4b', '#d0a06a']), '#ffe98a', 2);
          roofColor = '#a34a2b';
        } else if (d.kind === 'port') {
          h = rand.range(10, 18);
          wallTex = facadeTexture('#7d8a94', '#c8d8e8', 2);
          roofColor = '#4a5560';
        } else if (d.kind === 'market') {
          h = rand.range(8, 14);
          wallTex = facadeTexture('#b56a4b', '#ffe98a', 2);
        } else {
          h = rand.range(12, 26);
          wallTex = facadeTexture('#e88ca0', '#ffe98a', 3);
        }
        const roofMat = new THREE.MeshStandardMaterial({ color: roofColor, roughness: 0.9 });
        const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.85 });
        const b = new THREE.Mesh(
          new THREE.BoxGeometry(w, h, dep),
          [wallMat, wallMat, roofMat, roofMat, wallMat, wallMat],
        );
        b.position.set(x, h / 2, z);
        b.castShadow = true;
        b.receiveShadow = true;
        group.add(b);
        buildings.push({ x, z, w, h, d: dep, district: d.id });
        addCollider(x, z, w / 2 + 0.5, dep / 2 + 0.5);
        // AC outdoor units mounted on the facade, a cornice on top and an
        // entrance canopy over the ground-floor door.
        const acCount = h > 30 ? 3 : 2;
        for (let a = 0; a < acCount; a += 1) {
          const ac = box(1.1, 0.7, 0.5, '#9aa0a8');
          ac.position.set(x + rand.range(-w / 2 + 2, w / 2 - 2), rand.range(6, Math.max(7, h - 4)), z + dep / 2 + 0.3);
          group.add(ac);
        }
        const cornice = box(w + 0.8, 0.6, dep + 0.8, '#2a2a33');
        cornice.position.set(x, h + 0.3, z);
        group.add(cornice);
        const canopy = box(5, 0.18, 1.8, '#2a2a33');
        canopy.position.set(x, 3.4, z + dep / 2 + 0.9);
        group.add(canopy);
        // Setback top floor + antenna on the tallest towers.
        if (h > 40) {
          const setback = new THREE.Mesh(
            new THREE.BoxGeometry(w * 0.55, 5, dep * 0.55),
            wallMat,
          );
          setback.position.set(x, h + 3.1, z);
          setback.castShadow = true;
          group.add(setback);
          const ant = cylinder(0.08, 0.12, 8, '#888888');
          ant.position.set(x + w * 0.2, h + 9.5, z);
          group.add(ant);
          const cross = box(2.2, 0.08, 0.08, '#888888');
          cross.position.set(x + w * 0.2, h + 11.5, z);
          group.add(cross);
        }
        // Sloped tile roof for kampung houses.
        if (d.kind === 'kampung') {
          const roof = new THREE.Mesh(
            new THREE.ConeGeometry(Math.max(w, dep) * 0.72, 4, 4),
            new THREE.MeshStandardMaterial({ map: tileTexture('#a34a2b'), roughness: 0.9, flatShading: true }),
          );
          roof.position.set(x, h + 2, z);
          roof.rotation.y = Math.PI / 4;
          roof.castShadow = true;
          group.add(roof);
        }
        // Rooftop clutter on tall buildings.
        if (h > 30 && rand.chance(0.6)) {
          const ac = box(2.4, 1.2, 2.0, '#9aa0a8');
          ac.position.set(x + rand.range(-6, 6), h + 0.6, z + rand.range(-5, 5));
          group.add(ac);
          const tank = cylinder(1.1, 1.1, 2.2, '#c9c9c9');
          tank.position.set(x + rand.range(-6, 6), h + 1.1, z + rand.range(-5, 5));
          group.add(tank);
        }
        // Shopfront on the ground floor of some buildings.
        if (rand.chance(0.35) && h < 30) {
          const name = shopNames[shopIdx++ % shopNames.length];
          const shop = new THREE.Mesh(
            new THREE.PlaneGeometry(w * 0.9, 4.4),
            new THREE.MeshStandardMaterial({ map: shopTexture(name, d.accent, '#1c1c1c'), roughness: 0.8 }),
          );
          shop.position.set(x, 2.2, z + dep / 2 + 0.06);
          group.add(shop);
        }
        // Balconies with railings on downtown towers.
        if (h > 30) {
          for (let f = 1; f < 4; f += 1) {
            const by = f * (h / 4);
            const balc = box(w * 0.7, 0.25, 1.6, '#d8d8d8');
            balc.position.set(x, by, z + dep / 2 + 0.8);
            group.add(balc);
            const rail = box(w * 0.7, 0.9, 0.08, '#3a3f46');
            rail.position.set(x, by + 0.55, z + dep / 2 + 1.55);
            group.add(rail);
            for (const sx of [-1, 1]) {
              const side = box(0.08, 0.9, 1.6, '#3a3f46');
              side.position.set(x + sx * w * 0.35, by + 0.55, z + dep / 2 + 0.8);
              group.add(side);
            }
          }
        }
      }
    }
  }

  // Landmarks.
  // Hotel Kencana (Alun-Alun, tallest tower).
  const hotelMat = new THREE.MeshStandardMaterial({ map: facadeTexture('#7a8ab0', '#ffe98a', 9), roughness: 0.7 });
  const hotelRoof = new THREE.MeshStandardMaterial({ color: '#2a2a33', roughness: 0.9 });
  const hotel = new THREE.Mesh(
    new THREE.BoxGeometry(30, 80, 24),
    [hotelMat, hotelMat, hotelRoof, hotelRoof, hotelMat, hotelMat],
  );
  hotel.position.set(40, 40, -40);
  hotel.castShadow = true;
  group.add(hotel);
  addCollider(40, -40, 16, 13);
  const hotelSign = new THREE.Mesh(
    new THREE.PlaneGeometry(26, 4),
    new THREE.MeshStandardMaterial({ map: shopTexture('HOTEL KENCANA', '#ffd94d', '#1c1c1c'), roughness: 0.7, emissive: 0x554411, emissiveIntensity: 0.5 }),
  );
  hotelSign.position.set(40, 76, -27.5);
  group.add(hotelSign);
  neonSigns.push(hotelSign);

  // Casino Emas (Lorong Emas) with neon.
  const casino = new THREE.Mesh(
    new THREE.BoxGeometry(34, 30, 26),
    new THREE.MeshStandardMaterial({ map: facadeTexture('#8a6a2a', '#ffd94d', 4), roughness: 0.7 }),
  );
  casino.position.set(240, 15, -40);
  casino.castShadow = true;
  group.add(casino);
  addCollider(240, -40, 18, 14);
  const casinoSign = new THREE.Mesh(
    new THREE.PlaneGeometry(30, 5),
    new THREE.MeshStandardMaterial({ map: shopTexture('CASINO EMAS', '#ff2e63', '#ffffff'), roughness: 0.6, emissive: 0x881133, emissiveIntensity: 0.9 }),
  );
  casinoSign.position.set(240, 32, -26.5);
  group.add(casinoSign);
  neonSigns.push(casinoSign);

  // Mansion (Alun-Alun).
  const mansion = new THREE.Mesh(
    new THREE.BoxGeometry(26, 12, 20),
    new THREE.MeshStandardMaterial({ map: facadeTexture('#e8dcc0', '#ffe98a', 2), roughness: 0.85 }),
  );
  mansion.position.set(-40, 6, -80);
  mansion.castShadow = true;
  group.add(mansion);
  addCollider(-40, -80, 14, 11);
  const mRoof = new THREE.Mesh(
    new THREE.ConeGeometry(20, 5, 4),
    new THREE.MeshStandardMaterial({ map: tileTexture('#7a2b1b'), roughness: 0.9, flatShading: true }),
  );
  mRoof.position.set(-40, 14.5, -80);
  mRoof.rotation.y = Math.PI / 4;
  group.add(mRoof);

  // Port: warehouses, containers, cranes, docks, sailboat.
  for (let i = 0; i < 3; i += 1) {
    const wh = box(30, 10, 16, '#7d8a94');
    wh.position.set(-260, 5, -260 + i * 60);
    group.add(wh);
    addCollider(-260, -260 + i * 60, 16, 9);
  }
  const contColors = ['#c94b4b', '#2b6fd0', '#e8a33d', '#3d8a4b'];
  for (let i = 0; i < 10; i += 1) {
    const c = box(6, 2.6, 2.6, contColors[i % 4]);
    c.position.set(-300 + (i % 5) * 9, 1.3 + Math.floor(i / 5) * 2.7, -120 + (i % 3) * 8);
    group.add(c);
  }
  for (const cz of [-280, -180]) {
    const crane = new THREE.Group();
    const leg1 = box(1.2, 26, 1.2, '#e8a33d');
    leg1.position.set(-2, 13, 0);
    const leg2 = box(1.2, 26, 1.2, '#e8a33d');
    leg2.position.set(2, 13, 0);
    const arm = box(30, 1.4, 1.4, '#e8a33d');
    arm.position.set(10, 26, 0);
    const hook = box(1.6, 1.6, 1.6, '#333333');
    hook.position.set(20, 18, 0);
    const cable = box(0.12, 8, 0.12, '#333333');
    cable.position.set(20, 22, 0);
    crane.add(leg1, leg2, arm, hook, cable);
    crane.position.set(-310, 0, cz);
    group.add(crane);
  }
  const boat = new THREE.Group();
  const hull = new THREE.Mesh(
    new THREE.ConeGeometry(2.2, 7, 4),
    new THREE.MeshStandardMaterial({ color: '#f2f2f2', roughness: 0.6 }),
  );
  hull.rotation.z = Math.PI / 2;
  hull.rotation.y = Math.PI / 4;
  hull.scale.set(1, 1, 0.5);
  boat.add(hull);
  const mast = cylinder(0.08, 0.08, 7, '#8a6a4b');
  mast.position.y = 3.5;
  boat.add(mast);
  boat.position.set(-380, 0.5, -100);
  group.add(boat);

  // Ferris wheel + beach umbrellas at Pantai Kidul.
  const wheel = ferrisWheel();
  wheel.position.set(-280, 10.5, 240);
  group.add(wheel);
  wheels.push(wheel);
  addCollider(-280, 240, 10, 4);
  for (let i = 0; i < 6; i += 1) {
    const ux = -310 + i * 14;
    const pole = cylinder(0.08, 0.08, 2.6, '#f2f2f2');
    pole.position.set(ux, 1.3, 300);
    group.add(pole);
    const shade = new THREE.Mesh(
      new THREE.ConeGeometry(2.6, 1.0, 8),
      new THREE.MeshStandardMaterial({ color: ['#ff2e63', '#2b6fd0', '#ffd94d', '#3d8a4b', '#ff8a3d', '#8a4bd0'][i], roughness: 0.8, flatShading: true }),
    );
    shade.position.set(ux, 3.0, 300);
    group.add(shade);
    const towel = box(2.2, 0.08, 1.1, ['#ff2e63', '#2b6fd0'][i % 2]);
    towel.position.set(ux + 1.5, 0.1, 302);
    group.add(towel);
  }

  // Market stalls at Pasar Senja.
  for (let i = 0; i < 6; i += 1) {
    const sx = 150 + (i % 3) * 40;
    const sz = 180 + Math.floor(i / 3) * 40;
    const stall = box(6, 2.6, 5, '#8a6a4b');
    stall.position.set(sx, 1.3, sz);
    group.add(stall);
    const awning = new THREE.Mesh(
      new THREE.ConeGeometry(4.6, 1.4, 4),
      new THREE.MeshStandardMaterial({ color: i % 2 ? '#ff2e63' : '#ffd94d', roughness: 0.8, flatShading: true }),
    );
    awning.position.set(sx, 3.4, sz);
    awning.rotation.y = Math.PI / 4;
    group.add(awning);
    addCollider(sx, sz, 3.4, 2.9);
  }

  // Garage building exterior (Bengkel Bambang) at Pasar Senja.
  const garageExt = box(26, 9, 18, '#4b7d4b');
  garageExt.position.set(240, 4.5, 240);
  group.add(garageExt);
  addCollider(240, 240, 14, 10);
  for (const dx of [-7, 7]) {
    const roller = box(7, 5.5, 0.25, '#8a8f96', { metal: 0.5, rough: 0.5 });
    roller.position.set(240 + dx, 2.75, 249.1);
    group.add(roller);
    for (let l = 1; l < 5; l += 1) {
      const slat = box(7, 0.12, 0.05, '#6a6f76');
      slat.position.set(240 + dx, l * 1.1, 249.25);
      group.add(slat);
    }
  }
  const garageSign = new THREE.Mesh(
    new THREE.PlaneGeometry(22, 3.6),
    new THREE.MeshStandardMaterial({ map: shopTexture('BENGKEL BAMBANG', '#4b7d4b', '#ffffff'), roughness: 0.7, emissive: 0x113311, emissiveIntensity: 0.6 }),
  );
  garageSign.position.set(240, 7, 249.2);
  group.add(garageSign);
  neonSigns.push(garageSign);

  // Billboards.
  const billboards = [
    { x: 60, z: -180, text: 'KENCANA FM 101.1', bg: '#ff2e63' },
    { x: -60, z: 180, text: 'GARUDA GT', bg: '#ffd94d' },
    { x: 180, z: 60, text: 'TELUK KENCANA', bg: '#2b6fd0' },
  ];
  for (const b of billboards) {
    const pole1 = box(0.5, 12, 0.5, '#333333');
    pole1.position.set(b.x - 6, 6, b.z);
    const pole2 = box(0.5, 12, 0.5, '#333333');
    pole2.position.set(b.x + 6, 6, b.z);
    const board = new THREE.Mesh(
      new THREE.PlaneGeometry(16, 6),
      new THREE.MeshStandardMaterial({ map: shopTexture(b.text, b.bg, '#ffffff'), roughness: 0.7 }),
    );
    board.position.set(b.x, 14, b.z);
    group.add(pole1, pole2, board);
    addCollider(b.x, b.z, 8, 1);
  }

  // Palms along the roads and the beach.
  for (let i = 0; i < 46; i += 1) {
    const road = rand.pick(WORLD.roads);
    const along = rand.range(-300, 300);
    const side = rand.pick([-1, 1]);
    const px = rand.chance(0.5) ? road + side * 10 : along;
    const pz = rand.chance(0.5) ? along : road + side * 10;
    if (Math.abs(px) > 320 || Math.abs(pz) > 320) continue;
    if (inCollider(px, pz, 2)) continue;
    const p = palm(rand);
    p.position.set(px, 0, pz);
    group.add(p);
  }
  // Street lamps along the main roads.
  for (const r of [-180, -60, 60, 180]) {
    for (let v = -280; v <= 280; v += 70) {
      const lamp = streetLamp();
      lamp.position.set(r + 9, 0, v);
      group.add(lamp);
      lamps.push(lamp);
      const lamp2 = streetLamp();
      lamp2.position.set(v, 0, r + 9);
      group.add(lamp2);
      lamps.push(lamp2);
    }
  }
  // Fountain in the park.
  const fountain = cylinder(4, 4.6, 1.0, '#9aa8b8');
  fountain.position.set(-30, 0.5, 30);
  group.add(fountain);
  const water = new THREE.Mesh(
    new THREE.CircleGeometry(3.6, 20),
    new THREE.MeshStandardMaterial({ color: '#5ab0d0', roughness: 0.15, metalness: 0.4 }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(-30, 1.05, 30);
  group.add(water);

  // Rain streaks (hidden by default, shown in the night shot).
  const rainGeo = new THREE.BufferGeometry();
  const rainPos = [];
  for (let i = 0; i < 600; i += 1) {
    const x = rand.range(-330, 330);
    const y = rand.range(0, 40);
    const z = rand.range(-330, 330);
    rainPos.push(x, y, z, x + 0.3, y - 1.6, z + 0.2);
  }
  rainGeo.setAttribute('position', new THREE.Float32BufferAttribute(rainPos, 3));
  const rain = new THREE.LineSegments(
    rainGeo,
    new THREE.LineBasicMaterial({ color: '#aaccff', transparent: true, opacity: 0.35 }),
  );
  rain.visible = false;
  group.add(rain);

  return {
    group, colliders, buildings, lamps, wheels, neonSigns, rain,
    inCollider,
    districtAt(x, z) { return districtOf(x, z); },
    nearestRoadPoint(x, z) {
      const rx = WORLD.roads.reduce((a, b) => (Math.abs(b - x) < Math.abs(a - x) ? b : a));
      const rz = WORLD.roads.reduce((a, b) => (Math.abs(b - z) < Math.abs(a - z) ? b : a));
      return Math.abs(rx - x) < Math.abs(rz - z) ? { x: rx, z } : { x, z: rz };
    },
    randomRoadPoint() {
      const horizontal = rand.chance(0.5);
      const road = rand.pick(WORLD.roads);
      const along = rand.range(-300, 300);
      return horizontal ? { x: along, z: road } : { x: road, z: along };
    },
    setNight(on) {
      rain.visible = on;
      for (const l of lamps) l.userData.glow.visible = on;
    },
    step(dt) {
      for (const w of wheels) w.userData.wheel.rotation.z += dt * 0.25;
    },
  };
}
