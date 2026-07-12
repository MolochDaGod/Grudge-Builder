/**
 * Portal universe hydrate — grudgewarlords.com / client.grudge-studio.com
 *
 * IMPORTANT: always hit **same-origin** `/api/*` (Vercel rewrites → Railway).
 * Never call https://api.grudge-studio.com from the browser with X-Grudge-Token —
 * that host's CORS preflight rejects the header and breaks the whole app shell.
 */
const PORTAL_API =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_PORTAL_API) ||
  ""; // same-origin

export type PortalUniverseState = {
  ok: boolean;
  player: any | null;
  universe: any | null;
  playSettings: any | null;
  activeCharacter: any | null;
  homeIsland: any | null;
  activeDeck: any | null;
  launch: Record<string, string | null>;
  errors: string[];
};

function readToken(): string | null {
  try {
    return (
      localStorage.getItem("grudge_auth_token") ||
      localStorage.getItem("sso_token") ||
      localStorage.getItem("grudge_session_token") ||
      sessionStorage.getItem("grudge_auth_token") ||
      null
    );
  } catch {
    return null;
  }
}

function captureLaunch(): Record<string, string | null> {
  const p = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(
    window.location.hash?.startsWith("#")
      ? window.location.hash.slice(1)
      : window.location.hash || "",
  );
  const token =
    p.get("grudge_token") ||
    p.get("sso_token") ||
    p.get("token") ||
    hash.get("sso_token") ||
    hash.get("grudge_token") ||
    hash.get("token");
  if (token) {
    try {
      localStorage.setItem("grudge_auth_token", token);
      sessionStorage.setItem("grudge_auth_token", token);
    } catch {
      /* ignore */
    }
    try {
      const u = new URL(window.location.href);
      ["grudge_token", "sso_token", "token"].forEach((k) => u.searchParams.delete(k));
      window.history.replaceState(null, "", u.pathname + u.search + u.hash);
    } catch {
      /* ignore */
    }
  }
  return {
    token: token || readToken(),
    hero: p.get("hero"),
    characterId: p.get("characterId"),
    islandId: p.get("islandId"),
    deckId: p.get("deckId"),
    primary: p.get("primary"),
    secondary: p.get("secondary"),
  };
}

async function portalGet(path: string, token: string | null) {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (token) {
    // Authorization only — do NOT send X-Grudge-Token (breaks CORS on legacy hosts)
    headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`${PORTAL_API}${path}`, {
    credentials: "include",
    headers,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error || `HTTP ${res.status}`);
  }
  return res.json();
}

async function exchange(token: string) {
  try {
    const res = await fetch(`${PORTAL_API}/api/auth/session/exchange`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, audience: window.location.origin }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.token) {
      try {
        localStorage.setItem("grudge_auth_token", data.token);
      } catch {
        /* ignore */
      }
    }
    return data;
  } catch {
    return null;
  }
}

/**
 * Build a minimal "universe" from Railway character list when /api/me/universe
 * is not implemented on this host.
 */
async function fallbackUniverseFromCharacters(token: string | null) {
  try {
    const data = await portalGet("/api/characters", token);
    const list = Array.isArray(data)
      ? data
      : data?.characters || data?.items || data?.data || [];
    if (!Array.isArray(list) || list.length === 0) return null;
    const characters = list.map((c: any) => ({
      ...c,
      isActive: !!(c.isActive || c.active),
    }));
    return { characters, islands: [], decks: [] };
  } catch {
    return null;
  }
}

export async function hydratePortalUniverse(): Promise<PortalUniverseState> {
  const launch = captureLaunch();
  let token = launch.token;
  if (token && token.split(".").length === 3) {
    await exchange(token);
    token = readToken() || token;
  }

  // Guest / no token: skip network noise (401 spam on every page)
  if (!token) {
    const empty: PortalUniverseState = {
      ok: false,
      player: null,
      universe: null,
      playSettings: null,
      activeCharacter: null,
      homeIsland: null,
      activeDeck: null,
      launch,
      errors: [],
    };
    try {
      (window as any).__GRUDGE_UNIVERSE__ = empty;
    } catch {
      /* ignore */
    }
    return empty;
  }

  const errors: string[] = [];
  let player = null;
  let universe = null;
  let playSettings = null;

  try {
    player = await portalGet("/api/auth/me", token);
  } catch (e: any) {
    errors.push(`me: ${e?.message || e}`);
  }

  try {
    universe = await portalGet("/api/me/universe", token);
  } catch (e: any) {
    // Soft: many deploys only have /api/characters
    universe = await fallbackUniverseFromCharacters(token);
    if (!universe) errors.push(`universe: ${e?.message || e}`);
  }

  try {
    const ps = await portalGet("/api/me/play-settings", token);
    playSettings = ps.settings || ps;
  } catch {
    // optional — do not hard-fail shell
  }

  let activeCharacter =
    universe?.characters?.find((c: any) => c.isActive) || universe?.characters?.[0] || null;
  if (launch.characterId && universe?.characters) {
    activeCharacter =
      universe.characters.find((c: any) => String(c.id) === String(launch.characterId)) ||
      activeCharacter;
  }
  if (launch.hero && universe?.characters) {
    activeCharacter =
      universe.characters.find((c: any) => c.prefabId === launch.hero) || activeCharacter;
  }

  let homeIsland =
    universe?.islands?.find((i: any) => i.isHome) || universe?.islands?.[0] || null;
  if (launch.islandId && universe?.islands) {
    homeIsland =
      universe.islands.find((i: any) => String(i.id) === String(launch.islandId)) || homeIsland;
  }

  let activeDeck =
    universe?.decks?.find((d: any) => d.isActive) || universe?.decks?.[0] || null;
  if (launch.deckId && universe?.decks) {
    activeDeck =
      universe.decks.find((d: any) => String(d.id) === String(launch.deckId)) || activeDeck;
  }

  const state: PortalUniverseState = {
    ok: !!(player || universe),
    player,
    universe,
    playSettings,
    activeCharacter,
    homeIsland,
    activeDeck,
    launch,
    errors,
  };

  try {
    localStorage.setItem("grudge_portal_universe", JSON.stringify(state));
    (window as any).__GRUDGE_UNIVERSE__ = state;
    window.dispatchEvent(new CustomEvent("grudge:universe:ready", { detail: state }));
  } catch {
    /* ignore */
  }

  if (playSettings) {
    try {
      document.documentElement.dataset.grudgeQuality = playSettings.graphics?.quality || "high";
      document.documentElement.dataset.grudgeShadows = String(!!playSettings.graphics?.shadows);
      document.documentElement.dataset.grudgeMouseSens = String(
        playSettings.controls?.mouseSensitivity ?? 1,
      );
    } catch {
      /* ignore */
    }
  }

  return state;
}
