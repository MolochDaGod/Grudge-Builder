/**
 * Portal universe hydrate — Grudge Builder / client.grudge-studio.com
 * Pulls characters, islands, decks, play-settings from api.grudge-studio.com
 */
const PORTAL_API = import.meta.env.VITE_PORTAL_API || "https://api.grudge-studio.com";

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

function captureLaunch(): Record<string, string | null> {
  const p = new URLSearchParams(window.location.search);
  const token = p.get("grudge_token") || p.get("token");
  if (token) {
    localStorage.setItem("grudge_auth_token", token);
    sessionStorage.setItem("grudge_auth_token", token);
    try {
      const u = new URL(window.location.href);
      u.searchParams.delete("grudge_token");
      u.searchParams.delete("token");
      window.history.replaceState(null, "", u.pathname + u.search + u.hash);
    } catch {
      /* ignore */
    }
  }
  return {
    token: token || localStorage.getItem("grudge_auth_token"),
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
    headers.Authorization = `Bearer ${token}`;
    headers["X-Grudge-Token"] = token;
  }
  const res = await fetch(`${PORTAL_API}${path}`, { credentials: "include", headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
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
    if (data?.token) localStorage.setItem("grudge_auth_token", data.token);
    return data;
  } catch {
    return null;
  }
}

export async function hydratePortalUniverse(): Promise<PortalUniverseState> {
  const launch = captureLaunch();
  let token = launch.token;
  if (token && token.split(".").length === 3) {
    await exchange(token);
    token = localStorage.getItem("grudge_auth_token") || token;
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
    errors.push(`universe: ${e?.message || e}`);
  }
  try {
    const ps = await portalGet("/api/me/play-settings", token);
    playSettings = ps.settings || ps;
  } catch (e: any) {
    errors.push(`play-settings: ${e?.message || e}`);
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
