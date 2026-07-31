/**
 * ShipInteriorSafeZone — enter voxel boat interior via E at deck doors.
 *
 * Asset: /models/ships/boatvoxelinside.glb (from D:\Games\Models\boatvoxelinside.glb)
 *
 * Flow:
 *   On deck near door/hatch → prompt "E — enter cabin"
 *   E → load interior GLB once, teleport feet onto interior floor, set safeZone
 *   Inside near exit → "E — return to deck"
 *   E → restore deck boarding pose
 *
 * Safe zone: marks character for no PvE / no cannon fire while inside.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { assetUrl } from '@/lib/assetConfig';
import type { CharacterController3D } from '@/island3d/player/CharacterController3D';
import type { ShipInteractable } from './ShipInteractable';

/** Production path (client public + CDN after upload). */
export const SHIP_INTERIOR_GLB = '/models/ships/boatvoxelinside.glb';

const DOOR_RE = /door|hatch|cabin|companionway|entrance|portal|entry|bulkhead.?door/i;
const EXIT_RE = /exit|door|hatch|out|deck|ladder|stairs/i;

const loader = new GLTFLoader();
let interiorTemplate: THREE.Group | null = null;
let interiorLoadPromise: Promise<THREE.Group | null> | null = null;

export async function preloadShipInterior(): Promise<THREE.Group | null> {
  if (interiorTemplate) return interiorTemplate;
  if (interiorLoadPromise) return interiorLoadPromise;
  interiorLoadPromise = (async () => {
    try {
      const gltf = await loader.loadAsync(assetUrl(SHIP_INTERIOR_GLB));
      const g = gltf.scene as THREE.Group;
      g.traverse((c) => {
        if ((c as THREE.Mesh).isMesh) {
          c.castShadow = true;
          c.receiveShadow = true;
        }
      });
      interiorTemplate = g;
      console.log('[ShipInterior] loaded', SHIP_INTERIOR_GLB);
      return g;
    } catch (e) {
      console.warn('[ShipInterior] failed to load', SHIP_INTERIOR_GLB, e);
      return null;
    }
  })();
  return interiorLoadPromise;
}

export interface DeckDoor {
  id: string;
  /** Ship-local position of door trigger */
  local: THREE.Vector3;
  label: string;
  mesh?: THREE.Object3D;
}

/** Probe ship GLB for door/hatch meshes; fallback hatch on main deck. */
export function probeDeckDoors(
  shipRoot: THREE.Object3D,
  interact: ShipInteractable,
): DeckDoor[] {
  const doors: DeckDoor[] = [];
  shipRoot.traverse((o) => {
    if (!o.name || !DOOR_RE.test(o.name)) return;
    if ((o as THREE.Mesh).isMesh || o.children.length) {
      const box = new THREE.Box3().setFromObject(o);
      if (box.isEmpty()) return;
      const center = box.getCenter(new THREE.Vector3());
      const local = shipRoot.worldToLocal(center.clone());
      doors.push({
        id: `door_${doors.length}_${o.name}`,
        local,
        label: o.name,
        mesh: o,
      });
    }
  });

  if (!doors.length) {
    // Synthetic companionway hatch: center-forward on main deck
    doors.push({
      id: 'hatch_main',
      local: new THREE.Vector3(
        0,
        interact.bounds.deckY + 0.15,
        interact.bounds.halfLength * 0.15,
      ),
      label: 'Cabin hatch',
    });
  }
  return doors;
}

export interface ShipInteriorSafeZoneOpts {
  scene: THREE.Scene;
  shipRoot: THREE.Group;
  interactable: ShipInteractable;
  character: CharacterController3D;
  /** Called to re-enter deck mode after exit */
  onExitToDeck: (localAnchor: THREE.Vector3) => void;
  /** Current deck local anchor (feet in ship space) */
  getDeckLocalAnchor: () => THREE.Vector3;
  onPrompt?: (msg: string | null) => void;
  interactRadiusM?: number;
}

export class ShipInteriorSafeZone {
  readonly doors: DeckDoor[];
  private scene: THREE.Scene;
  private shipRoot: THREE.Group;
  private interactable: ShipInteractable;
  private character: CharacterController3D;
  private onExitToDeck: (localAnchor: THREE.Vector3) => void;
  private getDeckLocalAnchor: () => THREE.Vector3;
  private onPrompt?: (msg: string | null) => void;
  private interactRadius: number;

  private interiorRoot: THREE.Group | null = null;
  private interiorFloorY = 0;
  private exitLocal = new THREE.Vector3(0, 0.1, 2);
  private spawnLocal = new THREE.Vector3(0, 0.1, 0);
  private _inside = false;
  private _loading = false;
  private _eLatch = false;
  private doorMarkers: THREE.Object3D[] = [];
  /** Saved deck local when entered (return point). */
  private returnDeckLocal = new THREE.Vector3();

  constructor(opts: ShipInteriorSafeZoneOpts) {
    this.scene = opts.scene;
    this.shipRoot = opts.shipRoot;
    this.interactable = opts.interactable;
    this.character = opts.character;
    this.onExitToDeck = opts.onExitToDeck;
    this.getDeckLocalAnchor = opts.getDeckLocalAnchor;
    this.onPrompt = opts.onPrompt;
    this.interactRadius = opts.interactRadiusM ?? 2.2;
    this.doors = probeDeckDoors(opts.shipRoot, opts.interactable);
    this.placeDoorMarkers();
    void preloadShipInterior();
  }

  get isInside(): boolean {
    return this._inside;
  }

  /** True when player is in ship cabin safe zone (no PvE). */
  get isSafeZone(): boolean {
    return this._inside;
  }

  private placeDoorMarkers(): void {
    for (const d of this.doors) {
      // Subtle glow ring so hatch is readable
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.35, 0.5, 24),
        new THREE.MeshBasicMaterial({
          color: 0xfbbf24,
          transparent: true,
          opacity: 0.55,
          side: THREE.DoubleSide,
          depthWrite: false,
        }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.copy(d.local);
      ring.position.y += 0.05;
      ring.name = `ship_door_marker_${d.id}`;
      ring.userData.shipDoor = d.id;
      this.shipRoot.add(ring);
      this.doorMarkers.push(ring);
    }
  }

  /** Nearest deck door in ship-local space. */
  nearestDoor(localAnchor: THREE.Vector3): DeckDoor | null {
    let best: DeckDoor | null = null;
    let bestD = this.interactRadius;
    for (const d of this.doors) {
      const dist = Math.hypot(d.local.x - localAnchor.x, d.local.z - localAnchor.z);
      if (dist < bestD) {
        bestD = dist;
        best = d;
      }
    }
    return best;
  }

  private floorYFromRoot(root: THREE.Object3D): number {
    const box = new THREE.Box3().setFromObject(root);
    if (box.isEmpty()) return 0;
    // Prefer low meshes named floor/deck
    let floorY = box.min.y + 0.05;
    root.traverse((o) => {
      if (!/floor|deck|ground|plank/i.test(o.name)) return;
      const b = new THREE.Box3().setFromObject(o);
      if (!b.isEmpty()) floorY = Math.max(floorY, b.max.y);
    });
    return floorY;
  }

  private findExitLocal(root: THREE.Object3D): THREE.Vector3 {
    let found: THREE.Vector3 | null = null;
    root.traverse((o) => {
      if (found) return;
      if (EXIT_RE.test(o.name) && ((o as THREE.Mesh).isMesh || o.children.length)) {
        const b = new THREE.Box3().setFromObject(o);
        if (!b.isEmpty()) {
          found = root.worldToLocal(b.getCenter(new THREE.Vector3()));
        }
      }
    });
    if (found) return found;
    // Default: near +Z edge of interior bbox
    const box = new THREE.Box3().setFromObject(root);
    if (!box.isEmpty()) {
      return new THREE.Vector3(
        (box.min.x + box.max.x) * 0.5,
        box.min.y + 0.1,
        box.max.z - 0.8,
      );
    }
    return new THREE.Vector3(0, 0.1, 2);
  }

  async enter(): Promise<boolean> {
    if (this._inside || this._loading) return false;
    this._loading = true;
    try {
      const tpl = await preloadShipInterior();
      if (!tpl) {
        this.onPrompt?.('Cabin interior failed to load');
        return false;
      }

      if (!this.interiorRoot) {
        this.interiorRoot = tpl.clone(true);
        this.interiorRoot.name = 'ship_interior_safe_zone';
        // Parent under ship so cabin moves with vessel
        this.shipRoot.add(this.interiorRoot);
        // Offset below deck so voxel cabin sits under main deck
        const deckY = this.interactable.bounds.deckY;
        this.interiorRoot.position.set(0, deckY - 0.2, 0);
        this.interiorRoot.updateMatrixWorld(true);

        this.interiorFloorY = this.floorYFromRoot(this.interiorRoot);
        this.exitLocal = this.findExitLocal(this.interiorRoot);
        // Spawn slightly inward from exit
        this.spawnLocal.copy(this.exitLocal);
        this.spawnLocal.z -= 1.2;
        this.spawnLocal.y = this.interiorFloorY + 0.05;

        // Invisible floor plate for raycast if mesh is sparse
        const box = new THREE.Box3().setFromObject(this.interiorRoot);
        const size = box.getSize(new THREE.Vector3());
        const floor = new THREE.Mesh(
          new THREE.BoxGeometry(Math.max(4, size.x * 1.1), 0.15, Math.max(4, size.z * 1.1)),
          new THREE.MeshBasicMaterial({ visible: false }),
        );
        floor.name = 'ship_interior_floor';
        floor.position.set(
          (box.min.x + box.max.x) * 0.5,
          this.interiorFloorY,
          (box.min.z + box.max.z) * 0.5,
        );
        floor.userData.shipInteriorFloor = true;
        this.interiorRoot.add(floor);
      }

      this.interiorRoot.visible = true;
      this.returnDeckLocal.copy(this.getDeckLocalAnchor());

      // World spawn from interior local
      this.interiorRoot.updateWorldMatrix(true, true);
      const worldSpawn = this.interiorRoot.localToWorld(this.spawnLocal.clone());

      // Leave deck lock; walk on interior floor sampler
      this.character.exitShipDeckMode();
      this.character.teleportTo(worldSpawn);
      this.character.enterShipDeckMode(this.interiorRoot, {
        halfWidth: 8,
        halfLength: 12,
        deckY: this.interiorFloorY,
      }, {
        sampleLocalY: () => this.interiorFloorY,
      });

      this._inside = true;
      this.character.model.userData.safeZone = 'ship_interior';
      this.character.model.userData.shipInterior = true;
      this.onPrompt?.('Cabin safe zone · E at door — return to deck');
      console.log('[ShipInterior] entered safe zone');
      return true;
    } finally {
      this._loading = false;
    }
  }

  exit(): boolean {
    if (!this._inside) return false;
    this._inside = false;
    this.character.model.userData.safeZone = null;
    this.character.model.userData.shipInterior = false;
    if (this.interiorRoot) this.interiorRoot.visible = false;

    this.character.exitShipDeckMode();
    // Restore deck boarding
    this.onExitToDeck(this.returnDeckLocal.clone());
    this.onPrompt?.('Back on deck');
    console.log('[ShipInterior] exited to deck');
    return true;
  }

  /**
   * Call from boarding update. Returns true if E was consumed (near door).
   * edge-triggered on E so hold does not spam.
   */
  update(
    dt: number,
    keys: Set<string>,
    localAnchor: THREE.Vector3,
  ): { consumedE: boolean; prompt: string | null } {
    void dt;
    const eDown = keys.has('e') || keys.has('E');
    let consumedE = false;
    let prompt: string | null = null;

    if (this._inside) {
      // Distance to exit in interior local
      const pos = this.character.model.position.clone();
      if (this.interiorRoot) {
        this.interiorRoot.worldToLocal(pos);
      }
      const distExit = Math.hypot(
        pos.x - this.exitLocal.x,
        pos.z - this.exitLocal.z,
      );
      const nearExit = distExit < this.interactRadius;
      if (nearExit) {
        prompt = 'E — return to deck';
        if (eDown && !this._eLatch) {
          this.exit();
          consumedE = true;
        }
      } else {
        prompt = 'Safe cabin · walk to door · E exit';
      }
    } else {
      const door = this.nearestDoor(localAnchor);
      if (door) {
        prompt = `E — enter ${door.label || 'cabin'} (safe zone)`;
        if (eDown && !this._eLatch) {
          void this.enter();
          consumedE = true;
        }
      }
    }

    if (eDown) this._eLatch = true;
    else this._eLatch = false;

    if (prompt) this.onPrompt?.(prompt);
    return { consumedE, prompt };
  }

  dispose(): void {
    for (const m of this.doorMarkers) {
      this.shipRoot.remove(m);
      const mesh = m as THREE.Mesh;
      mesh.geometry?.dispose();
      (mesh.material as THREE.Material)?.dispose?.();
    }
    this.doorMarkers = [];
    if (this.interiorRoot) {
      this.shipRoot.remove(this.interiorRoot);
      this.interiorRoot.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) {
          m.geometry?.dispose();
          const mat = m.material;
          if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
          else mat?.dispose?.();
        }
      });
      this.interiorRoot = null;
    }
    this._inside = false;
    this.character.model.userData.safeZone = null;
  }
}

/** Combat / AI: skip damage when target is in ship interior safe zone. */
export function isInShipInteriorSafeZone(obj: THREE.Object3D | null | undefined): boolean {
  if (!obj) return false;
  return obj.userData?.safeZone === 'ship_interior' || obj.userData?.shipInterior === true;
}
