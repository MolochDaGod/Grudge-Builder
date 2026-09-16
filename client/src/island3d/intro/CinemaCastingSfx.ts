/**
 * Leviathan cinema SFX — the user WAV pack that was accidentally left only
 * on Casting Lab (casting.grudge.studio / casting.grudge-studio.com).
 *
 * Same-origin SSOT after cinema deploy:
 *   client.grudge-studio.com/audio/sfx/*.wav
 * Fleet fallback (CORS * , full files, live now):
 *   https://casting.grudge.studio/audio/sfx/*.wav
 *
 * Do NOT use assets.grudge-studio.com/audio/casting/sfx — those copies are
 * truncated (~44 KB) and missing most stems.
 *
 * Roles match Casting Lab skillSfx.js so the same clips hit the same beats.
 */
export type CinemaSfxRole =
  | 'cast_ramp'
  | 'cast_chant'
  | 'parry'
  | 'parry_magic'
  | 'impact_magic'
  | 'burn'
  | 'heal';

export const CINEMA_SFX_LOCAL_BASE = '/audio/sfx';
export const CINEMA_SFX_FLEET_BASE = 'https://casting.grudge.studio/audio/sfx';

const FILES: Record<CinemaSfxRole, string | readonly string[]> = {
  cast_ramp: 'cast-ramp.wav',
  cast_chant: 'cast-chant.wav',
  parry: 'parry.wav',
  parry_magic: 'parry-magic.wav',
  impact_magic: ['impact-magic-a.wav', 'impact-magic-b.wav', 'impact-magic-c.wav'],
  burn: 'burn.wav',
  heal: ['heal-a.wav', 'heal-b.wav'],
};

type PlayOpts = { volume?: number; rate?: number; variant?: number; loop?: boolean };

const pools = new Map<string, HTMLAudioElement[]>();
let unlocked = false;
let muted = false;
let masterVol = 0.78;
let burnLoop: HTMLAudioElement | null = null;
let burnLoopActive = false;

function fileFor(role: CinemaSfxRole, variant?: number): string {
  const entry = FILES[role];
  if (Array.isArray(entry)) {
    const i =
      variant != null
        ? Math.max(0, variant) % entry.length
        : Math.floor(Math.random() * entry.length);
    return entry[i]!;
  }
  return entry as string;
}

function acquire(url: string): HTMLAudioElement {
  let list = pools.get(url);
  if (!list) {
    list = [];
    pools.set(url, list);
  }
  for (const a of list) {
    if (a.paused || a.ended) return a;
  }
  const audio = new Audio();
  audio.preload = 'auto';
  audio.src = url;
  audio.crossOrigin = 'anonymous';
  list.push(audio);
  if (list.length > 6) list.shift();
  return audio;
}

function playUrl(url: string, fallback: string | null, opts: PlayOpts): HTMLAudioElement | null {
  try {
    const audio = acquire(url);
    audio.pause();
    try {
      audio.currentTime = 0;
    } catch {
      /* ignore */
    }
    audio.loop = !!opts.loop;
    audio.volume = Math.min(1, Math.max(0, (opts.volume ?? 1) * masterVol));
    audio.playbackRate =
      opts.rate != null && Number.isFinite(opts.rate)
        ? Math.max(0.5, Math.min(2, opts.rate))
        : 1;
    const p = audio.play();
    if (p && typeof p.catch === 'function') {
      p.catch(() => {
        if (!fallback || fallback === url) return;
        try {
          const a2 = acquire(fallback);
          a2.loop = audio.loop;
          a2.volume = audio.volume;
          a2.playbackRate = audio.playbackRate;
          void a2.play().catch(() => {});
        } catch {
          /* ignore */
        }
      });
    }
    return audio;
  } catch (e) {
    console.warn('[cinema sfx] play failed', url, e);
    return null;
  }
}

export function setCinemaSfxMuted(m: boolean): void {
  muted = !!m;
  if (muted) setCinemaBurning(false);
}

export function setCinemaSfxVolume(v: number): void {
  masterVol = Math.max(0, Math.min(1, Number(v) || 0));
}

export async function unlockCinemaSfx(): Promise<void> {
  if (unlocked || typeof Audio === 'undefined') return;
  unlocked = true;
  const names = new Set<string>();
  for (const v of Object.values(FILES)) {
    if (Array.isArray(v)) v.forEach((n) => names.add(n));
    else names.add(v as string);
  }
  await Promise.all(
    [...names].map(
      (name) =>
        new Promise<void>((resolve) => {
          try {
            const a = acquire(`${CINEMA_SFX_LOCAL_BASE}/${name}`);
            a.volume = 0.001;
            const p = a.play();
            if (p && typeof p.then === 'function') {
              p.then(() => {
                a.pause();
                a.currentTime = 0;
                a.volume = masterVol;
                resolve();
              }).catch(() => {
                // Same-origin miss (pre-deploy) — warm fleet copy
                try {
                  const b = acquire(`${CINEMA_SFX_FLEET_BASE}/${name}`);
                  b.preload = 'auto';
                } catch {
                  /* ignore */
                }
                resolve();
              });
            } else resolve();
          } catch {
            resolve();
          }
        }),
    ),
  );
}

export function prefetchCinemaSfx(): void {
  if (typeof Audio === 'undefined') return;
  const names = new Set<string>();
  for (const v of Object.values(FILES)) {
    if (Array.isArray(v)) v.forEach((n) => names.add(n));
    else names.add(v as string);
  }
  for (const name of names) {
    for (const base of [CINEMA_SFX_LOCAL_BASE, CINEMA_SFX_FLEET_BASE]) {
      try {
        const a = new Audio();
        a.preload = 'auto';
        a.crossOrigin = 'anonymous';
        a.src = `${base}/${name}`;
      } catch {
        /* ignore */
      }
    }
  }
}

export function playCinemaSfx(role: CinemaSfxRole, opts: PlayOpts = {}): HTMLAudioElement | null {
  if (muted) return null;
  const vol = (opts.volume ?? 1) * masterVol;
  if (vol <= 0.001) return null;
  if (!unlocked) void unlockCinemaSfx();
  const name = fileFor(role, opts.variant);
  const local = `${CINEMA_SFX_LOCAL_BASE}/${name}`;
  const fleet = `${CINEMA_SFX_FLEET_BASE}/${name}`;
  return playUrl(local, fleet, opts);
}

export function playCinemaMagicImpact(opts: PlayOpts = {}): HTMLAudioElement | null {
  const n = (FILES.impact_magic as readonly string[]).length;
  return playCinemaSfx('impact_magic', {
    volume: opts.volume ?? 0.82,
    rate: opts.rate ?? 0.95 + Math.random() * 0.15,
    variant: opts.variant ?? Math.floor(Math.random() * n),
  });
}

/** Soft crackle under the fire beam / hull fire. */
export function setCinemaBurning(active: boolean, opts: PlayOpts = {}): HTMLAudioElement | null {
  const want = !!active && !muted;
  if (want === burnLoopActive && burnLoop) {
    if (want && opts.volume != null) {
      burnLoop.volume = Math.min(1, Math.max(0, opts.volume * masterVol));
    }
    return burnLoop;
  }
  burnLoopActive = want;
  if (!want) {
    if (burnLoop) {
      try {
        burnLoop.pause();
        burnLoop.currentTime = 0;
        burnLoop.loop = false;
      } catch {
        /* ignore */
      }
      burnLoop = null;
    }
    return null;
  }
  const audio = playCinemaSfx('burn', {
    volume: opts.volume ?? 0.28,
    rate: 0.92,
    loop: true,
  });
  burnLoop = audio;
  return audio;
}

export function disposeCinemaSfx(): void {
  setCinemaBurning(false);
  unlocked = false;
  for (const list of pools.values()) {
    for (const a of list) {
      try {
        a.pause();
        a.src = '';
      } catch {
        /* ignore */
      }
    }
  }
  pools.clear();
}

export const CinemaCastingSfx = {
  play: playCinemaSfx,
  impact: playCinemaMagicImpact,
  setBurning: setCinemaBurning,
  prefetch: prefetchCinemaSfx,
  unlock: unlockCinemaSfx,
  setMuted: setCinemaSfxMuted,
  setVolume: setCinemaSfxVolume,
  dispose: disposeCinemaSfx,
  FILES,
};
