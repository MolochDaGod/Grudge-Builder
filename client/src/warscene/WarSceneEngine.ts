/**
 * WarSceneEngine — Conqueror's Blade–style island siege.
 *
 * Pipeline:
 *   1. Load static fortress GLB as island environment (+ water / material pass)
 *   2. Pair walls (intact/broken HP colliders)
 *   3. PG_* proxies → reserve pool (NOT all on map)
 *   4. Cinematic intro + AI voice declaration of war
 *   5. Deploy phase — place opening companies in faction zones
 *   6. Siege — combat + timed reinforcement waves
 *
 * Three.js practices: DRACO GLTFLoader, ACES + sRGB, soft shadows,
 * SkeletonUtils via loadCharacterModel, regulator AI Hz.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  MEDIEVAL_BATTLE_CDN_PATH,
  MEDIEVAL_BATTLE_LOCAL_PATH,
  WAR_SCENE_DEFAULTS,
  classifyBattleNodeName,
  parsePgMatId,
  type WarFactionId,
} from '@shared/definitions/medievalBattleScene';
import { resolveModelUrl } from '@/lib/modelManifest';
import { WarUnit } from './WarUnit';
import type { WarSenseTarget } from './WarAIBrain';
import {
  WarWallSegment,
  buildWallSegmentsFromMeshes,
} from './WarWallSegment';
import { WarVoice } from './WarVoice';
import {
  WarCinematic,
  buildDeclarationOfWar,
  type WarMatchPhase,
} from './WarCinematic';
import { WarDeployment, type UnitProxySlot } from './WarDeployment';
import {
  enhanceIslandBattlefield,
  tickIslandWater,
  type IslandDecorResult,
} from './WarIslandDecor';
import {
  WarCaptureZone,
  defaultCaptureZones,
  countZoneOwners,
  type CaptureZoneState,
} from './WarCaptureZone';
import { WarCatapult } from './WarCatapult';
import {
  ROUND_DURATION_SEC,
  evaluateMatchEnd,
  formatClock,
  type MatchHud,
} from './WarMatchRules';
import type { RosterEntry } from './WarRoster';
import { hasSelectedSiege } from './WarRoster';
import type { WarUnitArchetype } from '@shared/definitions/medievalBattleScene';
import {
  WarProjectileSystem,
  isRangedWarSkill,
} from './WarProjectileSystem';
import { WarAtmosphere, type WeatherPreset } from './WarAtmosphere';
import { WarCameraRig, type CamMode } from './WarCameraRig';
import { PostProcessing } from '@/island3d/render/PostProcessing';

export interface PlayerHeroOpts {
  raceId: string;
  name: string;
  characterId?: string;
  faction?: WarFactionId;
}

export interface WarSceneConfig {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  sceneUrl?: string;
  maxUnits?: number;
  /** Skip cinematic (debug) */
  skipCinematic?: boolean;
  /** Opening deploy size per faction */
  deployPerFaction?: number;
  onLoadProgress?: (pct: number, label: string) => void;
  onCombatLog?: (line: string) => void;
  onReady?: () => void;
  onPhaseChange?: (phase: WarMatchPhase) => void;
  onSubtitle?: (text: string, role: string) => void;
  onDeployStats?: (stats: DeployHudStats) => void;
  onMatchHud?: (hud: MatchHud) => void;
  onMatchEnd?: (winner: string, reason: string) => void;
}

export interface DeployHudStats {
  phase: WarMatchPhase;
  reserve: Record<string, number>;
  fielded: number;
  maxFielded: number;
  nextWaveIn: number;
  waveNumber: number;
  zones: Array<{ id: string; label: string; faction: string; deployCap: number }>;
  captureZones: CaptureZoneState[];
  timeLeft: number;
  clock: string;
}

export interface WarSceneStats {
  staticMeshes: number;
  unitProxies: number;
  animatedUnits: number;
  alive: number;
  crimson: number;
  azure: number;
  gold: number;
  wallsIntact: number;
  wallsDestroyed: number;
  phase: WarMatchPhase;
  reserve: Record<string, number>;
  nextWaveIn: number;
  waveNumber: number;
  timeLeft: number;
  clock: string;
  captureZones: CaptureZoneState[];
  playerAlive: boolean;
}

export class WarSceneEngine {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private clock = new THREE.Clock();
  private raf = 0;
  private running = false;
  private elapsed = 0;

  private envRoot = new THREE.Group();
  private unitsRoot = new THREE.Group();
  private units: WarUnit[] = [];
  private unitMap = new Map<string, WarUnit>();
  private walls: WarWallSegment[] = [];
  private wallMap = new Map<string, WarWallSegment>();
  private wallMeshes: THREE.Object3D[] = [];
  private groundMeshes: THREE.Object3D[] = [];
  private raycaster = new THREE.Raycaster();
  private down = new THREE.Vector3(0, -1, 0);

  private combatLog: string[] = [];
  private cfg: WarSceneConfig;

  private phase: WarMatchPhase = 'loading';
  private voice = new WarVoice();
  private cinematic: WarCinematic;
  private deployment: WarDeployment;
  private island: IslandDecorResult | null = null;
  private unitSeq = 0;
  private spawning = false;
  private captureZones: WarCaptureZone[] = [];
  private catapults: WarCatapult[] = [];
  private siegeRoot = new THREE.Group();
  private roundTimeLeft = ROUND_DURATION_SEC;
  private playerUnit: WarUnit | null = null;
  private playerHero: PlayerHeroOpts | null = null;
  private clickRay = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private followPlayer = true;
  private onCanvasClick: ((e: MouseEvent) => void) | null = null;
  private projectiles: WarProjectileSystem | null = null;
  private atmosphere: WarAtmosphere | null = null;
  private camRig: WarCameraRig | null = null;
  private post: PostProcessing | null = null;
  private sunLight: THREE.DirectionalLight | null = null;
  private hemiLight: THREE.HemisphereLight | null = null;
  private ambientLight: THREE.AmbientLight | null = null;
  private fillLight: THREE.DirectionalLight | null = null;
  private baseBloom = 0.42;
  private weather: WeatherPreset = 'storm';

  constructor(cfg: WarSceneConfig) {
    this.cfg = cfg;
    this.deployment = new WarDeployment({
      initialDeployPerFaction:
        cfg.deployPerFaction ?? WAR_SCENE_DEFAULTS.deployPerFaction,
      waveSize: WAR_SCENE_DEFAULTS.waveSize,
      waveIntervalSec: WAR_SCENE_DEFAULTS.waveIntervalSec,
      maxFielded: cfg.maxUnits ?? WAR_SCENE_DEFAULTS.maxAnimatedUnits,
    });

    this.renderer = new THREE.WebGLRenderer({
      canvas: cfg.canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(cfg.width, cfg.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.95;

    this.camera = new THREE.PerspectiveCamera(48, cfg.width / cfg.height, 0.4, 1200);
    this.camera.position.set(52, 38, 68);

    this.controls = new OrbitControls(this.camera, cfg.canvas);
    this.camRig = new WarCameraRig(this.camera, this.controls);
    this.camRig.frameBattlefield();

    // Query weather override: ?weather=storm|golden_hour|overcast|dusk_battle
    const wp = new URLSearchParams(
      typeof window !== 'undefined' ? window.location.search : '',
    ).get('weather') as WeatherPreset | null;
    if (wp && ['storm', 'golden_hour', 'overcast', 'dusk_battle'].includes(wp)) {
      this.weather = wp;
    }

    this.envRoot.name = 'battle_environment';
    this.unitsRoot.name = 'war_units';
    this.siegeRoot.name = 'siege_engines';
    this.scene.add(this.envRoot);
    this.scene.add(this.unitsRoot);
    this.scene.add(this.siegeRoot);

    this.cinematic = new WarCinematic(
      this.camera,
      this.controls,
      buildDeclarationOfWar({
        attacker: 'House Crimson',
        defender: 'Azure Keep',
        island: 'Warlord Isle',
      }),
    );

    this.setupLights();
    this.atmosphere = new WarAtmosphere(
      this.scene,
      {
        sun: this.sunLight!,
        hemi: this.hemiLight!,
        ambient: this.ambientLight!,
        fill: this.fillLight!,
      },
      this.weather,
    );

    // Post: bloom + SMAA + warm/cool vignette (high for siege drama)
    this.post = new PostProcessing(this.renderer, this.scene, this.camera, {
      quality: 'high',
      bloomStrength: this.baseBloom,
      bloomRadius: 0.55,
      bloomThreshold: 0.72,
      colorTint: this.weather === 'golden_hour' ? 0.45 : this.weather === 'storm' ? -0.25 : 0.1,
      vignetteIntensity: 0.42,
      contrast: 1.12,
    });
  }

  get matchPhase(): WarMatchPhase {
    return this.phase;
  }

  private setPhase(p: WarMatchPhase): void {
    this.phase = p;
    this.cfg.onPhaseChange?.(p);
    this.emitDeployStats();
  }

  private setupLights(): void {
    this.hemiLight = new THREE.HemisphereLight(0xc8dfff, 0x3a2a18, 0.55);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xfff0d0, 1.2);
    this.sunLight.position.set(70, 95, 35);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(2048, 2048);
    this.sunLight.shadow.camera.near = 1;
    this.sunLight.shadow.camera.far = 280;
    this.sunLight.shadow.camera.left = -90;
    this.sunLight.shadow.camera.right = 90;
    this.sunLight.shadow.camera.top = 90;
    this.sunLight.shadow.camera.bottom = -90;
    this.sunLight.shadow.bias = -0.00025;
    this.sunLight.shadow.normalBias = 0.02;
    this.scene.add(this.sunLight);

    this.fillLight = new THREE.DirectionalLight(0x6080c0, 0.3);
    this.fillLight.position.set(-40, 30, 20);
    this.scene.add(this.fillLight);

    this.ambientLight = new THREE.AmbientLight(0x404050, 0.22);
    this.scene.add(this.ambientLight);
  }

  /** Public: switch storm / golden hour / etc. */
  setWeather(preset: WeatherPreset): void {
    this.weather = preset;
    this.atmosphere?.applyPreset(preset);
    this.post?.setColorTint(
      preset === 'golden_hour' ? 0.45 : preset === 'storm' ? -0.25 : 0.1,
    );
  }

  setCameraMode(mode: CamMode): void {
    this.camRig?.setMode(mode);
    if (mode === 'orbit') this.camRig?.setFollowEnabled(false);
    else this.camRig?.setFollowEnabled(true);
  }

  /**
   * Production → same-origin `/models/war/…` (Vercel rewrite → R2 CDN).
   * Avoids cross-origin CORS on assets.grudge-studio.com for GLTFLoader.
   * Dev can use ?local=1 → `/api/local-war-scene` (D: drive stream).
   * Never fall back to local API on grudgewarlords.com — that 404s.
   */
  private resolveSceneUrl(): { url: string; mode: 'cdn' | 'local' | 'custom' } {
    if (this.cfg.sceneUrl) {
      return { url: resolveModelUrl(this.cfg.sceneUrl), mode: 'custom' };
    }
    const params = new URLSearchParams(window.location.search);
    const wantLocal = params.get('local') === '1';
    const host = typeof window !== 'undefined' ? window.location.hostname : '';
    const isLocalHost = host === 'localhost' || host === '127.0.0.1';
    const isProdHost =
      /grudgewarlords\.com$|grudge-studio\.com$|vercel\.app$/i.test(host) && !isLocalHost;

    // local=1 only on localhost (or forceLocal=1 for API debugging)
    if (wantLocal && (isLocalHost || params.get('forceLocal') === '1')) {
      return { url: '/api/local-war-scene', mode: 'local' };
    }

    // Production / any hosted build: same-origin path → vercel.json rewrites to R2
    if (isProdHost || !isLocalHost) {
      return { url: MEDIEVAL_BATTLE_CDN_PATH, mode: 'cdn' };
    }
    // Local vite without ?local=1 still prefers absolute CDN
    return { url: resolveModelUrl(MEDIEVAL_BATTLE_CDN_PATH), mode: 'cdn' };
  }

  /** Reject HTML SPA stubs / tiny placeholders served as "GLB". */
  private async assertGlbAsset(url: string): Promise<void> {
    // Relative local stream — skip HEAD (may not support it)
    if (url.startsWith('/api/')) return;

    const abs =
      url.startsWith('http') || url.startsWith('//')
        ? url
        : `${window.location.origin}${url.startsWith('/') ? url : `/${url}`}`;

    let res: Response;
    try {
      res = await fetch(abs, { method: 'HEAD', mode: 'cors' });
    } catch {
      res = await fetch(abs, {
        method: 'GET',
        headers: { Range: 'bytes=0-15' },
        mode: 'cors',
      });
    }
    if (!res.ok) {
      throw new Error(
        `War scene asset HTTP ${res.status} at ${abs}. Run: npm run upload:war-scene`,
      );
    }
    const len = Number(res.headers.get('content-length') || 0);
    const ct = (res.headers.get('content-type') || '').toLowerCase();
    if (ct.includes('text/html')) {
      throw new Error(
        `CDN returned HTML instead of GLB. Re-run: npm run upload:war-scene`,
      );
    }
    // Production optimized fortress is ~23MB; old HTML stub was ~44KB
    if (len > 0 && len < 500_000) {
      throw new Error(
        `War scene asset too small (${len} bytes). Expected ~23MB optimized GLB on R2. Run: npm run upload:war-scene`,
      );
    }
  }

  async init(): Promise<void> {
    const progress = (p: number, label: string) => this.cfg.onLoadProgress?.(p, label);
    progress(2, 'Preparing loaders…');

    const loader = new GLTFLoader();
    const draco = new DRACOLoader();
    draco.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
    loader.setDRACOLoader(draco);

    const { url, mode } = this.resolveSceneUrl();
    progress(
      5,
      mode === 'local'
        ? 'Loading local fortress stream…'
        : 'Loading island fortress from CDN…',
    );

    if (mode === 'cdn' || mode === 'custom') {
      progress(6, 'Verifying fortress asset…');
      await this.assertGlbAsset(url);
    }

    let gltf;
    try {
      gltf = await loader.loadAsync(url, (e) => {
        if (e.total > 0) {
          progress(
            8 + (e.loaded / e.total) * 42,
            `Downloading fortress… ${Math.round((e.loaded / e.total) * 100)}%`,
          );
        }
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // Dev-only fallback: local API stream (never on production hosts)
      const host = window.location.hostname;
      const canLocal =
        host === 'localhost' ||
        host === '127.0.0.1' ||
        new URLSearchParams(window.location.search).get('forceLocal') === '1';
      if (!canLocal || mode === 'local') {
        throw new Error(
          `Failed to load war fortress from ${url}. ${msg}\n\n` +
            `Production loads R2 via /models/war/huge_medieval_battle_scene.glb (~23MB optimized).\n` +
            `Re-upload: npm run upload:war-scene\n` +
            `Local dev: npm run dev + /war-scene?local=1`,
        );
      }
      console.warn('[WarScene] CDN load failed, trying local middleware', err);
      progress(10, 'CDN miss — loading local D: scene…');
      gltf = await loader.loadAsync('/api/local-war-scene', (e) => {
        if (e.total > 0) {
          progress(
            10 + (e.loaded / e.total) * 40,
            `Local scene… ${Math.round((e.loaded / e.total) * 100)}%`,
          );
        }
      });
    }

    progress(52, 'Classifying island meshes…');
    const root = gltf.scene;
    root.updateMatrixWorld(true);

    const proxies: Array<{
      object: THREE.Object3D;
      matId: number;
      position: THREE.Vector3;
      rotationY: number;
    }> = [];

    let staticCount = 0;
    root.traverse((obj) => {
      const layer = classifyBattleNodeName(obj.name);
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.castShadow = layer === 'unit_proxy' || layer === 'prop' || layer === 'wall';
        mesh.receiveShadow = layer === 'terrain' || layer === 'wall' || layer === 'prop';
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const mat of mats) {
          if (!mat) continue;
          const std = mat as THREE.MeshStandardMaterial;
          if (std.map) {
            std.map.colorSpace = THREE.SRGBColorSpace;
            std.map.needsUpdate = true;
          }
          // Fire arrows get emissive for template clone; then we hide them
          if (layer === 'vfx_fire_arrow') {
            if (std.emissive) {
              std.emissive = new THREE.Color(0xff5500);
              std.emissiveIntensity = 1.4;
            }
            std.transparent = true;
          }
        }
        staticCount++;
      }

      if (layer === 'terrain' || layer === 'wall' || layer === 'prop') {
        this.groundMeshes.push(obj);
      }
      if (layer === 'wall' || /Mura|RocciaMura|Passerella.*Mura/i.test(obj.name)) {
        this.wallMeshes.push(obj);
      }

      if (layer === 'unit_proxy') {
        const matId = parsePgMatId(obj.name) ?? 1;
        const pos = new THREE.Vector3();
        obj.getWorldPosition(pos);
        const q = new THREE.Quaternion();
        obj.getWorldQuaternion(q);
        const e = new THREE.Euler().setFromQuaternion(q, 'YXZ');
        proxies.push({ object: obj, matId, position: pos, rotationY: e.y });
      }
    });

    // Center environment on origin
    const box = new THREE.Box3().setFromObject(root);
    const center = box.getCenter(new THREE.Vector3());
    root.position.sub(center);
    root.updateMatrixWorld(true);
    for (const p of proxies) {
      p.object.getWorldPosition(p.position);
    }

    this.envRoot.add(root);

    // Harvest stuck Fire_* flaming arrows → archer projectile pool; hide from map
    progress(54, 'Clearing baked aerial arrows…');
    this.projectiles = new WarProjectileSystem(this.scene);
    this.projectiles.setImpactHandler((hit) => this.applyProjectileImpact(hit));
    const harvested = this.projectiles.harvestFromScene(root);
    this.log(
      harvested > 0
        ? `Removed ${harvested} stuck Fire_* arrows from map → archer projectile pool`
        : 'No Fire_* meshes found — using procedural flaming arrows for archers',
    );

    // Island water + material best practices
    progress(56, 'Shaping island shoreline…');
    this.island = enhanceIslandBattlefield(this.scene, root);
    // Shadow ground also in ground ray set
    this.groundMeshes.push(this.island.ground);

    // Walls
    progress(58, 'Fortifying walls…');
    this.walls = buildWallSegmentsFromMeshes(this.wallMeshes);
    for (const w of this.walls) {
      this.wallMap.set(w.id, w);
      w.collider = new THREE.Box3().setFromObject(w.intact);
      w.position.copy(
        new THREE.Vector3().addVectors(w.collider.min, w.collider.max).multiplyScalar(0.5),
      );
    }
    this.log(
      `Walls: ${this.walls.length} combat segments (intact shown, rubble hidden until breached)`,
    );

    // 3 capture zones (CB style)
    progress(60, 'Planting capture banners…');
    const zoneDefs = defaultCaptureZones(42);
    for (const def of zoneDefs) {
      // Snap Y to ground
      const gy = this.sampleGround(def.center.x, def.center.z);
      if (gy != null) def.center.y = gy;
      this.captureZones.push(new WarCaptureZone(def, this.scene));
    }
    this.log(
      `Capture zones: ${this.captureZones.map((z) => z.label).join(' · ')} (hold all 3 or win on timer)`,
    );

    // Reserve pool — CB style: no free army on map yet
    progress(62, 'Mustering reserve companies…');
    this.deployment.ingestProxies(proxies);
    this.deployment.attachMarkers(this.scene);
    this.deployment.setMarkersVisible(false);

    this.controls.target.copy(new THREE.Vector3(0, 2, 0));
    this.camera.position.set(55, 40, 70);
    this.controls.update();

    // Click-to-move for player hero during siege
    this.onCanvasClick = (ev: MouseEvent) => this.handleCanvasClick(ev);
    this.cfg.canvas.addEventListener('click', this.onCanvasClick);

    progress(100, 'Battlefield ready — declaration of war');
    this.log(
      `Island siege ready — ${proxies.length} companies in reserve, ${staticCount} static meshes, ${this.walls.length} walls, 3 zones`,
    );
    this.cfg.onReady?.();

    // Auto-start match flow after load
    if (this.cfg.skipCinematic || new URLSearchParams(window.location.search).get('skip') === '1') {
      this.enterDeploy();
    } else {
      this.startCinematic();
    }
  }

  private startCinematic(): void {
    this.setPhase('cinematic');
    this.log('— Declaration of War —');
    this.cinematic.start({
      voice: this.voice,
      onSubtitle: (text, role) => this.cfg.onSubtitle?.(text, role),
      onComplete: () => this.enterDeploy(),
    });
  }

  /** Public: skip intro VO */
  skipCinematic(): void {
    if (this.phase === 'cinematic') this.cinematic.skip();
  }

  private enterDeploy(): void {
    this.setPhase('deploy');
    this.controls.enabled = true;
    this.deployment.setMarkersVisible(true);
    this.camera.position.set(0, 55, 80);
    this.controls.target.set(0, 2, 0);
    this.controls.update();
    this.log('Deploy phase — place companies, then begin siege.');
    this.emitDeployStats();
  }

  /**
   * CB deploy: ordered roster + optional grudge6 hero + catapult at round start.
   */
  async beginSiege(opts?: {
    playerFaction?: WarFactionId;
    hero?: PlayerHeroOpts | null;
    roster?: RosterEntry[];
  }): Promise<void> {
    if (this.phase !== 'deploy' && this.phase !== 'cinematic') return;
    if (this.phase === 'cinematic') this.cinematic.skip();

    const playerFaction = opts?.playerFaction ?? 'crimson';
    this.playerHero = opts?.hero ?? null;
    this.deployment.setMarkersVisible(false);

    // Field opening companies (all factions) — CB auto-balance
    const opening = this.deployment.commitOpeningDeploy(playerFaction);
    this.log(
      `Opening deploy: ${opening.length} companies (${Object.entries(this.deployment.reserveCounts())
        .map(([k, v]) => `${k} reserve ${v}`)
        .join(', ')})`,
    );
    await this.spawnSlots(opening);

    // Player grudge6 hero
    if (this.playerHero) {
      await this.spawnPlayerHero(this.playerHero, playerFaction);
    }

    // Catapult fires from round start if selected (default on for crimson attacker)
    const roster = opts?.roster ?? [];
    const wantCatapult =
      roster.length === 0 || hasSelectedSiege(roster, 'catapult') || playerFaction === 'crimson';
    if (wantCatapult) {
      this.spawnCatapults(playerFaction);
    }

    this.roundTimeLeft = ROUND_DURATION_SEC;
    this.deployment.beginSiegeWaves();
    this.setPhase('siege');
    this.camRig?.setMode(this.playerUnit ? 'follow' : 'tactical');
    this.camRig?.setFollowEnabled(!!this.playerUnit);
    this.log(
      `⚔ SIEGE BEGINS — 10:00 · ${this.weather} weather · capture 3 zones · click ground to move hero`,
    );
    void this.voice.speak('The siege begins! Capture the banners!', { role: 'herald' });
    this.emitDeployStats();
    this.emitMatchHud();
  }

  private async spawnPlayerHero(hero: PlayerHeroOpts, faction: WarFactionId): Promise<void> {
    const zone =
      this.deployment.zones.find((z) => z.faction === faction) ?? this.deployment.zones[0];
    const pos = (zone?.center ?? new THREE.Vector3(-20, 0, 15)).clone();
    pos.x += 2;
    pos.z += 2;
    const gy = this.sampleGround(pos.x, pos.z);
    if (gy != null) pos.y = gy;

    const arch: WarUnitArchetype = {
      id: 'player_hero',
      pgMatId: 0,
      label: hero.name || 'Warlord',
      faction,
      role: 'captain',
      raceId: hero.raceId || 'human',
      weaponType: 'sword-shield',
      maxHp: 200,
      damage: 22,
      attackRange: 2.6,
      attackCooldown: 0.95,
      moveSpeed: 5.2,
      aggroRadius: 26,
      skills: ['slash', 'warcry', 'charge'],
    };

    const unit = new WarUnit({
      id: `hero_${hero.characterId ?? this.unitSeq++}`,
      archetype: arch,
      position: pos,
      rotationY: 0,
      isPlayer: true,
      raceId: hero.raceId,
      displayName: hero.name,
    });
    this.unitsRoot.add(unit.root);
    this.units.push(unit);
    this.unitMap.set(unit.id, unit);
    this.playerUnit = unit;
    await unit.load();
    this.log(`Your hero ${hero.name} (${hero.raceId}) enters the field`);
  }

  private spawnCatapults(attackerFaction: WarFactionId): void {
    const zone =
      this.deployment.zones.find((z) => z.faction === attackerFaction) ??
      this.deployment.zones[0];
    const base = zone?.center ?? new THREE.Vector3(-25, 0, 20);
    const positions = [
      base.clone().add(new THREE.Vector3(-6, 0, 4)),
      base.clone().add(new THREE.Vector3(4, 0, 8)),
    ];
    // One guaranteed catapult at round start (user request)
    const spots = positions.slice(0, 1);
    for (let i = 0; i < spots.length; i++) {
      const p = spots[i]!;
      const gy = this.sampleGround(p.x, p.z);
      if (gy != null) p.y = gy;
      const cat = new WarCatapult({
        id: `cat_${i}`,
        faction: attackerFaction === 'neutral' ? 'crimson' : (attackerFaction as any),
        position: p,
        damage: 32,
        fireInterval: 3.8,
      });
      cat.setHitHandler((wallId, dmg) => {
        const wall = this.wallMap.get(wallId);
        if (!wall || wall.dead) return;
        const destroyed = wall.takeDamage(dmg);
        this.camRig?.impact(destroyed ? 0.75 : 0.35);
        this.log(
          `Catapult hits ${wall.label} (−${dmg})` +
            (destroyed ? ' — WALL BREACHED' : ` [${wall.hp}/${wall.maxHp}]`),
        );
      });
      this.siegeRoot.add(cat.root);
      this.catapults.push(cat);
    }
    this.log(`Catapult online — bombarding walls from round start`);
  }

  private handleCanvasClick(ev: MouseEvent): void {
    if (this.phase !== 'siege' || !this.playerUnit || this.playerUnit.dead) return;
    // Ignore UI clicks (buttons use stopPropagation ideally; also skip if shift for orbit)
    if (ev.button !== 0) return;
    const rect = this.cfg.canvas.getBoundingClientRect();
    this.pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
    this.clickRay.setFromCamera(this.pointer, this.camera);
    const hits = this.clickRay.intersectObjects(this.groundMeshes, true);
    if (!hits.length) return;
    const p = hits[0]!.point;
    this.playerUnit.playerMoveTo = p.clone();
    this.log(`Orders: ${this.playerUnit.displayName} → ground`);
  }

  /** Deploy one reinforcement of faction (manual button) */
  async callReinforcement(faction: WarFactionId): Promise<boolean> {
    if (this.phase !== 'siege' && this.phase !== 'deploy') return false;
    const alive = this.units.filter((u) => !u.dead).length;
    const slot = this.deployment.deployOne(faction, alive);
    if (!slot) return false;
    await this.spawnSlots([slot]);
    this.log(`Reinforcement: ${slot.archetype.label} (${faction})`);
    this.emitDeployStats();
    return true;
  }

  private async spawnSlots(slots: UnitProxySlot[]): Promise<void> {
    if (!slots.length) return;
    this.spawning = true;
    const created: WarUnit[] = [];
    for (const s of slots) {
      if (this.units.length >= this.deployment.maxFielded) break;
      const unit = new WarUnit({
        id: `u_${this.unitSeq++}_${s.matId}`,
        archetype: s.archetype,
        position: s.homePosition.clone(),
        rotationY: s.homeRotationY,
        proxy: WAR_SCENE_DEFAULTS.hideUnitProxies ? s.object : undefined,
      });
      this.unitsRoot.add(unit.root);
      this.units.push(unit);
      this.unitMap.set(unit.id, unit);
      created.push(unit);
    }
    // Load anims in small batches
    const batch = 4;
    for (let b = 0; b < created.length; b += batch) {
      const slice = created.slice(b, b + batch);
      await Promise.all(slice.map((u) => u.load()));
    }
    this.spawning = false;
  }

  private emitDeployStats(): void {
    this.cfg.onDeployStats?.({
      phase: this.phase,
      reserve: this.deployment.reserveCounts(),
      fielded: this.units.filter((u) => !u.dead).length,
      maxFielded: this.deployment.maxFielded,
      nextWaveIn: this.deployment.nextWaveIn,
      waveNumber: this.deployment.waveNumber,
      zones: this.deployment.zones.map((z) => ({
        id: z.id,
        label: z.label,
        faction: z.faction,
        deployCap: z.deployCap,
      })),
      captureZones: this.captureZones.map((z) => z.toState()),
      timeLeft: this.roundTimeLeft,
      clock: formatClock(this.roundTimeLeft),
    });
  }

  private emitMatchHud(): void {
    let wallsIntact = 0;
    let wallsDestroyed = 0;
    for (const w of this.walls) {
      if (w.dead) wallsDestroyed++;
      else wallsIntact++;
    }
    this.cfg.onMatchHud?.({
      timeLeft: this.roundTimeLeft,
      timeTotal: ROUND_DURATION_SEC,
      zoneOwners: countZoneOwners(this.captureZones),
      zones: this.captureZones.map((z) => ({
        id: z.id,
        label: z.label,
        owner: z.owner,
        progress: z.progress,
        capturer: z.capturer,
      })),
      catapults: this.catapults.length,
      wallsIntact,
      wallsDestroyed,
    });
  }

  private log(line: string): void {
    this.combatLog.push(line);
    if (this.combatLog.length > 80) this.combatLog.shift();
    this.cfg.onCombatLog?.(line);
  }

  getStats(): WarSceneStats {
    let alive = 0;
    let crimson = 0;
    let azure = 0;
    let gold = 0;
    for (const u of this.units) {
      if (!u.dead) {
        alive++;
        if (u.faction === 'crimson') crimson++;
        else if (u.faction === 'azure') azure++;
        else if (u.faction === 'gold') gold++;
      }
    }
    let wallsIntact = 0;
    let wallsDestroyed = 0;
    for (const w of this.walls) {
      if (w.dead) wallsDestroyed++;
      else wallsIntact++;
    }
    return {
      staticMeshes: this.groundMeshes.length,
      unitProxies: this.deployment.slots.length,
      animatedUnits: this.units.length,
      alive,
      crimson,
      azure,
      gold,
      wallsIntact,
      wallsDestroyed,
      phase: this.phase,
      reserve: this.deployment.reserveCounts(),
      nextWaveIn: this.deployment.nextWaveIn,
      waveNumber: this.deployment.waveNumber,
      timeLeft: this.roundTimeLeft,
      clock: formatClock(this.roundTimeLeft),
      captureZones: this.captureZones.map((z) => z.toState()),
      playerAlive: !!(this.playerUnit && !this.playerUnit.dead),
    };
  }

  getCombatLog(): string[] {
    return [...this.combatLog];
  }

  getDeclaration() {
    return this.cinematic.declaration;
  }

  private sampleGround = (x: number, z: number): number | null => {
    this.raycaster.set(new THREE.Vector3(x, 60, z), this.down);
    this.raycaster.far = WAR_SCENE_DEFAULTS.groundRayMax;
    const hits = this.raycaster.intersectObjects(this.groundMeshes, true);
    if (hits.length > 0) return hits[0]!.point.y;
    return 0;
  };

  private onAttack = (
    attacker: WarUnit,
    targetId: string,
    damage: number,
    skill: string,
  ): void => {
    // Archers / ranged skills: spawn flaming arrow projectile (map Fire_* asset)
    if (isRangedWarSkill(attacker.archetype.role, skill) && this.projectiles) {
      const from = attacker.root.position.clone();
      from.y += 1.4;
      let to = new THREE.Vector3();
      const unit = this.unitMap.get(targetId);
      const wall = this.wallMap.get(targetId);
      if (unit && !unit.dead) {
        to.copy(unit.root.position);
        to.y += 1.1;
      } else if (wall && !wall.dead) {
        to.copy(wall.position);
        to.y += 2;
      } else {
        // fallback forward
        to.copy(from).add(new THREE.Vector3(Math.sin(attacker.root.rotation.y), 0, Math.cos(attacker.root.rotation.y)).multiplyScalar(12));
      }
      this.projectiles.fire({
        from,
        to,
        damage,
        skill,
        attackerId: attacker.id,
        targetId,
        flaming: true,
      });
      return;
    }

    // Melee / instant
    this.applyDirectDamage(attacker.id, targetId, damage, skill, attacker.archetype.label);
  };

  private applyProjectileImpact = (hit: {
    targetId: string;
    attackerId: string;
    damage: number;
    skill: string;
    point: THREE.Vector3;
  }): void => {
    const attacker = this.unitMap.get(hit.attackerId);
    const label = attacker?.archetype.label ?? 'Archer';
    this.applyDirectDamage(hit.attackerId, hit.targetId, hit.damage, hit.skill, label);
  };

  private applyDirectDamage(
    attackerId: string,
    targetId: string,
    damage: number,
    skill: string,
    attackerLabel: string,
  ): void {
    const unit = this.unitMap.get(targetId);
    if (unit && !unit.dead) {
      unit.takeDamage(damage, attackerId);
      if (Math.random() < 0.2 || /arrow|shot|bolt/i.test(skill)) {
        this.log(
          `${attackerLabel} → ${unit.archetype.label}: ${skill} (${damage} dmg)` +
            (unit.dead ? ' ☠' : ''),
        );
      }
      return;
    }
    const wall = this.wallMap.get(targetId);
    if (wall && !wall.dead) {
      const destroyed = wall.takeDamage(damage);
      if (destroyed || Math.random() < 0.25 || /arrow|shot/i.test(skill)) {
        this.log(
          `${attackerLabel} siege ${wall.label}: ${skill} (−${damage} HP)` +
            (destroyed ? ' — WALL BREACHED' : ` [${wall.hp}/${wall.maxHp}]`),
        );
      }
      if (destroyed) this.camRig?.impact(0.7);
      else if (damage >= 20) this.camRig?.impact(0.25);
    }
  };

  start(): void {
    if (this.running) return;
    this.running = true;
    this.clock.start();
    const loop = () => {
      if (!this.running) return;
      this.raf = requestAnimationFrame(loop);
      const dt = Math.min(this.clock.getDelta(), 0.05);
      this.tick(dt);
      this.controls.update();
      // Lightning boosts bloom
      if (this.post && this.atmosphere) {
        this.post.setBloomStrength(this.baseBloom + this.atmosphere.getBloomBoost());
      }
      if (this.post) this.post.render();
      else this.renderer.render(this.scene, this.camera);
    };
    loop();
  }

  private tick(dt: number): void {
    this.elapsed += dt;

    this.atmosphere?.update(dt);
    if (this.island) tickIslandWater(this.island.water, this.elapsed);

    // Camera rig (follow / tactical / shake)
    const follow =
      this.playerUnit && !this.playerUnit.dead ? this.playerUnit.root.position : null;
    this.camRig?.update(dt, follow, this.phase);

    if (this.phase === 'cinematic') {
      this.cinematic.update(dt);
      return;
    }

    // Walls always animate
    for (const w of this.walls) w.update(dt);

    if (this.phase === 'deploy') {
      // Idle — no combat AI until siege (HUD already has deploy stats)
      return;
    }

    if (this.phase !== 'siege') return;

    // Round clock (10 minutes)
    this.roundTimeLeft = Math.max(0, this.roundTimeLeft - dt);

    // Flaming arrows in flight
    this.projectiles?.update(dt);

    // Catapults fire from round start
    for (const c of this.catapults) c.update(dt, this.walls);

    // Capture zones
    const unitPos = this.units.map((u) => ({
      faction: u.faction,
      position: u.root.position,
      dead: u.dead,
    }));
    for (const z of this.captureZones) z.update(dt, unitPos);

    // Reinforcement waves
    if (!this.spawning) {
      const alive = this.units.filter((u) => !u.dead).length;
      const wave = this.deployment.tickWaves(dt, alive);
      if (wave.length) {
        this.log(`⚔ Wave ${this.deployment.waveNumber}: +${wave.length} reinforcements`);
        void this.spawnSlots(wave).then(() => this.emitDeployStats());
      }
    }

    this.applySeparation(dt);
    this.resolveWallCollisions();

    const unitSenses: WarSenseTarget[] = this.units.map((u) => u.toSense());
    const wallSenses: WarSenseTarget[] = this.walls
      .filter((w) => !w.dead)
      .map((w) => w.toSense());
    const allTargets = [...unitSenses, ...wallSenses];

    for (const u of this.units) {
      const hostiles = allTargets.filter((s) => s.id !== u.id);
      u.update(dt, hostiles, this.sampleGround, this.onAttack);
    }

    // Match end: zones / timer / wipe
    const crimsonAlive = this.units.filter((u) => !u.dead && u.faction === 'crimson').length;
    const azureAlive = this.units.filter((u) => !u.dead && u.faction === 'azure').length;
    let wallsDestroyed = 0;
    for (const w of this.walls) if (w.dead) wallsDestroyed++;

    const outcome = evaluateMatchEnd({
      timeLeft: this.roundTimeLeft,
      zones: this.captureZones,
      crimsonAlive,
      azureAlive,
      wallsDestroyed,
    });
    if (outcome.kind === 'victory') {
      this.setPhase('ended');
      this.log(`—— ${outcome.winner.toUpperCase()} — ${outcome.reason} ——`);
      this.cfg.onMatchEnd?.(outcome.winner, outcome.reason);
      void this.voice.speak(
        outcome.winner === 'draw'
          ? 'Stalemate on Warlord Isle.'
          : `${outcome.winner} claims victory!`,
        { role: 'herald' },
      );
    }

    // HUD throttle ~2Hz
    if (Math.floor(this.elapsed * 2) !== Math.floor((this.elapsed - dt) * 2)) {
      this.emitMatchHud();
      this.emitDeployStats();
    }
  }

  private resolveWallCollisions(): void {
    for (const u of this.units) {
      if (u.dead) continue;
      const p = u.root.position;
      for (const w of this.walls) {
        if (w.dead || w.state === 'destroying') continue;
        if (!w.containsPoint(p, 0.35)) continue;
        const c = w.collider;
        const cx = (c.min.x + c.max.x) * 0.5;
        const cz = (c.min.z + c.max.z) * 0.5;
        const dx = p.x - cx;
        const dz = p.z - cz;
        const push = 0.35;
        if (Math.abs(dx) > Math.abs(dz)) {
          p.x += Math.sign(dx || 1) * push;
        } else {
          p.z += Math.sign(dz || 1) * push;
        }
      }
    }
  }

  private applySeparation(dt: number): void {
    const r = WAR_SCENE_DEFAULTS.separationRadius;
    const r2 = r * r;
    for (let i = 0; i < this.units.length; i++) {
      const a = this.units[i]!;
      if (a.dead) continue;
      for (let j = i + 1; j < this.units.length; j++) {
        const b = this.units[j]!;
        if (b.dead) continue;
        const dx = b.root.position.x - a.root.position.x;
        const dz = b.root.position.z - a.root.position.z;
        const d2 = dx * dx + dz * dz;
        if (d2 > r2 || d2 < 1e-6) continue;
        const d = Math.sqrt(d2);
        const push = ((r - d) / r) * 2.5 * dt;
        const nx = dx / d;
        const nz = dz / d;
        a.root.position.x -= nx * push;
        a.root.position.z -= nz * push;
        b.root.position.x += nx * push;
        b.root.position.z += nz * push;
      }
    }
  }

  resize(w: number, h: number): void {
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.post?.resize(w, h);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  dispose(): void {
    this.stop();
    if (this.onCanvasClick) {
      this.cfg.canvas.removeEventListener('click', this.onCanvasClick);
      this.onCanvasClick = null;
    }
    this.voice.dispose();
    this.deployment.dispose();
    this.island?.dispose();
    for (const z of this.captureZones) z.dispose();
    this.captureZones = [];
    for (const c of this.catapults) c.dispose();
    this.catapults = [];
    this.projectiles?.dispose();
    this.projectiles = null;
    this.atmosphere?.dispose();
    this.atmosphere = null;
    this.post?.dispose();
    this.post = null;
    for (const u of this.units) u.dispose();
    this.units = [];
    this.renderer.dispose();
    this.controls.dispose();
  }
}

export { MEDIEVAL_BATTLE_LOCAL_PATH, MEDIEVAL_BATTLE_CDN_PATH };
export type { WarMatchPhase };
