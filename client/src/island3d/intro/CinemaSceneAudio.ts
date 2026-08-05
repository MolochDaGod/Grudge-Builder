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
  'ui.levelup',
  'skill.warrior.charge',
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

  setMuted(m: boolean): void {
    this.muted = m;
    if (m) {
      stopBGM();
      duckBGM(1);
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
    // Slightly quieter bed under film mix
    setBGMVolume(0.28);
    playBGM('ocean', { volume: 0.28, loop: true });
    console.info('[cinema audio] ocean bed + prefetch');
  }

  /** Per-frame: optional storm intensity duck (subtle). */
  tick(dt: number, beat: CinBattleBeat): void {
    this.elapsed += dt;
    if (this.muted || !this.started) return;
    const storm = beat.storm ?? 0.4;
    // Keep BGM present; slight duck under heavy storm + beam
    const duck =
      beat.blackout && beat.blackout > 0.5
        ? 0.15
        : storm > 0.75
          ? 0.55
          : beat.fireBeam || beat.dragonPhase === 'blast'
            ? 0.45
            : 1;
    duckBGM(duck);
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

    // BGM: ocean → battle when fight intensifies
    if (storm >= 0.72 || beat.shipPinata || beat.fireBeam || beat.dragonPhase === 'blast') {
      if (!this.stormLayer) {
        this.stormLayer = true;
        playBGM('battle', { volume: 0.32, loop: true });
      }
    } else if (storm < 0.55 && this.stormLayer && !beat.shipPinata) {
      // Soft return to ocean after peak (rare — most scripts climb)
      this.stormLayer = false;
      playBGM('ocean', { volume: 0.28, loop: true });
    }

    // One-shots by beat flags
    if (beat.shipPinata) {
      playGameSfx('combat.magic.fire', { volume: 1.1 });
      playGameSfx('combat.magic.thunder', { volume: 0.9 });
      playSFX('thunder');
      return;
    }
    if (beat.shieldShatter || beat.shieldImpact) {
      playGameSfx('combat.hit.melee', { volume: 0.85 });
      playGameSfx('combat.magic.cast', { volume: 0.7 });
    }
    if (beat.fireBeam || beat.dragonPhase === 'blast') {
      playGameSfx('combat.magic.fire', { volume: 0.95 });
      playGameSfx('combat.magic.thunder', { volume: 0.65 });
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
    this.started = false;
    this.stormLayer = false;
    this.lastBeatId = '';
  }
}
