/**
 * BuildingSystem — Conan-style snap-point construction with structural integrity.
 *
 * Each piece type defines snap sockets. During placement, the ghost mesh snaps
 * to the nearest compatible socket. Stability propagates via BFS from
 * foundations; pieces at 0 stability cascade-collapse.
 */
import * as THREE from 'three';
import {
  BUILD_ASSETS, getBuildAsset,
  type BuildAssetDef, type BuildCategory,
} from './BuildAssetManifest';
import { loadBuildAssetModel, buildPlaceY } from './PackModelLoader';

// ─── Building Piece Definitions ───────────────────────────────────────────────

export type PieceType = 'foundation' | 'wall' | 'ceiling' | 'stairs' | 'pillar' | 'doorframe' | 'window';

export interface SnapSocket {
  id: string;
  /** Position relative to piece origin */
  localPosition: THREE.Vector3;
  /** Rotation relative to piece origin */
  localRotation: THREE.Euler;
  /** Which piece types can connect here */
  compatibleWith: PieceType[];
}

export interface PieceDefinition {
  type: PieceType;
  /** Base stability value (foundation=100) */
  stability: number;
  /** Stability cost subtracted when connecting through this piece */
  stabilityCost: number;
  /** Mesh geometry dimensions */
  size: THREE.Vector3;
  /** Snap sockets */
  sockets: SnapSocket[];
  /** Color for placeholder mesh */
  color: number;
}

const S = 4; // standard grid unit (4m like Conan)

export const PIECE_DEFS: Record<PieceType, PieceDefinition> = {
  foundation: {
    type: 'foundation',
    stability: 100,
    stabilityCost: 0,
    size: new THREE.Vector3(S, 0.5, S),
    color: 0x888888,
    sockets: [
      { id: 'top',   localPosition: new THREE.Vector3(0, 0.5, 0),   localRotation: new THREE.Euler(), compatibleWith: ['wall', 'pillar', 'doorframe', 'stairs'] },
      { id: 'north', localPosition: new THREE.Vector3(0, 0.25, -S/2), localRotation: new THREE.Euler(), compatibleWith: ['foundation', 'wall'] },
      { id: 'south', localPosition: new THREE.Vector3(0, 0.25, S/2),  localRotation: new THREE.Euler(), compatibleWith: ['foundation', 'wall'] },
      { id: 'east',  localPosition: new THREE.Vector3(S/2, 0.25, 0),  localRotation: new THREE.Euler(), compatibleWith: ['foundation', 'wall'] },
      { id: 'west',  localPosition: new THREE.Vector3(-S/2, 0.25, 0), localRotation: new THREE.Euler(), compatibleWith: ['foundation', 'wall'] },
    ],
  },
  wall: {
    type: 'wall',
    stability: 80,
    stabilityCost: 20,
    size: new THREE.Vector3(S, S, 0.3),
    color: 0xaa8844,
    sockets: [
      { id: 'bottom', localPosition: new THREE.Vector3(0, 0, 0),      localRotation: new THREE.Euler(), compatibleWith: ['foundation'] },
      { id: 'top',    localPosition: new THREE.Vector3(0, S, 0),      localRotation: new THREE.Euler(), compatibleWith: ['ceiling', 'wall'] },
      { id: 'left',   localPosition: new THREE.Vector3(-S/2, S/2, 0), localRotation: new THREE.Euler(), compatibleWith: ['wall', 'doorframe', 'window'] },
      { id: 'right',  localPosition: new THREE.Vector3(S/2, S/2, 0),  localRotation: new THREE.Euler(), compatibleWith: ['wall', 'doorframe', 'window'] },
    ],
  },
  ceiling: {
    type: 'ceiling',
    stability: 60,
    stabilityCost: 20,
    size: new THREE.Vector3(S, 0.3, S),
    color: 0x666666,
    sockets: [
      { id: 'bottom', localPosition: new THREE.Vector3(0, 0, 0),     localRotation: new THREE.Euler(), compatibleWith: ['wall', 'pillar'] },
      { id: 'top',    localPosition: new THREE.Vector3(0, 0.3, 0),   localRotation: new THREE.Euler(), compatibleWith: ['wall', 'pillar', 'stairs'] },
    ],
  },
  stairs: {
    type: 'stairs',
    stability: 70,
    stabilityCost: 15,
    size: new THREE.Vector3(S, S, S),
    color: 0x997755,
    sockets: [
      { id: 'bottom', localPosition: new THREE.Vector3(0, 0, S/2),   localRotation: new THREE.Euler(), compatibleWith: ['foundation', 'ceiling'] },
      { id: 'top',    localPosition: new THREE.Vector3(0, S, -S/2),  localRotation: new THREE.Euler(), compatibleWith: ['ceiling', 'foundation'] },
    ],
  },
  pillar: {
    type: 'pillar',
    stability: 90,
    stabilityCost: 10,
    size: new THREE.Vector3(0.5, S, 0.5),
    color: 0x555555,
    sockets: [
      { id: 'bottom', localPosition: new THREE.Vector3(0, 0, 0),     localRotation: new THREE.Euler(), compatibleWith: ['foundation', 'ceiling'] },
      { id: 'top',    localPosition: new THREE.Vector3(0, S, 0),     localRotation: new THREE.Euler(), compatibleWith: ['ceiling'] },
    ],
  },
  doorframe: {
    type: 'doorframe',
    stability: 75,
    stabilityCost: 20,
    size: new THREE.Vector3(S, S, 0.3),
    color: 0x996633,
    sockets: [
      { id: 'bottom', localPosition: new THREE.Vector3(0, 0, 0),     localRotation: new THREE.Euler(), compatibleWith: ['foundation'] },
      { id: 'top',    localPosition: new THREE.Vector3(0, S, 0),     localRotation: new THREE.Euler(), compatibleWith: ['ceiling', 'wall'] },
    ],
  },
  window: {
    type: 'window',
    stability: 75,
    stabilityCost: 20,
    size: new THREE.Vector3(S, S, 0.3),
    color: 0x88aacc,
    sockets: [
      { id: 'bottom', localPosition: new THREE.Vector3(0, 0, 0),     localRotation: new THREE.Euler(), compatibleWith: ['foundation'] },
      { id: 'top',    localPosition: new THREE.Vector3(0, S, 0),     localRotation: new THREE.Euler(), compatibleWith: ['ceiling', 'wall'] },
    ],
  },
};

// ─── Placed piece ─────────────────────────────────────────────────────────────

export interface PlacedPiece {
  id: string;
  type: PieceType;
  position: THREE.Vector3;
  rotation: THREE.Euler;
  stability: number;
  connections: string[]; // IDs of connected pieces
  mesh: THREE.Mesh;
}

export interface BuildConstraints {
  terrainMesh?: THREE.Mesh;
  minHeightM: number;
  maxHeightM: number;
  maxSlopeRad: number;
  campCenter?: { x: number; z: number };
  campRadiusM?: number;
  /** Ocean / water plane Y — docks use placeYOffset above this */
  waterLevel?: number;
  sampleHeight?: (x: number, z: number) => number | null;
  sampleNormal?: (x: number, z: number) => THREE.Vector3 | null;
}

// ─── Building System ──────────────────────────────────────────────────────────

export class BuildingSystem {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private pieces = new Map<string, PlacedPiece>();
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private buildConstraints: BuildConstraints | null = null;

  // Ghost (build preview)
  private ghost: THREE.Mesh | null = null;
  private ghostType: PieceType | null = null;
  private ghostValid = false;
  private snapTarget: { pieceId: string; socketId: string; worldPos: THREE.Vector3; rotation: THREE.Euler } | null = null;

  // ─── Prop placement (from BuildAssetManifest) ───────────────────────────────
  private propGhost: THREE.Group | null = null;
  private propAsset: BuildAssetDef | null = null;
  private propRotation = 0; // Y rotation in 90° increments
  private propValid = false;
  private placedProps: Array<{ id: string; assetId: string; group: THREE.Group; position: THREE.Vector3; rotation: number }> = [];

  // Materials — RTS-style light-blue placement ghost (opaque-ish)
  private validGhostMat: THREE.MeshBasicMaterial;
  private invalidGhostMat: THREE.MeshBasicMaterial;
  /** Light blue tint for valid placement (user request) */
  static readonly GHOST_BLUE = 0x64b5f6;
  static readonly GHOST_BLUE_INVALID = 0x4a6a8a;
  static readonly GHOST_OPACITY = 0.72;

  /** Configure terrain slope/height rules for foundations and terrain props */
  setBuildConstraints(constraints: BuildConstraints): void {
    this.buildConstraints = constraints;
  }

  private isBuildableAt(x: number, z: number, y: number, requireCamp = false): boolean {
    const c = this.buildConstraints;
    if (!c) return true;

    if (y < c.minHeightM || y > c.maxHeightM) return false;

    if (requireCamp && c.campCenter && c.campRadiusM) {
      const dx = x - c.campCenter.x;
      const dz = z - c.campCenter.z;
      if (Math.hypot(dx, dz) > c.campRadiusM) return false;
    }

    const normal = c.sampleNormal?.(x, z);
    if (normal) {
      const slope = Math.acos(Math.min(1, Math.max(-1, normal.y)));
      if (slope > c.maxSlopeRad) return false;
    }

    return true;
  }

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
    this.scene = scene;
    this.camera = camera;
    this.validGhostMat = new THREE.MeshBasicMaterial({
      color: BuildingSystem.GHOST_BLUE,
      transparent: true,
      opacity: BuildingSystem.GHOST_OPACITY,
      depthWrite: false,
    });
    this.invalidGhostMat = new THREE.MeshBasicMaterial({
      color: BuildingSystem.GHOST_BLUE_INVALID,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    });

    // T rotates prop 90° (R is harvest tool radial in ModePlayHUD)
    window.addEventListener('keydown', (e) => {
      if (e.key === 't' || e.key === 'T') {
        if (this.propGhost) {
          this.propRotation = (this.propRotation + Math.PI / 2) % (Math.PI * 2);
          this.propGhost.rotation.y = this.propRotation;
        }
      }
    });
  }

  /** Apply light-blue ghost look to any mesh materials in a root. */
  private applyGhostMaterials(root: THREE.Object3D, valid: boolean): void {
    const color = valid ? BuildingSystem.GHOST_BLUE : BuildingSystem.GHOST_BLUE_INVALID;
    const opacity = valid ? BuildingSystem.GHOST_OPACITY : 0.45;
    root.traverse((child) => {
      if (!(child as THREE.Mesh).isMesh) return;
      const m = child as THREE.Mesh;
      const mats = Array.isArray(m.material) ? m.material : [m.material];
      for (const mat of mats) {
        if (!mat) continue;
        const any = mat as THREE.MeshBasicMaterial & THREE.MeshStandardMaterial;
        if ('color' in any && any.color) any.color.setHex(color);
        any.transparent = true;
        any.opacity = opacity;
        any.depthWrite = false;
        if ('emissive' in any && any.emissive) {
          any.emissive.setHex(color);
          any.emissiveIntensity = valid ? 0.35 : 0.1;
        }
      }
    });
  }

  /** Enter build mode for a piece type */
  startPlacement(type: PieceType): void {
    this.cancelPlacement();
    this.cancelPropPlacement();
    this.ghostType = type;
    const def = PIECE_DEFS[type];
    const geo = new THREE.BoxGeometry(def.size.x, def.size.y, def.size.z);
    this.ghost = new THREE.Mesh(geo, this.validGhostMat.clone());
    this.ghost.castShadow = false;
    this.ghost.receiveShadow = false;
    this.scene.add(this.ghost);
  }

  /** Cancel build mode */
  cancelPlacement(): void {
    if (this.ghost) {
      this.scene.remove(this.ghost);
      this.ghost.geometry.dispose();
      this.ghost = null;
    }
    this.ghostType = null;
    this.snapTarget = null;
    this.ghostValid = false;
  }

  /** Update ghost position from mouse coords (call on mousemove) */
  updateGhostPosition(clientX: number, clientY: number, canvas: HTMLCanvasElement): void {
    if (!this.ghost || !this.ghostType) return;

    const rect = canvas.getBoundingClientRect();
    this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);

    // If we have existing pieces, try to snap to their sockets
    this.snapTarget = this.findNearestSocket();

    if (this.snapTarget) {
      this.ghost.position.copy(this.snapTarget.worldPos);
      this.ghost.rotation.copy(this.snapTarget.rotation);
      this.ghostValid = true;
    } else if (this.ghostType === 'foundation') {
      // Foundations can be placed freely on terrain
      const allMeshes = this.scene.children.filter(c => c instanceof THREE.Mesh && c !== this.ghost) as THREE.Mesh[];
      const hits = this.raycaster.intersectObjects(allMeshes);
      if (hits.length > 0) {
        const pt = hits[0].point;
        const gx = Math.round(pt.x / S) * S;
        const gz = Math.round(pt.z / S) * S;
        const gy = pt.y + 0.25;
        this.ghost.position.set(gx, gy, gz);
        this.ghostValid = this.isBuildableAt(gx, gz, gy, true);
      } else {
        this.ghostValid = false;
      }
    } else {
      this.ghostValid = false;
    }

    this.ghost.material = this.ghostValid ? this.validGhostMat : this.invalidGhostMat;
    this.applyGhostMaterials(this.ghost, this.ghostValid);
  }

  /** Confirm placement — LMB. Keeps same piece type selected for continuous build. */
  confirmPlacement(): PlacedPiece | null {
    if (!this.ghost || !this.ghostType || !this.ghostValid) return null;

    const def = PIECE_DEFS[this.ghostType];
    const placedType = this.ghostType;
    const id = `piece_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    // Create permanent mesh
    const geo = new THREE.BoxGeometry(def.size.x, def.size.y, def.size.z);
    const mat = new THREE.MeshStandardMaterial({ color: def.color, roughness: 0.8, metalness: 0.1 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(this.ghost.position);
    mesh.rotation.copy(this.ghost.rotation);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);

    const piece: PlacedPiece = {
      id,
      type: placedType,
      position: this.ghost.position.clone(),
      rotation: this.ghost.rotation.clone(),
      stability: def.stability,
      connections: [],
      mesh,
    };

    // Connect to snap source
    if (this.snapTarget) {
      const sourcePiece = this.pieces.get(this.snapTarget.pieceId);
      if (sourcePiece) {
        sourcePiece.connections.push(id);
        piece.connections.push(sourcePiece.id);
      }
    }

    this.pieces.set(id, piece);
    this.recalculateStability();
    // Re-arm ghost so next LMB places again (RTS continuous build)
    this.cancelPlacement();
    this.startPlacement(placedType);

    return piece;
  }

  /** Remove a piece and cascade-collapse unstable pieces */
  removePiece(id: string): string[] {
    const piece = this.pieces.get(id);
    if (!piece) return [];

    // Remove from scene
    this.scene.remove(piece.mesh);
    piece.mesh.geometry.dispose();
    (piece.mesh.material as THREE.Material).dispose();

    // Remove connections
    for (const connId of piece.connections) {
      const conn = this.pieces.get(connId);
      if (conn) {
        conn.connections = conn.connections.filter(c => c !== id);
      }
    }

    this.pieces.delete(id);

    // Recalculate and collapse
    return this.recalculateStability();
  }

  // ─── Stability BFS ──────────────────────────────────────────────────────────

  private recalculateStability(): string[] {
    // Reset all to 0
    for (const [, piece] of this.pieces) {
      piece.stability = 0;
    }

    // BFS from foundations
    const queue: string[] = [];
    for (const [id, piece] of this.pieces) {
      if (piece.type === 'foundation') {
        piece.stability = PIECE_DEFS.foundation.stability;
        queue.push(id);
      }
    }

    const visited = new Set<string>();
    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (visited.has(currentId)) continue;
      visited.add(currentId);

      const current = this.pieces.get(currentId);
      if (!current) continue;

      for (const connId of current.connections) {
        if (visited.has(connId)) continue;
        const conn = this.pieces.get(connId);
        if (!conn) continue;

        const def = PIECE_DEFS[conn.type];
        const propagated = current.stability - def.stabilityCost;
        if (propagated > conn.stability) {
          conn.stability = propagated;
          queue.push(connId);
        }
      }
    }

    // Collapse pieces with 0 stability (not foundations)
    const collapsed: string[] = [];
    for (const [id, piece] of this.pieces) {
      if (piece.stability <= 0 && piece.type !== 'foundation') {
        collapsed.push(id);
      }
    }

    for (const id of collapsed) {
      const piece = this.pieces.get(id);
      if (piece) {
        this.scene.remove(piece.mesh);
        piece.mesh.geometry.dispose();
        (piece.mesh.material as THREE.Material).dispose();
        // Clean connections
        for (const connId of piece.connections) {
          const conn = this.pieces.get(connId);
          if (conn) conn.connections = conn.connections.filter(c => c !== id);
        }
        this.pieces.delete(id);
      }
    }

    return collapsed;
  }

  // ─── Socket detection ───────────────────────────────────────────────────────

  private findNearestSocket(): { pieceId: string; socketId: string; worldPos: THREE.Vector3; rotation: THREE.Euler } | null {
    if (!this.ghostType) return null;

    const rayOrigin = this.raycaster.ray.origin;
    const rayDir = this.raycaster.ray.direction;

    let best: { pieceId: string; socketId: string; worldPos: THREE.Vector3; rotation: THREE.Euler; dist: number } | null = null;
    const snapRange = 3;

    for (const [pieceId, piece] of this.pieces) {
      const def = PIECE_DEFS[piece.type];
      for (const socket of def.sockets) {
        if (!socket.compatibleWith.includes(this.ghostType)) continue;

        // Socket world position
        const worldPos = socket.localPosition.clone()
          .applyEuler(piece.rotation)
          .add(piece.position);

        // Distance from ray to socket
        const toSocket = worldPos.clone().sub(rayOrigin);
        const projLen = toSocket.dot(rayDir);
        if (projLen < 0) continue;
        const closest = rayOrigin.clone().add(rayDir.clone().multiplyScalar(projLen));
        const dist = closest.distanceTo(worldPos);

        if (dist < snapRange && (!best || dist < best.dist)) {
          best = {
            pieceId,
            socketId: socket.id,
            worldPos,
            rotation: new THREE.Euler(
              piece.rotation.x + socket.localRotation.x,
              piece.rotation.y + socket.localRotation.y,
              piece.rotation.z + socket.localRotation.z,
            ),
            dist,
          };
        }
      }
    }

    return best ? { pieceId: best.pieceId, socketId: best.socketId, worldPos: best.worldPos, rotation: best.rotation } : null;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PROP PLACEMENT (terrain-snapping, free rotation)
  // ═══════════════════════════════════════════════════════════════════════════

  /** Enter prop build mode for an asset from the manifest */
  startPropPlacement(assetId: string): void {
    const asset = getBuildAsset(assetId);
    if (!asset) return;

    this.cancelPlacement();
    this.cancelPropPlacement();
    this.propAsset = asset;
    this.propRotation = 0;

    // Create ghost group with light-blue opaque placeholder
    this.propGhost = new THREE.Group();
    this.propGhost.name = 'build_prop_ghost';
    const [w, h, d] = asset.size;
    const geo = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geo, this.validGhostMat.clone());
    mesh.position.y = h / 2;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    this.propGhost.add(mesh);
    this.scene.add(this.propGhost);
    this.applyGhostMaterials(this.propGhost, true);

    // Pack multipack GLB + node extract (survival kit / towers / benches)
    if (asset.modelPath) {
      void loadBuildAssetModel(asset).then((model) => {
        if (!this.propGhost || this.propAsset?.id !== assetId) return;
        while (this.propGhost.children.length) this.propGhost.remove(this.propGhost.children[0]);
        model.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const m = child as THREE.Mesh;
            if (Array.isArray(m.material)) {
              m.material = m.material.map((mt) => mt.clone());
            } else if (m.material) {
              m.material = m.material.clone();
            }
            m.castShadow = false;
            m.receiveShadow = false;
          }
        });
        this.propGhost!.add(model);
        this.applyGhostMaterials(this.propGhost!, this.propValid);
      }).catch(() => {});
    }
  }

  /** Cancel prop placement */
  cancelPropPlacement(): void {
    if (this.propGhost) {
      this.scene.remove(this.propGhost);
      this.propGhost.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const m = child as THREE.Mesh;
          m.geometry?.dispose();
          if (Array.isArray(m.material)) m.material.forEach(mt => mt.dispose());
          else m.material?.dispose();
        }
      });
      this.propGhost = null;
    }
    this.propAsset = null;
    this.propValid = false;
  }

  /** Update prop ghost position from mouse (raycast to terrain) */
  updatePropGhostPosition(clientX: number, clientY: number, canvas: HTMLCanvasElement): void {
    if (!this.propGhost || !this.propAsset) return;

    const rect = canvas.getBoundingClientRect();
    this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);

    // Raycast against all meshes in scene (terrain, foundations, floors)
    const ghostChildren = this.propGhost ? Array.from(this.propGhost.children) : [];
    const targets = this.scene.children.filter(
      c => c instanceof THREE.Mesh && (c as THREE.Object3D) !== this.propGhost && !ghostChildren.includes(c)
    ) as THREE.Mesh[];
    const hits = this.raycaster.intersectObjects(targets, true);

    if (hits.length > 0) {
      const pt = hits[0].point;
      const normal = hits[0].face?.normal;

      const slopeOk = normal
        ? Math.acos(Math.min(1, Math.max(-1, normal.y))) <= (this.buildConstraints?.maxSlopeRad ?? 0.55)
        : true;

      if (this.propAsset.terrainPlaceable || this.isOnFoundation(pt) || this.propAsset.floating) {
        // Dock / float: deck at max(ground, water) + placeYOffset (default water+0.2)
        const y = buildPlaceY(pt.y, this.propAsset, this.buildConstraints?.waterLevel);
        this.propGhost.position.set(pt.x, y, pt.z);
        this.propGhost.rotation.y = this.propRotation;
        const onFoundation = this.isOnFoundation(pt);
        // Floating foundations allowed outside strict slope band near shore
        const heightOk = this.propAsset.floating
          ? true
          : this.isBuildableAt(pt.x, pt.z, pt.y, !onFoundation);
        this.propValid = (slopeOk || !!this.propAsset.floating) && heightOk;
      } else {
        this.propValid = false;
      }
    } else {
      this.propValid = false;
    }

    // Light-blue ghost tint (valid / invalid)
    this.applyGhostMaterials(this.propGhost, this.propValid);
  }

  /** Confirm prop placement — LMB. Keeps same asset for continuous place. */
  confirmPropPlacement(): { id: string; assetId: string } | null {
    if (!this.propGhost || !this.propAsset || !this.propValid) return null;

    const id = `prop_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const asset = this.propAsset;
    const assetId = asset.id;
    const pos = this.propGhost.position.clone();
    const rot = this.propRotation;

    // Create permanent mesh
    const group = new THREE.Group();
    group.position.copy(pos);
    group.rotation.y = rot;

    // Start with placeholder
    const [w, h, d] = asset.size;
    const geo = new THREE.BoxGeometry(w, h, d);
    const mat = new THREE.MeshStandardMaterial({ color: asset.color, roughness: 0.8, metalness: 0.1 });
    const placeholder = new THREE.Mesh(geo, mat);
    placeholder.position.y = h / 2;
    placeholder.castShadow = true;
    placeholder.receiveShadow = true;
    placeholder.name = '__placeholder';
    group.add(placeholder);
    this.scene.add(group);

    // Load multipack/node model (survival kit benches, towers, docks)
    if (asset.modelPath) {
      void loadBuildAssetModel(asset).then((model) => {
        const ph = group.getObjectByName('__placeholder');
        if (ph) group.remove(ph);
        model.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        group.add(model);
      }).catch(() => {});
    }

    this.placedProps.push({ id, assetId, group, position: pos, rotation: rot });
    this.cancelPropPlacement();
    // Continuous build — ghost stays armed with same asset
    this.startPropPlacement(assetId);

    return { id, assetId };
  }

  /** Remove a placed prop */
  removeProp(propId: string): boolean {
    const idx = this.placedProps.findIndex(p => p.id === propId);
    if (idx === -1) return false;

    const prop = this.placedProps[idx];
    this.scene.remove(prop.group);
    prop.group.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const m = child as THREE.Mesh;
        m.geometry?.dispose();
        if (Array.isArray(m.material)) m.material.forEach(mt => mt.dispose());
        else m.material?.dispose();
      }
    });
    this.placedProps.splice(idx, 1);
    return true;
  }

  /** Check if a point is on top of a placed foundation */
  private isOnFoundation(point: THREE.Vector3): boolean {
    for (const [, piece] of this.pieces) {
      if (piece.type !== 'foundation') continue;
      const dx = Math.abs(point.x - piece.position.x);
      const dz = Math.abs(point.z - piece.position.z);
      const dy = point.y - piece.position.y;
      if (dx < S / 2 && dz < S / 2 && dy >= 0 && dy < 1) return true;
    }
    return false;
  }

  // ─── Queries ────────────────────────────────────────────────────────────────

  get isBuilding(): boolean { return this.ghost !== null || this.propGhost !== null; }
  get isPropPlacing(): boolean { return this.propGhost !== null && this.propAsset !== null; }
  get isPiecePlacing(): boolean { return this.ghost !== null && this.ghostType !== null; }
  get selectedPropId(): string | null { return this.propAsset?.id ?? null; }
  get selectedPieceType(): PieceType | null { return this.ghostType; }
  get pieceCount(): number { return this.pieces.size; }
  get propCount(): number { return this.placedProps.length; }

  getAllPieces(): PlacedPiece[] { return Array.from(this.pieces.values()); }
  getAllProps(): typeof this.placedProps { return this.placedProps; }

  getPiece(id: string): PlacedPiece | undefined { return this.pieces.get(id); }

  /** Get total effect values from all placed props of a given type */
  getEffectTotal(effectType: string): number {
    let total = 0;
    for (const prop of this.placedProps) {
      const asset = getBuildAsset(prop.assetId);
      if (asset?.effect?.type === effectType) total += asset.effect.value;
    }
    return total;
  }

  destroy(): void {
    this.cancelPlacement();
    this.cancelPropPlacement();
    for (const [, piece] of this.pieces) {
      this.scene.remove(piece.mesh);
      piece.mesh.geometry.dispose();
      (piece.mesh.material as THREE.Material).dispose();
    }
    this.pieces.clear();
    for (const prop of this.placedProps) {
      this.scene.remove(prop.group);
    }
    this.placedProps = [];
    this.validGhostMat.dispose();
    this.invalidGhostMat.dispose();
  }
}
