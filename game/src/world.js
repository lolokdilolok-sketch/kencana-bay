// The city of Teluk Kencana: six districts on a road grid, a sea to the west,
// a beach to the south, and landmarks in every district. Buildings are real
// facades — canvas textures with window grids, frames, lit glass, AC units,
// ground-floor entrances and shopfronts, plus 3D cornices, canopies,
// balconies with railings, rooftop tanks and antennas. Every building
// registers an AABB collider. Facades vary per side and per district: the
// street-facing side gets the entrance + shopfront, the other sides get
// windows only (the rear darker, fewer lights), and each district has its
// own window count, lit ratio and ground-floor treatment — so no entrance
// repeats on all four faces of a building.
// Round 20: downtown is CREAM now — the turquoise glass-tower chance fell
// 0.25 -> 0.10, so the chase boulevard reads as cream boxes with dark
// window grids like the reference, not a blue-glass wall; this line is
// written in the round 20 recorded session.
// Round 17 (top-1 recipe): facade styles per district (deco ribbon
// windows, warehouse vertical lines, plaster), warm sand / pastel /
// saturated district palettes, neon signs, striped awning segments,
// balconies on more floors, fins on glass towers, fuller roof clutter,
// sun-bleached roads with solid double-yellow lines, pale sidewalks,
// fan-leaf palms in dense rows along the chase boulevard, and a 150 m
// golden glass tower landmark.
import { THREE, box, cylinder, canvasTexture } from './three-shim.js';
import { WORLD, DISTRICTS, PALETTE } from './config.js';
import { createRandom } from './random.js';

/** Lighten (+) or darken (-) a #rrggbb colour by an amount 0..255. */
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, (n >> 16) + amt));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 0xff) + amt));
  const b = Math.max(0, Math.min(255, (n & 0xff) + amt));
  return `rgb(${r},${g},${b})`;
}

/** Same as shade(), but returns a #rrggbb string so the result can be
 * shaded again (used for the per-building base-colour variation). */
function shadeHex(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, (n >> 16) + amt));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 0xff) + amt));
  const b = Math.max(0, Math.min(255, (n & 0xff) + amt));
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}

/** Warm lit-window colours (round 15, top-10 study): mostly warm amber
 * #ffc878–#ffdf9a, with a few cool blue #bfe6ff and pink #ff9ad0 for
 * variety. The port's cool base colour keeps cool-lit glass. */
const LIT_WARM = ['#ffc878', '#ffdf9a', '#ffd27d', '#ffcf87', '#ffb060'];
function litWindowColor(base, f, c) {
  if (base === '#c8d8e8') return ['#c8d8e8', '#bfe6ff', '#dff0ff'][(f + c) % 3];
  const roll = (f * 5 + c * 7) % 10;
  if (roll < 7) return LIT_WARM[(f + c) % LIT_WARM.length];
  if (roll < 9) return '#bfe6ff';
  return '#ff9ad0';
}

/** The emissive half of a facade (round 15): black except the lit
 * windows, the shopfront glass and the door lamp, drawn with the same
 * grid math as facadeTexture so the two canvases line up exactly. */
function facadeEmissive(base, litColor, floors, opts = {}) {
  const cols = opts.cols ?? 4;
  const litChance = opts.litChance ?? 4;
  const ground = opts.ground ?? 'shop';
  return canvasTexture(512, 512, (x, w, h) => {
    x.fillStyle = '#000000';
    x.fillRect(0, 0, w, h);
    const floorH = h / floors;
    const winW = 76;
    const winH = Math.min(floorH * 0.52, 110);
    const litWin = (f, c, wx, wy) => {
      if (((f * 7 + c * 3 + 1) % 10) < litChance) {
        x.fillStyle = litWindowColor(litColor, f, c);
        x.fillRect(wx, wy, winW, winH);
      }
    };
    for (let f = 0; f < floors - 1; f += 1) {
      const y0 = f * floorH;
      for (let c = 0; c < cols; c += 1) {
        litWin(f, c, 36 + c * ((w - 72) / cols), y0 + (floorH - winH) / 2);
      }
    }
    const gy = (floors - 1) * floorH;
    if (ground === 'shop') {
      // Shopfront glass + the warm lamp over the entrance door.
      x.fillStyle = '#ffe9a0';
      x.fillRect(150, gy + 22, w - 190, floorH - 44);
      x.fillStyle = '#ffd94d';
      x.fillRect(62, gy + 14, 30, 10);
    } else if (ground === 'door') {
      x.fillStyle = '#ffd94d';
      x.fillRect(62, gy + 14, 30, 10);
      x.fillStyle = '#ffe9a0';
      x.fillRect(150, gy + 30, 130, floorH - 52);
    } else if (ground === 'plain') {
      for (let c = 0; c < cols; c += 1) {
        litWin(floors - 1, c, 36 + c * ((w - 72) / cols), gy + (floorH - winH) / 2);
      }
    }
  });
}

/**
 * A real facade: a wall with a vertical gradient, floor bands, big windows
 * with frames, glass gradients and mullions (some lit warm, some with
 * curtains), AC units drawn under some windows, and a ground floor whose
 * treatment depends on `opts.ground` — 'shop' (entrance door + shopfront
 * glass + awning band, for the street side), 'door' (a door + one window,
 * for kampung houses), 'roller' (a wide roller shutter, for port
 * warehouses) or 'plain' (ground-floor windows only, for side and rear
 * faces). `opts.cols` sets the window columns and `opts.litChance` the
 * share of lit windows (out of 10), so districts read differently.
 */
function facadeTexture(base, litColor, floors, opts = {}) {
  const cols = opts.cols ?? 4;
  const litChance = opts.litChance ?? 4; // round 17: top-1 lit rule 35–45% (was 5–7)
  const ground = opts.ground ?? 'shop';
  const style = opts.style ?? 'plaster'; // round 17: 'plaster' | 'deco' | 'warehouse'
  // Round 15: the facade now returns { map, emissive } — the colour map
  // plus the emissive map above, so lit windows glow at golden hour.
  const map = canvasTexture(512, 512, (x, w, h) => {
    const grad = x.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, shade(base, 18));
    grad.addColorStop(1, shade(base, -14));
    x.fillStyle = grad;
    x.fillRect(0, 0, w, h);
    // Round 17: warehouse walls get vertical wavy lines (top-1 recipe)
    // instead of a flat plaster wash.
    if (style === 'warehouse') {
      x.strokeStyle = 'rgba(0,0,0,0.22)';
      x.lineWidth = 5;
      for (let vx = 20; vx < w; vx += 32) {
        x.beginPath();
        x.moveTo(vx, 0);
        for (let vy = 0; vy <= h; vy += 32) x.lineTo(vx + Math.sin(vy / 40) * 4, vy);
        x.stroke();
      }
    }
    // Pilasters at the edges.
    x.fillStyle = 'rgba(0,0,0,0.18)';
    x.fillRect(0, 0, 14, h);
    x.fillRect(w - 14, 0, 14, h);
    const floorH = h / floors;
    const winW = 76;
    const winH = Math.min(floorH * 0.52, 110);
    const drawWindow = (wx, wy, f, c) => {
      const lit = ((f * 7 + c * 3 + 1) % 10) < litChance;
      if (style === 'deco') {
        // Round 17: ribbon windows — full-bay glass bands, 46% of the
        // floor height, with a white band and a porthole accent below.
        const rw = (w - 72) / cols - 10;
        const rh = floorH * 0.46;
        const rx = wx - (rw - winW) / 2;
        if (lit) {
          x.fillStyle = 'rgba(255,217,77,0.4)';
          x.fillRect(rx - 8, wy - 8, rw + 16, rh + 16);
        }
        x.fillStyle = '#1c2129';
        x.fillRect(rx - 4, wy - 4, rw + 8, rh + 8);
        if (lit) {
          x.fillStyle = litWindowColor(litColor, f, c);
        } else {
          const gg = x.createLinearGradient(rx, wy, rx, wy + rh);
          gg.addColorStop(0, '#9db8cc');
          gg.addColorStop(0.55, '#5a7a96');
          gg.addColorStop(1, '#2c3e55');
          x.fillStyle = gg;
        }
        x.fillRect(rx, wy, rw, rh);
        x.fillStyle = 'rgba(20,26,34,0.85)';
        x.fillRect(rx + rw / 2 - 2, wy, 4, rh);
        x.fillStyle = '#f2efe6';
        x.fillRect(rx, wy + rh + 6, rw, 8);
        x.fillStyle = '#2c4a5e';
        x.beginPath(); x.arc(rx + rw - 12, wy + rh + 26, 9, 0, Math.PI * 2); x.fill();
        x.fillStyle = '#bfe6ff';
        x.beginPath(); x.arc(rx + rw - 12, wy + rh + 26, 5, 0, Math.PI * 2); x.fill();
        return;
      }
      if (lit) {
        // Warm halo around a lit window, so it glows against the wall.
        // Round 11: stronger (was 0.28) — lit windows must read at dusk.
        x.fillStyle = 'rgba(255,217,77,0.4)';
        x.fillRect(wx - 10, wy - 10, winW + 20, winH + 20);
      }
      // Round 12: a thicker, darker frame + a pale sill ledge under the
      // window, so the grid reads as real framed windows, not flat holes.
      x.fillStyle = '#1c2129';
      x.fillRect(wx - 6, wy - 6, winW + 12, winH + 6);
      x.fillStyle = '#c8c2b4';
      x.fillRect(wx - 6, wy + winH, winW + 12, 5);
      if (lit) {
        x.fillStyle = litWindowColor(litColor, f, c); // round 15: warm amber variety + a few blue/pink (was one flat #ffd94d)
      } else {
        const gg = x.createLinearGradient(wx, wy, wx, wy + winH);
        gg.addColorStop(0, '#9db8cc');
        gg.addColorStop(0.55, '#5a7a96');
        gg.addColorStop(1, '#2c3e55');
        x.fillStyle = gg;
      }
      x.fillRect(wx, wy, winW, winH);
      x.fillStyle = 'rgba(20,26,34,0.85)';
      x.fillRect(wx + winW / 2 - 2, wy, 4, winH);
      x.fillRect(wx, wy + winH / 2 - 2, winW, 4);
      // Round 12: curtains in varied colours on some unlit windows,
      // venetian blinds (slats) on others — the glass is no longer one
      // flat blue sheet on every floor.
      const curt = (f * 5 + c * 7) % 9;
      if (!lit && curt < 2) {
        x.fillStyle = ['rgba(240,230,210,0.55)', 'rgba(216,232,240,0.5)', 'rgba(240,216,216,0.5)'][(f + c) % 3];
        x.fillRect(wx + 4, wy + 4, winW / 2 - 6, winH - 8);
      } else if (!lit && curt < 4) {
        x.fillStyle = 'rgba(28,32,40,0.7)';
        for (let s = 0; s < 4; s += 1) x.fillRect(wx + 3, wy + 6 + s * ((winH - 12) / 4), winW - 6, 3);
      }
      if ((f * 3 + c * 5) % 8 < 2) {
        x.fillStyle = '#8a8f96';
        x.fillRect(wx + 10, wy + winH + 6, 42, 20);
        x.fillStyle = '#3a3f46';
        x.beginPath(); x.arc(wx + 31, wy + winH + 16, 7, 0, Math.PI * 2); x.fill();
      }
    };
    for (let f = 0; f < floors - 1; f += 1) {
      const y0 = f * floorH;
      x.fillStyle = 'rgba(0,0,0,0.28)';
      x.fillRect(0, y0 + floorH - 6, w, 6);
      x.fillStyle = 'rgba(255,255,255,0.07)';
      x.fillRect(0, y0, w, 3);
      for (let c = 0; c < cols; c += 1) {
        const wx = 36 + c * ((w - 72) / cols);
        drawWindow(wx, y0 + (floorH - winH) / 2, f, c);
      }
    }
    // Ground floor, per treatment.
    const gy = (floors - 1) * floorH;
    x.fillStyle = 'rgba(0,0,0,0.3)';
    x.fillRect(0, gy, w, 8);
    if (ground === 'shop') {
      x.fillStyle = '#2b2f38';
      x.fillRect(40, gy + 26, 74, floorH - 40);
      x.fillStyle = '#5a7a96';
      x.fillRect(48, gy + 34, 58, floorH - 56);
      x.fillStyle = '#232830';
      x.fillRect(48, gy + 34, 58, 6);
      // Round 12: a warm lamp glowing above the entrance door.
      x.fillStyle = 'rgba(255,217,77,0.25)';
      x.fillRect(52, gy + 8, 50, 22);
      x.fillStyle = 'rgba(255,217,77,0.9)';
      x.fillRect(62, gy + 14, 30, 10);
      x.fillStyle = 'rgba(210,230,245,0.9)';
      x.fillRect(150, gy + 22, w - 190, floorH - 44);
      x.fillStyle = '#232830';
      for (let i = 0; i < 4; i += 1) x.fillRect(150 + i * ((w - 190) / 4), gy + 22, 5, floorH - 44);
      x.fillRect(150, gy + 22, w - 190, 6);
      x.fillStyle = shade(base, 34);
      x.fillRect(0, gy + 8, w, 12);
    } else if (ground === 'door') {
      // A single entrance door + one shop window beside it.
      x.fillStyle = '#2b2f38';
      x.fillRect(40, gy + 26, 74, floorH - 40);
      x.fillStyle = '#5a7a96';
      x.fillRect(48, gy + 34, 58, floorH - 56);
      x.fillStyle = '#232830';
      x.fillRect(48, gy + 34, 58, 6);
      // Round 12: a warm lamp glowing above the entrance door.
      x.fillStyle = 'rgba(255,217,77,0.25)';
      x.fillRect(52, gy + 8, 50, 22);
      x.fillStyle = 'rgba(255,217,77,0.9)';
      x.fillRect(62, gy + 14, 30, 10);
      x.fillStyle = 'rgba(210,230,245,0.9)';
      x.fillRect(150, gy + 30, 130, floorH - 52);
      x.fillStyle = '#232830';
      x.fillRect(150 + 62, gy + 30, 5, floorH - 52);
      x.fillStyle = shade(base, 34);
      x.fillRect(0, gy + 8, w, 12);
    } else if (ground === 'roller') {
      // A wide roller shutter for a warehouse + a small personnel door.
      x.fillStyle = '#6a6f76';
      x.fillRect(60, gy + 18, w - 150, floorH - 32);
      x.fillStyle = '#4a4f56';
      for (let s = 0; s < 6; s += 1) x.fillRect(60, gy + 26 + s * ((floorH - 40) / 6), w - 150, 3);
      x.fillStyle = '#2b2f38';
      x.fillRect(w - 66, gy + 26, 44, floorH - 40);
      x.fillStyle = '#5a7a96';
      x.fillRect(w - 60, gy + 32, 32, floorH - 52);
    } else {
      // Plain side/rear: ground-floor windows in the same grid, no door.
      for (let c = 0; c < cols; c += 1) {
        const wx = 36 + c * ((w - 72) / cols);
        drawWindow(wx, gy + (floorH - winH) / 2, floors - 1, c);
      }
    }
    // Parapet band at the top.
    x.fillStyle = 'rgba(0,0,0,0.35)';
    x.fillRect(0, 0, w, 10);
  });
  return { map, emissive: facadeEmissive(base, litColor, floors, opts) };
}

/**
 * A blue-glass curtain wall for the tallest downtown towers (round 7,
 * like the reference's blue-glass skyscrapers): a deep blue gradient,
 * a full grid of glass panes with bright blue reflections, floor bands,
 * and warm lit windows scattered through it.
 */
function glassFacadeTexture(floors, litChance = 5) { // round 17: top-1 glass lit 45% (was 6)
  const cols = 5;
  // Round 15: like facadeTexture, returns { map, emissive } — the glass
  // towers' lit windows glow at golden hour too.
  const map = canvasTexture(512, 512, (x, w, h) => {
    const grad = x.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#3d6a9a');
    grad.addColorStop(0.5, '#2c4a72');
    grad.addColorStop(1, '#1a2e4e');
    x.fillStyle = grad;
    x.fillRect(0, 0, w, h);
    const floorH = h / floors;
    const winW = 72;
    const winH = Math.min(floorH * 0.6, 110);
    for (let f = 0; f < floors; f += 1) {
      const y0 = f * floorH;
      x.fillStyle = 'rgba(0,0,0,0.35)';
      x.fillRect(0, y0 + floorH - 5, w, 5);
      for (let c = 0; c < cols; c += 1) {
        const wx = 34 + c * ((w - 68) / cols);
        const wy = y0 + (floorH - winH) / 2;
        const lit = ((f * 7 + c * 3 + 1) % 10) < litChance;
        if (lit) {
          x.fillStyle = 'rgba(255,217,77,0.35)';
          x.fillRect(wx - 8, wy - 8, winW + 16, winH + 16);
        }
        x.fillStyle = '#141a24';
        x.fillRect(wx - 4, wy - 4, winW + 8, winH + 8);
        if (lit) {
          x.fillStyle = litWindowColor('#ffd94d', f, c); // round 15: warm variety (was flat #ffd94d)
        } else {
          const gg = x.createLinearGradient(wx, wy, wx + winW, wy + winH);
          gg.addColorStop(0, '#b8d8f0');
          gg.addColorStop(0.5, '#5a8ab8');
          gg.addColorStop(1, '#2c4a72');
          x.fillStyle = gg;
        }
        x.fillRect(wx, wy, winW, winH);
        x.fillStyle = 'rgba(20,26,34,0.85)';
        x.fillRect(wx + winW / 2 - 2, wy, 4, winH);
        x.fillRect(wx, wy + winH / 2 - 2, winW, 4);
      }
    }
    x.fillStyle = 'rgba(0,0,0,0.35)';
    x.fillRect(0, 0, w, 10);
  });
  const emissive = canvasTexture(512, 512, (x, w, h) => {
    x.fillStyle = '#000000';
    x.fillRect(0, 0, w, h);
    const floorH = h / floors;
    const winW = 72;
    const winH = Math.min(floorH * 0.6, 110);
    for (let f = 0; f < floors; f += 1) {
      const y0 = f * floorH;
      for (let c = 0; c < cols; c += 1) {
        if (((f * 7 + c * 3 + 1) % 10) < litChance) {
          x.fillStyle = litWindowColor('#ffd94d', f, c);
          x.fillRect(34 + c * ((w - 68) / cols), y0 + (floorH - winH) / 2, winW, winH);
        }
      }
    }
  });
  return { map, emissive };
}

/** A point just outside one face of a box, with the rotation a flat plane
 * on that face needs. dir is '+x' | '-x' | '+z' | '-z'. */
function facePoint(dir, x, z, w, dep, out) {
  if (dir === '+x') return { x: x + w / 2 + out, z, rotY: Math.PI / 2 };
  if (dir === '-x') return { x: x - w / 2 - out, z, rotY: -Math.PI / 2 };
  if (dir === '+z') return { x, z: z + dep / 2 + out, rotY: 0 };
  return { x, z: z - dep / 2 - out, rotY: Math.PI };
}

/** Pale warm pavement with joint grid + speckle (round 17, top-1
 * recipe): the sidewalk is #d9d0c4 with a joint every 2u, not one flat
 * grey slab. One tile covers 8u x 8u. */
function sidewalkTexture() {
  return canvasTexture(256, 256, (x, w, h) => {
    x.fillStyle = PALETTE.sidewalk;
    x.fillRect(0, 0, w, h);
    x.fillStyle = 'rgba(255,255,255,0.08)';
    for (let i = 0; i < 120; i += 1) {
      x.fillRect((i * 41) % w, (i * 67) % h, 2, 2);
    }
    x.fillStyle = 'rgba(0,0,0,0.05)';
    for (let i = 0; i < 60; i += 1) {
      x.fillRect((i * 53) % w, (i * 31) % h, 3, 2);
    }
    x.strokeStyle = 'rgba(0,0,0,0.28)';
    x.lineWidth = 3;
    for (let j = 0; j <= 4; j += 1) {
      x.beginPath(); x.moveTo(j * 64, 0); x.lineTo(j * 64, h); x.stroke();
      x.beginPath(); x.moveTo(0, j * 64); x.lineTo(w, j * 64); x.stroke();
    }
  });
}

function tileTexture(base) {
  return canvasTexture(128, 128, (x, w, h) => {
    x.fillStyle = base;
    x.fillRect(0, 0, w, h);
    x.strokeStyle = 'rgba(0,0,0,0.35)';
    x.lineWidth = 3;
    for (let r = 0; r < 8; r += 1) {
      x.beginPath(); x.moveTo(0, r * 16); x.lineTo(w, r * 16); x.stroke();
    }
    for (let c = 0; c < 8; c += 1) {
      x.beginPath(); x.moveTo(c * 16, 0); x.lineTo(c * 16, h); x.stroke();
    }
  });
}

function shopTexture(name, bg, fg) {
  return canvasTexture(256, 128, (x, w, h) => {
    x.fillStyle = bg;
    x.fillRect(0, 0, w, h);
    x.fillStyle = '#f2ead8';
    x.fillRect(0, 0, w, 34);
    x.fillStyle = '#1c1c1c';
    x.font = 'bold 24px system-ui, sans-serif';
    x.textAlign = 'center';
    x.fillText(name, w / 2, 26);
    for (let i = 0; i < 8; i += 1) {
      x.fillStyle = i % 2 ? '#ff2e63' : '#ffd94d';
      x.fillRect(i * 32, 34, 32, 14);
    }
    x.fillStyle = 'rgba(255,240,180,0.9)';
    x.fillRect(16, 64, 96, 48);
    x.fillRect(144, 64, 96, 48);
    x.fillStyle = '#222831';
    x.fillRect(16, 64, 96, 6);
    x.fillRect(144, 64, 96, 6);
  });
}

/** A neon sign (round 17, top-1 recipe): the name in a glowing neon
 * colour on a dark panel with a neon border — the canvas text is drawn
 * twice (a blurred neon glow, then white at 0.6 alpha on top), and the
 * material is unlit (toneMapped false) so the sign glows even in
 * daylight. Names here are ours only (HOTEL KENCANA, CASINO EMAS…). */
function neonSignTexture(name, neon, tw = 512, th = 128) {
  return canvasTexture(tw, th, (x, w, h) => {
    x.fillStyle = '#140f2a';
    x.fillRect(0, 0, w, h);
    x.strokeStyle = neon;
    x.lineWidth = 6;
    x.strokeRect(5, 5, w - 10, h - 10);
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.font = `900 italic ${Math.floor(h * 0.52)}px system-ui, sans-serif`;
    x.shadowColor = neon;
    x.shadowBlur = 18;
    x.fillStyle = neon;
    x.fillText(name, w / 2, h / 2 + 2);
    x.fillText(name, w / 2, h / 2 + 2);
    x.shadowBlur = 0;
    x.globalAlpha = 0.6;
    x.fillStyle = '#ffffff';
    x.fillText(name, w / 2, h / 2 + 2);
    x.globalAlpha = 1;
  });
}

/** A tall vertical shop sign (round 12, like the vertical neon signs on
 * the reference's towers): the name runs bottom-to-top down the face of
 * a tall building, so the street reads busy even from a distance.
 * Round 14: font/canvas size are parameters — the round 13 sign used a
 * 26px font on a 64x256 canvas, which rendered ~6px tall at the chase
 * camera's 127u and was unreadable. Big signs now use a 128x512 canvas
 * with a 64-90px font, so the letters are 2.5-4u tall in the world. */
function verticalSignTexture(name, bg, fontPx = 26, tw = 64, th = 256) {
  return canvasTexture(tw, th, (x, w, h) => {
    x.fillStyle = bg;
    x.fillRect(0, 0, w, h);
    x.fillStyle = '#f2ead8';
    x.fillRect(0, 0, w, Math.max(10, h / 25));
    x.fillStyle = '#1c1c1c';
    x.save();
    x.translate(w / 2, h / 2);
    x.rotate(-Math.PI / 2);
    x.font = `bold ${fontPx}px system-ui, sans-serif`;
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.fillText(name, 0, 0);
    x.restore();
    x.fillStyle = 'rgba(255,240,180,0.9)';
    x.fillRect(8, h - Math.max(28, h / 9), w - 16, Math.max(20, h / 12));
  });
}

function roadTexture() {
  return canvasTexture(256, 256, (x, w, h) => {
    x.fillStyle = PALETTE.road;
    x.fillRect(0, 0, w, h);
    // Asphalt speckle, so the road is not one flat slab of grey.
    // Round 17: heavier speckle on the sun-bleached asphalt.
    x.fillStyle = 'rgba(255,255,255,0.07)';
    for (let i = 0; i < 140; i += 1) {
      x.fillRect((i * 37) % w, (i * 53) % h, 2, 2);
    }
    x.fillStyle = 'rgba(0,0,0,0.06)';
    for (let i = 0; i < 90; i += 1) {
      x.fillRect((i * 61) % w, (i * 29) % h, 3, 2);
    }
    // Round 17: tyre tracks — two dark bands down each lane, like the
    // top-1 sun-bleached asphalt (was faint wheel-worn bands).
    x.fillStyle = 'rgba(0,0,0,0.18)';
    x.fillRect(0, h * 0.12, w, h * 0.12);
    x.fillRect(0, h * 0.62, w, h * 0.12);
    // Round 17: SOLID double yellow centre line (top-1 recipe — the old
    // dashed yellow read as a country road, not a city boulevard).
    x.fillStyle = PALETTE.roadLine;
    x.fillRect(w / 2 - 10, 0, 5, h);
    x.fillRect(w / 2 + 5, 0, 5, h);
    // White dashed lane lines at 1/4 and 3/4 across, so each direction
    // reads as two marked lanes like the reference highway.
    x.fillStyle = 'rgba(255,255,255,0.75)';
    for (let dx = 0; dx < w; dx += 64) {
      x.fillRect(dx, h * 0.25 - 2, 32, 4);
      x.fillRect(dx, h * 0.75 - 2, 32, 4);
    }
    // Round 12: solid white edge lines (was a faint 0.25 alpha) + a dark
    // gutter band just inside each edge, so the road reads as a real
    // street with a drain at its kerb.
    x.fillStyle = 'rgba(255,255,255,0.85)';
    x.fillRect(0, 0, 10, h);
    x.fillRect(w - 10, 0, 10, h);
    x.fillStyle = 'rgba(0,0,0,0.32)';
    x.fillRect(10, 0, 14, h);
    x.fillRect(w - 24, 0, 14, h);
  });
}

/** A white painted turn arrow on the asphalt (round 12): 'straight',
 * 'left' or 'right'. Drawn pointing up on the canvas; the mesh is
 * rotated so up becomes the road direction. Round 13: colour + line
 * width are parameters, so the same shape can be drawn as a dark
 * stencil backing under the white arrow — the round 12 arrows were
 * too thin to read at the chase camera's shallow angle. */
function turnArrowTexture(kind, color = 'rgba(255,255,255,1.0)', lw = 20) {
  return canvasTexture(128, 256, (x, w, h) => {
    x.clearRect(0, 0, w, h);
    x.fillStyle = color;
    x.strokeStyle = color;
    x.lineWidth = lw;
    x.lineCap = 'round';
    const cx = w / 2;
    if (kind === 'straight') {
      x.beginPath(); x.moveTo(cx, h - 20); x.lineTo(cx, 64); x.stroke();
      x.beginPath(); x.moveTo(cx, 18); x.lineTo(cx - 30, 72); x.lineTo(cx + 30, 72); x.closePath(); x.fill();
    } else {
      // A curved turn arrow: the shaft bends left or right, the head
      // sits at the top pointing into the turn.
      const dir = kind === 'left' ? -1 : 1;
      x.beginPath(); x.moveTo(cx, h - 20);
      x.quadraticCurveTo(cx, h * 0.55, cx + dir * 26, h * 0.45);
      x.lineTo(cx + dir * 26, 74);
      x.stroke();
      x.save();
      x.translate(cx + dir * 26, 46);
      x.rotate(dir * Math.PI / 2.4);
      x.beginPath(); x.moveTo(0, -26); x.lineTo(-26, 18); x.lineTo(26, 18); x.closePath(); x.fill();
      x.restore();
    }
  });
}

/** A green overhead gantry sign, like the reference highway's: a steel
 * truss over the road with a big green board, white border, district
 * name + down arrows. Faces west (-x), so the chase camera driving east
 * reads it. */
function gantrySign(text, sub) {
  const g = new THREE.Group();
  const boardTex = canvasTexture(512, 160, (x, w, h) => {
    x.fillStyle = '#1a6e38';
    x.fillRect(0, 0, w, h);
    x.strokeStyle = '#f2f2f2';
    x.lineWidth = 6;
    x.strokeRect(6, 6, w - 12, h - 12);
    x.fillStyle = '#ffffff';
    x.font = 'bold 44px system-ui, sans-serif';
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.fillText(text, w / 2, sub ? 52 : h / 2 - 8);
    if (sub) {
      x.font = 'bold 30px system-ui, sans-serif';
      x.fillStyle = '#c8e8d0';
      x.fillText(sub, w / 2, 108);
    }
    // Down arrows under the name.
    x.fillStyle = '#ffffff';
    for (const ax of [w / 2 - 120, w / 2, w / 2 + 120]) {
      const ay = sub ? 138 : h - 32;
      x.beginPath();
      x.moveTo(ax - 14, ay - 10); x.lineTo(ax + 14, ay - 10); x.lineTo(ax + 14, ay + 2);
      x.lineTo(ax + 22, ay + 2); x.lineTo(ax, ay + 20); x.lineTo(ax - 22, ay + 2);
      x.lineTo(ax - 14, ay + 2); x.closePath(); x.fill();
    }
  });
  // Truss beam + two posts, spanning the 14u road + sidewalks.
  const beam = box(0.9, 0.9, 24, '#3a3f46', { metal: 0.6, rough: 0.4 });
  beam.position.set(0, 9.2, 0);
  g.add(beam);
  for (const sz of [-11, 11]) {
    const post = box(0.9, 9.2, 0.9, '#3a3f46', { metal: 0.6, rough: 0.4 });
    post.position.set(0, 4.6, sz);
    g.add(post);
    // Diagonal truss braces, so the beam reads as a truss, not a bar.
    const brace = box(0.4, 0.4, 3.4, '#3a3f46', { metal: 0.6, rough: 0.4 });
    brace.position.set(0, 8.2, sz * 0.82);
    brace.rotation.x = sz > 0 ? 0.6 : -0.6;
    g.add(brace);
  }
  const board = new THREE.Mesh(
    new THREE.PlaneGeometry(17, 5.3),
    new THREE.MeshStandardMaterial({ map: boardTex, roughness: 0.6 }),
  );
  board.position.set(-0.6, 8.6, 0);
  board.rotation.y = -Math.PI / 2; // faces west, toward the chase camera
  g.add(board);
  return g;
}

/** A warm pool of light on the asphalt under a street lamp. */
function lampPoolTexture() {
  return canvasTexture(128, 128, (x, w, h) => {
    const grad = x.createRadialGradient(w / 2, h / 2, 4, w / 2, h / 2, w / 2);
    grad.addColorStop(0, 'rgba(255,220,140,0.6)'); // round 11: brighter pools (was 0.5)
    grad.addColorStop(0.6, 'rgba(255,200,110,0.3)'); // (was 0.22)
    grad.addColorStop(1, 'rgba(255,200,110,0)');
    x.fillStyle = grad;
    x.fillRect(0, 0, w, h);
  });
}

/** A palm trunk with ring ridges, like a real palm's segmented trunk. */
function trunkTexture() {
  return canvasTexture(64, 256, (x, w, h) => {
    const grad = x.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, '#7a5a3b');
    grad.addColorStop(0.5, '#9a7a55');
    grad.addColorStop(1, '#6b4a2b');
    x.fillStyle = grad;
    x.fillRect(0, 0, w, h);
    x.fillStyle = 'rgba(60,40,20,0.55)';
    for (let y = 8; y < h; y += 18) x.fillRect(0, y, w, 4);
  });
}

function palm(rand) {
  const g = new THREE.Group();
  const h = rand.range(7, 11);
  const trunkMat = new THREE.MeshStandardMaterial({ map: trunkTexture(), roughness: 0.9 });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.34, h, 10), trunkMat);
  trunk.position.y = h / 2;
  trunk.rotation.z = rand.range(-0.08, 0.08);
  trunk.castShadow = true;
  g.add(trunk);
  // Round 17: fan leaves, not cones — 6–8 long thin dark-green leaves
  // per tier, spread radially from the crown and drooping outward, so
  // the palm reads as a palm instead of a pine (top-1 recipe). Each
  // leaf is a thin box whose centre sits half a leaf out along its own
  // direction (outward + slightly down), so it starts at the crown.
  const frondMat = new THREE.MeshStandardMaterial({ color: '#2f7a3d', roughness: 0.9, flatShading: true });
  const frondMat2 = new THREE.MeshStandardMaterial({ color: '#3d8a4b', roughness: 0.9, flatShading: true });
  for (let tier = 0; tier < 2; tier += 1) {
    const n = 7;
    const tilt = tier === 0 ? 0.55 : 0.9; // droop below horizontal
    for (let i = 0; i < n; i += 1) {
      const len = tier === 0 ? 4.2 : 4.8;
      const frond = new THREE.Mesh(
        new THREE.BoxGeometry(0.55, 0.05, len),
        tier === 0 ? frondMat : frondMat2,
      );
      const ang = (i / n) * Math.PI * 2 + tier * 0.45;
      const dx = Math.sin(ang) * Math.cos(tilt);
      const dz = Math.cos(ang) * Math.cos(tilt);
      const dy = -Math.sin(tilt);
      frond.position.set(
        dx * (len / 2),
        h + (tier === 0 ? 0.7 : 0.1) + dy * (len / 2),
        dz * (len / 2),
      );
      frond.rotation.order = 'YXZ';
      frond.rotation.y = ang;
      frond.rotation.x = tilt;
      frond.castShadow = true;
      g.add(frond);
    }
  }
  const nuts = new THREE.Mesh(
    new THREE.SphereGeometry(0.3, 8, 6),
    new THREE.MeshStandardMaterial({ color: '#6b4a2b', roughness: 0.9 }),
  );
  nuts.position.y = h - 0.2;
  g.add(nuts);
  return g;
}

/** A traffic light (round 15, top-10 street life): a pole, an arm over
 * the road and a 3-lamp head — one lamp lit bright (unlit material, so
 * it reads pure colour), the other two dim. `lit` is 0 red, 1 yellow,
 * 2 green. */
function trafficLight(lit = 2) {
  const g = new THREE.Group();
  const pole = cylinder(0.09, 0.12, 5.6, '#2a2a33');
  pole.position.y = 2.8;
  g.add(pole);
  const arm = box(2.6, 0.14, 0.14, '#2a2a33', { metal: 0.5, rough: 0.4 });
  arm.position.set(1.3, 5.5, 0);
  g.add(arm);
  const head = box(0.6, 1.7, 0.5, '#1c1c1c');
  head.position.set(2.5, 4.9, 0);
  g.add(head);
  const lampCols = ['#ff2e2e', '#ffb400', '#2eff5a'];
  for (let i = 0; i < 3; i += 1) {
    const on = i === lit;
    const lamp = new THREE.Mesh(
      new THREE.CircleGeometry(0.2, 14),
      new THREE.MeshBasicMaterial({ color: on ? lampCols[i] : '#333333' }),
    );
    lamp.position.set(2.5, 5.45 - i * 0.55, 0.26);
    g.add(lamp);
    if (on) {
      const glow = new THREE.Mesh(
        new THREE.SphereGeometry(0.34, 10, 8),
        new THREE.MeshBasicMaterial({ color: lampCols[i], transparent: true, opacity: 0.35 }),
      );
      glow.position.set(2.5, 5.45 - i * 0.55, 0.26);
      g.add(glow);
    }
  }
  return g;
}

function streetLamp() {
  const g = new THREE.Group();
  const pole = cylinder(0.09, 0.12, 6, '#2a2a33');
  pole.position.y = 3;
  g.add(pole);
  const head = box(0.5, 0.22, 0.9, '#ffd94d', { glow: 0xffd94d });
  head.position.set(0.3, 6.1, 0);
  g.add(head);
  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(0.7, 10, 8), // round 11: bigger, brighter lamp glow (was r 0.55, opacity 0.5)
    new THREE.MeshBasicMaterial({ color: '#ffe9a0', transparent: true, opacity: 0.65 }),
  );
  glow.position.set(0.3, 6.1, 0);
  g.add(glow);
  g.userData.glow = glow;
  return g;
}

/** A round green tree (the reference's round trees), trunk + three
 * canopies in two greens, so the crown reads full, not one flat ball. */
function roundTree(rand) {
  const g = new THREE.Group();
  const h = rand.range(3, 4.5);
  const trunkMat = new THREE.MeshStandardMaterial({ map: trunkTexture(), roughness: 0.9 });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.26, h, 8), trunkMat);
  trunk.position.y = h / 2;
  trunk.castShadow = true;
  g.add(trunk);
  const c1 = new THREE.Mesh(
    new THREE.SphereGeometry(rand.range(1.6, 2.2), 10, 8),
    new THREE.MeshStandardMaterial({ color: '#3d8a4b', roughness: 0.9, flatShading: true }),
  );
  c1.position.y = h + 0.8;
  c1.castShadow = true;
  g.add(c1);
  const c2 = new THREE.Mesh(
    new THREE.SphereGeometry(rand.range(1.0, 1.4), 8, 6),
    new THREE.MeshStandardMaterial({ color: '#4b9a55', roughness: 0.9, flatShading: true }),
  );
  c2.position.set(rand.range(-0.8, 0.8), h + 1.8, rand.range(-0.8, 0.8));
  c2.castShadow = true;
  g.add(c2);
  const c3 = new THREE.Mesh(
    new THREE.SphereGeometry(rand.range(0.8, 1.1), 8, 6),
    new THREE.MeshStandardMaterial({ color: '#35804a', roughness: 0.9, flatShading: true }),
  );
  c3.position.set(rand.range(-1.2, 1.2), h + 0.6, rand.range(-1.2, 1.2));
  c3.castShadow = true;
  g.add(c3);
  return g;
}

function ferrisWheel() {
  const g = new THREE.Group();
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(9, 0.5, 10, 28),
    new THREE.MeshStandardMaterial({ color: '#ff5e8a', roughness: 0.5, metalness: 0.3, emissive: 0x881133, emissiveIntensity: 0.6 }),
  );
  rim.castShadow = true;
  g.add(rim);
  const wheel = new THREE.Group();
  for (let i = 0; i < 8; i += 1) {
    const spoke = box(0.3, 17.6, 0.3, '#ffd94d');
    spoke.rotation.z = (i / 8) * Math.PI;
    wheel.add(spoke);
    const cabin = box(1.8, 1.6, 1.6, ['#ff2e63', '#2b6fd0', '#ffd94d', '#3d8a4b'][i % 4]);
    const a = (i / 8) * Math.PI * 2;
    cabin.position.set(Math.cos(a) * 8.2, Math.sin(a) * 8.2, 0);
    wheel.add(cabin);
  }
  const hub = cylinder(0.7, 0.7, 1.2, '#f2f2f2');
  hub.rotation.x = Math.PI / 2;
  wheel.add(hub);
  g.add(wheel);
  g.userData.wheel = wheel;
  for (const sx of [-1.6, 1.6]) {
    const leg = box(0.8, 10, 0.8, '#e8e8e8');
    leg.position.set(sx * 3, -5, 0);
    leg.rotation.z = -sx * 0.28;
    g.add(leg);
  }
  g.position.y = 10.5;
  return g;
}

export function createWorld(seed = 1) {
  const rand = createRandom(seed);
  const group = new THREE.Group();
  const colliders = [];
  const lamps = [];
  const wheels = [];
  const neonSigns = [];
  const buildings = [];

  function addCollider(x, z, hw, hd) {
    colliders.push({ x0: x - hw, x1: x + hw, z0: z - hd, z1: z + hd });
  }
  function inCollider(x, z, r = 0) {
    for (const c of colliders) {
      if (x > c.x0 - r && x < c.x1 + r && z > c.z0 - r && z < c.z1 + r) return true;
    }
    return false;
  }

  // Ground, sea, beach.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD.half * 2 + 260, WORLD.half * 2 + 40),
    new THREE.MeshStandardMaterial({ color: '#6e675e', roughness: 1 }), // round 11: neutral warm grey-brown (was purple-grey #6e6272 — the combat ground still read mauve)
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, -0.05, 0);
  ground.receiveShadow = true;
  group.add(ground);
  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(300, WORLD.half * 2 + 400),
    new THREE.MeshStandardMaterial({ color: PALETTE.sea, roughness: 0.25, metalness: 0.35 }),
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(-WORLD.half - 150, 0.02, 0);
  sea.receiveShadow = true;
  group.add(sea);
  const sand = new THREE.Mesh(
    new THREE.PlaneGeometry(36, 260),
    new THREE.MeshStandardMaterial({ color: PALETTE.sand, roughness: 1 }),
  );
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(-WORLD.half - 18, 0.03, 200);
  sand.receiveShadow = true;
  group.add(sand);
  // Park grass in Alun-Alun.
  const park = new THREE.Mesh(
    new THREE.PlaneGeometry(70, 50),
    new THREE.MeshStandardMaterial({ color: PALETTE.grass, roughness: 1 }),
  );
  park.rotation.x = -Math.PI / 2;
  park.position.set(-30, 0.04, 30);
  park.receiveShadow = true;
  group.add(park);

  // Roads: dark strips with dashed centre lines, plus sidewalks.
  const roadTex = roadTexture();
  for (const r of WORLD.roads) {
    for (const [w, h, x, z] of [
      [WORLD.half * 2, WORLD.roadWidth, 0, r],
      [WORLD.roadWidth, WORLD.half * 2, r, 0],
    ]) {
      const tex = roadTex.clone();
      tex.needsUpdate = true;
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(w / 40, 1);
      const road = new THREE.Mesh(
        new THREE.PlaneGeometry(w, h),
        new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }),
      );
      road.rotation.x = -Math.PI / 2;
      road.position.set(x, 0.06, z);
      road.receiveShadow = true;
      group.add(road);
    }
  }

  // Sidewalks: light strips with a curb step along every road, so the
  // buildings stand on pavement instead of flat grey ground.
  // Round 17: the pale warm pavement has a joint grid (sidewalkTexture,
  // one tile = 8u), so the sidewalks read as poured slabs.
  const walkTexBase = sidewalkTexture();
  for (const r of WORLD.roads) {
    for (const s of [-1, 1]) {
      const off = r + s * (WORLD.roadWidth / 2 + 3);
      const texH = walkTexBase.clone();
      texH.needsUpdate = true;
      texH.wrapS = THREE.RepeatWrapping;
      texH.wrapT = THREE.RepeatWrapping;
      texH.repeat.set(WORLD.half * 2 / 8, 6 / 8);
      const swH = new THREE.Mesh(
        new THREE.PlaneGeometry(WORLD.half * 2, 6),
        new THREE.MeshStandardMaterial({ map: texH, roughness: 1 }),
      );
      swH.rotation.x = -Math.PI / 2;
      swH.position.set(0, 0.05, off);
      swH.receiveShadow = true;
      group.add(swH);
      const texV = walkTexBase.clone();
      texV.needsUpdate = true;
      texV.wrapS = THREE.RepeatWrapping;
      texV.wrapT = THREE.RepeatWrapping;
      texV.repeat.set(6 / 8, WORLD.half * 2 / 8);
      const swV = new THREE.Mesh(
        new THREE.PlaneGeometry(6, WORLD.half * 2),
        new THREE.MeshStandardMaterial({ map: texV, roughness: 1 }),
      );
      swV.rotation.x = -Math.PI / 2;
      swV.position.set(off, 0.055, 0);
      swV.receiveShadow = true;
      group.add(swV);
    }
  }

  // Zebra crossings at the central junction, on the road.
  for (let i = 0; i < 6; i += 1) {
    const stripe = box(1.6, 0.04, 12, '#f2f2f2', { shadow: false });
    stripe.position.set(-60 + i * 3.4 - 8.5, 0.08, 0);
    group.add(stripe);
  }
  // Zebra crossings at the other main intersections, on both roads.
  for (const ix of [-60, 60]) {
    for (const iz of [-60, 60]) {
      for (let i = 0; i < 6; i += 1) {
        const sH = box(1.6, 0.04, 12, '#f2f2f2', { shadow: false });
        sH.position.set(ix - 8.5 + i * 3.4, 0.08, iz);
        group.add(sH);
        const sV = box(12, 0.04, 1.6, '#f2f2f2', { shadow: false });
        sV.position.set(ix, 0.08, iz - 8.5 + i * 3.4);
        group.add(sV);
      }
    }
  }

  // Round 12 road realism — turn arrows, kerbs, drains, parking bays,
  // manholes, stop lines and STOP signs, so the street reads as a real
  // city road, not a flat painted strip.
  const arrowTexs = {
    straight: turnArrowTexture('straight'),
    left: turnArrowTexture('left'),
    right: turnArrowTexture('right'),
  };
  const arrowMats = {};
  for (const k of Object.keys(arrowTexs)) {
    arrowMats[k] = new THREE.MeshBasicMaterial({ map: arrowTexs[k], transparent: true, depthWrite: false });
  }
  // Round 13: a dark stencil backing under every arrow, slightly larger
  // and thicker, so the white arrow reads against the asphalt with a
  // hard edge instead of washing out at a shallow angle.
  const arrowBackTexs = {
    straight: turnArrowTexture('straight', 'rgba(22,22,30,0.92)', 28),
    left: turnArrowTexture('left', 'rgba(22,22,30,0.92)', 28),
    right: turnArrowTexture('right', 'rgba(22,22,30,0.92)', 28),
  };
  const arrowBackMats = {};
  for (const k of Object.keys(arrowBackTexs)) {
    arrowBackMats[k] = new THREE.MeshBasicMaterial({ map: arrowBackTexs[k], transparent: true, depthWrite: false });
  }
  // rotZ: 0 = north (-z), -PI/2 = east (+x), PI/2 = west (-x), PI = south (+z).
  // Round 13: arrows are bigger (4.6 x 10, was 3.2 x 7) and there are
  // two more in the chase frame (-30, 70), so at least two read clearly
  // from the chase camera instead of just one.
  const placeArrow = (kind, ax, az, rotZ) => {
    const back = new THREE.Mesh(new THREE.PlaneGeometry(5.3, 11.5), arrowBackMats[kind]);
    back.rotation.set(-Math.PI / 2, 0, rotZ);
    back.position.set(ax, 0.06, az);
    group.add(back);
    const a = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 10), arrowMats[kind]);
    a.rotation.set(-Math.PI / 2, 0, rotZ);
    a.position.set(ax, 0.09, az);
    group.add(a);
  };
  // Eastbound lane of the main road (the chase frame): a turn arrow
  // before each intersection, straights between them.
  placeArrow('right', -80, 63, -Math.PI / 2);
  placeArrow('straight', -30, 63, -Math.PI / 2);
  placeArrow('straight', -10, 63, -Math.PI / 2);
  placeArrow('left', 40, 63, -Math.PI / 2);
  placeArrow('right', 70, 63, -Math.PI / 2);
  placeArrow('straight', 100, 63, -Math.PI / 2);
  placeArrow('left', 160, 63, -Math.PI / 2);
  placeArrow('straight', 220, 63, -Math.PI / 2);
  // Northbound lane of the cross road.
  placeArrow('left', 57, -80, 0);
  placeArrow('straight', 57, -10, 0);
  placeArrow('straight', 57, 100, 0);

  // Kerbs: a raised concrete edge between the road and the sidewalk,
  // segmented between the cross roads so they never block an intersection.
  const curbMat = new THREE.MeshStandardMaterial({ color: '#a8a49a', roughness: 0.95 });
  const curbSegs = [];
  {
    const r = WORLD.roads;
    curbSegs.push([-WORLD.half, r[0] - 12]);
    for (let i = 0; i < r.length - 1; i += 1) curbSegs.push([r[i] + 12, r[i + 1] - 12]);
    curbSegs.push([r[r.length - 1] + 12, WORLD.half]);
  }
  for (const road of WORLD.roads) {
    for (const s of [-1, 1]) {
      const off = road + s * (WORLD.roadWidth / 2 + 0.18);
      for (const [a, b] of curbSegs) {
        const len = b - a;
        const curbH = new THREE.Mesh(new THREE.BoxGeometry(len, 0.16, 0.36), curbMat);
        curbH.position.set((a + b) / 2, 0.08, off);
        group.add(curbH);
        const curbV = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.16, len), curbMat);
        curbV.position.set(off, 0.08, (a + b) / 2);
        group.add(curbV);
      }
    }
  }

  // Drain grates in the gutter, just inside the kerb, on the two main roads.
  const grateMat = new THREE.MeshStandardMaterial({ color: '#2a2a30', roughness: 0.9 });
  for (const gv of [-240, -160, -80, 0, 80, 160, 240]) {
    for (const go of [53.5, 66.5]) {
      const g1 = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.02, 0.7), grateMat);
      g1.position.set(gv, 0.075, go);
      group.add(g1);
      const g2 = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.02, 1.4), grateMat);
      g2.position.set(go, 0.075, gv);
      group.add(g2);
    }
  }

  // Parking bays along the south edge of the main road (chase frame): a
  // long bay line + a tick every 8u, so the kerb reads as parked cars' home.
  const bayMat = new THREE.MeshStandardMaterial({ color: '#f2f2f2', roughness: 0.9 });
  const bayLine = new THREE.Mesh(new THREE.BoxGeometry(60, 0.03, 0.18), bayMat);
  bayLine.position.set(130, 0.075, 65.6);
  group.add(bayLine);
  for (let px = 100; px <= 160; px += 8) {
    const tick = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.03, 2.4), bayMat);
    tick.position.set(px, 0.075, 64.4);
    group.add(tick);
  }

  // Manhole covers + asphalt patches on the main roads, so the asphalt
  // is not one clean slab.
  const mhMat = new THREE.MeshStandardMaterial({ color: '#2a2a30', roughness: 0.9 });
  for (const [mx, mz] of [[-20, 60], [50, 60], [120, 57], [-100, -60], [180, 63], [60, -120], [63, 180], [-60, 200]]) {
    const mh = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.03, 12), mhMat);
    mh.position.set(mx, 0.075, mz);
    group.add(mh);
  }
  // Round 13: cool dark blue-grey. The first attempt (#343743) still
  // read brown-red in the chase frame — the patch at (-30, 63) sits in
  // direct sun while the road around it lies in the north towers'
  // shadows, so any sunlit dark asphalt skews warm under the orange
  // dusk sun; a darker, blue-dominant albedo compensates and lands
  // the patch on the same tone as the shadowed asphalt around it.
  const patchMat = new THREE.MeshStandardMaterial({ color: '#28313d', roughness: 1 });
  for (const [px, pz, pw, pd] of [[-30, 63, 6, 3], [90, 58, 8, 4], [150, 62, 5, 3], [30, -63, 7, 3]]) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(pw, 0.02, pd), patchMat);
    p.position.set(px, 0.07, pz);
    group.add(p);
  }

  // Stop lines before the zebra crossings at the two intersections on
  // the main road, one per approach.
  const stopMat = new THREE.MeshStandardMaterial({ color: '#f2f2f2', roughness: 0.9 });
  for (const ix of [-60, 60]) {
    const s1 = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.03, 6), stopMat);
    s1.position.set(ix - 10, 0.075, 63.5);
    group.add(s1);
    const s2 = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.03, 6), stopMat);
    s2.position.set(ix + 10, 0.075, 56.5);
    group.add(s2);
    const s3 = new THREE.Mesh(new THREE.BoxGeometry(6, 0.03, 0.7), stopMat);
    s3.position.set(ix + 3.5, 0.075, 70);
    group.add(s3);
    const s4 = new THREE.Mesh(new THREE.BoxGeometry(6, 0.03, 0.7), stopMat);
    s4.position.set(ix - 3.5, 0.075, 50);
    group.add(s4);
  }

  // STOP signs at the (60, 60) intersection, facing the oncoming traffic.
  // Round 13: bigger (was 0.62/0.55), with a white STOP legend on the
  // face so the sign reads as a STOP sign instead of a blank red
  // octagon, plus the missing approaches — 6 STOP signs total now.
  // Round 14: the signs are scalable (s) — the (60, 60) signs sit
  // ~100u from the chase camera, so no size makes their legend
  // readable there; the readable one is the BIG sign on the north
  // kerb at (-30, 51), 20u from the chase camera, angled toward it
  // (rotY -PI/2 + 0.6). Projected: octagon (390, 191)-(397, 307),
  // letters ~21px. The legend canvas is 256x96 with a 72px font so
  // the letters stay proportional at any scale.
  const stopSign = (px, pz, rotY, s = 1) => {
    const g = new THREE.Group();
    const postH = 2.6 + (s - 1) * 1.25;
    const octY = 2.85 + (s - 1) * 0.9;
    const post = cylinder(0.06 * s, 0.06 * s, postH, '#8a8f96');
    post.position.y = postH / 2;
    g.add(post);
    const back = new THREE.Mesh(
      new THREE.CylinderGeometry(0.72 * s, 0.72 * s, 0.05, 8),
      new THREE.MeshStandardMaterial({ color: '#f2f2f2', roughness: 0.6 }),
    );
    back.rotation.x = Math.PI / 2;
    back.rotation.z = Math.PI / 8;
    back.position.y = octY;
    g.add(back);
    const face = new THREE.Mesh(
      new THREE.CylinderGeometry(0.65 * s, 0.65 * s, 0.06, 8),
      new THREE.MeshStandardMaterial({ color: '#c91f2b', roughness: 0.6 }),
    );
    face.rotation.x = Math.PI / 2;
    face.rotation.z = Math.PI / 8;
    face.position.y = octY;
    face.position.z = 0.02 * s;
    g.add(face);
    const stopTex = canvasTexture(256, 96, (x, w, h) => {
      x.clearRect(0, 0, w, h);
      x.fillStyle = '#ffffff';
      x.font = 'bold 64px system-ui, sans-serif';
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      x.fillText('STOP', w / 2, h / 2 + 2);
    });
    const legend = new THREE.Mesh(
      new THREE.PlaneGeometry(0.95 * s, 0.36 * s),
      new THREE.MeshBasicMaterial({ map: stopTex, transparent: true, depthWrite: false }),
    );
    // Round 14 fix: the legend must sit IN FRONT of the post — the
    // post's radius is 0.06*s, so its front face is at z = +0.06*s,
    // exactly where the round 13 legend sat (z = 0.06*s). At s = 2.6
    // the 0.31u-wide post covered the middle of "STOP" (the "P" was
    // hidden behind it). The legend now sits at z = 0.12*s + 0.05,
    // clear of the post, and the font is 64px so the word fits the
    // canvas with margin.
    legend.position.set(0, octY, 0.12 * s + 0.05);
    g.add(legend);
    g.position.set(px, 0, pz);
    g.rotation.y = rotY;
    return g;
  };
  // Round 14: the big readable STOP on the north kerb of the chase road,
  // at the park's south edge — 20u from the chase camera, angled toward
  // it, so the white STOP legend reads at ~21px instead of ~5px.
  group.add(stopSign(-30, 51, -Math.PI / 2 + 0.6, 2.6));
  group.add(stopSign(52, 69, -Math.PI / 2, 1.4));
  group.add(stopSign(68, 51, Math.PI / 2, 1.4));
  // Round 13: the other two approaches of the (60, 60) intersection,
  // and the (-60, 60) intersection mirrored — 6 STOP signs total.
  group.add(stopSign(52, 51, Math.PI, 1.4));
  group.add(stopSign(68, 69, 0, 1.4));
  group.add(stopSign(-68, 51, Math.PI / 2, 1.4));
  group.add(stopSign(-52, 69, -Math.PI / 2, 1.4));

  // Round 13: round speed-limit signs on the main road, facing the
  // chase camera, so the street has more than STOP signs to read.
  // Round 14: scalable (s) — the (10, 69) sign is 54u from the chase
  // camera, so at s = 2.5 (2.75u face, 140px digits on a 256 canvas)
  // the "40" reads at ~17px instead of ~5px. The far sign stays small.
  const limitSign = (px, pz, rotY, text, s = 1) => {
    const g = new THREE.Group();
    const post = cylinder(0.06, 0.06, 2.6, '#8a8f96');
    post.position.y = 1.3;
    g.add(post);
    const faceTex = canvasTexture(256, 256, (x, w, h) => {
      x.clearRect(0, 0, w, h);
      x.fillStyle = '#f2f2f2';
      x.beginPath(); x.arc(w / 2, h / 2, 120, 0, Math.PI * 2); x.fill();
      x.strokeStyle = '#c91f2b';
      x.lineWidth = 20;
      x.beginPath(); x.arc(w / 2, h / 2, 108, 0, Math.PI * 2); x.stroke();
      x.fillStyle = '#1c1c1c';
      x.font = 'bold 140px system-ui, sans-serif';
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      x.fillText(text, w / 2, h / 2 + 4);
    });
    const face = new THREE.Mesh(
      new THREE.PlaneGeometry(1.1 * s, 1.1 * s),
      new THREE.MeshStandardMaterial({ map: faceTex, transparent: true, roughness: 0.6 }),
    );
    face.position.y = 2.85;
    // Round 14: the face sits 0.08u in front of the post, so the post
    // can never cover the digits (same coplanar-post bug as the STOP
    // legend in round 13).
    face.position.z = 0.08;
    g.add(face);
    g.position.set(px, 0, pz);
    g.rotation.y = rotY;
    return g;
  };
  group.add(limitSign(10, 69, -Math.PI / 2, '40', 2.5));
  group.add(limitSign(120, 69, -Math.PI / 2, '40'));

  // Round 15: traffic lights at the (60, 60) intersection, in the chase
  // frame — green for the eastbound chase lane, red for the cross
  // traffic, so the intersection reads as a live city junction.
  const tl1 = trafficLight(2);
  tl1.position.set(72, 0, 51.5);
  tl1.rotation.y = -Math.PI / 2; // arm over the road, head facing the chase camera
  group.add(tl1);
  const tl2 = trafficLight(0);
  tl2.position.set(48, 0, 68.5);
  tl2.rotation.y = Math.PI / 2;
  group.add(tl2);

  // Buildings, one per block, district-flavoured.
  const blockMin = -300 + 10;
  const blockMax = 300 - 10;
  // Round 13: one vertical sign is guaranteed inside the chase frame
  // (see the vsign block below + the hotel fallback after the loop).
  let chaseVSignDone = false;
  function onRoad(v) { return WORLD.roads.some((r) => Math.abs(v - r) < 12); }
  const districtOf = (x, z) => DISTRICTS.find((d) => x >= d.x0 && x < d.x1 && z >= d.z0 && z < d.z1) || DISTRICTS[2];

  const shopNames = ['TOKO BATIK', 'WARUNG SENJA', 'KEDAI KOPI', 'BENGKEL', 'TOKO EMAS', 'PASAR IKAN', 'FARO BOOKS', 'MANGO GYM', 'CAFE B', 'TIDELINE', 'WARTEG', 'LAUNDRY', 'FOTOKOPI', 'BARBERSHOP', 'APOTEK', 'OPTIK', 'CELLULER', 'ROTI BAKAR', 'ES TEH', 'SATE AYAM', 'NASI GORENG', 'BENGKEL LAS', 'TAMBAL BAN', 'TOKO KELONTONG'];
  let shopIdx = 0;
  for (let bx = blockMin; bx <= blockMax; bx += 120) {
    for (let bz = blockMin; bz <= blockMax; bz += 120) {
      const cx = bx + 60;
      const cz = bz + 60;
      if (cx > -80 && cx < 40 && cz > 0 && cz < 80) continue; // keep the park clear
      if (cx > -320 && cx < -240 && cz > 180 && cz < 300) continue; // ferris wheel + beach
      const d = districtOf(cx, cz);
      const count = d.kind === 'downtown' || d.kind === 'casino' ? 2 : 3;
      for (let i = 0; i < count; i += 1) {
        const w = rand.range(16, 26);
        const dep = rand.range(14, 22);
        const x = cx + rand.range(-28, 28);
        const z = cz + rand.range(-28, 28);
        if (onRoad(x) || onRoad(z)) continue;
        let h;
        let base;
        let litColor = '#ffd94d';
        let floors;
        let roofColor = '#3a3a44';
        // Round 17: top-1 district palettes + facade styles — warm sand
        // towers downtown (some turquoise glass), pastel kampung/beach,
        // brick warehouses at the port, saturated market colours.
        let style = 'plaster';
        let towerGlass = false;
        if (d.kind === 'downtown') {
          h = rand.range(42, 102); // round 8: bigger height spread
          base = rand.pick(['#f3d9b8', '#e8c7a0', '#ffe1c4', '#d9c2a6', '#f6e7d0']);
          if (rand.chance(0.10)) { base = rand.pick(['#a8e0d8', '#9fd8d0']); towerGlass = true; }
          floors = Math.max(4, Math.floor(h / 9));
          roofColor = '#7d7b80';
          style = 'deco';
        } else if (d.kind === 'casino') {
          h = rand.range(24, 58);
          base = '#8a6a2a';
          litColor = '#ffd94d';
          floors = Math.max(4, Math.floor(h / 9));
          style = 'deco';
        } else if (d.kind === 'kampung') {
          h = rand.range(7, 13);
          base = rand.pick(['#f3d9b8', '#e8c7a0', '#ffd9ac', '#f6e7d0']);
          floors = 2;
          roofColor = '#a34a2b';
        } else if (d.kind === 'port') {
          h = rand.range(10, 18);
          base = rand.pick(['#b5654a', '#6c8ea4', '#9aa38f', '#c9a66b']);
          litColor = '#c8d8e8';
          floors = 2;
          roofColor = '#4a5560';
          style = 'warehouse';
        } else if (d.kind === 'market') {
          h = rand.range(8, 14);
          base = rand.pick(['#ffb703', '#fb8500', '#e76f51', '#2a9d8f', '#f4a261', '#ffd6a5']);
          floors = 2;
        } else {
          h = rand.range(12, 30);
          base = rand.pick(['#ffe1c4', '#f6e7d0', '#ffd9ac', '#e8c7a0']);
          floors = 3;
        }
        // Round 12: a slight per-building shade variation on the district
        // base colour, so two neighbours never read as the same flat box.
        const bBase = shadeHex(base, rand.range(-14, 14));
        // The street-facing side is the face toward the nearest road, so
        // the entrance + shopfront only ever appear on that side. The
        // other sides get windows only; the rear is darker, fewer lights.
        const spec = d.facade ?? { cols: 4, litChance: 3, ground: 'shop' };
        const nearRx = WORLD.roads.reduce((a, b) => (Math.abs(b - x) < Math.abs(a - x) ? b : a));
        const nearRz = WORLD.roads.reduce((a, b) => (Math.abs(b - z) < Math.abs(a - z) ? b : a));
        const front = Math.abs(nearRx - x) < Math.abs(nearRz - z)
          ? (nearRx > x ? '+x' : '-x')
          : (nearRz > z ? '+z' : '-z');
        const frontTex = facadeTexture(bBase, litColor, floors, { ...spec, style });
        const sideTex = facadeTexture(bBase, litColor, floors, { ...spec, ground: 'plain', style });
        const rearTex = facadeTexture(bBase, litColor, floors, { ...spec, ground: 'plain', litChance: 1, style });
        // The tallest downtown towers get blue-glass curtain walls
        // (round 7, like the reference's glass skyscrapers): the street
        // face keeps its entrance + shopfront, the side and rear faces
        // are glass. Round 8: the glass threshold drops to 50u, so more
        // towers read as glass. Round 17: turquoise-picked towers are
        // glass too, whatever their height.
        const glass = (d.kind === 'downtown' && h >= 50) || towerGlass;
        const glassFront = frontTex;
        const glassSide = glass ? glassFacadeTexture(floors, 5) : sideTex;
        const glassRear = glass ? glassFacadeTexture(floors, 2) : rearTex;
        // Round 15: every facade material carries its emissive map, so
        // lit windows + shopfronts glow at golden hour (emissive white ×
        // the emissive canvas, intensity 0.85).
        const facadeMat = (t) => new THREE.MeshStandardMaterial({ map: t.map, emissiveMap: t.emissive, emissive: 0xffffff, emissiveIntensity: 0.85, roughness: 0.85 });
        const frontMat = facadeMat(glassFront);
        const sideMat = facadeMat(glassSide);
        const rearMat = facadeMat(glassRear);
        const roofMat = new THREE.MeshStandardMaterial({ color: roofColor, roughness: 0.9 });
        const faceMats = { '+x': sideMat, '-x': sideMat, '+z': sideMat, '-z': sideMat };
        faceMats[front] = frontMat;
        const rear = front === '+x' ? '-x' : front === '-x' ? '+x' : front === '+z' ? '-z' : '+z';
        faceMats[rear] = rearMat;
        const b = new THREE.Mesh(
          new THREE.BoxGeometry(w, h, dep),
          [faceMats['+x'], faceMats['-x'], roofMat, roofMat, faceMats['+z'], faceMats['-z']],
        );
        b.position.set(x, h / 2, z);
        b.castShadow = true;
        b.receiveShadow = true;
        group.add(b);
        buildings.push({ x, z, w, h, d: dep, district: d.id });
        addCollider(x, z, w / 2 + 0.5, dep / 2 + 0.5);
        // AC outdoor units, entrance canopy and shopfront all sit on the
        // street-facing side now — never on the blank side walls.
        const acCount = h > 30 ? 3 : 2;
        for (let a = 0; a < acCount; a += 1) {
          const ac = box(1.1, 0.7, 0.5, '#9aa0a8');
          const fp = facePoint(front, x, z, w, dep, 0.3);
          ac.position.set(fp.x + (front === '+x' || front === '-x' ? 0 : rand.range(-w / 2 + 2, w / 2 - 2)), rand.range(6, Math.max(7, h - 4)), fp.z + (front === '+x' || front === '-x' ? rand.range(-dep / 2 + 2, dep / 2 - 2) : 0));
          ac.rotation.y = fp.rotY;
          group.add(ac);
        }
        const cornice = box(w + 0.8, 0.6, dep + 0.8, '#2a2a33');
        cornice.position.set(x, h + 0.3, z);
        group.add(cornice);
        // Entrance awnings (round 17, top-1 recipe): canvas awnings in
        // 6 bright colours, split per ~6 m along the front, two colours
        // alternating, 25% of the segments left empty, tilted slightly
        // outward — so the ground floor reads as a row of shops.
        {
          const xFront = front === '+x' || front === '-x';
          const faceW = xFront ? dep : w;
          const nSeg = Math.max(1, Math.round(faceW / 6));
          const segW = faceW / nSeg;
          const awnCols = ['#ef476f', '#2ec4b6', '#ffd166', '#f7ede2', '#ff9f68', '#118ab2'];
          const cA = awnCols[Math.floor(rand.range(0, 6))];
          const cB = awnCols[Math.floor(rand.range(0, 6))];
          for (let si = 0; si < nSeg; si += 1) {
            if (rand.chance(0.25)) continue;
            const segMat = new THREE.MeshStandardMaterial({ color: si % 2 ? cB : cA, roughness: 0.8 });
            const seg = new THREE.Mesh(
              new THREE.BoxGeometry(xFront ? 1.8 : segW - 0.3, 0.18, xFront ? segW - 0.3 : 1.8),
              segMat,
            );
            const along = -faceW / 2 + (si + 0.5) * segW;
            const fp = facePoint(front, x, z, w, dep, 0.9);
            if (xFront) {
              seg.position.set(fp.x, 3.4, z + along);
              seg.rotation.z = front === '+x' ? -0.22 : 0.22;
            } else {
              seg.position.set(x + along, 3.4, fp.z);
              seg.rotation.x = front === '+z' ? 0.22 : -0.22;
            }
            seg.castShadow = true;
            group.add(seg);
          }
        }
        // Setback top floor + antenna on the tallest towers, with a red
        // aircraft-warning beacon on the very tallest (round 8).
        if (h > 40) {
          const setback = new THREE.Mesh(
            new THREE.BoxGeometry(w * 0.55, 5, dep * 0.55),
            frontMat,
          );
          setback.position.set(x, h + 3.1, z);
          setback.castShadow = true;
          group.add(setback);
          const ant = cylinder(0.08, 0.12, 8, '#888888');
          ant.position.set(x + w * 0.2, h + 9.5, z);
          group.add(ant);
          const cross = box(2.2, 0.08, 0.08, '#888888');
          cross.position.set(x + w * 0.2, h + 11.5, z);
          group.add(cross);
          if (h > 60) {
            const beacon = new THREE.Mesh(
              new THREE.SphereGeometry(0.35, 8, 6),
              new THREE.MeshBasicMaterial({ color: '#ff2e2e' }),
            );
            beacon.position.set(x - w * 0.2, h + 6.2, z);
            group.add(beacon);
            const beaconPole = cylinder(0.05, 0.05, 1.2, '#888888');
            beaconPole.position.set(x - w * 0.2, h + 5.6, z);
            group.add(beaconPole);
          }
        }
        // Sloped tile roof for kampung houses.
        if (d.kind === 'kampung') {
          const roof = new THREE.Mesh(
            new THREE.ConeGeometry(Math.max(w, dep) * 0.72, 4, 4),
            new THREE.MeshStandardMaterial({ map: tileTexture('#a34a2b'), roughness: 0.9, flatShading: true }),
          );
          roof.position.set(x, h + 2, z);
          roof.rotation.y = Math.PI / 4;
          roof.castShadow = true;
          group.add(roof);
        }
        // Rooftop clutter on mid-height buildings too (round 12: was
        // only h > 30, now h > 15), so the skyline reads lived-in, not
        // flat. Round 17: 1–3 AC boxes per roof, a water tank on 60%,
        // an antenna on 35% (top-1 recipe).
        if (h > 15 && rand.chance(0.55)) {
          const nAc = 1 + Math.floor(rand.range(0, 3));
          for (let ai = 0; ai < nAc; ai += 1) {
            const ac = box(1.6, 1.0, 1.0, '#9aa0a8');
            ac.position.set(x + rand.range(-6, 6), h + 0.5, z + rand.range(-5, 5));
            group.add(ac);
          }
          if (rand.chance(0.6)) {
            const tank = cylinder(1.1, 1.1, 2.2, rand.pick(['#2e86ab', '#f7ede2', '#9aa3a8']));
            tank.position.set(x + rand.range(-6, 6), h + 1.1, z + rand.range(-5, 5));
            group.add(tank);
          }
          if (rand.chance(0.35)) {
            const ant = cylinder(0.06, 0.12, 7, '#888888');
            ant.position.set(x + rand.range(-6, 6), h + 3.5, z + rand.range(-5, 5));
            group.add(ant);
          }
        }
        if (h > 25 && h <= 40 && rand.chance(0.4)) {
          const ant = cylinder(0.06, 0.1, 6, '#888888');
          ant.position.set(x + w * 0.2, h + 3, z);
          group.add(ant);
          const cross = box(1.6, 0.07, 0.07, '#888888');
          cross.position.set(x + w * 0.2, h + 5, z);
          group.add(cross);
        }
        // Shopfront on the ground floor of some buildings, on the
        // street-facing side only. Round 12: more of them (was 35%, now
        // 60%) and on mid-height buildings too (was h < 30, now < 42),
        // so the street reads as a real shopping street, not blank walls.
        // Round 17: 75% and up to 60 m tall — the top-1 ground floor is
        // never a blank wall.
        if (rand.chance(0.75) && h < 60) {
          const name = shopNames[shopIdx++ % shopNames.length];
          const shopTex = shopTexture(name, d.accent, '#1c1c1c');
          const shop = new THREE.Mesh(
            new THREE.PlaneGeometry(w * 0.9, 4.4),
            // Round 15: the shop sign glows a little at dusk (its own
            // texture as emissive map), so the ground floor reads lit.
            new THREE.MeshStandardMaterial({ map: shopTex, emissiveMap: shopTex, emissive: 0xffffff, emissiveIntensity: 0.45, roughness: 0.8 }),
          );
          const shopFp = facePoint(front, x, z, w, dep, 0.06);
          shop.position.set(shopFp.x, 2.2, shopFp.z);
          shop.rotation.y = shopFp.rotY;
          group.add(shop);
        }
        // Round 12: a vertical sign down the face of tall downtown
        // towers, like the reference's vertical neon signs. Round 13:
        // one sign is GUARANTEED inside the chase frame. The chase
        // camera sits at (-47.6, 3.5, 64) looking east-north-east
        // (look target (-32, 1.2, 60), half-FOV ~47 deg), so a tower
        // is in frame when its bearing from the camera is between
        // -54 and +26 degrees; the first tall downtown tower in that
        // wedge always gets a sign, on the face toward the camera
        // (south face for towers north of the road, north face for
        // towers south of it), bigger and lower (y ~20) so it sits
        // inside the frame instead of above it. The round 12 signs
        // sat at h * 0.62, which put them above the top edge of the
        // near-horizontal chase/combat frames, and the 60% roll meant
        // the towers that were in frame often had none at all.
        const chaseAng = Math.atan2(z - 64, x + 47.6);
        const inChaseFrame = x > -40 && x < 180 && chaseAng > -0.95 && chaseAng < 0.45;
        const chaseSign = inChaseFrame && !chaseVSignDone;
        if (d.kind === 'downtown' && h > 40 && (chaseSign || (!inChaseFrame && rand.chance(0.6)))) {
          const vname = shopNames[shopIdx++ % shopNames.length];
          // Round 14: the in-frame sign is much bigger (4.5x16, 64px
          // font on a 128x512 canvas) so its letters are ~2u tall in
          // the world and read from the chase camera.
          // Round 19: SHORTER + LOWER (4.5x12 at y min(h*0.4, 10),
          // spans y 4..16) — the 4.5x16 at y 20 (top y 28) was cut by
          // the chase frame's top edge in every shot since round 13:
          // the frame top is only ~y 17.6 at 34u out, so a sign top
          // above ~y 17 is cut. (The HOTEL fallback sign in world.js
          // never even renders when this tower sign exists — lowering
          // the HOTEL sign alone, as first tried in round 19, fixed
          // nothing; THIS is the cut yellow banner at the chase
          // frame's top-right corner.)
          const signW = chaseSign ? 4.5 : 2.4;
          const signH = chaseSign ? 12 : 9.6;
          const vsign = new THREE.Mesh(
            new THREE.PlaneGeometry(signW, signH),
            new THREE.MeshStandardMaterial({ map: verticalSignTexture(vname, d.accent, chaseSign ? 64 : 26, chaseSign ? 128 : 64, chaseSign ? 512 : 256), roughness: 0.7, emissive: 0x221100, emissiveIntensity: chaseSign ? 0.7 : 0.4 }),
          );
          const signFace = chaseSign ? (z < 60 ? '+z' : '-z') : front;
          const vfp = facePoint(signFace, x, z, w, dep, 0.12);
          const isXFace = signFace === '+x' || signFace === '-x';
          const off = (signFace === '+z' || signFace === '+x') ? -1 : 1;
          vsign.position.set(
            vfp.x + (isXFace ? 0 : off * w * 0.28),
            chaseSign ? Math.min(h * 0.4, 10) : h * 0.62,
            vfp.z + (isXFace ? off * dep * 0.28 : 0),
          );
          vsign.rotation.y = vfp.rotY;
          group.add(vsign);
          if (chaseSign) chaseVSignDone = true;
        }
        // Balconies with railings on taller buildings, on the street
        // side. Round 17: deco buildings get one per floor, the rest
        // every second floor (capped at 5, so the skyline stays cheap),
        // with railing colours picked per building (top-1 recipe).
        if (h > 30) {
          const xFront = front === '+x' || front === '-x';
          const faceW = xFront ? dep : w; // length of the street-facing wall
          const step = style === 'deco' ? 1 : 2;
          const railCols = ['#f2efe6', '#2a3d45', '#8a5a33', '#ffffff'];
          const railCol = railCols[Math.floor(rand.range(0, railCols.length))];
          const nBalc = Math.min(5, Math.floor((floors - 1) / step));
          for (let bi = 0; bi < nBalc; bi += 1) {
            const by = ((bi + 1) / (nBalc + 1)) * h;
            const fp = facePoint(front, x, z, w, dep, 0.8);
            const balc = xFront ? box(1.6, 0.25, faceW * 0.7, '#d8d8d8') : box(faceW * 0.7, 0.25, 1.6, '#d8d8d8');
            balc.position.set(fp.x, by, fp.z);
            group.add(balc);
            const railFp = facePoint(front, x, z, w, dep, 1.55);
            const rail = xFront ? box(0.08, 0.9, faceW * 0.7, railCol) : box(faceW * 0.7, 0.9, 0.08, railCol);
            rail.position.set(railFp.x, by + 0.55, railFp.z);
            group.add(rail);
            for (const sx of [-1, 1]) {
              const side = xFront ? box(1.6, 0.9, 0.08, railCol) : box(0.08, 0.9, 1.6, railCol);
              const sideFp = facePoint(front, x + (xFront ? 0 : sx * faceW * 0.35), z + (xFront ? sx * faceW * 0.35 : 0), w, dep, 0.8);
              side.position.set(sideFp.x, by + 0.55, sideFp.z);
              group.add(side);
            }
          }
        }
        // Round 17: vertical fins on glass towers over 30 m (top-1
        // recipe) — thin white blades every 4 m down the front face.
        if (glass && h > 30) {
          const xFront = front === '+x' || front === '-x';
          const faceW = xFront ? dep : w;
          const nFin = Math.max(2, Math.floor(faceW / 4));
          for (let fi = 0; fi < nFin; fi += 1) {
            const along = -faceW / 2 + 2 + fi * 4;
            const fin = box(xFront ? 0.15 : 0.3, h * 0.9, xFront ? 0.3 : 0.15, '#e9e4da');
            const fp = facePoint(front, x, z, w, dep, 0.1);
            if (xFront) fin.position.set(fp.x, h * 0.45, z + along);
            else fin.position.set(x + along, h * 0.45, fp.z);
            group.add(fin);
          }
        }
      }
    }
  }

  // Round 13 fallback: if no downtown tower fell inside the chase
  // wedge above (the tower positions are seeded, so this is decided by
  // the seed, not by luck at run time), put the guaranteed vertical
  // sign on the Hotel Kencana's south face instead — the hotel is a
  // fixed landmark at (40, -40), and its south face sits ~32 degrees
  // left of the chase camera's view centre, well inside the frame.
  // Round 14: the sign is 8x26 with an 80px font on a 128x512 canvas,
  // so its letters are ~4.1u tall and read at ~24px from 104u away
  // (the round 13 sign's 1.2u letters read ~6px — unreadable).
  // Round 19: the sign is 8x22 at y 15 (spans y 4..26) — the old
  // 8x26 at y 20 (top y 33) would be cut by the frame's top edge if
  // it ever renders. (Note: this fallback only renders when no
  // downtown tower sign was placed in the chase wedge; the banner
  // actually cut in the chase shots is the tower sign above, fixed
  // separately in round 19.)
  if (!chaseVSignDone) {
    const hotelVSign = new THREE.Mesh(
      new THREE.PlaneGeometry(8, 22),
      new THREE.MeshStandardMaterial({ map: verticalSignTexture('HOTEL', '#ffd94d', 80, 128, 512), roughness: 0.7, emissive: 0x221100, emissiveIntensity: 0.7 }),
    );
    hotelVSign.position.set(40, 15, -27.9);
    group.add(hotelVSign);
    chaseVSignDone = true;
  }

  // Round 14: a roadside district totem on the north kerb of the chase
  // road, at the park's south edge — a tall gold "ALUN-ALUN" board
  // angled toward the oncoming chase camera (rotY -PI/2 + 0.35), so
  // the district name reads from 34u away. First placed at (30, 48),
  // but the gantry truss beam at (20, 49) crossed its middle in the
  // frame — moved west to (-15, 48), clear of the gantry post, the
  // palms at (0, 51) and (40, 51), the police cars and the turn
  // arrow. Projected centre (~500, 160), letters ~37px. Round 16:
  // the panel is now 4x12 at (-8, 8.5, 72), spans y 2.5..14.5 — the
  // 4x15 panel's top (y 18) was cut by the frame top.
  // Round 15b: the totem moved to the SOUTH kerb (-15, 72) — on the
  // north kerb it stood dead-centre behind the "PANTAI KIDUL" district
  // title card, and the two signs collided at the top of the frame.
  // Now it reads on the right side of the chase frame, angled toward
  // the camera (rotY -PI/2 - 0.35, face west-north), clear of the
  // gantry, the palms and the south-side pedestrians.
  // Round 16: the totem is SHORTER + LOWER + further east (was 4x15 at
  // (-15, 10.5, 72), top y 18 — the top edge was cut by the frame; the
  // chase camera at (-47.6, 3.5, 64) looks slightly down, so the frame
  // top at 34u is ~y 17.6). Now 4x12 at (-8, 8.5, 72), top y 14.5,
  // ~15 deg elevation — the whole panel + its base fit in the frame,
  // clear of the gantry, the palms and the south-side pedestrians.
  const totemTex = verticalSignTexture('ALUN-ALUN', '#ffd94d', 72, 128, 512);
  const totem = new THREE.Mesh(
    new THREE.PlaneGeometry(4, 12),
    new THREE.MeshStandardMaterial({ map: totemTex, roughness: 0.7, emissive: 0x221100, emissiveIntensity: 0.7 }),
  );
  totem.position.set(-8, 8.5, 72);
  totem.rotation.y = -Math.PI / 2 - 0.35;
  group.add(totem);
  const totemBase = box(1.2, 2.2, 1.2, '#2a2a33');
  totemBase.position.set(-8, 1.1, 72);
  group.add(totemBase);

  // Landmarks. Signs sit on the +z face, so the +z face is the front:
  // entrance + shopfront there, windows only on the sides, darker rear.
  // Round 15: landmark facades use the same { map, emissive } pair as the
  // generated buildings — one texture object per face, reused by its material.
  const landmarkMat = (t, rough = 0.7) => new THREE.MeshStandardMaterial({ map: t.map, emissiveMap: t.emissive, emissive: 0xffffff, emissiveIntensity: 0.85, roughness: rough });
  const hotelFrontTex = facadeTexture('#7a8ab0', '#ffe98a', 9, { cols: 5, litChance: 3, ground: 'shop' });
  const hotelSideTex = facadeTexture('#7a8ab0', '#ffe98a', 9, { cols: 5, litChance: 3, ground: 'plain' });
  const hotelRearTex = facadeTexture('#7a8ab0', '#ffe98a', 9, { cols: 5, litChance: 1, ground: 'plain' });
  const hotelFront = landmarkMat(hotelFrontTex);
  const hotelSide = landmarkMat(hotelSideTex);
  const hotelRear = landmarkMat(hotelRearTex);
  const hotelRoof = new THREE.MeshStandardMaterial({ color: '#2a2a33', roughness: 0.9 });
  const hotel = new THREE.Mesh(
    new THREE.BoxGeometry(30, 80, 24),
    [hotelSide, hotelSide, hotelRoof, hotelRoof, hotelFront, hotelRear],
  );
  hotel.position.set(40, 40, -40);
  hotel.castShadow = true;
  group.add(hotel);
  addCollider(40, -40, 16, 13);
  // Round 17: a real neon sign (top-1 recipe) — glowing teal on a dark
  // panel, unlit so it reads in daylight too.
  const hotelSign = new THREE.Mesh(
    new THREE.PlaneGeometry(26, 4),
    new THREE.MeshBasicMaterial({ map: neonSignTexture('HOTEL KENCANA', '#19d3c5'), toneMapped: false }),
  );
  hotelSign.position.set(40, 76, -27.5);
  group.add(hotelSign);
  neonSigns.push(hotelSign);

  // Casino Emas (Lorong Emas) with neon.
  const casinoFrontTex = facadeTexture('#8a6a2a', '#ffd94d', 4, { cols: 4, litChance: 4, ground: 'shop' });
  const casinoSideTex = facadeTexture('#8a6a2a', '#ffd94d', 4, { cols: 4, litChance: 4, ground: 'plain' });
  const casinoRearTex = facadeTexture('#8a6a2a', '#ffd94d', 4, { cols: 4, litChance: 1, ground: 'plain' });
  const casinoFront = landmarkMat(casinoFrontTex);
  const casinoSide = landmarkMat(casinoSideTex);
  const casinoRear = landmarkMat(casinoRearTex);
  const casinoRoof = new THREE.MeshStandardMaterial({ color: '#2a2a33', roughness: 0.9 });
  const casino = new THREE.Mesh(
    new THREE.BoxGeometry(34, 30, 26),
    [casinoSide, casinoSide, casinoRoof, casinoRoof, casinoFront, casinoRear],
  );
  casino.position.set(240, 15, -40);
  casino.castShadow = true;
  group.add(casino);
  addCollider(240, -40, 18, 14);
  // Round 17: a real neon sign (top-1 recipe) — glowing red-pink on a
  // dark panel, unlit so it reads in daylight too.
  const casinoSign = new THREE.Mesh(
    new THREE.PlaneGeometry(30, 5),
    new THREE.MeshBasicMaterial({ map: neonSignTexture('CASINO EMAS', '#ff5a5f', 512, 96), toneMapped: false }),
  );
  casinoSign.position.set(240, 32, -26.5);
  group.add(casinoSign);
  neonSigns.push(casinoSign);
  // Round 14: a tall vertical CASINO sign on the casino's south face,
  // for the combat shot — the camera sits at (193.5, 3.1, -12.2) and
  // the sign at (228, 7.5, -26.9) projects to (275, 166) with ~48px
  // letters (80px font on a 128x512 canvas, 5x15 panel), so it reads
  // clearly above the shootout instead of being a blank facade.
  const casinoVSign = new THREE.Mesh(
    new THREE.PlaneGeometry(5, 15),
    new THREE.MeshStandardMaterial({ map: verticalSignTexture('CASINO', '#e8b400', 80, 128, 512), roughness: 0.7, emissive: 0x221100, emissiveIntensity: 0.7 }),
  );
  casinoVSign.position.set(228, 7.5, -26.9);
  group.add(casinoVSign);
  // Round 19: a warm terracotta-tiled FORECOURT in front of the
  // casino (x 196..252, z -34..10), so the combat shot's shootout
  // happens on paved tiles, not on the bare brown-grey ground plane
  // that dominated the middle of every combat shot. At y 0.04 it sits
  // under the roads/sidewalks (0.06) and the zebra (0.08), above the
  // bare ground (-0.05). The flower planter, bench and lamp in
  // shots.js stageCombat stand on it.
  const foreTex = tileTexture('#b98a5a');
  foreTex.wrapS = THREE.RepeatWrapping;
  foreTex.wrapT = THREE.RepeatWrapping;
  foreTex.repeat.set(7, 5.5);
  const forecourt = new THREE.Mesh(
    new THREE.PlaneGeometry(56, 44),
    new THREE.MeshStandardMaterial({ map: foreTex, roughness: 0.95 }),
  );
  forecourt.rotation.x = -Math.PI / 2;
  forecourt.position.set(224, 0.04, -12);
  forecourt.receiveShadow = true;
  group.add(forecourt);

  // Round 17 (P1, top-1 recipe): Menara Kencana — a 150 m golden glass
  // tower with a crown, a mast and a neon name, the skyline landmark
  // the map shot orbits around. It stands clear of every road and
  // generated block at (200, -240).
  {
    const towerTex = glassFacadeTexture(20, 5);
    const towerMat = new THREE.MeshStandardMaterial({
      map: towerTex.map, emissiveMap: towerTex.emissive, emissive: 0xffffff,
      emissiveIntensity: 0.85, roughness: 0.25, metalness: 0.3,
    });
    const tower = new THREE.Mesh(new THREE.BoxGeometry(26, 150, 26), towerMat);
    tower.position.set(200, 75, -240);
    tower.castShadow = true;
    group.add(tower);
    addCollider(200, -240, 14, 14);
    const crown = box(28, 24, 28, '#ffd27a', { metal: 0.3, rough: 0.3 });
    crown.position.set(200, 162, -240);
    group.add(crown);
    const mast = cylinder(0.3, 0.5, 32, '#888888');
    mast.position.set(200, 190, -240);
    group.add(mast);
    const towerBeacon = new THREE.Mesh(
      new THREE.SphereGeometry(0.6, 8, 6),
      new THREE.MeshBasicMaterial({ color: '#ff2e2e' }),
    );
    towerBeacon.position.set(200, 207, -240);
    group.add(towerBeacon);
    const towerSign = new THREE.Mesh(
      new THREE.PlaneGeometry(24, 4),
      new THREE.MeshBasicMaterial({ map: neonSignTexture('MENARA KENCANA', '#ffc247'), toneMapped: false }),
    );
    towerSign.position.set(200, 140, -226.9);
    group.add(towerSign);
    neonSigns.push(towerSign);
  }

  // Round 14: a big STOP sign at the casino forecourt crossing, for
  // the combat shot — the zebra crossing is staged at x 222-232,
  // z -15..-5, and the sign at (221, -20) sits at its south-west
  // corner facing the combat camera. Round 16: moved 2u east + 2u
  // south (was 219, -18) — at (219, -18) it sat directly behind the
  // '-55' damage sprite and the two overlapped in the frame.
  group.add(stopSign(221, -20, -Math.PI / 2 + 0.2, 2.6));

  // Mansion (Alun-Alun) — a house, so the front gets a door, not a shopfront.
  const mansionFrontTex = facadeTexture('#e8dcc0', '#ffe98a', 2, { cols: 4, litChance: 3, ground: 'door' });
  const mansionSideTex = facadeTexture('#e8dcc0', '#ffe98a', 2, { cols: 4, litChance: 3, ground: 'plain' });
  const mansionRearTex = facadeTexture('#e8dcc0', '#ffe98a', 2, { cols: 4, litChance: 1, ground: 'plain' });
  const mansionFront = landmarkMat(mansionFrontTex, 0.85);
  const mansionSide = landmarkMat(mansionSideTex, 0.85);
  const mansionRear = landmarkMat(mansionRearTex, 0.85);
  const mansion = new THREE.Mesh(
    new THREE.BoxGeometry(26, 12, 20),
    [mansionSide, mansionSide, mansionFront, mansionFront, mansionFront, mansionRear],
  );
  mansion.position.set(-40, 6, -80);
  mansion.castShadow = true;
  group.add(mansion);
  addCollider(-40, -80, 14, 11);
  const mRoof = new THREE.Mesh(
    new THREE.ConeGeometry(20, 5, 4),
    new THREE.MeshStandardMaterial({ map: tileTexture('#7a2b1b'), roughness: 0.9, flatShading: true }),
  );
  mRoof.position.set(-40, 14.5, -80);
  mRoof.rotation.y = Math.PI / 4;
  group.add(mRoof);

  // Port: warehouses, containers, cranes, docks, sailboat.
  for (let i = 0; i < 3; i += 1) {
    const wh = box(30, 10, 16, '#7d8a94');
    wh.position.set(-260, 5, -260 + i * 60);
    group.add(wh);
    addCollider(-260, -260 + i * 60, 16, 9);
  }
  const contColors = ['#c94b4b', '#2b6fd0', '#e8a33d', '#3d8a4b'];
  for (let i = 0; i < 10; i += 1) {
    const c = box(6, 2.6, 2.6, contColors[i % 4]);
    c.position.set(-300 + (i % 5) * 9, 1.3 + Math.floor(i / 5) * 2.7, -120 + (i % 3) * 8);
    group.add(c);
  }
  for (const cz of [-280, -180]) {
    const crane = new THREE.Group();
    const leg1 = box(1.2, 26, 1.2, '#e8a33d');
    leg1.position.set(-2, 13, 0);
    const leg2 = box(1.2, 26, 1.2, '#e8a33d');
    leg2.position.set(2, 13, 0);
    const arm = box(30, 1.4, 1.4, '#e8a33d');
    arm.position.set(10, 26, 0);
    const hook = box(1.6, 1.6, 1.6, '#333333');
    hook.position.set(20, 18, 0);
    const cable = box(0.12, 8, 0.12, '#333333');
    cable.position.set(20, 22, 0);
    crane.add(leg1, leg2, arm, hook, cable);
    crane.position.set(-310, 0, cz);
    group.add(crane);
  }
  const boat = new THREE.Group();
  const hull = new THREE.Mesh(
    new THREE.ConeGeometry(2.2, 7, 4),
    new THREE.MeshStandardMaterial({ color: '#f2f2f2', roughness: 0.6 }),
  );
  hull.rotation.z = Math.PI / 2;
  hull.rotation.y = Math.PI / 4;
  hull.scale.set(1, 1, 0.5);
  boat.add(hull);
  const mast = cylinder(0.08, 0.08, 7, '#8a6a4b');
  mast.position.y = 3.5;
  boat.add(mast);
  boat.position.set(-380, 0.5, -100);
  group.add(boat);

  // Ferris wheel + beach umbrellas at Pantai Kidul.
  const wheel = ferrisWheel();
  wheel.position.set(-280, 10.5, 240);
  group.add(wheel);
  wheels.push(wheel);
  addCollider(-280, 240, 10, 4);
  for (let i = 0; i < 6; i += 1) {
    const ux = -310 + i * 14;
    const pole = cylinder(0.08, 0.08, 2.6, '#f2f2f2');
    pole.position.set(ux, 1.3, 300);
    group.add(pole);
    const shade = new THREE.Mesh(
      new THREE.ConeGeometry(2.6, 1.0, 8),
      new THREE.MeshStandardMaterial({ color: ['#ff2e63', '#2b6fd0', '#ffd94d', '#3d8a4b', '#ff8a3d', '#8a4bd0'][i], roughness: 0.8, flatShading: true }),
    );
    shade.position.set(ux, 3.0, 300);
    group.add(shade);
    const towel = box(2.2, 0.08, 1.1, ['#ff2e63', '#2b6fd0'][i % 2]);
    towel.position.set(ux + 1.5, 0.1, 302);
    group.add(towel);
  }

  // Market stalls at Pasar Senja.
  for (let i = 0; i < 6; i += 1) {
    const sx = 150 + (i % 3) * 40;
    const sz = 180 + Math.floor(i / 3) * 40;
    const stall = box(6, 2.6, 5, '#8a6a4b');
    stall.position.set(sx, 1.3, sz);
    group.add(stall);
    const awning = new THREE.Mesh(
      new THREE.ConeGeometry(4.6, 1.4, 4),
      new THREE.MeshStandardMaterial({ color: i % 2 ? '#ff2e63' : '#ffd94d', roughness: 0.8, flatShading: true }),
    );
    awning.position.set(sx, 3.4, sz);
    awning.rotation.y = Math.PI / 4;
    group.add(awning);
    addCollider(sx, sz, 3.4, 2.9);
  }

  // Garage building exterior (Bengkel Bambang) at Pasar Senja.
  const garageExt = box(26, 9, 18, '#4b7d4b');
  garageExt.position.set(240, 4.5, 240);
  group.add(garageExt);
  addCollider(240, 240, 14, 10);
  for (const dx of [-7, 7]) {
    const roller = box(7, 5.5, 0.25, '#8a8f96', { metal: 0.5, rough: 0.5 });
    roller.position.set(240 + dx, 2.75, 249.1);
    group.add(roller);
    for (let l = 1; l < 5; l += 1) {
      const slat = box(7, 0.12, 0.05, '#6a6f76');
      slat.position.set(240 + dx, l * 1.1, 249.25);
      group.add(slat);
    }
  }
  const garageSign = new THREE.Mesh(
    new THREE.PlaneGeometry(22, 3.6),
    new THREE.MeshStandardMaterial({ map: shopTexture('BENGKEL BAMBANG', '#4b7d4b', '#ffffff'), roughness: 0.7, emissive: 0x113311, emissiveIntensity: 0.6 }),
  );
  garageSign.position.set(240, 7, 249.2);
  group.add(garageSign);
  neonSigns.push(garageSign);

  // Billboards.
  const billboards = [
    { x: 60, z: -180, text: 'GAMELAN FM 101.1', bg: '#ff2e63' },
    { x: -60, z: 180, text: 'GARUDA GT', bg: '#ffd94d' },
    { x: 180, z: 60, text: 'TELUK KENCANA', bg: '#2b6fd0' },
    { x: -180, z: -60, text: 'KENCANA BAY', bg: '#ff8a3d' },
  ];
  for (const b of billboards) {
    const pole1 = box(0.5, 12, 0.5, '#333333');
    pole1.position.set(b.x - 6, 6, b.z);
    const pole2 = box(0.5, 12, 0.5, '#333333');
    pole2.position.set(b.x + 6, 6, b.z);
    const board = new THREE.Mesh(
      new THREE.PlaneGeometry(16, 6),
      new THREE.MeshStandardMaterial({ map: shopTexture(b.text, b.bg, '#ffffff'), roughness: 0.7 }),
    );
    board.position.set(b.x, 14, b.z);
    group.add(pole1, pole2, board);
    addCollider(b.x, b.z, 8, 1);
  }

  // Palms in neat rows along the two main roads (round 8, like the
  // reference's palm-lined highway): both sidewalks of the Alun-Alun
  // main road (z = 60) and of the north-south road (x = 60), every 40u
  // and clear of the intersections — so palms are IN the chase frame
  // instead of scattered randomly. The player start (-40, 60) is kept
  // clear so no palm blocks the chase camera.
  const nearRoad = (v) => WORLD.roads.some((r) => Math.abs(v - r) < 12);
  for (let v = -280; v <= 280; v += 40) {
    if (nearRoad(v)) continue;
    if (Math.abs(v + 40) < 16) continue; // keep the player start clear
    for (const s of [-9, 9]) {
      const p = palm(rand);
      p.position.set(v, 0, 60 + s);
      group.add(p);
      const p2 = palm(rand);
      p2.position.set(60 + s, 0, v);
      group.add(p2);
    }
  }
  // Round 17: a denser palm row inside the chase frame (every 20u,
  // both sidewalks of the z = 60 boulevard, x -80..140) — the top-1
  // chase shot has palms lining both sides of the road, not one every
  // 40u. The 40u rows above stay for the rest of the city.
  for (let v = -80; v <= 140; v += 20) {
    if (nearRoad(v)) continue;
    if (Math.abs(v + 40) < 16) continue; // keep the player start clear
    for (const s of [-9, 9]) {
      const p = palm(rand);
      p.position.set(v, 0, 60 + s);
      group.add(p);
    }
  }
  // Round 17: street furniture on the chase sidewalks — red hydrants on
  // the south kerb, bins on the north kerb — so the sidewalks are never
  // empty concrete. Kept clear of the gantry posts, the totem and the
  // player start.
  for (const hx of [-100, -40, 80, 170]) {
    const hyd = new THREE.Group();
    const hydBody = cylinder(0.25, 0.3, 0.7, '#c91f2b');
    hydBody.position.y = 0.35;
    hyd.add(hydBody);
    const hydTop = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 10, 8),
      new THREE.MeshStandardMaterial({ color: '#c91f2b', roughness: 0.6 }),
    );
    hydTop.position.y = 0.75;
    hyd.add(hydTop);
    for (const sx of [-1, 1]) {
      const cap = cylinder(0.09, 0.09, 0.12, '#8a8f96');
      cap.rotation.z = Math.PI / 2;
      cap.position.set(sx * 0.28, 0.45, 0);
      hyd.add(cap);
    }
    hyd.position.set(hx, 0, 71.5);
    group.add(hyd);
  }
  for (const bx of [-70, -10, 50, 110]) {
    const bin = new THREE.Group();
    const binBody = cylinder(0.4, 0.36, 0.9, '#2a4a3a');
    binBody.position.y = 0.45;
    bin.add(binBody);
    const lid = cylinder(0.42, 0.42, 0.08, '#1c2a22');
    lid.position.y = 0.94;
    bin.add(lid);
    bin.position.set(bx, 0, 48.5);
    group.add(bin);
  }
  for (let i = 0; i < 36; i += 1) {
    const road = rand.pick(WORLD.roads);
    const along = rand.range(-300, 300);
    const side = rand.pick([-1, 1]);
    const px = rand.chance(0.5) ? road + side * 10 : along;
    const pz = rand.chance(0.5) ? along : road + side * 10;
    if (Math.abs(px) > 320 || Math.abs(pz) > 320) continue;
    if (inCollider(px, pz, 2)) continue;
    const p = palm(rand);
    p.position.set(px, 0, pz);
    group.add(p);
  }
  // Round green trees along the roads and the beach.
  for (let i = 0; i < 16; i += 1) {
    const road = rand.pick(WORLD.roads);
    const along = rand.range(-300, 300);
    const side = rand.pick([-1, 1]);
    const px = rand.chance(0.5) ? road + side * 10 : along;
    const pz = rand.chance(0.5) ? along : road + side * 10;
    if (Math.abs(px) > 320 || Math.abs(pz) > 320) continue;
    if (inCollider(px, pz, 2)) continue;
    const t = roundTree(rand);
    t.position.set(px, 0, pz);
    group.add(t);
  }
  // Guardrails along both edges of the Alun-Alun main road (z = 60),
  // like the reference highway's rails — segmented between the cross
  // roads, two rails + posts.
  for (const gz of [60 - 7.2, 60 + 7.2]) {
    for (const [x0, x1] of [[-300, -192], [-168, -72], [-48, 48], [72, 168], [192, 300]]) {
      const len = x1 - x0;
      const cx = (x0 + x1) / 2;
      const railMat = new THREE.MeshStandardMaterial({ color: '#b8bcc2', roughness: 0.35, metalness: 0.7 });
      for (const ry of [0.85, 0.45]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(len, ry === 0.85 ? 0.32 : 0.22, 0.12), railMat);
        rail.position.set(cx, ry, gz);
        rail.castShadow = true;
        group.add(rail);
      }
      for (let px = x0 + 4; px <= x1 - 2; px += 15) {
        const post = box(0.16, 0.95, 0.16, '#8a8f96', { metal: 0.6, rough: 0.4 });
        post.position.set(px, 0.48, gz);
        group.add(post);
      }
    }
  }
  // Green overhead gantry signs over the main road (round 8, like the
  // reference): one mid-frame ahead of the chase, one further down.
  const gantry1 = gantrySign('ALUN-ALUN', 'PANTAI KIDUL');
  gantry1.position.set(20, 0, 60);
  group.add(gantry1);
  addCollider(20, 49, 1, 1);
  addCollider(20, 71, 1, 1);
  const gantry2 = gantrySign('PELABUHAN SEGARA', 'TOL KENCANA');
  gantry2.position.set(140, 0, 60);
  group.add(gantry2);
  addCollider(140, 49, 1, 1);
  addCollider(140, 71, 1, 1);
  // Street lamps along the main roads, each with a warm pool of light
  // on the asphalt (round 8, like the reference's lit highway).
  const poolTex = lampPoolTexture();
  const poolMat = new THREE.MeshBasicMaterial({ map: poolTex, transparent: true, depthWrite: false });
  for (const r of [-180, -60, 60, 180]) {
    for (let v = -280; v <= 280; v += 70) {
      const lamp = streetLamp();
      lamp.position.set(r + 9, 0, v);
      group.add(lamp);
      lamps.push(lamp);
      const pool = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), poolMat);
      pool.rotation.x = -Math.PI / 2;
      pool.position.set(r + 9, 0.07, v);
      group.add(pool);
      const lamp2 = streetLamp();
      lamp2.position.set(v, 0, r + 9);
      group.add(lamp2);
      lamps.push(lamp2);
      const pool2 = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), poolMat);
      pool2.rotation.x = -Math.PI / 2;
      pool2.position.set(v, 0.07, r + 9);
      group.add(pool2);
    }
  }
  // Fountain in the park.
  const fountain = cylinder(4, 4.6, 1.0, '#9aa8b8');
  fountain.position.set(-30, 0.5, 30);
  group.add(fountain);
  const water = new THREE.Mesh(
    new THREE.CircleGeometry(3.6, 20),
    new THREE.MeshStandardMaterial({ color: '#5ab0d0', roughness: 0.15, metalness: 0.4 }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(-30, 1.05, 30);
  group.add(water);

  // Rain streaks (hidden by default, shown in the night shot).
  const rainGeo = new THREE.BufferGeometry();
  const rainPos = [];
  for (let i = 0; i < 600; i += 1) {
    const x = rand.range(-330, 330);
    const y = rand.range(0, 40);
    const z = rand.range(-330, 330);
    rainPos.push(x, y, z, x + 0.3, y - 1.6, z + 0.2);
  }
  rainGeo.setAttribute('position', new THREE.Float32BufferAttribute(rainPos, 3));
  const rain = new THREE.LineSegments(
    rainGeo,
    new THREE.LineBasicMaterial({ color: '#aaccff', transparent: true, opacity: 0.35 }),
  );
  rain.visible = false;
  group.add(rain);

  return {
    group, colliders, buildings, lamps, wheels, neonSigns, rain,
    inCollider,
    districtAt(x, z) { return districtOf(x, z); },
    nearestRoadPoint(x, z) {
      const rx = WORLD.roads.reduce((a, b) => (Math.abs(b - x) < Math.abs(a - x) ? b : a));
      const rz = WORLD.roads.reduce((a, b) => (Math.abs(b - z) < Math.abs(a - z) ? b : a));
      return Math.abs(rx - x) < Math.abs(rz - z) ? { x: rx, z } : { x, z: rz };
    },
    randomRoadPoint() {
      const horizontal = rand.chance(0.5);
      const road = rand.pick(WORLD.roads);
      const along = rand.range(-300, 300);
      return horizontal ? { x: along, z: road } : { x: road, z: along };
    },
    setNight(on) {
      rain.visible = on;
      // Lamp glows stay on in daylight too — the reference's street lamps
      // shine in the sunset, they are not a night-only effect.
      for (const l of lamps) l.userData.glow.visible = true;
    },
    step(dt) {
      for (const w of wheels) w.userData.wheel.rotation.z += dt * 0.25;
    },
  };
}
