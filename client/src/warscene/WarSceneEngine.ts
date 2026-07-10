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
}

export interface DeployHudStats {
  phase: WarMatchPhase;
  reserve: Record<string, number>;
  fielded: number;
  maxFielded: number;
  nextWaveIn: number;
  waveNumber: number;
  zones: Array<{ id: string; label: string; faction: string; deployCap: number }>;
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
    this.renderer.toneMappingExposure = 1.08;

    this.camera = new THREE.PerspectiveCamera(50, cfg.width / cfg.height, 0.5, 900);
    this.camera.position.set(40, 35, 55);

    this.controls = new OrbitControls(this.camera, cfg.canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.maxPolarAngle = Math.PI * 0.48;
    this.controls.target.set(0, 2, 0);

    this.scene.background = new THREE.Color(0x6a8eab);
    this.scene.fog = new THREE.FogExp2(0x7a9bb8, 0.0065);

    this.envRoot.name = 'battle_environment';
    this.unitsRoot.name = 'war_units';
    this.scene.add(this.envRoot);
    this.scene.add(this.unitsRoot);

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
    const hemi = new THREE.HemisphereLight(0xc8dfff, 0x3a2a18, 0.62);
    this.scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xfff0d0, 1.4);
    sun.position.set(70, 95, 35);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 280;
    sun.shadow.camera.left = -90;
    sun.shadow.camera.right = 90;
    sun.shadow.camera.top = 90;
    sun.shadow.camera.bottom = -90;
    sun.shadow.bias = -0.0002;
    this.scene.add(sun);
    this.scene.add(new THREE.AmbientLight(0x404050, 0.22));
  }

  /**
   * Production → R2 CDN only.
   * Dev can use ?local=1 → Railway/API `/api/local-war-scene` (D: drive stream).
   * Never fall back to local API on grudgewarlords.com / Vercel — that 404s.
   */
  private resolveSceneUrl(): { url: string; mode: 'cdn' | 'local' | 'custom' } {
    if (this.cfg.sceneUrl) {
      return { url: resolveModelUrl(this.cfg.sceneUrl), mode: 'custom' };
    }
    const params = new URLSearchParams(window.location.search);
    const wantLocal = params.get('local') === '1';
    const host = typeof window !== 'undefined' ? window.location.hostname : '';
    const isProdHost =
      /grudgewarlords\.com$|grudge-studio\.com$|vercel\.app$/i.test(host) &&
      host !== 'localhost' &&
      host !== '127.0.0.1';

    // local=1 only on localhost / explicit non-prod (or force=1 for API debugging)
    if (wantLocal && (!isProdHost || params.get('forceLocal') === '1')) {
      return { url: '/api/local-war-scene', mode: 'local' };
    }
    return { url: resolveModelUrl(MEDIEVAL_BATTLE_CDN_PATH), mode: 'cdn' };
  }

  /** Reject HTML SPA stubs / tiny placeholders served as "GLB". */
  private async assertGlbAsset(url: string): Promise<void> {
    // Relative local stream — skip HEAD (may not support it)
    if (url.startsWith('/api/')) return;

    let res: Response;
    try {
      res = await fetch(url, { method: 'HEAD', mode: 'cors' });
    } catch {
      // Some CDNs block HEAD; try ranged GET
      res = await fetch(url, {
        method: 'GET',
        headers: { Range: 'bytes=0-15' },
        mode: 'cors',
      });
    }
    if (!res.ok) {
      throw new Error(
        `War scene asset HTTP ${res.status} at ${url}. Upload the fortress GLB to R2 key models/war/huge_medieval_battle_scene.glb`,
      );
    }
    const len = Number(res.headers.get('content-length') || 0);
    const ct = (res.headers.get('content-type') || '').toLowerCase();
    if (ct.includes('text/html')) {
      throw new Error(
        `CDN returned HTML instead of GLB (missing R2 object). Upload: models/war/huge_medieval_battle_scene.glb`,
      );
    }
    // Real fortress is ~500MB; stub/HTML was ~44KB
    if (len > 0 && len < 500_000) {
      throw new Error(
        `War scene asset too small (${len} bytes) — not the fortress GLB. Re-upload ~517MB file to R2.`,
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
            `Production needs the real GLB on CDN:\n` +
            `  wrangler r2 object put grudge-assets/models/war/huge_medieval_battle_scene.glb \\\n` +
            `    --file="D:/Games/grudge-game-engine/huge_medieval_battle_scene.glb" \\\n` +
            `    --content-type=model/gltf-binary --remote\n\n` +
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
          if (layer === 'vfx_fire' && std.emissive) {
            std.emissive = new THREE.Color(0xff6600);
            std.emissiveIntensity = 1.2;
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

    // Reserve pool — CB style: no free army on map yet
    progress(62, 'Mustering reserve companies…');
    this.deployment.ingestProxies(proxies);
    this.deployment.attachMarkers(this.scene);
    this.deployment.setMarkersVisible(false);

    this.controls.target.copy(new THREE.Vector3(0, 2, 0));
    this.camera.position.set(55, 40, 70);
    this.controls.update();

    progress(100, 'Battlefield ready — declaration of war');
    this.log(
      `Island siege ready — ${proxies.length} companies in reserve, ${staticCount} static meshes, ${this.walls.length} walls`,
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
   * CB quick deploy: field opening companies for all factions, start siege.
   */
  async beginSiege(opts?: { playerFaction?: WarFactionId }): Promise<void> {
    if (this.phase !== 'deploy' && this.phase !== 'cinematic') return;
    if (this.phase === 'cinematic') this.cinematic.skip();

    this.deployment.setMarkersVisible(false);
    const opening = this.deployment.commitOpeningDeploy(opts?.playerFaction);
    this.log(
      `Opening deploy: ${opening.length} companies take the field (${Object.entries(
        this.deployment.reserveCounts(),
      )
        .map(([k, v]) => `${k} reserve ${v}`)
        .join(', ')})`,
    );

    await this.spawnSlots(opening);
    this.deployment.beginSiegeWaves();
    this.setPhase('siege');
    this.log('⚔ SIEGE BEGINS — reinforcements will arrive by wave.');
    this.emitDeployStats();
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
    const unit = this.unitMap.get(targetId);
    if (unit && !unit.dead) {
      unit.takeDamage(damage, attacker.id);
      if (Math.random() < 0.15) {
        this.log(
          `${attacker.archetype.label} → ${unit.archetype.label}: ${skill} (${damage} dmg)` +
            (unit.dead ? ' ☠' : ''),
        );
      }
      return;
    }
    const wall = this.wallMap.get(targetId);
    if (wall && !wall.dead) {
      const destroyed = wall.takeDamage(damage);
      if (destroyed || Math.random() < 0.2) {
        this.log(
          `${attacker.archetype.label} siege ${wall.label}: ${skill} (−${damage} HP)` +
            (destroyed ? ' — WALL BREACHED' : ` [${wall.hp}/${wall.maxHp}]`),
        );
      }
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
      this.renderer.render(this.scene, this.camera);
    };
    loop();
  }

  private tick(dt: number): void {
    this.elapsed += dt;

    if (this.island) tickIslandWater(this.island.water, this.elapsed);

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

    // Victory check
    const crimsonAlive = this.units.some((u) => !u.dead && u.faction === 'crimson');
    const azureAlive = this.units.some((u) => !u.dead && u.faction === 'azure');
    const reserve = this.deployment.reserveCounts();
    if (
      (!crimsonAlive && !(reserve.crimson ?? 0)) ||
      (!azureAlive && !(reserve.azure ?? 0))
    ) {
      if (this.phase === 'siege') {
        this.setPhase('ended');
        const winner =
          crimsonAlive || (reserve.crimson ?? 0) > 0
            ? 'Crimson'
            : azureAlive || (reserve.azure ?? 0) > 0
              ? 'Azure'
              : 'None';
        this.log(`—— Siege ended — ${winner} holds the island ——`);
        void this.voice.speak(
          winner === 'None'
            ? 'The field is silent. No banner remains.'
            : `${winner} claims victory on Warlord Isle!`,
          { role: 'herald' },
        );
      }
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
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  dispose(): void {
    this.stop();
    this.voice.dispose();
    this.deployment.dispose();
    this.island?.dispose();
    for (const u of this.units) u.dispose();
    this.units = [];
    this.renderer.dispose();
    this.controls.dispose();
  }
}

export { MEDIEVAL_BATTLE_LOCAL_PATH, MEDIEVAL_BATTLE_CDN_PATH };
export type { WarMatchPhase };
