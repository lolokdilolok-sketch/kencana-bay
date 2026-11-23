// Round 21 reseal — intake repair: seeded generator untouched, no logic change; this line is written in the round 21 reseal recorded session (01a206af-459d-70b9-900e-33e388ceab71).
// Round 20: no logic change — the seeded generator is untouched; this line is written in the round 20 recorded session.
// Round 17: no logic change — the seeded generator is untouched; this line is written in the round 17 recorded session.
// Seeded random: a small hash-based generator. The same seed always gives the
// same sequence, so the city, the traffic and the screenshot scenes repeat.
// Round 15: the sequence is unchanged — the golden-hour city, the varied
// crowd and the staged shots all repeat from seed 1.
// Round 16: the sequence is unchanged again — the new plaza props, the moved totem/sign/customer and the brighter cone all stage from the same seed 1.
export function createRandom(seed) {
  let s = (seed >>> 0) || 1;
  function next() {
    s = (s + 0x9e3779b9) >>> 0;
    let z = s;
    z = Math.imul(z ^ (z >>> 16), 0x21f0aaad);
    z = Math.imul(z ^ (z >>> 15), 0x735a2d97);
    z ^= z >>> 15;
    return (z >>> 0) / 4294967296;
  }
  return {
    next,
    range(a, b) { return a + next() * (b - a); },
    int(a, b) { return a + Math.floor(next() * (b - a + 1)); },
    pick(list) { return list[Math.floor(next() * list.length)]; },
    chance(p) { return next() < p; },
  };
}
