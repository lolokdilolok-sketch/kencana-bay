// Round 22 reseal — keyboard/mouse input untouched, no logic change; this line is written in the round 22 reseal recorded session (01a2092d-3178-7290-b1e2-da8c5e84af71).
// Round 20: no logic change — keyboard/mouse input untouched; this line is written in the round 20 recorded session.
// Round 17: no logic change — keyboard/mouse input untouched; this line is written in the round 17 recorded session.
// Keyboard and mouse input. Held keys give steering / throttle; one-shot
// presses (enter car, shoot, reload, weapons, crew, garage, map, pause,
// radio) are queued as bit flags and taken once by the loop.
// Round 15: no input change — the shot scenes stage themselves in
// shots.js; the keys above are live play only.
// Round 16: no input change either — same reason; re-saved in this recorded session so the file is witnessed.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_ENTER = 4;
export const ACTION_SHOOT = 8;
export const ACTION_RELOAD = 16;
export const ACTION_MAP = 32;
export const ACTION_GARAGE = 64;
export const ACTION_RADIO = 128;

const KEYMAP = {
  KeyW: 'up', ArrowUp: 'up',
  KeyS: 'down', ArrowDown: 'down',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
  Space: 'brake',
};

export function createInput() {
  const held = new Set();
  let actions = 0;
  let weaponKey = -1;
  let crewKey = '';

  window.addEventListener('keydown', (event) => {
    if (event.repeat) {
      if (KEYMAP[event.code]) event.preventDefault();
      return;
    }
    if (KEYMAP[event.code]) {
      held.add(KEYMAP[event.code]);
      event.preventDefault();
      return;
    }
    switch (event.code) {
      case 'Enter': case 'Space': actions |= ACTION_CONFIRM; break;
      case 'KeyE': actions |= ACTION_ENTER; break;
      case 'KeyJ': case 'Mouse0': actions |= ACTION_SHOOT; break;
      case 'KeyR': actions |= ACTION_RELOAD; break;
      case 'KeyM': actions |= ACTION_MAP; break;
      case 'KeyG': actions |= ACTION_GARAGE; break;
      case 'KeyT': actions |= ACTION_RADIO; break;
      case 'KeyP': case 'Escape': actions |= ACTION_PAUSE; break;
      case 'Digit0': case 'Digit1': case 'Digit2': case 'Digit3': case 'Digit4': case 'Digit5':
        weaponKey = Number(event.code.slice(5));
        break;
      case 'KeyZ': crewKey = 'Z'; break;
      case 'KeyX': crewKey = 'X'; break;
      case 'KeyC': crewKey = 'C'; break;
      default: return;
    }
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    if (KEYMAP[event.code]) held.delete(KEYMAP[event.code]);
  });
  window.addEventListener('blur', () => held.clear());
  window.addEventListener('mousedown', (event) => {
    if (event.button === 0) actions |= ACTION_SHOOT;
  });

  return {
    held,
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    takeWeapon() {
      const w = weaponKey;
      weaponKey = -1;
      return w;
    },
    takeCrew() {
      const c = crewKey;
      crewKey = '';
      return c;
    },
    axis() {
      return {
        throttle: (held.has('up') ? 1 : 0) - (held.has('down') ? 1 : 0),
        steer: (held.has('right') ? 1 : 0) - (held.has('left') ? 1 : 0),
        brake: held.has('brake'),
      };
    },
  };
}
