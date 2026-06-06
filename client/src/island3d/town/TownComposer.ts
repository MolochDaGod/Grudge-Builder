/**
 * TownComposer — assembles a multi-model town scene from a FactionTown definition.
 *
 * Handles:
 *   1. Loading the primary exterior GLB (TownSceneLoader)
 *   2. Loading overlay GLBs (orc buildings, dwarf gate) and placing pieces
 *   3. Loading shrine model with faction-tinted materials
 *   4. Adding procedural decoration (lava channels, gravestones, crystals)
 *   5. Registering interior door trigger spheres
 *   6. Building the nav grid
 *   7. Populating NPCs (TownNPCManager)
 *
 * Call `composeTown(town)` to get a fully assembled scene + update loop.
 */

import * as THREE from 'three';
import type { FactionTown, TownInterior, TownComposition } from '@shared/definitions/factionTowns';
import { loadTownScene, type TownSceneResult } from './TownSceneLoader';
import { createTownNPCs, type TownNPCManagerResult } from './TownNPCManager';
import { buildNavGrid, type NavGrid } from './TownNavMesh';
import { resolveModelUrl } from '@/lib/modelManifest';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

// ── Types ────────────────────────────────────────────────────────────────────

export interface DoorTrigger {
  interior: TownInterior;
  /** World-space sphere for proximity check */
  position: THREE.Vector3;
  radius: number;
  /** Visual marker mesh */
  marker: THREE.Mesh;
}

export interface ComposedTown {
  /** Root scene group — add to your Three.js scene */
  root: THREE.Group;
  /** The base town scene result (lighting, spawns, etc.) */
  scene: TownSceneResult;
  /** NPC manager */
  npcs: TownNPCManagerResult;
  /** Pathfinding grid */
  navGrid: NavGrid;
  /** Door triggers for entering building interiors */
  doors: DoorTrigger[];
  /** Currently loaded interior (null = exterior view) */
  activeInterior: LoadedInterior | null;
  /** Call every frame */
  update: (dt: number, elapsed: number) => void;
  /** Check if player is near a door trigger — returns the interior def */
  checkDoorProximity: (playerPos: THREE.Vector3) => TownInterior | null;
  /** Enter an interior (loads GLB, swaps camera) */
  enterInterior: (interior: TownInterior) => Promise<void>;
  /** Exit current interior (restores exterior) */
  exitInterior: () => void;
  /** Dispose everything */
  dispose: () => void;
}

export interface LoadedInterior {
  interior: TownInterior;
  root: THREE.Group;
  dispose: () => void;
}

// ── Shared GLTF loader ───────────────────────────────────────────────────────

const gltfLoader = new GLTFLoader();
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
gltfLoader.setDRACOLoader(dracoLoader);

async function loadGLB(url: string): Promise<GLTF> {
  return new Promise<GLTF>((resolve, reject) => {
    gltfLoader.load(url, resolve, undefined, reject);
  });
}

// ── Main Composer ────────────────────────────────────────────────────────────

export async function composeTown(town: FactionTown): Promise<ComposedTown> {
  // 1. Load primary exterior via TownSceneLoader
  const scene = await loadTownScene(town);
  const root = scene.root;

  // 2. Load overlay models and place pieces
  await loadOverlays(town.composition, root);

  // 3. Load shrine model if specified
  if (town.composition.shrinePath) {
    await loadShrine(town, root);
  }

  // 4. Add procedural faction decoration
  addFactionDecoration(town, root);

  // 5. Register door triggers for interiors
  const doors = createDoorTriggers(town, root);

  // 6. Build nav grid
  const navGrid = buildNavGrid(town.navmesh);

  // 7. Populate NPCs
  const npcs = await createTownNPCs(town, scene);
  root.add(npcs.root);

  // Interior state
  let activeInterior: LoadedInterior | null = null;

  // ── Update ─────────────────────────────────────────────────

  function update(dt: number, elapsed: number): void {
    scene.update(dt, elapsed);
    npcs.update(dt);
  }

  function checkDoorProximity(playerPos: THREE.Vector3): TownInterior | null {
    for (const door of doors) {
      if (playerPos.distanceTo(door.position) < door.radius) {
        return door.interior;
      }
    }
    return null;
  }

  async function enterInterior(interior: TownInterior): Promise<void> {
    if (activeInterior) exitInterior();

    try {
      const url = resolveModelUrl(interior.modelPath);
      const gltf = await loadGLB(url);
      const interiorRoot = new THREE.Group();
      interiorRoot.name = `interior_${interior.id}`;

      const scene = gltf.scene.clone(true);
      scene.scale.setScalar(interior.modelScale);
      scene.position.set(...interior.modelOffset);

      // Enable shadows
      scene.traverse(child => {
        if ((child as THREE.Mesh).isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      interiorRoot.add(scene);

      // Add interior lighting
      const ambLight = new THREE.AmbientLight(0xffffff, 0.5);
      interiorRoot.add(ambLight);
      const pointLight = new THREE.PointLight(0xffaa44, 0.8, 30);
      pointLight.position.set(0, 5, 0);
      pointLight.castShadow = true;
      interiorRoot.add(pointLight);

      // Hide exterior, show interior
      root.visible = false;
      root.parent?.add(interiorRoot);

      activeInterior = {
        interior,
        root: interiorRoot,
        dispose: () => {
          interiorRoot.traverse(child => {
            if ((child as THREE.Mesh).geometry) (child as THREE.Mesh).geometry.dispose();
            if ((child as THREE.Mesh).material) {
              const mats = Array.isArray((child as THREE.Mesh).material)
                ? (child as THREE.Mesh).material as THREE.Material[]
                : [(child as THREE.Mesh).material as THREE.Material];
              mats.forEach(m => m.dispose());
            }
          });
          interiorRoot.removeFromParent();
        },
      };
    } catch (err) {
      console.warn(`[TownComposer] Failed to load interior ${interior.id}:`, err);
    }
  }

  function exitInterior(): void {
    if (activeInterior) {
      activeInterior.dispose();
      activeInterior = null;
      root.visible = true;
    }
  }

  function dispose(): void {
    exitInterior();
    npcs.dispose();
    scene.dispose();
  }

  return {
    root,
    scene,
    npcs,
    navGrid,
    doors,
    get activeInterior() { return activeInterior; },
    update,
    checkDoorProximity,
    enterInterior,
    exitInterior,
    dispose,
  };
}

// ── Overlay Loader ───────────────────────────────────────────────────────────

async function loadOverlays(comp: TownComposition, root: THREE.Group): Promise<void> {
  for (const overlay of comp.overlays) {
    try {
      const url = resolveModelUrl(overlay.modelPath);
      const gltf = await loadGLB(url);

      if (overlay.placements && overlay.placements.length > 0) {
        // Place individual pieces from the overlay set
        for (const placement of overlay.placements) {
          const piece = new THREE.Group();
          piece.name = `overlay_piece_${placement.pieceFilter || 'all'}`;

          // Clone the full scene and optionally filter to matching nodes
          const cloned = gltf.scene.clone(true);
          if (placement.pieceFilter) {
            // Find the node matching the filter and only add that subtree
            let found = false;
            cloned.traverse(node => {
              if (found) return;
              if (node.name === placement.pieceFilter || node.name.startsWith(placement.pieceFilter + '_')) {
                const extracted = node.clone(true);
                // Scale the individual piece 3-4x for character walkability
                extracted.scale.setScalar(overlay.scale * 3.5);
                piece.add(extracted);
                found = true;
              }
            });
            if (!found) {
              // Fallback: use the whole scene scaled down
              cloned.scale.setScalar(overlay.scale * 0.5);
              piece.add(cloned);
            }
          } else {
            cloned.scale.setScalar(overlay.scale);
            piece.add(cloned);
          }

          piece.position.set(...placement.position);
          piece.rotation.y = placement.rotation;

          // Enable shadows
          piece.traverse(child => {
            if ((child as THREE.Mesh).isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });

          root.add(piece);
        }
      } else {
        // Single overlay — place whole model
        const group = gltf.scene.clone(true);
        group.scale.setScalar(overlay.scale);
        group.position.set(...overlay.offset);
        group.traverse(child => {
          if ((child as THREE.Mesh).isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        root.add(group);
      }
    } catch (err) {
      console.warn(`[TownComposer] Failed to load overlay ${overlay.modelPath}:`, err);
    }
  }
}

// ── Shrine Loader ────────────────────────────────────────────────────────────

async function loadShrine(town: FactionTown, root: THREE.Group): Promise<void> {
  const comp = town.composition;
  if (!comp.shrinePath) return;

  try {
    const url = resolveModelUrl(comp.shrinePath);
    const gltf = await loadGLB(url);
    const shrine = gltf.scene.clone(true);
    shrine.scale.setScalar(comp.shrineScale || 1);
    shrine.position.set(...(comp.shrineOffset || [0, 0, 0]));

    // Place at the shrine spawn point
    const shrineSp = town.spawnPoints.find(sp => sp.category === 'shrine');
    if (shrineSp) {
      shrine.position.set(...shrineSp.position);
    }

    shrine.name = 'shrine_model';

    // Tint materials to faction accent color
    const accentColor = new THREE.Color(town.ambience.accentLightColor);
    shrine.traverse(child => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
        if (mat && mat.emissive !== undefined) {
          mat.emissive = accentColor;
          mat.emissiveIntensity = 0.2;
        }
      }
    });

    root.add(shrine);
  } catch (err) {
    console.warn(`[TownComposer] Failed to load shrine:`, err);
  }
}

// ── Faction Decoration ───────────────────────────────────────────────────────

function addFactionDecoration(town: FactionTown, root: THREE.Group): void {
  switch (town.factionId) {
    case 'legion':
      addLegionDecoration(root);
      break;
    case 'fabled':
      addFabledDecoration(root);
      break;
    // Crusade uses the exterior model as-is (castle_town.glb has built-in detail)
  }
}

function addLegionDecoration(root: THREE.Group): void {
  const decoGroup = new THREE.Group();
  decoGroup.name = 'legion_decoration';

  // Lava channels — emissive strips between buildings
  const lavaMat = new THREE.MeshStandardMaterial({
    color: 0xff4400,
    emissive: 0xff4400,
    emissiveIntensity: 0.8,
    roughness: 0.2,
  });
  for (const z of [-5, 5, 15]) {
    const geo = new THREE.PlaneGeometry(60, 2.5);
    geo.rotateX(-Math.PI / 2);
    const lava = new THREE.Mesh(geo, lavaMat);
    lava.position.set(0, 0.05, z);
    decoGroup.add(lava);
  }

  // Graveyard — tombstones around center
  const tombMat = new THREE.MeshStandardMaterial({ color: 0x4a4a4a, roughness: 0.9 });
  for (let i = 0; i < 16; i++) {
    const angle = (i / 16) * Math.PI * 2;
    const radius = 8 + Math.random() * 6;
    const geo = new THREE.BoxGeometry(0.6, 1.5 + Math.random(), 0.2);
    const tomb = new THREE.Mesh(geo, tombMat);
    tomb.position.set(
      Math.cos(angle) * radius,
      0.75,
      Math.sin(angle) * radius - 5,
    );
    tomb.rotation.y = angle + Math.random() * 0.3;
    tomb.rotation.z = (Math.random() - 0.5) * 0.15; // slightly tilted
    tomb.castShadow = true;
    decoGroup.add(tomb);
  }

  // Bone piles — small white sphere clusters
  const boneMat = new THREE.MeshStandardMaterial({ color: 0xe8e0d0, roughness: 0.8 });
  for (let i = 0; i < 8; i++) {
    const boneGeo = new THREE.SphereGeometry(0.3 + Math.random() * 0.2, 4, 4);
    const bone = new THREE.Mesh(boneGeo, boneMat);
    bone.position.set(
      (Math.random() - 0.5) * 30,
      0.2,
      (Math.random() - 0.5) * 30,
    );
    decoGroup.add(bone);
  }

  root.add(decoGroup);
}

function addFabledDecoration(root: THREE.Group): void {
  const decoGroup = new THREE.Group();
  decoGroup.name = 'fabled_decoration';

  // Crystal spires
  const crystalMat = new THREE.MeshStandardMaterial({
    color: 0x88ddff,
    emissive: 0x22c55e,
    emissiveIntensity: 0.3,
    transparent: true,
    opacity: 0.8,
    roughness: 0.2,
  });
  const spirePositions: [number, number][] = [
    [-14, 12], [14, 12], [-8, -20], [8, -20], [0, -25],
  ];
  for (const [x, z] of spirePositions) {
    const height = 6 + Math.random() * 6;
    const geo = new THREE.ConeGeometry(1 + Math.random(), height, 6);
    const spire = new THREE.Mesh(geo, crystalMat);
    spire.position.set(x, height / 2, z);
    spire.castShadow = true;
    decoGroup.add(spire);
  }

  // Wind bridge visual — translucent arc between platforms
  const bridgeMat = new THREE.MeshStandardMaterial({
    color: 0xb0c4de,
    transparent: true,
    opacity: 0.3,
    roughness: 0.4,
    side: THREE.DoubleSide,
  });
  const bridgeGeo = new THREE.PlaneGeometry(20, 3, 16, 1);
  bridgeGeo.rotateX(-Math.PI / 2);
  // Curve it slightly upward
  const pos = bridgeGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    pos.setY(i, Math.sin((x / 20 + 0.5) * Math.PI) * 2);
  }
  pos.needsUpdate = true;
  const bridge = new THREE.Mesh(bridgeGeo, bridgeMat);
  bridge.position.set(0, 5, 0);
  decoGroup.add(bridge);

  root.add(decoGroup);
}

// ── Door Triggers ────────────────────────────────────────────────────────────

function createDoorTriggers(town: FactionTown, root: THREE.Group): DoorTrigger[] {
  const triggers: DoorTrigger[] = [];

  for (const interior of town.interiors) {
    const pos = new THREE.Vector3(...interior.doorPosition);

    // Visual door marker — glowing ring on the ground
    const ringGeo = new THREE.RingGeometry(interior.doorRadius - 0.3, interior.doorRadius, 24);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      emissive: 0xfbbf24,
      emissiveIntensity: 0.4,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const marker = new THREE.Mesh(ringGeo, ringMat);
    marker.position.copy(pos);
    marker.position.y = 0.05;
    marker.name = `door_${interior.id}`;
    root.add(marker);

    triggers.push({
      interior,
      position: pos,
      radius: interior.doorRadius,
      marker,
    });
  }

  return triggers;
}
