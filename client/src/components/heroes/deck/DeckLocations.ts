/**
 * Airship deck navigation graph — 6 locations for crew AI idle / animate / wait / wander.
 * SI units: 1 unit = 1 m. Deck plane Y = 0; crow platform raised for stairs climb.
 *
 * Aligns with Puter GrudgeWar airship plate + grudge-production-cinema establish framing.
 */
import * as THREE from "three";

export type DeckLocId =
  | "wheel"
  | "main_battery"
  | "fore_guns"
  | "midship"
  | "stairs_mid"
  | "crow_top";

export type DeckLocKind = "work" | "transit" | "scenic";

export interface DeckLocation {
  id: DeckLocId;
  label: string;
  /** World position (feet on deck / stair / crow). */
  position: THREE.Vector3;
  /** Preferred facing when idle at this post (Yaw rad). */
  facing: number;
  kind: DeckLocKind;
  /** If true, crew plays wheel / work anim while waiting. */
  workAnim?: "wheel" | "cannon" | "rope" | "idle";
  /** Idle dwell range (seconds) before next goal. */
  waitMinSec: number;
  waitMaxSec: number;
  /** Neighbors for graph walk (nav). */
  links: DeckLocId[];
}

/** Half-width of walkable deck strip (m). */
export const DECK_HALF_W = 5.4;
export const DECK_Y = 0;
export const CROW_Y = 1.55;
export const STAIRS_BASE_Y = 0.05;
export const STAIRS_TOP_Y = CROW_Y;

/**
 * Six posts: wheel, two batteries, mid, stairs mid-landing, crow top.
 * Positions match HeroesBlackTide crew layout with stairs climb to crow.
 */
export const DECK_LOCATIONS: DeckLocation[] = [
  {
    id: "wheel",
    label: "Helm wheel",
    position: new THREE.Vector3(-3.6, DECK_Y, 0.35),
    facing: 0.4,
    kind: "work",
    workAnim: "wheel",
    waitMinSec: 4,
    waitMaxSec: 9,
    links: ["midship", "main_battery"],
  },
  {
    id: "main_battery",
    label: "Main battery",
    position: new THREE.Vector3(-1.5, DECK_Y, 0.15),
    facing: -0.55,
    kind: "work",
    workAnim: "cannon",
    waitMinSec: 3.5,
    waitMaxSec: 8,
    links: ["wheel", "midship", "fore_guns"],
  },
  {
    id: "fore_guns",
    label: "Fore guns",
    position: new THREE.Vector3(1.2, DECK_Y, 0.2),
    facing: 0.9,
    kind: "work",
    workAnim: "cannon",
    waitMinSec: 3.5,
    waitMaxSec: 8,
    links: ["main_battery", "midship", "stairs_mid"],
  },
  {
    id: "midship",
    label: "Midship",
    position: new THREE.Vector3(0, DECK_Y, -0.4),
    facing: 0,
    kind: "scenic",
    workAnim: "idle",
    waitMinSec: 2,
    waitMaxSec: 5,
    links: ["wheel", "main_battery", "fore_guns", "stairs_mid"],
  },
  {
    id: "stairs_mid",
    label: "Stairs",
    position: new THREE.Vector3(2.6, (STAIRS_BASE_Y + STAIRS_TOP_Y) * 0.5, -0.15),
    facing: 0.2,
    kind: "transit",
    workAnim: "idle",
    waitMinSec: 0.6,
    waitMaxSec: 1.4,
    links: ["fore_guns", "midship", "crow_top"],
  },
  {
    id: "crow_top",
    label: "Crow's nest line",
    position: new THREE.Vector3(3.8, CROW_Y, 0.05),
    facing: -0.3,
    kind: "work",
    workAnim: "rope",
    waitMinSec: 4,
    waitMaxSec: 10,
    links: ["stairs_mid"],
  },
];

const BY_ID = new Map(DECK_LOCATIONS.map((l) => [l.id, l]));

export function getDeckLocation(id: DeckLocId): DeckLocation {
  return BY_ID.get(id)!;
}

/** BFS shortest path on the deck graph. */
export function pathBetween(from: DeckLocId, to: DeckLocId): DeckLocId[] {
  if (from === to) return [to];
  const q: DeckLocId[] = [from];
  const prev = new Map<DeckLocId, DeckLocId | null>([[from, null]]);
  while (q.length) {
    const cur = q.shift()!;
    const loc = BY_ID.get(cur)!;
    for (const n of loc.links) {
      if (prev.has(n)) continue;
      prev.set(n, cur);
      if (n === to) {
        const out: DeckLocId[] = [to];
        let p: DeckLocId | null | undefined = cur;
        while (p != null) {
          out.unshift(p);
          p = prev.get(p) ?? null;
        }
        return out;
      }
      q.push(n);
    }
  }
  return [to];
}

export function randomDeckLocation(except?: DeckLocId): DeckLocation {
  const pool = except
    ? DECK_LOCATIONS.filter((l) => l.id !== except)
    : DECK_LOCATIONS;
  return pool[Math.floor(Math.random() * pool.length)]!;
}

/** Map crew slot index → home post (spawn / return). */
export const SLOT_HOME: DeckLocId[] = [
  "wheel",
  "main_battery",
  "fore_guns",
  "crow_top",
];
