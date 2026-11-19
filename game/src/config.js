// Kencana Bay — every tuning number, name and colour in one place.
// The city is a fixed 1280x720 logical HUD over a 3D world: x east, z south,
// the city spans -330..330 on both axes, the sea lies west of x = -330.
export const STEP = 1 / 60;
export const SAVE_KEY = 'kencana.save.v8';
export const VERSION_STAMP = 'KENCANA BAY · v8 · 19 NOV 2026';

export const WORLD = {
  half: 330,
  seaX: -330,
  roadGap: 120,
  roadWidth: 14,
  roads: [-300, -180, -60, 60, 180, 300],
};

export const DISTRICTS = [
  { id: 'segara', name: 'Pelabuhan Segara', short: 'SEGARA', x0: -330, z0: -330, x1: -110, z1: -110, color: '#5b7d8c', accent: '#7fb3c8', kind: 'port' },
  { id: 'batik', name: 'Kampung Batik', short: 'BATIK', x0: -110, z0: -330, x1: 110, z1: -110, color: '#c98a4b', accent: '#e8b06a', kind: 'kampung' },
  { id: 'alun', name: 'Alun-Alun', short: 'ALUN-ALUN', x0: -110, z0: -110, x1: 110, z1: 110, color: '#8a7fd0', accent: '#b3a6ff', kind: 'downtown' },
  { id: 'emas', name: 'Lorong Emas', short: 'LORONG EMAS', x0: 110, z0: -110, x1: 330, z1: 110, color: '#c9a227', accent: '#ffd94d', kind: 'casino' },
  { id: 'pantai', name: 'Pantai Kidul', short: 'PANTAI KIDUL', x0: -330, z0: 110, x1: 110, z1: 330, color: '#e88ca0', accent: '#ffb3c2', kind: 'beach' },
  { id: 'pasar', name: 'Pasar Senja', short: 'PASAR SENJA', x0: 110, z0: 110, x1: 330, z1: 330, color: '#d06a4b', accent: '#ff9a70', kind: 'market' },
];

export const MISSIONS = [
  { name: 'Selamat Datang', pay: 300, type: 'goto', target: [-60, -60], brief: 'Temui Ratna di Alun-Alun. Kencana menunggumu.' },
  { name: 'Hot Wheels', pay: 450, type: 'steal', target: [60, -180], brief: 'Curi Garuda GT di showroom Alun-Alun.' },
  { name: 'Antar Paket', pay: 400, type: 'goto', target: [180, 180], brief: 'Antar paket ke Pasar Senja. Jangan ditanya isinya.' },
  { name: 'Tagihan Pasar', pay: 550, type: 'shootout', target: [180, 240], brief: 'Tagih utang preman pasar. Mereka tidak suka ditagih.' },
  { name: 'Mata-Mata', pay: 500, type: 'goto', target: [-180, -180], brief: 'Awasi gudang Segara. Foto, jangan ketahuan.' },
  { name: 'Balapan Senja', pay: 700, type: 'race', target: [-240, 240], brief: 'Balapan jalanan di Pantai Kidul. 5 checkpoint, jangan kalah.' },
  { name: 'Gudang Segara', pay: 650, type: 'shootout', target: [-240, -240], brief: 'Bersihkan gudang dari geng Segara.' },
  { name: 'Kabur dari KPD', pay: 600, type: 'escape', target: [60, 60], brief: 'KPD mengepung. Kabur dan hilangkan bintang.' },
  { name: 'Heat Wave', pay: 750, type: 'shootout', target: [240, -60], brief: 'Serbu markas geng di Lorong Emas.' },
  { name: 'Kencana Hilang', pay: 700, type: 'goto', target: [0, 300], brief: 'Cari mobil curian di Pantai Kidul.' },
  { name: 'Double Cross', pay: 900, type: 'shootout', target: [-60, 180], brief: 'Ratna dikhianati. Balas di Kampung Batik.' },
  { name: 'The Last Ride', pay: 1200, type: 'escape', target: [240, 240], brief: 'Satu pelarian terakhir dari Teluk Kencana.' },
];

export const CREW = [
  { key: 'Z', id: 'agus', name: 'Agus Prasetyo', role: 'Driver · Getaway', hire: 200, color: '#e8a33d', hair: 'black', shirt: '#3d6fb5' },
  { key: 'X', id: 'bambang', name: 'Bambang', role: 'Mechanic · Bengkel', hire: 350, color: '#c94b4b', hair: 'bandana', shirt: '#4b7d4b' },
  { key: 'C', id: 'ratna', name: 'Ratna', role: 'Fixer · Contacts', hire: 300, color: '#e87fb5', hair: 'pink', shirt: '#8a4bd0' },
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
  sunsetSkyTop: '#2b1e5e',
  sunsetSkyMid: '#e06a9a',
  sunsetSkyLow: '#ff9a3d',
  nightSkyTop: '#050510',
  nightSkyMid: '#101a3a',
  nightSkyLow: '#1c2a55',
  sea: '#2b6f8e',
  sand: '#e8c98f',
  road: '#33333d',
  roadLine: '#e8d44d',
  sidewalk: '#8a8a92',
  grass: '#4b7d3d',
  text: '#f2ead8',
  muted: '#b8b0a0',
  gold: '#ffb400',
  pink: '#ff2e63',
  kpd: '#2b6fd0',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
export const FONT_DISPLAY = '"Arial Black", "Segoe UI", system-ui, sans-serif';
