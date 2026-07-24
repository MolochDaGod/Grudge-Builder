/**
 * HeroesSeasideCinemaScene — full Three.js cinematic sector shelf.
 *
 * Replaces 2D airship plate: loads seaside_treasure_cave.glb + sector_islands.glb
 * near each other on deep ocean aligned with world-map sector waterLevel.
 * Capture zone under the cave is conquerable (visual + raycast volume).
 *
 * Crew (player explorer/voxel selections) stand on the cave shelf and can be
 * selected via avatar strip / click (same handoff as before).
 */
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import type { Character } from "@/lib/characterManager";
import type { AnimationController } from "@/lib/modelLoader";
import { getRacePortrait } from "@/lib/artAssets";
import { resolveModelUrl } from "@/lib/modelManifest";
import { getSharedGltfLoader } from "@/lib/three/SharedGltfPipeline";
import { loadCrewHero } from "./heroesCrewLoader";
import {
  CAPTURE_ZONE,
  HEROES_CINEMA_SECTOR_ID,
  SEASIDE_ASSET,
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
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(CAPTURE_ZONE.radiusM * 0.92, CAPTURE_ZONE.radiusM, 48),
    new THREE.MeshBasicMaterial({
      color: 0x22d3ee,
      transparent: true,
      opacity: 0.55,
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
      opacity: 0.12,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  disc.rotation.x = -Math.PI / 2;
  disc.position.y = 0.05;
  g.add(disc);
  // vertical volume (wire) for conquerable height
  const cyl = new THREE.Mesh(
    new THREE.CylinderGeometry(
      CAPTURE_ZONE.radiusM,
      CAPTURE_ZONE.radiusM,
      CAPTURE_ZONE.heightM,
      24,
      1,
      true,
    ),
    new THREE.MeshBasicMaterial({
      color: 0x67e8f9,
      transparent: true,
      opacity: 0.08,
      side: THREE.DoubleSide,
      depthWrite: false,
      wireframe: true,
    }),
  );
  cyl.position.y = CAPTURE_ZONE.heightM * 0.5;
  g.add(cyl);
  g.userData.capture = true;
  g.userData.captureZoneId = CAPTURE_ZONE.id;
  return g;
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

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setSize(w0, h0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    el.innerHTML = "";
    el.appendChild(renderer.domElement);
    renderer.domElement.style.cssText = "width:100%;height:100%;display:block;";

    scene.add(new THREE.AmbientLight(0xb8d4f0, 0.45));
    scene.add(new THREE.HemisphereLight(0xc8e0ff, 0x1a3040, 0.55));
    const sun = new THREE.DirectionalLight(0xfff0d0, 1.35);
    sun.position.set(40, 60, 20);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
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

    const slotRuntimes: SlotRuntime[] = [0, 1, 2, 3].map((index) => ({
      index,
      heroId: null,
      root: null,
      controller: null,
    }));

    // Crew stand positions on cave shelf (relative to cave after fit)
    const crewOffsets: THREE.Vector3[] = [
      new THREE.Vector3(-4, 0, 8),
      new THREE.Vector3(-1.2, 0, 9),
      new THREE.Vector3(1.5, 0, 8.5),
      new THREE.Vector3(4, 0, 7.5),
    ];

    const clock = new THREE.Clock();
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    async function buildEnvironment() {
      setStatus("Loading seaside treasure cave…");
      let cave: THREE.Group | null = null;
      // Prefer same-origin sector-assets, then CDN
      for (const u of [SEASIDE_ASSET.cave, SEASIDE_ASSET.caveCdn]) {
        try {
          cave = await loadGlb(u);
          break;
        } catch {
          /* try next */
        }
      }
      if (!cave) console.error("[seaside cinema] cave load failed");
      if (cave && !disposed) {
        fitGrounded(cave, 55);
        cave.position.set(0, landmark.waterLevel + 0.2, 0);
        worldRoot.add(cave);
      }

      setStatus("Loading sector islands…");
      let islands: THREE.Group | null = null;
      for (const u of [SEASIDE_ASSET.islands, SEASIDE_ASSET.islandsCdn]) {
        try {
          islands = await loadGlb(u);
          break;
        } catch {
          /* try next */
        }
      }
      if (!islands) console.warn("[seaside cinema] islands load failed — cave-only");
      if (islands && !disposed) {
        fitGrounded(islands, 90);
        // Near cave, slightly deeper footing so deep ocean reads between
        islands.position.set(
          CAPTURE_ZONE.localOffset[0] + 48,
          landmark.waterLevel - 1.5,
          CAPTURE_ZONE.localOffset[2] + 22,
        );
        worldRoot.add(islands);
      }

      // Capture zone under cave
      const capture = makeCaptureZoneMarker();
      capture.position.set(
        CAPTURE_ZONE.localOffset[0],
        landmark.waterLevel + CAPTURE_ZONE.localOffset[1],
        CAPTURE_ZONE.localOffset[2],
      );
      capture.userData.captureZoneId = landmark.captureZoneId;
      worldRoot.add(capture);

      // Establish look at cave + islands
      camLookT.set(12, landmark.waterLevel + 4, 10);
      camPosT.set(36, landmark.waterLevel + 16, 48);
    }

    async function reloadHeroes(next: (Character | null)[]) {
      if (disposed) return;
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
          g.position.set(off.x, landmark.waterLevel + 0.5 + off.y, off.z + 4);
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

      camPos.lerp(camPosT, 1 - Math.exp(-2.2 * dt));
      camLook.lerp(camLookT, 1 - Math.exp(-2.2 * dt));
      // Subtle establish drift when not focused
      if (camPosT.distanceToSquared(new THREE.Vector3(36, landmark.waterLevel + 16, 48)) < 4) {
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
        window.removeEventListener("resize", onResize);
        slotRuntimes.forEach((rt) => rt.controller?.dispose());
        renderer.dispose();
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
          Full Three.js cinema · deep ocean · conquerable zone under cave · islands nearby
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
