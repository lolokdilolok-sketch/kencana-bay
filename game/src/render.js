// Rendering only: Three.js renderer, strong warm sunset lights, fog and
// the chase camera. One job: pixels out, no rules in here.
import { THREE } from './three-shim.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_MAP = 'map';

export function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  // Real long sunset shadows: one shadow-casting sun, PCF soft.
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  // Warm sunset haze, far enough that the city never flattens out.
  scene.fog = new THREE.Fog(0xff9ab5, 180, 850);
  // Hemisphere: warm orange sky light, violet bounce from the ground so
  // shadow sides stay readable instead of pitch black. ULTRA HD bright:
  // strong lights so nothing reads dark or muddy.
  const hemi = new THREE.HemisphereLight(0xffc07a, 0x4a2a6a, 1.9);
  scene.add(hemi);
  scene.add(new THREE.AmbientLight(0x8a6ab0, 0.95));
  // Low sun over the sea (west, -x): orange-pink, strong, so every
  // building and car has a bright sunset face and a clear shadow side.
  const sun = new THREE.DirectionalLight(0xff8a3d, 3.6);
  sun.position.set(-260, 110, -180);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -160; sun.shadow.camera.right = 160;
  sun.shadow.camera.top = 160; sun.shadow.camera.bottom = -160;
  sun.shadow.camera.near = 10; sun.shadow.camera.far = 900;
  sun.shadow.bias = -0.0006;
  scene.add(sun);
  scene.add(sun.target);
  const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 2000);
  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();
  return {
    scene, camera, renderer,
    follow(target, heading, distance, height, lookHeight, side = 0) {
      // Chase camera: behind the target, optionally shifted to the side
      // so the car is seen three-quarter (flank + rear) instead of dead
      // behind, where a sports car reads as a flat box. A side offset
      // makes the wedge, side stripe, white rims and spoiler visible.
      const fx = Math.sin(heading), fz = Math.cos(heading);
      const rx = Math.cos(heading), rz = -Math.sin(heading);
      const cx = target.x - fx * distance + rx * side;
      const cz = target.z - fz * distance + rz * side;
      camera.position.set(cx, height, cz);
      camera.lookAt(target.x, lookHeight, target.z);
      // Keep the shadow frustum centred on the player so shadows stay
      // crisp wherever the chase goes.
      sun.position.set(target.x - 260, 110, target.z - 180);
      sun.target.position.set(target.x, 0, target.z);
      sun.target.updateMatrixWorld();
    },
    draw() { renderer.render(scene, camera); },
  };
}
