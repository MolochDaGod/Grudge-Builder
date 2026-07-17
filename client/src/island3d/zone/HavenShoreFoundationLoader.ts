/**
 * HavenShoreFoundationLoader — load Fruzer islands GLB as Haven Port foundation.
 *
 * - Keeps islands, buildings, props, boats, nature
 * - STRIPS embedded Water / Cube water so zone ocean is the only water surface
 * - Upgrades island materials to tropical PBR-ish palette
 * - Spawns harvest markers / NPC markers / vessel tags from havenShoreFoundation SSOT
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {
  HAVEN_SHORE_FOUNDATION,
  FRUZER_STRIP_NAME_PATTERNS,
  FRUZER_HARVESTABLE_NATURE_PATTERNS,
  type HavenShoreFoundationConfig,
  type HavenNpcPlacement,
  type HavenVesselPlacement,
  type HavenAnimalPlacement,
  type HavenHarvestPlacement,
} from '@shared/definitions/havenShoreFoundation';
import { removeDuplicateWaterMeshes } from '../terrain/WaterMaterial';
import { resolveModelUrl } from '@/lib/modelManifest';

export interface HavenFoundationResult {
  root: THREE.Group;
  config: HavenShoreFoundationConfig;
  /** Collider-ish meshes (islands + buildings) for ground sample */
  groundMeshes: THREE.Object3D[];
  harvestMarkers: THREE.Object3D[];
  npcMarkers: THREE.Object3D[];
  vesselMarkers: THREE.Object3D[];
  animalMarkers: THREE.Object3D[];
  update: (dt: number, elapsed: number) => void;
  dispose: () => void;
}

function shouldStrip(name: string): boolean {
  return FRUZER_STRIP_NAME_PATTERNS.some((re) => re.test(name));
}

function applyIslandTextures(root: THREE.Object3D, cfg: HavenShoreFoundationConfig): void {
  const map = cfg.textureMap;
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh || !mesh.material) return;
    const n = mesh.name || '';
    let palette: { color: number; roughness: number; metalness: number } | null = null;
    for (const key of Object.keys(map) as Array<keyof typeof map>) {
      if (map[key].match.test(n)) {
        palette = map[key];
        break;
      }
    }
    // Also tint unnamed island parts by parent
    if (!palette) {
      let p: THREE.Object3D | null = mesh.parent;
      while (p) {
        const pn = p.name || '';
        if (/island/i.test(pn)) {
          palette = map.sand;
          break;
        }
        if (/palm|tree|grass|shrub/i.test(pn)) {
          palette = map.grass;
          break;
        }
        if (/rock|stone/i.test(pn)) {
          palette = map.rock;
          break;
        }
        p = p.parent;
      }
    }
    if (!palette) return;

    const applyMat = (mat: THREE.Material): THREE.Material => {
      if (mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshPhysicalMaterial) {
        mat.color = new THREE.Color(palette!.color);
        mat.roughness = palette!.roughness;
        mat.metalness = palette!.metalness;
        if (mat.map) {
          mat.map.colorSpace = THREE.SRGBColorSpace;
          mat.map.anisotropy = 4;
        }
        mat.needsUpdate = true;
        return mat;
      }
      // Replace basic/toon materials with standard for better lighting
      return new THREE.MeshStandardMaterial({
        color: palette!.color,
        roughness: palette!.roughness,
        metalness: palette!.metalness,
      });
    };

    if (Array.isArray(mesh.material)) {
      mesh.material = mesh.material.map((m) => applyMat(m));
    } else {
      mesh.material = applyMat(mesh.material);
    }
    mesh.castShadow = true;
    mesh.receiveShadow = true;
  });
}

function stripEmbeddedWaterAndJunk(root: THREE.Object3D): number {
  const doomed: THREE.Object3D[] = [];
  root.traverse((obj) => {
    if (shouldStrip(obj.name || '')) doomed.push(obj);
  });
  // Remove deepest first
  doomed.sort((a, b) => {
    let da = 0;
    let db = 0;
    let p: THREE.Object3D | null = a;
    while (p) {
      da++;
      p = p.parent;
    }
    p = b;
    while (p) {
      db++;
      p = p.parent;
    }
    return db - da;
  });
  let removed = 0;
  for (const o of doomed) {
    o.parent?.remove(o);
    removed++;
  }
  // Also run generic water cleaner
  removeDuplicateWaterMeshes(root);
  return removed;
}

function tagHarvestableNature(root: THREE.Object3D): void {
  root.traverse((obj) => {
    const n = obj.name || '';
    if (FRUZER_HARVESTABLE_NATURE_PATTERNS.some((re) => re.test(n))) {
      obj.userData.havenHarvestVisual = true;
      obj.userData.grudgeLayer = 'harvest_visual';
    }
  });
}

function makeLabelSprite(text: string, color: string): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 256, 64);
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(8, 8, 240, 48);
  ctx.font = 'bold 22px Inter, sans-serif';
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.fillText(text, 128, 40);
  const tex = new THREE.CanvasTexture(canvas);
  const spr = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }),
  );
  spr.scale.set(6, 1.5, 1);
  spr.renderOrder = 25;
  return spr;
}

function placeHarvestMarkers(
  parent: THREE.Group,
  harvest: HavenHarvestPlacement[],
): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const colors: Record<string, number> = {
    woodcutting: 0x8b6914,
    mining: 0xaaaaaa,
    herbalism: 0x22c55e,
    fishing: 0x3b82f6,
    skinning: 0xdc2626,
  };
  for (const h of harvest) {
    const g = new THREE.Group();
    g.name = `haven_harvest_${h.uuid}`;
    g.position.set(h.position[0], h.position[1] + 0.5, h.position[2]);
    g.rotation.y = h.rotation;
    g.userData = {
      uuid: h.uuid,
      resourceId: h.resourceId,
      profession: h.profession,
      respawnSec: h.respawnSec,
      tier: h.tier,
      yield: h.yield,
      harvestTimeSec: h.harvestTimeSec,
      category: 'harvest',
      grudgeLayer: 'haven_harvest',
    };
    const col = colors[h.profession] ?? 0xffffff;
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.55, 10, 10),
      new THREE.MeshStandardMaterial({
        color: col,
        emissive: col,
        emissiveIntensity: 0.35,
        transparent: true,
        opacity: 0.85,
      }),
    );
    g.add(mesh);
    const spr = makeLabelSprite(h.name, '#e2e8f0');
    spr.position.y = 1.8;
    g.add(spr);
    parent.add(g);
    out.push(g);
  }
  return out;
}

function placeNpcMarkers(parent: THREE.Group, npcs: HavenNpcPlacement[]): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const roleColor: Record<string, number> = {
    vendor_general: 0x22c55e,
    vendor_weapons: 0x3b82f6,
    vendor_provisions: 0xa3e635,
    vendor_shipwright: 0x06b6d4,
    mission_giver: 0xf59e0b,
    guard: 0x94a3b8,
    civilian: 0xd4d4d8,
    dockmaster: 0x38bdf8,
  };
  for (const npc of npcs) {
    const g = new THREE.Group();
    g.name = `haven_npc_${npc.uuid}`;
    g.position.set(npc.position[0], npc.position[1], npc.position[2]);
    g.rotation.y = npc.facing;
    g.userData = {
      uuid: npc.uuid,
      role: npc.role,
      name: npc.name,
      modelId: npc.modelId,
      serviceId: npc.serviceId,
      dialogueSetId: npc.dialogueSetId,
      hostile: false,
      category: 'npc',
      grudgeLayer: 'haven_npc',
    };
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.35, 1.2, 4, 8),
      new THREE.MeshStandardMaterial({
        color: roleColor[npc.role] ?? 0xffffff,
        roughness: 0.7,
      }),
    );
    body.position.y = 1.1;
    body.castShadow = true;
    g.add(body);
    const indicator =
      npc.role.startsWith('vendor') || npc.role === 'vendor_general'
        ? makeLabelSprite(`$ ${npc.name}`, '#4ade80')
        : npc.role === 'mission_giver'
          ? makeLabelSprite(`! ${npc.name}`, '#fbbf24')
          : makeLabelSprite(npc.name, '#e2e8f0');
    indicator.position.y = 2.6;
    g.add(indicator);
    // Interaction sphere
    const interact = new THREE.Mesh(
      new THREE.SphereGeometry(2.2, 8, 8),
      new THREE.MeshBasicMaterial({ visible: false }),
    );
    interact.name = 'interaction';
    g.add(interact);
    parent.add(g);
    out.push(g);
  }
  return out;
}

function placeVesselTags(parent: THREE.Group, vessels: HavenVesselPlacement[]): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  for (const v of vessels) {
    const g = new THREE.Group();
    g.name = `haven_vessel_${v.uuid}`;
    g.position.set(v.position[0], v.position[1] + 2, v.position[2]);
    g.rotation.y = v.rotation;
    g.userData = {
      uuid: v.uuid,
      role: v.role,
      name: v.name,
      fruzerNode: v.fruzerNode,
      hostile: v.hostile,
      level: v.level,
      aggroRadius: v.aggroRadius,
      category: 'vessel',
      grudgeLayer: 'haven_vessel',
    };
    const color = v.hostile ? 0xef4444 : v.role === 'wreck' ? 0x64748b : 0x22c55e;
    const buoy = new THREE.Mesh(
      new THREE.ConeGeometry(1.2, 3, 6),
      new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.4,
      }),
    );
    g.add(buoy);
    const spr = makeLabelSprite(v.name, v.hostile ? '#fca5a5' : '#bbf7d0');
    spr.position.y = 4;
    g.add(spr);
    parent.add(g);
    out.push(g);
  }
  return out;
}

function placeAnimalMarkers(
  parent: THREE.Group,
  animals: HavenAnimalPlacement[],
): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  for (const a of animals) {
    const g = new THREE.Group();
    g.name = `haven_animal_${a.uuid}`;
    g.position.set(a.position[0], a.position[1], a.position[2]);
    g.userData = {
      uuid: a.uuid,
      species: a.species,
      wanderRadius: a.wanderRadius,
      attackable: a.attackable,
      respawnSec: a.respawnSec,
      category: 'animal',
      grudgeLayer: 'haven_animal',
    };
    const body = new THREE.Mesh(
      new THREE.SphereGeometry(0.4, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0xc4a574, roughness: 0.9 }),
    );
    body.position.y = 0.4;
    g.add(body);
    parent.add(g);
    out.push(g);
  }
  return out;
}

/**
 * Load Fruzer foundation at world origin (cx, cz) with sector waterLevel.
 * Caller must already own the zone ocean mesh — we never create water here.
 */
export async function loadHavenShoreFoundation(
  scene: THREE.Scene,
  opts?: {
    origin?: [number, number, number];
    scale?: number;
    config?: HavenShoreFoundationConfig;
  },
): Promise<HavenFoundationResult> {
  const cfg = opts?.config ?? HAVEN_SHORE_FOUNDATION;
  const origin = opts?.origin ?? cfg.origin;
  const scale = opts?.scale ?? cfg.scale;

  const root = new THREE.Group();
  root.name = 'haven_shore_foundation';
  root.position.set(origin[0], origin[1], origin[2]);
  root.rotation.y = cfg.rotationY;
  root.userData = {
    sectorId: cfg.sectorId,
    cityId: cfg.cityId,
    version: cfg.version,
    useMapOceanOnly: true,
    stripWater: true,
    isPveTradeHub: true,
  };

  const url = resolveModelUrl(cfg.glbPath);
  const loader = new GLTFLoader();
  let gltfScene: THREE.Object3D;

  try {
    const gltf = await loader.loadAsync(url);
    gltfScene = gltf.scene.clone(true);
  } catch (err) {
    console.warn('[HavenShore] GLB load failed, using empty foundation shell:', err);
    gltfScene = new THREE.Group();
    gltfScene.name = 'fruzer_missing';
  }

  gltfScene.name = 'fruzer_islands_raw';
  gltfScene.scale.setScalar(scale);

  // Center XZ on origin (preserve relative heights)
  const box = new THREE.Box3().setFromObject(gltfScene);
  if (!box.isEmpty()) {
    const center = box.getCenter(new THREE.Vector3());
    gltfScene.position.x -= center.x;
    gltfScene.position.z -= center.z;
    // Sit island bottoms near waterline
    const minY = box.min.y;
    gltfScene.position.y -= minY * scale;
  }

  const stripped = stripEmbeddedWaterAndJunk(gltfScene);
  applyIslandTextures(gltfScene, cfg);
  tagHarvestableNature(gltfScene);
  root.add(gltfScene);

  // Re-run water strip after parenting
  removeDuplicateWaterMeshes(root);
  removeDuplicateWaterMeshes(scene);

  const layer = new THREE.Group();
  layer.name = 'haven_gameplay_layer';
  root.add(layer);

  const allNpcs = [...cfg.vendors, ...cfg.missionGivers, ...cfg.townNpcs];
  const harvestMarkers = placeHarvestMarkers(layer, cfg.harvest);
  const npcMarkers = placeNpcMarkers(layer, allNpcs);
  const vesselMarkers = placeVesselTags(layer, cfg.vessels);
  const animalMarkers = placeAnimalMarkers(layer, cfg.animals);

  // Collect ground meshes
  const groundMeshes: THREE.Object3D[] = [];
  gltfScene.traverse((o) => {
    const n = o.name || '';
    if (/island|house|tower|hut|dock|pirate_hut|building/i.test(n)) {
      groundMeshes.push(o);
    }
  });

  scene.add(root);

  console.log(
    `[HavenShore] Foundation v${cfg.version} loaded — stripped ${stripped} water/junk nodes, ` +
      `${cfg.vendors.length} vendors, ${cfg.missionGivers.length} mission givers, ` +
      `${cfg.harvest.length} harvest UUIDs, ${cfg.vessels.length} vessels (map ocean only)`,
  );

  const bobTargets = [...harvestMarkers, ...vesselMarkers];

  return {
    root,
    config: cfg,
    groundMeshes,
    harvestMarkers,
    npcMarkers,
    vesselMarkers,
    animalMarkers,
    update: (_dt, elapsed) => {
      for (const m of bobTargets) {
        const base = m.userData.baseY as number | undefined;
        if (base === undefined) m.userData.baseY = m.position.y;
        const b = (m.userData.baseY as number) ?? m.position.y;
        m.position.y = b + Math.sin(elapsed * 2 + m.position.x * 0.1) * 0.12;
      }
    },
    dispose: () => {
      scene.remove(root);
      root.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const mesh = obj as THREE.Mesh;
          mesh.geometry?.dispose();
          const mat = mesh.material;
          if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
          else (mat as THREE.Material | undefined)?.dispose?.();
        }
      });
    },
  };
}
