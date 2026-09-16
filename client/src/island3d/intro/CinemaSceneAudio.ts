/**
 * CinemaSceneAudio — beat-driven BGM/SFX for LeviathanOceanCinema.
 *
 * SSOT: audioManager + gameAudioCatalog (CDN). No new audio stack.
 * Never put ElevenLabs keys here — VO is prebaked or WarVoice proxy elsewhere.
 */
import {
  playBGM,
  stopBGM,
  playGameSfx,
  playSFX,
  prefetchGameSfx,
  prefetchBGM,
  duckBGM,
  setBGMVolume,
  isSFXMuted,
  type BGMTrack,
} from '@/lib/audioManager';
import type { CinBattleBeat } from './LeviathanBattleScript';

/** Critical stems to warm on cinema ready */
export const CINEMA_PREFETCH_SFX = [
  'combat.magic.cast',
  'combat.magic.fire',
  'combat.magic.thunder',
  'combat.hit.melee',
  'combat.death',
  'world.ship_sink',
  'world.ocean_wave',
  'world.wood_break',
] as const;

const CINEMA_PREFETCH_BGM: BGMTrack[] = ['ocean', 'battle', 'explore'];

export class CinemaSceneAudio {
  private started = false;
  private lastBeatId = '';
  private muted = false;
  private stormLayer = false;
  /** Cast SFX throttle (per mage index last fire time) */
  private lastCastSfx: number[] = [0, 0, 0, 0];
  private elapsed = 0;
  private lastSurfAt = 0;
  private surfEl: HTMLAudioElement | null = null;

  setMuted(m: boolean): void {
    this.muted = m;
    if (m) {
      stopBGM();
      duckBGM(1);
      if (this.surfEl) this.surfEl.volume = 0;
    } else if (this.surfEl) {
      this.surfEl.volume = 0.4;
    }
  }

  get isMuted(): boolean {
    return this.muted;
  }

  /** Call once when cinema becomes ready (user gesture may still be required). */
  start(): void {
    if (this.muted || this.started) return;
    this.started = true;
    prefetchBGM(CINEMA_PREFETCH_BGM);
    prefetchGameSfx([...CINEMA_PREFETCH_SFX]);
    setBGMVolume(0.08);
    playBGM('ocean', { volume: 0.08, loop: true });
    this.startSurfLoop();
    console.info('[cinema audio] soft ocean bed + surf loop');
  }

  private startSurfLoop(): void {
    if (this.surfEl || typeof Audio === 'undefined') return;
    try {
      const el = new Audio('https://assets.grudge-studio.com/audio/fx/ship_sink.ogg');
      el.loop = true;
      el.volume = 0.4;
      el.play().catch(() => {});
      this.surfEl = el;
    } catch {
      /* ignore */
    }
  }

  /** Per-frame: optional storm intensity duck (subtle). */
  tick(dt: number, beat: CinBattleBeat): void {
    this.elapsed += dt;
    if (this.muted || !this.started) return;
    const storm = beat.storm ?? 0.4;
    const duck =
      beat.blackout && beat.blackout > 0.5
        ? 0.2
        : storm > 0.75
          ? 0.5
          : beat.fireBeam || beat.dragonPhase === 'blast'
            ? 0.35
            : 1;
    duckBGM(duck);
    if (this.surfEl) {
      this.surfEl.volume = 0.28 + storm * 0.3;
    }
    const gap = storm > 0.7 ? 1.15 : 2.1;
    if (this.elapsed - this.lastSurfAt > gap) {
      this.lastSurfAt = this.elapsed;
      playGameSfx('world.ocean_wave', { volume: 0.22 + storm * 0.28, preferVariant: true });
    }
  }

  /**
   * Fire on beat change (prev !== idx).
   * Maps film beats → catalog SFX + BGM shifts.
   */
  onBeat(beat: CinBattleBeat, isNew: boolean): void {
    if (this.muted || !isNew) return;
    if (!this.started) this.start();
    if (beat.id === this.lastBeatId) return;
    this.lastBeatId = beat.id;

    const storm = beat.storm ?? 0.4;

    // Stay on ocean BGM (whisper). Do not swap to loud battle bed.
    if (storm >= 0.72 || beat.shipPinata) {
      this.stormLayer = true;
      setBGMVolume(0.06);
    }

    if (beat.id === 'rogue_rise' || beat.id === 'breach') {
      playGameSfx('world.ocean_wave', { volume: 0.7 });
      playGameSfx('world.wood_break', { volume: 0.55, preferVariant: true });
    }

    // One-shots by beat flags
    if (beat.shipPinata) {
      playGameSfx('world.wood_break', { volume: 1, preferVariant: true });
      playGameSfx('world.wood_break', { volume: 0.75, preferVariant: true });
      playGameSfx('world.ship_sink', { volume: 0.85 });
      playGameSfx('world.ocean_wave', { volume: 0.8 });
      playSFX('thunder');
      return;
    }
    if (beat.shieldShatter || beat.shieldImpact) {
      playGameSfx('combat.hit.melee', { volume: 0.85 });
      playGameSfx('combat.magic.cast', { volume: 0.7 });
    }
    if (beat.fireBeam || beat.dragonPhase === 'blast') {
      playGameSfx('combat.magic.fire', { volume: 0.35 });
      playGameSfx('world.ocean_wave', { volume: 0.45 });
    }
    if (beat.dragonPhase === 'snap' || beat.dragonPhase === 'charge') {
      playGameSfx('combat.magic.cast', { volume: 0.55 });
    }
    if (beat.rings && !beat.fireBeam) {
      // Ward up — soft cast bed
      playGameSfx('combat.magic.cast', { volume: 0.45 });
    }
    if (beat.blackout && beat.blackout > 0.6) {
      // Logo / cut to black — soft duck only (tick handles)
      duckBGM(0.2);
    }
  }

  /** Staggered cast whoosh when a mage enters cast phase (throttled). */
  onMageCast(mageIndex: number): void {
    if (this.muted || isSFXMuted()) return;
    const now = this.elapsed;
    if (now - (this.lastCastSfx[mageIndex] ?? 0) < 0.85) return;
    this.lastCastSfx[mageIndex] = now;
    playGameSfx('combat.magic.cast', {
      volume: 0.4 + (mageIndex % 3) * 0.08,
      preferVariant: true,
    });
  }

  /** Mage flee / throw cue */
  onMageFlee(): void {
    if (this.muted) return;
    playGameSfx('skill.warrior.charge', { volume: 0.55 });
  }

  dispose(): void {
    duckBGM(1);
    stopBGM();
    if (this.surfEl) {
      this.surfEl.pause();
      this.surfEl.src = '';
      this.surfEl = null;
    }
    this.started = false;
    this.stormLayer = false;
    this.lastBeatId = '';
  }
}
