/**
 * Audio Manager — BGM and SFX via CDN (assets.grudge-studio.com/audio/…)
 *
 * Catalog SSOT: shared/definitions/gameAudioCatalog.ts
 * Upload: node scripts/upload-game-audio.mjs
 */

import { assetUrl } from "@/lib/assetConfig";
import {
  GAME_AUDIO_BY_ID,
  ABILITY_AUDIO,
  STATUS_AUDIO,
  resolveAudioEventId,
  audioCdnUrl,
} from "@shared/definitions/gameAudioCatalog";

// ── Track definitions ────────────────────────────────────────────────────────

export const BGM_TRACKS = {
  title: assetUrl("/audio/intro_theme.mp3"),
  tavern: assetUrl("/audio/bgm_tavern.ogg"),
  camp: assetUrl("/audio/bgm_camping.ogg"),
  explore: assetUrl("/audio/bgm_harukaze.ogg"),
  scene: assetUrl("/audio/scene_theme.mp3"),
  chill: assetUrl("/audio/youth_thinker.mp3"),
  battle: assetUrl("/audio/music/corrupted-circuitry.ogg"),
  ocean: assetUrl("/audio/music/beach-vibes.ogg"),
  dungeon: assetUrl("/audio/music/temple-puzzle.ogg"),
  dawn: assetUrl("/audio/music/refreshing-dawn.ogg"),
} as const;

export const SFX = {
  hit1: assetUrl("/audio/swish_2.wav"),
  hit2: assetUrl("/audio/swish_3.wav"),
  hit3: assetUrl("/audio/swish_4.wav"),
  bow: assetUrl("/audio/bow.wav"),
  sword: assetUrl("/audio/fx/sword_clash.ogg"),
  magic: assetUrl("/audio/fx/magic_cast.ogg"),
  fire: assetUrl("/audio/fx/fire_impact.ogg"),
  heal: assetUrl("/audio/fx/heal.ogg"),
  death: assetUrl("/audio/fx/death.ogg"),
  thunder: assetUrl("/audio/fx/thunder.ogg"),
  click: assetUrl("/audio/fx/click.ogg"),
  levelup: assetUrl("/audio/fx/levelup.ogg"),
} as const;

export type BGMTrack = keyof typeof BGM_TRACKS;
export type SFXName = keyof typeof SFX;

// ── State ────────────────────────────────────────────────────────────────────

let currentBgm: HTMLAudioElement | null = null;
let currentTrack: BGMTrack | null = null;
let bgmVolume = 0.3;
let sfxVolume = 0.5;
let bgmMuted = false;
let sfxMuted = false;
/** 0..1 on top of bgmVolume (VO duck / storm) */
let bgmDuckMul = 1;

// ── BGM ──────────────────────────────────────────────────────────────────────

export function playBGM(track: BGMTrack, options?: { volume?: number; loop?: boolean }): void {
  if (currentTrack === track && currentBgm && !currentBgm.paused) return;

  stopBGM();

  if (options?.volume != null) bgmVolume = Math.max(0, Math.min(1, options.volume));
  const audio = new Audio(BGM_TRACKS[track]);
  audio.volume = bgmMuted ? 0 : bgmVolume * bgmDuckMul;
  audio.loop = options?.loop ?? true;
  audio.play().catch(() => {
    // Autoplay blocked — will play on next user interaction
    const resume = () => {
      audio.play().catch(() => {});
      document.removeEventListener("click", resume);
      document.removeEventListener("keydown", resume);
    };
    document.addEventListener("click", resume, { once: true });
    document.addEventListener("keydown", resume, { once: true });
  });

  currentBgm = audio;
  currentTrack = track;
}

export function stopBGM(): void {
  if (currentBgm) {
    currentBgm.pause();
    currentBgm.src = "";
    currentBgm = null;
    currentTrack = null;
  }
}

export function setBGMVolume(vol: number): void {
  bgmVolume = Math.max(0, Math.min(1, vol));
  if (currentBgm && !bgmMuted) currentBgm.volume = bgmVolume * bgmDuckMul;
}

export function toggleBGMMute(): boolean {
  bgmMuted = !bgmMuted;
  if (currentBgm) currentBgm.volume = bgmMuted ? 0 : bgmVolume * bgmDuckMul;
  return bgmMuted;
}

/**
 * Soft-duck BGM under dialogue / VO. Restores when factor=1.
 * @param factor 0 = silence BGM, 1 = full, typical duck 0.25–0.4
 * @param rampMs optional linear ramp (default instant apply; tick can re-call)
 */
export function duckBGM(factor: number, _rampMs = 0): void {
  bgmDuckMul = Math.max(0, Math.min(1, factor));
  if (currentBgm && !bgmMuted) {
    currentBgm.volume = bgmVolume * bgmDuckMul;
  }
}

export function getBGMDuck(): number {
  return bgmDuckMul;
}

function resolveSfxUrl(key: string): string {
  if (key.startsWith('http://') || key.startsWith('https://')) return key;
  if (key.startsWith('/')) return key; // same-origin (cinema WAV pack, etc.)
  return audioCdnUrl(key);
}

/** Prefetch catalog / CDN audio so first play is not cold. */
export function prefetchGameSfx(eventIds: string[]): void {
  if (typeof window === 'undefined') return;
  for (const id of eventIds) {
    const ev = GAME_AUDIO_BY_ID[id];
    if (!ev) continue;
    const keys = [ev.key, ...(ev.variants ?? [])].slice(0, 3);
    for (const key of keys) {
      const url = resolveSfxUrl(key);
      try {
        const a = new Audio();
        a.preload = 'auto';
        a.src = url;
      } catch {
        /* ignore */
      }
    }
  }
}

/** Prefetch BGM track URLs (browser cache). */
export function prefetchBGM(tracks: BGMTrack[]): void {
  for (const t of tracks) {
    try {
      const a = new Audio();
      a.preload = 'auto';
      a.src = BGM_TRACKS[t];
    } catch {
      /* ignore */
    }
  }
}

// ── SFX ──────────────────────────────────────────────────────────────────────

export function playSFX(name: SFXName): void {
  if (sfxMuted) return;
  const audio = new Audio(SFX[name]);
  audio.volume = sfxVolume;
  audio.play().catch(() => {});
}

export function playRandomHit(): void {
  const hits: SFXName[] = ["hit1", "hit2", "hit3"];
  playSFX(hits[Math.floor(Math.random() * hits.length)]);
}

/**
 * Play a catalogued game event (skills, status, combat, UI).
 * Uses CDN keys from gameAudioCatalog; supports variants.
 */
export function playGameSfx(
  eventId: string,
  options?: { volume?: number; preferVariant?: boolean },
): void {
  if (sfxMuted) return;
  const ev = GAME_AUDIO_BY_ID[eventId];
  if (!ev) {
    console.warn('[audio] unknown event', eventId);
    return;
  }
  let key = ev.key;
  if (options?.preferVariant !== false && ev.variants?.length) {
    const pool = [ev.key, ...ev.variants];
    key = pool[Math.floor(Math.random() * pool.length)];
  }
  const url = resolveSfxUrl(key);
  const audio = new Audio(url);
  audio.volume = Math.min(1, sfxVolume * (options?.volume ?? ev.volume ?? 1));
  audio.play().catch(() => {});
}

/** Play SFX mapped to ability id (warrior_charge, mage_fireball, …) */
export function playAbilitySfx(abilityId: string): void {
  const eventId = ABILITY_AUDIO[abilityId] ?? resolveAudioEventId({ abilityId });
  if (eventId) playGameSfx(eventId);
  else playRandomHit();
}

/** Play SFX when a status is applied */
export function playStatusSfx(statusId: string): void {
  const eventId = STATUS_AUDIO[statusId] ?? resolveAudioEventId({ statusId });
  if (eventId) playGameSfx(eventId);
}

export function setSFXVolume(vol: number): void {
  sfxVolume = Math.max(0, Math.min(1, vol));
}

export function toggleSFXMute(): boolean {
  sfxMuted = !sfxMuted;
  return sfxMuted;
}

// ── Getters ──────────────────────────────────────────────────────────────────

export function isBGMMuted(): boolean { return bgmMuted; }
export function isSFXMuted(): boolean { return sfxMuted; }
export function getCurrentTrack(): BGMTrack | null { return currentTrack; }
export function getBGMVolume(): number { return bgmVolume; }
export function getSFXVolume(): number { return sfxVolume; }
