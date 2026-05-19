/**
 * DayNightCycle — sun orbit, 4-phase sky transitions, fog, and server sync.
 *
 * Phases: dawn (0.2–0.3), day (0.3–0.7), dusk (0.7–0.8), night (0.8–0.2).
 * Time is 0–1 normalized (0 = midnight, 0.5 = noon).
 */
import * as THREE from 'three';

export type DayPhase = 'night' | 'dawn' | 'day' | 'dusk';

export interface DayNightConfig {
  /** Real seconds per full in-game day (default 600 = 10 min) */
  dayDurationSeconds: number;
  /** Starting time (0-1, 0.5 = noon) */
  startTime: number;
  /** Sun orbit radius */
  sunDistance: number;
  /** Moon intensity relative to sun */
  moonIntensity: number;
}

const DEFAULT_CONFIG: DayNightConfig = {
  dayDurationSeconds: 600,
  startTime: 0.35,
  sunDistance: 300,
  moonIntensity: 0.15,
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

  // Interpolation targets
  private currentColors: PhaseColors;

  constructor(
    scene: THREE.Scene,
    sunLight: THREE.DirectionalLight,
    hemiLight: THREE.HemisphereLight,
    config: Partial<DayNightConfig> = {},
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.time = this.config.startTime;
    this.scene = scene;
    this.sunLight = sunLight;
    this.hemiLight = hemiLight;
    this.currentColors = { ...PHASE_PRESETS.day };

    // Create moon light (opposite side of sun)
    this.moonLight = new THREE.DirectionalLight(0x6688cc, this.config.moonIntensity);
    this.moonLight.castShadow = false;
    scene.add(this.moonLight);
  }

  /** Advance the cycle. Call every frame with delta time. */
  update(dt: number): void {
    // Advance time
    this.time += dt / this.config.dayDurationSeconds;
    if (this.time > 1) this.time -= 1;

    // Determine current and next phase + blend factor
    const { phase, nextPhase, t } = this.getPhaseBlend();
    const from = PHASE_PRESETS[phase];
    const to = PHASE_PRESETS[nextPhase];

    // Lerp all colors
    this.currentColors.sun.lerpColors(from.sun, to.sun, t);
    this.currentColors.sunIntensity = THREE.MathUtils.lerp(from.sunIntensity, to.sunIntensity, t);
    this.currentColors.ambient.lerpColors(from.ambient, to.ambient, t);
    this.currentColors.ambientIntensity = THREE.MathUtils.lerp(from.ambientIntensity, to.ambientIntensity, t);
    this.currentColors.sky.lerpColors(from.sky, to.sky, t);
    this.currentColors.fog.lerpColors(from.fog, to.fog, t);
    this.currentColors.fogDensity = THREE.MathUtils.lerp(from.fogDensity, to.fogDensity, t);

    // Apply to lights
    this.sunLight.color.copy(this.currentColors.sun);
    this.sunLight.intensity = this.currentColors.sunIntensity;
    this.hemiLight.color.copy(this.currentColors.ambient);
    this.hemiLight.intensity = this.currentColors.ambientIntensity;

    // Sun orbit (circular arc)
    const sunAngle = this.time * Math.PI * 2 - Math.PI / 2; // noon = overhead
    const r = this.config.sunDistance;
    this.sunLight.position.set(
      Math.cos(sunAngle) * r,
      Math.sin(sunAngle) * r,
      r * 0.3,
    );

    // Moon = opposite side
    this.moonLight.position.set(
      -this.sunLight.position.x,
      -this.sunLight.position.y,
      -this.sunLight.position.z * 0.5,
    );
    this.moonLight.intensity = phase === 'night' || nextPhase === 'night'
      ? this.config.moonIntensity
      : 0;

    // Sky + fog
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

    if (t < 0.2)       return { phase: 'night', nextPhase: 'dawn',  t: t / 0.2 };
    if (t < 0.3)       return { phase: 'dawn',  nextPhase: 'day',   t: (t - 0.2) / 0.1 };
    if (t < 0.7)       return { phase: 'day',   nextPhase: 'day',   t: 0 };
    if (t < 0.8)       return { phase: 'day',   nextPhase: 'dusk',  t: (t - 0.7) / 0.1 };
    if (t < 0.9)       return { phase: 'dusk',  nextPhase: 'night', t: (t - 0.8) / 0.1 };
    return               { phase: 'night', nextPhase: 'night', t: 0 };
  }

  /** Get current time of day (0 = midnight, 0.5 = noon) */
  getTimeOfDay(): number { return this.time; }

  /** Get current phase name */
  getPhase(): DayPhase { return this.getPhaseBlend().phase; }

  /** Get the current sun direction (normalized) for water shader specular */
  getSunDirection(): THREE.Vector3 {
    return this.sunLight.position.clone().normalize();
  }

  /** Sync to a server-provided time (0-1) */
  setServerTime(serverTime: number): void {
    this.time = serverTime % 1;
  }

  /** Set day duration in real seconds */
  setDayDuration(seconds: number): void {
    this.config.dayDurationSeconds = seconds;
  }
}
