/**
 * BossWalkupScene — Puter GrudgeWar boss approach pipeline (3D client port).
 *
 * Phases: walk → confront → charging → onChallenge()
 * Practices: grudgewar-puter-scenes (plate, boss larger, quote, challenge/retreat)
 */
import { useEffect, useRef, useState, useCallback } from "react";
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
import { GRUDGEWAR_BOSS_WALKUP, GRUDGEWAR_BATTLE_ROWS } from "@/lib/grudgewarSceneLayers";

export type BossWalkupPhase = "walk" | "confront" | "charging";

export interface BossWalkupConfig {
  bossId?: string;
  bossName?: string;
  bossTitle?: string;
  quote?: string;
  /** Plate under /backgrounds/ */
  plate?: string;
  /** grudge6 race for boss body */
  bossRaceId?: string;
  bossScaleMult?: number;
}

const DEFAULT_BOSS: Required<BossWalkupConfig> = {
  bossId: "malachar",
  bossName: "Malachar the Undying",
  bossTitle: "Endgame Boss",
  quote: "You dare trespass in my domain? Your souls will fuel my eternal flame!",
  plate: "/backgrounds/lava_boss_walkup.png",
  bossRaceId: "undead",
  bossScaleMult: GRUDGEWAR_BATTLE_ROWS.bossScale,
};

export interface BossWalkupSceneProps {
  hero: Character | null;
  config?: BossWalkupConfig;
  onChallenge: () => void;
  onRetreat: () => void;
  className?: string;
}

async function loadActor(
  raceId: string,
  classId: string,
  equipment: PanelEquipment | undefined,
  model3d: any,
  heightMult: number,
): Promise<{ model: LoadedModel; controller: AnimationController }> {
  const raceKey = normalizeRaceId(raceId || "human");
  const race = RACE_GRUDGE6[raceKey] ?? RACE_GRUDGE6.human;
  const loaded = await loadCharacterModel(resolveRaceCdnUrl(raceKey));
  const m3d = panelEquipmentToModel3d(raceKey, classId || "warrior", equipment ?? {}, model3d);
  await applyGrudge6RaceTextures(loaded.scene, raceKey);
  setupGrudge6Equipment(race.prefix, loaded.scene, m3d);
  await applyGrudge6RaceTextures(loaded.scene, raceKey);
  ensureCharacterTextureColorSpace(loaded.scene);
  applyCharacterColorTints(loaded.scene, m3d.skinColor, m3d.armorColor);
  // Boss uses larger target height only (avoid double-multiplying race scale)
  fitCharacterRootToHeightM(
    loaded.scene,
    m3d.scale ?? race.scale ?? 1,
    PLAYER_HEIGHT_M * heightMult,
  );
  const controller = new AnimationController(loaded.mixer, loaded.scene);
  const weaponType = weaponTypeFromModel3d(m3d, classId) as WeaponType;
  const animSet = getAnimationSet(weaponType);
  const animMap: Record<string, string> = {};
  for (const [state, def] of Object.entries(animSet)) {
    if (def) animMap[state] = (def as AnimationDef).file;
  }
  await preloadAnimations(controller, animMap);
  for (const [name, action] of loaded.actions) {
    if (!controller.actions.has(name)) controller.actions.set(name, action);
  }
  if (!controller.play("idle", { loop: true, speed: 1 })) {
    const first = controller.loadedStates[0];
    if (first) controller.play(first, { loop: true, speed: 1 });
  }
  return { model: loaded, controller };
}

export default function BossWalkupScene({
  hero,
  config,
  onChallenge,
  onRetreat,
  className = "",
}: BossWalkupSceneProps) {
  const cfg = { ...DEFAULT_BOSS, ...config };
  const mountRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<BossWalkupPhase>("walk");
  const [status, setStatus] = useState("Approaching the boss chamber…");
  const [ready, setReady] = useState(false);
  const phaseRef = useRef<BossWalkupPhase>("walk");
  const controllersRef = useRef<AnimationController[]>([]);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;
    let disposed = false;

    const w0 = Math.max(el.clientWidth, 4);
    const h0 = Math.max(el.clientHeight, 4);

    const scene = new THREE.Scene();
    scene.background = null;

    const camera = new THREE.PerspectiveCamera(40, w0 / h0, 0.1, 100);
    camera.position.set(0, 2.8, 8);
    camera.lookAt(0, 1.4, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w0, h0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.enabled = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    el.innerHTML = "";
    el.appendChild(renderer.domElement);
    renderer.domElement.style.cssText = "width:100%;height:100%;display:block;background:transparent;";

    // Lava / boss chamber lighting
    scene.add(new THREE.AmbientLight(0xffccaa, 0.45));
    scene.add(new THREE.HemisphereLight(0xff8866, 0x221100, 0.5));
    const key = new THREE.DirectionalLight(0xffaa66, 1.2);
    key.position.set(4, 10, 6);
    key.castShadow = true;
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xaa44ff, 0.45);
    rim.position.set(-5, 6, -4);
    scene.add(rim);

    const heroGroup = new THREE.Group();
    const bossGroup = new THREE.Group();
    scene.add(heroGroup);
    scene.add(bossGroup);

    // Start hero low (walkup from bottom of plate)
    heroGroup.position.set(0, 0, 3.2);
    bossGroup.position.set(0, 0, -1.6);
    bossGroup.rotation.y = Math.PI; // face hero

    const clock = new THREE.Clock();
    let heroTargetZ = 3.2;
    let camZ = 8;

    (async () => {
      try {
        setStatus("Loading combatants…");
        if (hero) {
          const h = await loadActor(
            hero.raceId,
            hero.classId,
            hero.equipment as PanelEquipment,
            hero.model3d,
            1,
          );
          if (disposed) return;
          heroGroup.add(h.model.scene);
          controllersRef.current.push(h.controller);
        }
        const b = await loadActor(cfg.bossRaceId, "mage", {}, undefined, cfg.bossScaleMult);
        if (disposed) return;
        bossGroup.add(b.model.scene);
        controllersRef.current.push(b.controller);
        // Boss faces hero (hero at +Z)
        bossGroup.rotation.y = 0;
        heroGroup.rotation.y = Math.PI;
        setReady(true);
        setStatus("Approaching the boss chamber…");
        // Walk phase: move hero forward
        setTimeout(() => {
          if (!disposed) heroTargetZ = 1.0;
        }, 200);
        setTimeout(() => {
          if (!disposed) {
            setPhase("confront");
            setStatus("");
          }
        }, 1500);
      } catch (e) {
        console.error("[BossWalkup]", e);
        setStatus("Failed to load scene");
      }
    })();

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
      // Smooth hero approach
      heroGroup.position.z += (heroTargetZ - heroGroup.position.z) * Math.min(1, dt * 2.2);
      // Subtle camera push on confront/charge
      const wantCamZ = phaseRef.current === "charging" ? 6.5 : phaseRef.current === "confront" ? 7.2 : 8;
      camZ += (wantCamZ - camZ) * Math.min(1, dt * 1.5);
      camera.position.set(Math.sin(clock.elapsedTime * 0.15) * 0.25, 2.8, camZ);
      camera.lookAt(0, 1.5, 0);

      // Boss idle sway
      bossGroup.position.y = Math.sin(clock.elapsedTime * 1.2) * 0.04;

      controllersRef.current.forEach((c) => c.update(dt));
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      controllersRef.current.forEach((c) => c.dispose());
      controllersRef.current = [];
      renderer.dispose();
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }, [hero?.id, cfg.bossRaceId, cfg.bossScaleMult]);

  const handleChallenge = useCallback(() => {
    setPhase("charging");
    setStatus("Challenge accepted…");
    setTimeout(() => onChallenge(), 800);
  }, [onChallenge]);

  return (
    <div className={`relative w-full h-full min-h-[420px] overflow-hidden ${className}`}>
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `url(${cfg.plate})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <div
        className="absolute inset-0 z-[1] pointer-events-none transition-colors duration-500"
        style={{
          background:
            phase === "charging"
              ? "rgba(239,68,68,0.28)"
              : "rgba(0,0,0,0.15)",
        }}
      />
      {phase === "charging" && (
        <div
          className="absolute inset-0 z-[2] pointer-events-none animate-pulse"
          style={{
            background:
              "radial-gradient(circle at 50% 28%, rgba(192,38,211,0.4), transparent 60%)",
            zIndex: GRUDGEWAR_BOSS_WALKUP.AMBIENT,
          }}
        />
      )}

      <div ref={mountRef} className="absolute inset-0 z-[3]" />

      {/* Boss name plate */}
      <div
        className="absolute left-1/2 -translate-x-1/2 text-center pointer-events-none"
        style={{ top: "12%", zIndex: GRUDGEWAR_BOSS_WALKUP.TEXT }}
      >
        <div
          className="font-cinzel font-bold text-base sm:text-lg"
          style={{
            color: "#c026d3",
            textShadow: "0 2px 12px rgba(192,38,211,0.8), 0 0 20px rgba(192,38,211,0.4)",
          }}
        >
          {cfg.bossName}
        </div>
        <div
          className="text-[10px] font-semibold uppercase tracking-wider"
          style={{ color: "#ef4444", textShadow: "0 1px 6px rgba(0,0,0,0.8)" }}
        >
          {cfg.bossTitle}
        </div>
      </div>

      {!ready && (
        <div
          className="absolute left-1/2 top-[40%] -translate-x-1/2 text-slate-200 text-xs font-cinzel animate-pulse"
          style={{ zIndex: GRUDGEWAR_BOSS_WALKUP.DIALOGUE, textShadow: "0 1px 6px #000" }}
        >
          {status}
        </div>
      )}

      {phase === "walk" && ready && (
        <div
          className="absolute left-1/2 top-[40%] -translate-x-1/2 text-slate-200 text-xs animate-pulse pointer-events-none"
          style={{ zIndex: GRUDGEWAR_BOSS_WALKUP.DIALOGUE, textShadow: "0 1px 6px #000" }}
        >
          Approaching the boss chamber…
        </div>
      )}

      {phase === "confront" && (
        <div
          className="absolute left-1/2 -translate-x-1/2 text-center px-3"
          style={{ top: "36%", zIndex: GRUDGEWAR_BOSS_WALKUP.TEXT }}
        >
          <div
            className="rounded-xl px-5 py-3 backdrop-blur-md max-w-md mx-auto"
            style={{
              background: "rgba(10,10,25,0.9)",
              border: "2px solid #c026d3",
            }}
          >
            <p
              className="text-xs italic mb-3"
              style={{
                color: "#e9d5ff",
                textShadow: "0 1px 6px rgba(192,38,211,0.5)",
              }}
            >
              &ldquo;{cfg.quote}&rdquo;
            </p>
            <button
              type="button"
              onClick={handleChallenge}
              className="font-cinzel font-bold text-sm px-5 py-2 rounded-lg animate-pulse"
              style={{
                background: "linear-gradient(135deg, rgba(239,68,68,0.35), rgba(192,38,211,0.35))",
                border: "2px solid #ef4444",
                color: "#fecaca",
                boxShadow: "0 0 20px rgba(239,68,68,0.35)",
              }}
            >
              CHALLENGE BOSS
            </button>
          </div>
        </div>
      )}

      {(phase === "confront" || phase === "charging") && (
        <button
          type="button"
          onClick={onRetreat}
          className="absolute bottom-3 right-3 text-[10px] px-3 py-1 rounded"
          style={{
            zIndex: GRUDGEWAR_BOSS_WALKUP.SKIP_BUTTON,
            background: "rgba(100,100,100,0.3)",
            border: "1px solid #666",
            color: "#999",
          }}
        >
          Retreat
        </button>
      )}

      {phase === "charging" && (
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-cinzel text-red-300 text-sm tracking-widest pointer-events-none"
          style={{ zIndex: GRUDGEWAR_BOSS_WALKUP.TEXT, textShadow: "0 0 16px #f00" }}
        >
          {status}
        </div>
      )}
    </div>
  );
}
