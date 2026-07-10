/**
 * Canonical hero identity for the Grudge fleet.
 *
 * - `id`          — Postgres UUID primary key (row identity)
 * - `grudgeCode`  — human-facing GRDG-{RACE3}{CLASS3}-{suffix} stamp
 * - `name`        — player-chosen display name (never the code)
 *
 * All hero creation (Foundry, GCS, Warlords, fleet SDK) must resolve through
 * `resolveHeroIdentity` on the server so every path lands the same shape.
 */

export const GRUDGE_CODE_RE =
  /^GRDG-[A-Z0-9]{3,12}-[A-Z0-9]{4,12}$/i;

/** Short hash form still seen on older rows / NPC specs: GRDG-B5062E */
export const GRUDGE_CODE_SHORT_RE = /^GRDG-[A-Z0-9]{4,10}$/i;

export function isGrudgeCode(value: unknown): boolean {
  if (typeof value !== "string") return false;
  const s = value.trim();
  return GRUDGE_CODE_RE.test(s) || GRUDGE_CODE_SHORT_RE.test(s);
}

/** GRDG-HUMWAR-W7ZXH4 style codes from race + class. */
export function makeCharacterGrudgeCode(
  raceId: string,
  classId: string,
  opts?: { random?: () => number; now?: () => number },
): string {
  const race = String(raceId || "unk").replace(/[^a-zA-Z0-9]/g, "");
  const cls = String(classId || "war").replace(/[^a-zA-Z0-9]/g, "");
  const r = (race.slice(0, 3) || "UNK").toUpperCase();
  const c = (cls.slice(0, 3) || "WAR").toUpperCase();
  const now = opts?.now?.() ?? Date.now();
  const rnd = opts?.random?.() ?? Math.random();
  const t = now.toString(36).toUpperCase().slice(-5);
  const rand = rnd.toString(36).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(2, 5) || "X0Z";
  return `GRDG-${r}${c}-${t}${rand}`;
}

const DEFAULT_HERO_NAME = "Warlord";

/**
 * Player display name: 2–32 chars, not a grudge code, printable.
 * Empty / code-like inputs fall back to `fallback`.
 */
export function sanitizeHeroName(
  raw: unknown,
  fallback: string = DEFAULT_HERO_NAME,
): string {
  const s = typeof raw === "string" ? raw.trim().replace(/\s+/g, " ") : "";
  if (!s || isGrudgeCode(s)) {
    return (fallback || DEFAULT_HERO_NAME).slice(0, 32);
  }
  // Strip control chars; keep letters, numbers, spaces, basic punctuation
  const cleaned = s
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/[^\p{L}\p{N} _\-'.]/gu, "")
    .trim()
    .slice(0, 32);
  if (cleaned.length < 2) return (fallback || DEFAULT_HERO_NAME).slice(0, 32);
  return cleaned;
}

export interface HeroIdentityInput {
  name?: unknown;
  grudgeCode?: unknown;
  /** Legacy aliases accepted from clients */
  grudgeDisplayId?: unknown;
  grudgeUuid?: unknown;
  raceId?: unknown;
  classId?: unknown;
  model3d?: { grudgeDisplayId?: unknown; grudgeCode?: unknown } | null;
}

export interface HeroIdentity {
  name: string;
  grudgeCode: string;
}

/**
 * Resolve name + grudgeCode for insert.
 * - Prefer explicit grudgeCode / grudgeDisplayId / model3d.grudgeDisplayId
 * - If `name` is a GRDG code and no code was sent, treat name as the code
 * - Always generate a code when missing
 */
export function resolveHeroIdentity(input: HeroIdentityInput): HeroIdentity {
  const raceId = String(input.raceId || "human");
  const classId = String(input.classId || "warrior");

  const fromBody =
    (typeof input.grudgeCode === "string" && input.grudgeCode.trim()) ||
    (typeof input.grudgeDisplayId === "string" && input.grudgeDisplayId.trim()) ||
    (typeof input.grudgeUuid === "string" && input.grudgeUuid.trim()) ||
    (typeof input.model3d?.grudgeCode === "string" && input.model3d.grudgeCode.trim()) ||
    (typeof input.model3d?.grudgeDisplayId === "string" &&
      input.model3d.grudgeDisplayId.trim()) ||
    "";

  const rawName = typeof input.name === "string" ? input.name.trim() : "";

  let grudgeCode = fromBody;
  let nameSource = rawName;

  if (!grudgeCode && isGrudgeCode(rawName)) {
    grudgeCode = rawName;
    nameSource = "";
  }

  if (!grudgeCode || !isGrudgeCode(grudgeCode)) {
    grudgeCode = makeCharacterGrudgeCode(raceId, classId);
  } else {
    grudgeCode = grudgeCode.toUpperCase();
  }

  const name = sanitizeHeroName(nameSource, DEFAULT_HERO_NAME);

  return { name, grudgeCode };
}
