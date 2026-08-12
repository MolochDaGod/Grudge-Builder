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

export type PlayEntrySessionResult = {
  handoff: CharacterHandoff;
  /** JWT present after claim/wait */
  jwtPresent: boolean;
  /** Railway activate succeeded (or skipped if no id) */
  activated: boolean;
  error?: string;
};

/**
 * Phase B SSOT — call on every production play entry route:
 *   /home · /heroes · /leviathan-cinema · /tutorial · /home-island · /play · /airship
 *
 * 1) claim fleet session cookie/JWT
 * 2) wait for auth ready
 * 3) apply URL characterId handoff → localStorage
 * 4) PUT activate warlords era slot (best-effort)
 */
export async function ensurePlayEntrySession(opts?: {
  search?: string;
  /** Default warlords */
  era?: string;
  authTimeoutMs?: number;
}): Promise<PlayEntrySessionResult> {
  const era = opts?.era ?? "warlords";
  const authTimeoutMs = opts?.authTimeoutMs ?? 8000;
  const handoff = applyCharacterHandoffFromLocation(opts?.search);

  let jwtPresent = false;
  try {
    const { ensureFleetSessionClaim, waitForAuthReady, getToken, isAuthenticated } =
      await import("@/lib/grudgeBackend");
    await ensureFleetSessionClaim().catch(() => false);
    await waitForAuthReady(authTimeoutMs).catch(() => false);
    jwtPresent = !!(getToken() || isAuthenticated());
  } catch (e) {
    return {
      handoff,
      jwtPresent: false,
      activated: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }

  const id = handoff.characterId?.trim() || null;
  if (!id) {
    return { handoff, jwtPresent, activated: false };
  }

  if (handoff.fromUrl) {
    persistActiveCharacter(id, handoff.from);
  }

  let activated = false;
  if (jwtPresent) {
    try {
      const { characterAPI } = await import("@/lib/api");
      await characterAPI.activate(id, era as "warlords");
      activated = true;
      try {
        const { CharacterManager } = await import("@/lib/characterManager");
        CharacterManager.setActiveLocal(id);
        // setActive also hits activate API — we already activated; local only is enough
      } catch {
        /* optional */
      }
    } catch (e) {
      // Non-fatal — get() may still work; surface for logs
      console.warn(
        "[handoff] activate failed (continuing):",
        e instanceof Error ? e.message : e,
      );
      return {
        handoff,
        jwtPresent,
        activated: false,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }

  try {
    console.info(
      `[handoff] play entry · id=${id.slice(0, 8)}… · from=${handoff.from} · jwt=${jwtPresent} · activated=${activated}`,
    );
  } catch {
    /* ignore */
  }

  return { handoff, jwtPresent, activated };
}
