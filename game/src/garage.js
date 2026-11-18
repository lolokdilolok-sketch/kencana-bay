// The garage: a real interior you walk into. The workshop lives far from the city in the
// same scene (so the city never has to hide), and G near the glowing door teleports the
// player in; G at the door teleports back out. Inside: the Garuda on a lift, tool benches,
// tire stacks, a neon BENGKEL BAMBANG sign, and Bambang himself, who talks. Repainting
// (4 colours) and repair (cash) happen here and persist in the save.

import { THREE } from './three-shim.js';
import { GARAGE, PAINTS } from './config.js';
import { buildGaruda } from './vehicles.js';
import { buildCharacter as buildPerson } from './pedestrians.js';

const REPAIR_COST = 150;

function neonTexture(text) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#0a1410';
  ctx.fillRect(0, 0, 512, 128);
  ctx.fillStyle = '#3fd2c0';
  ctx.font = 'bold 56px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 64);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createGarage(scene, rng) {
  const room = { ...GARAGE.room };
  const group = new THREE.Group();
  const W = 26;
  const D = 18;
  const H = 8;

  const floorMat = new THREE.MeshStandardMaterial({ color: 0x3a3f46, roughness: 0.9 });
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x5a6a72, roughness: 0.95 });
  const floor = new THREE.Mesh(new THREE.BoxGeometry(W, 0.5, D), floorMat);
  floor.position.set(room.x, -0.25, room.z);
  floor.receiveShadow = true;
  group.add(floor);
  const ceiling = new THREE.Mesh(new THREE.BoxGeometry(W, 0.5, D), new THREE.MeshStandardMaterial({ color: 0x2a2e36, roughness: 1 }));
  ceiling.position.set(room.x, H, room.z);
  group.add(ceiling);
  // Walls: back, left, right; the front wall has the door gap.
  const back = new THREE.Mesh(new THREE.BoxGeometry(W, H, 0.5), wallMat);
  back.position.set(room.x, H / 2, room.z - D / 2);
  group.add(back);
  for (const s of [-1, 1]) {
    const side = new THREE.Mesh(new THREE.BoxGeometry(0.5, H, D), wallMat);
    side.position.set(room.x + s * W / 2, H / 2, room.z);
    group.add(side);
  }
  for (const s of [-1, 1]) {
    const front = new THREE.Mesh(new THREE.BoxGeometry(W / 2 - 2.5, H, 0.5), wallMat);
    front.position.set(room.x + s * (W / 4 + 1.25), H / 2, room.z + D / 2);
    group.add(front);
  }
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(5, 2.5, 0.5), wallMat);
  lintel.position.set(room.x, H - 1.25, room.z + D / 2);
  group.add(lintel);

  // Neon sign over the lift.
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(12, 3), new THREE.MeshBasicMaterial({ map: neonTexture('BENGKEL BAMBANG') }));
  sign.position.set(room.x, 6.4, room.z - D / 2 + 0.3);
  group.add(sign);

  // The lift: two rails and a platform the Garuda sits on.
  const liftMat = new THREE.MeshStandardMaterial({ color: 0xffb400, roughness: 0.6, metalness: 0.4 });
  for (const s of [-1.2, 1.2]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.2, 7), liftMat);
    rail.position.set(room.x + s, 0.6, room.z - 1);
    group.add(rail);
  }
  const platform = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.4, 7.5), new THREE.MeshStandardMaterial({ color: 0x2a2e36, roughness: 0.8 }));
  platform.position.set(room.x, 1.1, room.z - 1);
  group.add(platform);

  // Tool benches along the back wall.
  const benchMat = new THREE.MeshStandardMaterial({ color: 0x7a5230, roughness: 0.9 });
  for (const bx of [-9, 9]) {
    const bench = new THREE.Mesh(new THREE.BoxGeometry(5, 0.3, 1.6), benchMat);
    bench.position.set(room.x + bx, 1.1, room.z - D / 2 + 1.2);
    group.add(bench);
    for (const leg of [-2.2, 2.2]) {
      const l = new THREE.Mesh(new THREE.BoxGeometry(0.25, 1.1, 0.25), benchMat);
      l.position.set(room.x + bx + leg, 0.55, room.z - D / 2 + 1.2);
      group.add(l);
    }
    // Tools on the bench: small bright boxes and cylinders.
    for (let i = 0; i < 4; i += 1) {
      const tool = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.25), new THREE.MeshStandardMaterial({ color: [0xd21f2b, 0x3fd2c0, 0xffb400, 0xb06ae0][i], roughness: 0.5 }));
      tool.position.set(room.x + bx - 1.8 + i * 1.1, 1.35, room.z - D / 2 + 1.2);
      group.add(tool);
    }
  }

  // Tire stacks in the corners.
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x14141a, roughness: 0.95 });
  for (const [tx, tz] of [[-11, 6], [11, 6]]) {
    for (let i = 0; i < 3; i += 1) {
      const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.5, 14), tireMat);
      tire.position.set(room.x + tx, 0.25 + i * 0.5, room.z + tz);
      group.add(tire);
    }
  }

  // Warm workshop lights.
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xffe9a8 });
  for (const lx of [-6, 0, 6]) {
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), lampMat);
    lamp.position.set(room.x + lx, 7.4, room.z);
    group.add(lamp);
  }
  const point = new THREE.PointLight(0xffd9a0, 60, 40);
  point.position.set(room.x, 6.5, room.z);
  group.add(point);

  // Bambang stands by the south-east tire stack, in teal overalls and a cap — in front of
  // the car from the garage camera, not hidden behind it.
  const bambang = buildPerson({ shirt: 0x2a8a7a, pants: 0x2a3a4a, skin: 0xc98a5a, hair: 0x1a1a1a, cap: 0xffb400 });
  bambang.position.set(room.x + 8, 0, room.z + 4);
  bambang.rotation.y = -Math.PI / 2;
  group.add(bambang);

  // The Garuda on the lift, repainted whenever the player changes colour — angled so the
  // camera sees its three-quarter side, not just the nose.
  let carMesh = null;
  function setCar(colorHex) {
    if (carMesh) group.remove(carMesh);
    carMesh = buildGaruda(colorHex, false);
    carMesh.position.set(room.x, 1.3, room.z - 1);
    carMesh.rotation.y = -0.45;
    group.add(carMesh);
  }

  scene.add(group);

  const state = { inside: false, carColor: 0xffb400 };
  setCar(state.carColor);

  function nearDoor(x, z) {
    return Math.hypot(x - GARAGE.door.x, z - (GARAGE.door.z + 14)) < 12;
  }

  function nearExit(x, z) {
    return Math.hypot(x - room.x, z - (room.z + D / 2 - 1)) < 4;
  }

  return {
    state, room, REPAIR_COST,
    nearDoor, nearExit, setCar,
    doorPosition() {
      return { x: GARAGE.door.x, z: GARAGE.door.z + 14 };
    },
    interiorSpawn() {
      return { x: room.x, z: room.z + 5, heading: Math.PI };
    },
    paints() {
      return PAINTS;
    },
  };
}
