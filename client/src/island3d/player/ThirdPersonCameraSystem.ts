/**
 * ThirdPersonCameraSystem — editable third-person camera.
 *
 * Patterns adapted from hh-hang/three-player-controller CameraSystem:
 *   - Spherical orbit (yaw / pitch / distance) around look-at target
 *   - Look-at height as ratio of character height (not magic constants)
 *   - Over-shoulder lateral offset (OTS)
 *   - Raycast obstacle push-in with smooth lerp
 *   - Optional critically-damped spring on look target
 *   - All knobs public for lil-gui / editor tooling
 *
 * @see https://github.com/hh-hang/three-player-controller
 */
import * as THREE from 'three';

export interface ThirdPersonCameraConfig {
  /** Min orbit radius (m) */
  minDistance: number;
  /** Max orbit radius (m) */
  maxDistance: number;
  /** Default orbit radius (m) */
  distance: number;
  /** Look-at height as ratio of character height (0 = feet, 1 = head). ~0.75 chest. */
  lookAtHeightRatio: number;
  /** Absolute look-at Y offset when characterHeight unknown (fallback) */
  lookAtHeightFallback: number;
  /** Over-shoulder world offset (m), scaled by distance */
  overShoulder: number;
  /** Extra lift of camera pivot along up (m) */
  shoulderHeight: number;
  /** Mouse orbit sensitivity (radians per pixel) */
  sensitivity: number;
  /** Pitch clamp [min, max] radians from horizontal */
  pitchMin: number;
  pitchMax: number;
  /** Position follow lerp rate (higher = snappier) */
  positionLerp: number;
  /** Collision push-in lerp (0–1 per frame style) */
  collisionLerp: number;
  /** Safe gap in front of wall (m) */
  collisionEpsilon: number;
  /** Enable spring damping on look target */
  enableSpring: boolean;
  /** Spring smooth time (s) */
  springTime: number;
  /** Zoom enabled (wheel) */
  zoomEnabled: boolean;
  /** Zoom speed (m per wheel notch) */
  zoomSpeed: number;
}

export const DEFAULT_TPC_CONFIG: ThirdPersonCameraConfig = {
  minDistance: 2.2,
  maxDistance: 16,
  distance: 8,
  lookAtHeightRatio: 0.72,
  lookAtHeightFallback: 1.55,
  overShoulder: 0.45,
  shoulderHeight: 0.15,
  sensitivity: 0.003,
  pitchMin: 0.08,
  pitchMax: 1.15,
  positionLerp: 12,
  collisionLerp: 0.22,
  collisionEpsilon: 0.35,
  enableSpring: true,
  springTime: 0.06,
  zoomEnabled: true,
  zoomSpeed: 0.55,
};

/**
 * Editable third-person camera. Attach to a PerspectiveCamera; call
 * `applyMouse` / `applyZoom` from input, `update` each frame after player moves.
 */
export class ThirdPersonCameraSystem {
  /** Mutable config — bind to GUI or editor panels. */
  config: ThirdPersonCameraConfig;

  yaw = 0;
  pitch = 0.32;
  distance: number;

  private camera: THREE.PerspectiveCamera;
  private lookTarget = new THREE.Vector3();
  private springVel = new THREE.Vector3();
  private springOut = new THREE.Vector3();
  private desiredPos = new THREE.Vector3();
  private playerToCam = new THREE.Vector3();
  private raycaster = new THREE.Raycaster();
  private colliders: THREE.Object3D[] = [];
  private characterHeight = 2;

  constructor(camera: THREE.PerspectiveCamera, config?: Partial<ThirdPersonCameraConfig>) {
    this.camera = camera;
    this.config = { ...DEFAULT_TPC_CONFIG, ...config };
    this.distance = this.config.distance;
    (this.raycaster as THREE.Raycaster & { firstHitOnly?: boolean }).firstHitOnly = true;
  }

  /** Bind collision meshes (terrain, buildings, ship hull). */
  setColliders(objects: THREE.Object3D[]): void {
    this.colliders = objects.filter(Boolean);
  }

  setCharacterHeight(h: number): void {
    this.characterHeight = Math.max(0.5, h);
  }

  /** Export flat knobs for lil-gui. */
  getEditableParams(): Record<string, number | boolean> {
    const c = this.config;
    return {
      minDistance: c.minDistance,
      maxDistance: c.maxDistance,
      distance: this.distance,
      lookAtHeightRatio: c.lookAtHeightRatio,
      overShoulder: c.overShoulder,
      shoulderHeight: c.shoulderHeight,
      sensitivity: c.sensitivity,
      pitchMin: c.pitchMin,
      pitchMax: c.pitchMax,
      positionLerp: c.positionLerp,
      collisionLerp: c.collisionLerp,
      collisionEpsilon: c.collisionEpsilon,
      enableSpring: c.enableSpring,
      springTime: c.springTime,
      zoomEnabled: c.zoomEnabled,
      zoomSpeed: c.zoomSpeed,
    };
  }

  applyEditableParams(p: Partial<Record<string, number | boolean>>): void {
    const c = this.config;
    if (p.minDistance != null) c.minDistance = Number(p.minDistance);
    if (p.maxDistance != null) c.maxDistance = Number(p.maxDistance);
    if (p.distance != null) this.distance = THREE.MathUtils.clamp(Number(p.distance), c.minDistance, c.maxDistance);
    if (p.lookAtHeightRatio != null) c.lookAtHeightRatio = Number(p.lookAtHeightRatio);
    if (p.overShoulder != null) c.overShoulder = Number(p.overShoulder);
    if (p.shoulderHeight != null) c.shoulderHeight = Number(p.shoulderHeight);
    if (p.sensitivity != null) c.sensitivity = Number(p.sensitivity);
    if (p.pitchMin != null) c.pitchMin = Number(p.pitchMin);
    if (p.pitchMax != null) c.pitchMax = Number(p.pitchMax);
    if (p.positionLerp != null) c.positionLerp = Number(p.positionLerp);
    if (p.collisionLerp != null) c.collisionLerp = Number(p.collisionLerp);
    if (p.collisionEpsilon != null) c.collisionEpsilon = Number(p.collisionEpsilon);
    if (p.enableSpring != null) c.enableSpring = Boolean(p.enableSpring);
    if (p.springTime != null) c.springTime = Number(p.springTime);
    if (p.zoomEnabled != null) c.zoomEnabled = Boolean(p.zoomEnabled);
    if (p.zoomSpeed != null) c.zoomSpeed = Number(p.zoomSpeed);
  }

  applyMouse(dx: number, dy: number): void {
    const s = this.config.sensitivity;
    this.yaw -= dx * s;
    this.pitch = THREE.MathUtils.clamp(
      this.pitch + dy * s,
      this.config.pitchMin,
      this.config.pitchMax,
    );
  }

  applyZoom(deltaY: number): void {
    if (!this.config.zoomEnabled) return;
    const step = Math.sign(deltaY) * this.config.zoomSpeed;
    this.distance = THREE.MathUtils.clamp(
      this.distance + step,
      this.config.minDistance,
      this.config.maxDistance,
    );
  }

  getYaw(): number {
    return this.yaw;
  }

  getPitch(): number {
    return this.pitch;
  }

  setYaw(y: number): void {
    this.yaw = y;
  }

  setPitch(p: number): void {
    this.pitch = THREE.MathUtils.clamp(p, this.config.pitchMin, this.config.pitchMax);
  }

  /**
   * Look-at point at chest/head height (ratio of character height).
   * Matches three-player-controller getLookAtPoint height ratio.
   */
  getLookAtPoint(playerPos: THREE.Vector3): THREE.Vector3 {
    const h = this.characterHeight > 0
      ? this.characterHeight * this.config.lookAtHeightRatio
      : this.config.lookAtHeightFallback;
    return this.lookTarget.set(playerPos.x, playerPos.y + h + this.config.shoulderHeight, playerPos.z);
  }

  /** Critically-damped spring toward dest (Game Programming Gems style). */
  private springTarget(dest: THREE.Vector3, current: THREE.Vector3, delta: number): THREE.Vector3 {
    if (!this.config.enableSpring) return dest;
    const smoothTime = Math.max(0.0001, this.config.springTime);
    const omega = 2 / smoothTime;
    const x = omega * delta;
    const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
    const v = this.springVel;
    const out = this.springOut;
    for (const a of ['x', 'y', 'z'] as const) {
      const change = current[a] - dest[a];
      const temp = (v[a] + omega * change) * delta;
      v[a] = (v[a] - omega * temp) * exp;
      let o = dest[a] + (change + temp) * exp;
      if ((dest[a] - current[a] > 0) === (o > dest[a])) {
        o = dest[a];
        v[a] = 0;
      }
      out[a] = o;
    }
    return out;
  }

  /**
   * Desired camera world position from spherical coords + OTS offset.
   */
  private computeDesired(lookAt: THREE.Vector3): THREE.Vector3 {
    const dist = this.distance;
    const phi = this.pitch; // elevation from horizontal (0 = horizon)
    const theta = this.yaw;

    // Spherical: behind player along yaw, lifted by pitch
    const horiz = Math.cos(phi) * dist;
    const y = Math.sin(phi) * dist;
    const x = Math.sin(theta) * horiz;
    const z = Math.cos(theta) * horiz;

    this.desiredPos.set(lookAt.x + x, lookAt.y + y, lookAt.z + z);

    // Over-shoulder: shift along camera-right
    if (Math.abs(this.config.overShoulder) > 1e-4) {
      const right = new THREE.Vector3(Math.cos(theta), 0, -Math.sin(theta));
      this.desiredPos.addScaledVector(right, this.config.overShoulder);
    }
    return this.desiredPos;
  }

  /**
   * Raycast from look-at toward camera; pull in if obstructed.
   * (three-player-controller updateWithRaycast)
   */
  private applyCollision(origin: THREE.Vector3, desired: THREE.Vector3): THREE.Vector3 {
    if (!this.colliders.length) return desired;

    this.playerToCam.subVectors(desired, origin);
    const maxDist = this.playerToCam.length();
    if (maxDist < 1e-4) return desired;
    const dir = this.playerToCam.clone().normalize();

    this.raycaster.set(origin, dir);
    this.raycaster.far = maxDist;
    this.raycaster.near = 0.05;

    const hits = this.raycaster.intersectObjects(this.colliders, true);
    if (hits.length > 0) {
      // Skip hits too close to origin (self)
      const hit = hits.find((h) => h.distance > 0.15) ?? hits[0];
      const safe = Math.max(
        hit.distance - this.config.collisionEpsilon,
        this.config.minDistance * 0.45,
      );
      return origin.clone().addScaledVector(dir, safe);
    }
    return desired;
  }

  /**
   * Frame update. Call after player position is final for the frame.
   * @param playerPos feet / root world position
   * @param dt seconds
   * @param instant snap without lerp (cutscenes)
   */
  update(playerPos: THREE.Vector3, dt: number, instant = false): void {
    const rawLook = this.getLookAtPoint(playerPos);
    // Smooth look target (spring) using previous look-at projected from camera
    const prevLook = new THREE.Vector3();
    this.camera.getWorldDirection(prevLook);
    // Use last look-at stored in lookTarget as spring current
    const smoothedLook = this.springTarget(rawLook, this.lookTarget.clone(), dt);
    this.lookTarget.copy(smoothedLook);

    let desired = this.computeDesired(this.lookTarget);
    desired = this.applyCollision(this.lookTarget, desired);

    if (instant || dt <= 0) {
      this.camera.position.copy(desired);
    } else {
      const k = 1 - Math.exp(-this.config.positionLerp * dt);
      this.camera.position.lerp(desired, k);
    }
    this.camera.lookAt(this.lookTarget);
  }

  /** Snap camera behind player immediately. */
  snapBehind(playerPos: THREE.Vector3, facingYaw?: number): void {
    if (facingYaw != null) this.yaw = facingYaw;
    this.springVel.set(0, 0, 0);
    this.update(playerPos, 0, true);
  }
}
