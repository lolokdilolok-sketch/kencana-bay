// The enterable garage: Bengkel Bambang. A real room in the same scene, far
// outside the city (x = -900), so the player and the Garuda teleport into it
// through the garage door. Inside: the Garuda on a hydraulic lift, tool
// benches, tyre stacks, a neon sign, Bambang at his workbench — and the
// upgrade menu (repair / respray / engine tune / armour) with prices.
import { THREE, box, cylinder, canvasTexture } from './three-shim.js';
import { PAINTS, GARAGE_MENU } from './config.js';
import { buildMinifig, CHARACTERS } from './pedestrians.js';
import { buildSportsCar } from './vehicles.js';

export const GARAGE_POS = { x: -900, z: 0 };

export function createGarage(scene) {
  const room = new THREE.Group();
  room.position.set(GARAGE_POS.x, 0, GARAGE_POS.z);
  const wallMat = new THREE.MeshStandardMaterial({ color: '#3a4a3a', roughness: 0.95 });
  const floorMat = new THREE.MeshStandardMaterial({ color: '#55565e', roughness: 0.6, metalness: 0.2 });
  // Floor, walls, ceiling.
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 22), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  room.add(floor);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(30, 22), new THREE.MeshStandardMaterial({ color: '#2a2a30', roughness: 1 }));
  ceil.rotation.x = Math.PI / 2;
  ceil.position.y = 8;
  room.add(ceil);
  for (const [w, d, x, z] of [[30, 0.5, 0, -11], [30, 0.5, 0, 11], [0.5, 22, -15, 0], [0.5, 22, 15, 0]]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(w, 8, d), wallMat);
    wall.position.set(x, 4, z);
    wall.receiveShadow = true;
    room.add(wall);
  }
  // Big roller door on the south wall (the way in).
  const door = new THREE.Mesh(
    new THREE.BoxGeometry(8, 6, 0.3),
    new THREE.MeshStandardMaterial({ color: '#8a8f96', roughness: 0.5, metalness: 0.6 }),
  );
  door.position.set(0, 3, 10.9);
  room.add(door);
  // Neon sign.
  const signTex = canvasTexture(512, 128, (x, w, h) => {
    x.fillStyle = '#101018';
    x.fillRect(0, 0, w, h);
    x.fillStyle = '#7dff9a';
    x.font = 'bold 52px system-ui, sans-serif';
    x.textAlign = 'center';
    x.fillText('BENGKEL BAMBANG', w / 2, 82);
  });
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(12, 3),
    new THREE.MeshStandardMaterial({ map: signTex, emissive: 0xffffff, emissiveMap: signTex, emissiveIntensity: 0.9, roughness: 0.6 }),
  );
  sign.position.set(0, 6.6, -10.7);
  room.add(sign);
  // Hydraulic lift + the Garuda on it.
  const liftBase = box(3.4, 0.3, 7, '#333a44');
  liftBase.position.set(0, 0.15, 0);
  room.add(liftBase);
  const liftPost = box(1.2, 1.0, 1.2, '#c9a227', { metal: 0.6, rough: 0.4 });
  liftPost.position.set(0, 0.8, 0);
  room.add(liftPost);
  const liftPad = box(3.2, 0.25, 6.4, '#c9a227', { metal: 0.6, rough: 0.4 });
  liftPad.position.set(0, 1.35, 0);
  room.add(liftPad);
  const displayCar = buildSportsCar('#ffb400', { driver: true });
  displayCar.position.set(0, 1.5, 0);
  displayCar.rotation.y = -0.5;
  room.add(displayCar);
  // A second car in the back (customer's sedan, red).
  const backCar = buildSportsCar('#d21f2b', { driver: false, length: 4.9, width: 2.1 });
  backCar.position.set(-10, 0, -6);
  backCar.rotation.y = 0.7;
  room.add(backCar);
  // Tool benches along the north wall.
  for (const bx of [-11, 11]) {
    const bench = box(5, 1.0, 1.6, '#6b4a2b');
    bench.position.set(bx, 0.5, -9.6);
    room.add(bench);
    for (let i = 0; i < 5; i += 1) {
      const tool = box(0.5, 0.3, 0.3, ['#c94b4b', '#2b6fd0', '#e8a33d', '#888888', '#3d8a4b'][i]);
      tool.position.set(bx - 1.8 + i * 0.9, 1.15, -9.6);
      room.add(tool);
    }
    const peg = box(5, 2.4, 0.15, '#4a3a2a');
    peg.position.set(bx, 2.6, -10.8);
    room.add(peg);
  }
  // Tyre stacks.
  for (const [tx, tz, n] of [[12.5, -8, 4], [12.5, 8, 3], [-12.5, 8, 3]]) {
    for (let i = 0; i < n; i += 1) {
      const tyre = new THREE.Mesh(
        new THREE.TorusGeometry(0.55, 0.22, 8, 16),
        new THREE.MeshStandardMaterial({ color: '#141414', roughness: 0.95 }),
      );
      tyre.rotation.x = Math.PI / 2;
      tyre.position.set(tx, 0.25 + i * 0.45, tz);
      tyre.castShadow = true;
      room.add(tyre);
    }
  }
  // Hanging lamps.
  for (const lx of [-6, 0, 6]) {
    const cord = cylinder(0.04, 0.04, 1.6, '#222222');
    cord.position.set(lx, 7.2, 0);
    room.add(cord);
    const lamp = new THREE.Mesh(
      new THREE.SphereGeometry(0.4, 10, 8),
      new THREE.MeshBasicMaterial({ color: '#ffe9a0' }),
    );
    lamp.position.set(lx, 6.3, 0);
    room.add(lamp);
    const shade = new THREE.Mesh(
      new THREE.ConeGeometry(0.7, 0.6, 12, 1, true),
      new THREE.MeshStandardMaterial({ color: '#2b6f4b', roughness: 0.6, side: THREE.DoubleSide }),
    );
    shade.position.set(lx, 6.6, 0);
    room.add(shade);
  }
  // Oil stains + floor markings.
  for (const [ox, oz] of [[-4, 4], [5, -5], [8, 5]]) {
    const stain = new THREE.Mesh(
      new THREE.CircleGeometry(1.4, 14),
      new THREE.MeshStandardMaterial({ color: '#1c1c22', roughness: 0.4, transparent: true, opacity: 0.7 }),
    );
    stain.rotation.x = -Math.PI / 2;
    stain.position.set(ox, 0.02, oz);
    room.add(stain);
  }
  // Painted yellow bay lines around the lift, so the work area reads.
  for (const [w, d, x, z] of [[5.4, 0.18, 0, 4.6], [5.4, 0.18, 0, -4.6], [0.18, 9.2, 2.7, 0], [0.18, 9.2, -2.7, 0]]) {
    const line = box(w, 0.02, d, '#e8d44d', { rough: 0.7 });
    line.position.set(x, 0.015, z);
    room.add(line);
  }
  // Two more oil stains, right by the lift where the work happens.
  for (const [ox, oz, r] of [[-2.2, 3.2, 0.9], [4.2, -3.4, 1.1]]) {
    const stain = new THREE.Mesh(
      new THREE.CircleGeometry(r, 14),
      new THREE.MeshStandardMaterial({ color: '#1c1c22', roughness: 0.4, transparent: true, opacity: 0.7 }),
    );
    stain.rotation.x = -Math.PI / 2;
    stain.position.set(ox, 0.02, oz);
    room.add(stain);
  }
  // Red rolling toolbox, foreground right — drawers facing the camera.
  const toolCart = new THREE.Group();
  const cartBody = box(1.5, 0.85, 0.7, '#c94b4b', { metal: 0.3, rough: 0.5 });
  cartBody.position.y = 0.62;
  toolCart.add(cartBody);
  for (let i = 0; i < 3; i += 1) {
    const drawer = box(1.34, 0.18, 0.06, '#e8e8e8', { metal: 0.4, rough: 0.4 });
    drawer.position.set(0, 0.35 + i * 0.26, 0.38);
    toolCart.add(drawer);
  }
  const cartHandle = box(1.5, 0.06, 0.06, '#333333');
  cartHandle.position.set(0, 1.1, -0.3);
  toolCart.add(cartHandle);
  for (const [wx, wz] of [[-0.6, -0.25], [0.6, -0.25], [-0.6, 0.25], [0.6, 0.25]]) {
    const wheel = cylinder(0.09, 0.09, 0.08, '#141414');
    wheel.rotation.x = Math.PI / 2;
    wheel.position.set(wx, 0.09, wz);
    toolCart.add(wheel);
  }
  toolCart.position.set(-7.5, 0, 4.8);
  toolCart.rotation.y = 0.9;
  room.add(toolCart);
  // Oil drums against the west wall.
  for (const [dx, dz, col] of [[-13.4, 1.6, '#2b6fd0'], [-13.4, 2.9, '#c94b4b']]) {
    const drum = cylinder(0.45, 0.45, 1.1, col, { metal: 0.4, rough: 0.5 });
    drum.position.set(dx, 0.55, dz);
    drum.castShadow = true;
    room.add(drum);
  }
  // Creeper board lying on the floor, foreground left.
  const creeper = box(1.7, 0.1, 0.65, '#7a2b2b', { rough: 0.8 });
  creeper.position.set(-3.2, 0.08, 3.6);
  creeper.rotation.y = 0.4;
  room.add(creeper);
  // Jack stands flanking the lift — low, so they never hide the car.
  for (const [jx, jz] of [[3.4, -2.2], [-3.4, -1.8]]) {
    const base = box(0.5, 0.12, 0.5, '#c9a227', { metal: 0.6, rough: 0.4 });
    base.position.set(jx, 0.06, jz);
    room.add(base);
    const post = cylinder(0.09, 0.12, 0.55, '#c9a227', { metal: 0.6, rough: 0.4 });
    post.position.set(jx, 0.4, jz);
    room.add(post);
  }
  // A loose spare tyre flat on the floor near the lift.
  const spare = new THREE.Mesh(
    new THREE.TorusGeometry(0.55, 0.22, 8, 16),
    new THREE.MeshStandardMaterial({ color: '#141414', roughness: 0.95 }),
  );
  spare.rotation.x = Math.PI / 2;
  spare.position.set(5.0, 0.25, -4.0);
  spare.castShadow = true;
  room.add(spare);
  // Parts shelf on the east wall: boards + small parts boxes.
  const shelf = new THREE.Group();
  for (const px of [-0.9, 0.9]) {
    const post = box(0.12, 2.6, 0.7, '#4a3a2a');
    post.position.set(px, 1.3, 0);
    shelf.add(post);
  }
  for (let i = 0; i < 3; i += 1) {
    const board = box(2.0, 0.08, 0.8, '#6b4a2b');
    board.position.set(0, 0.5 + i * 0.85, 0);
    shelf.add(board);
    const part = box(0.45, 0.35, 0.5, ['#c94b4b', '#2b6fd0', '#e8a33d'][i]);
    part.position.set(-0.5 + i * 0.5, 0.72 + i * 0.85, 0);
    shelf.add(part);
  }
  // Parts shelf on the north wall, below the neon sign, close to the
  // sign's centre so it reads whole in the frame (at x 7.5 it was cut
  // in half by the right edge; the east wall is behind the garage
  // camera, so a shelf there never shows in the shot).
  shelf.position.set(3.5, 0, -10.2);
  room.add(shelf);
  // Front-left floor props: the lower-left of the shot was empty pink
  // floor. A rubber mat in front of the lift, a crate, oil cans and a
  // pegboard on the west wall — none of them hides the car, the price
  // panel or Bambang's dialogue.
  const mat = box(4.5, 0.04, 2.6, '#26262e', { rough: 0.9 });
  mat.position.set(2, 0.02, 7.5);
  room.add(mat);
  const frontCrate = box(0.7, 0.7, 0.7, '#8a6b3d', { rough: 0.85 });
  frontCrate.position.set(0.8, 0.35, 7.6);
  frontCrate.rotation.y = 0.4;
  frontCrate.castShadow = true;
  room.add(frontCrate);
  for (const [cx, cz, col] of [[4.5, 8.2, '#c94b4b'], [5.1, 7.6, '#2b6fd0']]) {
    const can = cylinder(0.22, 0.22, 0.55, col, { metal: 0.4, rough: 0.5 });
    can.position.set(cx, 0.28, cz);
    can.castShadow = true;
    room.add(can);
  }
  const peg = box(0.15, 2.2, 4.5, '#4a3a2a', { rough: 0.9 });
  peg.position.set(-14.7, 2.8, 5);
  room.add(peg);
  for (let i = 0; i < 3; i += 1) {
    const tool = box(0.2, 0.5, 0.3, ['#c94b4b', '#2b6fd0', '#e8a33d'][i]);
    tool.position.set(-14.55, 2.3 + i * 0.6, 3.6 + i * 1.2);
    room.add(tool);
  }
  // Bambang at the bench.
  const bambang = buildMinifig(CHARACTERS.bambang, 1);
  bambang.group.position.set(-11, 0, -7.6);
  bambang.group.rotation.y = 2.4;
  room.add(bambang.group);
  room.visible = false;
  scene.add(room);

  const state = {
    inside: false,
    paint: 0,
    tune: 0, // 0..2 engine tunes
    armour: 0, // 0..1
    hp: 100,
  };

  function stats() {
    return {
      top: 166 + state.tune * 18,
      accel: 7.2 - state.tune * 0.9,
      armour: 40 + state.armour * 60,
      handling: 72 + state.tune * 8,
    };
  }

  return {
    room, state,
    enter() {
      state.inside = true;
      room.visible = true;
      return { x: GARAGE_POS.x, z: GARAGE_POS.z };
    },
    exit() {
      state.inside = false;
      room.visible = false;
    },
    repaint(i) {
      state.paint = i;
      const color = PAINTS[i].color;
      displayCar.userData.bodyMat.color.set(color);
      return PAINTS[i].name;
    },
    buy(i, cash) {
      const item = GARAGE_MENU[i];
      if (!item) return { ok: false, msg: 'Tidak ada.' };
      if (i === 0) {
        if (cash < item.price) return { ok: false, msg: 'Uang tidak cukup.' };
        state.hp = 100;
        return { ok: true, cost: item.price, msg: 'Body diperbaiki 100%.' };
      }
      if (i === 1) {
        if (cash < item.price) return { ok: false, msg: 'Uang tidak cukup.' };
        state.paint = (state.paint + 1) % PAINTS.length;
        displayCar.userData.bodyMat.color.set(PAINTS[state.paint].color);
        return { ok: true, cost: item.price, msg: `Cat baru: ${PAINTS[state.paint].name}. Panas hilang.` };
      }
      if (i === 2) {
        if (state.tune >= 2) return { ok: false, msg: 'Mesin sudah maksimal.' };
        if (cash < item.price) return { ok: false, msg: 'Uang tidak cukup.' };
        state.tune += 1;
        return { ok: true, cost: item.price, msg: `Engine tune ${state.tune}/2 terpasang.` };
      }
      if (state.armour >= 1) return { ok: false, msg: 'Armour sudah maksimal.' };
      if (cash < item.price) return { ok: false, msg: 'Uang tidak cukup.' };
      state.armour = 1;
      return { ok: true, cost: item.price, msg: 'Armour plating terpasang.' };
    },
    stats,
    displayCar,
  };
}
