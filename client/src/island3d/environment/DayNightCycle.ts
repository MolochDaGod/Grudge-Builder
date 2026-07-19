/**
 * DayNightCycle — sun orbit, 4-phase sky transitions, fog, and wall-clock sync.
 *
 * Production clock (shared/definitions/gameClock.ts):
 *   1 game day  = 6 real hours
 *   1 game week = 8 game days (= 2 real days)
 *   useWallClock = true → sky aligns with getGameTimeOfDay(Date.now())
 *
 * Phases: dawn (0.2–0.3), day (0.3–0.7), dusk (0.7–0.8), night (0.8–0.2).
 * Time is 0–1 normalized (0 = midnight, 0.5 = noon).
 */
import * as THREE from 'three';
import {
  DAY_NIGHT_DEFAULTS,
  getGameTimeOfDay,
  GAME_CLOCK,
} from '@shared/definitions/gameClock';

export type DayPhase = 'night' | 'dawn' | 'day' | 'dusk';

export interface DayNightConfig {
  /** Real seconds per full in-game day (default = 6h production) */
  dayDurationSeconds: number;
  /** Starting time (0-1) when useWallClock is false */
  startTime: number;
  /** Sun orbit radius */
  sunDistance: number;
  /** Moon intensity relative to sun */
  moonIntensity: number;
  /**
   * When true (production default), time-of-day comes from wall clock
   * so all clients + tides + weather stay aligned.
   */
  useWallClock?: boolean;
}

const DEFAULT_CONFIG: DayNightConfig = {
  dayDurationSeconds: DAY_NIGHT_DEFAULTS.dayDurationSeconds,
  startTime: DAY_NIGHT_DEFAULTS.startTime,
  sunDistance: DAY_NIGHT_DEFAULTS.sunDistance,
  moonIntensity: DAY_NIGHT_DEFAULTS.moonIntensity,
  useWallClock: DAY_NIGHT_DEFAULTS.useWallClock,
};

interface PhaseColors {
  sun: THREE.Color;
  sunIntensity: number;
  ambient: THREE.Color;
  ambientIntensity: number;
  sky: THREE.Color;
  fog: THREE.Color;
  fogDensity: number;
}

const PHASE_PRESETS: Record<DayPhase, PhaseColors> = {
  dawn: {
    sun: new THREE.Color(0xffaa44),
    sunIntensity: 0.8,
    ambient: new THREE.Color(0xffd4a0),
    ambientIntensity: 0.5,
    sky: new THREE.Color(0xff9966),
    fog: new THREE.Color(0xffcc88),
    fogDensity: 0.002,
  },
  day: {
    sun: new THREE.Color(0xfff4e0),
    sunIntensity: 1.2,
    ambient: new THREE.Color(0x87ceeb),
    ambientIntensity: 0.6,
    sky: new THREE.Color(0x87ceeb),
    fog: new THREE.Color(0x87ceeb),
    fogDensity: 0.0015,
  },
  dusk: {
    sun: new THREE.Color(0xff6633),
    sunIntensity: 0.7,
    ambient: new THREE.Color(0xcc6644),
    ambientIntensity: 0.4,
    sky: new THREE.Color(0x993355),
    fog: new THREE.Color(0x885544),
    fogDensity: 0.0025,
  },
  night: {
    sun: new THREE.Color(0x223355),
    sunIntensity: 0.05,
    ambient: new THREE.Color(0x112244),
    ambientIntensity: 0.2,
    sky: new THREE.Color(0x0a0a1a),
    fog: new THREE.Color(0x0a0a1a),
    fogDensity: 0.004,
  },
};

export class DayNightCycle {
  private config: DayNightConfig;
  private time: number; // 0-1 normalized
  private sunLight: THREE.DirectionalLight;
  private moonLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;
  private scene: THREE.Scene;
  private currentColors: PhaseColors;

  constructor(
    scene: THREE.Scene,
    sunLight: THREE.DirectionalLight,
    hemiLight: THREE.HemisphereLight,
    config: Partial<DayNightConfig> = {},
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    // Prefer wall-clock start so we don't flash wrong phase for one frame
    this.time =
      this.config.useWallClock !== false
        ? getGameTimeOfDay(Date.now())
        : this.config.startTime;
    this.scene = scene;
    this.sunLight = sunLight;
    this.hemiLight = hemiLight;
    this.currentColors = { ...PHASE_PRESETS.day };

    this.moonLight = new THREE.DirectionalLight(0x6688cc, this.config.moonIntensity);
    this.moonLight.castShadow = false;
    scene.add(this.moonLight);
  }

  /** Advance the cycle. Call every frame with delta time. */
  update(dt: number): void {
    if (this.config.useWallClock !== false) {
      this.time = getGameTimeOfDay(Date.now());
    } else {
      this.time += dt / this.config.dayDurationSeconds;
      if (this.time > 1) this.time -= 1;
      if (this.time < 0) this.time += 1;
    }

    const { phase, nextPhase, t } = this.getPhaseBlend();
    const from = PHASE_PRESETS[phase];
    const to = PHASE_PRESETS[nextPhase];

    this.currentColors.sun.lerpColors(from.sun, to.sun, t);
    this.currentColors.sunIntensity = THREE.MathUtils.lerp(from.sunIntensity, to.sunIntensity, t);
    this.currentColors.ambient.lerpColors(from.ambient, to.ambient, t);
    this.currentColors.ambientIntensity = THREE.MathUtils.lerp(
      from.ambientIntensity,
      to.ambientIntensity,
      t,
    );
    this.currentColors.sky.lerpColors(from.sky, to.sky, t);
    this.currentColors.fog.lerpColors(from.fog, to.fog, t);
    this.currentColors.fogDensity = THREE.MathUtils.lerp(from.fogDensity, to.fogDensity, t);

    this.sunLight.color.copy(this.currentColors.sun);
    this.sunLight.intensity = this.currentColors.sunIntensity;
    this.hemiLight.color.copy(this.currentColors.ambient);
    this.hemiLight.intensity = this.currentColors.ambientIntensity;

    const sunAngle = this.time * Math.PI * 2 - Math.PI / 2;
    const r = this.config.sunDistance;
    this.sunLight.position.set(Math.cos(sunAngle) * r, Math.sin(sunAngle) * r, r * 0.3);

    this.moonLight.position.set(
      -this.sunLight.position.x,
      -this.sunLight.position.y,
      -this.sunLight.position.z * 0.5,
    );
    this.moonLight.intensity =
      phase === 'night' || nextPhase === 'night' ? this.config.moonIntensity : 0;

    if (this.scene.background instanceof THREE.Color) {
      this.scene.background.copy(this.currentColors.sky);
    } else {
      this.scene.background = this.currentColors.sky.clone();
    }

    if (this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.color.copy(this.currentColors.fog);
      this.scene.fog.density = this.currentColors.fogDensity;
    }
  }

  private getPhaseBlend(): { phase: DayPhase; nextPhase: DayPhase; t: number } {
    const t = this.time;
    if (t < 0.2) return { phase: 'night', nextPhase: 'dawn', t: t / 0.2 };
    if (t < 0.3) return { phase: 'dawn', nextPhase: 'day', t: (t - 0.2) / 0.1 };
    if (t < 0.7) return { phase: 'day', nextPhase: 'day', t: 0 };
    if (t < 0.8) return { phase: 'day', nextPhase: 'dusk', t: (t - 0.7) / 0.1 };
    if (t < 0.9) return { phase: 'dusk', nextPhase: 'night', t: (t - 0.8) / 0.1 };
    return { phase: 'night', nextPhase: 'night', t: 0 };
  }

  getTimeOfDay(): number {
    return this.time;
  }

  getPhase(): DayPhase {
    return this.getPhaseBlend().phase;
  }

  getSunDirection(): THREE.Vector3 {
    return this.sunLight.position.clone().normalize();
  }

  setServerTime(serverTime: number): void {
    this.time = serverTime % 1;
  }

  setDayDuration(seconds: number): void {
    this.config.dayDurationSeconds = seconds;
  }

  setUseWallClock(on: boolean): void {
    this.config.useWallClock = on;
  }

  /** Production day length in real seconds (always 6h) */
  static productionDaySeconds(): number {
    return GAME_CLOCK.realSecondsPerGameDay;
  }
}
