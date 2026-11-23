// Round 21 reseal — preflight entrypoint for Kencana Bay (gta6-01).
// Written from scratch in the reseal recorded session 01a206af: copies
// game/ + screenshots/ into the output dir, verifies every copy byte for
// byte, writes dossier.json with buildDossier, prints the preflight line.
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR || repoRoot;

const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
};

function sha256Hex(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function listFiles(dir, base = dir) {
  const out = [];
  for (const name of readdirSync(dir).sort()) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...listFiles(full, base));
    else out.push(relative(base, full));
  }
  return out;
}

function copyVerified(srcDir, dstDir) {
  mkdirSync(dstDir, { recursive: true });
  const files = listFiles(srcDir);
  let bytes = 0;
  for (const rel of files) {
    const src = join(srcDir, rel);
    const dst = join(dstDir, rel);
    if (src !== dst) {
      mkdirSync(dirname(dst), { recursive: true });
      cpSync(src, dst);
    }
    const a = readFileSync(src);
    const b = readFileSync(dst);
    if (a.length !== b.length || sha256Hex(a) !== sha256Hex(b)) {
      throw new Error(`copy mismatch: ${rel}`);
    }
    bytes += a.length;
  }
  return { files: files.length, bytes };
}
const gameSrc = join(repoRoot, 'game');
const shotsSrc = join(repoRoot, 'screenshots');
if (!existsSync(join(gameSrc, 'index.html'))) throw new Error('game/index.html missing');
if (!existsSync(shotsSrc)) throw new Error('screenshots/ missing');

const game = copyVerified(gameSrc, join(outDir, 'game'));
const shots = copyVerified(shotsSrc, join(outDir, 'screenshots'));
const shotImages = listFiles(join(outDir, 'screenshots'))
  .filter((f) => /\.(png|jpe?g)$/i.test(f));
if (shotImages.length !== 4) throw new Error(`expected 4 screenshots, found ${shotImages.length}`);

const dossier = buildDossier(outDir, CAPS);
writeFileSync(join(outDir, 'dossier.json'), dossier);

const totalMiB = ((game.bytes + shots.bytes) / (1024 * 1024)).toFixed(2);
console.log(`preflight ok: ${shotImages.length} screenshots, game/ ${game.files} files, ${totalMiB} MiB`);
