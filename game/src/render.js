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
  // Round 12 clouds: fresh bright puffs against the dark blue sky.
  // Dusk: warm white, clearly lit by the low sun; night: cooler and
  // dimmer, moonlit, still pale against the near-black sky.
  // Round 12b: the first render showed the clouds too faint, almost
  // invisible in the night (combat) shot — so the night clouds are
  // brighter and denser, while the sky itself stays dark blue.
  const cloudCol = night ? new THREE.Color('#cdd6ec') : new THREE.Color('#fff6e8');
  const cloudAmt = night ? 0.9 : 1.0;
  return new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      top: { value: new THREE.Color(top) },
      mid: { value: new THREE.Color(mid) },
      low: { value: new THREE.Color(low) },
      cloudCol: { value: cloudCol },
      cloudAmt: { value: cloudAmt },
    },
    vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `varying vec3 vP; uniform vec3 top; uniform vec3 mid; uniform vec3 low; uniform vec3 cloudCol; uniform float cloudAmt;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
      float noise(vec2 p){
        vec2 i = floor(p); vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
                   mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
      }
      float fbm(vec2 p){
        float v = 0.0; float a = 0.5;
        for (int i = 0; i < 3; i++) { v += a * noise(p); p *= 2.13; a *= 0.5; }
        return v;
      }
      void main(){
        vec3 d = normalize(vP);
        float h = d.y;
        // Round 11 night blue: the dark top starts right above the horizon
        // and the warm band is a narrow strip, so the visible sky in the
        // near-horizontal chase/combat frames reads deep blue like the
        // night-highway reference instead of amber dusk. The road and the
        // car stay bright — the sun/hemi/ambient lights are unchanged.
        // Round 13: the warm orange strip is thinner still — the low band
        // only spans h -0.03..0.005 and the deep blue takes over by
        // h 0.14, so the horizon reads as a thin warm line under a night
        // sky instead of a wide orange band.
        // Round 14: the band is gone — the low band is only a sliver
        // (h -0.01..0.005) and the low/mid colours are deep indigo-mauve
        // now (config), so the horizon reads deep blue, not orange. The
        // dusk warmth survives only in the clouds (warm tint near the
        // horizon below) and in the lit streets.
        vec3 c = h > 0.005 ? mix(mid, top, smoothstep(0.005, 0.14, h)) : mix(low, mid, smoothstep(-0.01, 0.005, h));
        // Round 13 clouds: layered, not one smooth wash. A low-frequency
        // mass layer gathers the puffs into distinct cloud systems with
        // clear sky between them; a high-frequency detail layer breaks
        // the puff edges and shades inside each puff (lit tops near-white,
        // shadowed bellies blue-grey), so the clouds read as layered,
        // textured clouds instead of soft blobs. Still bright and fresh
        // against the dark blue sky, dusk and night alike.
        // Round 14: domain-warped puffs (no two clouds share a shape),
        // a continent-scale system layer (some sky regions dense, some
        // clear), a second HIGHER streaky layer (thin cirrus-like bands
        // stretched east-west), and deeper in-puff shading — so the sky
        // reads as several cloud layers at different heights, not one.
        vec2 cuv = d.xz / (abs(h) + 0.4);
        float wx = fbm(cuv * 0.7 + vec2(5.0, 2.0));
        float wy = fbm(cuv * 0.7 + vec2(1.0, 9.0));
        vec2 wuv = cuv + 0.45 * vec2(wx - 0.5, wy - 0.5);
        float big = fbm(wuv * 0.28 + vec2(2.0, 8.0));
        float mass = fbm(wuv * 0.55 + vec2(11.0, 7.0));
        float n = fbm(wuv * 1.6 + vec2(3.7, 1.3));
        float det = fbm(wuv * 3.4 + vec2(9.2, 4.7));
        float cmask = smoothstep(0.46, 0.68, n) * smoothstep(0.38, 0.58, mass) * smoothstep(0.42, 0.60, big);
        float cband = smoothstep(0.03, 0.14, h) * (1.0 - smoothstep(0.5, 0.8, h));
        float camt = clamp(cmask * cband * cloudAmt, 0.0, 1.0);
        vec2 huv = vec2(cuv.x * 2.4, cuv.y * 0.6);
        float hi = fbm(huv + vec2(13.0, 3.0));
        float himask = smoothstep(0.55, 0.75, hi) * smoothstep(0.18, 0.35, h) * (1.0 - smoothstep(0.45, 0.7, h));
        float hamt = clamp(himask * 0.55 * cloudAmt, 0.0, 1.0);
        // Inside a puff: bright where the detail noise is high (lit top),
        // blue-grey where it is low (shadowed belly); a warm dusk tint
        // only near the horizon, where the low sun still catches the base.
        // Round 14b: the first render's bellies came out too dark for a
        // "fresh and bright" sky — the shade is lifted a touch so the
        // clouds stay bright and fresh while keeping their layered
        // shading (was 0.45/0.55/0.82, 0.25 + 1.1*det, mix 0.8).
        vec3 shade = mix(vec3(0.55, 0.62, 0.86), vec3(1.0), clamp(0.35 + 0.95 * det, 0.0, 1.0));
        vec3 cc = mix(cloudCol, shade, 0.7);
        cc = mix(cc, vec3(1.0, 0.85, 0.62), 0.35 * (1.0 - smoothstep(0.05, 0.25, h)));
        c = mix(c, cc, camt * 0.92);
        c = mix(c, vec3(0.92, 0.95, 1.0), hamt * 0.85);
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
  renderer.toneMappingExposure = 1.5; // round 8: brighter + cleaner (was 1.35)

  const scene = new THREE.Scene();
  scene.add(worldGroup);
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1500, 24, 16), skyMaterial(false));
  scene.add(sky);
  // Warm neutral grey-brown fog, round 11: no violet left (was dusky
  // blue-grey #8f8fb0, which still read mauve at distance and behind the
  // map). Pushed further out, so the city reads bright and the depth cue
  // stays gentle.
  scene.fog = new THREE.Fog(0x8a8172, 200, 1000);

  const sun = new THREE.DirectionalLight(0xff8a3d, 3.4); // round 10:
  // softer dusk sun (was 3.6) — the roof highlight softens with it
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
  const hemi = new THREE.HemisphereLight(0xffdcc9, 0x2e2a33, 1.9); // round 11:
  // neutral dark ground bounce (was purple-ish #3a2a4a, which tinted the
  // streets mauve under the dusk sky)
  scene.add(hemi);
  const amb = new THREE.AmbientLight(0xffe0c0, 0.9);
  scene.add(amb);
  // A big low sun disc on the horizon, west over the sea, with a warm
  // halo around it (round 7: the reference sunset has a glowing sun).
  const sunHalo = new THREE.Mesh(
    new THREE.CircleGeometry(130, 32),
    new THREE.MeshBasicMaterial({ color: '#ff9a3d', transparent: true, opacity: 0.2, fog: false }), // round 11: dimmer halo (was 0.28) — the night sky should not wash orange
  );
  sunHalo.position.set(-905, 95, -100);
  sunHalo.lookAt(0, 60, 0);
  scene.add(sunHalo);
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
    sun.intensity = on ? 0.5 : 3.4;
    sun.color.set(on ? 0x8aa0ff : 0xff8a3d);
    hemi.intensity = on ? 0.5 : 1.9;
    amb.intensity = on ? 0.25 : 0.9;
    scene.fog.color.set(on ? 0x101a3a : 0x8a8172); // round 11: warm neutral grey-brown fog, no violet
    sunDisc.visible = !on;
    sunHalo.visible = !on;
    moon.visible = on;
    renderer.toneMappingExposure = on ? 1.0 : 1.35;
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
      // (dist 7.6 / side 4.0 / height 3.5, FOV 62) — close and low enough
      // that the arched roof and the driver through the rear glass read.
      const dist = 7.6;
      const side = 4.0;
      const height = 3.5;
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
