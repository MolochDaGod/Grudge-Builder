export type SpellAnimationType = 
  | "projectile"    // Travels from caster to target
  | "impact"        // Plays on target when hit
  | "aoe"           // Area of effect centered on target
  | "self"          // Plays on caster (buffs, heals)
  | "beam"          // Continuous line from caster to target
  | "cast"          // Cast animation on caster before spell fires
  | "slash"         // Melee slash after-effect (overlay on target)
  | "buff"          // Buff aura effect (can be color-inverted)
  | "ground"        // Ground-based effect from under enemy

export type DamageElement = 
  | "fire" 
  | "ice" 
  | "water" 
  | "lightning" 
  | "arcane" 
  | "holy" 
  | "shadow" 
  | "nature" 
  | "physical";

export interface SpellAnimation {
  id: string;
  name: string;
  description: string;
  basePath: string;
  frameCount: number;
  fps: number;
  loop: boolean;
  type: SpellAnimationType;
  element: DamageElement;
  scale?: number;
  travelSpeed?: number;
  impactDelay?: number;
  soundEffect?: string;
  isSheet?: boolean;
  sheetColumns?: number;
  sheetRows?: number;      // For dual-row sheets (travel row + impact row)
  framePattern?: string;
  opacity?: number;        // Render opacity (0-1), useful for healing waves
  colorInvert?: boolean;   // Can be color-inverted for different factions/elements
  usageNotes?: string;     // Developer hints for proper usage
  hitScale?: number;       // Scale for hit indicator (e.g., 0.5)
  critScale?: number;      // Scale for crit indicator (e.g., 1.0)
}

export const SPELL_ANIMATIONS: Record<string, SpellAnimation> = {
  // === 8-FRAME SPRITE SHEET MAGIC (GrudgeRPGAssets2d) ===
  "arcanebolt": {
    id: "arcanebolt",
    name: "Arcane Bolt",
    description: "A bolt of pure arcane energy",
    basePath: "/sprites/GrudgeRPGAssets2d/Magic(Projectile)/8imagespritemagic/arcanebolt.png",
    frameCount: 8,
    fps: 12,
    loop: false,
    type: "projectile",
    element: "arcane",
    travelSpeed: 400,
    isSheet: true,
    sheetColumns: 8
  },
  "arcanelightning": {
    id: "arcanelightning",
    name: "Arcane Lightning",
    description: "Crackling arcane lightning",
    basePath: "/sprites/GrudgeRPGAssets2d/Magic(Projectile)/8imagespritemagic/arcanelighting.png",
    frameCount: 8,
    fps: 14,
    loop: false,
    type: "beam",
    element: "lightning",
    isSheet: true,
    sheetColumns: 8
  },
  "arcanemist": {
    id: "arcanemist",
    name: "Arcane Mist",
    description: "Swirling arcane mist",
    basePath: "/sprites/GrudgeRPGAssets2d/Magic(Projectile)/8imagespritemagic/arcanemist.png",
    frameCount: 8,
    fps: 10,
    loop: true,
    type: "aoe",
    element: "arcane",
    isSheet: true,
    sheetColumns: 8
  },
  "beam": {
    id: "beam",
    name: "Energy Beam",
    description: "Concentrated energy beam",
    basePath: "/sprites/GrudgeRPGAssets2d/Magic(Projectile)/8imagespritemagic/beam.png",
    frameCount: 8,
    fps: 12,
    loop: false,
    type: "beam",
    element: "arcane",
    isSheet: true,
    sheetColumns: 8
  },
  "flamestrike": {
    id: "flamestrike",
    name: "Flamestrike",
    description: "Pillar of fire erupting from the ground",
    basePath: "/sprites/GrudgeRPGAssets2d/Magic(Projectile)/8imagespritemagic/flamestrike.png",
    frameCount: 8,
    fps: 14,
    loop: false,
    type: "impact",
    element: "fire",
    isSheet: true,
    sheetColumns: 8
  },
  "frostbolt": {
    id: "frostbolt",
    name: "Frostbolt",
    description: "A shard of piercing ice",
    basePath: "/sprites/GrudgeRPGAssets2d/Magic(Projectile)/8imagespritemagic/frostbolt.png",
    frameCount: 8,
    fps: 12,
    loop: false,
    type: "projectile",
    element: "ice",
    travelSpeed: 350,
    isSheet: true,
    sheetColumns: 8
  },
  "holylight": {
    id: "holylight",
    name: "Holy Light",
    description: "Divine healing light",
    basePath: "/sprites/GrudgeRPGAssets2d/Magic(Projectile)/8imagespritemagic/holylight.png",
    frameCount: 8,
    fps: 10,
    loop: false,
    type: "self",
    element: "holy",
    isSheet: true,
    sheetColumns: 8
  },
  "tornado": {
    id: "tornado",
    name: "Tornado",
    description: "Whirling vortex of wind",
    basePath: "/sprites/GrudgeRPGAssets2d/Magic(Projectile)/8imagespritemagic/tornado.png",
    frameCount: 8,
    fps: 12,
    loop: true,
    type: "aoe",
    element: "nature",
    isSheet: true,
    sheetColumns: 8
  },
  "watertornado": {
    id: "watertornado",
    name: "Water Tornado",
    description: "Churning water vortex",
    basePath: "/sprites/GrudgeRPGAssets2d/Magic(Projectile)/8imagespritemagic/watertornado.png",
    frameCount: 8,
    fps: 12,
    loop: true,
    type: "aoe",
    element: "water",
    isSheet: true,
    sheetColumns: 8
  },
  "iceshard": {
    id: "iceshard",
    name: "Ice Shard",
    description: "Sharp shard of crystallized ice",
    basePath: "/sprites/GrudgeRPGAssets2d/Magic(Projectile)/19b700eab254f.png",
    frameCount: 8,
    fps: 12,
    loop: false,
    type: "projectile",
    element: "ice",
    travelSpeed: 380,
    isSheet: true,
    sheetColumns: 8
  },
  "frozen": {
    id: "frozen",
    name: "Frozen",
    description: "Encasing ice effect for freeze debuff",
    basePath: "/sprites/GrudgeRPGAssets2d/Magic(Projectile)/8imagespritemagic/frozen.png",
    frameCount: 8,
    fps: 10,
    loop: true,
    type: "self",
    element: "ice",
    isSheet: true,
    sheetColumns: 8
  },
  "healingwave": {
    id: "healingwave",
    name: "Healing Wave",
    description: "Restorative wave of healing energy",
    basePath: "/sprites/GrudgeRPGAssets2d/Magic(Projectile)/8imagespritemagic/healingwave.png",
    frameCount: 8,
    fps: 10,
    loop: false,
    type: "self",
    element: "holy",
    isSheet: true,
    sheetColumns: 8
  },
  "hit": {
    id: "hit",
    name: "Hit Effect",
    description: "Generic physical impact effect",
    basePath: "/sprites/GrudgeRPGAssets2d/Magic(Projectile)/8imagespritemagic/hit.png",
    frameCount: 8,
    fps: 14,
    loop: false,
    type: "impact",
    element: "physical",
    isSheet: true,
    sheetColumns: 8
  },
  "sunspot": {
    id: "sunspot",
    name: "Sunspot",
    description: "Blazing solar flare effect",
    basePath: "/sprites/GrudgeRPGAssets2d/Magic(Projectile)/8imagespritemagic/sunspot.png",
    frameCount: 8,
    fps: 12,
    loop: false,
    type: "impact",
    element: "fire",
    isSheet: true,
    sheetColumns: 8
  },
  "naturesheals": {
    id: "naturesheals",
    name: "Nature's Heals",
    description: "Rejuvenating nature healing effect",
    basePath: "/sprites/GrudgeRPGAssets2d/Magic(Projectile)/8imagespritemagic/NaturesHeals.png",
    frameCount: 8,
    fps: 10,
    loop: false,
    type: "self",
    element: "nature",
    isSheet: true,
    sheetColumns: 8
  },
  "arcaneslash": {
    id: "arcaneslash",
    name: "Arcane Slash",
    description: "Magical slash attack with arcane energy",
    basePath: "/sprites/GrudgeRPGAssets2d/Magic(Projectile)/8imagespritemagic/arcaneslash.png",
    frameCount: 8,
    fps: 14,
    loop: false,
    type: "slash",
    element: "arcane",
    isSheet: true,
    sheetColumns: 8,
    usageNotes: "Arcane melee spell. Use for magic-enhanced sword attacks."
  },
  "frost_aura": {
    id: "frost_aura",
    name: "Frost Aura",
    description: "Freezing cold aura effect",
    basePath: "/sprites/GrudgeRPGAssets2d/Magic(Projectile)/8imagespritemagic/Frost.png",
    frameCount: 8,
    fps: 10,
    loop: true,
    type: "buff",
    element: "ice",
    isSheet: true,
    sheetColumns: 8,
    usageNotes: "Cold aura buff. Loops while active."
  },
  "poison_cloud": {
    id: "poison_cloud",
    name: "Poison Cloud",
    description: "Toxic poison mist",
    basePath: "/sprites/GrudgeRPGAssets2d/Magic(Projectile)/8imagespritemagic/poison.png",
    frameCount: 8,
    fps: 10,
    loop: true,
    type: "aoe",
    element: "nature",
    isSheet: true,
    sheetColumns: 8,
    usageNotes: "Poison DOT effect. Loops while poison active."
  },
  "redslash_magic": {
    id: "redslash_magic",
    name: "Red Magic Slash",
    description: "Fiery magic slash effect",
    basePath: "/sprites/GrudgeRPGAssets2d/Magic(Projectile)/8imagespritemagic/redslash.png",
    frameCount: 8,
    fps: 14,
    loop: false,
    type: "slash",
    element: "fire",
    isSheet: true,
    sheetColumns: 8,
    usageNotes: "Fire-enhanced melee slash. Use for flame sword attacks."
  },
  "slashextended": {
    id: "slashextended",
    name: "Extended Slash",
    description: "Wide sweeping slash attack",
    basePath: "/sprites/GrudgeRPGAssets2d/Magic(Projectile)/8imagespritemagic/slashextended.png",
    frameCount: 8,
    fps: 16,
    loop: false,
    type: "slash",
    element: "physical",
    isSheet: true,
    sheetColumns: 8,
    usageNotes: "Wide melee sweep. 8 frames at 192x71 (1536x571 sheet)."
  },

  // === ARROW PROJECTILES (Single Sprites with Trajectory) ===
  "arrow_standard": {
    id: "arrow_standard",
    name: "Standard Arrow",
    description: "Basic arrow projectile",
    basePath: "/sprites/GrudgeRPGAssets2d/Characters(100x100)/Magic(Projectile)/Arrow(Projectile)/Arrow01(100x100).png",
    frameCount: 1,
    fps: 1,
    loop: false,
    type: "projectile",
    element: "physical",
    travelSpeed: 500,
    usageNotes: "Single-frame arrow. Follows trajectory from bow to target. On hit: drops z-1, sticks into enemy center, fades based on effect (bleed/stun)."
  },
  "arrow_piercing": {
    id: "arrow_piercing",
    name: "Piercing Arrow",
    description: "Armor-piercing arrow",
    basePath: "/sprites/GrudgeRPGAssets2d/Characters(100x100)/Magic(Projectile)/Arrow(Projectile)/Arrow02(100x100).png",
    frameCount: 1,
    fps: 1,
    loop: false,
    type: "projectile",
    element: "physical",
    travelSpeed: 550,
    usageNotes: "Piercing arrow variant. Higher travel speed. Sticks in target on hit."
  },
  "arrow_heavy": {
    id: "arrow_heavy",
    name: "Heavy Arrow",
    description: "Heavy broadhead arrow",
    basePath: "/sprites/GrudgeRPGAssets2d/Characters(100x100)/Magic(Projectile)/Arrow(Projectile)/Arrow03(100x100).png",
    frameCount: 1,
    fps: 1,
    loop: false,
    type: "projectile",
    element: "physical",
    travelSpeed: 400,
    usageNotes: "Heavy arrow for stun/bleed. Slower but higher impact. Sticks deep on hit."
  },
  "arrow_standard_small": {
    id: "arrow_standard_small",
    name: "Small Arrow",
    description: "Compact arrow for UI/minimap",
    basePath: "/sprites/GrudgeRPGAssets2d/Characters(100x100)/Magic(Projectile)/Arrow(Projectile)/Arrow01(32x32).png",
    frameCount: 1,
    fps: 1,
    loop: false,
    type: "projectile",
    element: "physical",
    travelSpeed: 500,
    scale: 0.5,
    usageNotes: "32x32 arrow for minimap or small-scale combat views."
  },

  // === WIZARD/PRIEST EFFECTS ===
  "wizard_attack1": {
    id: "wizard_attack1",
    name: "Wizard Attack",
    description: "Primary wizard attack effect",
    basePath: "/sprites/GrudgeRPGAssets2d/Magic(Projectile)/Wizard-Attack01_Effect.png",
    frameCount: 6,
    fps: 12,
    loop: false,
    type: "projectile",
    element: "arcane",
    travelSpeed: 300,
    isSheet: true,
    sheetColumns: 6
  },
  "wizard_attack2": {
    id: "wizard_attack2",
    name: "Wizard Attack 2",
    description: "Fast traveling projectile for ranged attacks",
    basePath: "/sprites/GrudgeRPGAssets2d/Magic(Projectile)/Wizard-Attack02_Effect.png",
    frameCount: 7,
    fps: 16,
    loop: false,
    type: "projectile",
    element: "arcane",
    travelSpeed: 500,
    isSheet: true,
    sheetColumns: 7,
    usageNotes: "Fast travel projectile (7 frames at 100x100). Use for gun shots, magic bullets. Scale up/down as needed. Leaves hit animation on target impact."
  },
  "gun_shot": {
    id: "gun_shot",
    name: "Gun Shot",
    description: "Fast bullet projectile for ranged weapons",
    basePath: "/sprites/GrudgeRPGAssets2d/Magic(Projectile)/Wizard-Attack02_Effect.png",
    frameCount: 7,
    fps: 20,
    loop: false,
    type: "projectile",
    element: "physical",
    travelSpeed: 700,
    scale: 0.5,
    isSheet: true,
    sheetColumns: 7,
    usageNotes: "Small fast bullet. Scaled down 50%. Very high travel speed."
  },
  "magic_bullet": {
    id: "magic_bullet",
    name: "Magic Bullet",
    description: "Medium-sized magic projectile",
    basePath: "/sprites/GrudgeRPGAssets2d/Magic(Projectile)/Wizard-Attack02_Effect.png",
    frameCount: 7,
    fps: 18,
    loop: false,
    type: "projectile",
    element: "arcane",
    travelSpeed: 600,
    scale: 0.7,
    isSheet: true,
    sheetColumns: 7,
    usageNotes: "Mid-size magic projectile. Good for wand/staff attacks."
  },
  "cannon_shot": {
    id: "cannon_shot",
    name: "Cannon Shot",
    description: "Large explosive projectile for cannons",
    basePath: "/sprites/GrudgeRPGAssets2d/Magic(Projectile)/Wizard-Attack02_Effect.png",
    frameCount: 7,
    fps: 14,
    loop: false,
    type: "projectile",
    element: "fire",
    travelSpeed: 400,
    scale: 1.5,
    isSheet: true,
    sheetColumns: 7,
    usageNotes: "Large cannon/siege projectile. Scaled up 150%. Slower but impactful."
  },
  "priest_attack": {
    id: "priest_attack",
    name: "Priest Attack",
    description: "Holy light beam effect - versatile holy magic",
    basePath: "/sprites/GrudgeRPGAssets2d/Magic(Projectile)/Priest-Attack_effect.png",
    frameCount: 5,
    fps: 12,
    loop: false,
    type: "projectile",
    element: "holy",
    travelSpeed: 280,
    isSheet: true,
    sheetColumns: 5,
    usageNotes: "Holy beam (5 frames at 100x100). Multi-use: single = heal/smite, multi in area = holy rain, straight line = judgment. Mage with healing items uses this."
  },
  "holy_rain": {
    id: "holy_rain",
    name: "Holy Rain",
    description: "Multiple holy beams raining down in an area",
    basePath: "/sprites/GrudgeRPGAssets2d/Magic(Projectile)/Priest-Attack_effect.png",
    frameCount: 5,
    fps: 14,
    loop: false,
    type: "aoe",
    element: "holy",
    scale: 0.8,
    isSheet: true,
    sheetColumns: 5,
    usageNotes: "Play 5-8 times scattered in target area with slight delays (50-150ms stagger). Each beam hits nearby enemies."
  },
  "judgment": {
    id: "judgment",
    name: "Judgment",
    description: "Line of holy beams striking in sequence",
    basePath: "/sprites/GrudgeRPGAssets2d/Magic(Projectile)/Priest-Attack_effect.png",
    frameCount: 5,
    fps: 16,
    loop: false,
    type: "beam",
    element: "holy",
    isSheet: true,
    sheetColumns: 5,
    usageNotes: "Play in straight line from caster to target. 3-5 beams in sequence (100ms apart). Judgment attack pattern."
  },
  "healing_smite": {
    id: "healing_smite",
    name: "Healing Smite",
    description: "Single holy effect for heal or smite",
    basePath: "/sprites/GrudgeRPGAssets2d/Magic(Projectile)/Priest-Attack_effect.png",
    frameCount: 5,
    fps: 10,
    loop: false,
    type: "self",
    element: "holy",
    isSheet: true,
    sheetColumns: 5,
    usageNotes: "Single cast on target. Use for mage/healer with healing items or basic smite spell."
  },
  "priest_heal": {
    id: "priest_heal",
    name: "Priest Heal",
    description: "Divine healing effect",
    basePath: "/sprites/GrudgeRPGAssets2d/Magic(Projectile)/Priest-Heal_Effect.png",
    frameCount: 6,
    fps: 10,
    loop: false,
    type: "self",
    element: "holy",
    isSheet: true,
    sheetColumns: 6,
    usageNotes: "Primary healing spell. Plays on target being healed."
  },

  // === FIRE SPELLS (Individual Frames) ===
  "fire_arrow": {
    id: "fire_arrow",
    name: "Fire Arrow",
    description: "Flaming arrow projectile",
    basePath: "/sprites/magic/fire_arrow",
    frameCount: 8,
    fps: 12,
    loop: false,
    type: "projectile",
    element: "fire",
    travelSpeed: 420,
    isSheet: false,
    framePattern: "Fire Arrow_Frame_{NN}.png"
  },
  "fire_ball": {
    id: "fire_ball",
    name: "Fireball",
    description: "Classic fireball spell",
    basePath: "/sprites/magic/fire_ball",
    frameCount: 8,
    fps: 14,
    loop: false,
    type: "projectile",
    element: "fire",
    travelSpeed: 300,
    isSheet: false,
    framePattern: "Fire Ball_Frame_{NN}.png"
  },
  "fire_spell": {
    id: "fire_spell",
    name: "Fire Spell",
    description: "Erupting fire impact",
    basePath: "/sprites/magic/fire_spell",
    frameCount: 8,
    fps: 12,
    loop: false,
    type: "impact",
    element: "fire",
    isSheet: false,
    framePattern: "Fire Spell_Frame_{NN}.png"
  },
  "fire_spell_moving": {
    id: "fire_spell_moving",
    name: "Fire Spell Moving",
    description: "Traveling fire spell effect",
    basePath: "/sprites/spells/fire-spell",
    frameCount: 8,
    fps: 14,
    loop: true,
    type: "projectile",
    element: "fire",
    travelSpeed: 350,
    framePattern: "frame_{N}.png",
    usageNotes: "Moving fire spell (8 frames at 640x360). Use for fire staff attacks, traveling flames."
  },
  "fire_staff_attack": {
    id: "fire_staff_attack",
    name: "Fire Staff Attack",
    description: "Basic fire staff projectile",
    basePath: "/sprites/spells/fire-spell",
    frameCount: 8,
    fps: 16,
    loop: true,
    type: "projectile",
    element: "fire",
    travelSpeed: 400,
    scale: 0.6,
    framePattern: "frame_{N}.png",
    usageNotes: "Fire staff basic attack. Scaled 60% for balanced size."
  },
  "fire_particle": {
    id: "fire_particle",
    name: "Fire Particle",
    description: "Small fire particle for spray effects",
    basePath: "/sprites/spells/fire-spell",
    frameCount: 8,
    fps: 20,
    loop: false,
    type: "impact",
    element: "fire",
    scale: 0.2,
    framePattern: "frame_{N}.png",
    usageNotes: "Tiny fire particle (20% scale). Spawn 2-5 of these spraying off behind units after fire hits. Random angles, slight velocity variation."
  },
  "fire_spray": {
    id: "fire_spray",
    name: "Fire Spray",
    description: "Multiple fire particles spraying after impact",
    basePath: "/sprites/spells/fire-spell",
    frameCount: 8,
    fps: 18,
    loop: false,
    type: "impact",
    element: "fire",
    scale: 0.15,
    framePattern: "frame_{N}.png",
    usageNotes: "Fire spray particles (15% scale). Render 3-6 instances with random positions behind target. Use after fire sword/gun/bomb hits."
  },
  "fire_ember": {
    id: "fire_ember",
    name: "Fire Ember",
    description: "Lingering fire ember effect",
    basePath: "/sprites/spells/fire-spell",
    frameCount: 8,
    fps: 10,
    loop: true,
    type: "buff",
    element: "fire",
    scale: 0.25,
    framePattern: "frame_{N}.png",
    usageNotes: "Burning ember (25% scale). Loops while burn DOT active. Place on burning enemies."
  },

  // === MANA SHIELD / BARRIER EFFECTS ===
  "mana_shield": {
    id: "mana_shield",
    name: "Mana Shield",
    description: "Spinning water bubble shield around caster",
    basePath: "/sprites/spells/water-ball",
    frameCount: 12,
    fps: 10,
    loop: true,
    type: "buff",
    element: "water",
    opacity: 0.5,
    framePattern: "frame_{N}.png",
    usageNotes: "Mana shield bubble (12 frames at 640x640). Render at 50% opacity. Character sits centered inside spinning bubble. Loops until shield breaks or spell expires."
  },
  "arcane_barrier": {
    id: "arcane_barrier",
    name: "Arcane Barrier",
    description: "Arcane version of mana shield",
    basePath: "/sprites/spells/water-ball",
    frameCount: 12,
    fps: 12,
    loop: true,
    type: "buff",
    element: "arcane",
    opacity: 0.5,
    colorInvert: true,
    framePattern: "frame_{N}.png",
    usageNotes: "Arcane barrier (color-inverted water bubble). 50% opacity, loops. Use CSS hue-rotate for purple tint."
  },
  "ice_barrier": {
    id: "ice_barrier",
    name: "Ice Barrier",
    description: "Frozen ice shield bubble",
    basePath: "/sprites/spells/water-ball",
    frameCount: 12,
    fps: 8,
    loop: true,
    type: "buff",
    element: "ice",
    opacity: 0.6,
    framePattern: "frame_{N}.png",
    usageNotes: "Ice barrier (slower spin, more opaque). Character frozen inside protective ice bubble."
  },
  "holy_shield": {
    id: "holy_shield",
    name: "Holy Shield",
    description: "Divine protection bubble",
    basePath: "/sprites/spells/water-ball",
    frameCount: 12,
    fps: 14,
    loop: true,
    type: "buff",
    element: "holy",
    opacity: 0.4,
    colorInvert: true,
    framePattern: "frame_{N}.png",
    usageNotes: "Holy shield (faster spin, more transparent). Apply golden/white color filter."
  },

  // === WATER SPELLS (Individual Frames) ===
  "water_arrow": {
    id: "water_arrow",
    name: "Water Arrow",
    description: "Piercing water projectile",
    basePath: "/sprites/magic/water_arrow",
    frameCount: 8,
    fps: 12,
    loop: false,
    type: "projectile",
    element: "water",
    travelSpeed: 380,
    isSheet: false,
    framePattern: "Water Arrow_Frame_{NN}.png"
  },
  "water_ball": {
    id: "water_ball",
    name: "Water Ball",
    description: "Surging water sphere",
    basePath: "/sprites/magic/water_ball",
    frameCount: 12,
    fps: 14,
    loop: false,
    type: "projectile",
    element: "water",
    travelSpeed: 280,
    isSheet: false,
    framePattern: "Water Ball_Frame_{NN}.png"
  },
  "water_spell": {
    id: "water_spell",
    name: "Water Spell",
    description: "Splashing water impact",
    basePath: "/sprites/magic/water_spell",
    frameCount: 8,
    fps: 12,
    loop: false,
    type: "impact",
    element: "water",
    isSheet: false,
    framePattern: "Water Spell_Frame_{NN}.png"
  },

  // === PIXEL MAGIC EFFECTS ===
  "magic_effect_1": {
    id: "magic_effect_1",
    name: "Magic Circle 1",
    description: "Glowing magic circle",
    basePath: "/sprites/2dassets/magic-effects/1 Magic/1.png",
    frameCount: 1,
    fps: 1,
    loop: false,
    type: "cast",
    element: "arcane"
  },
  "magic_effect_2": {
    id: "magic_effect_2",
    name: "Magic Circle 2",
    description: "Arcane sigil",
    basePath: "/sprites/2dassets/magic-effects/1 Magic/2.png",
    frameCount: 1,
    fps: 1,
    loop: false,
    type: "cast",
    element: "arcane"
  },
  "magic_effect_3": {
    id: "magic_effect_3",
    name: "Magic Spark",
    description: "Sparkling magic particles",
    basePath: "/sprites/2dassets/magic-effects/1 Magic/3.png",
    frameCount: 1,
    fps: 1,
    loop: false,
    type: "impact",
    element: "arcane"
  },
  "magic_effect_4": {
    id: "magic_effect_4",
    name: "Magic Burst",
    description: "Burst of magical energy",
    basePath: "/sprites/2dassets/magic-effects/1 Magic/4.png",
    frameCount: 1,
    fps: 1,
    loop: false,
    type: "impact",
    element: "arcane"
  },
  "magic_effect_5": {
    id: "magic_effect_5",
    name: "Magic Aura",
    description: "Glowing magical aura",
    basePath: "/sprites/2dassets/magic-effects/1 Magic/5.png",
    frameCount: 1,
    fps: 1,
    loop: false,
    type: "self",
    element: "arcane"
  },
  "magic_effect_6": {
    id: "magic_effect_6",
    name: "Magic Swirl",
    description: "Swirling magical energy",
    basePath: "/sprites/2dassets/magic-effects/1 Magic/6.png",
    frameCount: 1,
    fps: 1,
    loop: false,
    type: "aoe",
    element: "arcane"
  },
  "magic_effect_7": {
    id: "magic_effect_7",
    name: "Magic Ring",
    description: "Expanding magic ring",
    basePath: "/sprites/2dassets/magic-effects/1 Magic/7.png",
    frameCount: 1,
    fps: 1,
    loop: false,
    type: "aoe",
    element: "arcane"
  },
  "magic_effect_8": {
    id: "magic_effect_8",
    name: "Magic Glyph",
    description: "Ancient magical glyph",
    basePath: "/sprites/2dassets/magic-effects/1 Magic/8.png",
    frameCount: 1,
    fps: 1,
    loop: false,
    type: "cast",
    element: "arcane"
  },
  "magic_effect_9": {
    id: "magic_effect_9",
    name: "Magic Star",
    description: "Starry magic effect",
    basePath: "/sprites/2dassets/magic-effects/1 Magic/9.png",
    frameCount: 1,
    fps: 1,
    loop: false,
    type: "impact",
    element: "holy"
  },
  "magic_effect_10": {
    id: "magic_effect_10",
    name: "Magic Core",
    description: "Concentrated magic core",
    basePath: "/sprites/2dassets/magic-effects/1 Magic/10.png",
    frameCount: 1,
    fps: 1,
    loop: false,
    type: "self",
    element: "arcane"
  },

  // === ORGANIZED EFFECTS (/sprites/effects/) ===
  // These high-quality effects are organized by element type

  // --- ARCANE EFFECTS ---
  "effect_arcane_slash": {
    id: "effect_arcane_slash",
    name: "Arcane Slash",
    description: "Melee slash with arcane after-effect",
    basePath: "/sprites/effects/arcane/arcane_slash.png",
    frameCount: 8,
    fps: 14,
    loop: false,
    type: "slash",
    element: "arcane",
    isSheet: true,
    sheetColumns: 8,
    usageNotes: "Use as overlay on target after melee attacks. Best for enhanced sword strikes."
  },
  "effect_arcane_mist": {
    id: "effect_arcane_mist",
    name: "Arcane Mist Buff",
    description: "Swirling arcane mist buff aura",
    basePath: "/sprites/effects/arcane/arcane_mist.png",
    frameCount: 8,
    fps: 10,
    loop: true,
    type: "buff",
    element: "arcane",
    isSheet: true,
    sheetColumns: 8,
    colorInvert: true,
    usageNotes: "Buff effect. Can be color-inverted for different element types (fire=red, ice=blue, nature=green)."
  },
  "effect_arcane_lightning": {
    id: "effect_arcane_lightning",
    name: "Arcane Lightning Strike",
    description: "Crackling arcane lightning from above",
    basePath: "/sprites/effects/arcane/arcane_lightning.png",
    frameCount: 8,
    fps: 16,
    loop: false,
    type: "beam",
    element: "lightning",
    isSheet: true,
    sheetColumns: 8,
    usageNotes: "Vertical lightning attack. Position at target center."
  },
  "effect_arcane_bolt": {
    id: "effect_arcane_bolt",
    name: "Arcane Bolt",
    description: "Purple arcane projectile",
    basePath: "/sprites/effects/arcane/arcane_bolt.png",
    frameCount: 8,
    fps: 12,
    loop: false,
    type: "projectile",
    element: "arcane",
    travelSpeed: 400,
    isSheet: true,
    sheetColumns: 8,
    usageNotes: "Standard mage projectile. Travels from caster to target."
  },
  "effect_magic_combo": {
    id: "effect_magic_combo",
    name: "Magic Combo Blast",
    description: "Basic blast combo overlay",
    basePath: "/sprites/effects/arcane/magic_combo.png",
    frameCount: 8,
    fps: 14,
    loop: false,
    type: "impact",
    element: "arcane",
    isSheet: true,
    sheetColumns: 8,
    usageNotes: "Use as combo finisher effect. Overlay on target."
  },

  // --- FIRE EFFECTS ---
  "effect_flamestrike": {
    id: "effect_flamestrike",
    name: "Flamestrike Eruption",
    description: "Fire attack erupting from under enemy feet",
    basePath: "/sprites/effects/fire/flamestrike.png",
    frameCount: 8,
    fps: 14,
    loop: false,
    type: "ground",
    element: "fire",
    isSheet: true,
    sheetColumns: 8,
    usageNotes: "Ground-based attack. Position at enemy shadow/feet. Best for ground AoE."
  },
  "effect_fire_hit": {
    id: "effect_fire_hit",
    name: "Fire Impact",
    description: "Burning impact effect",
    basePath: "/sprites/effects/fire/fire_hit.png",
    frameCount: 8,
    fps: 14,
    loop: false,
    type: "impact",
    element: "fire",
    isSheet: true,
    sheetColumns: 8,
    usageNotes: "Use when fire projectile hits target. Center on hit position."
  },
  "effect_boom": {
    id: "effect_boom",
    name: "Explosion",
    description: "Generic explosion effect",
    basePath: "/sprites/effects/fire/boom.png",
    frameCount: 8,
    fps: 16,
    loop: false,
    type: "impact",
    element: "fire",
    isSheet: true,
    sheetColumns: 8,
    usageNotes: "Large explosion. Good for critical hits or AoE finishers."
  },
  "effect_sunspot": {
    id: "effect_sunspot",
    name: "Sunspot",
    description: "Blazing solar flare AoE",
    basePath: "/sprites/effects/fire/sunspot.png",
    frameCount: 6,
    fps: 12,
    loop: false,
    type: "aoe",
    element: "fire",
    isSheet: true,
    sheetColumns: 3,
    sheetRows: 2,
    usageNotes: "2 rows of 3 frames. Large fire AoE. Center on target area."
  },
  "effect_red_blast": {
    id: "effect_red_blast",
    name: "Red Energy Blast",
    description: "Red explosion effect",
    basePath: "/sprites/effects/fire/red_blast.png",
    frameCount: 8,
    fps: 14,
    loop: false,
    type: "impact",
    element: "fire",
    isSheet: true,
    sheetColumns: 8,
    usageNotes: "Red-tinted explosion. Good for berserker/rage abilities."
  },

  // --- ICE/WATER EFFECTS ---
  "effect_frozen": {
    id: "effect_frozen",
    name: "Frozen Wave",
    description: "Ice attack traveling toward target",
    basePath: "/sprites/effects/ice/frozen.png",
    frameCount: 8,
    fps: 12,
    loop: false,
    type: "projectile",
    element: "ice",
    travelSpeed: 300,
    isSheet: true,
    sheetColumns: 8,
    usageNotes: "Traveling ice wave. Good for frost mage attacks."
  },
  "effect_frostbolt": {
    id: "effect_frostbolt",
    name: "Frostbolt Spike",
    description: "Ice spike erupting from under feet",
    basePath: "/sprites/effects/ice/frostbolt.png",
    frameCount: 8,
    fps: 14,
    loop: false,
    type: "ground",
    element: "ice",
    isSheet: true,
    sheetColumns: 8,
    usageNotes: "Ground-based ice attack. Position at enemy shadow. Good for freeze effects."
  },
  "effect_water_tornado": {
    id: "effect_water_tornado",
    name: "Water Tornado",
    description: "Churning water vortex",
    basePath: "/sprites/effects/ice/water_tornado.png",
    frameCount: 8,
    fps: 12,
    loop: true,
    type: "aoe",
    element: "water",
    isSheet: true,
    sheetColumns: 8,
    usageNotes: "Looping water tornado. Good for persistent AoE zones."
  },

  // --- NATURE EFFECTS ---
  "effect_healing_regen": {
    id: "effect_healing_regen",
    name: "Nature Regeneration",
    description: "Rejuvenating nature healing particles",
    basePath: "/sprites/effects/nature/healing_regen.png",
    frameCount: 8,
    fps: 10,
    loop: true,
    type: "self",
    element: "nature",
    isSheet: true,
    sheetColumns: 8,
    usageNotes: "HoT (heal over time) effect. Loop on target while regenerating."
  },
  "effect_natures_heal": {
    id: "effect_natures_heal",
    name: "Nature's Heal",
    description: "Green nature healing aura",
    basePath: "/sprites/effects/nature/natures_heal.png",
    frameCount: 8,
    fps: 10,
    loop: false,
    type: "self",
    element: "nature",
    isSheet: true,
    sheetColumns: 8,
    usageNotes: "Direct heal effect. Play once on heal target."
  },

  // --- HOLY EFFECTS ---
  "effect_healing_wave": {
    id: "effect_healing_wave",
    name: "Healing Wave Shell",
    description: "Holy healing shell effect",
    basePath: "/sprites/effects/holy/healing_wave.png",
    frameCount: 8,
    fps: 10,
    loop: true,
    type: "self",
    element: "holy",
    isSheet: true,
    sheetColumns: 8,
    opacity: 0.6,
    usageNotes: "Loopable at 40-80% opacity. Creates protective shell visual around healed target."
  },
  "effect_holy_beam": {
    id: "effect_holy_beam",
    name: "Holy Beam",
    description: "Divine light beam from above",
    basePath: "/sprites/effects/holy/holy_beam.png",
    frameCount: 8,
    fps: 12,
    loop: false,
    type: "beam",
    element: "holy",
    isSheet: true,
    sheetColumns: 8,
    usageNotes: "Vertical divine beam. Good for smite abilities or resurrection effects."
  },

  // --- PHYSICAL EFFECTS ---
  "effect_red_slash": {
    id: "effect_red_slash",
    name: "Red Melee Slash",
    description: "Red-tinted melee slash after-effect",
    basePath: "/sprites/effects/physical/red_slash.png",
    frameCount: 8,
    fps: 14,
    loop: false,
    type: "slash",
    element: "physical",
    isSheet: true,
    sheetColumns: 8,
    usageNotes: "Use for warrior/berserker melee attacks. Overlay on target."
  },
  "effect_red_slash_projectile": {
    id: "effect_red_slash_projectile",
    name: "Red Slash Projectile",
    description: "Ranged sword attack or magic slash with travel/impact phases",
    basePath: "/sprites/effects/physical/red_slash_projectile.png",
    frameCount: 4,
    fps: 12,
    loop: false,
    type: "projectile",
    element: "physical",
    travelSpeed: 350,
    isSheet: true,
    sheetColumns: 4,
    sheetRows: 2,
    usageNotes: "DUAL-ROW: Top row (4 frames) = travel animation, loop until contact. Bottom row (4 frames) = impact animation, play once on hit. Pair with red_blast_hit on enemy."
  },
  "effect_red_blast_hit": {
    id: "effect_red_blast_hit",
    name: "Red Blast Hit Indicator",
    description: "Red energy burst for hit/crit indication",
    basePath: "/sprites/effects/physical/red_blast_hit.png",
    frameCount: 4,
    fps: 14,
    loop: false,
    type: "impact",
    element: "physical",
    isSheet: true,
    sheetColumns: 4,
    hitScale: 0.5,
    critScale: 1.0,
    usageNotes: "Scale 0.5 = normal hit indicator. Scale 1.0 = crit indicator or magic effect. Plays on enemy when red_slash_projectile makes contact."
  },
  "effect_red_crit_bleed": {
    id: "effect_red_crit_bleed",
    name: "Red Crit Bleed Effect",
    description: "Bleed/special attack aftermath on enemy",
    basePath: "/sprites/effects/physical/red_crit_bleed.png",
    frameCount: 4,
    fps: 10,
    loop: true,
    type: "buff",
    element: "physical",
    isSheet: true,
    sheetColumns: 4,
    usageNotes: "DoT (damage over time) visual. Loop on enemy after bleed/special warrior attack. Shows ongoing damage effect."
  },

  // --- WIND EFFECTS ---
  "effect_tornado": {
    id: "effect_tornado",
    name: "Earth/Sand Tornado",
    description: "Whirling sand vortex",
    basePath: "/sprites/effects/wind/tornado.png",
    frameCount: 8,
    fps: 12,
    loop: true,
    type: "aoe",
    element: "nature",
    isSheet: true,
    sheetColumns: 8,
    usageNotes: "Looping tornado. Good for persistent crowd control zones."
  },
  "effect_earth_tornado_spell": {
    id: "effect_earth_tornado_spell",
    name: "Earth Tornado Spell",
    description: "Mage-cast earth tornado with travel and impact phases",
    basePath: "/sprites/effects/wind/earth_tornado_spell.png",
    frameCount: 4,
    fps: 10,
    loop: false,
    type: "projectile",
    element: "nature",
    travelSpeed: 200,
    isSheet: true,
    sheetColumns: 4,
    sheetRows: 2,
    usageNotes: "DUAL-ROW: Top row (4 frames) = travel animation, loop while moving to target. Bottom row (4 frames) = impact/stationary animation, play when reaches target."
  },
  "effect_water_tornado_spell": {
    id: "effect_water_tornado_spell",
    name: "Water Tornado Spell",
    description: "Mage-cast water tornado with travel and impact phases",
    basePath: "/sprites/effects/ice/water_tornado_spell.png",
    frameCount: 4,
    fps: 10,
    loop: false,
    type: "projectile",
    element: "water",
    travelSpeed: 200,
    isSheet: true,
    sheetColumns: 4,
    sheetRows: 2,
    usageNotes: "DUAL-ROW: Top row (4 frames) = travel animation, loop while moving to target. Bottom row (4 frames) = impact/stationary animation, play when reaches target."
  },

  // === CURSORS & UI EFFECTS ===
  "cursor_sprites": {
    id: "cursor_sprites",
    name: "Cursor Sprites",
    description: "Mouse cursor sprites with green arrows for left-click targeting",
    basePath: "/sprites/effects/cursors/cursors.png",
    frameCount: 1,
    fps: 1,
    loop: false,
    type: "self",
    element: "physical",
    isSheet: true,
    sheetColumns: 1,
    usageNotes: "Contains various cursor states. Green arrows point to middle on left click for targeting feedback."
  },

  // === HIT & IMPACT EFFECTS ===
  "effect_hit_burst": {
    id: "effect_hit_burst",
    name: "Hit Burst",
    description: "Red hit explosion effect for damage feedback",
    basePath: "/sprites/effects/fire/hit.png",
    frameCount: 6,
    fps: 12,
    loop: false,
    type: "impact",
    element: "fire",
    isSheet: true,
    sheetColumns: 3,
    sheetRows: 2,
    hitScale: 0.5,
    critScale: 1.0,
    usageNotes: "Plays where hit happens. Use at 0.5x scale for normal hits, 1.0x for crits. 2 rows of 3 frames."
  },

  // === HOLY/HEALING EFFECTS ===
  "effect_holy_heal": {
    id: "effect_holy_heal",
    name: "Holy Heal Aura",
    description: "Healing aura that stays under unit's feet and fades in/out",
    basePath: "/sprites/effects/holy/holyheal.png",
    frameCount: 4,
    fps: 8,
    loop: true,
    type: "ground",
    element: "holy",
    opacity: 0.8,
    isSheet: true,
    sheetColumns: 4,
    usageNotes: "AURA: Position under unit's feet. Fades in/out while healing. Loop until heal ends."
  },
  "effect_holy_light": {
    id: "effect_holy_light",
    name: "Holy Light Explosion",
    description: "Light energy explosion from under enemy feet, chain multiple for beam effect",
    basePath: "/sprites/effects/holy/holylight.png",
    frameCount: 8,
    fps: 10,
    loop: false,
    type: "ground",
    element: "holy",
    isSheet: true,
    sheetColumns: 4,
    sheetRows: 2,
    impactDelay: 200,
    usageNotes: "CHAIN: Play multiple instances 0.2s apart to create light beam moving from under feet. 2 rows of 4 frames."
  },
  "effect_healing_wave_swirl": {
    id: "effect_healing_wave_swirl",
    name: "Healing Wave Swirl",
    description: "Swirling golden healing wave",
    basePath: "/sprites/effects/holy/healingwave.png",
    frameCount: 8,
    fps: 10,
    loop: false,
    type: "self",
    element: "holy",
    opacity: 0.8,
    isSheet: true,
    sheetColumns: 4,
    sheetRows: 2
  },

  // === MELEE EFFECTS ===
  "effect_slash_extended": {
    id: "effect_slash_extended",
    name: "Slash Extended Trail",
    description: "Extended trailing effect for sword/melee weapon slashes",
    basePath: "/sprites/effects/melee/slashextended.png",
    frameCount: 8,
    fps: 14,
    loop: false,
    type: "slash",
    element: "physical",
    isSheet: true,
    sheetColumns: 4,
    sheetRows: 2,
    usageNotes: "LAYER: Render this BELOW the main slash effect for trailing motion. 2 rows of 4 frames showing arc dissipation."
  },

  // === POISON EFFECTS ===
  "effect_poison_bubble": {
    id: "effect_poison_bubble",
    name: "Poison Bubble Pop",
    description: "Poison bubble rising from under enemy feet",
    basePath: "/sprites/effects/poison/poison_bubble.png",
    frameCount: 8,
    fps: 10,
    loop: false,
    type: "ground",
    element: "nature",
    isSheet: true,
    sheetColumns: 8,
    usageNotes: "Plays from under enemy feet, bubbles pop upward."
  },
  "effect_poison_blast": {
    id: "effect_poison_blast",
    name: "Poison Blast",
    description: "Toxic poison explosion",
    basePath: "/sprites/effects/poison/poison_blast.png",
    frameCount: 8,
    fps: 10,
    loop: false,
    type: "impact",
    element: "nature",
    isSheet: true,
    sheetColumns: 4,
    sheetRows: 2,
    usageNotes: "2 rows of 4 frames. Main poison damage impact."
  },
  "effect_poison_debuff": {
    id: "effect_poison_debuff",
    name: "Poison Debuff Overlay",
    description: "Green skull poison debuff that stays on poisoned target",
    basePath: "/sprites/effects/poison/poisondebuff.png",
    frameCount: 4,
    fps: 6,
    loop: true,
    type: "buff",
    element: "nature",
    opacity: 0.4,
    isSheet: true,
    sheetColumns: 4,
    usageNotes: "DEBUFF: Render at 30-50% opacity, loops on poisoned target until debuff expires."
  },

  // === ENEMY OVERLAYS ===
  "effect_extra_overlay": {
    id: "effect_extra_overlay",
    name: "Extra Enemy Overlay",
    description: "Animated cyan X-slash overlay for elite enemies",
    basePath: "/sprites/effects/overlays/extraoverlay.png",
    frameCount: 4,
    fps: 8,
    loop: true,
    type: "buff",
    element: "arcane",
    isSheet: true,
    sheetColumns: 4,
    usageNotes: "Cool animated overlay for special/elite enemies. Loops continuously."
  },

  // === LIGHTNING EFFECTS (Magic Traps) ===
  "lightning_strike_1": {
    id: "lightning_strike_1",
    name: "Lightning Strike 1",
    description: "Vertical lightning bolt strike",
    basePath: "/sprites/effects/lightning/1.png",
    frameCount: 4,
    fps: 16,
    loop: false,
    type: "impact",
    element: "lightning",
    isSheet: true,
    sheetColumns: 4,
    usageNotes: "Fast lightning strike from above. 4 frames at 160x160 each."
  },
  "lightning_strike_2": {
    id: "lightning_strike_2",
    name: "Lightning Strike 2",
    description: "Branching lightning bolt",
    basePath: "/sprites/effects/lightning/2.png",
    frameCount: 4,
    fps: 16,
    loop: false,
    type: "impact",
    element: "lightning",
    isSheet: true,
    sheetColumns: 4,
    usageNotes: "Branching lightning variant. 4 frames at 160x160 each."
  },
  "lightning_strike_3": {
    id: "lightning_strike_3",
    name: "Lightning Strike 3",
    description: "Forked lightning bolt",
    basePath: "/sprites/effects/lightning/3.png",
    frameCount: 4,
    fps: 16,
    loop: false,
    type: "impact",
    element: "lightning",
    isSheet: true,
    sheetColumns: 4,
    usageNotes: "Forked lightning variant. 4 frames at 160x160 each."
  },
  "lightning_strike_4": {
    id: "lightning_strike_4",
    name: "Lightning Strike 4",
    description: "Wide lightning strike",
    basePath: "/sprites/effects/lightning/4.png",
    frameCount: 4,
    fps: 16,
    loop: false,
    type: "impact",
    element: "lightning",
    isSheet: true,
    sheetColumns: 4,
    usageNotes: "Wide lightning strike. 4 frames at 160x160 each."
  },

  // === FIREBALL PROJECTILES (Normal Magic Attacks) ===
  "fireball_red": {
    id: "fireball_red",
    name: "Red Fireball",
    description: "Fire magic projectile",
    basePath: "/sprites/fireballs/red/stand_td",
    frameCount: 8,
    fps: 12,
    loop: true,
    type: "projectile",
    element: "fire",
    travelSpeed: 350,
    framePattern: "r1frame0{N}.png",
    usageNotes: "Normal fire magic attack. 8 frames in stand_td folder."
  },
  "fireball_blue": {
    id: "fireball_blue",
    name: "Blue Fireball",
    description: "Ice magic projectile",
    basePath: "/sprites/fireballs/blue/stand_td",
    frameCount: 8,
    fps: 12,
    loop: true,
    type: "projectile",
    element: "ice",
    travelSpeed: 350,
    framePattern: "r1frame0{N}.png",
    usageNotes: "Normal ice magic attack. 8 frames in stand_td folder."
  },
  "fireball_green": {
    id: "fireball_green",
    name: "Green Fireball",
    description: "Nature/poison magic projectile",
    basePath: "/sprites/fireballs/green/stand_td",
    frameCount: 8,
    fps: 12,
    loop: true,
    type: "projectile",
    element: "nature",
    travelSpeed: 350,
    framePattern: "r1frame0{N}.png",
    usageNotes: "Normal nature magic attack. 8 frames in stand_td folder."
  },
  "fireball_purple": {
    id: "fireball_purple",
    name: "Purple Fireball",
    description: "Arcane magic projectile",
    basePath: "/sprites/fireballs/purple/stand_td",
    frameCount: 8,
    fps: 12,
    loop: true,
    type: "projectile",
    element: "arcane",
    travelSpeed: 350,
    framePattern: "r1frame0{N}.png",
    usageNotes: "Normal arcane magic attack. 8 frames in stand_td folder."
  },
  "fireball_white": {
    id: "fireball_white",
    name: "White Fireball",
    description: "Holy magic projectile",
    basePath: "/sprites/fireballs/white/stand_td",
    frameCount: 8,
    fps: 12,
    loop: true,
    type: "projectile",
    element: "holy",
    travelSpeed: 350,
    framePattern: "r1frame0{N}.png",
    usageNotes: "Normal holy magic attack. 8 frames in stand_td folder."
  },

  // === MELEE CRITICAL HIT EFFECTS (Anime Flash Style) ===
  "red_blast_hit": {
    id: "red_blast_hit",
    name: "Red Blast Hit",
    description: "Melee critical hit anime flash",
    basePath: "/sprites/effects/physical/red_blast_hit.png",
    frameCount: 3,
    fps: 18,
    loop: false,
    type: "impact",
    element: "physical",
    isSheet: true,
    sheetColumns: 3,
    hitScale: 0.5,
    critScale: 1.0,
    usageNotes: "Anime-style flash for melee crits. 3 frames at ~614x587 each."
  },
  "red_crit_bleed": {
    id: "red_crit_bleed",
    name: "Red Crit Bleed",
    description: "Critical bleed slash effect",
    basePath: "/sprites/effects/physical/red_crit_bleed.png",
    frameCount: 6,
    fps: 16,
    loop: false,
    type: "impact",
    element: "physical",
    isSheet: true,
    sheetColumns: 3,
    hitScale: 0.5,
    critScale: 1.0,
    usageNotes: "Bleed effect on crit. 6 frames at 512x512 (3x2 grid)."
  },
  "red_slash": {
    id: "red_slash",
    name: "Red Slash",
    description: "Red melee slash impact",
    basePath: "/sprites/effects/physical/red_slash.png",
    frameCount: 6,
    fps: 16,
    loop: false,
    type: "impact",
    element: "physical",
    isSheet: true,
    sheetColumns: 3,
    hitScale: 0.5,
    critScale: 1.0,
    usageNotes: "Standard melee hit slash. 6 frames at 512x512 (3x2 grid)."
  },
  "red_slash_projectile": {
    id: "red_slash_projectile",
    name: "Red Slash Projectile",
    description: "Ranged slash wave attack",
    basePath: "/sprites/effects/physical/red_slash_projectile.png",
    frameCount: 6,
    fps: 14,
    loop: false,
    type: "projectile",
    element: "physical",
    travelSpeed: 400,
    isSheet: true,
    sheetColumns: 3,
    usageNotes: "Blade wave projectile. 6 frames at 512x512 (3x2 grid)."
  },
  "fire_red_blast": {
    id: "fire_red_blast",
    name: "Fire Red Blast",
    description: "Magic crit explosion anime flash",
    basePath: "/sprites/effects/fire/red_blast.png",
    frameCount: 3,
    fps: 18,
    loop: false,
    type: "impact",
    element: "fire",
    isSheet: true,
    sheetColumns: 3,
    hitScale: 0.5,
    critScale: 1.0,
    usageNotes: "Anime-style flash for magic crits. 3 frames at ~614x587 each."
  },

  // === ANIME SLASH EFFECTS (GrudgeRPG Assets - Frame Sequences) ===
  "anime_slash_1": {
    id: "anime_slash_1",
    name: "Anime Slash 1",
    description: "Fast diagonal slash",
    basePath: "/sprites/GrudgeRPGAssets2d/Magic(Projectile)/effects/slash/1",
    frameCount: 10,
    fps: 20,
    loop: false,
    type: "impact",
    element: "physical",
    framePattern: "{N}.png",
    hitScale: 0.4,
    critScale: 0.8,
    usageNotes: "Anime diagonal slash. 10 frames at 496x496 each."
  },
  "anime_slash_2": {
    id: "anime_slash_2",
    name: "Anime Slash 2",
    description: "Short burst slash",
    basePath: "/sprites/GrudgeRPGAssets2d/Magic(Projectile)/effects/slash/2",
    frameCount: 5,
    fps: 20,
    loop: false,
    type: "impact",
    element: "physical",
    framePattern: "{N}.png",
    hitScale: 0.4,
    critScale: 0.8,
    usageNotes: "Short burst slash. 5 frames at 496x496 each."
  },
  "anime_slash_3": {
    id: "anime_slash_3",
    name: "Anime Slash 3",
    description: "Heavy circular slash",
    basePath: "/sprites/GrudgeRPGAssets2d/Magic(Projectile)/effects/slash/3",
    frameCount: 10,
    fps: 20,
    loop: false,
    type: "impact",
    element: "physical",
    framePattern: "{N}.png",
    hitScale: 0.4,
    critScale: 0.8,
    usageNotes: "Heavy circular slash. 10 frames at 496x496 each."
  },
  "anime_slash_4": {
    id: "anime_slash_4",
    name: "Anime Slash 4",
    description: "Quick horizontal slash",
    basePath: "/sprites/GrudgeRPGAssets2d/Magic(Projectile)/effects/slash/4",
    frameCount: 8,
    fps: 20,
    loop: false,
    type: "impact",
    element: "physical",
    framePattern: "{N}.png",
    hitScale: 0.4,
    critScale: 0.8,
    usageNotes: "Quick horizontal slash. 8 frames at 496x496 each."
  },
  "anime_slash_5": {
    id: "anime_slash_5",
    name: "Anime Slash 5",
    description: "Blade wave slash",
    basePath: "/sprites/GrudgeRPGAssets2d/Magic(Projectile)/effects/slash/5",
    frameCount: 8,
    fps: 20,
    loop: false,
    type: "impact",
    element: "physical",
    framePattern: "{N}.png",
    hitScale: 0.4,
    critScale: 0.8,
    usageNotes: "Blade wave slash. 8 frames at 496x496 each."
  },

  // === SPECIAL BOW ATTACKS (Fire Arrow) ===
  "fire_arrow_bow": {
    id: "fire_arrow_bow",
    name: "Fire Arrow (Bow)",
    description: "Flaming arrow for special bow shots",
    basePath: "/sprites/spells/fire-arrow",
    frameCount: 8,
    fps: 14,
    loop: true,
    type: "projectile",
    element: "fire",
    travelSpeed: 450,
    framePattern: "frame_{N}.png",
    usageNotes: "Special bow shot. 8 frames at 600x320 each. Loops during flight."
  },
  "water_arrow_bow": {
    id: "water_arrow_bow",
    name: "Water Arrow (Bow)",
    description: "Water-enchanted arrow",
    basePath: "/sprites/spells/water-arrow",
    frameCount: 8,
    fps: 14,
    loop: true,
    type: "projectile",
    element: "water",
    travelSpeed: 450,
    framePattern: "frame_{N}.png",
    usageNotes: "Water bow shot. 8 frames at 600x320 each. Loops during flight."
  },

  // === METEOR/AOE FIRE ATTACKS ===
  "fire_meteor": {
    id: "fire_meteor",
    name: "Fire Meteor",
    description: "Spinning fireball that grows and crashes down as meteor AOE",
    basePath: "/sprites/spells/fire-ball",
    frameCount: 8,
    fps: 12,
    loop: true,
    type: "aoe",
    element: "fire",
    framePattern: "frame_{N}.png",
    scale: 1.5,
    usageNotes: "Meteor AOE. Starts small above caster (scale 0.3), rises and grows (scale 1.5), then crashes on all enemies. 8 frames at 640x640 each."
  },
  "fire_ball_spin": {
    id: "fire_ball_spin",
    name: "Spinning Fireball",
    description: "Spinning fire projectile",
    basePath: "/sprites/spells/fire-ball",
    frameCount: 8,
    fps: 14,
    loop: true,
    type: "projectile",
    element: "fire",
    travelSpeed: 300,
    framePattern: "frame_{N}.png",
    usageNotes: "Large spinning fireball projectile. 8 frames at 640x640 each."
  },
  "water_ball_spin": {
    id: "water_ball_spin",
    name: "Spinning Waterball",
    description: "Spinning water orb projectile",
    basePath: "/sprites/spells/water-ball",
    frameCount: 8,
    fps: 14,
    loop: true,
    type: "projectile",
    element: "water",
    travelSpeed: 300,
    framePattern: "frame_{N}.png",
    usageNotes: "Large spinning water orb. 8 frames."
  },

  // === PIXEL EFFECTS PACK ===
  "pixel_magicspell": {
    id: "pixel_magicspell",
    name: "Magic Spell",
    description: "Colorful magic spell burst",
    basePath: "/sprites/effects/pixel/1_magicspell_spritesheet.png",
    frameCount: 16,
    fps: 12,
    loop: false,
    type: "impact",
    element: "arcane",
    isSheet: true,
    sheetColumns: 8,
    sheetRows: 2
  },
  "pixel_magic8": {
    id: "pixel_magic8",
    name: "Magic 8",
    description: "Elaborate arcane magic burst",
    basePath: "/sprites/effects/pixel/2_magic8_spritesheet.png",
    frameCount: 16,
    fps: 12,
    loop: false,
    type: "aoe",
    element: "arcane",
    isSheet: true,
    sheetColumns: 8,
    sheetRows: 2
  },
  "pixel_bluefire": {
    id: "pixel_bluefire",
    name: "Blue Fire",
    description: "Ethereal blue flames",
    basePath: "/sprites/effects/pixel/3_bluefire_spritesheet.png",
    frameCount: 8,
    fps: 12,
    loop: true,
    type: "aoe",
    element: "fire",
    isSheet: true,
    sheetColumns: 8
  },
  "pixel_casting": {
    id: "pixel_casting",
    name: "Casting Circle",
    description: "Magical casting circle effect",
    basePath: "/sprites/effects/pixel/4_casting_spritesheet.png",
    frameCount: 8,
    fps: 10,
    loop: true,
    type: "cast",
    element: "arcane",
    isSheet: true,
    sheetColumns: 8
  },
  "pixel_magickahit": {
    id: "pixel_magickahit",
    name: "Magicka Hit",
    description: "Magic impact effect",
    basePath: "/sprites/effects/pixel/5_magickahit_spritesheet.png",
    frameCount: 8,
    fps: 14,
    loop: false,
    type: "impact",
    element: "arcane",
    isSheet: true,
    sheetColumns: 8
  },
  "pixel_flamelash": {
    id: "pixel_flamelash",
    name: "Flame Lash",
    description: "Whipping flame attack",
    basePath: "/sprites/effects/pixel/6_flamelash_spritesheet.png",
    frameCount: 8,
    fps: 14,
    loop: false,
    type: "slash",
    element: "fire",
    isSheet: true,
    sheetColumns: 8
  },
  "pixel_firespin": {
    id: "pixel_firespin",
    name: "Fire Spin",
    description: "Spinning fire vortex",
    basePath: "/sprites/effects/pixel/7_firespin_spritesheet.png",
    frameCount: 16,
    fps: 12,
    loop: true,
    type: "aoe",
    element: "fire",
    isSheet: true,
    sheetColumns: 8,
    sheetRows: 2
  },
  "pixel_protectioncircle": {
    id: "pixel_protectioncircle",
    name: "Protection Circle",
    description: "Protective magical barrier",
    basePath: "/sprites/effects/pixel/8_protectioncircle_spritesheet.png",
    frameCount: 8,
    fps: 10,
    loop: true,
    type: "buff",
    element: "arcane",
    isSheet: true,
    sheetColumns: 8
  },
  "pixel_brightfire": {
    id: "pixel_brightfire",
    name: "Bright Fire",
    description: "Brilliant burning flames",
    basePath: "/sprites/effects/pixel/9_brightfire_spritesheet.png",
    frameCount: 8,
    fps: 12,
    loop: true,
    type: "aoe",
    element: "fire",
    isSheet: true,
    sheetColumns: 8
  },
  "pixel_weaponhit": {
    id: "pixel_weaponhit",
    name: "Weapon Hit",
    description: "Physical weapon impact",
    basePath: "/sprites/effects/pixel/10_weaponhit_spritesheet.png",
    frameCount: 4,
    fps: 16,
    loop: false,
    type: "impact",
    element: "physical",
    isSheet: true,
    sheetColumns: 4
  },
  "pixel_fire": {
    id: "pixel_fire",
    name: "Fire",
    description: "Large fire effect",
    basePath: "/sprites/effects/pixel/11_fire_spritesheet.png",
    frameCount: 16,
    fps: 12,
    loop: true,
    type: "aoe",
    element: "fire",
    isSheet: true,
    sheetColumns: 8,
    sheetRows: 2
  },
  "pixel_nebula": {
    id: "pixel_nebula",
    name: "Nebula",
    description: "Cosmic nebula cloud",
    basePath: "/sprites/effects/pixel/12_nebula_spritesheet.png",
    frameCount: 16,
    fps: 10,
    loop: true,
    type: "aoe",
    element: "arcane",
    isSheet: true,
    sheetColumns: 8,
    sheetRows: 2
  },
  "pixel_vortex": {
    id: "pixel_vortex",
    name: "Vortex",
    description: "Swirling energy vortex",
    basePath: "/sprites/effects/pixel/13_vortex_spritesheet.png",
    frameCount: 16,
    fps: 12,
    loop: true,
    type: "aoe",
    element: "arcane",
    isSheet: true,
    sheetColumns: 8,
    sheetRows: 2
  },
  "pixel_phantom": {
    id: "pixel_phantom",
    name: "Phantom",
    description: "Ghostly phantom effect",
    basePath: "/sprites/effects/pixel/14_phantom_spritesheet.png",
    frameCount: 8,
    fps: 10,
    loop: true,
    type: "buff",
    element: "shadow",
    isSheet: true,
    sheetColumns: 8
  },
  "pixel_loading": {
    id: "pixel_loading",
    name: "Loading",
    description: "Charging energy effect",
    basePath: "/sprites/effects/pixel/15_loading_spritesheet.png",
    frameCount: 16,
    fps: 12,
    loop: true,
    type: "cast",
    element: "arcane",
    isSheet: true,
    sheetColumns: 8,
    sheetRows: 2
  },
  "pixel_sunburn": {
    id: "pixel_sunburn",
    name: "Sunburn",
    description: "Solar flare burst",
    basePath: "/sprites/effects/pixel/16_sunburn_spritesheet.png",
    frameCount: 16,
    fps: 14,
    loop: false,
    type: "impact",
    element: "holy",
    isSheet: true,
    sheetColumns: 8,
    sheetRows: 2
  },
  "pixel_felspell": {
    id: "pixel_felspell",
    name: "Fel Spell",
    description: "Dark fel magic explosion",
    basePath: "/sprites/effects/pixel/17_felspell_spritesheet.png",
    frameCount: 16,
    fps: 12,
    loop: false,
    type: "impact",
    element: "shadow",
    isSheet: true,
    sheetColumns: 8,
    sheetRows: 2
  },
  "pixel_midnight": {
    id: "pixel_midnight",
    name: "Midnight",
    description: "Dark midnight void",
    basePath: "/sprites/effects/pixel/18_midnight_spritesheet.png",
    frameCount: 16,
    fps: 10,
    loop: true,
    type: "aoe",
    element: "shadow",
    isSheet: true,
    sheetColumns: 8,
    sheetRows: 2
  },
  "pixel_freezing": {
    id: "pixel_freezing",
    name: "Freezing",
    description: "Ice freezing effect",
    basePath: "/sprites/effects/pixel/19_freezing_spritesheet.png",
    frameCount: 16,
    fps: 12,
    loop: true,
    type: "aoe",
    element: "ice",
    isSheet: true,
    sheetColumns: 8,
    sheetRows: 2
  },
  "pixel_magicbubbles": {
    id: "pixel_magicbubbles",
    name: "Magic Bubbles",
    description: "Floating magical bubbles",
    basePath: "/sprites/effects/pixel/20_magicbubbles_spritesheet.png",
    frameCount: 8,
    fps: 10,
    loop: true,
    type: "buff",
    element: "water",
    isSheet: true,
    sheetColumns: 8
  }
};

export function getSpellAnimation(id: string): SpellAnimation | undefined {
  return SPELL_ANIMATIONS[id];
}

export function getSpellsByElement(element: DamageElement): SpellAnimation[] {
  return Object.values(SPELL_ANIMATIONS).filter(spell => spell.element === element);
}

export function getSpellsByType(type: SpellAnimationType): SpellAnimation[] {
  return Object.values(SPELL_ANIMATIONS).filter(spell => spell.type === type);
}

export function getProjectileSpells(): SpellAnimation[] {
  return getSpellsByType("projectile");
}

export function getImpactSpells(): SpellAnimation[] {
  return getSpellsByType("impact");
}

export function getAoeSpells(): SpellAnimation[] {
  return getSpellsByType("aoe");
}

export function getHealingSpells(): SpellAnimation[] {
  return Object.values(SPELL_ANIMATIONS).filter(
    spell => spell.type === "self" && spell.element === "holy"
  );
}

export const SPELL_ANIMATION_LIST = Object.values(SPELL_ANIMATIONS);

// New type-specific getters
export function getSlashSpells(): SpellAnimation[] {
  return Object.values(SPELL_ANIMATIONS).filter(spell => spell.type === "slash");
}

export function getGroundSpells(): SpellAnimation[] {
  return Object.values(SPELL_ANIMATIONS).filter(spell => spell.type === "ground");
}

export function getBuffSpells(): SpellAnimation[] {
  return Object.values(SPELL_ANIMATIONS).filter(spell => spell.type === "buff");
}

export function getBeamSpells(): SpellAnimation[] {
  return Object.values(SPELL_ANIMATIONS).filter(spell => spell.type === "beam");
}

export function getCastSpells(): SpellAnimation[] {
  return Object.values(SPELL_ANIMATIONS).filter(spell => spell.type === "cast");
}

export function getSelfSpells(): SpellAnimation[] {
  return Object.values(SPELL_ANIMATIONS).filter(spell => spell.type === "self");
}

export const SPELL_CATEGORIES = {
  // Animation types
  projectiles: getProjectileSpells(),
  impacts: getImpactSpells(),
  aoe: getAoeSpells(),
  beams: getBeamSpells(),
  cast: getCastSpells(),
  self: getSelfSpells(),
  slash: getSlashSpells(),
  ground: getGroundSpells(),
  buff: getBuffSpells(),
  // Element types
  fire: getSpellsByElement("fire"),
  ice: getSpellsByElement("ice"),
  water: getSpellsByElement("water"),
  lightning: getSpellsByElement("lightning"),
  arcane: getSpellsByElement("arcane"),
  holy: getSpellsByElement("holy"),
  shadow: getSpellsByElement("shadow"),
  nature: getSpellsByElement("nature"),
  physical: getSpellsByElement("physical")
};

// === WEAPON ABILITY ANIMATION MAPPINGS ===
// Maps weapon abilities to their corresponding spell animations

export interface WeaponAbilityAnimation {
  abilityId: string;
  animationId: string;
  notes?: string;
}

export const WEAPON_ABILITY_ANIMATIONS: WeaponAbilityAnimation[] = [
  // Melee weapon abilities (slash effects)
  { abilityId: "sword_strike", animationId: "effect_arcane_slash", notes: "Basic sword attack" },
  { abilityId: "power_strike", animationId: "effect_red_slash", notes: "Heavy melee hit" },
  { abilityId: "whirlwind", animationId: "effect_tornado", notes: "Spinning AoE attack" },
  
  // Fire magic abilities
  { abilityId: "fireball", animationId: "fire_ball", notes: "Standard fire projectile" },
  { abilityId: "flame_strike", animationId: "effect_flamestrike", notes: "Ground eruption" },
  { abilityId: "inferno", animationId: "effect_sunspot", notes: "Large fire AoE" },
  { abilityId: "fire_impact", animationId: "effect_fire_hit", notes: "Fire spell impact" },
  { abilityId: "explosion", animationId: "effect_boom", notes: "Critical hit explosion" },
  
  // Ice/Water magic abilities
  { abilityId: "frostbolt", animationId: "effect_frostbolt", notes: "Ground ice spike" },
  { abilityId: "ice_wave", animationId: "effect_frozen", notes: "Traveling ice attack" },
  { abilityId: "water_vortex", animationId: "effect_water_tornado", notes: "Water AoE" },
  
  // Arcane magic abilities
  { abilityId: "arcane_bolt", animationId: "effect_arcane_bolt", notes: "Basic mage attack" },
  { abilityId: "lightning_strike", animationId: "effect_arcane_lightning", notes: "Lightning from above" },
  { abilityId: "arcane_buff", animationId: "effect_arcane_mist", notes: "Magic buff aura" },
  { abilityId: "magic_combo", animationId: "effect_magic_combo", notes: "Combo finisher" },
  
  // Healing abilities
  { abilityId: "heal", animationId: "effect_natures_heal", notes: "Direct heal" },
  { abilityId: "regeneration", animationId: "effect_healing_regen", notes: "Heal over time" },
  { abilityId: "divine_shield", animationId: "effect_healing_wave", notes: "Protective barrier" },
  { abilityId: "smite", animationId: "effect_holy_beam", notes: "Holy damage/resurrection" },
  
  // Berserker/Rage abilities
  { abilityId: "rage_strike", animationId: "effect_red_blast", notes: "Rage-powered attack" },
  
  // Ranged/Projectile melee abilities (dual-row sprites)
  { abilityId: "sword_wave", animationId: "effect_red_slash_projectile", notes: "Ranged sword slash, pair with red_blast_hit" },
  { abilityId: "hit_indicator", animationId: "effect_red_blast_hit", notes: "Normal hit (0.5x) or crit (1.0x)" },
  { abilityId: "bleed", animationId: "effect_red_crit_bleed", notes: "Bleed DoT visual on enemy" },
  { abilityId: "rend", animationId: "effect_red_crit_bleed", notes: "Special warrior attack aftermath" },
  
  // Tornado spells (dual-row travel/impact)
  { abilityId: "earth_tornado", animationId: "effect_earth_tornado_spell", notes: "Mage tornado, top row travel, bottom row impact" },
  { abilityId: "water_tornado", animationId: "effect_water_tornado_spell", notes: "Mage tornado, top row travel, bottom row impact" },
  
  // Holy/Healing abilities
  { abilityId: "holy_heal", animationId: "effect_holy_heal", notes: "Direct holy heal with sparkles" },
  { abilityId: "divine_light", animationId: "effect_holy_light", notes: "Pillar of holy light" },
  { abilityId: "healing_wave", animationId: "effect_healing_wave_swirl", notes: "Swirling golden heal" },
  
  // Poison abilities
  { abilityId: "poison_spit", animationId: "effect_poison_blast", notes: "Poison projectile impact" },
  { abilityId: "poison_cloud", animationId: "effect_poison_bubble", notes: "Bubbles rise from ground" },
  { abilityId: "envenom", animationId: "effect_poison_debuff", notes: "Poison DoT debuff overlay at 40% opacity" },
  
  // Fire abilities
  { abilityId: "sunspot", animationId: "effect_sunspot", notes: "Fire/holy sunspot explosion" },
  { abilityId: "hit_effect", animationId: "effect_hit_burst", notes: "Generic hit feedback, 0.5x normal, 1.0x crit" },
  
  // Melee trailing effects
  { abilityId: "slash_trail", animationId: "effect_slash_extended", notes: "Render BELOW main slash for trailing" },
  
  // Elite enemy overlay
  { abilityId: "elite_aura", animationId: "effect_extra_overlay", notes: "Looping overlay for elite enemies" },
  
  // Fireball magic attacks (normal magic auto-attacks by element)
  { abilityId: "magic_attack_fire", animationId: "fireball_red", notes: "Normal fire mage attack" },
  { abilityId: "magic_attack_ice", animationId: "fireball_blue", notes: "Normal ice mage attack" },
  { abilityId: "magic_attack_nature", animationId: "fireball_green", notes: "Normal nature mage attack" },
  { abilityId: "magic_attack_arcane", animationId: "fireball_purple", notes: "Normal arcane mage attack" },
  { abilityId: "magic_attack_holy", animationId: "fireball_white", notes: "Normal holy mage attack" },
  
  // Lightning attacks (pick random variant for variety)
  { abilityId: "lightning_bolt", animationId: "lightning_strike_1", notes: "Basic lightning spell" },
  { abilityId: "chain_lightning", animationId: "lightning_strike_2", notes: "Branching lightning" },
  { abilityId: "fork_lightning", animationId: "lightning_strike_3", notes: "Forked lightning" },
  { abilityId: "thunder_strike", animationId: "lightning_strike_4", notes: "Wide lightning AoE" },
  
  // Melee critical hit effects (anime flash style)
  { abilityId: "melee_crit", animationId: "red_blast_hit", notes: "Default melee critical hit flash" },
  { abilityId: "melee_crit_bleed", animationId: "red_crit_bleed", notes: "Bleed effect on melee crit" },
  { abilityId: "melee_hit", animationId: "red_slash", notes: "Standard melee hit slash" },
  { abilityId: "blade_wave", animationId: "red_slash_projectile", notes: "Ranged blade wave attack" },
  
  // Magic critical hit effects
  { abilityId: "magic_crit", animationId: "fire_red_blast", notes: "Default magic critical hit flash" },
  { abilityId: "magic_crit_fire", animationId: "fire_red_blast", notes: "Fire magic crit flash" },
  
  // Anime-style slash effects (for special melee abilities)
  { abilityId: "slash_diagonal", animationId: "anime_slash_1", notes: "Fast diagonal slash" },
  { abilityId: "slash_quick", animationId: "anime_slash_2", notes: "Short burst slash" },
  { abilityId: "slash_heavy", animationId: "anime_slash_3", notes: "Heavy circular slash" },
  { abilityId: "slash_horizontal", animationId: "anime_slash_4", notes: "Quick horizontal slash" },
  { abilityId: "slash_wave", animationId: "anime_slash_5", notes: "Blade wave slash" },
  
  // Special bow attacks (elemental arrows)
  { abilityId: "fire_arrow", animationId: "fire_arrow", notes: "Flaming arrow projectile" },
  { abilityId: "flame_shot", animationId: "fire_arrow", notes: "Bow fire shot ability" },
  { abilityId: "water_arrow", animationId: "water_arrow", notes: "Water arrow projectile" },
  { abilityId: "ice_shot", animationId: "water_arrow", notes: "Bow ice shot ability" },
  
  // Large fire AOE/meteor attacks
  { abilityId: "meteor", animationId: "fire_meteor", notes: "Meteor crash AOE" },
  { abilityId: "meteor_strike", animationId: "fire_meteor", notes: "Meteor strike ability" },
  { abilityId: "fire_storm", animationId: "fire_meteor", notes: "Fire storm AOE" },
  { abilityId: "inferno", animationId: "fire_meteor", notes: "Massive fire AOE" },
  
  // Spinning projectile attacks
  { abilityId: "fire_ball_large", animationId: "fire_ball_spin", notes: "Large spinning fireball" },
  { abilityId: "water_orb", animationId: "water_ball_spin", notes: "Water orb projectile" },
  
  // Magic slash abilities (melee + magic hybrid)
  { abilityId: "arcane_slash", animationId: "arcaneslash", notes: "Arcane-enhanced melee" },
  { abilityId: "magic_blade", animationId: "arcaneslash", notes: "Magic sword attack" },
  { abilityId: "fire_slash", animationId: "redslash_magic", notes: "Fire-enhanced melee" },
  { abilityId: "flame_blade", animationId: "redslash_magic", notes: "Flaming sword attack" },
  { abilityId: "wide_slash", animationId: "slashextended", notes: "Wide sweeping attack" },
  { abilityId: "cleave", animationId: "slashextended", notes: "Cleave ability" },
  
  // Buff/Aura abilities
  { abilityId: "frost_armor", animationId: "frost_aura", notes: "Ice armor buff" },
  { abilityId: "ice_shield", animationId: "frost_aura", notes: "Frost shield aura" },
  { abilityId: "cold_aura", animationId: "frost_aura", notes: "Chilling aura effect" },
  
  // Poison/DOT abilities
  { abilityId: "poison", animationId: "poison_cloud", notes: "Poison DOT effect" },
  { abilityId: "toxic_cloud", animationId: "poison_cloud", notes: "Toxic cloud AOE" },
  { abilityId: "venom", animationId: "poison_cloud", notes: "Venom debuff" },
  
  // Arrow projectiles (bow attacks)
  { abilityId: "basic_shot", animationId: "arrow_standard", notes: "Basic bow attack" },
  { abilityId: "arrow_shot", animationId: "arrow_standard", notes: "Standard arrow" },
  { abilityId: "quick_shot", animationId: "arrow_standard", notes: "Fast arrow shot" },
  { abilityId: "pierce_shot", animationId: "arrow_piercing", notes: "Armor-piercing arrow" },
  { abilityId: "penetrating_arrow", animationId: "arrow_piercing", notes: "Penetrating shot" },
  { abilityId: "power_shot", animationId: "arrow_heavy", notes: "Heavy power shot" },
  { abilityId: "stun_arrow", animationId: "arrow_heavy", notes: "Stunning arrow (sticks deep)" },
  { abilityId: "bleed_arrow", animationId: "arrow_heavy", notes: "Bleeding arrow (sticks deep)" },
  
  // Gun/Ranged weapon attacks (fast traveling projectiles)
  { abilityId: "gun_shot", animationId: "gun_shot", notes: "Small fast bullet" },
  { abilityId: "pistol_shot", animationId: "gun_shot", notes: "Pistol attack" },
  { abilityId: "rifle_shot", animationId: "magic_bullet", notes: "Rifle attack (medium size)" },
  { abilityId: "magic_bullet", animationId: "magic_bullet", notes: "Wand/staff magic attack" },
  { abilityId: "cannon_shot", animationId: "cannon_shot", notes: "Ship/siege cannon" },
  { abilityId: "cannon_fire", animationId: "cannon_shot", notes: "Cannon barrage" },
  { abilityId: "siege_shot", animationId: "cannon_shot", notes: "Siege weapon attack" },
  
  // Holy multi-pattern attacks
  { abilityId: "holy_rain", animationId: "holy_rain", notes: "Multi-beam area heal/damage" },
  { abilityId: "divine_storm", animationId: "holy_rain", notes: "Holy AOE storm" },
  { abilityId: "blessing_rain", animationId: "holy_rain", notes: "Group healing rain" },
  { abilityId: "judgment", animationId: "judgment", notes: "Line judgment attack" },
  { abilityId: "divine_judgment", animationId: "judgment", notes: "Holy line attack" },
  { abilityId: "holy_beam", animationId: "judgment", notes: "Sequential beam attack" },
  { abilityId: "smite", animationId: "healing_smite", notes: "Single holy smite" },
  { abilityId: "healing_smite", animationId: "healing_smite", notes: "Heal or smite single target" },
  { abilityId: "heal_item", animationId: "healing_smite", notes: "Mage using healing item" },
  
  // Fire spell effects (moving flames, staff attacks, particles)
  { abilityId: "fire_spell_moving", animationId: "fire_spell_moving", notes: "Moving flame projectile" },
  { abilityId: "flame_wave", animationId: "fire_spell_moving", notes: "Wave of fire" },
  { abilityId: "fire_staff_attack", animationId: "fire_staff_attack", notes: "Fire staff basic attack" },
  { abilityId: "staff_fire", animationId: "fire_staff_attack", notes: "Staff fire spell" },
  { abilityId: "fire_particle", animationId: "fire_particle", notes: "Fire hit particle (spawn 2-5)" },
  { abilityId: "fire_spray", animationId: "fire_spray", notes: "Fire spray after impact (spawn 3-6)" },
  { abilityId: "fire_hit_effect", animationId: "fire_spray", notes: "Fire hit aftermath particles" },
  { abilityId: "fire_sword_hit", animationId: "fire_spray", notes: "Fire sword impact particles" },
  { abilityId: "fire_gun_hit", animationId: "fire_particle", notes: "Fire gun impact particles" },
  { abilityId: "bomb_hit", animationId: "fire_spray", notes: "Bomb explosion particles" },
  { abilityId: "fire_ember", animationId: "fire_ember", notes: "Burning DOT indicator" },
  { abilityId: "burning", animationId: "fire_ember", notes: "Burn status effect" },
  
  // Mana shield / barrier abilities
  { abilityId: "mana_shield", animationId: "mana_shield", notes: "Water bubble mana shield" },
  { abilityId: "mage_shield", animationId: "mana_shield", notes: "Mage protective bubble" },
  { abilityId: "water_shield", animationId: "mana_shield", notes: "Water element shield" },
  { abilityId: "arcane_barrier", animationId: "arcane_barrier", notes: "Arcane protection bubble" },
  { abilityId: "magic_barrier", animationId: "arcane_barrier", notes: "Magic shield barrier" },
  { abilityId: "ice_barrier", animationId: "ice_barrier", notes: "Ice protection bubble" },
  { abilityId: "frost_shield", animationId: "ice_barrier", notes: "Frost barrier shield" },
  { abilityId: "holy_shield", animationId: "holy_shield", notes: "Divine protection bubble" },
  { abilityId: "divine_protection", animationId: "holy_shield", notes: "Holy barrier spell" },
];

export function getAbilityAnimation(abilityId: string): SpellAnimation | undefined {
  const mapping = WEAPON_ABILITY_ANIMATIONS.find(m => m.abilityId === abilityId);
  return mapping ? SPELL_ANIMATIONS[mapping.animationId] : undefined;
}

export function getOrganizedEffects(): SpellAnimation[] {
  return Object.values(SPELL_ANIMATIONS).filter(spell => spell.id.startsWith("effect_"));
}

export function getDualRowEffects(): SpellAnimation[] {
  return Object.values(SPELL_ANIMATIONS).filter(spell => spell.sheetRows === 2);
}

export function getHitIndicators(): SpellAnimation[] {
  return Object.values(SPELL_ANIMATIONS).filter(spell => spell.hitScale !== undefined);
}

export function getFramePath(spell: SpellAnimation, frameIndex: number): string {
  if (spell.isSheet) {
    return spell.basePath;
  }
  
  if (!spell.framePattern) {
    const paddedIndex = String(frameIndex + 1).padStart(2, '0');
    return `${spell.basePath}/frame_${paddedIndex}.png`;
  }
  
  const paddedIndex = String(frameIndex + 1).padStart(2, '0');
  return `${spell.basePath}/${spell.framePattern.replace('{NN}', paddedIndex)}`;
}

export function getAllFramePaths(spell: SpellAnimation): string[] {
  if (spell.isSheet) {
    return [spell.basePath];
  }
  
  return Array.from({ length: spell.frameCount }, (_, i) => getFramePath(spell, i));
}

export function preloadSpellImages(spellIds: string[]): Promise<HTMLImageElement[]> {
  const allPaths: string[] = [];
  
  for (const id of spellIds) {
    const spell = SPELL_ANIMATIONS[id];
    if (spell) {
      allPaths.push(...getAllFramePaths(spell));
    }
  }
  
  return Promise.all(
    allPaths.map(path => {
      return new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = path;
      });
    })
  );
}
