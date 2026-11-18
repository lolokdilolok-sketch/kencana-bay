# KENCANA — A Crime Story in Kencana Bay · 1998

[![make.fun](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![rank](https://make.fun/badge/gta6-01/lolokdilolok-sketch/kencana-bay/rank.svg)](https://make.fun/bounty/gta6-01)
[![reward](https://make.fun/badge/gta6-01/lolokdilolok-sketch/kencana-bay/reward.svg)](https://make.fun/bounty/gta6-01)

An open-world crime game for the make.fun **Make GTA 6** bounty (`gta6-01`).
A sun-soaked coastal city of our own — no Rockstar names, maps, art or music.

## Play

```sh
node serve.ts
# open http://localhost:8080
```

Desktop Chrome, keyboard + mouse, fully offline. `WASD` drive / walk,
`E` enter / exit a car (steal it), `J` or mouse shoot, `R` reload,
`1–5` weapons, `Z` / `X` / `C` hire crew, `G` garage, `M` map,
`P` pause, `T` radio. Progress autosaves to localStorage.

## The game

- **Kencana Bay, 1998** — sea on the west edge, six districts
  (Pelabuhan Segara, Kampung Batik, Alun-Alun, Lorong Emas, Pantai Kidul,
  Pasar Senja), road grid, traffic, pedestrians, palms, a ferris wheel
  and a KENCANA FM 101.1 billboard on the beach.
- **The Garuda GT** — a gold (#ffb400) lofted-wedge sports car with
  double white stripes, white star rims, a big spoiler and a visible
  seated driver. Sedan, taxi, van and truck traffic; white/blue KPD
  police cars and a police helicopter.
- **12 story missions** ($300–$1200): Selamat Datang, Hot Wheels,
  Antar Paket, Tagihan Pasar, Mata-Mata, Balapan Senja, Gudang Segara,
  Kabur dari KPD, Heat Wave, Kencana Hilang, Double Cross, The Last Ride.
- **Crew hire with real effects** — Agus Prasetyo (driver, $200),
  Bambang (mechanic, $350), Ratna (fixer, $300, +15% payout).
- **Wanted 0–5 stars** — KPD pursuit units, helicopter spotlight at 3
  stars, roadblocks at 4 stars; heat cools when you lose the tail.
- **5 weapons** (Pistol, Kancil SMG, Shotgun, Garuda, Launcher), drift
  stunts for cash, synth radio Gamelan FM 101.1, save / load, and a GPS
  map (M) with a transparent district mosaic, grid A–F / 1–6 and a route
  line to the objective.

## Structure

```
main.ts                  entry: copies game/ + screenshots/ to /output, writes dossier.json
serve.ts                 tiny static server for local play
vendor/makefun-game.ts   kit library (unchanged)
game/index.html          HUD, title screen, map screen (DOM + CSS)
game/vendor/three.min.js Three.js r152 (vendored library)
game/src/config.js       tuning, districts, crew, missions, weapons, palette
game/src/random.js       seeded RNG (mulberry32)
game/src/three-shim.js   re-exports the vendored THREE global
game/src/input.js        keyboard + mouse
game/src/audio.js        WebAudio synth: radio, engine, shots, cash
game/src/render.js       renderer, sunset lights, fog, chase camera
game/src/world.js        the city: sky, sea, roads, buildings, palms, props
game/src/vehicles.js     the Garuda GT, traffic cars, helicopter, wheelman, driving
game/src/pedestrians.js  traffic + pedestrians (ambient life)
game/src/police.js       KPD wanted level, pursuit, helicopter, roadblocks
game/src/missions.js     the 12-job story state machine
game/src/hud.js          HUD panels, minimap, dialogue portraits, GPS map
game/src/main.js         boot, game loop, screens, screenshot staging
screenshots/             4 real renders: chase, on foot, map, title
```

## License

MIT. See `LICENSE`.
