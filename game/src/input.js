// Keyboard and mouse input, one job: remember which keys are down right now and hand out
// single-press actions (a key that was pressed since the last read, not held). The game loop
// polls the held keys every frame; menus and one-shot actions take the pressed edge.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_MAP = 4;
export const ACTION_GARAGE = 8;
export const ACTION_RADIO = 16;
export const ACTION_ENTER = 32;

const CONFIRM_KEYS = new Set(['Enter', 'Space']);
const PAUSE_KEYS = new Set(['KeyP', 'Escape']);
const MAP_KEYS = new Set(['KeyM']);
const GARAGE_KEYS = new Set(['KeyG']);
const RADIO_KEYS = new Set(['KeyT']);
const ENTER_KEYS = new Set(['KeyE']);

export function createInput(canvas) {
  const down = new Set();
  const pressed = new Set();
  const mouse = { x: 0, y: 0, clicked: false };

  function onKeyDown(event) {
    if (event.repeat) return;
    down.add(event.code);
    pressed.add(event.code);
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
      event.preventDefault();
    }
  }

  function onKeyUp(event) {
    down.delete(event.code);
  }

  function onMouseMove(event) {
    mouse.x = event.clientX;
    mouse.y = event.clientY;
  }

  function onMouseDown(event) {
    mouse.x = event.clientX;
    mouse.y = event.clientY;
    mouse.clicked = true;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mousedown', onMouseDown);
  // Title buttons are DOM, so clicks on them never reach the canvas; the mouse position
  // is still tracked for the title screen's subtle parallax.
  window.addEventListener('mousemove', onMouseMove);
  // A key released while the tab is hidden never sends keyup: let go of everything on blur.
  window.addEventListener('blur', () => {
    down.clear();
    pressed.clear();
  });

  return {
    isDown(code) {
      return down.has(code);
    },
    wasPressed(code) {
      return pressed.has(code);
    },
    /** WASD / arrows as a -1..1 pair: x is strafe/steer, y is forward/back. */
    axis() {
      const x = (this.isDown('KeyD') || this.isDown('ArrowRight') ? 1 : 0)
        - (this.isDown('KeyA') || this.isDown('ArrowLeft') ? 1 : 0);
      const y = (this.isDown('KeyW') || this.isDown('ArrowUp') ? 1 : 0)
        - (this.isDown('KeyS') || this.isDown('ArrowDown') ? 1 : 0);
      return { x, y };
    },
    /** One-shot actions pressed since the last call; clears the pressed set. */
    takeActions() {
      let actions = 0;
      for (const code of pressed) {
        if (CONFIRM_KEYS.has(code)) actions |= ACTION_CONFIRM;
        if (PAUSE_KEYS.has(code)) actions |= ACTION_PAUSE;
        if (MAP_KEYS.has(code)) actions |= ACTION_MAP;
        if (GARAGE_KEYS.has(code)) actions |= ACTION_GARAGE;
        if (RADIO_KEYS.has(code)) actions |= ACTION_RADIO;
        if (ENTER_KEYS.has(code)) actions |= ACTION_ENTER;
      }
      pressed.clear();
      return actions;
    },
    takeClick() {
      const c = mouse.clicked;
      mouse.clicked = false;
      return c;
    },
    mouse() {
      return mouse;
    },
    clear() {
      pressed.clear();
      mouse.clicked = false;
    },
  };
}
