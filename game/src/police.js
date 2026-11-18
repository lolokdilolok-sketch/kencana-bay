// The Kencana Police Department: the wanted level, pursuit cars, the
// helicopter and roadblocks. Police behaviour is deliberately simple:
// they steer toward the player and try to ram the player's car.
import { TUNING, WORLD } from './config.js';
import { makeRng, range } from './random.js';
import { createCar, makeHelicopter } from './vehicles.js';

export function createPolice(THREE) {
  const rng = makeRng(999);
  const heliGroup = makeHelicopter();
  heliGroup.visible = false;
  const heli = { group: heliGroup, rotor: heliGroup.getObjectByName('rotor'), angle: 0, x: 0, z: 0 };
  return {
    units: [],
    heli,
    roadblocks: [],
    wanted: 0,
    heat: 0,
    rng,
    THREE,
  };
}

function spawnUnit(police, x, z, scene) {
  const car = createCar('police', x, z, 0);
  scene.add(car.group);
  const unit = { car, stuck: 0 };
  police.units.push(unit);
  return unit;
}

function spawnRoadblock(police, x, z, heading, scene) {
  const car = createCar('police', x, z, heading);
  scene.add(car.group);
  police.roadblocks.push({ car });
}

export function setWanted(police, level, scene) {
  police.wanted = Math.max(0, Math.min(5, level));
  police.heat = police.wanted;
}

export function addHeat(police, amount) {
  police.heat = Math.min(5, police.heat + amount);
  police.wanted = Math.floor(police.heat);
}

export function stepPolice(police, player, dt, scene, time) {
  const px = player.x;
  const pz = player.z;
  // Wanted cools down when the player stays out of trouble; a hired
  // getaway driver doubles the cooling.
  const cooling = TUNING.wantedDecay * (player.crew.includes('agus') ? 2 : 1);
  if (police.heat > 0) {
    police.heat = Math.max(0, police.heat - cooling * dt * 10);
    police.wanted = Math.floor(police.heat);
  }

  const wantUnits = police.wanted >= 1 ? Math.min(6, police.wanted + 1) : 0;
  while (police.units.length < wantUnits) {
    const a = police.rng() * Math.PI * 2;
    spawnUnit(police, px + Math.cos(a) * 90, pz + Math.sin(a) * 90, scene);
  }
  while (police.units.length > wantUnits) {
    const unit = police.units.pop();
    scene.remove(unit.car.group);
  }

  for (const unit of police.units) {
    const car = unit.car;
    const dx = px - car.x;
    const dz = pz - car.z;
    const dist = Math.hypot(dx, dz) || 1;
    const targetHeading = Math.atan2(dx, dz);
    let diff = targetHeading - car.heading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    car.heading += Math.max(-2.2 * dt, Math.min(2.2 * dt, diff));
    const targetSpeed = dist > 26 ? TUNING.policeTopSpeed : TUNING.policeTopSpeed * 0.55;
    car.speed += (targetSpeed - car.speed) * Math.min(1, dt * 1.2);
    car.x += Math.sin(car.heading) * car.speed * dt;
    car.z += Math.cos(car.heading) * car.speed * dt;
    car.x = Math.max(-350, Math.min(350, car.x));
    car.z = Math.max(-350, Math.min(350, car.z));
    car.group.position.set(car.x, 0, car.z);
    car.group.rotation.y = car.heading;
    // Ramming the player costs health.
    if (dist < 5.5 && player.inCar) {
      player.hp = Math.max(0, player.hp - 14 * dt);
      car.speed *= 0.4;
    }
  }

  // Helicopter joins at three stars and circles above the player.
  const heli = police.heli;
  if (police.wanted >= 3) {
    heli.group.visible = true;
    heli.angle += dt * 0.45;
    heli.x = px + Math.cos(heli.angle) * 34;
    heli.z = pz + Math.sin(heli.angle) * 34;
    heli.group.position.set(heli.x, TUNING.heliHeight + Math.sin(time * 0.8) * 2, heli.z);
    heli.group.rotation.y = heli.angle + Math.PI / 2;
    if (heli.rotor) heli.rotor.rotation.y += dt * 18;
  } else {
    heli.group.visible = false;
  }

  // Roadblocks at four stars: two parked police cars across the road
  // ahead of the player, rebuilt whenever the player moves on.
  if (police.wanted >= 4 && police.roadblocks.length === 0) {
    const ahead = 70;
    const bx = px + Math.sin(player.heading || 0) * ahead;
    const bz = pz + Math.cos(player.heading || 0) * ahead;
    const side = Math.PI / 2;
    spawnRoadblock(police, bx + Math.cos(side) * 8, bz + Math.sin(side) * 8, side, scene);
    spawnRoadblock(police, bx - Math.cos(side) * 8, bz - Math.sin(side) * 8, side, scene);
  }
  if (police.wanted < 4 && police.roadblocks.length > 0) {
    for (const rb of police.roadblocks) scene.remove(rb.car.group);
    police.roadblocks = [];
  }

  return police.wanted;
}
