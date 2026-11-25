/**
 * Cinema Grudge6 RTS-toon load path — SSOT for intro cast.
 *
 * HARD RULES for mages:
 *  - Kit is SI metres — authored ~2 m human. Do NOT run aesthetic height-fit systems.
 *  - Equip = mesh visibility only (body/arms/legs/head A). Never non-uniform child scale.
 *  - Only unit-decade fix if classic 100× (cm-as-m). Then plant feet. Done.
 *  - 1 unit = 1 m.
 */
import * as THREE from 'three';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { loadCharacterModel, loadBakedAnimationClip } from '@/lib/modelLoader';
import {
  Grudge6EquipmentManager,
  applyModel3dToEquipment,
} from '@/lib/grudge6Equipment';
import { applyGrudge6RaceTextures } from '@/lib/grudge6Textures';
import { ensureCharacterTextureColorSpace } from '@/lib/characterAppearance';
import {
  RACE_GRUDGE6,
  defaultModel3d,
  resolveRaceCdnUrl,
} from '@shared/fleet';
import {
  measureCharacterWorldHeight,
  measureObjectWorldHeight,
  unitDecadeFactor,
  fitCharacterRootToHeightM,
  assertHeroSiHeight,
} from '@/island3d/zoneWorldScale';
import { bip001ClipUrls } from '@/lib/animation/bip001DrcAnims';
import type { CinemaAnimDirector } from './CinemaAnimDirector';

/**
 * Cinema human yardstick — SSOT CIN_HUMAN_M = 1.8 m (grudge-world-scale).
 * Deck cast is orc (CINEMA_ORC_M = 2.2); do not inflate human for "camera readability".
 */
export const CINEMA_HUMAN_M = 1.8;

/** SI fit non-character props (ship, levi, island) — never hero-height. */
export function fitPropSpanM(
  obj: THREE.Object3D,
  targetSpanM: number,
  axis: 'max' | 'x' | 'y' | 'z' | 'xz' = 'max',
): { measured: number; scale: number; decade: number } {
  // Always start from uniform scale — non-uniform parents stretch skinned kits
  const u0 = (Math.abs(obj.scale.x) + Math.abs(obj.scale.y) + Math.abs(obj.scale.z)) / 3 || 1;
  obj.scale.setScalar(u0);

  obj.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(obj);
  const size = box.getSize(new THREE.Vector3());
  let measured =
    axis === 'x'
      ? size.x
      : axis === 'y'
        ? size.y
        : axis === 'z'
          ? size.z
          : axis === 'xz'
            ? Math.max(size.x, size.z)
            : Math.max(size.x, size.y, size.z);
  if (!(measured > 1e-6)) measured = 1;

  // Fix classic 100× on raw props before aesthetic fit
  const decade = unitDecadeFactor(measured, targetSpanM);
  if (Math.abs(decade - 1) > 1e-6) {
    obj.scale.multiplyScalar(decade);
    obj.updateMatrixWorld(true);
    const box2 = new THREE.Box3().setFromObject(obj);
    const s2 = box2.getSize(new THREE.Vector3());
    measured =
      axis === 'x'
        ? s2.x
        : axis === 'y'
          ? s2.y
          : axis === 'z'
            ? s2.z
            : axis === 'xz'
              ? Math.max(s2.x, s2.z)
              : Math.max(s2.x, s2.y, s2.z);
  }

  const s = targetSpanM / Math.max(measured, 1e-6);
  obj.scale.multiplyScalar(s);
  // Lock uniform after fit
  const u = (Math.abs(obj.scale.x) + Math.abs(obj.scale.y) + Math.abs(obj.scale.z)) / 3;
  obj.scale.setScalar(u);
  obj.updateMatrixWorld(true);

  // Ground local y=0 at feet/keel of this object (caller may reparent)
  const box3 = new THREE.Box3().setFromObject(obj);
  obj.position.y -= box3.min.y;

  const finalBox = new THREE.Box3().setFromObject(obj);
  const finalSize = finalBox.getSize(new THREE.Vector3());
  const final =
    axis === 'x'
      ? finalSize.x
      : axis === 'y'
        ? finalSize.y
        : axis === 'z'
          ? finalSize.z
          : axis === 'xz'
            ? Math.max(finalSize.x, finalSize.z)
            : Math.max(finalSize.x, finalSize.y, finalSize.z);

  console.info(
    `[cinemaSi] prop span target=${targetSpanM}m axis=${axis} measured≈${final.toFixed(2)}m decade=${decade} scale*=${s.toFixed(4)}`,
  );
  return { measured: final, scale: s, decade };
}

/** Force uniform XYZ scale (fixes stretched skinned mages). */
export function lockUniformScale(obj: THREE.Object3D): void {
  const u = (Math.abs(obj.scale.x) + Math.abs(obj.scale.y) + Math.abs(obj.scale.z)) / 3 || 1;
  obj.scale.setScalar(u);
}

/** Normalize bone/track tokens for fuzzy match (spaces, underscores, case). */
export function normBoneToken(s: string): string {
  return String(s || '')
    .toLowerCase()
    .replace(/mixamorig\d*:/g, '')
    .replace(/[:\s._\-]+/g, '');
}

/**
 * Rematch clip tracks onto skeleton bone names under `root`.
 * Fixes THREE.PropertyBinding "No target node found for track: Bip001 Pelvis.quaternion"
 * when bake JSON uses spaced names and GLB uses underscores (or vice versa).
 */
export function rematchClipToSkeleton(
  clip: THREE.AnimationClip,
  root: THREE.Object3D,
): THREE.AnimationClip {
  const boneByNorm = new Map<string, string>();
  root.traverse((o) => {
    if (!o.name) return;
    // Prefer actual Bone nodes; also index all named nodes (armature shells)
    const isBone = (o as THREE.Bone).isBone === true || o.type === 'Bone';
    const key = normBoneToken(o.name);
    if (!key) return;
    if (isBone || !boneByNorm.has(key)) boneByNorm.set(key, o.name);
  });

  if (!boneByNorm.size) {
    console.warn('[cinemaGrudge6] rematchClip: no bones under root', root.name);
    return clip;
  }

  const tracks: THREE.KeyframeTrack[] = [];
  let hit = 0;
  let miss = 0;
  for (const t of clip.tracks) {
    const dot = t.name.indexOf('.');
    if (dot < 0) continue;
    const bone = t.name.slice(0, dot);
    const prop = t.name.slice(dot);
    const actual = boneByNorm.get(normBoneToken(bone));
    if (!actual) {
      miss++;
      continue;
    }
    hit++;
    if (actual === bone) {
      tracks.push(t);
    } else {
      const nt = t.clone();
      nt.name = actual + prop;
      tracks.push(nt);
    }
  }

  if (!tracks.length) {
    console.warn(
      `[cinemaGrudge6] rematchClip "${clip.name}": 0 tracks matched (miss=${miss}) · bones≈${boneByNorm.size}`,
    );
    return clip;
  }

  const out = new THREE.AnimationClip(clip.name, clip.duration, tracks);
  if (miss > 0) {
    console.info(
      `[cinemaGrudge6] rematchClip "${clip.name}": matched ${hit} dropped ${miss} · bones=${boneByNorm.size}`,
    );
  }
  return out;
}

/** Rematch a list of clips for a skinned kit root (clone per root — don't mutate shared cache). */
export function rematchClipsForRoot(
  clips: THREE.AnimationClip[],
  root: THREE.Object3D,
): THREE.AnimationClip[] {
  return clips.map((c) => rematchClipToSkeleton(c.clone(), root));
}

/** Yaw-only face toward world XZ target (preserves pitch/roll — needed for levi rise). */
export function faceYawToward(obj: THREE.Object3D, target: THREE.Vector3, modelForward = 'z'): void {
  const dx = target.x - obj.position.x;
  const dz = target.z - obj.position.z;
  if (dx * dx + dz * dz < 1e-8) return;
  // Three.js default lookAt faces -Z; many grudge kits face +Z — use atan2
  const yaw = modelForward === 'z' ? Math.atan2(dx, dz) : Math.atan2(dx, dz) + Math.PI;
  obj.rotation.y = yaw;
}

export type CinemaHumanRole = 'mage' | 'hero' | 'orc';

export interface CinemaHumanPack {
  root: THREE.Group;
  mesh: THREE.Object3D;
  clips: THREE.AnimationClip[];
  /** Race id used for equip / textures */
  raceId: 'human' | 'orc';
}

/**
 * Local modular bake staged from grudge6_incoming (COPY only — D: baked tree is read-only).
 * Full mesh parts + atlas; equip = visibility. Do not edit the D: source pack.
 */
export const CINEMA_ORC_BAKED = {
  glb: '/models/grudge6/baked/orcs_base.glb',
  atlas: '/models/grudge6/baked/orcs_atlas.webp',
  /** Default unarmed A set from orcs_base.manifest.json */
  defaultMeshes: [
    'ORC_Units_Head_A',
    'ORC_Units_Body_A',
    'ORC_Units_Arms_A',
    'ORC_Units_Legs_A',
  ],
  /** Intro orc mage: body A + staff (visibility equip only) */
  mageMeshes: [
    'ORC_Units_Head_A',
    'ORC_Units_Body_A',
    'ORC_Units_Arms_A',
    'ORC_Units_Legs_A',
    'ORC_weapon_staff_A',
  ],
} as const;

/** Orc SI yardstick — slightly taller than human cinema mages (SSOT CIN_ORC_M) */
export const CINEMA_ORC_M = 2.2;

let _wkTemplate: Awaited<ReturnType<typeof loadCharacterModel>> | null = null;
let _wkLoading: Promise<Awaited<ReturnType<typeof loadCharacterModel>>> | null = null;
let _orcTemplate: Awaited<ReturnType<typeof loadCharacterModel>> | null = null;
let _orcLoading: Promise<Awaited<ReturnType<typeof loadCharacterModel>>> | null = null;

async function getWkTemplate() {
  if (_wkTemplate) return _wkTemplate;
  // Dedup parallel spawnCinemaHuman (4 mages + hero load together)
  if (!_wkLoading) {
    _wkLoading = (async () => {
      // SSOT human mage mesh: WK_Characters.glb (Bip001) — NO embedded clips
      const url = resolveRaceCdnUrl('human');
      console.info('[cinemaGrudge6] load mage mesh', url);
      const tpl = await loadCharacterModel(url);
      try {
        await applyGrudge6RaceTextures(tpl.scene, 'human');
      } catch (e) {
        console.warn('[cinemaGrudge6] texture apply soft-fail', e);
      }
      console.info(
        '[cinemaGrudge6] WK_Characters loaded · embedded clips=',
        tpl.clips?.length ?? 0,
        '· bones sample=',
        (() => {
          const names: string[] = [];
          tpl.scene.traverse((o) => {
            if ((o as THREE.Bone).isBone && names.length < 8) names.push(o.name);
          });
          return names.join(', ');
        })(),
      );
      _wkTemplate = tpl;
      return tpl;
    })();
  }
  return _wkLoading;
}

/**
 * Production orc mage kit.
 * orcs_base.glb is often missing on edge (404) — CDN ORC_Characters.glb is SSOT.
 * Local bake is optional polish only.
 */
async function getOrcBakedTemplate() {
  if (_orcTemplate) return _orcTemplate;
  if (!_orcLoading) {
    _orcLoading = (async () => {
      // CDN race kit FIRST (always on R2). Local bake second (gitignored, often absent).
      const candidates = [
        resolveRaceCdnUrl('orc'),
        '/asset-packs/toon-rts-characters/glb/characters/orc.glb',
        typeof window !== 'undefined'
          ? new URL(CINEMA_ORC_BAKED.glb, window.location.origin).href
          : CINEMA_ORC_BAKED.glb,
        CINEMA_ORC_BAKED.glb,
      ];
      let tpl: Awaited<ReturnType<typeof loadCharacterModel>> | null = null;
      let url = candidates[0]!;
      for (const cand of candidates) {
        try {
          console.info('[cinemaGrudge6] load modular orc', cand);
          tpl = await loadCharacterModel(cand);
          url = cand;
          break;
        } catch (e) {
          console.warn('[cinemaGrudge6] orc load fail', cand, e);
        }
      }
      if (!tpl) throw new Error('orc mage kit failed (CDN ORC_Characters + bake)');
      // Race atlas on CDN kit; local bake atlas only for orcs_base
      try {
        if (url.includes('orcs_base') || url.includes('/baked/')) {
          await applyLocalAtlasOrRace(tpl.scene, CINEMA_ORC_BAKED.atlas, 'orc');
        } else {
          await applyGrudge6RaceTextures(tpl.scene, 'orc');
        }
      } catch (e) {
        console.warn('[cinemaGrudge6] orc atlas soft-fail', e);
      }
      // Equip A body on template — use equipment manager names, not orcs_base-only strings
      // when on ORC_Characters.glb (visibility via model3d path in spawnCinemaHuman)
      const meshNames: string[] = [];
      tpl.scene.traverse((o) => {
        if ((o as THREE.Mesh).isMesh && meshNames.length < 12) meshNames.push(o.name);
      });
      console.info(
        '[cinemaGrudge6] orc kit loaded',
        url,
        '· clips=',
        tpl.clips?.length ?? 0,
        '· mesh sample=',
        meshNames.join(', '),
      );
      _orcTemplate = tpl;
      return tpl;
    })();
  }
  return _orcLoading;
}

/** Show only listed equip meshes (visibility only — never touch mesh/bone scales). */
export function applyModularUnarmedVisibility(
  root: THREE.Object3D,
  wantNames: readonly string[],
): void {
  const want = new Set(wantNames.map((n) => n.toLowerCase()));
  root.traverse((n) => {
    const m = n as THREE.Mesh;
    if (!m.isMesh && !(m as THREE.SkinnedMesh).isSkinnedMesh) return;
    const nm = (m.name || '').toLowerCase();
    // Always hide bag / lumber / quiver unless explicitly wanted
    if (/bag|lumber|wood_|bone_wood|bone_bag|quiver/.test(nm) && !wantNames.some((w) => nm.includes(w.toLowerCase()))) {
      m.visible = false;
      return;
    }
    if (want.has(nm)) {
      m.visible = true;
      return;
    }
    // Fuzzy: head_a / body_a / arms_a / legs_a under ORC_Units_
    const light =
      /units_head_a|units_body_a|units_arms_a|units_legs_a/.test(nm.replace(/orc_/g, '')) ||
      wantNames.some((w) => nm === w.toLowerCase() || nm.endsWith(w.toLowerCase().replace(/^orc_/, '')));
    // Staff/weapon only if explicitly wanted (orc mage includes staff_A in wantNames)
    const isWeapon =
      /weapon|shield|staff|bow|sword|axe|hammer|spear|dagger|mace|quiver|bag|wood|shoulder/.test(nm);
    if (isWeapon) {
      m.visible = wantNames.some(
        (w) => nm === w.toLowerCase() || nm.includes(w.toLowerCase().replace(/^orc_/, '')),
      );
      return;
    }
    m.visible = light && !isWeapon;
  });
}

async function applyLocalAtlasOrRace(
  root: THREE.Object3D,
  localAtlasUrl: string,
  raceId: string,
): Promise<void> {
  const loader = new THREE.TextureLoader();
  const atlasUrl =
    typeof window !== 'undefined' && localAtlasUrl.startsWith('/')
      ? new URL(localAtlasUrl, window.location.origin).href
      : localAtlasUrl;
  let tex: THREE.Texture | null = await new Promise((resolve) => {
    loader.load(
      atlasUrl,
      (t) => {
        t.colorSpace = THREE.SRGBColorSpace;
        t.flipY = false;
        resolve(t);
      },
      undefined,
      () => resolve(null),
    );
  });
  if (!tex) {
    await applyGrudge6RaceTextures(root, raceId);
    return;
  }
  const prefix = raceId === 'orc' ? 'ORC_' : 'WK_';
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh || !mesh.material) return;
    if (mesh.name && !mesh.name.startsWith(prefix) && !/orc_|units_/i.test(mesh.name)) {
      // still apply to skinned race body meshes without strict prefix
    }
    const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const mat of list) {
      const std = mat as THREE.MeshStandardMaterial;
      if (std.map !== undefined) {
        std.map = tex!;
        std.needsUpdate = true;
      }
    }
  });
}

/**
 * Bip001 baked clips for cinema mages (rotation-only, feet stay grounded).
 * Mesh GLB has zero clips — these must be loaded separately.
 *
 *   idle  → magic/standing idle
 *   cast  → dual_wield/attack2 (simple arm cast loop; 2H magic GLBs 404 on CDN)
 */
/**
 * Pick idle / walk / cast / attack from orcs_base embedded clips (hundreds of Bip001 actions).
 * Prefer main body tracks (name ends with _Bip001, not Toe).
 */
export function pickEmbeddedOrcCinemaClips(all: THREE.AnimationClip[]): THREE.AnimationClip[] {
  if (!all?.length) return [];
  const main = all.filter((c) => {
    const n = c.name || '';
    // Skip toe-only splinters; keep full body or unnamed full clips
    if (/toe0|toe_0|finger/i.test(n) && !/Bip001$/i.test(n)) return false;
    return c.tracks.length >= 8;
  });
  const pool = main.length ? main : all;

  const pick = (re: RegExp, prefer: RegExp[] = []): THREE.AnimationClip | null => {
    const hits = pool.filter((c) => re.test(c.name || ''));
    if (!hits.length) return null;
    for (const p of prefer) {
      const h = hits.find((c) => p.test(c.name || ''));
      if (h) return h;
    }
    // Prefer shorter idle loops; longer for attacks
    return hits.sort((a, b) => a.tracks.length - b.tracks.length)[0] ?? null;
  };

  const out: THREE.AnimationClip[] = [];
  const addAs = (src: THREE.AnimationClip | null, ...names: string[]) => {
    if (!src) return;
    for (const name of names) {
      const c = src.clone();
      c.name = name;
      out.push(c);
    }
  };

  // Prefer locomotion/idle/combat style names from baked kit
  addAs(
    pick(/idle|stand|breath|wait/i, [/idle/i, /stand/i]) || pool[0] || null,
    'idle',
    'stand',
    'brace',
    'fight_idle',
    'defend',
    'block',
  );
  addAs(
    pick(/walk|run|locomotion|move/i, [/walk/i, /run/i]),
    'walk',
    'walk2',
    'run',
  );
  addAs(
    pick(/cast|magic|spell|channel/i, [/cast/i, /magic/i]) ||
      pick(/attack|combat|strike|slash/i, [/attack/i, /combat/i]),
    'cast',
    '2h_cast',
    'cast2',
    'cast3',
    'attack',
  );

  console.info(
    `[cinemaGrudge6] embedded orc clips → cinema aliases: ${out.map((c) => c.name).join(', ')} ` +
      `(from ${all.length} kit actions)`,
  );
  return out;
}

export async function loadCinemaMageBip001Clips(): Promise<THREE.AnimationClip[]> {
  // SSOT magic pack paths (open.grudge-studio.com /anims/baked)
  const specs: { name: string; rel: string }[] = [
    { name: 'idle', rel: 'magic/standing idle' },
    { name: 'walk', rel: 'magic/Standing Walk Forward' },
    { name: 'run', rel: 'magic/Standing Run Forward' },
    { name: 'cast', rel: 'dual_wield/attack2' },
    { name: 'cast2', rel: 'unarmed/punching' },
    { name: 'fight_idle', rel: 'magic/standing idle' },
  ];
  const out: THREE.AnimationClip[] = [];
  for (const s of specs) {
    const urls = [
      ...bip001ClipUrls(s.rel),
      `https://assets.grudge-studio.com/anims/baked/${s.rel
        .split('/')
        .map((p) => encodeURIComponent(p))
        .join('/')}.json`,
    ];
    let clip: THREE.AnimationClip | null = null;
    for (const url of urls) {
      clip = await loadBakedAnimationClip(url);
      if (clip) break;
    }
    if (!clip) {
      console.warn(`[cinemaGrudge6] missing Bip001 clip ${s.rel}`);
      continue;
    }
    const c = clip.clone();
    c.name = s.name;
    out.push(c);
    if (s.name === 'cast') {
      for (const alias of ['2h_cast', 'attack', 'cast2', 'cast3']) {
        const a = c.clone();
        a.name = alias;
        out.push(a);
      }
    }
    if (s.name === 'idle') {
      for (const alias of ['stand', 'brace', 'defend', 'block', 'fight_idle']) {
        const a = c.clone();
        a.name = alias;
        out.push(a);
      }
    }
    if (s.name === 'walk') {
      const a = c.clone();
      a.name = 'walk2';
      out.push(a);
    }
    console.info(
      `[cinemaGrudge6] Bip001 clip ok name=${c.name} tracks=${c.tracks.length} dur=${c.duration.toFixed(2)}s`,
    );
  }
  return out;
}

/** Inject mage clips into directors and start cast loop. */
export function applyCinemaMageClips(
  directors: CinemaAnimDirector[],
  clips: THREE.AnimationClip[],
): void {
  if (!clips.length || !directors.length) return;
  for (const d of directors) {
    d.addClips(clips);
    // Prefer cast for combat cinema; fall back idle
    const played =
      d.play(['cast', '2h_cast', 'attack', 'cast2'], {
        fade: 0.25,
        loop: THREE.LoopRepeat,
      }) ??
      d.play(['idle', 'stand', 'fight_idle'], {
        fade: 0.25,
        loop: THREE.LoopRepeat,
      });
    if (!played) {
      console.warn('[cinemaGrudge6] director has no playable cast/idle clip');
    }
  }
}

/**
 * Clone production race kit for cinema deck (SSOT: grudge-character-correctness).
 *
 *  - SkeletonUtils clone (bind poses intact — never zero bone scales)
 *  - Equip = visibility only (no scaleHeadMeshes)
 *  - fitCharacterRootToHeightM on root only (uniform SI)
 *  - Art-forward +Z once (π/2) for grudge6 FBX kits
 *
 * role `'orc'` → CDN ORC_Characters.glb
 */
export async function spawnCinemaHuman(role: CinemaHumanRole): Promise<CinemaHumanPack> {
  const isOrc = role === 'orc';
  const raceId = isOrc ? 'orc' : 'human';
  const targetH = isOrc ? CINEMA_ORC_M : CINEMA_HUMAN_M;
  const tpl = isOrc ? await getOrcBakedTemplate() : await getWkTemplate();
  const race = RACE_GRUDGE6[raceId] ?? RACE_GRUDGE6.human;
  const mesh = (SkeletonUtils as { clone: (o: THREE.Object3D) => THREE.Object3D }).clone(
    tpl.scene,
  ) as THREE.Object3D;

  // Root only — never traverse bone scales (destroys skinned orcs)
  mesh.position.set(0, 0, 0);
  mesh.rotation.set(0, 0, 0);
  mesh.scale.set(1, 1, 1);

  const model3d = defaultModel3d(raceId, {
    equippedMeshes: { body: 'A', arms: 'A', legs: 'A', head: 'A' },
    weaponSlots: isOrc ? { staff: 'A' } : {},
    scale: 1,
  });

  // Equip visibility only — NEVER setupGrudge6Equipment here:
  // that calls scaleHeadMeshes(1.08) which non-uniformly stretches skinned ORC_Units_head.
  try {
    await applyGrudge6RaceTextures(mesh, raceId);
  } catch (e) {
    console.warn('[cinemaGrudge6] texture pre soft-fail', e);
  }
  {
    const em = new Grudge6EquipmentManager(race.prefix);
    em.catalog(mesh);
    applyModel3dToEquipment(em, model3d);
    // Do NOT call scaleHeadMeshes / weapon wrist grip scale hacks on cinema deck
  }
  try {
    await applyGrudge6RaceTextures(mesh, raceId);
  } catch (e) {
    console.warn('[cinemaGrudge6] texture post soft-fail', e);
  }
  ensureCharacterTextureColorSpace(mesh);

  // SSOT thin path (grudge-character-correctness):
  //  - equip = visibility only (done above)
  //  - NO per-mesh scale.set (destroys skinned bind proportions)
  //  - uniform root height fit once
  //  - art-forward +Z once (π/2 for grudge6 FBX kits)
  //  - plant feet from skinned body min.y
  mesh.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || !m.material) return;
    m.castShadow = true;
    m.receiveShadow = true;
    m.frustumCulled = false;
  });

  // SI yardstick on ROOT only — never raceMult double-fit, never mesh node scales
  fitCharacterRootToHeightM(mesh, 1, targetH);
  assertHeroSiHeight(mesh, {
    raceScaleMult: 1,
    targetBaseHeightM: targetH,
    label: `cinema/${role}`,
  });
  lockUniformScale(mesh);

  // grudge6 art-forward: FBX +X → +Z once. Never also +π on parent.
  mesh.rotation.set(0, Math.PI / 2, 0);
  mesh.updateMatrixWorld(true);
  {
    const box = new THREE.Box3().setFromObject(mesh);
    if (Number.isFinite(box.min.y)) mesh.position.y -= box.min.y;
  }

  const root = new THREE.Group();
  root.name = `cinema_${role}`;
  root.userData.cinemaRace = raceId;
  root.position.set(0, 0, 0);
  root.rotation.set(0, 0, 0);
  root.scale.set(1, 1, 1);
  root.add(mesh);
  lockUniformScale(root);
  root.updateMatrixWorld(true);

  let finalH = measureCharacterWorldHeight(root) || measureObjectWorldHeight(root);
  // Rescue only if wildly out of SI band (uniform root scale only)
  if ((finalH > 2.8 || finalH < 1.2) && finalH > 1e-4) {
    root.scale.multiplyScalar(targetH / finalH);
    lockUniformScale(root);
    root.updateMatrixWorld(true);
    const b2 = new THREE.Box3().setFromObject(root);
    if (Number.isFinite(b2.min.y)) mesh.position.y -= b2.min.y;
    finalH = measureCharacterWorldHeight(root) || measureObjectWorldHeight(root);
  }

  // Count visible body meshes — if zero, equip failed and orc is "fucked"
  let vis = 0;
  mesh.traverse((o) => {
    const m = o as THREE.Mesh;
    if ((m.isMesh || (m as THREE.SkinnedMesh).isSkinnedMesh) && m.visible) vis++;
  });
  console.info(
    `[cinemaGrudge6] ${role} SI height≈${finalH.toFixed(2)}m target=${targetH}m ` +
      `race=${raceId} visibleMeshes=${vis}`,
  );
  if (vis < 3) {
    console.error(
      `[cinemaGrudge6] ${role} almost invisible (visibleMeshes=${vis}) — forcing base body meshes on`,
    );
    mesh.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh && !(m as THREE.SkinnedMesh).isSkinnedMesh) return;
      const n = (m.name || '').toLowerCase();
      if (/units_head|units_body|units_arms|units_legs|head_a|body_a|arms_a|legs_a/.test(n)) {
        m.visible = true;
      }
      if (/weapon_staff|staff_a/.test(n) && isOrc) m.visible = true;
    });
  }

  return {
    root,
    mesh,
    clips: tpl.clips?.slice() ?? [],
    raceId,
  };
}

/** Explicit modular orc spawn (deck reference mesh). */
export async function spawnCinemaOrc(): Promise<CinemaHumanPack> {
  return spawnCinemaHuman('orc');
}

/** @deprecated use loadCinemaMageBip001Clips — Mixamo GLBs don't bind Bip001 / 2H magic paths 404 */
export async function loadCinema2hAttackClips(): Promise<THREE.AnimationClip[]> {
  return loadCinemaMageBip001Clips();
}

/**
 * Soft energy shield shell (NO wireframe).
 * Prefer createShipShield for the cinema boat ward — not per-mage bubbles.
 */
export function createForceField(radiusM = 1.15, opts?: { name?: string; band?: boolean }): THREE.Group {
  const g = new THREE.Group();
  g.name = opts?.name ?? 'cinema_force_field';

  const shell = new THREE.Mesh(
    new THREE.SphereGeometry(radiusM, 40, 28),
    new THREE.MeshBasicMaterial({
      color: 0x44ddff,
      transparent: true,
      opacity: 0.14,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  shell.name = 'ff_shell';

  // Outer glow — solid sphere, NOT wireframe
  const rim = new THREE.Mesh(
    new THREE.SphereGeometry(radiusM * 1.06, 32, 24),
    new THREE.MeshBasicMaterial({
      color: 0xaaffff,
      transparent: true,
      opacity: 0.1,
      side: THREE.BackSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  rim.name = 'ff_rim';

  g.add(shell, rim);

  if (opts?.band !== false) {
    const band = new THREE.Mesh(
      new THREE.TorusGeometry(radiusM * 0.94, Math.max(0.04, radiusM * 0.012), 8, 48),
      new THREE.MeshBasicMaterial({
        color: 0xccffff,
        transparent: true,
        opacity: 0.4,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    band.rotation.x = Math.PI / 2;
    band.name = 'ff_band';
    g.add(band);
    g.userData.band = band;
  }

  g.userData.shell = shell;
  g.userData.rim = rim;
  g.userData.radiusM = radiusM;
  g.visible = false;
  return g;
}

/**
 * Ship-wide ward dome — one shield around the entire hull (not per mage).
 * Sized for ~18 m LOA brig; parent under shipGroup so it rides bob/roll.
 */
export function createShipShield(radiusM = 11): THREE.Group {
  // Slightly taller dome (Y scale) so deck + mast silhouette sits inside
  const g = createForceField(radiusM, { name: 'cinema_ship_shield', band: true });
  g.scale.set(1.15, 0.85, 1.35); // LOA-biased ellipsoid over the boat
  // Origin at keel/waterline center; deck sits mid-height inside dome
  g.position.set(0, radiusM * 0.22, 0);
  return g;
}

/**
 * Yin-yang magic ring as CLOCK-FACE shield.
 *
 * Asset is a flat disk (thin on Z). We:
 *  1. Fit diameter to spanM
 *  2. Keep face vertical (NO pitch/roll tip — that made "coin on table")
 *  3. Spin only around face normal (local Z) = clock hands
 *  4. Parent holder yaw faces threat so the face is readable edge-on to camera
 */
export function mountClockRing(
  ringTemplate: THREE.Object3D,
  spanM = 1.5,
): THREE.Group {
  const holder = new THREE.Group();
  holder.name = 'clock_ring_holder';
  const ring = ringTemplate.clone(true);
  ring.name = 'clock_ring_mesh';
  ring.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(ring);
  const size = box.getSize(new THREE.Vector3());

  // Prefer face plane: two large axes; thin axis is thickness
  const dims = [size.x, size.y, size.z].sort((a, b) => b - a);
  const face = Math.max(dims[0], dims[1], 0.001);
  ring.scale.multiplyScalar(spanM / face);

  // Center mesh on holder origin
  ring.updateMatrixWorld(true);
  const b2 = new THREE.Box3().setFromObject(ring);
  const c = b2.getCenter(new THREE.Vector3());
  ring.position.sub(c);

  // Ensure face is in XY (normal = +Z). If asset is XZ-flat (normal +Y), tip -90° X once.
  const thinIsY = size.y < size.x * 0.35 && size.y < size.z * 0.35;
  if (thinIsY) {
    ring.rotation.set(-Math.PI / 2, 0, 0);
  } else {
    ring.rotation.set(0, 0, 0);
  }

  holder.add(ring);
  // Chest height, slightly forward of torso for 1.8 m human
  holder.position.set(0, 1.05, 0.55);
  holder.userData.ringMesh = ring;
  holder.visible = false;
  return holder;
}

/** Spin clock ring: rotate face around its normal (local Z) like clock hands — not Y like a coin. */
export function tickClockRing(holder: THREE.Object3D, dt: number, rpm = 22): void {
  if (!holder.visible) return;
  const ring = holder.userData.ringMesh as THREE.Object3D | undefined;
  if (!ring) return;
  // Clock-hand spin: local Z only
  ring.rotation.z += (rpm * Math.PI * 2 * dt) / 60;
}

/**
 * Pulse shield while actively blocking fireballs.
 * `impactFlash` 0..1 briefly brightens on hit (pass from cinema).
 */
export function tickForceField(
  field: THREE.Object3D | null,
  t: number,
  active: boolean,
  impactFlash = 0,
): void {
  if (!field) return;
  field.visible = active;
  if (!active) return;
  const pulse = 1 + Math.sin(t * 4.5) * 0.04 + impactFlash * 0.18;
  field.scale.setScalar(pulse);
  const shell = field.userData.shell as THREE.Mesh | undefined;
  const rim = field.userData.rim as THREE.Mesh | undefined;
  const band = field.userData.band as THREE.Mesh | undefined;
  if (shell?.material) {
    (shell.material as THREE.MeshBasicMaterial).opacity =
      0.14 + Math.sin(t * 5) * 0.05 + impactFlash * 0.35;
  }
  if (rim?.material) {
    (rim.material as THREE.MeshBasicMaterial).opacity =
      0.1 + Math.sin(t * 3.5) * 0.04 + impactFlash * 0.25;
  }
  if (band?.material) {
    (band.material as THREE.MeshBasicMaterial).opacity =
      0.35 + Math.sin(t * 6) * 0.1 + impactFlash * 0.4;
    band.rotation.z += 0.9 * (1 / 60);
  }
}
