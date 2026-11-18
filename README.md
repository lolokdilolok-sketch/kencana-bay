# Kencana Bay — A Crime Story in Kencana Bay · 1998

[![make.fun](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![rank](https://make.fun/badge/gta6-01/lolokdilolok-sketch/kencana-bay/rank.svg)](https://make.fun/bounty/gta6-01)
[![reward](https://make.fun/badge/gta6-01/lolokdilolok-sketch/kencana-bay/reward.svg)](https://make.fun/bounty/gta6-01)

An open-world crime game in the spirit of GTA 6, built for the make.fun
bounty [gta6-01](https://make.fun/bounty/gta6-01). A wheelman comes home to
Teluk Kencana in 1998: a sun-soaked beach city with six districts, a gold
Garuda GT to steal, twelve story missions, a crew to hire, and the KPD
(Kencana Police Department) to outrun.

## Play

Open `game/index.html` in desktop Chrome (or run `node serve.ts` and open
http://localhost:8080). Keyboard and mouse, no network needed.

- **WASD** drive / walk · **E** enter or steal a car · **J** shoot ·
  **R** reload · **1–5** weapons · **Z / X / C** hire crew ·
  **G** garage · **M** map · **P** pause · **T** radio

## The game

- A 3D city: Pelabuhan Segara, Kampung Batik, Alun-Alun, Lorong Emas,
  Pantai Kidul and Pasar Senja — docks, a batik workshop, a grand hotel,
  a casino, a ferris wheel on the beach, a market and a car showroom.
- The Garuda GT: a low, wide, metallic-gold sports car with a lofted
  wedge body, black roof, double white stripes, white star rims, a big
  spoiler and a visible driver.
- Twelve story missions ($300–$1,200 each), three crew members for hire
  (Agus the driver, Bambang the mechanic, Ratna the fixer), a wanted
  level from zero to five stars with pursuing KPD cars, a helicopter at
  three stars and roadblocks at four.
- Five weapons, drift and stunt bonuses, a synthesised Gamelan FM 101.1
  radio loop, save / load with autosave, a safehouse and a garage.
- A HUD with a mission panel, crew panel, KPD response panel, round
  minimap, weapon slots, speedometer and a dialogue bar with character
  portraits — plus a transparent GPS map of the whole city.

## Structure

- `main.ts` — hands the game in: copies `game/` and `screenshots/` to
  the output and writes `dossier.json` with the vendored make.fun library.
- `game/index.html` — the page, the HUD and the title and map screens.
- `game/src/config.js` — tuning, districts, missions, crew, weapons.
- `game/src/world.js` — the city: roads, buildings, landmarks, beach.
- `game/src/vehicles.js` — the Garuda GT and every other vehicle.
- `game/src/pedestrians.js` — traffic cars and walking people.
- `game/src/police.js` — the wanted level and the KPD.
- `game/src/missions.js` — the twelve-mission story.
- `game/src/hud.js` — panels, minimap, portraits and the GPS map.
- `game/src/audio.js` — the Gamelan FM synth radio.
- `game/src/render.js` — the sunset renderer and cameras.
- `game/src/input.js` — keyboard state.
- `game/src/main.js` — the loop, screens, saving and screenshots.
- `game/vendor/three.min.js` — vendored Three.js r152.

## License

MIT. See `LICENSE`.
