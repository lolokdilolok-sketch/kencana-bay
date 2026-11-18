// The vendored Three.js build loads as a classic script and puts THREE on
// the window; this module just hands that global to the ES modules.
export const THREE = window.THREE;
export default window.THREE;
