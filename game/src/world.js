// The city itself: sunset sky, sea + beach, road grid, varied low-poly
// buildings with glowing windows, roof props and shop fronts, palm trees,
// lamps and props. One job: build the static Kencana Bay and answer
// "which district is this point in?".
import { THREE } from './three-shim.js';
import { CITY, DISTRICTS, PALETTE } from './config.js';

function box(w, h, d, color, x, y, z, parent, mat = null) {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    mat || new THREE.MeshLambertMaterial({ color }),
  );
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

export function districtAt(x, z) {
  if (x < -CITY.size / 2 + 40) return DISTRICTS[6];
  const col = Math.floor((x + CITY.size / 2) / CITY.roadEvery);
  const row = Math.floor((z + CITY.size / 2) / CITY.roadEvery);
  for (const d of DISTRICTS) if (d.col === col && d.row === row) return d;
  // Nearest named district by grid distance.
  let best = DISTRICTS[1], bd = 1e9;
  for (const d of DISTRICTS.slice(0, 6)) {
    const dd = Math.abs(d.col - col) + Math.abs(d.row - row);
    if (dd < bd) { bd = dd; best = d; }
  }
  return best;
}

export function createCity(scene, random) {
  const group = new THREE.Group();
  scene.add(group);
  const S = CITY.size;

  // Sunset sky: richer gradient dome — deep violet top, magenta band,
  // orange horizon glow — plus a big low sun with a halo over the sea.
  const skyGeo = new THREE.SphereGeometry(900, 16, 12);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: {
      top: { value: new THREE.Color('#5a2a8e') },
      mid: { value: new THREE.Color('#d1409a') },
      low: { value: new THREE.Color('#ff6a2a') },
      glow: { value: new THREE.Color('#ffd24d') },
    },
    vertexShader: 'varying vec3 vP; void main(){ vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: `varying vec3 vP; uniform vec3 top; uniform vec3 mid; uniform vec3 low; uniform vec3 glow;
      void main(){ float h=normalize(vP).y;
        vec3 c = h>0.35 ? mix(mid,top,smoothstep(0.35,0.85,h))
          : h>0.08 ? mix(low,mid,smoothstep(0.08,0.35,h))
          : mix(glow,low,smoothstep(-0.06,0.08,h));
        gl_FragColor=vec4(c,1.0); }`,
  });
  group.add(new THREE.Mesh(skyGeo, skyMat));
  const sunGlow = new THREE.Mesh(new THREE.CircleGeometry(110, 24), new THREE.MeshBasicMaterial({ color: 0xffb36a, transparent: true, opacity: 0.35, fog: false }));
  sunGlow.position.set(-320, 95, -700); sunGlow.lookAt(0, 60, 0); group.add(sunGlow);
  const sun = new THREE.Mesh(new THREE.CircleGeometry(48, 24), new THREE.MeshBasicMaterial({ color: PALETTE.sun, fog: false }));
  sun.position.set(-320, 100, -700); sun.lookAt(0, 60, 0); group.add(sun);

  // Ground: warm urban base, block sidewalks, sand beach, sea.
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(S + 400, S + 400), new THREE.MeshLambertMaterial({ color: '#3f8a55' }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.1; ground.receiveShadow = true; group.add(ground);
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(70, S + 400), new THREE.MeshLambertMaterial({ color: PALETTE.sand }));
  sand.rotation.x = -Math.PI / 2; sand.position.set(-S / 2 - 20, 0, 0); sand.receiveShadow = true; group.add(sand);
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(400, S + 400), new THREE.MeshLambertMaterial({ color: PALETTE.sea }));
  sea.rotation.x = -Math.PI / 2; sea.position.set(-S / 2 - 240, -0.4, 0); group.add(sea);

  // Roads: dark asphalt strips on the grid, with yellow centre dashes.
  const roadMat = new THREE.MeshLambertMaterial({ color: PALETTE.road });
  const dashMat = new THREE.MeshBasicMaterial({ color: PALETTE.roadLine });
  const dashGeo = new THREE.BoxGeometry(6, 0.1, 2);
  for (let i = 0; i <= 10; i += 1) {
    const p = -S / 2 + i * CITY.roadEvery;
    const r1 = new THREE.Mesh(new THREE.PlaneGeometry(14, S), roadMat);
    r1.rotation.x = -Math.PI / 2; r1.position.set(p, 0.05, 0); r1.receiveShadow = true; group.add(r1);
    const r2 = new THREE.Mesh(new THREE.PlaneGeometry(S, 14), roadMat);
    r2.rotation.x = -Math.PI / 2; r2.position.set(0, 0.05, p); r2.receiveShadow = true; group.add(r2);
    for (let d = -S / 2 + 20; d < S / 2; d += 40) {
      const dash = new THREE.Mesh(dashGeo, dashMat);
      dash.position.set(p, 0.1, d); group.add(dash);
      const dash2 = new THREE.Mesh(dashGeo, dashMat);
      dash2.rotation.y = Math.PI / 2; dash2.position.set(d, 0.1, p); group.add(dash2);
    }
  }
  // Sidewalk blocks: light slabs between the roads so the city reads
  // as streets + blocks, not a flat green field.
  const walkMat = new THREE.MeshLambertMaterial({ color: PALETTE.sidewalk });
  for (let cx = 0; cx < 10; cx += 1) for (let cz = 0; cz < 10; cz += 1) {
    const bx = -S / 2 + cx * CITY.roadEvery + CITY.roadEvery / 2;
    const bz = -S / 2 + cz * CITY.roadEvery + CITY.roadEvery / 2;
    if (bx < -S / 2 + 30) continue;
    const slab = new THREE.Mesh(new THREE.PlaneGeometry(44, 44), walkMat);
    slab.rotation.x = -Math.PI / 2; slab.position.set(bx, 0.08, bz); slab.receiveShadow = true; group.add(slab);
  }

  // Buildings: three archetypes, lit windows on every face, roof props,
  // shop awnings at street level. Taller near Alun-Alun.
  const buildings = [];
  const winLit = new THREE.MeshBasicMaterial({ color: PALETTE.windowLit });
  const winDark = new THREE.MeshBasicMaterial({ color: PALETTE.windowDark });
  const winGeo = new THREE.PlaneGeometry(3.2, 4.4);
  const awningColors = ['#d14d4d', '#2a6fd1', '#e8a13d', '#2a9e5a', '#8a4fd1'];

  function windows(x, z, w, d, h) {
    // Tall slabs with dense regular grids of lit yellow windows, so
    // facades read as buildings at a glance.
    const rows = Math.floor(h / 7.5), colsW = Math.max(1, Math.floor(w / 6)), colsD = Math.max(1, Math.floor(d / 6));
    for (let r = 0; r < rows; r += 1) {
      const y = 5 + r * 7.5;
      for (let c = 0; c < colsW; c += 1) {
        if (random() < 0.22) continue; // ~78% of windows lit at sunset
        const mat = random() < 0.82 ? winLit : winDark;
        const w1 = new THREE.Mesh(winGeo, mat);
        w1.position.set(x - w / 2 + 3.5 + c * 6, y, z + d / 2 + 0.12); group.add(w1);
        const w2 = new THREE.Mesh(winGeo, mat);
        w2.position.set(x - w / 2 + 3.5 + c * 6, y, z - d / 2 - 0.12); w2.rotation.y = Math.PI; group.add(w2);
      }
      for (let c = 0; c < colsD; c += 1) {
        if (random() < 0.28) continue;
        const mat = random() < 0.82 ? winLit : winDark;
        const w1 = new THREE.Mesh(winGeo, mat);
        w1.position.set(x + w / 2 + 0.12, y, z - d / 2 + 3.5 + c * 6); w1.rotation.y = Math.PI / 2; group.add(w1);
        const w2 = new THREE.Mesh(winGeo, mat);
        w2.position.set(x - w / 2 - 0.12, y, z - d / 2 + 3.5 + c * 6); w2.rotation.y = -Math.PI / 2; group.add(w2);
      }
    }
  }

  function roofProps(x, z, w, d, h) {
    // AC unit + water tank + antenna, so rooftops are not flat slabs.
    const ac = box(3, 1.6, 3, '#8a8f96', x + w / 4, h + 0.8, z, group);
    ac.castShadow = true;
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.8, 3, 8), new THREE.MeshLambertMaterial({ color: '#5a6a7a' }));
    tank.position.set(x - w / 4, h + 1.5, z - d / 5); tank.castShadow = true; group.add(tank);
    const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 9, 4), new THREE.MeshLambertMaterial({ color: '#333' }));
    ant.position.set(x + w / 3, h + 4.5, z + d / 4); group.add(ant);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.5, 6, 5), new THREE.MeshBasicMaterial({ color: '#ff5a4d' }));
    tip.position.set(x + w / 3, h + 9.2, z + d / 4); group.add(tip);
  }

  function shopFront(x, z, w, d) {
    // Striped awning + bright sign band at street level.
    const awn = new THREE.Mesh(
      new THREE.BoxGeometry(w * 0.8, 0.4, 5),
      new THREE.MeshLambertMaterial({ color: awningColors[Math.floor(random() * awningColors.length)] }),
    );
    awn.position.set(x, 5.5, z + d / 2 + 2.2);
    awn.rotation.x = 0.35;
    awn.castShadow = true;
    group.add(awn);
    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(w * 0.7, 1.8, 0.4),
      new THREE.MeshBasicMaterial({ color: ['#ff5a4d', '#ffd24d', '#3bd1ff', '#7dff9a'][Math.floor(random() * 4)] }),
    );
    sign.position.set(x, 8.5, z + d / 2 + 0.25);
    group.add(sign);
  }

  // Landmark buildings, one per district — placed first, generic
  // buildings keep clear of them.
  const landmarks = [];
  function landmark(x, z, w, h, d, color, top) {
    const b = box(w, h, d, color, x, h / 2, z, group);
    buildings.push(b);
    windows(x, z, w, d, h);
    if (top) roofProps(x, z, w, d, h);
    landmarks.push([x, z]);
    return b;
  }
  // Pelabuhan Segara — long warehouse + dock crane + container stacks.
  landmark(-270, -270, 34, 14, 20, '#7a5a3a', false);
  box(4, 26, 4, '#c23b3b', -246, 13, -270, group);
  box(26, 2, 2, '#c23b3b', -234, 25, -270, group);
  box(1, 6, 1, '#333', -224, 22, -270, group);
  const containerColors = ['#c23b3b', '#2a6fd1', '#e8a13d', '#2a9e5a'];
  for (let i = 0; i < 6; i += 1) {
    const cx = -282 + (i % 3) * 9, cz = -238, lvl = Math.floor(i / 3);
    box(8, 3.5, 4, containerColors[i % 4], cx, 1.75 + lvl * 3.5, cz, group);
  }
  // Kampung Batik — hotel tower with a lit crown sign.
  landmark(-150, -210, 22, 52, 20, '#8a5fb8', true);
  const crown = new THREE.Mesh(new THREE.BoxGeometry(14, 3, 1), new THREE.MeshBasicMaterial({ color: '#ffd24d' }));
  crown.position.set(-150, 54, -199); group.add(crown);
  // Alun-Alun — city hall: wide, columns, dome.
  landmark(-150, -150, 36, 22, 24, '#e0c8a0', false);
  for (let i = 0; i < 5; i += 1) box(2, 16, 2, '#f5eeda', -165 + i * 7.5, 8, -137, group);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(8, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshLambertMaterial({ color: '#2a9e5a' }));
  dome.position.set(-150, 22, -150); dome.castShadow = true; group.add(dome);
  // Lorong Emas — gold casino with a neon band.
  landmark(-30, -150, 26, 30, 22, '#d1a93d', true);
  const neon = new THREE.Mesh(new THREE.BoxGeometry(26.5, 2, 0.5), new THREE.MeshBasicMaterial({ color: '#ff3d8a' }));
  neon.position.set(-30, 20, -138); group.add(neon);
  // Pantai Kidul — beach hotel, white with teal trim.
  landmark(-210, 30, 24, 26, 20, '#f0e8d8', true);
  // Pasar Senja — market hall with stalls.
  landmark(-90, -30, 30, 12, 22, '#c96a3d', false);
  shopFront(-90, -30, 30, 22);

  for (let cx = 0; cx < 10; cx += 1) {
    for (let cz = 0; cz < 10; cz += 1) {
      const bx = -S / 2 + cx * CITY.roadEvery + CITY.roadEvery / 2;
      const bz = -S / 2 + cz * CITY.roadEvery + CITY.roadEvery / 2;
      if (bx < -S / 2 + 30) continue; // beach
      if (landmarks.some(([lx, lz]) => Math.hypot(bx - lx, bz - lz) < 34)) continue;
      const n = 1 + Math.floor(random() * 3);
      for (let k = 0; k < n; k += 1) {
        const w = 14 + random() * 16, d = 14 + random() * 16;
        const centre = Math.hypot(bx, bz);
        const roll = random();
        const x = bx + (random() - 0.5) * 18, z = bz + (random() - 0.5) * 18;
        const color = PALETTE.building[Math.floor(random() * PALETTE.building.length)];
        if (roll < 0.30) {
          // Tower: tall + stepped top + rooftop billboard.
          const h = 46 + random() * 34;
          box(w, h, d, color, x, h / 2, z, group);
          box(w * 0.6, 5, d * 0.6, color, x, h + 2.5, z, group);
          const bill = new THREE.Mesh(
            new THREE.BoxGeometry(w * 0.55, 4, 0.5),
            new THREE.MeshBasicMaterial({ color: ['#ff5a4d', '#ffd24d', '#3bd1ff', '#ff3d8a'][Math.floor(random() * 4)] }),
          );
          bill.position.set(x, h + 7, z + d * 0.3 + 0.3);
          group.add(bill);
          windows(x, z, w, d, h);
          roofProps(x, z, w, d, h);
        } else if (roll < 0.6) {
          // Shophouse: low, with awning + sign.
          const h = 9 + random() * 6;
          box(w, h, d, color, x, h / 2, z, group);
          windows(x, z, w, d, h);
          shopFront(x, z, w, d);
        } else {
          // Mid block: balconies on the street face.
          const h = 20 + random() * (centre < 120 ? 40 : 20);
          box(w, h, d, color, x, h / 2, z, group);
          windows(x, z, w, d, h);
          for (let b = 0; b < 2; b += 1) {
            const by = 9 + b * 10 + random() * 3;
            if (by > h - 4) break;
            box(w * 0.5, 0.5, 2.5, '#e8e2d5', x, by, z + d / 2 + 1, group);
          }
          if (random() < 0.6) roofProps(x, z, w, d, h);
        }
      }
    }
  }

  // Palm trees along the beach and avenues.
  const palms = [];
  function palm(x, z) {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.8, 20, 6), new THREE.MeshLambertMaterial({ color: PALETTE.palmTrunk }));
    trunk.position.y = 10; trunk.castShadow = true; g.add(trunk);
    for (let i = 0; i < 8; i += 1) {
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(2.4, 15, 4), new THREE.MeshLambertMaterial({ color: PALETTE.palmLeaf }));
      const a = (i / 8) * Math.PI * 2;
      leaf.position.set(Math.cos(a) * 5, 21, Math.sin(a) * 5);
      leaf.rotation.z = Math.cos(a) * 1.1; leaf.rotation.x = -Math.sin(a) * 1.1;
      leaf.castShadow = true;
      g.add(leaf);
    }
    g.position.set(x, 0, z); group.add(g); palms.push(g);
  }
  for (let z = -280; z <= 280; z += 46) { palm(-S / 2 + 8, z + random() * 10); if (random() < 0.5) palm(-S / 2 + 44, z); }
  for (let x = -240; x <= 240; x += 70) { if (random() < 0.6) palm(x, -120 + random() * 20); if (random() < 0.5) palm(x, 180 + random() * 20); }

  // Props: beach umbrellas, street lamps (lit globes + glow), market stalls.
  const umbrellaColors = ['#ff5a8a', '#ffd24d', '#2ab8c9', '#ff7a2a', '#7dff9a'];
  for (let i = 0; i < 10; i += 1) {
    const ux = -S / 2 + 18 + random() * 20, uz = -260 + random() * 520;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 5, 5), new THREE.MeshLambertMaterial({ color: '#888' }));
    pole.position.set(ux, 2.5, uz); group.add(pole);
    const top = new THREE.Mesh(new THREE.ConeGeometry(5, 2.5, 8), new THREE.MeshLambertMaterial({ color: umbrellaColors[i % umbrellaColors.length] }));
    top.position.set(ux, 6, uz); top.castShadow = true; group.add(top);
    // Bright beach towel beside every other umbrella.
    if (i % 2 === 0) {
      const towel = new THREE.Mesh(new THREE.BoxGeometry(4, 0.2, 2), new THREE.MeshBasicMaterial({ color: umbrellaColors[(i + 2) % umbrellaColors.length] }));
      towel.position.set(ux + 6, 0.15, uz + 3); group.add(towel);
    }
  }
  // Ferris wheel on the beach: pink rim, spokes, colourful cabins,
  // A-frame legs — faces the city across the sand.
  const fw = new THREE.Group();
  const fwRim = new THREE.Mesh(new THREE.TorusGeometry(22, 1.1, 8, 28), new THREE.MeshLambertMaterial({ color: '#ff5a8a' }));
  fw.add(fwRim);
  for (let i = 0; i < 4; i += 1) {
    const sp = new THREE.Mesh(new THREE.BoxGeometry(1.2, 44, 1.2), new THREE.MeshLambertMaterial({ color: '#e8e2d5' }));
    sp.rotation.z = (i * Math.PI) / 4; fw.add(sp);
  }
  for (let i = 0; i < 8; i += 1) {
    const a = (i / 8) * Math.PI * 2;
    const cab = new THREE.Mesh(new THREE.BoxGeometry(4, 4, 4), new THREE.MeshLambertMaterial({ color: umbrellaColors[i % umbrellaColors.length] }));
    cab.position.set(Math.cos(a) * 22, Math.sin(a) * 22, 0); cab.castShadow = true; fw.add(cab);
  }
  for (const sx of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(2, 27, 2), new THREE.MeshLambertMaterial({ color: '#e8e2d5' }));
    leg.position.set(sx * 4.5, 11, 0); leg.rotation.z = -sx * 0.33; fw.add(leg);
  }
  fw.rotation.y = Math.PI / 2;
  fw.position.set(-318, 24, 60);
  group.add(fw);
  // Big KENCANA FM billboard on the beach road: pink panel with canvas
  // text, two poles. Our own station name, not anyone else's.
  const bc = document.createElement('canvas'); bc.width = 512; bc.height = 256;
  const bg2 = bc.getContext('2d');
  bg2.fillStyle = '#ff2e7e'; bg2.fillRect(0, 0, 512, 256);
  bg2.fillStyle = '#ffd24d'; bg2.fillRect(0, 196, 512, 60);
  bg2.fillStyle = '#ffffff'; bg2.font = 'bold 88px system-ui'; bg2.textAlign = 'center';
  bg2.fillText('KENCANA', 256, 108);
  bg2.font = 'bold 62px system-ui'; bg2.fillText('FM 101.1', 256, 180);
  bg2.fillStyle = '#ff2e7e'; bg2.font = 'bold 38px system-ui'; bg2.fillText('GAMELAN HITS', 256, 240);
  const btex = new THREE.CanvasTexture(bc);
  for (const pz of [-70, -50]) {
    const pole = new THREE.Mesh(new THREE.BoxGeometry(1.5, 16, 1.5), new THREE.MeshLambertMaterial({ color: '#333' }));
    pole.position.set(-320, 8, pz); pole.castShadow = true; group.add(pole);
  }
  const bill = new THREE.Mesh(new THREE.BoxGeometry(1, 12, 26), new THREE.MeshBasicMaterial({ map: btex }));
  bill.position.set(-320, 20, -60); group.add(bill);
  for (let x = -270; x <= 270; x += 60) for (let z = -270; z <= 270; z += 60) {
    if (random() < 0.4) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 9, 5), new THREE.MeshLambertMaterial({ color: '#333' }));
      pole.position.set(x + 8, 4.5, z + 8); group.add(pole);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(1.1, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffe9a0' }));
      lamp.position.set(x + 8, 9.4, z + 8); group.add(lamp);
      const glow = new THREE.Mesh(new THREE.SphereGeometry(3.2, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffe9a0, transparent: true, opacity: 0.22, depthWrite: false }));
      glow.position.set(x + 8, 9.4, z + 8); group.add(glow);
    }
  }
  return { group, buildings, palms };
}
