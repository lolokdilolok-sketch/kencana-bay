# Kencana Bay — A Crime Story in Kencana Bay · 1998

[![make.fun](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![rank](https://make.fun/badge/gta6-01/lolokdilolok-sketch/kencana-bay/rank.svg)](https://make.fun/bounty/gta6-01)
[![reward](https://make.fun/badge/gta6-01/lolokdilolok-sketch/kencana-bay/reward.svg)](https://make.fun/bounty/gta6-01)

An open-world crime game for the make.fun **Make GTA 6** bounty (`gta6-01`), built with
Three.js r152 and plain static files — no build step, no network requests, playable
offline in a desktop browser.

## The game

You are a wheelman back in **Kencana Bay, 1998** — a sun-soaked sunset beach city with
six districts: Pelabuhan Segara (docks), Kampung Batik (old town), Alun-Alun (hotel and
mansion), Lorong Emas (casino), Pantai Kidul (beach, ferris wheel) and Pasar Senja
(market, showroom, garage). The sea is on the west edge.

- **Drive and walk** — steal cars, drive the gold Garuda GT, drift for stunt cash.
- **12 story missions** — from Selamat Datang ($300) to The Last Ride ($1200), with
  checkpoints, contacts who talk (Ratna, Agus, Bambang, Wanto) and payouts.
- **Wanted level 0–5** — KPD police cars chase and ram; at 3 stars a helicopter hunts
  you with a spotlight; at 4 stars roadblocks go up.
- **Crew** — hire Agus (driver), Bambang (mechanic) and Ratna (fixer).
- **Enterable garage** — walk into Bengkel Bambang, repaint the Garuda in 4 colours,
  repair her, talk to Bambang.
- **Street races** — a repeatable 5-gate checkpoint race from Pantai Kidul, $500 for a win.
- **5 weapons, Gamelan FM synth radio, save/load + autosave, safehouse, transparent map
  with GPS, minimap, dialogue portraits.**

## Controls

WASD drive/walk · E enter/exit · J shoot · R reload · 1-5 weapons · Z/X/C crew ·
G garage · M map · P pause · T radio

## Play it

```sh
node serve.ts
# then open http://localhost:8080
```

Or open `game/index.html` from any static file server (Firefox also opens it straight
from the file). Screenshots live in `screenshots/` (cover first: chase, foot, map, title).

## Layout

- `main.ts` — the entry program: copies `game/` + `screenshots/` to `/output` and writes `dossier.json`.
- `game/index.html` — the page: canvas, title screen, HUD, map, garage and pause DOM.
- `game/src/` — one job per file: `config` (all numbers), `random` (seeded RNG),
  `three-shim` (the Three.js import point), `input`, `audio` (synth radio + effects),
  `render` (renderer, sunset, cameras), `world` (the city), `vehicles` (cars + driving),
  `pedestrians`, `police` (pursuit, helicopter, roadblocks), `missions`, `garage`
  (the workshop interior), `race` (street races), `hud` (DOM + minimap + portraits),
  `main` (the loop and screens), `shots` (the four screenshot scenes).
- `game/vendor/three.module.min.js` — Three.js r152, vendored.
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged.

## License

MIT — see `LICENSE`.
