// Traffic cars and pedestrians: they drive/walk the road grid so the city
// feels alive in every screenshot. One job: ambient life, no mission logic.
import { CITY } from './config.js';
import { makeCar, makeCharacter } from './vehicles.js';

const TRAFFIC_COLORS = ['#c23b3b', '#3b7ac2', '#d1a93d', '#3ba66a', '#e8e8e8', '#7a4fd1', '#e07b2a'];
const TRAFFIC_TYPES = ['sedan', 'sedan', 'taxi', 'van', 'truck', 'sports', 'sedan'];

export function createTraffic(scene, random, count = 14) {
  const cars = [];
  for (let i = 0; i < count; i += 1) {
    const type = TRAFFIC_TYPES[i % TRAFFIC_TYPES.length];
    const color = type === 'taxi' ? '#f5c93d' : TRAFFIC_COLORS[i % TRAFFIC_COLORS.length];
    const car = makeCar(color, { type });
    const road = -CITY.size / 2 + Math.floor(random() * 11) * CITY.roadEvery;
    const along = (random() - 0.5) * CITY.size;
    const vertical = random() < 0.5;
    // Front is local +Z: rotation.y = 0 faces +Z, PI/2 faces +X, etc.
    const dir = random() < 0.5 ? 1 : -1;
    car.position.set(vertical ? road : along, 0, vertical ? along : road);
    car.rotation.y = vertical ? (dir > 0 ? 0 : Math.PI) : (dir > 0 ? Math.PI / 2 : -Math.PI / 2);
    scene.add(car);
    cars.push({ mesh: car, speed: 8 + random() * 7, vertical, road, dir });
  }
  return {
    cars,
    step(dt) {
      for (const c of cars) {
        if (c.vertical) c.mesh.position.z += c.dir * c.speed * dt;
        else c.mesh.position.x += c.dir * c.speed * dt;
        const p = c.vertical ? c.mesh.position.z : c.mesh.position.x;
        if (p > CITY.size / 2) { if (c.vertical) c.mesh.position.z = -CITY.size / 2; else c.mesh.position.x = -CITY.size / 2; }
        if (p < -CITY.size / 2) { if (c.vertical) c.mesh.position.z = CITY.size / 2; else c.mesh.position.x = CITY.size / 2; }
      }
    },
  };
}

export function createPedestrians(scene, random, count = 22) {
  const peds = [];
  const shirtColors = ['#c23b3b', '#3b7ac2', '#d1a93d', '#e8e8e8', '#7a4fd1'];
  for (let i = 0; i < count; i += 1) {
    const p = makeCharacter();
    p.children.forEach((c) => { if (c.material && c.material.color) c.material = c.material.clone(); });
    const shirt = p.children[3];
    if (shirt) shirt.material.color.set(shirtColors[i % shirtColors.length]);
    p.scale.setScalar(0.92);
    p.position.set((random() - 0.5) * 560, 0, (random() - 0.5) * 560);
    p.rotation.y = random() * Math.PI * 2;
    scene.add(p);
    peds.push({ mesh: p, speed: 1.5 + random() * 1.5, dir: random() * Math.PI * 2, turnT: 2 + random() * 4 });
  }
  return {
    peds,
    step(dt) {
      for (const p of peds) {
        p.turnT -= dt;
        if (p.turnT <= 0) { p.dir += (Math.random() - 0.5) * 2.4; p.turnT = 2 + Math.random() * 4; }
        p.mesh.position.x += Math.sin(p.dir) * p.speed * dt;
        p.mesh.position.z += Math.cos(p.dir) * p.speed * dt;
        p.mesh.position.x = Math.max(-290, Math.min(290, p.mesh.position.x));
        p.mesh.position.z = Math.max(-290, Math.min(290, p.mesh.position.z));
        p.mesh.rotation.y = p.dir;
        p.mesh.position.y = Math.abs(Math.sin(performance.now() / 240 + p.speed * 10)) * 0.12;
      }
    },
  };
}
