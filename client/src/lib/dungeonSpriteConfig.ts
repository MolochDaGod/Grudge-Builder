import { assetUrl } from "@/lib/assetConfig";
export type Direction = 'down' | 'left' | 'right' | 'up';
export type AnimationState = 'idle' | 'walk' | 'run' | 'attack' | 'hurt' | 'death';

export interface SpriteAnimation {
  frameCount: number;
  frameDuration: number;
  loop: boolean;
}

export interface DirectionalSpriteSheet {
  id: string;
  name: string;
  basePath: string;
  frameWidth: number;
  frameHeight: number;
  directions: Direction[];
  animations: Record<AnimationState, SpriteAnimation>;
  getSpritePath: (direction: Direction, animation: AnimationState) => string;
}

export interface MiniWorldSpriteSheet {
  id: string;
  name: string;
  imagePath: string;
  frameWidth: number;
  frameHeight: number;
  rowLayout: {
    idle: number;
    walk: number;
    attack: number;
  };
  directionalRowOffsets?: {
    down: number;
    left: number;
    right: number;
    up: number;
  };
  framesPerRow: number;
  animations: {
    idle: { frameDuration: number; loop: boolean };
    walk: { frameDuration: number; loop: boolean };
    attack: { frameDuration: number; loop: boolean };
  };
}

export const MINIWORLD_HERO_SPRITES: Record<string, MiniWorldSpriteSheet> = {
  swordsman_red: {
    id: 'swordsman_red',
    name: 'Red Swordsman',
    imagePath: assetUrl("/sprites/miniworld/Characters/Soldiers/Melee/RedMelee/SwordsmanRed.png"),
    frameWidth: 16,
    frameHeight: 16,
    rowLayout: { idle: 0, walk: 1, attack: 2 },
    framesPerRow: 5,
    animations: {
      idle: { frameDuration: 300, loop: true },
      walk: { frameDuration: 200, loop: true },
      attack: { frameDuration: 100, loop: false }
    }
  },
  swordsman_purple: {
    id: 'swordsman_purple',
    name: 'Purple Swordsman',
    imagePath: assetUrl("/sprites/miniworld/Characters/Soldiers/Melee/PurpleMelee/SwordsmanPurple.png"),
    frameWidth: 16,
    frameHeight: 16,
    rowLayout: { idle: 0, walk: 1, attack: 2 },
    framesPerRow: 5,
    animations: {
      idle: { frameDuration: 300, loop: true },
      walk: { frameDuration: 200, loop: true },
      attack: { frameDuration: 100, loop: false }
    }
  },
  axeman_red: {
    id: 'axeman_red',
    name: 'Red Axeman',
    imagePath: assetUrl("/sprites/miniworld/Characters/Soldiers/Melee/RedMelee/AxemanRed.png"),
    frameWidth: 16,
    frameHeight: 16,
    rowLayout: { idle: 0, walk: 1, attack: 2 },
    framesPerRow: 6,
    animations: {
      idle: { frameDuration: 300, loop: true },
      walk: { frameDuration: 200, loop: true },
      attack: { frameDuration: 100, loop: false }
    }
  },
  bowman_red: {
    id: 'bowman_red',
    name: 'Red Bowman',
    imagePath: assetUrl("/sprites/miniworld/Characters/Soldiers/Ranged/RedRanged/BowmanRed.png"),
    frameWidth: 16,
    frameHeight: 16,
    rowLayout: { idle: 0, walk: 1, attack: 2 },
    framesPerRow: 5,
    animations: {
      idle: { frameDuration: 300, loop: true },
      walk: { frameDuration: 200, loop: true },
      attack: { frameDuration: 100, loop: false }
    }
  },
  mage_red: {
    id: 'mage_red',
    name: 'Red Mage',
    imagePath: assetUrl("/sprites/miniworld/Characters/Soldiers/Ranged/RedRanged/MageRed.png"),
    frameWidth: 16,
    frameHeight: 16,
    rowLayout: { idle: 0, walk: 1, attack: 2 },
    framesPerRow: 6,
    animations: {
      idle: { frameDuration: 300, loop: true },
      walk: { frameDuration: 200, loop: true },
      attack: { frameDuration: 100, loop: false }
    }
  },
  knight_red: {
    id: 'knight_red',
    name: 'Red Knight',
    imagePath: assetUrl("/sprites/miniworld/Characters/Soldiers/Mounted/RedKnight.png"),
    frameWidth: 16,
    frameHeight: 16,
    rowLayout: { idle: 0, walk: 1, attack: 2 },
    framesPerRow: 5,
    animations: {
      idle: { frameDuration: 300, loop: true },
      walk: { frameDuration: 200, loop: true },
      attack: { frameDuration: 100, loop: false }
    }
  },
  assassin_purple: {
    id: 'assassin_purple',
    name: 'Purple Assassin',
    imagePath: assetUrl("/sprites/miniworld/Characters/Soldiers/Melee/PurpleMelee/AssasinPurple.png"),
    frameWidth: 16,
    frameHeight: 16,
    rowLayout: { idle: 0, walk: 1, attack: 2 },
    framesPerRow: 5,
    animations: {
      idle: { frameDuration: 300, loop: true },
      walk: { frameDuration: 200, loop: true },
      attack: { frameDuration: 100, loop: false }
    }
  }
};

export const MINIWORLD_MONSTER_SPRITES: Record<string, MiniWorldSpriteSheet> = {
  skeleton: {
    id: 'skeleton',
    name: 'Skeleton Soldier',
    imagePath: assetUrl("/sprites/miniworld/Characters/Monsters/Undead/Skeleton-Soldier.png"),
    frameWidth: 16,
    frameHeight: 16,
    rowLayout: { idle: 0, walk: 1, attack: 2 },
    framesPerRow: 4,
    animations: {
      idle: { frameDuration: 300, loop: true },
      walk: { frameDuration: 200, loop: true },
      attack: { frameDuration: 100, loop: false }
    }
  },
  necromancer: {
    id: 'necromancer',
    name: 'Necromancer',
    imagePath: assetUrl("/sprites/miniworld/Characters/Monsters/Undead/Necromancer.png"),
    frameWidth: 16,
    frameHeight: 16,
    rowLayout: { idle: 0, walk: 1, attack: 2 },
    framesPerRow: 4,
    animations: {
      idle: { frameDuration: 300, loop: true },
      walk: { frameDuration: 200, loop: true },
      attack: { frameDuration: 100, loop: false }
    }
  },
  goblin_archer: {
    id: 'goblin_archer',
    name: 'Goblin Archer',
    imagePath: assetUrl("/sprites/miniworld/Characters/Monsters/Orcs/ArcherGoblin.png"),
    frameWidth: 16,
    frameHeight: 16,
    rowLayout: { idle: 0, walk: 1, attack: 2 },
    framesPerRow: 4,
    animations: {
      idle: { frameDuration: 300, loop: true },
      walk: { frameDuration: 200, loop: true },
      attack: { frameDuration: 100, loop: false }
    }
  },
  goblin_club: {
    id: 'goblin_club',
    name: 'Goblin Clubber',
    imagePath: assetUrl("/sprites/miniworld/Characters/Monsters/Orcs/ClubGoblin.png"),
    frameWidth: 16,
    frameHeight: 16,
    rowLayout: { idle: 0, walk: 1, attack: 2 },
    framesPerRow: 4,
    animations: {
      idle: { frameDuration: 300, loop: true },
      walk: { frameDuration: 200, loop: true },
      attack: { frameDuration: 100, loop: false }
    }
  },
  goblin_spear: {
    id: 'goblin_spear',
    name: 'Goblin Spearman',
    imagePath: assetUrl("/sprites/miniworld/Characters/Monsters/Orcs/SpearGoblin.png"),
    frameWidth: 16,
    frameHeight: 16,
    rowLayout: { idle: 0, walk: 1, attack: 2 },
    framesPerRow: 4,
    animations: {
      idle: { frameDuration: 300, loop: true },
      walk: { frameDuration: 200, loop: true },
      attack: { frameDuration: 100, loop: false }
    }
  },
  orc: {
    id: 'orc',
    name: 'Orc Warrior',
    imagePath: assetUrl("/sprites/miniworld/Characters/Monsters/Orcs/Orc.png"),
    frameWidth: 16,
    frameHeight: 16,
    rowLayout: { idle: 0, walk: 1, attack: 2 },
    framesPerRow: 4,
    animations: {
      idle: { frameDuration: 300, loop: true },
      walk: { frameDuration: 200, loop: true },
      attack: { frameDuration: 100, loop: false }
    }
  },
  orc_mage: {
    id: 'orc_mage',
    name: 'Orc Mage',
    imagePath: assetUrl("/sprites/miniworld/Characters/Monsters/Orcs/OrcMage.png"),
    frameWidth: 16,
    frameHeight: 16,
    rowLayout: { idle: 0, walk: 1, attack: 2 },
    framesPerRow: 4,
    animations: {
      idle: { frameDuration: 300, loop: true },
      walk: { frameDuration: 200, loop: true },
      attack: { frameDuration: 100, loop: false }
    }
  },
  orc_shaman: {
    id: 'orc_shaman',
    name: 'Orc Shaman',
    imagePath: assetUrl("/sprites/miniworld/Characters/Monsters/Orcs/OrcShaman.png"),
    frameWidth: 16,
    frameHeight: 16,
    rowLayout: { idle: 0, walk: 1, attack: 2 },
    framesPerRow: 4,
    animations: {
      idle: { frameDuration: 300, loop: true },
      walk: { frameDuration: 200, loop: true },
      attack: { frameDuration: 100, loop: false }
    }
  },
  minotaur: {
    id: 'minotaur',
    name: 'Minotaur',
    imagePath: assetUrl("/sprites/miniworld/Characters/Monsters/Orcs/Minotaur.png"),
    frameWidth: 16,
    frameHeight: 16,
    rowLayout: { idle: 0, walk: 1, attack: 2 },
    framesPerRow: 4,
    animations: {
      idle: { frameDuration: 300, loop: true },
      walk: { frameDuration: 200, loop: true },
      attack: { frameDuration: 100, loop: false }
    }
  },
  demon_red: {
    id: 'demon_red',
    name: 'Red Demon',
    imagePath: assetUrl("/sprites/miniworld/Characters/Monsters/Demons/RedDemon.png"),
    frameWidth: 16,
    frameHeight: 16,
    rowLayout: { idle: 0, walk: 1, attack: 2 },
    framesPerRow: 4,
    animations: {
      idle: { frameDuration: 300, loop: true },
      walk: { frameDuration: 200, loop: true },
      attack: { frameDuration: 100, loop: false }
    }
  },
  demon_purple: {
    id: 'demon_purple',
    name: 'Purple Demon',
    imagePath: assetUrl("/sprites/miniworld/Characters/Monsters/Demons/PurpleDemon.png"),
    frameWidth: 16,
    frameHeight: 16,
    rowLayout: { idle: 0, walk: 1, attack: 2 },
    framesPerRow: 4,
    animations: {
      idle: { frameDuration: 300, loop: true },
      walk: { frameDuration: 200, loop: true },
      attack: { frameDuration: 100, loop: false }
    }
  },
  demon_armoured: {
    id: 'demon_armoured',
    name: 'Armoured Demon',
    imagePath: assetUrl("/sprites/miniworld/Characters/Monsters/Demons/ArmouredRedDemon.png"),
    frameWidth: 16,
    frameHeight: 16,
    rowLayout: { idle: 0, walk: 1, attack: 2 },
    framesPerRow: 4,
    animations: {
      idle: { frameDuration: 300, loop: true },
      walk: { frameDuration: 200, loop: true },
      attack: { frameDuration: 100, loop: false }
    }
  },
  dragon_red: {
    id: 'dragon_red',
    name: 'Red Dragon',
    imagePath: assetUrl("/sprites/miniworld/Characters/Monsters/Dragons/RedDragon.png"),
    frameWidth: 16,
    frameHeight: 16,
    rowLayout: { idle: 0, walk: 1, attack: 2 },
    framesPerRow: 4,
    animations: {
      idle: { frameDuration: 300, loop: true },
      walk: { frameDuration: 200, loop: true },
      attack: { frameDuration: 100, loop: false }
    }
  },
  dragon_black: {
    id: 'dragon_black',
    name: 'Black Dragon',
    imagePath: assetUrl("/sprites/miniworld/Characters/Monsters/Dragons/BlackDragon.png"),
    frameWidth: 16,
    frameHeight: 16,
    rowLayout: { idle: 0, walk: 1, attack: 2 },
    framesPerRow: 4,
    animations: {
      idle: { frameDuration: 300, loop: true },
      walk: { frameDuration: 200, loop: true },
      attack: { frameDuration: 100, loop: false }
    }
  },
  dragon_blue: {
    id: 'dragon_blue',
    name: 'Blue Dragon',
    imagePath: assetUrl("/sprites/miniworld/Characters/Monsters/Dragons/BlueDragon.png"),
    frameWidth: 16,
    frameHeight: 16,
    rowLayout: { idle: 0, walk: 1, attack: 2 },
    framesPerRow: 4,
    animations: {
      idle: { frameDuration: 300, loop: true },
      walk: { frameDuration: 200, loop: true },
      attack: { frameDuration: 100, loop: false }
    }
  },
  dragon_white: {
    id: 'dragon_white',
    name: 'White Dragon',
    imagePath: assetUrl("/sprites/miniworld/Characters/Monsters/Dragons/WhiteDragon.png"),
    frameWidth: 16,
    frameHeight: 16,
    rowLayout: { idle: 0, walk: 1, attack: 2 },
    framesPerRow: 4,
    animations: {
      idle: { frameDuration: 300, loop: true },
      walk: { frameDuration: 200, loop: true },
      attack: { frameDuration: 100, loop: false }
    }
  },
  yeti: {
    id: 'yeti',
    name: 'Yeti',
    imagePath: assetUrl("/sprites/miniworld/Characters/Monsters/Frostborn/Yeti.png"),
    frameWidth: 16,
    frameHeight: 16,
    rowLayout: { idle: 0, walk: 1, attack: 2 },
    framesPerRow: 4,
    animations: {
      idle: { frameDuration: 300, loop: true },
      walk: { frameDuration: 200, loop: true },
      attack: { frameDuration: 100, loop: false }
    }
  },
  wendigo: {
    id: 'wendigo',
    name: 'Wendigo',
    imagePath: assetUrl("/sprites/miniworld/Characters/Monsters/Frostborn/Wendigo.png"),
    frameWidth: 16,
    frameHeight: 16,
    rowLayout: { idle: 0, walk: 1, attack: 2 },
    framesPerRow: 4,
    animations: {
      idle: { frameDuration: 300, loop: true },
      walk: { frameDuration: 200, loop: true },
      attack: { frameDuration: 100, loop: false }
    }
  },
  mammoth: {
    id: 'mammoth',
    name: 'Mammoth',
    imagePath: assetUrl("/sprites/miniworld/Characters/Monsters/Frostborn/Mammoth.png"),
    frameWidth: 16,
    frameHeight: 16,
    rowLayout: { idle: 0, walk: 1, attack: 2 },
    framesPerRow: 4,
    animations: {
      idle: { frameDuration: 300, loop: true },
      walk: { frameDuration: 200, loop: true },
      attack: { frameDuration: 100, loop: false }
    }
  },
  slime_green: {
    id: 'slime_green',
    name: 'Green Slime',
    imagePath: assetUrl("/sprites/miniworld/Characters/Monsters/Slimes/Slime.png"),
    frameWidth: 16,
    frameHeight: 16,
    rowLayout: { idle: 0, walk: 1, attack: 2 },
    framesPerRow: 4,
    animations: {
      idle: { frameDuration: 300, loop: true },
      walk: { frameDuration: 200, loop: true },
      attack: { frameDuration: 100, loop: false }
    }
  },
  slime_blue: {
    id: 'slime_blue',
    name: 'Blue Slime',
    imagePath: assetUrl("/sprites/miniworld/Characters/Monsters/Slimes/SlimeBlue.png"),
    frameWidth: 16,
    frameHeight: 16,
    rowLayout: { idle: 0, walk: 1, attack: 2 },
    framesPerRow: 4,
    animations: {
      idle: { frameDuration: 300, loop: true },
      walk: { frameDuration: 200, loop: true },
      attack: { frameDuration: 100, loop: false }
    }
  },
  king_slime: {
    id: 'king_slime',
    name: 'King Slime',
    imagePath: assetUrl("/sprites/miniworld/Characters/Monsters/Slimes/KingSlimeGreen.png"),
    frameWidth: 16,
    frameHeight: 16,
    rowLayout: { idle: 0, walk: 1, attack: 2 },
    framesPerRow: 4,
    animations: {
      idle: { frameDuration: 300, loop: true },
      walk: { frameDuration: 200, loop: true },
      attack: { frameDuration: 100, loop: false }
    }
  },
  pirate_captain: {
    id: 'pirate_captain',
    name: 'Pirate Captain',
    imagePath: assetUrl("/sprites/miniworld/Characters/Monsters/Pirates/PirateCaptain.png"),
    frameWidth: 16,
    frameHeight: 16,
    rowLayout: { idle: 0, walk: 1, attack: 2 },
    framesPerRow: 4,
    animations: {
      idle: { frameDuration: 300, loop: true },
      walk: { frameDuration: 200, loop: true },
      attack: { frameDuration: 100, loop: false }
    }
  },
  pirate_grunt: {
    id: 'pirate_grunt',
    name: 'Pirate Grunt',
    imagePath: assetUrl("/sprites/miniworld/Characters/Monsters/Pirates/PirateGrunt.png"),
    frameWidth: 16,
    frameHeight: 16,
    rowLayout: { idle: 0, walk: 1, attack: 2 },
    framesPerRow: 4,
    animations: {
      idle: { frameDuration: 300, loop: true },
      walk: { frameDuration: 200, loop: true },
      attack: { frameDuration: 100, loop: false }
    }
  },
  giant_crab: {
    id: 'giant_crab',
    name: 'Giant Crab',
    imagePath: assetUrl("/sprites/miniworld/Characters/Monsters/GiantAnimals/GiantCrab.png"),
    frameWidth: 16,
    frameHeight: 16,
    rowLayout: { idle: 0, walk: 1, attack: 2 },
    framesPerRow: 4,
    animations: {
      idle: { frameDuration: 300, loop: true },
      walk: { frameDuration: 200, loop: true },
      attack: { frameDuration: 100, loop: false }
    }
  }
};

export const MINIWORLD_CHAMPION_SPRITES: Record<string, MiniWorldSpriteSheet> = {
  arthax: {
    id: 'arthax',
    name: 'Arthax',
    imagePath: assetUrl("/sprites/miniworld/Characters/Champions/Arthax.png"),
    frameWidth: 16,
    frameHeight: 16,
    rowLayout: { idle: 0, walk: 1, attack: 2 },
    framesPerRow: 4,
    animations: {
      idle: { frameDuration: 300, loop: true },
      walk: { frameDuration: 200, loop: true },
      attack: { frameDuration: 100, loop: false }
    }
  },
  borg: {
    id: 'borg',
    name: 'Börg',
    imagePath: assetUrl("/sprites/miniworld/Characters/Champions/Börg.png"),
    frameWidth: 16,
    frameHeight: 16,
    rowLayout: { idle: 0, walk: 1, attack: 2 },
    framesPerRow: 4,
    animations: {
      idle: { frameDuration: 300, loop: true },
      walk: { frameDuration: 200, loop: true },
      attack: { frameDuration: 100, loop: false }
    }
  },
  gangblanc: {
    id: 'gangblanc',
    name: 'Gangblanc',
    imagePath: assetUrl("/sprites/miniworld/Characters/Champions/Gangblanc.png"),
    frameWidth: 16,
    frameHeight: 16,
    rowLayout: { idle: 0, walk: 1, attack: 2 },
    framesPerRow: 4,
    animations: {
      idle: { frameDuration: 300, loop: true },
      walk: { frameDuration: 200, loop: true },
      attack: { frameDuration: 100, loop: false }
    }
  },
  grum: {
    id: 'grum',
    name: 'Grum',
    imagePath: assetUrl("/sprites/miniworld/Characters/Champions/Grum.png"),
    frameWidth: 16,
    frameHeight: 16,
    rowLayout: { idle: 0, walk: 1, attack: 2 },
    framesPerRow: 4,
    animations: {
      idle: { frameDuration: 300, loop: true },
      walk: { frameDuration: 200, loop: true },
      attack: { frameDuration: 100, loop: false }
    }
  },
  kanji: {
    id: 'kanji',
    name: 'Kanji',
    imagePath: assetUrl("/sprites/miniworld/Characters/Champions/Kanji.png"),
    frameWidth: 16,
    frameHeight: 16,
    rowLayout: { idle: 0, walk: 1, attack: 2 },
    framesPerRow: 4,
    animations: {
      idle: { frameDuration: 300, loop: true },
      walk: { frameDuration: 200, loop: true },
      attack: { frameDuration: 100, loop: false }
    }
  },
  katan: {
    id: 'katan',
    name: 'Katan',
    imagePath: assetUrl("/sprites/miniworld/Characters/Champions/Katan.png"),
    frameWidth: 16,
    frameHeight: 16,
    rowLayout: { idle: 0, walk: 1, attack: 2 },
    framesPerRow: 4,
    animations: {
      idle: { frameDuration: 300, loop: true },
      walk: { frameDuration: 200, loop: true },
      attack: { frameDuration: 100, loop: false }
    }
  },
  okomo: {
    id: 'okomo',
    name: 'Okomo',
    imagePath: assetUrl("/sprites/miniworld/Characters/Champions/Okomo.png"),
    frameWidth: 16,
    frameHeight: 16,
    rowLayout: { idle: 0, walk: 1, attack: 2 },
    framesPerRow: 4,
    animations: {
      idle: { frameDuration: 300, loop: true },
      walk: { frameDuration: 200, loop: true },
      attack: { frameDuration: 100, loop: false }
    }
  },
  zhinja: {
    id: 'zhinja',
    name: 'Zhinja',
    imagePath: assetUrl("/sprites/miniworld/Characters/Champions/Zhinja.png"),
    frameWidth: 16,
    frameHeight: 16,
    rowLayout: { idle: 0, walk: 1, attack: 2 },
    framesPerRow: 4,
    animations: {
      idle: { frameDuration: 300, loop: true },
      walk: { frameDuration: 200, loop: true },
      attack: { frameDuration: 100, loop: false }
    }
  }
};

export function getMonsterMiniWorldSprite(monsterId: string): MiniWorldSpriteSheet | null {
  const mapping: Record<string, string> = {
    'monster_skeleton': 'skeleton',
    'monster_skeleton_archer': 'skeleton',
    'monster_zombie': 'necromancer',
    'monster_goblin': 'goblin_club',
    'monster_goblin_shaman': 'orc_shaman',
    'monster_orc_warrior': 'orc',
    'monster_imp': 'demon_red',
    'monster_shadow_stalker': 'demon_purple',
    'monster_giant_spider': 'slime_green',
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
  return spriteId ? MINIWORLD_MONSTER_SPRITES[spriteId] : MINIWORLD_MONSTER_SPRITES['goblin_club'];
}

export function getHeroMiniWorldSprite(classId: string): MiniWorldSpriteSheet {
  const mapping: Record<string, string> = {
    'warrior': 'swordsman_red',
    'knight': 'knight_red',
    'mage': 'mage_red',
    'priest': 'mage_red',
    'ranger': 'bowman_red',
    'rogue': 'assassin_purple',
    'berserker': 'axeman_red',
    'paladin': 'knight_red',
    'necromancer': 'mage_red',
    'shaman': 'mage_red'
  };
  
  const spriteId = mapping[classId?.toLowerCase()] || 'swordsman_red';
  return MINIWORLD_HERO_SPRITES[spriteId] || MINIWORLD_HERO_SPRITES['swordsman_red'];
}

export const ORC_SPRITE: DirectionalSpriteSheet = {
  id: 'orc1',
  name: 'Orc Warrior',
  basePath: assetUrl("/sprites/2dassets/orc-topdown/PNG/Orc1/With_shadow"),
  frameWidth: 64,
  frameHeight: 64,
  directions: ['down', 'left', 'right', 'up'],
  animations: {
    idle: { frameCount: 4, frameDuration: 200, loop: true },
    walk: { frameCount: 8, frameDuration: 100, loop: true },
    run: { frameCount: 8, frameDuration: 80, loop: true },
    attack: { frameCount: 8, frameDuration: 80, loop: false },
    hurt: { frameCount: 4, frameDuration: 100, loop: false },
    death: { frameCount: 8, frameDuration: 120, loop: false }
  },
  getSpritePath: (direction: Direction, animation: AnimationState) => {
    const animMap: Record<AnimationState, string> = {
      idle: 'idle',
      walk: 'walk',
      run: 'run',
      attack: 'attack',
      hurt: 'hurt',
      death: 'death'
    };
    return assetUrl(`/sprites/2dassets/orc-topdown/PNG/Orc1/With_shadow/orc1_${animMap[animation]}_with_shadow.png`);
  }
};

export const ORC_SHAMAN_SPRITE: DirectionalSpriteSheet = {
  id: 'orc2',
  name: 'Orc Shaman',
  basePath: assetUrl("/sprites/2dassets/orc-topdown/PNG/Orc2/With_shadow"),
  frameWidth: 64,
  frameHeight: 64,
  directions: ['down', 'left', 'right', 'up'],
  animations: {
    idle: { frameCount: 4, frameDuration: 200, loop: true },
    walk: { frameCount: 8, frameDuration: 100, loop: true },
    run: { frameCount: 8, frameDuration: 80, loop: true },
    attack: { frameCount: 8, frameDuration: 80, loop: false },
    hurt: { frameCount: 4, frameDuration: 100, loop: false },
    death: { frameCount: 8, frameDuration: 120, loop: false }
  },
  getSpritePath: (direction: Direction, animation: AnimationState) => {
    const animMap: Record<AnimationState, string> = {
      idle: 'idle',
      walk: 'walk',
      run: 'run',
      attack: 'attack',
      hurt: 'hurt',
      death: 'death'
    };
    return assetUrl(`/sprites/2dassets/orc-topdown/PNG/Orc2/With_shadow/orc2_${animMap[animation]}_with_shadow.png`);
  }
};

export const ORC_RANGER_SPRITE: DirectionalSpriteSheet = {
  id: 'orc3',
  name: 'Orc Ranger',
  basePath: assetUrl("/sprites/2dassets/orc-topdown/PNG/Orc3/With_shadow"),
  frameWidth: 64,
  frameHeight: 64,
  directions: ['down', 'left', 'right', 'up'],
  animations: {
    idle: { frameCount: 4, frameDuration: 200, loop: true },
    walk: { frameCount: 8, frameDuration: 100, loop: true },
    run: { frameCount: 8, frameDuration: 80, loop: true },
    attack: { frameCount: 8, frameDuration: 80, loop: false },
    hurt: { frameCount: 4, frameDuration: 100, loop: false },
    death: { frameCount: 8, frameDuration: 120, loop: false }
  },
  getSpritePath: (direction: Direction, animation: AnimationState) => {
    const animMap: Record<AnimationState, string> = {
      idle: 'idle',
      walk: 'walk',
      run: 'run',
      attack: 'attack',
      hurt: 'hurt',
      death: 'death'
    };
    return assetUrl(`/sprites/2dassets/orc-topdown/PNG/Orc3/With_shadow/orc3_${animMap[animation]}_with_shadow.png`);
  }
};

export const GOBLIN_SPRITE: DirectionalSpriteSheet = {
  id: 'goblin',
  name: 'Goblin',
  basePath: assetUrl("/sprites/topdown/goblin/Male Goblin/PNG"),
  frameWidth: 128,
  frameHeight: 128,
  directions: ['down', 'left', 'right', 'up'],
  animations: {
    idle: { frameCount: 16, frameDuration: 80, loop: true },
    walk: { frameCount: 20, frameDuration: 60, loop: true },
    run: { frameCount: 12, frameDuration: 60, loop: true },
    attack: { frameCount: 10, frameDuration: 70, loop: false },
    hurt: { frameCount: 10, frameDuration: 80, loop: false },
    death: { frameCount: 10, frameDuration: 100, loop: false }
  },
  getSpritePath: (direction: Direction, animation: AnimationState) => {
    const dirMap: Record<Direction, string> = {
      down: 'Front',
      up: 'Back',
      left: 'Left',
      right: 'Right'
    };
    const animMap: Record<AnimationState, string> = {
      idle: 'Idle',
      walk: 'Walking',
      run: 'Running',
      attack: 'Attacking',
      hurt: 'Hurt',
      death: 'Dying'
    };
    const dirName = dirMap[direction];
    const animName = animMap[animation];
    if (animation === 'death') {
      return assetUrl(`/sprites/topdown/goblin/Male Goblin/PNG/Spritesheets/${animName}.png`);
    }
    return assetUrl(`/sprites/topdown/goblin/Male Goblin/PNG/Spritesheets/${dirName} - ${animName}.png`);
  }
};

export const DUNGEON_HERO_SPRITE: DirectionalSpriteSheet = {
  id: 'dungeon_hero',
  name: 'Dungeon Hero',
  basePath: assetUrl("/sprites/dampdungeons/animations"),
  frameWidth: 16,
  frameHeight: 16,
  directions: ['down', 'left', 'right', 'up'],
  animations: {
    idle: { frameCount: 4, frameDuration: 200, loop: true },
    walk: { frameCount: 4, frameDuration: 120, loop: true },
    run: { frameCount: 4, frameDuration: 80, loop: true },
    attack: { frameCount: 4, frameDuration: 100, loop: false },
    hurt: { frameCount: 2, frameDuration: 150, loop: false },
    death: { frameCount: 4, frameDuration: 150, loop: false }
  },
  getSpritePath: () => assetUrl("/sprites/dampdungeons/Dungeon_HeroMan1.png")
};

export const SLIME_SPRITE: DirectionalSpriteSheet = {
  id: 'slime',
  name: 'Slime',
  basePath: assetUrl("/sprites/dampdungeons/animations"),
  frameWidth: 16,
  frameHeight: 16,
  directions: ['down'],
  animations: {
    idle: { frameCount: 4, frameDuration: 200, loop: true },
    walk: { frameCount: 4, frameDuration: 150, loop: true },
    run: { frameCount: 4, frameDuration: 100, loop: true },
    attack: { frameCount: 2, frameDuration: 150, loop: false },
    hurt: { frameCount: 2, frameDuration: 200, loop: false },
    death: { frameCount: 4, frameDuration: 200, loop: false }
  },
  getSpritePath: () => assetUrl("/sprites/dampdungeons/Dungeon_Slime.png")
};

export const SKELETON_SPRITE: DirectionalSpriteSheet = {
  id: 'skeleton',
  name: 'Skeleton',
  basePath: assetUrl("/sprites/dampdungeons/animations"),
  frameWidth: 16,
  frameHeight: 16,
  directions: ['down', 'left', 'right', 'up'],
  animations: {
    idle: { frameCount: 4, frameDuration: 200, loop: true },
    walk: { frameCount: 4, frameDuration: 120, loop: true },
    run: { frameCount: 4, frameDuration: 80, loop: true },
    attack: { frameCount: 4, frameDuration: 100, loop: false },
    hurt: { frameCount: 2, frameDuration: 150, loop: false },
    death: { frameCount: 4, frameDuration: 150, loop: false }
  },
  getSpritePath: () => assetUrl("/sprites/dampdungeons/Dungeon_Skeleton.png")
};

export const SPRITE_REGISTRY: Record<string, DirectionalSpriteSheet> = {
  'orc1': ORC_SPRITE,
  'orc_warrior': ORC_SPRITE,
  'orc2': ORC_SHAMAN_SPRITE,
  'orc_shaman': ORC_SHAMAN_SPRITE,
  'orc3': ORC_RANGER_SPRITE,
  'orc_ranger': ORC_RANGER_SPRITE,
  'goblin': GOBLIN_SPRITE,
  'dungeon_hero': DUNGEON_HERO_SPRITE,
  'slime': SLIME_SPRITE,
  'skeleton': SKELETON_SPRITE
};

export const AVAILABLE_SPRITES: Record<string, DirectionalSpriteSheet> = {
  'orc1': ORC_SPRITE,
  'orc_warrior': ORC_SPRITE,
  'orc2': ORC_SHAMAN_SPRITE,
  'orc_shaman': ORC_SHAMAN_SPRITE,
  'orc3': ORC_RANGER_SPRITE,
  'orc_ranger': ORC_RANGER_SPRITE,
  'goblin': GOBLIN_SPRITE,
  'dungeon_hero': DUNGEON_HERO_SPRITE,
  'slime': SLIME_SPRITE,
  'skeleton': SKELETON_SPRITE
};

export function getSpriteSheet(id: string): DirectionalSpriteSheet | undefined {
  return SPRITE_REGISTRY[id];
}
