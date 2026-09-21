/**
 * CinemaStageGraph — runtime Object3D empties for every positional UUID.
 *
 * Best practices (scene cinematics):
 *  - One empty per SSOT location; name = uuid for inspector / gizmo
 *  - Actors parent or snap TO location empties — never free-float XYZ in ticks
 *  - Camera keys read eye/look empties via MultiCameraDirector
 *  - IK targets are live empties (follow bones each frame)
 *  - Optional debug helpers (AxesHelper) behind flag only
 */
import * as THREE from 'three';
import {
  LEVIATHAN_STAGE_LOCATIONS,
  LEVIATHAN_STAGE_ID,
  CIN_LOC_BY_UUID,
  CIN_LOC_BY_KEY,
  type CinLocationDef,
  type CinUuidKey,
} from '@shared/definitions/leviathanCinemaStage';

export class CinemaStageGraph {
  readonly stageId = LEVIATHAN_STAGE_ID;
  readonly root = new THREE.Group();
  private byUuid = new Map<string, THREE.Object3D>();
  private byKey = new Map<string, THREE.Object3D>();
  private defs = new Map<string, CinLocationDef>();

  constructor(debug = false) {
    this.root.name = LEVIATHAN_STAGE_ID;
    for (const loc of LEVIATHAN_STAGE_LOCATIONS) {
      const empty = new THREE.Object3D();
      empty.name = loc.uuid;
      empty.userData.cinKey = loc.key;
      empty.userData.cinRole = loc.role;
      empty.userData.cinTags = loc.tags;
      empty.position.set(loc.position.x, loc.position.y, loc.position.z);
      if (loc.yaw != null) empty.rotation.y = loc.yaw;
      this.root.add(empty);
      this.byUuid.set(loc.uuid, empty);
      this.byKey.set(loc.key, empty);
      this.defs.set(loc.uuid, loc);
      this.defs.set(loc.key, loc);

      if (debug) {
        const axes = new THREE.AxesHelper(0.6);
        axes.name = `${loc.key}_axes`;
        empty.add(axes);
      }
    }
  }

  get(keyOrUuid: string): THREE.Object3D | null {
    return this.byUuid.get(keyOrUuid) ?? this.byKey.get(keyOrUuid) ?? null;
  }

  must(key: CinUuidKey): THREE.Object3D {
    const o = this.byKey.get(key);
    if (!o) throw new Error(`[CinemaStageGraph] missing ${key}`);
    return o;
  }

  def(keyOrUuid: string): CinLocationDef | undefined {
    return this.defs.get(keyOrUuid) ?? CIN_LOC_BY_UUID.get(keyOrUuid) ?? CIN_LOC_BY_KEY.get(keyOrUuid);
  }

  worldPos(keyOrUuid: string, out = new THREE.Vector3()): THREE.Vector3 {
    const o = this.get(keyOrUuid);
    if (!o) return out.set(0, 0, 0);
    o.getWorldPosition(out);
    return out;
  }

  /** Snap object to location empty world pose (optional yaw). */
  place(
    obj: THREE.Object3D,
    keyOrUuid: string,
    opts?: { copyYaw?: boolean; localToParent?: THREE.Object3D | null },
  ): void {
    const marker = this.get(keyOrUuid);
    if (!marker) return;
    const wp = new THREE.Vector3();
    marker.getWorldPosition(wp);

    if (opts?.localToParent) {
      const inv = new THREE.Matrix4().copy(opts.localToParent.matrixWorld).invert();
      wp.applyMatrix4(inv);
      obj.position.copy(wp);
      if (opts.copyYaw) {
        const def = this.def(keyOrUuid);
        if (def?.yaw != null) obj.rotation.y = def.yaw;
      }
      return;
    }

    obj.position.copy(wp);
    if (opts?.copyYaw) {
      const def = this.def(keyOrUuid);
      if (def?.yaw != null) obj.rotation.y = def.yaw;
    }
  }

  /** Move an empty to track a live bone / object (IK target update). */
  follow(
    keyOrUuid: string,
    source: THREE.Object3D,
    offset: THREE.Vector3 = new THREE.Vector3(),
  ): void {
    const marker = this.get(keyOrUuid);
    if (!marker) return;
    const wp = new THREE.Vector3();
    source.getWorldPosition(wp);
    wp.add(offset);
    // Keep markers under stage root: convert world → stage local
    const inv = new THREE.Matrix4().copy(this.root.matrixWorld).invert();
    wp.applyMatrix4(inv);
    marker.position.copy(wp);
  }

  /** Camera eye + look as tuples for MultiCameraDirector. */
  camPair(
    eyeKey: CinUuidKey,
    lookKey: CinUuidKey,
  ): { pos: [number, number, number]; look: [number, number, number]; fov: number } {
    const eye = this.must(eyeKey);
    const look = this.must(lookKey);
    const ep = new THREE.Vector3();
    const lp = new THREE.Vector3();
    eye.getWorldPosition(ep);
    look.getWorldPosition(lp);
    const fov = this.def(eyeKey)?.fov ?? 42;
    return {
      pos: [ep.x, ep.y, ep.z],
      look: [lp.x, lp.y, lp.z],
      fov,
    };
  }

  dispose(): void {
    this.root.traverse((o) => {
      if (o instanceof THREE.AxesHelper) {
        (o as THREE.AxesHelper).geometry?.dispose();
        ((o as THREE.AxesHelper).material as THREE.Material)?.dispose?.();
      }
    });
    this.byUuid.clear();
    this.byKey.clear();
    this.root.clear();
  }
}
