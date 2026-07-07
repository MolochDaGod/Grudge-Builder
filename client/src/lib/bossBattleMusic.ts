/**
 * Grudge music packs — CDN streaming via R2 manifests.
 */

export const MUSIC_CDN_BASE = 'https://assets.grudge-studio.com/audio/music';

/** All ingested packs from D:\\Games\\Models */
export const MUSIC_PACK_IDS = [
  'boss-battle-v2',
  'shooter-synthwave',
  'pirate',
  'medieval-tracks',
  'lo-fi',
  'free-action',
] as const;

export type MusicPackId = (typeof MUSIC_PACK_IDS)[number];

export const BOSS_BATTLE_MUSIC_CDN = `${MUSIC_CDN_BASE}/boss-battle-v2`;

export function musicPackCdn(packId: MusicPackId): string {
  return `${MUSIC_CDN_BASE}/${packId}`;
}

export interface BossMusicManifest {
  version: string;
  pack: string;
  cdnBase: string;
  bySlug: Record<string, {
    slug: string;
    label: string;
    section: string;
    urls: Partial<Record<'ogg' | 'mp3' | 'wav', string>>;
  }>;
}

let manifestCache: BossMusicManifest | null = null;

const manifestCaches = new Map<string, BossMusicManifest>();

export async function loadMusicManifest(packId: MusicPackId = 'boss-battle-v2'): Promise<BossMusicManifest> {
  const cached = manifestCaches.get(packId);
  if (cached) return cached;
  const res = await fetch(`${musicPackCdn(packId)}/manifest.json`);
  if (!res.ok) throw new Error(`Music manifest ${packId}: ${res.status}`);
  const data = await res.json();
  manifestCaches.set(packId, data);
  return data;
}

export async function loadBossMusicManifest(): Promise<BossMusicManifest> {
  return loadMusicManifest('boss-battle-v2');
}

/** Pick best stream URL for the browser (OGG preferred, MP3 fallback). */
export function pickBossMusicUrl(
  entry: BossMusicManifest['bySlug'][string],
): string | undefined {
  const canOgg = typeof document !== 'undefined'
    && document.createElement('audio').canPlayType('audio/ogg; codecs=vorbis') !== '';
  if (canOgg && entry.urls.ogg) return entry.urls.ogg;
  return entry.urls.mp3 ?? entry.urls.ogg ?? entry.urls.wav;
}

/** Stream a loop or full track from R2 CDN. */
export async function playBossMusic(
  slug: string,
  options: { loop?: boolean; volume?: number; packId?: MusicPackId } = {},
): Promise<HTMLAudioElement> {
  const manifest = await loadMusicManifest(options.packId ?? 'boss-battle-v2');
  const entry = manifest.bySlug[slug];
  if (!entry) throw new Error(`Unknown boss track: ${slug}`);
  const url = pickBossMusicUrl(entry);
  if (!url) throw new Error(`No playable URL for ${slug}`);

  const audio = new Audio(url);
  audio.loop = options.loop ?? entry.section === 'loops';
  audio.volume = options.volume ?? 0.35;
  audio.preload = 'auto';
  await audio.play().catch(() => {});
  return audio;
}