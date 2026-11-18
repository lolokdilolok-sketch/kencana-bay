// The twelve story missions: a small state machine over checkpoints.
// Each mission pays out when its last point is reached; 'clear' missions
// also need the gang members at the point taken down first.
import { MISSIONS, TUNING } from './config.js';
import { THREE } from './three-shim.js';

function makeRing(color) {
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(9, 0.7, 10, 40),
    new THREE.MeshBasicMaterial({ color }),
  );
  ring.rotation.x = Math.PI / 2;
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(8.5, 8.5, 60, 20, 1, true),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false }),
  );
  beam.position.y = 30;
  const star = new THREE.Mesh(
    new THREE.OctahedronGeometry(2.2),
    new THREE.MeshBasicMaterial({ color: 0xffd23f }),
  );
  star.position.y = 12;
  const g = new THREE.Group();
  g.add(ring, beam, star);
  return { group: g, star };
}

function makeGangMember() {
  const g = new THREE.Group();
  const shirt = new THREE.MeshLambertMaterial({ color: 0xc22a2a });
  const skin = new THREE.MeshLambertMaterial({ color: 0xd99a6c });
  const pants = new THREE.MeshLambertMaterial({ color: 0x222222 });
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.85, 0.26), pants);
  legL.position.set(-0.15, 0.42, 0);
  const legR = legL.clone();
  legR.position.x = 0.15;
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.85, 0.42), shirt);
  torso.position.y = 1.28;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.48, 0.44), skin);
  head.position.y = 1.95;
  const gun = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.7), new THREE.MeshLambertMaterial({ color: 0x111111 }));
  gun.position.set(0.45, 1.3, 0.3);
  g.add(legL, legR, torso, head, gun);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

export function createMissions(scene) {
  const marker = makeRing(0xffd23f);
  marker.group.visible = false;
  scene.add(marker.group);
  return {
    index: 0,
    point: 0,
    done: false,
    marker,
    enemies: [],
    surviveTimer: 0,
    scene,
  };
}

export function currentMission(missions) {
  return MISSIONS[missions.index] || null;
}

export function currentPoint(missions) {
  const m = currentMission(missions);
  if (!m) return null;
  return m.points[missions.point] || null;
}

export function startMission(missions, index, police) {
  missions.index = index;
  missions.point = 0;
  missions.done = false;
  missions.surviveTimer = 0;
  clearEnemies(missions);
  const m = MISSIONS[index];
  if (m && m.wanted) {
    police.heat = m.wanted;
    police.wanted = m.wanted;
  }
  if (m && m.type === 'clear') {
    const p = m.points[0];
    for (let i = 0; i < 3; i += 1) {
      const enemy = makeGangMember();
      enemy.position.set(p.x + (i - 1) * 7, 0, p.z + (i % 2 ? 5 : -5));
      missions.scene.add(enemy);
      missions.enemies.push({ group: enemy, x: p.x + (i - 1) * 7, z: p.z + (i % 2 ? 5 : -5), hp: 100, alive: true });
    }
  }
  placeMarker(missions);
}

function clearEnemies(missions) {
  for (const e of missions.enemies) missions.scene.remove(e.group);
  missions.enemies = [];
}

function placeMarker(missions) {
  const p = currentPoint(missions);
  if (!p) {
    missions.marker.group.visible = false;
    return;
  }
  missions.marker.group.position.set(p.x, 1, p.z);
  missions.marker.group.visible = true;
}

// Advance one fixed step. Returns an event object when something notable
// happens: { type: 'point' | 'paid' | 'allDone', mission, payout }.
export function stepMissions(missions, player, police, dt) {
  const m = currentMission(missions);
  if (!m || missions.done) return null;
  const p = currentPoint(missions);
  if (!p) return null;
  missions.marker.star.rotation.y += dt * 2;
  missions.marker.star.position.y = 12 + Math.sin(performance.now() / 300) * 1.2;

  const dx = player.x - p.x;
  const dz = player.z - p.z;
  const dist = Math.hypot(dx, dz);
  const enemiesAlive = missions.enemies.some((e) => e.alive);
  if (m.type === 'clear' && enemiesAlive && dist < 70) {
    // Gang members shuffle toward the player when close.
    for (const e of missions.enemies) {
      if (!e.alive) continue;
      const ex = player.x - e.x;
      const ez = player.z - e.z;
      const ed = Math.hypot(ex, ez) || 1;
      if (ed < 40) {
        e.x += (ex / ed) * 3.2 * dt;
        e.z += (ez / ed) * 3.2 * dt;
        e.group.position.set(e.x, 0, e.z);
        e.group.rotation.y = Math.atan2(ex, ez);
        if (ed < 3 && player.hp > 0) player.hp = Math.max(0, player.hp - 6 * dt);
      }
    }
  }
  if (dist > TUNING.checkpointRadius) return null;
  if (m.type === 'clear' && enemiesAlive) return null;

  missions.point += 1;
  if (missions.point < m.points.length) {
    placeMarker(missions);
    return { type: 'point', mission: m };
  }
  // Mission complete: pay out and move on.
  const payout = m.payout;
  missions.index += 1;
  missions.point = 0;
  clearEnemies(missions);
  if (missions.index >= MISSIONS.length) {
    missions.done = true;
    missions.marker.group.visible = false;
    return { type: 'allDone', mission: m, payout };
  }
  const next = MISSIONS[missions.index];
  if (next && next.wanted) {
    police.heat = next.wanted;
    police.wanted = next.wanted;
  }
  if (next && next.type === 'clear') {
    const np = next.points[0];
    for (let i = 0; i < 3; i += 1) {
      const enemy = makeGangMember();
      enemy.position.set(np.x + (i - 1) * 7, 0, np.z + (i % 2 ? 5 : -5));
      missions.scene.add(enemy);
      missions.enemies.push({ group: enemy, x: np.x + (i - 1) * 7, z: np.z + (i % 2 ? 5 : -5), hp: 100, alive: true });
    }
  }
  placeMarker(missions);
  return { type: 'paid', mission: m, payout };
}

export function damageEnemies(missions, origin, rangeDist, damage) {
  let kills = 0;
  for (const e of missions.enemies) {
    if (!e.alive) continue;
    const d = Math.hypot(e.x - origin.x, e.z - origin.z);
    if (d < rangeDist) {
      e.hp -= damage;
      if (e.hp <= 0) {
        e.alive = false;
        e.group.visible = false;
        kills += 1;
      }
    }
  }
  return kills;
}
