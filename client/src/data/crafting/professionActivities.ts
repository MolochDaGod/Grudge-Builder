export type ActivityType = 'harvest' | 'craft' | 'mission' | 'supply' | 'event' | 'combat' | 'discovery';

export interface ProfessionActivity {
  id: string;
  name: string;
  description: string;
  activityType: ActivityType;
  baseXp: number;
  tierMultiplier?: boolean;
  repeatable: boolean;
  requirements?: string;
}

export type ProfessionKey = 'miner' | 'forester' | 'mystic' | 'chef' | 'engineer';

const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  harvest: 'Harvesting',
  craft: 'Crafting',
  mission: 'Missions',
  supply: 'Faction Supply',
  event: 'Events',
  combat: 'Combat',
  discovery: 'Discovery',
};

const ACTIVITY_TYPE_COLORS: Record<ActivityType, string> = {
  harvest: 'text-green-400',
  craft: 'text-amber-400',
  mission: 'text-blue-400',
  supply: 'text-purple-400',
  event: 'text-pink-400',
  combat: 'text-red-400',
  discovery: 'text-cyan-400',
};

export { ACTIVITY_TYPE_LABELS, ACTIVITY_TYPE_COLORS };

export const professionActivities: Record<ProfessionKey, ProfessionActivity[]> = {
  miner: [
    { id: 'mine_ore', name: 'Mine Ore Node', description: 'Extract ore from mineral veins in the world', activityType: 'harvest', baseXp: 15, tierMultiplier: true, repeatable: true },
    { id: 'mine_gem', name: 'Extract Gems', description: 'Find and extract gem deposits from ore nodes', activityType: 'harvest', baseXp: 25, tierMultiplier: true, repeatable: true },
    { id: 'mine_rare', name: 'Rare Vein Discovery', description: 'Discover hidden rare mineral veins', activityType: 'discovery', baseXp: 100, tierMultiplier: true, repeatable: true },
    { id: 'smelt_ingot', name: 'Smelt Ingots', description: 'Process raw ore into refined ingots', activityType: 'craft', baseXp: 20, tierMultiplier: true, repeatable: true },
    { id: 'craft_sword', name: 'Forge Swords', description: 'Craft any tier of sword weapon', activityType: 'craft', baseXp: 50, tierMultiplier: true, repeatable: true },
    { id: 'craft_axe', name: 'Forge Axes', description: 'Craft any tier of axe weapon', activityType: 'craft', baseXp: 50, tierMultiplier: true, repeatable: true },
    { id: 'craft_dagger', name: 'Forge Daggers', description: 'Craft any tier of dagger weapon', activityType: 'craft', baseXp: 45, tierMultiplier: true, repeatable: true },
    { id: 'craft_hammer', name: 'Forge Hammers', description: 'Craft any tier of hammer weapon', activityType: 'craft', baseXp: 55, tierMultiplier: true, repeatable: true },
    { id: 'craft_greatsword', name: 'Forge Greatswords', description: 'Craft any tier of two-handed greatsword', activityType: 'craft', baseXp: 75, tierMultiplier: true, repeatable: true },
    { id: 'craft_greataxe', name: 'Forge Greataxes', description: 'Craft any tier of two-handed greataxe', activityType: 'craft', baseXp: 75, tierMultiplier: true, repeatable: true },
    { id: 'craft_plate', name: 'Forge Plate Armor', description: 'Craft any tier of metal plate armor piece', activityType: 'craft', baseXp: 60, tierMultiplier: true, repeatable: true },
    { id: 'mission_supply_ore', name: 'Ore Supply Mission', description: 'Deliver ore to faction outpost', activityType: 'mission', baseXp: 150, repeatable: true },
    { id: 'mission_craft_weapons', name: 'Weapon Crafting Order', description: 'Complete a batch weapon crafting request', activityType: 'mission', baseXp: 300, repeatable: true },
    { id: 'mission_forge_legendary', name: 'Legendary Forge Quest', description: 'Craft a legendary tier weapon', activityType: 'mission', baseXp: 1000, repeatable: false, requirements: 'Level 100' },
    { id: 'supply_faction_ingots', name: 'Supply Ingots to Town', description: 'Contribute refined ingots to faction crafting stockpile', activityType: 'supply', baseXp: 100, tierMultiplier: true, repeatable: true },
    { id: 'supply_faction_weapons', name: 'Supply Weapons to Town', description: 'Donate crafted weapons to faction armory', activityType: 'supply', baseXp: 200, tierMultiplier: true, repeatable: true },
    { id: 'event_mining_rush', name: 'Mining Rush Event', description: 'Participate in timed mining competition', activityType: 'event', baseXp: 500, repeatable: true },
    { id: 'combat_tunnel_defense', name: 'Tunnel Defense', description: 'Defend mining tunnels from creature invasions', activityType: 'combat', baseXp: 250, repeatable: true },
  ],

  forester: [
    { id: 'harvest_wood', name: 'Fell Trees', description: 'Harvest wood from trees in forests', activityType: 'harvest', baseXp: 15, tierMultiplier: true, repeatable: true },
    { id: 'harvest_leather', name: 'Skin Creatures', description: 'Obtain leather from hunted creatures', activityType: 'harvest', baseXp: 20, tierMultiplier: true, repeatable: true },
    { id: 'harvest_rare_wood', name: 'Ancient Tree Discovery', description: 'Find and harvest ancient tree specimens', activityType: 'discovery', baseXp: 100, tierMultiplier: true, repeatable: true },
    { id: 'process_planks', name: 'Mill Planks', description: 'Process raw logs into refined planks', activityType: 'craft', baseXp: 20, tierMultiplier: true, repeatable: true },
    { id: 'tan_leather', name: 'Tan Leather', description: 'Process raw hides into usable leather', activityType: 'craft', baseXp: 20, tierMultiplier: true, repeatable: true },
    { id: 'craft_bow', name: 'Craft Bows', description: 'Create any tier of bow weapon', activityType: 'craft', baseXp: 50, tierMultiplier: true, repeatable: true },
    { id: 'craft_leather_armor', name: 'Craft Leather Armor', description: 'Create any tier of leather armor piece', activityType: 'craft', baseXp: 55, tierMultiplier: true, repeatable: true },
    { id: 'craft_dagger_forester', name: 'Craft Hunting Daggers', description: 'Craft daggers with leather grips', activityType: 'craft', baseXp: 45, tierMultiplier: true, repeatable: true },
    { id: 'craft_ship_parts', name: 'Craft Ship Components', description: 'Build naval vessel components', activityType: 'craft', baseXp: 100, tierMultiplier: true, repeatable: true },
    { id: 'mission_supply_wood', name: 'Wood Supply Mission', description: 'Deliver timber to faction shipyard', activityType: 'mission', baseXp: 150, repeatable: true },
    { id: 'mission_craft_armor', name: 'Armor Crafting Order', description: 'Complete a batch leather armor request', activityType: 'mission', baseXp: 300, repeatable: true },
    { id: 'mission_hunt_legendary', name: 'Legendary Hunt Quest', description: 'Hunt a legendary beast for divine leather', activityType: 'mission', baseXp: 1000, repeatable: false, requirements: 'Level 100' },
    { id: 'supply_faction_planks', name: 'Supply Planks to Town', description: 'Contribute refined planks to faction construction', activityType: 'supply', baseXp: 100, tierMultiplier: true, repeatable: true },
    { id: 'supply_faction_leather', name: 'Supply Leather to Town', description: 'Donate processed leather to faction stockpile', activityType: 'supply', baseXp: 100, tierMultiplier: true, repeatable: true },
    { id: 'event_forestry_contest', name: 'Logging Competition', description: 'Participate in timed tree-felling competition', activityType: 'event', baseXp: 500, repeatable: true },
    { id: 'combat_forest_patrol', name: 'Forest Patrol', description: 'Defend forest territories from poachers', activityType: 'combat', baseXp: 250, repeatable: true },
  ],

  mystic: [
    { id: 'harvest_essence', name: 'Gather Essence', description: 'Extract magical essence from ley nodes', activityType: 'harvest', baseXp: 20, tierMultiplier: true, repeatable: true },
    { id: 'harvest_cloth', name: 'Harvest Magic Fibers', description: 'Collect enchanted cloth fibers from flora', activityType: 'harvest', baseXp: 15, tierMultiplier: true, repeatable: true },
    { id: 'harvest_arcane_node', name: 'Arcane Node Discovery', description: 'Discover hidden arcane power nodes', activityType: 'discovery', baseXp: 100, tierMultiplier: true, repeatable: true },
    { id: 'weave_fabric', name: 'Weave Magic Fabric', description: 'Process raw fibers into enchanted cloth', activityType: 'craft', baseXp: 20, tierMultiplier: true, repeatable: true },
    { id: 'craft_staff', name: 'Craft Staves', description: 'Create any tier of magical staff', activityType: 'craft', baseXp: 60, tierMultiplier: true, repeatable: true },
    { id: 'craft_cloth_armor', name: 'Craft Cloth Armor', description: 'Create any tier of cloth armor piece', activityType: 'craft', baseXp: 50, tierMultiplier: true, repeatable: true },
    { id: 'craft_enchantment', name: 'Apply Enchantment', description: 'Enchant an item with magical properties', activityType: 'craft', baseXp: 75, tierMultiplier: true, repeatable: true },
    { id: 'craft_scroll', name: 'Scribe Spell Scroll', description: 'Create a spell scroll for later use', activityType: 'craft', baseXp: 40, tierMultiplier: true, repeatable: true },
    { id: 'craft_gem_jewelry', name: 'Craft Soul Gems', description: 'Cut and enchant gems into jewelry', activityType: 'craft', baseXp: 65, tierMultiplier: true, repeatable: true },
    { id: 'craft_grimoire', name: 'Bind Grimoire', description: 'Create a spellbook grimoire', activityType: 'craft', baseXp: 150, tierMultiplier: true, repeatable: true },
    { id: 'mission_supply_essence', name: 'Essence Supply Mission', description: 'Deliver essence to faction mage tower', activityType: 'mission', baseXp: 150, repeatable: true },
    { id: 'mission_enchant_batch', name: 'Mass Enchantment Order', description: 'Enchant a batch of faction equipment', activityType: 'mission', baseXp: 350, repeatable: true },
    { id: 'mission_ritual_legendary', name: 'Legendary Ritual Quest', description: 'Complete a legendary enchanting ritual', activityType: 'mission', baseXp: 1000, repeatable: false, requirements: 'Level 100' },
    { id: 'supply_faction_essence', name: 'Supply Essence to Town', description: 'Contribute essence to faction magic reserves', activityType: 'supply', baseXp: 100, tierMultiplier: true, repeatable: true },
    { id: 'supply_faction_scrolls', name: 'Supply Scrolls to Town', description: 'Donate spell scrolls to faction library', activityType: 'supply', baseXp: 150, tierMultiplier: true, repeatable: true },
    { id: 'event_arcane_surge', name: 'Arcane Surge Event', description: 'Participate in magical gathering surge', activityType: 'event', baseXp: 500, repeatable: true },
    { id: 'combat_ritual_defense', name: 'Ritual Defense', description: 'Protect ritual sites from dark forces', activityType: 'combat', baseXp: 250, repeatable: true },
  ],

  chef: [
    { id: 'harvest_ingredients', name: 'Gather Ingredients', description: 'Collect cooking ingredients from the wild', activityType: 'harvest', baseXp: 12, tierMultiplier: true, repeatable: true },
    { id: 'harvest_herbs', name: 'Gather Herbs', description: 'Collect alchemical herbs for potions', activityType: 'harvest', baseXp: 15, tierMultiplier: true, repeatable: true },
    { id: 'harvest_rare_ingredient', name: 'Rare Ingredient Discovery', description: 'Find rare cooking ingredients', activityType: 'discovery', baseXp: 80, tierMultiplier: true, repeatable: true },
    { id: 'fish', name: 'Fishing', description: 'Catch fish from lakes, rivers, and ocean', activityType: 'harvest', baseXp: 18, tierMultiplier: true, repeatable: true },
    { id: 'cook_food', name: 'Cook Food', description: 'Prepare any tier of cooked food', activityType: 'craft', baseXp: 25, tierMultiplier: true, repeatable: true },
    { id: 'cook_buff_food', name: 'Cook Buff Food', description: 'Prepare stat-boosting meals', activityType: 'craft', baseXp: 50, tierMultiplier: true, repeatable: true },
    { id: 'brew_potion', name: 'Brew Potions', description: 'Create any tier of potion', activityType: 'craft', baseXp: 45, tierMultiplier: true, repeatable: true },
    { id: 'preserve_food', name: 'Preserve Food', description: 'Create preserved rations for travel', activityType: 'craft', baseXp: 30, tierMultiplier: true, repeatable: true },
    { id: 'craft_antidote', name: 'Brew Antidotes', description: 'Create poison cures and antidotes', activityType: 'craft', baseXp: 55, tierMultiplier: true, repeatable: true },
    { id: 'craft_elixir', name: 'Brew Elixirs', description: 'Create powerful long-duration elixirs', activityType: 'craft', baseXp: 80, tierMultiplier: true, repeatable: true },
    { id: 'mission_supply_food', name: 'Food Supply Mission', description: 'Deliver meals to faction barracks', activityType: 'mission', baseXp: 150, repeatable: true },
    { id: 'mission_potion_batch', name: 'Potion Batch Order', description: 'Complete a large potion crafting order', activityType: 'mission', baseXp: 300, repeatable: true },
    { id: 'mission_feast_legendary', name: 'Legendary Feast Quest', description: 'Prepare a legendary banquet', activityType: 'mission', baseXp: 1000, repeatable: false, requirements: 'Level 100' },
    { id: 'supply_faction_food', name: 'Supply Food to Town', description: 'Contribute cooked meals to faction mess hall', activityType: 'supply', baseXp: 80, tierMultiplier: true, repeatable: true },
    { id: 'supply_faction_potions', name: 'Supply Potions to Town', description: 'Donate potions to faction infirmary', activityType: 'supply', baseXp: 120, tierMultiplier: true, repeatable: true },
    { id: 'event_cooking_contest', name: 'Cooking Competition', description: 'Participate in timed cooking contest', activityType: 'event', baseXp: 500, repeatable: true },
    { id: 'combat_field_medic', name: 'Field Medic Support', description: 'Provide healing support during faction battles', activityType: 'combat', baseXp: 200, repeatable: true },
  ],

  engineer: [
    { id: 'harvest_components', name: 'Salvage Components', description: 'Salvage mechanical parts from wreckage', activityType: 'harvest', baseXp: 20, tierMultiplier: true, repeatable: true },
    { id: 'harvest_gunpowder', name: 'Gather Explosive Materials', description: 'Collect ingredients for gunpowder', activityType: 'harvest', baseXp: 18, tierMultiplier: true, repeatable: true },
    { id: 'discovery_blueprint', name: 'Blueprint Discovery', description: 'Discover new engineering schematics', activityType: 'discovery', baseXp: 150, tierMultiplier: false, repeatable: true },
    { id: 'craft_crossbow', name: 'Craft Crossbows', description: 'Create any tier of crossbow weapon', activityType: 'craft', baseXp: 55, tierMultiplier: true, repeatable: true },
    { id: 'craft_gun', name: 'Craft Firearms', description: 'Create any tier of gun weapon', activityType: 'craft', baseXp: 65, tierMultiplier: true, repeatable: true },
    { id: 'craft_grenade', name: 'Craft Grenades', description: 'Create explosive grenades', activityType: 'craft', baseXp: 40, tierMultiplier: true, repeatable: true },
    { id: 'craft_trap', name: 'Craft Traps', description: 'Create mechanical traps', activityType: 'craft', baseXp: 35, tierMultiplier: true, repeatable: true },
    { id: 'craft_scope', name: 'Craft Scopes', description: 'Create precision scopes for ranged weapons', activityType: 'craft', baseXp: 50, tierMultiplier: true, repeatable: true },
    { id: 'craft_siege', name: 'Build Siege Equipment', description: 'Construct siege warfare equipment', activityType: 'craft', baseXp: 150, tierMultiplier: true, repeatable: true },
    { id: 'craft_automaton', name: 'Build Automata', description: 'Construct mechanical automata', activityType: 'craft', baseXp: 200, tierMultiplier: true, repeatable: true },
    { id: 'mission_supply_ammo', name: 'Ammunition Supply Mission', description: 'Deliver ammunition to faction armory', activityType: 'mission', baseXp: 150, repeatable: true },
    { id: 'mission_siege_order', name: 'Siege Equipment Order', description: 'Complete a siege equipment request', activityType: 'mission', baseXp: 400, repeatable: true },
    { id: 'mission_automaton_legendary', name: 'Legendary Automaton Quest', description: 'Build a legendary war automaton', activityType: 'mission', baseXp: 1000, repeatable: false, requirements: 'Level 100' },
    { id: 'supply_faction_weapons', name: 'Supply Ranged Weapons to Town', description: 'Contribute ranged weapons to faction armory', activityType: 'supply', baseXp: 150, tierMultiplier: true, repeatable: true },
    { id: 'supply_faction_siege', name: 'Supply Siege Equipment to Town', description: 'Donate siege equipment to faction war effort', activityType: 'supply', baseXp: 300, tierMultiplier: true, repeatable: true },
    { id: 'event_engineering_race', name: 'Engineering Race', description: 'Participate in timed construction competition', activityType: 'event', baseXp: 500, repeatable: true },
    { id: 'combat_siege_warfare', name: 'Siege Warfare Support', description: 'Operate siege equipment during faction battles', activityType: 'combat', baseXp: 300, repeatable: true },
  ],
};

export function getActivitiesByType(profession: ProfessionKey, type: ActivityType): ProfessionActivity[] {
  return professionActivities[profession].filter(a => a.activityType === type);
}

export function getAllActivityTypes(profession: ProfessionKey): ActivityType[] {
  const types = new Set(professionActivities[profession].map(a => a.activityType));
  return Array.from(types);
}

export function calculateXpWithTier(activity: ProfessionActivity, tier: number): number {
  if (activity.tierMultiplier) {
    return activity.baseXp * tier;
  }
  return activity.baseXp;
}
