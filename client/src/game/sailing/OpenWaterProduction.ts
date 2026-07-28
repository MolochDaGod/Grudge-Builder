/**
 * OpenWaterProduction — single entry for open-water play (no conflicting systems).
 *
 * Owns:
 *   - OceanEnvironment (Gerstner ocean shader + fish)
 *   - StormRainSystem (threejs-games rain pattern)
 *   - Weather presets (calm → hurricane)
 *   - Quality LOD for ocean segments
 *
 * Does NOT create a second ocean mesh. Island3D / tactical must use this facade.
 *
 * Refs:
 *   Waves: https://threejs-games.github.io/examples/15-animations/waves/
 *   Rain:  https://threejs-games.github.io/examples/20-particles/rain/
 *   Ours:  6-octave Gerstner + storm (OceanShader) — production upgrade of simple sine waves
 */

import * as THREE from "three";
import { OceanEnvironment } from "@/game/ocean/OceanEnvironment";
import { StormRainSystem } from "./StormRainSystem";
import {
  DEFAULT_WEATHER,
  getWeatherState,
  type WeatherConfig,
  type WeatherState,
} from "./types";
import type { WindState } from "@/tactical-ocean/threeWorldMapManager";

export type OceanQuality = "low" | "medium" | "high" | "ultra";

/** Segment counts for DynamicOcean plane (perf). */
export const OCEAN_QUALITY_SEGMENTS: Record<OceanQuality, number> = {
  low: 96,
  medium: 160,
  high: 256,
  ultra: 384,
};

export const WEATHER_PRESETS: Record<WeatherState, WeatherConfig> = {
  calm: {
    ...DEFAULT_WEATHER,
    state: "calm",
    windStrength: 0.22,
    waveHeight: 0.9,
    waveFrequency: 0.7,
    stormIntensity: 0,
    rainIntensity: 0,
    visibility: 600,
    fogDensity: 0.008,
  },
  light_rain: {
    ...DEFAULT_WEATHER,
    state: "light_rain",
    windStrength: 0.4,
    waveHeight: 1.4,
    waveFrequency: 0.85,
    stormIntensity: 0.12,
    rainIntensity: 0.45,
    visibility: 320,
    fogDensity: 0.02,
  },
  heavy_rain: {
    ...DEFAULT_WEATHER,
    state: "heavy_rain",
    windStrength: 0.55,
    waveHeight: 2.0,
    waveFrequency: 0.95,
    stormIntensity: 0.28,
    rainIntensity: 0.75,
    visibility: 180,
    fogDensity: 0.035,
  },
  storm: {
    ...DEFAULT_WEATHER,
    state: "storm",
    windStrength: 0.78,
    waveHeight: 3.2,
    waveFrequency: 1.1,
    stormIntensity: 0.55,
    rainIntensity: 0.9,
    visibility: 110,
    fogDensity: 0.05,
  },
  hurricane: {
    ...DEFAULT_WEATHER,
    state: "hurricane",
    windStrength: 0.95,
    waveHeight: 4.5,
    waveFrequency: 1.25,
    stormIntensity: 0.9,
    rainIntensity: 1,
    visibility: 70,
    fogDensity: 0.07,
  },
};

export interface OpenWaterProductionOpts {
  scene: THREE.Scene;
  worldSize?: number;
  quality?: OceanQuality;
  /** Start weather */
  weather?: WeatherState | WeatherConfig;
  /** Rain drop budget (override quality) */
  rainCount?: number;
}

/**
 * Production open-water root. One instance per play session.
 */
export class OpenWaterProduction {
  readonly env: OceanEnvironment;
  readonly rain: StormRainSystem;
  readonly root = new THREE.Group();
  private scene: THREE.Scene;
  private weather: WeatherConfig;
  private elapsed = 0;
  private quality: OceanQuality;

  constructor(opts: OpenWaterProductionOpts) {
    this.scene = opts.scene;
    this.quality = opts.quality ?? "high";
    const segs = OCEAN_QUALITY_SEGMENTS[this.quality];
    const size = opts.worldSize ?? 800;

    this.env = new OceanEnvironment(opts.scene, size, segs);
    this.rain = new StormRainSystem({
      count:
        opts.rainCount ??
        (this.quality === "low" ? 4000 : this.quality === "medium" ? 8000 : 12_000),
    });
    this.root.name = "OpenWaterProduction";
    this.root.add(this.rain.points);
    this.scene.add(this.root);

    if (typeof opts.weather === "string") {
      this.weather = { ...WEATHER_PRESETS[opts.weather] };
    } else if (opts.weather) {
      this.weather = { ...DEFAULT_WEATHER, ...opts.weather };
    } else {
      this.weather = { ...WEATHER_PRESETS.calm };
    }
    this.applyWeather(this.weather);
  }

  getWeather(): WeatherConfig {
    return { ...this.weather };
  }

  setWeatherPreset(state: WeatherState): void {
    this.weather = { ...WEATHER_PRESETS[state] };
    this.applyWeather(this.weather);
  }

  /** Blend toward target weather (smooth storm approach). */
  blendWeather(target: WeatherConfig, t: number): void {
    const a = this.weather;
    const b = target;
    this.weather = {
      windStrength: THREE.MathUtils.lerp(a.windStrength, b.windStrength, t),
      windDirection: b.windDirection,
      waveHeight: THREE.MathUtils.lerp(a.waveHeight, b.waveHeight, t),
      waveFrequency: THREE.MathUtils.lerp(a.waveFrequency, b.waveFrequency, t),
      stormIntensity: THREE.MathUtils.lerp(a.stormIntensity, b.stormIntensity, t),
      visibility: THREE.MathUtils.lerp(a.visibility, b.visibility, t),
      rainIntensity: THREE.MathUtils.lerp(a.rainIntensity, b.rainIntensity, t),
      fogDensity: THREE.MathUtils.lerp(a.fogDensity, b.fogDensity, t),
      state: getWeatherState({
        ...b,
        stormIntensity: THREE.MathUtils.lerp(a.stormIntensity, b.stormIntensity, t),
        rainIntensity: THREE.MathUtils.lerp(a.rainIntensity, b.rainIntensity, t),
      }),
    };
    this.applyWeather(this.weather);
  }

  private applyWeather(w: WeatherConfig): void {
    this.rain.setFromWeather(w);
    this.env.ocean.setStormIntensity(w.stormIntensity);
    this.env.ocean.setWaveParameters(w.waveHeight, w.waveFrequency);
    const windDir = new THREE.Vector3(
      Math.cos(w.windDirection),
      0,
      Math.sin(w.windDirection),
    );
    this.env.ocean.setWindDirection(windDir);
  }

  setIslandPositions(positions: THREE.Vector3[]): void {
    this.env.setIslandPositions(positions);
  }

  /**
   * Per-frame update. Camera required for rain volume.
   * sun: world direction toward sun.
   */
  update(dt: number, camera: THREE.Camera, sun?: THREE.Vector3): void {
    this.elapsed += dt;
    const w = this.weather;
    const wind: WindState = {
      direction: w.windDirection,
      speed: 4 + w.windStrength * 18,
      gustFactor: 1 + w.stormIntensity * 0.35,
    };
    const sunDir = sun ?? new THREE.Vector3(0.45, 0.85, 0.25);
    this.env.update(dt, wind, sunDir, w.stormIntensity);
    // Keep ocean uniforms in sync with full weather (waves ref)
    this.env.ocean.update(this.elapsed, {
      uWindDirection: {
        value: new THREE.Vector3(
          Math.cos(w.windDirection),
          0,
          Math.sin(w.windDirection),
        ),
      },
      uWindStrength: { value: w.windStrength * 12 },
      uStormIntensity: { value: w.stormIntensity },
      uWaveHeight: { value: w.waveHeight },
      uWaveFrequency: { value: w.waveFrequency },
      uVisibility: { value: Math.min(1, w.visibility / 500) },
    });
    this.rain.update(dt, camera);
  }

  dispose(): void {
    this.scene.remove(this.root);
    this.rain.dispose();
    this.env.dispose();
  }
}

export const OPEN_WATER_RULES = [
  "Single ocean: OpenWaterProduction or OceanEnvironment — never both meshes",
  "Waves = Gerstner OceanShader (production of threejs-games waves idea)",
  "Rain = StormRainSystem only; hide when intensity≈0",
  "Weather presets drive stormIntensity + rain + wind together",
  "Quality: low/med/high/ultra segment counts for mobile/desktop",
  "Boat drive: OpenWaterDriveController sail XOR oar",
  "Islands: setIslandPositions for fish + shallows fishing",
] as const;
