// KENCANA — A Crime Story in Kencana Bay · 1998 (gta6-01, rebuild #5 / v8).
// An open-world crime game: 12 story missions, police pursuit with a
// helicopter, car stealing, on-foot combat, an enterable garage, street
// races, a crew, a radio and saves — plain static files a desktop browser
// loads offline (game/index.html and its ES modules, Three.js r152 vendored
// under game/vendor/, no library pulled from a network and no network
// request at runtime). The program copies game/ and screenshots/ from
// beside this file to /output and writes /output/dossier.json, the summary
// the judge reads, with the vendored make.fun library.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Screenshot preflight: the entry is only handed in when the four shots
// exist, each one is a real render within the byte cap, the game tree fits
// the size cap, and no game source reaches out to a network (the game must
// run offline: every reference is a relative path, every import is local).
const SHOTS = ['1-chase.jpg', '2-combat.jpg', '3-garage.jpg', '4-map.jpg'];
function walk(dir, outPaths = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) walk(p, outPaths);
    else outPaths.push(p);
  }
  return outPaths;
}
function preflight() {
  const shotsDir = join(here, 'screenshots');
  for (const name of SHOTS) {
    const p = join(shotsDir, name);
    if (!existsSync(p)) throw new Error(`preflight: missing screenshot ${name}`);
    const size = statSync(p).size;
    if (size > 262144) throw new Error(`preflight: ${name} is ${size} bytes, over the 256 KiB cap`);
    if (size < 8000) throw new Error(`preflight: ${name} is suspiciously small (${size} bytes) for a 1280x720 render`);
  }
  const gameFiles = walk(join(here, 'game'));
  let total = 0;
  for (const p of gameFiles) {
    total += statSync(p).size;
    // Vendored third-party libraries are not scanned for URL-like text:
    // the only such string in Three.js is the DOM namespace identifier
    // passed to document.createElementNS (never fetched, just a name).
    // Our own sources are all scanned.
    if (p.includes('game/vendor/')) continue;
    if (/\.(html|js|mjs|css|json)$/.test(p)) {
      const src = readFileSync(p, 'utf8');
      const hit = src.match(/https?:\/\/[^\s"'`]+|src\s*=\s*["']https?:|href\s*=\s*["']https?:|from\s+["']https?:|import\(["']https?:/);
      if (hit) throw new Error(`preflight: network reference in ${p}: ${hit[0]}`);
    }
  }
  if (total > 50331648) throw new Error(`preflight: game/ is ${total} bytes, over the 48 MiB cap`);
  console.log(`preflight ok: 4 screenshots, game/ ${gameFiles.length} files, ${(total / 1048576).toFixed(2)} MiB`);
}
preflight();

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
