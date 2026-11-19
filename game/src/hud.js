// The HUD: DOM panels over the 3D canvas, drawn like the top entries —
// a mission panel, a KPD response panel with five NAMED units + distances +
// statuses, wanted stars, cash + respect, a horizontal weapon bar with
// names, ammo and LOCKED slots, a minimap drawn from the real street layout,
// a dialogue bar with painted character portraits, radio, speed, stunt
// popups, the transparent map, the MISSION PASSED banner, the garage menu
// and the title poster.
import { WORLD, DISTRICTS, MISSIONS, WEAPONS, CREW, RADIO, GARAGE_MENU, PAINTS, VERSION_STAMP } from './config.js';
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
    mctx.strokeStyle = '#3a3a44';
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

  // --- The big transparent map.
  function drawMap(state) {
    if (!mapCtx) return;
    const S = 560;
    const scale = S / 700;
    const to = (v) => (v + 350) * scale;
    mapCtx.clearRect(0, 0, S, S);
    // Sea + beach.
    mapCtx.fillStyle = '#2b6f8e';
    mapCtx.fillRect(0, 0, to(-330), S);
    mapCtx.fillStyle = '#e8c98f';
    mapCtx.fillRect(to(-330), to(110), (330 - 110) * scale * 0 + 30, S - to(110));
    // District mosaic (names drawn after the roads, so no road line cuts
    // through the text; the font shrinks to fit the district).
    for (const d of DISTRICTS) {
      mapCtx.fillStyle = d.color;
      mapCtx.fillRect(to(d.x0), to(d.z0), (d.x1 - d.x0) * scale, (d.z1 - d.z0) * scale);
      mapCtx.strokeStyle = 'rgba(255,255,255,0.5)';
      mapCtx.lineWidth = 1.5;
      mapCtx.strokeRect(to(d.x0), to(d.z0), (d.x1 - d.x0) * scale, (d.z1 - d.z0) * scale);
    }
    // Roads.
    mapCtx.strokeStyle = '#222831';
    mapCtx.lineWidth = 6;
    for (const r of WORLD.roads) {
      mapCtx.beginPath(); mapCtx.moveTo(0, to(r)); mapCtx.lineTo(S, to(r)); mapCtx.stroke();
      mapCtx.beginPath(); mapCtx.moveTo(to(r), 0); mapCtx.lineTo(to(r), S); mapCtx.stroke();
    }
    mapCtx.strokeStyle = '#e8d44d';
    mapCtx.lineWidth = 1.5;
    for (const r of WORLD.roads) {
      mapCtx.beginPath(); mapCtx.moveTo(0, to(r)); mapCtx.lineTo(S, to(r)); mapCtx.stroke();
      mapCtx.beginPath(); mapCtx.moveTo(to(r), 0); mapCtx.lineTo(to(r), S); mapCtx.stroke();
    }
    // District names on top of the roads, fitted to the district width.
    mapCtx.textAlign = 'center';
    for (const d of DISTRICTS) {
      const cx = (to(d.x0) + to(d.x1)) / 2;
      const cy = (to(d.z0) + to(d.z1)) / 2;
      const w = (d.x1 - d.x0) * scale - 10;
      let size = 13;
      mapCtx.font = `bold ${size}px system-ui`;
      const tw = mapCtx.measureText(d.name.toUpperCase()).width;
      if (tw > w) size = Math.max(8, Math.floor(13 * w / tw));
      mapCtx.font = `bold ${size}px system-ui`;
      mapCtx.fillStyle = '#ffffff';
      mapCtx.fillText(d.name.toUpperCase(), cx, cy - 2);
      mapCtx.font = '10px system-ui';
      mapCtx.fillStyle = 'rgba(255,255,255,0.8)';
      mapCtx.fillText(d.short, cx, cy + 13);
    }
    // Grid A–F / 1–6.
    mapCtx.fillStyle = 'rgba(255,255,255,0.85)';
    mapCtx.font = 'bold 12px system-ui';
    mapCtx.textAlign = 'center';
    for (let i = 0; i < 6; i += 1) {
      mapCtx.fillText('ABCDEF'[i], to(-330 + i * 110 + 55), 14);
      mapCtx.fillText(String(i + 1), 10, to(-330 + i * 110 + 55));
    }
    // Landmarks.
    const marks = [
      { x: 40, z: -40, label: 'HOTEL KENCANA' },
      { x: 240, z: -40, label: 'CASINO EMAS' },
      { x: -260, z: -200, label: 'PELABUHAN' },
      { x: 240, z: 240, label: 'BENGKEL BAMBANG' },
      { x: -280, z: 240, label: 'BALAPAN' },
      { x: -30, z: 30, label: 'SAFEHOUSE' },
    ];
    // Landmarks: dot + a dark pill label below it, so the text never fights
    // the district names.
    mapCtx.font = 'bold 10px system-ui';
    mapCtx.textAlign = 'center';
    for (const m of marks) {
      mapCtx.fillStyle = '#ffd94d';
      mapCtx.beginPath(); mapCtx.arc(to(m.x), to(m.z), 5, 0, Math.PI * 2); mapCtx.fill();
      const lw = mapCtx.measureText(m.label).width + 10;
      mapCtx.fillStyle = 'rgba(16,12,28,0.8)';
      mapCtx.beginPath();
      mapCtx.roundRect(to(m.x) - lw / 2, to(m.z) + 8, lw, 15, 7);
      mapCtx.fill();
      mapCtx.fillStyle = '#ffffff';
      mapCtx.fillText(m.label, to(m.x), to(m.z) + 19);
    }
    // Route + objective + player.
    if (state.objective) {
      mapCtx.strokeStyle = '#ffd94d';
      mapCtx.lineWidth = 3;
      mapCtx.setLineDash([8, 6]);
      mapCtx.beginPath(); mapCtx.moveTo(to(state.player.x), to(state.player.z)); mapCtx.lineTo(to(state.objective.x), to(state.objective.z)); mapCtx.stroke();
      mapCtx.setLineDash([]);
      mapCtx.fillStyle = '#ffd94d';
      mapCtx.beginPath(); mapCtx.arc(to(state.objective.x), to(state.objective.z), 9, 0, Math.PI * 2); mapCtx.fill();
      mapCtx.fillStyle = '#1c1c1c';
      mapCtx.font = 'bold 13px system-ui';
      mapCtx.fillText('★', to(state.objective.x), to(state.objective.z) + 4);
    }
    mapCtx.save();
    mapCtx.translate(to(state.player.x), to(state.player.z));
    mapCtx.rotate(state.player.heading || 0);
    mapCtx.fillStyle = '#ffb400';
    mapCtx.beginPath(); mapCtx.moveTo(0, -11); mapCtx.lineTo(8, 8); mapCtx.lineTo(-8, 8); mapCtx.closePath(); mapCtx.fill();
    mapCtx.restore();
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

  function renderWeaponBar(state) {
    const bar = el('weapon-bar');
    if (!bar) return;
    bar.innerHTML = '';
    WEAPONS.forEach((w, i) => {
      const slot = document.createElement('div');
      const unlocked = state.mission.weaponUnlocked(i);
      slot.className = 'wslot' + (i === state.weapon ? ' active' : '') + (unlocked ? '' : ' locked');
      const ammo = w.ammo === Infinity ? '∞' : `${state.ammo[i] ?? w.ammo}/${w.max}`;
      slot.innerHTML = `<span class="wkey">${i}</span><span class="wname">${unlocked ? w.name : w.name + ' 🔒'}</span><span class="wammo">${unlocked ? ammo : '$' + w.price.toLocaleString('en-US')}</span>`;
      bar.appendChild(slot);
    });
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

  function update(state) {
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
      const code = state.police ? Math.min(5, Math.max(1, state.police.wanted)) : 0;
      kp.querySelector('.k-title').textContent = state.police && state.police.wanted > 0
        ? `KPD RESPONSE — ${rows.length} UNIT`
        : 'KPD RESPONSE — AMAN';
      const list = kp.querySelector('.k-units');
      list.innerHTML = rows.map((r) => `<div class="k-row"><span>${r.name}</span><span>${r.dist}m</span><b class="k-st-${r.status.toLowerCase()}">${r.status}</b></div>`).join('')
        || '<div class="k-row"><span>Tidak ada unit mengejar</span></div>';
      // Stars on their own line with the CODE tag beside them, so neither
      // the stars nor the code ever overlap the title above.
      kp.querySelector('.k-stars').innerHTML = stars(state.police ? state.police.wanted : 0)
        + (state.police && state.police.wanted > 0 ? ` <span class="k-code">· CODE ${code}</span>` : '');
      kp.querySelector('.k-sight').textContent = state.police && state.police.wanted > 0
        ? (state.police.inSight ? '● IN SIGHT — zona pencarian mengikutimu' : '○ EVADING — bersembunyi dari KPD')
        : '';
    }
    const cash = el('cash-line');
    if (cash) cash.textContent = `${fmtCash(state.mission.state.cash)} · REP ${state.mission.state.rep} · ${state.mission.state.repLevel}`;
    const loc = el('loc-label');
    if (loc && state.player) {
      const d = world.districtAt(state.player.x, state.player.z);
      loc.textContent = `${d.name.toUpperCase()} · ${state.day || 'DAY 1'} · ${state.clock || '18:36'}`;
    }
    const hp = el('hp-bar');
    if (hp) hp.style.width = `${Math.max(0, state.player.hp)}%`;
    const sp = el('speed');
    if (sp) {
      sp.querySelector('.sp-num').textContent = `${Math.round(Math.abs(state.player.speed || 0) * 3.6)}`;
      sp.querySelector('.sp-car').textContent = state.inCar ? `GARUDA GT · ${PAINTS[state.paint].name.toUpperCase()}` : 'JALAN KAKI';
      sp.querySelector('.sp-cond').textContent = state.inCar ? `KONDISI ${Math.round(state.carHp)}%` : 'ON FOOT';
    }
    const radio = el('radio-line');
    if (radio) radio.textContent = `${RADIO.station} — ${state.track || RADIO.tracks[0]}`;
    const stamp = el('stamp');
    if (stamp) stamp.textContent = VERSION_STAMP;
    renderWeaponBar(state);
    drawMinimap(state);
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
      const stats = el('map-stats');
      if (stats) {
        const s = state.mission.state;
        stats.innerHTML = `STORY ${state.mission.storyPct()}% · REP ${s.rep} · CASH ${fmtCash(s.cash)} · ${state.day || 'DAY 1'} · ${state.clock || '18:37'}<br>` +
          `TAKEDOWNS ${s.takedowns} · CARS STOLEN ${s.carsStolen} · STUNTS ${fmtCash(s.stunts)} · RACES WON ${s.racesWon}/${s.racesRun} · SAVE SLOT 1 — ${state.mission.storyPct()}% COMPLETE`;
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
    update, toast, setDialogue, hideDialogue, showMap, showPassed, showGarage, showTitle, showPause,
    drawMinimap, drawMap, portrait,
  };
}
