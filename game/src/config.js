// Kencana Bay — every tuning number, place, mission, crew member and weapon.
// These values are my own design for this game.
export const GAME = {
  name: 'KENCANA BAY',
  tagline: 'Emas, bensin, dan pengkhianatan — seorang wheelman pulang ke Teluk Kencana.',
  version: 'v6 · 18 NOV 2026',
  year: 1998,
  saveKey: 'kencana.save.v1',
  seed: 1,
};

// The city: x runs east, z runs south. The sea lies west of x = -300,
// a strip of sand between the water and the first road.
export const WORLD = {
  minX: -360, maxX: 360, minZ: -360, maxZ: 360,
  seaX: -300, sandX: -260,
  roadWidth: 14,
  roadXs: [-240, -120, 0, 120, 240],
  roadZs: [-240, -120, 0, 120, 240],
};

export const DISTRICTS = [
  { id: 'segara', name: 'Pelabuhan Segara', x0: -300, x1: -40, z0: -360, z1: -120, color: 0x3f6fb5, css: '#3f6fb5', landmark: 'Docks & Crane' },
  { id: 'batik', name: 'Kampung Batik', x0: -40, x1: 360, z0: -360, z1: -120, color: 0xe08a2e, css: '#e08a2e', landmark: 'Batik Workshop' },
  { id: 'alun', name: 'Alun-Alun', x0: -300, x1: -40, z0: -120, z1: 120, color: 0x7fb069, css: '#7fb069', landmark: 'Grand Hotel' },
  { id: 'emas', name: 'Lorong Emas', x0: -40, x1: 360, z0: -120, z1: 120, color: 0xd4af37, css: '#d4af37', landmark: 'Casino' },
  { id: 'kidul', name: 'Pantai Kidul', x0: -300, x1: -40, z0: 120, z1: 360, color: 0x2ec4b6, css: '#2ec4b6', landmark: 'Ferris Wheel' },
  { id: 'senja', name: 'Pasar Senja', x0: -40, x1: 360, z0: 120, z1: 360, color: 0xef476f, css: '#ef476f', landmark: 'Showroom' },
];

export function districtAt(x, z) {
  for (const d of DISTRICTS) {
    if (x >= d.x0 && x < d.x1 && z >= d.z0 && z < d.z1) return d;
  }
  return DISTRICTS[0];
}

export const MISSIONS = [
  { id: 1, name: 'Selamat Datang', payout: 300, desc: 'Welcome back to Teluk Kencana. Drive to the safehouse.', type: 'drive', points: [{ x: -180, z: -60, label: 'Safehouse' }] },
  { id: 2, name: 'Hot Wheels', payout: 450, desc: 'Steal the Garuda GT from the showroom.', type: 'steal', points: [{ x: 180, z: 240, label: 'Showroom' }] },
  { id: 3, name: 'Antar Paket', payout: 400, desc: 'Deliver the package to Kampung Batik.', type: 'drive', points: [{ x: 200, z: -240, label: 'Batik House' }] },
  { id: 4, name: 'Tagihan Pasar', payout: 550, desc: 'Collect the debt at Pasar Senja.', type: 'drive', points: [{ x: 120, z: 240, label: 'Market' }, { x: 240, z: 180, label: 'Stall Row' }] },
  { id: 5, name: 'Mata-Mata', payout: 500, desc: 'Shadow the contact near the casino.', type: 'drive', points: [{ x: 60, z: 0, label: 'Casino' }] },
  { id: 6, name: 'Balapan Senja', payout: 700, desc: 'Sunset race across four checkpoints. Win it for the crew.', type: 'race', points: [
    { x: -180, z: 240, label: 'Checkpoint 1: Pantai Kidul' },
    { x: -240, z: -180, label: 'Checkpoint 2: Gudang Segara' },
    { x: 240, z: -240, label: 'Checkpoint 3: Kampung Batik' },
    { x: 60, z: 120, label: 'Checkpoint 4: Alun-Alun' },
  ] },
  { id: 7, name: 'Gudang Segara', payout: 650, desc: 'Clear the warehouse at the docks.', type: 'clear', points: [{ x: -240, z: -240, label: 'Gudang Segara' }] },
  { id: 8, name: 'Kabur dari WPD', payout: 600, desc: 'The KPD is on you. Lose them, then reach the garage.', type: 'escape', points: [{ x: -60, z: 60, label: 'Bengkel Bambang' }], wanted: 4 },
  { id: 9, name: 'Heat Wave', payout: 750, desc: 'Full heat. Survive the chase to the beach.', type: 'escape', points: [{ x: -240, z: 300, label: 'Pantai Kidul' }], wanted: 5 },
  { id: 10, name: 'Kencana Hilang', payout: 700, desc: 'Find the missing gold shipment.', type: 'drive', points: [{ x: -180, z: -300, label: 'Docks' }, { x: 0, z: -60, label: 'Alun-Alun' }] },
  { id: 11, name: 'Double Cross', payout: 900, desc: 'Ratna set a meeting. Trust no one.', type: 'clear', points: [{ x: 180, z: 60, label: 'Lorong Emas' }] },
  { id: 12, name: 'The Last Ride', payout: 1200, desc: 'One last ride out of Teluk Kencana.', type: 'race', points: [
    { x: -240, z: 300, label: 'Checkpoint 1: Pantai' },
    { x: 240, z: 300, label: 'Checkpoint 2: Pasar' },
    { x: 240, z: -300, label: 'Checkpoint 3: Batik' },
    { x: -300, z: -60, label: 'Checkpoint 4: Pelabuhan' },
  ] },
];

export const CREW = [
  { id: 'agus', key: 'KeyZ', name: 'Agus Prasetyo', role: 'Driver · Getaway', cost: 200, perk: 'Wanted cools down twice as fast.' },
  { id: 'bambang', key: 'KeyX', name: 'Bambang', role: 'Mechanic · Bengkel', cost: 350, perk: 'Your car slowly repairs itself.' },
  { id: 'ratna', key: 'KeyC', name: 'Ratna', role: 'Fixer · Contacts', cost: 300, perk: 'Objectives pay a 10% bonus.' },
];

export const WEAPONS = [
  { id: 0, name: 'PISTOL', ammo: 120, maxAmmo: 120, damage: 34, range: 90, rate: 280 },
  { id: 1, name: 'KANCIL', ammo: 120, maxAmmo: 120, damage: 18, range: 80, rate: 90 },
  { id: 2, name: 'SHOTGUN', ammo: 48, maxAmmo: 48, damage: 22, range: 45, rate: 700 },
  { id: 3, name: 'GARUDA', ammo: 96, maxAmmo: 96, damage: 40, range: 130, rate: 200 },
  { id: 4, name: 'LAUNCHER', ammo: 6, maxAmmo: 6, damage: 120, range: 160, rate: 1200 },
];

export const SPEAKERS = {
  RATNA: { name: 'RATNA', role: 'FIXER', shirt: 0x7b2fbe, skin: 0xe8b88a, hair: 0x1a1a1a },
  AGUS: { name: 'AGUS', role: 'DRIVER', shirt: 0x2e6fb5, skin: 0xd99a6c, hair: 0x111111 },
  WANTO: { name: 'WANTO', role: 'KOMISARIS', shirt: 0x3a3f4a, skin: 0xe0a878, hair: 0x555555 },
  BAMBANG: { name: 'BAMBANG', role: 'MECHANIC', shirt: 0x3f7a4a, skin: 0xcf9468, hair: 0x222222 },
};

export const TUNING = {
  walkSpeed: 9,
  carAccel: 26,
  carBrake: 42,
  carMaxSpeed: 46,
  carReverse: 14,
  carTurn: 1.9,
  driftBonus: 300,
  wantedDecay: 0.012,
  policeTopSpeed: 40,
  heliHeight: 55,
  checkpointRadius: 16,
};
