/**
 * IslandDefenceDirector — auto garrison + auto defend on the Warlords host.
 *
 * Authority for persistence stays Railway (home_islands / camp state).
 * This director only issues the existing CampUnitSystem orders:
 *   F1 defend_camp · F2 follow · F3 go_home · F4 attack · F5 group_on_me
 *
 * Raid waves are client-presented. Hits / loot are not client-authored.
 */

import type { Island3DEngine } from "../engine/Island3DEngine";
import {
  BUILDING_HEIGHT_M,
  CHARACTER_HEIGHT_M,
  WARLORDS_MMO_CONTRACT,
} from "@shared/fleet/warlordsMmoDeploy";

export type DefenceStance = "auto" | "hold" | "rally" | "off";

export interface IslandDefenceOpts {
  engine: Island3DEngine;
  /** Nearby-hostile scan radius (metres, SI). */
  alertRadiusM?: number;
  /** Seconds between empty-camp garrison checks. */
  garrisonEverySec?: number;
  /** Seconds between ambient raid pings (0 = off). */
  raidEverySec?: number;
}

export interface DefenceSnapshot {
  contract: typeof WARLORDS_MMO_CONTRACT;
  stance: DefenceStance;
  nearCamp: boolean;
  unitCount: number;
  lastOrder: string | null;
  lastEvent: string | null;
  characterM: typeof CHARACTER_HEIGHT_M;
  buildingM: typeof BUILDING_HEIGHT_M;
}

type CampUnitsApi = NonNullable<Island3DEngine["campUnits"]>;

function campApi(engine: Island3DEngine): CampUnitsApi | null {
  return engine.campUnits ?? null;
}

export class IslandDefenceDirector {
  readonly engine: Island3DEngine;
  stance: DefenceStance = "auto";
  private alertRadiusM: number;
  private garrisonEverySec: number;
  private raidEverySec: number;
  private garrisonAcc = 0;
  private raidAcc = 0;
  private lastEvent: string | null = null;
  private running = false;
  private unsub: (() => void) | null = null;

  constructor(opts: IslandDefenceOpts) {
    this.engine = opts.engine;
    this.alertRadiusM = opts.alertRadiusM ?? 48;
    this.garrisonEverySec = opts.garrisonEverySec ?? 8;
    this.raidEverySec = opts.raidEverySec ?? 0;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    const onRaid = (ev: Event) => {
      const detail = (ev as CustomEvent).detail as { reason?: string } | undefined;
      this.onHostile(detail?.reason || "raid");
    };
    window.addEventListener("grudge:island:raid", onRaid);
    this.unsub = () => window.removeEventListener("grudge:island:raid", onRaid);
    this.lastEvent = "defence-online";
  }

  stop(): void {
    this.running = false;
    this.unsub?.();
    this.unsub = null;
  }

  setStance(next: DefenceStance): void {
    this.stance = next;
    if (next === "hold") this.engine.issueCampOrder("defend_camp");
    if (next === "rally") this.engine.issueCampOrder("group_on_me");
    this.lastEvent = `stance:${next}`;
  }

  update(dt: number): void {
    if (!this.running || this.stance === "off") return;
    const units = campApi(this.engine);
    if (!units) return;

    this.garrisonAcc += dt;
    this.raidAcc += dt;

    if (this.garrisonAcc >= this.garrisonEverySec) {
      this.garrisonAcc = 0;
      this.ensureGarrison();
    }

    if (this.raidEverySec > 0 && this.raidAcc >= this.raidEverySec) {
      this.raidAcc = 0;
      this.pingAmbientRaid();
    }
  }

  private ensureGarrison(): void {
    if (!this.engine.isNearOwnedCamp(this.alertRadiusM)) return;
    const units = campApi(this.engine);
    if (!units) return;
    const camp = units.findNearestOwnedCamp(this.alertRadiusM);
    if (!camp) return;
    const here = units.getUnits().filter((u) => u.campId === camp.data.id);
    if (here.length === 0 && this.stance === "auto") {
      this.engine.issueCampOrder("defend_camp");
      this.lastEvent = "auto-garrison";
    }
  }

  private pingAmbientRaid(): void {
    if (!this.engine.isNearOwnedCamp(this.alertRadiusM)) return;
    window.dispatchEvent(
      new CustomEvent("grudge:island:raid", { detail: { reason: "ambient" } }),
    );
  }

  onHostile(reason = "hostile"): void {
    if (!this.running || this.stance === "off") return;
    if (this.stance === "rally") {
      this.engine.issueCampOrder("group_on_me");
    } else {
      this.engine.issueCampOrder("defend_camp");
    }
    this.lastEvent = `auto-defend:${reason}`;
  }

  snapshot(): DefenceSnapshot {
    const units = campApi(this.engine);
    const camp = units?.findNearestOwnedCamp(this.alertRadiusM) ?? null;
    const unitCount = camp
      ? units!.getUnits().filter((u) => u.campId === camp.data.id).length
      : 0;
    return {
      contract: WARLORDS_MMO_CONTRACT,
      stance: this.stance,
      nearCamp: this.engine.isNearOwnedCamp(this.alertRadiusM),
      unitCount,
      lastOrder: units?.getLastOrder() ?? null,
      lastEvent: this.lastEvent,
      characterM: CHARACTER_HEIGHT_M,
      buildingM: BUILDING_HEIGHT_M,
    };
  }
}

export function attachIslandDefence(engine: Island3DEngine): IslandDefenceDirector {
  const director = new IslandDefenceDirector({ engine });
  director.start();
  return director;
}
