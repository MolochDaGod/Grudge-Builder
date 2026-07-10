/**
 * NpcCampSystem — spawn stylized camp GLBs, faction coloring, upgrade props.
 *
 * Base model: public/models/camps/stylized_enemy_camp_scene.glb
 * Upgrades: benches, storage, towers (BuildAssetManifest models).
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import {
  NPC_CAMP_DEFS,
  STYLIZED_CAMP,
  CAMP_UPGRADES,
  FACTION_COLORS,
  resolveRelation,
  canAddUpgrade,
  nextUpgradeSlot,
  wildlifeRelation,
  type CampFaction,
  type NpcCampInstance,
  type PlacedCampUpgrade,
  type RelationKind,
  type CampUpgradeKind,
} from '@shared/definitions/npcCamps';
import { getBuildAsset } from '../building/BuildAssetManifest';
import { loadBuildAssetModel } from '../building/PackModelLoader';
import { assetUrl } from '@/lib/assetConfig';

const gltfLoader = new GLTFLoader();
const campTemplateCache = new Map<string, THREE.Group>();

async function loadCampTemplate(modelPath: string): Promise<THREE.Group> {
  const url = assetUrl(modelPath);
  const cached = campTemplateCache.get(url);
  if (cached) return cached.clone(true) as THREE.Group;

  const gltf = await gltfLoader.loadAsync(url);
  const root = gltf.scene as THREE.Group;
  root.traverse((c) => {
    if ((c as THREE.Mesh).isMesh) {
      c.castShadow = true;
      c.receiveShadow = true;
    }
  });
  campTemplateCache.set(url, root);
  return root.clone(true) as THREE.Group;
}

export interface RuntimeCamp {
  data: NpcCampInstance;
  root: THREE.Group;
  banner: THREE.Mesh;
  upgradeRoots: THREE.Group[];
  relation: RelationKind;
}

export interface NpcCampSystemOpts {
  scene: THREE.Scene;
  playerFaction: CampFaction | string;
  waterLevel?: number;
  sampleHeight?: (x: number, z: number) => number | null;
}

export class NpcCampSystem {
  private scene: THREE.Scene;
  private playerFaction: CampFaction | string;
  private waterLevel: number;
  private sampleHeight?: (x: number, z: number) => number | null;
  private camps = new Map<string, RuntimeCamp>();
  private nextId = 0;

  constructor(opts: NpcCampSystemOpts) {
    this.scene = opts.scene;
    this.playerFaction = opts.playerFaction;
    this.waterLevel = opts.waterLevel ?? 0;
    this.sampleHeight = opts.sampleHeight;
  }

  setPlayerFaction(faction: CampFaction | string): void {
    this.playerFaction = faction;
    for (const camp of this.camps.values()) {
      camp.relation = resolveRelation(this.playerFaction, camp.data.claimedByFaction ?? camp.data.faction);
      this.tintBanner(camp);
    }
  }

  getCamps(): RuntimeCamp[] {
    return Array.from(this.camps.values());
  }

  getCamp(id: string): RuntimeCamp | undefined {
    return this.camps.get(id);
  }

  /**
   * Spawn a world NPC camp (or player-claimed) at world position.
   * Uses stylized_enemy_camp_scene.glb by default.
   */
  async spawnCamp(params: {
    defId?: string;
    faction: CampFaction;
    x: number;
    z: number;
    rotationY?: number;
    ownerAccountId?: string | null;
    upgrades?: PlacedCampUpgrade[];
  }): Promise<RuntimeCamp | null> {
    const def = NPC_CAMP_DEFS[params.defId ?? 'stylized_enemy_camp'] ?? STYLIZED_CAMP;
    let y = this.sampleHeight?.(params.x, params.z) ?? 0;
    if (y < this.waterLevel + 1.0) return null; // camps on dry land only

    const id = `camp_${this.nextId++}_${params.faction}`;
    const data: NpcCampInstance = {
      id,
      defId: def.id,
      faction: params.faction,
      position: [params.x, y, params.z],
      rotationY: params.rotationY ?? 0,
      upgrades: params.upgrades ? [...params.upgrades] : [],
      ownerAccountId: params.ownerAccountId ?? null,
    };

    const root = new THREE.Group();
    root.name = `npc_camp_${id}`;
    root.position.set(params.x, y, params.z);
    root.rotation.y = data.rotationY;
    root.userData.campId = id;
    root.userData.faction = params.faction;
    root.userData.relation = resolveRelation(this.playerFaction, params.faction);

    // Load base camp GLB
    try {
      const model = await loadCampTemplate(def.modelPath);
      model.scale.setScalar(def.modelScale);
      // Center on ground
      const box = new THREE.Box3().setFromObject(model);
      if (box.min.y < 0) model.position.y -= box.min.y;
      root.add(model);
    } catch (err) {
      console.warn('[NpcCampSystem] Camp GLB missing, using placeholder', err);
      root.add(this.makePlaceholderCamp(params.faction));
    }

    // Faction banner
    const banner = this.makeBanner(params.faction);
    banner.position.set(0, 6, 0);
    root.add(banner);

    this.scene.add(root);

    const relation = resolveRelation(this.playerFaction, params.faction);
    const runtime: RuntimeCamp = {
      data,
      root,
      banner,
      upgradeRoots: [],
      relation,
    };
    this.camps.set(id, runtime);
    this.tintBanner(runtime);

    // Apply pre-existing upgrades
    for (const up of data.upgrades) {
      await this.attachUpgradeMesh(runtime, up);
    }

    return runtime;
  }

  /** Player/NPC adds bench, storage, or tower to camp footprint. */
  async addUpgrade(
    campId: string,
    upgradeId: string,
    opts?: { localPos?: [number, number, number]; rotationY?: number },
  ): Promise<boolean> {
    const camp = this.camps.get(campId);
    if (!camp) return false;
    if (!canAddUpgrade(camp.data, upgradeId)) return false;

    const slot = opts?.localPos ?? nextUpgradeSlot(camp.data, upgradeId);
    if (!slot) return false;

    const def = CAMP_UPGRADES[upgradeId];
    const placed: PlacedCampUpgrade = {
      upgradeId,
      kind: def.kind,
      localPos: slot,
      rotationY: opts?.rotationY ?? 0,
    };
    camp.data.upgrades.push(placed);
    await this.attachUpgradeMesh(camp, placed);
    return true;
  }

  /** Claim camp for a faction (flag upgrade / capture). */
  claimCamp(campId: string, faction: CampFaction): boolean {
    const camp = this.camps.get(campId);
    if (!camp) return false;
    camp.data.claimedByFaction = faction;
    camp.data.faction = faction;
    camp.relation = resolveRelation(this.playerFaction, faction);
    camp.root.userData.faction = faction;
    camp.root.userData.relation = camp.relation;
    this.tintBanner(camp);
    return true;
  }

  /** Nearest camp within radius (for build-attach UI). */
  findNearestCamp(x: number, z: number, radius = 22): RuntimeCamp | null {
    let best: RuntimeCamp | null = null;
    let bestD = radius;
    for (const camp of this.camps.values()) {
      const [cx, , cz] = camp.data.position;
      const d = Math.hypot(cx - x, cz - z);
      if (d < bestD) {
        bestD = d;
        best = camp;
      }
    }
    return best;
  }

  /** Combat helper: is this camp hostile to the player? */
  isCampHostile(campId: string): boolean {
    const camp = this.camps.get(campId);
    if (!camp) return false;
    return camp.relation === 'enemy';
  }

  isCampAlly(campId: string): boolean {
    const camp = this.camps.get(campId);
    return camp?.relation === 'ally';
  }

  /** Wildlife / monster hostility (never ally). */
  static wildlifeRelation = wildlifeRelation;

  dispose(): void {
    for (const camp of this.camps.values()) {
      this.scene.remove(camp.root);
      camp.root.traverse((c) => {
        if ((c as THREE.Mesh).isMesh) {
          const m = c as THREE.Mesh;
          m.geometry?.dispose();
          const mat = m.material;
          if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
          else mat?.dispose();
        }
      });
    }
    this.camps.clear();
  }

  // ── Internals ────────────────────────────────────────────────────────────

  private async attachUpgradeMesh(camp: RuntimeCamp, up: PlacedCampUpgrade): Promise<void> {
    const udef = CAMP_UPGRADES[up.upgradeId];
    if (!udef) return;
    const asset = getBuildAsset(udef.buildAssetId);
    const group = new THREE.Group();
    group.position.set(up.localPos[0], up.localPos[1], up.localPos[2]);
    group.rotation.y = up.rotationY;
    group.userData.upgradeId = up.upgradeId;
    group.userData.kind = up.kind;

    if (asset) {
      try {
        // PackModelLoader: multipack node extract (survival kit / towers) or full GLB
        const mesh = await loadBuildAssetModel(asset);
        group.add(mesh);
      } catch {
        group.add(this.makeUpgradePlaceholder(up.kind));
      }
    } else {
      group.add(this.makeUpgradePlaceholder(up.kind));
    }

    camp.root.add(group);
    camp.upgradeRoots.push(group);
  }

  private makeUpgradePlaceholder(kind: CampUpgradeKind): THREE.Mesh {
    const colors: Record<CampUpgradeKind, number> = {
      bench: 0x8b6914,
      storage: 0x654321,
      tower: 0x7a5c3a,
      flag: 0xcc0000,
      fire: 0xff6600,
      barricade: 0x5a4a3a,
    };
    const sizes: Record<CampUpgradeKind, [number, number, number]> = {
      bench: [2, 0.8, 0.6],
      storage: [1.2, 0.9, 0.9],
      tower: [2.5, 7, 2.5],
      flag: [0.3, 4, 0.3],
      fire: [1, 0.6, 1],
      barricade: [3, 1.2, 0.4],
    };
    const [w, h, d] = sizes[kind];
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshStandardMaterial({ color: colors[kind], roughness: 0.85 }),
    );
    mesh.position.y = h / 2;
    mesh.castShadow = true;
    return mesh;
  }

  private makePlaceholderCamp(faction: CampFaction): THREE.Group {
    const g = new THREE.Group();
    const color = FACTION_COLORS[faction] ?? 0x666666;
    const ground = new THREE.Mesh(
      new THREE.CylinderGeometry(10, 10, 0.3, 16),
      new THREE.MeshStandardMaterial({ color: 0x4a3a28, roughness: 0.95 }),
    );
    ground.position.y = 0.15;
    ground.receiveShadow = true;
    g.add(ground);

    const tent = new THREE.Mesh(
      new THREE.ConeGeometry(3, 4, 4),
      new THREE.MeshStandardMaterial({ color, roughness: 0.8 }),
    );
    tent.position.set(0, 2, 0);
    tent.castShadow = true;
    g.add(tent);

    const fence = new THREE.Mesh(
      new THREE.TorusGeometry(9, 0.15, 6, 24),
      new THREE.MeshStandardMaterial({ color: 0x5c4033 }),
    );
    fence.rotation.x = Math.PI / 2;
    fence.position.y = 0.8;
    g.add(fence);
    return g;
  }

  private makeBanner(faction: CampFaction): THREE.Mesh {
    const color = FACTION_COLORS[faction] ?? 0x888888;
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.15, 3.5, 1.2),
      new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.25,
        roughness: 0.6,
      }),
    );
    mesh.castShadow = true;
    mesh.name = 'camp_banner';
    return mesh;
  }

  private tintBanner(camp: RuntimeCamp): void {
    const faction = camp.data.claimedByFaction ?? camp.data.faction;
    const color = FACTION_COLORS[faction] ?? 0x888888;
    const mat = camp.banner.material as THREE.MeshStandardMaterial;
    mat.color.setHex(color);
    mat.emissive.setHex(color);
    // Ally = green rim, enemy = red rim via emissive intensity
    mat.emissiveIntensity = camp.relation === 'ally' ? 0.45 : camp.relation === 'enemy' ? 0.35 : 0.15;
  }
}

/**
 * Seed a few camps across zone islands from population / biome.
 * Call after zone islands are ready.
 */
export async function spawnZoneCamps(
  system: NpcCampSystem,
  islandCenters: Array<{ x: number; z: number; radius: number }>,
  opts: {
    playerFaction: CampFaction | string;
    seed?: number;
    campsPerIsland?: number;
  },
): Promise<number> {
  const factions: CampFaction[] = ['crusade', 'legion', 'fabled', 'pirate'];
  let rng = opts.seed ?? 42;
  const rand = () => {
    rng = (rng * 1664525 + 1013904223) >>> 0;
    return rng / 0xffffffff;
  };

  let placed = 0;
  const per = opts.campsPerIsland ?? 1;

  for (const island of islandCenters) {
    for (let i = 0; i < per; i++) {
      const angle = rand() * Math.PI * 2;
      const dist = island.radius * (0.25 + rand() * 0.45);
      const x = island.x + Math.cos(angle) * dist;
      const z = island.z + Math.sin(angle) * dist;
      const faction = factions[Math.floor(rand() * factions.length)];
      const defId =
        faction === 'crusade'
          ? 'crusade_camp'
          : faction === 'legion'
            ? 'legion_camp'
            : faction === 'fabled'
              ? 'fabled_camp'
              : 'pirate_camp';

      const camp = await system.spawnCamp({
        defId,
        faction,
        x,
        z,
        rotationY: rand() * Math.PI * 2,
      });
      if (!camp) continue;
      placed++;

      // Seed a couple upgrades so camps look lived-in
      if (rand() > 0.3) await system.addUpgrade(camp.data.id, 'camp_fire');
      if (rand() > 0.5) await system.addUpgrade(camp.data.id, 'camp_bench');
      if (rand() > 0.7) await system.addUpgrade(camp.data.id, 'camp_storage');
      if (rand() > 0.85) await system.addUpgrade(camp.data.id, 'camp_tower');
    }
  }
  return placed;
}
