// Drawing only: the Three.js scene, the sun, the sky and the cameras.
// The HUD is DOM (hud.js); this module paints the 3D world and moves the
// camera. Cameras: a close three-quarter chase cam, an over-shoulder foot
// cam, a slow orbit for the title poster, a fixed interior cam for the
// garage, and a high view behind the transparent map.
import { THREE } from './three-shim.js';
import { PALETTE } from './config.js';

function skyMaterial(night) {
  const top = night ? PALETTE.nightSkyTop : PALETTE.sunsetSkyTop;
  const mid = night ? PALETTE.nightSkyMid : PALETTE.sunsetSkyMid;
  const low = night ? PALETTE.nightSkyLow : PALETTE.sunsetSkyLow;
  return new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      top: { value: new THREE.Color(top) },
      mid: { value: new THREE.Color(mid) },
      low: { value: new THREE.Color(low) },
    },
    vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `varying vec3 vP; uniform vec3 top; uniform vec3 mid; uniform vec3 low;
      void main(){
        float h = normalize(vP).y;
        vec3 c = h > 0.25 ? mix(mid, top, smoothstep(0.25, 0.9, h)) : mix(low, mid, smoothstep(-0.08, 0.25, h));
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
}

export function createRender(canvas, worldGroup) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  const scene = new THREE.Scene();
  scene.add(worldGroup);
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1500, 24, 16), skyMaterial(false));
  scene.add(sky);
  scene.fog = new THREE.Fog(0xe06a9a, 150, 900);

  const sun = new THREE.DirectionalLight(0xff8a3d, 3.1);
  sun.position.set(-260, 180, -120);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -160;
  sun.shadow.camera.right = 160;
  sun.shadow.camera.top = 160;
  sun.shadow.camera.bottom = -160;
  sun.shadow.camera.far = 900;
  sun.shadow.bias = -0.0004;
  scene.add(sun);
  scene.add(sun.target);
  const hemi = new THREE.HemisphereLight(0xffb3d0, 0x3a2a4a, 1.5);
  scene.add(hemi);
  const amb = new THREE.AmbientLight(0xffe0c0, 0.55);
  scene.add(amb);
  // A big low sun disc on the horizon, west over the sea.
  const sunDisc = new THREE.Mesh(
    new THREE.CircleGeometry(46, 32),
    new THREE.MeshBasicMaterial({ color: '#ffd94d', fog: false }),
  );
  sunDisc.position.set(-900, 90, -100);
  sunDisc.lookAt(0, 60, 0);
  scene.add(sunDisc);
  // Moon for the night mode.
  const moon = new THREE.Mesh(
    new THREE.CircleGeometry(22, 24),
    new THREE.MeshBasicMaterial({ color: '#e8ecff', fog: false }),
  );
  moon.position.set(600, 320, -500);
  moon.lookAt(0, 60, 0);
  moon.visible = false;
  scene.add(moon);

  const camera = new THREE.PerspectiveCamera(62, 1280 / 720, 0.5, 3000);
  camera.position.set(0, 30, 60);

  let night = false;
  let camMode = 'title';
  let camPos = new THREE.Vector3(0, 30, 60);
  let camLook = new THREE.Vector3(0, 0, 0);
  let titleT = 0;

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  function setNight(on) {
    night = on;
    sky.material = skyMaterial(on);
    sun.intensity = on ? 0.5 : 3.1;
    sun.color.set(on ? 0x8aa0ff : 0xff8a3d);
    hemi.intensity = on ? 0.5 : 1.5;
    amb.intensity = on ? 0.25 : 0.55;
    scene.fog.color.set(on ? 0x101a3a : 0xe06a9a);
    sunDisc.visible = !on;
    moon.visible = on;
    renderer.toneMappingExposure = on ? 1.0 : 1.15;
  }

  // Chase: three-quarter rear, close enough that the car is >= 1/4 of the
  // frame. Foot: over the shoulder. Title: slow orbit around the hero car.
  function updateCamera(dt, focus) {
    const f = focus || { x: 0, z: 0, heading: 0, speed: 0, y: 0 };
    const sin = Math.sin(f.heading || 0);
    const cos = Math.cos(f.heading || 0);
    let wantPos;
    let wantLook;
    if (camMode === 'chase') {
      // Close three-quarter rear: the car fills >= 1/4 of the frame
      // (dist 8.0 / side 4.0 / height 3.8, FOV 62).
      const dist = 8.0;
      const side = 4.0;
      const height = 3.8;
      wantPos = new THREE.Vector3(
        f.x - sin * dist - cos * side,
        (f.y || 0) + height,
        f.z - cos * dist + sin * side,
      );
      wantLook = new THREE.Vector3(f.x + sin * 8, (f.y || 0) + 1.2, f.z + cos * 8);
    } else if (camMode === 'foot' || camMode === 'combat') {
      const dist = camMode === 'combat' ? 6.5 : 5.5;
      wantPos = new THREE.Vector3(
        f.x - sin * dist - cos * 2.2,
        (f.y || 0) + 3.1,
        f.z - cos * dist + sin * 2.2,
      );
      wantLook = new THREE.Vector3(f.x + sin * 10, (f.y || 0) + 1.4, f.z + cos * 10);
    } else if (camMode === 'garage') {
      wantPos = new THREE.Vector3(f.x + 8.5, 3.4, f.z + 7.5);
      wantLook = new THREE.Vector3(f.x - 1, 1.6, f.z - 1);
    } else if (camMode === 'map') {
      wantPos = new THREE.Vector3(f.x, 260, f.z + 60);
      wantLook = new THREE.Vector3(f.x, 0, f.z);
    } else {
      // Title orbit: a slow circle around the hero staging point, close
      // enough that the gold Garuda and the wheelman fill a third of the
      // frame, starting from the car's front three-quarter side.
      titleT += dt * 0.12;
      const r = 11;
      wantPos = new THREE.Vector3(
        (f.x || 0) + Math.sin(titleT) * r,
        4.2,
        (f.z || 0) + Math.cos(titleT) * r,
      );
      wantLook = new THREE.Vector3(f.x || 0, 1.0, f.z || 0);
    }
    const k = camMode === 'title' ? 1 : Math.min(1, dt * 6);
    camPos.lerp(wantPos, k);
    camLook.lerp(wantLook, k);
    camera.position.copy(camPos);
    camera.lookAt(camLook);
    // The shadow camera follows the focus so shadows stay crisp.
    sun.position.set(f.x - 260, 180, f.z - 120);
    sun.target.position.set(f.x, 0, f.z);
  }

  return {
    scene, camera, renderer,
    get night() { return night; },
    setMode(mode) { camMode = mode; if (mode === 'title') titleT = 1.43; },
    setNight,
    snapCamera(focus) {
      camPos.set(0, 0, 0);
      camLook.set(0, 0, 0);
      updateCamera(10, focus);
    },
    draw(dt, focus) {
      updateCamera(dt, focus);
      renderer.render(scene, camera);
    },
  };
}
