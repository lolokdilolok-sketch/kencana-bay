// Kencana Bay — a Make GTA 6 entry (bounty gta6-01), built in this session.
// The game is this directory's game/ folder: a 3D open-world crime game in
// a fictional 1998 beach city, rendered with vendored Three.js, playable
// offline in desktop Chrome from plain static files (game/index.html and
// its ES modules, no network request). The program hands it in: it copies
// game/ and screenshots/ from beside this file to /output and writes
// /output/dossier.json, the summary the judge reads, with the vendored
// make.fun library. Four screenshots of the game itself live in
// screenshots/ (the first by name is the cover).
//
// What is in the game: six districts around a road grid with the sea on
// the west edge; a gold Garuda GT hero car (lofted wedge body, white
// stripes, star rims, spoiler, visible driver); traffic, KPD police cars
// and a helicopter; a 0–5 star wanted level with pursuit, heli at 3+ and
// roadblocks at 4+; twelve story missions from Selamat Datang to The Last
// Ride; three hireable crew members (Agus, Bambang, Ratna); five weapons;
// drifting and stunt bonuses; a synthesised Gamelan FM radio loop;
// save/load in local storage; a HUD with mission panel, crew panel, KPD
// panel, round minimap, weapon slots, speed, a dialogue bar with drawn
// portraits, and a transparent GPS map screen.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// Verification, done in this session with Playwright against the system
// Chromium: the title screen, starting the game, entering the hero car,
// driving, and opening and closing the map were all exercised; the run
// finished with 0 page errors, 0 external network requests and 0 failed
// requests. The four screenshots were read back by eye: the gold car, the
// "KENCANA BAY · v6 · 18 NOV 2026" stamp and the beach title backdrop with
// the ferris wheel are all visible. Running this file twice produces a
// byte-identical dossier.json, and the game folder, screenshots and
// dossier all sit inside the gate limits.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files in game/ or 48 MiB of game
// files, in all, or a path under game/ over 1000 bytes: game/ counts beside /output's own 1000-entry cap, its
// screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
