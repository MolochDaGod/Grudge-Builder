/**
 * @deprecated PURGED from product `/heroes` (2026-07-28).
 * Painted airship plate (`scene_airship.png`) + balloon deck cinema was a product
 * mistake. Production route uses {@link HeroesSeasideCinemaScene}.
 * Keep file only for archive / optional demos — do not import from App or heroes.tsx.
 */
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import type { Character } from "@/lib/characterManager";
import type { AnimationController } from "@/lib/modelLoader";
import { getRacePortrait } from "@/lib/artAssets";
import { DECK_LOCATIONS, SLOT_HOME, getDeckLocation, type DeckLocId } from "./deck/DeckLocations";
import {
  buildAirshipDeckVisual,
  buildDeckColliderGroup,
  buildHelmWheel,
  collectLanternLights,
  sampleDeckHeight,
} from "./deck/DeckPhysics";
import {
  createAgentsForSlots,
  lockAgentToCamera,
  updateCrewAgent,
  type CrewAgentState,
  type CrewAnimHint,
} from "./deck/DeckCrewAI";
import { loadCrewHero } from "./heroesCrewLoader";
import { loadAndCloneGltf } from "@/lib/three/SharedGltfPipeline";
import { createEtherealFallsSky, flickerLantern } from "./etherealFallsSky";

export type CrewStationId = "wheel" | "large_cannon" | "small_cannon" | "crow_rope";

export interface CrewStation {
  id: CrewStationId;
  label: string;
  xPct: number;
  yPct: number;
  facing: number;
  role: string;
  homeLoc: DeckLocId;
}

/** UI stations (4 crew) — home posts on the 6-location graph. */
export const CREW_STATIONS: CrewStation[] = [
  {
    id: "wheel",
    label: "Helm",
    xPct: 22,
    yPct: 74,
    facing: 0.35,
    role: "At the wheel",
    homeLoc: "wheel",
  },
  {
    id: "large_cannon",
    label: "Main battery",
    xPct: 38,
    yPct: 71,
    facing: -0.55,
    role: "Large cannons",
    homeLoc: "main_battery",
  },
  {
    id: "small_cannon",
    label: "Fore guns",
    xPct: 58,
    yPct: 72,
    facing: 0.9,
    role: "Smaller cannons",
    homeLoc: "fore_guns",
  },
  {
    id: "crow_rope",
    label: "Crow's line",
    xPct: 76,
    yPct: 68,
    facing: -0.25,
    role: "Rope to crow's nest",
    homeLoc: "crow_top",
  },
];

export interface HeroesBlackTideSceneProps {
  slots: (Character | null)[];
  selectedId: string | null;
  onSelectSlot: (index: number) => void;
  className?: string;
}

interface SlotRuntime {
  index: number;
  heroId: string | null;
  root: THREE.Group | null;
  controller: AnimationController | null;
  lastAnim: string;
}

/** Optional hull — archive demos only (not product /heroes) */
const AIRSHIP_HULL_URL = "/models/warlords/airships/airship.glb";
const CREW_SCENE_CANDIDATES = [
  "/models/warlords/foundry/warlords_crew_scene.glb",
  "https://assets.grudge-studio.com/models/warlords/foundry/warlords_crew_scene.glb",
  "https://character.grudge-studio.com/models/warlords/foundry/warlords_crew_scene.glb",
];

/** Ethereal night clear-color under shader sky */
const SKY_COLOR = 0x0e1630;
const FOG_COLOR = 0x1a2848;

/**
 * Deck establish — camera **on deck inside sky**, never exterior dome view.
 */
const ESTABLISH = {
  pos: new THREE.Vector3(0.2, 3.1, 7.2),
  look: new THREE.Vector3(0, 1.2, 0),
};

/** Intro starts slightly elevated still *over the deck* (inside sky shell). */
const INTRO_HIGH = {
  pos: new THREE.Vector3(1.2, 5.2, 9.5),
  look: new THREE.Vector3(-1.5, 1.1, 0.2),
};

const INTRO_DESCEND_S = 4.0;

function playAnimHint(
  controller: AnimationController | null,
  hint: CrewAnimHint,
  last: string,
): string {
  if (!controller) return last;
  const candidates: string[] =
    hint === "walk"
      ? ["walk", "run", "locomotion", "idle"]
      : hint === "wheel"
        ? ["interact", "work", "idle", "emote"]
        : hint === "cannon"
          ? ["attack", "idle", "work"]
          : hint === "rope"
            ? ["climb", "interact", "idle"]
            : ["idle"];
  for (const name of candidates) {
    if (controller.actions.has(name) || controller.loadedStates.includes(name)) {
      if (last !== name) {
        controller.play(name, { loop: true, speed: hint === "walk" ? 1.05 : 1 });
      }
      return name;
    }
  }
  if (last !== "idle") controller.play("idle", { loop: true, speed: 1 });
  return "idle";
}

export default function HeroesBlackTideScene({
  slots,
  selectedId,
  onSelectSlot,
  className = "",
}: HeroesBlackTideSceneProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const selectedIdRef = useRef(selectedId);
  selectedIdRef.current = selectedId;

  const [status, setStatus] = useState("Archive airship scene (purged)…");
  const [ready, setReady] = useState(false);
  const runRef = useRef<{
    dispose: () => void;
    setSelection: (id: string | null) => void;
    reloadHeroes: (slots: (Character | null)[]) => Promise<void>;
  } | null>(null);

  const slotsKey = slots
    .map((s) => (s ? `${s.id}:${s.level || 0}:${s.avatarUrl || ""}` : "empty"))
    .join("|");

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;
    let disposed = false;

    const w0 = Math.max(el.clientWidth, 4);
    const h0 = Math.max(el.clientHeight, 4);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(SKY_COLOR);
    scene.fog = new THREE.FogExp2(FOG_COLOR, 0.012);

    // Ethereal falls sky — camera stays inside (BackSide shell)
    const ethereal = createEtherealFallsSky(110);
    scene.add(ethereal.root);

    const camera = new THREE.PerspectiveCamera(40, w0 / h0, 0.12, 250);
    camera.position.copy(INTRO_HIGH.pos);
    camera.lookAt(INTRO_HIGH.look);

    const camPos = INTRO_HIGH.pos.clone();
    const camLook = INTRO_HIGH.look.clone();
    const camPosT = ESTABLISH.pos.clone();
    const camLookT = ESTABLISH.look.clone();
    let introElapsed = 0;
    let introDone = false;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    renderer.setSize(w0, h0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(SKY_COLOR, 1);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    el.innerHTML = "";
    el.appendChild(renderer.domElement);
    renderer.domElement.style.cssText =
      "width:100%;height:100%;display:block;";

    // Cool ethereal key + warm deck bounce so lanterns read on wood
    scene.add(new THREE.AmbientLight(0xa8c0e8, 0.35));
    scene.add(new THREE.HemisphereLight(0x9ec8ff, 0x2a1810, 0.55));
    const moon = new THREE.DirectionalLight(0xc8d8ff, 0.65);
    moon.position.set(-8, 18, 6);
    moon.castShadow = true;
    moon.shadow.mapSize.set(1024, 1024);
    moon.shadow.camera.near = 1;
    moon.shadow.camera.far = 50;
    moon.shadow.camera.left = -14;
    moon.shadow.camera.right = 14;
    moon.shadow.camera.top = 14;
    moon.shadow.camera.bottom = -14;
    scene.add(moon);
    const fill = new THREE.DirectionalLight(0xffb080, 0.25);
    fill.position.set(6, 4, -4);
    scene.add(fill);

    // Walkable deck + pathfinding colliders + lantern PointLights
    const deckVisual = buildAirshipDeckVisual();
    scene.add(deckVisual);
    scene.add(buildDeckColliderGroup());
    const helmWheel = buildHelmWheel();
    scene.add(helmWheel);
    const lanterns = collectLanternLights(deckVisual);

    // Optional hull GLB under deck (non-blocking)
    void loadAndCloneGltf(AIRSHIP_HULL_URL, {
      priority: "high",
      castShadow: true,
      receiveShadow: true,
      cloneMaterials: false,
    })
      .then(({ scene: hull }) => {
        if (disposed) return;
        hull.name = "AirshipHullGLB";
        const box = new THREE.Box3().setFromObject(hull);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const targetLen = 14;
        const s = targetLen / Math.max(size.x, size.z, 0.001);
        hull.scale.setScalar(s);
        hull.position.set(-center.x * s, -box.min.y * s - 1.2, -center.z * s);
        scene.add(hull);
      })
      .catch(() => {
        /* procedural deck is production fallback */
      });

    // Optional foundry crew scene backdrop (islands/sky mesh) — never drives camera span
    void (async () => {
      for (const url of CREW_SCENE_CANDIDATES) {
        try {
          const { scene: crew } = await loadAndCloneGltf(url, {
            priority: "low",
            castShadow: false,
            receiveShadow: true,
            cloneMaterials: false,
          });
          if (disposed) return;
          // Force any huge sky shell to BackSide so we stay "inside"
          crew.traverse((o) => {
            const m = o as THREE.Mesh;
            if (!m.isMesh) return;
            const box = new THREE.Box3().setFromObject(m);
            const sz = box.getSize(new THREE.Vector3());
            const maxD = Math.max(sz.x, sz.y, sz.z);
            const n = (m.name || "").toLowerCase();
            if (maxD > 40 || /sky|dome|cloud|environ/.test(n)) {
              const mats = Array.isArray(m.material) ? m.material : [m.material];
              for (const mat of mats) {
                if (mat) {
                  mat.side = THREE.BackSide;
                  mat.depthWrite = false;
                  (mat as THREE.MeshStandardMaterial).fog = false;
                }
              }
            }
          });
          // Fit deck region only — park as distant islands under walk deck
          const box = new THREE.Box3().setFromObject(crew);
          const size = box.getSize(new THREE.Vector3());
          const span = Math.max(size.x, size.z, 1);
          // If it's mostly the huge scene, scale so deck-ish width ~22m then push down/back
          if (span > 30) {
            crew.scale.setScalar(22 / span);
            crew.updateMatrixWorld(true);
            const b2 = new THREE.Box3().setFromObject(crew);
            const c2 = b2.getCenter(new THREE.Vector3());
            crew.position.set(-c2.x, -b2.min.y - 6, -c2.z - 18);
          }
          crew.name = "FoundryCrewSceneBG";
          scene.add(crew);
          console.info("[heroes] loaded foundry crew scene backdrop", url);
          break;
        } catch {
          /* try next CDN host */
        }
      }
    })();

    const locMarkers = new THREE.Group();
    for (const loc of DECK_LOCATIONS) {
      const m = new THREE.Mesh(
        new THREE.RingGeometry(0.22, 0.3, 24),
        new THREE.MeshBasicMaterial({
          color: 0xd4a017,
          transparent: true,
          opacity: 0.1,
          side: THREE.DoubleSide,
          depthWrite: false,
        }),
      );
      m.rotation.x = -Math.PI / 2;
      m.position.copy(loc.position);
      m.position.y = sampleDeckHeight(loc.position.x, loc.position.z) + 0.02;
      locMarkers.add(m);
    }
    scene.add(locMarkers);

    const crewRoot = new THREE.Group();
    scene.add(crewRoot);

    const slotRuntimes: SlotRuntime[] = [0, 1, 2, 3].map((index) => ({
      index,
      heroId: null,
      root: null,
      controller: null,
      lastAnim: "idle",
    }));

    let agents: CrewAgentState[] = [];
    const rings: (THREE.Mesh | null)[] = [null, null, null, null];

    function placeRing(index: number, pos: THREE.Vector3) {
      let ring = rings[index];
      if (!ring) {
        ring = new THREE.Mesh(
          new THREE.RingGeometry(0.42, 0.55, 40),
          new THREE.MeshBasicMaterial({
            color: 0xd4a017,
            transparent: true,
            opacity: 0.45,
            side: THREE.DoubleSide,
            depthWrite: false,
          }),
        );
        ring.rotation.x = -Math.PI / 2;
        ring.userData.slotIndex = index;
        crewRoot.add(ring);
        rings[index] = ring;
      }
      ring.position.set(pos.x, sampleDeckHeight(pos.x, pos.z) + 0.03, pos.z);
    }

    for (let i = 0; i < 4; i++) {
      placeRing(i, getDeckLocation(SLOT_HOME[i]!).position);
    }

    const clock = new THREE.Clock();
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    async function reloadHeroes(nextSlots: (Character | null)[]) {
      if (disposed) return;
      const filled = nextSlots.filter(Boolean).length;
      agents = createAgentsForSlots(filled);

      for (let i = 0; i < 4; i++) {
        const rt = slotRuntimes[i]!;
        const hero = nextSlots[i] ?? null;
        if (rt.root) {
          crewRoot.remove(rt.root);
          rt.controller?.dispose();
          rt.root = null;
          rt.controller = null;
        }
        rt.heroId = hero?.id ?? null;
        rt.lastAnim = "idle";
        if (!hero) continue;

        try {
          setStatus(`Loading crew: ${hero.name}…`);
          // Player explorer / voxel selection mesh + SI height (heroesCrewLoader)
          const crew = await loadCrewHero(hero);
          if (disposed) {
            crew.controller?.dispose();
            return;
          }
          const g = new THREE.Group();
          g.add(crew.root);
          const agent = agents.find((a) => a.slotIndex === i);
          if (agent) {
            g.position.copy(agent.position);
            g.rotation.y = agent.yaw;
            placeRing(i, agent.position);
          }
          g.userData.slotIndex = i;
          g.userData.heroId = hero.id;
          g.userData.pipeline = crew.pipeline;
          g.userData.heightM = crew.heightM;
          crewRoot.add(g);
          rt.root = g;
          rt.controller = crew.controller;
        } catch (e) {
          console.error(`[Grudge airship] slot ${i} failed`, e);
        }
      }
      if (!disposed) {
        setStatus("");
        setReady(true);
        setSelection(selectedIdRef.current);
      }
    }

    function setSelection(id: string | null) {
      rings.forEach((ring, i) => {
        if (!ring) return;
        const rt = slotRuntimes[i];
        const mat = ring.material as THREE.MeshBasicMaterial;
        const sel = !!(id && rt?.heroId === id);
        mat.color.setHex(sel ? 0x4ade80 : 0xd4a017);
        mat.opacity = sel ? 0.92 : 0.4;
      });

      for (const ag of agents) {
        const rt = slotRuntimes[ag.slotIndex];
        const isSel = !!(id && rt?.heroId === id);
        lockAgentToCamera(ag, isSel);
        if (isSel) {
          const p = ag.position;
          camPosT.set(p.x * 0.35 + 0.15, p.y + 2.35, p.z + 3.55);
          camLookT.set(p.x, p.y + 1.35, p.z);
        }
      }
      if (!id) {
        camPosT.copy(ESTABLISH.pos);
        camLookT.copy(ESTABLISH.look);
      }
    }

    const onClick = (ev: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const objs: THREE.Object3D[] = [];
      rings.forEach((r) => {
        if (r) objs.push(r);
      });
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

      // Cinema: follow down from sky to airship deck, then settle / selection zoom
      if (!introDone) {
        introElapsed += dt;
        const u = Math.min(1, introElapsed / INTRO_DESCEND_S);
        // Smoothstep ease-in-out for cinematic descend
        const s = u * u * (3 - 2 * u);
        camPos.lerpVectors(INTRO_HIGH.pos, ESTABLISH.pos, s);
        camLook.lerpVectors(INTRO_HIGH.look, ESTABLISH.look, s);
        if (u >= 1) {
          introDone = true;
          camPosT.copy(ESTABLISH.pos);
          camLookT.copy(ESTABLISH.look);
        }
        camera.position.copy(camPos);
        camera.lookAt(camLook);
      } else {
        camPos.lerp(camPosT, 1 - Math.exp(-2.8 * dt));
        camLook.lerp(camLookT, 1 - Math.exp(-2.8 * dt));
        if (camPosT.distanceTo(ESTABLISH.pos) < 0.45) {
          camera.position.set(
            camPos.x + Math.sin(t * 0.08) * 0.28,
            camPos.y + Math.sin(t * 0.12) * 0.06,
            camPos.z,
          );
        } else {
          camera.position.copy(camPos);
        }
        camera.lookAt(camLook);
      }

      // Ethereal falls sky animation
      ethereal.update(t);

      // Lantern flicker — deck path lit for crew AI
      for (const L of lanterns) {
        flickerLantern(
          L,
          t,
          Number(L.userData.lanternSeed) || 0,
          Number(L.userData.baseIntensity) || 1.1,
        );
      }

      const wheelWorker = agents.find(
        (a) => !a.locked && a.currentLoc === "wheel" && a.anim !== "walk",
      );
      helmWheel.rotation.z += dt * (wheelWorker ? 1.45 : 0.12);

      // Soft ship float (deck + crew together)
      deckVisual.position.y = Math.sin(t * 0.28) * 0.04;
      crewRoot.position.y = deckVisual.position.y;

      for (const agent of agents) {
        updateCrewAgent(agent, dt, t, camera.position);
        const rt = slotRuntimes[agent.slotIndex];
        if (!rt?.root) continue;
        // Pathfind Y from deck height field (stairs / crow)
        const y = sampleDeckHeight(agent.position.x, agent.position.z);
        agent.position.y = y;
        rt.root.position.copy(agent.position);
        rt.root.rotation.y = agent.yaw;
        placeRing(agent.slotIndex, agent.position);
        rt.lastAnim = playAnimHint(rt.controller, agent.anim, rt.lastAnim);
        rt.controller?.update(dt);
      }

      slotRuntimes.forEach((rt) => {
        if (!agents.some((a) => a.slotIndex === rt.index)) {
          rt.controller?.update(dt);
        }
      });

      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };

    setStatus("Boarding The Grudge…");
    void reloadHeroes(slots).then(() => {
      if (!disposed) raf = requestAnimationFrame(tick);
    });

    runRef.current = {
      dispose: () => {
        disposed = true;
        cancelAnimationFrame(raf);
        renderer.domElement.removeEventListener("click", onClick);
        window.removeEventListener("resize", onResize);
        slotRuntimes.forEach((rt) => rt.controller?.dispose());
        ethereal.dispose();
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
  }, []);

  useEffect(() => {
    runRef.current?.setSelection(selectedId);
  }, [selectedId]);

  useEffect(() => {
    void runRef.current?.reloadHeroes(slots);
  }, [slotsKey]);

  return (
    <div
      className={`relative w-full h-full min-h-[360px] overflow-hidden ${className}`}
      style={{ background: `#${SKY_COLOR.toString(16).padStart(6, "0")}` }}
    >
      {/* Painting airship plate PURGED — solid sky only */}
      <div ref={mountRef} className="absolute inset-0 z-[2]" />

      {/* Top avatar strip */}
      <div className="absolute top-2 left-0 right-0 z-[8] flex flex-col items-center gap-1.5 pointer-events-none">
        <div
          className="font-cinzel text-sm sm:text-lg tracking-wide"
          style={{ color: "#d4a017", textShadow: "0 2px 10px rgba(0,0,0,0.9)" }}
        >
          Archive scene (not product /heroes)
        </div>
        <div className="flex gap-2 sm:gap-3 pointer-events-auto px-2">
          {CREW_STATIONS.map((st, i) => {
            const hero = slots[i];
            const sel = !!(hero && hero.id === selectedId);
            const img = hero?.avatarUrl || (hero ? getRacePortrait(hero.raceId) : null);
            return (
              <button
                key={st.id}
                type="button"
                title={hero ? `${hero.name} · Lv ${hero.level}` : `${st.label} empty`}
                onClick={() => onSelectSlot(i)}
                className={`relative w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 overflow-hidden transition shadow-lg ${
                  sel
                    ? "border-emerald-400 scale-110 shadow-emerald-500/40"
                    : hero
                      ? "border-amber-500/60 hover:border-amber-300"
                      : "border-slate-600/50 opacity-60"
                }`}
                style={{ background: "rgba(8,12,20,0.85)" }}
              >
                {img ? (
                  <img
                    src={img}
                    alt={hero?.name || st.label}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="flex items-center justify-center w-full h-full text-[9px] font-cinzel text-slate-400">
                    {i + 1}
                  </span>
                )}
                {hero && (
                  <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 text-[8px] font-bold bg-black/75 px-1 rounded text-amber-200">
                    {hero.level}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <p className="text-[9px] uppercase tracking-[0.2em] text-amber-100/60 font-cinzel">
          Camera follows to deck · 4 crew · grudge6 · click portrait to zoom
        </p>
      </div>

      {!ready && (
        <div className="absolute inset-0 z-[5] flex items-center justify-center pointer-events-none">
          <div className="px-4 py-2 rounded-md bg-black/65 border border-amber-600/40 text-amber-100 text-sm font-cinzel tracking-wider">
            {status || "Preparing crew…"}
          </div>
        </div>
      )}

      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-[6] flex flex-wrap gap-1.5 justify-center max-w-[96vw]">
        {CREW_STATIONS.map((st, i) => {
          const hero = slots[i];
          const sel = !!(hero && hero.id === selectedId);
          return (
            <button
              key={st.id}
              type="button"
              onClick={() => onSelectSlot(i)}
              className={`pointer-events-auto px-2.5 py-1.5 rounded-md border text-[10px] font-cinzel uppercase tracking-wider transition backdrop-blur-sm ${
                sel
                  ? "border-emerald-400/70 bg-emerald-500/20 text-emerald-50"
                  : "border-amber-600/35 bg-black/55 text-amber-100/85 hover:border-amber-400/50"
              }`}
            >
              {hero ? (
                <span className="inline-flex items-center gap-1.5">
                  <img
                    src={hero.avatarUrl || getRacePortrait(hero.raceId)}
                    alt=""
                    className="w-5 h-5 rounded-full object-cover ring-1 ring-amber-600/40"
                  />
                  <span>
                    {st.label}: {hero.name}
                  </span>
                </span>
              ) : (
                <span>
                  {st.label} · empty
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
