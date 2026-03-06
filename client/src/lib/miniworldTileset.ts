/**
 * MiniWorld Tileset Configuration
 * Uses the MiniWorld sprites by Shade for dungeon rendering
 */

export const MINIWORLD_TILE_SIZE = 16;
export const MINIWORLD_RENDER_SCALE = 2;
export const MINIWORLD_SCALED_TILE_SIZE = MINIWORLD_TILE_SIZE * MINIWORLD_RENDER_SCALE;

export interface MiniWorldTileset {
  id: string;
  name: string;
  groundImage: string;
  groundTileWidth: number;
  groundTileHeight: number;
  groundColumns: number;
}

export interface MiniWorldMonsterSprite {
  id: string;
  name: string;
  imagePath: string;
  frameWidth: number;
  frameHeight: number;
  animations: {
    idle: { row: number; frames: number; speed: number };
    walk: { row: number; frames: number; speed: number };
    attack: { row: number; frames: number; speed: number };
  };
}

export const MINIWORLD_TILESETS: Record<string, MiniWorldTileset> = {
  grass: {
    id: 'grass',
    name: 'Grasslands',
    groundImage: '/sprites/miniworld/Ground/Grass.png',
    groundTileWidth: 16,
    groundTileHeight: 16,
    groundColumns: 16
  },
  winter: {
    id: 'winter',
    name: 'Winter Wastes',
    groundImage: '/sprites/miniworld/Ground/Winter.png',
    groundTileWidth: 16,
    groundTileHeight: 16,
    groundColumns: 16
  },
  deadland: {
    id: 'deadland',
    name: 'Dead Lands',
    groundImage: '/sprites/miniworld/Ground/DeadGrass.png',
    groundTileWidth: 16,
    groundTileHeight: 16,
    groundColumns: 16
  },
  shore: {
    id: 'shore',
    name: 'Coastal',
    groundImage: '/sprites/miniworld/Ground/Shore.png',
    groundTileWidth: 16,
    groundTileHeight: 16,
    groundColumns: 16
  },
  cliff: {
    id: 'cliff',
    name: 'Cliffside',
    groundImage: '/sprites/miniworld/Ground/Cliff.png',
    groundTileWidth: 16,
    groundTileHeight: 16,
    groundColumns: 16
  }
};

export const MINIWORLD_MONSTERS: Record<string, MiniWorldMonsterSprite> = {
  skeleton: {
    id: 'skeleton',
    name: 'Skeleton Soldier',
    imagePath: '/sprites/miniworld/Characters/Monsters/Undead/Skeleton-Soldier.png',
    frameWidth: 16,
    frameHeight: 16,
    animations: {
      idle: { row: 0, frames: 4, speed: 300 },
      walk: { row: 1, frames: 4, speed: 200 },
      attack: { row: 2, frames: 4, speed: 100 }
    }
  },
  necromancer: {
    id: 'necromancer',
    name: 'Necromancer',
    imagePath: '/sprites/miniworld/Characters/Monsters/Undead/Necromancer.png',
    frameWidth: 16,
    frameHeight: 16,
    animations: {
      idle: { row: 0, frames: 4, speed: 300 },
      walk: { row: 1, frames: 4, speed: 200 },
      attack: { row: 2, frames: 4, speed: 100 }
    }
  },
  goblin_archer: {
    id: 'goblin_archer',
    name: 'Goblin Archer',
    imagePath: '/sprites/miniworld/Characters/Monsters/Orcs/ArcherGoblin.png',
    frameWidth: 16,
    frameHeight: 16,
    animations: {
      idle: { row: 0, frames: 4, speed: 300 },
      walk: { row: 1, frames: 4, speed: 200 },
      attack: { row: 2, frames: 4, speed: 100 }
    }
  },
  goblin_club: {
    id: 'goblin_club',
    name: 'Goblin Clubber',
    imagePath: '/sprites/miniworld/Characters/Monsters/Orcs/ClubGoblin.png',
    frameWidth: 16,
    frameHeight: 16,
    animations: {
      idle: { row: 0, frames: 4, speed: 300 },
      walk: { row: 1, frames: 4, speed: 200 },
      attack: { row: 2, frames: 4, speed: 100 }
    }
  },
  goblin_spear: {
    id: 'goblin_spear',
    name: 'Goblin Spearman',
    imagePath: '/sprites/miniworld/Characters/Monsters/Orcs/SpearGoblin.png',
    frameWidth: 16,
    frameHeight: 16,
    animations: {
      idle: { row: 0, frames: 4, speed: 300 },
      walk: { row: 1, frames: 4, speed: 200 },
      attack: { row: 2, frames: 4, speed: 100 }
    }
  },
  orc: {
    id: 'orc',
    name: 'Orc Warrior',
    imagePath: '/sprites/miniworld/Characters/Monsters/Orcs/Orc.png',
    frameWidth: 16,
    frameHeight: 16,
    animations: {
      idle: { row: 0, frames: 4, speed: 300 },
      walk: { row: 1, frames: 4, speed: 200 },
      attack: { row: 2, frames: 4, speed: 100 }
    }
  },
  orc_mage: {
    id: 'orc_mage',
    name: 'Orc Mage',
    imagePath: '/sprites/miniworld/Characters/Monsters/Orcs/OrcMage.png',
    frameWidth: 16,
    frameHeight: 16,
    animations: {
      idle: { row: 0, frames: 4, speed: 300 },
      walk: { row: 1, frames: 4, speed: 200 },
      attack: { row: 2, frames: 4, speed: 100 }
    }
  },
  orc_shaman: {
    id: 'orc_shaman',
    name: 'Orc Shaman',
    imagePath: '/sprites/miniworld/Characters/Monsters/Orcs/OrcShaman.png',
    frameWidth: 16,
    frameHeight: 16,
    animations: {
      idle: { row: 0, frames: 4, speed: 300 },
      walk: { row: 1, frames: 4, speed: 200 },
      attack: { row: 2, frames: 4, speed: 100 }
    }
  },
  minotaur: {
    id: 'minotaur',
    name: 'Minotaur',
    imagePath: '/sprites/miniworld/Characters/Monsters/Orcs/Minotaur.png',
    frameWidth: 16,
    frameHeight: 16,
    animations: {
      idle: { row: 0, frames: 4, speed: 300 },
      walk: { row: 1, frames: 4, speed: 200 },
      attack: { row: 2, frames: 4, speed: 100 }
    }
  },
  demon_red: {
    id: 'demon_red',
    name: 'Red Demon',
    imagePath: '/sprites/miniworld/Characters/Monsters/Demons/RedDemon.png',
    frameWidth: 16,
    frameHeight: 16,
    animations: {
      idle: { row: 0, frames: 4, speed: 300 },
      walk: { row: 1, frames: 4, speed: 200 },
      attack: { row: 2, frames: 4, speed: 100 }
    }
  },
  demon_purple: {
    id: 'demon_purple',
    name: 'Purple Demon',
    imagePath: '/sprites/miniworld/Characters/Monsters/Demons/PurpleDemon.png',
    frameWidth: 16,
    frameHeight: 16,
    animations: {
      idle: { row: 0, frames: 4, speed: 300 },
      walk: { row: 1, frames: 4, speed: 200 },
      attack: { row: 2, frames: 4, speed: 100 }
    }
  },
  demon_armoured: {
    id: 'demon_armoured',
    name: 'Armoured Demon',
    imagePath: '/sprites/miniworld/Characters/Monsters/Demons/ArmouredRedDemon.png',
    frameWidth: 16,
    frameHeight: 16,
    animations: {
      idle: { row: 0, frames: 4, speed: 300 },
      walk: { row: 1, frames: 4, speed: 200 },
      attack: { row: 2, frames: 4, speed: 100 }
    }
  },
  dragon_red: {
    id: 'dragon_red',
    name: 'Red Dragon',
    imagePath: '/sprites/miniworld/Characters/Monsters/Dragons/RedDragon.png',
    frameWidth: 16,
    frameHeight: 16,
    animations: {
      idle: { row: 0, frames: 4, speed: 300 },
      walk: { row: 1, frames: 4, speed: 200 },
      attack: { row: 2, frames: 4, speed: 100 }
    }
  },
  dragon_black: {
    id: 'dragon_black',
    name: 'Black Dragon',
    imagePath: '/sprites/miniworld/Characters/Monsters/Dragons/BlackDragon.png',
    frameWidth: 16,
    frameHeight: 16,
    animations: {
      idle: { row: 0, frames: 4, speed: 300 },
      walk: { row: 1, frames: 4, speed: 200 },
      attack: { row: 2, frames: 4, speed: 100 }
    }
  },
  dragon_blue: {
    id: 'dragon_blue',
    name: 'Blue Dragon',
    imagePath: '/sprites/miniworld/Characters/Monsters/Dragons/BlueDragon.png',
    frameWidth: 16,
    frameHeight: 16,
    animations: {
      idle: { row: 0, frames: 4, speed: 300 },
      walk: { row: 1, frames: 4, speed: 200 },
      attack: { row: 2, frames: 4, speed: 100 }
    }
  },
  dragon_white: {
    id: 'dragon_white',
    name: 'White Dragon',
    imagePath: '/sprites/miniworld/Characters/Monsters/Dragons/WhiteDragon.png',
    frameWidth: 16,
    frameHeight: 16,
    animations: {
      idle: { row: 0, frames: 4, speed: 300 },
      walk: { row: 1, frames: 4, speed: 200 },
      attack: { row: 2, frames: 4, speed: 100 }
    }
  },
  yeti: {
    id: 'yeti',
    name: 'Yeti',
    imagePath: '/sprites/miniworld/Characters/Monsters/Frostborn/Yeti.png',
    frameWidth: 16,
    frameHeight: 16,
    animations: {
      idle: { row: 0, frames: 4, speed: 300 },
      walk: { row: 1, frames: 4, speed: 200 },
      attack: { row: 2, frames: 4, speed: 100 }
    }
  },
  wendigo: {
    id: 'wendigo',
    name: 'Wendigo',
    imagePath: '/sprites/miniworld/Characters/Monsters/Frostborn/Wendigo.png',
    frameWidth: 16,
    frameHeight: 16,
    animations: {
      idle: { row: 0, frames: 4, speed: 300 },
      walk: { row: 1, frames: 4, speed: 200 },
      attack: { row: 2, frames: 4, speed: 100 }
    }
  },
  mammoth: {
    id: 'mammoth',
    name: 'Mammoth',
    imagePath: '/sprites/miniworld/Characters/Monsters/Frostborn/Mammoth.png',
    frameWidth: 16,
    frameHeight: 16,
    animations: {
      idle: { row: 0, frames: 4, speed: 300 },
      walk: { row: 1, frames: 4, speed: 200 },
      attack: { row: 2, frames: 4, speed: 100 }
    }
  },
  giant_crab: {
    id: 'giant_crab',
    name: 'Giant Crab',
    imagePath: '/sprites/miniworld/Characters/Monsters/GiantAnimals/GiantCrab.png',
    frameWidth: 16,
    frameHeight: 16,
    animations: {
      idle: { row: 0, frames: 4, speed: 300 },
      walk: { row: 1, frames: 4, speed: 200 },
      attack: { row: 2, frames: 4, speed: 100 }
    }
  },
  slime_green: {
    id: 'slime_green',
    name: 'Green Slime',
    imagePath: '/sprites/miniworld/Characters/Monsters/Slimes/Slime.png',
    frameWidth: 16,
    frameHeight: 16,
    animations: {
      idle: { row: 0, frames: 4, speed: 300 },
      walk: { row: 1, frames: 4, speed: 200 },
      attack: { row: 2, frames: 4, speed: 100 }
    }
  },
  slime_blue: {
    id: 'slime_blue',
    name: 'Blue Slime',
    imagePath: '/sprites/miniworld/Characters/Monsters/Slimes/SlimeBlue.png',
    frameWidth: 16,
    frameHeight: 16,
    animations: {
      idle: { row: 0, frames: 4, speed: 300 },
      walk: { row: 1, frames: 4, speed: 200 },
      attack: { row: 2, frames: 4, speed: 100 }
    }
  },
  king_slime_green: {
    id: 'king_slime_green',
    name: 'King Slime',
    imagePath: '/sprites/miniworld/Characters/Monsters/Slimes/KingSlimeGreen.png',
    frameWidth: 16,
    frameHeight: 16,
    animations: {
      idle: { row: 0, frames: 4, speed: 300 },
      walk: { row: 1, frames: 4, speed: 200 },
      attack: { row: 2, frames: 4, speed: 100 }
    }
  },
  pirate_captain: {
    id: 'pirate_captain',
    name: 'Pirate Captain',
    imagePath: '/sprites/miniworld/Characters/Monsters/Pirates/PirateCaptain.png',
    frameWidth: 16,
    frameHeight: 16,
    animations: {
      idle: { row: 0, frames: 4, speed: 300 },
      walk: { row: 1, frames: 4, speed: 200 },
      attack: { row: 2, frames: 4, speed: 100 }
    }
  },
  pirate_grunt: {
    id: 'pirate_grunt',
    name: 'Pirate Grunt',
    imagePath: '/sprites/miniworld/Characters/Monsters/Pirates/PirateGrunt.png',
    frameWidth: 16,
    frameHeight: 16,
    animations: {
      idle: { row: 0, frames: 4, speed: 300 },
      walk: { row: 1, frames: 4, speed: 200 },
      attack: { row: 2, frames: 4, speed: 100 }
    }
  },
  pirate_gunner: {
    id: 'pirate_gunner',
    name: 'Pirate Gunner',
    imagePath: '/sprites/miniworld/Characters/Monsters/Pirates/PirateGunner.png',
    frameWidth: 16,
    frameHeight: 16,
    animations: {
      idle: { row: 0, frames: 4, speed: 300 },
      walk: { row: 1, frames: 4, speed: 200 },
      attack: { row: 2, frames: 4, speed: 100 }
    }
  }
};

export const MINIWORLD_BUILDINGS: Record<string, { imagePath: string; name: string }> = {
  castle: { imagePath: '/sprites/miniworld/Buildings/Enemy/Mausoleum.png', name: 'Dark Mausoleum' },
  barracks_red: { imagePath: '/sprites/miniworld/Buildings/Red/RedBarracks.png', name: 'Red Barracks' },
  barracks_purple: { imagePath: '/sprites/miniworld/Buildings/Purple/PurpleBarracks.png', name: 'Purple Barracks' },
  keep_red: { imagePath: '/sprites/miniworld/Buildings/Red/RedKeep.png', name: 'Red Keep' },
  keep_purple: { imagePath: '/sprites/miniworld/Buildings/Purple/PurpleKeep.png', name: 'Purple Keep' },
  tower_red: { imagePath: '/sprites/miniworld/Buildings/Red/RedTower.png', name: 'Red Tower' },
  tower_purple: { imagePath: '/sprites/miniworld/Buildings/Purple/PurpleTower.png', name: 'Purple Tower' },
  chapel_red: { imagePath: '/sprites/miniworld/Buildings/Red/RedChapels.png', name: 'Red Chapel' },
  chapel_purple: { imagePath: '/sprites/miniworld/Buildings/Purple/PurpleChapels.png', name: 'Purple Chapel' },
  tavern_wood: { imagePath: '/sprites/miniworld/Buildings/Wood/Taverns.png', name: 'Tavern' },
  house_wood: { imagePath: '/sprites/miniworld/Buildings/Wood/Houses.png', name: 'House' },
  hut_wood: { imagePath: '/sprites/miniworld/Buildings/Wood/Huts.png', name: 'Hut' },
  workshop_wood: { imagePath: '/sprites/miniworld/Buildings/Wood/Workshops.png', name: 'Workshop' },
  cave: { imagePath: '/sprites/miniworld/Buildings/Wood/CaveV2.png', name: 'Cave Entrance' }
};

export const MINIWORLD_NATURE: Record<string, { imagePath: string; name: string }> = {
  trees: { imagePath: '/sprites/miniworld/Nature/Trees.png', name: 'Trees' },
  pine_trees: { imagePath: '/sprites/miniworld/Nature/PineTrees.png', name: 'Pine Trees' },
  dead_trees: { imagePath: '/sprites/miniworld/Nature/DeadTrees.png', name: 'Dead Trees' },
  winter_trees: { imagePath: '/sprites/miniworld/Nature/WinterTrees.png', name: 'Winter Trees' },
  rocks: { imagePath: '/sprites/miniworld/Nature/Rocks.png', name: 'Rocks' },
  cactus: { imagePath: '/sprites/miniworld/Nature/Cactus.png', name: 'Cactus' },
  coconut_trees: { imagePath: '/sprites/miniworld/Nature/CoconutTrees.png', name: 'Coconut Trees' },
  wheatfield: { imagePath: '/sprites/miniworld/Nature/Wheatfield.png', name: 'Wheat Field' }
};

export const MINIWORLD_OBJECTS: Record<string, { imagePath: string; name: string }> = {
  chests: { imagePath: '/sprites/miniworld/Miscellaneous/Chests.png', name: 'Treasure Chests' },
  portal: { imagePath: '/sprites/miniworld/Miscellaneous/Portal.png', name: 'Portal' },
  tombstones: { imagePath: '/sprites/miniworld/Miscellaneous/Tombstones.png', name: 'Tombstones' },
  signs: { imagePath: '/sprites/miniworld/Miscellaneous/Signs.png', name: 'Signs' },
  well: { imagePath: '/sprites/miniworld/Miscellaneous/Well.png', name: 'Well' },
  quest_board: { imagePath: '/sprites/miniworld/Miscellaneous/QuestBoard.png', name: 'Quest Board' }
};

export const MINIWORLD_SOLDIERS: Record<string, { imagePath: string; name: string }> = {
  swordsman_red: { imagePath: '/sprites/miniworld/Characters/Soldiers/Melee/RedMelee/SwordsmanRed.png', name: 'Red Swordsman' },
  swordsman_purple: { imagePath: '/sprites/miniworld/Characters/Soldiers/Melee/PurpleMelee/SwordsmanPurple.png', name: 'Purple Swordsman' },
  axeman_red: { imagePath: '/sprites/miniworld/Characters/Soldiers/Melee/RedMelee/AxemanRed.png', name: 'Red Axeman' },
  axeman_purple: { imagePath: '/sprites/miniworld/Characters/Soldiers/Melee/PurpleMelee/AxemanPurple.png', name: 'Purple Axeman' },
  spearman_red: { imagePath: '/sprites/miniworld/Characters/Soldiers/Melee/RedMelee/SpearmanRed.png', name: 'Red Spearman' },
  spearman_purple: { imagePath: '/sprites/miniworld/Characters/Soldiers/Melee/PurpleMelee/SpearmanPurple.png', name: 'Purple Spearman' },
  assassin_red: { imagePath: '/sprites/miniworld/Characters/Soldiers/Melee/RedMelee/AssasinRed.png', name: 'Red Assassin' },
  assassin_purple: { imagePath: '/sprites/miniworld/Characters/Soldiers/Melee/PurpleMelee/AssasinPurple.png', name: 'Purple Assassin' },
  bowman_red: { imagePath: '/sprites/miniworld/Characters/Soldiers/Ranged/RedRanged/BowmanRed.png', name: 'Red Bowman' },
  bowman_purple: { imagePath: '/sprites/miniworld/Characters/Soldiers/Ranged/PurpleRanged/BowmanPurple.png', name: 'Purple Bowman' },
  mage_red: { imagePath: '/sprites/miniworld/Characters/Soldiers/Ranged/RedRanged/MageRed.png', name: 'Red Mage' },
  mage_purple: { imagePath: '/sprites/miniworld/Characters/Soldiers/Ranged/PurpleRanged/MagePurple.png', name: 'Purple Mage' },
  knight_red: { imagePath: '/sprites/miniworld/Characters/Soldiers/Mounted/RedKnight.png', name: 'Red Knight' },
  knight_purple: { imagePath: '/sprites/miniworld/Characters/Soldiers/Mounted/PurpleKnight.png', name: 'Purple Knight' }
};

export const MINIWORLD_CHAMPIONS: Record<string, { imagePath: string; name: string }> = {
  arthax: { imagePath: '/sprites/miniworld/Characters/Champions/Arthax.png', name: 'Arthax' },
  borg: { imagePath: '/sprites/miniworld/Characters/Champions/Börg.png', name: 'Börg' },
  gangblanc: { imagePath: '/sprites/miniworld/Characters/Champions/Gangblanc.png', name: 'Gangblanc' },
  grum: { imagePath: '/sprites/miniworld/Characters/Champions/Grum.png', name: 'Grum' },
  kanji: { imagePath: '/sprites/miniworld/Characters/Champions/Kanji.png', name: 'Kanji' },
  katan: { imagePath: '/sprites/miniworld/Characters/Champions/Katan.png', name: 'Katan' },
  okomo: { imagePath: '/sprites/miniworld/Characters/Champions/Okomo.png', name: 'Okomo' },
  zhinja: { imagePath: '/sprites/miniworld/Characters/Champions/Zhinja.png', name: 'Zhinja' }
};

export const ORC_ISLAND_BUILDINGS: Record<string, { imagePath: string; name: string; category: 'main' | 'military' | 'resource' | 'decoration' }> = {
  orc_war_camp: { imagePath: '/sprites/miniworld/Buildings/Enemy/Mausoleum.png', name: 'Orc War Camp', category: 'main' },
  orc_barracks: { imagePath: '/sprites/miniworld/Buildings/Red/RedBarracks.png', name: 'Orc Barracks', category: 'military' },
  orc_tower: { imagePath: '/sprites/miniworld/Buildings/Red/RedTower.png', name: 'Orc Watchtower', category: 'military' },
  orc_hut: { imagePath: '/sprites/miniworld/Buildings/Wood/Huts.png', name: 'Orc Hut', category: 'resource' },
  orc_workshop: { imagePath: '/sprites/miniworld/Buildings/Wood/Workshops.png', name: 'Orc Forge', category: 'resource' },
  orc_cave: { imagePath: '/sprites/miniworld/Buildings/Wood/CaveV2.png', name: 'Orc Cave', category: 'main' },
  orc_tavern: { imagePath: '/sprites/miniworld/Buildings/Wood/Taverns.png', name: 'Orc Mead Hall', category: 'decoration' }
};

export const ORC_ISLAND_DECORATION: Record<string, { imagePath: string; name: string }> = {
  dead_trees: { imagePath: '/sprites/miniworld/Nature/DeadTrees.png', name: 'Dead Trees' },
  rocks: { imagePath: '/sprites/miniworld/Nature/Rocks.png', name: 'Boulders' },
  tombstones: { imagePath: '/sprites/miniworld/Miscellaneous/Tombstones.png', name: 'War Trophies' },
  skulls: { imagePath: '/sprites/miniworld/Miscellaneous/Chests.png', name: 'Loot Pile' }
};

export function getOrcIslandBuildings() {
  return ORC_ISLAND_BUILDINGS;
}

export function getOrcIslandDecorations() {
  return ORC_ISLAND_DECORATION;
}

export function getMonsterSpriteForId(monsterId: string): MiniWorldMonsterSprite | null {
  const mapping: Record<string, string> = {
    'monster_skeleton': 'skeleton',
    'monster_skeleton_archer': 'skeleton',
    'monster_zombie': 'necromancer',
    'monster_goblin': 'goblin_club',
    'monster_goblin_archer': 'goblin_archer',
    'monster_goblin_shaman': 'orc_shaman',
    'monster_orc_warrior': 'orc',
    'monster_orc_berserker': 'orc',
    'monster_shadow_stalker': 'demon_purple',
    'monster_frost_elemental': 'yeti',
    'monster_fire_elemental': 'demon_red',
    'monster_wraith': 'necromancer',
    'monster_demon_grunt': 'demon_red',
    'monster_demon_knight': 'demon_armoured',
    'monster_boss_lich': 'necromancer',
    'monster_boss_dragon': 'dragon_red',
    'monster_boss_demon_lord': 'demon_armoured'
  };
  
  const spriteId = mapping[monsterId];
  return spriteId ? MINIWORLD_MONSTERS[spriteId] : null;
}

export function getFactionColors(factionId: string): 'red' | 'purple' | 'cyan' | 'lime' {
  switch (factionId?.toLowerCase()) {
    case 'crusade': return 'red';
    case 'legion': return 'purple';
    case 'fabled': return 'cyan';
    default: return 'lime';
  }
}
