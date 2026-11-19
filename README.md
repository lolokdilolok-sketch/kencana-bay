# KENCANA — A Crime Story in Kencana Bay · 1998

[![gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![rank](https://make.fun/badge/gta6-01/lolokdilolok-sketch/kencana-bay/rank.svg)](https://make.fun/bounty/gta6-01)
[![reward](https://make.fun/badge/gta6-01/lolokdilolok-sketch/kencana-bay/reward.svg)](https://make.fun/bounty/gta6-01)

An open-world crime game set in a sunset bay city in 1998. Raka, a wheelman,
comes home to Teluk Kencana and works his way up from a stolen hatchback to
the gold Garuda GT — through 12 story missions, police chases with a
helicopter, street races, a crew, and a garage that upgrades the car.

## How to play

Serve the game and open it in a desktop browser:

```sh
node serve.ts
# open http://localhost:8080
```

- **WASD** — walk / drive · **E** — enter / exit a car (or steal a parked one)
- **J** — shoot · **R** — reload · **0–5** — switch weapon
- **Z / X / C** — hire Agus ($200), Bambang ($350), Ratna ($300)
- **G** — garage (Bengkel Bambang, near the port) · **M** — map · **T** — radio
- **P** — pause · progress autosaves to the browser

## What is in the game

- **12 story missions** ($300–$1,200 each): meet the fixer, steal a car, a
  shootout at the casino, a night chase, a street race, and more — with a
  MISSION PASSED screen (+$, +REP, unlocks, next mission).
- **Police (KPD)**: 0–5 wanted stars, 5 named units with distance and status
  (MENGEJAR / MENYUSUN ROADBLOCK / SPOTLIGHT), a helicopter with a spotlight
  cone, a search zone on the minimap, and an "IN SIGHT" warning.
- **Open world**: 6 districts (Pelabuhan Segara, Kampung Batik, Alun-Alun,
  Lorong Emas, Pantai Kidul, Pasar Senja), ~150 buildings, a bay, a beach,
  a park with a fountain, a ferris wheel, traffic, pedestrians, shops and
  billboards with names, and a day/night cycle with rain at night.
- **Garage**: repaint the Garuda in 5 colours (gold is free), tune the engine
  (0–5, +4 km/h per level), armour (0–5), repairs.
- **Street races**: 5 checkpoints through the city, $500 for a win.
- **Combat on foot**: 5 weapons (Pistol, Kancil SMG, Shotgun, Garuda,
  Launcher), muzzle flash, tracers, floating damage numbers, enemies who
  shoot back.
- **Crew**: Agus, Bambang and Ratna join with their own portrait and dialogue.
- **Radio**: Gamelan FM 101.1 — five tracks synthesised with WebAudio.
- **Map**: a transparent GPS map over the live city — district names, grid
  A–F / 1–6, route line, mission list, legend, and real stats.
- **Saves**: localStorage save + autosave every 20 s, continue from the title.

## Screenshots

1. **Chase** — the gold Garuda mid-pursuit on the Alun-Alun main road: traffic
   ahead, two KPD cars behind, helicopter spotlight, pedestrians on the
   sidewalks.
2. **Combat** — a night shootout outside the casino in Lorong Emas, rain,
   neon, muzzle flash and a tracer.
3. **Garage** — inside Bengkel Bambang: the Garuda on the lift, stat panel,
   prices, Bambang.
4. **Map** — the GPS map after a played session: real stats (14 takedowns,
   6 cars stolen, $2,150 stunts, 2 of 3 races won), route line, legend.

## Tech

- Three.js r152, vendored under `game/vendor/` (no network at runtime).
- Plain static files: `game/index.html` + ES modules under `game/src/`.
- `main.ts` (Node 22, standard library only) copies `game/` and
  `screenshots/` to `/output` and writes `dossier.json` — it also runs a
  preflight: 4 screenshots within the 256 KiB cap, `game/` within 48 MiB,
  and no network reference in any game source.

## License

MIT
