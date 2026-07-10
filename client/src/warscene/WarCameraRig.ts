/**
 * WarCameraRig — cinematic siege camera on top of OrbitControls.
 *
 * Modes:
 *  - orbit: free look (deploy / free cam)
 *  - follow: soft chase behind player hero (siege)
 *  - tactical: higher pull-out over battlefield
 *  - impact: brief punch zoom on wall breach / hero hit
 */
import * as THREE from 'three';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export type CamMode = 'orbit' | 'follow' | 'tactical';

export class WarCameraRig {
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  mode: CamMode = 'orbit';
  private followOffset = new THREE.Vector3(0, 14, 22);
  private tacticalOffset = new THREE.Vector3(0, 48, 55);
  private desiredPos = new THREE.Vector3();
  private desiredTarget = new THREE.Vector3();
  private shake = 0;
  private punch = 0;
  private baseFov = 48;
  private followEnabled = true;

  constructor(camera: THREE.PerspectiveCamera, controls: OrbitControls) {
    this.camera = camera;
    this.controls = controls;
    this.baseFov = camera.fov;
    this.configureOrbit();
  }

  private configureOrbit(): void {
    const c = this.controls;
    c.enableDamping = true;
    c.dampingFactor = 0.08;
    c.minDistance = 8;
    c.maxDistance = 140;
    c.minPolarAngle = 0.25;
    c.maxPolarAngle = Math.PI * 0.46;
    c.zoomSpeed = 1.1;
    c.rotateSpeed = 0.65;
    c.panSpeed = 0.8;
    c.screenSpacePanning = false;
    c.enablePan = true;
    c.autoRotate = false;
    c.autoRotateSpeed = 0.35;
  }

  setMode(mode: CamMode): void {
    this.mode = mode;
    if (mode === 'tactical') {
      this.controls.maxPolarAngle = Math.PI * 0.42;
      this.controls.minDistance = 20;
    } else {
      this.controls.maxPolarAngle = Math.PI * 0.48;
      this.controls.minDistance = 8;
    }
  }

  setFollowEnabled(v: boolean): void {
    this.followEnabled = v;
  }

  /** Call on wall breach / big hit */
  impact(strength = 0.45): void {
    this.shake = Math.max(this.shake, strength);
    this.punch = Math.max(this.punch, 0.55);
  }

  /** Soft cinematic intro framing */
  frameBattlefield(): void {
    this.camera.position.set(52, 38, 68);
    this.controls.target.set(0, 4, 0);
    this.camera.fov = this.baseFov;
    this.camera.updateProjectionMatrix();
    this.controls.update();
  }

  update(
    dt: number,
    followPos: THREE.Vector3 | null,
    phase: string,
  ): void {
    // Auto mode from phase when not manual orbit drag priority
    if (phase === 'deploy') {
      this.controls.autoRotate = true;
      this.controls.autoRotateSpeed = 0.25;
    } else {
      this.controls.autoRotate = false;
    }

    if (phase === 'siege' && this.followEnabled && followPos && this.mode !== 'orbit') {
      const off = this.mode === 'tactical' ? this.tacticalOffset : this.followOffset;
      this.desiredTarget.set(followPos.x, followPos.y + 1.6, followPos.z);
      this.desiredPos.copy(followPos).add(off);
      // Lerp camera (orbit still allows user override when they drag — damping smooths)
      this.camera.position.lerp(this.desiredPos, 1 - Math.exp(-2.2 * dt));
      this.controls.target.lerp(this.desiredTarget, 1 - Math.exp(-3.0 * dt));
    }

    // Impact FOV punch
    if (this.punch > 0) {
      this.punch = Math.max(0, this.punch - dt * 1.8);
      const punchFov = this.baseFov - this.punch * 6;
      this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, punchFov, 0.25);
      this.camera.updateProjectionMatrix();
    } else if (Math.abs(this.camera.fov - this.baseFov) > 0.05) {
      this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, this.baseFov, 0.08);
      this.camera.updateProjectionMatrix();
    }

    // Shake
    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt * 2.5);
      const s = this.shake * this.shake;
      this.camera.position.x += (Math.random() - 0.5) * s * 0.9;
      this.camera.position.y += (Math.random() - 0.5) * s * 0.5;
      this.camera.position.z += (Math.random() - 0.5) * s * 0.9;
    }
  }
}
