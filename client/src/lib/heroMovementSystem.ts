/**
 * Hero Movement System
 * Advances heroes step-by-step along A* waypoint paths.
 * Works in 0-100 world coordinate space.
 */

import type { WorldPos } from './islandPathfinder';

export interface HeroMovementState {
  heroId: string;
  path: WorldPos[];        // Full waypoint list
  waypointIndex: number;   // Current target waypoint
  x: number;               // Current world X (0-100)
  y: number;               // Current world Y (0-100)
  speed: number;           // World units per second
  isMoving: boolean;
  facing: 'left' | 'right';
}

export interface MovementUpdate {
  heroId: string;
  x: number;
  y: number;
  facing: 'left' | 'right';
  isMoving: boolean;
}

export interface ArrivalEvent {
  heroId: string;
  x: number;
  y: number;
}

const DEFAULT_SPEED = 3; // 3 world-units/sec — crosses island in ~33s

export class HeroMovementManager {
  private movers: Map<string, HeroMovementState> = new Map();

  /** Start a hero walking along a path of waypoints */
  startMovement(heroId: string, path: WorldPos[], startX: number, startY: number, speed?: number): void {
    if (path.length === 0) return;

    this.movers.set(heroId, {
      heroId,
      path,
      waypointIndex: 0,
      x: startX,
      y: startY,
      speed: speed ?? DEFAULT_SPEED,
      isMoving: true,
      facing: path[0].x >= startX ? 'right' : 'left',
    });
  }

  /** Cancel movement for a hero */
  stopMovement(heroId: string): void {
    this.movers.delete(heroId);
  }

  /** Check if a hero is currently moving */
  isMoving(heroId: string): boolean {
    return this.movers.has(heroId);
  }

  /** Get current position of a moving hero */
  getPosition(heroId: string): WorldPos | null {
    const m = this.movers.get(heroId);
    return m ? { x: m.x, y: m.y } : null;
  }

  /**
   * Advance all moving heroes by deltaMs milliseconds.
   * Returns position updates and arrival events.
   */
  update(deltaMs: number): { updates: MovementUpdate[]; arrivals: ArrivalEvent[] } {
    const updates: MovementUpdate[] = [];
    const arrivals: ArrivalEvent[] = [];
    const deltaSec = deltaMs / 1000;

    for (const [heroId, mover] of Array.from(this.movers.entries())) {
      if (!mover.isMoving) continue;

      let remaining = mover.speed * deltaSec;

      while (remaining > 0 && mover.waypointIndex < mover.path.length) {
        const target = mover.path[mover.waypointIndex];
        const dx = target.x - mover.x;
        const dy = target.y - mover.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist <= remaining) {
          // Reached this waypoint
          mover.x = target.x;
          mover.y = target.y;
          remaining -= dist;
          mover.waypointIndex++;

          // Update facing based on movement direction
          if (Math.abs(dx) > 0.01) {
            mover.facing = dx > 0 ? 'right' : 'left';
          }
        } else {
          // Move toward waypoint
          const ratio = remaining / dist;
          mover.x += dx * ratio;
          mover.y += dy * ratio;
          remaining = 0;

          if (Math.abs(dx) > 0.01) {
            mover.facing = dx > 0 ? 'right' : 'left';
          }
        }
      }

      // Check if hero completed the entire path
      if (mover.waypointIndex >= mover.path.length) {
        mover.isMoving = false;
        arrivals.push({ heroId, x: mover.x, y: mover.y });
        this.movers.delete(heroId);
      }

      updates.push({
        heroId,
        x: mover.x,
        y: mover.y,
        facing: mover.facing,
        isMoving: mover.isMoving,
      });
    }

    return { updates, arrivals };
  }

  /** Number of heroes currently moving */
  get activeCount(): number {
    return this.movers.size;
  }

  /** Clear all movement */
  clear(): void {
    this.movers.clear();
  }
}
