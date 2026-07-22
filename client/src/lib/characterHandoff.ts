/**
 * Production character handoff SSOT — heroes / Foundry / Open / water.
 *
 * Canonical play URL pattern:
 *   /tutorial?characterId=<uuid>&from=heroes
 *   /home-island?characterId=<uuid>&from=gcs
 *
 * Always prefer URL characterId over stale localStorage.
 * Persist active keys for grudge_account_id when present.
 */

export type HandoffSource =
  | "heroes"
  | "gcs"
  | "foundry"
  | "open"
  | "water"
  | "campfire"
  | "direct"
  | string;

export type CharacterHandoff = {
  characterId: string | null;
  from: HandoffSource;
  /** True when id came from query (authoritative). */
  fromUrl: boolean;
};

const ACTIVE_KEYS = [
  "grudge_active_character",
  "gruda_active_character",
] as const;

/** Parse handoff from current location (or given search string). */
export function parseCharacterHandoff(
  search: string = typeof window !== "undefined" ? window.location.search : "",
): CharacterHandoff {
  const params = new URLSearchParams(search.startsWith("?") ? search : `?${search}`);
  const urlCharacterId =
    params.get("characterId")?.trim() ||
    params.get("character_id")?.trim() ||
    params.get("charId")?.trim() ||
    null;
  const fromRaw = (params.get("from") || params.get("source") || "direct").toLowerCase();
  const from = (fromRaw || "direct") as HandoffSource;

  if (urlCharacterId) {
    return { characterId: urlCharacterId, from, fromUrl: true };
  }

  // Fallback: storage (legacy)
  let grudgeId = "guest";
  try {
    grudgeId =
      localStorage.getItem("grudge_account_id") ||
      localStorage.getItem("grudge_id") ||
      "guest";
  } catch {
    /* private mode */
  }

  let stored: string | null = null;
  try {
    stored =
      localStorage.getItem(`gruda_active_character_${grudgeId}`) ||
      localStorage.getItem("grudge_active_character") ||
      localStorage.getItem("gruda_active_character") ||
      localStorage.getItem("gruda_active_character_guest");
  } catch {
    stored = null;
  }

  return { characterId: stored, from, fromUrl: false };
}

/** Persist active character for all fleet consumers. */
export function persistActiveCharacter(characterId: string, from?: HandoffSource): void {
  if (!characterId) return;
  try {
    let grudgeId = localStorage.getItem("grudge_account_id") || "guest";
    localStorage.setItem("grudge_active_character", characterId);
    localStorage.setItem("gruda_active_character", characterId);
    localStorage.setItem(`gruda_active_character_${grudgeId}`, characterId);
    if (from) localStorage.setItem("grudge_character_handoff_from", from);
    localStorage.setItem("grudge_character_handoff_at", String(Date.now()));
  } catch {
    /* ignore */
  }
}

/** Apply URL handoff if present — returns resolved character id. */
export function applyCharacterHandoffFromLocation(
  search?: string,
): CharacterHandoff {
  const h = parseCharacterHandoff(search);
  if (h.characterId && h.fromUrl) {
    persistActiveCharacter(h.characterId, h.from);
  }
  return h;
}

/** Build tutorial enter URL (heroes → tutorial). */
export function tutorialHandoffUrl(characterId: string, from: HandoffSource = "heroes"): string {
  return `/tutorial?characterId=${encodeURIComponent(characterId)}&from=${encodeURIComponent(from)}`;
}
