import { describe, it, expect } from "vitest";
import {
  craftCanSail,
  defaultDriveMode,
  sailWindThrust,
  oarThrust,
  DRIVE_MODE_RULES,
} from "./OpenWaterDriveMode";

describe("OpenWaterDriveMode", () => {
  it("small craft default to oar; ships to sail", () => {
    expect(defaultDriveMode("raft")).toBe("oar");
    expect(defaultDriveMode("dinghy")).toBe("oar");
    expect(defaultDriveMode("fishingBoat")).toBe("oar");
    expect(defaultDriveMode("sloop")).toBe("sail");
    expect(craftCanSail("raft")).toBe(false);
    expect(craftCanSail("fishingBoat")).toBe(true);
  });

  it("sail thrust zero when reefed or head-to-wind blocked partially", () => {
    expect(sailWindThrust(0.8, 0, Math.PI / 2)).toBe(0);
    expect(sailWindThrust(0.8, 1, Math.PI / 2)).toBeGreaterThan(5);
    // dead downwind still ok (sin ~0); beam is best
    expect(sailWindThrust(1, 1, Math.PI / 2)).toBeGreaterThan(
      sailWindThrust(1, 1, 0.1),
    );
  });

  it("oar thrust scales with stroke", () => {
    expect(oarThrust(0, 4)).toBe(0);
    expect(oarThrust(1, 4)).toBe(4);
  });

  it("exports exclusive-mode rules", () => {
    expect(DRIVE_MODE_RULES.some((r) => /XOR|never mix/i.test(r))).toBe(true);
  });
});
