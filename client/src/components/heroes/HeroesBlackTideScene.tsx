/**
 * HeroesBlackTideScene — /heroes roster recreated from Puter GrudgeWar airship scene.
 *
 * Reference: https://puter.com/app/grudgewar → "The Grudge — Pirate Airship"
 *   background: /backgrounds/scene_airship.png (steampunk deck, balloon, clear sky)
 *   heroes stand on the wooden platform as crew (up to 4 slots)
 *
 * Stations (user spec):
 *   0 helm/wheel · 1 large cannons · 2 small cannons · 3 rope to crow's nest
 */
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import type { Character } from "@/lib/characterManager";
import {
  loadCharacterModel,
  AnimationController,
  preloadAnimations,
  type LoadedModel,
} from "@/lib/modelLoader";
import {
  RACE_GRUDGE6,
  resolveRaceCdnUrl,
  panelEquipmentToModel3d,
  weaponTypeFromModel3d,
  normalizeRaceId,
  type PanelEquipment,
} from "@shared/fleet";
import { setupGrudge6Equipment } from "@/lib/grudge6Equipment";
import { applyGrudge6RaceTextures } from "@/lib/grudge6Textures";
import { applyCharacterColorTints, ensureCharacterTextureColorSpace } from "@/lib/characterAppearance";
import { fitCharacterRootToHeightM, PLAYER_HEIGHT_M } from "@/island3d/zoneWorldScale";
import { getAnimationSet, type AnimationDef, type WeaponType } from "@/lib/modelManifest";
import { getRacePortrait } from "@/lib/artAssets";

export type CrewStationId = "wheel" | "large_cannon" | "small_cannon" | "crow_rope";

export interface CrewStation {
  id: CrewStationId;
  label: string;
  /** Viewport % (0–100) matching Puter AirshipScene deck layout */
  xPct: number;
  yPct: number;
  facing: number;
  role: string;
}

/**
 * Deck stations aligned to scene_airship.png composition
 * (deck sits ~middle-lower; balloon/cabin upper).
 * Tuned so four crew read as working stations, not a flat lineup.
 */
export const CREW_STATIONS: CrewStation[] = [
  {
    id: "wheel",
    label: "Helm",
    xPct: 22,
    yPct: 74,
    facing: 0.35,
    role: "At the wheel",
  },
  {
    id: "large_cannon",
    label: "Main battery",
    xPct: 38,
    yPct: 71,
    facing: -0.55,
    role: "Large cannons",
  },
  {
    id: "small_cannon",
    label: "Fore guns",
    xPct: 58,
    yPct: 72,
    facing: 0.9,
    role: "Smaller cannons",
  },
  {
    id: "crow_rope",
    label: "Crow's line",
    xPct: 76,
    yPct: 68,
    facing: -0.25,
    role: "Rope to crow's nest",
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
  labelEl: HTMLDivElement | null;
}

const AIRSHIP_BG = "/backgrounds/scene_airship.png";

async function loadHeroRoot(hero: Character): Promise<{
  model: LoadedModel;
  controller: AnimationController;
}> {
  const raceKey = normalizeRaceId(hero.raceId || "human");
  const race = RACE_GRUDGE6[raceKey] ?? RACE_GRUDGE6.human;
  const loaded = await loadCharacterModel(resolveRaceCdnUrl(raceKey));

  const equipment = (hero.equipment || {}) as PanelEquipment;
  const model3d = panelEquipmentToModel3d(
    raceKey,
    hero.classId || "warrior",
    equipment,
    hero.model3d as any,
  );

  await applyGrudge6RaceTextures(loaded.scene, raceKey);
  setupGrudge6Equipment(race.prefix, loaded.scene, model3d);
  await applyGrudge6RaceTextures(loaded.scene, raceKey);
  ensureCharacterTextureColorSpace(loaded.scene);
  applyCharacterColorTints(loaded.scene, model3d.skinColor, model3d.armorColor);

  fitCharacterRootToHeightM(loaded.scene, model3d.scale ?? race.scale ?? 1, PLAYER_HEIGHT_M);

  const controller = new AnimationController(loaded.mixer, loaded.scene);
  const weaponType = weaponTypeFromModel3d(model3d, hero.classId) as WeaponType;
  const animSet = getAnimationSet(weaponType);
  const animMap: Record<string, string> = {};
  for (const [state, def] of Object.entries(animSet)) {
    if (def) animMap[state] = (def as AnimationDef).file;
  }
  await preloadAnimations(controller, animMap);
  for (const [name, action] of loaded.actions) {
    if (!controller.actions.has(name)) controller.actions.set(name, action);
  }
  // Prefer idle; fall back to first available
  if (!controller.play("idle", { loop: true, speed: 1 })) {
    const first = controller.loadedStates[0];
    if (first) controller.play(first, { loop: true, speed: 1 });
  }
  return { model: loaded, controller };
}

/** Project deck % into a fixed camera world frame (characters on a virtual deck). */
function deckWorld(xPct: number, yPct: number, halfW: number, deckZ: number, deckY: number) {
  // x: left→right across deck, z: slight depth so closer slots are lower on painting
  const x = ((xPct - 50) / 50) * halfW;
  const depth = ((yPct - 70) / 20) * 1.2; // small z variance from y%
  return new THREE.Vector3(x, deckY, deckZ + depth);
}

export default function HeroesBlackTideScene({
  slots,
  selectedId,
  onSelectSlot,
  className = "",
}: HeroesBlackTideSceneProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const labelsRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState("Loading The Grudge airship…");
  const [ready, setReady] = useState(false);
  const runRef = useRef<{
    dispose: () => void;
    setSelection: (id: string | null) => void;
    reloadHeroes: (slots: (Character | null)[]) => Promise<void>;
  } | null>(null);

  const slotsKey = slots.map((s) => (s ? `${s.id}:${s.level || 0}` : "empty")).join("|");

  useEffect(() => {
    const el = mountRef.current;
    const labelsRoot = labelsRef.current;
    if (!el) return;
    let disposed = false;

    const w0 = Math.max(el.clientWidth, 4);
    const h0 = Math.max(el.clientHeight, 4);

    // ── Three.js: transparent overlay for 3D heroes only ──
    const scene = new THREE.Scene();
    // No solid background — airship plate shows through
    scene.background = null;
    scene.fog = null;

    const camera = new THREE.PerspectiveCamera(38, w0 / h0, 0.1, 80);
    // Camera looks slightly down at deck line matching the painting
    camera.position.set(0, 3.4, 9.5);
    camera.lookAt(0, 1.1, 0);

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
    renderer.domElement.style.cssText = "width:100%;height:100%;display:block;background:transparent;";

    // Warm clear-sky lighting matching the airship plate
    scene.add(new THREE.AmbientLight(0xffe8c8, 0.7));
    const hemi = new THREE.HemisphereLight(0xfff0d8, 0x6a5a40, 0.55);
    scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xfff2d0, 1.25);
    sun.position.set(6, 14, 8);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 40;
    sun.shadow.camera.left = -10;
    sun.shadow.camera.right = 10;
    sun.shadow.camera.top = 10;
    sun.shadow.camera.bottom = -10;
    scene.add(sun);
    const fill = new THREE.DirectionalLight(0xb8d4f0, 0.3);
    fill.position.set(-8, 4, -4);
    scene.add(fill);

    // Invisible deck plane for feet + selection rings (no mesh visible)
    const deckY = 0;
    const deckZ = 0;
    const halfW = 5.2;
    const crewRoot = new THREE.Group();
    scene.add(crewRoot);

    const slotRuntimes: SlotRuntime[] = [];
    const rings: THREE.Mesh[] = [];

    CREW_STATIONS.forEach((st, index) => {
      const pos = deckWorld(st.xPct, st.yPct, halfW, deckZ, deckY);
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.42, 0.55, 40),
        new THREE.MeshBasicMaterial({
          color: 0xd4a017,
          transparent: true,
          opacity: 0.5,
          side: THREE.DoubleSide,
          depthWrite: false,
        }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.copy(pos);
      ring.position.y = 0.03;
      ring.userData.slotIndex = index;
      crewRoot.add(ring);
      rings.push(ring);

      // Soft ground contact disc
      const disc = new THREE.Mesh(
        new THREE.CircleGeometry(0.5, 24),
        new THREE.MeshBasicMaterial({
          color: 0x000000,
          transparent: true,
          opacity: 0.28,
          depthWrite: false,
        }),
      );
      disc.rotation.x = -Math.PI / 2;
      disc.position.copy(pos);
      disc.position.y = 0.01;
      crewRoot.add(disc);

      slotRuntimes.push({
        index,
        heroId: null,
        root: null,
        controller: null,
        labelEl: null,
      });
    });

    const clock = new THREE.Clock();
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    function projectLabel(index: number, world: THREE.Vector3, name: string, empty: boolean) {
      if (!labelsRoot) return;
      let lab = slotRuntimes[index].labelEl;
      if (!lab) {
        lab = document.createElement("div");
        lab.style.cssText =
          "position:absolute;transform:translate(-50%,-100%);pointer-events:auto;cursor:pointer;" +
          "text-align:center;font-family:Cinzel,serif;text-shadow:0 2px 8px rgba(0,0,0,0.95);" +
          "white-space:nowrap;z-index:5;";
        lab.addEventListener("click", (e) => {
          e.stopPropagation();
          onSelectSlot(index);
        });
        labelsRoot.appendChild(lab);
        slotRuntimes[index].labelEl = lab;
      }
      const v = world.clone().project(camera);
      const x = (v.x * 0.5 + 0.5) * el.clientWidth;
      const y = (-v.y * 0.5 + 0.5) * el.clientHeight;
      lab.style.left = `${x}px`;
      lab.style.top = `${y - 8}px`;
      const st = CREW_STATIONS[index];
      if (empty) {
        lab.innerHTML = `<div style="font-size:10px;color:#d4a017;letter-spacing:.12em;text-transform:uppercase;opacity:.85">${st.label}</div>
          <div style="font-size:9px;color:#94a3b8;margin-top:2px">Empty · Forge</div>`;
      } else {
        lab.innerHTML = `<div style="font-size:11px;font-weight:700;color:#fbbf24">${name}</div>
          <div style="font-size:9px;color:#e8d5a0;margin-top:1px">${st.role}</div>`;
      }
    }

    async function reloadHeroes(nextSlots: (Character | null)[]) {
      if (disposed) return;
      for (let i = 0; i < CREW_STATIONS.length; i++) {
        const rt = slotRuntimes[i];
        const st = CREW_STATIONS[i];
        const hero = nextSlots[i] ?? null;
        const pos = deckWorld(st.xPct, st.yPct, halfW, deckZ, deckY);

        if (rt.root) {
          crewRoot.remove(rt.root);
          rt.controller?.dispose();
          rt.root = null;
          rt.controller = null;
        }
        rt.heroId = hero?.id ?? null;

        if (!hero) {
          projectLabel(i, pos.clone().setY(2.2), "", true);
          continue;
        }

        try {
          setStatus(`Loading crew: ${hero.name}…`);
          const { model, controller } = await loadHeroRoot(hero);
          if (disposed) {
            controller.dispose();
            return;
          }
          const g = new THREE.Group();
          g.add(model.scene);
          g.position.copy(pos);
          g.rotation.y = st.facing;
          g.userData.slotIndex = i;
          g.userData.heroId = hero.id;
          crewRoot.add(g);
          rt.root = g;
          rt.controller = controller;
          projectLabel(i, pos.clone().setY(2.35), hero.name, false);
        } catch (e) {
          console.error(`[Grudge airship] slot ${i} failed`, e);
          projectLabel(i, pos.clone().setY(2.2), "Load failed", true);
        }
      }
      if (!disposed) {
        setStatus("");
        setReady(true);
      }
    }

    function setSelection(id: string | null) {
      rings.forEach((ring, i) => {
        const rt = slotRuntimes[i];
        const mat = ring.material as THREE.MeshBasicMaterial;
        const sel = !!(id && rt.heroId === id);
        mat.color.setHex(sel ? 0x4ade80 : 0xd4a017);
        mat.opacity = sel ? 0.9 : 0.45;
        if (rt.root) rt.root.scale.setScalar(sel ? 1.05 : 1);
      });
    }

    const onClick = (ev: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const objs: THREE.Object3D[] = [...rings];
      slotRuntimes.forEach((rt) => {
        if (rt.root) objs.push(rt.root);
      });
      const hits = raycaster.intersectObjects(objs, true);
      if (!hits.length) return;
      let o: THREE.Object3D | null = hits[0].object;
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
      // Subtle camera drift — cinematic, not full orbit (keeps airship plate aligned)
      const t = clock.elapsedTime;
      camera.position.x = Math.sin(t * 0.08) * 0.35;
      camera.position.y = 3.4 + Math.sin(t * 0.12) * 0.08;
      camera.lookAt(0, 1.15, 0);

      slotRuntimes.forEach((rt) => {
        rt.controller?.update(dt);
        if (rt.root) {
          const st = CREW_STATIONS[rt.index];
          const pos = deckWorld(st.xPct, st.yPct, halfW, deckZ, deckY);
          projectLabel(
            rt.index,
            pos.clone().setY(2.35),
            slots[rt.index]?.name || "",
            !rt.heroId,
          );
        } else {
          const st = CREW_STATIONS[rt.index];
          const pos = deckWorld(st.xPct, st.yPct, halfW, deckZ, deckY);
          projectLabel(rt.index, pos.clone().setY(2.2), "", true);
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
        slotRuntimes.forEach((rt) => {
          rt.controller?.dispose();
          if (rt.labelEl?.parentNode) rt.labelEl.parentNode.removeChild(rt.labelEl);
        });
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
      {/* Puter GrudgeWar airship plate — The Grudge */}
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

      {/* 3D crew layer */}
      <div ref={mountRef} className="absolute inset-0 z-[2]" />
      <div ref={labelsRef} className="absolute inset-0 z-[3] pointer-events-none" />

      {/* Title chrome matching Puter AirshipScene */}
      <div className="absolute top-3 left-4 right-4 z-[4] flex justify-between items-center pointer-events-none">
        <div
          className="font-cinzel text-lg sm:text-xl tracking-wide"
          style={{
            color: "#d4a017",
            textShadow: "0 2px 10px rgba(0,0,0,0.9)",
          }}
        >
          The Grudge — Pirate Airship
        </div>
        <div
          className="font-cinzel text-[10px] uppercase tracking-[0.25em] text-amber-100/70"
          style={{ textShadow: "0 1px 6px rgba(0,0,0,0.9)" }}
        >
          Black Tide · 4 crew
        </div>
      </div>

      {!ready && (
        <div className="absolute inset-0 z-[5] flex items-center justify-center pointer-events-none">
          <div className="px-4 py-2 rounded-md bg-black/65 border border-amber-600/40 text-amber-100 text-sm font-cinzel tracking-wider">
            {status || "Preparing crew…"}
          </div>
        </div>
      )}

      {/* Station strip (Puter-style bottom chrome) */}
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
