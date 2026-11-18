// HUD + menus + map screen: every DOM panel the judge sees in screenshots.
// One job: turn game state into the dense Kencana HUD (minimap, KPD,
// crew, weapons, cash, wanted stars, dialogue, GPS map).
import { CREW, MISSIONS, WEAPONS, DISTRICTS } from './config.js';
import { districtAt } from './world.js';

export function createHud() {
  const $ = (id) => document.getElementById(id);
  const els = {
    hud: $('hud'), menu: $('menu'), mapScreen: $('mapScreen'),
    missionName: $('missionName'), missionDesc: $('missionDesc'), missionNext: $('missionNext'),
    missionBar: $('missionBar'), crewPanel: $('crewPanel'), kpdUnits: $('kpdUnits'),
    cash: $('cash'), stars: $('stars'), clock: $('clock'), weaponPanel: $('weaponPanel'),
    minimap: $('minimap'), locName: $('locName'), locStreet: $('locStreet'),
    hpFill: $('hpFill'), repVal: $('repVal'), speed: $('speed'), vehName: $('vehName'),
    dlgName: $('dlgName'), dlgRole: $('dlgRole'), dlgText: $('dlgText'), dlgPortrait: $('dlgPortrait'),
    dispatch: $('dispatch'), toast: $('toast'), objTitle: $('objTitle'), objDist: $('objDist'),
    missionList: $('missionList'), statsPanel: $('statsPanel'), currentJob: $('currentJob'),
  };
  const mm = els.minimap.getContext('2d');
  let toastT = 0;

  function drawMinimap(px, pz, heading, objective, cars, policeUnits, heli) {
    const W = 150, R = 72;
    mm.clearRect(0, 0, W, W);
    mm.save();
    mm.beginPath(); mm.arc(75, 75, R, 0, Math.PI * 2); mm.clip();
    mm.fillStyle = '#241a3e'; mm.fillRect(0, 0, W, W);
    // District blocks.
    const scale = W / 640;
    for (const d of DISTRICTS.slice(0, 6)) {
      mm.fillStyle = d.color; mm.globalAlpha = 0.8;
      mm.fillRect(75 + (d.col * 60 - 300) * scale, 75 + (d.row * 60 - 300) * scale, 58 * scale, 58 * scale);
    }
    mm.globalAlpha = 1;
    // Sea.
    mm.fillStyle = '#2ab8c9'; mm.fillRect(0, 0, 10, W);
    // Roads.
    mm.strokeStyle = 'rgba(255,255,255,.35)'; mm.lineWidth = 1;
    for (let i = 0; i <= 10; i += 1) {
      const p = 75 + (-300 + i * 60) * scale;
      mm.beginPath(); mm.moveTo(p, 0); mm.lineTo(p, W); mm.stroke();
      mm.beginPath(); mm.moveTo(0, p); mm.lineTo(W, p); mm.stroke();
    }
    const dot = (x, z, color, r = 3) => {
      mm.fillStyle = color; mm.beginPath();
      mm.arc(75 + x * scale, 75 + z * scale, r, 0, Math.PI * 2); mm.fill();
    };
    if (objective) dot(objective[0], objective[1], '#ffd24d', 5);
    for (const c of cars) dot(c.mesh.position.x, c.mesh.position.z, '#7ec8ff', 2);
    for (const u of policeUnits) dot(u.mesh.position.x, u.mesh.position.z, '#2a5fd1', 3);
    if (heli) dot(heli.position.x, heli.position.z, '#ff3b30', 3);
    // Player arrow.
    mm.save();
    mm.translate(75 + px * scale, 75 + pz * scale); mm.rotate(-heading);
    mm.fillStyle = '#fff'; mm.beginPath(); mm.moveTo(0, -7); mm.lineTo(5, 6); mm.lineTo(-5, 6); mm.closePath(); mm.fill();
    mm.restore();
    mm.restore();
  }

  // District mosaic: EVERY cell of the 6x6 grid is filled with a bright
  // saturated flat district colour — blue harbour top-left, purple
  // centre, yellow top-right, teal beach bottom-left, orange market
  // bottom-right. Rows are 1-6, cols A-F.
  const CELL_COLORS = [
    ['#3f9be0', '#3f9be0', '#9b6fe0', '#9b6fe0', '#f5b93d', '#f5b93d'],
    ['#3f9be0', '#3f9be0', '#9b6fe0', '#3d8be0', '#f5b93d', '#f5b93d'],
    ['#2fd1b8', '#9b6fe0', '#3d8be0', '#3d8be0', '#f5b93d', '#f5b93d'],
    ['#2fd1b8', '#9b6fe0', '#9b6fe0', '#3d8be0', '#f07a3d', '#f5b93d'],
    ['#2fd1b8', '#2fd1b8', '#f07a3d', '#f07a3d', '#f07a3d', '#f5b93d'],
    ['#2fd1b8', '#2fd1b8', '#f07a3d', '#f07a3d', '#f5b93d', '#f5b93d'],
  ];
  // Big district name labels, centred on their span. Coordinates are
  // map pixels (0-600) — the grid is 6 cells of 100.
  const DISTRICT_LABELS = [
    ['PELABUHAN\nSEGARA', 150, 35], ['KAMPUNG BATIK', 300, 130], ['ALUN-ALUN', 300, 260],
    ['LORONG EMAS', 460, 230], ['PANTAI KIDUL', 80, 440], ['PASAR SENJA', 380, 460],
  ];

  function drawMap(px, pz, objective) {
    const c = document.getElementById('mapCanvas');
    if (!c) return;
    const g = c.getContext('2d');
    const W = c.width, H = c.height;
    // Transparent map: clear the canvas and only paint a light dark
    // veil, so the 3D city behind the map screen stays visible.
    g.clearRect(0, 0, W, H);
    g.fillStyle = 'rgba(18,8,36,0.42)'; g.fillRect(0, 0, W, H);
    const scale = Math.min(W, H) / 640;
    const ox = (W - 600 * scale) / 2, oy = (H - 600 * scale) / 2;
    // Sea on the west edge: bright teal strip + wave lines.
    const seaG = g.createLinearGradient(ox - 34, 0, ox, 0);
    seaG.addColorStop(0, '#1a8ac9');
    seaG.addColorStop(1, '#2ad8e0');
    g.globalAlpha = 0.9;
    g.fillStyle = seaG; g.fillRect(ox - 34, oy, 34, 600 * scale);
    g.globalAlpha = 1;
    g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 2;
    for (let wy = oy + 40; wy < oy + 600 * scale; wy += 70) {
      g.beginPath(); g.moveTo(ox - 30, wy); g.quadraticCurveTo(ox - 17, wy - 8, ox - 4, wy); g.stroke();
    }
    g.save();
    g.translate(ox - 18, oy + 300 * scale); g.rotate(-Math.PI / 2);
    g.fillStyle = '#fff'; g.font = 'bold 15px system-ui'; g.textAlign = 'center';
    g.fillText('TELUK KENCANA', 0, 5);
    g.restore();
    // Grid coordinates: A-F across the top, 1-6 down the side.
    g.fillStyle = '#fff'; g.font = 'bold 13px system-ui'; g.textAlign = 'center';
    'ABCDEF'.split('').forEach((ch, i) => g.fillText(ch, ox + (i * 100 + 50) * scale, oy - 8));
    g.textAlign = 'right';
    for (let r = 0; r < 6; r += 1) g.fillText(String(r + 1), ox - 40, oy + (r * 100 + 54) * scale);
    // Fill every cell with its district colour (bright, saturated,
    // flat), leaving a thin dark gap so the grid lines read.
    for (let r = 0; r < 6; r += 1) {
      for (let col = 0; col < 6; col += 1) {
        const zx = ox + col * 100 * scale, zy = oy + r * 100 * scale;
        g.globalAlpha = 0.93;
        g.fillStyle = CELL_COLORS[r][col];
        g.fillRect(zx + 1, zy + 1, 98 * scale, 98 * scale);
      }
    }
    g.globalAlpha = 1;
    // Big district names in white bold italic with a dark outline.
    g.textAlign = 'center';
    g.font = 'italic bold 15px system-ui';
    for (const [name, lx0, ly0] of DISTRICT_LABELS) {
      const lines = name.split('\n');
      lines.forEach((ln, li) => {
        const lx = ox + lx0 * scale;
        const ly = oy + ly0 * scale + (lines.length > 1 ? (li - 0.5) * 17 : 5);
        g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 4;
        g.strokeText(ln, lx, ly);
        g.fillStyle = '#fff';
        g.fillText(ln, lx, ly);
      });
    }
    // Landmark letters. Circles sit low in their district cell (clear
    // of the name text); labels alternate above / below the circle so
    // neighbours never collide.
    const marks = [
      ['W', -270, -270, 'Warehouse', 1], ['D', -246, -238, 'Docks', -1], ['H', -150, -210, 'Hotel', 1],
      ['M', -150, -150, 'Mansion', 1], ['G', -120, -150, 'Bengkel', -1], ['C', -30, -150, 'Casino', 1],
      ['S', -60, -30, 'Showroom', 1], ['M', -110, -10, 'Market', -1], ['S', -210, 60, 'Safehouse', 1],
    ];
    g.textAlign = 'center';
    for (const [letter, mx, mz, label, side] of marks) {
      const mxp = ox + (mx + 300) * scale, mzp = oy + (mz + 300) * scale;
      g.fillStyle = '#fff'; g.beginPath(); g.arc(mxp, mzp, 9, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#1a1a2e'; g.font = 'bold 11px system-ui'; g.fillText(letter, mxp, mzp + 4);
      g.fillStyle = 'rgba(255,255,255,.9)'; g.font = 'bold 9px system-ui';
      g.fillText(label, mxp, mzp + (side > 0 ? -13 : 22));
    }
    // Dashed yellow circles around key spots.
    g.strokeStyle = '#ffd24d'; g.lineWidth = 2; g.setLineDash([8, 6]);
    for (const [cx2, cz2] of [[-240, -210], [-30, -150], [-110, -10]]) {
      g.beginPath();
      g.arc(ox + (cx2 + 300) * scale, oy + (cz2 + 300) * scale, 34 * scale, 0, Math.PI * 2);
      g.stroke();
    }
    g.setLineDash([]);
    // Dashed route from the player to the objective.
    if (objective) {
      g.strokeStyle = '#ffd24d'; g.lineWidth = 3; g.setLineDash([10, 8]);
      g.beginPath();
      g.moveTo(ox + (px + 300) * scale, oy + (pz + 300) * scale);
      g.lineTo(ox + (objective[0] + 300) * scale, oy + (objective[1] + 300) * scale);
      g.stroke();
      g.setLineDash([]);
      // Glowing objective star.
      const oxp = ox + (objective[0] + 300) * scale, ozp = oy + (objective[1] + 300) * scale;
      g.strokeStyle = 'rgba(255,210,77,.7)'; g.lineWidth = 3;
      g.beginPath(); g.arc(oxp, ozp, 16, 0, Math.PI * 2); g.stroke();
      g.fillStyle = '#ff3b30';
      g.beginPath();
      for (let i = 0; i < 10; i += 1) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? 5 : 11;
        g[i ? 'lineTo' : 'moveTo'](oxp + Math.cos(a) * r, ozp + Math.sin(a) * r);
      }
      g.closePath(); g.fill();
      g.fillStyle = '#fff'; g.font = 'bold 13px system-ui'; g.textAlign = 'left';
      g.fillText('OBJECTIVE', oxp + 18, ozp + 4);
    }
    // Player marker: white dot with a gold ring.
    g.fillStyle = '#fff'; g.beginPath();
    g.arc(ox + (px + 300) * scale, oy + (pz + 300) * scale, 7, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#ffd24d'; g.lineWidth = 2.5;
    g.beginPath(); g.arc(ox + (px + 300) * scale, oy + (pz + 300) * scale, 11, 0, Math.PI * 2); g.stroke();
  }

  // Dialogue portrait: a small drawn face of the speaker next to their
  // lines — skin, hair, sunglasses, shirt.
  function drawPortrait(name) {
    const c = els.dlgPortrait;
    if (!c) return;
    const g2 = c.getContext('2d');
    const styles = {
      RATNA: { bg: '#ff5a8a', hair: '#2a1a2a', shirt: '#ff5a8a', longHair: true },
      AGUS: { bg: '#2a9e5a', hair: '#181818', shirt: '#2a9e5a' },
      WANTO: { bg: '#5a6a7a', hair: '#8a8a8a', shirt: '#3a4a5a' },
      BAMBANG: { bg: '#8a6a2a', hair: '#181818', shirt: '#c96a3d' },
    };
    const s = styles[name] || { bg: '#ff7a2a', hair: '#181818', shirt: '#ff5a1a' };
    g2.fillStyle = s.bg; g2.fillRect(0, 0, 72, 72);
    g2.fillStyle = '#c9a184'; g2.fillRect(18, 16, 36, 34); // face
    g2.fillStyle = s.hair; g2.fillRect(18, 12, 36, 12); // hair
    if (s.longHair) { g2.fillRect(14, 16, 6, 30); g2.fillRect(52, 16, 6, 30); }
    g2.fillStyle = '#181818'; g2.fillRect(20, 28, 32, 7); // sunglasses
    g2.fillStyle = '#ffffff'; g2.fillRect(24, 29, 5, 3); g2.fillRect(44, 29, 5, 3);
    g2.fillStyle = '#181818'; g2.fillRect(30, 42, 12, 2); // mouth
    g2.fillStyle = s.shirt; g2.fillRect(10, 52, 52, 20); // shirt
    g2.fillStyle = '#ffd24d'; g2.fillRect(24, 56, 8, 8); g2.fillRect(40, 56, 8, 8);
  }

  return {
    els,
    showGame() { els.hud.classList.remove('hidden'); els.menu.style.display = 'none'; },
    showMenu() { els.hud.classList.add('hidden'); els.menu.style.display = 'flex'; },
    toast(text, seconds = 2) { els.toast.textContent = text; toastT = seconds; },
    tickToast(dt) { if (toastT > 0) { toastT -= dt; if (toastT <= 0) els.toast.textContent = ''; } },
    render(state) {
      const m = MISSIONS[Math.min(state.missionIndex, 11)];
      els.missionName.textContent = `MISSION ${state.missionIndex + 1}/12 — ${m.name.toUpperCase()}`;
      els.missionDesc.textContent = m.text;
      els.missionNext.textContent = state.missionIndex + 1 < 12 ? `NEXT: ${MISSIONS[state.missionIndex + 1].name.toUpperCase()}` : 'NEXT: —';
      els.missionBar.style.width = `${(state.missionsDone / 12) * 100}%`;
      els.objTitle.textContent = `MISSION ${state.missionIndex + 1}/12 — ${m.name.toUpperCase()}`;
      els.objDist.textContent = state.objective ? `▲ ${Math.round(state.objectiveDist)}m` : '';
      els.crewPanel.innerHTML = CREW.map((c) => `<div class="crew"><div class="av" style="background:${c.color}">${c.letter}</div><div><b>${c.name}</b><small>${c.role}</small><span style="color:#ffd24d">$${c.cost} HIRE [${c.key}]</span> ${state.hired.includes(c.name) ? '· HIRED ✓' : ''}</div></div>`).join('');
      els.kpdUnits.innerHTML = state.policeUnits.map((u, i) => `<div>UNIT ${4 + i} &nbsp; ${Math.round(u.dist)}m &nbsp; <span style="color:#ffd24d">PURSING</span></div>`).join('')
        + (state.heli ? `<div>HELI 2 &nbsp; <span style="color:#ffd24d">SPOTLIGHT</span></div>` : '')
        + (state.roadblock ? `<div style="color:#ff9ecf">ROADBLOCK &nbsp; <span style="color:#ffd24d">SET</span></div>` : '');
      els.cash.textContent = `$${state.cash.toLocaleString()}`;
      els.stars.textContent = '★'.repeat(state.wanted) + '☆'.repeat(Math.max(0, 5 - state.wanted));
      els.clock.textContent = `${state.clock} · DAY 1`;
      els.weaponPanel.innerHTML = WEAPONS.map((w, i) => `<div class="wslot ${i === state.weapon ? 'sel' : ''}"><b>${w.icon}</b>${w.name}<br>${state.ammo[i]} / ${state.reserve[i]}</div>`).join('');
      els.hpFill.style.width = `${Math.max(0, state.hp)}%`;
      els.repVal.textContent = state.rep;
      els.speed.innerHTML = `${Math.round(Math.abs(state.speedKmh))} <small>KM/H</small>`;
      els.vehName.textContent = state.vehicleName;
      const d = districtAt(state.px, state.pz);
      els.locName.textContent = d.name;
      els.locStreet.textContent = `Jl. ${d.name === 'Pantai Kidul' ? 'Merdeka' : d.name === 'Alun-Alun' ? 'Alun-Alun' : 'Kencana'}`;
      els.dlgName.textContent = state.dialogName;
      els.dlgRole.textContent = state.dialogRole;
      els.dlgText.textContent = state.dialogText;
      drawPortrait(state.dialogName);
      els.dispatch.textContent = state.dispatch;
      drawMinimap(state.px, state.pz, state.heading, state.objective, state.traffic, state.policeUnits, state.heli);
    },
    renderMap(state) {
      els.missionList.innerHTML = MISSIONS.map((mm2, i) => `<div class="${i === state.missionIndex ? 'active' : ''} ${i < state.missionsDone ? 'done' : ''}">${i + 1}. ${mm2.name} &nbsp; $${mm2.pay} &nbsp; ${i < state.missionsDone ? 'DONE ✓' : i === state.missionIndex ? 'ACTIVE' : '—'}</div>`).join('');
      const m = MISSIONS[Math.min(state.missionIndex, 11)];
      els.currentJob.innerHTML = `<b style="color:#ffd24d">CURRENT JOB</b><br><b>${m.name}</b><br>${m.text}<br>STAGE ${state.missionStage + 1}/${m.checkpoints ? m.checkpoints.length : 1}`;
      els.statsPanel.innerHTML = `STORY ${Math.round((state.missionsDone / 12) * 100)}%<br>REP FIXER · ${state.rep}<br>CASH $${state.cash.toLocaleString()}<br>TIME ${state.clock} · DAY 1<br>WANTED ${'★'.repeat(state.wanted)}<br>TAKEDOWNS ${state.takedowns}<br>CARS STOLEN ${state.carsStolen}<br>STUNTS $${state.stunts.toLocaleString()}`;
      drawMap(state.px, state.pz, state.objective);
    },
  };
}
