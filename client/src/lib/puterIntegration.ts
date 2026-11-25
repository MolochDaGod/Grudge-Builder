import { GAME_DATA_API } from '@/lib/grudgeConfig';

declare global {
  interface Window {
    puter: {
      ai: {
        chat: (prompt: string | object[], options?: {
          model?: string;
          stream?: boolean;
          max_tokens?: number;
          temperature?: number;
          tools?: object[];
        }) => Promise<any>;
        txt2img: (prompt: string, options?: {
          model?: string;
          quality?: string;
          size?: string;
        }) => Promise<HTMLImageElement>;
        txt2vid: (prompt: string, options?: {
          model?: string;
          seconds?: number;
          size?: string;
          provider?: string;
          test_mode?: boolean;
        }) => Promise<HTMLVideoElement>;
      };
      kv: {
        get: (key: string) => Promise<string | null>;
        set: (key: string, value: string) => Promise<void>;
        del: (key: string) => Promise<void>;
        list: (prefix?: string) => Promise<string[]>;
      };
      fs: {
        write: (path: string, content: string | Blob) => Promise<any>;
        read: (path: string) => Promise<Blob>;
        mkdir: (path: string) => Promise<any>;
        readdir: (path: string) => Promise<any[]>;
        stat: (path: string) => Promise<any>;
        delete: (path: string) => Promise<void>;
      };
      print: (message: any) => void;
      auth: {
        signIn: () => Promise<any>;
        signOut: () => Promise<void>;
        getUser: () => Promise<any>;
        isSignedIn: () => boolean;
      };
    };
  }
}

export const isPuterAvailable = (): boolean => {
  return typeof window !== 'undefined' && typeof window.puter !== 'undefined';
};

/**
 * Check if Puter is available AND the user has an active auth session.
 * Use this before any kv/fs/ai call to avoid 401/404 cascading errors
 * when the Puter SDK is loaded but the session is expired or missing.
 */
export const isPuterReady = (): boolean => {
  if (!isPuterAvailable()) return false;
  try {
    return window.puter.auth?.isSignedIn?.() ?? false;
  } catch {
    return false;
  }
};

export const puterKV = {
  async get<T>(key: string): Promise<T | null> {
    if (!isPuterReady()) return null;
    try {
      const value = await window.puter.kv.get(key);
      return value ? JSON.parse(value) : null;
    } catch (e) {
      if (!isAuthError(e)) console.error('Puter KV get error:', e);
      return null;
    }
  },

  async set<T>(key: string, value: T): Promise<boolean> {
    if (!isPuterReady()) return false;
    try {
      await window.puter.kv.set(key, JSON.stringify(value));
      return true;
    } catch (e) {
      if (!isAuthError(e)) console.error('Puter KV set error:', e);
      return false;
    }
  },

  async delete(key: string): Promise<boolean> {
    if (!isPuterReady()) return false;
    try {
      await window.puter.kv.del(key);
      return true;
    } catch (e) {
      if (!isAuthError(e)) console.error('Puter KV delete error:', e);
      return false;
    }
  },

  async list(prefix?: string): Promise<string[]> {
    if (!isPuterReady()) return [];
    try {
      return await window.puter.kv.list(prefix);
    } catch (e) {
      if (!isAuthError(e)) console.error('Puter KV list error:', e);
      return [];
    }
  }
};

/** Suppress noisy 401/connection errors from Puter SDK when session is stale */
function isAuthError(e: unknown): boolean {
  const msg = String(e);
  return msg.includes('401') || msg.includes('not exist') || msg.includes('connection') || msg.includes('Unauthorized');
}

export const puterAI = {
  async chat(prompt: string, options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    page?: string;
  }): Promise<string | null> {
    try {
      const messages = [{ role: 'user', content: prompt }];
      const requested = options?.model;
      const model = !requested
        ? 'auto'
        : requested.startsWith('puter:') || requested.startsWith('legion:')
          ? requested
          : `puter:${requested}`;
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages,
          model,
          page: options?.page || 'warlords_puterAI',
          tier: 'cheap',
          maxTokens: options?.maxTokens || 500,
        }),
      });
      const data = await res.json().catch(() => ({}));
      return data.ok && data.text ? data.text : null;
    } catch (e) {
      console.error('gruda AI chat error:', e);
      return null;
    }
  },

  async generateEnemyDialogue(enemyName: string, context: string): Promise<string> {
    const prompt = `You are ${enemyName}, a dark fantasy creature in battle. Generate a short, menacing battle cry or taunt (max 20 words). Context: ${context}`;
    const response = await this.chat(prompt, { temperature: 0.9 });
    return response || `${enemyName} snarls menacingly!`;
  },

  async generateQuestHint(questName: string, playerLevel: number): Promise<string> {
    const prompt = `Generate a mysterious hint for a fantasy RPG quest called "${questName}" for a level ${playerLevel} adventurer. Keep it cryptic and under 30 words.`;
    const response = await this.chat(prompt, { temperature: 0.8 });
    return response || 'The path forward remains shrouded in mystery...';
  },

  async generateItemLore(itemName: string, itemType: string): Promise<string> {
    const prompt = `Write brief lore (max 40 words) for a ${itemType} called "${itemName}" in a dark fantasy RPG. Make it mysterious and evocative.`;
    const response = await this.chat(prompt, { temperature: 0.7 });
    return response || 'An artifact of unknown origin, its secrets lost to time.';
  },

  async generateIslandMap(seed: string, style: 'iron' | 'fantasy' | 'tactical' | 'night' = 'fantasy'): Promise<string | null> {
    if (!isPuterReady() || !window.puter.ai?.txt2img) return null;
    
    const baseStyle = "16-bit SNES pixel art style, top-down RPG world map view, bright vibrant green forests covering most of the island, thin golden sandy coastline beaches, deep blue ocean surrounding the island, tiny detailed pixel village buildings, snow-capped mountains only in far corners of the island not center, crisp pixel shading, retro video game aesthetic, single large landmass island shape";
    
    const stylePrompts: Record<string, string> = {
      iron: `${baseStyle}, iron age settlements, ancient stone structures, dark green conifer forests, misty atmosphere, pixel art game asset`,
      fantasy: `${baseStyle}, medieval fantasy villages, castle ruins, lush deciduous forests, magical crystals scattered, bright sunny day, pixel art game asset`,
      tactical: `${baseStyle}, military outposts, watchtowers, strategic terrain features, muted earth tones, detailed pixel terrain, pixel art game asset`,
      night: `${baseStyle}, moonlit scene, glowing lanterns in villages, bioluminescent plants, starry sky reflection on water, mystical atmosphere, pixel art game asset`
    };
    
    try {
      const prompt = `${stylePrompts[style]}, centered island composition, no text or labels, seed:${seed}, 1024x1024, high quality retro RPG game map`;
      const imgElement = await window.puter.ai.txt2img(prompt, {
        model: 'black-forest-labs/FLUX.1-schnell',
        quality: 'high'
      });
      return imgElement.src;
    } catch (e) {
      console.error('Puter image generation error:', e);
      return null;
    }
  },

  async generateHeroAvatar(heroName: string, race: string, heroClass: string, faction?: string): Promise<string | null> {
    if (!isPuterReady() || !window.puter.ai?.txt2img) return null;
    
    try {
      // Race-specific physical descriptions matching the Grudge Warlords portrait style:
      // Dark fantasy painterly bust portraits, front-facing, dramatic lighting, muted browns/dark palette
      const RACE_FEATURES: Record<string, string> = {
        elf:       'tall elegant elf with long golden-blonde hair, pointed ears, sharp angular features, green piercing eyes, fair skin, elven leather armor with gold filigree',
        human:     'rugged human warrior with short dark brown hair and thick beard, weathered face, stern brown eyes, tanned skin, worn leather and chainmail armor',
        dwarf:     'stocky dwarf with massive braided brown beard and thick eyebrows, broad nose, deep-set eyes, ruddy complexion, ornate metal armor with gold trim and horned helm',
        orc:       'massive green-skinned orc with prominent tusks and lower fangs, scarred face, glowing amber eyes, thick jaw, heavy plate shoulder armor with metal spikes and rivets',
        barbarian: 'fierce human barbarian with short cropped hair and full beard, battle-scarred face, intense eyes, leather headband with metal plate, fur-trimmed leather armor and pauldrons',
        undead:    'undead skeleton knight with metallic skull face, glowing red eyes, exposed jaw mechanism, dark iron full plate helmet and armor, ghostly ethereal dark energy wisps',
      };

      const CLASS_DETAILS: Record<string, string> = {
        warrior: 'heavy plated armor, sword and shield motif, battle-hardened stance',
        mage:    'arcane robes with glowing runes, mystical staff or tome, magical aura particles',
        ranger:  'hooded leather armor, quiver of arrows visible, keen hunter expression',
        worg:    'bestial tribal armor, feral eyes with amber glow, claw-marked leather, primal energy',
      };

      const raceDesc = RACE_FEATURES[race.toLowerCase()] || `${race} fantasy warrior`;
      const classDesc = CLASS_DETAILS[heroClass.toLowerCase()] || 'adventurer gear';

      const prompt = [
        `Dark fantasy RPG character portrait card, ornate gold border frame,`,
        `front-facing bust portrait of a ${raceDesc},`,
        `${classDesc},`,
        `the name "${heroName}" engraved in stylized gold medieval font at the bottom of the card,`,
        `dark moody background with subtle faction color glow,`,
        `painterly digital art style, dramatic cinematic rim lighting from above,`,
        `muted earth tones with selective gold accents, rich detailed textures,`,
        `collectible card game artwork, legendary rarity border glow,`,
        `hyper-detailed face, intense expression, no watermark, 1024x1024`,
      ].join(' ');

      const imgElement = await window.puter.ai.txt2img(prompt, {
        model: 'black-forest-labs/FLUX.1-schnell',
        quality: 'high',
        size: '1024x1024',
      });
      return imgElement.src;
    } catch (e) {
      console.error('Puter avatar generation error:', e);
      return null;
    }
  }
};

export const puterFS = {
  async saveGameState(userId: string, gameState: object): Promise<boolean> {
    if (!isPuterReady()) return false;
    try {
      const path = `/GrudgeWarlords/saves/${userId}_save.json`;
      await window.puter.fs.mkdir('/GrudgeWarlords/saves').catch(() => {});
      await window.puter.fs.write(path, JSON.stringify(gameState, null, 2));
      return true;
    } catch (e) {
      console.error('Puter FS save error:', e);
      return false;
    }
  },

  async loadGameState(userId: string): Promise<object | null> {
    if (!isPuterReady()) return null;
    try {
      const path = `/GrudgeWarlords/saves/${userId}_save.json`;
      const blob = await window.puter.fs.read(path);
      const text = await blob.text();
      return JSON.parse(text);
    } catch (e) {
      console.error('Puter FS load error:', e);
      return null;
    }
  },

  async listSaves(): Promise<string[]> {
    if (!isPuterReady()) return [];
    try {
      const files = await window.puter.fs.readdir('/GrudgeWarlords/saves');
      return files.map((f: any) => f.name).filter((n: string) => n.endsWith('_save.json'));
    } catch (e) {
      return [];
    }
  }
};

export const puterAuth = {
  async signIn(): Promise<any> {
    if (!isPuterAvailable()) return null;
    try {
      return await window.puter.auth.signIn();
    } catch (e) {
      console.error('Puter auth error:', e);
      return null;
    }
  },

  async signOut(): Promise<void> {
    if (!isPuterAvailable()) return;
    try {
      await window.puter.auth.signOut();
    } catch (e) {
      console.error('Puter signout error:', e);
    }
  },

  async getUser(): Promise<any> {
    if (!isPuterAvailable()) return null;
    try {
      return await window.puter.auth.getUser();
    } catch (e) {
      return null;
    }
  },

  isSignedIn(): boolean {
    if (!isPuterAvailable()) return false;
    try {
      return window.puter.auth.isSignedIn();
    } catch (e) {
      return false;
    }
  }
};

// ── Island save helpers (Railway SSOT → Puter KV cache → localStorage) ───────

function readGrudgeAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem('grudge_auth_token') || localStorage.getItem('grudge_session_token');
  } catch {
    return null;
  }
}

function gameDataApiBase(): string {
  if (typeof window === 'undefined') return '';
  const cfg = (window as { GRUDGE_CONFIG?: { GAME_DATA?: string } }).GRUDGE_CONFIG?.GAME_DATA;
  if (cfg) return cfg.replace(/\/$/, '');
  if (GAME_DATA_API && !GAME_DATA_API.startsWith('/')) {
    return GAME_DATA_API.replace(/\/$/, '');
  }
  return '';
}

async function fleetAwareFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const base = gameDataApiBase();
  const url = base ? `${base}${path}` : path;
  if (typeof window !== 'undefined' && window.puter?.net?.fetch) {
    try {
      return await window.puter.net.fetch(url, init);
    } catch { /* fall through */ }
  }
  return fetch(url, init);
}

async function fetchRailwayIslandState<T>(): Promise<T | null> {
  const token = readGrudgeAuthToken();
  if (!token) return null;
  try {
    const res = await fleetAwareFetch('/api/island', {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Session-Token': token,
      },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const state = data?.state ?? data?.island?.state ?? data?.islandState;
    return (state as T) ?? null;
  } catch {
    return null;
  }
}

async function patchRailwayIslandState(state: unknown): Promise<boolean> {
  const token = readGrudgeAuthToken();
  if (!token) return false;
  try {
    const res = await fleetAwareFetch('/api/island/state', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'X-Session-Token': token,
      },
      body: JSON.stringify({ state }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// Keys: grudge:island:{id}:state | grudge:island:{id}:grid

export const puterIslandKV = {
  /**
   * Save island state: Railway Postgres first, then Puter KV cache, then localStorage.
   */
  async saveState(islandId: string, state: unknown): Promise<boolean> {
    const stamped = typeof state === 'object' && state
      ? { ...(state as object), lastUpdate: Date.now() }
      : state;

    const railwayOk = await patchRailwayIslandState(stamped);
    const kvOk = await puterKV.set(`grudge:island:${islandId}:state`, stamped);
    try { localStorage.setItem(`grudge_island_${islandId}`, JSON.stringify(stamped)); } catch {}

    if (!railwayOk && !kvOk) {
      console.warn('[puterIslandKV] Railway + Puter KV save failed; localStorage only');
      return false;
    }
    return railwayOk || kvOk;
  },

  /**
   * Load island state: Railway (newest) → Puter KV → localStorage.
   */
  async loadState<T extends { lastUpdate?: number } = any>(islandId: string, userId: string): Promise<T | null> {
    const railway = await fetchRailwayIslandState<T>();
    const kvState = await puterKV.get<T>(`grudge:island:${islandId}:state`);

    let cached: T | null = null;
    try {
      const raw = localStorage.getItem(`grudge_island_${islandId}`) || localStorage.getItem(`grudge_island_${userId}`);
      if (raw) cached = JSON.parse(raw) as T;
    } catch { /* corrupt */ }

    const candidates = [railway, kvState, cached].filter(Boolean) as T[];
    if (!candidates.length) return null;

    const freshest = candidates.reduce((best, cur) =>
      (cur.lastUpdate ?? 0) > (best.lastUpdate ?? 0) ? cur : best,
    );

    if (freshest !== kvState) {
      await puterKV.set(`grudge:island:${islandId}:state`, freshest).catch(() => {});
    }
    try { localStorage.setItem(`grudge_island_${islandId}`, JSON.stringify(freshest)); } catch {}

    return freshest;
  },

  /** Save serialized tile grid (seed + cleared tiles only, ~2KB) */
  async saveGrid(islandId: string, gridData: unknown): Promise<boolean> {
    return puterKV.set(`grudge:island:${islandId}:grid`, gridData);
  },

  async loadGrid<T = unknown>(islandId: string): Promise<T | null> {
    return puterKV.get<T>(`grudge:island:${islandId}:grid`);
  },

  /** Save/load player's 3×3 world block allocation */
  async savePlayerBlock(blockData: unknown): Promise<boolean> {
    return puterKV.set('grudge:world:player-block', blockData);
  },

  async loadPlayerBlock<T = unknown>(): Promise<T | null> {
    return puterKV.get<T>('grudge:world:player-block');
  },

  /** Save/load account-level data (gold, resources, settings) */
  async saveAccount(data: unknown): Promise<boolean> {
    return puterKV.set('grudge:account', data);
  },

  async loadAccount<T = unknown>(): Promise<T | null> {
    return puterKV.get<T>('grudge:account');
  },
};

export const PUTER_CONFIG = {
  appName: 'Grudge Warlords',
  version: '2.5.0',
  studio: 'Grudge Studio',
  author: 'RacalvinDaPirateKing',
  developerUrl: 'https://grudge-studio.com',
  savePrefix: 'grudge_warlords_',
  // Centralized: use env var, fallback to API proxy (same-origin), then legacy Puter URL.
  // NOTE: the previous chain used `|| '/api/game' || '...'` which made the last fallback
  // unreachable (non-empty string is truthy). Now selects the legacy Puter URL only when
  // VITE_PUTER_LEGACY=true; otherwise defaults to the same-origin Vercel-rewritten proxy.
  serverUrl:
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_PUTER_SERVER_URL) ||
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_PUTER_LEGACY === 'true'
      ? 'https://grudge-server.puter.work'
      : '/api/game'),
};

export interface PuterServerResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export const puterServer = {
  async health(): Promise<{ status: string; version: string }> {
    try {
      const res = await fetch(`${PUTER_CONFIG.serverUrl}/api/health`);
      return await res.json();
    } catch (e) {
      console.error('Puter server health check failed:', e);
      return { status: 'offline', version: 'unknown' };
    }
  },

  async aiChat(messages: Array<{ role: string; content: string }>, options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  }): Promise<string | null> {
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages,
          model: options?.model || 'auto',
          page: 'warlords_puterServer',
          maxTokens: options?.maxTokens || 512,
          tier: 'cheap',
        })
      });
      const data = await res.json();
      return data.text || data.content || data.message || null;
    } catch (e) {
      console.error('Puter server AI chat error:', e);
      return null;
    }
  },

  async aiVision(imageUrl: string, prompt: string): Promise<string | null> {
    try {
      const res = await fetch(`${PUTER_CONFIG.serverUrl}/api/ai/vision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl, prompt })
      });
      const data = await res.json();
      return data.content || data.description || null;
    } catch (e) {
      console.error('Puter server AI vision error:', e);
      return null;
    }
  },

  async generateSprite(prompt: string, options?: {
    style?: string;
    size?: string;
    category?: string;
  }): Promise<{ jobId: string } | null> {
    try {
      const res = await fetch(`${PUTER_CONFIG.serverUrl}/api/sprites/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, ...options })
      });
      return await res.json();
    } catch (e) {
      console.error('Puter server sprite generation error:', e);
      return null;
    }
  },

  async getJobStatus(jobId: string): Promise<{
    status: 'pending' | 'processing' | 'completed' | 'failed';
    result?: any;
    error?: string;
  } | null> {
    try {
      const res = await fetch(`${PUTER_CONFIG.serverUrl}/api/jobs/${jobId}`);
      return await res.json();
    } catch (e) {
      console.error('Puter server job status error:', e);
      return null;
    }
  },

  async getJobs(): Promise<any[]> {
    try {
      const res = await fetch(`${PUTER_CONFIG.serverUrl}/api/jobs`);
      const data = await res.json();
      return data.jobs || [];
    } catch (e) {
      console.error('Puter server jobs list error:', e);
      return [];
    }
  },

  async getGameData(): Promise<any> {
    try {
      const res = await fetch(`${PUTER_CONFIG.serverUrl}/api/data/game`);
      return await res.json();
    } catch (e) {
      console.error('Puter server game data error:', e);
      return null;
    }
  },

  async getDataByType(dataType: string): Promise<any> {
    try {
      const res = await fetch(`${PUTER_CONFIG.serverUrl}/api/data/${dataType}`);
      return await res.json();
    } catch (e) {
      console.error(`Puter server data (${dataType}) error:`, e);
      return null;
    }
  },

  async syncData(data: any): Promise<boolean> {
    try {
      const res = await fetch(`${PUTER_CONFIG.serverUrl}/api/data/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await res.json();
      return result.success || false;
    } catch (e) {
      console.error('Puter server data sync error:', e);
      return false;
    }
  },

  async npcChat(npcId: string, message: string, context?: {
    playerName?: string;
    playerLevel?: number;
    location?: string;
    faction?: string;
  }): Promise<string | null> {
    try {
      const res = await fetch(`${PUTER_CONFIG.serverUrl}/api/npc/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ npcId, message, context })
      });
      const data = await res.json();
      return data.response || data.message || null;
    } catch (e) {
      console.error('Puter server NPC chat error:', e);
      return null;
    }
  },

  async verifyAuth(token: string): Promise<{ valid: boolean; user?: any }> {
    try {
      const res = await fetch(`${PUTER_CONFIG.serverUrl}/api/auth/verify`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return await res.json();
    } catch (e) {
      console.error('Puter server auth verify error:', e);
      return { valid: false };
    }
  },

  async consumeAuth(code: string): Promise<{ token?: string; user?: any } | null> {
    try {
      const res = await fetch(`${PUTER_CONFIG.serverUrl}/api/auth/consume`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });
      return await res.json();
    } catch (e) {
      console.error('Puter server auth consume error:', e);
      return null;
    }
  }
};

// AI Helper Animation States
export type HelperAnimationState = 
  | 'idle' | 'idle2' | 'idle3'
  | 'talking' | 'talking2' | 'talkandpoint'
  | 'excited' | 'wave'
  | 'sleep' | 'getup';

export const HELPER_ANIMATION_CONFIG: Record<HelperAnimationState, { loop: boolean; nextState?: HelperAnimationState }> = {
  idle: { loop: true },
  idle2: { loop: true },
  idle3: { loop: true },
  talking: { loop: true },
  talking2: { loop: true },
  talkandpoint: { loop: true },
  excited: { loop: true, nextState: 'idle' },
  wave: { loop: false, nextState: 'idle' },
  sleep: { loop: false },
  getup: { loop: false, nextState: 'idle' }
};

// Race-specific helper character definitions
export type HelperRace = 'human' | 'barbarian' | 'undead' | 'orc' | 'elf' | 'dwarf';

export interface HelperCharacter {
  race: HelperRace;
  name: string;
  faction: 'Crusade' | 'Legion' | 'Fabled';
  title: string;
  personality: string;
  appearance: string;
  accessory: string;
}

export const HELPER_CHARACTERS: Record<HelperRace, HelperCharacter> = {
  human: {
    race: 'human',
    name: 'Sir Aldric',
    faction: 'Crusade',
    title: 'The Chronicler',
    personality: 'wise, patient, scholarly',
    appearance: 'noble human warrior with brown hair, leather armor, green cape, friendly welcoming expression',
    accessory: 'holding an ancient tome or pointing with a quill'
  },
  barbarian: {
    race: 'barbarian',
    name: 'Bjorn',
    faction: 'Crusade',
    title: 'Battle Tutor',
    personality: 'enthusiastic, fierce but friendly, loud',
    appearance: 'muscular barbarian with red beard, fur-trimmed leather armor, arm bands, hearty grin',
    accessory: 'holding a training weapon or gesturing broadly'
  },
  undead: {
    race: 'undead',
    name: 'Mortis',
    faction: 'Legion',
    title: 'Lore Whisper',
    personality: 'cryptic, ancient wisdom, darkly humorous',
    appearance: 'skeletal undead with glowing blue eye sockets, tattered dark robes, bone crown',
    accessory: 'holding a floating spectral orb or ancient scroll'
  },
  orc: {
    race: 'orc',
    name: 'Grukk',
    faction: 'Legion',
    title: 'Tactics Crusher',
    personality: 'direct, aggressive teaching style, surprisingly helpful',
    appearance: 'green-skinned orc with tusks, iron shoulder pauldrons, war paint, intimidating but approachable',
    accessory: 'pointing at a tactical map or flexing demonstratively'
  },
  elf: {
    race: 'elf',
    name: 'Aelindra',
    faction: 'Fabled',
    title: 'Arcane Guide',
    personality: 'serene, mystical, patient teacher',
    appearance: 'elegant elf with pointed ears, long flowing hair, nature-infused leather garb, glowing runes',
    accessory: 'conjuring magical symbols or holding a crystal staff'
  },
  dwarf: {
    race: 'dwarf',
    name: 'Thorin',
    faction: 'Fabled',
    title: 'Forge Mentor',
    personality: 'gruff, practical, master craftsman',
    appearance: 'stout dwarf with magnificent braided beard, blacksmith apron over armor, goggles on forehead',
    accessory: 'holding a hammer and blueprint or pointing at crafting diagrams'
  }
};

// Animation prompt templates for each state
export const ANIMATION_PROMPTS: Record<HelperAnimationState, string> = {
  idle: 'standing relaxed, slight breathing animation, gentle sway, looking forward with friendly expression',
  idle2: 'shifting weight between feet, looking around curiously, occasional blink',
  idle3: 'arms crossed casually, nodding head slowly, contemplative expression',
  talking: 'mouth moving in speech, hand gestures while explaining, engaging eye contact',
  talking2: 'emphatic speaking, both hands gesturing, nodding while talking',
  talkandpoint: 'speaking while pointing finger forward, directing attention, instructive pose',
  excited: 'jumping slightly, arms raised, big smile, celebratory energy',
  wave: 'waving hand in greeting, warm smile, welcoming gesture',
  sleep: 'head drooping, eyes closed, peaceful rest, slight snoring motion',
  getup: 'stretching, yawning, shaking head to wake up, returning to alert stance'
};

// Generate video prompt for a specific helper and animation
export function generateHelperPrompt(race: HelperRace, animation: HelperAnimationState): string {
  const helper = HELPER_CHARACTERS[race];
  const animAction = ANIMATION_PROMPTS[animation];
  
  return `Animated fantasy RPG character, ${helper.appearance}, ${animAction}, ${helper.accessory}, solid bright green chroma key background (#00FF00), cartoon game art style matching World of Warcraft aesthetic, smooth looping animation, centered composition, full body shot showing entire character from head to feet, high quality 3D render, no text or UI elements`;
}

// Chroma key removal - removes green screen and returns processed canvas
export function createChromaKeyCanvas(video: HTMLVideoElement): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return canvas;
  
  canvas.width = video.videoWidth || 360;
  canvas.height = video.videoHeight || 640;
  
  return canvas;
}

// Process video frame to remove green background
export function processChromaKeyFrame(
  video: HTMLVideoElement, 
  canvas: HTMLCanvasElement,
  threshold = 100,
  smoothing = 30
): void {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx || video.paused || video.ended) return;
  
  canvas.width = video.videoWidth || 360;
  canvas.height = video.videoHeight || 640;
  
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = frame.data;
  
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    // Check if pixel is green (chroma key)
    const isGreen = g > threshold && g > r + smoothing && g > b + smoothing;
    
    if (isGreen) {
      // Make transparent
      data[i + 3] = 0;
    }
  }
  
  ctx.putImageData(frame, 0, 0);
}

// Create a chroma key video player that renders to canvas with green removed
export function startChromaKeyPlayback(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  onFrame?: () => void
): () => void {
  let animationId: number;
  let isActive = true;
  
  const renderFrame = () => {
    if (!isActive) return;
    
    if (!video.paused && !video.ended) {
      processChromaKeyFrame(video, canvas);
      onFrame?.();
    }
    
    animationId = requestAnimationFrame(renderFrame);
  };
  
  video.addEventListener('play', () => {
    if (isActive) renderFrame();
  });
  
  if (!video.paused) {
    renderFrame();
  }
  
  // Return cleanup function
  return () => {
    isActive = false;
    if (animationId) {
      cancelAnimationFrame(animationId);
    }
  };
}

// Puter txt2vid wrapper for helper generation
export const puterVideo = {
  async generateHelperAnimation(
    race: HelperRace, 
    animation: HelperAnimationState,
    options?: { testMode?: boolean; seconds?: number }
  ): Promise<HTMLVideoElement | null> {
    if (!isPuterReady() || !window.puter.ai?.txt2vid) {
      console.error('Puter txt2vid not available');
      return null;
    }
    
    try {
      const prompt = generateHelperPrompt(race, animation);
      const video = await window.puter.ai.txt2vid(prompt, {
        model: 'sora-2',
        seconds: options?.seconds || 4,
        size: '720x1280', // Portrait for character
        test_mode: options?.testMode || false
      });
      return video;
    } catch (e) {
      console.error('Puter video generation error:', e);
      return null;
    }
  },

  async generateAllAnimationsForRace(
    race: HelperRace,
    onProgress?: (state: HelperAnimationState, index: number, total: number) => void,
    testMode = false
  ): Promise<Map<HelperAnimationState, string>> {
    const results = new Map<HelperAnimationState, string>();
    const states = Object.keys(HELPER_ANIMATION_CONFIG) as HelperAnimationState[];
    
    for (let i = 0; i < states.length; i++) {
      const state = states[i];
      onProgress?.(state, i, states.length);
      
      const video = await this.generateHelperAnimation(race, state, { testMode });
      if (video) {
        // Extract video source URL
        const src = video.getAttribute('data-source') || video.src;
        if (src) results.set(state, src);
      }
    }
    
    return results;
  }
};
