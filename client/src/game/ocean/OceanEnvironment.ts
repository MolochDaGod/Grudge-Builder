/**
 * OceanEnvironment — canonical open-water rendering (RTS OceanShader + FishManager).
 * Prefer OpenWaterProduction when rain/storms/weather presets are needed.
 * NEVER create a second ocean plane beside this mesh.
 */
import * as THREE from 'three';
import {
  DynamicOcean,
  type OceanMeshQuality,
  DYNAMIC_OCEAN_SEGMENTS,
} from '@/game/sailing/OceanShader';
import { FishManager } from '@/game/sailing/FishManager';
import type { WindState } from '@/tactical-ocean/threeWorldMapManager';

export class OceanEnvironment {
  readonly ocean: DynamicOcean;
  private fishManager: FishManager;
  private elapsed = 0;

  constructor(
    scene: THREE.Scene,
    worldSize: number,
    segments: number | OceanMeshQuality = 256,
  ) {
    const segs =
      typeof segments === 'string' ? DYNAMIC_OCEAN_SEGMENTS[segments] : segments;
    this.ocean = new DynamicOcean(worldSize, segs);
    scene.add(this.ocean.mesh);

    this.fishManager = new FishManager(
      scene,
      worldSize,
      () => -14,
    );
    void this.fishManager.initialize();
  }

  update(
    delta: number,
    wind: WindState,
    sun: THREE.Vector3,
    stormIntensity = 0,
  ): void {
    this.elapsed += delta;
    const windDir = new THREE.Vector3(
      Math.cos(wind.direction),
      0,
      Math.sin(wind.direction),
    ).normalize();

    this.ocean.update(this.elapsed, {
      uWindDirection: { value: windDir },
      uWindStrength: { value: wind.speed * wind.gustFactor },
      uStormIntensity: { value: stormIntensity },
      uWaveHeight: { value: 1.2 + stormIntensity * 2.5 },
      uWaveFrequency: { value: 0.8 + stormIntensity * 0.4 },
    });
    this.ocean.setSunPosition(sun);
    this.fishManager.update(delta, new THREE.Vector3(0, 0, 0));
  }

  setIslandPositions(positions: THREE.Vector3[]): void {
    this.fishManager.setIslandPositions(positions);
  }

  dispose(): void {
    this.ocean.dispose();
    this.fishManager.dispose();
  }
}