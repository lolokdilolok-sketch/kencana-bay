// Every tuning number, name and colour in one place. Kencana Bay, 1998:
// a sun-soaked coastal city of our own — no Rockstar names, maps or art.
export const STEP = 1 / 60;
export const CITY = { size: 600, roadEvery: 60, block: 44 };
export const PLAYER = { walkSpeed: 9, runSpeed: 14, hp: 100 };
export const CAR = { accel: 26, brake: 40, maxSpeed: 42, reverseMax: 12, turn: 2.4, hp: 100 };
export const SAVE_KEY = 'kencana.save.v1';
export const BEST_KEY = 'kencana.best.v1';

// Districts on the 6x6 grid (columns A-F, rows 1-6); the west edge is sea.
export const DISTRICTS = [
  { name: 'Pelabuhan Segara', col: 0, row: 0, color: '#3f9be0', desc: 'Docks · Warehouse' },
  { name: 'Kampung Batik', col: 2, row: 1, color: '#9b6fe0', desc: 'Hotel · Kampung' },
  { name: 'Alun-Alun', col: 2, row: 2, color: '#3d8be0', desc: 'Mansion · Balai Kota' },
  { name: 'Lorong Emas', col: 4, row: 2, color: '#f5b93d', desc: 'Casino · Gold Row' },
  { name: 'Pantai Kidul', col: 1, row: 4, color: '#2fd1b8', desc: 'Beach · Safehouse' },
  { name: 'Pasar Senja', col: 3, row: 4, color: '#f07a3d', desc: 'Market · Showroom' },
  { name: 'Teluk Kencana', col: -1, row: 3, color: '#2aa8c9', desc: 'Sea · West Edge' },
];

export const CREW = [
  { key: 'Z', letter: 'A', name: 'AGUS PRASETYO', role: 'DRIVER · GETAWAY', cost: 200, color: '#e07b2a', effect: 'Wanted cools twice as fast' },
  { key: 'X', letter: 'B', name: 'BAMBANG', role: 'MECHANIC · BENGKEL', cost: 350, color: '#2a6fd1', effect: 'Car repairs itself slowly' },
  { key: 'C', letter: 'R', name: 'RATNA', role: 'FIXER · CONTACTS', cost: 300, color: '#8a4fd1', effect: 'Mission payout +15%' },
];

export const CONTACTS = {
  ratna: { name: 'RATNA', role: 'FIXER' },
  agus: { name: 'AGUS', role: 'FIXER' },
  wanto: { name: 'WANTO', role: 'KOMISARIS' },
  bambang: { name: 'BAMBANG', role: 'BENGKEL' },
};

// 12 story missions. type: goto | steal | deliver | clear | race | escape
export const MISSIONS = [
  { name: 'Selamat Datang', pay: 300, type: 'goto', target: [120, -120], text: 'Selamat datang di Kencana. Temui Ratna di Kampung Batik.', contact: 'ratna' },
  { name: 'Hot Wheels', pay: 450, type: 'steal', target: [-60, 60], text: 'Curi Garuda GT di Lorong Emas. Jangan sampai KPD melihat.', contact: 'ratna' },
  { name: 'Antar Paket', pay: 400, type: 'deliver', target: [180, 120], text: 'Antar paket ke Pasar Senja. Cepat, jangan ditanya isinya.', contact: 'agus' },
  { name: 'Tagihan Pasar', pay: 550, type: 'clear', target: [180, 60], text: 'Tagih utang di Pasar Senja. Yang melawan, beri pelajaran.', contact: 'wanto' },
  { name: 'Mata-Mata', pay: 500, type: 'goto', target: [-180, -180], text: 'Awasi gudang di Pelabuhan Segara. Foto, jangan ketahuan.', contact: 'ratna' },
  { name: 'Balapan Senja', pay: 700, type: 'race', target: [-120, 180], checkpoints: [[-120, 180], [0, 180], [120, 120], [180, -60]], time: 240, text: 'Sunset race across four checkpoints. Win it for the crew.', contact: 'agus' },
  { name: 'Gudang Segara', pay: 650, type: 'clear', target: [-180, -180], text: 'The docks warehouse hides the smugglers. Clean it out.', contact: 'wanto' },
  { name: 'Kabur dari KPD', pay: 600, type: 'escape', target: [120, 180], text: 'KPD mengepung Alun-Alun. Kabur, hilangkan bintangmu.', contact: 'agus' },
  { name: 'Heat Wave', pay: 750, type: 'clear', target: [60, -60], text: 'Gang Lorong Emas menyerbu. Bertahan sampai bantuan datang.', contact: 'bambang' },
  { name: 'Kencana Hilang', pay: 700, type: 'goto', target: [-60, -120], text: 'Mobil Kencana hilang di Kampung Batik. Temukan sebelum dijual.', contact: 'ratna' },
  { name: 'Double Cross', pay: 900, type: 'clear', target: [0, 0], text: 'Seseorang mengkhianati kru di Alun-Alun. Balas dendam.', contact: 'wanto' },
  { name: 'The Last Ride', pay: 1200, type: 'race', target: [-180, 180], checkpoints: [[-180, 180], [-60, 60], [60, -60], [180, -180]], time: 300, text: 'One last ride across Kencana Bay. Finish the story.', contact: 'ratna' },
];

export const WEAPONS = [
  { name: 'PISTOL', icon: '🔫', ammo: 12, reserve: 120, damage: 12, rate: 0.28 },
  { name: 'KANCIL', icon: '🔫', ammo: 30, reserve: 120, damage: 8, rate: 0.09 },
  { name: 'SHOTGUN', icon: '🔫', ammo: 6, reserve: 48, damage: 30, rate: 0.7 },
  { name: 'GARUDA', icon: '🔫', ammo: 24, reserve: 96, damage: 14, rate: 0.14 },
  { name: 'LAUNCHER', icon: '🚀', ammo: 1, reserve: 6, damage: 90, rate: 1.2 },
];

export const PALETTE = {
  skyTop: '#5a2a8e', skyMid: '#d1409a', skyLow: '#ff6a2a',
  sun: '#ffd24d', sea: '#1ab8d8', sand: '#ffd28a',
  road: '#2e2a3e', roadLine: '#ffd24d', sidewalk: '#b8a8d8',
  building: ['#6a4a7a', '#7a3a4a', '#3a5a8a', '#8a6a2a', '#2a6a6a', '#9a4a3a', '#4a3a6a', '#b06a3a'],
  windowLit: '#ffe98a', windowDark: '#2a2f45',
  palmTrunk: '#7a5230', palmLeaf: '#2ae86a',
  police: '#e8eef5', policeBlue: '#2a5fd1',
};
export const FONT = 'system-ui, "Segoe UI", sans-serif';
