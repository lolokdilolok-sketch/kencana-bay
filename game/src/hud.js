// Round 21 reseal — intake repair: HUD + tile-grid GPS map untouched, no logic change; this line is written in the round 21 reseal recorded session (01a206af-459d-70b9-900e-33e388ceab71).
// Round 20: the map is a TILE-GRID GPS now (ref-round20.md §4) — coloured tiles per district, a PURPLE GPS route with coloured checkpoints, district labels + sub-labels; this line is written in the round 20 recorded session.
// The HUD: DOM panels over the 3D canvas, drawn like the top entries —
// a mission panel, a KPD response panel with five NAMED units + distances +
// statuses, wanted stars, cash + respect, six square weapon ICON slots
// with detailed silhouettes + ammo/LOCKED, a minimap drawn from the real street layout,
// a dialogue bar with painted character portraits, radio, speed, stunt
// popups, the transparent map, the MISSION PASSED banner, the garage menu
// and the title poster.
import { WORLD, DISTRICTS, MISSIONS, WEAPONS, CREW, RADIO, GARAGE_MENU, PAINTS } from './config.js';
import { portraitCanvas, CHARACTERS } from './pedestrians.js';

function el(id) { return document.getElementById(id); }

const STARS = '★'.repeat(5);

export function createHud(world) {
  const minimap = el('minimap');
  const mctx = minimap.getContext('2d');
  const mapCanvas = el('map-canvas');
  const mapCtx = mapCanvas ? mapCanvas.getContext('2d') : null;

  const portraitCache = new Map();
  function portrait(def, size) {
    const key = def.name + size;
    if (!portraitCache.has(key)) portraitCache.set(key, portraitCanvas(def, size));
    return portraitCache.get(key);
  }

  function stars(n) {
    let s = '';
    for (let i = 0; i < 5; i += 1) s += i < n ? '★' : '☆';
    return s;
  }

  function fmtCash(n) { return '$' + Math.round(n).toLocaleString('en-US'); }

  // --- Minimap: real street layout, districts, route, units, search zone.
  function drawMinimap(state) {
    const S = 220;
    const scale = S / 700;
    const to = (v) => (v + 350) * scale;
    mctx.clearRect(0, 0, S, S);
    mctx.fillStyle = '#1c2438';
    mctx.fillRect(0, 0, S, S);
    // Sea.
    mctx.fillStyle = '#2b6f8e';
    mctx.fillRect(0, 0, to(-330), S);
    // Districts.
    for (const d of DISTRICTS) {
      mctx.fillStyle = d.color;
      mctx.globalAlpha = 0.55;
      mctx.fillRect(to(d.x0), to(d.z0), (d.x1 - d.x0) * scale, (d.z1 - d.z0) * scale);
      mctx.globalAlpha = 1;
    }
    // Roads.
    mctx.strokeStyle = '#4a3a5e';
    mctx.lineWidth = 5;
    for (const r of WORLD.roads) {
      mctx.beginPath(); mctx.moveTo(0, to(r)); mctx.lineTo(S, to(r)); mctx.stroke();
      mctx.beginPath(); mctx.moveTo(to(r), 0); mctx.lineTo(to(r), S); mctx.stroke();
    }
    mctx.strokeStyle = '#e8d44d';
    mctx.lineWidth = 1;
    for (const r of WORLD.roads) {
      mctx.beginPath(); mctx.moveTo(0, to(r)); mctx.lineTo(S, to(r)); mctx.stroke();
      mctx.beginPath(); mctx.moveTo(to(r), 0); mctx.lineTo(to(r), S); mctx.stroke();
    }
    // Search zone.
    if (state.police && state.police.searchZone) {
      const z = state.police.searchZone;
      mctx.strokeStyle = '#ff2e63';
      mctx.lineWidth = 2;
      mctx.beginPath(); mctx.arc(to(z.x), to(z.z), z.r * scale, 0, Math.PI * 2); mctx.stroke();
      mctx.fillStyle = 'rgba(255,46,99,0.15)';
      mctx.fill();
    }
    // Route line player -> objective.
    if (state.objective) {
      mctx.strokeStyle = '#ffd94d';
      mctx.lineWidth = 2;
      mctx.setLineDash([5, 4]);
      mctx.beginPath(); mctx.moveTo(to(state.player.x), to(state.player.z)); mctx.lineTo(to(state.objective.x), to(state.objective.z)); mctx.stroke();
      mctx.setLineDash([]);
      mctx.fillStyle = '#ffd94d';
      mctx.beginPath(); mctx.arc(to(state.objective.x), to(state.objective.z), 6, 0, Math.PI * 2); mctx.fill();
      mctx.fillStyle = '#1c1c1c';
      mctx.font = 'bold 9px system-ui';
      mctx.textAlign = 'center';
      mctx.fillText('★', to(state.objective.x), to(state.objective.z) + 3);
    }
    // KPD dots.
    if (state.police) {
      for (const u of state.police.units) {
        if (!u.mesh.visible) continue;
        mctx.fillStyle = u.kind === 'heli' ? '#7fd0e8' : '#4a90ff';
        mctx.beginPath(); mctx.arc(to(u.mesh.position.x), to(u.mesh.position.z), u.kind === 'heli' ? 5 : 4, 0, Math.PI * 2); mctx.fill();
      }
    }
    // Race gates.
    if (state.raceGates) {
      mctx.fillStyle = '#ff8a3d';
      state.raceGates.forEach((g, i) => {
        mctx.beginPath(); mctx.arc(to(g[0]), to(g[1]), 4, 0, Math.PI * 2); mctx.fill();
        mctx.fillStyle = '#1c1c1c';
        mctx.font = 'bold 7px system-ui';
        mctx.fillText(String(i + 1), to(g[0]), to(g[1]) + 2.5);
        mctx.fillStyle = '#ff8a3d';
      });
    }
    // Safehouse: Bengkel Bambang, the garage door at (240, 240).
    mctx.fillStyle = '#7dff9a';
    mctx.beginPath(); mctx.arc(to(240), to(240), 5, 0, Math.PI * 2); mctx.fill();
    mctx.fillStyle = '#1c1c1c';
    mctx.font = 'bold 8px system-ui';
    mctx.textAlign = 'center';
    mctx.fillText('H', to(240), to(240) + 3);
    // Player arrow, with a dark outline so it reads over any district.
    mctx.save();
    mctx.translate(to(state.player.x), to(state.player.z));
    mctx.rotate(state.player.heading || 0);
    mctx.fillStyle = '#ffb400';
    mctx.beginPath(); mctx.moveTo(0, -8); mctx.lineTo(6, 6); mctx.lineTo(-6, 6); mctx.closePath(); mctx.fill();
    mctx.strokeStyle = '#1c1c1c';
    mctx.lineWidth = 1.5;
    mctx.stroke();
    mctx.restore();
  }

  // --- The big map: a TILE-GRID GPS (round 20, like the reference
  // GPS map). The city is a grid of 30px tiles, each coloured by its
  // district (map-only palette: blue port, green kampung, red
  // downtown, brown casino, teal beach, orange market — the 3D
  // district colours in config.js are untouched), with a deterministic
  // shade per tile so the grid reads as tiles, not flat blocks. A
  // PURPLE GPS route runs along the roads from the player to the
  // objective, with coloured checkpoints: yellow = objective, green =
  // safehouse, blue = KPD units, red = gang shootout targets (from
  // our own MISSIONS). District names + sub-labels sit top-left of
  // each block; the A–F / 1–6 grid letters frame the edges; a dark
  // strip at the bottom reads "KENCANA BAY · GPS AKTIF · skala 1:12.000".
  function drawMap(state) {
    if (!mapCtx) return;
    const W = mapCanvas.width;
    const H = mapCanvas.height;
    const TILE = 30;
    const cols = Math.floor(W / TILE);
    const rows = Math.floor(H / TILE);
    const toX = (v) => ((v + 330) / 660) * W;
    const toZ = (v) => ((v + 330) / 660) * H;
    const shade = (hex, amt) => {
      const n = parseInt(hex.slice(1), 16);
      const r = Math.max(0, Math.min(255, (n >> 16) + amt));
      const g = Math.max(0, Math.min(255, ((n >> 8) & 0xff) + amt));
      const b = Math.max(0, Math.min(255, (n & 0xff) + amt));
      return `rgb(${r},${g},${b})`;
    };
    const TILE_COLOR = {
      segara: '#2f9ec4', batik: '#3d9a5f', alun: '#c94b4b',
      emas: '#8a6a3d', pantai: '#2a9d8f', pasar: '#e8712a',
    };
    const TILE_SUB = {
      segara: 'Gudang & dermaga', batik: 'Batik & tenun', alun: 'Pusat kota',
      emas: 'Toko emas', pantai: 'Pantai & boulevard', pasar: 'Pasar malam',
    };
    const districtAtWorld = (x, z) => DISTRICTS.find((d) => x >= d.x0 && x < d.x1 && z >= d.z0 && z < d.z1) || DISTRICTS[0];
    mapCtx.clearRect(0, 0, W, H);
    // Tiles.
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        const wx = ((c + 0.5) / cols) * 660 - 330;
        const wz = ((r + 0.5) / rows) * 660 - 330;
        const d = districtAtWorld(wx, wz);
        const v = (((c * 7 + r * 13) % 5) - 2) * 9;
        mapCtx.fillStyle = shade(TILE_COLOR[d.id] || '#555555', v);
        mapCtx.fillRect(c * TILE, r * TILE, TILE, TILE);
      }
    }
    // Tile grid lines.
    mapCtx.strokeStyle = 'rgba(0,0,0,0.35)';
    mapCtx.lineWidth = 1;
    for (let c = 0; c <= cols; c += 1) {
      mapCtx.beginPath(); mapCtx.moveTo(c * TILE + 0.5, 0); mapCtx.lineTo(c * TILE + 0.5, H); mapCtx.stroke();
    }
    for (let r = 0; r <= rows; r += 1) {
      mapCtx.beginPath(); mapCtx.moveTo(0, r * TILE + 0.5); mapCtx.lineTo(W, r * TILE + 0.5); mapCtx.stroke();
    }
    // District names + sub-labels, top-left of each block.
    mapCtx.textAlign = 'left';
    for (const d of DISTRICTS) {
      const x = toX(d.x0) + 10;
      const y = toZ(d.z0) + 20;
      mapCtx.font = 'bold 13px system-ui';
      mapCtx.fillStyle = 'rgba(0,0,0,0.45)';
      mapCtx.fillText(d.name.toUpperCase(), x + 1, y + 1);
      mapCtx.fillStyle = '#ffffff';
      mapCtx.fillText(d.name.toUpperCase(), x, y);
      mapCtx.font = '10px system-ui';
      mapCtx.fillStyle = 'rgba(255,255,255,0.85)';
      mapCtx.fillText(TILE_SUB[d.id] || '', x, y + 14);
    }
    // Grid A–F / 1–6, gold and bold like the reference map's grid.
    mapCtx.fillStyle = '#ffd94d';
    mapCtx.font = 'bold 12px system-ui';
    mapCtx.textAlign = 'center';
    for (let i = 0; i < 6; i += 1) {
      mapCtx.fillText('ABCDEF'[i], toX(-330 + i * 110 + 55), 12);
      mapCtx.fillText(String(i + 1), 10, toZ(-330 + i * 110 + 55) + 4);
    }
    // GPS route: player -> nearest road x -> nearest road z -> objective,
    // so every leg runs along a road (purple, with a dark outline).
    const routePts = (p, o) => {
      const rx = WORLD.roads.reduce((a, b) => (Math.abs(b - o.x) < Math.abs(a - o.x) ? b : a));
      const rz = WORLD.roads.reduce((a, b) => (Math.abs(b - o.z) < Math.abs(a - o.z) ? b : a));
      const pts = [[p.x, p.z]];
      if (Math.abs(rx - p.x) > 1) pts.push([rx, p.z]);
      if (Math.abs(rz - p.z) > 1) pts.push([rx, rz]);
      pts.push([o.x, o.z]);
      return pts.filter((q, i) => i === 0 || q[0] !== pts[i - 1][0] || q[1] !== pts[i - 1][1]);
    };
    if (state.objective) {
      const pts = routePts(state.player, state.objective);
      for (const [lw, col] of [[8, '#7a3fd0'], [4, '#c084fc']]) {
        mapCtx.strokeStyle = col;
        mapCtx.lineWidth = lw;
        mapCtx.lineJoin = 'round';
        mapCtx.lineCap = 'round';
        mapCtx.beginPath();
        pts.forEach(([x, z], i) => { if (i === 0) mapCtx.moveTo(toX(x), toZ(z)); else mapCtx.lineTo(toX(x), toZ(z)); });
        mapCtx.stroke();
      }
    }
    // Checkpoints: red = gang shootout targets (our own missions),
    // blue = visible KPD units, green = safehouse, yellow = objective.
    const dot = (x, z, r, fill) => {
      mapCtx.fillStyle = '#1c1c1c';
      mapCtx.beginPath(); mapCtx.arc(toX(x), toZ(z), r + 2, 0, Math.PI * 2); mapCtx.fill();
      mapCtx.fillStyle = fill;
      mapCtx.beginPath(); mapCtx.arc(toX(x), toZ(z), r, 0, Math.PI * 2); mapCtx.fill();
    };
    for (const m of MISSIONS.filter((m) => m.type === 'shootout')) dot(m.target[0], m.target[1], 5, '#ff5a5a');
    if (state.police) {
      for (const u of state.police.units) {
        if (!u.mesh.visible) continue;
        dot(u.mesh.position.x, u.mesh.position.z, 5, '#4a90ff');
      }
    }
    dot(240, 240, 6, '#7dff9a'); // safehouse: Bengkel Bambang
    if (state.objective) dot(state.objective.x, state.objective.z, 8, '#ffd94d');
    // Player arrow, with a dark outline so it reads over any tile.
    mapCtx.save();
    mapCtx.translate(toX(state.player.x), toZ(state.player.z));
    mapCtx.rotate(state.player.heading || 0);
    mapCtx.fillStyle = '#ffb400';
    mapCtx.beginPath(); mapCtx.moveTo(0, -11); mapCtx.lineTo(8, 8); mapCtx.lineTo(-8, 8); mapCtx.closePath(); mapCtx.fill();
    mapCtx.strokeStyle = '#1c1c1c';
    mapCtx.lineWidth = 1.5;
    mapCtx.stroke();
    mapCtx.restore();
    // Bottom strip.
    mapCtx.fillStyle = 'rgba(16,12,28,0.85)';
    mapCtx.fillRect(0, H - 22, W, 22);
    mapCtx.fillStyle = '#ffffff';
    mapCtx.font = '11px system-ui';
    mapCtx.textAlign = 'left';
    mapCtx.fillText('KENCANA BAY · GPS AKTIF · skala 1:12.000', 10, H - 7);
  }

  function renderStoryList(state) {
    const list = el('story-list');
    if (!list) return;
    list.innerHTML = '';
    const done = state.mission.state.done;
    const idx = state.mission.state.index;
    const defs = [CHARACTERS.ratna, CHARACTERS.wheelman, CHARACTERS.agus, CHARACTERS.ratna, CHARACTERS.ratna, CHARACTERS.bambang, CHARACTERS.agus, CHARACTERS.ratna, CHARACTERS.bambang, CHARACTERS.ratna, CHARACTERS.agus, CHARACTERS.ratna];
    MISSIONS.forEach((m, i) => {
      const row = document.createElement('div');
      row.className = 'story-row' + (i === idx ? ' active' : '') + (i < done ? ' done' : '');
      const img = document.createElement('canvas');
      img.width = 30;
      img.height = 30;
      img.getContext('2d').drawImage(portrait(defs[i], 30), 0, 0);
      const txt = document.createElement('div');
      txt.innerHTML = `<b>${i + 1}. ${m.name}</b><span>$${m.pay} · ${i < done ? 'SELESAI' : i === idx ? 'AKTIF' : 'TERKUNCI'}</span>`;
      row.appendChild(img);
      row.appendChild(txt);
      list.appendChild(row);
    });
  }

// Six SQUARE icon slots (round 8, exact like IMG_9359; round 9: the
  // GARUDA rifle joins the bar so key 4 shows an active slot, and every
  // icon is a multi-part silhouette. Round 10: each icon redrawn with
  // real-gun parts — slide + sights + serrations + trigger guard on the
  // pistol, barrel + shroud + curved magazine + stock on the SMG, twin
  // tubes + grooved pump on the shotgun, scope + rails + muzzle brake
  // on the GARUDA rifle, banded tube + cone warhead + nozzle on the
  // launcher, knuckles + thumb + cuff on the fists — so each weapon
  // reads as itself at a glance instead of a plain blob): fists,
  // pistol, Kancil SMG, shotgun, GARUDA, launcher — ammo (or LOCKED)
  // under the icon, the selected slot orange.
  const BAR_WEAPONS = [0, 1, 2, 3, 4, 5];
  // Round 11: icons are no longer flat silhouettes — each one carries a
  // vertical light-to-dark gradient (defs, one per icon so the ids stay
  // unique), a white top-edge highlight, darker shade parts (muzzle bands,
  // butt pads, magazine bases, cuffs) and more real parts (rifling rings,
  // vent holes, scope lens with glint, pump grooves, launcher bands).
  // Round 14: one more distinguishing part per icon, so each weapon is
  // unmistakable at a glance — knuckle studs + wrist straps (fists),
  // hammer + trigger + slide stop (pistol), foregrip + top rail (SMG),
  // bead sight + side-saddle shells (shotgun), carry handle + gold
  // stripe + bipod (GARUDA), flip sight + trigger + shoulder pad
  // (launcher).
  // The slot CSS still dims locked icons (opacity 0.6); the explicit fills
  // below only replace the inherited flat fill.
  const WEAPON_ICONS = {
    FISTS: '<svg viewBox="0 0 64 36"><defs><linearGradient id="g-fist" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff6dd"/><stop offset="0.55" stop-color="#f2ead8"/><stop offset="1" stop-color="#b3ab90"/></linearGradient></defs><rect x="4" y="10" width="22" height="13" rx="4" fill="url(#g-fist)"/><circle cx="9" cy="8" r="3.2" fill="url(#g-fist)"/><circle cx="15" cy="7" r="3.2" fill="url(#g-fist)"/><circle cx="21" cy="8" r="3.2" fill="url(#g-fist)"/><path d="M6.8 6.2a3.2 3.2 0 0 1 4.4 0M12.8 5.2a3.2 3.2 0 0 1 4.4 0M18.8 6.2a3.2 3.2 0 0 1 4.4 0" stroke="#ffffff" stroke-width="1" fill="none" opacity="0.7"/><path d="M4 20q4.5 3 9 0" fill="none" stroke="#1c2438" stroke-width="1.4" opacity="0.45"/><rect x="4" y="25" width="22" height="4" rx="1" fill="#8f8770"/><rect x="4" y="25" width="22" height="1.2" fill="#ffffff" opacity="0.5"/><path d="M10 15v6M16 14v7M22 15v6" stroke="#1c2438" stroke-width="1.4" opacity="0.45"/><path d="M25 14l3 2-1 5-3.5-1z" fill="#b3ab90"/><rect x="38" y="10" width="22" height="13" rx="4" fill="url(#g-fist)"/><circle cx="43" cy="8" r="3.2" fill="url(#g-fist)"/><circle cx="49" cy="7" r="3.2" fill="url(#g-fist)"/><circle cx="55" cy="8" r="3.2" fill="url(#g-fist)"/><path d="M40.8 6.2a3.2 3.2 0 0 1 4.4 0M46.8 5.2a3.2 3.2 0 0 1 4.4 0M52.8 6.2a3.2 3.2 0 0 1 4.4 0" stroke="#ffffff" stroke-width="1" fill="none" opacity="0.7"/><path d="M38 20q4.5 3 9 0" fill="none" stroke="#1c2438" stroke-width="1.4" opacity="0.45"/><rect x="38" y="25" width="22" height="4" rx="1" fill="#8f8770"/><rect x="38" y="25" width="22" height="1.2" fill="#ffffff" opacity="0.5"/><path d="M44 15v6M50 14v7M56 15v6" stroke="#1c2438" stroke-width="1.4" opacity="0.45"/><path d="M59 14l3 2-1 5-3.5-1z" fill="#b3ab90"/><circle cx="9" cy="8" r="1" fill="#1c2438" opacity="0.5"/><circle cx="15" cy="7" r="1" fill="#1c2438" opacity="0.5"/><circle cx="21" cy="8" r="1" fill="#1c2438" opacity="0.5"/><circle cx="43" cy="8" r="1" fill="#1c2438" opacity="0.5"/><circle cx="49" cy="7" r="1" fill="#1c2438" opacity="0.5"/><circle cx="55" cy="8" r="1" fill="#1c2438" opacity="0.5"/><rect x="4" y="23" width="22" height="2" fill="#1c2438" opacity="0.45"/><rect x="38" y="23" width="22" height="2" fill="#1c2438" opacity="0.45"/></svg>',
    PISTOL: '<svg viewBox="0 0 64 36"><defs><linearGradient id="g-pistol" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff6dd"/><stop offset="0.55" stop-color="#f2ead8"/><stop offset="1" stop-color="#b3ab90"/></linearGradient></defs><rect x="3" y="5" width="46" height="9" rx="1.5" fill="url(#g-pistol)"/><rect x="3" y="5" width="4" height="9" fill="#8f8770" opacity="0.85"/><rect x="4" y="6" width="40" height="1.4" fill="#ffffff" opacity="0.65"/><rect x="36" y="6.5" width="7" height="3.5" rx="1" fill="#1c2438" opacity="0.55"/><rect x="49" y="6.5" width="6" height="6" fill="url(#g-pistol)"/><rect x="45" y="2" width="3" height="3.5" fill="url(#g-pistol)"/><rect x="6" y="2" width="3.5" height="3.5" fill="url(#g-pistol)"/><path d="M40 7v5M36.5 7v5M33 7v5" stroke="#1c2438" stroke-width="1.4" opacity="0.45"/><path d="M7 11h30" stroke="#1c2438" stroke-width="1.2" opacity="0.45"/><path d="M27 14h10l-2.6 12a2 2 0 0 1-1.9 1.6h-5a2 2 0 0 1-2-2.3z" fill="url(#g-pistol)"/><path d="M28.5 17l3.5 8M31.5 17l3.5 8" stroke="#1c2438" stroke-width="1" opacity="0.4"/><path d="M29 19l1 3.5M32 19l1 3.5" stroke="#1c2438" stroke-width="1.2" opacity="0.45"/><path d="M31 16.5h4.5l-1.1 3.4h-3z" fill="#1c2438" opacity="0.45"/><rect x="20" y="29" width="10" height="3" rx="1" fill="#8f8770"/><rect x="20" y="29" width="10" height="1" fill="#ffffff" opacity="0.5"/><rect x="1" y="2.5" width="5" height="4" rx="1" fill="#8f8770"/><path d="M33.5 16.5q1 2.5 -0.5 4" stroke="#1c2438" stroke-width="1.6" fill="none"/><rect x="24" y="9" width="6" height="2.5" rx="1" fill="#1c2438" opacity="0.55"/></svg>',
    'KANCIL SMG': '<svg viewBox="0 0 64 36"><defs><linearGradient id="g-smg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff6dd"/><stop offset="0.55" stop-color="#f2ead8"/><stop offset="1" stop-color="#b3ab90"/></linearGradient></defs><rect x="2" y="11" width="11" height="7" rx="1" fill="url(#g-smg)"/><rect x="0" y="10" width="3" height="9" rx="1" fill="#8f8770"/><path d="M1 12.5h1.5M1 15.5h1.5" stroke="#1c2438" stroke-width="1" opacity="0.5"/><rect x="3" y="11.8" width="9" height="1.2" fill="#ffffff" opacity="0.6"/><rect x="12" y="10" width="24" height="8" rx="1" fill="url(#g-smg)"/><circle cx="18" cy="14" r="1.3" fill="#1c2438" opacity="0.55"/><circle cx="24" cy="14" r="1.3" fill="#1c2438" opacity="0.55"/><circle cx="30" cy="14" r="1.3" fill="#1c2438" opacity="0.55"/><rect x="13" y="10.8" width="22" height="1.2" fill="#ffffff" opacity="0.6"/><rect x="36" y="11.5" width="18" height="5" fill="url(#g-smg)"/><rect x="37" y="12.2" width="16" height="1" fill="#ffffff" opacity="0.6"/><rect x="54" y="10.5" width="6" height="7" fill="url(#g-smg)"/><rect x="59.5" y="10" width="2.5" height="8" fill="#8f8770"/><rect x="30" y="5" width="3" height="5" fill="url(#g-smg)"/><rect x="15" y="6" width="4" height="4" fill="url(#g-smg)"/><rect x="38" y="8" width="5" height="2.5" fill="#8f8770"/><path d="M41 13v3M46 13v3" stroke="#1c2438" stroke-width="1.2" opacity="0.45"/><path d="M18 13.5h7" stroke="#1c2438" stroke-width="1.3" opacity="0.45"/><path d="M22 18h7l-2 11a2 2 0 0 1-2 1.7h-4.5a2 2 0 0 1-2-2.2z" fill="url(#g-smg)"/><path d="M23.5 21l1.5 6M26 21l1.5 6" stroke="#1c2438" stroke-width="1" opacity="0.4"/><path d="M33 18h6l-1.8 9a2 2 0 0 1-1.9 1.6h-3a2 2 0 0 1-1.9-2.2z" fill="url(#g-smg)"/><rect x="40" y="17" width="4" height="7" rx="1" fill="url(#g-smg)"/><path d="M41 19v3M43 19v3" stroke="#1c2438" stroke-width="1" opacity="0.4"/><rect x="30" y="18" width="4" height="8" rx="1" fill="url(#g-smg)"/><path d="M31 20v4M33 20v4" stroke="#1c2438" stroke-width="1" opacity="0.4"/><rect x="12" y="7" width="24" height="2" fill="#8f8770" opacity="0.8"/><rect x="50" y="8" width="3" height="3" fill="url(#g-smg)"/></svg>',
    SHOTGUN: '<svg viewBox="0 0 64 36"><defs><linearGradient id="g-shot" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff6dd"/><stop offset="0.55" stop-color="#f2ead8"/><stop offset="1" stop-color="#b3ab90"/></linearGradient></defs><path d="M6 9L1 13v8l5 4h2V9z" fill="url(#g-shot)"/><rect x="0.5" y="12" width="2.5" height="10" fill="#8f8770"/><rect x="6" y="9" width="18" height="11" rx="1.5" fill="url(#g-shot)"/><rect x="7" y="10" width="16" height="1.2" fill="#ffffff" opacity="0.6"/><rect x="9" y="12" width="12" height="5" rx="1" fill="none" stroke="#1c2438" stroke-width="1" opacity="0.4"/><rect x="24" y="10" width="34" height="3.5" fill="url(#g-shot)"/><rect x="25" y="10.6" width="32" height="1" fill="#ffffff" opacity="0.65"/><rect x="24" y="15.5" width="32" height="3.5" fill="#b3ab90"/><rect x="50" y="9.5" width="2" height="9" fill="#8f8770" opacity="0.8"/><rect x="30" y="15" width="12" height="6" rx="1.5" fill="url(#g-shot)"/><path d="M33 16v4M37 16v4M41 16v4" stroke="#1c2438" stroke-width="1.2" opacity="0.45"/><circle cx="57" cy="8" r="1.2" fill="#1c2438" opacity="0.45"/><path d="M26 11.7h30" stroke="#1c2438" stroke-width="1.1" opacity="0.45"/><path d="M10 17.5h38" stroke="#1c2438" stroke-width="1.1" opacity="0.45"/><path d="M14 20h6l-1 4h-4.5z" fill="#1c2438" opacity="0.45"/><circle cx="57" cy="7" r="1.4" fill="#ffd94d"/><circle cx="11" cy="14.5" r="1.5" fill="#c94b4b"/><circle cx="16" cy="14.5" r="1.5" fill="#c94b4b"/><circle cx="21" cy="14.5" r="1.5" fill="#c94b4b"/><rect x="0.5" y="12" width="1.2" height="10" fill="#1c2438" opacity="0.55"/></svg>',
    GARUDA: '<svg viewBox="0 0 64 36"><defs><linearGradient id="g-rifle" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff6dd"/><stop offset="0.55" stop-color="#f2ead8"/><stop offset="1" stop-color="#b3ab90"/></linearGradient></defs><rect x="1" y="10" width="3" height="9" rx="1" fill="#8f8770"/><path d="M2 12.5h1.5M2 15.5h1.5" stroke="#1c2438" stroke-width="1" opacity="0.5"/><path d="M4 11h10v7H4z" fill="url(#g-rifle)"/><path d="M7 12v5M10 12v5" stroke="#1c2438" stroke-width="1.1" opacity="0.45"/><rect x="14" y="11" width="22" height="7" rx="1" fill="url(#g-rifle)"/><rect x="15" y="11.8" width="20" height="1.1" fill="#ffffff" opacity="0.6"/><rect x="26" y="12.5" width="6" height="3" fill="#1c2438" opacity="0.5"/><rect x="36" y="12.5" width="16" height="3.5" fill="url(#g-rifle)"/><rect x="37" y="13.1" width="14" height="1" fill="#ffffff" opacity="0.6"/><rect x="52" y="11" width="6" height="6.5" fill="url(#g-rifle)"/><rect x="58" y="10.5" width="2.5" height="7.5" fill="#8f8770"/><rect x="18" y="5" width="12" height="4" rx="1" fill="#8f8770"/><ellipse cx="29.5" cy="7" rx="1.6" ry="1.4" fill="#2c4a6b"/><circle cx="30" cy="6.5" r="0.6" fill="#ffffff"/><rect x="21" y="9" width="2" height="2" fill="#8f8770"/><rect x="26" y="9" width="2" height="2" fill="#8f8770"/><path d="M20 18h7l-2 10a2 2 0 0 1-2 1.7h-4a2 2 0 0 1-2-2.2z" fill="url(#g-rifle)"/><path d="M21.5 21l1.5 6M24 21l1.5 6" stroke="#1c2438" stroke-width="1" opacity="0.4"/><path d="M31 18h6l-1.8 8.5a2 2 0 0 1-1.9 1.5h-3a2 2 0 0 1-1.9-2.2z" fill="url(#g-rifle)"/><path d="M32 18.5h3.5l-1 3h-2.5z" fill="#1c2438" opacity="0.45"/><rect x="38" y="7" width="10" height="3" rx="1.5" fill="#8f8770"/><rect x="14" y="14" width="22" height="1.2" fill="#ffb400" opacity="0.85"/><path d="M40 18l-3 8M44 18l3 8" stroke="#1c2438" stroke-width="1.6" fill="none"/></svg>',
    LAUNCHER: '<svg viewBox="0 0 64 36"><defs><linearGradient id="g-launch" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff6dd"/><stop offset="0.55" stop-color="#f2ead8"/><stop offset="1" stop-color="#b3ab90"/></linearGradient></defs><rect x="2" y="12" width="4" height="6" fill="#8f8770"/><rect x="2.8" y="13" width="1.2" height="4" fill="#1c2438" opacity="0.5"/><path d="M6 11h38l6 4-6 4H6z" fill="url(#g-launch)"/><path d="M8 12.4h34" stroke="#ffffff" stroke-width="1.2" opacity="0.6"/><path d="M44 11h6l8 4-8 4h-6z" fill="url(#g-launch)"/><path d="M46 12.2l9 2.8" stroke="#ffffff" stroke-width="1.1" opacity="0.6"/><circle cx="58" cy="15" r="1.4" fill="#1c2438" opacity="0.6"/><rect x="14" y="11" width="2.5" height="8" fill="#8f8770" opacity="0.85"/><rect x="24" y="11" width="2.5" height="8" fill="#8f8770" opacity="0.85"/><rect x="34" y="11" width="2.5" height="8" fill="#8f8770" opacity="0.85"/><path d="M8 15h32" stroke="#1c2438" stroke-width="1.2" opacity="0.45"/><rect x="22" y="19" width="6" height="9" rx="1" fill="url(#g-launch)"/><path d="M23.5 21v5M26 21v5" stroke="#1c2438" stroke-width="1" opacity="0.4"/><rect x="30" y="6.5" width="3" height="4.5" fill="#8f8770"/><rect x="31" y="4.5" width="1" height="2" fill="#8f8770"/><rect x="8" y="6.5" width="3" height="4.5" fill="#8f8770"/><path d="M24 19q1 3 -1 5" stroke="#1c2438" stroke-width="1.8" fill="none"/><rect x="50" y="11" width="4" height="8" rx="1" fill="#1c2438" opacity="0.45"/></svg>',
  };
  function renderWeaponBar(state) {
    const bar = el('weapon-bar');
    if (!bar) return;
    bar.innerHTML = '';
    BAR_WEAPONS.forEach((wi) => {
      const w = WEAPONS[wi];
      const slot = document.createElement('div');
      const unlocked = state.mission.weaponUnlocked(wi);
      slot.className = 'wslot' + (wi === state.weapon ? ' active' : '') + (unlocked ? '' : ' locked');
      const ammo = w.ammo === Infinity ? '' : `${state.ammo[wi] ?? w.ammo}/${w.max}`;
      slot.innerHTML = `<span class="wkey">${wi}</span>${WEAPON_ICONS[w.name]}<span class="wsub">${unlocked ? ammo : 'LOCKED'}</span>`;
      bar.appendChild(slot);
    });
    // Selected weapon name under its slot, like the reference's
    // name label under the selected slot (ours: "KANCIL SMG").
    const nameEl = el('weapon-name');
    if (nameEl) {
      const idx = BAR_WEAPONS.indexOf(state.weapon);
      if (idx >= 0) {
        nameEl.textContent = WEAPONS[state.weapon].name;
        nameEl.style.right = `${14 + (BAR_WEAPONS.length - 1 - idx) * 70}px`;
        nameEl.style.display = '';
      } else {
        nameEl.style.display = 'none';
      }
    }
  }

  let toastTimer = null;
  function toast(text, sub) {
    const t = el('toast');
    if (!t) return;
    t.innerHTML = `<b>${text}</b>${sub ? `<span>${sub}</span>` : ''}`;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
  }

  // Red "HIT! -N HP" popup when the player takes damage, like the
  // reference combat shot. `sticky` keeps it up for a staged screenshot
  // (live play hides it after 900 ms; a shot page paints two slow
  // SwiftShader frames first, so a plain popup would be gone).
  let hitTimer = null;
  function hitPopup(dmg, sticky = false) {
    const p = el('hit-popup');
    if (!p) return;
    p.textContent = `HIT! -${dmg} HP`;
    p.classList.add('show');
    clearTimeout(hitTimer);
    if (!sticky) hitTimer = setTimeout(() => p.classList.remove('show'), 900);
  }

  // Crew bar, bottom-left: the wheelman + the 4 hireable crew + the KPD
  // contact, portraits with names and hire keys/prices. Built once.
  const CREW_BAR = [
    { def: CHARACTERS.wheelman, name: 'RAKA', id: null, key: null, hire: 0 },
    { def: CHARACTERS.agus, name: 'AGUS', id: 'agus', key: 'Z', hire: 200 },
    { def: CHARACTERS.wanto, name: 'WANTO', id: null, key: null, hire: 0 },
    { def: CHARACTERS.bambang, name: 'BAMBANG', id: 'bambang', key: 'X', hire: 350 },
    { def: CHARACTERS.ratna, name: 'RATNA', id: 'ratna', key: 'C', hire: 300 },
    { def: CHARACTERS.slamet, name: 'SLAMET', id: 'slamet', key: 'V', hire: 400 },
  ];
  let crewBuilt = false;
  function buildCrewBar() {
    if (crewBuilt) return;
    crewBuilt = true;
    const bar = el('crew-bar');
    if (!bar) return;
    for (const c of CREW_BAR) {
      const card = document.createElement('div');
      card.className = 'crew-card';
      card.dataset.name = c.name;
      const cv = document.createElement('canvas');
      cv.width = 56;
      cv.height = 56;
      cv.getContext('2d').drawImage(portrait(c.def, 56), 0, 0);
      const nm = document.createElement('div');
      nm.className = 'cc-name';
      nm.textContent = c.name;
      const sub = document.createElement('div');
      sub.className = 'cc-sub';
      sub.textContent = c.key ? `${c.key} · $${c.hire}` : (c.name === 'RAKA' ? 'YOU' : 'KPD');
      card.appendChild(cv);
      card.appendChild(nm);
      card.appendChild(sub);
      bar.appendChild(card);
    }
  }
  function updateCrewBar(state) {
    const bar = el('crew-bar');
    if (!bar) return;
    for (const card of bar.children) {
      const c = CREW_BAR.find((x) => x.name === card.dataset.name);
      if (!c || !c.id) continue;
      const hired = state.mission.state.hired[c.id];
      const sub = card.querySelector('.cc-sub');
      if (sub) sub.textContent = hired ? 'HIRED ✓' : `${c.key} · $${c.hire}`;
      card.classList.toggle('hired', !!hired);
    }
  }

  // Portrait row at the bottom of the map screen, like the reference map.
  let mapCrewBuilt = false;
  function buildMapCrew() {
    if (mapCrewBuilt) return;
    mapCrewBuilt = true;
    const wrap = el('map-crew');
    if (!wrap) return;
    const crew = [
      { def: CHARACTERS.wheelman, name: 'RAKA', role: 'Wheelman' },
      { def: CHARACTERS.agus, name: 'AGUS', role: 'Driver' },
      { def: CHARACTERS.wanto, name: 'WANTO', role: 'KPD' },
      { def: CHARACTERS.bambang, name: 'BAMBANG', role: 'Mekanik' },
      { def: CHARACTERS.ratna, name: 'RATNA', role: 'Fixer' },
      { def: CHARACTERS.slamet, name: 'SLAMET', role: 'Driver' },
    ];
    for (const c of crew) {
      const card = document.createElement('div');
      card.className = 'map-crew-card';
      const cv = document.createElement('canvas');
      cv.width = 56;
      cv.height = 56;
      cv.getContext('2d').drawImage(portrait(c.def, 56), 0, 0);
      const nm = document.createElement('div');
      nm.className = 'mc-name';
      nm.textContent = c.name;
      const rl = document.createElement('div');
      rl.className = 'mc-role';
      rl.textContent = c.role;
      card.appendChild(cv);
      card.appendChild(nm);
      card.appendChild(rl);
      wrap.appendChild(card);
    }
  }

  function setDialogue(def, line) {
    const d = el('dialogue');
    if (!d) return;
    const img = d.querySelector('canvas');
    if (img) {
      const c = portrait(def, 64);
      img.getContext('2d').drawImage(c, 0, 0);
    }
    const nameEl = d.querySelector('.dlg-name');
    const lineEl = d.querySelector('.dlg-line');
    if (nameEl) nameEl.textContent = `${def.name} · ${def.role}`;
    if (lineEl) lineEl.textContent = line;
    d.classList.add('show');
  }

  function hideDialogue() {
    const d = el('dialogue');
    if (d) d.classList.remove('show');
  }

  // Round 15: a district title card at the top of the frame (like the
  // top-10 title cards) — big district name + a sub-line, shown by the
  // chase staging only. It takes the slot the version stamp used to
  // occupy; nothing else ever shows it.
  // Round 16: HUD untouched — the '-55' overlap fix is the 3D damage sprite's new position in shots.js, not a HUD panel.
  function showDistrictCard(name, sub) {
    const d = el('district-card');
    if (!d) return;
    const nameEl = d.querySelector('.dc-name');
    const subEl = d.querySelector('.dc-sub');
    if (nameEl) nameEl.textContent = name;
    if (subEl) subEl.textContent = sub || '';
    d.classList.add('show');
  }

  function update(state) {
    buildCrewBar(); // also builds in shot mode, where boot() never runs
    const m = state.mission.active();
    const mp = el('mission-panel');
    if (mp && m) {
      mp.querySelector('.m-title').textContent = `MISI ${state.mission.state.index + 1}/12 · ${m.name.toUpperCase()}`;
      mp.querySelector('.m-brief').textContent = m.brief;
      mp.querySelector('.m-meta').textContent = `STORY ${state.mission.storyPct()}% · REP ${state.mission.state.rep} · $${m.pay}`;
      const dist = state.objective ? Math.round(Math.hypot(state.objective.x - state.player.x, state.objective.z - state.player.z)) : 0;
      mp.querySelector('.m-dist').textContent = state.objective ? `${dist} m` : '';
    }
    const kp = el('kpd-panel');
    if (kp) {
      const rows = state.police ? state.police.panelRows() : [];
      kp.querySelector('.k-title').textContent = state.police && state.police.wanted > 0
        ? `KPD RESPONSE — ${rows.length} UNIT`
        : 'KPD RESPONSE — AMAN';
      const list = kp.querySelector('.k-units');
      list.innerHTML = rows.map((r) => `<div class="k-row"><span>${r.name}</span><span>${r.dist}m</span><b class="k-st-${r.status.toLowerCase()}">${r.status}</b></div>`).join('')
        || '<div class="k-row"><span>Tidak ada unit mengejar</span></div>';
      // (Round 7: the stars + IN SIGHT live in the top-right cash
      // cluster now, not in this panel — the panel keeps only the five
      // named units + distance + status.)
    }
    const cash = el('cash-line');
    if (cash) {
      const dayTxt = cash.querySelector('.c-daytxt');
      if (dayTxt) dayTxt.textContent = (state.day || 'DAY 1').toUpperCase();
      const clockEl = cash.querySelector('.c-clock');
      if (clockEl) clockEl.textContent = state.clock || '18:36';
      const cashEl = cash.querySelector('.c-cash');
      if (cashEl) cashEl.textContent = fmtCash(state.mission.state.cash);
      const starsEl = cash.querySelector('.c-stars');
      const wanted = state.police ? state.police.wanted : 0;
      if (starsEl) starsEl.textContent = stars(wanted);
      const sightEl = cash.querySelector('.c-sight');
      if (sightEl) {
        if (state.police && wanted > 0) {
          sightEl.innerHTML = state.police.inSight
            ? '<span>search zone follows you</span><span class="c-sight-pill">IN SIGHT</span>'
            : '○ EVADING — bersembunyi dari KPD';
        } else sightEl.innerHTML = '';
      }
    }
    const loc = el('loc-label');
    if (loc && state.player) {
      const d = world.districtAt(state.player.x, state.player.z);
      loc.textContent = d.name.toUpperCase();
    }
    const hp = el('hp-bar');
    if (hp) hp.style.width = `${Math.max(0, state.player.hp)}%`;
    const sp = el('speed');
    if (sp) {
      const kmh = Math.round(Math.abs(state.player.speed || 0) * 3.6);
      const gear = state.inCar ? (kmh < 20 ? 'G1' : kmh < 45 ? 'G2' : kmh < 70 ? 'G3' : kmh < 95 ? 'G4' : 'G5') : '—';
      sp.querySelector('.sp-num').textContent = `${kmh}`;
      sp.querySelector('.sp-unit').textContent = 'KM/H';
      const gearEl = sp.querySelector('.sp-gear');
      if (gearEl) gearEl.textContent = gear;
      sp.querySelector('.sp-car').textContent = state.inCar ? 'GARUDA GT' : 'JALAN KAKI';
      const cond = state.inCar ? Math.round(state.carHp) : Math.round(state.player.hp);
      const fill = sp.querySelector('#cond-fill');
      if (fill) fill.style.width = `${Math.max(0, Math.min(100, cond))}%`;
      const pct = sp.querySelector('.sp-condpct');
      if (pct) pct.textContent = `${Math.max(0, cond)}%`;
      // Segmented rev bar under the KM/H number (round 8, like the
      // reference): lit segments = speed / top speed (46 m/s ≈ 166 km/h).
      const segs = sp.querySelectorAll('.sp-segbar i');
      const lit = Math.round((kmh / 166) * segs.length);
      segs.forEach((s, i) => s.classList.toggle('lit', i < lit));
    }
    const radio = el('radio-line');
    if (radio) {
      const st = radio.querySelector('.r-station');
      if (st) st.textContent = `${RADIO.station} · ${state.track || RADIO.tracks[0]}`;
      const tr = radio.querySelector('.r-track');
      if (tr) tr.textContent = `${state.track || RADIO.tracks[0]} — Gamelan FM`;
    }
    // Round 15: the version stamp is gone (no top-10 entry shows one);
    // the district title card takes the top-centre slot instead.
    renderWeaponBar(state);
    drawMinimap(state);
    updateCrewBar(state);
    if (state.mapOpen) drawMap(state);
  }

  function showMap(open, state) {
    const o = el('map-overlay');
    if (!o) return;
    o.classList.toggle('open', open);
    setHudMode(open ? 'map' : 'play');
    if (open && state) {
      drawMap(state);
      renderStoryList(state);
      buildMapCrew();
      // Current job panel, like the reference map's CURRENT JOB box.
      const job = el('map-job');
      if (job) {
        const cur = state.mission.active();
        const dist = state.objective ? Math.round(Math.hypot(state.objective.x - state.player.x, state.objective.z - state.player.z)) : 0;
        job.innerHTML = `<b>CURRENT JOB</b><div class="mj-name">${cur ? cur.name.toUpperCase() : '—'}</div>` +
          `<div class="mj-meta">STAGE ${state.mission.state.index + 1}/12 · GPS ${dist} m · $${cur ? cur.pay : 0}</div>` +
          `<div class="mj-brief">${cur ? cur.brief : ''}</div>`;
      }
      // Story progress ring, like the reference map's 42% ring.
      const ring = el('map-ring-fill');
      if (ring) {
        const pct = state.mission.storyPct();
        ring.style.background = `conic-gradient(#ffd94d 0deg, #ffd94d ${pct * 3.6}deg, rgba(255,255,255,0.15) ${pct * 3.6}deg, rgba(255,255,255,0.15) 360deg)`;
        const span = ring.querySelector('span');
        if (span) span.textContent = `${pct}%`;
      }
      const ringTxt = el('map-ring-txt');
      if (ringTxt) {
        const s = state.mission.state;
        ringTxt.innerHTML = `STORY ${state.mission.storyPct()}%<br>${s.done}/12 MISI · REP ${s.rep}<br>${fmtCash(s.cash)} · ${state.day || 'DAY 1'}`;
      }
      // Round 20: the stats panel is label/value rows now (like the
      // reference map's STATS: STORY, REP, CASH, TIME, WANTED stars,
      // TAKEDOWNS, CARS STOLEN, STUNTS) + the 42% ring next to it.
      const stats = el('map-stats');
      if (stats) {
        const s = state.mission.state;
        const wantedStars = stars(state.police ? state.police.wanted : 0);
        const rows = [
          ['STORY', `${state.mission.storyPct()}%`],
          ['REP', `FIXER · ${s.rep}`],
          ['CASH', fmtCash(s.cash)],
          ['TIME', `${state.clock || '18:37'} · ${state.day || 'DAY 1'}`],
          ['WANTED', wantedStars],
          ['TAKEDOWNS', `${s.takedowns}`],
          ['CARS STOLEN', `${s.carsStolen}`],
          ['STUNTS', fmtCash(s.stunts)],
        ];
        stats.innerHTML = rows.map(([k, v]) => `<div class="ms-row"><span>${k}</span><b>${v}</b></div>`).join('');
      }
      // Round 20: the active-route bar under the map (like the
      // reference map's footer): mission name + where the purple GPS
      // line leads + what each checkpoint colour means.
      const routeEl = el('map-route');
      if (routeEl) {
        const cur = state.mission.active();
        const d = state.objective ? world.districtAt(state.objective.x, state.objective.z) : null;
        routeEl.innerHTML = `<b>RUTE AKTIF:</b> ${cur ? cur.name : '—'} — garis ungu menuju ${d ? d.name : 'objektif'}. Titik kuning = objektif, biru = KPD, merah = musuh, hijau = safehouse.`;
      }
    }
  }

  function showPassed(passed) {
    const o = el('passed-overlay');
    if (!o) return;
    if (!passed) { o.classList.remove('show'); return; }
    o.querySelector('.p-title').textContent = 'MISI SELESAI';
    o.querySelector('.p-mission').textContent = passed.name;
    o.querySelector('.p-reward').textContent = `+$${passed.pay}  +${passed.rep} REP${passed.unlocked.length ? '  · TERBUKA: ' + passed.unlocked.join(', ') : ''}`;
    o.querySelector('.p-next').textContent = passed.next ? `BERIKUTNYA: ${passed.next}` : 'SEMUA MISI SELESAI — KENCANA BEBAS';
    o.classList.add('show');
  }

  function showGarage(open, garage, cash) {
    const p = el('garage-panel');
    if (!p) return;
    p.classList.toggle('open', open);
    setHudMode(open ? 'garage' : 'play');
    if (!open) return;
    const st = garage.stats();
    p.querySelector('.g-car').textContent = `GARUDA GT · ${PAINTS[garage.state.paint].name}`;
    p.querySelector('.g-stats').innerHTML =
      `Top speed <b>${st.top} km/h</b> · Akselerasi <b>${st.accel.toFixed(1)}s</b><br>Armour <b>${st.armour}</b> · Handling <b>${st.handling}</b> · Kondisi <b>${Math.round(garage.state.hp)}%</b>`;
    const menu = p.querySelector('.g-menu');
    menu.innerHTML = GARAGE_MENU.map((item, i) => `<div class="g-row"><span>${i + 1} ${item.name}</span><span>${item.desc}</span><b>$${item.price.toLocaleString('en-US')}</b></div>`).join('');
    p.querySelector('.g-cash').textContent = `CASH ${fmtCash(cash)} · Tekan 1-4 untuk beli · G untuk keluar`;
  }

  // Which HUD panels are visible depends on the screen: the title, the map,
  // the garage and the pause screen each hide the gameplay panels that
  // would show through or overlap them. The #hud element carries the mode.
  function setHudMode(mode) {
    const h = el('hud');
    if (h) h.dataset.mode = mode;
  }

  let cardsBuilt = false;
  function buildTitleCards() {
    if (cardsBuilt) return;
    cardsBuilt = true;
    const wrap = el('t-cards');
    if (!wrap) return;
    const cards = [
      { def: CHARACTERS.wheelman, name: 'RAKA', bio: 'Wheelman — pulang setelah 5 tahun. Garuda GT emasnya menunggu di Pantai Kidul.' },
      { def: CHARACTERS.ratna, name: 'RATNA', bio: 'Fixer — mengatur semua pekerjaan di Kencana. Jangan berutang padanya.' },
      { def: CHARACTERS.bambang, name: 'BAMBANG', bio: 'Mekanik — Bengkel Bambang di Pasar Senja. Cat, mesin, armour, semua bisa.' },
    ];
    for (const c of cards) {
      const div = document.createElement('div');
      div.className = 't-card';
      const cv = document.createElement('canvas');
      cv.width = 72;
      cv.height = 72;
      cv.getContext('2d').drawImage(portrait(c.def, 72), 0, 0);
      const tx = document.createElement('div');
      const b = document.createElement('b');
      b.textContent = c.name;
      const s = document.createElement('span');
      s.textContent = c.bio;
      tx.appendChild(b);
      tx.appendChild(s);
      div.appendChild(cv);
      div.appendChild(tx);
      wrap.appendChild(div);
    }
  }

  function showTitle(open, saveInfo) {
    const t = el('title-screen');
    if (!t) return;
    t.classList.toggle('open', open);
    setHudMode(open ? 'title' : 'play');
    if (open && saveInfo) {
      buildTitleCards();
      const cont = el('btn-continue');
      if (cont) {
        cont.style.display = saveInfo.hasSave ? '' : 'none';
        if (saveInfo.hasSave) cont.textContent = `▶ LANJUTKAN — Misi ${saveInfo.mission}/12 · ${fmtCash(saveInfo.cash)} · ${saveInfo.day}`;
      }
    }
  }

  function showPause(open, state) {
    const p = el('pause-screen');
    if (!p) return;
    p.classList.toggle('open', open);
    setHudMode(open ? 'pause' : 'play');
    if (open && state) {
      p.querySelector('.ps-stats').innerHTML =
        `STORY ${state.mission.storyPct()}% COMPLETE<br>CASH ${fmtCash(state.mission.state.cash)} · REP ${state.mission.state.rep}<br>` +
        `TAKEDOWNS ${state.mission.state.takedowns} · CARS STOLEN ${state.mission.state.carsStolen} · STUNTS ${fmtCash(state.mission.state.stunts)}`;
    }
  }

  return {
    update, toast, hitPopup, setDialogue, hideDialogue, showDistrictCard, showMap, showPassed, showGarage, showTitle, showPause,
    drawMinimap, drawMap, portrait, buildCrewBar,
  };
}
