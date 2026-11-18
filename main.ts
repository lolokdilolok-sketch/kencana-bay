// Kencana Bay — Make GTA 6 entry (Node 22, standard library only). The game is this
// directory's game/ folder: plain static files a desktop browser loads offline
// (game/index.html and its ES modules, Three.js r152 vendored under game/vendor/, no
// network request), and this program hands it in. It copies game/ and screenshots/ from
// beside this file to /output and writes /output/dossier.json, the summary the judge
// reads, with the vendored make.fun library.
//
// The game: an open-world crime story in Kencana Bay, 1998 — six districts, traffic and
// pedestrians, a wanted level with KPD police and a helicopter, 12 story missions, a crew
// to hire, an enterable garage (repaint and repair), and a repeatable street race.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Pre-flight: the entry needs exactly the four real screenshots, each within the cap.
// Failing here beats handing in an entry the scorer would refuse for a missing shot.
const shotDir = join(here, 'screenshots');
const shots = existsSync(shotDir) ? readdirSync(shotDir).filter((f) => f.endsWith('.jpg')).sort() : [];
if (shots.length !== 4) throw new Error(`main.ts: expected 4 screenshots in screenshots/, found ${shots.length}`);
for (const shot of shots) {
  const size = statSync(join(shotDir, shot)).size;
  if (size > 262144) throw new Error(`main.ts: ${shot} is ${size} bytes, over the 256 KiB cap`);
}

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files in game/ or 48 MiB of game
// files, in all, or a path under game/ over 1000 bytes: game/ counts beside /output's own 1000-entry cap, its
// screenshots/ and dossier.json).
const dossierBytes = buildDossier(out, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(out, 'dossier.json'), dossierBytes);

// Build summary, so a run prints what it handed in instead of failing silently later.
function treeStats(dir) {
  let files = 0;
  let bytes = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      const sub = treeStats(path);
      files += sub.files;
      bytes += sub.bytes;
    } else {
      files += 1;
      bytes += statSync(path).size;
    }
  }
  return { files, bytes };
}
const gameStats = treeStats(join(out, 'game'));
console.log(`Kencana Bay v7 — dossier ${dossierBytes.length} bytes, game ${gameStats.files} files / ${gameStats.bytes} bytes, screenshots: ${shots.map((s) => `${s} ${statSync(join(shotDir, s)).size}B`).join(', ')}`);
