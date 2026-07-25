/**
 * HeroesBlackTideScene — /heroes airship cinema roster (Puter GrudgeWar "The Grudge").
 *
 * Production practices:
 *   - grudge-production-cinema: locked cinema camera, establish → focus beats
 *   - grudge-fps-combat / Yuka-style: wander + goal stack (idle/animate/wait/goto)
 *   - three-mesh-bvh-pathfinding: deck height sample + stair colliders
 *   - grudge-character-correctness: SI 1.8 m grudge6 idle/walk
 *
 * Features:
 *   - Up to 4 crew AI on 6 deck locations (wheel, batteries, mid, stairs, crow)
 *   - Stairs height + colliders; helm wheel prop spins while AI works
 *   - Top avatar / CNFT strip → click zooms cinema cam + face camera
 *   - Select persists via parent setActive for all play destinations
 */
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import type { Character } from "@/lib/characterManager";
import type { AnimationController } from "@/lib/modelLoader";
import { getRacePortrait } from "@/lib/artAssets";
import { DECK_LOCATIONS, SLOT_HOME, getDeckLocation, type DeckLocId } from "./deck/DeckLocations";
import { buildDeckColliderGroup, buildHelmWheel, sampleDeckHeight } from "./deck/DeckPhysics";
import {
  createAgentsForSlots,
  lockAgentToCamera,
  updateCrewAgent,
  type CrewAgentState,
  type CrewAnimHint,
} from "./deck/DeckCrewAI";
import { loadCrewHero } from "./heroesCrewLoader";

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

const AIRSHIP_BG = "/backgrounds/scene_airship.png";

/** Final deck establish framing (after intro descend). */
const ESTABLISH = {
  pos: new THREE.Vector3(0, 3.55, 9.8),
  look: new THREE.Vector3(0, 1.15, 0),
};

/** High sky approach — camera starts here and follows down onto the airship. */
const INTRO_HIGH = {
  pos: new THREE.Vector3(0.4, 14.5, 18.5),
  look: new THREE.Vector3(0, 0.4, -0.5),
};

/** Seconds for sky → deck cinema pull. */
const INTRO_DESCEND_S = 3.2;

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

  const [status, setStatus] = useState("Loading The Grudge airship…");
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
    scene.background = null;

    const camera = new THREE.PerspectiveCamera(38, w0 / h0, 0.1, 120);
    // Start high above the ship — tick lerps down to ESTABLISH over INTRO_DESCEND_S
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
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(w0, h0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    el.innerHTML = "";
    el.appendChild(renderer.domElement);
    renderer.domElement.style.cssText =
      "width:100%;height:100%;display:block;background:transparent;";

    scene.add(new THREE.AmbientLight(0xffe8c8, 0.7));
    scene.add(new THREE.HemisphereLight(0xfff0d8, 0x6a5a40, 0.55));
    const sun = new THREE.DirectionalLight(0xfff2d0, 1.25);
    sun.position.set(6, 14, 8);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    scene.add(sun);
    const fill = new THREE.DirectionalLight(0xb8d4f0, 0.3);
    fill.position.set(-8, 4, -4);
    scene.add(fill);

    scene.add(buildDeckColliderGroup());
    const helmWheel = buildHelmWheel();
    scene.add(helmWheel);

    const locMarkers = new THREE.Group();
    for (const loc of DECK_LOCATIONS) {
      const m = new THREE.Mesh(
        new THREE.RingGeometry(0.22, 0.3, 24),
        new THREE.MeshBasicMaterial({
          color: 0xd4a017,
          transparent: true,
          opacity: 0.16,
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

      const wheelWorker = agents.find(
        (a) => !a.locked && a.currentLoc === "wheel" && a.anim !== "walk",
      );
      helmWheel.rotation.z += dt * (wheelWorker ? 1.45 : 0.12);

      for (const agent of agents) {
        updateCrewAgent(agent, dt, t, camera.position);
        const rt = slotRuntimes[agent.slotIndex];
        if (!rt?.root) continue;
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
    <div className={`relative w-full h-full min-h-[360px] overflow-hidden ${className}`}>
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `url(${AIRSHIP_BG})`,
          backgroundSize: "cover",
          backgroundPosition: "center bottom",
          filter: "saturate(1.05) brightness(1.02)",
        }}
      />
      <div
        className="absolute inset-0 z-[1] pointer-events-none"
        style={{ background: "rgba(0,0,0,0.12)" }}
      />

      <div ref={mountRef} className="absolute inset-0 z-[2]" />

      {/* Top avatar / CNFT strip */}
      <div className="absolute top-2 left-0 right-0 z-[8] flex flex-col items-center gap-1.5 pointer-events-none">
        <div
          className="font-cinzel text-sm sm:text-lg tracking-wide"
          style={{ color: "#d4a017", textShadow: "0 2px 10px rgba(0,0,0,0.9)" }}
        >
          The Grudge — Pirate Airship
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
