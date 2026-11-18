// The 12-job story: sequential missions with objectives, checkpoints,
// timers, payouts and crew dialogue. One job: what the player must do next.
import { MISSIONS, CONTACTS } from './config.js';

export function createMissions() {
  let index = 0;
  let stage = 0; // checkpoint index for race missions
  let timer = 0;
  let done = 0;
  let kills = 0;
  let objective = null;

  function current() { return MISSIONS[Math.min(index, MISSIONS.length - 1)]; }
  function start() {
    const m = current();
    stage = 0;
    timer = m.time || 0;
    objective = m.type === 'race' ? m.checkpoints[0] : m.target;
    return m;
  }
  function advanceCheckpoint() {
    const m = current();
    if (m.type !== 'race' || !m.checkpoints) return false;
    stage += 1;
    if (stage >= m.checkpoints.length) return true;
    objective = m.checkpoints[stage];
    return false;
  }
  function complete() {
    done += 1;
    const pay = current().pay;
    index = Math.min(index + 1, MISSIONS.length - 1);
    if (done < MISSIONS.length) start();
    return pay;
  }
  return {
    get index() { return index; },
    get stage() { return stage; },
    get timer() { return timer; },
    get done() { return done; },
    get kills() { return kills; },
    get objective() { return objective; },
    get finished() { return done >= MISSIONS.length; },
    jump(i, d) { index = Math.min(i, MISSIONS.length - 1); done = d; },
    current, start, advanceCheckpoint, complete,
    tick(dt) { if (timer > 0) timer -= dt; },
    addKill() { kills += 1; },
    contact() { return CONTACTS[current().contact] || CONTACTS.ratna; },
  };
}
