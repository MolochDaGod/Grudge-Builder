/**
 * StormRainSystem — GPU rain particles for open water (threejs-games rain pattern).
 *
 * Ref: https://threejs-games.github.io/examples/20-particles/rain/
 *   Instanced/point rain with recycle, camera-relative volume, storm intensity.
 *
 * Production rules:
 *   - One Points mesh only (no mesh rain sprites per drop)
 *   - Intensity 0 → hide mesh (draw call skip)
 *   - Linked to WeatherConfig.rainIntensity / stormIntensity
 *   - Frustum-friendly: volume follows camera XZ
 */

import * as THREE from "three";
import type { WeatherConfig } from "./types";

export interface StormRainOpts {
  /** Max drops in the volume (default 12k; lower on mobile) */
  count?: number;
  /** Rain volume half-extent XZ around camera (m) */
  radius?: number;
  /** Volume height (m) */
  height?: number;
  /** Base fall speed m/s */
  fallSpeed?: number;
}

export class StormRainSystem {
  readonly points: THREE.Points;
  private geo: THREE.BufferGeometry;
  private mat: THREE.PointsMaterial;
  private positions: Float32Array;
  private velocities: Float32Array;
  private count: number;
  private radius: number;
  private height: number;
  private fallSpeed: number;
  private intensity = 0;
  private _cam = new THREE.Vector3();
  private _wind = new THREE.Vector2(0, 0);

  constructor(opts: StormRainOpts = {}) {
    this.count = opts.count ?? 12_000;
    this.radius = opts.radius ?? 55;
    this.height = opts.height ?? 40;
    this.fallSpeed = opts.fallSpeed ?? 28;

    this.positions = new Float32Array(this.count * 3);
    this.velocities = new Float32Array(this.count);
    for (let i = 0; i < this.count; i++) {
      this.respawn(i, true);
      this.velocities[i] = this.fallSpeed * (0.75 + Math.random() * 0.5);
    }

    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute(
      "position",
      new THREE.BufferAttribute(this.positions, 3),
    );
    this.mat = new THREE.PointsMaterial({
      color: 0xb8d4ee,
      size: 0.12,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
    });
    this.points = new THREE.Points(this.geo, this.mat);
    this.points.name = "storm_rain";
    this.points.frustumCulled = false;
    this.points.visible = false;
    this.points.renderOrder = 10;
  }

  private respawn(i: number, initial: boolean): void {
    const cx = this._cam.x;
    const cz = this._cam.z;
    const a = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * this.radius;
    this.positions[i * 3] = cx + Math.cos(a) * r;
    this.positions[i * 3 + 2] = cz + Math.sin(a) * r;
    this.positions[i * 3 + 1] = initial
      ? this._cam.y + Math.random() * this.height
      : this._cam.y + this.height * (0.6 + Math.random() * 0.5);
  }

  /** Drive intensity from weather (0–1). */
  setFromWeather(weather: WeatherConfig): void {
    const rain = weather.rainIntensity ?? 0;
    const storm = weather.stormIntensity ?? 0;
    this.intensity = Math.min(1, rain * 0.65 + storm * 0.85);
    this.mat.opacity = 0.25 + this.intensity * 0.55;
    this.mat.size = 0.08 + this.intensity * 0.1;
    this.points.visible = this.intensity > 0.04;
    // Wind shear on rain
    this._wind.set(
      Math.cos(weather.windDirection) * weather.windStrength * 6,
      Math.sin(weather.windDirection) * weather.windStrength * 6,
    );
  }

  update(dt: number, camera: THREE.Camera): void {
    if (!this.points.visible || this.intensity < 0.02) return;
    camera.getWorldPosition(this._cam);
    const pos = this.positions;
    const n = Math.floor(this.count * Math.min(1, 0.25 + this.intensity));
    const groundY = this._cam.y - 8;
    const wx = this._wind.x * dt;
    const wz = this._wind.y * dt;

    for (let i = 0; i < n; i++) {
      const y = i * 3 + 1;
      pos[i * 3] += wx * (0.6 + (i % 5) * 0.05);
      pos[i * 3 + 2] += wz * (0.6 + (i % 7) * 0.04);
      pos[y] -= this.velocities[i] * dt * (0.8 + this.intensity * 0.5);
      if (pos[y] < groundY) this.respawn(i, false);
    }
    // Park unused drops above
    for (let i = n; i < this.count; i++) {
      pos[i * 3 + 1] = this._cam.y + this.height + 50;
    }
    (this.geo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  }

  dispose(): void {
    this.geo.dispose();
    this.mat.dispose();
  }
}
