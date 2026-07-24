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
    xFrac: 0,
    zFrac: -0.32,
    yOff: 0.05,
    facing: 0,
    anim: "idle",
    xPct: 22,
    yPct: 74,
    facing: 0.35,
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
    xPct: 38,
    yPct: 71,
    facing: -0.55,
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
    xPct: 58,
    yPct: 72,
    facing: 0.9,
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

  const raceMult = model3d.scale ?? race.scale ?? 1;
  fitCharacterRootToHeightM(loaded.scene, raceMult, PLAYER_HEIGHT_M);
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

  const anim = "idle";
  controller.play(anim, { loop: true, speed: 1 });
  return { model: loaded, controller, anim };
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
  const [status, setStatus] = useState("Loading Black Tide…");
  const labelsRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState("Loading The Grudge airship…");
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

    (async () => {
      await loadShip();
      if (disposed) return;
      await reloadHeroes(slots);
      if (!disposed) raf = requestAnimationFrame(tick);
    })();
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
        if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount once; heroes reload via slotsKey effect
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      <div className="absolute bottom-3 left-3 right-3 flex flex-wrap gap-2 justify-center pointer-events-none z-10">
        {CREW_STATIONS.map((st, i) => {
          const hero = slots[i];
          const sel = hero && hero.id === selectedId;

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
              className={`pointer-events-auto px-3 py-1.5 rounded-md border text-[10px] font-cinzel uppercase tracking-wider transition ${
                sel
                  ? "border-emerald-400/70 bg-emerald-500/20 text-emerald-100"
                  : "border-amber-700/40 bg-black/55 text-amber-100/80 hover:border-amber-500/50"
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
                    className="w-5 h-5 rounded-full object-cover"
                  />
                  {st.label}: {hero.name}
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
