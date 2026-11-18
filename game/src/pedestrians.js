// Traffic and pedestrians: ordinary cars looping around the road grid and
// people walking the sidewalks. Both are pure scenery with simple rules.
import { WORLD } from './config.js';
import { makeRng, range } from './random.js';
import { createCar } from './vehicles.js';

const TRAFFIC_KINDS = ['sedan', 'sedan', 'taxi', 'van', 'truck', 'sedan'];
const SHIRT_COLORS = [0xe05a3a, 0x2fae5f, 0x4fc3f7, 0xffb400, 0x7b2fbe, 0xe8e8e8];

export function createTraffic(seed) {
  const rng = makeRng(seed + 77);
  const cars = [];
  for (let i = 0; i < 14; i += 1) {
    const horizontal = rng() < 0.5;
    const road = (horizontal ? WORLD.roadZs : WORLD.roadXs)[Math.floor(rng() * 5)];
    const along = range(rng, -330, 330);
    const kind = TRAFFIC_KINDS[Math.floor(rng() * TRAFFIC_KINDS.length)];
    const colors = [0x7fb069, 0xef476f, 0x4fc3f7, 0xd8d8d8, 0x8a6f8a];
    const car = createCar(kind, horizontal ? along : road, horizontal ? road : along, horizontal ? (rng() < 0.5 ? Math.PI / 2 : -Math.PI / 2) : (rng() < 0.5 ? 0 : Math.PI), colors[Math.floor(rng() * colors.length)]);
    car.speed = range(rng, 8, 16);
    car.horizontal = horizontal;
    car.road = road;
    cars.push(car);
  }
  return cars;
}

export function stepTraffic(cars, dt) {
  for (const car of cars) {
    if (car.horizontal) {
      car.x += Math.sin(car.heading) * car.speed * dt;
      car.z = car.road;
      if (car.x > 345) car.x = -345;
      if (car.x < -345) car.x = 345;
    } else {
      car.z += Math.cos(car.heading) * car.speed * dt;
      car.x = car.road;
      if (car.z > 345) car.z = -345;
      if (car.z < -345) car.z = 345;
    }
    car.group.position.set(car.x, 0, car.z);
  }
}

export function createPedestrians(seed, THREE) {
  const rng = makeRng(seed + 131);
  const peds = [];
  for (let i = 0; i < 22; i += 1) {
    const g = new THREE.Group();
    const shirt = new THREE.MeshLambertMaterial({ color: SHIRT_COLORS[Math.floor(rng() * SHIRT_COLORS.length)] });
    const skin = new THREE.MeshLambertMaterial({ color: 0xd99a6c });
    const pants = new THREE.MeshLambertMaterial({ color: 0x2a2a33 });
    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.8, 0.24), pants);
    legL.position.set(-0.14, 0.4, 0);
    const legR = legL.clone();
    legR.position.x = 0.14;
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.8, 0.4), shirt);
    torso.position.y = 1.2;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 0.42), skin);
    head.position.y = 1.85;
    const hair = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.16, 0.45), new THREE.MeshLambertMaterial({ color: 0x1a1a1a }));
    hair.position.y = 2.1;
    g.add(legL, legR, torso, head, hair);
    g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    const horizontal = rng() < 0.5;
    const road = (horizontal ? WORLD.roadZs : WORLD.roadXs)[Math.floor(rng() * 5)];
    const along = range(rng, -330, 330);
    const offset = range(rng, 9, 12) * (rng() < 0.5 ? -1 : 1);
    const ped = {
      group: g,
      x: horizontal ? along : road + offset,
      z: horizontal ? road + offset : along,
      heading: horizontal ? (rng() < 0.5 ? Math.PI / 2 : -Math.PI / 2) : (rng() < 0.5 ? 0 : Math.PI),
      speed: range(rng, 1.2, 2.2),
      phase: rng() * Math.PI * 2,
    };
    g.position.set(ped.x, 0, ped.z);
    g.rotation.y = ped.heading;
    peds.push(ped);
  }
  return peds;
}

export function stepPedestrians(peds, dt, time) {
  for (const ped of peds) {
    ped.x += Math.sin(ped.heading) * ped.speed * dt;
    ped.z += Math.cos(ped.heading) * ped.speed * dt;
    if (ped.x > 348) ped.x = -348;
    if (ped.x < -348) ped.x = 348;
    if (ped.z > 348) ped.z = -348;
    if (ped.z < -348) ped.z = 348;
    ped.group.position.set(ped.x, 0, ped.z);
    // A gentle walk bob.
    ped.group.position.y = Math.abs(Math.sin(time * 6 + ped.phase)) * 0.08;
    ped.group.rotation.y = ped.heading;
  }
}
