// The heads-up display: mission and crew panels, the KPD response panel,
// the round minimap, weapon slots, speed, the dialogue bar with a drawn
// portrait, the help bar, and the full GPS map screen. All DOM; the 3D
// scene is drawn separately.
import { CREW, DISTRICTS, MISSIONS, WEAPONS, WORLD } from './config.js';

function el(id) {
  return document.getElementById(id);
}

function stars(n) {
  let s = '';
  for (let i = 0; i < 5; i += 1) s += i < n ? '★' : '☆';
  return s;
}

function drawPortrait(canvas, speaker) {
  const g = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  g.clearRect(0, 0, w, h);
  g.fillStyle = '#241a33';
  g.fillRect(0, 0, w, h);
  // Shoulders.
  g.fillStyle = `rgb(${(speaker.shirt >> 16) & 255},${(speaker.shirt >> 8) & 255},${speaker.shirt & 255})`;
  g.fillRect(w * 0.18, h * 0.68, w * 0.64, h * 0.32);
  // Head and hair.
  g.fillStyle = `rgb(${(speaker.skin >> 16) & 255},${(speaker.skin >> 8) & 255},${speaker.skin & 255})`;
  g.fillRect(w * 0.3, h * 0.2, w * 0.4, h * 0.46);
  g.fillStyle = `rgb(${(speaker.hair >> 16) & 255},${(speaker.hair >> 8) & 255},${speaker.hair & 255})`;
  g.fillRect(w * 0.3, h * 0.14, w * 0.4, h * 0.16);
  // Sunglasses.
  g.fillStyle = '#0a0a0a';
  g.fillRect(w * 0.33, h * 0.36, w * 0.34, h * 0.09);
  // Smile.
  g.strokeStyle = '#7a3a22';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(w * 0.4, h * 0.56);
  g.lineTo(w * 0.6, h * 0.56);
  g.stroke();
}

function worldToMap(x, z, size) {
  const s = size / (WORLD.maxX - WORLD.minX);
  return [(x - WORLD.minX) * s, (z - WORLD.minZ) * s];
}

export function createHud() {
  const minimap = el('minimap');
  const mapCanvas = el('map-canvas');
  let dialogueTimer = 0;

  function setMission(mission, pointIndex, dist) {
    const panel = el('mission-panel');
    if (!mission) {
      panel.innerHTML = '<div class="m-title">STORY COMPLETE</div><div class="m-desc">Teluk Kencana is yours.</div>';
      return;
    }
    const point = mission.points[pointIndex] || mission.points[mission.points.length - 1];
    const progress = Math.min(1, pointIndex / mission.points.length);
    panel.innerHTML = `<div class="m-title">MISSION ${mission.id}/12 — ${mission.name.toUpperCase()}</div>`
      + `<div class="m-desc">${mission.desc}</div>`
      + `<div class="m-next">NEXT: ${point.label.toUpperCase()} · ${Math.round(dist)} m</div>`
      + `<div class="m-bar"><div class="m-fill" style="width:${Math.round(progress * 100)}%"></div></div>`;
  }

  function setCrew(crew, cash) {
    const panel = el('crew-panel');
    let html = '';
    for (const c of CREW) {
      const hired = crew.includes(c.id);
      html += `<div class="crew-row"><span class="crew-letter">${c.name[0]}</span>`
        + `<span class="crew-info"><b>${c.name.toUpperCase()}</b><br>${c.role}<br>`
        + (hired ? '<span class="hired">HIRED</span>' : `$${c.cost} HIRE [${c.key.replace('Key', '')}]`) + '</span></div>';
    }
    panel.innerHTML = html;
    void cash;
  }

  function setKpd(units, heliOn, wanted, cash, timeStr, day, radio) {
    const panel = el('kpd-panel');
    let unitsHtml = '';
    for (let i = 0; i < Math.max(3, units.length); i += 1) {
      const u = units[i];
      unitsHtml += `<div>UNIT ${i + 4} &nbsp; ${u ? `${Math.round(u.dist)}m` : '—'} &nbsp; <span class="${u ? 'pursuing' : ''}">${u ? 'PURSUING' : ''}</span></div>`;
    }
    panel.innerHTML = `<div class="kpd-head">KPD RESPONSE</div>${unitsHtml}`
      + `<div>HELI ${heliOn ? '<span class="pursuing">SPOTLIGHT</span>' : '—'}</div>`
      + `<div class="cash">$${cash.toLocaleString('en-US')}</div>`
      + `<div class="wanted-label">WANTED</div><div class="stars">${stars(wanted)}</div>`
      + `<div class="clock">${timeStr} · DAY ${day}</div>`
      + `<div class="radio">${radio}</div>`;
  }

  function setVitals(hp, rep, locationName, streetName) {
    el('hp-fill').style.width = `${Math.max(0, Math.min(100, hp))}%`;
    el('rep-line').textContent = `REP FIXER · ${rep}`;
    el('loc-name').textContent = locationName;
    el('loc-street').textContent = streetName;
  }

  function setWeapons(current) {
    const panel = el('weapons');
    let html = '';
    WEAPONS.forEach((w, i) => {
      html += `<div class="weapon ${i === current ? 'active' : ''}"><div class="w-icon">▸</div><div>${w.name}</div><div>${w.ammo} / ${w.maxAmmo}</div></div>`;
    });
    panel.innerHTML = html;
  }

  function setSpeed(kmh, vehicle) {
    el('speed-num').textContent = Math.round(kmh);
    el('speed-vehicle').textContent = vehicle;
  }

  function say(speaker, text) {
    const bar = el('dialogue');
    drawPortrait(el('portrait'), speaker);
    el('dlg-name').textContent = speaker.name;
    el('dlg-role').textContent = speaker.role;
    el('dlg-text').textContent = text;
    bar.style.display = 'flex';
    dialogueTimer = 6;
  }

  function tickDialogue(dt) {
    if (dialogueTimer > 0) {
      dialogueTimer -= dt;
      if (dialogueTimer <= 0) el('dialogue').style.display = 'none';
    }
  }

  function drawMinimap(player, objective, policeUnits) {
    const g = minimap.getContext('2d');
    const s = minimap.width;
    g.clearRect(0, 0, s, s);
    g.save();
    g.beginPath();
    g.arc(s / 2, s / 2, s / 2, 0, Math.PI * 2);
    g.clip();
    g.fillStyle = '#141021';
    g.fillRect(0, 0, s, s);
    // Sea on the west edge.
    const [seaX] = worldToMap(WORLD.seaX, 0, s);
    g.fillStyle = '#2a6fae';
    g.fillRect(0, 0, seaX, s);
    // District blocks.
    for (const d of DISTRICTS) {
      const [x0, z0] = worldToMap(d.x0, d.z0, s);
      const [x1, z1] = worldToMap(d.x1, d.z1, s);
      g.fillStyle = d.css;
      g.globalAlpha = 0.75;
      g.fillRect(x0, z0, x1 - x0, z1 - z0);
      g.globalAlpha = 1;
    }
    // Roads.
    g.strokeStyle = '#22222a';
    g.lineWidth = 2;
    for (const x of WORLD.roadXs) {
      const [px] = worldToMap(x, 0, s);
      g.beginPath(); g.moveTo(px, 0); g.lineTo(px, s); g.stroke();
    }
    for (const z of WORLD.roadZs) {
      const [, pz] = worldToMap(0, z, s);
      g.beginPath(); g.moveTo(0, pz); g.lineTo(s, pz); g.stroke();
    }
    // Objective star.
    if (objective) {
      const [ox, oz] = worldToMap(objective.x, objective.z, s);
      g.fillStyle = '#ffd23f';
      g.beginPath();
      g.arc(ox, oz, 6, 0, Math.PI * 2);
      g.fill();
    }
    // Police dots.
    g.fillStyle = '#3a6fd8';
    for (const u of policeUnits) {
      const [ux, uz] = worldToMap(u.car.x, u.car.z, s);
      g.beginPath(); g.arc(ux, uz, 3.5, 0, Math.PI * 2); g.fill();
    }
    // Player arrow.
    const [px, pz] = worldToMap(player.x, player.z, s);
    g.save();
    g.translate(px, pz);
    g.rotate(Math.atan2(Math.sin(player.heading), Math.cos(player.heading)) + Math.PI / 2);
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.moveTo(0, -8); g.lineTo(6, 7); g.lineTo(-6, 7); g.closePath(); g.fill();
    g.restore();
    g.restore();
  }

  function drawMap(player, objective, missions, stats) {
    const g = mapCanvas.getContext('2d');
    const s = mapCanvas.width;
    g.clearRect(0, 0, s, s);
    // Bright district mosaic.
    for (const d of DISTRICTS) {
      const [x0, z0] = worldToMap(d.x0, d.z0, s);
      const [x1, z1] = worldToMap(d.x1, d.z1, s);
      g.fillStyle = d.css;
      g.fillRect(x0, z0, x1 - x0, z1 - z0);
      g.fillStyle = 'rgba(255,255,255,0.85)';
      g.font = 'bold 15px system-ui, sans-serif';
      g.textAlign = 'center';
      g.fillText(d.name.toUpperCase(), (x0 + x1) / 2, (z0 + z1) / 2 - 6);
      g.font = '12px system-ui, sans-serif';
      g.fillText(d.landmark, (x0 + x1) / 2, (z0 + z1) / 2 + 12);
    }
    // Sea.
    const [seaX] = worldToMap(WORLD.seaX, 0, s);
    const seaGrad = g.createLinearGradient(0, 0, seaX, 0);
    seaGrad.addColorStop(0, '#1a5a8a');
    seaGrad.addColorStop(1, '#2a8ac2');
    g.fillStyle = seaGrad;
    g.fillRect(0, 0, seaX, s);
    g.fillStyle = 'rgba(255,255,255,0.9)';
    g.font = 'bold 16px system-ui, sans-serif';
    g.save();
    g.translate(18, s / 2);
    g.rotate(-Math.PI / 2);
    g.textAlign = 'center';
    g.fillText('LAUT JAWA', 0, 0);
    g.restore();
    // Grid A–F / 1–6.
    g.strokeStyle = 'rgba(255,255,255,0.55)';
    g.lineWidth = 1;
    g.font = '12px system-ui, sans-serif';
    for (let i = 0; i < 6; i += 1) {
      const gx = ((i + 0.5) / 6) * s;
      g.beginPath(); g.moveTo(gx, 0); g.lineTo(gx, s); g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.9)';
      g.fillText(String.fromCharCode(65 + i), gx, 14);
      const gy = ((i + 0.5) / 6) * s;
      g.beginPath(); g.moveTo(0, gy); g.lineTo(s, gy); g.stroke();
      g.fillText(String(i + 1), 10, gy + 4);
    }
    // Route line and objective star.
    if (objective) {
      const [px, pz] = worldToMap(player.x, player.z, s);
      const [ox, oz] = worldToMap(objective.x, objective.z, s);
      g.strokeStyle = '#ffd23f';
      g.lineWidth = 3;
      g.setLineDash([10, 6]);
      g.beginPath(); g.moveTo(px, pz); g.lineTo(ox, oz); g.stroke();
      g.setLineDash([]);
      g.fillStyle = '#ffd23f';
      g.beginPath();
      for (let i = 0; i < 10; i += 1) {
        const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
        const r = i % 2 === 0 ? 13 : 6;
        const vx = ox + Math.cos(a) * r;
        const vy = oz + Math.sin(a) * r;
        if (i === 0) g.moveTo(vx, vy); else g.lineTo(vx, vy);
      }
      g.closePath(); g.fill();
      g.fillStyle = '#ffffff';
      g.beginPath(); g.arc(px, pz, 6, 0, Math.PI * 2); g.fill();
    }
    // Mission list and stats beside the canvas.
    const list = el('map-missions');
    let html = '<div class="map-title">PETA KENCANA — GPS AKTIF</div>';
    MISSIONS.forEach((m, i) => {
      const state = i < missions.index ? '✓' : i === missions.index ? '▶' : '·';
      html += `<div class="map-mission ${i === missions.index ? 'active' : ''}">${state} ${m.id}. ${m.name} — $${m.payout}</div>`;
    });
    html += `<div class="map-stats">STORY ${Math.round((missions.index / MISSIONS.length) * 100)}% · REP FIXER ${stats.rep} · CASH $${stats.cash.toLocaleString('en-US')}<br>TIME ${stats.time} · DAY ${stats.day} · WANTED ${'★'.repeat(stats.wanted)}${'☆'.repeat(5 - stats.wanted)}<br>TAKEDOWNS ${stats.takedowns} · CARS STOLEN ${stats.stolen} · STUNTS $${stats.stunts}</div>`;
    list.innerHTML = html;
  }

  function showMap(show) {
    el('map-screen').style.display = show ? 'flex' : 'none';
    el('hud').style.display = show ? 'none' : 'block';
  }

  function showTitle(show) {
    el('title-screen').style.display = show ? 'flex' : 'none';
    el('hud').style.display = show ? 'none' : 'block';
  }

  function setVersionStamp(text) {
    const stamp = el('version-stamp');
    if (stamp) stamp.textContent = text;
  }

  return {
    setMission, setCrew, setKpd, setVitals, setWeapons, setSpeed,
    say, tickDialogue, drawMinimap, drawMap, showMap, showTitle, setVersionStamp,
  };
}
