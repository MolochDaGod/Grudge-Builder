/**
 * three-global-shim.js
 * Injected by Vite esbuildOptions.inject for packages that reference THREE
 * as a browser global (UMD packages like @enable3d/phaser-extension, stage-js).
 * esbuild inject adds this as an import at the top of every pre-bundled file.
 */
import * as THREE from 'three';

if (typeof globalThis !== 'undefined' && !globalThis.THREE) {
  globalThis.THREE = THREE;
}
if (typeof window !== 'undefined' && !window.THREE) {
  window.THREE = THREE;
}
