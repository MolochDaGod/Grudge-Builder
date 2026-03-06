export type ArenaTier = 1 | 2 | 3 | 4 | 5;
export type SettlementValue = "low" | "medium" | "high" | "very_high" | "extreme" | "special";
export type ArenaEnvironment = "outdoor" | "indoor" | "underground" | "floating" | "volcanic" | "aquatic";

export interface BattleArena {
  id: string;
  name: string;
  description: string;
  backgroundGradient: string;
  ambientColor: string;
  particleType: 'fire' | 'ice' | 'poison' | 'magic' | 'dust' | 'none';
  enemyTypes: string[];
  minLevel: number;
  maxLevel: number;
  faction?: 'crusade' | 'legion' | 'fabled';
}

export interface TieredArena {
  id: string;
  name: string;
  tier: ArenaTier;
  tierName: string;
  lore: string;
  prompt: string;
  enemyTypes: string[];
  boss?: string;
  settlementValue: SettlementValue;
  settlementDescription: string;
  imagePath?: string;
  colorScheme: string[];
  environment: ArenaEnvironment;
}

export const TIER_NAMES: Record<ArenaTier, string> = {
  1: "Acolytes of the Grudge",
  2: "Harbingers of Resentment",
  3: "Emissaries of Wrath",
  4: "Aspects of the Gods",
  5: "Primordial Conflicts",
};

export const TIER_DESCRIPTIONS: Record<ArenaTier, string> = {
  1: "Humble, broken places where minor feuds play out. Survivors' settlements and natural chaos.",
  2: "Established conflict zones. Destroyed settlements showing the violence of feuds. Divine influence visible.",
  3: "Divine presence obvious. Ancient monuments. Bosses begin appearing. Magic is wild.",
  4: "Godly manifestations. Boss battles are standard. Reality is fragile here.",
  5: "The setting itself is a character. Reality bends. These are world-defining moments.",
};

export const BATTLE_ARENAS: Record<string, BattleArena> = {
  ruined_fortress: {
    id: 'ruined_fortress',
    name: 'Ruined Fortress',
    description: 'Ancient stronghold consumed by war and flame. The stones still smolder with the fires of conquest.',
    backgroundGradient: 'linear-gradient(180deg, #1a0a0a 0%, #3d1a0a 30%, #5c2a0f 60%, #2a1205 100%)',
    ambientColor: '#ff6b35',
    particleType: 'fire',
    enemyTypes: ['skeleton', 'demon', 'knight'],
    minLevel: 1,
    maxLevel: 20,
    faction: 'crusade'
  },
  
  corrupted_forest: {
    id: 'corrupted_forest',
    name: 'Corrupted Forest',
    description: 'A once-verdant woodland now twisted by dark magic. Glowing corruption seeps from every root.',
    backgroundGradient: 'linear-gradient(180deg, #0a1f0a 0%, #1a3f1a 30%, #0f2f0f 60%, #051505 100%)',
    ambientColor: '#44ff44',
    particleType: 'poison',
    enemyTypes: ['treant', 'spider', 'witch'],
    minLevel: 5,
    maxLevel: 30,
    faction: 'fabled'
  },
  
  volcanic_arena: {
    id: 'volcanic_arena',
    name: 'Volcanic Arena',
    description: 'A hellish pit of molten rock and ash. Only the strongest survive the searing heat.',
    backgroundGradient: 'linear-gradient(180deg, #1a0505 0%, #4a1010 20%, #8b2500 50%, #ff4500 80%, #2a0a05 100%)',
    ambientColor: '#ff4500',
    particleType: 'fire',
    enemyTypes: ['elemental', 'demon', 'dragon'],
    minLevel: 15,
    maxLevel: 50,
    faction: 'legion'
  },
  
  frozen_citadel: {
    id: 'frozen_citadel',
    name: 'Frozen Citadel',
    description: 'An ice-bound fortress where the cold itself is a weapon. Frost giants patrol these halls.',
    backgroundGradient: 'linear-gradient(180deg, #0a1a2f 0%, #1a3a5f 30%, #2a4a6f 60%, #0a1020 100%)',
    ambientColor: '#88ccff',
    particleType: 'ice',
    enemyTypes: ['frost_giant', 'ice_elemental', 'wraith'],
    minLevel: 10,
    maxLevel: 40,
    faction: 'fabled'
  },
  
  mystic_swamp: {
    id: 'mystic_swamp',
    name: 'Mystic Swamp',
    description: 'Treacherous wetlands filled with ancient magic and lurking horrors beneath the murky waters.',
    backgroundGradient: 'linear-gradient(180deg, #1a1f0a 0%, #2a3f1a 30%, #3a4f2a 60%, #1a2510 100%)',
    ambientColor: '#7fff00',
    particleType: 'magic',
    enemyTypes: ['lizardman', 'witch', 'hydra'],
    minLevel: 8,
    maxLevel: 35,
    faction: 'legion'
  },
  
  deserted_shrine: {
    id: 'deserted_shrine',
    name: 'Deserted Shrine',
    description: 'Ancient temple ruins in a sun-scorched desert. The spirits of the fallen still guard their treasures.',
    backgroundGradient: 'linear-gradient(180deg, #2a2010 0%, #5a4020 30%, #8a6030 60%, #3a2510 100%)',
    ambientColor: '#ffcc44',
    particleType: 'dust',
    enemyTypes: ['mummy', 'scorpion', 'sphinx'],
    minLevel: 12,
    maxLevel: 45,
    faction: 'crusade'
  }
};

export const ARENA_LIST = Object.values(BATTLE_ARENAS);

export function getRandomArena(minLevel?: number): BattleArena {
  const eligible = ARENA_LIST.filter(a => !minLevel || (minLevel >= a.minLevel && minLevel <= a.maxLevel));
  return eligible[Math.floor(Math.random() * eligible.length)] || BATTLE_ARENAS.ruined_fortress;
}

export const TIERED_ARENAS: TieredArena[] = [
  {
    id: "shipwreck_beach",
    name: "Shipwreck Beach Arena",
    tier: 1,
    tierName: TIER_NAMES[1],
    lore: "Early factions fought over shipwrecks washing ashore from the Sundering.",
    prompt: "Isometric top-down view of a beach battleground with shipwreck fragments, broken wooden masts and hull pieces scattered across sand, shallow water with flotsam, rocky outcrops, daytime lighting, waves in background, stylized fantasy RPG art, 1920x1080, no characters",
    enemyTypes: ["Grudge Acolytes", "Bitter Novices", "Petty Wardens"],
    settlementValue: "low",
    settlementDescription: "Coastal resource gathering",
    colorScheme: ["#d4a574", "#5c9ead", "#87a96b"],
    environment: "outdoor",
  },
  {
    id: "forest_clearing",
    name: "Forest Clearing Ruin",
    tier: 1,
    tierName: TIER_NAMES[1],
    lore: "Abandoned villages slowly reclaimed by jungle. Overgrown temples to forgotten gods.",
    prompt: "Isometric top-down view of a jungle clearing with scattered stone ruins, crumbling brick walls, tangled vines and overgrowth, moss-covered stones, dappled sunlight filtering through dense canopy, exotic plants and flowers, mystical but wild feeling, stylized fantasy RPG art, 1920x1080, no characters",
    enemyTypes: ["Grudge Acolytes", "Bitter Novices"],
    settlementValue: "medium",
    settlementDescription: "Lumber and herbs",
    colorScheme: ["#228b22", "#8b4513", "#556b2f"],
    environment: "outdoor",
  },
  {
    id: "crumbling_tower",
    name: "Crumbling Tower Base",
    tier: 1,
    tierName: TIER_NAMES[1],
    lore: "Remnants of Worldboard watchtowers, now hollowed and dangerous.",
    prompt: "Isometric top-down view of a collapsed tower surrounded by broken stones and rubble, ancient architecture in ruins, cracks showing interior darkness, scattered blocks, weathered grey and brown stone, overgrown patches, daytime, stylized fantasy RPG art, 1920x1080, no characters, open arena in center",
    enemyTypes: ["Petty Wardens", "Grudge Acolytes"],
    settlementValue: "medium",
    settlementDescription: "Stone and building materials",
    colorScheme: ["#808080", "#a0522d", "#6b8e23"],
    environment: "outdoor",
  },
  {
    id: "marsh_swamp",
    name: "Marsh Swamp Battle",
    tier: 1,
    tierName: TIER_NAMES[1],
    lore: "Sunken lowlands filled with murky water and toxic gases.",
    prompt: "Isometric top-down view of a swamp battlefield with murky brown water, scattered cypress-like dead trees, floating vegetation, misty atmosphere, eerie green glow from bioluminescent plants, oppressive damp feeling, stylized fantasy RPG art, 1920x1080, no characters",
    enemyTypes: ["Bitter Novices", "Grudge Acolytes"],
    settlementValue: "low",
    settlementDescription: "Swamp herbs and rare fungi",
    colorScheme: ["#556b2f", "#8b4513", "#2f4f4f"],
    environment: "aquatic",
  },
  {
    id: "destroyed_settlement",
    name: "Destroyed Settlement Ruins",
    tier: 2,
    tierName: TIER_NAMES[2],
    lore: "A faction's attempt to build on conquered territory, now burned and abandoned.",
    prompt: "Isometric top-down view of a partially destroyed settlement with burnt wooden buildings, broken walls, ash scattered everywhere, a central plaza with a destroyed fountain, overturned carts, scorch marks on ground, smoke trails, grey-brown color palette, desolation mixed with past civilization, stylized fantasy RPG art, 1920x1080, no characters",
    enemyTypes: ["Resentment Knights", "Scorn Mages", "Sorrow Priests"],
    settlementValue: "high",
    settlementDescription: "Reclamation resources, faction prestige",
    colorScheme: ["#696969", "#a52a2a", "#2f2f2f"],
    environment: "outdoor",
  },
  {
    id: "volcanic_plain",
    name: "Volcanic Plain Crater",
    tier: 2,
    tierName: TIER_NAMES[2],
    lore: "Scarred earth where geothermal activity hints at the Worldboard's broken state.",
    prompt: "Isometric top-down view of a volcanic plain with dark black and red rock formations, occasional lava pools glowing orange, steam vents, cracked earth with heat distortion, ashfall from sky, barren hostile landscape, red and amber lighting, dramatic and dangerous, stylized fantasy RPG art, 1920x1080, no characters",
    enemyTypes: ["Resentment Knights", "Scorn Mages"],
    settlementValue: "very_high",
    settlementDescription: "Gould Flame shard proximity, geothermal power",
    imagePath: "/sprites/arenas/demonic-ritual-arena.png",
    colorScheme: ["#ff4500", "#8b0000", "#2f2f2f"],
    environment: "volcanic",
  },
  {
    id: "obsidian_cavern",
    name: "Obsidian Cavern Interior",
    tier: 2,
    tierName: TIER_NAMES[2],
    lore: "Deep underground chambers formed by the Sundering, glowing with raw magical energy.",
    prompt: "Isometric top-down view of a crystal cavern with massive black obsidian formations jutting from walls and floor, purple and blue magical light emanating from runes, glowing crystal nodes, smooth reflective surfaces, otherworldly beauty mixed with alien danger, cool blue-purple lighting, stylized fantasy RPG art, 1920x1080, no characters",
    enemyTypes: ["Scorn Mages", "Resentment Knights"],
    settlementValue: "high",
    settlementDescription: "Magical resources, artifact components",
    colorScheme: ["#4b0082", "#0000cd", "#1a1a2e"],
    environment: "underground",
  },
  {
    id: "riverbed_canyon",
    name: "Riverbed Canyon Battle",
    tier: 2,
    tierName: TIER_NAMES[2],
    lore: "Ancient waterways now flowing with minerals and toxic runoff from the Sundering.",
    prompt: "Isometric top-down view of a deep canyon with a dark river running through, steep rocky walls, narrow battle space forcing close quarters, occasional waterfalls visible in background, wet stone, mist and spray, dangerous terrain with natural barriers, cool blue and grey tones, stylized fantasy RPG art, 1920x1080, no characters",
    enemyTypes: ["Resentment Knights", "Sorrow Priests"],
    settlementValue: "medium",
    settlementDescription: "Water and minerals",
    colorScheme: ["#4682b4", "#708090", "#2f4f4f"],
    environment: "aquatic",
  },
  {
    id: "ancient_temple",
    name: "Ancient Temple Complex",
    tier: 3,
    tierName: TIER_NAMES[3],
    lore: "Worship site of one of the Five Gods, still resonating with divine power.",
    prompt: "Isometric top-down view of grand temple ruins with towering marble columns, ceremonial platform in center with divine runes still glowing faintly, statues of godly figures, intricate stonework, overgrown but still majestic, golden and white light highlighting sacred geometry, sense of ancient power, stylized fantasy RPG art, 1920x1080, no characters",
    enemyTypes: ["Wrath Warriors", "Malice Sorcerers", "Grace Clerics"],
    boss: "Herald of First Grudge",
    settlementValue: "extreme",
    settlementDescription: "Divine blessing, artifact vault",
    imagePath: "/sprites/arenas/jungle-temple-arena.png",
    colorScheme: ["#ffd700", "#f5f5dc", "#228b22"],
    environment: "outdoor",
  },
  {
    id: "floating_island",
    name: "Floating Island Arena",
    tier: 3,
    tierName: TIER_NAMES[3],
    lore: "Island suspended impossibly above the void during the Sundering's chaos.",
    prompt: "Isometric top-down view of a floating island suspended high above clouds, edges showing sheer cliffs dropping into white mist, floating stone platforms, sky visible underneath creating sense of vertigo, magical energy holding it aloft visible as subtle glowing lines, bright daylight, dangerous and awe-inspiring, stylized fantasy RPG art, 1920x1080, no characters",
    enemyTypes: ["Wrath Warriors", "Malice Sorcerers"],
    boss: "Mini-boss with flight abilities",
    settlementValue: "very_high",
    settlementDescription: "Sky-touching settlement, prophecy significance",
    colorScheme: ["#87ceeb", "#f5f5f5", "#6b8e23"],
    environment: "floating",
  },
  {
    id: "storm_ruins",
    name: "Storm-Torn Ruins",
    tier: 3,
    tierName: TIER_NAMES[3],
    lore: "Battlefield where divine magic clashes, creating unnatural weather.",
    prompt: "Isometric top-down view of ruined landscape torn by perpetual magical storm, dark purple-grey clouds overhead with lightning crackling, scattered stone debris, wind-sculpted rocks, eerie green and purple glow from magical discharge, turbulent energy visible, dramatic and chaotic, stylized fantasy RPG art, 1920x1080, no characters",
    enemyTypes: ["Malice Sorcerers", "Wrath Warriors"],
    boss: "Herald encounters common",
    settlementValue: "high",
    settlementDescription: "Magical convergence point",
    colorScheme: ["#4b0082", "#2f4f4f", "#9400d3"],
    environment: "outdoor",
  },
  {
    id: "sunken_amphitheater",
    name: "Sunken Amphitheater",
    tier: 3,
    tierName: TIER_NAMES[3],
    lore: "Grand forum from before the Sundering, now partially submerged and corrupted.",
    prompt: "Isometric top-down view of a sunken amphitheater with stepped stone seating tiers, dark water pooling in the lowest level, some stairs still dry and usable, towering walls creating arena feeling, echoing chamber, moss and algae growth, mysterious and claustrophobic yet grand, blue-grey and green tones, stylized fantasy RPG art, 1920x1080, no characters",
    enemyTypes: ["Grace Clerics", "Wrath Warriors"],
    settlementValue: "medium",
    settlementDescription: "Acoustic power for divine communion",
    colorScheme: ["#708090", "#2f4f4f", "#556b2f"],
    environment: "aquatic",
  },
  {
    id: "gods_sanctum",
    name: "God's Sanctum Ruins",
    tier: 4,
    tierName: TIER_NAMES[4],
    lore: "A god's sanctuary directly manifesting in the mortal realm, partially destroyed.",
    prompt: "Isometric top-down view of a sacred sanctuary with ethereal architecture, golden and white marble, divine geometric patterns on floor, magical barriers (some broken), celestial light pouring from unseen source, sense of immense power, glowing runes and symbols covering every surface, awe-inspiring and dangerous, stylized fantasy RPG art, 1920x1080, no characters",
    enemyTypes: ["God-Touched Paladins", "Aspect Warlocks", "Eternal Oracles"],
    boss: "Aspect Avatar guaranteed",
    settlementValue: "extreme",
    settlementDescription: "Becomes holy city if taken",
    colorScheme: ["#ffd700", "#f5f5dc", "#4169e1"],
    environment: "indoor",
  },
  {
    id: "sundered_rift",
    name: "Sundered Rift Battlefield",
    tier: 4,
    tierName: TIER_NAMES[4],
    lore: "Where the Worldboard literally fractured, creating impossible geography.",
    prompt: "Isometric top-down view of a torn landscape with massive chasms and floating stone fragments suspended at odd angles, impossible geometry, thin bridges of raw magic connecting platforms, void visible beneath, multicolored magical light, severe danger and alien beauty, stylized fantasy RPG art, 1920x1080, no characters",
    enemyTypes: ["Aspect Warlocks", "Eternal Oracles"],
    boss: "Aspect Avatar",
    settlementValue: "extreme",
    settlementDescription: "Close to Gould Flame shard",
    colorScheme: ["#9400d3", "#ff6347", "#4169e1"],
    environment: "floating",
  },
  {
    id: "ritual_circle",
    name: "Ritual Circle of Power",
    tier: 4,
    tierName: TIER_NAMES[4],
    lore: "Massive ceremonial site where multiple factions attempt to channel divine energy.",
    prompt: "Isometric top-down view of concentric ritual circles carved into stone, glowing runes forming pentagrams and cosmic symbols, magical energy visible as swirling lights around the circle, obsidian obelisks marking cardinal points, center platform elevated and sacred, mystical and intense, stylized fantasy RPG art, 1920x1080, no characters",
    enemyTypes: ["Eternal Oracles", "Aspect Warlocks"],
    boss: "Aspect Avatar often appears here",
    settlementValue: "very_high",
    settlementDescription: "Ritual power source",
    colorScheme: ["#ffd700", "#4b0082", "#1a1a2e"],
    environment: "outdoor",
  },
  {
    id: "molten_abyss",
    name: "Molten Abyss Platform",
    tier: 4,
    tierName: TIER_NAMES[4],
    lore: "Island hovering above absolute volcanic devastation, showing the Sundering's fury.",
    prompt: "Isometric top-down view of a stone platform suspended above churning molten lava, intense heat distortion visible, magma fountains in background, glowing orange and red everywhere, ash falling constantly, platform edges showing lava flowing beneath partially transparent stone, extreme danger and harsh beauty, stylized fantasy RPG art, 1920x1080, no characters",
    enemyTypes: ["God-Touched Paladins", "Aspect Warlocks"],
    boss: "High-tier boss common",
    settlementValue: "extreme",
    settlementDescription: "Direct Gould Flame access",
    colorScheme: ["#ff4500", "#8b0000", "#ff6347"],
    environment: "volcanic",
  },
  {
    id: "legion_stronghold",
    name: "Legion Stronghold (The Obsidian Throne)",
    tier: 5,
    tierName: TIER_NAMES[5],
    lore: "The Legion's primary manifestation point, corrupted stone palace born from volcanic depths.",
    prompt: "Isometric top-down view of a massive obsidian fortress with sharp geometric angles, molten lava channels forming rune patterns, massive red-glowing rune circle in center, black and red color scheme, towering obsidian pillars, corrupted architecture that defies natural formation, ash falling, hellish atmosphere, stylized fantasy RPG art, 1920x1080, no characters",
    enemyTypes: ["Rancor Eternal", "Spite Archon", "Vengeance Ascendant"],
    boss: "Aspect Avatar or Legion Primordial",
    settlementValue: "special",
    settlementDescription: "Cannot be settled; Legion stronghold must be conquered",
    colorScheme: ["#1a1a1a", "#8b0000", "#ff4500"],
    environment: "volcanic",
  },
  {
    id: "unshaken_land",
    name: "The Unshaken Land (Entry Gate)",
    tier: 5,
    tierName: TIER_NAMES[5],
    lore: "The single untouched place from the old world, shielded by divine magic.",
    prompt: "Isometric top-down view of a pristine emerald meadow with impossible clarity and beauty, crystalline protective dome barrier barely visible overhead, golden eternal light never quite touching ground (always twilight), geometric crystalline formations of pure magic, perfect symmetry, no wear or decay, serene yet alien, overwhelming sense of being elsewhere, stylized fantasy RPG art, 1920x1080, no characters",
    enemyTypes: ["Primordial entities", "Silent Observer manifestations"],
    boss: "The Primordial Trinity or Silent Observer manifestation",
    settlementValue: "special",
    settlementDescription: "Victory condition reached",
    colorScheme: ["#50c878", "#ffd700", "#e6e6fa"],
    environment: "outdoor",
  },
  {
    id: "primordial_abyss",
    name: "The Primordial Abyss (Deep World)",
    tier: 5,
    tierName: TIER_NAMES[5],
    lore: "The deepest part of the Worldboard before the Sundering, where The Legion was born.",
    prompt: "Isometric top-down view of an alien underground realm with impossible crystalline formations, bioluminescent organisms and fungi creating otherworldly light, dark purples and blues with sudden bright glowing nodes, reality seems unstable, architecture from before known time, sense of bottomless depth, ancient and terrifying, stylized fantasy RPG art, 1920x1080, no characters",
    enemyTypes: ["Primordial Legion entities", "Awakened ancient beings"],
    boss: "The Primordial Legion (final or near-final boss)",
    settlementValue: "special",
    settlementDescription: "Unreachable without special quest completion",
    colorScheme: ["#4b0082", "#00ced1", "#9932cc"],
    environment: "underground",
  },
  {
    id: "convergence_point",
    name: "The Convergence Point (Island Center)",
    tier: 5,
    tierName: TIER_NAMES[5],
    lore: "The exact geographic center of the archipelago where all factions race toward.",
    prompt: "Isometric top-down view of a maelstrom of clashing forces: floating island fragments colliding in slow motion, multiple weather systems visible at once (lightning, ash, rain), energy vortex in center, factions' settlements visible in distance all converging, reality fracturing visibly, sense of inevitability and cosmic significance, multicolored chaotic beauty, stylized fantasy RPG art, 1920x1080, no characters",
    enemyTypes: ["All faction types", "Legion forces", "Neutrals"],
    boss: "Variable based on player choices",
    settlementValue: "special",
    settlementDescription: "The final battleground",
    colorScheme: ["#ff6347", "#4169e1", "#ffd700", "#9400d3"],
    environment: "floating",
  },
];

export function getTieredArenasByTier(tier: ArenaTier): TieredArena[] {
  return TIERED_ARENAS.filter((arena) => arena.tier === tier);
}

export function getTieredArenaById(id: string): TieredArena | undefined {
  return TIERED_ARENAS.find((arena) => arena.id === id);
}

export function getArenasForCombatLevel(level: number): TieredArena[] {
  if (level <= 5) return getTieredArenasByTier(1);
  if (level <= 10) return [...getTieredArenasByTier(1), ...getTieredArenasByTier(2)];
  if (level <= 15) return [...getTieredArenasByTier(2), ...getTieredArenasByTier(3)];
  if (level <= 18) return [...getTieredArenasByTier(3), ...getTieredArenasByTier(4)];
  return [...getTieredArenasByTier(4), ...getTieredArenasByTier(5)];
}

export function getRandomTieredArena(tier?: ArenaTier): TieredArena {
  const arenas = tier ? getTieredArenasByTier(tier) : TIERED_ARENAS;
  return arenas[Math.floor(Math.random() * arenas.length)];
}

export function getArenasWithBoss(tier?: ArenaTier): TieredArena[] {
  const arenas = tier ? getTieredArenasByTier(tier) : TIERED_ARENAS;
  return arenas.filter((arena) => arena.boss);
}
