/**
 * CinemaSceneAudio — beat-driven BGM/SFX for LeviathanOceanCinema.
 *
 * Magic/combat stems: CinemaCastingSfx (the user WAV pack that was
 * accidentally stuck only on casting.*). BGM + ship/thunder still come
 * from audioManager + gameAudioCatalog (CDN OGGs).
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
import {
  playCinemaSfx,
  playCinemaMagicImpact,
  setCinemaBurning,
  prefetchCinemaSfx,
  unlockCinemaSfx,
  setCinemaSfxMuted,
  disposeCinemaSfx,
} from './CinemaCastingSfx';

/** Catalog stems still used for non-magic cinema cues */
export const CINEMA_PREFETCH_SFX = [
  'combat.magic.thunder',
  'combat.hit.melee',
  'combat.death',
  'world.ship_sink',
  'world.ocean_wave',
  'world.wood_break',
  'ui.levelup',
  'skill.warrior.charge',
  'world.ship_sink',
  'cinema.cast.ramp',
  'cinema.impact.magic',
  'cinema.parry.magic',
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
  private burning = false;

  setMuted(m: boolean): void {
    this.muted = m;
    setCinemaSfxMuted(m);
    if (m) {
      stopBGM();
      duckBGM(1);
      if (this.surfEl) this.surfEl.volume = 0;
    } else if (this.surfEl) {
      this.surfEl.volume = 0.4;
      setCinemaBurning(false);
      this.burning = false;
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
    prefetchCinemaSfx();
    void unlockCinemaSfx();
    // Slightly quieter bed under film mix
    setBGMVolume(0.28);
    playBGM('ocean', { volume: 0.28, loop: true });
    console.info('[cinema audio] ocean bed + casting WAV pack');
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

    const wantBurn = !!(
      beat.fireBeam ||
      beat.hullFire ||
      beat.fireAura ||
      beat.dragonPhase === 'blast' ||
      beat.hotHands
    );
    if (wantBurn !== this.burning) {
      this.burning = wantBurn;
      setCinemaBurning(wantBurn, { volume: beat.fireBeam || beat.dragonPhase === 'blast' ? 0.34 : 0.22 });
    }
  }

  /**
   * Fire on beat change (prev !== idx).
   * Maps film beats → cinema WAV pack + residual catalog SFX + BGM shifts.
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
    if (storm >= 0.72 || beat.shipPinata || beat.fireBeam || beat.dragonPhase === 'blast') {
      if (!this.stormLayer) {
        this.stormLayer = true;
        playBGM('battle', { volume: 0.32, loop: true });
      }
    } else if (storm < 0.55 && this.stormLayer && !beat.shipPinata) {
      this.stormLayer = false;
      playBGM('ocean', { volume: 0.28, loop: true });
    }

    if (beat.shipPinata) {
      playGameSfx('world.wood_break', { volume: 1, preferVariant: true });
      playGameSfx('world.wood_break', { volume: 0.75, preferVariant: true });
      playGameSfx('world.ship_sink', { volume: 0.85 });
      playGameSfx('world.ocean_wave', { volume: 0.8 });
      playCinemaMagicImpact({ volume: 1.05 });
      playCinemaSfx('cast_chant', { volume: 0.7, rate: 0.92 });
      playGameSfx('combat.magic.thunder', { volume: 0.9 });
      playGameSfx('world.ship_sink', { volume: 1.0 });
      playSFX('thunder');
      return;
    }
    if (beat.shieldShatter || beat.shieldDefeat) {
      playCinemaSfx('parry_magic', { volume: 0.92 });
      playCinemaMagicImpact({ volume: 0.88 });
    } else if (beat.shieldImpact || beat.shieldBounce) {
      playCinemaSfx('parry_magic', { volume: 0.72, rate: 1.05 });
    }
    if (beat.fireBeam || beat.dragonPhase === 'blast') {
      playGameSfx('combat.magic.fire', { volume: 0.35 });
      playGameSfx('world.ocean_wave', { volume: 0.45 });
      playCinemaMagicImpact({ volume: 0.95 });
      playGameSfx('combat.magic.thunder', { volume: 0.55 });
    }
    if (beat.dragonPhase === 'snap' || beat.dragonPhase === 'charge') {
      playCinemaSfx('cast_ramp', { volume: 0.62, rate: 0.9 });
    }
    if (beat.iceSnakeCast || beat.blizzard) {
      playCinemaSfx('cast_chant', { volume: 0.58, rate: 0.88 });
      playCinemaMagicImpact({ volume: 0.55 });
    }
    if (beat.tornado || beat.mageSplineKill) {
      playCinemaSfx('cast_ramp', { volume: 0.7, rate: 1.08 });
    }
    if (beat.rings && !beat.fireBeam) {
      playCinemaSfx('parry_magic', { volume: 0.5, rate: 0.95 });
    }
    if (beat.blackout && beat.blackout > 0.6) {
      duckBGM(0.2);
    }
  }

  /** Staggered cast whoosh when a mage enters cast phase (throttled). */
  onMageCast(mageIndex: number): void {
    if (this.muted || isSFXMuted()) return;
    const now = this.elapsed;
    if (now - (this.lastCastSfx[mageIndex] ?? 0) < 0.85) return;
    this.lastCastSfx[mageIndex] = now;
    playCinemaSfx('cast_ramp', {
      volume: 0.52 + (mageIndex % 3) * 0.08,
      rate: 0.96 + (mageIndex % 3) * 0.05,
    });
  }

  /** Mage flee / throw cue */
  onMageFlee(): void {
    if (this.muted) return;
    playCinemaSfx('parry', { volume: 0.55, rate: 1.15 });
    playGameSfx('skill.warrior.charge', { volume: 0.45 });
  }

  dispose(): void {
    duckBGM(1);
    stopBGM();
    if (this.surfEl) {
      this.surfEl.pause();
      this.surfEl.src = '';
      this.surfEl = null;
    }
    disposeCinemaSfx();
    this.started = false;
    this.stormLayer = false;
    this.burning = false;
    this.lastBeatId = '';
  }
}
