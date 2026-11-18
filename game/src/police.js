// KPD police: wanted stars, pursuit units, helicopter and roadblocks.
// One job: turn crime into a chase, and let the heat cool off.
import { makeCar, makeHelicopter } from './vehicles.js';

export function createPolice(scene) {
  const units = [];
  let heli = null;
  let wanted = 0;
  let heat = 0; // 0..100, drives stars
  let roadblock = false;
  let dispatch = 'KPD DISPATCH: Units 4 and 7, set up a roadblock near Alun-Alun.';

  function spawnUnit() {
    const car = makeCar('#e8eef5', { police: true, type: 'sedan' });
    car.position.set(120 + Math.random() * 60, 0, -120 + Math.random() * 60);
    scene.add(car);
    const u = { mesh: car, speed: 30, state: 'pursuing' };
    units.push(u);
    return u;
  }
  function spawnHeli() {
    if (heli) return;
    heli = makeHelicopter();
    heli.position.set(0, 55, 0);
    scene.add(heli);
  }
  function addHeat(amount, why) {
    heat = Math.min(100, heat + amount);
    const stars = Math.min(5, Math.floor(heat / 20) + (heat > 0 ? 1 : 0));
    if (stars > wanted) {
      wanted = stars;
      dispatch = `KPD DISPATCH: ${why} — wanted level ${wanted} star${wanted > 1 ? 's' : ''}.`;
      while (units.length < wanted) spawnUnit();
      if (wanted >= 3) spawnHeli();
      if (wanted >= 4) roadblock = true;
    }
  }
  return {
    get wanted() { return wanted; },
    get units() { return units; },
    get heli() { return heli; },
    get roadblock() { return roadblock; },
    get dispatch() { return dispatch; },
    addHeat,
    step(dt, target, crewAgus) {
      // Heat cools when the player is far from every unit.
      let nearest = 1e9;
      for (const u of units) nearest = Math.min(nearest, u.mesh.position.distanceTo(target));
      if (nearest > 120) heat = Math.max(0, heat - dt * (crewAgus ? 6 : 3));
      const stars = heat <= 0 ? 0 : Math.min(5, Math.floor(heat / 20) + 1);
      if (stars < wanted) { wanted = stars; if (wanted < 4) roadblock = false; }
      for (const u of units) {
        const dx = target.x - u.mesh.position.x, dz = target.z - u.mesh.position.z;
        const dist = Math.hypot(dx, dz) || 1;
        const heading = Math.atan2(dx, dz);
        u.mesh.rotation.y += ((heading - u.mesh.rotation.y + Math.PI * 3) % (Math.PI * 2) - Math.PI) * Math.min(1, dt * 2);
        const sp = dist > 8 ? u.speed : 0;
        u.mesh.position.x += Math.sin(u.mesh.rotation.y) * sp * dt;
        u.mesh.position.z += Math.cos(u.mesh.rotation.y) * sp * dt;
        const lb = u.mesh.getObjectByName('lightbar');
        if (lb) lb.material.color.setHex(Math.floor(performance.now() / 300) % 2 ? 0xff3b30 : 0x2a5fd1);
      }
      if (heli) {
        heli.position.x += (target.x - heli.position.x) * dt * 0.5;
        heli.position.z += (target.z - heli.position.z) * dt * 0.5;
        heli.position.y = 55 + Math.sin(performance.now() / 900) * 3;
        const rotor = heli.getObjectByName('rotor');
        if (rotor) rotor.rotation.y += dt * 18;
      }
    },
  };
}
