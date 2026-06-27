/**
 * OrcBossAI — Finite State Machine for Ghar'Thok the Unbroken.
 *
 * Pure logic layer — no Three.js imports. Receives world state each tick,
 * outputs the next state + animation key. The OrcBossController renders it.
 *
 * State flow:
 *   idle ↔ patrol → alert → chase → engage ↔ attacking/blocking/dodging
 *          ↑                                    ↓
 *     leash_reset ←──── (too far from spawn) ───┘
 *          ↓
 *   phase_transition → engage (new phase)
 *          ↓
 *        dead
 */
import {
  type OrcBossState,
  type OrcBossAnimKey,
  type BossPhase,
  type AttackPattern,
  type OrcBossStats,
  ORC_BOSS_BASE_STATS,
  ORC_BOSS_PHASES,
  ORC_BOSS_AI_CONFIG,
  getBossPhase,
  pickAttack,
} from '@shared/definitions/orcWarriorBoss';

// ── Input from world (passed each tick) ──────────────────────────────────────

export interface BossWorldInput {
  /** Boss world position */
  bossPos: { x: number; y: number; z: number };
  /** Boss spawn/home position */
  spawnPos: { x: number; y: number; z: number };
  /** Nearest player/target position (null if none in range) */
  targetPos: { x: number; y: number; z: number } | null;
  /** Distance to target in meters */
  targetDistance: number;
  /** Whether the player is currently attacking (for reactive block/dodge) */
  targetIsAttacking: boolean;
  /** Delta time this tick */
  dt: number;
}

// ── AI Output (consumed by controller) ───────────────────────────────────────

export interface BossTelegraphOutput {
  attack: AttackPattern;
  totalSec: number;
  remainingSec: number;
  /** 0 = just started, 1 = impact imminent */
  progress: number;
}

export interface BossAIOutput {
  state: OrcBossState;
  anim: OrcBossAnimKey;
  /** Move direction (normalized, or null if stationary) */
  moveDir: { x: number; z: number } | null;
  /** Movement speed this tick (m/s) */
  moveSpeed: number;
  /** Face direction toward this point (or null to keep current) */
  faceTarget: { x: number; z: number } | null;
  /** Active attack pattern (for hitbox checking) */
  activeAttack: AttackPattern | null;
  /** Wind-up telegraph while state === 'telegraphing' */
  telegraph: BossTelegraphOutput | null;
  /** Current boss phase */
  phase: BossPhase;
  /** Whether the boss just transitioned phases this tick */
  phaseChanged: boolean;
  /** Boss stats snapshot */
  stats: OrcBossStats;
}

// ── AI Class ─────────────────────────────────────────────────────────────────

export class OrcBossAI {
  state: OrcBossState = 'idle';
  phase: BossPhase = 'phase1';
  stats: OrcBossStats;

  // Timers
  private stateTimer = 0;         // time in current state
  private decisionTimer = 0;      // time since last decision
  private idleTimer = 0;          // time spent idle (triggers patrol)
  private telegraphTimer = 0;     // wind-up countdown
  private telegraphTotal = 0;     // full wind-up duration for progress
  private attackDuration = 0;     // how long current attack anim plays
  private comboCount = 0;         // current combo chain length

  // Cooldowns (attack ID → remaining seconds)
  private cooldowns = new Map<string, number>();

  // Current action
  private currentAttack: AttackPattern | null = null;
  private pendingCombo: string | null = null;

  // Patrol
  private patrolTarget: { x: number; z: number } | null = null;
  private patrolTimer = 0;

  constructor(stats?: Partial<OrcBossStats>) {
    this.stats = { ...ORC_BOSS_BASE_STATS, ...stats };
  }

  /** Take damage — returns true if the boss died */
  takeDamage(amount: number): boolean {
    const effectiveDefense = this.stats.defense * ORC_BOSS_PHASES[this.phase].defenseMultiplier;
    const mitigated = Math.max(1, amount - effectiveDefense * 0.3);
    this.stats.currentHP = Math.max(0, this.stats.currentHP - mitigated);

    // Stagger on hit (unless attacking or blocking)
    if (this.state !== 'attacking' && this.state !== 'blocking' && this.state !== 'phase_transition') {
      if (Math.random() < 0.3) {
        this.state = 'hit_stagger';
        this.stateTimer = 0;
      }
    }

    if (this.stats.currentHP <= 0) {
      this.state = 'dead';
      return true;
    }
    return false;
  }

  /** Main tick — call every frame */
  tick(input: BossWorldInput): BossAIOutput {
    const { dt } = input;
    this.stateTimer += dt;
    this.decisionTimer += dt;

    // Tick cooldowns
    for (const [id, remaining] of this.cooldowns) {
      const next = remaining - dt;
      if (next <= 0) this.cooldowns.delete(id);
      else this.cooldowns.set(id, next);
    }

    // Check phase transition
    const prevPhase = this.phase;
    const newPhase = getBossPhase(this.stats.currentHP, this.stats.maxHP);
    let phaseChanged = false;
    if (newPhase !== prevPhase && this.state !== 'dead' && this.state !== 'phase_transition') {
      this.phase = newPhase;
      this.state = 'phase_transition';
      this.stateTimer = 0;
      this.comboCount = 0;
      this.currentAttack = null;
      phaseChanged = true;
    }

    // Leash check
    if (this.state !== 'dead' && this.state !== 'leash_reset') {
      const distFromSpawn = dist2D(input.bossPos, input.spawnPos);
      if (distFromSpawn > this.stats.leashRadius) {
        this.state = 'leash_reset';
        this.stateTimer = 0;
      }
    }

    // Run state machine
    const output = this.runState(input);
    output.phase = this.phase;
    output.phaseChanged = phaseChanged;
    output.stats = { ...this.stats };
    return output;
  }

  // ── State Machine ──────────────────────────────────────────────────────────

  private runState(input: BossWorldInput): BossAIOutput {
    const cfg = ORC_BOSS_AI_CONFIG;
    const phaseCfg = ORC_BOSS_PHASES[this.phase];
    const baseSpeed = this.stats.moveSpeed * phaseCfg.speedMultiplier;
    const runSpeed = this.stats.runSpeed * phaseCfg.speedMultiplier;

    const out: BossAIOutput = {
      state: this.state,
      anim: 'idle',
      moveDir: null,
      moveSpeed: 0,
      faceTarget: null,
      activeAttack: null,
      telegraph: null,
      phase: this.phase,
      phaseChanged: false,
      stats: this.stats,
    };

    switch (this.state) {
      // ── IDLE ──
      case 'idle': {
        out.anim = Math.random() > 0.5 ? 'idle' : 'idle_alt';
        this.idleTimer += input.dt;

        // Check for targets
        if (input.targetPos && input.targetDistance <= this.stats.aggroRadius) {
          this.state = 'alert';
          this.stateTimer = 0;
          this.idleTimer = 0;
          break;
        }

        // Start patrol if idle too long
        if (this.idleTimer > cfg.idleTimeout) {
          this.state = 'patrol';
          this.stateTimer = 0;
          this.idleTimer = 0;
          this.pickPatrolTarget(input.spawnPos);
        }
        break;
      }

      // ── PATROL ──
      case 'patrol': {
        out.anim = 'walk';
        if (this.patrolTarget) {
          const dir = dirTo(input.bossPos, { x: this.patrolTarget.x, z: this.patrolTarget.z });
          out.moveDir = dir;
          out.moveSpeed = baseSpeed * 0.6;
          out.faceTarget = this.patrolTarget;

          // Reached patrol point
          const dist = Math.hypot(
            this.patrolTarget.x - input.bossPos.x,
            this.patrolTarget.z - input.bossPos.z,
          );
          if (dist < 2 || this.stateTimer > 10) {
            this.state = 'idle';
            this.stateTimer = 0;
          }
        }

        // Aggro check
        if (input.targetPos && input.targetDistance <= this.stats.aggroRadius) {
          this.state = 'alert';
          this.stateTimer = 0;
        }
        break;
      }

      // ── ALERT ──
      case 'alert': {
        out.anim = 'combat_stance';
        out.faceTarget = input.targetPos ? { x: input.targetPos.x, z: input.targetPos.z } : null;

        // Brief pause before engaging (1 second "notice" reaction)
        if (this.stateTimer > 0.8) {
          this.state = input.targetDistance > cfg.chargeRange ? 'chase' : 'engage';
          this.stateTimer = 0;
        }
        break;
      }

      // ── CHASE ──
      case 'chase': {
        out.anim = input.targetDistance > cfg.chargeRange ? 'run_fast' : 'run';
        out.moveSpeed = input.targetDistance > cfg.chargeRange ? runSpeed * 1.2 : runSpeed;

        if (input.targetPos) {
          out.moveDir = dirTo(input.bossPos, input.targetPos);
          out.faceTarget = { x: input.targetPos.x, z: input.targetPos.z };
        }

        // Close enough to engage
        if (input.targetDistance <= cfg.preferredRange + 1) {
          this.state = 'engage';
          this.stateTimer = 0;
        }

        // Lost target
        if (!input.targetPos || input.targetDistance > this.stats.aggroRadius * 1.5) {
          this.state = 'leash_reset';
          this.stateTimer = 0;
        }
        break;
      }

      // ── ENGAGE ──
      case 'engage': {
        out.anim = 'combat_stance';
        if (input.targetPos) {
          out.faceTarget = { x: input.targetPos.x, z: input.targetPos.z };
        }

        // Decision tick
        if (this.decisionTimer >= cfg.decisionInterval) {
          this.decisionTimer = 0;

          // React to player attacking
          if (input.targetIsAttacking) {
            const dodgeRoll = Math.random();
            if (dodgeRoll < cfg.dodgeChance[this.phase]) {
              this.state = 'dodging';
              this.stateTimer = 0;
              break;
            }
            if (this.phase === 'phase1' && dodgeRoll < cfg.dodgeChance[this.phase] + 0.3) {
              this.state = 'blocking';
              this.stateTimer = 0;
              break;
            }
          }

          // Too far — close gap
          if (input.targetDistance > cfg.preferredRange + 2) {
            this.state = 'chase';
            this.stateTimer = 0;
            break;
          }

          // Pick attack
          const atk = this.pendingCombo
            ? ORC_BOSS_PHASES[this.phase].attacks.find(a => a.id === this.pendingCombo) ?? pickAttack(this.phase, this.cooldowns)
            : pickAttack(this.phase, this.cooldowns);

          if (atk && input.targetDistance <= atk.range + 1) {
            this.currentAttack = atk;
            this.pendingCombo = null;
            if (atk.telegraphSec > 0) {
              this.state = 'telegraphing';
              this.telegraphTimer = atk.telegraphSec;
              this.telegraphTotal = atk.telegraphSec;
            } else {
              this.state = 'attacking';
              this.attackDuration = 0;
            }
            this.stateTimer = 0;
            break;
          }

          // Strafe / reposition
          if (input.targetDistance <= cfg.preferredRange) {
            const strafeDir = Math.random() > 0.5 ? 1 : -1;
            out.moveDir = {
              x: -(input.targetPos?.z ?? 0 - input.bossPos.z) * strafeDir * 0.3,
              z: (input.targetPos?.x ?? 0 - input.bossPos.x) * strafeDir * 0.3,
            };
            out.moveSpeed = baseSpeed * 0.4;
          }
        }

        // Lost target
        if (!input.targetPos || input.targetDistance > this.stats.aggroRadius * 1.5) {
          this.state = 'leash_reset';
          this.stateTimer = 0;
        }
        break;
      }

      // ── TELEGRAPHING (wind-up) ──
      case 'telegraphing': {
        out.anim = this.currentAttack?.anim ?? 'combat_stance';
        out.faceTarget = input.targetPos ? { x: input.targetPos.x, z: input.targetPos.z } : null;

        if (this.currentAttack) {
          const total = Math.max(0.001, this.telegraphTotal);
          const remaining = Math.max(0, this.telegraphTimer);
          out.telegraph = {
            attack: this.currentAttack,
            totalSec: total,
            remainingSec: remaining,
            progress: 1 - remaining / total,
          };
        }

        this.telegraphTimer -= input.dt;
        if (this.telegraphTimer <= 0) {
          this.state = 'attacking';
          this.stateTimer = 0;
          this.attackDuration = 0;
        }
        break;
      }

      // ── ATTACKING ──
      case 'attacking': {
        out.anim = this.currentAttack?.anim ?? 'attack';
        out.activeAttack = this.currentAttack;
        out.faceTarget = input.targetPos ? { x: input.targetPos.x, z: input.targetPos.z } : null;

        this.attackDuration += input.dt;

        // Attack completes after ~0.8s (anim-driven, simplified)
        if (this.attackDuration > 0.8) {
          // Set cooldown
          if (this.currentAttack) {
            this.cooldowns.set(this.currentAttack.id, this.currentAttack.cooldownSec);

            // Combo follow-up
            if (
              this.currentAttack.comboFollowUp &&
              this.comboCount < cfg.maxComboLength[this.phase]
            ) {
              this.pendingCombo = this.currentAttack.comboFollowUp;
              this.comboCount++;
            } else {
              this.pendingCombo = null;
              this.comboCount = 0;
            }
          }

          this.currentAttack = null;
          this.state = 'engage';
          this.stateTimer = 0;
        }
        break;
      }

      // ── BLOCKING ──
      case 'blocking': {
        out.anim = 'block';
        out.faceTarget = input.targetPos ? { x: input.targetPos.x, z: input.targetPos.z } : null;

        if (this.stateTimer > 1.5 || !input.targetIsAttacking) {
          this.state = 'engage';
          this.stateTimer = 0;
        }
        break;
      }

      // ── DODGING ──
      case 'dodging': {
        out.anim = 'dodge_roll';
        // Move sideways or backward
        if (input.targetPos) {
          const awayDir = dirTo(input.targetPos, input.bossPos);
          const perpX = -awayDir.z;
          const perpZ = awayDir.x;
          const side = Math.random() > 0.5 ? 1 : -1;
          out.moveDir = { x: awayDir.x * 0.5 + perpX * side * 0.5, z: awayDir.z * 0.5 + perpZ * side * 0.5 };
          out.moveSpeed = runSpeed * 1.5;
        }

        if (this.stateTimer > 0.7) {
          this.state = 'engage';
          this.stateTimer = 0;
        }
        break;
      }

      // ── HIT STAGGER ──
      case 'hit_stagger': {
        out.anim = 'hit_reaction';
        if (this.stateTimer > 0.6) {
          this.state = 'engage';
          this.stateTimer = 0;
        }
        break;
      }

      // ── KNOCKED DOWN ──
      case 'knocked_down': {
        out.anim = 'knock_down';
        if (this.stateTimer > 2.0) {
          this.state = 'standing_up';
          this.stateTimer = 0;
        }
        break;
      }

      // ── STANDING UP ──
      case 'standing_up': {
        out.anim = 'stand_up';
        if (this.stateTimer > 1.5) {
          this.state = 'engage';
          this.stateTimer = 0;
        }
        break;
      }

      // ── PHASE TRANSITION ──
      case 'phase_transition': {
        out.anim = ORC_BOSS_PHASES[this.phase].enterAnim;
        // Invulnerable during transition (2 seconds)
        if (this.stateTimer > 2.0) {
          this.state = 'engage';
          this.stateTimer = 0;
          this.comboCount = 0;
          this.cooldowns.clear();
        }
        break;
      }

      // ── DEAD ──
      case 'dead': {
        out.anim = 'dead';
        out.moveDir = null;
        out.moveSpeed = 0;
        break;
      }

      // ── LEASH RESET ──
      case 'leash_reset': {
        out.anim = 'run';
        const dir = dirTo(input.bossPos, input.spawnPos);
        out.moveDir = dir;
        out.moveSpeed = runSpeed;
        out.faceTarget = { x: input.spawnPos.x, z: input.spawnPos.z };

        const distHome = dist2D(input.bossPos, input.spawnPos);
        if (distHome < 3) {
          this.state = 'idle';
          this.stateTimer = 0;
          this.stats.currentHP = this.stats.maxHP; // full heal on reset
          this.phase = 'phase1';
          this.cooldowns.clear();
        }
        break;
      }
    }

    out.state = this.state;
    return out;
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private pickPatrolTarget(spawn: { x: number; y: number; z: number }): void {
    const angle = Math.random() * Math.PI * 2;
    const dist = 10 + Math.random() * 20;
    this.patrolTarget = {
      x: spawn.x + Math.cos(angle) * dist,
      z: spawn.z + Math.sin(angle) * dist,
    };
  }

  /** Force knockdown (e.g. from a player ability) */
  knockDown(): void {
    if (this.state !== 'dead' && this.state !== 'phase_transition') {
      this.state = 'knocked_down';
      this.stateTimer = 0;
      this.currentAttack = null;
      this.comboCount = 0;
    }
  }

  /** Reset to initial state */
  reset(): void {
    this.state = 'idle';
    this.phase = 'phase1';
    this.stats = { ...ORC_BOSS_BASE_STATS };
    this.cooldowns.clear();
    this.currentAttack = null;
    this.comboCount = 0;
    this.stateTimer = 0;
    this.decisionTimer = 0;
    this.idleTimer = 0;
  }
}

// ── Utility ──────────────────────────────────────────────────────────────────

function dist2D(a: { x: number; z: number }, b: { x: number; z: number }): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

function dirTo(from: { x: number; z: number }, to: { x: number; z: number }): { x: number; z: number } {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const len = Math.hypot(dx, dz) || 1;
  return { x: dx / len, z: dz / len };
}
