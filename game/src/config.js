// Kencana Bay — shared constants: city, districts, story, crew, weapons, keys.
// One job: every number the rest of the game agrees on lives here.

export const VERSION_STAMP = 'KENCANA BAY · v7 · 19 NOV 2026';
export const SAVE_KEY = 'kencana.save.v7';

// World layout: a road grid, avenues and streets every 120 units, roads 14 wide.
// The sea sits on the west edge (x < -360); the beach road runs along it.
export const CITY = {
  minX: -420, maxX: 420, minZ: -420, maxZ: 420,
  roadGap: 120, roadWidth: 14,
  seaX: -360, // west of this line is water
  beachZ: 300, // ferris wheel and umbrellas live near here
};

// Six districts, each with a map colour and a short label for the HUD.
export const DISTRICTS = [
  { id: 'segara', name: 'Pelabuhan Segara', color: '#3f7fbf', x0: -360, z0: -360, x1: -120, z1: -120, note: 'Docks · Warehouses' },
  { id: 'batik', name: 'Kampung Batik', color: '#e06a9a', x0: -120, z0: -360, x1: 140, z1: -120, note: 'Old town · Batik shops' },
  { id: 'alun', name: 'Alun-Alun', color: '#ffd34d', x0: -120, z0: -120, x1: 140, z1: 140, note: 'Hotel · Mansion' },
  { id: 'emas', name: 'Lorong Emas', color: '#b06ae0', x0: 140, z0: -120, x1: 360, z1: 140, note: 'Casino · Neon' },
  { id: 'kidul', name: 'Pantai Kidul', color: '#3fd2c0', x0: -360, z0: 140, x1: -100, z1: 360, note: 'Beach · Ferris wheel' },
  { id: 'senja', name: 'Pasar Senja', color: '#ff8a3d', x0: 100, z0: 140, x1: 360, z1: 360, note: 'Market · Showroom · Garage' },
];

export function districtAt(x, z) {
  for (const d of DISTRICTS) {
    if (x >= d.x0 && x < d.x1 && z >= d.z0 && z < d.z1) return d;
  }
  return null;
}

// The 12 story missions. target is the checkpoint the player must reach.
export const MISSIONS = [
  { name: 'Selamat Datang', payout: 300, target: { x: -60, z: -60 }, brief: 'Ratna wants to meet you at the Alun-Alun. Walk there and say hello.', contact: 'Ratna', line: 'So the wheelman is back. Kencana missed you, kid.' },
  { name: 'Hot Wheels', payout: 450, target: { x: -300, z: -300 }, brief: 'A Garuda GT is parked at the docks. Take it — quietly.', contact: 'Ratna', line: 'The gold one. Keys are in it. Try not to scratch her.' },
  { name: 'Antar Paket', payout: 400, target: { x: 240, z: -60 }, brief: 'Drive the package to the casino in Lorong Emas. No stops.', contact: 'Agus', line: 'Straight roads, no police. I will watch your back from the radio.' },
  { name: 'Tagihan Pasar', payout: 550, target: { x: 240, z: 240 }, brief: 'Collect the market debt at Pasar Senja. They will not pay nicely.', contact: 'Ratna', line: 'Ask once. Then ask with the shotgun.' },
  { name: 'Mata-Mata', payout: 500, target: { x: 0, z: -300 }, brief: 'Watch the batik warehouse in Kampung Batik. Report who comes and goes.', contact: 'Wanto', line: 'Eyes open, mouth shut. The commissioner pays for silence.' },
  { name: 'Balapan Senja', payout: 700, target: { x: -300, z: 300 }, brief: 'Sunset race at Pantai Kidul. Four stages, no brakes, no mercy.', contact: 'Agus', line: 'Four gates. Win it and the whole bay knows your name.' },
  { name: 'Gudang Segara', payout: 650, target: { x: -300, z: -180 }, brief: 'Clear the dock warehouse of the rival gang. Bring the Garuda.', contact: 'Ratna', line: 'They took our crates. Take them back — all of them.' },
  { name: 'Kabur dari WPD', payout: 600, target: { x: 60, z: 60 }, brief: 'Lose the KPD tail and reach the Alun-Alun safehouse.', contact: 'Agus', line: 'Three stars on you. Cut through the market, they hate the alleys.' },
  { name: 'Heat Wave', payout: 750, target: { x: 300, z: 0 }, brief: 'A heat wave of police is coming. Survive it and meet Wanto.', contact: 'Wanto', line: 'The department wants a show. Give them a chase, then vanish.' },
  { name: 'Kencana Hilang', payout: 700, target: { x: -180, z: 180 }, brief: 'Your Garuda was stolen. Track it to the beach and take it back.', contact: 'Bambang', line: 'I saw them tow it toward Pantai Kidul. My lift is ready when you get it back.' },
  { name: 'Double Cross', payout: 900, target: { x: 300, z: 300 }, brief: 'The double cross happens at the showroom. Be there first.', contact: 'Ratna', line: 'Trust no one tonight. Especially not me.' },
  { name: 'The Last Ride', payout: 1200, target: { x: -60, z: -60 }, brief: 'One last ride through Kencana Bay. End it where it started.', contact: 'Ratna', line: 'Drive, kid. The sun is setting and the bay is ours.' },
];

export const CREW = [
  { id: 'agus', name: 'Agus Prasetyo', role: 'Driver · Getaway', price: 200, key: 'Z', line: 'I drive, you shoot. That is the deal.' },
  { id: 'bambang', name: 'Bambang', role: 'Mechanic · Bengkel', price: 350, key: 'X', line: 'Bring her in dirty, take her out gold.' },
  { id: 'ratna', name: 'Ratna', role: 'Fixer · Contacts', price: 300, key: 'C', line: 'I know a guy. I always know a guy.' },
];

export const WEAPONS = [
  { name: 'Pistol', damage: 25, ammo: 60 },
  { name: 'Kancil SMG', damage: 12, ammo: 180 },
  { name: 'Shotgun', damage: 60, ammo: 24 },
  { name: 'Garuda', damage: 40, ammo: 90 },
  { name: 'Launcher', damage: 120, ammo: 6 },
];

/** Weapon unlocks: the first three guns are owned from the start; the Garuda rifle is
 * earned after mission 5 (index 4, Tagihan Pasar) and the Launcher after mission 9
 * (index 8, Kabur dari WPD). Locked weapons show LOCKED in the weapon bar. */
export function weaponUnlocked(weaponIndex, missionIndex) {
  if (weaponIndex < 3) return true;
  if (weaponIndex === 3) return missionIndex >= 4;
  return missionIndex >= 8;
}

// Garage repaint colours (persist in save).
export const PAINTS = [
  { id: 'gold', name: 'Emas Kencana', hex: 0xffb400 },
  { id: 'pink', name: 'Pink Senja', hex: 0xff2e63 },
  { id: 'red', name: 'Merah Garuda', hex: 0xd21f2b },
  { id: 'black', name: 'Hitam Lorong', hex: 0x1a1a22 },
];

// Street race: 5 gates across the city, start flag at Pantai Kidul.
export const RACE = {
  start: { x: -300, z: 300 },
  gates: [
    { x: -300, z: 60 },
    { x: -60, z: -60 },
    { x: 180, z: -180 },
    { x: 300, z: 120 },
    { x: -180, z: 300 },
  ],
  winPayout: 500, losePayout: 150, parTime: 150, // seconds
};

export const GARAGE = {
  door: { x: 300, z: 300 }, // entrance marker in Pasar Senja
  room: { x: 1500, z: 0 }, // interior lives far from the city, same scene
};

export const KEYS = {
  forward: 'KeyW', back: 'KeyS', left: 'KeyA', right: 'KeyD',
  enter: 'KeyE', shoot: 'KeyJ', reload: 'KeyR', garage: 'KeyG',
  map: 'KeyM', pause: 'KeyP', radio: 'KeyT', drift: 'Space',
  crewAgus: 'KeyZ', crewBambang: 'KeyX', crewRatna: 'KeyC',
  weapons: ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5'],
};

export const PHYSICS = {
  walkSpeed: 6, runSpeed: 10,
  carAccel: 26, carBrake: 40, carMaxSpeed: 46, carReverse: 12,
  carSteer: 1.9, driftGrip: 0.86,
  trafficSpeed: 9,
};

export const SUNSET = {
  sunColor: 0xff8a3d, sunIntensity: 3.4,
  hemiSky: 0xffd9a0, hemiGround: 0x7a4a6a, hemiIntensity: 1.9,
  ambient: 0.95, fogColor: 0xf2a56b, fogNear: 260, fogFar: 900,
  skyTop: 0x7a3fa0, skyMid: 0xff8a5c, skyLow: 0xffc46b,
};
