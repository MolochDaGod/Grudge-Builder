/**
 * WarCinematic — intro camera path + declaration of war script.
 *
 * Conqueror's Blade–style: fly over island fortress, herald announces war,
 * lords trade threats, then hand control to deployment.
 */
import * as THREE from 'three';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { WarVoice, WarVoiceRole } from './WarVoice';

export type WarMatchPhase =
  | 'loading'
  | 'cinematic'
  | 'deploy'
  | 'siege'
  | 'ended';

export interface CinematicLine {
  t: number;
  text: string;
  role: WarVoiceRole;
  /** Camera look-at world point */
  lookAt?: THREE.Vector3;
  /** Camera position world */
  camPos?: THREE.Vector3;
}

export interface DeclarationScript {
  title: string;
  subtitle: string;
  lines: CinematicLine[];
  duration: number;
}

/** Default declaration — Crimson Island siege of the Azure Keep */
export function buildDeclarationOfWar(opts?: {
  attacker?: string;
  defender?: string;
  island?: string;
}): DeclarationScript {
  const attacker = opts?.attacker ?? 'House Crimson';
  const defender = opts?.defender ?? 'Azure Keep';
  const island = opts?.island ?? 'Warlord Isle';

  const lines: CinematicLine[] = [
    {
      t: 0.2,
      role: 'narrator',
      text: `On the black shores of ${island}, banners rise against the wind.`,
      camPos: new THREE.Vector3(90, 55, 90),
      lookAt: new THREE.Vector3(0, 4, 0),
    },
    {
      t: 4.5,
      role: 'herald',
      text: `Hear the words of the realm! ${attacker} declares open war upon ${defender}!`,
      camPos: new THREE.Vector3(55, 28, 70),
      lookAt: new THREE.Vector3(0, 6, 0),
    },
    {
      t: 10,
      role: 'crimson_lord',
      text: `Azure dogs — your walls will burn. Your gates will fall. The island is ours!`,
      camPos: new THREE.Vector3(-40, 22, 50),
      lookAt: new THREE.Vector3(5, 5, -10),
    },
    {
      t: 15.5,
      role: 'azure_lord',
      text: `Come then, red wolves. Our stone has tasted worse storms. Hold the walls!`,
      camPos: new THREE.Vector3(35, 30, -45),
      lookAt: new THREE.Vector3(0, 8, 0),
    },
    {
      t: 21,
      role: 'herald',
      text: `Lords — deploy your companies. The siege begins when both banners stand ready.`,
      camPos: new THREE.Vector3(0, 48, 75),
      lookAt: new THREE.Vector3(0, 3, 0),
    },
  ];

  return {
    title: 'Declaration of War',
    subtitle: `${attacker}  vs  ${defender}  ·  ${island}`,
    lines,
    duration: 26,
  };
}

export class WarCinematic {
  private t = 0;
  private active = false;
  private script: DeclarationScript;
  private spoken = new Set<number>();
  private camFrom = new THREE.Vector3();
  private camTo = new THREE.Vector3();
  private lookFrom = new THREE.Vector3();
  private lookTo = new THREE.Vector3();
  private segmentStart = 0;
  private segmentEnd = 1;
  private currentSubtitle = '';
  private currentSpeaker: WarVoiceRole = 'narrator';
  private onSubtitle?: (text: string, role: WarVoiceRole) => void;
  private onComplete?: () => void;
  private voice: WarVoice | null = null;
  private controls: OrbitControls;
  private camera: THREE.PerspectiveCamera;

  constructor(
    camera: THREE.PerspectiveCamera,
    controls: OrbitControls,
    script?: DeclarationScript,
  ) {
    this.camera = camera;
    this.controls = controls;
    this.script = script ?? buildDeclarationOfWar();
  }

  get isPlaying(): boolean {
    return this.active;
  }

  get subtitle(): string {
    return this.currentSubtitle;
  }

  get speaker(): WarVoiceRole {
    return this.currentSpeaker;
  }

  get progress(): number {
    return Math.min(1, this.t / this.script.duration);
  }

  get declaration(): DeclarationScript {
    return this.script;
  }

  start(opts: {
    voice?: WarVoice;
    onSubtitle?: (text: string, role: WarVoiceRole) => void;
    onComplete?: () => void;
  }): void {
    this.active = true;
    this.t = 0;
    this.spoken.clear();
    this.voice = opts.voice ?? null;
    this.onSubtitle = opts.onSubtitle;
    this.onComplete = opts.onComplete;
    this.controls.enabled = false;
    this.primeSegment(0);
    // Fire first line immediately
    this.trySpeakLine(0);
  }

  skip(): void {
    if (!this.active) return;
    this.voice?.cancel();
    this.finish();
  }

  update(dt: number): void {
    if (!this.active) return;
    this.t += dt;

    // Advance spoken lines
    for (let i = 0; i < this.script.lines.length; i++) {
      const line = this.script.lines[i]!;
      if (this.t >= line.t && !this.spoken.has(i)) {
        this.trySpeakLine(i);
        this.primeSegment(i);
      }
    }

    // Smooth camera along current segment
    const span = Math.max(0.001, this.segmentEnd - this.segmentStart);
    const u = THREE.MathUtils.clamp((this.t - this.segmentStart) / span, 0, 1);
    const e = easeInOut(u);
    this.camera.position.lerpVectors(this.camFrom, this.camTo, e);
    this.controls.target.lerpVectors(this.lookFrom, this.lookTo, e);
    this.controls.update();

    if (this.t >= this.script.duration) {
      this.finish();
    }
  }

  private trySpeakLine(i: number): void {
    if (this.spoken.has(i)) return;
    this.spoken.add(i);
    const line = this.script.lines[i]!;
    this.currentSubtitle = line.text;
    this.currentSpeaker = line.role;
    this.onSubtitle?.(line.text, line.role);
    void this.voice?.speak(line.text, { role: line.role, queue: true });
  }

  private primeSegment(i: number): void {
    const line = this.script.lines[i]!;
    const next = this.script.lines[i + 1];
    this.segmentStart = line.t;
    this.segmentEnd = next?.t ?? this.script.duration;
    this.camFrom.copy(line.camPos ?? this.camera.position);
    this.lookFrom.copy(line.lookAt ?? this.controls.target);
    this.camTo.copy(next?.camPos ?? line.camPos ?? this.camera.position);
    this.lookTo.copy(next?.lookAt ?? line.lookAt ?? this.controls.target);
    if (i === 0 && line.camPos) {
      this.camera.position.copy(line.camPos);
      if (line.lookAt) this.controls.target.copy(line.lookAt);
    }
  }

  private finish(): void {
    this.active = false;
    this.controls.enabled = true;
    this.currentSubtitle = '';
    this.onComplete?.();
  }
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}
