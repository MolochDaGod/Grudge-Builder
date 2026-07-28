/**
 * WaveboardController — open-water waveboard for Grudge6 characters.
 *
 * Control feel adapted from tslda (Wind Waker TSL) ControllerManager.boat:
 *   https://github.com/Robpayot/tslda
 *   velocity / velocityP · turn · jump (space) · wind fill
 *
 * Plus Grudge fleet:
 *   Open water weather · sail billow · splash shot (F) · dock deploy
 *
 * Requires equipped Back-slot Waveboard item (craft: 2 wood + 2 cloth).
 */

import * as THREE from "three";
import {
  loadWaveboardRig,
  type WaveboardRigHandle,
} from "./WaveboardRig";
import type { WeatherConfig } from "../types";
import { DEFAULT_WEATHER } from "../types";
import { WAVEBOARD_ITEM } from "@shared/definitions/waveboard";

const MAX_VEL = 11; // m/s
const ACCEL = 6.5;
const DECEL = 4.2;
const TURN_RATE = 1.55; // rad/s
const GRAVITY = 18;
const JUMP_SPEED = 7.5;
const JUMP_SPEED_FAST = 10;
const WATER_DRAG = 0.992;

export type WaveboardState =
  | "stowed"
  | "riding"
  | "airborne"
  | "shooting";

export interface WaveboardUpdateResult {
  state: WaveboardState;
  position: THREE.Vector3;
  yaw: number;
  velocityP: number;
  airborne: boolean;
}

export interface WaveboardOpts {
  scene: THREE.Scene;
  waterLevel: number;
  weather?: WeatherConfig;
  /** Grudge6 character root to parent/ride */
  characterRoot?: THREE.Object3D | null;
  onPrompt?: (msg: string | null) => void;
  onShoot?: (origin: THREE.Vector3, dir: THREE.Vector3) => void;
}

export class WaveboardController {
  readonly root = new THREE.Group();
  private scene: THREE.Scene;
  private waterLevel: number;
  private weather: WeatherConfig;
  private characterRoot: THREE.Object3D | null;
  private onPrompt?: (msg: string | null) => void;
  private onShoot?: (origin: THREE.Vector3, dir: THREE.Vector3) => void;

  private rig: WaveboardRigHandle | null = null;
  private loaded = false;
  private active = false;
  private yaw = 0;
  private vel = 0;
  private up = 0;
  private targetUp = 0;
  private keys = new Set<string>();
  private shootCd = 0;
  private splash: THREE.Points | null = null;
  private splashPos: Float32Array | null = null;
  private _kd: ((e: KeyboardEvent) => void) | null = null;
  private _ku: ((e: KeyboardEvent) => void) | null = null;

  constructor(opts: WaveboardOpts) {
    this.scene = opts.scene;
    this.waterLevel = opts.waterLevel;
    this.weather = opts.weather ?? { ...DEFAULT_WEATHER };
    this.characterRoot = opts.characterRoot ?? null;
    this.onPrompt = opts.onPrompt;
    this.onShoot = opts.onShoot;
    this.root.name = "Waveboard";
    this.root.visible = false;
    this.scene.add(this.root);
  }

  async load(): Promise<void> {
    if (this.loaded) return;
    try {
      this.rig = await loadWaveboardRig();
      this.root.add(this.rig.root);
      this.loaded = true;
    } catch (e) {
      console.warn("[Waveboard] GLB load failed, procedural fallback", e);
      this.rig = this.buildProcedural();
      this.root.add(this.rig.root);
      this.loaded = true;
    }
    this.buildSplash();
  }

  setWeather(w: WeatherConfig): void {
    this.weather = w;
  }

  setCharacter(root: THREE.Object3D | null): void {
    this.characterRoot = root;
  }

  get isActive(): boolean {
    return this.active;
  }

  get velocityP(): number {
    return Math.min(1, this.vel / MAX_VEL);
  }

  /** Deploy / stow — requires ownership of waveboard item in host inventory. */
  async toggleDeploy(spawnPos?: THREE.Vector3): Promise<boolean> {
    if (!this.loaded) await this.load();
    this.active = !this.active;
    this.root.visible = this.active;
    if (this.active) {
      if (spawnPos) {
        this.root.position.copy(spawnPos);
        this.root.position.y = this.waterLevel + 0.15;
      }
      this.bindKeys();
      this.onPrompt?.(
        `${WAVEBOARD_ITEM.name} · WASD sail · Space jump · F splash · B stow`,
      );
    } else {
      this.unbindKeys();
      this.vel = 0;
      this.up = 0;
      this.onPrompt?.(null);
    }
    return this.active;
  }

  forceStow(): void {
    if (!this.active) return;
    void this.toggleDeploy();
  }

  update(dt: number): WaveboardUpdateResult {
    if (!this.active || !this.loaded) {
      return {
        state: "stowed",
        position: this.root.position.clone(),
        yaw: this.yaw,
        velocityP: 0,
        airborne: false,
      };
    }

    const d = Math.min(0.05, dt);
    // Turn
    const turn =
      (this.keys.has("d") || this.keys.has("arrowright") ? 1 : 0) -
      (this.keys.has("a") || this.keys.has("arrowleft") ? 1 : 0);
    this.yaw -= turn * TURN_RATE * d * (0.6 + this.velocityP * 0.5);

    // Thrust (W) / brake (S) — wind assists like tslda velocityP
    const windBoost = 1 + this.weather.windStrength * 0.45;
    const thr =
      (this.keys.has("w") || this.keys.has("arrowup") ? 1 : 0) -
      (this.keys.has("s") || this.keys.has("arrowdown") ? 1 : 0);
    if (thr > 0) this.vel += ACCEL * windBoost * d;
    else if (thr < 0) this.vel -= DECEL * 1.4 * d;
    else this.vel -= DECEL * 0.35 * d;
    this.vel = THREE.MathUtils.clamp(this.vel, 0, MAX_VEL * windBoost);
    this.vel *= WATER_DRAG;

    // Jump (Space) — higher when fast (tslda pattern)
    const airborne = this.up > 0.05 || this.root.position.y > this.waterLevel + 0.35;
    if (this.keys.has(" ") && this.up <= 0.02 && !airborne) {
      this.targetUp = this.velocityP > 0.5 ? JUMP_SPEED_FAST : JUMP_SPEED;
    }
    this.up = Math.max(0, THREE.MathUtils.lerp(this.up, this.targetUp, 0.12));
    this.targetUp -= GRAVITY * d;
    if (this.targetUp < 0) this.targetUp = 0;

    // Integrate XZ
    const dir = new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
    this.root.position.x += dir.x * this.vel * d;
    this.root.position.z += dir.z * this.vel * d;

    // Wave ride heave
    const t = performance.now() * 0.001;
    const wave =
      Math.sin(t * this.weather.waveFrequency * 2 + this.root.position.x * 0.08) *
      this.weather.waveHeight *
      0.12;
    const baseY = this.waterLevel + 0.12 + wave;
    if (this.up > 0.05) {
      this.root.position.y = baseY + this.up * 0.12;
    } else {
      this.root.position.y = baseY;
      this.up = 0;
    }

    this.root.rotation.y = this.yaw;
    // Lean into turn + pitch from speed
    this.root.rotation.z = THREE.MathUtils.lerp(
      this.root.rotation.z,
      -turn * 0.18 * this.velocityP,
      1 - Math.exp(-6 * d),
    );
    this.root.rotation.x = THREE.MathUtils.lerp(
      this.root.rotation.x,
      -this.velocityP * 0.08 + (airborne ? -0.15 : 0),
      1 - Math.exp(-5 * d),
    );

    // Sail wind billow (tslda velocityP → sail)
    this.rig?.setSailBillow(
      Math.min(1, this.velocityP * 0.85 + this.weather.windStrength * 0.35),
    );

    // Character ride pose
    if (this.characterRoot) {
      this.characterRoot.position.copy(this.root.position);
      this.characterRoot.position.y += 0.85;
      this.characterRoot.rotation.y = this.yaw;
    }

    // Shoot splash bolt
    this.shootCd = Math.max(0, this.shootCd - d);
    if ((this.keys.has("f") || this.keys.has("F")) && this.shootCd <= 0) {
      this.shootCd = 0.55;
      const origin = this.root.position.clone().add(new THREE.Vector3(0, 1.1, 0));
      origin.addScaledVector(dir, 1.2);
      this.onShoot?.(origin, dir.clone());
      this.burstSplash(origin);
    }

    this.updateSplash(d);

    // B stow
    if (this.keys.has("b")) {
      this.keys.delete("b");
      void this.toggleDeploy();
    }

    return {
      state: airborne ? "airborne" : this.shootCd > 0.4 ? "shooting" : "riding",
      position: this.root.position.clone(),
      yaw: this.yaw,
      velocityP: this.velocityP,
      airborne,
    };
  }

  private bindKeys(): void {
    if (this._kd) return;
    this._kd = (e) => this.keys.add(e.key.toLowerCase());
    this._ku = (e) => this.keys.delete(e.key.toLowerCase());
    window.addEventListener("keydown", this._kd);
    window.addEventListener("keyup", this._ku);
  }

  private unbindKeys(): void {
    if (this._kd) window.removeEventListener("keydown", this._kd);
    if (this._ku) window.removeEventListener("keyup", this._ku);
    this._kd = null;
    this._ku = null;
    this.keys.clear();
  }

  private buildSplash(): void {
    const n = 48;
    this.splashPos = new Float32Array(n * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(this.splashPos, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xc8e8ff,
      size: 0.15,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
    });
    this.splash = new THREE.Points(geo, mat);
    this.splash.visible = false;
    this.root.add(this.splash);
  }

  private burstSplash(world: THREE.Vector3): void {
    if (!this.splash || !this.splashPos) return;
    this.splash.visible = true;
    const local = this.root.worldToLocal(world.clone());
    for (let i = 0; i < this.splashPos.length / 3; i++) {
      this.splashPos[i * 3] = local.x + (Math.random() - 0.5) * 0.8;
      this.splashPos[i * 3 + 1] = local.y + Math.random() * 0.6;
      this.splashPos[i * 3 + 2] = local.z + (Math.random() - 0.5) * 0.8;
    }
    (this.splash.geometry.attributes.position as THREE.BufferAttribute).needsUpdate =
      true;
  }

  private updateSplash(dt: number): void {
    if (!this.splash?.visible || !this.splashPos) return;
    let any = false;
    for (let i = 0; i < this.splashPos.length / 3; i++) {
      this.splashPos[i * 3 + 1] += dt * 1.5;
      if (this.splashPos[i * 3 + 1] < 3) any = true;
    }
    (this.splash.geometry.attributes.position as THREE.BufferAttribute).needsUpdate =
      true;
    if (!any) this.splash.visible = false;
  }

  private buildProcedural(): WaveboardRigHandle {
    const g = new THREE.Group();
    const wood = new THREE.MeshStandardMaterial({
      color: 0x2a1810,
      roughness: 0.88,
    });
    const board = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.12, 2.0), wood);
    board.position.y = 0.06;
    board.name = "board_wood";
    const mast = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.04, 1.8, 6),
      new THREE.MeshStandardMaterial({ color: 0x4a3220, roughness: 0.85 }),
    );
    mast.position.set(0, 1.0, 0);
    mast.name = "mast_spar";
    const handle = new THREE.Mesh(
      new THREE.TorusGeometry(0.35, 0.035, 6, 12, Math.PI),
      new THREE.MeshStandardMaterial({ color: 0xe8b923, roughness: 0.55 }),
    );
    handle.rotation.x = Math.PI / 2;
    handle.position.set(0, 1.15, 0.1);
    handle.name = "handle_grip";
    const sail = new THREE.Mesh(
      new THREE.PlaneGeometry(1.2, 1.5, 4, 6),
      new THREE.MeshStandardMaterial({
        color: 0xe6dcc0,
        roughness: 0.92,
        side: THREE.DoubleSide,
      }),
    );
    sail.position.set(0, 1.35, 0);
    sail.name = "mainsail";
    g.add(board, mast, handle, sail);
    return {
      root: g,
      sailMeshes: [sail],
      setSailBillow: (a) => {
        sail.scale.y = 0.2 + a * 0.8;
        sail.visible = a > 0.05;
      },
      dispose: () => {},
    };
  }

  dispose(): void {
    this.unbindKeys();
    this.rig?.dispose();
    this.scene.remove(this.root);
  }
}
