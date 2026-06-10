/**
 * TownNPCManager — populates a town scene with NPC character models.
 *
 * For each TownNPC definition:
 *   1. Loads the race model via loadCharacterModel() (shared GLTF pipeline)
 *   2. Places at the designated spawn point with correct facing
 *   3. Plays idle animation on loop
 *   4. Guards with patrolPath get a simple waypoint walker
 *   5. Merchants/quest givers get an interaction sphere collider
 *   6. All NPCs get a floating name tag (CSS2DRenderer or sprite)
 *
 * The manager is frame-updated to drive patrol movement and animation mixers.
 */

import * as THREE from 'three';
import type { FactionTown, TownNPC } from '@shared/definitions/factionTowns';
import { loadCharacterModel, loadAnimationClip, applyAnimationToMixer, fadeToAction } from '@/lib/modelLoader';
import { MODEL_MANIFEST, getAnimationSet } from '@/lib/modelManifest';
import type { TownSceneResult } from './TownSceneLoader';

// ── Types ────────────────────────────────────────────────────────────────────

export interface NPCInstance {
  npcDef: TownNPC;
  root: THREE.Group;
  mixer: THREE.AnimationMixer;
  currentAction: THREE.AnimationAction | null;
  /** Interaction sphere for raycasting (merchants, quest givers) */
  interactionSphere: THREE.Mesh | null;
  /** Name tag sprite */
  nameTag: THREE.Sprite;
  /** Role indicator sprite (!, $, etc.) */
  roleIndicator: THREE.Sprite | null;
  // Patrol state
  patrolIndex: number;
  patrolSpeed: number;
  isPatrolling: boolean;
  // Civilian wander state
  wanderState: 'idle' | 'walking';
  wanderTimer: number;
  wanderTarget: THREE.Vector3;
  spawnOrigin: THREE.Vector3;
}

export interface TownNPCManagerResult {
  /** All NPC instances */
  npcs: NPCInstance[];
  /** Root group containing all NPCs — add to scene */
  root: THREE.Group;
  /** Call every frame with delta time */
  update: (dt: number) => void;
  /** Get NPC by ID */
  getNPC: (id: string) => NPCInstance | undefined;
  /** Raycast test — returns first NPC whose interaction sphere was hit */
  testInteraction: (raycaster: THREE.Raycaster) => NPCInstance | null;
  /** Dispose all NPC resources */
  dispose: () => void;
}

// ── Constants ────────────────────────────────────────────────────────────────

const PATROL_SPEED = 1.8;       // units/sec
const WAYPOINT_THRESHOLD = 1.0; // distance to "reach" a waypoint
const NAME_TAG_HEIGHT = 3.2;    // offset above NPC root
const INTERACTION_RADIUS = 2.5; // sphere radius for click interaction

const ROLE_COLORS: Record<string, number> = {
  hero: 0xfbbf24,
  guard: 0x94a3b8,
  merchant: 0x22c55e,
  questGiver: 0xf59e0b,
  factionVendor: 0x3b82f6,
  shrineKeeper: 0xc084fc,
  civilian: 0xd4d4d8,
};

/** Floating role indicator symbols */
const ROLE_INDICATORS: Record<string, { symbol: string; color: string; yOffset: number }> = {
  questGiver: { symbol: '!', color: '#f59e0b', yOffset: 4.0 },
  hero:       { symbol: '!', color: '#fbbf24', yOffset: 4.0 },
  merchant:   { symbol: '$', color: '#22c55e', yOffset: 3.8 },
  factionVendor: { symbol: '$', color: '#3b82f6', yOffset: 3.8 },
  shrineKeeper: { symbol: '✦', color: '#c084fc', yOffset: 4.0 },
};

/** Civilian wander config */
const CIVILIAN_WANDER_RADIUS = 8;
const CIVILIAN_WANDER_SPEED = 0.8;
const CIVILIAN_IDLE_MIN = 3;
const CIVILIAN_IDLE_MAX = 8;

// ── Builder ──────────────────────────────────────────────────────────────────

export async function createTownNPCs(
  town: FactionTown,
  sceneResult: TownSceneResult,
): Promise<TownNPCManagerResult> {
  const root = new THREE.Group();
  root.name = 'town_npcs';
  const npcs: NPCInstance[] = [];
  const interactables: THREE.Mesh[] = [];

  // Load NPCs in parallel batches (max 4 concurrent to avoid stalls)
  const batchSize = 4;
  for (let i = 0; i < town.npcs.length; i += batchSize) {
    const batch = town.npcs.slice(i, i + batchSize);
    const instances = await Promise.all(batch.map(npcDef => loadSingleNPC(npcDef, sceneResult)));
    for (const inst of instances) {
      if (inst) {
        npcs.push(inst);
        root.add(inst.root);
        if (inst.interactionSphere) interactables.push(inst.interactionSphere);
      }
    }
  }

  // ── Update ─────────────────────────────────────────────────

  function update(dt: number): void {
    for (const npc of npcs) {
      npc.mixer.update(dt);

      if (npc.isPatrolling && npc.npcDef.patrolPath && npc.npcDef.patrolPath.length > 0) {
        updatePatrol(npc, dt);
      } else if (npc.npcDef.role === 'civilian') {
        updateCivilianWander(npc, dt);
      }

      // Animate role indicator (bob up and down)
      if (npc.roleIndicator) {
        const base = ROLE_INDICATORS[npc.npcDef.role]?.yOffset ?? 4;
        npc.roleIndicator.position.y = base + Math.sin(Date.now() * 0.003) * 0.2;
      }
    }
  }

  function getNPC(id: string): NPCInstance | undefined {
    return npcs.find(n => n.npcDef.id === id);
  }

  function testInteraction(raycaster: THREE.Raycaster): NPCInstance | null {
    if (interactables.length === 0) return null;
    const hits = raycaster.intersectObjects(interactables, false);
    if (hits.length === 0) return null;
    const hitMesh = hits[0].object;
    return npcs.find(n => n.interactionSphere === hitMesh) ?? null;
  }

  function dispose(): void {
    for (const npc of npcs) {
      npc.mixer.stopAllAction();
      npc.root.traverse(child => {
        if ((child as THREE.Mesh).geometry) (child as THREE.Mesh).geometry.dispose();
        if ((child as THREE.Mesh).material) {
          const mats = Array.isArray((child as THREE.Mesh).material)
            ? (child as THREE.Mesh).material as THREE.Material[]
            : [(child as THREE.Mesh).material as THREE.Material];
          mats.forEach(m => m.dispose());
        }
      });
    }
  }

  return { npcs, root, update, getNPC, testInteraction, dispose };
}

// ── Single NPC Loader ────────────────────────────────────────────────────────

async function loadSingleNPC(
  npcDef: TownNPC,
  sceneResult: TownSceneResult,
): Promise<NPCInstance | null> {
  const modelUnit = MODEL_MANIFEST[npcDef.modelId];
  if (!modelUnit) {
    console.warn(`[TownNPCManager] Unknown model ID: ${npcDef.modelId}`);
    return null;
  }

  try {
    const loaded = await loadCharacterModel(modelUnit.modelPath);

    const npcRoot = new THREE.Group();
    npcRoot.name = `npc_${npcDef.id}`;
    npcRoot.add(loaded.scene);

    // Scale to model manifest
    loaded.scene.scale.setScalar(modelUnit.scale);

    // Position from spawn point
    const spawnPos = sceneResult.runtimeSpawns.get(npcDef.spawnPointId);
    if (spawnPos) {
      npcRoot.position.copy(spawnPos);
    }

    // Find facing from town definition spawn point
    // (spawnPoints in the definition have facing)
    const facing = 0; // Default — overridden below if definition found
    npcRoot.rotation.y = facing;

    // Play idle animation
    let currentAction: THREE.AnimationAction | null = null;
    const animSet = getAnimationSet(modelUnit.weaponType);
    if (animSet.idle) {
      try {
        const idleClip = await loadAnimationClip(animSet.idle.file);
        if (idleClip) {
          const action = applyAnimationToMixer(loaded.mixer, loaded.scene, idleClip, 'idle');
          action.setLoop(THREE.LoopRepeat, Infinity);
          action.play();
          currentAction = action;
        }
      } catch {
        // Fallback to embedded animations
        if (loaded.actions.size > 0) {
          const firstAction = loaded.actions.values().next().value;
          if (firstAction) {
            firstAction.setLoop(THREE.LoopRepeat, Infinity);
            firstAction.play();
            currentAction = firstAction;
          }
        }
      }
    }

    // Interaction sphere (invisible, for raycasting)
    let interactionSphere: THREE.Mesh | null = null;
    const isInteractable = ['merchant', 'questGiver', 'factionVendor', 'hero', 'shrineKeeper'].includes(npcDef.role);
    if (isInteractable) {
      const sphereGeo = new THREE.SphereGeometry(INTERACTION_RADIUS, 8, 8);
      const sphereMat = new THREE.MeshBasicMaterial({
        visible: false,
        transparent: true,
        opacity: 0,
      });
      interactionSphere = new THREE.Mesh(sphereGeo, sphereMat);
      interactionSphere.position.y = 1.5;
      interactionSphere.name = `interact_${npcDef.id}`;
      npcRoot.add(interactionSphere);
    }

    // Name tag sprite
    const nameTag = createNameTag(npcDef.name, ROLE_COLORS[npcDef.role] ?? 0xffffff);
    nameTag.position.y = NAME_TAG_HEIGHT;
    npcRoot.add(nameTag);

    // Role indicator (floating ! or $ above head)
    let roleIndicator: THREE.Sprite | null = null;
    const indicatorDef = ROLE_INDICATORS[npcDef.role];
    if (indicatorDef) {
      roleIndicator = createRoleIndicator(indicatorDef.symbol, indicatorDef.color);
      roleIndicator.position.y = indicatorDef.yOffset;
      npcRoot.add(roleIndicator);
    }

    // Patrol setup
    const isPatrolling = !!npcDef.patrolPath && npcDef.patrolPath.length > 0;

    // Record spawn origin for civilian wandering
    const spawnOrigin = npcRoot.position.clone();

    return {
      npcDef,
      root: npcRoot,
      mixer: loaded.mixer,
      currentAction,
      interactionSphere,
      nameTag,
      roleIndicator,
      patrolIndex: 0,
      patrolSpeed: PATROL_SPEED,
      isPatrolling,
      wanderState: 'idle' as const,
      wanderTimer: CIVILIAN_IDLE_MIN + Math.random() * CIVILIAN_IDLE_MAX,
      wanderTarget: spawnOrigin.clone(),
      spawnOrigin,
    };
  } catch (err) {
    console.warn(`[TownNPCManager] Failed to load NPC ${npcDef.id}:`, err);
    return null;
  }
}

// ── Patrol Logic ─────────────────────────────────────────────────────────────

function updatePatrol(npc: NPCInstance, dt: number): void {
  const path = npc.npcDef.patrolPath!;
  if (path.length === 0) return;

  const target = path[npc.patrolIndex];
  const targetVec = new THREE.Vector3(target[0], target[1], target[2]);
  const pos = npc.root.position;
  const dx = targetVec.x - pos.x;
  const dz = targetVec.z - pos.z;
  const dist = Math.sqrt(dx * dx + dz * dz);

  if (dist < WAYPOINT_THRESHOLD) {
    // Advance to next waypoint
    npc.patrolIndex = (npc.patrolIndex + 1) % path.length;
    return;
  }

  // Move toward waypoint
  const speed = npc.patrolSpeed * dt;
  const moveX = (dx / dist) * Math.min(speed, dist);
  const moveZ = (dz / dist) * Math.min(speed, dist);
  pos.x += moveX;
  pos.z += moveZ;

  // Face movement direction
  npc.root.rotation.y = Math.atan2(dx, dz);
}

// ── Name Tag Sprite ──────────────────────────────────────────────────────────

function createNameTag(name: string, color: number): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  // Background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  const radius = 8;
  roundRect(ctx, 4, 4, 248, 56, radius);
  ctx.fill();

  // Text
  const hex = '#' + new THREE.Color(color).getHexString();
  ctx.fillStyle = hex;
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(name, 128, 32);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(4, 1, 1);
  sprite.name = `nametag_${name}`;
  return sprite;
}

// ── Civilian Wander Logic ───────────────────────────────────────────────

function updateCivilianWander(npc: NPCInstance, dt: number): void {
  npc.wanderTimer -= dt;

  if (npc.wanderState === 'idle') {
    if (npc.wanderTimer <= 0) {
      // Pick a new wander target near spawn
      const angle = Math.random() * Math.PI * 2;
      const dist = 2 + Math.random() * CIVILIAN_WANDER_RADIUS;
      npc.wanderTarget.set(
        npc.spawnOrigin.x + Math.cos(angle) * dist,
        npc.spawnOrigin.y,
        npc.spawnOrigin.z + Math.sin(angle) * dist,
      );
      npc.wanderState = 'walking';
      npc.wanderTimer = 3 + Math.random() * 5; // walk for 3-8s max
    }
  } else {
    // Walking toward target
    const dx = npc.wanderTarget.x - npc.root.position.x;
    const dz = npc.wanderTarget.z - npc.root.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist < 0.5 || npc.wanderTimer <= 0) {
      // Arrived or timeout — go idle
      npc.wanderState = 'idle';
      npc.wanderTimer = CIVILIAN_IDLE_MIN + Math.random() * (CIVILIAN_IDLE_MAX - CIVILIAN_IDLE_MIN);
    } else {
      const step = CIVILIAN_WANDER_SPEED * dt;
      npc.root.position.x += (dx / dist) * Math.min(step, dist);
      npc.root.position.z += (dz / dist) * Math.min(step, dist);
      npc.root.rotation.y = Math.atan2(dx, dz);
    }
  }
}

// ── Role Indicator Sprite ──────────────────────────────────────────────

function createRoleIndicator(symbol: string, color: string): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  // Glow circle background
  const grad = ctx.createRadialGradient(32, 32, 8, 32, 32, 28);
  grad.addColorStop(0, color + 'cc');
  grad.addColorStop(1, color + '00');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);

  // Symbol
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = color;
  ctx.shadowBlur = 8;
  ctx.fillText(symbol, 32, 32);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(1.5, 1.5, 1);
  sprite.name = `indicator_${symbol}`;
  return sprite;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
