// Round 21 reseal — intake repair: 5 KPD units, setWanted roadblocks untouched, no logic change; this line is written in the round 21 reseal recorded session (01a206af-459d-70b9-900e-33e388ceab71).
// Round 20: no logic change — 5 KPD units, setWanted roadblocks untouched; this line is written in the round 20 recorded session.
// Round 17: no logic change — 5 KPD units, setWanted roadblocks untouched (the chase now stages all 4 cars in shots.js); this line is written in the round 17 recorded session.
// The KPD response: five named units with live distances and statuses, a
// helicopter with a searchlight, roadblocks at wanted 4+, and a search zone
// on the minimap when the player breaks line of sight. Wanted 0–5 stars:
// heli joins at 3, roadblocks at 4.
// Round 16: the heli's spotlight cone (built in vehicles.js) is brighter —
// opacity 0.55, warm-white, radius 4.5 — the five KPD units themselves are unchanged.
import { THREE } from './three-shim.js';
import { KPD_UNITS } from './config.js';
import { buildPoliceCar, buildHelicopter } from './vehicles.js';
import { createRandom } from './random.js';

const STATUSES = ['MENGEJAR', 'MENGEJAR', 'BLOKADE', 'SPOTLIGHT', 'MENCARI', 'MENGEJAR'];

export function createPolice(world, scene, rand) {
  const units = [];
  const heliGroup = buildHelicopter();
  heliGroup.scale.setScalar(1.6);
  heliGroup.visible = false;
  scene.add(heliGroup);

  for (let i = 0; i < KPD_UNITS.length; i += 1) {
    const def = KPD_UNITS[i];
    if (def.kind === 'heli') {
      units.push({ name: def.name, kind: 'heli', mesh: heliGroup, status: 'SPOTLIGHT', dist: 0 });
      continue;
    }
    const car = buildPoliceCar();
    car.visible = false;
    scene.add(car);
    units.push({
      name: def.name, kind: 'car', mesh: car,
      status: 'MENGEJAR', dist: 0,
      heading: 0, speed: 0, target: { x: 0, z: 0 },
      stuck: 0,
    });
  }

  let wanted = 0;
  let heat = 0; // 0..1, decays when hidden
  let inSight = true;
  let searchZone = null;
  let roadblocks = [];

  function spawnRoadblock(x, z) {
    const g = new THREE.Group();
    for (let i = -1; i <= 1; i += 1) {
      const car = buildPoliceCar();
      car.position.set(i * 5, 0, (i % 2) * 1.5);
      car.rotation.y = (i % 2) * 0.3;
      g.add(car);
    }
    const barrier = new THREE.Mesh(
      new THREE.BoxGeometry(14, 1.1, 0.6),
      new THREE.MeshStandardMaterial({ color: '#ff8a3d', roughness: 0.7, emissive: 0x662200, emissiveIntensity: 0.5 }),
    );
    barrier.position.y = 0.8;
    g.add(barrier);
    g.position.set(x, 0, z);
    scene.add(g);
    roadblocks.push(g);
    return g;
  }

  function clearRoadblocks() {
    for (const r of roadblocks) scene.remove(r);
    roadblocks = [];
  }

  function setWanted(n, playerPos) {
    wanted = Math.max(0, Math.min(5, n));
    const active = wanted === 0 ? 0 : wanted >= 4 ? 5 : wanted >= 3 ? 4 : wanted >= 2 ? 3 : 2;
    let idx = 0;
    for (const u of units) {
      const show = idx < active && (u.kind !== 'heli' || wanted >= 3);
      u.mesh.visible = show;
      if (show && u.kind === 'car' && u.dist === 0) {
        const p = world.randomRoadPoint();
        u.mesh.position.set(p.x, 0, p.z);
        u.heading = Math.atan2(playerPos.x - p.x, playerPos.z - p.z);
        u.dist = Math.hypot(playerPos.x - p.x, playerPos.z - p.z);
      }
      idx += 1;
    }
    heliGroup.visible = wanted >= 3;
    if (wanted >= 4 && roadblocks.length === 0 && playerPos) {
      const ahead = { x: playerPos.x + Math.sin(playerPos.heading || 0) * 60, z: playerPos.z + Math.cos(playerPos.heading || 0) * 60 };
      const rp = world.nearestRoadPoint(ahead.x, ahead.z);
      spawnRoadblock(rp.x, rp.z);
    }
    if (wanted < 4) clearRoadblocks();
  }

  function step(dt, player) {
    // Heat decays when the player is slow and out of sight; wanted follows.
    const speed = Math.abs(player.speed || 0);
    if (wanted > 0 && speed < 4) heat = Math.max(0, heat - dt * 0.02);
    else if (wanted > 0) heat = Math.min(1, heat + dt * 0.05);
    if (heat <= 0 && wanted > 0) setWanted(wanted - 1, player);
    inSight = speed > 2 || wanted >= 4;

    const px = player.x;
    const pz = player.z;
    for (const u of units) {
      if (!u.mesh.visible) continue;
      if (u.kind === 'heli') {
        // Hover above and slightly behind the player, spotlight on the road.
        const tx = px - Math.sin(player.heading || 0) * 18;
        const tz = pz - Math.cos(player.heading || 0) * 18;
        u.mesh.position.x += (tx - u.mesh.position.x) * dt * 1.2;
        u.mesh.position.z += (tz - u.mesh.position.z) * dt * 1.2;
        u.mesh.position.y += (13 - u.mesh.position.y) * dt;
        u.mesh.rotation.y = Math.atan2(px - u.mesh.position.x, pz - u.mesh.position.z);
        u.mesh.userData.rotor.rotation.y += dt * 18;
        u.mesh.userData.tailRotor.rotation.x += dt * 24;
        u.dist = Math.hypot(px - u.mesh.position.x, pz - u.mesh.position.z);
        u.status = inSight ? 'SPOTLIGHT' : 'MENCARI';
        continue;
      }
      // Pursuit steering: aim at the player, ease the speed, avoid buildings.
      const dx = px - u.mesh.position.x;
      const dz = pz - u.mesh.position.z;
      const dist = Math.hypot(dx, dz);
      u.dist = dist;
      const wantHeading = Math.atan2(dx, dz);
      let dh = wantHeading - u.heading;
      while (dh > Math.PI) dh -= Math.PI * 2;
      while (dh < -Math.PI) dh += Math.PI * 2;
      u.heading += Math.max(-2.4 * dt, Math.min(2.4 * dt, dh));
      const targetSpeed = Math.min(34, 18 + wanted * 3 + Math.min(10, dist * 0.1));
      u.speed += (targetSpeed - u.speed) * dt * 0.8;
      const nx = u.mesh.position.x + Math.sin(u.heading) * u.speed * dt;
      const nz = u.mesh.position.z + Math.cos(u.heading) * u.speed * dt;
      if (!world.inCollider(nx, nz, 2.5)) {
        u.mesh.position.x = nx;
        u.mesh.position.z = nz;
        u.stuck = 0;
      } else {
        u.stuck += dt;
        u.heading += dt * 3;
        if (u.stuck > 2) {
          const p = world.randomRoadPoint();
          u.mesh.position.set(p.x, 0, p.z);
          u.stuck = 0;
        }
      }
      u.mesh.rotation.y = u.heading;
      u.status = dist < 8 ? 'MENGEJAR' : dist < 40 ? 'MENGEJAR' : wanted >= 4 && u.name === 'MERAK-5' ? 'BLOKADE' : 'MENCARI';
      // Light bar flash (round 15): red and blue alternate every ~180 ms
      // — the lamps + their glow sprites swap bright/dim in turn. The
      // old code had a no-op forEach here; the bar never actually flashed.
      const phase = Math.floor(performance.now() / 180) % 2 === 0;
      const d = u.mesh.userData;
      if (d.lightRed && d.lightBlue) {
        d.lightRed.material.color.set(phase ? d.lightRedBright : '#400808');
        d.lightBlue.material.color.set(phase ? '#15307a' : d.lightBlueBright);
        if (d.glowRed) d.glowRed.material.opacity = phase ? 0.55 : 0.08;
        if (d.glowBlue) d.glowBlue.material.opacity = phase ? 0.08 : 0.55;
      }
    }
    // Search zone: where the player was last seen.
    if (!inSight && wanted > 0 && !searchZone) {
      searchZone = { x: px, z: pz, r: 40 };
    } else if (inSight) {
      searchZone = null;
    }
  }

  function panelRows() {
    return units
      .filter((u) => u.mesh.visible)
      .map((u) => ({
        name: u.name,
        dist: Math.round(u.dist),
        status: u.status,
        kind: u.kind,
      }));
  }

  return {
    units,
    get wanted() { return wanted; },
    get inSight() { return inSight; },
    get searchZone() { return searchZone; },
    setWanted,
    addHeat(n) { heat = Math.min(1, heat + n); if (heat > 0.55 && wanted < 5) setWanted(wanted + 1, { x: 0, z: 0, heading: 0 }); },
    step,
    panelRows,
    reset() {
      wanted = 0;
      heat = 0;
      searchZone = null;
      clearRoadblocks();
      for (const u of units) { u.mesh.visible = false; u.dist = 0; }
    },
  };
}
