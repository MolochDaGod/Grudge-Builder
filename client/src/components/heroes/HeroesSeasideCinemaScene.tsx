/**
 * HeroesSeasideCinemaScene — production `/heroes` cinema (2026-07 restore).
 *
 * Painted airship plate (`scene_airship.png` / HeroesBlackTideScene) is PURGED —
 * do not rewire airship underlays onto this page.
 *
 * Loads seaside_treasure_cave.glb + sector_islands.glb on deep ocean.
 * Sanitizes person / futuristic / global-water meshes; keeps barca as takeable.
 * Teaches rowing: raft → dinghy (barca) → fishing boat + island cast (no main ship).
 */
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import type { Character } from "@/lib/characterManager";
import type { AnimationController } from "@/lib/modelLoader";
import { getRacePortrait } from "@/lib/artAssets";
import { resolveModelUrl } from "@/lib/modelManifest";
import { getSharedGltfLoader } from "@/lib/three/SharedGltfPipeline";
import {
  SmallCraftRowSystem,
  CRAFT_TIERS,
  type CraftTier,
  type RowLessonStep,
} from "@/game/sailing/SmallCraftRowSystem";
import { loadCrewHero } from "./heroesCrewLoader";
import { sanitizeSeasideGltf } from "./sanitizeSeasideGltf";
import {
  CAPTURE_ZONE,
  HEROES_CINEMA_SECTOR_ID,
  SEASIDE_LOAD_ORDER,
  heroesCinemaLandmark,
  type SectorSeasideLandmark,
} from "@shared/definitions/sectorSeasideLandmarks";

export interface HeroesSeasideCinemaSceneProps {
  slots: (Character | null)[];
  selectedId: string | null;
  onSelectSlot: (index: number) => void;
  /** Override sector (default haven_shore) */
  sectorId?: string;
  className?: string;
}

interface SlotRuntime {
  index: number;
  heroId: string | null;
  root: THREE.Group | null;
  controller: AnimationController | null;
}

/** Load GLB — absolute CDN URLs as-is; same-origin paths stay same-origin (no CDN force). */
async function loadGlb(url: string): Promise<THREE.Group> {
  const loader = getSharedGltfLoader();
  const resolved =
    url.startsWith("http://") || url.startsWith("https://")
      ? url
      : url.startsWith("/sector-assets/")
        ? url
        : resolveModelUrl(url);
  const gltf = await new Promise<any>((resolve, reject) => {
    loader.load(resolved, resolve, undefined, reject);
  });
  const root = gltf.scene as THREE.Group;
  root.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  return root;
}

/** Fit GLB so max horizontal extent ≈ targetM, plant bottom near y=0 of group. */
function fitGrounded(root: THREE.Object3D, targetExtentM: number): number {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const size = new THREE.Vector3();
  box.getSize(size);
  const maxXZ = Math.max(size.x, size.z, 0.001);
  const s = targetExtentM / maxXZ;
  root.scale.setScalar(s);
  root.updateMatrixWorld(true);
  const box2 = new THREE.Box3().setFromObject(root);
  root.position.y -= box2.min.y;
  return s;
}

function makeOcean(waterY: number, color: number): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(800, 800, 64, 64);
  // gentle vertex ripple
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    pos.setZ(i, Math.sin(x * 0.04) * 0.35 + Math.cos(y * 0.035) * 0.28);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({
    color,
    metalness: 0.65,
    roughness: 0.28,
    transparent: true,
    opacity: 0.92,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = waterY;
  mesh.receiveShadow = true;
  mesh.name = "DeepOcean";
  return mesh;
}

function makeCaptureZoneMarker(): THREE.Group {
  const g = new THREE.Group();
  g.name = "CaptureZone";
  // Soft ring + disc only — no wireframe cylinder (debug volume was shipping live)
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(CAPTURE_ZONE.radiusM * 0.92, CAPTURE_ZONE.radiusM, 48),
    new THREE.MeshBasicMaterial({
      color: 0x22d3ee,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  ring.rotation.x = -Math.PI / 2;
  g.add(ring);
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(CAPTURE_ZONE.radiusM * 0.9, 32),
    new THREE.MeshBasicMaterial({
      color: 0x0891b2,
      transparent: true,
      opacity: 0.1,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  disc.rotation.x = -Math.PI / 2;
  disc.position.y = 0.05;
  g.add(disc);
  g.userData.capture = true;
  g.userData.captureZoneId = CAPTURE_ZONE.id;
  return g;
}

/** Raycast ground Y for feet plant (island / cave top). Returns null if open water. */
function sampleGroundY(
  raycaster: THREE.Raycaster,
  groundMeshes: THREE.Object3D[],
  x: number,
  z: number,
  highY: number,
): number | null {
  if (!groundMeshes.length) return null;
  raycaster.set(new THREE.Vector3(x, highY, z), new THREE.Vector3(0, -1, 0));
  raycaster.far = highY + 80;
  const hits = raycaster.intersectObjects(groundMeshes, true);
  for (const h of hits) {
    // Ignore capture rings / ocean / craft
    const n = (h.object.name || "").toLowerCase();
    if (/capture|ocean|craft|water|barca|raft|dinghy/.test(n)) continue;
    if (h.object.userData?.capture) continue;
    return h.point.y;
  }
  return null;
}

interface SeasideShark {
  root: THREE.Group;
  mixer: THREE.AnimationMixer | null;
  /** Swim depth below free surface (m, positive) — shallow so readable under water */
  depthM: number;
  /** Progress 0..1 along closed figure-8 path */
  u: number;
  /** Path speed (loops per second) */
  speed: number;
  yaw: number;
  /** Closed XZ waypoints (water-only figure-8 + outer sides) */
  path: THREE.Vector3[];
}

export default function HeroesSeasideCinemaScene({
  slots,
  selectedId,
  onSelectSlot,
  sectorId = HEROES_CINEMA_SECTOR_ID,
  className = "",
}: HeroesSeasideCinemaSceneProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const selectedIdRef = useRef(selectedId);
  selectedIdRef.current = selectedId;
  const [status, setStatus] = useState("Loading seaside sector cinema…");
  const [ready, setReady] = useState(false);
  const [prompt, setPrompt] = useState<string | null>(null);
  const [lessonStep, setLessonStep] = useState<RowLessonStep>("raft");
  const [lessonDetail, setLessonDetail] = useState(CRAFT_TIERS.raft.lesson);
  const [catchLog, setCatchLog] = useState<string[]>([]);
  const [boardedTier, setBoardedTier] = useState<CraftTier | null>(null);
  const [landmark] = useState<SectorSeasideLandmark>(() => heroesCinemaLandmark());
  const runRef = useRef<{
    dispose: () => void;
    setSelection: (id: string | null) => void;
    reloadHeroes: (slots: (Character | null)[]) => Promise<void>;
  } | null>(null);

  const slotsKey = slots
    .map((s) => (s ? `${s.id}:${s.level || 0}` : "empty"))
    .join("|");

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;
    let disposed = false;

    const w0 = Math.max(el.clientWidth, 4);
    const h0 = Math.max(el.clientHeight, 4);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(landmark.skyColor);
    scene.fog = new THREE.FogExp2(landmark.oceanColor, 0.0065);

    const camera = new THREE.PerspectiveCamera(42, w0 / h0, 0.2, 600);
    const camPos = new THREE.Vector3(28, 18, 42);
    const camLook = new THREE.Vector3(0, 2, 0);
    const camPosT = camPos.clone();
    const camLookT = camLook.clone();
    camera.position.copy(camPos);
    camera.lookAt(camLook);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: "high-performance",
        failIfMajorPerformanceCaveat: false,
      });
    } catch (e) {
      try {
        renderer = new THREE.WebGLRenderer({
          antialias: false,
          powerPreference: "default",
          failIfMajorPerformanceCaveat: false,
        });
      } catch (e2) {
        console.error("[seaside cinema] WebGL create failed", e2 || e);
        setStatus(
          "WebGL blocked — hard-refresh (Ctrl+Shift+R) or close other 3D tabs.",
        );
        return;
      }
    }
    renderer.setSize(w0, h0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.addEventListener(
      "webglcontextlost",
      (ev) => {
        ev.preventDefault();
        console.warn("[seaside cinema] WebGL context lost");
      },
      false,
    );
    el.innerHTML = "";
    el.appendChild(renderer.domElement);
    renderer.domElement.style.cssText = "width:100%;height:100%;display:block;";

    scene.add(new THREE.AmbientLight(0xb8d4f0, 0.45));
    scene.add(new THREE.HemisphereLight(0xc8e0ff, 0x1a3040, 0.55));
    const sun = new THREE.DirectionalLight(0xfff0d0, 1.35);
    sun.position.set(40, 60, 20);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 200;
    sun.shadow.camera.left = -80;
    sun.shadow.camera.right = 80;
    sun.shadow.camera.top = 80;
    sun.shadow.camera.bottom = -80;
    scene.add(sun);

    // Deep ocean aligned with sector waterLevel (deeper shelf)
    const ocean = makeOcean(landmark.waterLevel, landmark.oceanColor);
    scene.add(ocean);

    const worldRoot = new THREE.Group();
    worldRoot.name = "SeasideLandmarkRoot";
    scene.add(worldRoot);

    const crewRoot = new THREE.Group();
    scene.add(crewRoot);

    /** Meshes used for crew feet plant (cave + islands tops). */
    const groundMeshes: THREE.Object3D[] = [];
    /** Reef sharks pathfind under free surface only. */
    const sharks: SeasideShark[] = [];

    const slotRuntimes: SlotRuntime[] = [0, 1, 2, 3].map((index) => ({
      index,
      heroId: null,
      root: null,
      controller: null,
    }));

    // Crew stand XZ on cave / island shelf — Y resolved by ground raycast
    const crewOffsets: THREE.Vector3[] = [
      new THREE.Vector3(-3.5, 0, 6),
      new THREE.Vector3(-1.0, 0, 7),
      new THREE.Vector3(1.5, 0, 6.5),
      new THREE.Vector3(3.8, 0, 5.5),
    ];

    const clock = new THREE.Clock();
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const crafts: SmallCraftRowSystem[] = [];
    let activeCraft: SmallCraftRowSystem | null = null;
    const playerProxy = new THREE.Vector3(0, landmark.waterLevel + 1.5, 10);

    const onCraftPrompt = (msg: string | null) => {
      if (!disposed) setPrompt(msg);
    };
    const onCraftLesson = (step: RowLessonStep, detail: string) => {
      if (disposed) return;
      setLessonStep(step);
      setLessonDetail(detail);
    };
    const onFishCatch = (fishId: string) => {
      if (disposed) return;
      setCatchLog((prev) => [`🎣 ${fishId}`, ...prev].slice(0, 5));
    };

    function spawnCrafts(barcaHull: THREE.Object3D | null, islandCenter: THREE.Vector3) {
      // 1) Raft — shore lesson near cave (first oar technique)
      const craftOpts = {
        scene,
        waterLevel: landmark.waterLevel,
        autoAdvanceLesson: false as const,
        onPrompt: onCraftPrompt,
        onLesson: onCraftLesson,
        onFishCatch,
      };

      const raft = new SmallCraftRowSystem({
        ...craftOpts,
        tier: "raft",
      });
      raft.root.position.set(8, landmark.waterLevel + 0.15, 14);
      crafts.push(raft);

      // 2) Dinghy — scene barca (takeable) or procedural stand-in
      const dinghy = new SmallCraftRowSystem({
        ...craftOpts,
        hull: barcaHull,
        tier: "dinghy",
      });
      if (!barcaHull) {
        dinghy.root.position.set(18, landmark.waterLevel + 0.15, 20);
      }
      crafts.push(dinghy);

      // 3) Fishing boat — island shallows; oar + cast without main ship
      const fishing = new SmallCraftRowSystem({
        ...craftOpts,
        tier: "fishingBoat",
      });
      fishing.root.position.set(
        islandCenter.x - 12,
        landmark.waterLevel + 0.15,
        islandCenter.z + 8,
      );
      // Fish spots around islands (shallow cast rings — no warship required)
      const spots: THREE.Vector3[] = [];
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        spots.push(
          new THREE.Vector3(
            islandCenter.x + Math.cos(a) * 28,
            landmark.waterLevel,
            islandCenter.z + Math.sin(a) * 22,
          ),
        );
      }
      spots.push(new THREE.Vector3(12, landmark.waterLevel, 18)); // near cave shelf
      fishing.setFishSpots(spots);
      dinghy.setFishSpots(spots);
      raft.setFishSpots(spots);
      crafts.push(fishing);

      activeCraft = raft;
      setPrompt(
        `E board Raft · ${CRAFT_TIERS.raft.lesson} · then Dinghy (barca) → Fishing boat`,
      );
      setLessonStep("raft");
      setLessonDetail(CRAFT_TIERS.raft.lesson);
    }

    async function buildEnvironment() {
      setStatus("Loading seaside treasure cave…");
      let cave: THREE.Group | null = null;
      // Cave: same-origin first; islands: CDN first (large GLB not in Vercel bundle)
      for (const u of SEASIDE_LOAD_ORDER.cave) {
        try {
          cave = await loadGlb(u);
          break;
        } catch {
          /* try next */
        }
      }
      if (!cave) console.error("[seaside cinema] cave load failed");
      let extractedBoats: THREE.Object3D[] = [];
      if (cave && !disposed) {
        // Strip Man/Hat/Water; keep rock/palm architecture
        const caveSan = sanitizeSeasideGltf(cave);
        if (caveSan.removed.length) {
          console.info("[seaside cinema] cave stripped:", caveSan.removed.slice(0, 24));
        }
        extractedBoats.push(...caveSan.boats);
        fitGrounded(cave, 55);
        // Plant cave bottom on water shelf so walkable tops sit above free surface
        cave.position.set(0, landmark.waterLevel + 0.2, 0);
        worldRoot.add(cave);
        groundMeshes.push(cave);
      }

      setStatus("Loading sector islands…");
      let islands: THREE.Group | null = null;
      for (const u of SEASIDE_LOAD_ORDER.islands) {
        try {
          islands = await loadGlb(u);
          break;
        } catch {
          /* try next */
        }
      }
      if (!islands) console.warn("[seaside cinema] islands load failed — cave-only");
      const islandCenter = new THREE.Vector3(
        CAPTURE_ZONE.localOffset[0] + 48,
        landmark.waterLevel - 1.5,
        CAPTURE_ZONE.localOffset[2] + 22,
      );
      if (islands && !disposed) {
        // Strip dude/Acqua (global water); keep barca as takeable dinghy
        const islandSan = sanitizeSeasideGltf(islands);
        if (islandSan.removed.length) {
          console.info("[seaside cinema] islands stripped:", islandSan.removed.slice(0, 24));
        }
        extractedBoats.push(...islandSan.boats);
        fitGrounded(islands, 90);
        islands.position.copy(islandCenter);
        worldRoot.add(islands);
        groundMeshes.push(islands);
      }

      // Capture zone under cave (soft ring only — no wireframe volume)
      const capture = makeCaptureZoneMarker();
      capture.position.set(
        CAPTURE_ZONE.localOffset[0],
        landmark.waterLevel + CAPTURE_ZONE.localOffset[1],
        CAPTURE_ZONE.localOffset[2],
      );
      capture.userData.captureZoneId = landmark.captureZoneId;
      worldRoot.add(capture);

      // Takeable barca + raft / fishing-boat lesson chain
      if (!disposed) {
        setStatus("Spawning small craft (raft → barca → fishing)…");
        const barca = extractedBoats[0] ?? null;
        spawnCrafts(barca, islandCenter.clone().setY(landmark.waterLevel));
      }

      // Reef sharks — pathfind under water (never on land tops)
      if (!disposed) {
        await spawnUnderwaterSharks(islandCenter);
      }

      // Establish look at cave + islands + craft
      camLookT.set(12, landmark.waterLevel + 4, 10);
      camPosT.set(36, landmark.waterLevel + 16, 48);
    }

    /** True if XZ is open water (no dry land near free surface). */
    function isWaterColumn(x: number, z: number): boolean {
      const wl = landmark.waterLevel;
      const gy = sampleGroundY(raycaster, groundMeshes, x, z, wl + 80);
      // Open water: no hit, or seabed well below free surface
      if (gy === null || !Number.isFinite(gy)) return true;
      return gy < wl - 1.25;
    }

    /**
     * Push a land sample out to the nearest water column (radial from focus).
     * Keeps figure-8 lobes from tunneling under the island mesh.
     */
    function projectToWater(
      x: number,
      z: number,
      focus: THREE.Vector3,
      maxR = 55,
    ): THREE.Vector3 | null {
      if (isWaterColumn(x, z)) return new THREE.Vector3(x, 0, z);
      const dx = x - focus.x;
      const dz = z - focus.z;
      let dist = Math.hypot(dx, dz) || 1;
      let ux = dx / dist;
      let uz = dz / dist;
      // Walk outward then spin if needed
      for (let r = Math.max(dist, 2); r <= maxR; r += 1.5) {
        const px = focus.x + ux * r;
        const pz = focus.z + uz * r;
        if (isWaterColumn(px, pz)) return new THREE.Vector3(px, 0, pz);
      }
      for (let a = 0; a < 16; a++) {
        const ang = (a / 16) * Math.PI * 2;
        for (const r of [12, 20, 28, 38, 48]) {
          const px = focus.x + Math.cos(ang) * r;
          const pz = focus.z + Math.sin(ang) * r;
          if (isWaterColumn(px, pz)) return new THREE.Vector3(px, 0, pz);
        }
      }
      return null;
    }

    /**
     * Closed path: figure-8 through the middle water channel of the island
     * complex, then lobes that sweep outside each side (∞ / lemniscate + outer ring).
     */
    function buildSharkFigure8Path(
      caveOrigin: THREE.Vector3,
      islandCenter: THREE.Vector3,
      scale = 1,
    ): THREE.Vector3[] {
      worldRoot.updateMatrixWorld(true);
      // Focus = mid channel between cave shelf and sector islands
      const focus = new THREE.Vector3(
        (caveOrigin.x + islandCenter.x) * 0.5,
        0,
        (caveOrigin.z + islandCenter.z) * 0.5,
      );
      // Axis of the pair (along island offset)
      const axis = new THREE.Vector3(
        islandCenter.x - caveOrigin.x,
        0,
        islandCenter.z - caveOrigin.z,
      );
      if (axis.lengthSq() < 1) axis.set(1, 0, 0.4);
      axis.normalize();
      const side = new THREE.Vector3(-axis.z, 0, axis.x); // perpendicular

      // Lemniscate size: lobes reach outside each land mass
      const span = Math.hypot(islandCenter.x - caveOrigin.x, islandCenter.z - caveOrigin.z);
      const a = Math.max(22, Math.min(48, span * 0.55)) * scale;

      const raw: THREE.Vector3[] = [];
      const N = 72;
      // 1) Figure-8 (lemniscate of Bernoulli) in local axis/side frame
      for (let i = 0; i < N; i++) {
        const t = (i / N) * Math.PI * 2;
        const s = Math.sin(t);
        const c = Math.cos(t);
        const den = 1 + s * s;
        // Local: along-axis = long lobe, side = cross through middle
        const localAlong = (a * c) / den;
        const localSide = (a * s * c) / den;
        const wx = focus.x + axis.x * localAlong + side.x * localSide;
        const wz = focus.z + axis.z * localAlong + side.z * localSide;
        raw.push(new THREE.Vector3(wx, 0, wz));
      }
      // 2) Outer perimeter arcs around each "side" of the pair (port / starboard of axis)
      //    so path continues around the outside of each island after the ∞
      const outerR = a * 1.35;
      for (const sign of [-1, 1]) {
        for (let i = 0; i < 24; i++) {
          const t = (i / 24) * Math.PI * 2;
          // Ellipse elongated along axis, offset on side
          const ox =
            focus.x +
            axis.x * Math.cos(t) * outerR * 1.15 +
            side.x * (sign * outerR * 0.55 + Math.sin(t) * outerR * 0.25);
          const oz =
            focus.z +
            axis.z * Math.cos(t) * outerR * 1.15 +
            side.z * (sign * outerR * 0.55 + Math.sin(t) * outerR * 0.25);
          raw.push(new THREE.Vector3(ox, 0, oz));
        }
      }

      // Project every sample to water; drop failures
      const path: THREE.Vector3[] = [];
      for (const p of raw) {
        const w = projectToWater(p.x, p.z, focus, outerR + 30);
        if (w) path.push(w);
      }
      // Ensure closed loop
      if (path.length >= 3) {
        path.push(path[0]!.clone());
      }
      // Fallback: simple water ring around focus if projection failed
      if (path.length < 8) {
        path.length = 0;
        for (let i = 0; i <= 48; i++) {
          const t = (i / 48) * Math.PI * 2;
          const r = a * 1.1;
          const px = focus.x + Math.cos(t) * r;
          const pz = focus.z + Math.sin(t) * r;
          const w = projectToWater(px, pz, focus) ?? new THREE.Vector3(px, 0, pz);
          path.push(w);
        }
      }
      console.info(
        `[seaside cinema] shark figure-8 path pts=${path.length} focus=(${focus.x.toFixed(1)},${focus.z.toFixed(1)}) a=${a.toFixed(1)}`,
      );
      return path;
    }

    function samplePath(path: THREE.Vector3[], u: number, out: THREE.Vector3): THREE.Vector3 {
      if (!path.length) return out.set(0, 0, 0);
      const n = path.length - 1; // last == first if closed
      const segCount = Math.max(1, n);
      const t = ((u % 1) + 1) % 1;
      const f = t * segCount;
      const i0 = Math.floor(f) % segCount;
      const i1 = (i0 + 1) % segCount;
      const local = f - Math.floor(f);
      return out.copy(path[i0]!).lerp(path[i1]!, local);
    }

    /**
     * Spawn reef sharks on a figure-8 water path through the island middle
     * and around each outer side — never under the land mesh.
     */
    async function spawnUnderwaterSharks(islandCenter: THREE.Vector3) {
      const urls = [
        "https://assets.grudge-studio.com/models/creatures/predator/shark.glb",
        "/models/creatures/predator/shark.glb",
      ];
      let sharkSrc: THREE.Group | null = null;
      let sharkClips: THREE.AnimationClip[] = [];
      for (const u of urls) {
        try {
          const loader = getSharedGltfLoader();
          const gltf = await new Promise<any>((resolve, reject) => {
            loader.load(u, resolve, undefined, reject);
          });
          sharkSrc = gltf.scene as THREE.Group;
          sharkClips = gltf.animations?.slice() ?? [];
          break;
        } catch {
          /* next */
        }
      }

      const caveOrigin = new THREE.Vector3(0, 0, 0);
      // Primary ∞ through middle; second slightly larger outer figure-8
      const paths = [
        buildSharkFigure8Path(caveOrigin, islandCenter, 1.0),
        buildSharkFigure8Path(caveOrigin, islandCenter, 1.22),
      ];

      for (let i = 0; i < paths.length; i++) {
        const path = paths[i]!;
        if (path.length < 4) continue;
        const root = new THREE.Group();
        root.name = `seaside_shark_${i}`;
        root.userData.seasideShark = true;
        if (sharkSrc) {
          const body = sharkSrc.clone(true);
          body.updateMatrixWorld(true);
          const box = new THREE.Box3().setFromObject(body);
          const sz = box.getSize(new THREE.Vector3());
          const long = Math.max(sz.x, sz.y, sz.z, 0.001);
          // SI: reef shark ~3 m long — readable near surface
          body.scale.setScalar(3.0 / long);
          root.add(body);
        } else {
          const geo = new THREE.ConeGeometry(0.35, 2.8, 6);
          const mat = new THREE.MeshStandardMaterial({
            color: 0x4a6a7a,
            roughness: 0.55,
            metalness: 0.2,
          });
          const mesh = new THREE.Mesh(geo, mat);
          mesh.rotation.z = Math.PI / 2;
          root.add(mesh);
        }
        let mixer: THREE.AnimationMixer | null = null;
        if (sharkClips.length && root.children[0]) {
          mixer = new THREE.AnimationMixer(root.children[0]);
          const clip =
            sharkClips.find((c) => /swim/i.test(c.name) && !/bite|fast/i.test(c.name)) ??
            sharkClips[0]!;
          const action = mixer.clipAction(clip);
          action.setLoop(THREE.LoopRepeat, Infinity);
          action.play();
        }
        // Shallow under free surface so sharks are visible in water, not under island
        const depthM = 1.6 + i * 0.35;
        const sh: SeasideShark = {
          root,
          mixer,
          depthM,
          u: i * 0.37, // phase offset so they don't stack
          speed: 0.045 + i * 0.012, // loops / second along path
          yaw: 0,
          path,
        };
        const p0 = samplePath(path, sh.u, new THREE.Vector3());
        sh.root.position.set(p0.x, landmark.waterLevel - depthM, p0.z);
        scene.add(sh.root);
        sharks.push(sh);
      }
      console.info(
        `[seaside cinema] sharks figure-8: ${sharks.length} · surfaceY=${landmark.waterLevel.toFixed(1)} · not under island`,
      );
    }

    function tickSharks(dt: number) {
      const wl = landmark.waterLevel;
      const tmp = new THREE.Vector3();
      const next = new THREE.Vector3();
      for (const sh of sharks) {
        sh.mixer?.update(dt);
        if (!sh.path.length) continue;
        sh.u = (sh.u + sh.speed * dt) % 1;
        samplePath(sh.path, sh.u, tmp);
        // Look-ahead for yaw
        samplePath(sh.path, (sh.u + 0.012) % 1, next);
        const dx = next.x - tmp.x;
        const dz = next.z - tmp.z;
        if (dx * dx + dz * dz > 1e-8) {
          sh.yaw = Math.atan2(dx, dz);
        }
        // Always shallow under free surface — never park under land mesh
        const y = wl - sh.depthM;
        // Soft water re-check; if drifted over land, skip ahead along path
        if (!isWaterColumn(tmp.x, tmp.z)) {
          for (let k = 1; k <= 8; k++) {
            samplePath(sh.path, (sh.u + k * 0.02) % 1, tmp);
            if (isWaterColumn(tmp.x, tmp.z)) {
              sh.u = (sh.u + k * 0.02) % 1;
              break;
            }
          }
        }
        sh.root.position.set(tmp.x, y, tmp.z);
        sh.root.rotation.y = sh.yaw;
        sh.root.visible = true;
      }
    }

    async function reloadHeroes(next: (Character | null)[]) {
      if (disposed) return;
      // Ensure ground meshes have world matrices
      worldRoot.updateMatrixWorld(true);
      for (let i = 0; i < 4; i++) {
        const rt = slotRuntimes[i]!;
        const hero = next[i] ?? null;
        if (rt.root) {
          crewRoot.remove(rt.root);
          rt.controller?.dispose();
          rt.root = null;
          rt.controller = null;
        }
        rt.heroId = hero?.id ?? null;
        if (!hero) continue;
        try {
          setStatus(`Loading crew: ${hero.name}…`);
          const crew = await loadCrewHero(hero);
          if (disposed) {
            crew.controller?.dispose();
            return;
          }
          const g = new THREE.Group();
          g.add(crew.root);
          const off = crewOffsets[i]!;
          let px = off.x;
          let pz = off.z + 2;
          // Plant feet on island / cave TOP via downward ray — not waterLevel float
          let groundY = sampleGroundY(
            raycaster,
            groundMeshes,
            px,
            pz,
            landmark.waterLevel + 80,
          );
          if (groundY === null || groundY < landmark.waterLevel - 0.25) {
            // Search ring for dry top near preferred slot
            outer: for (const r of [2, 4, 6, 9, 12]) {
              for (let a = 0; a < 8; a++) {
                const tx = off.x + Math.cos((a / 8) * Math.PI * 2) * r;
                const tz = off.z + 2 + Math.sin((a / 8) * Math.PI * 2) * r;
                const gy = sampleGroundY(
                  raycaster,
                  groundMeshes,
                  tx,
                  tz,
                  landmark.waterLevel + 80,
                );
                if (gy !== null && gy >= landmark.waterLevel - 0.1) {
                  groundY = gy;
                  px = tx;
                  pz = tz;
                  break outer;
                }
              }
            }
          }
          if (groundY === null) {
            // Cave shelf fallback above free surface (never sit on water plane)
            groundY =
              sampleGroundY(raycaster, groundMeshes, 0, 4, landmark.waterLevel + 80) ??
              landmark.waterLevel + 2.5;
          }
          g.position.set(px, Math.max(groundY, landmark.waterLevel + 0.8), pz);
          g.rotation.y = Math.PI * 0.15 * (i - 1.5);
          g.userData.slotIndex = i;
          g.userData.heroId = hero.id;
          crewRoot.add(g);
          rt.root = g;
          rt.controller = crew.controller;
        } catch (e) {
          console.error("[seaside cinema] crew slot", i, e);
        }
      }
      if (!disposed) {
        setStatus("");
        setReady(true);
        setSelection(selectedIdRef.current);
      }
    }

    function setSelection(id: string | null) {
      for (const rt of slotRuntimes) {
        if (!rt.root) continue;
        const sel = !!(id && rt.heroId === id);
        rt.root.scale.setScalar(sel ? 1.08 : 1);
        if (sel) {
          const p = rt.root.position;
          camPosT.set(p.x + 6, p.y + 3.2, p.z + 8);
          camLookT.set(p.x, p.y + 1.4, p.z);
          // Face camera
          const dx = camera.position.x - p.x;
          const dz = camera.position.z - p.z;
          rt.root.rotation.y = Math.atan2(dx, dz);
        }
      }
      if (!id) {
        camPosT.set(36, landmark.waterLevel + 16, 48);
        camLookT.set(12, landmark.waterLevel + 4, 10);
      }
    }

    const onClick = (ev: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const objs: THREE.Object3D[] = [];
      slotRuntimes.forEach((rt) => {
        if (rt.root) objs.push(rt.root);
      });
      const hits = raycaster.intersectObjects(objs, true);
      if (!hits.length) return;
      let o: THREE.Object3D | null = hits[0]!.object;
      while (o) {
        if (typeof o.userData.slotIndex === "number") {
          onSelectSlot(o.userData.slotIndex);
          return;
        }
        o = o.parent;
      }
    };
    renderer.domElement.addEventListener("click", onClick);

    const onKeyDown = (ev: KeyboardEvent) => {
      if (ev.repeat) return;
      // E — board / leave nearest (or active) small craft
      if (ev.key === "e" || ev.key === "E") {
        // Prefer leave if already boarded
        const boarded = crafts.find((c) => c.isBoarded);
        if (boarded) {
          boarded.tryToggleBoard(playerProxy, 99);
          activeCraft = boarded;
          setBoardedTier(null);
          // Free cam back to establish if no hero selected
          if (!selectedIdRef.current) {
            camPosT.set(36, landmark.waterLevel + 16, 48);
            camLookT.set(12, landmark.waterLevel + 4, 10);
          }
          return;
        }
        // Board nearest craft within range
        let best: SmallCraftRowSystem | null = null;
        let bestD = 6.5;
        for (const c of crafts) {
          const d = playerProxy.distanceTo(c.position);
          if (d < bestD) {
            bestD = d;
            best = c;
          }
        }
        // If player far (cinema mode), use camera look proximity fallback
        if (!best) {
          for (const c of crafts) {
            const d = camLook.distanceTo(c.position);
            if (d < 28 && (!best || d < bestD)) {
              bestD = d;
              best = c;
            }
          }
        }
        if (best) {
          // Use craft position as stand-in for cinema player
          playerProxy.copy(best.position);
          playerProxy.y += 0.9;
          best.tryToggleBoard(playerProxy, 99);
          activeCraft = best;
          const tier = (best.root.userData.craftTier as CraftTier) || "raft";
          setBoardedTier(tier);
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);

    const onResize = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w < 2 || h < 2) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    let raf = 0;
    const tick = () => {
      if (disposed) return;
      const dt = Math.min(clock.getDelta(), 0.05);
      const t = clock.elapsedTime;

      // Ocean slow undulation
      ocean.position.y = landmark.waterLevel + Math.sin(t * 0.4) * 0.15;

      // Sharks pathfind under free surface
      tickSharks(dt);

      // Small craft oar physics + animation
      for (const c of crafts) {
        const st = c.update(dt, c.isBoarded ? playerProxy : null);
        if (st.boarded) {
          activeCraft = c;
          // Follow boat while rowing
          const yaw = st.yaw;
          const back = new THREE.Vector3(
            -Math.sin(yaw) * 9,
            5.5,
            -Math.cos(yaw) * 9,
          );
          camPosT.set(
            st.craftPos.x + back.x,
            st.craftPos.y + back.y,
            st.craftPos.z + back.z,
          );
          camLookT.set(st.craftPos.x, st.craftPos.y + 1.2, st.craftPos.z);
          // Walk selected crew onto craft visual
          const sel = slotRuntimes.find(
            (rt) => rt.heroId && rt.heroId === selectedIdRef.current && rt.root,
          );
          if (sel?.root) {
            sel.root.position.lerp(
              new THREE.Vector3(st.craftPos.x, st.craftPos.y + 0.55, st.craftPos.z),
              1 - Math.exp(-8 * dt),
            );
            sel.root.rotation.y = yaw;
          }
        }
      }

      camPos.lerp(camPosT, 1 - Math.exp(-2.2 * dt));
      camLook.lerp(camLookT, 1 - Math.exp(-2.2 * dt));
      // Subtle establish drift when not focused / not rowing
      const establish = new THREE.Vector3(36, landmark.waterLevel + 16, 48);
      const anyBoarded = crafts.some((c) => c.isBoarded);
      if (!anyBoarded && camPosT.distanceToSquared(establish) < 4) {
        camera.position.set(
          camPos.x + Math.sin(t * 0.07) * 1.2,
          camPos.y + Math.sin(t * 0.09) * 0.35,
          camPos.z,
        );
      } else {
        camera.position.copy(camPos);
      }
      camera.lookAt(camLook);

      slotRuntimes.forEach((rt) => rt.controller?.update(dt));
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };

    void (async () => {
      await buildEnvironment();
      if (disposed) return;
      await reloadHeroes(slots);
      if (!disposed) raf = requestAnimationFrame(tick);
    })();

    runRef.current = {
      dispose: () => {
        disposed = true;
        cancelAnimationFrame(raf);
        renderer.domElement.removeEventListener("click", onClick);
        window.removeEventListener("keydown", onKeyDown);
        window.removeEventListener("resize", onResize);
        crafts.forEach((c) => c.dispose());
        crafts.length = 0;
        for (const sh of sharks) {
          sh.mixer?.stopAllAction();
          scene.remove(sh.root);
        }
        sharks.length = 0;
        slotRuntimes.forEach((rt) => rt.controller?.dispose());
        // Release GPU context so Chrome does not block this origin after OOM
        try {
          renderer.forceContextLoss();
        } catch {
          /* ignore */
        }
        try {
          renderer.dispose();
        } catch {
          /* ignore */
        }
        if (renderer.domElement.parentNode) {
          renderer.domElement.parentNode.removeChild(renderer.domElement);
        }
      },
      setSelection,
      reloadHeroes,
    };

    return () => {
      runRef.current?.dispose();
      runRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectorId]);

  useEffect(() => {
    runRef.current?.setSelection(selectedId);
  }, [selectedId]);

  useEffect(() => {
    void runRef.current?.reloadHeroes(slots);
  }, [slotsKey]);

  return (
    <div className={`relative w-full h-full min-h-[420px] overflow-hidden bg-slate-950 ${className}`}>
      {/* Full-bleed Three.js — no 2D plate */}
      <div ref={mountRef} className="absolute inset-0 z-0" />

      <div className="absolute top-2 left-0 right-0 z-10 flex flex-col items-center gap-1.5 pointer-events-none">
        <div
          className="font-cinzel text-sm sm:text-lg tracking-wide text-cyan-100"
          style={{ textShadow: "0 2px 12px rgba(0,0,0,0.95)" }}
        >
          {landmark.sectorName} — Seaside Treasure Cave
        </div>
        <p className="text-[9px] uppercase tracking-[0.2em] text-cyan-200/70 font-cinzel">
          Full Three.js · deep ocean · takeable barca · oar lesson raft→dinghy→fish
        </p>
        <div className="flex gap-2 sm:gap-3 pointer-events-auto px-2 mt-1">
          {[0, 1, 2, 3].map((i) => {
            const hero = slots[i];
            const sel = !!(hero && hero.id === selectedId);
            const img = hero?.avatarUrl || (hero ? getRacePortrait(hero.raceId) : null);
            return (
              <button
                key={i}
                type="button"
                title={hero ? `${hero.name} · Lv ${hero.level}` : `Empty slot ${i + 1}`}
                onClick={() => onSelectSlot(i)}
                className={`relative w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 overflow-hidden transition shadow-lg ${
                  sel
                    ? "border-emerald-400 scale-110 shadow-emerald-500/40"
                    : hero
                      ? "border-cyan-400/60 hover:border-cyan-200"
                      : "border-slate-600/50 opacity-60"
                }`}
                style={{ background: "rgba(4,12,24,0.9)" }}
              >
                {img ? (
                  <img src={img} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="flex items-center justify-center w-full h-full text-[9px] font-cinzel text-slate-400">
                    {i + 1}
                  </span>
                )}
                {hero && (
                  <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 text-[8px] font-bold bg-black/75 px-1 rounded text-cyan-100">
                    {hero.level}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Capture zone HUD */}
      <div
        className="absolute bottom-3 left-3 z-10 max-w-xs pointer-events-none rounded-md border border-cyan-400/35 px-3 py-2 backdrop-blur-sm"
        style={{ background: "linear-gradient(180deg, rgba(6,24,40,0.88), rgba(4,12,20,0.92))" }}
      >
        <div className="font-cinzel text-[10px] uppercase tracking-[0.2em] text-cyan-300/80">
          Conquerable zone
        </div>
        <div className="text-sm text-cyan-50 font-cinzel mt-0.5">{CAPTURE_ZONE.label}</div>
        <div className="text-[10px] text-slate-400 mt-0.5">
          Sector <span className="text-cyan-200/90">{landmark.sectorId}</span> · capture under cave · water Y{" "}
          {landmark.waterLevel.toFixed(1)}m (deep shelf)
        </div>
      </div>

      {/* Row lesson + oar technique HUD */}
      <div
        className="absolute bottom-3 right-3 z-10 max-w-sm pointer-events-none rounded-md border border-amber-400/40 px-3 py-2 backdrop-blur-sm"
        style={{ background: "linear-gradient(180deg, rgba(28,18,6,0.9), rgba(12,8,4,0.94))" }}
      >
        <div className="font-cinzel text-[10px] uppercase tracking-[0.2em] text-amber-300/85">
          Row technique · no main ship
        </div>
        <div className="flex gap-1.5 mt-1.5 flex-wrap">
          {(["raft", "dinghy", "fishingBoat"] as CraftTier[]).map((t) => {
            const active = lessonStep === t || boardedTier === t;
            const done =
              lessonStep === "complete" ||
              (t === "raft" && (lessonStep === "dinghy" || lessonStep === "fishingBoat" || lessonStep === "complete")) ||
              (t === "dinghy" && (lessonStep === "fishingBoat" || lessonStep === "complete"));
            return (
              <span
                key={t}
                className={`text-[9px] px-1.5 py-0.5 rounded border font-cinzel ${
                  active
                    ? "border-amber-300 bg-amber-500/25 text-amber-50"
                    : done
                      ? "border-emerald-500/50 bg-emerald-900/30 text-emerald-200/90"
                      : "border-slate-600/50 text-slate-400"
                }`}
              >
                {CRAFT_TIERS[t].label}
              </span>
            );
          })}
        </div>
        <p className="text-[11px] text-amber-50/95 mt-1.5 leading-snug">{lessonDetail}</p>
        {prompt && (
          <p className="text-[10px] text-cyan-100/90 mt-1 border-t border-amber-500/20 pt-1">
            {prompt}
          </p>
        )}
        <p className="text-[9px] text-slate-400 mt-1">
          E board/leave · WASD stroke &amp; turn · Space rest feather · F cast (fishing boat near islands)
        </p>
        {catchLog.length > 0 && (
          <ul className="mt-1 space-y-0.5">
            {catchLog.map((c, i) => (
              <li key={`${c}-${i}`} className="text-[10px] text-emerald-200/90">
                {c}
              </li>
            ))}
          </ul>
        )}
      </div>

      {boardedTier && (
        <div className="absolute top-1/2 left-3 -translate-y-1/2 z-10 pointer-events-none">
          <div
            className="rounded border border-amber-400/50 px-2 py-1.5 text-[10px] font-cinzel text-amber-100"
            style={{ background: "rgba(20,12,4,0.85)" }}
          >
            <div className="uppercase tracking-widest text-amber-300/80 text-[8px]">Oar cycle</div>
            <div className="mt-0.5">Push W · feather Space · sweep A/D</div>
            <div className="text-amber-200/70 mt-0.5">{CRAFT_TIERS[boardedTier].label}</div>
          </div>
        </div>
      )}

      {!ready && (
        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
          <div className="px-4 py-2 rounded-md bg-black/70 border border-cyan-500/40 text-cyan-100 text-sm font-cinzel tracking-wider">
            {status}
          </div>
        </div>
      )}
    </div>
  );
}
