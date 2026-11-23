// Round 20: no tuning value changed — cash 12480, drive 129.8u, walk 4.5u, 12 missions, KPD 5 units, Garuda EMAS, Gamelan FM all stay exactly as round 15; this line is written in the round 20 recorded session.
// Round 20: four mission names renamed (the old ones matched the
// competitor's mission list, so they go — missions 1, 10, 11 and 12
// got new Indonesian names). Same pay / type / target / brief in every
// case — only the displayed name changes.
// Round 20: the road is DARK asphalt now (was sun-bleached #86837f) —
// the reference chase/combat shots run on dark asphalt with a double
// yellow centre line + dashed white lane lines, and our pale road read
// washed-out next to the gold car. The line colours are unchanged.
// Kencana Bay — every tuning number, name and colour in one place.
// The city is a fixed 1280x720 logical HUD over a 3D world: x east, z south,
// the city spans -330..330 on both axes, the sea lies west of x = -330.
export const STEP = 1 / 60;
export const SAVE_KEY = 'kencana.save.v8';
// Round 15 (golden hour, from the top-10 study): the version stamp is
// gone — no top-10 entry shows a version watermark in its shots, and the
// district title card (hud.showDistrictCard) takes the top-centre slot
// Round 17: no tuning value changed — cash 12480, drive 129.8u, walk 4.5u, 12 missions, KPD 5 units, Garuda EMAS, Gamelan FM all stay exactly as round 15.
// instead. The stamp text lived here only so hud.js could print it.
// Round 17: the sky keys below are the top-1 day/night table (see
// top1-spec-round17.md §1) — chase 16:00 is bright blue, combat 18:15
// golden hour; the road/sidewalk/sand/sea colours are sun-bleached too.
export const SKY_KEYS = [
  // hour, top, horizon, sun, sun intensity, ambient
  { hour: 15.0, top: '#3a8ae0', horizon: '#cfeaff', sun: '#fff0d4', sunI: 3.0, amb: 1.0 },
  { hour: 16.0, top: '#3f8bdd', horizon: '#d8e2f2', sun: '#ffc88c', sunI: 3.2, amb: 0.95 },
  { hour: 16.8, top: '#4b8bd6', horizon: '#ffd9ac', sun: '#ffc88c', sunI: 3.6, amb: 0.8 },
  { hour: 17.8, top: '#5583c8', horizon: '#ffc08a', sun: '#ffb070', sunI: 3.2, amb: 0.75 },
  { hour: 18.7, top: '#3c4d98', horizon: '#ff9f80', sun: '#ff9466', sunI: 1.7, amb: 0.68 },
];
export const CHASE_HOUR = 16.0; // round 17: bright-blue 16:00 chase (was 17:45 golden hour)
export const COMBAT_HOUR = 23.67; // round 20: NIGHT combat 23:40 (was golden hour 18:15) — the reference combat shot is a night scene with a big moon + a huge heli spotlight cone; render.setNight(true) / world.setNight(true) stage it (shots.js), this hour only sets the HUD clock
export const WORLD = {
  half: 330,
  seaX: -330,
  roadGap: 120,
  roadWidth: 14,
  roads: [-300, -180, -60, 60, 180, 300],
};

export const DISTRICTS = [
  // Bright, vivid district colours (round 7, like the reference map):
  // saturated teal / orange / gold / coral, so the map mosaic reads
  // bright instead of muted. Round 14: the two cells that read pink /
  // purple (Alun-Alun violet, Pantai Kidul pink) are warm grey-brown /
  // warm tan instead — the map stays bright and colourful from the
  // other four cells, and the white district names still read on the
  // warm fills.
  // Round 15: more lit windows (was 4/4/7/7/5/5) — the top-10 study's
  // 30–75% warm-lit rule. The facade's emissive map makes the lit ones
  // actually glow at golden hour instead of just being yellow paint.
  { id: 'segara', name: 'Pelabuhan Segara', short: 'SEGARA', x0: -330, z0: -330, x1: -110, z1: -110, color: '#2f9ec4', accent: '#6fd3ef', kind: 'port', facade: { cols: 3, litChance: 4, ground: 'roller' } },
  { id: 'batik', name: 'Kampung Batik', short: 'BATIK', x0: -110, z0: -330, x1: 110, z1: -110, color: '#f59a2e', accent: '#ffc65c', kind: 'kampung', facade: { cols: 3, litChance: 4, ground: 'door' } },
  { id: 'alun', name: 'Alun-Alun', short: 'ALUN-ALUN', x0: -110, z0: -110, x1: 110, z1: 110, color: '#9a8a72', accent: '#c2b49a', kind: 'downtown', facade: { cols: 5, litChance: 4, ground: 'shop' } },
  { id: 'emas', name: 'Lorong Emas', short: 'LORONG EMAS', x0: 110, z0: -110, x1: 330, z1: 110, color: '#e8b400', accent: '#ffe14d', kind: 'casino', facade: { cols: 4, litChance: 4, ground: 'shop' } },
  { id: 'pantai', name: 'Pantai Kidul', short: 'PANTAI KIDUL', x0: -330, z0: 110, x1: 110, z1: 330, color: '#b08a6a', accent: '#d3b294', kind: 'beach', facade: { cols: 4, litChance: 4, ground: 'shop' } },
  { id: 'pasar', name: 'Pasar Senja', short: 'PASAR SENJA', x0: 110, z0: 110, x1: 330, z1: 330, color: '#ff6a3d', accent: '#ffa07a', kind: 'market', facade: { cols: 4, litChance: 4, ground: 'shop' } },
];

export const MISSIONS = [
  { name: 'Pulang Kampung', pay: 300, type: 'goto', target: [-60, -60], brief: 'Temui Ratna di Alun-Alun. Kencana menunggumu.' },
  { name: 'Hot Wheels', pay: 450, type: 'steal', target: [60, -180], brief: 'Curi Garuda GT di showroom Alun-Alun.' },
  { name: 'Antar Paket', pay: 400, type: 'goto', target: [180, 180], brief: 'Antar paket ke Pasar Senja. Jangan ditanya isinya.' },
  { name: 'Tagihan Pasar', pay: 550, type: 'shootout', target: [180, 240], brief: 'Tagih utang preman pasar. Mereka tidak suka ditagih.' },
  { name: 'Mata-Mata', pay: 500, type: 'goto', target: [-180, -180], brief: 'Awasi gudang Segara. Foto, jangan ketahuan.' },
  { name: 'Balapan Senja', pay: 700, type: 'race', target: [-240, 240], brief: 'Balapan jalanan di Pantai Kidul. 5 checkpoint, jangan kalah.' },
  { name: 'Gudang Segara', pay: 650, type: 'shootout', target: [-240, -240], brief: 'Bersihkan gudang dari geng Segara.' },
  { name: 'Kabur dari KPD', pay: 600, type: 'escape', target: [60, 60], brief: 'KPD mengepung. Kabur dan hilangkan bintang.' },
  { name: 'Heat Wave', pay: 750, type: 'shootout', target: [240, -60], brief: 'Serbu markas geng di Lorong Emas.' },
  { name: 'Mobil Curian', pay: 700, type: 'goto', target: [0, 300], brief: 'Cari mobil curian di Pantai Kidul.' },
  { name: 'Pengkhianatan', pay: 900, type: 'shootout', target: [-60, 180], brief: 'Ratna dikhianati. Balas di Kampung Batik.' },
  { name: 'Pelarian Terakhir', pay: 1200, type: 'escape', target: [240, 240], brief: 'Satu pelarian terakhir dari Teluk Kencana.' },
];

export const CREW = [
  { key: 'Z', id: 'agus', name: 'Agus Prasetyo', role: 'Driver · Getaway', hire: 200, color: '#e8a33d', hair: 'buzz', shirt: '#3d6fb5' },
  { key: 'X', id: 'bambang', name: 'Bambang', role: 'Mechanic · Bengkel', hire: 350, color: '#c94b4b', hair: 'bandana', shirt: '#4b7d4b' },
  { key: 'C', id: 'ratna', name: 'Ratna', role: 'Fixer · Contacts', hire: 300, color: '#e87fb5', hair: 'ponytail', shirt: '#8a4bd0' },
  { key: 'V', id: 'slamet', name: 'Slamet', role: 'Driver · Balapan', hire: 400, color: '#e87fb5', hair: 'black', shirt: '#e87fb5' },
];

export const WEAPONS = [
  { name: 'FISTS', ammo: Infinity, max: Infinity, unlock: 0, price: 0 },
  { name: 'PISTOL', ammo: 12, max: 60, unlock: 0, price: 0 },
  { name: 'KANCIL SMG', ammo: 32, max: 160, unlock: 0, price: 0 },
  { name: 'SHOTGUN', ammo: 6, max: 24, unlock: 3, price: 1200 },
  { name: 'GARUDA', ammo: 30, max: 120, unlock: 5, price: 3800 },
  { name: 'LAUNCHER', ammo: 1, max: 4, unlock: 9, price: 9000 },
];

export const PAINTS = [
  { name: 'Emas Kencana', color: '#ffb400' },
  { name: 'Pink Senja', color: '#ff2e63' },
  { name: 'Merah Merdeka', color: '#d21f2b' },
  { name: 'Hitam Malam', color: '#1c1c22' },
  { name: 'Biru Teluk', color: '#2b6fd0' },
];

export const GARAGE_MENU = [
  { name: 'Repair', price: 150, desc: 'Perbaiki body sampai 100%' },
  { name: 'Respray', price: 450, desc: 'Ganti cat, hilangkan panas' },
  { name: 'Engine tune', price: 4000, desc: '+top speed, +akselerasi' },
  { name: 'Armour plating', price: 3000, desc: '+armour, tahan tabrakan' },
];

export const KPD_UNITS = [
  { name: 'ELANG-11', kind: 'car' },
  { name: 'KUNTUL-7', kind: 'car' },
  { name: 'RAJAWALI-3', kind: 'car' },
  { name: 'GARUDA-1', kind: 'heli' },
  { name: 'MERAK-5', kind: 'car' },
];

export const RADIO = {
  station: 'GAMELAN FM 101.1',
  tracks: ['Bonang Malam', 'Saron Senja', 'Kendang Kota', 'Gong Teluk', 'Gender Wayang'],
};

export const PLAYER = {
  name: 'Raka',
  role: 'Wheelman',
  walkSpeed: 9,
  carAccel: 26,
  carBrake: 40,
  carMax: 46, // ~166 km/h
  carTurn: 1.9,
  hp: 100,
};

export const PALETTE = {
  // Round 15 — golden hour (top-10 study, recipes of the top 3): the
  // 17:30–18:45 sky is a gradient from blue-violet at the top to a warm
  // orange horizon, NOT the night-blue of rounds 11–14. The shader in
  // render.js mixes mid→top above h 0.005, so `mid` IS the horizon band
  // the chase/combat cameras see; `low` is the sliver below it. The fog
  // (render.js) is the horizon colour too, so the distance melts into
  // the sky instead of going grey-brown.
  sunsetSkyTop: '#3a4aa8', // round 15: blue-violet dusk top (was night indigo #181842)
  sunsetSkyMid: '#ff8a5c', // round 15: warm orange horizon (was deep mauve #3a2f47)
  sunsetSkyLow: '#ff6a3d', // round 15: deep orange sliver under the horizon (was violet #4a3550)
  nightSkyTop: '#050510',
  nightSkyMid: '#101a3a',
  nightSkyLow: '#1c2a55',
  // Round 17 (top-1 bright day): sun-bleached asphalt, pale warm
  // sidewalks, pale sand and bright blue sea — the old dark asphalt
  // (#3c3c43) and grey-brown sidewalk read night-dark under any sky.
  sea: '#3588c2',
  sand: '#ead6a6',
  road: '#3d3d42', // round 20: DARK asphalt (was sun-bleached #86837f) — the reference streets are dark asphalt with a double yellow centre line; the pale road washed the whole chase frame out
  roadLine: '#f2c230', // double yellow centre line (top-1 recipe)
  sidewalk: '#d9d0c4', // pale warm pavement (top-1 recipe)
  grass: '#6aa84f', // round 17: brighter lawn green (top-1 recipe)
  text: '#f2ead8',
  muted: '#b8b0a0',
  gold: '#ffb400',
  pink: '#ff2e63',
  kpd: '#2b6fd0',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
export const FONT_DISPLAY = '"Arial Black", "Segoe UI", system-ui, sans-serif';
