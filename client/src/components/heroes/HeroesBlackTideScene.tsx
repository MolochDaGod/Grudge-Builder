/**
 * HeroesBlackTideScene — Warlords /heroes 3D roster.
 *
 * Clear-sky pirate galleon ("Black Tide" remake) with up to 4 crew stations:
 *   0 helm/wheel · 1 large cannons · 2 small cannons · 3 crow-nest rope
 *
 * Characters load via grudge6 race GLB + equipment (same path as play).
 */
import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import type { Character } from "@/lib/characterManager";
import { resolveGameAssetPath } from "@/lib/gameAssetPath";
import { loadGltfCached } from "@/lib/three/SharedGltfPipeline";
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
import { SHIP_MODEL_PATHS } from "@/game/sailing/ShipPrefabs";
import { getRacePortrait } from "@/lib/artAssets";

export type CrewStationId = "wheel" | "large_cannon" | "small_cannon" | "crow_rope";

export interface CrewStation {
  id: CrewStationId;
  label: string;
  /** Local offsets as fractions of ship length (z) / beam (x) after fit */
  xFrac: number;
  zFrac: number;
  /** Y on deck (added to deckY) */
  yOff: number;
  /** Facing yaw (radians), 0 = +Z */
  facing: number;
  anim: string;
  role: string;
}

/** Four stations — clear Black Tide crew placement */
export const CREW_STATIONS: CrewStation[] = [
  {
    id: "wheel",
    label: "Helm",
    xFrac: 0,
    zFrac: -0.32,
    yOff: 0.05,
    facing: 0,
    anim: "idle",
    role: "At the wheel",
  },
  {
    id: "large_cannon",
    label: "Main battery",
    xFrac: -0.38,
    zFrac: 0.02,
    yOff: 0.05,
    facing: Math.PI / 2,
    anim: "idle",
    role: "Large cannons",
  },
  {
    id: "small_cannon",
    label: "Fore guns",
    xFrac: 0.36,
    zFrac: 0.28,
    yOff: 0.05,
    facing: -Math.PI / 2,
    anim: "idle",
    role: "Smaller cannons",
  },
  {
    id: "crow_rope",
    label: "Crow's line",
    xFrac: 0.12,
    zFrac: 0.08,
    yOff: 0.05,
    facing: Math.PI * 0.15,
    anim: "idle",
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
  model: LoadedModel | null;
  controller: AnimationController | null;
  marker: THREE.Group;
  ring: THREE.Mesh;
}

const SHIP_TARGET_LEN_M = 26;

function makeOcean(scene: THREE.Scene) {
  const geo = new THREE.PlaneGeometry(400, 400, 64, 64);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x1a6a8a,
    roughness: 0.35,
    metalness: 0.15,
    transparent: true,
    opacity: 0.95,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = -0.15;
  mesh.receiveShadow = true;
  scene.add(mesh);

  // Gentle foam ring around ship
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(14, 22, 64),
    new THREE.MeshBasicMaterial({
      color: 0xa8d8e8,
      transparent: true,
      opacity: 0.18,
      side: THREE.DoubleSide,
    }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.02;
  scene.add(ring);
  return mesh;
}

function makeClearSky(scene: THREE.Scene) {
  scene.background = new THREE.Color(0x87c4e8);
  scene.fog = new THREE.Fog(0xa8d4e8, 40, 180);

  const ambient = new THREE.AmbientLight(0xfff6e8, 0.55);
  scene.add(ambient);
  const hemi = new THREE.HemisphereLight(0xb8dcf0, 0x3a5a3a, 0.65);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xfff2d0, 1.45);
  sun.position.set(18, 32, 12);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 80;
  sun.shadow.camera.left = -25;
  sun.shadow.camera.right = 25;
  sun.shadow.camera.top = 25;
  sun.shadow.camera.bottom = -25;
  sun.shadow.bias = -0.0003;
  scene.add(sun);

  // Soft fill from sea
  const fill = new THREE.DirectionalLight(0x88b8d8, 0.35);
  fill.position.set(-12, 8, -10);
  scene.add(fill);
}

function makeStationMarker(label: string): THREE.Group {
  const g = new THREE.Group();
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.45, 0.58, 32),
    new THREE.MeshBasicMaterial({
      color: 0xc9950a,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
    }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.04;
  g.add(ring);

  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, 256, 64);
  ctx.fillStyle = "rgba(10,8,4,0.72)";
  ctx.fillRect(8, 8, 240, 48);
  ctx.font = "bold 22px Cinzel, serif";
  ctx.fillStyle = "#e8c547";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, 128, 34);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }),
  );
  sprite.scale.set(2.4, 0.6, 1);
  sprite.position.y = 2.6;
  g.add(sprite);
  g.userData.ring = ring;
  return g;
}

/** Procedural wheel + cannon + rope props so stations read even if GLB is plain */
function makeDeckProps(deckY: number, halfL: number, halfB: number): THREE.Group {
  const props = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.85 });
  const iron = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, metalness: 0.7, roughness: 0.4 });
  const ropeMat = new THREE.MeshStandardMaterial({ color: 0xc4a574, roughness: 0.9 });

  // Ship's wheel (aft)
  const wheel = new THREE.Group();
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.05, 8, 24), wood);
  rim.rotation.x = Math.PI / 2;
  wheel.add(rim);
  for (let i = 0; i < 8; i++) {
    const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.85, 6), wood);
    spoke.rotation.z = (i / 8) * Math.PI;
    wheel.add(spoke);
  }
  wheel.position.set(0, deckY + 1.1, -halfL * 0.32);
  props.add(wheel);

  // Large cannons mid port
  const big = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 1.6, 10), iron);
  big.rotation.z = Math.PI / 2;
  big.position.set(-halfB * 0.85, deckY + 0.55, halfL * 0.02);
  props.add(big);
  const big2 = big.clone();
  big2.position.z += 1.1;
  props.add(big2);

  // Smaller cannons fore starboard
  const small = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 1.1, 8), iron);
  small.rotation.z = Math.PI / 2;
  small.position.set(halfB * 0.82, deckY + 0.45, halfL * 0.28);
  props.add(small);
  const small2 = small.clone();
  small2.position.z += 0.85;
  props.add(small2);

  // Rope to crow's nest (mast line)
  const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, halfL * 0.55, 6), ropeMat);
  rope.position.set(halfB * 0.12, deckY + halfL * 0.28, halfL * 0.08);
  rope.rotation.x = -0.12;
  props.add(rope);
  // Crow's nest platform
  const nest = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.12, 12), wood);
  nest.position.set(0, deckY + halfL * 0.52, halfL * 0.05);
  props.add(nest);
  // Mast
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, halfL * 0.7, 8), wood);
  mast.position.set(0, deckY + halfL * 0.35, halfL * 0.05);
  props.add(mast);

  return props;
}

async function loadHeroRoot(
  hero: Character,
): Promise<{ model: LoadedModel; controller: AnimationController; anim: string }> {
  const raceKey = normalizeRaceId(hero.raceId || "human");
  const race = RACE_GRUDGE6[raceKey] ?? RACE_GRUDGE6.human;
  const path = resolveRaceCdnUrl(raceKey);
  const loaded = await loadCharacterModel(path);

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

  const raceMult = model3d.scale ?? race.scale ?? 1;
  fitCharacterRootToHeightM(loaded.scene, raceMult, PLAYER_HEIGHT_M);

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

  const anim = "idle";
  controller.play(anim, { loop: true, speed: 1 });
  return { model: loaded, controller, anim };
}

export default function HeroesBlackTideScene({
  slots,
  selectedId,
  onSelectSlot,
  className = "",
}: HeroesBlackTideSceneProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState("Loading Black Tide…");
  const [ready, setReady] = useState(false);
  const runRef = useRef<{
    dispose: () => void;
    setSelection: (id: string | null) => void;
    reloadHeroes: (slots: (Character | null)[]) => Promise<void>;
  } | null>(null);

  const slotsKey = slots.map((s) => (s ? s.id + ":" + (s.level || 0) : "empty")).join("|");

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;
    let disposed = false;

    const w0 = el.clientWidth || 800;
    const h0 = el.clientHeight || 480;

    const scene = new THREE.Scene();
    makeClearSky(scene);
    makeOcean(scene);

    const camera = new THREE.PerspectiveCamera(42, w0 / h0, 0.1, 300);
    camera.position.set(14, 9, 16);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
    renderer.setSize(w0, h0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    el.innerHTML = "";
    el.appendChild(renderer.domElement);

    const clock = new THREE.Clock();
    let orbit = 0.35;
    const lookAt = new THREE.Vector3(0, 2.2, 0);

    const shipRoot = new THREE.Group();
    scene.add(shipRoot);

    const slotRuntimes: SlotRuntime[] = [];
    let halfL = 12;
    let halfB = 3.5;
    let deckY = 2.0;

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    function placeStations() {
      // clear old markers
      slotRuntimes.forEach((s) => {
        if (s.marker.parent) s.marker.parent.remove(s.marker);
        if (s.root?.parent) s.root.parent.remove(s.root);
        s.controller?.dispose();
      });
      slotRuntimes.length = 0;

      CREW_STATIONS.forEach((st, index) => {
        const marker = makeStationMarker(`Slot ${index + 1} · ${st.label}`);
        marker.position.set(st.xFrac * halfB * 2, deckY + st.yOff, st.zFrac * halfL * 2);
        marker.userData.slotIndex = index;
        shipRoot.add(marker);
        slotRuntimes.push({
          index,
          heroId: null,
          root: null,
          model: null,
          controller: null,
          marker,
          ring: marker.userData.ring as THREE.Mesh,
        });
      });
    }

    async function loadShip() {
      setStatus("Loading Black Tide hull…");
      const url = resolveGameAssetPath(SHIP_MODEL_PATHS.pirateLarge);
      try {
        const gltf = await loadGltfCached(url);
        if (disposed) return;
        const ship = gltf.scene.clone(true);
        ship.traverse((o) => {
          const m = o as THREE.Mesh;
          if (m.isMesh) {
            m.castShadow = true;
            m.receiveShadow = true;
          }
        });
        // Fit to SI length
        ship.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(ship);
        const size = box.getSize(new THREE.Vector3());
        const long = Math.max(size.x, size.z, 1);
        const s = SHIP_TARGET_LEN_M / long;
        ship.scale.setScalar(s);
        ship.updateMatrixWorld(true);
        const box2 = new THREE.Box3().setFromObject(ship);
        ship.position.y -= box2.min.y; // keel to waterline
        // Center XZ
        const c = box2.getCenter(new THREE.Vector3());
        ship.position.x -= c.x;
        ship.position.z -= c.z;
        shipRoot.add(ship);

        const box3 = new THREE.Box3().setFromObject(shipRoot);
        const size3 = box3.getSize(new THREE.Vector3());
        halfL = size3.z / 2;
        halfB = size3.x / 2;
        deckY = box3.min.y + size3.y * 0.38;

        shipRoot.add(makeDeckProps(deckY, halfL, halfB));
        placeStations();
        setStatus("Black Tide ready — loading crew…");
      } catch (err) {
        console.warn("[BlackTide] ship GLB failed, procedural deck only", err);
        // Procedural hull fallback
        const hull = new THREE.Mesh(
          new THREE.BoxGeometry(7, 2.2, 22),
          new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.85 }),
        );
        hull.position.y = 1.1;
        hull.castShadow = true;
        hull.receiveShadow = true;
        shipRoot.add(hull);
        const deck = new THREE.Mesh(
          new THREE.BoxGeometry(6.5, 0.15, 20),
          new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.9 }),
        );
        deck.position.y = 2.2;
        deck.receiveShadow = true;
        shipRoot.add(deck);
        halfL = 11;
        halfB = 3.2;
        deckY = 2.25;
        shipRoot.add(makeDeckProps(deckY, halfL, halfB));
        placeStations();
        setStatus("Black Tide (fallback hull) — loading crew…");
      }
    }

    async function reloadHeroes(nextSlots: (Character | null)[]) {
      if (disposed) return;
      for (let i = 0; i < CREW_STATIONS.length; i++) {
        const rt = slotRuntimes[i];
        if (!rt) continue;
        const hero = nextSlots[i] ?? null;
        const hid = hero?.id ?? null;

        // Clear previous hero
        if (rt.root) {
          shipRoot.remove(rt.root);
          rt.controller?.dispose();
          rt.root = null;
          rt.model = null;
          rt.controller = null;
        }
        rt.heroId = hid;
        rt.marker.visible = !hero;

        if (!hero) continue;
        try {
          setStatus(`Loading crew ${i + 1}: ${hero.name}…`);
          const { model, controller } = await loadHeroRoot(hero);
          if (disposed) {
            controller.dispose();
            return;
          }
          const st = CREW_STATIONS[i];
          const g = new THREE.Group();
          g.add(model.scene);
          g.position.set(st.xFrac * halfB * 2, deckY + st.yOff, st.zFrac * halfL * 2);
          g.rotation.y = st.facing;
          // Ground feet: model already fit; slight plant
          g.userData.heroId = hero.id;
          g.userData.slotIndex = i;
          shipRoot.add(g);
          rt.root = g;
          rt.model = model;
          rt.controller = controller;
          rt.marker.visible = false;
        } catch (e) {
          console.error(`[BlackTide] hero slot ${i} failed`, e);
        }
      }
      if (!disposed) {
        setStatus("");
        setReady(true);
      }
    }

    function setSelection(id: string | null) {
      slotRuntimes.forEach((rt) => {
        const ring = rt.ring;
        if (!ring) return;
        const mat = ring.material as THREE.MeshBasicMaterial;
        const isSel =
          (id && rt.heroId === id) ||
          (id == null && false);
        mat.color.setHex(isSel ? 0x4ade80 : 0xc9950a);
        mat.opacity = isSel ? 0.9 : 0.45;
        if (rt.root) {
          rt.root.scale.setScalar(isSel ? 1.04 : 1);
        }
      });
    }

    const onClick = (ev: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const targets: THREE.Object3D[] = [];
      slotRuntimes.forEach((rt) => {
        if (rt.root) targets.push(rt.root);
        targets.push(rt.marker);
      });
      const hits = raycaster.intersectObjects(targets, true);
      if (!hits.length) return;
      let obj: THREE.Object3D | null = hits[0].object;
      while (obj) {
        if (typeof obj.userData.slotIndex === "number") {
          onSelectSlot(obj.userData.slotIndex);
          return;
        }
        obj = obj.parent;
      }
    };
    renderer.domElement.addEventListener("click", onClick);

    const onResize = () => {
      if (!el) return;
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
      orbit += dt * 0.12;
      const r = 18;
      camera.position.x = Math.sin(orbit) * r;
      camera.position.z = Math.cos(orbit) * r;
      camera.position.y = 8 + Math.sin(orbit * 0.5) * 1.2;
      camera.lookAt(lookAt);

      // Gentle ship sway
      shipRoot.rotation.z = Math.sin(clock.elapsedTime * 0.6) * 0.02;
      shipRoot.rotation.x = Math.sin(clock.elapsedTime * 0.45) * 0.015;
      shipRoot.position.y = Math.sin(clock.elapsedTime * 0.7) * 0.08;

      slotRuntimes.forEach((rt) => rt.controller?.update(dt));
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };

    (async () => {
      await loadShip();
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
        if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
      },
      setSelection,
      reloadHeroes,
    };

    return () => {
      runRef.current?.dispose();
      runRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount once; heroes reload via slotsKey effect
  }, []);

  useEffect(() => {
    runRef.current?.setSelection(selectedId);
  }, [selectedId]);

  useEffect(() => {
    void runRef.current?.reloadHeroes(slots);
  }, [slotsKey]);

  return (
    <div className={`relative w-full h-full min-h-[320px] ${className}`}>
      <div ref={mountRef} className="absolute inset-0 bg-sky-900/40" />
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="px-4 py-2 rounded-md bg-black/60 border border-amber-700/40 text-amber-100/90 text-sm font-cinzel tracking-wider">
            {status || "Preparing crew…"}
          </div>
        </div>
      )}
      <div className="absolute bottom-3 left-3 right-3 flex flex-wrap gap-2 justify-center pointer-events-none z-10">
        {CREW_STATIONS.map((st, i) => {
          const hero = slots[i];
          const sel = hero && hero.id === selectedId;
          return (
            <button
              key={st.id}
              type="button"
              onClick={() => onSelectSlot(i)}
              className={`pointer-events-auto px-3 py-1.5 rounded-md border text-[10px] font-cinzel uppercase tracking-wider transition ${
                sel
                  ? "border-emerald-400/70 bg-emerald-500/20 text-emerald-100"
                  : "border-amber-700/40 bg-black/55 text-amber-100/80 hover:border-amber-500/50"
              }`}
            >
              {hero ? (
                <span className="inline-flex items-center gap-1.5">
                  <img
                    src={hero.avatarUrl || getRacePortrait(hero.raceId)}
                    alt=""
                    className="w-5 h-5 rounded-full object-cover"
                  />
                  {st.label}: {hero.name}
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
