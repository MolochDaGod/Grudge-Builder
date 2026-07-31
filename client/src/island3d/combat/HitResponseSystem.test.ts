import { describe, it, expect, vi } from "vitest";
import * as THREE from "three";
import {
  resolveHitResponse,
  applyHitResponse,
  knockUpAnimPhase,
  HIT_RESPONSE_RULES,
} from "./HitResponseSystem";
import type { ProductionSkillCombatDef } from "@shared/definitions/weaponSkillCombatCatalog";
import type { SkillHitEvent } from "./ProductionSkillCombatRuntime";

function fakeSkill(over: Partial<ProductionSkillCombatDef> = {}): ProductionSkillCombatDef {
  return {
    id: "test_slash",
    name: "Test Slash",
    description: "A slash",
    icon: "",
    weaponType: "sword",
    slotType: "active",
    tier: 1,
    damage: 30,
    cooldown: 2,
    effects: [],
    style: "melee",
    range: 2.5,
    aoeRadius: 0,
    arcDeg: 90,
    windup: 0.2,
    active: 0.15,
    recovery: 0.3,
    hitCollider: "sphere",
    projectile: "none",
    projectileSpeed: 0,
    damageType: "physical",
    school: "blade",
    animKey: "attack1",
    hitCount: 1,
    lifesteal: 0,
    stunSec: 0.15,
    dashMeters: 0,
    executeMult: 1,
    executeThreshold: 0.25,
    manaCost: 0,
    vfxKey: "slash",
    requiresTarget: true,
    ignoreRangeGate: false,
    ...over,
  };
}

describe("HitResponseSystem", () => {
  it("derives knock-up from effect keywords", () => {
    const skill = fakeSkill({
      name: "Sky Uppercut",
      effects: ["knockup", "launch"],
      damage: 45,
      stunSec: 0.4,
    });
    const hit: SkillHitEvent = {
      skillId: skill.id,
      targetId: "e1",
      damage: 45,
      damageType: "physical",
      point: new THREE.Vector3(),
      stunSec: 0.4,
      lifesteal: 0,
      isExecute: false,
    };
    const r = resolveHitResponse(
      skill,
      hit,
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, 2),
    );
    expect(r.knockUp).toBeGreaterThan(3);
    expect(r.anim).toBe("knockup_rise");
    expect(r.dir.z).toBeGreaterThan(0.9);
  });

  it("applies motion and anim via host", () => {
    const host = {
      playAnim: vi.fn(),
      applyMotion: vi.fn(),
      spawnImpact: vi.fn(),
      cameraPunch: vi.fn(),
    };
    const skill = fakeSkill({ effects: ["knockback blast"], damage: 55 });
    const hit: SkillHitEvent = {
      skillId: skill.id,
      targetId: "e1",
      damage: 55,
      damageType: "physical",
      point: new THREE.Vector3(),
      stunSec: 0.2,
      lifesteal: 0,
      isExecute: false,
    };
    const r = resolveHitResponse(
      skill,
      hit,
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(3, 0, 0),
    );
    applyHitResponse(
      host,
      { id: "e1", position: new THREE.Vector3(3, 0, 0) },
      r,
    );
    expect(host.playAnim).toHaveBeenCalled();
    expect(host.applyMotion).toHaveBeenCalled();
    expect(host.spawnImpact).toHaveBeenCalled();
  });

  it("knockUpAnimPhase progresses rise → air → fall → land", () => {
    expect(knockUpAnimPhase(5, 0.05)).toBe("knockup_rise");
    expect(knockUpAnimPhase(2, 0.3)).toBe("hit_air");
    expect(knockUpAnimPhase(-0.5, 0.5)).toBe("knockup_fall");
    expect(knockUpAnimPhase(-3, 0.8)).toBe("knockup_land");
  });

  it("exports production rules", () => {
    expect(HIT_RESPONSE_RULES.some((r) => /knock-up/i.test(r))).toBe(true);
  });
});
