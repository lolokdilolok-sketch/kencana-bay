// Seeded random: a small hash-based generator. The same seed always gives the
// same sequence, so the city, the traffic and the screenshot scenes repeat.
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
