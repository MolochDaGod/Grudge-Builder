/**
 * WarSceneEngine — turn huge_medieval_battle_scene.glb into a live war.
 *
 * Pipeline:
 *   1. Load static GLB (walls, terrain, props, fire/smoke)
 *   2. Collect PG_* unit proxy transforms
 *   3. Hide proxies, spawn animated grudge6 WarUnits
 *   4. AI brain (goal-oriented) + Mixamo weapon skills + ground snap
 *   5. Player can orbit camera / join as free observer or click-to-command
 *
 * Three.js practices: DRACO GLTFLoader, frustum shadows, regulator AI Hz,
 * SkeletonUtils via loadCharacterModel, MeshBVH-ready ground raycasts.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  MEDIEVAL_BATTLE_CDN_PATH,
  MEDIEVAL_BATTLE_LOCAL_PATH,
  WAR_SCENE_DEFAULTS,
  archetypeForPgMat,
  classifyBattleNodeName,
  parsePgMatId,
} from '@shared/definitions/medievalBattleScene';
import { resolveModelUrl } from '@/lib/modelManifest';
import { WarUnit } from './WarUnit';
import type { WarSenseTarget } from './WarAIBrain';
import {
  WarWallSegment,
  buildWallSegmentsFromMeshes,
} from './WarWallSegment';

export interface WarSceneConfig {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  /** Override scene URL (default CDN then local query) */
  sceneUrl?: string;
  maxUnits?: number;
  onLoadProgress?: (pct: number, label: string) => void;
  onCombatLog?: (line: string) => void;
  onReady?: () => void;
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
}

export class WarSceneEngine {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private clock = new THREE.Clock();
  private raf = 0;
  private running = false;

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

  constructor(cfg: WarSceneConfig) {
    this.cfg = cfg;
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
    this.renderer.toneMappingExposure = 1.05;

    this.camera = new THREE.PerspectiveCamera(50, cfg.width / cfg.height, 0.5, 800);
    this.camera.position.set(40, 35, 55);

    this.controls = new OrbitControls(this.camera, cfg.canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.maxPolarAngle = Math.PI * 0.48;
    this.controls.target.set(0, 2, 0);

    this.scene.background = new THREE.Color(0x87a0b8);
    this.scene.fog = new THREE.FogExp2(0x87a0b8, 0.008);

    this.envRoot.name = 'battle_environment';
    this.unitsRoot.name = 'war_units';
    this.scene.add(this.envRoot);
    this.scene.add(this.unitsRoot);

    this.setupLights();
  }

  private setupLights(): void {
    const hemi = new THREE.HemisphereLight(0xb8d0ff, 0x3a2a18, 0.55);
    this.scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xfff0d0, 1.35);
    sun.position.set(60, 90, 40);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 250;
    sun.shadow.camera.left = -80;
    sun.shadow.camera.right = 80;
    sun.shadow.camera.top = 80;
    sun.shadow.camera.bottom = -80;
    sun.shadow.bias = -0.0002;
    this.scene.add(sun);
    this.scene.add(new THREE.AmbientLight(0x404050, 0.25));
  }

  private resolveSceneUrl(): string {
    if (this.cfg.sceneUrl) return resolveModelUrl(this.cfg.sceneUrl);
    // Prefer CDN; allow ?local=1 for D: path via middleware
    const params = new URLSearchParams(window.location.search);
    if (params.get('local') === '1') {
      return '/api/local-war-scene';
    }
    return resolveModelUrl(MEDIEVAL_BATTLE_CDN_PATH);
  }

  async init(): Promise<void> {
    const progress = (p: number, label: string) => this.cfg.onLoadProgress?.(p, label);
    progress(2, 'Preparing loaders…');

    const loader = new GLTFLoader();
    const draco = new DRACOLoader();
    draco.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
    loader.setDRACOLoader(draco);

    const url = this.resolveSceneUrl();
    progress(5, `Loading battlefield (${url.includes('local') ? 'local 517MB' : 'CDN'})…`);

    let gltf;
    try {
      gltf = await loader.loadAsync(url, (e) => {
        if (e.total > 0) {
          progress(5 + (e.loaded / e.total) * 45, `Downloading scene… ${Math.round((e.loaded / e.total) * 100)}%`);
        }
      });
    } catch (err) {
      // Fallback: try local middleware
      console.warn('[WarScene] CDN load failed, trying local middleware', err);
      progress(10, 'CDN miss — loading local D: scene…');
      gltf = await loader.loadAsync('/api/local-war-scene', (e) => {
        if (e.total > 0) {
          progress(10 + (e.loaded / e.total) * 40, `Local scene… ${Math.round((e.loaded / e.total) * 100)}%`);
        }
      });
    }

    progress(55, 'Classifying meshes…');
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
        // sRGB albedo
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

    // Center environment on origin roughly
    const box = new THREE.Box3().setFromObject(root);
    const center = box.getCenter(new THREE.Vector3());
    root.position.sub(center);
    // Recompute proxy positions after centering
    root.updateMatrixWorld(true);
    for (const p of proxies) {
      p.object.getWorldPosition(p.position);
    }

    this.envRoot.add(root);

    // ── Fort walls: pair intact vs rubble, HP + collider ──────────────
    progress(58, 'Fortifying walls…');
    this.walls = buildWallSegmentsFromMeshes(this.wallMeshes);
    for (const w of this.walls) {
      this.wallMap.set(w.id, w);
      // Refresh collider after world centering
      w.collider = new THREE.Box3().setFromObject(w.intact);
      w.position.copy(
        new THREE.Vector3().addVectors(w.collider.min, w.collider.max).multiplyScalar(0.5),
      );
    }
    this.log(
      `Walls: ${this.walls.length} combat segments (intact shown, rubble hidden until breached)`,
    );
    this.controls.target.copy(new THREE.Vector3(0, 2, 0));
    this.camera.position.set(45, 40, 60);
    this.controls.update();

    progress(65, `Spawning ${proxies.length} war units…`);

    // Sort proxies for stable factions, cap for performance
    const maxU = this.cfg.maxUnits ?? WAR_SCENE_DEFAULTS.maxAnimatedUnits;
    const selected = proxies.slice(0, maxU);

    // Spawn units in batches
    let i = 0;
    for (const p of selected) {
      const arch = archetypeForPgMat(p.matId);
      const unit = new WarUnit({
        id: `u_${i}_${arch.pgMatId}`,
        archetype: arch,
        position: p.position.clone(),
        rotationY: p.rotationY,
        proxy: WAR_SCENE_DEFAULTS.hideUnitProxies ? p.object : undefined,
      });
      this.unitsRoot.add(unit.root);
      this.units.push(unit);
      this.unitMap.set(unit.id, unit);
      i++;
      if (i % 8 === 0) {
        progress(65 + (i / selected.length) * 25, `Baking unit ${i}/${selected.length}…`);
        await new Promise((r) => setTimeout(r, 0));
      }
    }

    // Load animations in parallel batches of 6
    const batch = 6;
    for (let b = 0; b < this.units.length; b += batch) {
      const slice = this.units.slice(b, b + batch);
      await Promise.all(slice.map((u) => u.load()));
      progress(
        70 + ((b + slice.length) / this.units.length) * 28,
        `Animations ${Math.min(b + batch, this.units.length)}/${this.units.length}…`,
      );
    }

    // Hide remaining proxies beyond cap
    for (const p of proxies.slice(maxU)) {
      p.object.visible = false;
    }

    progress(100, 'War ready');
    this.log(
      `Battlefield live — ${this.units.length} animated units (of ${proxies.length} proxies), ${staticCount} static meshes`,
    );
    this.cfg.onReady?.();
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
      unitProxies: this.units.length,
      animatedUnits: this.units.length,
      alive,
      crimson,
      azure,
      gold,
      wallsIntact,
      wallsDestroyed,
    };
  }

  getCombatLog(): string[] {
    return [...this.combatLog];
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
    // Unit vs unit
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
    // Siege vs wall
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
    // Separation (units only; walls are static colliders)
    this.applySeparation(dt);
    this.resolveWallCollisions();

    // Walls animate destroy transition
    for (const w of this.walls) w.update(dt);

    const unitSenses: WarSenseTarget[] = this.units.map((u) => u.toSense());
    const wallSenses: WarSenseTarget[] = this.walls
      .filter((w) => !w.dead)
      .map((w) => w.toSense());
    const allTargets = [...unitSenses, ...wallSenses];

    for (const u of this.units) {
      const hostiles = allTargets.filter((s) => s.id !== u.id);
      u.update(dt, hostiles, this.sampleGround, this.onAttack);
    }
  }

  /** Push units out of intact wall AABBs (simple physics collider) */
  private resolveWallCollisions(): void {
    for (const u of this.units) {
      if (u.dead) continue;
      const p = u.root.position;
      for (const w of this.walls) {
        if (w.dead || w.state === 'destroying') continue;
        if (!w.containsPoint(p, 0.35)) continue;
        // Push out toward nearest face
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
    for (const u of this.units) u.dispose();
    this.units = [];
    this.renderer.dispose();
    this.controls.dispose();
  }
}

export { MEDIEVAL_BATTLE_LOCAL_PATH, MEDIEVAL_BATTLE_CDN_PATH };
