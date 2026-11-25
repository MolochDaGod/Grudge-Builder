/**
 * Class skill tree view for the skill-tree page.
 * Nodes come only from shared/definitions/classSkillTrees.ts.
 */
import {
  CLASS_SKILL_TREES as CANON,
  type ClassSkillChoice,
} from "@shared/definitions/classSkillTrees";

const COLORS: Record<string, string> = {
  warrior: "#ef4444",
  mage: "#6aa9ff",
  ranger: "#22c55e",
  worg: "#c792ff",
};

function toSkill(choice: ClassSkillChoice) {
  return {
    id: choice.id,
    name: choice.name,
    icon: choice.icon,
    description: choice.description,
    effect: choice.effects.join(" · "),
    maxPoints: 1,
    requires: null,
    isPassive: choice.effectType === "passive",
  };
}

export const CLASS_SKILL_TREES = Object.fromEntries(
  Object.entries(CANON).map(([classId, tree]) => {
    const tiers = [
      {
        name: "Innate",
        skills: [toSkill(tree.specialAbility)],
      },
      ...tree.tiers.map((tier) => ({
        name: `Level ${tier.level} — ${tier.tierName}`,
        skills: tier.choices.map(toSkill),
      })),
    ];
    return [
      classId,
      {
        className: tree.className,
        color: COLORS[classId] ?? "#f6c945",
        tiers,
      },
    ];
  }),
);
