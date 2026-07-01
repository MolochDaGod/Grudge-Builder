/**
 * HomeIslandNodes — visual meshes for all home island resource types.
 *
 * Crystals load gem_cluster.glb from CDN; hemp/flowers/dock stay procedural.
 * Trees and rocks are handled by HarvestableTree/HarvestableRock.
 */
import * as THREE from 'three';
import { harvestFitHeightM } from '@shared/definitions/homeIslandSpec';
import { cloneIslandResource, fitModelToHeight } from './IslandResourceLoader';

// ── Crystal Cluster ──────────────────────────────────────────────

export interface HarvestableCrystal {
  group: THREE.Group;
  health: number;
  maxHealth: number;
  baseScale: number;
  chipping: boolean;
  chipTime: number;
  respawnAt: number;
  nodeId?: string;
}

function addProceduralCrystalMesh(group: THREE.Group): number {
  const colors = [0x88ddff, 0xaa66ff, 0x66ffaa, 0xff88cc];
  const crystalColor = colors[Math.floor(Math.random() * colors.length)];

  const crystalMat = new THREE.MeshStandardMaterial({
    color: crystalColor,
    emissive: crystalColor,
    emissiveIntensity: 0.4,
    roughness: 0.15,
    metalness: 0.3,
    transparent: true,
    opacity: 0.85,
  });

  const main = new THREE.Mesh(new THREE.ConeGeometry(0.6, 3.5, 5), crystalMat);
  main.position.y = 1.75;
  main.rotation.z = (Math.random() - 0.5) * 0.3;
  main.castShadow = true;
  group.add(main);

  for (let i = 0; i < 3; i++) {
    const h = 1.5 + Math.random() * 1.5;
    const r = 0.25 + Math.random() * 0.3;
    const shard = new THREE.Mesh(new THREE.ConeGeometry(r, h, 5), crystalMat);
    const angle = (i / 3) * Math.PI * 2 + Math.random() * 0.5;
    const dist = 0.5 + Math.random() * 0.6;
    shard.position.set(Math.cos(angle) * dist, h / 2, Math.sin(angle) * dist);
    shard.rotation.set((Math.random() - 0.5) * 0.4, 0, (Math.random() - 0.5) * 0.4);
    shard.castShadow = true;
    group.add(shard);
  }

  const base = new THREE.Mesh(
    new THREE.DodecahedronGeometry(1, 0),
    new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.9 }),
  );
  base.position.y = 0.3;
  base.scale.set(1, 0.4, 1);
  base.receiveShadow = true;
  group.add(base);

  const glow = new THREE.PointLight(crystalColor, 0.6, 8);
  glow.position.y = 2;
  group.add(glow);
  return crystalColor;
}

export function createCrystalCluster(position: THREE.Vector3, scale: number = 1): HarvestableCrystal {
  const group = new THREE.Group();
  addProceduralCrystalMesh(group);

  group.position.copy(position);
  group.scale.setScalar(scale);
  group.rotation.y = Math.random() * Math.PI * 2;

  const crystal: HarvestableCrystal = {
    group,
    health: 3,
    maxHealth: 3,
    baseScale: scale,
    chipping: false,
    chipTime: 0,
    respawnAt: 0,
  };

  void mountCrystalClusterModel(crystal, scale);
  return crystal;
}

export async function mountCrystalClusterModel(
  crystal: HarvestableCrystal,
  scale: number = 1,
): Promise<void> {
  try {
    const model = await cloneIslandResource('gem');
    const glowColors = [0x88ddff, 0xaa66ff, 0x66ffaa, 0xff88cc];
    const glowColor = glowColors[Math.floor(Math.random() * glowColors.length)];
    crystal.group.clear();
    fitModelToHeight(model, harvestFitHeightM('gem', scale));
    crystal.group.add(model);

    const glow = new THREE.PointLight(glowColor, 0.8, 10);
    glow.position.y = 1.5 * scale;
    crystal.group.add(glow);
  } catch (err) {
    console.warn('[CrystalCluster] GLB unavailable, keeping procedural mesh', err);
  }
}

// ── Hemp Plant ───────────────────────────────────────────────────

export interface HarvestableHemp {
  group: THREE.Group;
  health: number;
  maxHealth: number;
  baseScale: number;
  respawnAt: number;
  nodeId?: string;
}

export function createHempPlant(position: THREE.Vector3, scale: number = 1): HarvestableHemp {
  const group = new THREE.Group();

  const stalkMat = new THREE.MeshLambertMaterial({ color: 0x4a7a2a });
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x3a8c2a, side: THREE.DoubleSide });

  // Central stalk
  const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 2.5, 4), stalkMat);
  stalk.position.y = 1.25;
  stalk.castShadow = true;
  group.add(stalk);

  // Fan leaves (cannabis-style)
  for (let i = 0; i < 5; i++) {
    const y = 0.8 + i * 0.35;
    const angle = (i / 5) * Math.PI * 2 + Math.random() * 0.5;
    const leaf = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.3), leafMat);
    leaf.position.set(Math.cos(angle) * 0.3, y, Math.sin(angle) * 0.3);
    leaf.rotation.set(-0.3, angle, (Math.random() - 0.5) * 0.3);
    group.add(leaf);
  }

  // Top bud cluster
  const budGeo = new THREE.SphereGeometry(0.25, 6, 6);
  const budMat = new THREE.MeshLambertMaterial({ color: 0x5a9a3a });
  const bud = new THREE.Mesh(budGeo, budMat);
  bud.position.y = 2.5;
  bud.scale.set(1, 1.3, 1);
  group.add(bud);

  group.position.copy(position);
  group.scale.setScalar(scale);

  return { group, health: 2, maxHealth: 2, baseScale: scale, respawnAt: 0 };
}

// ── Scrap Pile ───────────────────────────────────────────────────

export interface HarvestableScrap {
  group: THREE.Group;
  health: number;
  maxHealth: number;
  baseScale: number;
  respawnAt: number;
  nodeId?: string;
}

export function createScrapPile(position: THREE.Vector3, scale: number = 1): HarvestableScrap {
  const group = new THREE.Group();
  const metalMat = new THREE.MeshStandardMaterial({ color: 0x7a7a82, roughness: 0.7, metalness: 0.6 });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9 });

  for (let i = 0; i < 5 + Math.floor(Math.random() * 4); i++) {
    const useMetal = Math.random() > 0.35;
    const mesh = new THREE.Mesh(
      useMetal ? new THREE.BoxGeometry(0.4, 0.15, 0.3) : new THREE.BoxGeometry(0.5, 0.12, 0.2),
      useMetal ? metalMat : woodMat,
    );
    mesh.position.set(
      (Math.random() - 0.5) * 1.2,
      0.1 + Math.random() * 0.4,
      (Math.random() - 0.5) * 1.2,
    );
    mesh.rotation.set(Math.random() * 0.5, Math.random() * Math.PI, Math.random() * 0.5);
    mesh.castShadow = true;
    group.add(mesh);
  }

  group.position.copy(position);
  group.scale.setScalar(scale);
  return { group, health: 2, maxHealth: 2, baseScale: scale, respawnAt: 0 };
}

// ── Flower Patch ─────────────────────────────────────────────────

export interface HarvestableFlower {
  group: THREE.Group;
  health: number;
  maxHealth: number;
  baseScale: number;
  respawnAt: number;
  nodeId?: string;
}

const FLOWER_COLORS = [0xff6b8a, 0xffaa33, 0xff55ff, 0x55aaff, 0xffee44, 0xff4466];

export function createFlowerPatch(position: THREE.Vector3, scale: number = 1): HarvestableFlower {
  const group = new THREE.Group();

  for (let i = 0; i < 4 + Math.floor(Math.random() * 4); i++) {
    const color = FLOWER_COLORS[Math.floor(Math.random() * FLOWER_COLORS.length)];
    const dx = (Math.random() - 0.5) * 1.5;
    const dz = (Math.random() - 0.5) * 1.5;
    const h = 0.5 + Math.random() * 0.6;

    // Stem
    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.04, h, 3),
      new THREE.MeshLambertMaterial({ color: 0x3a7a2a }),
    );
    stem.position.set(dx, h / 2, dz);
    group.add(stem);

    // Petals (simple sphere)
    const petal = new THREE.Mesh(
      new THREE.SphereGeometry(0.15, 6, 6),
      new THREE.MeshLambertMaterial({ color }),
    );
    petal.position.set(dx, h + 0.1, dz);
    petal.scale.set(1, 0.6, 1);
    group.add(petal);

    // Center
    const center = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 4, 4),
      new THREE.MeshLambertMaterial({ color: 0xffee88 }),
    );
    center.position.set(dx, h + 0.15, dz);
    group.add(center);
  }

  group.position.copy(position);
  group.scale.setScalar(scale);

  return { group, health: 1, maxHealth: 1, baseScale: scale, respawnAt: 0 };
}

// ── Dock Structure ───────────────────────────────────────────────

export function createDock(position: THREE.Vector3): THREE.Group {
  const group = new THREE.Group();
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x8B6914, roughness: 0.85 });
  const darkWoodMat = new THREE.MeshStandardMaterial({ color: 0x654321, roughness: 0.9 });

  // Main platform (planks)
  const platform = new THREE.Mesh(new THREE.BoxGeometry(4, 0.3, 10), woodMat);
  platform.position.set(0, 1, -5);
  platform.castShadow = true;
  platform.receiveShadow = true;
  group.add(platform);

  // Support pillars
  for (const [px, pz] of [[-1.5, -1], [1.5, -1], [-1.5, -5], [1.5, -5], [-1.5, -9], [1.5, -9]]) {
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 4, 6), darkWoodMat);
    pillar.position.set(px, -0.8, pz);
    pillar.castShadow = true;
    group.add(pillar);
  }

  // Side railings
  for (const side of [-1, 1]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.8, 10), woodMat);
    rail.position.set(side * 1.9, 1.55, -5);
    group.add(rail);

    // Railing posts
    for (const z of [-1, -4, -7, -9.5]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.2, 4), darkWoodMat);
      post.position.set(side * 1.9, 1.75, z);
      group.add(post);
    }
  }

  // Mooring post at end
  const moor = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 1.5, 6), darkWoodMat);
  moor.position.set(0, 1.9, -9.5);
  group.add(moor);

  // Rope coil (torus)
  const rope = new THREE.Mesh(
    new THREE.TorusGeometry(0.3, 0.06, 6, 12),
    new THREE.MeshLambertMaterial({ color: 0xaa8855 }),
  );
  rope.position.set(0, 1.3, -9.5);
  rope.rotation.x = Math.PI / 2;
  group.add(rope);

  // Lantern at dock end
  const lanternPole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2, 4), darkWoodMat);
  lanternPole.position.set(1.5, 2.2, -9.5);
  group.add(lanternPole);

  const lanternLight = new THREE.PointLight(0xffaa44, 0.8, 15);
  lanternLight.position.set(1.5, 3.2, -9.5);
  group.add(lanternLight);

  const lanternBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.3, 0.4, 0.3),
    new THREE.MeshStandardMaterial({ color: 0xffcc44, emissive: 0xffaa22, emissiveIntensity: 0.6 }),
  );
  lanternBody.position.set(1.5, 3.3, -9.5);
  group.add(lanternBody);

  // Position the dock facing water (rotation applied by caller)
  group.position.copy(position);

  // Face toward water (negative Y direction from beach)
  group.rotation.y = Math.atan2(-position.x, -position.z) + Math.PI;

  return group;
}
