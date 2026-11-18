// Keyboard + mouse input. One job: read keys, expose intent, queue actions.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_MAP = 4;
export const ACTION_SHOOT = 8;
export const ACTION_RELOAD = 16;
export const ACTION_ENTER = 32;
export const ACTION_RADIO = 64;
export const ACTION_GARAGE = 128;

export function createInput(canvas) {
  const keys = new Set();
  let actions = 0;
  let mouseDX = 0;
  let mouseDown = false;
  const onKey = (e) => {
    const k = e.key.toLowerCase();
    if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault();
    if (e.type === 'keydown') {
      if (!e.repeat) {
        if (k === ' ' || k === 'enter') actions |= ACTION_CONFIRM;
        if (k === 'p' || k === 'escape') actions |= ACTION_PAUSE;
        if (k === 'm') actions |= ACTION_MAP;
        if (k === 'r') actions |= ACTION_RELOAD;
        if (k === 'e') actions |= ACTION_ENTER;
        if (k === 't') actions |= ACTION_RADIO;
        if (k === 'g') actions |= ACTION_GARAGE;
      }
      keys.add(k);
    } else keys.delete(k);
  };
  window.addEventListener('keydown', onKey);
  window.addEventListener('keyup', onKey);
  canvas.addEventListener('mousedown', () => { mouseDown = true; actions |= ACTION_SHOOT; });
  window.addEventListener('mouseup', () => { mouseDown = false; });
  window.addEventListener('mousemove', (e) => { mouseDX += e.movementX || 0; });
  return {
    keys,
    takeActions() { const a = actions; actions = 0; return a; },
    takeMouseDX() { const d = mouseDX; mouseDX = 0; return d; },
    get mouseDown() { return mouseDown; },
    axis() {
      let x = 0, y = 0;
      if (keys.has('a') || keys.has('arrowleft')) x -= 1;
      if (keys.has('d') || keys.has('arrowright')) x += 1;
      if (keys.has('w') || keys.has('arrowup')) y += 1;
      if (keys.has('s') || keys.has('arrowdown')) y -= 1;
      return { x, y };
    },
  };
}
