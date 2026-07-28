/**
 * OpenWaterDriveMode — exclusive boat control modes (no conflicting inputs).
 *
 * SAIL  — wind fills sails; precision low; W trims, A/D helm
 * OAR   — sails reefed/down; hotkey R (or O); W/S stroke, A/D sweep — precision
 *
 * Rules:
 *   - Only ONE mode active for player craft
 *   - Small craft (raft/dinghy/fishing) default OAR
 *   - Sloop+ default SAIL; R forces OAR with sails down
 *   - Never apply wind propulsion while mode === OAR
 */

export type DriveMode = "sail" | "oar";

export type CraftDriveClass =
  | "raft"
  | "dinghy"
  | "fishingBoat"
  | "rowboat"
  | "sloop"
  | "brigantine"
  | "galleon"
  | "warship";

export interface DriveModeState {
  mode: DriveMode;
  /** 0 = fully reefed, 1 = full canvas */
  sailDeploy: number;
  /** True when oars are usable this frame */
  oarsActive: boolean;
  /** HUD hint */
  prompt: string;
}

/** Default mode by craft class */
export function defaultDriveMode(craft: CraftDriveClass): DriveMode {
  if (
    craft === "raft" ||
    craft === "dinghy" ||
    craft === "fishingBoat" ||
    craft === "rowboat"
  ) {
    return "oar";
  }
  return "sail";
}

/** Crafts that can raise sails at all */
export function craftCanSail(craft: CraftDriveClass): boolean {
  return (
    craft === "fishingBoat" ||
    craft === "sloop" ||
    craft === "brigantine" ||
    craft === "galleon" ||
    craft === "warship"
  );
}

/**
 * Hotkeys (while boarded):
 *   R or O  — toggle OAR mode (sails down, precision row)
 *   T       — raise sails / return to SAIL (if craftCanSail)
 *   When OAR: W/S stroke · A/D turn · Space rest stroke
 *   When SAIL: W sheet in · S ease · A/D helm · Shift full canvas
 */
export class OpenWaterDriveController {
  mode: DriveMode;
  sailDeploy = 1;
  private craft: CraftDriveClass;
  private keys = new Set<string>();
  private _kd: ((e: KeyboardEvent) => void) | null = null;
  private _ku: ((e: KeyboardEvent) => void) | null = null;
  private bound = false;
  private onChange?: (s: DriveModeState) => void;

  constructor(craft: CraftDriveClass, onChange?: (s: DriveModeState) => void) {
    this.craft = craft;
    this.mode = defaultDriveMode(craft);
    this.sailDeploy = this.mode === "sail" ? 1 : 0;
    this.onChange = onChange;
  }

  setCraft(craft: CraftDriveClass): void {
    this.craft = craft;
    if (!craftCanSail(craft) && this.mode === "sail") {
      this.setMode("oar");
    }
  }

  bindInput(): void {
    if (this.bound) return;
    this.bound = true;
    this._kd = (e) => {
      const k = e.key.toLowerCase();
      this.keys.add(k);
      if (k === "r" || k === "o") {
        e.preventDefault();
        this.setMode("oar");
      }
      if (k === "t" && craftCanSail(this.craft)) {
        e.preventDefault();
        this.setMode("sail");
      }
    };
    this._ku = (e) => this.keys.delete(e.key.toLowerCase());
    window.addEventListener("keydown", this._kd);
    window.addEventListener("keyup", this._ku);
  }

  unbindInput(): void {
    if (!this.bound) return;
    this.bound = false;
    if (this._kd) window.removeEventListener("keydown", this._kd);
    if (this._ku) window.removeEventListener("keyup", this._ku);
    this.keys.clear();
  }

  setMode(mode: DriveMode): void {
    if (mode === "sail" && !craftCanSail(this.craft)) {
      mode = "oar";
    }
    this.mode = mode;
    if (mode === "oar") {
      this.sailDeploy = 0; // sails down — precision oar only
    } else {
      this.sailDeploy = 1;
    }
    this.emit();
  }

  /** Sheet control while sailing (W/S). */
  updateSailTrim(dt: number): void {
    if (this.mode !== "sail") {
      this.sailDeploy = THREE_Math_lerp(this.sailDeploy, 0, 1 - Math.exp(-4 * dt));
      return;
    }
    let target = this.sailDeploy;
    if (this.keys.has("w") || this.keys.has("arrowup")) target = Math.min(1, target + dt * 0.6);
    if (this.keys.has("s") || this.keys.has("arrowdown")) target = Math.max(0.15, target - dt * 0.5);
    if (this.keys.has("shift")) target = 1;
    this.sailDeploy = THREE_Math_lerp(this.sailDeploy, target, 1 - Math.exp(-5 * dt));
  }

  getState(): DriveModeState {
    return {
      mode: this.mode,
      sailDeploy: this.sailDeploy,
      oarsActive: this.mode === "oar",
      prompt: this.prompt(),
    };
  }

  hasKey(k: string): boolean {
    return this.keys.has(k.toLowerCase());
  }

  private prompt(): string {
    if (this.mode === "oar") {
      return craftCanSail(this.craft)
        ? "OARS · W/S stroke · A/D turn · Space rest · T raise sails"
        : "OARS · W/S stroke · A/D turn · Space rest · E leave";
    }
    return "SAILS · W sheet · S ease · A/D helm · R oars (sails down)";
  }

  private emit(): void {
    this.onChange?.(this.getState());
  }

  dispose(): void {
    this.unbindInput();
  }
}

function THREE_Math_lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Wind thrust along ship forward (m/s² scale) — 0 when oar mode or reefed.
 * angle = windDir - shipYaw (radians).
 */
export function sailWindThrust(
  windStrength: number,
  sailDeploy: number,
  windMinusYaw: number,
  maxThrust = 14,
): number {
  if (sailDeploy < 0.05 || windStrength < 0.02) return 0;
  // Best on beam reach (90°), poor head-to-wind
  const point = Math.abs(Math.sin(windMinusYaw));
  const headBlocked = Math.cos(windMinusYaw) < -0.35 ? 0.15 : 1;
  return maxThrust * windStrength * sailDeploy * point * headBlocked;
}

/**
 * Oar thrust (m/s) from stroke power 0–1.
 */
export function oarThrust(strokePower: number, craftSpeed: number): number {
  return craftSpeed * Math.max(0, strokePower);
}

export const DRIVE_MODE_RULES = [
  "Exclusive modes: never mix wind thrust and oar thrust same frame",
  "R/O → OAR (sails deploy=0); T → SAIL if craft allows",
  "Raft/dinghy/rowboat: oar only",
  "Fishing boat+: sails optional; oars for docks/precision",
  "Sails down + oars = tight control near islands/docks",
] as const;
