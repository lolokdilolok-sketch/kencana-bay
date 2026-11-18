# KENCANA BAY — Build Notes

A Make GTA 6 entry (bounty `gta6-01`), built from scratch in this recorded
session: a 3D open-world crime game in a fictional 1998 beach city,
"Kencana Bay — A Crime Story in Kencana Bay · 1998". Playable offline in
desktop Chrome from static files (`game/index.html`), keyboard + mouse,
no network requests at runtime.

## What is in the game

- **City** (`game/src/world.js`): six districts on a road grid with the sea
  on the west edge — Pelabuhan Segara (docks, crane, containers), Kampung
  Batik (workshop), Alun-Alun (Grand Hotel, mansion), Lorong Emas (casino
  with a gold dome), Pantai Kidul (beach, ferris wheel, umbrellas, towels),
  Pasar Senja (market stalls, car showroom). Three building shape families
  plus one landmark per district, warm glowing windows on all four faces,
  palm trees, a KENCANA FM 101.1 billboard, and a low sun disc. Bright
  high-definition sunset lighting: warm low sun, pink-orange sky gradient,
  soft fog. Everything is built from a seeded generator, so the same seed
  gives the same city.
- **Hero car** (`game/src/vehicles.js`): the Garuda GT — a low, wide gold
  sports car with a lofted wedge body (pointed low nose rising to the
  cabin), a black roof, two white stripes over the hood continuing over
  the rear deck, white star-pattern wheels, a large gold rear spoiler, and
  a visible driver in an orange shirt sitting in the car. Traffic: sedans,
  taxis, trucks and vans in varied colours, all placed deterministically
  from the seed. Police: white cars with blue markings and a light bar,
  plus a helicopter with a spotlight.
- **Gameplay** (`game/src/main.js`, `missions.js`, `police.js`,
  `pedestrians.js`): explore on foot and by car, E to enter or steal a
  car; twelve story missions in order (Selamat Datang, Hot Wheels, Antar
  Paket, Tagihan Pasar, Mata-Mata, Balapan Senja — a sunset race across
  four checkpoints — Gudang Segara, Kabur dari WPD, Heat Wave, Kencana
  Hilang, Double Cross, The Last Ride), payouts $300–$1,200; three crew
  members for hire (Agus Prasetyo, driver, $200 [Z]; Bambang, mechanic,
  $350 [X]; Ratna, fixer, $300 [C]); a wanted level of 0–5 stars with
  pursuing police cars, a helicopter at 3+ stars and roadblocks at 4+
  stars; five weapons on keys 1–5 (Pistol, Kancil SMG, Shotgun, Garuda,
  Launcher) with ammunition; drifting and stunts earn bonus cash; a
  synthesised Gamelan FM 101.1 radio loop (`game/src/audio.js`); saving,
  loading and autosave in local storage; a safehouse and a garage.
- **HUD** (`game/src/hud.js`, `game/index.html`): mission panel top-left
  with mission name, description, next objective and a progress bar; crew
  panel below it on the left; police response panel top-right with
  pursuing-unit distances, helicopter status, cash, wanted stars, time
  and day, and the radio station; round minimap bottom-left with the
  location name, a health bar and the fixer reputation; weapon slots on
  the right; speed bottom-right with the vehicle name; a dialogue bar
  with a drawn character portrait bottom-centre; a help bar along the
  very bottom. The title screen has the logo centred in the top third
  (over-line "TELUK KENCANA · 1998", KENCANA in a gold-to-pink gradient,
  a BAY badge, the tagline), glass chips in the top corners, four
  horizontal glass pill buttons along the bottom (MULAI in gold, SAVE,
  LOAD, END GAME), the gold hero car and the wheelman large in the lower
  foreground, and a beach backdrop with the ferris wheel. The version
  stamp "KENCANA BAY · v6 · 18 NOV 2026" is on the title screen and in
  the in-game HUD. The map screen (M key) is a bright district mosaic
  with a sunset gradient per district, the sea on the west edge, a grid
  A–F / 1–6, a route line to the objective, a glowing objective star, and
  the twelve missions plus player stats; it is semi-transparent so the
  city shows through behind it.
- **Structure**: one clear job per file — `config.js` (tuning, places,
  missions, crew, weapons), `random.js` (seeded generator), `three-shim.js`
  (Three.js global shim), `input.js` (keyboard state), `world.js` (city),
  `vehicles.js` (cars, helicopter, characters), `pedestrians.js` (traffic
  and pedestrians), `police.js` (wanted level and pursuit), `missions.js`
  (mission state machine), `audio.js` (radio), `hud.js` (panels, minimap,
  map, portraits), `render.js` (renderer, lights, chase and title
  cameras), `main.js` (boot, loop, screens, save/load, shooting, crew),
  `shots.js` (staged scenes behind `?shot=` for screenshots).
  Three.js r152 is vendored as `game/vendor/three.min.js`.

## How the build went (revision passes)

- **Pass 1**: every file written fresh from the prose brief.
- **Pass 2** (after the first playtest): fixed the Chromium launch (the
  managed browser needs its WebGL domain policy flags), switched the
  playtest to `file://` (the local-network check blocks `http://localhost`
  here), rewrote `shots.js` after it was deleted with the starter files,
  moved the hero car and player spawn onto the open beach road (the first
  spot sat inside a building's collision box, so the car could not move),
  fixed three bugs (a `player.crewAgus` reference that does not exist, the
  ferris wheel's legs spinning with the rim, `Math.random()` colours in
  traffic cars), fixed the map screen (it could be opened but never
  closed, because the toggle was only read inside the frozen step loop),
  and reworked the title camera.
- **Pass 3** (after reading the screenshots back): the chase camera was
  still settling from its start position high above the city, so the car
  was out of frame; a settle loop was added to the staged shots. The map
  canvas was blank because the staging called `showMap` without setting
  the game's own map-open flag. The hero car was re-aimed to face
  east-north-east so the title camera sees its sunlit flank, the title
  camera was moved to look south down the beach road, the spawn was moved
  beside the ferris wheel, and the chase camera was tightened (look-at
  point closer, less pull-back at speed).
- **Pass 4** (after reading the screenshots back again): the title
  camera's view was blocked by a tall building, so the spawn moved south
  beside the ferris wheel and the camera now looks north-west at the car
  with the wheel behind it; the foot shot's player was standing between
  the camera and the car, so the staging was fixed to put the wheelman
  south of the car facing it; buildings got windows on all four faces
  (their blank sides read as flat walls); the car's black roof panel and
  cockpit were narrowed and its white stripes thinned so the gold body
  reads instead of black.
- **Pass 5** (after a read-back of the two newest shots): the chase
  camera moved closer and further to the side for a three-quarter rear
  view, the roll bar was lowered with struts at both ends so it reads as
  bolted to the body instead of floating above it, the title logo block
  moved to the top third of the screen (buttons pinned to the bottom with
  `margin-top: auto`) so the BAY badge and tagline no longer overlap the
  car, the title camera moved closer and aims above the car so the gold
  car sits big in the lower foreground, the spoiler blade was repainted
  gold, and the hood stripes were continued over the rear deck so they
  read from a chase camera too.

## Verification (all done in this session)

- **Syntax**: every game source file passes `node --check`
  (14 files: `game/src/*.js` plus `main.ts`; `serve.ts` is the kit's
  TypeScript starter and is checked by the TypeScript compiler instead).
- **Playtest** (`shots/playtest.mjs`, Playwright + system Chromium,
  `file://`): title screen, MULAI, walking to the hero car, E to enter
  (HUD shows GARUDA GT), driving (47–94 km/h depending on the run),
  M to open the map and M again to close it. Result: **0 page errors,
  0 external network requests, 0 failed requests.**
- **Screenshots** (1280×720, in `screenshots/`, read back by eye):
  `1-chase.jpg` — the gold Garuda GT at 166 km/h in a three-quarter
  rear view, gold spoiler and roll bar on the body, driver visible, a
  KPD car alongside, 3 wanted stars, mission panel, minimap, KPD panel;
  `2-foot.jpg` — the wheelman on foot beside the parked gold Garuda,
  ferris wheel behind; `3-map.jpg` — the bright GPS map mosaic with
  grid, route line, objective star, mission list and stats;
  `4-title.jpg` — the logo in the top third, the big gold car and the
  wheelman in the lower foreground, ferris wheel, sun, palms, umbrellas
  and sea behind, v6 stamp visible.
- **Dossier**: `main.ts` run twice produces a **byte-identical**
  `dossier.json` (590,888 bytes). Gate limits: `game/` 748 KB (limit
  48 MiB), 16 files; each screenshot 64–109 KB (limit 256 KiB);
  dossier 577 KiB (limit 1.5 MiB).
- **Recording**: the kit recording for this build stayed alive for the
  whole session (PID 6547, still running at the end of the build).

## Honest gaps

- The radio is a synthesised WebAudio loop, not recorded music; there
  are no cutscenes or voice lines (dialogue is text with drawn
  portraits).
- Traffic AI is simple (cars loop their roads); police pursuit steers
  toward the player and rams, with no advanced tactics.
- The helicopter is visible in play but only a speck at its patrol
  height in the chase screenshot; the KPD panel carries the helicopter
  status instead.
- At 166 km/h the chase camera's speed pull-back still leaves the car
  at roughly a sixth of the frame width; a closer camera would clip
  the road at that speed.
- The first mission's safehouse is a marked point, not a enterable
  interior; the garage is a menu action, not a separate interior scene.
