/**
 * WebContainer singleton — boots once per page, manages in-browser Node.js runtime.
 * Used by the /editor page for live Three.js/BabylonJS preview with full npm support.
 */
// Dynamic import — @webcontainer/api is only needed on the /editor page and
// may not be installed in all environments (Railway server-only deploy).
// Using dynamic import() prevents Rollup from failing the entire build.

// Type-only re-export for consumers that need the FileSystemTree type.
// Rollup strips type-only imports so this won't cause a resolve failure.
export type FileSystemTree = Record<string, any>;

let _instance: any = null;
let _booting: Promise<any> | null = null;

/** Boot or return the singleton WebContainer instance */
export async function getWebContainer(): Promise<any> {
  if (_instance) return _instance;
  if (_booting) return _booting;

  _booting = import('@webcontainer/api').then(({ WebContainer }) =>
    WebContainer.boot()
  ).then(wc => {
    _instance = wc;
    _booting = null;
    return wc;
  });

  return _booting;
}

/** Check if SharedArrayBuffer is available (needed for WebContainers) */
export function isWebContainerSupported(): boolean {
  return typeof SharedArrayBuffer !== 'undefined';
}

// ── Starter templates ────────────────────────────────────────────

const THREEJS_STARTER = `import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);

// Camera
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(3, 3, 3);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// Lighting
const ambient = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambient);
const directional = new THREE.DirectionalLight(0xffd700, 1);
directional.position.set(5, 5, 5);
directional.castShadow = true;
scene.add(directional);

// Ground
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(10, 10),
  new THREE.MeshStandardMaterial({ color: 0x2d2d44 })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// Hero cube (replace with your GLTF model!)
const hero = new THREE.Mesh(
  new THREE.BoxGeometry(1, 1.5, 1),
  new THREE.MeshStandardMaterial({ color: 0xff6b35 })
);
hero.position.y = 0.75;
hero.castShadow = true;
scene.add(hero);

// Grid helper
scene.add(new THREE.GridHelper(10, 10, 0x444466, 0x333355));

// Animate
function animate() {
  requestAnimationFrame(animate);
  hero.rotation.y += 0.01;
  controls.update();
  renderer.render(scene, camera);
}
animate();

// Resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

console.log('🎮 Grudge Studio Editor — Three.js loaded');
`;

/** Get starter file tree for a Three.js project */
export function getThreeJsTemplate(): FileSystemTree {
  return {
    'package.json': {
      file: {
        contents: JSON.stringify({
          name: 'grudge-scene',
          type: 'module',
          private: true,
          scripts: { dev: 'vite' },
          dependencies: { three: '^0.160.0' },
          devDependencies: { vite: '^5.4.0' },
        }, null, 2),
      },
    },
    'index.html': {
      file: {
        contents: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Grudge Scene</title>
  <style>body{margin:0;overflow:hidden;background:#1a1a2e}</style>
</head>
<body>
  <script type="module" src="/src/main.js"></script>
</body>
</html>`,
      },
    },
    src: {
      directory: {
        'main.js': {
          file: { contents: THREEJS_STARTER },
        },
      },
    },
  };
}

/** Template registry for the editor template picker. Grudge Warlords is Three.js-only. */
export const EDITOR_TEMPLATES = [
  { id: 'threejs', name: 'Three.js Scene', description: 'Starter scene with OrbitControls, lighting, and a hero mesh', getFiles: getThreeJsTemplate },
] as const;
