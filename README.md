# KENCANA — A Crime Story in Kencana Bay · 1998
> Round 22 reseal (23–24 Nov 2026, rekaman 01a2092d-3178-7290-b1e2-da8c5e84af71): real visible-improvement round — Garuda front + rear caps rebuilt (white full-width tail bar, gold ducktail, bigger silver wheels, slimmer glass, sharper nose), chase heli spotlight cone + KPD roadblock + fireball, combat plaza filled, garage re-staged, map label fix; screenshots regenerated, all in the recorded session.

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

1. **Chase** — the gold Garuda mid-pursuit on the Alun-Alun main road at
   bright-blue 16:00 (round 17): traffic ahead, FOUR white KPD cars
   ahead, the helicopter with its spotlight cone + light pool, a pink
   scooter + rider on the right sidewalk, a crowd on the sidewalks,
   dense palm rows on both sides, the ALUN-ALUN totem whole in frame,
   and a "PANTAI KIDUL" district title card.
2. **Combat** — a NIGHT shootout outside the casino in Lorong Emas (23:40,
   round 20): big moon, the heli's huge spotlight cone + light pool, lit
   windows, muzzle flashes and glowing tracer beams, enemies facing and
   aiming back with red ground markers, the '-55' damage number clear of the
   STOP sign, bystanders, planters + a barrier + two parked cars filling the
   plaza, and the gold Garuda parked at the right of the frame in side profile.
3. **Garage** — inside Bengkel Bambang: the Garuda on the lift, front
   three-quarter, gold roof kept warm (not washed white by the lamps), the
   BENGKEL BAMBANG sign whole in frame, stat panel, prices, Bambang at his
   bench, a second mechanic at the car and a customer on the south-east
   floor, toward the door.
4. **Map** — the tile-grid GPS map after a played session (round 20):
   coloured tiles per district, a purple GPS route with coloured
   checkpoints, story missions + current job on the left, real stats
   (14 takedowns, 6 cars stolen, $2,150 stunts, 2 of 3 races won) +
   42% ring + legend on the right, crew bar at the bottom.

## Tech

- Three.js r152, vendored under `game/vendor/` (no network at runtime).
- Plain static files: `game/index.html` + ES modules under `game/src/`.
- `main.ts` (Node 22, standard library only) copies `game/` and
  `screenshots/` to `/output` and writes `dossier.json` — it also runs a
  preflight: 4 screenshots within the 256 KiB cap, `game/` within 48 MiB,
  and no network reference in any game source.

## License

MIT

<!-- Round 20: Garuda rebuilt as a FLAT WEDGE (belt 1.16, roof 1.49, crown 0, white corner tail lamps, small black wing, r 0.46 wheels at the flanks) + tile-grid GPS map + night combat 23:40 + dark asphalt + KENCANA title with SAVE button; screenshots re-rendered. -->
<!-- Round 19: Garuda rebuilt from scratch on the crowned loft (integrated ducktail, swept sphere headlights, dark tan seats, bright chrome exhausts, flat arch rings) + SUV/pickup/minibus lofted; screenshots re-rendered. -->
