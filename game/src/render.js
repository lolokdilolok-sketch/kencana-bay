// Drawing only: the Three.js renderer, the sunset scene, and the cameras. The world, the
// vehicles and the HUD own their own state; this file only paints what it is handed. Camera
// modes: title (beach postcard), chase (close three-quarter rear, the shot that sells the car),
// foot (third person behind the wheelman), garage (inside the workshop). A gradient sky dome
// and warm fog give the whole city one sun-soaked look.

import { THREE } from './three-shim.js';
import { SUNSET } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

function makeSkyTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 4;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#7a3fa0');
  grad.addColorStop(0.45, '#ff8a5c');
  grad.addColorStop(0.75, '#ffc46b');
  grad.addColorStop(1, '#ffe9a8');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 4, 256);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeSunSprite() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,240,200,1)');
  grad.addColorStop(0.35, 'rgba(255,180,90,0.9)');
  grad.addColorStop(1, 'rgba(255,140,60,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(1);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(SUNSET.fogColor, SUNSET.fogNear, SUNSET.fogFar);
  scene.background = makeSkyTexture();

  const sun = new THREE.DirectionalLight(SUNSET.sunColor, SUNSET.sunIntensity);
  sun.position.set(-260, 190, -140);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -420;
  sun.shadow.camera.right = 420;
  sun.shadow.camera.top = 420;
  sun.shadow.camera.bottom = -420;
  sun.shadow.camera.far = 900;
  sun.shadow.bias = -0.0004;
  scene.add(sun);

  const hemi = new THREE.HemisphereLight(SUNSET.hemiSky, SUNSET.hemiGround, SUNSET.hemiIntensity);
  scene.add(hemi);
  const ambient = new THREE.AmbientLight(0xffe0b8, SUNSET.ambient);
  scene.add(ambient);

  const sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: makeSunSprite(), transparent: true, depthWrite: false, fog: false,
  }));
  sunSprite.position.set(-700, 260, -420);
  sunSprite.scale.set(320, 320, 1);
  scene.add(sunSprite);

  const camera = new THREE.PerspectiveCamera(58, 16 / 9, 0.1, 2400);

  // Camera smoothing state, so cuts never snap.
  const cam = { pos: new THREE.Vector3(0, 40, 120), look: new THREE.Vector3(0, 0, 0) };

  function resize(width, height) {
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  function lookAtSmooth(targetPos, targetLook, dt, snap) {
    if (snap) {
      cam.pos.copy(targetPos);
      cam.look.copy(targetLook);
    } else {
      const k = 1 - Math.exp(-6 * dt);
      cam.pos.lerp(targetPos, k);
      cam.look.lerp(targetLook, k);
    }
    camera.position.copy(cam.pos);
    camera.lookAt(cam.look);
  }

  const tmp = new THREE.Vector3();

  /** Chase camera: close three-quarter rear — behind the car, offset to the side, so the
   * car fills the frame and the road ahead reads. */
  function chaseCamera(car, dt, snap) {
    const forward = new THREE.Vector3(Math.sin(car.heading), 0, Math.cos(car.heading));
    const side = new THREE.Vector3(Math.cos(car.heading), 0, -Math.sin(car.heading));
    // Pulled back from the v7 framing: the whole Garuda stays in frame, big, with the
    // road and the helicopter ahead still visible.
    const pos = new THREE.Vector3(car.x, 0, car.z)
      .addScaledVector(forward, -13)
      .addScaledVector(side, 6.5);
    pos.y = 5.2;
    // Look a little above the car's roofline so a low police helicopter ahead stays in frame.
    tmp.set(car.x, 2.4, car.z).addScaledVector(forward, 10);
    lookAtSmooth(pos, tmp, dt, snap);
  }

  /** Foot camera: behind the wheelman, close, looking where he faces — he fills the
   * frame, the street and the car beside him read behind him. */
  function footCamera(player, dt, snap) {
    const forward = new THREE.Vector3(Math.sin(player.heading), 0, Math.cos(player.heading));
    const pos = new THREE.Vector3(player.x, 0, player.z).addScaledVector(forward, -5.0);
    pos.y = 2.4;
    tmp.set(player.x, 1.4, player.z).addScaledVector(forward, 5);
    lookAtSmooth(pos, tmp, dt, snap);
  }

  /** Title camera: close on the car and the wheelman in the lower foreground, the ferris
   * wheel, beach and sea behind them — the postcard backdrop. The look point sits ahead
   * of the car toward the ferris wheel, so the wheel is in frame left and the car and the
   * man stay big together on the right. */
  function titleCamera(car, wheelman, dt, snap) {
    const pos = new THREE.Vector3(car.x + 7, 2.6, car.z + 9);
    tmp.set(car.x - 6, 1.6, car.z - 12);
    if (wheelman) tmp.lerp(new THREE.Vector3(wheelman.x, 1.6, wheelman.z), 0.3);
    lookAtSmooth(pos, tmp, dt, snap);
  }

  /** Garage camera: inside the workshop (the front wall culls from outside), looking at
   * the car on the lift — the panel is docked to the left of the screen, so the car sits
   * in the clear right half. */
  function garageCamera(room, dt, snap) {
    const pos = new THREE.Vector3(room.x - 9, 4.5, room.z + 6);
    tmp.set(room.x, 2.0, room.z - 1);
    lookAtSmooth(pos, tmp, dt, snap);
  }

  function render() {
    renderer.render(scene, camera);
  }

  return {
    renderer, scene, camera,
    resize, render, chaseCamera, footCamera, titleCamera, garageCamera,
    snapCamera() {
      cam.pos.set(0, 40, 120);
      cam.look.set(0, 0, 0);
    },
  };
}
