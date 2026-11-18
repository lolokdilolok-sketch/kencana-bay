# BUILD NOTES — KENCANA BAY (recorded rebuild, gta6-01)

Rebuilt from scratch in a kit-recorded session (recording
01a1ef0d-6223-7345-97d9-72a4fe145981). Every source file in this repo was
written by hand in this session; the only exceptions are the kit starter
files (`vendor/makefun-game.ts`, `serve.ts`, `LICENSE`) and the vendored
Three.js r152 minified library (`game/vendor/three.min.js`, downloaded
from unpkg — minified libraries are excluded from authorship counting).
The earlier unrecorded build was used only as a design reference; no
file was copied from it.

## What was built

KENCANA — A Crime Story in Kencana Bay · 1998. A 3D open-world crime
game, Three.js r152, static files only, no network requests, desktop
Chrome, keyboard + mouse.

- **City** (`game/src/world.js`): sunset beach city, sea on the west
  edge, 600×600 road grid, 6 districts (Pelabuhan Segara, Kampung Batik,
  Alun-Alun, Lorong Emas, Pantai Kidul, Pasar Senja), 3 building
  archetypes (tower / shophouse / mid block) + one landmark per district
  (warehouse + dock crane, hotel tower, city hall with dome, gold casino,
  beach hotel, market hall), ~78% lit windows, palms, beach umbrellas,
  a ferris wheel and a KENCANA FM 101.1 billboard on the beach road.
  Bright HD sunset lighting (hemisphere 1.9, ambient 0.95, sun 3.6).
- **Hero car** (`game/src/vehicles.js`): the Garuda GT — a low, wide,
  GOLD (#ffb400 metallic) sports car with a lofted wedge body (pointed
  nose rising to the cowl, wide rear), black roof panel, double white
  hood stripes, white side stripes, white star rims, big spoiler, twin
  chrome exhausts, and a visible seated driver in an orange shirt.
  Traffic: sedan, taxi, van, truck + white/blue KPD police cars and a
  police helicopter.
- **Gameplay** (`game/src/main.js`, `missions.js`, `police.js`): walk +
  drive, steal cars with E, 12 story missions with payouts $300–$1200,
  crew hire with real effects (Agus $200 cools wanted 2×, Bambang $350
  repairs the car, Ratna $300 +15% payout), wanted 0–5 stars with KPD
  pursuit + heli at 3 stars + roadblocks at 4 stars, 5 weapons
  (Pistol, Kancil SMG, Shotgun, Garuda, Launcher), drift stunts for
  cash, synth radio Gamelan FM 101.1, save/load + autosave
  (`kencana.save.v1`), safehouse/garage.
- **HUD** (`game/index.html`, `game/src/hud.js`): mission panel
  top-left, crew panel, KPD RESPONSE panel top-right with wanted stars
  + cash + time/day, round minimap bottom-left with district name + HP
  + REP, weapon slots, speed bottom-right, dialogue bar with a drawn
  character portrait bottom-centre, help bar at the bottom.
- **Title screen**: centred logo in the top third (TELUK KENCANA · 1998
  over-line, KENCANA in gold→pink gradient, BAY badge, tagline "Emas,
  bensin, dan pengkhianatan — seorang wheelman pulang ke Teluk
  Kencana."), glass chips in the top corners, horizontal glass pill
  buttons at the bottom (MULAI gold + SAVE / LOAD / END GAME), hero gold
  Garuda + wheelman in the lower foreground, beach backdrop with the
  ferris wheel. Version stamp "KENCANA BAY · v6 · 18 NOV 2026" on the
  title and in the HUD corner.
- **Map (M)**: full bright district mosaic with sunset colour gradation
  per district, sea on the west edge, grid A–F / 1–6, route line,
  glowing objective star, semi-transparent so the city shows behind it.

## Verification (this session)

- `node --check` on all 13 `game/src/*.js` files: OK.
- Playwright playtest (menu → MULAI → E enter car → hold W 5 s → M
  open map → M close): **0 page errors, 0 external network requests**;
  map opens and closes; the car moves (7 KM/H in the slow headless
  SwiftShader renderer, where each frame advances only one fixed 1/60 s
  step — a rendering-speed artefact, not a game bug; the staged chase
  screenshot shows 51 KM/H after 240 fixed steps).
- 4 new screenshots (1280×720, taken this session with Playwright,
  `shots/take-shots.mjs`): 1-chase.jpg (gold Garuda, driver visible,
  KPD pursuit, 4 wanted stars, 51 KM/H, v6 stamp), 2-foot.jpg
  (wheelman on foot beside the gold Garuda, red-shirt enemies, 3
  wanted stars, WANTO dialogue portrait, v6 stamp), 3-map.jpg (bright
  mosaic map, route line, objective star, mission list + stats),
  4-title.jpg (centred logo, v6 stamp, gold Garuda + wheelman, beach +
  ferris wheel backdrop). Each read back and confirmed.
- Dossier: `mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts`
  run twice — **byte-identical** (`diff -r` clean). game/ 738,283 bytes
  (limit 48 MiB), screenshots 98–130 KiB each (limit 256 KiB),
  dossier.json 735,896 bytes (limit 1.5 MiB).
- Test server stopped after verification.

## Honest gaps

- No cutscene / voice acting; radio is a synth loop, not real music.
- Traffic AI is simple (straight lines on the road grid, wraps at the
  edge); police pursuit steers toward the player but has no pathfinding
  around buildings.
- No collision between cars/buildings (arcade style); the Garuda can
  drive through a building.
- The title-screen hero car is smaller in frame than in the chase shot
  (camera ~14 units), but the gold paint, beach backdrop and v6 stamp
  make it unmistakable.
