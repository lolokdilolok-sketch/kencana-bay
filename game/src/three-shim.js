// Round 20: no shim change — the wedge uses the existing crown-0 / tumble loft as-is; this line is written in the round 20 recorded session.
// Thin helpers over the vendored Three.js module: canvas textures and the
// lofted-body geometry used by the cars.
// Round 15: the shim itself is unchanged — the golden-hour glow textures
// (vehicles.js, garage.js) and the facade emissive maps (world.js) are
// plain canvas textures built on top of canvasTexture() here.
// Round 16: the shim is unchanged again — the new beam cylinders and enemy markers in shots.js are plain meshes built on the same THREE import.
import * as THREE from '../vendor/three.module.min.js';

export { THREE };

/** A canvas turned into a texture, with the colour space the renderer expects. */
export function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/**
 * Build a body from cross-sections: each section is { z, w, y0, y1 } — the
 * width and the bottom/top height of the body at that point along its length.
 * Round 18: the cross-section is a rounded box (flat bottom, rounded
 * corners, narrower top — the tumble that pulls the greenhouse in),
 * smooth-shaded, with flat end caps. A section may carry its own
 * `tumble` (the glasshouse uses a big one).
 * Round 19: a section may also carry `crown` — the top is no longer a
 * flat chord between the two upper corner arcs but a shallow dome
 * (a (1-k^2)^2 profile, zero slope at the joins, so it meets the arcs
 * smoothly). A crowned deck / hood is curved across, not a table:
 * the R18 Garuda's flat 1.1u-wide deck top is what read as a table
 * from the chase camera, and no section count or tumble fixes that —
 * only a domed cross-section does. Crown defaults to 0 (flat top),
 * so every old caller is unaffected unless it opts in.
 */
export function loftGeometry(sections, segments = 24) {
  // Resample the section list at evenly spaced z values, cosine-blending
  // width / floor / top between neighbouring sections (no overshoot).
  const zs = sections.map((s) => s.z);
  const zMin = Math.min(...zs);
  const zMax = Math.max(...zs);
  const sorted = [...sections].sort((a, b) => b.z - a.z); // nose (+z) first
  // Round 18b: a section's `tumble` is part of its shape — the old
  // sampler dropped it, so every resampled ring silently fell back to
  // the default and the glasshouse / roof / police hood lofts (which
  // specify their own tumble) came out narrower / wider than designed.
  // Interpolate it like w / y0 / y1, with the same default as ringPts.
  // Round 19: same for `crown` — a resampled ring must keep the dome
  // of its neighbours, or the deck would flatten between sections.
  const tumbleOf = (s) => s.tumble ?? s.w * 0.14;
  const crownOf = (s) => s.crown ?? 0;
  const sample = (z) => {
    if (z >= sorted[0].z) return sorted[0];
    if (z <= sorted[sorted.length - 1].z) return sorted[sorted.length - 1];
    for (let i = 0; i < sorted.length - 1; i += 1) {
      const a = sorted[i];
      const b = sorted[i + 1];
      if (z <= a.z && z >= b.z) {
        const t = (a.z - z) / (a.z - b.z);
        const s = (1 - Math.cos(t * Math.PI)) / 2;
        return {
          z,
          w: a.w + (b.w - a.w) * s,
          y0: a.y0 + (b.y0 - a.y0) * s,
          y1: a.y1 + (b.y1 - a.y1) * s,
          tumble: tumbleOf(a) + (tumbleOf(b) - tumbleOf(a)) * s,
          crown: crownOf(a) + (crownOf(b) - crownOf(a)) * s,
        };
      }
    }
    return sorted[sorted.length - 1];
  };
  const rings = [];
  for (let i = 0; i <= segments; i += 1) {
    rings.push(sample(zMax - ((zMax - zMin) * i) / segments));
  }
  const positions = [];
  const indices = [];
  // Round 18: the cross-section is a ROUNDED box, not the old 8-point
  // flat-top slab — flat bottom, rounded lower corners (rb), straight
  // flanks, rounded upper corners (rt) and a narrower flat top (the
  // tumble pulls the top in, like a real car body). A section may carry
  // its own `tumble`; otherwise it defaults to 14% of its width. The
  // top is a short flat between the two upper corner arcs, so the deck
  // reads as a curved surface instead of a table.
  // Round 19: with `crown` the top is a DOME, not that short flat —
  // four points ride a (1-k^2)^2 profile from the arc ends (k=1, at
  // y1) up to the centre (k=0, at y1+crown), zero slope at both ends,
  // so the dome meets the corner arcs without a crease. With crown 0
  // the four points are collinear at y1 and the ring is the round-18
  // one, bit for bit.
  const ringPts = (s) => {
    const hw = s.w / 2;
    const h = Math.max(0.001, s.y1 - s.y0);
    let rb = 0.07;
    let rt = 0.14;
    const k = Math.min(1, h / (rb + rt));
    rb *= k;
    rt *= k;
    const tumble = s.tumble ?? s.w * 0.14;
    const wt = Math.max(0.02, hw - tumble);
    const crown = s.crown ?? 0;
    const SEG = 4;
    const pts = [[0, s.y0]];
    for (let i = 0; i <= SEG; i += 1) {
      const a = -Math.PI / 2 + (i / SEG) * (Math.PI / 2);
      pts.push([hw - rb + Math.cos(a) * rb, s.y0 + rb + Math.sin(a) * rb]);
    }
    for (let i = 0; i <= SEG; i += 1) {
      const a = (i / SEG) * (Math.PI / 2);
      pts.push([wt - rt + Math.cos(a) * rt, s.y1 - rt + Math.sin(a) * rt]);
    }
    const aTop = wt - rt;
    for (const kk of [0.75, 0.5, 0.25, 0]) {
      pts.push([aTop * kk, s.y1 + crown * (1 - kk * kk) * (1 - kk * kk)]);
    }
    const right = pts.slice(1, -1);
    for (let i = right.length - 1; i >= 0; i -= 1) pts.push([-right[i][0], right[i][1]]);
    return pts;
  };
  const ring = ringPts(rings[0]).length;
  for (const s of rings) {
    for (const p of ringPts(s)) positions.push(p[0], p[1], s.z);
  }
  const n = rings.length;
  for (let i = 0; i < n - 1; i += 1) {
    for (let j = 0; j < ring; j += 1) {
      const a = i * ring + j;
      const b = i * ring + ((j + 1) % ring);
      const c = (i + 1) * ring + j;
      const d2 = (i + 1) * ring + ((j + 1) % ring);
      indices.push(a, c, b, b, c, d2);
    }
  }
  // Caps: nose fan and tail fan.
  // Round 20: BOTH fans had their winding backwards — the ring is
  // counterclockwise seen from +z, so (centre, j, j+1) faces +z and
  // (centre, j+1, j) faces -z. The nose cap used (centre, j+1, j)
  // (normal -z, INTO the car) and the tail cap used (centre, j, j+1)
  // (normal +z, also INTO the car): both caps were backface-culled,
  // and every lofted car showed its dark hollow interior as a big
  // black slab at the nose and the tail (the R19 garage shot's black
  // nose slab and the chase shot's dark tail face were exactly this).
  // Flipped: nose faces +z, tail faces -z, both gold like the body.
  const nose = positions.length / 3;
  positions.push(0, (rings[0].y0 + rings[0].y1) / 2, rings[0].z);
  for (let j = 0; j < ring; j += 1) indices.push(nose, j, (j + 1) % ring);
  const tail = positions.length / 3;
  const last = (n - 1) * ring;
  positions.push(0, (rings[n - 1].y0 + rings[n - 1].y1) / 2, rings[n - 1].z);
  for (let j = 0; j < ring; j += 1) indices.push(tail, last + ((j + 1) % ring), last + j);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

export function box(w, h, d, color, opts = {}) {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color, roughness: opts.rough ?? 0.85, metalness: opts.metal ?? 0.05, emissive: opts.glow ?? 0x000000, emissiveIntensity: opts.glow ? 1 : 0 }),
  );
  m.castShadow = opts.shadow !== false;
  m.receiveShadow = !!opts.receive;
  return m;
}

export function cylinder(rt, rb, h, color, opts = {}) {
  const m = new THREE.Mesh(
    new THREE.CylinderGeometry(rt, rb, h, opts.seg ?? 14),
    new THREE.MeshStandardMaterial({ color, roughness: opts.rough ?? 0.7, metalness: opts.metal ?? 0.1, transparent: !!opts.glass, opacity: opts.glass ? 0.55 : 1 }),
  );
  m.castShadow = opts.shadow !== false;
  return m;
}
