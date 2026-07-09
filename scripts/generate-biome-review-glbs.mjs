/**
 * Generate review GLBs for each biome ecosystem.
 * Usage: node scripts/generate-biome-review-glbs.mjs
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Blob } from 'node:buffer';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

globalThis.Blob = Blob;
if (typeof globalThis.FileReader === 'undefined') {
  globalThis.FileReader = class FileReader {
    constructor() {
      this.onload = null;
      this.onloadend = null;
      this.result = null;
    }
    readAsArrayBuffer(blob) {
      blob.arrayBuffer().then((buf) => {
        this.result = buf;
        const ev = { target: this };
        if (this.onload) this.onload(ev);
        if (this.onloadend) this.onloadend(ev);
      });
    }
    readAsDataURL(blob) {
      blob.arrayBuffer().then((buf) => {
        this.result = 'data:application/octet-stream;base64,' + Buffer.from(buf).toString('base64');
        const ev = { target: this };
        if (this.onload) this.onload(ev);
        if (this.onloadend) this.onloadend(ev);
      });
    }
  };
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'public', 'models', 'biomes', 'review');
const PUBLISHED = path.join(ROOT, 'shared', 'definitions', 'published', 'biome-ecosystems.json');

const BIOMES = [
  { id: 'beach', label: 'Beach', canopy: 0x2e8b57, ground: 0xc2b280, trees: 'palm', snow: false, animals: ['deer', 'rabbit', 'crab', 'boar', 'buffalo'] },
  { id: 'tropical', label: 'Tropical', canopy: 0x228b22, ground: 0xd2b48c, trees: 'palm', snow: false, animals: ['deer', 'boar', 'rabbit', 'buffalo', 'crab'] },
  { id: 'forest', label: 'Forest', canopy: 0x1e6b1e, ground: 0x3d5c3d, trees: 'pine_stylized', snow: false, animals: ['deer', 'boar', 'wolf', 'bear', 'rabbit'] },
  { id: 'plains', label: 'Plains', canopy: 0x6b8e23, ground: 0x6b8e23, trees: 'pine_stylized', snow: false, animals: ['buffalo', 'deer', 'rabbit', 'boar', 'wolf'] },
  { id: 'winter', label: 'Winter Snow', canopy: 0xddeeff, ground: 0xe8eef5, trees: 'snow_pine', snow: true, animals: ['wolf', 'deer', 'rabbit', 'bear', 'buffalo'] },
  { id: 'frozen', label: 'Frozen', canopy: 0xe8f4ff, ground: 0xd0dce8, trees: 'snow_pine', snow: true, animals: ['wolf', 'bear', 'deer', 'rabbit', 'buffalo'] },
  { id: 'desert', label: 'Desert', canopy: 0x9a7b4f, ground: 0xd4a574, trees: 'palm_stylized', snow: false, animals: ['rabbit', 'boar', 'buffalo', 'wolf', 'deer'] },
  { id: 'volcanic', label: 'Volcanic', canopy: 0x3d2914, ground: 0x3f3f46, trees: 'stylized_pine', snow: false, animals: ['boar', 'wolf', 'bear', 'buffalo', 'deer'] },
  { id: 'storm', label: 'Storm Reef', canopy: 0x4a5568, ground: 0x4a5568, trees: 'pine_stylized', snow: false, animals: ['boar', 'wolf', 'deer', 'crab', 'rabbit'] },
  { id: 'ethereal', label: 'Ethereal', canopy: 0xa78bfa, ground: 0x7c6aae, trees: 'stylized_pine', snow: false, animals: ['deer', 'rabbit', 'wolf', 'buffalo', 'boar'] },
  { id: 'abyssal', label: 'Abyssal', canopy: 0x16213e, ground: 0x1e293b, trees: 'stylized_pine', snow: false, animals: ['wolf', 'bear', 'boar', 'crab', 'deer'] },
  { id: 'nexus', label: 'Nexus', canopy: 0x4ade80, ground: 0x334155, trees: 'pine_stylized', snow: false, animals: ['deer', 'boar', 'wolf', 'buffalo', 'bear'] },
];

const MOUNTAIN_H = 20;

function makeTree(kind, snow, canopyColor) {
  const g = new THREE.Group();
  g.name = 'tree_' + kind;
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.25, 2.2, 6),
    new THREE.MeshStandardMaterial({ color: 0x5c4033 }),
  );
  trunk.position.y = 1.1;
  g.add(trunk);
  if (kind === 'palm') {
    const crown = new THREE.Mesh(
      new THREE.SphereGeometry(1.4, 8, 6),
      new THREE.MeshStandardMaterial({ color: canopyColor }),
    );
    crown.position.y = 3.2;
    crown.scale.set(1.4, 0.55, 1.4);
    g.add(crown);
  } else if (kind.includes('pine')) {
    for (let i = 0; i < 3; i++) {
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(1.6 - i * 0.35, 2.2, 7),
        new THREE.MeshStandardMaterial({ color: snow ? 0xddeeff : canopyColor }),
      );
      cone.position.y = 2.2 + i * 1.4;
      g.add(cone);
    }
  } else {
    const crown = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.5, 0),
      new THREE.MeshStandardMaterial({ color: canopyColor, flatShading: true }),
    );
    crown.position.y = 3.0;
    g.add(crown);
  }
  return g;
}

function treeKindFor(b) {
  if (b.trees.includes('snow')) return 'snow_pine';
  if (b.trees.includes('palm')) return 'palm';
  if (b.trees.includes('stylized') && !b.trees.includes('pine')) return 'stylized';
  return 'pine';
}

function exportScene(scene) {
  const exporter = new GLTFExporter();
  return new Promise((resolve, reject) => {
    exporter.parse(scene, resolve, reject, { binary: true });
  });
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const catalog = {
    version: '1.0.0',
    updated: new Date().toISOString().slice(0, 10),
    characterReferenceHeightM: 2,
    mountainPeakHeightM: MOUNTAIN_H,
    harvestRegenHours: 4,
    animalsPerBiome: 5,
    fishPoolSize: 10,
    storage: {
      cdnBase: 'https://assets.grudge-studio.com',
      reviewGlbs: 'https://assets.grudge-studio.com/models/biomes/review/',
      nature: '/models/nature',
      environment: '/models/environment',
      mountains: '/models/evil_rock_mountain_peak_{0,1,2}.glb',
      seeds: 'Railway home_islands',
    },
    biomes: [],
  };

  for (const b of BIOMES) {
    const scene = new THREE.Scene();
    scene.name = 'biome_review_' + b.id;

    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(22, 32),
      new THREE.MeshStandardMaterial({ color: b.ground, roughness: 0.9 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.name = 'ground';
    scene.add(ground);

    const water = new THREE.Mesh(
      new THREE.CircleGeometry(8, 24),
      new THREE.MeshStandardMaterial({ color: 0x1e90ff, transparent: true, opacity: 0.55 }),
    );
    water.rotation.x = -Math.PI / 2;
    water.position.set(12, 0.05, 8);
    water.name = 'water_fish_nodes';
    scene.add(water);

    const tk = treeKindFor(b);
    for (let i = 0; i < 6; i++) {
      const t = makeTree(tk, b.snow, b.canopy);
      const a = (i / 6) * Math.PI * 2;
      t.position.set(Math.cos(a) * 10, 0, Math.sin(a) * 10);
      scene.add(t);
    }
    for (let i = 0; i < 4; i++) {
      const r = new THREE.Mesh(
        new THREE.DodecahedronGeometry(1.2, 0),
        new THREE.MeshStandardMaterial({ color: 0x6b6b6b, flatShading: true }),
      );
      r.position.set(-8 + i * 3, 0.6, -6);
      r.name = 'rock';
      scene.add(r);
    }
    for (let i = 0; i < 3; i++) {
      const c = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.7, 0),
        new THREE.MeshStandardMaterial({ color: 0x88ddff, emissive: 0x224466, emissiveIntensity: 0.3 }),
      );
      c.position.set(-4 + i * 2, 1, 4);
      c.name = 'crystal';
      scene.add(c);
    }
    for (let i = 0; i < 5; i++) {
      const a = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.25, 0.5, 4, 8),
        new THREE.MeshStandardMaterial({ color: 0xccaa88 }),
      );
      a.position.set(-6 + i * 2.5, 0.5, 12);
      a.name = 'animal_' + b.animals[i];
      scene.add(a);
    }
    for (let i = 0; i < 10; i++) {
      const f = new THREE.Mesh(
        new THREE.SphereGeometry(0.2, 6, 4),
        new THREE.MeshStandardMaterial({ color: 0x38bdf8 }),
      );
      const ang = (i / 10) * Math.PI * 2;
      f.position.set(12 + Math.cos(ang) * 4, -0.4, 8 + Math.sin(ang) * 4);
      f.name = 'fish_' + i;
      scene.add(f);
    }

    const mountain = new THREE.Group();
    mountain.name = 'mountain_peak_20m';
    const peak = new THREE.Mesh(
      new THREE.ConeGeometry(6, MOUNTAIN_H, 8),
      new THREE.MeshStandardMaterial({ color: 0x4a4a52, flatShading: true }),
    );
    peak.position.y = MOUNTAIN_H / 2;
    mountain.add(peak);
    const cave = new THREE.Mesh(
      new THREE.BoxGeometry(2.5, 4, 1.5),
      new THREE.MeshStandardMaterial({ color: 0x111118 }),
    );
    cave.position.set(0, 2, 5.5);
    cave.name = 'dungeon_portal';
    mountain.add(cave);
    mountain.position.set(-14, 0, -10);
    scene.add(mountain);

    const hero = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.35, 1.2, 4, 8),
      new THREE.MeshStandardMaterial({ color: 0x4488ff }),
    );
    hero.position.set(0, 1, 16);
    hero.name = 'character_ref_2m';
    scene.add(hero);

    for (let h = 5; h <= 20; h += 5) {
      const pole = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 0.2, 0.2),
        new THREE.MeshStandardMaterial({ color: h === 20 ? 0xff4444 : 0xffff00 }),
      );
      pole.position.set(18, h, 0);
      pole.name = 'scale_' + h + 'm';
      scene.add(pole);
    }

    const outPath = path.join(OUT_DIR, b.id + '.glb');
    const buf = await exportScene(scene);
    fs.writeFileSync(outPath, Buffer.from(buf));
    console.log('wrote', b.id, fs.statSync(outPath).size);

    catalog.biomes.push({
      id: b.id,
      label: b.label,
      animals: b.animals,
      treePolicy: b.trees,
      snowCanopy: b.snow,
      mountainPeakHeightM: MOUNTAIN_H,
      harvestRegenHours: 4,
      fishCount: 10,
      reviewGlb: '/models/biomes/review/' + b.id + '.glb',
      reviewCdn: 'https://assets.grudge-studio.com/models/biomes/review/' + b.id + '.glb',
    });
  }

  fs.mkdirSync(path.dirname(PUBLISHED), { recursive: true });
  fs.writeFileSync(PUBLISHED, JSON.stringify(catalog, null, 2) + '\n');
  console.log('catalog biomes', catalog.biomes.length);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
