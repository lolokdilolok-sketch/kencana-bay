// Round 20: no logic change — cameras, sky and lights untouched except the bigger moon (combat night), more day clouds (chase noon) and the title camera's side-profile angle; this line is written in the round 20 recorded session.
// Drawing only: the Three.js scene, the sun, the sky and the cameras.
// The HUD is DOM (hud.js); this module paints the 3D world and moves the
// camera. Cameras: a close three-quarter chase cam, an over-shoulder foot
// cam, a slow orbit for the title poster, a fixed interior cam for the
// garage, and a high view behind the transparent map.
// Round 16: cameras unchanged — the totem fix is the totem itself (world.js), not the chase camera; the garage camera (5.8, 2.5, 4.8) is kept.
// Round 17: the sky is the top-1 recipe (top1-spec-round17.md §1) — a
// time-of-day table (15:00–18:7) drives the dome shader, the sun, the
// fog and the lights, so the chase is bright blue 16:00 and combat is
// golden hour 18:15. The dome shader adds the sun glow, 5-octave FBM
// clouds, and the scene gets a PMREM environment map baked from the
// same sky, so car paint and glass reflect the daylight.
import { THREE } from './three-shim.js';
import { PALETTE, SKY_KEYS } from './config.js';

function lerpColor(a, b, t) {
  return new THREE.Color(a).lerp(new THREE.Color(b), t);
}

/** Interpolate the top-1 sky table at a game hour. Returns the colours,
 * sun intensity, ambient level and sun elevation for that hour. */
export function skyAtHour(hour) {
  const keys = SKY_KEYS;
  let a = keys[0];
  let b = keys[keys.length - 1];
  let t = 0;
  for (let i = 0; i < keys.length - 1; i += 1) {
    if (hour >= keys[i].hour && hour <= keys[i + 1].hour) {
      a = keys[i];
      b = keys[i + 1];
      t = (hour - a.hour) / (b.hour - a.hour);
      break;
    }
  }
  if (hour <= keys[0].hour) { a = keys[0]; b = keys[1]; t = 0; }
  if (hour >= keys[keys.length - 1].hour) { a = keys[keys.length - 2]; b = keys[keys.length - 1]; t = 1; }
  // Sun elevation: high at mid-afternoon, low at golden hour.
  const elev = (h) => {
    if (h <= 15) return 62;
    if (h <= 16.8) return 62 - ((h - 15) / 1.8) * 17;
    if (h <= 17.8) return 45 - ((h - 16.8) / 1.0) * 17;
    return 28 - ((h - 17.8) / 0.9) * 16;
  };
  return {
    top: lerpColor(a.top, b.top, t),
    horizon: lerpColor(a.horizon, b.horizon, t),
    sun: lerpColor(a.sun, b.sun, t),
    sunI: a.sunI + (b.sunI - a.sunI) * t,
    amb: a.amb + (b.amb - a.amb) * t,
    elev: elev(hour),
  };
}

function skyMaterial(p) {
  // Round 17: the dome gradient is mix(horizon, top, pow(h, 0.55)) with
  // a sun glow (pow 6 + pow 900) and 5-octave FBM clouds coloured
  // horizon*1.15 + sun*0.25, exactly the top-1 recipe.
  const cloudCol = p.night ? new THREE.Color('#cdd6ec') : p.horizon.clone().multiplyScalar(1.15).add(p.sun.clone().multiplyScalar(0.25));
  // Round 20: 0.8 (was 0.65) — the reference noon sky has BIG white
  // clouds, and the old amount left the 16:00 chase sky nearly empty.
  const cloudAmt = p.night ? 0.9 : 0.8;
  return new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      top: { value: p.top },
      horizon: { value: p.horizon },
      sunDir: { value: p.sunDir },
      sunColor: { value: p.sun },
      cloudCol: { value: cloudCol },
      cloudAmt: { value: cloudAmt },
    },
    vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `varying vec3 vP; uniform vec3 top; uniform vec3 horizon; uniform vec3 sunDir; uniform vec3 sunColor; uniform vec3 cloudCol; uniform float cloudAmt;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
      float noise(vec2 p){
        vec2 i = floor(p); vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
                   mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
      }
      float fbm(vec2 p){
        float v = 0.0; float a = 0.5;
        for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.13; a *= 0.5; }
        return v;
      }
      void main(){
        vec3 d = normalize(vP);
        float h = d.y;
        // Top-1 gradient: horizon at the eyeline, top overhead.
        vec3 c = h > 0.0 ? mix(horizon, top, pow(h, 0.55)) : horizon * 0.6;
        // Sun glow: a wide warm halo plus a tight bright core.
        float s = max(dot(d, normalize(sunDir)), 0.0);
        c += sunColor * (pow(s, 6.0) * 0.45 + pow(s, 900.0) * 6.0);
        // Clouds: 5-octave FBM, gathered into systems by a low-frequency
        // mass layer, with a higher streaky layer above them. Inside a
        // puff the lit top is near-white, the belly blue-grey, and the
        // base warms near the horizon where the low sun catches it.
        vec2 cuv = d.xz / (abs(h) + 0.4);
        float wx = fbm(cuv * 0.7 + vec2(5.0, 2.0));
        float wy = fbm(cuv * 0.7 + vec2(1.0, 9.0));
        vec2 wuv = cuv + 0.45 * vec2(wx - 0.5, wy - 0.5);
        float big = fbm(wuv * 0.28 + vec2(2.0, 8.0));
        float mass = fbm(wuv * 0.55 + vec2(11.0, 7.0));
        float n = fbm(wuv * 1.6 + vec2(3.7, 1.3));
        float det = fbm(wuv * 3.4 + vec2(9.2, 4.7));
        float cmask = smoothstep(0.52, 0.8, n) * smoothstep(0.38, 0.58, mass) * smoothstep(0.42, 0.60, big);
        float cband = smoothstep(0.03, 0.14, h) * (1.0 - smoothstep(0.5, 0.8, h));
        float camt = clamp(cmask * cband * cloudAmt, 0.0, 1.0);
        vec2 huv = vec2(cuv.x * 2.4, cuv.y * 0.6);
        float hi = fbm(huv + vec2(13.0, 3.0));
        float himask = smoothstep(0.55, 0.75, hi) * smoothstep(0.18, 0.35, h) * (1.0 - smoothstep(0.45, 0.7, h));
        float hamt = clamp(himask * 0.55 * cloudAmt, 0.0, 1.0);
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
  renderer.toneMappingExposure = 1.1; // round 17: top-1 exposure ~1.0–1.16 (was 1.35 — blew the bright day sky out)

  const scene = new THREE.Scene();
  scene.add(worldGroup);
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1500, 24, 16), skyMaterial({
    top: new THREE.Color('#3f8bdd'), horizon: new THREE.Color('#d8e2f2'),
    sun: new THREE.Color('#ffc88c'), sunDir: new THREE.Vector3(-0.5, 0.8, -0.3), night: false,
  }));
  scene.add(sky);
  // Round 17: fog is the horizon colour, so the far city melts into the
  // sky instead of going grey at distance (top-1 recipe, 220–1300).
  scene.fog = new THREE.Fog(0xd8e2f2, 220, 1300);

  const sun = new THREE.DirectionalLight(0xffc88c, 3.2);
  sun.position.set(-172, 246, -140);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -160;
  sun.shadow.camera.right = 160;
  sun.shadow.camera.top = 160;
  sun.shadow.camera.bottom = -160;
  sun.shadow.camera.far = 900;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.04;
  scene.add(sun);
  scene.add(sun.target);
  const hemi = new THREE.HemisphereLight(0xbfe6ff, 0x8a6a4a, 0.8);
  scene.add(hemi);
  const amb = new THREE.AmbientLight(0xffe2c8, 0.35);
  scene.add(amb);
  // A big low sun disc on the horizon, west over the sea, with a warm
  // halo around it (round 7: the reference sunset has a glowing sun).
  // Round 17: the disc + halo follow the time-of-day sun direction, so
  // at 16:00 the sun sits high in the blue sky, at 18:15 low and warm.
  const sunHalo = new THREE.Mesh(
    new THREE.CircleGeometry(130, 32),
    new THREE.MeshBasicMaterial({ color: '#ff9a3d', transparent: true, opacity: 0.28, fog: false }),
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
  // Moon for the night mode. Round 20: BIG (r 40, was 22) and placed
  // where the night combat camera actually looks — straight down the
  // road corridor east (700, 185, -84): from the combat camera it
  // sits ~0° azimuth (dead centre) and ~20° up, inside the frame.
  // Round 20b: the first spots were both hidden behind rooftops —
  // (550, 180, -190) sat behind the casino block, and (700, 180, -10)
  // sat 8.6° right of the camera axis, behind the south building.
  const moon = new THREE.Mesh(
    new THREE.CircleGeometry(40, 24),
    new THREE.MeshBasicMaterial({ color: '#e8ecff', fog: false }),
  );
  moon.position.set(700, 185, -84);
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
  // Sun offset from the focus (directional light + shadow camera follow
  // the player); updated by setTimeOfDay from the sun elevation.
  let sunOffset = new THREE.Vector3(-172, 246, -140);
  let sunDirVec = new THREE.Vector3(-0.5, 0.8, -0.3);

  // Environment map baked from the same sky (top-1 recipe): car paint,
  // glass and water reflect the daylight instead of a flat grey. The
  // PMREM is re-baked whenever the time of day changes.
  // Round 17b: the sky env must NOT wash the city out — every world
  // material gets a low envMapIntensity (0.35), so facades keep their
  // warm colours under the bright day sky instead of going pale blue.
  worldGroup.traverse((o) => {
    if (o.isMesh && o.material && o.material.isMeshStandardMaterial) {
      o.material.envMapIntensity = 0.35;
    }
  });
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  const envSky = new THREE.Mesh(new THREE.SphereGeometry(1500, 24, 16), sky.material);
  envScene.add(envSky);
  let envRT = null;
  function refreshEnv() {
    const rt = pmrem.fromScene(envScene, 0.04);
    if (envRT) envRT.dispose();
    envRT = rt;
    scene.environment = rt.texture;
  }

  function applySky(p) {
    sky.material = skyMaterial(p);
    envSky.material = sky.material;
    sunDirVec = p.sunDir.clone().normalize();
    const el = Math.asin(Math.max(-0.1, Math.min(0.99, sunDirVec.y)));
    const dist = 300;
    sunOffset = new THREE.Vector3(
      sunDirVec.x * dist, Math.max(60, sunDirVec.y * dist), sunDirVec.z * dist,
    );
    void el;
    sun.color.set(p.sun);
    sun.intensity = p.sunI;
    hemi.color.set(p.hemiSky);
    hemi.groundColor.set(p.hemiGround);
    hemi.intensity = p.hemiI;
    amb.intensity = p.ambI;
    scene.fog.color.set(p.horizon);
    renderer.toneMappingExposure = p.exposure;
    // Sun disc + halo sit on the sun direction, 900u out.
    const discPos = sunDirVec.clone().multiplyScalar(900);
    sunDisc.position.copy(discPos);
    sunDisc.lookAt(0, 60, 0);
    sunHalo.position.copy(discPos);
    sunHalo.lookAt(0, 60, 0);
    sunDisc.material.color.set(p.sun);
    sunDisc.visible = !p.night;
    sunHalo.visible = !p.night;
    moon.visible = !!p.night;
    refreshEnv();
  }

  /** Set the sky, sun, fog and lights from a game hour (top-1 table). */
  function setTimeOfDay(hour) {
    night = false;
    const k = skyAtHour(hour);
    const el = (k.elev * Math.PI) / 180;
    const dir = new THREE.Vector3(-Math.cos(el), Math.sin(el), -0.42).normalize();
    const hemiSky = k.top.clone().lerp(k.horizon, 0.45).lerp(new THREE.Color('#ffffff'), 0.25);
    applySky({
      top: k.top, horizon: k.horizon, sun: k.sun, sunDir: dir, night: false,
      sunI: k.sunI, hemiSky, hemiGround: k.horizon.clone().multiplyScalar(0.6),
      hemiI: 0.8 * k.amb * 1.15, ambI: 0.35 * k.amb, exposure: 1.1,
    });
  }

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
    if (on) {
      const dir = new THREE.Vector3(-0.5, 0.7, -0.3).normalize();
      applySky({
        top: new THREE.Color(PALETTE.nightSkyTop), horizon: new THREE.Color(PALETTE.nightSkyMid),
        sun: new THREE.Color('#8aa0ff'), sunDir: dir, night: true,
        sunI: 0.5, hemiSky: new THREE.Color('#8aa0c0'), hemiGround: new THREE.Color('#1c2a55'),
        hemiI: 0.5, ambI: 0.25, exposure: 1.0,
      });
    } else {
      setTimeOfDay(16);
    }
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
      // Round 15: combat is closer (was dist 6.5, height 3.1) — the
      // enemies at 9–13u read bigger in frame, faces and aiming poses
      // included, like the top-10 combat staging. Round 15c: 4.5, not
      // 5.0 — the first round 15 render still had the enemies small.
      const dist = camMode === 'combat' ? 4.5 : 5.5;
      const height = camMode === 'combat' ? 2.6 : 3.1;
      wantPos = new THREE.Vector3(
        f.x - sin * dist - cos * 2.2,
        (f.y || 0) + height,
        f.z - cos * dist + sin * 2.2,
      );
      wantLook = new THREE.Vector3(f.x + sin * 10, (f.y || 0) + 1.4, f.z + cos * 10);
    } else if (camMode === 'garage') {
      // Round 15: closer (was 8.5 / 3.4 / 7.5) so the Garuda fills more
      // of the frame — the round 14 shot had it small and side-on.
      // Round 15d: closer still (5.8 / 2.5 / 4.8) — the first round 15
      // render still had the car small in the middle of the room.
      wantPos = new THREE.Vector3(f.x + 5.8, 2.5, f.z + 4.8);
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
    // Round 17: the sun offset comes from the time-of-day elevation —
    // high at 16:00 (short shadows), low at 18:15 (long shadows).
    sun.position.set(f.x + sunOffset.x, sunOffset.y, f.z + sunOffset.z);
    sun.target.position.set(f.x, 0, f.z);
  }

  // Default sky: bright-blue 16:00, so the title screen and the first
  // frame already read as daylight, not dusk.
  setTimeOfDay(16);

  return {
    scene, camera, renderer,
    get night() { return night; },
    setMode(mode) { camMode = mode; if (mode === 'title') titleT = 3.64; }, // round 20: 3.64 (was 1.43) — the title camera now sits on the Garuda's LEFT flank, so the car reads in SIDE PROFILE with its nose to the right, like the reference title screen (the old 1.43 was a front 3/4)
    setNight,
    setTimeOfDay,
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
