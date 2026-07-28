/**
 * LED face default / backup avatar (Open LED Mask parity).
 *
 * Product law:
 *   - Nexus (toon soon) → default face = LED smile visor
 *   - Voxel (race avatars) → default face = LED smile visor
 *   - Armada (mechs) → backup face when pilot/cockpit head is missing
 *
 * Storage keys align with gameopen LedMask / Avatar Edit so Open, Grudox,
 * Mine-Loader, and client share the same saved face when present.
 *
 * Full volumetric LED matrix lives in gameopen LedMask.ts; here we paint a
 * lightweight emissive plane for blocky explorer / fallback bodies.
 */
import * as THREE from "three";
import { effectivePipelineForEra, normalizeGameEra, type GameEra } from "@shared/definitions/gameEras";

/** Open / LED Mask avatar config (full design). */
export const LEDMASK_AVATAR_STORE = "ledmask:avatarConfig:v1";
/** Avatar Edit global player head. */
export const AVATAR_EDIT_HEAD_KEY = "avatarEdit:playerHead:v1";
export const LED_SHELL_KEY = "ledmask:shell";

/** Default shell when none saved (hood frames the LED panel). */
export const DEFAULT_LED_SHELL = "hood";

/** Default expression — friendly cyan smile (Open LedMask default). */
export const DEFAULT_LED_FACE = "smile" as const;

export type LedFaceRole = "default" | "backup" | "none";

/**
 * Whether this era uses LED face as default, backup, or not at all.
 * - nexus / voxel → default
 * - armada → backup (mech pilot / missing head)
 * - warlords → none (grudge6 race kits)
 */
export function ledFaceRoleForEra(era: GameEra | string): LedFaceRole {
  const e = normalizeGameEra(era);
  if (e === "nexus" || e === "voxel") return "default";
  if (e === "armada") return "backup";
  return "none";
}

/** True when mesh load should prefer LED-faced cube when kit/GLB missing. */
export function shouldUseLedFaceDefault(era: GameEra | string): boolean {
  return ledFaceRoleForEra(era) === "default";
}

/** True when LED face is the fallback if primary mesh fails. */
export function shouldUseLedFaceBackup(era: GameEra | string): boolean {
  const role = ledFaceRoleForEra(era);
  return role === "default" || role === "backup";
}

/** Pipeline that should paint LED face on procedural body. */
export function pipelineUsesLedFaceDefault(pipeline: string): boolean {
  return pipeline === "voxel" || pipeline === "toon";
}

/**
 * Resolve whether to attach LED face for a character's era.
 * Uses effective pipeline (nexus interim → voxel).
 */
export function characterShouldHaveLedFace(opts: {
  gameEra?: string | null;
  pipeline?: string | null;
  isBackup?: boolean;
}): boolean {
  const era = normalizeGameEra(opts.gameEra || "voxel");
  const role = ledFaceRoleForEra(era);
  if (role === "none") return false;
  if (role === "backup") return !!opts.isBackup;
  // default role
  const pipe = opts.pipeline || effectivePipelineForEra(era);
  return pipelineUsesLedFaceDefault(pipe) || pipe === "voxel";
}

/** Best-effort: has user saved a LED / Avatar Edit head? */
export function hasSavedLedOrAvatarHead(): boolean {
  if (typeof localStorage === "undefined") return false;
  try {
    return !!(
      localStorage.getItem(LEDMASK_AVATAR_STORE) ||
      localStorage.getItem(AVATAR_EDIT_HEAD_KEY)
    );
  } catch {
    return false;
  }
}

/**
 * Paint a simple LED smile matrix onto a canvas texture (cyan emissive look).
 * Matches Open LedMask "smile" mood without shipping the full matrix mesh.
 */
export function createLedSmileFaceTexture(size = 64): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  // Dark visor
  ctx.fillStyle = "#0a1018";
  ctx.fillRect(0, 0, size, size);
  // LED cyan smile
  const cell = size / 16;
  ctx.fillStyle = "#36e3ff";
  // Eyes
  for (const ex of [4, 11]) {
    for (let dy = 0; dy < 2; dy++) {
      for (let dx = 0; dx < 2; dx++) {
        ctx.fillRect((ex + dx) * cell, (5 + dy) * cell, cell * 0.9, cell * 0.9);
      }
    }
  }
  // Smile arc
  for (let i = 0; i < 6; i++) {
    const x = 5 + i;
    const y = 10 + (i === 0 || i === 5 ? 0 : 1);
    ctx.fillRect(x * cell, y * cell, cell * 0.9, cell * 0.9);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Attach a front-face LED plane to a cube head mesh (blocky explorer).
 * Idempotent: replaces previous ledFace plane if present.
 */
export function attachLedFaceToHead(
  head: THREE.Object3D,
  opts?: { size?: number; glow?: number },
): THREE.Mesh {
  // Remove prior
  const old = head.getObjectByName("ledFacePanel");
  if (old) {
    head.remove(old);
    old.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.geometry?.dispose();
        const mat = m.material as THREE.Material;
        mat?.dispose?.();
      }
    });
  }

  const tex = createLedSmileFaceTexture(opts?.size ?? 64);
  const mat = new THREE.MeshStandardMaterial({
    map: tex,
    emissiveMap: tex,
    emissive: new THREE.Color(0x36e3ff),
    emissiveIntensity: opts?.glow ?? 0.85,
    roughness: 0.35,
    metalness: 0.2,
  });
  // Slightly in front of head cube (+Z local face)
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.26), mat);
  panel.name = "ledFacePanel";
  panel.position.set(0, 0, 0.145);
  panel.userData.ledFace = true;
  panel.userData.ledFaceDefault = DEFAULT_LED_FACE;
  head.add(panel);
  return panel;
}

/**
 * Ensure a blocky explorer group has an LED face on its head part.
 * Returns true if face was attached.
 */
export function ensureLedFaceOnExplorer(root: THREE.Object3D): boolean {
  let head: THREE.Object3D | null = null;
  root.traverse((o) => {
    if (head) return;
    if (o.name === "head" || o.userData?.avatarPart === "head") head = o;
  });
  if (!head) return false;
  attachLedFaceToHead(head);
  root.userData.ledFaceDefault = true;
  root.userData.defaultAvatar = "led_face";
  return true;
}
