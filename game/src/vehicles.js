// Vehicles and the low-poly player character. One job: build distinct
// low-poly cars and the wheelman, and move them (drive / walk) without
// knowing missions. Cars face local +Z (their front), so rotation.y =
// heading always points the nose where the car is going.
import { THREE } from './three-shim.js';
import { CAR } from './config.js';

const glassMat = new THREE.MeshPhongMaterial({ color: '#22303e', shininess: 140, specular: 0xbbccdd });
const darkMat = new THREE.MeshPhongMaterial({ color: '#181818', shininess: 20 });
const chromeMat = new THREE.MeshPhongMaterial({ color: '#d8dce2', shininess: 120, specular: 0xffffff });
const headMat = new THREE.MeshBasicMaterial({ color: '#fff3c0' });
const tailMat = new THREE.MeshBasicMaterial({ color: '#ff3b30' });

function part(parent, w, h, d, mat, x, y, z, ry = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  if (ry) m.rotation.y = ry;
  m.castShadow = true;
  parent.add(m);
  return m;
}

// Lofted body: cross-sections along the car's length (+Z = front).
// Each section { z, w (half-width), y0 (bottom), y1 (top) }. Builds
// flat-shaded quads (top, bottom, left, right) + end caps, so the body
// is a real wedge — low pointed nose rising to the cowl, wide rear —
// instead of a constant-width box. Sections must run front -> rear.
function loftBody(parent, sections, mat) {
  const pos = [];
  const quad = (a, b, c, d) => { pos.push(...a, ...b, ...c, ...a, ...c, ...d); };
  for (let i = 0; i < sections.length - 1; i += 1) {
    const a = sections[i], b = sections[i + 1];
    quad([-a.w, a.y1, a.z], [a.w, a.y1, a.z], [b.w, b.y1, b.z], [-b.w, b.y1, b.z]); // top
    quad([-a.w, a.y0, a.z], [b.w, b.y0, b.z], [a.w, a.y0, a.z], [-b.w, b.y0, b.z]); // bottom
    quad([-a.w, a.y0, a.z], [-a.w, a.y1, a.z], [-b.w, b.y1, b.z], [-b.w, b.y0, b.z]); // left
    quad([a.w, a.y0, a.z], [b.w, b.y0, b.z], [b.w, b.y1, b.z], [a.w, a.y1, a.z]); // right
  }
  const f = sections[0];
  quad([-f.w, f.y0, f.z], [f.w, f.y0, f.z], [f.w, f.y1, f.z], [-f.w, f.y1, f.z]); // nose cap
  const r = sections[sections.length - 1];
  quad([-r.w, r.y0, r.z], [-r.w, r.y1, r.z], [r.w, r.y1, r.z], [r.w, r.y0, r.z]); // tail cap
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}

// Soft contact shadow: a dark ellipse under the car so it sits on the
// road instead of floating over it.
function blobShadow(parent, rx, rz) {
  const m = new THREE.Mesh(
    new THREE.CircleGeometry(1, 20),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.32, depthWrite: false }),
  );
  m.rotation.x = -Math.PI / 2;
  m.scale.set(rx, rz, 1);
  m.position.y = 0.03;
  parent.add(m);
  return m;
}

export function makeCharacter() {
  const g = new THREE.Group();
  const skin = new THREE.MeshLambertMaterial({ color: '#c9a184' });
  // The wheelman: bright orange shirt with yellow squares, dark navy
  // pants, white shoes, black hair — a character, not a plain box.
  const shirt = new THREE.MeshLambertMaterial({ color: '#ff5a1a' });
  const pants = new THREE.MeshLambertMaterial({ color: '#1a2440' });
  const dark = new THREE.MeshLambertMaterial({ color: '#181818' });
  const yellow = new THREE.MeshLambertMaterial({ color: '#ffd24d' });
  function cpart(w, h, d, mat, x, y, z) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z); m.castShadow = true; g.add(m); return m;
  }
  cpart(1.5, 1.5, 1.4, skin, 0, 4.6, 0);            // head
  cpart(1.55, 0.55, 1.45, dark, 0, 5.35, 0);        // black hair
  cpart(1.7, 0.35, 1.5, dark, 0, 4.75, 0.5);        // sunglasses
  cpart(1.9, 2.2, 1.1, shirt, 0, 2.9, 0);           // torso, orange shirt
  // yellow square pattern on the shirt front
  cpart(0.42, 0.42, 0.06, yellow, -0.45, 3.4, 0.56);
  cpart(0.42, 0.42, 0.06, yellow, 0.45, 3.4, 0.56);
  cpart(0.42, 0.42, 0.06, yellow, -0.45, 2.5, 0.56);
  cpart(0.42, 0.42, 0.06, yellow, 0.45, 2.5, 0.56);
  cpart(0.6, 2.0, 0.6, shirt, -1.25, 2.9, 0);       // left arm
  cpart(0.6, 2.0, 0.6, shirt, 1.25, 2.9, 0);        // right arm
  cpart(0.65, 1.9, 0.8, pants, -0.48, 0.95, 0);      // left leg
  cpart(0.65, 1.9, 0.8, pants, 0.48, 0.95, 0);       // right leg
  cpart(0.7, 0.3, 0.95, new THREE.MeshLambertMaterial({ color: '#f5f5f5' }), -0.48, 0.15, 0.05); // white shoe
  cpart(0.7, 0.3, 0.95, new THREE.MeshLambertMaterial({ color: '#f5f5f5' }), 0.48, 0.15, 0.05);  // white shoe
  const gun = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.7, 0.25), dark);
  gun.position.set(1.25, 1.6, 0.4); gun.castShadow = true; g.add(gun);
  blobShadow(g, 1.3, 1.3);
  return g;
}

function wheel(parent, x, z, r = 0.55, w = 0.42, rimFrac = 0.62, spokeLen = 1.15) {
  const tyre = new THREE.Mesh(new THREE.CylinderGeometry(r, r, w, 14), darkMat);
  tyre.rotation.x = Math.PI / 2;
  tyre.position.set(x, r, z);
  tyre.castShadow = true;
  parent.add(tyre);
  // Bright white rim — basic material so the rims stay bright white in
  // the sunset light instead of turning pink from the hemisphere/fog.
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(r * rimFrac, r * rimFrac, w + 0.04, 10),
    new THREE.MeshBasicMaterial({ color: '#ffffff' }));
  rim.rotation.x = Math.PI / 2;
  rim.position.set(x, r, z);
  parent.add(rim);
  // White star spokes on the outer face.
  const spokeMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
  const faceX = x >= 0 ? x + w / 2 + 0.04 : x - w / 2 - 0.04;
  for (let k = 0; k < 5; k += 1) {
    const sp = new THREE.Mesh(new THREE.BoxGeometry(0.06, r * spokeLen, 0.2), spokeMat);
    sp.position.set(faceX, r, z);
    sp.rotation.x = (k * Math.PI) / 5;
    parent.add(sp);
  }
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.2, r * 0.2, w + 0.08, 8), darkMat);
  hub.rotation.x = Math.PI / 2;
  hub.position.set(x, r, z);
  parent.add(hub);
  return tyre;
}

function headlights(parent, zFront) {
  part(parent, 0.55, 0.35, 0.15, headMat, 0.65, 0.95, zFront);
  part(parent, 0.55, 0.35, 0.15, headMat, -0.65, 0.95, zFront);
  part(parent, 0.55, 0.3, 0.15, tailMat, 0.65, 0.95, -zFront);
  part(parent, 0.55, 0.3, 0.15, tailMat, -0.65, 0.95, -zFront);
  // Headlight beams: two faint warm cones so the lamps read as ON at dusk.
  for (const sx of [0.65, -0.65]) {
    const beam = new THREE.Mesh(
      new THREE.ConeGeometry(1.0, 6, 10, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xffe9a0, transparent: true, opacity: 0.09, side: THREE.DoubleSide, depthWrite: false }),
    );
    beam.rotation.x = Math.PI / 2;
    beam.position.set(sx, 0.9, zFront + 3);
    parent.add(beam);
  }
}

export function makeCar(color, opts = {}) {
  const g = new THREE.Group();
  const type = opts.type || 'sedan';
  const bodyMat = new THREE.MeshPhongMaterial({ color, shininess: 70, specular: 0x999988 });
  const wheels = [];
  if (type === 'sports') {
    // Garuda GT — a lofted wedge sports car in gold (#ffb400, "Kencana"
    // means gold): low wide body, double white hood stripes, white
    // star rims, big spoiler, open convertible with the driver visible.
    // Proportions: 5.7 long, 2.3 wide, body only ~0.9 tall; wheels
    // (r 0.45) are big vs the body and tucked flush under flares — a
    // tall flat box with towering wheels reads as a toy, this does not.
    const sportMat = new THREE.MeshPhongMaterial({ color, shininess: 220, specular: 0xffe9a0 });
    const stripeMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
    // Lofted body: pointed low nose rising to the cowl, wide rear deck.
    loftBody(g, [
      { z: 3.05, w: 0.58, y0: 0.27, y1: 0.50 },
      { z: 2.75, w: 0.89, y0: 0.23, y1: 0.56 },
      { z: 1.90, w: 1.07, y0: 0.20, y1: 0.64 },
      { z: 1.00, w: 1.15, y0: 0.18, y1: 0.73 },
      { z: 0.20, w: 1.20, y0: 0.18, y1: 0.81 },
      { z: -0.80, w: 1.21, y0: 0.18, y1: 0.78 },
      { z: -1.90, w: 1.18, y0: 0.18, y1: 0.76 },
      { z: -2.60, w: 1.13, y0: 0.20, y1: 0.80 },
      { z: -2.85, w: 1.07, y0: 0.24, y1: 0.78 },
    ], sportMat);
    // Double white stripes down the long hood, following its slope.
    for (const sx of [-0.32, 0.32]) {
      const st = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.04, 2.5), stripeMat);
      st.position.set(sx, 0.70, 1.55); st.rotation.x = 0.16; g.add(st);
    }
    // White side stripes, both flanks.
    part(g, 0.06, 0.16, 4.4, stripeMat, 1.21, 0.55, 0);
    part(g, 0.06, 0.16, 4.4, stripeMat, -1.21, 0.55, 0);
    // Fender flares over the wheels (wheels sit flush under them).
    for (const [fx, fz, fy] of [[1.14, 1.75, 0.72], [-1.14, 1.75, 0.72], [1.14, -1.75, 0.78], [-1.14, -1.75, 0.78]]) {
      part(g, 0.45, 0.20, 1.10, sportMat, fx, fy, fz);
    }
    // Side skirts + front splitter + rear diffuser with fins.
    part(g, 0.08, 0.18, 4.60, darkMat, 1.22, 0.28, 0);
    part(g, 0.08, 0.18, 4.60, darkMat, -1.22, 0.28, 0);
    part(g, 2.10, 0.10, 0.50, darkMat, 0, 0.20, 2.80);       // splitter
    part(g, 1.90, 0.20, 0.40, darkMat, 0, 0.28, -2.70);      // diffuser
    for (const sx of [-0.6, -0.2, 0.2, 0.6]) part(g, 0.06, 0.22, 0.42, darkMat, sx, 0.28, -2.72);
    // Convertible cockpit: dark tub, raked windshield, seats, roll bar.
    part(g, 1.70, 0.14, 1.90, darkMat, 0, 0.80, -0.70);      // tub
    const shield = new THREE.Mesh(new THREE.BoxGeometry(1.70, 0.72, 0.08), glassMat);
    shield.position.set(0, 1.00, -0.05); shield.rotation.x = -0.45; shield.castShadow = true; g.add(shield);
    part(g, 0.70, 0.50, 0.50, darkMat, 0.45, 0.92, -0.75);   // seats
    part(g, 0.70, 0.50, 0.50, darkMat, -0.45, 0.92, -0.75);
    part(g, 0.40, 0.28, 0.15, darkMat, 0.45, 1.20, -0.95);   // headrests
    part(g, 0.40, 0.28, 0.15, darkMat, -0.45, 1.20, -0.95);
    part(g, 1.60, 0.18, 0.22, darkMat, 0, 1.16, -1.55);      // roll bar
    part(g, 0.12, 0.45, 0.12, darkMat, 0.72, 0.98, -1.55);
    part(g, 0.12, 0.45, 0.12, darkMat, -0.72, 0.98, -1.55);
    // Black roof panel over the rear of the cockpit: sits behind the
    // driver, so the driver stays visible from the chase camera.
    const roofMat = new THREE.MeshPhongMaterial({ color: '#111111', shininess: 80 });
    part(g, 1.70, 0.10, 0.75, roofMat, 0, 1.22, -1.40);
    // Seated driver, visible when the player is driving (hidden when
    // the car is parked empty — toggled by main.js via userData.driver).
    const driverG = new THREE.Group();
    const dSkin = new THREE.MeshLambertMaterial({ color: '#c9a184' });
    const dShirt = new THREE.MeshLambertMaterial({ color: '#ff5a1a' });
    part(driverG, 0.72, 0.55, 0.48, dShirt, -0.45, 1.08, -0.70); // torso
    part(driverG, 0.52, 0.52, 0.48, dSkin, -0.45, 1.46, -0.70);  // head
    part(driverG, 0.52, 0.20, 0.48, darkMat, -0.45, 1.70, -0.70); // hair
    part(driverG, 0.48, 0.12, 0.10, darkMat, -0.45, 1.48, -0.44); // sunglasses
    part(driverG, 0.20, 0.20, 0.70, dShirt, -0.68, 1.16, -0.30); // arms to wheel
    part(driverG, 0.20, 0.20, 0.70, dShirt, -0.22, 1.16, -0.30);
    const swheel = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.30, 0.08, 12), darkMat);
    swheel.rotation.x = 1.1; swheel.position.set(-0.45, 1.16, -0.12); driverG.add(swheel);
    driverG.visible = false;
    g.add(driverG);
    g.userData.driver = driverG;
    // Big rear spoiler: blade + end plates on two struts.
    const blade = part(g, 2.45, 0.10, 0.65, sportMat, 0, 1.18, -2.70);
    blade.rotation.x = 0.10;
    part(g, 0.08, 0.45, 0.65, sportMat, 1.25, 1.06, -2.70);   // end plates
    part(g, 0.08, 0.45, 0.65, sportMat, -1.25, 1.06, -2.70);
    part(g, 0.12, 0.45, 0.12, darkMat, 0.80, 0.96, -2.70);   // struts
    part(g, 0.12, 0.45, 0.12, darkMat, -0.80, 0.96, -2.70);
    // Twin chrome exhausts.
    for (const sx of [-0.35, 0.35]) {
      const ex = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.30, 8), chromeMat);
      ex.rotation.x = Math.PI / 2; ex.position.set(sx, 0.35, -2.88); g.add(ex);
    }
    // White square headlights + black grille on the nose face.
    part(g, 0.70, 0.20, 0.10, new THREE.MeshBasicMaterial({ color: '#ffffff' }), 0.66, 0.42, 3.06);
    part(g, 0.70, 0.20, 0.10, new THREE.MeshBasicMaterial({ color: '#ffffff' }), -0.66, 0.42, 3.06);
    part(g, 1.10, 0.12, 0.08, darkMat, 0, 0.38, 3.06);        // grille slot
    part(g, 2.10, 0.16, 0.10, chromeMat, 0, 0.32, 3.06);      // front bumper blade
    // Full-width red taillight bar.
    part(g, 2.10, 0.18, 0.10, tailMat, 0, 0.62, -2.86);
    // Headlight beams: two faint warm cones so the lamps read as ON at dusk.
    for (const sx of [0.66, -0.66]) {
      const beam = new THREE.Mesh(
        new THREE.ConeGeometry(1.0, 6, 10, 1, true),
        new THREE.MeshBasicMaterial({ color: 0xffe9a0, transparent: true, opacity: 0.09, side: THREE.DoubleSide, depthWrite: false }),
      );
      beam.rotation.x = Math.PI / 2;
      beam.position.set(sx, 0.42, 3.06 + 3);
      g.add(beam);
    }
    // Big wheels, tucked flush: wide rears, narrower fronts, big
    // white star rims (rim fraction 0.72).
    wheels.push(wheel(g, 1.06, 1.75, 0.45, 0.34, 0.72, 1.30), wheel(g, -1.06, 1.75, 0.45, 0.34, 0.72, 1.30),
      wheel(g, 1.08, -1.75, 0.45, 0.44, 0.72, 1.30), wheel(g, -1.08, -1.75, 0.45, 0.44, 0.72, 1.30));
  } else if (type === 'truck') {
    // Tall cab up front, big canvas-covered cargo box behind.
    part(g, 2.1, 1.5, 1.4, bodyMat, 0, 1.35, 1.5);           // cab
    part(g, 1.9, 0.9, 1.1, glassMat, 0, 1.9, 1.55);          // windshield
    part(g, 2.2, 2.2, 2.8, new THREE.MeshPhongMaterial({ color: '#7a6a55', shininess: 20 }), 0, 1.7, -0.9); // cargo box
    part(g, 2.25, 0.25, 2.85, darkMat, 0, 2.85, -0.9);       // cargo roof rail
    part(g, 2.15, 0.3, 0.2, chromeMat, 0, 0.6, 2.22);
    part(g, 2.15, 0.3, 0.2, chromeMat, 0, 0.6, -2.32);
    headlights(g, 2.22);
    wheels.push(wheel(g, 1.05, 1.5, 0.68, 0.5), wheel(g, -1.05, 1.5, 0.68, 0.5), wheel(g, 1.05, -1.4, 0.68, 0.5), wheel(g, -1.05, -1.4, 0.68, 0.5));
  } else if (type === 'van') {
    // Tall boxy van with a big side window band.
    part(g, 2.1, 1.9, 4.4, bodyMat, 0, 1.45, 0);
    part(g, 2.12, 0.7, 2.6, glassMat, 0, 1.9, 0.2);          // window band
    part(g, 1.9, 0.5, 0.15, glassMat, 0, 1.9, 2.21);         // windshield
    part(g, 2.15, 0.3, 0.2, chromeMat, 0, 0.55, 2.22);
    part(g, 2.15, 0.3, 0.2, chromeMat, 0, 0.55, -2.22);
    headlights(g, 2.22);
    wheels.push(wheel(g, 1.0, 1.45, 0.55, 0.42), wheel(g, -1.0, 1.45, 0.55, 0.42), wheel(g, 1.0, -1.45, 0.55, 0.42), wheel(g, -1.0, -1.45, 0.55, 0.42));
  } else if (type === 'taxi') {
    // Sedan silhouette + yellow paint, roof sign and black side band.
    part(g, 2.0, 0.85, 4.4, bodyMat, 0, 0.78, 0);
    part(g, 1.75, 0.70, 2.1, glassMat, 0, 1.50, -0.2);       // cabin
    part(g, 1.1, 0.45, 1.4, bodyMat, 0, 0.68, -1.55);        // trunk
    part(g, 2.02, 0.35, 4.42, new THREE.MeshPhongMaterial({ color: 0x1a1a1a, shininess: 30 }), 0, 0.95, 0); // side band
    part(g, 0.9, 0.35, 0.5, new THREE.MeshBasicMaterial({ color: 0xffd24d }), 0, 2.0, -0.2); // TAXI roof sign
    part(g, 2.05, 0.3, 0.2, chromeMat, 0, 0.55, 2.22);
    part(g, 2.05, 0.3, 0.2, chromeMat, 0, 0.55, -2.22);
    headlights(g, 2.22);
    wheels.push(wheel(g, 0.98, 1.4, 0.5, 0.4), wheel(g, -0.98, 1.4, 0.5, 0.4), wheel(g, 0.98, -1.4, 0.5, 0.4), wheel(g, -0.98, -1.4, 0.5, 0.4));
  } else {
    // Sedan (default + police): lower, wider stance so it reads as a
    // car, not a tall box; cabin sits lower too.
    part(g, 2.0, 0.85, 4.4, bodyMat, 0, 0.78, 0);
    part(g, 1.75, 0.70, 2.1, glassMat, 0, 1.50, -0.2);       // cabin
    part(g, 1.1, 0.45, 1.4, bodyMat, 0, 0.68, -1.55);        // trunk
    if (opts.police) {
      part(g, 2.02, 0.4, 2.2, new THREE.MeshPhongMaterial({ color: '#2a5fd1', shininess: 40 }), 0, 0.95, -0.2); // blue doors
      part(g, 1.2, 0.35, 1.0, new THREE.MeshPhongMaterial({ color: '#2a5fd1' }), 0, 1.95, -0.2); // light bar base
      const lbR = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.3, 0.6), new THREE.MeshBasicMaterial({ color: '#ff3b30' }));
      lbR.position.set(-0.35, 2.15, -0.2); lbR.name = 'lightbar'; g.add(lbR);
      const lbB = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.3, 0.6), new THREE.MeshBasicMaterial({ color: '#3b7bff' }));
      lbB.position.set(0.35, 2.15, -0.2); g.add(lbB);
    }
    part(g, 2.05, 0.3, 0.2, chromeMat, 0, 0.55, 2.22);
    part(g, 2.05, 0.3, 0.2, chromeMat, 0, 0.55, -2.22);
    part(g, 1.2, 0.3, 0.12, darkMat, 0, 0.9, 2.22);          // grille
    headlights(g, 2.22);
    wheels.push(wheel(g, 0.98, 1.4, 0.5, 0.4), wheel(g, -0.98, 1.4, 0.5, 0.4), wheel(g, 0.98, -1.4, 0.5, 0.4), wheel(g, -0.98, -1.4, 0.5, 0.4));
  }
  // Shared detail on every car: side mirrors + licence plates, so cars
  // read as finished vehicles instead of plain boxes.
  const zF = type === 'sports' ? 3.05 : 2.22;
  const mirrorZ = type === 'sports' ? 0.35 : 1.3;
  const mirrorX = type === 'sports' ? 1.30 : 1.1;
  const mirrorY = type === 'sports' ? 1.08 : 1.25;
  const plateY = type === 'sports' ? 0.38 : 0.5;
  const plateH = type === 'sports' ? 0.20 : 0.28;
  part(g, 0.25, 0.2, 0.4, darkMat, mirrorX, mirrorY, mirrorZ);
  part(g, 0.25, 0.2, 0.4, darkMat, -mirrorX, mirrorY, mirrorZ);
  const plateMat = new THREE.MeshBasicMaterial({ color: '#f5f5e8' });
  part(g, 0.9, plateH, 0.08, plateMat, 0, plateY, zF + 0.02);
  part(g, 0.9, plateH, 0.08, plateMat, 0, plateY, -zF - 0.02);
  if (type === 'sports') blobShadow(g, 1.7, 3.3);
  else blobShadow(g, 1.5, 2.6);
  g.userData.wheels = wheels;
  g.userData.carType = type;
  return g;
}

export function makeHelicopter() {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshPhongMaterial({ color: '#2a2f45', shininess: 60 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2, 5), bodyMat);
  body.position.y = 1; body.castShadow = true; g.add(body);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.1, 1.4), glassMat);
  glass.position.set(0, 1.2, 2.0); g.add(glass);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 5), bodyMat);
  tail.position.set(0, 1.4, -4.5); tail.castShadow = true; g.add(tail);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.6, 1.0), bodyMat);
  fin.position.set(0, 2.2, -6.6); g.add(fin);
  const rotor = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.15, 11), new THREE.MeshPhongMaterial({ color: '#111' }));
  rotor.position.y = 2.4; rotor.name = 'rotor'; g.add(rotor);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.8, 6), darkMat);
  mast.position.y = 2.1; g.add(mast);
  // Red / green navigation lights on the skids.
  const navR = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 6), new THREE.MeshBasicMaterial({ color: '#ff3b30' }));
  navR.position.set(1.3, 0.2, 1.5); g.add(navR);
  const navG = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 6), new THREE.MeshBasicMaterial({ color: '#3bff7a' }));
  navG.position.set(-1.3, 0.2, 1.5); g.add(navG);
  const spot = new THREE.Mesh(new THREE.ConeGeometry(6, 30, 12, 1, true), new THREE.MeshBasicMaterial({ color: '#fff8c0', transparent: true, opacity: 0.22, side: THREE.DoubleSide }));
  spot.position.y = -14; spot.rotation.x = Math.PI; g.add(spot);
  return g;
}

// Arcade driving: speed + heading, drift when steering hard at speed.
export function createDriver(car) {
  return {
    speed: 0, heading: 0, drift: 0, hp: CAR.hp,
    step(dt, throttle, steer) {
      const accel = throttle > 0 ? CAR.accel * throttle : throttle < 0 ? -CAR.brake : 0;
      this.speed += accel * dt;
      if (throttle === 0) this.speed *= Math.max(0, 1 - 1.4 * dt);
      this.speed = Math.max(-CAR.reverseMax, Math.min(CAR.maxSpeed, this.speed));
      const turnRate = CAR.turn * steer * Math.min(1, Math.abs(this.speed) / 8) * (this.speed < 0 ? -1 : 1);
      this.heading += turnRate * dt;
      this.drift = Math.abs(steer) > 0.7 && Math.abs(this.speed) > 22 ? Math.min(3, this.drift + dt) : Math.max(0, this.drift - dt * 2);
      car.position.x += Math.sin(this.heading) * this.speed * dt;
      car.position.z += Math.cos(this.heading) * this.speed * dt;
      car.rotation.y = this.heading;
      const wob = this.drift > 0.5 ? Math.sin(performance.now() / 90) * 0.05 * this.drift : 0;
      car.rotation.z = wob;
    },
  };
}
