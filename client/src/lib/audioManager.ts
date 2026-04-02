/**
 * Audio Manager — BGM and SFX using ObjectStore audio assets
 *
 * All audio files served from ObjectStore /audio/ directory.
 * Uses Howler.js for cross-browser audio playback.
 */

import { assetUrl } from "@/lib/assetConfig";

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

// ── BGM ──────────────────────────────────────────────────────────────────────

export function playBGM(track: BGMTrack, options?: { volume?: number; loop?: boolean }): void {
  if (currentTrack === track && currentBgm && !currentBgm.paused) return;

  stopBGM();

  const audio = new Audio(BGM_TRACKS[track]);
  audio.volume = bgmMuted ? 0 : (options?.volume ?? bgmVolume);
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
  if (currentBgm && !bgmMuted) currentBgm.volume = bgmVolume;
}

export function toggleBGMMute(): boolean {
  bgmMuted = !bgmMuted;
  if (currentBgm) currentBgm.volume = bgmMuted ? 0 : bgmVolume;
  return bgmMuted;
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
