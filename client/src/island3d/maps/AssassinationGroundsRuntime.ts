/**
 * AssassinationGroundsRuntime — load map GLB, deploy systems, full navmesh, Danger portals.
 */
import * as THREE from 'three';
import { loadGltfCached, cloneGltfScene } from '@/lib/three/SharedGltfPipeline';
import { MeshSceneNavMesh } from '../navigation/MeshSceneNavMesh';
import {
  ASSASSINATION_GROUNDS_GLB,
  ASSASSINATION_NAV,
  ASSASSINATION_SYSTEM_MARKERS,
  DANGER_ROOM_URL,
  type AssassinationSystemMarker,
} from '@shared/definitions/assassinationGroundsMap';
import {
  ULTIMATE_SKYDOME_PACK,
  getSkydomeVariant,
} from '@shared/definitions/skydomeCatalog';

export type PortalPromptState = {
  open: boolean;
  portalId: string;
  label: string;
} | null;

export type AssassinationRuntimeCallbacks = {
  onStatus?: (msg: string) => void;
  onReady?: (summary: {
    targets: number;
    portals: number;
    nav: ReturnType<MeshSceneNavMesh['getBakeSummary']>;
  }) => void;
  onPortalPrompt?: (state: PortalPromptState) => void;
  onTargetHit?: (id: string, label: string) => void;
};

type DeployedSystem = {
  marker: AssassinationSystemMarker;
  object: THREE.Object3D;
  worldPos: THREE.Vector3;
  highlight?: THREE.Object3D;
};

export class AssassinationGroundsRuntime {
  private renderer: THREE.WebGLRenderer | null = null;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(60, 1, 0.1, 2000);
  private clock = new THREE.Clock();
  private mapRoot = new THREE.Group();
  private player = new THREE.Group();
  private nav: MeshSceneNavMesh | null = null;
  private systems: DeployedSystem[] = [];
  private keys = new Set<string>();
  private yaw = 0;
  private pitch = 0.15;
  private pointerLocked = false;
  private raf = 0;
  private disposed = false;
  private activePortalId: string | null = null;
  private portalCooldownUntil = 0;
  private velocityY = 0;
  private readonly gravity = -18;
  private callbacks: AssassinationRuntimeCallbacks;

  constructor(
    private host: HTMLElement,
    callbacks: AssassinationRuntimeCallbacks = {},
  ) {
    this.callbacks = callbacks;
    this.scene.background = new THREE.Color(0x0a0c12);
    this.scene.fog = new THREE.FogExp2(0x0a0c12, 0.012);
    this.mapRoot.name = 'assassination_grounds_map';
    this.scene.add(this.mapRoot);

    const hemi = new THREE.HemisphereLight(0xb8c8e8, 0x1a1210, 0.65);
    const sun = new THREE.DirectionalLight(0xffe6c8, 1.1);
    sun.position.set(40, 60, 20);
    sun.castShadow = true;
    this.scene.add(hemi, sun);

    this.player.name = 'player';
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(ASSASSINATION_NAV.playerRadiusM, ASSASSINATION_NAV.playerHeightM * 0.55, 4, 8),
      new THREE.MeshStandardMaterial({ color: 0x4a90d9, roughness: 0.6 }),
    );
    body.position.y = ASSASSINATION_NAV.playerHeightM * 0.5;
    body.castShadow = true;
    this.player.add(body);
    this.scene.add(this.player);

    void this.boot();
  }

  private async boot(): Promise<void> {
    this.callbacks.onStatus?.('Init renderer…');
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(this.host.clientWidth, this.host.clientHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.host.appendChild(this.renderer.domElement);

    this.bindInput();
    window.addEventListener('resize', this.onResize);

    await this.loadMap();
    if (this.disposed) return;
    await this.loadSkydomeOptional();
    if (this.disposed) return;

    this.deploySystems();
    this.callbacks.onStatus?.('Baking navmesh…');
    this.nav = new MeshSceneNavMesh(this.mapRoot, {
      zoneId: ASSASSINATION_NAV.zoneId,
      cellSizeM: ASSASSINATION_NAV.cellSizeM,
    });

    const center = this.nav.getBounds().getCenter(new THREE.Vector3());
    const spawn = this.nav.findSpawnNear(center);
    this.player.position.copy(spawn);
    this.player.position.y = spawn.y;

    const targets = this.systems.filter((s) => s.marker.kind === 'target').length;
    const portals = this.systems.filter((s) => s.marker.dangerPortal).length;
    this.callbacks.onReady?.({
      targets,
      portals,
      nav: this.nav.getBakeSummary(),
    });
    this.callbacks.onStatus?.(
      `Ready · targets ${targets} · portals ${portals} · nav ${this.nav.getBakeSummary()?.walkableCells ?? 0} cells`,
    );

    this.clock.start();
    this.loop();
  }

  private async loadMap(): Promise<void> {
    this.callbacks.onStatus?.('Loading Assassination Grounds GLB…');
    let lastErr: unknown;
    for (const url of ASSASSINATION_GROUNDS_GLB.glbUrls) {
      try {
        const gltf = await loadGltfCached(url, 'critical');
        const root = cloneGltfScene(gltf);
        root.name = 'ultimate_assassination_grounds';
        this.fitMapToSI(root);
        root.traverse((o) => {
          const m = o as THREE.Mesh;
          if (m.isMesh) {
            m.castShadow = true;
            m.receiveShadow = true;
            if (m.material) {
              const mats = Array.isArray(m.material) ? m.material : [m.material];
              for (const mat of mats) {
                const std = mat as THREE.MeshStandardMaterial;
                if (std.map) std.map.colorSpace = THREE.SRGBColorSpace;
                std.needsUpdate = true;
              }
            }
          }
        });
        this.mapRoot.add(root);
        this.callbacks.onStatus?.(`Map loaded · ${url.split('/').pop()}`);
        return;
      } catch (e) {
        lastErr = e;
        console.warn('[AssassinationGrounds] map url failed', url, e);
      }
    }
    throw lastErr ?? new Error('Failed to load assassination grounds GLB');
  }

  /** Classic cm-scale FBX → SI metres if span is absurd. */
  private fitMapToSI(root: THREE.Object3D): void {
    root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(root);
    const size = box.getSize(new THREE.Vector3());
    const span = Math.max(size.x, size.y, size.z);
    if (span > 250) {
      const s = 100 / span; // target ~100 m playable span
      root.scale.multiplyScalar(s);
      root.updateMatrixWorld(true);
      console.info(`[AssassinationGrounds] SI fit scale*=${s.toFixed(5)} (raw span ${span.toFixed(1)})`);
    }
    // Ground so min Y = 0
    const box2 = new THREE.Box3().setFromObject(root);
    root.position.y -= box2.min.y;
  }

  private async loadSkydomeOptional(): Promise<void> {
    const variant = getSkydomeVariant(ASSASSINATION_GROUNDS_GLB.skydomeId);
    try {
      for (const url of ULTIMATE_SKYDOME_PACK.glbUrls) {
        try {
          const gltf = await loadGltfCached(url, 'low');
          const sky = cloneGltfScene(gltf);
          sky.name = 'ultimate_skydome_pack';
          // Show only matching variant if possible
          if (variant) {
            sky.traverse((o) => {
              const n = o.name || '';
              if (/doom_2016_skydome_ARM/i.test(n)) {
                const match =
                  typeof variant.nodeMatch === 'string'
                    ? n.includes(variant.nodeMatch)
                    : variant.nodeMatch.test(n);
                o.visible = match;
              }
            });
          }
          const radius = variant?.defaultRadiusM ?? 400;
          sky.scale.setScalar(radius / 50);
          sky.position.set(0, 0, 0);
          sky.traverse((o) => {
            const m = o as THREE.Mesh;
            if (m.isMesh && m.material) {
              const mats = Array.isArray(m.material) ? m.material : [m.material];
              for (const mat of mats) {
                const anyMat = mat as THREE.MeshBasicMaterial;
                anyMat.side = THREE.BackSide;
                anyMat.depthWrite = false;
              }
              m.frustumCulled = false;
            }
          });
          this.scene.add(sky);
          this.callbacks.onStatus?.(`Skydome · ${variant?.label ?? 'pack'}`);
          return;
        } catch {
          /* try next url */
        }
      }
    } catch (e) {
      console.warn('[AssassinationGrounds] skydome optional fail', e);
    }
  }

  private deploySystems(): void {
    const byName = new Map<string, THREE.Object3D>();
    this.mapRoot.traverse((o) => {
      if (o.name) byName.set(o.name, o);
    });

    for (const marker of ASSASSINATION_SYSTEM_MARKERS) {
      let obj = byName.get(marker.nodeName);
      if (!obj) {
        // prefix / startsWith fallback
        for (const [name, o] of byName) {
          if (name === marker.nodeName || name.startsWith(marker.nodeName)) {
            obj = o;
            break;
          }
        }
      }
      if (!obj) {
        console.warn('[AssassinationGrounds] missing marker', marker.nodeName);
        continue;
      }

      const worldPos = new THREE.Vector3();
      obj.getWorldPosition(worldPos);

      let highlight: THREE.Object3D | undefined;
      if (marker.kind === 'target') {
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(0.45, 0.04, 8, 24),
          new THREE.MeshBasicMaterial({ color: 0xff3344, transparent: true, opacity: 0.85 }),
        );
        ring.rotation.x = Math.PI / 2;
        ring.position.copy(worldPos);
        ring.position.y += 1.2;
        ring.name = `sys_hl_${marker.id}`;
        this.scene.add(ring);
        highlight = ring;
        // Tag object for click hits
        obj.userData.assassinationTargetId = marker.id;
        obj.userData.assassinationLabel = marker.label;
        obj.traverse((c) => {
          c.userData.assassinationTargetId = marker.id;
          c.userData.assassinationLabel = marker.label;
        });
      } else if (marker.dangerPortal) {
        const isExit = marker.kind === 'exit';
        const color = isExit ? 0xffaa33 : 0x44aaff;
        const pillar = new THREE.Mesh(
          new THREE.CylinderGeometry(0.35, 0.45, 2.4, 12, 1, true),
          new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity: 0.35,
            side: THREE.DoubleSide,
            depthWrite: false,
          }),
        );
        pillar.position.copy(worldPos);
        pillar.position.y += 1.2;
        pillar.name = `sys_portal_${marker.id}`;
        this.scene.add(pillar);
        highlight = pillar;
      }

      this.systems.push({ marker, object: obj, worldPos, highlight });
    }

    console.info(
      `[AssassinationGrounds] deployed systems=${this.systems.length} ` +
        `(targets=${this.systems.filter((s) => s.marker.kind === 'target').length} ` +
        `portals=${this.systems.filter((s) => s.marker.dangerPortal).length})`,
    );
  }

  private bindInput(): void {
    const el = this.renderer?.domElement;
    if (!el) return;

    const onKeyDown = (e: KeyboardEvent) => {
      this.keys.add(e.code);
      if (e.code === 'KeyE' && this.activePortalId) {
        // re-open prompt if still in portal
        const portal = this.systems.find((s) => s.marker.id === this.activePortalId);
        if (portal?.marker.dangerPortal) {
          this.callbacks.onPortalPrompt?.({
            open: true,
            portalId: portal.marker.id,
            label: portal.marker.label,
          });
        }
      }
    };
    const onKeyUp = (e: KeyboardEvent) => this.keys.delete(e.code);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    (this as unknown as { _onKeyDown: typeof onKeyDown })._onKeyDown = onKeyDown;
    (this as unknown as { _onKeyUp: typeof onKeyUp })._onKeyUp = onKeyUp;

    el.addEventListener('click', () => {
      el.requestPointerLock?.();
      this.tryClickTarget();
    });
    document.addEventListener('pointerlockchange', this.onPointerLock);
    document.addEventListener('mousemove', this.onMouseMove);
  }

  private onPointerLock = (): void => {
    this.pointerLocked = document.pointerLockElement === this.renderer?.domElement;
  };

  private onMouseMove = (e: MouseEvent): void => {
    if (!this.pointerLocked) return;
    this.yaw -= e.movementX * 0.0022;
    this.pitch = Math.max(-1.2, Math.min(1.2, this.pitch - e.movementY * 0.0022));
  };

  private tryClickTarget(): void {
    if (!this.renderer) return;
    const ndc = new THREE.Vector2(0, 0); // center reticle when pointer locked
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, this.camera);
    const hits = ray.intersectObjects(this.mapRoot.children, true);
    for (const h of hits) {
      const id = h.object.userData.assassinationTargetId as string | undefined;
      if (id) {
        this.callbacks.onTargetHit?.(id, h.object.userData.assassinationLabel ?? id);
        // Flash highlight
        const sys = this.systems.find((s) => s.marker.id === id);
        if (sys?.highlight) {
          const mat = (sys.highlight as THREE.Mesh).material as THREE.MeshBasicMaterial;
          if (mat?.color) {
            mat.color.setHex(0xffff66);
            setTimeout(() => mat.color.setHex(0xff3344), 200);
          }
        }
        break;
      }
    }
  }

  private onResize = (): void => {
    if (!this.renderer) return;
    const w = this.host.clientWidth;
    const h = this.host.clientHeight;
    this.camera.aspect = w / Math.max(1, h);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  private loop = (): void => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.loop);
    const dt = Math.min(0.05, this.clock.getDelta());
    this.tickPlayer(dt);
    this.tickPortals();
    this.tickCamera();
    // pulse portal highlights
    const t = this.clock.elapsedTime;
    for (const s of this.systems) {
      if (s.highlight && s.marker.dangerPortal) {
        s.highlight.rotation.y = t * 0.6;
        const mat = (s.highlight as THREE.Mesh).material as THREE.MeshBasicMaterial;
        if (mat) mat.opacity = 0.25 + 0.2 * Math.sin(t * 3);
      }
    }
    this.renderer?.render(this.scene, this.camera);
  };

  private tickPlayer(dt: number): void {
    const run = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
    const speed =
      (run ? ASSASSINATION_NAV.runSpeedMps : ASSASSINATION_NAV.walkSpeedMps) * dt;
    let mx = 0;
    let mz = 0;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) mz -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) mz += 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) mx -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) mx += 1;
    if (mx || mz) {
      const len = Math.hypot(mx, mz) || 1;
      mx /= len;
      mz /= len;
      const sin = Math.sin(this.yaw);
      const cos = Math.cos(this.yaw);
      const dx = mx * cos + mz * sin;
      const dz = -mx * sin + mz * cos;
      this.player.position.x += dx * speed;
      this.player.position.z += dz * speed;
    }

    // Ground stick via nav height
    const hy = this.nav?.getHeightAt(this.player.position.x, this.player.position.z);
    if (hy != null) {
      const feet = hy;
      if (this.player.position.y > feet + 0.08) {
        this.velocityY += this.gravity * dt;
        this.player.position.y += this.velocityY * dt;
        if (this.player.position.y < feet) {
          this.player.position.y = feet;
          this.velocityY = 0;
        }
      } else {
        this.player.position.y = feet;
        this.velocityY = 0;
      }
    }
  }

  private tickPortals(): void {
    const now = performance.now();
    if (now < this.portalCooldownUntil) return;

    let inside: DeployedSystem | null = null;
    for (const s of this.systems) {
      if (!s.marker.dangerPortal) continue;
      const r = s.marker.triggerRadiusM ?? 2.4;
      const dx = this.player.position.x - s.worldPos.x;
      const dz = this.player.position.z - s.worldPos.z;
      if (dx * dx + dz * dz <= r * r) {
        inside = s;
        break;
      }
    }

    if (inside) {
      if (this.activePortalId !== inside.marker.id) {
        this.activePortalId = inside.marker.id;
        this.callbacks.onPortalPrompt?.({
          open: true,
          portalId: inside.marker.id,
          label: inside.marker.label,
        });
      }
    } else if (this.activePortalId) {
      // Left the volume — clear latch so re-entry can re-prompt after cooldown
      this.activePortalId = null;
    }
  }

  private tickCamera(): void {
    const eye = ASSASSINATION_NAV.playerHeightM * 0.92;
    const dist = 4.2;
    const camX = this.player.position.x + Math.sin(this.yaw) * dist * Math.cos(this.pitch);
    const camY = this.player.position.y + eye + Math.sin(this.pitch) * dist;
    const camZ = this.player.position.z + Math.cos(this.yaw) * dist * Math.cos(this.pitch);
    this.camera.position.set(camX, camY, camZ);
    this.camera.lookAt(
      this.player.position.x,
      this.player.position.y + eye * 0.85,
      this.player.position.z,
    );
  }

  /** UI: Yes → Danger Room */
  confirmReturnToDangerRoom(): void {
    const url = DANGER_ROOM_URL;
    window.location.href = url;
  }

  /** UI: No → dismiss prompt, brief cooldown so we can walk away */
  dismissPortalPrompt(): void {
    this.callbacks.onPortalPrompt?.(null);
    this.portalCooldownUntil = performance.now() + 2500;
    // Keep activePortalId so we don't re-fire until leave + re-enter
  }

  /** Allow re-trigger after leaving volume */
  clearPortalLatch(): void {
    this.activePortalId = null;
  }

  findPath(to: THREE.Vector3) {
    if (!this.nav) return null;
    return this.nav.findPath(this.player.position.clone(), to);
  }

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this.onResize);
    document.removeEventListener('pointerlockchange', this.onPointerLock);
    document.removeEventListener('mousemove', this.onMouseMove);
    const kd = (this as unknown as { _onKeyDown?: (e: KeyboardEvent) => void })._onKeyDown;
    const ku = (this as unknown as { _onKeyUp?: (e: KeyboardEvent) => void })._onKeyUp;
    if (kd) window.removeEventListener('keydown', kd);
    if (ku) window.removeEventListener('keyup', ku);
    if (document.pointerLockElement) document.exitPointerLock();
    this.nav?.dispose();
    this.renderer?.dispose();
    if (this.renderer?.domElement.parentElement === this.host) {
      this.host.removeChild(this.renderer.domElement);
    }
    this.renderer = null;
  }
}
