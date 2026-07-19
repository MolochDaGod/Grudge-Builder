/**
 * FabledZoneFoundationLoader — core Fabled sector map (fabledzone.glb).
 *
 * - Loads multi-island core visual for frostbite_expanse / Runeforge Hold
 * - Places cave-doorway portals on rock mouths & building entrances
 * - Portal interact → loads dwarf main city / building interiors
 * - Sector may still spawn extra procedural islands around the core
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {
  FABLED_ZONE_FOUNDATION,
  FABLED_CAVE_DOORWAY_PATTERNS,
  FABLED_BUILDING_PATTERNS,
  FABLED_STRIP_NAME_PATTERNS,
  fabledZoneScaleForSector,
  type FabledZoneFoundationConfig,
  type FabledPortalDef,
} from '@shared/definitions/fabledZoneFoundation';
import { CavePortal3D } from '../objects/CavePortal3D';
import { resolveModelUrl } from '@/lib/modelManifest';
import { removeDuplicateWaterMeshes } from '../terrain/WaterMaterial';

export interface FabledInteriorSession {
  id: string;
  label: string;
  root: THREE.Group;
  spawn: THREE.Vector3;
}

export interface FabledFoundationResult {
  root: THREE.Group;
  config: FabledZoneFoundationConfig;
  groundMeshes: THREE.Object3D[];
  portals: CavePortal3D[];
  /** Active interior (castle / building) if entered */
  activeInterior: FabledInteriorSession | null;
  update: (dt: number, playerPos: THREE.Vector3) => void;
  tryInteract: () => boolean;
  exitInterior: () => void;
  get canInteract(): boolean;
  get nearestHint(): string | null;
  dispose: () => void;
}

function stripWater(root: THREE.Object3D): number {
  const doomed: THREE.Object3D[] = [];
  root.traverse((obj) => {
    const n = obj.name || '';
    // Only strip pure water-like nodes — not every Cube (buildings use Cube_*)
    if (/^Water/i.test(n) || n === 'Water' || /ocean_water|water_plane/i.test(n)) {
      doomed.push(obj);
    }
  });
  for (const o of doomed) o.parent?.remove(o);
  removeDuplicateWaterMeshes(root);
  return doomed.length;
}

function collectMeshes(root: THREE.Object3D, patterns: RegExp[]): THREE.Object3D[] {
  const hits: THREE.Object3D[] = [];
  root.traverse((obj) => {
    const n = obj.name || '';
    if (!n) return;
    if (patterns.some((re) => re.test(n))) hits.push(obj);
  });
  return hits;
}

function worldPos(obj: THREE.Object3D): THREE.Vector3 {
  const v = new THREE.Vector3();
  obj.getWorldPosition(v);
  return v;
}

function placePortalAt(
  scene: THREE.Scene,
  def: FabledPortalDef,
  x: number,
  y: number,
  z: number,
  onEnter: (def: FabledPortalDef) => void,
): CavePortal3D {
  const portal = new CavePortal3D({
    id: def.id,
    dungeonName: def.label,
    dungeonType: 'ruins',
    minLevel: def.minLevel,
    x,
    z,
    active: true,
    entranceModel: undefined, // use default cave mouth + swirl
  });
  portal.group.position.y = y;
  if (def.swirlColor != null) {
    // swirl is private — color via userData for debug
    portal.group.userData.swirlColor = def.swirlColor;
  }
  portal.group.userData.fabledPortal = def;
  portal.onEnter = () => onEnter(def);
  scene.add(portal.group);
  return portal;
}

/**
 * Load Fabled core zone + cave portals for building/castle entry.
 */
export async function loadFabledZoneFoundation(
  scene: THREE.Scene,
  opts?: {
    sectorId?: string;
    origin?: [number, number, number];
    scale?: number;
    config?: FabledZoneFoundationConfig;
    onEnterInterior?: (def: FabledPortalDef, session: FabledInteriorSession) => void;
  },
): Promise<FabledFoundationResult> {
  const cfg = opts?.config ?? FABLED_ZONE_FOUNDATION;
  const sectorId = opts?.sectorId ?? cfg.sectorId;
  const origin = opts?.origin ?? cfg.origin;
  const scale = opts?.scale ?? fabledZoneScaleForSector(sectorId) ?? cfg.scale;

  const root = new THREE.Group();
  root.name = 'fabled_zone_foundation';
  root.position.set(origin[0], origin[1], origin[2]);
  root.rotation.y = cfg.rotationY;
  root.userData = {
    sectorId,
    cityId: cfg.cityId,
    version: cfg.version,
    isFabledCore: true,
  };

  const loader = new GLTFLoader();
  const url = resolveModelUrl(cfg.glbPath);
  let gltfScene: THREE.Object3D;

  try {
    const gltf = await loader.loadAsync(url);
    gltfScene = gltf.scene.clone(true);
  } catch (err) {
    console.warn('[FabledZone] core GLB load failed:', err);
    gltfScene = new THREE.Group();
    gltfScene.name = 'fabledzone_missing';
  }

  gltfScene.name = 'fabledzone_raw';
  gltfScene.scale.setScalar(scale);

  // Center XZ
  const box = new THREE.Box3().setFromObject(gltfScene);
  if (!box.isEmpty()) {
    const center = box.getCenter(new THREE.Vector3());
    gltfScene.position.x -= center.x;
    gltfScene.position.z -= center.z;
    gltfScene.position.y -= box.min.y * scale;
  }

  const stripped = stripWater(gltfScene);
  gltfScene.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) {
      m.castShadow = true;
      m.receiveShadow = true;
    }
  });
  root.add(gltfScene);
  scene.add(root);

  const groundMeshes: THREE.Object3D[] = [];
  gltfScene.traverse((o) => {
    const n = o.name || '';
    if (/Island|Landscape|Rock|Sand|Forge|Roof|Storage|Furnace|Cube/i.test(n)) {
      groundMeshes.push(o);
    }
  });

  // ── Portal placement ─────────────────────────────────────────────────────
  const portals: CavePortal3D[] = [];
  let activeInterior: FabledInteriorSession | null = null;
  let interiorRoot: THREE.Group | null = null;

  const enterInterior = async (def: FabledPortalDef) => {
    // Dispose previous interior
    if (interiorRoot) {
      scene.remove(interiorRoot);
      interiorRoot = null;
      activeInterior = null;
    }
    const ir = new THREE.Group();
    ir.name = `fabled_interior_${def.id}`;
    // Offset interior so it doesn't stack on core — place north of core
    ir.position.set(origin[0], origin[1] + 2, origin[2] - 120);

    try {
      const gltf = await loader.loadAsync(resolveModelUrl(def.interiorGlb));
      const sc = gltf.scene.clone(true);
      sc.scale.setScalar(def.interiorScale);
      const ib = new THREE.Box3().setFromObject(sc);
      if (!ib.isEmpty()) {
        const c = ib.getCenter(new THREE.Vector3());
        sc.position.x -= c.x;
        sc.position.z -= c.z;
        sc.position.y -= ib.min.y;
      }
      sc.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) {
          m.castShadow = true;
          m.receiveShadow = true;
        }
      });
      ir.add(sc);
    } catch (err) {
      console.warn('[FabledZone] interior load failed', def.interiorGlb, err);
      const marker = new THREE.Mesh(
        new THREE.BoxGeometry(8, 6, 8),
        new THREE.MeshStandardMaterial({ color: 0x6b8cae }),
      );
      marker.position.y = 3;
      ir.add(marker);
    }

    scene.add(ir);
    interiorRoot = ir;
    const spawn = ir.position.clone().add(new THREE.Vector3(0, 2, 8));
    activeInterior = { id: def.id, label: def.label, root: ir, spawn };
    opts?.onEnterInterior?.(def, activeInterior);
    console.log(`[FabledZone] Entered interior "${def.label}"`);
  };

  const usedMeshes = new Set<THREE.Object3D>();
  const doorwayMeshes = collectMeshes(gltfScene, FABLED_CAVE_DOORWAY_PATTERNS);
  const buildingMeshes = collectMeshes(gltfScene, FABLED_BUILDING_PATTERNS);

  for (const def of cfg.portals) {
    let pos: THREE.Vector3 | null = null;

    if (def.meshNameHint) {
      const candidates = [...doorwayMeshes, ...buildingMeshes].filter(
        (m) => def.meshNameHint!.test(m.name || '') && !usedMeshes.has(m),
      );
      if (candidates.length > 0) {
        // Prefer larger bounding volume (more doorway-like)
        candidates.sort((a, b) => {
          const ba = new THREE.Box3().setFromObject(a);
          const bb = new THREE.Box3().setFromObject(b);
          return bb.getSize(new THREE.Vector3()).length() - ba.getSize(new THREE.Vector3()).length();
        });
        const mesh = candidates[0];
        usedMeshes.add(mesh);
        pos = worldPos(mesh);
        // Nudge outward from mesh center along +Z of mesh
        const size = new THREE.Box3().setFromObject(mesh).getSize(new THREE.Vector3());
        pos.y = Math.max(pos.y, origin[1] + 1);
        pos.z += Math.min(size.z * 0.5, 4);
      }
    }

    if (!pos && def.fallbackOffset) {
      pos = new THREE.Vector3(
        origin[0] + def.fallbackOffset[0],
        origin[1] + def.fallbackOffset[1],
        origin[2] + def.fallbackOffset[2],
      );
    }

    if (pos) {
      portals.push(
        placePortalAt(scene, def, pos.x, pos.y, pos.z, (d) => {
          void enterInterior(d);
        }),
      );
    }
  }

  // Auto extra cave portals on unused Rock_main / doorway meshes
  let auto = 0;
  for (const mesh of doorwayMeshes) {
    if (auto >= cfg.maxAutoCavePortals) break;
    if (usedMeshes.has(mesh)) continue;
    usedMeshes.add(mesh);
    const pos = worldPos(mesh);
    const def: FabledPortalDef = {
      id: `fab_auto_cave_${auto}`,
      label: `Cave Doorway · ${mesh.name || auto}`,
      target: 'dwarf_main_city',
      interiorGlb: cfg.castleGlbPath,
      interiorScale: 1.0,
      minLevel: 1,
      swirlColor: 0x22c55e,
    };
    portals.push(
      placePortalAt(scene, def, pos.x, Math.max(pos.y, origin[1] + 1), pos.z, (d) => {
        void enterInterior(d);
      }),
    );
    auto++;
  }

  // Dwarf gate overlay at main approach
  try {
    const gateUrl = resolveModelUrl('/models/towns/fabled/dwarf_gate.glb');
    const gateGltf = await loader.loadAsync(gateUrl);
    const gate = gateGltf.scene.clone(true);
    gate.name = 'fabled_dwarf_gate_overlay';
    gate.scale.setScalar(0.0006);
    gate.position.set(0, 0, box.isEmpty() ? 40 : box.getSize(new THREE.Vector3()).z * 0.15);
    root.add(gate);
  } catch {
    /* optional */
  }

  console.log(
    `[FabledZone] Core v${cfg.version} loaded (scale=${scale}) — stripped ${stripped} water nodes, ` +
      `${portals.length} cave/building portals → dwarf city & interiors`,
  );

  return {
    root,
    config: cfg,
    groundMeshes,
    portals,
    get activeInterior() {
      return activeInterior;
    },
    update(dt, playerPos) {
      for (const p of portals) p.update(dt, playerPos);
    },
    tryInteract() {
      for (const p of portals) {
        if (p.interact()) return true;
      }
      return false;
    },
    exitInterior() {
      if (interiorRoot) {
        scene.remove(interiorRoot);
        interiorRoot = null;
      }
      activeInterior = null;
    },
    get canInteract() {
      return portals.some((p) => p.canInteract);
    },
    get nearestHint() {
      const near = portals.find((p) => p.canInteract);
      return near ? near.portalData.dungeonName : null;
    },
    dispose() {
      if (interiorRoot) scene.remove(interiorRoot);
      for (const p of portals) {
        scene.remove(p.group);
        p.dispose?.();
      }
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
