// Keyboard state for driving, walking, shooting and menus.
// Held keys are read every frame; single presses are queued once.
export const PRESS_ENTER = 1;
export const PRESS_MAP = 2;
export const PRESS_PAUSE = 4;
export const PRESS_SHOOT = 8;
export const PRESS_RELOAD = 16;
export const PRESS_RADIO = 32;

const FORWARD = new Set(['KeyW', 'ArrowUp']);
const BACK = new Set(['KeyS', 'ArrowDown']);
const LEFT = new Set(['KeyA', 'ArrowLeft']);
const RIGHT = new Set(['KeyD', 'ArrowRight']);
const ENTER = new Set(['KeyE']);
const MAP = new Set(['KeyM']);
const PAUSE = new Set(['KeyP', 'Escape']);
const SHOOT = new Set(['KeyJ']);
const RELOAD = new Set(['KeyR']);
const RADIO = new Set(['KeyT']);
const GARAGE = new Set(['KeyG']);

export function createInput() {
  const held = new Set();
  let pressed = 0;
  let garagePressed = false;

  function mark(code) {
    if (ENTER.has(code)) pressed |= PRESS_ENTER;
    else if (MAP.has(code)) pressed |= PRESS_MAP;
    else if (PAUSE.has(code)) pressed |= PRESS_PAUSE;
    else if (SHOOT.has(code)) pressed |= PRESS_SHOOT;
    else if (RELOAD.has(code)) pressed |= PRESS_RELOAD;
    else if (RADIO.has(code)) pressed |= PRESS_RADIO;
    else if (GARAGE.has(code)) garagePressed = true;
  }

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    held.add(event.code);
    mark(event.code);
    if (FORWARD.has(event.code) || BACK.has(event.code) || LEFT.has(event.code) || RIGHT.has(event.code) || SHOOT.has(event.code)) {
      event.preventDefault();
    }
  });
  window.addEventListener('keyup', (event) => held.delete(event.code));
  window.addEventListener('blur', () => held.clear());

  function has(codes) {
    for (const c of codes) if (held.has(c)) return true;
    return false;
  }

  return {
    forward() { return has(FORWARD); },
    back() { return has(BACK); },
    left() { return has(LEFT); },
    right() { return has(RIGHT); },
    shootHeld() { return has(SHOOT); },
    takePresses() {
      const taken = pressed;
      pressed = 0;
      const garage = garagePressed;
      garagePressed = false;
      return { pressed: taken, garage };
    },
    weaponKey() {
      for (let i = 1; i <= 5; i += 1) {
        if (held.has(`Digit${i}`)) return i - 1;
      }
      return -1;
    },
  };
}
