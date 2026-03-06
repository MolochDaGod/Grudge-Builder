export const TIERS = [1, 2, 3, 4, 5, 6, 7, 8] as const;
export type Tier = typeof TIERS[number];

export const TIER_LABELS = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8'] as const;

export const TIER_MATERIALS = {
  ore: ['Copper', 'Iron', 'Steel', 'Mithril', 'Adamantine', 'Orichalcum', 'Starmetal', 'Divine'],
  ingot: ['Copper Ingot', 'Iron Ingot', 'Steel Ingot', 'Mithril Ingot', 'Adamantine Ingot', 'Orichalcum Ingot', 'Starmetal Ingot', 'Divine Ingot'],
  wood: ['Pine', 'Oak', 'Maple', 'Ash', 'Ironwood', 'Ebony', 'Wyrmwood', 'Worldtree'],
  plank: ['Pine Plank', 'Oak Plank', 'Maple Plank', 'Ash Plank', 'Ironwood Plank', 'Ebony Plank', 'Wyrmwood Plank', 'Worldtree Plank'],
  cloth: ['Linen', 'Wool', 'Cotton', 'Silk', 'Moonweave', 'Starweave', 'Voidweave', 'Divine Thread'],
  fabric: ['Linen Cloth', 'Wool Cloth', 'Cotton Cloth', 'Silk Cloth', 'Moonweave Cloth', 'Starweave Cloth', 'Voidweave Cloth', 'Divine Cloth'],
  leather: ['Rawhide', 'Thick Hide', 'Rugged Leather', 'Hardened Leather', 'Wyrm Leather', 'Infernal Leather', 'Titan Leather', 'Divine Leather'],
  essence: ['Minor Essence', 'Lesser Essence', 'Greater Essence', 'Superior Essence', 'Refined Essence', 'Perfect Essence', 'Ancient Essence', 'Divine Essence'],
  gem: ['Rough Gem', 'Flawed Gem', 'Standard Gem', 'Fine Gem', 'Pristine Gem', 'Flawless Gem', 'Radiant Gem', 'Divine Gem'],
} as const;

export const TIER_COSTS = {
  gold: [100, 200, 400, 800, 1600, 3200, 6400, 12800],
  craftingTime: ['3s', '4s', '5s', '7s', '10s', '14s', '18s', '25s'],
  successChance: [100, 98, 95, 90, 85, 80, 75, 70],
  baseMaterialCount: [2, 3, 4, 5, 6, 8, 10, 12],
};

export const WEAPON_SETS = {
  swords: [
    { id: 'bloodfeud-blade', name: 'Bloodfeud Blade', lore: 'Forged in endless clan blood feuds', primaryStat: 'damage', secondaryStat: 'lifesteal' },
    { id: 'wraithfang', name: 'Wraithfang', lore: 'Whispers forgotten grudges in the dark', primaryStat: 'crit', secondaryStat: 'mana' },
    { id: 'oathbreaker', name: 'Oathbreaker', lore: 'Breaks ancient oaths of peace', primaryStat: 'defense', secondaryStat: 'block' },
    { id: 'kinrend', name: 'Kinrend', lore: 'Rends bonds of blood and kinship', primaryStat: 'hp', secondaryStat: 'lifesteal' },
    { id: 'dusksinger', name: 'Dusksinger', lore: 'Sings of twilight and ending grudges', primaryStat: 'speed', secondaryStat: 'crit' },
    { id: 'emberclad', name: 'Emberclad', lore: 'Clad in flames of burning hatred', primaryStat: 'damage', secondaryStat: 'burn' },
  ],
  axes1h: [
    { id: 'gorehowl', name: 'Gorehowl', lore: 'Howls with the gore of fallen foes', primaryStat: 'damage', secondaryStat: 'bleed' },
    { id: 'skullsplitter', name: 'Skullsplitter', lore: 'Splits skulls of grudge bearers', primaryStat: 'crit', secondaryStat: 'armorPen' },
    { id: 'veinreaver', name: 'Veinreaver', lore: 'Reaves veins for blood tribute', primaryStat: 'lifesteal', secondaryStat: 'hp' },
    { id: 'ironmaw', name: 'Ironmaw', lore: 'Maw of iron that crushes oaths', primaryStat: 'defense', secondaryStat: 'block' },
    { id: 'dreadcleaver', name: 'Dreadcleaver', lore: 'Cleaves dread into enemies', primaryStat: 'damage', secondaryStat: 'fear' },
    { id: 'bonehew', name: 'Bonehew', lore: 'Hews bone from grudge skeletons', primaryStat: 'armorPen', secondaryStat: 'crit' },
  ],
  daggers: [
    { id: 'bloodshiv', name: 'Bloodshiv', lore: 'Shiv dripping enemy blood', primaryStat: 'bleed', secondaryStat: 'speed' },
    { id: 'wraithclaw', name: 'Wraithclaw', lore: 'Claw of wraith vengeance', primaryStat: 'mana', secondaryStat: 'crit' },
    { id: 'emberfang', name: 'Emberfang', lore: 'Fang burning with ember hate', primaryStat: 'burn', secondaryStat: 'damage' },
    { id: 'ironspike', name: 'Ironspike', lore: 'Spike of unyielding iron', primaryStat: 'armorPen', secondaryStat: 'defense' },
  ],
  daggersShared: [
    { id: 'nightfang', name: 'Nightfang', lore: 'Fang of endless night grudges', primaryStat: 'crit', secondaryStat: 'poison', sharedWith: ['Miner', 'Forester'] },
    { id: 'duskblade', name: 'Duskblade', lore: 'Blade of falling dusk', primaryStat: 'speed', secondaryStat: 'crit', sharedWith: ['Miner', 'Forester'] },
  ],
  greatswords: [
    { id: 'doomspire', name: 'Doomspire', lore: 'Spire of impending doom', primaryStat: 'damage', secondaryStat: 'fear' },
    { id: 'bloodspire', name: 'Bloodspire', lore: 'Spire dripping blood', primaryStat: 'lifesteal', secondaryStat: 'bleed' },
    { id: 'wraithblade', name: 'Wraithblade', lore: 'Blade of wraith essence', primaryStat: 'mana', secondaryStat: 'crit' },
    { id: 'emberbrand', name: 'Emberbrand', lore: 'Brand of burning embers', primaryStat: 'burn', secondaryStat: 'damage' },
    { id: 'ironedge', name: 'Ironedge', lore: 'Edge of unbreakable iron', primaryStat: 'defense', secondaryStat: 'block' },
    { id: 'duskbringer', name: 'Duskbringer', lore: 'Brings dusk to enemies', primaryStat: 'speed', secondaryStat: 'crit' },
  ],
  greataxes: [
    { id: 'skullsunder', name: 'Skullsunder', lore: 'Sunders skulls in massive swings', primaryStat: 'damage', secondaryStat: 'stun' },
    { id: 'bloodreaver', name: 'Bloodreaver', lore: 'Reaves blood in wide arcs', primaryStat: 'lifesteal', secondaryStat: 'bleed' },
    { id: 'wraithhew', name: 'Wraithhew', lore: 'Hews wraiths from shadows', primaryStat: 'mana', secondaryStat: 'fear' },
    { id: 'embermaul', name: 'Embermaul', lore: 'Maul of burning embers', primaryStat: 'burn', secondaryStat: 'damage' },
    { id: 'ironrend', name: 'Ironrend', lore: 'Rends iron armor', primaryStat: 'armorPen', secondaryStat: 'damage' },
    { id: 'dusksplitter', name: 'Dusksplitter', lore: 'Splits at dusk with shadow', primaryStat: 'speed', secondaryStat: 'crit' },
  ],
  hammers1h: [
    { id: 'grudgehammer', name: 'Grudgehammer', lore: 'Pounds grudges into enemies', primaryStat: 'stun', secondaryStat: 'damage' },
    { id: 'oathcrusher', name: 'Oathcrusher', lore: 'Crushes oaths of the sworn', primaryStat: 'armorPen', secondaryStat: 'stun' },
    { id: 'bloodmaul', name: 'Bloodmaul', lore: 'Mauls blood from veins', primaryStat: 'lifesteal', secondaryStat: 'damage' },
    { id: 'ironbreak', name: 'Ironbreak', lore: 'Breaks iron and bone alike', primaryStat: 'damage', secondaryStat: 'armorPen' },
    { id: 'wrathpound', name: 'Wrathpound', lore: 'Pounds with ancient wrath', primaryStat: 'stun', secondaryStat: 'hp' },
    { id: 'emberpound', name: 'Emberpound', lore: 'Burns with each strike', primaryStat: 'burn', secondaryStat: 'stun' },
  ],
  hammers2h: [
    { id: 'titanmaul', name: 'Titanmaul', lore: 'Maul of titanic grudges', primaryStat: 'stun', secondaryStat: 'damage' },
    { id: 'doomhammer', name: 'Doomhammer', lore: 'Hammer of impending doom', primaryStat: 'damage', secondaryStat: 'fear' },
    { id: 'wrathquake', name: 'Wrathquake', lore: 'Quakes with ancient wrath', primaryStat: 'stun', secondaryStat: 'armorPen' },
    { id: 'bloodpound', name: 'Bloodpound', lore: 'Pounds blood from enemies', primaryStat: 'lifesteal', secondaryStat: 'stun' },
    { id: 'ironcrush', name: 'Ironcrush', lore: 'Crushes with iron weight', primaryStat: 'armorPen', secondaryStat: 'damage' },
    { id: 'embershatter', name: 'Embershatter', lore: 'Shatters with burning force', primaryStat: 'burn', secondaryStat: 'stun' },
  ],
  spears: [
    { id: 'iron-pike', name: 'Iron Pike', lore: 'Basic iron-tipped spear for thrusting', primaryStat: 'damage', secondaryStat: 'range' },
    { id: 'steel-lance', name: 'Steel Lance', lore: 'Cavalry lance for mounted charges', primaryStat: 'damage', secondaryStat: 'charge' },
    { id: 'mithril-javelin', name: 'Mithril Javelin', lore: 'Throwable spear of mithril', primaryStat: 'range', secondaryStat: 'crit' },
    { id: 'bloodspear', name: 'Bloodspear', lore: 'Thirsting spear that drinks blood', primaryStat: 'lifesteal', secondaryStat: 'bleed' },
    { id: 'voidpiercer', name: 'Voidpiercer', lore: 'Pierces through dimensions', primaryStat: 'armorPen', secondaryStat: 'mana' },
    { id: 'divine-trident', name: 'Divine Trident', lore: 'Holy trident of divine wrath', primaryStat: 'damage', secondaryStat: 'heal' },
  ],
  maces: [
    { id: 'iron-cudgel', name: 'Iron Cudgel', lore: 'Simple iron bludgeon', primaryStat: 'stun', secondaryStat: 'damage' },
    { id: 'steel-flail', name: 'Steel Flail', lore: 'Chained flail for sweeping attacks', primaryStat: 'damage', secondaryStat: 'armorPen' },
    { id: 'spiked-morningstar', name: 'Spiked Morningstar', lore: 'Spiked ball of crushing might', primaryStat: 'armorPen', secondaryStat: 'bleed' },
    { id: 'bloodbludgeon', name: 'Bloodbludgeon', lore: 'Blood-soaked mace of carnage', primaryStat: 'lifesteal', secondaryStat: 'stun' },
    { id: 'obsidian-crusher', name: 'Obsidian Crusher', lore: 'Volcanic mace that shatters shields', primaryStat: 'armorPen', secondaryStat: 'burn' },
    { id: 'divine-scepter', name: 'Divine Scepter', lore: 'Holy scepter of divine judgment', primaryStat: 'damage', secondaryStat: 'heal' },
  ],
  bows: [
    { id: 'wraithbone', name: 'Wraithbone Bow', lore: 'Carved from bones of wraiths', primaryStat: 'mana', secondaryStat: 'crit' },
    { id: 'bloodstring', name: 'Bloodstring Bow', lore: 'Strung with strings of blood', primaryStat: 'bleed', secondaryStat: 'damage' },
    { id: 'shadowflight', name: 'Shadowflight Bow', lore: 'Flies shadows as arrows', primaryStat: 'crit', secondaryStat: 'speed' },
    { id: 'emberthorn', name: 'Emberthorn Bow', lore: 'Thorns of ember fire', primaryStat: 'burn', secondaryStat: 'damage' },
    { id: 'ironvine', name: 'Ironvine Bow', lore: 'Vines of iron entangle', primaryStat: 'root', secondaryStat: 'defense' },
    { id: 'duskreaver', name: 'Duskreaver Bow', lore: 'Reaves at dusk fall', primaryStat: 'speed', secondaryStat: 'crit' },
  ],
  natureStaves: [
    { id: 'verdant-wrath', name: 'Verdant Wrath', lore: 'Wrath of verdant growth', element: 'nature', primaryStat: 'heal', secondaryStat: 'root' },
    { id: 'thorn-grudge', name: 'Thorn Grudge Staff', lore: 'Thorns of ancient grudges', element: 'nature', primaryStat: 'damage', secondaryStat: 'poison' },
    { id: 'wild-oathbreaker', name: 'Wild Oathbreaker', lore: 'Breaks oaths of the wild', element: 'nature', primaryStat: 'root', secondaryStat: 'heal' },
    { id: 'grove-guardian', name: 'Grove Guardian', lore: 'Guardian of sacred groves', element: 'nature', primaryStat: 'heal', secondaryStat: 'defense' },
    { id: 'blossom-fury', name: 'Blossom Fury', lore: 'Fury of wild blossoms', element: 'nature', primaryStat: 'damage', secondaryStat: 'heal' },
    { id: 'root-warden', name: 'Root Warden', lore: 'Warden of deep roots', element: 'nature', primaryStat: 'root', secondaryStat: 'defense' },
  ],
  crossbows: [
    { id: 'ironveil', name: 'Ironveil Repeater', lore: 'Rapid fire from iron veils', primaryStat: 'speed', secondaryStat: 'armorPen' },
    { id: 'skullpiercer', name: 'Skullpiercer', lore: 'Pierces skulls with precision', primaryStat: 'crit', secondaryStat: 'damage' },
    { id: 'bloodreaver-xbow', name: 'Bloodreaver Crossbow', lore: 'Reaves blood with bolts', primaryStat: 'bleed', secondaryStat: 'lifesteal' },
    { id: 'wraithspike', name: 'Wraithspike', lore: 'Spikes from wraith essence', primaryStat: 'mana', secondaryStat: 'silence' },
    { id: 'emberbolt', name: 'Emberbolt', lore: 'Bolts of burning ember', primaryStat: 'burn', secondaryStat: 'damage' },
    { id: 'ironshard', name: 'Ironshard', lore: 'Shards of unbreakable iron', primaryStat: 'armorPen', secondaryStat: 'defense' },
  ],
  guns: [
    { id: 'blackpowder', name: 'Blackpowder Blaster', lore: 'Blasts with ancient blackpowder grudges', primaryStat: 'damage', secondaryStat: 'knockback' },
    { id: 'ironstorm', name: 'Ironstorm Gun', lore: 'Storms of iron bullets', primaryStat: 'speed', secondaryStat: 'armorPen' },
    { id: 'bloodcannon', name: 'Bloodcannon', lore: 'Cannon of blood tribute', primaryStat: 'lifesteal', secondaryStat: 'damage' },
    { id: 'wraithbarrel', name: 'Wraithbarrel', lore: 'Barrel whispers wraith grudges', primaryStat: 'mana', secondaryStat: 'silence' },
    { id: 'emberrifle', name: 'Emberrifle', lore: 'Rifle of ember flames', primaryStat: 'burn', secondaryStat: 'damage' },
    { id: 'duskblaster', name: 'Duskblaster', lore: 'Blasts at dusk with shadow', primaryStat: 'crit', secondaryStat: 'speed' },
  ],
  fireStaves: [
    { id: 'emberwrath', name: 'Emberwrath Staff', lore: 'Wrath of burning embers', element: 'fire', primaryStat: 'burn', secondaryStat: 'mana' },
    { id: 'sunfire', name: 'Sunfire Staff', lore: 'Staff of solar flames', element: 'fire', primaryStat: 'burn', secondaryStat: 'damage' },
    { id: 'inferno-spire', name: 'Inferno Spire', lore: 'Spire of raging inferno', element: 'fire', primaryStat: 'damage', secondaryStat: 'burn' },
    { id: 'ash-grudge', name: 'Ash Grudge Staff', lore: 'Burns grudges to ash', element: 'fire', primaryStat: 'burn', secondaryStat: 'armorPen' },
    { id: 'ember-heart', name: 'Ember Heart', lore: 'Heart of burning embers', element: 'fire', primaryStat: 'burn', secondaryStat: 'hp' },
    { id: 'blazing-wrath', name: 'Blazing Wrath', lore: 'Wrath of blazing flames', element: 'fire', primaryStat: 'damage', secondaryStat: 'burn' },
  ],
  frostStaves: [
    { id: 'glacialspire', name: 'Glacial Spire', lore: 'Spire of glacial cold', element: 'frost', primaryStat: 'slow', secondaryStat: 'mana' },
    { id: 'frostbite', name: 'Frostbite Staff', lore: 'Staff of frostbite vengeance', element: 'frost', primaryStat: 'slow', secondaryStat: 'damage' },
    { id: 'winter-grudge', name: 'Winter Grudge', lore: 'Grudges frozen in winter', element: 'frost', primaryStat: 'freeze', secondaryStat: 'slow' },
    { id: 'ice-warden', name: 'Ice Warden', lore: 'Warden of frozen lands', element: 'frost', primaryStat: 'slow', secondaryStat: 'defense' },
    { id: 'blizzard-heart', name: 'Blizzard Heart', lore: 'Heart of endless blizzard', element: 'frost', primaryStat: 'damage', secondaryStat: 'slow' },
    { id: 'frozen-spite', name: 'Frozen Spite', lore: 'Spite frozen in ice', element: 'frost', primaryStat: 'freeze', secondaryStat: 'damage' },
  ],
  holyStaves: [
    { id: 'dawnspire', name: 'Dawnspire', lore: 'Spire of dawning light', element: 'holy', primaryStat: 'heal', secondaryStat: 'mana' },
    { id: 'redemption', name: 'Redemption Staff', lore: 'Staff of holy redemption', element: 'holy', primaryStat: 'heal', secondaryStat: 'cleanse' },
    { id: 'sacred-light', name: 'Sacred Light', lore: 'Light of the sacred', element: 'holy', primaryStat: 'heal', secondaryStat: 'shield' },
    { id: 'holy-wrath', name: 'Holy Wrath', lore: 'Wrath of the divine', element: 'holy', primaryStat: 'damage', secondaryStat: 'heal' },
    { id: 'celestial-grace', name: 'Celestial Grace', lore: 'Grace of celestial beings', element: 'holy', primaryStat: 'heal', secondaryStat: 'hp' },
    { id: 'divine-judgment', name: 'Divine Judgment', lore: 'Judgment of the divine', element: 'holy', primaryStat: 'damage', secondaryStat: 'silence' },
  ],
  lightningStaves: [
    { id: 'stormwrath', name: 'Stormwrath', lore: 'Wrath of storms', element: 'lightning', primaryStat: 'damage', secondaryStat: 'stun' },
    { id: 'tempest-spire', name: 'Tempest Spire', lore: 'Spire of tempest fury', element: 'lightning', primaryStat: 'damage', secondaryStat: 'chain' },
    { id: 'shock-grudge', name: 'Shock Grudge', lore: 'Grudges struck by lightning', element: 'lightning', primaryStat: 'stun', secondaryStat: 'damage' },
    { id: 'voltaic-heart', name: 'Voltaic Heart', lore: 'Heart of voltaic power', element: 'lightning', primaryStat: 'damage', secondaryStat: 'speed' },
    { id: 'thunder-spire', name: 'Thunder Spire', lore: 'Spire of rolling thunder', element: 'lightning', primaryStat: 'damage', secondaryStat: 'stun' },
  ],
  thunderGrudge: [
    { id: 'thunder-grudge', name: 'ThunderGrudge Staff', lore: 'Grudges powered by thunder', element: 'lightning', primaryStat: 'damage', secondaryStat: 'stun' },
  ],
  arcaneStaves: [
    { id: 'voidspire', name: 'Voidspire', lore: 'Spire into the void', element: 'arcane', primaryStat: 'mana', secondaryStat: 'silence' },
    { id: 'arcane-fury', name: 'Arcane Fury', lore: 'Fury of arcane power', element: 'arcane', primaryStat: 'damage', secondaryStat: 'mana' },
    { id: 'mystic-grudge', name: 'Mystic Grudge', lore: 'Grudges of the mystic', element: 'arcane', primaryStat: 'mana', secondaryStat: 'damage' },
    { id: 'ether-heart', name: 'Ether Heart', lore: 'Heart of pure ether', element: 'arcane', primaryStat: 'mana', secondaryStat: 'hp' },
    { id: 'void-warden', name: 'Void Warden', lore: 'Warden of the void', element: 'arcane', primaryStat: 'silence', secondaryStat: 'mana' },
    { id: 'chaos-spire', name: 'Chaos Spire', lore: 'Spire of pure chaos', element: 'arcane', primaryStat: 'damage', secondaryStat: 'armorPen' },
  ],
};

export const CONSUMABLE_SETS = {
  bandages: [
    { id: 'health-bandage', name: 'Health Bandage', lore: 'Heals wounds over time', effect: 'Restores HP over 10 seconds' },
    { id: 'poison-bandage', name: 'Poison Bandage', lore: 'Cleanses poison from wounds', effect: 'Removes all poison effects' },
    { id: 'warm-blanket', name: 'Warm Blanket', lore: 'Thaws frozen limbs', effect: 'Removes frozen/slow effects' },
    { id: 'smelling-salt', name: 'Smelling Salt', lore: 'Clears the mind instantly', effect: 'Breaks stun effects' },
    { id: 'athletic-tape', name: 'Athletic Tape', lore: 'Enhances mobility', effect: '+15% movement speed and stamina regen for 15 min' },
  ],
  grenades: [
    { id: 'explosive-grenade', name: 'Explosive Grenade', lore: 'Explodes on impact', effect: 'AoE damage in blast radius' },
    { id: 'frost-grenade', name: 'Frost Grenade', lore: 'Freezing burst', effect: 'Slows and damages enemies in area' },
    { id: 'blackhole-grenade', name: 'Black Hole Grenade', lore: 'Creates gravitational pull', effect: 'Pulls enemies towards center' },
    { id: 'bounce-grenade', name: 'Bounce Grenade', lore: 'Explosive knockback', effect: 'Pushes units away (user 2x further)' },
    { id: 'heal-bomb', name: 'Heal Bomb', lore: 'Healing explosion', effect: 'AoE healing burst to allies' },
  ],
  fishingLures: [
    { id: 'basic-lure', name: 'Basic Lure', lore: 'Attracts common fish', effect: '+10% catch rate for common fish' },
    { id: 'shiny-lure', name: 'Shiny Lure', lore: 'Attracts rare fish', effect: '+15% chance for rare fish' },
    { id: 'magic-lure', name: 'Magic Lure', lore: 'Attracts legendary fish', effect: '+5% chance for legendary fish' },
  ],
  scopes: [
    { id: 'iron-scope', name: 'Iron Scope', lore: 'Basic precision aiming', effect: '+5% accuracy, +2% crit' },
    { id: 'precision-scope', name: 'Precision Scope', lore: 'Enhanced targeting', effect: '+10% accuracy, +5% crit' },
    { id: 'sniper-scope', name: 'Sniper Scope', lore: 'Long range precision', effect: '+15% accuracy, +10% crit, +range' },
    { id: 'master-scope', name: 'Master Scope', lore: 'Masterwork optics', effect: '+20% accuracy, +15% crit, +range, +damage' },
  ],
  traps: [
    { id: 'bear-trap', name: 'Bear Trap', lore: 'Snaps on contact', effect: 'Roots and damages enemy' },
    { id: 'spike-trap', name: 'Spike Trap', lore: 'Hidden spikes', effect: 'Damages and slows' },
    { id: 'net-trap', name: 'Net Trap', lore: 'Entangling net', effect: 'Immobilizes target for 3s' },
  ],
  siegeEquipment: [
    { id: 'catapult', name: 'Catapult', lore: 'Hurls boulders', effect: 'Long range siege damage' },
    { id: 'ballista', name: 'Ballista', lore: 'Giant crossbow', effect: 'High single target siege damage' },
    { id: 'cannon', name: 'Cannon', lore: 'Explosive siege weapon', effect: 'AoE siege damage' },
    { id: 'flying-machine', name: 'Flying Machine', lore: 'Aerial reconnaissance', effect: 'Scout and aerial bombardment' },
  ],
};

export const ARMOR_SETS = {
  bloodfeud: { name: 'Bloodfeud', lore: 'Blood of clan feuds', setBonus: 'Arcane Ward: +20% magic resist' },
  wraithfang: { name: 'Wraithfang', lore: 'Wraith echo in shadows', setBonus: 'Wraith Echo: 10% dodge chance' },
  oathbreaker: { name: 'Oathbreaker', lore: 'Broken oaths empower', setBonus: 'Broken Oath: Purge 1 buff on hit' },
  kinrend: { name: 'Kinrend', lore: 'Kinship bonds protect', setBonus: 'Family Guard: +15% heal received' },
  dusksinger: { name: 'Dusksinger', lore: 'Twilight speed grants', setBonus: 'Evening Veil: +10% move speed' },
  emberclad: { name: 'Emberclad', lore: 'Flames protect the bearer', setBonus: 'Flame Cloak: Burn attackers' },
};

export const ARMOR_SLOTS = ['helm', 'shoulder', 'chest', 'hands', 'feet', 'ring', 'necklace', 'relic'] as const;
export const ARMOR_MATERIALS = ['cloth', 'leather', 'metal'] as const;

export type ArmorSlot = typeof ARMOR_SLOTS[number];
export type ArmorMaterial = typeof ARMOR_MATERIALS[number];

export interface TieredRecipe {
  id: string;
  baseId: string;
  name: string;
  tier: Tier;
  tierLabel: string;
  type: 'weapon' | 'armor' | 'material' | 'consumable';
  subtype: string;
  station: string;
  craftingTime: string;
  successChance: number;
  materials: Record<string, number>;
  description: string;
  craftedBy: 'Miner' | 'Forester' | 'Mystic' | 'Chef' | 'Engineer';
  primaryStat?: string;
  secondaryStat?: string;
  setName?: string;
  slot?: string;
}

export interface SkillCraftingBonus {
  skillNodeId: string;
  bonusType: 'materialReduction' | 'successChance' | 'qualityBoost' | 'speedBoost' | 'tierUnlock';
  bonusValue: number;
  affectedRecipes: string[];
  description: string;
}

function getMaterialForTier(tier: Tier, category: keyof typeof TIER_MATERIALS): string {
  return TIER_MATERIALS[category][tier - 1];
}

function getStation(profession: string): string {
  const stations: Record<string, string> = {
    Miner: 'Smithing Table',
    Forester: 'Lumber Table',
    Mystic: 'Loom Table',
    Chef: 'Cooking Table',
    Engineer: 'Tinker Table',
  };
  return stations[profession] || 'Smithing Table';
}

function generateWeaponRecipes(): TieredRecipe[] {
  const recipes: TieredRecipe[] = [];

  const weaponConfigs: Array<{
    setKey: keyof typeof WEAPON_SETS;
    profession: 'Miner' | 'Forester' | 'Engineer' | 'Mystic';
    subtype: string;
    primaryMaterial: keyof typeof TIER_MATERIALS;
    secondaryMaterial: keyof typeof TIER_MATERIALS;
  }> = [
    { setKey: 'swords', profession: 'Miner', subtype: 'Sword', primaryMaterial: 'ingot', secondaryMaterial: 'leather' },
    { setKey: 'daggers', profession: 'Miner', subtype: 'Dagger', primaryMaterial: 'ingot', secondaryMaterial: 'fabric' },
    { setKey: 'greatswords', profession: 'Miner', subtype: 'Greatsword', primaryMaterial: 'ingot', secondaryMaterial: 'leather' },
    { setKey: 'hammers2h', profession: 'Miner', subtype: 'Hammer (2H)', primaryMaterial: 'ingot', secondaryMaterial: 'plank' },
    { setKey: 'axes1h', profession: 'Forester', subtype: 'Axe (1H)', primaryMaterial: 'ingot', secondaryMaterial: 'plank' },
    { setKey: 'greataxes', profession: 'Forester', subtype: 'Axe (2H)', primaryMaterial: 'ingot', secondaryMaterial: 'plank' },
    { setKey: 'bows', profession: 'Forester', subtype: 'Bow', primaryMaterial: 'plank', secondaryMaterial: 'leather' },
    { setKey: 'natureStaves', profession: 'Forester', subtype: 'Nature Staff', primaryMaterial: 'plank', secondaryMaterial: 'fabric' },
    { setKey: 'hammers1h', profession: 'Engineer', subtype: 'Hammer (1H)', primaryMaterial: 'ingot', secondaryMaterial: 'plank' },
    { setKey: 'crossbows', profession: 'Engineer', subtype: 'Crossbow', primaryMaterial: 'ingot', secondaryMaterial: 'plank' },
    { setKey: 'guns', profession: 'Engineer', subtype: 'Gun', primaryMaterial: 'ingot', secondaryMaterial: 'plank' },
    { setKey: 'thunderGrudge', profession: 'Engineer', subtype: 'Thunder Staff', primaryMaterial: 'ingot', secondaryMaterial: 'fabric' },
    { setKey: 'fireStaves', profession: 'Mystic', subtype: 'Fire Staff', primaryMaterial: 'plank', secondaryMaterial: 'fabric' },
    { setKey: 'frostStaves', profession: 'Mystic', subtype: 'Frost Staff', primaryMaterial: 'plank', secondaryMaterial: 'fabric' },
    { setKey: 'holyStaves', profession: 'Mystic', subtype: 'Holy Staff', primaryMaterial: 'plank', secondaryMaterial: 'fabric' },
    { setKey: 'lightningStaves', profession: 'Mystic', subtype: 'Lightning Staff', primaryMaterial: 'plank', secondaryMaterial: 'fabric' },
    { setKey: 'arcaneStaves', profession: 'Mystic', subtype: 'Arcane Staff', primaryMaterial: 'plank', secondaryMaterial: 'fabric' },
  ];

  for (const config of weaponConfigs) {
    const weaponSet = WEAPON_SETS[config.setKey] as Array<{id: string; name: string; lore: string; primaryStat: string; secondaryStat: string; element?: string}>;
    if (!weaponSet || !Array.isArray(weaponSet)) continue;
    for (const weapon of weaponSet) {
      for (const tier of TIERS) {
        const baseCount = TIER_COSTS.baseMaterialCount[tier - 1];
        const materials: Record<string, number> = {
          [getMaterialForTier(tier, config.primaryMaterial)]: baseCount,
          [getMaterialForTier(tier, config.secondaryMaterial)]: Math.max(1, Math.floor(baseCount / 2)),
        };

        if (tier >= 4) {
          materials[getMaterialForTier(tier, 'essence')] = Math.floor((tier - 3) * 1.5);
        }
        if (tier >= 5) {
          materials[getMaterialForTier(tier, 'gem')] = Math.floor((tier - 4) / 2) + 1;
        }

        const recipe: TieredRecipe = {
          id: `${weapon.id}-t${tier}`,
          baseId: weapon.id,
          name: `${weapon.name} T${tier}`,
          tier,
          tierLabel: `T${tier}`,
          type: 'weapon',
          subtype: config.subtype,
          station: getStation(config.profession),
          craftingTime: TIER_COSTS.craftingTime[tier - 1],
          successChance: TIER_COSTS.successChance[tier - 1],
          materials,
          description: weapon.lore,
          craftedBy: config.profession,
          primaryStat: weapon.primaryStat,
          secondaryStat: weapon.secondaryStat,
        };

        recipes.push(recipe);
      }
    }
  }

  for (const sharedDagger of WEAPON_SETS.daggersShared) {
    for (const profession of ['Miner', 'Forester'] as const) {
      for (const tier of TIERS) {
        const baseCount = TIER_COSTS.baseMaterialCount[tier - 1];
        const materials: Record<string, number> = {
          [getMaterialForTier(tier, 'ingot')]: baseCount,
          [getMaterialForTier(tier, 'fabric')]: Math.max(1, Math.floor(baseCount / 2)),
        };

        if (tier >= 4) {
          materials[getMaterialForTier(tier, 'essence')] = Math.floor((tier - 3) * 1.5);
        }
        if (tier >= 5) {
          materials[getMaterialForTier(tier, 'gem')] = Math.floor((tier - 4) / 2) + 1;
        }

        const recipe: TieredRecipe = {
          id: `${sharedDagger.id}-${profession.toLowerCase()}-t${tier}`,
          baseId: sharedDagger.id,
          name: `${sharedDagger.name} T${tier}`,
          tier,
          tierLabel: `T${tier}`,
          type: 'weapon',
          subtype: 'Dagger',
          station: getStation(profession),
          craftingTime: TIER_COSTS.craftingTime[tier - 1],
          successChance: TIER_COSTS.successChance[tier - 1],
          materials,
          description: sharedDagger.lore,
          craftedBy: profession,
          primaryStat: sharedDagger.primaryStat,
          secondaryStat: sharedDagger.secondaryStat,
        };

        recipes.push(recipe);
      }
    }
  }

  return recipes;
}

function generateArmorRecipes(): TieredRecipe[] {
  const recipes: TieredRecipe[] = [];

  const materialConfigs: Record<ArmorMaterial, {
    profession: 'Miner' | 'Forester' | 'Mystic';
    primaryMaterial: keyof typeof TIER_MATERIALS;
    secondaryMaterial: keyof typeof TIER_MATERIALS;
  }> = {
    metal: { profession: 'Miner', primaryMaterial: 'ingot', secondaryMaterial: 'leather' },
    leather: { profession: 'Forester', primaryMaterial: 'leather', secondaryMaterial: 'plank' },
    cloth: { profession: 'Mystic', primaryMaterial: 'fabric', secondaryMaterial: 'essence' },
  };

  for (const [setKey, setData] of Object.entries(ARMOR_SETS)) {
    for (const material of ARMOR_MATERIALS) {
      const config = materialConfigs[material];
      for (const slot of ARMOR_SLOTS) {
        for (const tier of TIERS) {
          const baseCount = TIER_COSTS.baseMaterialCount[tier - 1];
          const slotMultiplier = slot === 'chest' ? 1.5 : slot === 'helm' ? 1.2 : 1;
          const materials: Record<string, number> = {
            [getMaterialForTier(tier, config.primaryMaterial)]: Math.ceil(baseCount * slotMultiplier),
            [getMaterialForTier(tier, config.secondaryMaterial)]: Math.max(1, Math.floor(baseCount * slotMultiplier / 3)),
          };

          if (tier >= 3) {
            materials[getMaterialForTier(tier, 'essence')] = Math.floor((tier - 2) * 0.8);
          }
          if (tier >= 6) {
            materials[getMaterialForTier(tier, 'gem')] = Math.floor((tier - 5) / 2) + 1;
          }

          const slotName = slot.charAt(0).toUpperCase() + slot.slice(1);
          const materialName = material.charAt(0).toUpperCase() + material.slice(1);

          const recipe: TieredRecipe = {
            id: `${setKey}-${material}-${slot}-t${tier}`,
            baseId: `${setKey}-${material}-${slot}`,
            name: `${setData.name} ${slotName} (${materialName}) T${tier}`,
            tier,
            tierLabel: `T${tier}`,
            type: 'armor',
            subtype: `${materialName} ${slotName}`,
            station: getStation(config.profession),
            craftingTime: TIER_COSTS.craftingTime[tier - 1],
            successChance: TIER_COSTS.successChance[tier - 1],
            materials,
            description: setData.lore,
            craftedBy: config.profession,
            setName: setData.name,
            slot,
          };

          recipes.push(recipe);
        }
      }
    }
  }

  return recipes;
}

function generateRefiningRecipes(): TieredRecipe[] {
  const recipes: TieredRecipe[] = [];

  const refiningConfigs: Array<{
    output: keyof typeof TIER_MATERIALS;
    inputRaw: string[];
    profession: 'Miner' | 'Forester' | 'Mystic';
    type: string;
  }> = [
    { 
      output: 'ingot', 
      inputRaw: ['Copper Ore', 'Iron Ore', 'Steel Ore', 'Mithril Ore', 'Adamantine Ore', 'Orichalcum Ore', 'Starmetal Ore', 'Divine Ore'],
      profession: 'Miner', 
      type: 'Metal Refining' 
    },
    { 
      output: 'plank', 
      inputRaw: ['Pine Log', 'Oak Log', 'Maple Log', 'Ash Log', 'Ironwood Log', 'Ebony Log', 'Wyrmwood Log', 'Worldtree Log'],
      profession: 'Forester', 
      type: 'Wood Processing' 
    },
    { 
      output: 'fabric', 
      inputRaw: ['Linen Thread', 'Wool Thread', 'Cotton Thread', 'Silk Thread', 'Moonweave Thread', 'Starweave Thread', 'Voidweave Thread', 'Divine Thread'],
      profession: 'Mystic', 
      type: 'Cloth Weaving' 
    },
  ];

  for (const config of refiningConfigs) {
    for (const tier of TIERS) {
      const inputMaterial = config.inputRaw[tier - 1];
      const outputMaterial = TIER_MATERIALS[config.output][tier - 1];
      const baseCount = TIER_COSTS.baseMaterialCount[tier - 1];

      const materials: Record<string, number> = {
        [inputMaterial]: baseCount,
      };

      if (tier >= 3) {
        materials['Coal'] = Math.floor(tier / 2);
      }
      if (tier >= 5) {
        materials[getMaterialForTier(tier, 'essence')] = 1;
      }

      const recipe: TieredRecipe = {
        id: `refine-${config.output}-t${tier}`,
        baseId: `refine-${config.output}`,
        name: `${outputMaterial}`,
        tier,
        tierLabel: `T${tier}`,
        type: 'material',
        subtype: config.type,
        station: getStation(config.profession),
        craftingTime: TIER_COSTS.craftingTime[tier - 1],
        successChance: Math.min(100, TIER_COSTS.successChance[tier - 1] + 5),
        materials,
        description: `Refined ${config.type.toLowerCase()}`,
        craftedBy: config.profession,
      };

      recipes.push(recipe);
    }
  }

  return recipes;
}

function generateConsumableRecipes(): TieredRecipe[] {
  const recipes: TieredRecipe[] = [];

  for (const bandage of CONSUMABLE_SETS.bandages) {
    for (const tier of TIERS) {
      const baseCount = TIER_COSTS.baseMaterialCount[tier - 1];
      const materials: Record<string, number> = {
        [getMaterialForTier(tier, 'fabric')]: Math.ceil(baseCount * 0.5),
        [getMaterialForTier(tier, 'essence')]: Math.max(1, Math.floor(tier / 2)),
      };

      recipes.push({
        id: `${bandage.id}-t${tier}`,
        baseId: bandage.id,
        name: `${bandage.name} T${tier}`,
        tier,
        tierLabel: `T${tier}`,
        type: 'consumable',
        subtype: 'Bandage',
        station: 'Loom Table',
        craftingTime: TIER_COSTS.craftingTime[tier - 1],
        successChance: TIER_COSTS.successChance[tier - 1] + 5,
        materials,
        description: bandage.effect,
        craftedBy: 'Mystic',
      });
    }
  }

  for (const grenade of CONSUMABLE_SETS.grenades) {
    for (const tier of TIERS) {
      const baseCount = TIER_COSTS.baseMaterialCount[tier - 1];
      const materials: Record<string, number> = {
        [getMaterialForTier(tier, 'ingot')]: Math.ceil(baseCount * 0.5),
        'Gunpowder': Math.max(1, tier),
      };
      if (tier >= 4) {
        materials[getMaterialForTier(tier, 'essence')] = Math.floor((tier - 3) / 2) + 1;
      }

      recipes.push({
        id: `${grenade.id}-t${tier}`,
        baseId: grenade.id,
        name: `${grenade.name} T${tier}`,
        tier,
        tierLabel: `T${tier}`,
        type: 'consumable',
        subtype: 'Grenade',
        station: 'Tinker Table',
        craftingTime: TIER_COSTS.craftingTime[tier - 1],
        successChance: TIER_COSTS.successChance[tier - 1],
        materials,
        description: grenade.effect,
        craftedBy: 'Engineer',
      });
    }
  }

  for (const lure of CONSUMABLE_SETS.fishingLures) {
    for (const tier of TIERS) {
      const materials: Record<string, number> = {
        [getMaterialForTier(tier, 'ingot')]: 1,
        'Feather': tier,
      };

      recipes.push({
        id: `${lure.id}-t${tier}`,
        baseId: lure.id,
        name: `${lure.name} T${tier}`,
        tier,
        tierLabel: `T${tier}`,
        type: 'consumable',
        subtype: 'Fishing Lure',
        station: 'Tinker Table',
        craftingTime: TIER_COSTS.craftingTime[tier - 1],
        successChance: TIER_COSTS.successChance[tier - 1] + 10,
        materials,
        description: lure.effect,
        craftedBy: 'Engineer',
      });
    }
  }

  for (const scope of CONSUMABLE_SETS.scopes) {
    for (const tier of TIERS) {
      const baseCount = TIER_COSTS.baseMaterialCount[tier - 1];
      const materials: Record<string, number> = {
        [getMaterialForTier(tier, 'ingot')]: baseCount,
        [getMaterialForTier(tier, 'gem')]: Math.max(1, Math.floor(tier / 2)),
        'Glass Lens': tier,
      };

      recipes.push({
        id: `${scope.id}-t${tier}`,
        baseId: scope.id,
        name: `${scope.name} T${tier}`,
        tier,
        tierLabel: `T${tier}`,
        type: 'consumable',
        subtype: 'Scope',
        station: 'Tinker Table',
        craftingTime: TIER_COSTS.craftingTime[tier - 1],
        successChance: TIER_COSTS.successChance[tier - 1] - 5,
        materials,
        description: scope.effect,
        craftedBy: 'Engineer',
      });
    }
  }

  for (const trap of CONSUMABLE_SETS.traps) {
    for (const tier of TIERS) {
      const baseCount = TIER_COSTS.baseMaterialCount[tier - 1];
      const materials: Record<string, number> = {
        [getMaterialForTier(tier, 'ingot')]: baseCount,
        [getMaterialForTier(tier, 'leather')]: Math.max(1, Math.floor(baseCount / 2)),
      };

      recipes.push({
        id: `${trap.id}-t${tier}`,
        baseId: trap.id,
        name: `${trap.name} T${tier}`,
        tier,
        tierLabel: `T${tier}`,
        type: 'consumable',
        subtype: 'Trap',
        station: 'Tinker Table',
        craftingTime: TIER_COSTS.craftingTime[tier - 1],
        successChance: TIER_COSTS.successChance[tier - 1],
        materials,
        description: trap.effect,
        craftedBy: 'Engineer',
      });
    }
  }

  for (const siege of CONSUMABLE_SETS.siegeEquipment) {
    for (const tier of TIERS) {
      const baseCount = TIER_COSTS.baseMaterialCount[tier - 1] * 3;
      const materials: Record<string, number> = {
        [getMaterialForTier(tier, 'ingot')]: baseCount,
        [getMaterialForTier(tier, 'plank')]: Math.ceil(baseCount * 0.75),
        'Cog': tier * 2,
      };
      if (tier >= 4) {
        materials[getMaterialForTier(tier, 'essence')] = tier - 2;
      }

      recipes.push({
        id: `${siege.id}-t${tier}`,
        baseId: siege.id,
        name: `${siege.name} T${tier}`,
        tier,
        tierLabel: `T${tier}`,
        type: 'consumable',
        subtype: 'Siege',
        station: 'Tinker Table',
        craftingTime: TIER_COSTS.craftingTime[tier - 1],
        successChance: TIER_COSTS.successChance[tier - 1] - 10,
        materials,
        description: siege.effect,
        craftedBy: 'Engineer',
      });
    }
  }

  return recipes;
}

export const SKILL_CRAFTING_BONUSES: SkillCraftingBonus[] = [
  { skillNodeId: 'miner-smelting-1', bonusType: 'materialReduction', bonusValue: 5, affectedRecipes: ['refine-ingot', 'Metal Refining'], description: '5% ore reduction when smelting' },
  { skillNodeId: 'miner-smelting-2', bonusType: 'successChance', bonusValue: 3, affectedRecipes: ['refine-ingot', 'Metal Refining'], description: '+3% smelting success' },
  { skillNodeId: 'miner-smelting-3', bonusType: 'qualityBoost', bonusValue: 10, affectedRecipes: ['refine-ingot', 'Metal Refining'], description: '10% chance for bonus ingot' },
  { skillNodeId: 'miner-weapons-1', bonusType: 'materialReduction', bonusValue: 5, affectedRecipes: ['Sword', 'Axe', 'Dagger', 'Hammer', 'Greatsword', 'Greataxe'], description: '5% material reduction for melee weapons' },
  { skillNodeId: 'miner-weapons-2', bonusType: 'successChance', bonusValue: 5, affectedRecipes: ['Sword', 'Axe', 'Dagger', 'Hammer', 'Greatsword', 'Greataxe'], description: '+5% weapon crafting success' },
  { skillNodeId: 'miner-weapons-3', bonusType: 'tierUnlock', bonusValue: 1, affectedRecipes: ['Sword', 'Axe', 'Dagger', 'Hammer', 'Greatsword', 'Greataxe'], description: 'Unlock T7 weapon crafting' },
  { skillNodeId: 'miner-weapons-4', bonusType: 'tierUnlock', bonusValue: 1, affectedRecipes: ['Sword', 'Axe', 'Dagger', 'Hammer', 'Greatsword', 'Greataxe'], description: 'Unlock T8 weapon crafting' },
  { skillNodeId: 'miner-armor-1', bonusType: 'materialReduction', bonusValue: 5, affectedRecipes: ['Metal Helm', 'Metal Shoulder', 'Metal Chest', 'Metal'], description: '5% material reduction for metal armor' },
  { skillNodeId: 'miner-armor-2', bonusType: 'speedBoost', bonusValue: 15, affectedRecipes: ['Metal Helm', 'Metal Shoulder', 'Metal Chest', 'Metal'], description: '15% faster armor crafting' },
  { skillNodeId: 'miner-armor-3', bonusType: 'qualityBoost', bonusValue: 8, affectedRecipes: ['Metal Helm', 'Metal Shoulder', 'Metal Chest', 'Metal'], description: '8% chance for enhanced stats' },
  { skillNodeId: 'miner-armor-4', bonusType: 'tierUnlock', bonusValue: 1, affectedRecipes: ['Metal Helm', 'Metal Shoulder', 'Metal Chest', 'Metal'], description: 'Unlock T7 metal armor crafting' },
  { skillNodeId: 'miner-armor-5', bonusType: 'tierUnlock', bonusValue: 1, affectedRecipes: ['Metal Helm', 'Metal Shoulder', 'Metal Chest', 'Metal'], description: 'Unlock T8 metal armor crafting' },
  
  { skillNodeId: 'forester-woodwork-1', bonusType: 'materialReduction', bonusValue: 5, affectedRecipes: ['refine-plank', 'Wood Processing'], description: '5% wood reduction when processing' },
  { skillNodeId: 'forester-woodwork-2', bonusType: 'successChance', bonusValue: 3, affectedRecipes: ['refine-plank', 'Wood Processing'], description: '+3% woodworking success' },
  { skillNodeId: 'forester-bows-1', bonusType: 'materialReduction', bonusValue: 5, affectedRecipes: ['Bow'], description: '5% material reduction for bows' },
  { skillNodeId: 'forester-bows-2', bonusType: 'qualityBoost', bonusValue: 10, affectedRecipes: ['Bow'], description: '10% chance for enhanced bow stats' },
  { skillNodeId: 'forester-bows-3', bonusType: 'tierUnlock', bonusValue: 1, affectedRecipes: ['Bow'], description: 'Unlock T7 bow crafting' },
  { skillNodeId: 'forester-bows-4', bonusType: 'tierUnlock', bonusValue: 1, affectedRecipes: ['Bow'], description: 'Unlock T8 bow crafting' },
  { skillNodeId: 'forester-leather-1', bonusType: 'materialReduction', bonusValue: 5, affectedRecipes: ['Leather Helm', 'Leather Shoulder', 'Leather Chest', 'Leather'], description: '5% hide reduction for leather armor' },
  { skillNodeId: 'forester-leather-2', bonusType: 'speedBoost', bonusValue: 20, affectedRecipes: ['Leather Helm', 'Leather Shoulder', 'Leather Chest', 'Leather'], description: '20% faster leather crafting' },
  { skillNodeId: 'forester-leather-3', bonusType: 'tierUnlock', bonusValue: 1, affectedRecipes: ['Leather Helm', 'Leather Shoulder', 'Leather Chest', 'Leather'], description: 'Unlock T7 leather armor crafting' },
  { skillNodeId: 'forester-leather-4', bonusType: 'tierUnlock', bonusValue: 1, affectedRecipes: ['Leather Helm', 'Leather Shoulder', 'Leather Chest', 'Leather'], description: 'Unlock T8 leather armor crafting' },
  
  { skillNodeId: 'mystic-weaving-1', bonusType: 'materialReduction', bonusValue: 5, affectedRecipes: ['refine-fabric', 'Cloth Weaving'], description: '5% thread reduction when weaving' },
  { skillNodeId: 'mystic-staves-1', bonusType: 'qualityBoost', bonusValue: 15, affectedRecipes: ['Staff'], description: '15% chance for enhanced magic stats' },
  { skillNodeId: 'mystic-staves-2', bonusType: 'tierUnlock', bonusValue: 1, affectedRecipes: ['Staff'], description: 'Unlock T7 staff crafting' },
  { skillNodeId: 'mystic-staves-3', bonusType: 'tierUnlock', bonusValue: 1, affectedRecipes: ['Staff'], description: 'Unlock T8 staff crafting' },
  { skillNodeId: 'mystic-cloth-1', bonusType: 'materialReduction', bonusValue: 8, affectedRecipes: ['Cloth Helm', 'Cloth Shoulder', 'Cloth Chest', 'Cloth'], description: '8% essence reduction for cloth armor' },
  { skillNodeId: 'mystic-cloth-2', bonusType: 'tierUnlock', bonusValue: 1, affectedRecipes: ['Cloth Helm', 'Cloth Shoulder', 'Cloth Chest', 'Cloth'], description: 'Unlock T7 cloth armor crafting' },
  { skillNodeId: 'mystic-cloth-3', bonusType: 'tierUnlock', bonusValue: 1, affectedRecipes: ['Cloth Helm', 'Cloth Shoulder', 'Cloth Chest', 'Cloth'], description: 'Unlock T8 cloth armor crafting' },
  
  { skillNodeId: 'engineer-gears-1', bonusType: 'materialReduction', bonusValue: 5, affectedRecipes: ['Crossbow', 'Gun'], description: '5% gear reduction for ranged weapons' },
  { skillNodeId: 'engineer-gears-2', bonusType: 'successChance', bonusValue: 5, affectedRecipes: ['Crossbow', 'Gun'], description: '+5% engineering success' },
  { skillNodeId: 'engineer-gears-3', bonusType: 'tierUnlock', bonusValue: 1, affectedRecipes: ['Crossbow', 'Gun'], description: 'Unlock T7 ranged crafting' },
  { skillNodeId: 'engineer-gears-4', bonusType: 'tierUnlock', bonusValue: 1, affectedRecipes: ['Crossbow', 'Gun'], description: 'Unlock T8 ranged crafting' },
  { skillNodeId: 'engineer-siege-1', bonusType: 'speedBoost', bonusValue: 25, affectedRecipes: ['Siege'], description: '25% faster siege weapon crafting' },
  
  { skillNodeId: 'chef-cooking-1', bonusType: 'materialReduction', bonusValue: 10, affectedRecipes: ['Food', 'Cooking'], description: '10% ingredient reduction' },
  { skillNodeId: 'chef-alchemy-1', bonusType: 'qualityBoost', bonusValue: 20, affectedRecipes: ['Potion', 'Alchemy'], description: '20% chance for stronger potions' },
  { skillNodeId: 'chef-alchemy-2', bonusType: 'tierUnlock', bonusValue: 1, affectedRecipes: ['Potion', 'Alchemy'], description: 'Unlock T7 potions' },
  { skillNodeId: 'chef-alchemy-3', bonusType: 'tierUnlock', bonusValue: 1, affectedRecipes: ['Potion', 'Alchemy'], description: 'Unlock T8 potions' },
];

export function getMaxCraftableTier(unlockedSkills: string[], recipeType: string): Tier {
  const baseTier: Tier = 6;
  const tierUnlockBonuses = SKILL_CRAFTING_BONUSES.filter(
    b => b.bonusType === 'tierUnlock' && 
    b.affectedRecipes.some(r => recipeType.includes(r) || r.toLowerCase() === recipeType.toLowerCase()) &&
    unlockedSkills.includes(b.skillNodeId)
  );
  
  const bonusTiers = tierUnlockBonuses.reduce((sum, b) => sum + b.bonusValue, 0);
  return Math.min(8, baseTier + bonusTiers) as Tier;
}

export function getMaxCraftableTierForBase(unlockedSkills: string[], recipe: TieredRecipe): Tier {
  const baseTier: Tier = 6;
  const matchTargets = [recipe.subtype, recipe.type];
  
  const tierUnlockBonuses = SKILL_CRAFTING_BONUSES.filter(b => {
    if (b.bonusType !== 'tierUnlock') return false;
    if (!unlockedSkills.includes(b.skillNodeId)) return false;
    return b.affectedRecipes.some(affected => 
      matchTargets.some(target => 
        target.includes(affected) || affected.toLowerCase() === target.toLowerCase()
      )
    );
  });
  
  const bonusTiers = tierUnlockBonuses.reduce((sum, b) => sum + b.bonusValue, 0);
  return Math.min(8, baseTier + bonusTiers) as Tier;
}

export function getCraftingBonuses(unlockedSkills: string[], recipe: TieredRecipe): {
  materialReduction: number;
  successChanceBonus: number;
  qualityBoostChance: number;
  speedMultiplier: number;
} {
  const bonuses = {
    materialReduction: 0,
    successChanceBonus: 0,
    qualityBoostChance: 0,
    speedMultiplier: 1,
  };

  const matchTargets = [recipe.id, recipe.baseId, recipe.subtype, recipe.type];

  for (const bonus of SKILL_CRAFTING_BONUSES) {
    if (!unlockedSkills.includes(bonus.skillNodeId)) continue;
    
    const matches = bonus.affectedRecipes.some(affected => 
      matchTargets.some(target => 
        target.includes(affected) || affected.toLowerCase() === target.toLowerCase()
      )
    );
    
    if (!matches) continue;

    switch (bonus.bonusType) {
      case 'materialReduction':
        bonuses.materialReduction += bonus.bonusValue;
        break;
      case 'successChance':
        bonuses.successChanceBonus += bonus.bonusValue;
        break;
      case 'qualityBoost':
        bonuses.qualityBoostChance += bonus.bonusValue;
        break;
      case 'speedBoost':
        bonuses.speedMultiplier *= (1 - bonus.bonusValue / 100);
        break;
    }
  }

  return bonuses;
}

export const ALL_TIERED_WEAPON_RECIPES = generateWeaponRecipes();
export const ALL_TIERED_ARMOR_RECIPES = generateArmorRecipes();
export const ALL_TIERED_REFINING_RECIPES = generateRefiningRecipes();
export const ALL_TIERED_CONSUMABLE_RECIPES = generateConsumableRecipes();

export const ALL_TIERED_RECIPES: TieredRecipe[] = [
  ...ALL_TIERED_WEAPON_RECIPES,
  ...ALL_TIERED_ARMOR_RECIPES,
  ...ALL_TIERED_REFINING_RECIPES,
  ...ALL_TIERED_CONSUMABLE_RECIPES,
];

export function getRecipesByTier(tier: Tier): TieredRecipe[] {
  return ALL_TIERED_RECIPES.filter(r => r.tier === tier);
}

export function getRecipesByType(type: TieredRecipe['type']): TieredRecipe[] {
  return ALL_TIERED_RECIPES.filter(r => r.type === type);
}

export function getRecipesByProfession(profession: TieredRecipe['craftedBy']): TieredRecipe[] {
  return ALL_TIERED_RECIPES.filter(r => r.craftedBy === profession);
}

export function getRecipesByBaseId(baseId: string): TieredRecipe[] {
  return ALL_TIERED_RECIPES.filter(r => r.baseId === baseId);
}

export function getRecipeById(id: string): TieredRecipe | undefined {
  return ALL_TIERED_RECIPES.find(r => r.id === id);
}

export function getUpgradePath(baseId: string): TieredRecipe[] {
  return getRecipesByBaseId(baseId).sort((a, b) => a.tier - b.tier);
}

export const CRAFTING_STATS = {
  totalRecipes: ALL_TIERED_RECIPES.length,
  weaponRecipes: ALL_TIERED_WEAPON_RECIPES.length,
  armorRecipes: ALL_TIERED_ARMOR_RECIPES.length,
  refiningRecipes: ALL_TIERED_REFINING_RECIPES.length,
  consumableRecipes: ALL_TIERED_CONSUMABLE_RECIPES.length,
  uniqueWeapons: Object.values(WEAPON_SETS).flat().length,
  uniqueConsumables: Object.values(CONSUMABLE_SETS).flat().length,
  uniqueArmorSets: Object.keys(ARMOR_SETS).length,
  uniqueArmorPieces: Object.keys(ARMOR_SETS).length * ARMOR_SLOTS.length * ARMOR_MATERIALS.length,
};
