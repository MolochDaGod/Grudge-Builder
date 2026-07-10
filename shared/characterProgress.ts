/**
 * Character Progress SSOT — fleet-wide contract for per-UUID progress.
 *
 * Scope rules (canonical):
 *   - ACCOUNT: inventory / resources (shared bag across characters)
 *   - CHARACTER (Postgres UUID): professions, skill trees, weapon mastery,
 *     attributes, equipment, skill points, selected skills
 *
 * All fleet apps (Warlords, crafting.puter.site, skill-tree, weaponmastery,
 * GCS, VFX studio) MUST treat Railway `PATCH /api/characters/:id` (or the
 * dedicated progress endpoint) as the write authority. localStorage / Puter KV
 * are cache only.
 *
 * @see docs/CHARACTER_PROGRESS_SSOT.md
 */

import {
  MASTERY_POOL_CAP,
  MASTERY_POINTS_PER_LEVEL,
  MASTERY_TREE_FILL_POINTS,
} from './definitions/weaponMastery';

// ── Schema versioning ────────────────────────────────────────────

/** Bump when the on-wire progress shape changes incompatibly. */
export const CHARACTER_PROGRESS_SCHEMA_VERSION = 1;

/** Keys reserved inside skillLoadouts for meta (not gameplay loadouts). */
export const PROGRESS_META_KEY = '__progress' as const;

export interface CharacterProgressMeta {
  schemaVersion: number;
  /** Monotonic revision for optimistic concurrency (If-Match / expectedRevision). */
  revision: number;
  updatedAt: number;
  /** Ring buffer of recent idempotency keys (craft / spend). */
  recentIdempotencyKeys?: string[];
}

export interface WeaponMasteryState {
  allocations: Record<string, Record<string, number>>;
  sockets?: Record<string, string>;
}

export interface CharacterProgressPayload {
  schemaVersion?: number;
  /** Client must send last known revision for 409 protection when present. */
  expectedRevision?: number;
  /** Idempotency key for this write (craft, unlock, mastery spend). */
  idempotencyKey?: string;

  professionLevels?: Record<string, { level: number; xp: number; unlockedNodes?: number[] }>;
  equipment?: Record<string, string | null>;
  attributes?: Record<string, number>;
  selectedSkills?: Record<string | number, string | string[]>;
  skillLoadouts?: Record<string, unknown>;
  skillPoints?: number;
  weaponSkillLevel?: number;
  weaponSkillSelections?: Record<string, unknown>;
  weaponMastery?: WeaponMasteryState;
  unspentAttributePoints?: number;
  equippedWeaponId?: string | null;
  stats?: Record<string, number>;
  level?: number;
  xp?: number;
}

// ── Scope matrix (for docs + runtime asserts) ────────────────────

export const PROGRESS_SCOPE = {
  account: ['inventory', 'resources', 'accountInventory'] as const,
  character: [
    'professionLevels',
    'equipment',
    'attributes',
    'selectedSkills',
    'skillLoadouts',
    'skillPoints',
    'weaponSkillLevel',
    'weaponSkillSelections',
    'weaponMastery',
    'unspentAttributePoints',
    'equippedWeaponId',
    'stats',
    'level',
    'xp',
  ] as const,
} as const;

export const CHARACTER_PROGRESS_ALLOWED_KEYS = [
  'professionLevels',
  'equipment',
  'attributes',
  'selectedSkills',
  'skillLoadouts',
  'skillPoints',
  'weaponSkillLevel',
  'weaponSkillSelections',
  'unspentAttributePoints',
  'equippedWeaponId',
  'stats',
  'level',
  'xp',
] as const;

// ── Meta helpers ─────────────────────────────────────────────────

export function readProgressMeta(character: {
  skillLoadouts?: Record<string, unknown> | null;
}): CharacterProgressMeta {
  const loadouts = (character.skillLoadouts || {}) as Record<string, unknown>;
  const raw = loadouts[PROGRESS_META_KEY] as Partial<CharacterProgressMeta> | undefined;
  return {
    schemaVersion: Number(raw?.schemaVersion) || CHARACTER_PROGRESS_SCHEMA_VERSION,
    revision: Number(raw?.revision) || 0,
    updatedAt: Number(raw?.updatedAt) || 0,
    recentIdempotencyKeys: Array.isArray(raw?.recentIdempotencyKeys)
      ? (raw!.recentIdempotencyKeys as string[]).slice(0, 32)
      : [],
  };
}

export function writeProgressMeta(
  skillLoadouts: Record<string, unknown> | null | undefined,
  meta: CharacterProgressMeta,
): Record<string, unknown> {
  const next = { ...(skillLoadouts || {}) };
  next[PROGRESS_META_KEY] = {
    schemaVersion: meta.schemaVersion,
    revision: meta.revision,
    updatedAt: meta.updatedAt,
    recentIdempotencyKeys: (meta.recentIdempotencyKeys || []).slice(0, 32),
  };
  return next;
}

export function bumpRevision(meta: CharacterProgressMeta): CharacterProgressMeta {
  return {
    ...meta,
    schemaVersion: CHARACTER_PROGRESS_SCHEMA_VERSION,
    revision: (Number(meta.revision) || 0) + 1,
    updatedAt: Date.now(),
  };
}

// ── Weapon mastery validation ────────────────────────────────────

export interface MasteryValidationResult {
  ok: boolean;
  errors: string[];
  totalSpent: number;
  poolCap: number;
}

/**
 * Validate weapon mastery allocations against pool cap.
 * Does not require full tree node catalogs (ranks may be added later server-side).
 * Soft-validates: non-negative integers, pool cap, per-tree soft fill warning not hard-fail.
 */
export function validateWeaponMastery(
  mastery: WeaponMasteryState | null | undefined,
  characterLevel = 1,
): MasteryValidationResult {
  const errors: string[] = [];
  if (!mastery || typeof mastery !== 'object') {
    return { ok: true, errors: [], totalSpent: 0, poolCap: MASTERY_POOL_CAP };
  }
  const allocations = mastery.allocations || {};
  let totalSpent = 0;
  for (const [treeId, nodes] of Object.entries(allocations)) {
    if (!nodes || typeof nodes !== 'object') {
      errors.push(`mastery.allocations.${treeId} must be an object`);
      continue;
    }
    let treeSpent = 0;
    for (const [nodeId, ranks] of Object.entries(nodes)) {
      const n = Number(ranks);
      if (!Number.isFinite(n) || n < 0 || Math.floor(n) !== n) {
        errors.push(`mastery rank ${treeId}.${nodeId} must be a non-negative integer`);
        continue;
      }
      if (n > 10) {
        // hard ceiling even if catalog missing
        errors.push(`mastery rank ${treeId}.${nodeId} exceeds max 10`);
      }
      treeSpent += n;
      totalSpent += n;
    }
    if (treeSpent > MASTERY_TREE_FILL_POINTS + 15) {
      // allow charm overcap headroom; hard stop absurd values
      errors.push(`tree ${treeId} spent ${treeSpent} exceeds hard cap`);
    }
  }
  // Pool cap: min(100, level) is ideal; allow full pool for high-level or offline tools
  const earnedCap = Math.min(MASTERY_POOL_CAP, Math.max(1, characterLevel) * MASTERY_POINTS_PER_LEVEL);
  const effectiveCap = Math.max(earnedCap, Math.min(MASTERY_POOL_CAP, characterLevel)); // at least level
  // Soft: enforce pool cap 100 always; earned cap is advisory until level is trusted
  if (totalSpent > MASTERY_POOL_CAP) {
    errors.push(`mastery pool spent ${totalSpent} exceeds cap ${MASTERY_POOL_CAP}`);
  }
  return {
    ok: errors.length === 0,
    errors,
    totalSpent,
    poolCap: MASTERY_POOL_CAP,
  };
}

// ── Attribute validation (light) ─────────────────────────────────

const ATTR_KEYS = [
  'strength', 'vitality', 'endurance', 'intellect',
  'wisdom', 'dexterity', 'agility', 'tactics',
] as const;

export function normalizeAttributes(attrs: Record<string, number> | undefined | null): Record<string, number> {
  const out: Record<string, number> = {};
  for (const k of ATTR_KEYS) out[k] = 0;
  if (!attrs || typeof attrs !== 'object') return out;
  const map: Record<string, string> = {
    strength: 'strength', Strength: 'strength', STR: 'strength',
    vitality: 'vitality', Vitality: 'vitality', VIT: 'vitality',
    endurance: 'endurance', Endurance: 'endurance', END: 'endurance',
    intellect: 'intellect', Intellect: 'intellect', INT: 'intellect',
    wisdom: 'wisdom', Wisdom: 'wisdom', WIS: 'wisdom',
    dexterity: 'dexterity', Dexterity: 'dexterity', DEX: 'dexterity',
    agility: 'agility', Agility: 'agility', AGI: 'agility',
    tactics: 'tactics', Tactics: 'tactics', TAC: 'tactics',
  };
  for (const [k, v] of Object.entries(attrs)) {
    const key = map[k] || (ATTR_KEYS.includes(k as typeof ATTR_KEYS[number]) ? k : null);
    if (!key) continue;
    const n = Number(v);
    if (Number.isFinite(n) && n >= 0) out[key] = Math.min(999, Math.floor(n));
  }
  return out;
}

// ── Build DB updates from progress payload ───────────────────────

export interface ApplyProgressResult {
  ok: boolean;
  status: number;
  error?: string;
  errors?: string[];
  /** Fields to pass to storage.updateCharacter */
  updates?: Record<string, unknown>;
  /** New meta after successful apply */
  meta?: CharacterProgressMeta;
  /** True if idempotency key was already applied (return current char). */
  alreadyApplied?: boolean;
}

/**
 * Merge a client progress payload into a character row with revision checks.
 * Pure function — caller performs the DB write.
 */
export function applyCharacterProgressUpdate(
  character: {
    id: string;
    level?: number | null;
    skillLoadouts?: Record<string, unknown> | null;
    weaponSkillSelections?: Record<string, unknown> | null;
    [k: string]: unknown;
  },
  payload: CharacterProgressPayload,
  opts?: { requireRevision?: boolean },
): ApplyProgressResult {
  const meta = readProgressMeta(character);

  // Idempotency short-circuit
  const idem = payload.idempotencyKey ? String(payload.idempotencyKey) : '';
  if (idem && meta.recentIdempotencyKeys?.includes(idem)) {
    return { ok: true, status: 200, alreadyApplied: true, meta };
  }

  // Optimistic concurrency
  if (payload.expectedRevision != null) {
    const expected = Number(payload.expectedRevision);
    if (Number.isFinite(expected) && expected !== meta.revision) {
      return {
        ok: false,
        status: 409,
        error: 'progress_revision_conflict',
        errors: [
          `expectedRevision ${expected} !== server revision ${meta.revision}`,
        ],
        meta,
      };
    }
  } else if (opts?.requireRevision && meta.revision > 0) {
    // Soft: clients that never send revision still work; document preferred path
  }

  // Schema version
  if (
    payload.schemaVersion != null &&
    Number(payload.schemaVersion) > CHARACTER_PROGRESS_SCHEMA_VERSION
  ) {
    return {
      ok: false,
      status: 400,
      error: 'unsupported_schema_version',
      errors: [`client schemaVersion ${payload.schemaVersion} > server ${CHARACTER_PROGRESS_SCHEMA_VERSION}`],
    };
  }

  const updates: Record<string, unknown> = {};

  // Weapon mastery → weaponSkillSelections.mastery
  let mastery = payload.weaponMastery;
  if (!mastery && payload.weaponSkillSelections && (payload.weaponSkillSelections as any).mastery) {
    mastery = (payload.weaponSkillSelections as any).mastery as WeaponMasteryState;
  }
  if (mastery) {
    const v = validateWeaponMastery(mastery, Number(character.level) || 1);
    if (!v.ok) {
      return { ok: false, status: 400, error: 'invalid_weapon_mastery', errors: v.errors };
    }
    const prevWss = (character.weaponSkillSelections || {}) as Record<string, unknown>;
    const incomingWss = (payload.weaponSkillSelections || {}) as Record<string, unknown>;
    updates.weaponSkillSelections = {
      ...prevWss,
      ...incomingWss,
      mastery,
    };
    if (payload.weaponSkillLevel == null) {
      updates.weaponSkillLevel = Math.max(1, Math.min(100, v.totalSpent || 1));
    }
  } else if (payload.weaponSkillSelections) {
    updates.weaponSkillSelections = payload.weaponSkillSelections;
  }

  if (payload.professionLevels) updates.professionLevels = payload.professionLevels;
  if (payload.equipment) updates.equipment = payload.equipment;
  if (payload.attributes) updates.attributes = normalizeAttributes(payload.attributes);
  if (payload.selectedSkills) updates.selectedSkills = payload.selectedSkills;
  if (payload.skillPoints != null) updates.skillPoints = Math.max(0, Math.floor(Number(payload.skillPoints)));
  if (payload.weaponSkillLevel != null) {
    updates.weaponSkillLevel = Math.max(1, Math.min(100, Math.floor(Number(payload.weaponSkillLevel))));
  }
  if (payload.unspentAttributePoints != null) {
    updates.unspentAttributePoints = Math.max(0, Math.floor(Number(payload.unspentAttributePoints)));
  }
  if (payload.equippedWeaponId !== undefined) updates.equippedWeaponId = payload.equippedWeaponId;
  if (payload.level != null) updates.level = Math.max(0, Math.floor(Number(payload.level)));
  if (payload.xp != null) updates.xp = Math.max(0, Math.floor(Number(payload.xp)));

  // skillLoadouts merge + meta bump
  const baseLoadouts = {
    ...((character.skillLoadouts || {}) as Record<string, unknown>),
    ...((payload.skillLoadouts || {}) as Record<string, unknown>),
  };
  const nextMeta = bumpRevision(meta);
  if (idem) {
    nextMeta.recentIdempotencyKeys = [idem, ...(meta.recentIdempotencyKeys || [])].slice(0, 32);
  }
  updates.skillLoadouts = writeProgressMeta(baseLoadouts, nextMeta);

  // Strip inventory if client accidentally sent it (account-scoped)
  // (not in allowed list — ignore)

  if (Object.keys(updates).length === 1 && updates.skillLoadouts && !payload.skillLoadouts && !mastery) {
    // only meta — still ok if other fields present; if literally empty progress, fail
    const onlyMeta =
      !payload.professionLevels &&
      !payload.equipment &&
      !payload.attributes &&
      !payload.selectedSkills &&
      payload.skillPoints == null &&
      !payload.weaponSkillSelections &&
      !payload.weaponMastery;
    if (onlyMeta && !idem) {
      return { ok: false, status: 400, error: 'empty_progress', errors: ['no progress fields'] };
    }
  }

  return { ok: true, status: 200, updates, meta: nextMeta };
}

// ── Client cache helpers ─────────────────────────────────────────

export function characterProgressStorageKey(characterId: string, domain: string): string {
  return `grudge-progress:v${CHARACTER_PROGRESS_SCHEMA_VERSION}:${domain}:${characterId}`;
}
