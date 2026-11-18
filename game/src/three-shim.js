// Re-export the vendored global THREE (game/vendor/three.min.js, loaded
// by index.html before this module) so the ES modules can import it.
export const THREE = window.THREE;
export default window.THREE;
