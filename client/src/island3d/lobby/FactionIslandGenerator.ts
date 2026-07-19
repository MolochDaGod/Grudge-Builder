/**
 * FactionIslandGenerator — spawn 6 race islands on pirate lobby borders.
 * Layout language: 4 docks · 5 buildings · 4 tents · 2 campfires · water hole
 * + nature scatter, captain-on-mount, traveler, blacksmith, benches, siege, boat.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {
  FACTION_LOBBY_ISLANDS,
  FACTION_ISLAND_TEMPLATE,
  factionIslandWorldOrigin,
  type FactionIslandDef,
  type FactionIslandProp,
  type FactionIslandNpc,
} from '@shared/definitions/factionLobbyIslands';
import { loadBuildAssetModel } from '../building/PackModelLoader';
import { resolveModelUrl } from '@/lib/modelManifest';
import { assetUrl } from '@/lib/assetConfig';

export interface FactionIslandRuntime {
  root: THREE.Group;
  islands: FactionIslandDef[];
  /** Respawn waypoint world positions by island id */
  respawnPoints: Map<string, THREE.Vector3>;
  update: (dt: number, playerPos?: THREE.Vector3) => void;
  dispose: () => void;
}

const loader = new GLTFLoader();
const gltfCache = new Map<string, THREE.Group>();

async function loadModel(path: string): Promise<THREE.Object3D | null> {
  if (!path) return null;
  const raw = path.startsWith('http') || path.startsWith('/') ? path : `/${path}`;
  const url = resolveModelUrl(raw.startsWith('http') ? raw : assetUrl(raw));
  if (gltfCache.has(url)) return gltfCache.get(url)!.clone(true);
  try {
    const gltf = await new Promise<any>((res, rej) => loader.load(url, res, undefined, rej));
    const root = gltf.scene as THREE.Group;
    gltfCache.set(url, root);
    return root.clone(true);
  } catch {
    return null;
  }
}

function fitObjectToHeight(obj: THREE.Object3D, targetH: number): void {
  const box = new THREE.Box3().setFromObject(obj);
  const h = box.max.y - box.min.y || 1;
  const s = targetH / h;
  obj.scale.multiplyScalar(s);
  const box2 = new THREE.Box3().setFromObject(obj);
  obj.position.y -= box2.min.y;
}

function woodMat(c = 0x5c4033) {
  return new THREE.MeshStandardMaterial({ color: c, roughness: 0.9 });
}
function rockMat(c = 0x6b7280) {
  return new THREE.MeshStandardMaterial({ color: c, roughness: 0.95 });
}

function proceduralProp(kind: FactionIslandProp['kind'], scale: number, color: number): THREE.Object3D {
  const g = new THREE.Group();
  if (kind === 'dock') {
    const deck = new THREE.Mesh(new THREE.BoxGeometry(4, 0.35, 14), woodMat(0x6b4423));
    deck.position.y = 0.2;
    deck.castShadow = true;
    g.add(deck);
    for (const x of [-1.6, 1.6]) {
      for (const z of [-5, 0, 5]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 1.4, 6), woodMat(0x4a3224));
        post.position.set(x, -0.3, z);
        g.add(post);
      }
    }
  } else if (kind === 'building' || kind === 'blacksmith') {
    const body = new THREE.Mesh(new THREE.BoxGeometry(8, 4, 6), woodMat(color));
    body.position.y = 2;
    body.castShadow = true;
    g.add(body);
    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(6, 2.5, 4),
      new THREE.MeshStandardMaterial({ color: 0x4a3728 }),
    );
    roof.position.y = 5.2;
    roof.rotation.y = Math.PI / 4;
    g.add(roof);
    if (kind === 'blacksmith') {
      const anvil = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.5, 0.7), rockMat(0x44403c));
      anvil.position.set(0, 0.4, 4);
      g.add(anvil);
    }
  } else if (kind === 'tent') {
    const tent = new THREE.Mesh(
      new THREE.ConeGeometry(2.2, 3.2, 4),
      new THREE.MeshStandardMaterial({ color: 0xa16207, side: THREE.DoubleSide }),
    );
    tent.position.y = 1.6;
    g.add(tent);
  } else if (kind === 'campfire') {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.55, 0.12, 6, 12),
      rockMat(0x44403c),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.1;
    g.add(ring);
    const flame = new THREE.Mesh(
      new THREE.ConeGeometry(0.3, 0.8, 5),
      new THREE.MeshBasicMaterial({ color: 0xf97316 }),
    );
    flame.position.y = 0.55;
    g.add(flame);
  } else if (kind === 'water_hole') {
    const water = new THREE.Mesh(
      new THREE.CircleGeometry(scale || 3.5, 24),
      new THREE.MeshStandardMaterial({
        color: 0x1e90aa,
        transparent: true,
        opacity: 0.75,
        metalness: 0.3,
        roughness: 0.2,
      }),
    );
    water.rotation.x = -Math.PI / 2;
    water.position.y = 0.06;
    g.add(water);
    const rim = new THREE.Mesh(
      new THREE.TorusGeometry((scale || 3.5) * 0.95, 0.2, 6, 20),
      rockMat(0x78716c),
    );
    rim.rotation.x = -Math.PI / 2;
    rim.position.y = 0.08;
    g.add(rim);
  } else if (kind === 'tree') {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 2.4, 6), woodMat(0x5c4033));
    trunk.position.y = 1.2;
    g.add(trunk);
    const canopy = new THREE.Mesh(
      new THREE.SphereGeometry(1.4, 8, 6),
      new THREE.MeshStandardMaterial({ color: 0x228b22 }),
    );
    canopy.position.y = 2.9;
    g.add(canopy);
  } else if (kind === 'rock' || kind === 'stone') {
    const r = new THREE.Mesh(
      new THREE.DodecahedronGeometry(kind === 'rock' ? 1.1 : 0.35, 0),
      rockMat(),
    );
    r.castShadow = true;
    g.add(r);
  } else if (kind === 'flower') {
    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 0.45, 4),
      new THREE.MeshStandardMaterial({ color: 0x4ade80 }),
    );
    stem.position.y = 0.22;
    g.add(stem);
    const bloom = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 6, 6),
      new THREE.MeshStandardMaterial({ color: 0xf472b6 }),
    );
    bloom.position.y = 0.48;
    g.add(bloom);
  } else if (kind === 'grass') {
    for (let i = 0; i < 5; i++) {
      const blade = new THREE.Mesh(
        new THREE.ConeGeometry(0.06, 0.5 + Math.random() * 0.3, 3),
        new THREE.MeshStandardMaterial({ color: 0x3d8b4a, side: THREE.DoubleSide }),
      );
      blade.position.set((Math.random() - 0.5) * 0.6, 0.25, (Math.random() - 0.5) * 0.6);
      g.add(blade);
    }
  } else if (kind === 'tower') {
    const t = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.8, 10, 8), woodMat(0x4a4538));
    t.position.y = 5;
    t.castShadow = true;
    g.add(t);
  } else if (kind === 'catapult' || kind === 'bolt_thrower') {
    const base = new THREE.Mesh(new THREE.BoxGeometry(3, 1.2, 4), woodMat(0x5c4033));
    base.position.y = 0.6;
    g.add(base);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 5), woodMat(0x3d2918));
    arm.position.set(0, 2, 1);
    arm.rotation.x = -0.4;
    g.add(arm);
  } else if (kind === 'boat') {
    const hull = new THREE.Mesh(new THREE.BoxGeometry(5, 1.4, 12), woodMat(0x5c3d2e));
    hull.position.y = 0.7;
    g.add(hull);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 8, 6), woodMat(0x4a3224));
    mast.position.set(0, 4.5, -1);
    g.add(mast);
  } else if (kind === 'respawn_waypoint') {
    const pillar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.25, 0.35, 3, 8),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0ea5e9, emissiveIntensity: 0.4 }),
    );
    pillar.position.y = 1.5;
    g.add(pillar);
  } else if (kind === 'bench') {
    const top = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.15, 1.2), woodMat(0x78716c));
    top.position.y = 0.9;
    g.add(top);
    for (const x of [-0.8, 0.8]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.9, 0.15), woodMat());
      leg.position.set(x, 0.45, 0);
      g.add(leg);
    }
  } else {
    g.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), woodMat(color)));
  }
  // water_hole uses scale as radius already applied in geometry
  if (kind !== 'water_hole') g.scale.setScalar(scale);
  return g;
}

function npcMarker(npc: FactionIslandNpc, color: number): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.35, npc.role === 'captain_mounted' ? 1.0 : 1.15, 4, 8),
    new THREE.MeshStandardMaterial({ color }),
  );
  body.position.y = npc.role === 'captain_mounted' ? 2.4 : 1.0;
  body.castShadow = true;
  g.add(body);
  if (npc.role === 'captain_mounted') {
    const mount = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 1.0, 2.2),
      new THREE.MeshStandardMaterial({ color: 0x4a3728 }),
    );
    mount.position.y = 0.7;
    g.add(mount);
  }
  if (npc.role === 'traveler' || npc.role === 'quest_traveler') {
    const flag = new THREE.Mesh(
      new THREE.PlaneGeometry(0.6, 0.4),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide }),
    );
    flag.position.set(0.4, 2.2, 0);
    g.add(flag);
  }
  g.userData.npc = npc;
  return g;
}

function islandTerrainDisk(radius: number, bannerColor: number): THREE.Group {
  const g = new THREE.Group();
  // Blend faction tint into grass
  const r = ((bannerColor >> 16) & 0xff) / 255;
  const gr = ((bannerColor >> 8) & 0xff) / 255;
  const b = (bannerColor & 0xff) / 255;
  const grass = new THREE.Color(0x3d5c3a).lerp(new THREE.Color(r, gr, b), 0.18);
  const ground = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius * 1.05, 2.2, 32),
    new THREE.MeshStandardMaterial({ color: grass, roughness: 0.92, metalness: 0.02 }),
  );
  ground.position.y = -0.9;
  ground.receiveShadow = true;
  g.add(ground);
  const sand = new THREE.Mesh(
    new THREE.RingGeometry(radius * 0.88, radius * 1.08, 32),
    new THREE.MeshStandardMaterial({ color: 0xe8d4a8, roughness: 0.95 }),
  );
  sand.rotation.x = -Math.PI / 2;
  sand.position.y = 0.08;
  g.add(sand);
  return g;
}

const MULTIPACK_KINDS = new Set<FactionIslandProp['kind']>([
  'tent',
  'campfire',
  'bench',
  'blacksmith',
  'tower',
]);

const FULL_MODEL_KINDS = new Set<FactionIslandProp['kind']>([
  'boat',
  'dock',
  'catapult',
  'bolt_thrower',
  'tower',
  'building',
]);

function multipackCategory(kind: FactionIslandProp['kind']): 'crafting' | 'camp' | 'defense' {
  if (kind === 'bench' || kind === 'blacksmith') return 'crafting';
  if (kind === 'tower') return 'defense';
  return 'camp';
}

async function resolvePropObject(
  prop: FactionIslandProp,
  bannerColor: number,
): Promise<THREE.Object3D> {
  // Multipack (survival kit / medieval towers)
  if (prop.modelPath && prop.nodeName && MULTIPACK_KINDS.has(prop.kind)) {
    try {
      const obj = await loadBuildAssetModel({
        id: prop.id,
        name: prop.name,
        category: multipackCategory(prop.kind),
        placement: 'prop',
        modelPath: prop.modelPath,
        nodeName: prop.nodeName,
        scale: 1,
        size: prop.kind === 'tower' ? [4, 10, 4] : [2, 2, 2],
        color: bannerColor,
        rotatable: true,
        requiresFloor: false,
        terrainPlaceable: true,
        cost: [],
      });
      if (obj) return obj;
    } catch {
      /* fall through */
    }
  }

  if (prop.modelPath && FULL_MODEL_KINDS.has(prop.kind)) {
    const obj = await loadModel(prop.modelPath);
    if (obj) {
      const targetH =
        prop.kind === 'boat'
          ? 4.5
          : prop.kind === 'dock'
            ? 1.2
            : prop.kind === 'tower'
              ? 10
              : prop.kind === 'building'
                ? 6
                : 3.5;
      fitObjectToHeight(obj, targetH);
      return obj;
    }
  }

  return proceduralProp(prop.kind, 1, bannerColor);
}

async function resolveNpcObject(
  npc: FactionIslandNpc,
  color: number,
): Promise<THREE.Object3D> {
  const wrap = new THREE.Group();
  wrap.userData.npc = npc;

  if (npc.role === 'captain_mounted') {
    // Unity capital style: race cavalry + rider
    let mount: THREE.Object3D | null = null;
    if (npc.mountPath) mount = await loadModel(npc.mountPath);
    if (mount) {
      fitObjectToHeight(mount, 1.6);
      wrap.add(mount);
    } else {
      const stub = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 1.0, 2.2),
        new THREE.MeshStandardMaterial({ color: 0x4a3728 }),
      );
      stub.position.y = 0.7;
      wrap.add(stub);
    }

    let rider: THREE.Object3D | null = null;
    if (npc.modelPath) rider = await loadModel(npc.modelPath);
    if (rider) {
      fitObjectToHeight(rider, 1.7);
      rider.position.y += 1.15;
      wrap.add(rider);
    } else {
      wrap.add(npcMarker(npc, color));
    }
    return wrap;
  }

  if (npc.modelPath && (npc.role === 'faction_hero' || npc.role === 'blacksmith' || npc.role === 'unarmed' || npc.role === 'traveler' || npc.role === 'quest_traveler')) {
    const obj = await loadModel(npc.modelPath);
    if (obj) {
      fitObjectToHeight(obj, npc.role === 'unarmed' ? 1.75 : 1.85);
      wrap.add(obj);
      if (npc.role === 'traveler' || npc.role === 'quest_traveler') {
        const flag = new THREE.Mesh(
          new THREE.PlaneGeometry(0.5, 0.35),
          new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide }),
        );
        flag.position.set(0.35, 2.1, 0);
        wrap.add(flag);
      }
      return wrap;
    }
  }

  wrap.add(npcMarker(npc, color));
  return wrap;
}

async function buildOneIsland(
  def: FactionIslandDef,
  origin: { x: number; z: number },
  faceYaw: number,
): Promise<{ group: THREE.Group; respawn: THREE.Vector3 }> {
  const group = new THREE.Group();
  group.name = def.id;
  group.position.set(origin.x, 0, origin.z);
  group.rotation.y = faceYaw;
  group.userData.factionIsland = def;

  group.add(islandTerrainDisk(FACTION_ISLAND_TEMPLATE.islandRadiusM, def.bannerColor));

  // Banner pole
  const banner = new THREE.Mesh(
    new THREE.PlaneGeometry(5, 7),
    new THREE.MeshStandardMaterial({
      color: def.bannerColor,
      emissive: def.bannerColor,
      emissiveIntensity: 0.2,
      side: THREE.DoubleSide,
    }),
  );
  banner.position.set(0, 8, 0);
  group.add(banner);

  const respawn = new THREE.Vector3(origin.x, 1.5, origin.z);

  for (const prop of def.props) {
    const obj = await resolvePropObject(prop, def.bannerColor);
    if (prop.kind !== 'water_hole') {
      obj.scale.multiplyScalar(prop.transform.scale);
    } else {
      // water hole scale is radius in meters — already baked in procedural; for non-proc leave as-is
      if (obj.scale.x === 1) {
        /* procedural already used scale as radius */
      }
    }
    obj.position.set(...prop.transform.position);
    obj.rotation.y = prop.transform.rotationY;
    obj.name = prop.id;
    obj.userData.prop = prop;
    obj.userData.interact = prop.interact;
    obj.userData.professionId = prop.professionId;
    group.add(obj);

    if (prop.kind === 'respawn_waypoint') {
      const wp = new THREE.Vector3(...prop.transform.position);
      wp.applyAxisAngle(new THREE.Vector3(0, 1, 0), faceYaw);
      respawn.set(origin.x + wp.x, prop.transform.position[1] + 1.2, origin.z + wp.z);
    }
  }

  const roleColor: Record<string, number> = {
    unarmed: 0x94a3b8,
    faction_hero: def.bannerColor,
    captain_mounted: 0xfbbf24,
    traveler: 0x38bdf8,
    blacksmith: 0xf97316,
    quest_traveler: 0x22d3ee,
    guard: 0xef4444,
  };

  for (const npc of def.npcs) {
    const obj = await resolveNpcObject(npc, roleColor[npc.role] ?? 0xaaaaaa);
    obj.position.set(...npc.transform.position);
    obj.rotation.y = npc.transform.rotationY;
    obj.name = npc.id;
    obj.userData.npc = npc;
    obj.userData.bob = Math.random() * Math.PI * 2;
    obj.userData.networkServices = npc.networkServices;
    group.add(obj);
  }

  return { group, respawn };
}

export interface CreateFactionIslandsOpts {
  scene: THREE.Scene;
  lobbyCenter: { x: number; z: number };
  lobbySize: { x: number; z: number };
  /** Limit islands for perf (default 6 = all races) */
  maxIslands?: number;
}

/**
 * Place faction islands on pirate open-world border.
 * Production entry: Island3DEngine.initLobby → createFactionLobbyIslands
 */
export async function createFactionLobbyIslands(
  opts: CreateFactionIslandsOpts,
): Promise<FactionIslandRuntime> {
  const root = new THREE.Group();
  root.name = 'FactionLobbyIslands';
  opts.scene.add(root);

  const respawnPoints = new Map<string, THREE.Vector3>();
  const maxN = opts.maxIslands ?? FACTION_LOBBY_ISLANDS.length;
  const defs = FACTION_LOBBY_ISLANDS.slice(0, maxN);
  const npcNodes: THREE.Object3D[] = [];
  const _tmpWorld = new THREE.Vector3();

  for (const def of defs) {
    const origin = factionIslandWorldOrigin(def, opts.lobbyCenter, opts.lobbySize);
    // Face Free Port (lobby center)
    const faceYaw = def.faceCenter
      ? Math.atan2(opts.lobbyCenter.x - origin.x, opts.lobbyCenter.z - origin.z)
      : 0;
    try {
      const built = await buildOneIsland(def, origin, faceYaw);
      root.add(built.group);
      respawnPoints.set(def.id, built.respawn);
      built.group.traverse((o) => {
        if (o.userData.npc && o.parent === built.group) npcNodes.push(o);
      });
      console.info(
        `[FactionIsland] ${def.name} @ (${origin.x.toFixed(0)}, ${origin.z.toFixed(0)}) ` +
          `props=${def.props.length} npcs=${def.npcs.length}`,
      );
    } catch (err) {
      console.warn(`[FactionIsland] failed ${def.id}`, err);
    }
  }

  return {
    root,
    islands: defs,
    respawnPoints,
    update(dt, playerPos) {
      for (const node of npcNodes) {
        const bob = (node.userData.bob as number) ?? 0;
        node.userData.bob = bob + dt;
        // Soft idle bob without fighting base Y from layout
        const baseY = (node.userData.baseY as number | undefined) ?? node.position.y;
        if (node.userData.baseY === undefined) node.userData.baseY = baseY;
        node.position.y = baseY + Math.sin(bob * 1.5) * 0.03;
        if (playerPos) {
          node.getWorldPosition(_tmpWorld);
          if (_tmpWorld.distanceTo(playerPos) < 14) {
            const dx = playerPos.x - _tmpWorld.x;
            const dz = playerPos.z - _tmpWorld.z;
            node.rotation.y = Math.atan2(dx, dz);
          }
        }
      }
    },
    dispose() {
      opts.scene.remove(root);
      root.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) {
          m.geometry?.dispose();
          const mats = Array.isArray(m.material) ? m.material : [m.material];
          mats.forEach((mat) => mat?.dispose?.());
        }
      });
    },
  };
}
