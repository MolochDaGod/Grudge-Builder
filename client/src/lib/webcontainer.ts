/**
 * WebContainer singleton — boots once per page, manages in-browser Node.js runtime.
 * Used by the /editor page for live Three.js/BabylonJS preview with full npm support.
 */
import { WebContainer, type FileSystemTree } from '@webcontainer/api';

let _instance: WebContainer | null = null;
let _booting: Promise<WebContainer> | null = null;

/** Boot or return the singleton WebContainer instance */
export async function getWebContainer(): Promise<WebContainer> {
  if (_instance) return _instance;
  if (_booting) return _booting;

  _booting = WebContainer.boot().then(wc => {
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

/** Get starter file tree for a BabylonJS project */
export function getBabylonTemplate(): FileSystemTree {
  return {
    'package.json': {
      file: {
        contents: JSON.stringify({
          name: 'grudge-babylon-scene',
          type: 'module',
          private: true,
          scripts: { dev: 'vite' },
          dependencies: { '@babylonjs/core': '^7.0.0', '@babylonjs/loaders': '^7.0.0' },
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
  <title>Grudge Scene — Babylon</title>
  <style>body{margin:0;overflow:hidden}canvas{width:100%;height:100vh;display:block}</style>
</head>
<body>
  <canvas id="renderCanvas"></canvas>
  <script type="module" src="/src/main.js"></script>
</body>
</html>`,
      },
    },
    src: {
      directory: {
        'main.js': {
          file: {
            contents: `import { Engine, Scene, ArcRotateCamera, HemisphericLight, MeshBuilder, Vector3, Color3, StandardMaterial } from '@babylonjs/core';

const canvas = document.getElementById('renderCanvas');
const engine = new Engine(canvas, true);
const scene = new Scene(engine);
scene.clearColor = new Color3(0.1, 0.1, 0.18);

const camera = new ArcRotateCamera('cam', -Math.PI / 2, Math.PI / 3, 6, Vector3.Zero(), scene);
camera.attachControl(canvas, true);

new HemisphericLight('light', new Vector3(0, 1, 0), scene);

const ground = MeshBuilder.CreateGround('ground', { width: 10, height: 10 }, scene);
const groundMat = new StandardMaterial('gmat', scene);
groundMat.diffuseColor = new Color3(0.18, 0.18, 0.27);
ground.material = groundMat;

const box = MeshBuilder.CreateBox('hero', { size: 1 }, scene);
box.position.y = 0.5;
const boxMat = new StandardMaterial('hmat', scene);
boxMat.diffuseColor = new Color3(1, 0.42, 0.21);
box.material = boxMat;

scene.registerBeforeRender(() => { box.rotation.y += 0.01; });

engine.runRenderLoop(() => scene.render());
window.addEventListener('resize', () => engine.resize());

console.log('🎮 Grudge Studio Editor — BabylonJS loaded');
`,
          },
        },
      },
    },
  };
}

/** Template registry for the editor template picker */
export const EDITOR_TEMPLATES = [
  { id: 'threejs', name: 'Three.js Scene', description: 'Starter scene with OrbitControls, lighting, and a hero mesh', getFiles: getThreeJsTemplate },
  { id: 'babylon', name: 'BabylonJS Scene', description: 'Starter scene with ArcRotateCamera and hero mesh', getFiles: getBabylonTemplate },
] as const;
