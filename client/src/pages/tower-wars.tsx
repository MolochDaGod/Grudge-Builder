import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import * as THREE from "three";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Zap, RefreshCw, Users } from "lucide-react";

// ── Constants ─────────────────────────────────────────────────────────────────
const GRID_W = 22;
const GRID_H = 16;
const MAX_WAVES = 15;
const BOSS_EVERY = 5;
const GOLD_TICK_SEC = 3;
const GOLD_TICK_AMOUNT = 12;

// ── Race definitions ──────────────────────────────────────────────────────────
const RACES = {
  human:  { name: "Human",  color: 0xfbbf24, accent: "#fbbf24", emoji: "⚔️",  lore: "Balanced & adaptive",     towers: ["arrow","barricade","cannon"],    unitSpeed: 1.0, goldBonus: 1.2 },
  elf:    { name: "Elf",    color: 0x6ee7b7, accent: "#6ee7b7", emoji: "🌿",  lore: "Swift precision archers",  towers: ["arrow","magic","snare"],         unitSpeed: 1.4, goldBonus: 1.0 },
  dwarf:  { name: "Dwarf",  color: 0xf97316, accent: "#f97316", emoji: "⚒️",  lore: "Masters of artillery",    towers: ["cannon","mortar","fire"],         unitSpeed: 0.7, goldBonus: 1.5 },
  orc:    { name: "Orc",    color: 0x4ade80, accent: "#4ade80", emoji: "🔥",  lore: "Relentless brute force",   towers: ["barricade","cannon","berserker"], unitSpeed: 1.1, goldBonus: 1.1 },
  undead: { name: "Undead", color: 0xa78bfa, accent: "#a78bfa", emoji: "💀",  lore: "Cursed sorcery",           towers: ["magic","poison","curse"],         unitSpeed: 0.9, goldBonus: 1.3 },
  worge:  { name: "Worge",  color: 0x38bdf8, accent: "#38bdf8", emoji: "🐺",  lore: "Pack hunters",             towers: ["snare","magic","berserker"],      unitSpeed: 1.2, goldBonus: 1.0 },
} as const;

// ── Tower types ───────────────────────────────────────────────────────────────
const TOWER_TYPES = {
  arrow:     { name: "Arrow",     cost: 50,  dmg: 12, range: 3.5, rate: 1.2, color: 0xfbbf24, desc: "Fast, single target" },
  magic:     { name: "Magic",     cost: 80,  dmg: 20, range: 4.0, rate: 0.8, color: 0xa78bfa, desc: "Slows on hit" },
  cannon:    { name: "Cannon",    cost: 100, dmg: 40, range: 3.0, rate: 0.5, color: 0x94a3b8, desc: "AoE splash damage" },
  barricade: { name: "Barricade", cost: 40,  dmg: 6,  range: 2.0, rate: 2.0, color: 0x78716c, desc: "Rapid melee strikes" },
  snare:     { name: "Snare",     cost: 60,  dmg: 8,  range: 3.5, rate: 1.5, color: 0x6ee7b7, desc: "Roots target briefly" },
  mortar:    { name: "Mortar",    cost: 120, dmg: 55, range: 5.0, rate: 0.3, color: 0xf97316, desc: "Long range AoE" },
  fire:      { name: "Fire",      cost: 90,  dmg: 28, range: 2.5, rate: 1.0, color: 0xef4444, desc: "Burn damage" },
  poison:    { name: "Poison",    cost: 70,  dmg: 14, range: 3.0, rate: 1.8, color: 0x84cc16, desc: "Weakens target" },
  curse:     { name: "Curse",     cost: 150, dmg: 35, range: 4.5, rate: 0.6, color: 0x7c3aed, desc: "Reduces armor" },
  berserker: { name: "Berserker", cost: 130, dmg: 50, range: 2.5, rate: 0.8, color: 0xdc2626, desc: "Bonus dmg at low HP" },
};

// ── GrudgeOrigins missile sprite mapping per tower type ───────────────────────
const TOWER_MISSILE_SPRITES: Record<string, { sprite: string; impact: string; scale: number }> = {
  arrow:     { sprite: "/sprites/2d-island/missiles/arrow.png",          impact: "/sprites/2d-island/missiles/cannon_explosion.png",             scale: 0.7 },
  magic:     { sprite: "/sprites/2d-island/missiles/normal_spell.png",   impact: "/sprites/2d-island/missiles/exorcism.png",                     scale: 0.6 },
  cannon:    { sprite: "/sprites/2d-island/missiles/cannon.png",         impact: "/sprites/2d-island/missiles/cannon-tower_explosion.png",       scale: 0.5 },
  barricade: { sprite: "/sprites/2d-island/missiles/axe.png",            impact: "/sprites/2d-island/missiles/cannon_explosion.png",             scale: 0.5 },
  snare:     { sprite: "/sprites/2d-island/missiles/rune.png",           impact: "/sprites/2d-island/missiles/green_cross.png",                  scale: 0.5 },
  mortar:    { sprite: "/sprites/2d-island/missiles/catapult_rock.png",  impact: "/sprites/2d-island/missiles/ballista-catapult_impact.png",     scale: 0.8 },
  fire:      { sprite: "/sprites/2d-island/missiles/fireball.png",       impact: "/sprites/2d-island/missiles/explosion.png",                    scale: 0.6 },
  poison:    { sprite: "/sprites/2d-island/missiles/death_and_decay.png",impact: "/sprites/2d-island/missiles/green_cross.png",                  scale: 0.5 },
  curse:     { sprite: "/sprites/2d-island/missiles/touch_of_death.png", impact: "/sprites/2d-island/missiles/exorcism.png",                     scale: 0.7 },
  berserker: { sprite: "/sprites/2d-island/missiles/big_fire.png",       impact: "/sprites/2d-island/missiles/explosion.png",                    scale: 0.7 },
};

// ── Unit types ────────────────────────────────────────────────────────────────
const UNIT_TYPES = [
  { name: "Scout",   hp: 60,   reward: 15,  cost: 40,  speed: 2.0, size: 0.28, color: 0x86efac },
  { name: "Soldier", hp: 150,  reward: 25,  cost: 70,  speed: 1.2, size: 0.35, color: 0xfca5a5 },
  { name: "Knight",  hp: 350,  reward: 50,  cost: 120, speed: 0.9, size: 0.45, color: 0x93c5fd },
  { name: "Giant",   hp: 700,  reward: 90,  cost: 200, speed: 0.6, size: 0.60, color: 0xfcd34d },
  { name: "Dragon",  hp: 1200, reward: 150, cost: 350, speed: 0.8, size: 0.75, color: 0xf472b6 },
];

// ── Map generator ─────────────────────────────────────────────────────────────
function generateMap() {
  const grid: string[][] = Array.from({ length: GRID_H }, () =>
    Array.from({ length: GRID_W }, () => "build")
  );
  const path: { x: number; y: number }[] = [];
  let x = 0, y = Math.floor(GRID_H / 2);
  path.push({ x, y });
  grid[y][x] = "path";
  while (x < GRID_W - 1) {
    const goRight = Math.random() < 0.65;
    let nx = x, ny = y;
    if (goRight) { nx = x + 1; }
    else { ny = Math.max(1, Math.min(GRID_H - 2, y + (Math.random() < 0.5 ? 1 : -1))); }
    if (nx < GRID_W && grid[ny][nx] !== "path") { x = nx; y = ny; }
    else { x = Math.min(GRID_W - 1, x + 1); }
    path.push({ x, y });
    grid[y][x] = "path";
    if (y > 0)          grid[y - 1][x] = "path";
    if (y < GRID_H - 1) grid[y + 1][x] = "path";
  }
  return { grid, path };
}

// ── Tower mesh factory ────────────────────────────────────────────────────────
function makeTowerMesh(type: string, def: (typeof TOWER_TYPES)[keyof typeof TOWER_TYPES], level: number): THREE.Group {
  const group = new THREE.Group();
  const scale = 1 + (level - 1) * 0.12;
  const col   = def.color;
  const bright = Math.min(0xffffff, def.color + 0x181818 * (level - 1));
  let h = 1.2 + (level - 1) * 0.3;
  let bodyGeo: THREE.BufferGeometry;

  switch (type) {
    case "magic": case "curse":
      bodyGeo = new THREE.OctahedronGeometry(0.42 * scale, 0); h = 0.9; break;
    case "cannon": case "mortar":
      bodyGeo = new THREE.CylinderGeometry(0.4 * scale, 0.52 * scale, h * 0.85, 6); break;
    case "barricade":
      bodyGeo = new THREE.BoxGeometry(0.65 * scale, h, 0.65 * scale); break;
    case "fire": case "poison":
      bodyGeo = new THREE.ConeGeometry(0.38 * scale, h, 5); break;
    case "berserker":
      h *= 1.2;
      bodyGeo = new THREE.BoxGeometry(0.58 * scale, h, 0.58 * scale); break;
    default:
      bodyGeo = new THREE.CylinderGeometry(0.24 * scale, 0.34 * scale, h, 8);
  }

  const body = new THREE.Mesh(bodyGeo, new THREE.MeshLambertMaterial({ color: bright }));
  body.position.y = h / 2; body.castShadow = true;
  group.add(body);

  const cap = new THREE.Mesh(
    new THREE.ConeGeometry(0.28 * scale, 0.42, 6),
    new THREE.MeshLambertMaterial({ color: col })
  );
  cap.position.y = h + 0.2; group.add(cap);

  for (let i = 0; i < level - 1; i++) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.36, 0.05, 4, 12),
      new THREE.MeshBasicMaterial({ color: 0xffd700 })
    );
    ring.position.y = 0.28 + i * 0.28; ring.rotation.x = Math.PI / 2;
    group.add(ring);
  }

  const rangeRing = new THREE.Mesh(
    new THREE.RingGeometry(def.range - 0.06, def.range + 0.06, 32),
    new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false })
  );
  rangeRing.rotation.x = -Math.PI / 2; rangeRing.position.y = 0.08;
  group.add(rangeRing);

  return group;
}

// ── Unit mesh factory ──────────────────────────────────────────────────────────
function makeUnitMesh(def: (typeof UNIT_TYPES)[number], isBoss: boolean) {
  const group = new THREE.Group();
  const s = def.size * (isBoss ? 1.9 : 1);
  const col = isBoss ? 0xff4400 : def.color;

  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(s * 0.48, s * 0.7, 4, 8),
    new THREE.MeshLambertMaterial({ color: col })
  );
  body.position.y = s * 0.85; body.castShadow = true; group.add(body);

  if (isBoss) {
    const crown = new THREE.Mesh(
      new THREE.CylinderGeometry(s * 0.55, s * 0.45, s * 0.35, 5),
      new THREE.MeshBasicMaterial({ color: 0xffd700 })
    );
    crown.position.y = s * 1.85; group.add(crown);
  }

  const barWidth = s * 1.5;
  const barBg = new THREE.Mesh(
    new THREE.PlaneGeometry(barWidth, 0.1),
    new THREE.MeshBasicMaterial({ color: 0x111111, side: THREE.DoubleSide, depthTest: false })
  );
  barBg.position.set(0, s * 2.1, 0); barBg.renderOrder = 1; group.add(barBg);

  const barFill = new THREE.Mesh(
    new THREE.PlaneGeometry(barWidth, 0.1),
    new THREE.MeshBasicMaterial({ color: 0x22c55e, side: THREE.DoubleSide, depthTest: false })
  );
  barFill.position.set(0, s * 2.1, 0.01); barFill.renderOrder = 2; group.add(barFill);

  return { group, barFill, barWidth };
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function TowerWarsPage() {
  const [, setLocation] = useLocation();
  const mountRef  = useRef<HTMLDivElement>(null);
  const sceneRef  = useRef<any>({});

  // Increment gameId to start a fresh Three.js scene (avoid teardown on phase change)
  const [gameId, setGameId] = useState(0);

  const phaseRef         = useRef("select");
  const goldRef          = useRef(200);
  const livesRef         = useRef(20);
  const waveRef          = useRef(1);
  const selectedTowerRef = useRef<string | null>(null);
  const selectedRaceRef  = useRef<string | null>(null);
  const setMsgRef        = useRef<(m: string) => void>(() => {});
  const setGoldFnRef     = useRef<(g: number) => void>(() => {});
  const setScoreFnRef    = useRef<(fn: (p: number) => number) => void>(() => {});

  const [view3D, setView3D]               = useState(true);
  const [selectedRace, setSelectedRace]   = useState<string | null>(null);
  const [gamePhase, setGamePhase]         = useState<"select"|"build"|"wave"|"over"|"win">("select");
  const [gold, setGold]                   = useState(200);
  const [lives, setLives]                 = useState(20);
  const [wave, setWave]                   = useState(1);
  const [score, setScore]                 = useState(0);
  const [selectedTower, setSelectedTower] = useState<string | null>(null);
  const [message, setMessage]             = useState("");
  const [enemySent, setEnemySent]         = useState(0);

  const showMsg = (msg: string) => { setMessage(msg); setTimeout(() => setMessage(""), 2600); };

  useEffect(() => { setMsgRef.current   = showMsg; });
  useEffect(() => { setGoldFnRef.current = (g: number) => setGold(g); });
  useEffect(() => { setScoreFnRef.current = setScore; });
  useEffect(() => { selectedTowerRef.current = selectedTower; }, [selectedTower]);
  useEffect(() => { selectedRaceRef.current  = selectedRace;  }, [selectedRace]);

  // ── Three.js setup – only rebuilds on new gameId ──────────────────────────
  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const W = container.clientWidth  || 800;
    const H = container.clientHeight || 580;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(W, H);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0f1e);
    scene.fog = new THREE.FogExp2(0x0a0f1e, 0.028);

    const camera = new THREE.PerspectiveCamera(55, W / H, 0.1, 300);
    camera.position.set(GRID_W / 2, 18, 21);
    camera.lookAt(GRID_W / 2, 0, GRID_H / 2);

    scene.add(new THREE.AmbientLight(0xffffff, 0.45));
    const sun = new THREE.DirectionalLight(0xffd4a0, 1.2);
    sun.position.set(12, 28, 10); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048); scene.add(sun);
    const fill = new THREE.DirectionalLight(0x4060ff, 0.22);
    fill.position.set(-10, 5, -10); scene.add(fill);

    const { grid, path } = generateMap();
    const tileGeo  = new THREE.BoxGeometry(1, 0.14, 1);
    const pathMat  = new THREE.MeshLambertMaterial({ color: 0x5c3d24 });
    const buildMat = new THREE.MeshLambertMaterial({ color: 0x1a3d1a });
    const edgeMat  = new THREE.MeshLambertMaterial({ color: 0x0f2510 });
    const tileObjs: any[][] = [];

    for (let row = 0; row < GRID_H; row++) {
      tileObjs[row] = [];
      for (let col = 0; col < GRID_W; col++) {
        const isPath = grid[row][col] === "path";
        const isEdge = row === 0 || row === GRID_H - 1 || col === 0 || col === GRID_W - 1;
        const tile = new THREE.Mesh(tileGeo, isPath ? pathMat : isEdge ? edgeMat : buildMat);
        tile.position.set(col + 0.5, 0, row + 0.5);
        tile.receiveShadow = true;
        tile.userData = { row, col, isPath, hasTower: false, towerObj: null };
        scene.add(tile);
        tileObjs[row][col] = tile;
        if (isPath) {
          const m = new THREE.Mesh(
            new THREE.BoxGeometry(0.65, 0.02, 0.65),
            new THREE.MeshLambertMaterial({ color: 0x7a5538 })
          );
          m.position.set(col + 0.5, 0.08, row + 0.5); scene.add(m);
        }
      }
    }

    const gh = new THREE.GridHelper(Math.max(GRID_W, GRID_H), Math.max(GRID_W, GRID_H), 0x1a3d1a, 0x1a3d1a);
    gh.position.set(GRID_W / 2, 0.08, GRID_H / 2); scene.add(gh);

    const pillarGeo = new THREE.CylinderGeometry(0.44, 0.44, 2.6, 8);
    const sp = new THREE.Mesh(pillarGeo, new THREE.MeshLambertMaterial({ color: 0x22c55e }));
    sp.position.set(0.5, 1.3, path[0].y + 0.5); scene.add(sp);
    const ep = new THREE.Mesh(pillarGeo, new THREE.MeshLambertMaterial({ color: 0xef4444 }));
    ep.position.set(GRID_W - 0.5, 1.3, path[path.length - 1].y + 0.5); scene.add(ep);

    // Game state
    const towers:      any[] = [];
    const units:       any[] = [];
    const projectiles: any[] = [];
    let goldTick     = 0;
    let spawnQueue:  any[] = [];
    let spawnTimer   = 0;
    let waveComplete = false;
    let waveCooldown = 0;
    let animId:      number;

    // Expose actions to React handlers (no scene rebuild needed)
    sceneRef.current = {
      camera,
      startWaveInternal(waveNum: number) {
        waveComplete = false; waveCooldown = 0; spawnQueue = []; spawnTimer = 0;
        const count  = 5 + waveNum * 2;
        const isBoss = waveNum % BOSS_EVERY === 0;
        const baseUt = UNIT_TYPES[Math.min(Math.floor(waveNum / 3), UNIT_TYPES.length - 1)];
        for (let i = 0; i < count; i++) {
          const isBossUnit = isBoss && i === Math.floor(count / 2);
          spawnQueue.push({
            ...baseUt,
            hp:     baseUt.hp * (1 + waveNum * 0.25) * (isBossUnit ? 8 : 1),
            reward: Math.round(baseUt.reward * (1 + waveNum * 0.12) * (isBossUnit ? 4 : 1)),
            speed:  baseUt.speed * (isBossUnit ? 0.65 : 1),
            isBoss: isBossUnit,
            delay:  i * 1.1,
          });
        }
      },
      upgradeTower(t: any) {
        if (t.level >= 3) { setMsgRef.current("Max level!"); return; }
        const base = TOWER_TYPES[t.type as keyof typeof TOWER_TYPES];
        const cost = Math.floor(base.cost * (0.75 + t.level * 0.5));
        if (goldRef.current < cost) { setMsgRef.current(`Need ${cost}g to upgrade!`); return; }
        goldRef.current -= cost;
        setGoldFnRef.current(goldRef.current);
        t.level++;
        t.def = { ...t.def, dmg: Math.floor(t.def.dmg * 1.55), range: t.def.range * 1.1, rate: t.def.rate * 1.1 };
        scene.remove(t.group);
        const ng = makeTowerMesh(t.type, TOWER_TYPES[t.type as keyof typeof TOWER_TYPES], t.level);
        ng.position.set(t.col + 0.5, 0, t.row + 0.5);
        ng.userData.isTowerGroup = true;
        scene.add(ng); t.group = ng;
        tileObjs[t.row][t.col].userData.towerObj = t;
        setMsgRef.current(`Tower upgraded to level ${t.level}!`);
      },
      sellTower(t: any) {
        const refund = Math.floor(TOWER_TYPES[t.type as keyof typeof TOWER_TYPES].cost * 0.5);
        scene.remove(t.group);
        tileObjs[t.row][t.col].userData.hasTower = false;
        tileObjs[t.row][t.col].userData.towerObj = null;
        towers.splice(towers.indexOf(t), 1);
        goldRef.current += refund; setGoldFnRef.current(goldRef.current);
        setMsgRef.current(`Sold for ${refund}g`);
      },
    };

    // Raycaster
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onCanvasClick = (e: MouseEvent) => {
      const phase = phaseRef.current;
      if (phase !== "build" && phase !== "wave") return;
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
      mouse.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(scene.children, true);
      for (const hit of hits) {
        let obj: THREE.Object3D | null = hit.object;
        while (obj) {
          if (obj.userData.row !== undefined) {
            const ud = obj.userData;
            if (ud.isPath)    { setMsgRef.current("Can't build on the path!"); return; }
            if (ud.hasTower)  { if (ud.towerObj) sceneRef.current.upgradeTower(ud.towerObj); return; }
            const tKey = selectedTowerRef.current;
            if (!tKey) { setMsgRef.current("Select a tower type first!"); return; }
            const tDef = TOWER_TYPES[tKey as keyof typeof TOWER_TYPES];
            if (goldRef.current < tDef.cost) { setMsgRef.current(`Need ${tDef.cost}g!`); return; }
            const group = makeTowerMesh(tKey, tDef, 1);
            group.position.set(ud.col + 0.5, 0, ud.row + 0.5);
            group.userData.isTowerGroup = true;
            scene.add(group);
            const tObj = { group, type: tKey, def: { ...tDef }, row: ud.row, col: ud.col, cx: ud.col + 0.5, cz: ud.row + 0.5, cooldown: 0, kills: 0, level: 1 };
            towers.push(tObj); ud.hasTower = true; ud.towerObj = tObj;
            goldRef.current -= tDef.cost; setGoldFnRef.current(goldRef.current);
            return;
          }
          obj = obj.parent;
        }
        break;
      }
    };
    renderer.domElement.addEventListener("click", onCanvasClick);

    // Spawn
    function spawnUnit(def: any) {
      const start = path[0];
      const { group, barFill, barWidth } = makeUnitMesh(def, !!def.isBoss);
      group.position.set(start.x + 0.5, 0, start.y + 0.5);
      scene.add(group);
      units.push({ group, barFill, barWidth, hp: def.hp, maxHp: def.hp, speed: def.speed, reward: def.reward, pathIdx: 0, dead: false, slowed: 0 });
    }

    // Main loop
    let last = performance.now();
    function loop() {
      animId = requestAnimationFrame(loop);
      const now = performance.now();
      const dt  = Math.min((now - last) / 1000, 0.05);
      last = now;
      const phase = phaseRef.current;
      if (phase === "over" || phase === "win" || phase === "select") { cancelAnimationFrame(animId); return; }

      // Gold tick
      goldTick += dt;
      if (goldTick >= GOLD_TICK_SEC) {
        goldTick = 0;
        const rc    = selectedRaceRef.current;
        const bonus = rc ? RACES[rc as keyof typeof RACES].goldBonus : 1;
        goldRef.current += Math.round(GOLD_TICK_AMOUNT * bonus);
        setGoldFnRef.current(goldRef.current);
      }

      if (phase === "wave") {
        // Spawn queue
        if (spawnQueue.length > 0) {
          spawnTimer += dt;
          while (spawnQueue.length > 0 && spawnTimer >= spawnQueue[0].delay) {
            spawnTimer = 0; spawnUnit({ ...spawnQueue.shift() });
          }
        }

        // Move units
        for (let i = units.length - 1; i >= 0; i--) {
          const u = units[i];
          if (u.dead) { units.splice(i, 1); continue; }
          if (u.slowed > 0) u.slowed -= dt;
          const target = path[u.pathIdx + 1];
          if (!target) {
            u.dead = true; scene.remove(u.group); units.splice(i, 1);
            livesRef.current = Math.max(0, livesRef.current - 1);
            setLives(livesRef.current);
            if (livesRef.current <= 0) { phaseRef.current = "over"; setGamePhase("over"); }
            continue;
          }
          const slowF = u.slowed > 0 ? 0.5 : 1;
          const tx = target.x + 0.5, tz = target.y + 0.5;
          const dx = tx - u.group.position.x, dz = tz - u.group.position.z;
          const dist = Math.sqrt(dx * dx + dz * dz);
          if (dist < 0.12) { u.pathIdx++; }
          else {
            const spd = u.speed * slowF * dt;
            u.group.position.x += (dx / dist) * spd;
            u.group.position.z += (dz / dist) * spd;
            if (dist > 0.05) u.group.rotation.y = Math.atan2(dx, dz);
          }
          const hpR = Math.max(0, u.hp / u.maxHp);
          u.barFill.scale.x = Math.max(0.001, hpR);
          u.barFill.position.x = -(1 - hpR) * (u.barWidth / 2);
          (u.barFill.material as THREE.MeshBasicMaterial).color.setHex(
            hpR > 0.6 ? 0x22c55e : hpR > 0.3 ? 0xfbbf24 : 0xef4444
          );
        }

        // Tower attacks
        for (const t of towers) {
          t.cooldown -= dt;
          if (t.cooldown > 0 || units.length === 0) continue;
          let best: any = null;
          for (const u of units) {
            if (u.dead) continue;
            const dx = u.group.position.x - t.cx, dz = u.group.position.z - t.cz;
            const d = Math.sqrt(dx * dx + dz * dz);
            if (d <= t.def.range && (!best || u.pathIdx > best.u.pathIdx)) best = { u, d };
          }
          if (!best) continue;
          t.cooldown = 1 / t.def.rate;
          best.u.hp -= t.def.dmg;
          if (t.type === "magic" || t.type === "snare")   best.u.slowed = 1.8;
          if (t.type === "cannon" || t.type === "mortar") {
            for (const u of units) {
              if (u.dead) continue;
              const dx = u.group.position.x - best.u.group.position.x;
              const dz = u.group.position.z - best.u.group.position.z;
              if (Math.sqrt(dx * dx + dz * dz) < 1.6) u.hp -= t.def.dmg * 0.45;
            }
          }
          if (best.u.hp <= 0) {
            best.u.dead = true; scene.remove(best.u.group); t.kills++;
            goldRef.current += best.u.reward; setGoldFnRef.current(goldRef.current);
            setScoreFnRef.current(s => s + best.u.reward);
          }
          // Use GrudgeOrigins missile sprite if available, else fallback sphere
          const missileInfo = TOWER_MISSILE_SPRITES[t.type];
          let projObj: THREE.Object3D;
          if (missileInfo) {
            const tex = new THREE.TextureLoader().load(missileInfo.sprite);
            tex.colorSpace = THREE.SRGBColorSpace;
            const spriteMat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
            const sprite = new THREE.Sprite(spriteMat);
            const s = missileInfo.scale;
            sprite.scale.set(s, s, s);
            projObj = sprite;
          } else {
            projObj = new THREE.Mesh(
              new THREE.SphereGeometry(0.11, 4, 4),
              new THREE.MeshBasicMaterial({ color: t.def.color })
            );
          }
          projObj.position.set(t.cx, 1.6, t.cz); scene.add(projObj);
          projectiles.push({
            mesh: projObj,
            startPos: projObj.position.clone(),
            target: best.u.group,
            life: 0.3,
            maxLife: 0.3,
            towerType: t.type,
          });
        }

        // Projectiles
        for (let i = projectiles.length - 1; i >= 0; i--) {
          const p = projectiles[i];
          p.life -= dt;
          if (p.life <= 0 || !p.target.parent) {
            scene.remove(p.mesh);
            // Spawn impact sprite on arrival
            const impactInfo = TOWER_MISSILE_SPRITES[p.towerType];
            if (impactInfo && p.life <= 0) {
              const impTex = new THREE.TextureLoader().load(impactInfo.impact);
              impTex.colorSpace = THREE.SRGBColorSpace;
              const impMat = new THREE.SpriteMaterial({ map: impTex, transparent: true, depthTest: false, opacity: 0.9 });
              const impSprite = new THREE.Sprite(impMat);
              const impScale = impactInfo.scale * 1.5;
              impSprite.scale.set(impScale, impScale, impScale);
              impSprite.position.copy(p.mesh.position);
              scene.add(impSprite);
              // Fade out and remove after 0.4s
              const impStart = performance.now();
              const fadeImpact = () => {
                const elapsed = (performance.now() - impStart) / 400;
                if (elapsed >= 1) { scene.remove(impSprite); impMat.dispose(); impTex.dispose(); return; }
                impMat.opacity = 0.9 * (1 - elapsed);
                impSprite.scale.setScalar(impScale * (1 + elapsed * 0.5));
                requestAnimationFrame(fadeImpact);
              };
              requestAnimationFrame(fadeImpact);
            }
            projectiles.splice(i, 1);
            continue;
          }
          const t = 1 - p.life / p.maxLife;
          p.mesh.position.lerpVectors(p.startPos, p.target.position, t);
          p.mesh.position.y += Math.sin(t * Math.PI) * 0.55;
          // Rotate sprite to face direction of travel
          if (p.mesh instanceof THREE.Sprite) {
            const dx = p.target.position.x - p.startPos.x;
            const dz = p.target.position.z - p.startPos.z;
            p.mesh.material.rotation = Math.atan2(dx, dz);
          }
        }

        // Wave complete
        if (!waveComplete && units.length === 0 && spawnQueue.length === 0) { waveComplete = true; waveCooldown = 0; }
        if (waveComplete) {
          waveCooldown += dt;
          if (waveCooldown > 1.6) {
            waveComplete = false;
            const next = waveRef.current + 1;
            if (next > MAX_WAVES) { phaseRef.current = "win"; setGamePhase("win"); }
            else {
              waveRef.current = next; setWave(next);
              phaseRef.current = "build"; setGamePhase("build");
              setMsgRef.current(`Wave ${next - 1} cleared! Prepare for wave ${next}`);
            }
          }
        }
      }

      camera.position.y = 18 + Math.sin(now * 0.00025) * 0.12;
      renderer.render(scene, camera);
    }
    loop();

    const onResize = () => {
      const w = container.clientWidth, h = container.clientHeight;
      renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", onResize);
      renderer.domElement.removeEventListener("click", onCanvasClick);
      renderer.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
      sceneRef.current = {};
    };
  }, [gameId]);

  // Update phaseRef + trigger wave spawning without scene teardown
  useEffect(() => {
    phaseRef.current = gamePhase;
    if (gamePhase === "wave" && sceneRef.current.startWaveInternal) {
      sceneRef.current.startWaveInternal(waveRef.current);
    }
  }, [gamePhase]);

  // Camera toggle
  useEffect(() => {
    if (!sceneRef.current.camera) return;
    const cam = sceneRef.current.camera as THREE.PerspectiveCamera;
    if (view3D) { cam.position.set(GRID_W / 2, 18, 21); }
    else        { cam.position.set(GRID_W / 2, 36, GRID_H / 2); }
    cam.lookAt(GRID_W / 2, 0, GRID_H / 2);
  }, [view3D]);

  const startGame = (raceKey: string) => {
    setSelectedRace(raceKey); selectedRaceRef.current = raceKey;
    goldRef.current = 200; livesRef.current = 20; waveRef.current = 1;
    setGold(200); setLives(20); setWave(1); setScore(0); setEnemySent(0);
    setSelectedTower(null); phaseRef.current = "build";
    setGamePhase("build");
    setGameId(id => id + 1);
  };

  const startWave = () => { phaseRef.current = "wave"; setGamePhase("wave"); };

  const sendUnit = (unitIdx: number) => {
    const ut = UNIT_TYPES[Math.min(unitIdx, UNIT_TYPES.length - 1)];
    if (gold < ut.cost) { showMsg(`Need ${ut.cost}g to send ${ut.name}!`); return; }
    goldRef.current -= ut.cost; setGold(goldRef.current);
    setEnemySent(e => e + 1);
    setTimeout(() => {
      const bounce = Math.round(ut.reward * 0.4);
      goldRef.current += bounce; setGold(goldRef.current);
    }, 3500);
    showMsg(`${ut.name} sent! +${Math.round(ut.reward * 0.4)}g incoming`);
  };

  const race        = selectedRace ? RACES[selectedRace as keyof typeof RACES] : null;
  const availTowers = race ? race.towers.map(k => ({ key: k, ...TOWER_TYPES[k as keyof typeof TOWER_TYPES] })) : [];
  const isBossWave  = wave % BOSS_EVERY === 0;

  // Race select
  if (gamePhase === "select") return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="border-b border-border/40 p-4 flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => setLocation("/home")}><ArrowLeft className="w-4 h-4 mr-2" /> Back</Button>
        <h1 className="font-cinzel font-bold text-amber-400 text-xl">TOWER WARS</h1>
        <Badge className="bg-amber-900/40 text-amber-300 text-xs">WC3-Style PvP Tower Defense</Badge>
      </header>
      <div className="flex-1 flex flex-col items-center justify-center p-8 gap-8">
        <div className="text-center space-y-2">
          <h2 className="font-cinzel text-3xl font-bold">Choose Your Race</h2>
          <p className="text-muted-foreground text-sm">Each race unlocks unique towers and combat bonuses</p>
          <div className="flex flex-wrap gap-5 justify-center text-xs text-muted-foreground/70 mt-1">
            <span>🏗️ Build towers to stop waves</span><span>⚔️ Send units to the opponent</span>
            <span>💰 Earn gold each tick</span><span>👑 Survive {MAX_WAVES} waves to win</span>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-2xl w-full">
          {Object.entries(RACES).map(([key, r]) => (
            <button key={key} onClick={() => startGame(key)}
              className="rounded-xl border border-border/40 bg-card/60 hover:bg-muted/20 hover:border-amber-600/50 p-5 text-left transition-all hover:scale-[1.02] group cursor-pointer">
              <div className="text-4xl mb-3">{r.emoji}</div>
              <div className="font-cinzel font-bold mb-1 group-hover:text-amber-300 transition-colors">{r.name}</div>
              <div className="text-xs text-muted-foreground/60 italic mb-3">{r.lore}</div>
              <div className="text-xs text-muted-foreground/70 mb-2">Towers: {r.towers.join(", ")}</div>
              <div className="flex gap-2 flex-wrap">
                <span className="text-xs px-1.5 py-0.5 rounded bg-muted/40 text-muted-foreground">Spd ×{r.unitSpeed}</span>
                <span className="text-xs px-1.5 py-0.5 rounded bg-amber-900/30 text-amber-400">Gold ×{r.goldBonus}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  // Game over
  if (gamePhase === "over") return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center p-10 rounded-2xl border border-red-700/40 bg-card/80 max-w-sm shadow-2xl">
        <div className="text-6xl mb-4">💀</div>
        <h2 className="font-cinzel text-3xl font-bold text-red-400 mb-2">DEFEATED</h2>
        <p className="text-muted-foreground mb-1">Fell on wave {wave} · Score {score}</p>
        <p className="text-xs text-muted-foreground/50 mb-8">Your base was overwhelmed</p>
        <div className="flex gap-3 justify-center">
          <Button onClick={() => { phaseRef.current = "select"; setGamePhase("select"); setSelectedRace(null); }}><RefreshCw className="w-4 h-4 mr-2" /> Play Again</Button>
          <Button variant="outline" onClick={() => setLocation("/home")}><ArrowLeft className="w-4 h-4 mr-2" /> Home</Button>
        </div>
      </div>
    </div>
  );

  // Victory
  if (gamePhase === "win") return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center p-10 rounded-2xl border border-amber-600/40 bg-card/80 max-w-sm shadow-2xl">
        <div className="text-6xl mb-4">🏆</div>
        <h2 className="font-cinzel text-3xl font-bold text-amber-400 mb-2">VICTORY!</h2>
        <p className="text-muted-foreground mb-1">All {MAX_WAVES} waves defeated</p>
        <p className="text-amber-300 font-bold text-lg mb-8">Score: {score}</p>
        <div className="flex gap-3 justify-center">
          <Button className="bg-amber-700 hover:bg-amber-600" onClick={() => { phaseRef.current = "select"; setGamePhase("select"); setSelectedRace(null); }}><RefreshCw className="w-4 h-4 mr-2" /> Play Again</Button>
          <Button variant="outline" onClick={() => setLocation("/home")}><ArrowLeft className="w-4 h-4 mr-2" /> Home</Button>
        </div>
      </div>
    </div>
  );

  // Main game
  return (
    <div className="h-screen bg-background text-foreground flex flex-col overflow-hidden">
      <header className="flex items-center justify-between px-4 py-2 border-b border-border/40 bg-background/95 z-10 shrink-0">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-7" onClick={() => { phaseRef.current = "select"; setGamePhase("select"); setSelectedRace(null); }}><ArrowLeft className="w-3.5 h-3.5" /></Button>
          <span className="font-cinzel text-sm font-bold text-amber-400">TOWER WARS</span>
          {race && <Badge style={{ borderColor: race.accent, color: race.accent }} variant="outline" className="text-xs">{race.name} {race.emoji}</Badge>}
          {isBossWave && gamePhase === "wave" && <Badge className="bg-red-900/60 text-red-300 text-xs animate-pulse">⚠️ BOSS WAVE</Badge>}
        </div>
        <div className="flex items-center gap-4 text-sm font-mono">
          <span className="text-amber-400 font-bold">💰 {gold}</span>
          <span className={`font-bold ${lives <= 5 ? "text-red-400 animate-pulse" : "text-rose-400"}`}>❤️ {lives}</span>
          <span className="text-blue-400 font-bold">🌊 {wave}/{MAX_WAVES}</span>
          <span className="text-emerald-400 font-bold">⭐ {score}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setView3D(v => !v)}>{view3D ? "⬆ 2D" : "🎲 3D"}</Button>
          {gamePhase === "build" && (
            <Button size="sm" className="h-7 text-xs bg-green-700 hover:bg-green-600" onClick={startWave}><Zap className="w-3 h-3 mr-1" /> Wave {wave}</Button>
          )}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div ref={mountRef} className="flex-1 relative bg-slate-950 cursor-crosshair" />

        <div className="w-56 border-l border-border/40 bg-card/30 flex flex-col overflow-y-auto text-xs shrink-0">
          <div className="p-3 border-b border-border/20">
            <p className="font-cinzel font-bold text-muted-foreground uppercase tracking-widest mb-1 text-[10px]">Build Tower</p>
            <p className="text-muted-foreground/45 text-[10px] mb-2">Click tile to place · Click tower to upgrade</p>
            <div className="space-y-1.5">
              {availTowers.map(t => (
                <button key={t.key}
                  onClick={() => setSelectedTower(selectedTower === t.key ? null : t.key)}
                  className={`w-full text-left px-2.5 py-2 rounded-lg border transition-all ${selectedTower === t.key ? "border-amber-500/70 bg-amber-900/25 text-amber-300" : "border-border/30 hover:border-border/60 text-muted-foreground hover:text-foreground"} ${gold < t.cost ? "opacity-35" : ""}`}>
                  <div className="flex justify-between"><span className="font-medium">{t.name}</span><span className="text-amber-400">{t.cost}g</span></div>
                  <div className="text-muted-foreground/55 text-[10px] mt-0.5">{t.desc}</div>
                  <div className="text-muted-foreground/40 text-[10px]">dmg {t.dmg} · rng {t.range} · {t.rate}/s</div>
                </button>
              ))}
            </div>
          </div>

          <div className="p-3 border-b border-border/20">
            <p className="font-cinzel font-bold text-muted-foreground uppercase tracking-widest mb-1 text-[10px]"><Users className="w-3 h-3 inline mr-1" />Send Units</p>
            <p className="text-muted-foreground/45 text-[10px] mb-2">Spend gold, earn % back in 3s</p>
            <div className="space-y-1">
              {UNIT_TYPES.slice(0, 4).map((ut, i) => (
                <button key={i} onClick={() => sendUnit(i)}
                  className={`w-full text-left px-2 py-1.5 rounded border border-border/30 transition-all ${gold < ut.cost ? "opacity-30 cursor-not-allowed" : "hover:border-border/60 hover:bg-muted/20"}`}>
                  <div className="flex justify-between"><span className="font-medium">{ut.name}</span><span className="text-rose-400">{ut.cost}g</span></div>
                  <div className="text-muted-foreground/45 text-[10px]">HP {ut.hp} · reward {ut.reward}g</div>
                </button>
              ))}
            </div>
            {enemySent > 0 && <p className="mt-2 text-center text-muted-foreground/40 text-[10px]">{enemySent} units sent</p>}
          </div>

          <div className="p-3">
            <p className="font-cinzel font-bold text-muted-foreground uppercase tracking-widest mb-2 text-[10px]">Legend</p>
            <div className="space-y-1.5 text-[10px] text-muted-foreground/55">
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500 inline-block shrink-0" />Enemy spawn</div>
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500  inline-block shrink-0" />Your base</div>
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded  bg-green-800 inline-block shrink-0" />Buildable tile</div>
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded  bg-yellow-600 inline-block shrink-0" />Gold ring = upgrade lvl</div>
            </div>
            {isBossWave && <div className="mt-3 p-2 rounded bg-red-950/40 border border-red-800/30 text-[10px] text-red-400">⚠️ Boss unit this wave — extra HP and gold</div>}
          </div>
        </div>
      </div>

      <div className="border-t border-border/20 px-4 py-1.5 bg-background/90 flex items-center justify-between text-xs text-muted-foreground shrink-0">
        <span>
          {gamePhase === "build"
            ? selectedTower ? `Placing: ${TOWER_TYPES[selectedTower as keyof typeof TOWER_TYPES]?.name} — click a green tile` : "Select a tower then click a green tile"
            : "⚔️ Wave in progress — towers fire automatically"}
        </span>
        {message && <span className="text-amber-400 font-semibold animate-pulse ml-4">{message}</span>}
      </div>
    </div>
  );
}
