// The 3D renderer: a WebGL view with warm sunset lights, soft shadows
// and fog, plus the chase camera that follows the player and the staged
// title camera that frames the hero car on the beach road.
import { THREE } from './three-shim.js';

export function createScene() {
  const canvas = document.getElementById('game');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xe06a9a, 180, 700);

  const hemi = new THREE.HemisphereLight(0xffd9b0, 0x3a2a4a, 1.9);
  scene.add(hemi);
  const ambient = new THREE.AmbientLight(0xffe0c0, 0.95);
  scene.add(ambient);
  const sun = new THREE.DirectionalLight(0xff8a3d, 3.6);
  sun.position.set(-300, 160, 120);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -260;
  sun.shadow.camera.right = 260;
  sun.shadow.camera.top = 260;
  sun.shadow.camera.bottom = -260;
  sun.shadow.camera.far = 900;
  scene.add(sun);
  scene.add(sun.target);

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 2000);
  camera.position.set(0, 40, 80);

  window.addEventListener('resize', resize);
  resize();

  // Smooth chase camera: hangs behind and above the player, closer when
  // on foot, further and higher when driving fast. When driving it sits
  // well to the side (a three-quarter rear view, like a poster shot),
  // close enough that the gold wedge body, the white stripes, the
  // spoiler and the driver all read clearly, and it aims only a few
  // metres ahead so the car stays big in the lower centre of the frame
  // instead of sliding out of it.
  const camState = { x: 0, y: 30, z: 60 };
  function chaseCamera(player, dt) {
    const speed = player.speed || 0;
    const dist = player.inCar ? 8.5 + speed * 0.03 : 8;
    const height = player.inCar ? 4.5 + speed * 0.02 : 3.4;
    const side = player.inCar ? 10 : 3.5;
    const hx = Math.sin(player.heading);
    const hz = Math.cos(player.heading);
    const px = -hz;
    const pz = hx;
    const tx = player.x - hx * dist + px * side;
    const ty = height;
    const tz = player.z - hz * dist + pz * side;
    const k = Math.min(1, dt * 5);
    camState.x += (tx - camState.x) * k;
    camState.y += (ty - camState.y) * k;
    camState.z += (tz - camState.z) * k;
    camera.position.set(camState.x, camState.y, camState.z);
    camera.lookAt(player.x + hx * 3, 1.0, player.z + hz * 3);
  }

  function titleCamera(heroX, heroZ, heroHeading, dt, time) {
    // Slow drift around the parked hero car on the beach road, framed
    // from the south-east so the camera looks north-west: the ferris
    // wheel stands behind the car, the sea to its left, and the road
    // stretches north behind it, with no tall building in the frame.
    // The camera is close (8.5 m) and low, and it aims a little above
    // and to the side of the car, so the gold car sits big in the
    // lower foreground, left of centre, clear of the logo block above
    // it and the buttons below it.
    const a = 0.9 + Math.sin(time * 0.05) * 0.08;
    const dist = 8.5;
    const tx = heroX + Math.sin(a) * dist;
    const tz = heroZ + Math.cos(a) * dist;
    camera.position.set(tx, 2.4, tz);
    camera.lookAt(heroX + 1.5, 2.2, heroZ);
    void dt;
    void heroHeading;
  }

  function render() {
    renderer.render(scene, camera);
  }

  return { renderer, scene, camera, chaseCamera, titleCamera, render, sun };
}
