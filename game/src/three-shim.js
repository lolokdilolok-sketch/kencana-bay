// The one import point for Three.js: every module reaches the vendored r152 module build
// through this shim, so no file names the vendor path twice and the import map in index.html
// is the only place that maps the bare specifier 'three' to a file inside game/.
import * as THREE from 'three';

export { THREE };
