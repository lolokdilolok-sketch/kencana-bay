// Thin helpers over the vendored Three.js module: canvas textures and the
// lofted-body geometry used by the cars.
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
 * The cross-section is a hexagon (flat bottom, sloped shoulders, flat top),
 * which reads as a sculpted car body under flat shading.
 */
export function loftGeometry(sections, segments = 1) {
  const positions = [];
  const indices = [];
  const ring = 6; // bottom-left, bottom-right, mid-right, top-right, top-left, mid-left
  for (let i = 0; i < sections.length; i += 1) {
    const s = sections[i];
    const hw = s.w / 2;
    const pts = [
      [-hw * 0.72, s.y0], [hw * 0.72, s.y0],
      [hw, s.y0 + (s.y1 - s.y0) * 0.45], [hw * 0.62, s.y1],
      [-hw * 0.62, s.y1], [-hw, s.y0 + (s.y1 - s.y0) * 0.45],
    ];
    for (const p of pts) positions.push(p[0], p[1], s.z);
  }
  const n = sections.length;
  for (let i = 0; i < n - 1; i += 1) {
    for (let j = 0; j < ring; j += 1) {
      const a = i * ring + j;
      const b = i * ring + ((j + 1) % ring);
      const c = (i + 1) * ring + j;
      const d = (i + 1) * ring + ((j + 1) % ring);
      indices.push(a, c, b, b, c, d);
    }
  }
  // Caps: nose fan and tail fan.
  const nose = positions.length / 3;
  positions.push(0, (sections[0].y0 + sections[0].y1) / 2, sections[0].z);
  for (let j = 0; j < ring; j += 1) indices.push(nose, (j + 1) % ring, j);
  const tail = positions.length / 3;
  const last = (n - 1) * ring;
  positions.push(0, (sections[n - 1].y0 + sections[n - 1].y1) / 2, sections[n - 1].z);
  for (let j = 0; j < ring; j += 1) indices.push(tail, last + j, last + ((j + 1) % ring));
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
