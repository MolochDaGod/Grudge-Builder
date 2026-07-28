import { describe, it, expect, vi } from "vitest";
import * as THREE from "three";
import {
  SectionalDamageSystem,
  registerWatercraftSections,
  registerBuildingSections,
} from "./SectionalDamageSystem";
import { BuildHammerRepair } from "./BuildHammerRepair";

function makeBoatRoot(): THREE.Group {
  const root = new THREE.Group();
  root.name = "test_boat";

  const hull = new THREE.Mesh(
    new THREE.BoxGeometry(4, 1, 8),
    new THREE.MeshStandardMaterial({ color: 0x5c4033 }),
  );
  hull.name = "hull_main";
  root.add(hull);

  const mast = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.12, 5, 8),
    new THREE.MeshStandardMaterial({ color: 0x3a2a1a }),
  );
  mast.name = "mast_fore";
  mast.position.y = 3;
  root.add(mast);

  const deck = new THREE.Mesh(
    new THREE.BoxGeometry(3.5, 0.15, 6),
    new THREE.MeshStandardMaterial({ color: 0x6b4423 }),
  );
  deck.name = "deck_planks";
  deck.position.y = 0.6;
  root.add(deck);

  return root;
}

describe("SectionalDamageSystem", () => {
  it("registers classified boat sections and hides on destroy", () => {
    const sys = new SectionalDamageSystem();
    const boat = makeBoatRoot();
    const sections = registerWatercraftSections(sys, "boat_1", boat);

    expect(sections.length).toBeGreaterThanOrEqual(2);

    const hull = sections.find((s) => /hull/i.test(s.label) || /hull/i.test(s.id));
    expect(hull).toBeTruthy();
    if (!hull) return;

    expect(hull.mesh.visible).toBe(true);
    const half = Math.ceil(hull.maxHp / 2);
    const r1 = sys.applyImpact(hull.id, half);
    expect(r1?.destroyed).toBe(false);
    expect(hull.mesh.visible).toBe(true);

    const r2 = sys.applyImpact(hull.id, hull.maxHp);
    expect(r2?.destroyed).toBe(true);
    expect(r2?.becameDamaged).toBe(true);
    expect(hull.mesh.visible).toBe(false);
    expect(hull.state).toBe("destroyed");
  });

  it("repair restores visibility and full HP", () => {
    const sys = new SectionalDamageSystem();
    const boat = makeBoatRoot();
    const sections = registerWatercraftSections(sys, "boat_2", boat);
    const sec = sections[0];
    sys.applyImpact(sec.id, sec.maxHp);
    expect(sec.mesh.visible).toBe(false);

    const ok = sys.repairSection(sec.id);
    expect(ok).toBe(true);
    expect(sec.mesh.visible).toBe(true);
    expect(sec.hp).toBe(sec.maxHp);
    expect(sec.state).toBe("intact");
  });

  it("tracks asset integrity", () => {
    const sys = new SectionalDamageSystem();
    const boat = makeBoatRoot();
    const sections = registerWatercraftSections(sys, "boat_3", boat);
    expect(sys.getAssetIntegrity("boat_3")).toBeCloseTo(1, 5);

    sys.applyImpact(sections[0].id, sections[0].maxHp);
    const integrity = sys.getAssetIntegrity("boat_3");
    expect(integrity).toBeLessThan(1);
    expect(integrity).toBeGreaterThanOrEqual(0);
  });

  it("registers named building sections", () => {
    const sys = new SectionalDamageSystem();
    const root = new THREE.Group();
    const wall = new THREE.Mesh(
      new THREE.BoxGeometry(4, 3, 0.3),
      new THREE.MeshBasicMaterial(),
    );
    wall.name = "section_wall_north";
    root.add(wall);
    const list = registerBuildingSections(sys, "bld_1", root);
    expect(list.length).toBe(1);
    expect(list[0].kind).toBe("building");
  });
});

describe("BuildHammerRepair", () => {
  it("RMB select + LMB repair spends 1 wood from player bag", () => {
    const sys = new SectionalDamageSystem();
    const boat = makeBoatRoot();
    const sections = registerWatercraftSections(sys, "boat_r", boat);
    const sec = sections[0];
    sys.applyImpact(sec.id, sec.maxHp);
    expect(sec.mesh.visible).toBe(false);

    const bag: Record<string, number> = { wood: 3 };
    const repair = new BuildHammerRepair({
      damage: sys,
      inventory: {
        getCounts: () => bag,
        trySpend: (id, qty) => {
          if ((bag[id] ?? 0) < qty) return false;
          bag[id] -= qty;
          if (bag[id] <= 0) delete bag[id];
          return true;
        },
      },
    });
    repair.enabled = true;

    // Manual select (raycast needs camera; unit-test select path)
    sys.selectSection(sec.id);
    const result = repair.applyRepair();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.woodSpent).toBe(1);
      expect(result.source).toBe("player");
    }
    expect(bag.wood).toBe(2);
    expect(sec.mesh.visible).toBe(true);
    expect(sec.hp).toBe(sec.maxHp);
  });

  it("falls back to boat hold when player has no wood", () => {
    const sys = new SectionalDamageSystem();
    const boat = makeBoatRoot();
    const sections = registerWatercraftSections(sys, "boat_b", boat);
    const sec = sections[0];
    sys.applyImpact(sec.id, sec.maxHp);

    const player: Record<string, number> = {};
    const boatBag: Record<string, number> = { wood: 2 };
    const repair = new BuildHammerRepair({
      damage: sys,
      inventory: {
        getCounts: () => player,
        trySpend: () => false,
        getBoatCounts: () => boatBag,
        trySpendBoat: (id, qty) => {
          if ((boatBag[id] ?? 0) < qty) return false;
          boatBag[id] -= qty;
          return true;
        },
      },
    });
    repair.enabled = true;
    sys.selectSection(sec.id);
    const result = repair.applyRepair();
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.source).toBe("boat");
    expect(boatBag.wood).toBe(1);
  });

  it("rejects repair with no wood", () => {
    const sys = new SectionalDamageSystem();
    const boat = makeBoatRoot();
    const sections = registerWatercraftSections(sys, "boat_n", boat);
    const sec = sections[0];
    sys.applyImpact(sec.id, sec.maxHp);

    const repair = new BuildHammerRepair({
      damage: sys,
      inventory: {
        getCounts: () => ({}),
        trySpend: () => false,
      },
      onPrompt: vi.fn(),
    });
    repair.enabled = true;
    sys.selectSection(sec.id);
    const result = repair.applyRepair();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("no_wood");
    expect(sec.mesh.visible).toBe(false);
  });
});
