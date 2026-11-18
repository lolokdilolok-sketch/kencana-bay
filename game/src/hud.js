// The HUD and every screen made of DOM: the title screen, the in-game HUD (mission panel,
// minimap, KPD panel, cash, clock, speed, horizontal weapon bar, dialogue bar, help bar),
// the transparent map, the garage panel and the race timer. The 3D scene is behind all of
// it; this file only reads game state and paints text and canvases.
//
// Portraits are drawn on small canvases, one distinct card per speaker — a radial
// background in that character's colour, a minifig-style face, and their own hair and
// accessories — so the dialogue bar and the mission list always show a face you can tell
// apart. The weapon bar is horizontal: slot 0 is the fist (infinite), slots 1-5 are the
// guns with drawn icons and ammo counts; the active slot glows orange and locked guns
// show LOCKED. The big map names every district on its block, labels the A–F / 1–6 grid,
// and lists the story with a portrait and a status per mission.

import { CREW, DISTRICTS, MISSIONS, PAINTS, VERSION_STAMP, WEAPONS, weaponUnlocked } from './config.js';

// One card per speaker: radial background, skin, hair, shirt, and what makes them readable.
const SPEAKER_STYLE = {
  Ratna: { bg: ['#ff9ad5', '#7a2a6a'], skin: '#f2c9a0', hair: '#ff5fa2', shirt: '#b06ae0', hairStyle: 'bob', glasses: true },
  Agus: { bg: ['#ffb37a', '#8a3a1a'], skin: '#d9a066', hair: '#1a1a1a', shirt: '#ff7a2a', hairStyle: 'short', pattern: true },
  Bambang: { bg: ['#7fe8d9', '#1a5a4a'], skin: '#c98a5a', hair: '#1a1a1a', shirt: '#2a8a7a', hairStyle: 'bandana' },
  Wanto: { bg: ['#8ab4ff', '#1a2a5a'], skin: '#d9a066', hair: '#666666', shirt: '#1a4a9a', hairStyle: 'policecap' },
  Wheelman: { bg: ['#ffe9a8', '#b06a1a'], skin: '#d9a066', hair: '#1a1a1a', shirt: '#ff7a2a', hairStyle: 'short', glasses: true },
};

/** Draw one portrait card: a radial background in the speaker's colour, shoulders in their
 * shirt, a round minifig-style head, and their own hair — pink bob for Ratna, red bandana
 * for Bambang, police cap with a gold badge for Wanto, short hair for Agus and the
 * wheelman, sunglasses where they wear them. */
function drawPortrait(canvas, speaker) {
  const style = SPEAKER_STYLE[speaker] || SPEAKER_STYLE.Wheelman;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  // Radial background: light in the middle, the speaker's colour at the edges.
  const grad = ctx.createRadialGradient(w / 2, h * 0.38, w * 0.08, w / 2, h / 2, w * 0.75);
  grad.addColorStop(0, style.bg[0]);
  grad.addColorStop(1, style.bg[1]);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  // Shoulders.
  ctx.fillStyle = style.shirt;
  ctx.beginPath();
  ctx.moveTo(0, h);
  ctx.quadraticCurveTo(w / 2, h * 0.6, w, h);
  ctx.closePath();
  ctx.fill();
  // Shirt pattern dots for Agus.
  if (style.pattern) {
    ctx.fillStyle = '#ffd34d';
    for (const [px, py] of [[0.36, 0.82], [0.58, 0.88], [0.46, 0.74]]) {
      ctx.beginPath();
      ctx.arc(w * px, h * py, w * 0.035, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Neck and head.
  ctx.fillStyle = style.skin;
  ctx.fillRect(w * 0.44, h * 0.44, w * 0.12, h * 0.18);
  ctx.beginPath();
  ctx.arc(w / 2, h * 0.32, w * 0.2, 0, Math.PI * 2);
  ctx.fill();
  // Hair / headwear, one shape per speaker.
  ctx.fillStyle = style.hair;
  if (style.hairStyle === 'bob') {
    // Pink bob: cap on top plus locks down both sides of the face.
    ctx.beginPath();
    ctx.arc(w / 2, h * 0.26, w * 0.22, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(w * 0.27, h * 0.24, w * 0.09, h * 0.42);
    ctx.fillRect(w * 0.64, h * 0.24, w * 0.09, h * 0.42);
  } else if (style.hairStyle === 'bandana') {
    // Red bandana: band across the forehead, knot at the side, hair below it.
    ctx.beginPath();
    ctx.arc(w / 2, h * 0.24, w * 0.2, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#d21f2b';
    ctx.fillRect(w * 0.3, h * 0.2, w * 0.4, h * 0.09);
    ctx.beginPath();
    ctx.arc(w * 0.74, h * 0.26, w * 0.05, 0, Math.PI * 2);
    ctx.fill();
  } else if (style.hairStyle === 'policecap') {
    // Police cap: dark blue crown, brim, gold badge.
    ctx.fillStyle = '#12264a';
    ctx.beginPath();
    ctx.arc(w / 2, h * 0.22, w * 0.21, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(w * 0.3, h * 0.2, w * 0.4, h * 0.05);
    ctx.fillStyle = '#ffd34d';
    ctx.beginPath();
    ctx.arc(w / 2, h * 0.17, w * 0.045, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Short hair: a cap of hair on the top of the head.
    ctx.beginPath();
    ctx.arc(w / 2, h * 0.24, w * 0.2, Math.PI, 0);
    ctx.fill();
  }
  // Eyes or sunglasses.
  if (style.glasses) {
    ctx.fillStyle = '#111';
    ctx.fillRect(w * 0.3, h * 0.3, w * 0.16, h * 0.05);
    ctx.fillRect(w * 0.54, h * 0.3, w * 0.16, h * 0.05);
    ctx.fillRect(w * 0.46, h * 0.31, w * 0.08, h * 0.02);
  } else {
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(w * 0.4, h * 0.32, w * 0.03, 0, Math.PI * 2);
    ctx.arc(w * 0.6, h * 0.32, w * 0.03, 0, Math.PI * 2);
    ctx.fill();
  }
  // Smile.
  ctx.strokeStyle = '#7a4a3a';
  ctx.lineWidth = Math.max(1.5, w * 0.03);
  ctx.beginPath();
  ctx.arc(w / 2, h * 0.44, w * 0.07, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
  // Wanto's uniform star.
  if (style.hairStyle === 'policecap') {
    ctx.fillStyle = '#ffd34d';
    ctx.beginPath();
    ctx.arc(w / 2, h * 0.82, w * 0.05, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Draw a white weapon silhouette on a small canvas: fist, pistol, SMG, shotgun, rifle,
 * launcher — the same shapes the reference weapon bar uses. */
function drawWeaponIcon(canvas, kind) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  const r = (x, y, rw, rh) => ctx.fillRect(x, y, rw, rh);
  if (kind === 'fist') {
    // A clenched fist: palm block with four knuckle bumps on top.
    r(w * 0.22, h * 0.4, w * 0.56, h * 0.42);
    for (let i = 0; i < 4; i += 1) r(w * (0.24 + i * 0.13), h * 0.26, w * 0.1, h * 0.18);
    r(w * 0.2, h * 0.55, w * 0.14, h * 0.2);
  } else if (kind === 'pistol') {
    r(w * 0.14, h * 0.28, w * 0.62, h * 0.22); // slide
    r(w * 0.76, h * 0.32, w * 0.12, h * 0.14); // muzzle
    ctx.beginPath(); // grip
    ctx.moveTo(w * 0.3, h * 0.5); ctx.lineTo(w * 0.46, h * 0.5);
    ctx.lineTo(w * 0.42, h * 0.86); ctx.lineTo(w * 0.26, h * 0.86);
    ctx.closePath(); ctx.fill();
  } else if (kind === 'smg') {
    r(w * 0.1, h * 0.3, w * 0.6, h * 0.2); // body
    r(w * 0.7, h * 0.34, w * 0.22, h * 0.12); // barrel
    ctx.beginPath(); // magazine, angled
    ctx.moveTo(w * 0.36, h * 0.5); ctx.lineTo(w * 0.48, h * 0.5);
    ctx.lineTo(w * 0.44, h * 0.82); ctx.lineTo(w * 0.32, h * 0.82);
    ctx.closePath(); ctx.fill();
    r(w * 0.02, h * 0.32, w * 0.1, h * 0.16); // stock
  } else if (kind === 'shotgun') {
    r(w * 0.06, h * 0.36, w * 0.72, h * 0.12); // long barrel
    r(w * 0.2, h * 0.48, w * 0.2, h * 0.12); // pump
    r(w * 0.78, h * 0.3, w * 0.16, h * 0.26); // stock
    r(w * 0.4, h * 0.48, w * 0.08, h * 0.2); // trigger guard
  } else if (kind === 'rifle') {
    r(w * 0.1, h * 0.36, w * 0.56, h * 0.18); // body
    r(w * 0.66, h * 0.39, w * 0.26, h * 0.1); // barrel
    r(w * 0.3, h * 0.24, w * 0.2, h * 0.08); // scope
    r(w * 0.36, h * 0.32, w * 0.04, h * 0.06); // scope mount
    ctx.beginPath(); // magazine
    ctx.moveTo(w * 0.42, h * 0.54); ctx.lineTo(w * 0.52, h * 0.54);
    ctx.lineTo(w * 0.48, h * 0.82); ctx.lineTo(w * 0.38, h * 0.82);
    ctx.closePath(); ctx.fill();
    r(w * 0.02, h * 0.38, w * 0.1, h * 0.2); // stock
  } else if (kind === 'launcher') {
    r(w * 0.08, h * 0.32, w * 0.66, h * 0.26); // thick tube
    ctx.beginPath(); // flared muzzle
    ctx.moveTo(w * 0.74, h * 0.28); ctx.lineTo(w * 0.9, h * 0.2);
    ctx.lineTo(w * 0.9, h * 0.68); ctx.lineTo(w * 0.74, h * 0.6);
    ctx.closePath(); ctx.fill();
    r(w * 0.36, h * 0.58, w * 0.08, h * 0.22); // grip
    r(w * 0.28, h * 0.24, w * 0.14, h * 0.08); // sight
  }
}

const WEAPON_ICONS = ['fist', 'pistol', 'smg', 'shotgun', 'rifle', 'launcher'];
const WEAPON_NAMES = ['Tinju', ...WEAPONS.map((w) => w.name)];

function fmtTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function fmtClock(minutes) {
  const h = Math.floor(minutes / 60) % 24;
  const m = Math.floor(minutes % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function createHud(callbacks) {
  const $ = (id) => document.getElementById(id);
  const titleScreen = $('title-screen');
  const hud = $('hud');
  const mapOverlay = $('map-overlay');
  const garagePanel = $('garage-panel');
  const pausePanel = $('pause-panel');
  const dialogueBar = $('dialogue-bar');
  const dialogueText = $('dialogue-text');
  const dialogueName = $('dialogue-name');
  const dialoguePortrait = $('dialogue-portrait');
  const toasts = $('toasts');
  const minimap = $('minimap');
  const mapCanvas = $('map-canvas');
  const minimapCtx = minimap.getContext('2d');
  const mapCtx = mapCanvas.getContext('2d');
  let dialogueTimer = 0;

  // Title buttons.
  $('btn-start').addEventListener('click', () => callbacks.onStart());
  $('btn-save').addEventListener('click', () => callbacks.onSave());
  $('btn-load').addEventListener('click', () => callbacks.onLoad());
  $('btn-end').addEventListener('click', () => callbacks.onEnd());
  $('btn-resume').addEventListener('click', () => callbacks.onResume());
  $('btn-quit').addEventListener('click', () => callbacks.onQuitToTitle());
  $('btn-garage-exit').addEventListener('click', () => callbacks.onGarageExit());
  $('btn-repair').addEventListener('click', () => callbacks.onRepair());
  $('btn-talk').addEventListener('click', () => callbacks.onTalkBambang());
  for (const paint of PAINTS) {
    const btn = document.createElement('button');
    btn.className = 'paint-btn';
    btn.textContent = paint.name;
    btn.style.setProperty('--paint', `#${paint.hex.toString(16).padStart(6, '0')}`);
    btn.addEventListener('click', () => callbacks.onRepaint(paint.id));
    $('paint-row').appendChild(btn);
  }

  // Horizontal weapon bar: slot 0 is the fist, slots 1-5 are the guns. Built once, the
  // icons are drawn on small canvases; update() only flips classes and ammo text.
  const weaponBar = $('weapon-slots');
  weaponBar.innerHTML = '';
  const weaponSlots = [];
  for (let i = 0; i < 6; i += 1) {
    const slot = document.createElement('div');
    slot.className = 'wslot';
    const num = document.createElement('span');
    num.className = 'wnum';
    num.textContent = i;
    const icon = document.createElement('canvas');
    icon.className = 'wicon';
    icon.width = 48;
    icon.height = 32;
    drawWeaponIcon(icon, WEAPON_ICONS[i]);
    const ammo = document.createElement('span');
    ammo.className = 'wammo';
    slot.append(num, icon, ammo);
    weaponBar.appendChild(slot);
    weaponSlots.push({ slot, ammo });
  }

  function showTitle(show) {
    titleScreen.classList.toggle('hidden', !show);
    hud.classList.toggle('hidden', show);
  }

  function showPause(show) {
    pausePanel.classList.toggle('hidden', !show);
  }

  function showMap(show) {
    mapOverlay.classList.toggle('hidden', !show);
    hud.classList.toggle('hidden', show);
  }

  function showGarage(show) {
    garagePanel.classList.toggle('hidden', !show);
    hud.classList.toggle('hidden', show);
  }

  function toast(text) {
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = text;
    toasts.appendChild(el);
    setTimeout(() => el.remove(), 3600);
  }

  function showDialogue(speaker, text, seconds = 5) {
    dialogueName.textContent = speaker;
    dialogueText.textContent = text;
    drawPortrait(dialoguePortrait, speaker);
    dialogueBar.classList.remove('hidden');
    dialogueTimer = seconds;
  }

  function hideDialogue() {
    dialogueBar.classList.add('hidden');
    dialogueTimer = 0;
  }

  /** Draw the city map on a canvas. `labels` adds district names on their blocks, the
   * A–F / 1–6 grid letters, and landmark labels — the big map only; the round minimap
   * stays clean. Returns the coordinate helpers for the markers. */
  function drawCityMap(ctx, size, state, labels = false) {
    ctx.clearRect(0, 0, size, size);
    const scale = size / 900;
    const ox = size / 2;
    const oz = size / 2;
    const X = (x) => ox + x * scale;
    const Z = (z) => oz + z * scale;
    // Sea.
    ctx.fillStyle = '#2a6db0';
    ctx.fillRect(0, 0, X(-360), size);
    // District plates.
    for (const d of DISTRICTS) {
      ctx.fillStyle = d.color;
      ctx.globalAlpha = 0.55;
      ctx.fillRect(X(d.x0), Z(d.z0), (d.x1 - d.x0) * scale, (d.z1 - d.z0) * scale);
      ctx.globalAlpha = 1;
    }
    // Roads.
    ctx.strokeStyle = '#2e3138';
    ctx.lineWidth = 14 * scale;
    for (let v = -360; v <= 360; v += 120) {
      ctx.beginPath(); ctx.moveTo(X(v), Z(-420)); ctx.lineTo(X(v), Z(420)); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(X(-420), Z(v)); ctx.lineTo(X(420), Z(v)); ctx.stroke();
    }
    // Beach.
    ctx.fillStyle = '#e8c98a';
    ctx.fillRect(X(-360), Z(240), 30 * scale, 120 * scale);
    if (labels) {
      // Grid letters A–F across the top, numbers 1–6 down the left.
      ctx.fillStyle = '#ffd34d';
      ctx.font = `bold ${Math.round(size * 0.02)}px system-ui`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const cols = ['A', 'B', 'C', 'D', 'E', 'F'];
      for (let i = 0; i < 6; i += 1) ctx.fillText(cols[i], X(-360 + i * 120 + 60), Z(-420) + size * 0.02);
      for (let i = 0; i < 6; i += 1) ctx.fillText(String(i + 1), X(-420) + size * 0.02, Z(-360 + i * 120 + 60));
      // District names, written on their own blocks on a dark pill.
      ctx.font = `bold ${Math.round(size * 0.02)}px system-ui`;
      for (const d of DISTRICTS) {
        const cx = X((d.x0 + d.x1) / 2);
        const cy = Z((d.z0 + d.z1) / 2);
        const label = d.name.toUpperCase();
        const tw = ctx.measureText(label).width;
        ctx.fillStyle = 'rgba(10,8,16,0.55)';
        ctx.fillRect(cx - tw / 2 - 6, cy - size * 0.016, tw + 12, size * 0.032);
        ctx.fillStyle = '#fff';
        ctx.fillText(label, cx, cy);
      }
      // Landmark labels — each clear of the district name above it and of its own marker.
      ctx.font = `${Math.round(size * 0.016)}px system-ui`;
      const marks = [
        ['BENGKEL BAMBANG', 300, 352],
        ['SAFEHOUSE', -60, -28],
        ['BALAPAN', -300, 322],
        ['CASINO EMAS', 300, -42],
        ['HOTEL KENCANA', 0, -118],
      ];
      for (const [text, mx, mz] of marks) {
        const tw = ctx.measureText(text).width;
        ctx.fillStyle = 'rgba(10,8,16,0.55)';
        ctx.fillRect(X(mx) - tw / 2 - 4, Z(mz) - size * 0.012, tw + 8, size * 0.024);
        ctx.fillStyle = '#ffe9a8';
        ctx.fillText(text, X(mx), Z(mz));
      }
      ctx.textAlign = 'left';
    }
    // Garage door marker.
    ctx.fillStyle = '#3fd2c0';
    ctx.beginPath(); ctx.arc(X(300), Z(314), 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = `${Math.max(9, 11 * scale * 4)}px system-ui`;
    ctx.fillText('G', X(300) - 3, Z(314) + 3);
    // Race start flag.
    ctx.fillStyle = '#111';
    ctx.fillRect(X(-300) - 5, Z(300) - 5, 10, 10);
    ctx.fillStyle = '#fff';
    ctx.fillRect(X(-300) - 5, Z(300) - 5, 5, 5);
    ctx.fillRect(X(-300), Z(300), 5, 5);
    // Safehouse marker.
    ctx.fillStyle = '#3fd2c0';
    ctx.beginPath(); ctx.arc(X(-60), Z(-60), 5, 0, Math.PI * 2); ctx.fill();
    // Mission target star + route line.
    if (state.target) {
      ctx.strokeStyle = '#ffd34d';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(X(state.player.x), Z(state.player.z));
      ctx.lineTo(X(state.target.x), Z(state.target.z));
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#ffd34d';
      const tx = X(state.target.x);
      const tz = Z(state.target.z);
      ctx.beginPath();
      for (let i = 0; i < 5; i += 1) {
        const a = -Math.PI / 2 + (i * 4 * Math.PI) / 5;
        const px = tx + Math.cos(a) * 9;
        const py = tz + Math.sin(a) * 9;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
    }
    // Race gates.
    if (state.race && state.race.active && state.race.nextGate) {
      ctx.strokeStyle = '#ff2e63';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(X(state.race.nextGate.x), Z(state.race.nextGate.z), 8, 0, Math.PI * 2);
      ctx.stroke();
    }
    // Police dots.
    ctx.fillStyle = '#1a4a9a';
    for (const p of state.police) {
      ctx.beginPath(); ctx.arc(X(p.x), Z(p.z), 3.5, 0, Math.PI * 2); ctx.fill();
    }
    // Player arrow.
    ctx.save();
    ctx.translate(X(state.player.x), Z(state.player.z));
    ctx.rotate(-state.player.heading);
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(0, -9); ctx.lineTo(6, 7); ctx.lineTo(-6, 7); ctx.closePath();
    ctx.fill();
    ctx.restore();
    return { X, Z, scale };
  }

  function update(state, dt) {
    // Mission panel (top-left).
    $('mission-name').textContent = state.mission.done ? 'STORY COMPLETE' : `MISSION ${state.mission.index + 1}/12 — ${state.mission.mission.name}`;
    $('mission-brief').textContent = state.mission.objective;
    $('mission-payout').textContent = state.mission.done ? '' : `Reward $${state.mission.mission.payout}`;
    // Cash, clock, wanted, speed.
    $('cash').textContent = `$${state.cash.toLocaleString('en-US')}`;
    $('clock').textContent = `${fmtClock(state.clockMinutes)} · DAY ${state.day}`;
    $('wanted-stars').textContent = '★'.repeat(state.wanted) + '☆'.repeat(5 - state.wanted);
    $('speed').textContent = `${Math.round(Math.abs(state.speedKmh))} KM/H`;
    $('speed-label').textContent = state.inCar ? 'GARUDA GT' : 'ON FOOT';
    $('hp-bar').style.width = `${Math.max(0, state.hp)}%`;
    $('rep').textContent = `REP FIXER · ${state.rep}`;
    // Horizontal weapon bar: slot 0 is the fist (state.weapon -1), slots 1-5 are guns.
    for (let i = 0; i < 6; i += 1) {
      const { slot, ammo } = weaponSlots[i];
      const active = state.weapon + 1 === i;
      const locked = i > 0 && !weaponUnlocked(i - 1, state.mission.index);
      slot.classList.toggle('active', active);
      slot.classList.toggle('locked', locked);
      if (locked) ammo.textContent = 'LOCKED';
      else if (i === 0) ammo.textContent = '∞';
      else ammo.textContent = `${state.ammo[i - 1]}/${WEAPONS[i - 1].ammo}`;
    }
    $('weapon-name').textContent = state.weapon < 0 ? 'Tinju' : WEAPONS[state.weapon].name;
    // Radio + version pill.
    $('radio-line').textContent = state.radioOn ? 'GAMELAN FM 101.1 — Bonang Malam' : 'RADIO OFF — press T';
    // Crew hire states.
    for (const crew of CREW) {
      const el = $(`crew-${crew.id}`);
      if (el) el.textContent = state.crew[crew.id] ? 'HIRED' : `HIRE $${crew.price} [${crew.key}]`;
    }
    // Race timer.
    if (state.race && state.race.active) {
      $('race-hud').classList.remove('hidden');
      $('race-timer').textContent = fmtTime(state.race.elapsed);
      $('race-gate').textContent = `GATE ${state.race.gateIndex + 1}/${state.race.total}`;
      $('race-dist').textContent = state.race.nextDist != null ? `NEXT GATE ${Math.round(state.race.nextDist)}m` : '';
    } else {
      $('race-hud').classList.add('hidden');
    }
    // Garage hint.
    $('garage-hint').classList.toggle('hidden', !state.nearGarage);
    $('race-hint').classList.toggle('hidden', !state.nearRace);
    // Dialogue countdown.
    if (dialogueTimer > 0) {
      dialogueTimer -= dt;
      if (dialogueTimer <= 0) hideDialogue();
    }
    // Minimap.
    drawCityMap(minimapCtx, 220, state, false);
    // Map overlay (when open): mission list with portraits + status, and stats.
    if (!mapOverlay.classList.contains('hidden')) {
      drawCityMap(mapCtx, 540, state, true);
      const list = $('map-missions');
      list.innerHTML = '';
      MISSIONS.forEach((m, i) => {
        const li = document.createElement('li');
        li.className = i < state.mission.index ? 'done' : i === state.mission.index ? 'active' : '';
        const pc = document.createElement('canvas');
        pc.className = 'mini-portrait';
        pc.width = 28;
        pc.height = 28;
        drawPortrait(pc, m.contact);
        const span = document.createElement('span');
        span.textContent = `${i + 1}. ${m.name} $${m.payout}`;
        const st = document.createElement('b');
        st.className = 'mstatus';
        st.textContent = i < state.mission.index ? 'Complete' : i === state.mission.index ? 'Active' : 'Locked';
        li.append(pc, span, st);
        list.appendChild(li);
      });
      $('map-stats').innerHTML = `STORY ${Math.round((state.mission.index / 12) * 100)}% · REP FIXER ${state.rep} · CASH $${state.cash.toLocaleString('en-US')} · TIME ${fmtClock(state.clockMinutes)} · DAY ${state.day} · WANTED ${state.wanted} · TAKEDOWNS ${state.stats.takedowns} · CARS STOLEN ${state.stats.carsStolen} · STUNTS $${state.stats.stunts} · RACES WON ${state.stats.racesWon}/${state.stats.racesRun}`;
    }
  }

  return {
    showTitle, showPause, showMap, showGarage, toast, showDialogue, hideDialogue, update,
    setGarageInfo(info) {
      $('garage-cash').textContent = `Cash $${info.cash} · Repair $${info.repairCost} · Car HP ${info.carHp}%`;
      $('garage-paint').textContent = `Current paint: ${info.paintName}`;
    },
    isMapOpen() {
      return !mapOverlay.classList.contains('hidden');
    },
    isGarageOpen() {
      return !garagePanel.classList.contains('hidden');
    },
  };
}
