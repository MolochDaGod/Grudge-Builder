export interface CharacterAnimation {
  id: string;
  name: string;
  basePath: string;
  frameCount: number;
  fps: number;
  loop: boolean;
  frameWidth: number;
  frameHeight: number;
  directions: number;
  isSheet: boolean;
  sheetColumns?: number;
  isSequence?: boolean;
  sequencePattern?: string;
}

export interface CharacterDefinition {
  id: string;
  name: string;
  description: string;
  basePath: string;
  spriteSize: number;
  directions: number;
  animations: Record<string, CharacterAnimation>;
}

export const ORC_ANIMATIONS: Record<string, CharacterDefinition> = {
  orc1: {
    id: "orc1",
    name: "Orc Warrior",
    description: "Green-skinned orc warrior with axe",
    basePath: "/sprites/2dassets/orc-topdown/PNG/Orc1/Without_shadow",
    spriteSize: 64,
    directions: 4,
    animations: {
      idle: {
        id: "orc1_idle",
        name: "Idle",
        basePath: "/sprites/2dassets/orc-topdown/PNG/Orc1/Without_shadow/orc1_idle_without_shadow.png",
        frameCount: 4,
        fps: 8,
        loop: true,
        frameWidth: 64,
        frameHeight: 64,
        directions: 4,
        isSheet: true,
        sheetColumns: 4
      },
      walk: {
        id: "orc1_walk",
        name: "Walk",
        basePath: "/sprites/2dassets/orc-topdown/PNG/Orc1/Without_shadow/orc1_walk_without_shadow.png",
        frameCount: 6,
        fps: 10,
        loop: true,
        frameWidth: 64,
        frameHeight: 64,
        directions: 4,
        isSheet: true,
        sheetColumns: 6
      },
      run: {
        id: "orc1_run",
        name: "Run",
        basePath: "/sprites/2dassets/orc-topdown/PNG/Orc1/Without_shadow/orc1_run_without_shadow.png",
        frameCount: 8,
        fps: 12,
        loop: true,
        frameWidth: 64,
        frameHeight: 64,
        directions: 4,
        isSheet: true,
        sheetColumns: 8
      },
      attack: {
        id: "orc1_attack",
        name: "Attack",
        basePath: "/sprites/2dassets/orc-topdown/PNG/Orc1/Without_shadow/orc1_attack_without_shadow.png",
        frameCount: 8,
        fps: 12,
        loop: false,
        frameWidth: 64,
        frameHeight: 64,
        directions: 4,
        isSheet: true,
        sheetColumns: 8
      },
      death: {
        id: "orc1_death",
        name: "Death",
        basePath: "/sprites/2dassets/orc-topdown/PNG/Orc1/Without_shadow/orc1_death_without_shadow.png",
        frameCount: 8,
        fps: 10,
        loop: false,
        frameWidth: 64,
        frameHeight: 64,
        directions: 4,
        isSheet: true,
        sheetColumns: 8
      },
      hurt: {
        id: "orc1_hurt",
        name: "Hurt",
        basePath: "/sprites/2dassets/orc-topdown/PNG/Orc1/Without_shadow/orc1_hurt_without_shadow.png",
        frameCount: 6,
        fps: 12,
        loop: false,
        frameWidth: 64,
        frameHeight: 64,
        directions: 4,
        isSheet: true,
        sheetColumns: 6
      },
      walk_attack: {
        id: "orc1_walk_attack",
        name: "Walk Attack",
        basePath: "/sprites/2dassets/orc-topdown/PNG/Orc1/Without_shadow/orc1_walk_attack_front _without_shadow.png",
        frameCount: 6,
        fps: 10,
        loop: false,
        frameWidth: 64,
        frameHeight: 64,
        directions: 4,
        isSheet: true,
        sheetColumns: 6
      },
      run_attack: {
        id: "orc1_run_attack",
        name: "Run Attack",
        basePath: "/sprites/2dassets/orc-topdown/PNG/Orc1/Without_shadow/orc1_run_attack_front_without_shadow.png",
        frameCount: 8,
        fps: 12,
        loop: false,
        frameWidth: 64,
        frameHeight: 64,
        directions: 4,
        isSheet: true,
        sheetColumns: 8
      }
    }
  },
  orc2: {
    id: "orc2",
    name: "Orc Berserker",
    description: "Armored orc berserker",
    basePath: "/sprites/2dassets/orc-topdown/PNG/Orc2/Without_shadow",
    spriteSize: 64,
    directions: 4,
    animations: {
      idle: {
        id: "orc2_idle",
        name: "Idle",
        basePath: "/sprites/2dassets/orc-topdown/PNG/Orc2/Without_shadow/orc2_idle_without_shadow.png",
        frameCount: 4,
        fps: 8,
        loop: true,
        frameWidth: 64,
        frameHeight: 64,
        directions: 4,
        isSheet: true,
        sheetColumns: 4
      },
      walk: {
        id: "orc2_walk",
        name: "Walk",
        basePath: "/sprites/2dassets/orc-topdown/PNG/Orc2/Without_shadow/orc2_walk_without_shadow.png",
        frameCount: 6,
        fps: 10,
        loop: true,
        frameWidth: 64,
        frameHeight: 64,
        directions: 4,
        isSheet: true,
        sheetColumns: 6
      },
      run: {
        id: "orc2_run",
        name: "Run",
        basePath: "/sprites/2dassets/orc-topdown/PNG/Orc2/Without_shadow/orc2_run_without_shadow.png",
        frameCount: 8,
        fps: 12,
        loop: true,
        frameWidth: 64,
        frameHeight: 64,
        directions: 4,
        isSheet: true,
        sheetColumns: 8
      },
      attack: {
        id: "orc2_attack",
        name: "Attack",
        basePath: "/sprites/2dassets/orc-topdown/PNG/Orc2/Without_shadow/orc2_attack_without_shadow.png",
        frameCount: 8,
        fps: 12,
        loop: false,
        frameWidth: 64,
        frameHeight: 64,
        directions: 4,
        isSheet: true,
        sheetColumns: 8
      },
      death: {
        id: "orc2_death",
        name: "Death",
        basePath: "/sprites/2dassets/orc-topdown/PNG/Orc2/Without_shadow/orc2_death_without_shadow.png",
        frameCount: 8,
        fps: 10,
        loop: false,
        frameWidth: 64,
        frameHeight: 64,
        directions: 4,
        isSheet: true,
        sheetColumns: 8
      },
      hurt: {
        id: "orc2_hurt",
        name: "Hurt",
        basePath: "/sprites/2dassets/orc-topdown/PNG/Orc2/Without_shadow/orc2_hurt_without_shadow.png",
        frameCount: 6,
        fps: 12,
        loop: false,
        frameWidth: 64,
        frameHeight: 64,
        directions: 4,
        isSheet: true,
        sheetColumns: 6
      },
      walk_attack: {
        id: "orc2_walk_attack",
        name: "Walk Attack",
        basePath: "/sprites/2dassets/orc-topdown/PNG/Orc2/Without_shadow/orc2_walk_attack_front_without_shadow.png",
        frameCount: 6,
        fps: 10,
        loop: false,
        frameWidth: 64,
        frameHeight: 64,
        directions: 4,
        isSheet: true,
        sheetColumns: 6
      },
      run_attack: {
        id: "orc2_run_attack",
        name: "Run Attack",
        basePath: "/sprites/2dassets/orc-topdown/PNG/Orc2/Without_shadow/orc2_run_attack_front_without_shadow.png",
        frameCount: 8,
        fps: 12,
        loop: false,
        frameWidth: 64,
        frameHeight: 64,
        directions: 4,
        isSheet: true,
        sheetColumns: 8
      }
    }
  },
  orc3: {
    id: "orc3",
    name: "Orc Shaman",
    description: "Cloaked orc shaman",
    basePath: "/sprites/2dassets/orc-topdown/PNG/Orc3/Without_shadow",
    spriteSize: 64,
    directions: 4,
    animations: {
      idle: {
        id: "orc3_idle",
        name: "Idle",
        basePath: "/sprites/2dassets/orc-topdown/PNG/Orc3/Without_shadow/orc3_idle_without_shadow.png",
        frameCount: 4,
        fps: 8,
        loop: true,
        frameWidth: 64,
        frameHeight: 64,
        directions: 4,
        isSheet: true,
        sheetColumns: 4
      },
      walk: {
        id: "orc3_walk",
        name: "Walk",
        basePath: "/sprites/2dassets/orc-topdown/PNG/Orc3/Without_shadow/orc3_walk_without_shadow.png",
        frameCount: 6,
        fps: 10,
        loop: true,
        frameWidth: 64,
        frameHeight: 64,
        directions: 4,
        isSheet: true,
        sheetColumns: 6
      },
      run: {
        id: "orc3_run",
        name: "Run",
        basePath: "/sprites/2dassets/orc-topdown/PNG/Orc3/Without_shadow/orc3_run_without_shadow.png",
        frameCount: 8,
        fps: 12,
        loop: true,
        frameWidth: 64,
        frameHeight: 64,
        directions: 4,
        isSheet: true,
        sheetColumns: 8
      },
      attack: {
        id: "orc3_attack",
        name: "Attack",
        basePath: "/sprites/2dassets/orc-topdown/PNG/Orc3/Without_shadow/orc3_attack_without_shadow.png",
        frameCount: 8,
        fps: 12,
        loop: false,
        frameWidth: 64,
        frameHeight: 64,
        directions: 4,
        isSheet: true,
        sheetColumns: 8
      },
      death: {
        id: "orc3_death",
        name: "Death",
        basePath: "/sprites/2dassets/orc-topdown/PNG/Orc3/Without_shadow/orc3_death_without_shadow.png",
        frameCount: 8,
        fps: 10,
        loop: false,
        frameWidth: 64,
        frameHeight: 64,
        directions: 4,
        isSheet: true,
        sheetColumns: 8
      },
      hurt: {
        id: "orc3_hurt",
        name: "Hurt",
        basePath: "/sprites/2dassets/orc-topdown/PNG/Orc3/Without_shadow/orc3_hurt_without_shadow.png",
        frameCount: 6,
        fps: 12,
        loop: false,
        frameWidth: 64,
        frameHeight: 64,
        directions: 4,
        isSheet: true,
        sheetColumns: 6
      },
      walk_attack: {
        id: "orc3_walk_attack",
        name: "Walk Attack",
        basePath: "/sprites/2dassets/orc-topdown/PNG/Orc3/Without_shadow/orc3_walk_attack_front_without_shadow.png",
        frameCount: 6,
        fps: 10,
        loop: false,
        frameWidth: 64,
        frameHeight: 64,
        directions: 4,
        isSheet: true,
        sheetColumns: 6
      },
      run_attack: {
        id: "orc3_run_attack",
        name: "Run Attack",
        basePath: "/sprites/2dassets/orc-topdown/PNG/Orc3/Without_shadow/orc3_run_attack_front_without_shadow.png",
        frameCount: 8,
        fps: 12,
        loop: false,
        frameWidth: 64,
        frameHeight: 64,
        directions: 4,
        isSheet: true,
        sheetColumns: 8
      }
    }
  }
};

export const VAMPIRE_ANIMATIONS: Record<string, CharacterDefinition> = {
  vampire1: {
    id: "vampire1",
    name: "Vampire Lord",
    description: "Dark vampire with cape",
    basePath: "/sprites/2dassets/vampire-4dir/PNG/Vampires1/Without_shadow",
    spriteSize: 64,
    directions: 4,
    animations: {
      idle: {
        id: "vampire1_idle",
        name: "Idle",
        basePath: "/sprites/2dassets/vampire-4dir/PNG/Vampires1/Without_shadow/Vampires1_Idle_without_shadow.png",
        frameCount: 4,
        fps: 8,
        loop: true,
        frameWidth: 64,
        frameHeight: 64,
        directions: 4,
        isSheet: true,
        sheetColumns: 4
      },
      walk: {
        id: "vampire1_walk",
        name: "Walk",
        basePath: "/sprites/2dassets/vampire-4dir/PNG/Vampires1/Without_shadow/Vampires1_Walk_without_shadow.png",
        frameCount: 6,
        fps: 10,
        loop: true,
        frameWidth: 64,
        frameHeight: 64,
        directions: 4,
        isSheet: true,
        sheetColumns: 6
      },
      run: {
        id: "vampire1_run",
        name: "Run",
        basePath: "/sprites/2dassets/vampire-4dir/PNG/Vampires1/Without_shadow/Vampires1_Run_without_shadow.png",
        frameCount: 8,
        fps: 12,
        loop: true,
        frameWidth: 64,
        frameHeight: 64,
        directions: 4,
        isSheet: true,
        sheetColumns: 8
      },
      attack: {
        id: "vampire1_attack",
        name: "Attack",
        basePath: "/sprites/2dassets/vampire-4dir/PNG/Vampires1/Without_shadow/Vampires1_Attack_without_shadow.png",
        frameCount: 12,
        fps: 14,
        loop: false,
        frameWidth: 64,
        frameHeight: 64,
        directions: 4,
        isSheet: true,
        sheetColumns: 12
      },
      death: {
        id: "vampire1_death",
        name: "Death",
        basePath: "/sprites/2dassets/vampire-4dir/PNG/Vampires1/Without_shadow/Vampires1_Death_without_shadow.png",
        frameCount: 11,
        fps: 10,
        loop: false,
        frameWidth: 64,
        frameHeight: 64,
        directions: 4,
        isSheet: true,
        sheetColumns: 11
      },
      hurt: {
        id: "vampire1_hurt",
        name: "Hurt",
        basePath: "/sprites/2dassets/vampire-4dir/PNG/Vampires1/Without_shadow/Vampires1_Hurt_without_shadow.png",
        frameCount: 4,
        fps: 12,
        loop: false,
        frameWidth: 64,
        frameHeight: 64,
        directions: 4,
        isSheet: true,
        sheetColumns: 4
      }
    }
  },
  vampire2: {
    id: "vampire2",
    name: "Vampire Knight",
    description: "Armored vampire warrior",
    basePath: "/sprites/2dassets/vampire-4dir/PNG/Vampires2/Without_shadow",
    spriteSize: 64,
    directions: 4,
    animations: {
      idle: {
        id: "vampire2_idle",
        name: "Idle",
        basePath: "/sprites/2dassets/vampire-4dir/PNG/Vampires2/Without_shadow/Vampires2_Idle_without_shadow.png",
        frameCount: 4,
        fps: 8,
        loop: true,
        frameWidth: 64,
        frameHeight: 64,
        directions: 4,
        isSheet: true,
        sheetColumns: 4
      },
      walk: {
        id: "vampire2_walk",
        name: "Walk",
        basePath: "/sprites/2dassets/vampire-4dir/PNG/Vampires2/Without_shadow/Vampires2_Walk_without_shadow.png",
        frameCount: 6,
        fps: 10,
        loop: true,
        frameWidth: 64,
        frameHeight: 64,
        directions: 4,
        isSheet: true,
        sheetColumns: 6
      },
      run: {
        id: "vampire2_run",
        name: "Run",
        basePath: "/sprites/2dassets/vampire-4dir/PNG/Vampires2/Without_shadow/Vampires2_Run_without_shadow.png",
        frameCount: 8,
        fps: 12,
        loop: true,
        frameWidth: 64,
        frameHeight: 64,
        directions: 4,
        isSheet: true,
        sheetColumns: 8
      },
      attack: {
        id: "vampire2_attack",
        name: "Attack",
        basePath: "/sprites/2dassets/vampire-4dir/PNG/Vampires2/Without_shadow/Vampires2_Attack_without_shadow.png",
        frameCount: 12,
        fps: 14,
        loop: false,
        frameWidth: 64,
        frameHeight: 64,
        directions: 4,
        isSheet: true,
        sheetColumns: 12
      },
      death: {
        id: "vampire2_death",
        name: "Death",
        basePath: "/sprites/2dassets/vampire-4dir/PNG/Vampires2/Without_shadow/Vampires2_Death_without_shadow.png",
        frameCount: 11,
        fps: 10,
        loop: false,
        frameWidth: 64,
        frameHeight: 64,
        directions: 4,
        isSheet: true,
        sheetColumns: 11
      },
      hurt: {
        id: "vampire2_hurt",
        name: "Hurt",
        basePath: "/sprites/2dassets/vampire-4dir/PNG/Vampires2/Without_shadow/Vampires2_Hurt_without_shadow.png",
        frameCount: 4,
        fps: 12,
        loop: false,
        frameWidth: 64,
        frameHeight: 64,
        directions: 4,
        isSheet: true,
        sheetColumns: 4
      }
    }
  },
  vampire3: {
    id: "vampire3",
    name: "Vampire Mage",
    description: "Robed vampire spellcaster",
    basePath: "/sprites/2dassets/vampire-4dir/PNG/Vampires3/Without_shadow",
    spriteSize: 64,
    directions: 4,
    animations: {
      idle: {
        id: "vampire3_idle",
        name: "Idle",
        basePath: "/sprites/2dassets/vampire-4dir/PNG/Vampires3/Without_shadow/Vampires3_Idle_without_shadow.png",
        frameCount: 4,
        fps: 8,
        loop: true,
        frameWidth: 64,
        frameHeight: 64,
        directions: 4,
        isSheet: true,
        sheetColumns: 4
      },
      walk: {
        id: "vampire3_walk",
        name: "Walk",
        basePath: "/sprites/2dassets/vampire-4dir/PNG/Vampires3/Without_shadow/Vampires3_Walk_without_shadow.png",
        frameCount: 6,
        fps: 10,
        loop: true,
        frameWidth: 64,
        frameHeight: 64,
        directions: 4,
        isSheet: true,
        sheetColumns: 6
      },
      run: {
        id: "vampire3_run",
        name: "Run",
        basePath: "/sprites/2dassets/vampire-4dir/PNG/Vampires3/Without_shadow/Vampires3_Run_without_shadow.png",
        frameCount: 8,
        fps: 12,
        loop: true,
        frameWidth: 64,
        frameHeight: 64,
        directions: 4,
        isSheet: true,
        sheetColumns: 8
      },
      attack: {
        id: "vampire3_attack",
        name: "Attack",
        basePath: "/sprites/2dassets/vampire-4dir/PNG/Vampires3/Without_shadow/Vampires3_Attack_without_shadow.png",
        frameCount: 12,
        fps: 14,
        loop: false,
        frameWidth: 64,
        frameHeight: 64,
        directions: 4,
        isSheet: true,
        sheetColumns: 12
      },
      death: {
        id: "vampire3_death",
        name: "Death",
        basePath: "/sprites/2dassets/vampire-4dir/PNG/Vampires3/Without_shadow/Vampires3_Death_without_shadow.png",
        frameCount: 11,
        fps: 10,
        loop: false,
        frameWidth: 64,
        frameHeight: 64,
        directions: 4,
        isSheet: true,
        sheetColumns: 11
      },
      hurt: {
        id: "vampire3_hurt",
        name: "Hurt",
        basePath: "/sprites/2dassets/vampire-4dir/PNG/Vampires3/Without_shadow/Vampires3_Hurt_without_shadow.png",
        frameCount: 4,
        fps: 12,
        loop: false,
        frameWidth: 64,
        frameHeight: 64,
        directions: 4,
        isSheet: true,
        sheetColumns: 4
      }
    }
  }
};

export interface SequenceAnimation {
  id: string;
  name: string;
  basePath: string;
  frameCount: number;
  fps: number;
  loop: boolean;
  frameWidth: number;
  frameHeight: number;
  sequencePattern: string;
}

export interface SkeletonCrusaderDefinition {
  id: string;
  name: string;
  description: string;
  basePath: string;
  spriteSize: number;
  animations: Record<string, SequenceAnimation>;
}

export const SKELETON_CRUSADER_ANIMATIONS: Record<string, SkeletonCrusaderDefinition> = {
  skeleton_crusader_1: {
    id: "skeleton_crusader_1",
    name: "Skeleton Crusader (Red)",
    description: "Armored skeleton warrior with red accents",
    basePath: "/sprites/2dassets/chibi-skeleton-crusader/Skeleton_Crusader_1/PNG/PNG Sequences",
    spriteSize: 900,
    animations: {
      idle: {
        id: "skeleton1_idle",
        name: "Idle",
        basePath: "/sprites/2dassets/chibi-skeleton-crusader/Skeleton_Crusader_1/PNG/PNG Sequences/Idle",
        frameCount: 18,
        fps: 12,
        loop: true,
        frameWidth: 900,
        frameHeight: 900,
        sequencePattern: "0_Skeleton_Crusader_Idle_{frame:03d}.png"
      },
      idle_blinking: {
        id: "skeleton1_idle_blinking",
        name: "Idle Blinking",
        basePath: "/sprites/2dassets/chibi-skeleton-crusader/Skeleton_Crusader_1/PNG/PNG Sequences/Idle Blinking",
        frameCount: 18,
        fps: 12,
        loop: true,
        frameWidth: 900,
        frameHeight: 900,
        sequencePattern: "0_Skeleton_Crusader_Idle Blinking_{frame:03d}.png"
      },
      walking: {
        id: "skeleton1_walking",
        name: "Walking",
        basePath: "/sprites/2dassets/chibi-skeleton-crusader/Skeleton_Crusader_1/PNG/PNG Sequences/Walking",
        frameCount: 24,
        fps: 16,
        loop: true,
        frameWidth: 900,
        frameHeight: 900,
        sequencePattern: "0_Skeleton_Crusader_Walking_{frame:03d}.png"
      },
      running: {
        id: "skeleton1_running",
        name: "Running",
        basePath: "/sprites/2dassets/chibi-skeleton-crusader/Skeleton_Crusader_1/PNG/PNG Sequences/Running",
        frameCount: 12,
        fps: 14,
        loop: true,
        frameWidth: 900,
        frameHeight: 900,
        sequencePattern: "0_Skeleton_Crusader_Running_{frame:03d}.png"
      },
      slashing: {
        id: "skeleton1_slashing",
        name: "Slashing",
        basePath: "/sprites/2dassets/chibi-skeleton-crusader/Skeleton_Crusader_1/PNG/PNG Sequences/Slashing",
        frameCount: 12,
        fps: 14,
        loop: false,
        frameWidth: 900,
        frameHeight: 900,
        sequencePattern: "0_Skeleton_Crusader_Slashing_{frame:03d}.png"
      },
      slashing_air: {
        id: "skeleton1_slashing_air",
        name: "Slashing in Air",
        basePath: "/sprites/2dassets/chibi-skeleton-crusader/Skeleton_Crusader_1/PNG/PNG Sequences/Slashing in The Air",
        frameCount: 12,
        fps: 14,
        loop: false,
        frameWidth: 900,
        frameHeight: 900,
        sequencePattern: "0_Skeleton_Crusader_Slashing in The Air_{frame:03d}.png"
      },
      run_slashing: {
        id: "skeleton1_run_slashing",
        name: "Run Slashing",
        basePath: "/sprites/2dassets/chibi-skeleton-crusader/Skeleton_Crusader_1/PNG/PNG Sequences/Run Slashing",
        frameCount: 12,
        fps: 14,
        loop: false,
        frameWidth: 900,
        frameHeight: 900,
        sequencePattern: "0_Skeleton_Crusader_Run Slashing_{frame:03d}.png"
      },
      kicking: {
        id: "skeleton1_kicking",
        name: "Kicking",
        basePath: "/sprites/2dassets/chibi-skeleton-crusader/Skeleton_Crusader_1/PNG/PNG Sequences/Kicking",
        frameCount: 12,
        fps: 14,
        loop: false,
        frameWidth: 900,
        frameHeight: 900,
        sequencePattern: "0_Skeleton_Crusader_Kicking_{frame:03d}.png"
      },
      throwing: {
        id: "skeleton1_throwing",
        name: "Throwing",
        basePath: "/sprites/2dassets/chibi-skeleton-crusader/Skeleton_Crusader_1/PNG/PNG Sequences/Throwing",
        frameCount: 12,
        fps: 14,
        loop: false,
        frameWidth: 900,
        frameHeight: 900,
        sequencePattern: "0_Skeleton_Crusader_Throwing_{frame:03d}.png"
      },
      throwing_air: {
        id: "skeleton1_throwing_air",
        name: "Throwing in Air",
        basePath: "/sprites/2dassets/chibi-skeleton-crusader/Skeleton_Crusader_1/PNG/PNG Sequences/Throwing in The Air",
        frameCount: 12,
        fps: 14,
        loop: false,
        frameWidth: 900,
        frameHeight: 900,
        sequencePattern: "0_Skeleton_Crusader_Throwing in The Air_{frame:03d}.png"
      },
      run_throwing: {
        id: "skeleton1_run_throwing",
        name: "Run Throwing",
        basePath: "/sprites/2dassets/chibi-skeleton-crusader/Skeleton_Crusader_1/PNG/PNG Sequences/Run Throwing",
        frameCount: 12,
        fps: 14,
        loop: false,
        frameWidth: 900,
        frameHeight: 900,
        sequencePattern: "0_Skeleton_Crusader_Run Throwing_{frame:03d}.png"
      },
      jump_start: {
        id: "skeleton1_jump_start",
        name: "Jump Start",
        basePath: "/sprites/2dassets/chibi-skeleton-crusader/Skeleton_Crusader_1/PNG/PNG Sequences/Jump Start",
        frameCount: 6,
        fps: 12,
        loop: false,
        frameWidth: 900,
        frameHeight: 900,
        sequencePattern: "0_Skeleton_Crusader_Jump Start_{frame:03d}.png"
      },
      jump_loop: {
        id: "skeleton1_jump_loop",
        name: "Jump Loop",
        basePath: "/sprites/2dassets/chibi-skeleton-crusader/Skeleton_Crusader_1/PNG/PNG Sequences/Jump Loop",
        frameCount: 6,
        fps: 12,
        loop: true,
        frameWidth: 900,
        frameHeight: 900,
        sequencePattern: "0_Skeleton_Crusader_Jump Loop_{frame:03d}.png"
      },
      falling: {
        id: "skeleton1_falling",
        name: "Falling",
        basePath: "/sprites/2dassets/chibi-skeleton-crusader/Skeleton_Crusader_1/PNG/PNG Sequences/Falling Down",
        frameCount: 6,
        fps: 12,
        loop: false,
        frameWidth: 900,
        frameHeight: 900,
        sequencePattern: "0_Skeleton_Crusader_Falling Down_{frame:03d}.png"
      },
      sliding: {
        id: "skeleton1_sliding",
        name: "Sliding",
        basePath: "/sprites/2dassets/chibi-skeleton-crusader/Skeleton_Crusader_1/PNG/PNG Sequences/Sliding",
        frameCount: 6,
        fps: 12,
        loop: true,
        frameWidth: 900,
        frameHeight: 900,
        sequencePattern: "0_Skeleton_Crusader_Sliding_{frame:03d}.png"
      },
      hurt: {
        id: "skeleton1_hurt",
        name: "Hurt",
        basePath: "/sprites/2dassets/chibi-skeleton-crusader/Skeleton_Crusader_1/PNG/PNG Sequences/Hurt",
        frameCount: 12,
        fps: 12,
        loop: false,
        frameWidth: 900,
        frameHeight: 900,
        sequencePattern: "0_Skeleton_Crusader_Hurt_{frame:03d}.png"
      },
      dying: {
        id: "skeleton1_dying",
        name: "Dying",
        basePath: "/sprites/2dassets/chibi-skeleton-crusader/Skeleton_Crusader_1/PNG/PNG Sequences/Dying",
        frameCount: 15,
        fps: 10,
        loop: false,
        frameWidth: 900,
        frameHeight: 900,
        sequencePattern: "0_Skeleton_Crusader_Dying_{frame:03d}.png"
      }
    }
  },
  skeleton_crusader_2: {
    id: "skeleton_crusader_2",
    name: "Skeleton Crusader (Blue)",
    description: "Armored skeleton warrior with blue accents",
    basePath: "/sprites/2dassets/chibi-skeleton-crusader/Skeleton_Crusader_2/PNG/PNG Sequences",
    spriteSize: 900,
    animations: {
      idle: {
        id: "skeleton2_idle",
        name: "Idle",
        basePath: "/sprites/2dassets/chibi-skeleton-crusader/Skeleton_Crusader_2/PNG/PNG Sequences/Idle",
        frameCount: 18,
        fps: 12,
        loop: true,
        frameWidth: 900,
        frameHeight: 900,
        sequencePattern: "0_Skeleton_Crusader_Idle_{frame:03d}.png"
      },
      idle_blinking: {
        id: "skeleton2_idle_blinking",
        name: "Idle Blinking",
        basePath: "/sprites/2dassets/chibi-skeleton-crusader/Skeleton_Crusader_2/PNG/PNG Sequences/Idle Blinking",
        frameCount: 18,
        fps: 12,
        loop: true,
        frameWidth: 900,
        frameHeight: 900,
        sequencePattern: "0_Skeleton_Crusader_Idle Blinking_{frame:03d}.png"
      },
      walking: {
        id: "skeleton2_walking",
        name: "Walking",
        basePath: "/sprites/2dassets/chibi-skeleton-crusader/Skeleton_Crusader_2/PNG/PNG Sequences/Walking",
        frameCount: 24,
        fps: 16,
        loop: true,
        frameWidth: 900,
        frameHeight: 900,
        sequencePattern: "0_Skeleton_Crusader_Walking_{frame:03d}.png"
      },
      running: {
        id: "skeleton2_running",
        name: "Running",
        basePath: "/sprites/2dassets/chibi-skeleton-crusader/Skeleton_Crusader_2/PNG/PNG Sequences/Running",
        frameCount: 12,
        fps: 14,
        loop: true,
        frameWidth: 900,
        frameHeight: 900,
        sequencePattern: "0_Skeleton_Crusader_Running_{frame:03d}.png"
      },
      slashing: {
        id: "skeleton2_slashing",
        name: "Slashing",
        basePath: "/sprites/2dassets/chibi-skeleton-crusader/Skeleton_Crusader_2/PNG/PNG Sequences/Slashing",
        frameCount: 12,
        fps: 14,
        loop: false,
        frameWidth: 900,
        frameHeight: 900,
        sequencePattern: "0_Skeleton_Crusader_Slashing_{frame:03d}.png"
      },
      hurt: {
        id: "skeleton2_hurt",
        name: "Hurt",
        basePath: "/sprites/2dassets/chibi-skeleton-crusader/Skeleton_Crusader_2/PNG/PNG Sequences/Hurt",
        frameCount: 12,
        fps: 12,
        loop: false,
        frameWidth: 900,
        frameHeight: 900,
        sequencePattern: "0_Skeleton_Crusader_Hurt_{frame:03d}.png"
      },
      dying: {
        id: "skeleton2_dying",
        name: "Dying",
        basePath: "/sprites/2dassets/chibi-skeleton-crusader/Skeleton_Crusader_2/PNG/PNG Sequences/Dying",
        frameCount: 15,
        fps: 10,
        loop: false,
        frameWidth: 900,
        frameHeight: 900,
        sequencePattern: "0_Skeleton_Crusader_Dying_{frame:03d}.png"
      }
    }
  },
  skeleton_crusader_3: {
    id: "skeleton_crusader_3",
    name: "Skeleton Crusader (Green)",
    description: "Armored skeleton warrior with green accents",
    basePath: "/sprites/2dassets/chibi-skeleton-crusader/Skeleton_Crusader_3/PNG/PNG Sequences",
    spriteSize: 900,
    animations: {
      idle: {
        id: "skeleton3_idle",
        name: "Idle",
        basePath: "/sprites/2dassets/chibi-skeleton-crusader/Skeleton_Crusader_3/PNG/PNG Sequences/Idle",
        frameCount: 18,
        fps: 12,
        loop: true,
        frameWidth: 900,
        frameHeight: 900,
        sequencePattern: "0_Skeleton_Crusader_Idle_{frame:03d}.png"
      },
      idle_blinking: {
        id: "skeleton3_idle_blinking",
        name: "Idle Blinking",
        basePath: "/sprites/2dassets/chibi-skeleton-crusader/Skeleton_Crusader_3/PNG/PNG Sequences/Idle Blinking",
        frameCount: 18,
        fps: 12,
        loop: true,
        frameWidth: 900,
        frameHeight: 900,
        sequencePattern: "0_Skeleton_Crusader_Idle Blinking_{frame:03d}.png"
      },
      walking: {
        id: "skeleton3_walking",
        name: "Walking",
        basePath: "/sprites/2dassets/chibi-skeleton-crusader/Skeleton_Crusader_3/PNG/PNG Sequences/Walking",
        frameCount: 24,
        fps: 16,
        loop: true,
        frameWidth: 900,
        frameHeight: 900,
        sequencePattern: "0_Skeleton_Crusader_Walking_{frame:03d}.png"
      },
      running: {
        id: "skeleton3_running",
        name: "Running",
        basePath: "/sprites/2dassets/chibi-skeleton-crusader/Skeleton_Crusader_3/PNG/PNG Sequences/Running",
        frameCount: 12,
        fps: 14,
        loop: true,
        frameWidth: 900,
        frameHeight: 900,
        sequencePattern: "0_Skeleton_Crusader_Running_{frame:03d}.png"
      },
      slashing: {
        id: "skeleton3_slashing",
        name: "Slashing",
        basePath: "/sprites/2dassets/chibi-skeleton-crusader/Skeleton_Crusader_3/PNG/PNG Sequences/Slashing",
        frameCount: 12,
        fps: 14,
        loop: false,
        frameWidth: 900,
        frameHeight: 900,
        sequencePattern: "0_Skeleton_Crusader_Slashing_{frame:03d}.png"
      },
      hurt: {
        id: "skeleton3_hurt",
        name: "Hurt",
        basePath: "/sprites/2dassets/chibi-skeleton-crusader/Skeleton_Crusader_3/PNG/PNG Sequences/Hurt",
        frameCount: 12,
        fps: 12,
        loop: false,
        frameWidth: 900,
        frameHeight: 900,
        sequencePattern: "0_Skeleton_Crusader_Hurt_{frame:03d}.png"
      },
      dying: {
        id: "skeleton3_dying",
        name: "Dying",
        basePath: "/sprites/2dassets/chibi-skeleton-crusader/Skeleton_Crusader_3/PNG/PNG Sequences/Dying",
        frameCount: 15,
        fps: 10,
        loop: false,
        frameWidth: 900,
        frameHeight: 900,
        sequencePattern: "0_Skeleton_Crusader_Dying_{frame:03d}.png"
      }
    }
  }
};

export interface RPGBattleEnemy {
  id: string;
  name: string;
  description: string;
  sheetPath: string;
  sheetWidth: number;
  sheetHeight: number;
  transparencyColor: string;
  animations: {
    [key: string]: {
      row: number;
      startFrame: number;
      frameCount: number;
      frameWidth: number;
      frameHeight: number;
      fps: number;
      loop: boolean;
    };
  };
}

export const ELF_HEROES: Record<string, RPGBattleEnemy> = {
  launa: {
    id: "launa",
    name: "Launa",
    description: "Swift elf rogue with dual daggers from Blandia - agile attacks",
    sheetPath: "/sprites/heroes/elf/launa_sheet.png",
    sheetWidth: 1600,
    sheetHeight: 400,
    transparencyColor: "#FF00FF",
    animations: {
      idle: {
        row: 0,
        startFrame: 0,
        frameCount: 4,
        frameWidth: 80,
        frameHeight: 100,
        fps: 8,
        loop: true
      },
      walk: {
        row: 0,
        startFrame: 4,
        frameCount: 6,
        frameWidth: 80,
        frameHeight: 100,
        fps: 10,
        loop: true
      },
      attack1: {
        row: 0,
        startFrame: 10,
        frameCount: 6,
        frameWidth: 100,
        frameHeight: 100,
        fps: 14,
        loop: false
      },
      crouch: {
        row: 1,
        startFrame: 0,
        frameCount: 3,
        frameWidth: 80,
        frameHeight: 80,
        fps: 8,
        loop: false
      },
      knockdown: {
        row: 1,
        startFrame: 6,
        frameCount: 5,
        frameWidth: 120,
        frameHeight: 60,
        fps: 10,
        loop: false
      },
      special1: {
        row: 2,
        startFrame: 0,
        frameCount: 6,
        frameWidth: 100,
        frameHeight: 100,
        fps: 14,
        loop: false
      },
      hit: {
        row: 1,
        startFrame: 3,
        frameCount: 3,
        frameWidth: 80,
        frameHeight: 100,
        fps: 10,
        loop: false
      },
      victory: {
        row: 0,
        startFrame: 0,
        frameCount: 4,
        frameWidth: 80,
        frameHeight: 100,
        fps: 6,
        loop: true
      }
    }
  }
};

export const HUMAN_HEROES: Record<string, RPGBattleEnemy> = {
  retsuzen: {
    id: "retsuzen",
    name: "Retsu Zen",
    description: "Samurai warrior with katana from Blandia - fast sword techniques",
    sheetPath: "/sprites/heroes/human/retsuzen_sheet.png",
    sheetWidth: 1600,
    sheetHeight: 2032,
    transparencyColor: "#FF00FF",
    animations: {
      idle: {
        row: 0,
        startFrame: 0,
        frameCount: 6,
        frameWidth: 100,
        frameHeight: 120,
        fps: 8,
        loop: true
      },
      walk: {
        row: 1,
        startFrame: 0,
        frameCount: 8,
        frameWidth: 100,
        frameHeight: 120,
        fps: 10,
        loop: true
      },
      attack1: {
        row: 2,
        startFrame: 0,
        frameCount: 8,
        frameWidth: 130,
        frameHeight: 120,
        fps: 14,
        loop: false
      },
      attack2: {
        row: 3,
        startFrame: 0,
        frameCount: 7,
        frameWidth: 130,
        frameHeight: 120,
        fps: 14,
        loop: false
      },
      crouch: {
        row: 4,
        startFrame: 0,
        frameCount: 4,
        frameWidth: 100,
        frameHeight: 90,
        fps: 8,
        loop: false
      },
      knockdown: {
        row: 5,
        startFrame: 0,
        frameCount: 6,
        frameWidth: 140,
        frameHeight: 70,
        fps: 10,
        loop: false
      },
      special1: {
        row: 6,
        startFrame: 0,
        frameCount: 10,
        frameWidth: 140,
        frameHeight: 120,
        fps: 16,
        loop: false
      },
      special2: {
        row: 7,
        startFrame: 0,
        frameCount: 12,
        frameWidth: 150,
        frameHeight: 120,
        fps: 16,
        loop: false
      },
      slash_wave: {
        row: 8,
        startFrame: 0,
        frameCount: 8,
        frameWidth: 160,
        frameHeight: 120,
        fps: 14,
        loop: false
      },
      hit: {
        row: 9,
        startFrame: 0,
        frameCount: 3,
        frameWidth: 100,
        frameHeight: 120,
        fps: 10,
        loop: false
      },
      victory: {
        row: 10,
        startFrame: 0,
        frameCount: 5,
        frameWidth: 100,
        frameHeight: 120,
        fps: 6,
        loop: true
      }
    }
  },
  diokles: {
    id: "diokles",
    name: "Diokles",
    description: "Golden armored knight with sword and shield from Blandia",
    sheetPath: "/sprites/heroes/barbarian/diokles_sheet.png",
    sheetWidth: 1600,
    sheetHeight: 1760,
    transparencyColor: "#FF00FF",
    animations: {
      idle: {
        row: 0,
        startFrame: 0,
        frameCount: 6,
        frameWidth: 100,
        frameHeight: 130,
        fps: 8,
        loop: true
      },
      walk: {
        row: 1,
        startFrame: 0,
        frameCount: 8,
        frameWidth: 100,
        frameHeight: 130,
        fps: 10,
        loop: true
      },
      attack1: {
        row: 2,
        startFrame: 0,
        frameCount: 8,
        frameWidth: 120,
        frameHeight: 130,
        fps: 12,
        loop: false
      },
      block: {
        row: 3,
        startFrame: 0,
        frameCount: 4,
        frameWidth: 100,
        frameHeight: 130,
        fps: 10,
        loop: false
      },
      crouch: {
        row: 4,
        startFrame: 0,
        frameCount: 3,
        frameWidth: 100,
        frameHeight: 100,
        fps: 8,
        loop: false
      },
      knockdown: {
        row: 5,
        startFrame: 0,
        frameCount: 6,
        frameWidth: 150,
        frameHeight: 80,
        fps: 10,
        loop: false
      },
      special1: {
        row: 6,
        startFrame: 0,
        frameCount: 10,
        frameWidth: 140,
        frameHeight: 130,
        fps: 14,
        loop: false
      },
      special2: {
        row: 7,
        startFrame: 0,
        frameCount: 8,
        frameWidth: 130,
        frameHeight: 130,
        fps: 12,
        loop: false
      },
      spin_attack: {
        row: 8,
        startFrame: 0,
        frameCount: 10,
        frameWidth: 150,
        frameHeight: 130,
        fps: 16,
        loop: false
      },
      hit: {
        row: 9,
        startFrame: 0,
        frameCount: 3,
        frameWidth: 100,
        frameHeight: 130,
        fps: 10,
        loop: false
      },
      victory: {
        row: 10,
        startFrame: 0,
        frameCount: 6,
        frameWidth: 100,
        frameHeight: 130,
        fps: 8,
        loop: true
      }
    }
  }
};

export const BARBARIAN_ENEMIES: Record<string, RPGBattleEnemy> = {
  mcgill: {
    id: "mcgill",
    name: "McGill",
    description: "Muscular barbarian warrior with broadsword from Blandia",
    sheetPath: "/sprites/enemies/barbarian/mcgill_sheet.png",
    sheetWidth: 1600,
    sheetHeight: 2096,
    transparencyColor: "#FF00FF",
    animations: {
      idle: {
        row: 0,
        startFrame: 0,
        frameCount: 6,
        frameWidth: 120,
        frameHeight: 130,
        fps: 8,
        loop: true
      },
      walk: {
        row: 1,
        startFrame: 0,
        frameCount: 8,
        frameWidth: 120,
        frameHeight: 130,
        fps: 10,
        loop: true
      },
      attack1: {
        row: 2,
        startFrame: 0,
        frameCount: 8,
        frameWidth: 140,
        frameHeight: 130,
        fps: 12,
        loop: false
      },
      attack2: {
        row: 3,
        startFrame: 0,
        frameCount: 6,
        frameWidth: 140,
        frameHeight: 130,
        fps: 14,
        loop: false
      },
      crouch: {
        row: 4,
        startFrame: 0,
        frameCount: 3,
        frameWidth: 120,
        frameHeight: 100,
        fps: 8,
        loop: false
      },
      knockdown: {
        row: 5,
        startFrame: 0,
        frameCount: 6,
        frameWidth: 150,
        frameHeight: 80,
        fps: 10,
        loop: false
      },
      getup: {
        row: 6,
        startFrame: 0,
        frameCount: 5,
        frameWidth: 120,
        frameHeight: 130,
        fps: 8,
        loop: false
      },
      special1: {
        row: 7,
        startFrame: 0,
        frameCount: 10,
        frameWidth: 160,
        frameHeight: 130,
        fps: 14,
        loop: false
      },
      special2: {
        row: 8,
        startFrame: 0,
        frameCount: 8,
        frameWidth: 140,
        frameHeight: 130,
        fps: 12,
        loop: false
      },
      hit: {
        row: 9,
        startFrame: 0,
        frameCount: 3,
        frameWidth: 120,
        frameHeight: 130,
        fps: 10,
        loop: false
      },
      victory: {
        row: 10,
        startFrame: 0,
        frameCount: 6,
        frameWidth: 120,
        frameHeight: 130,
        fps: 8,
        loop: true
      }
    }
  }
};

export interface GrassDecoration {
  id: string;
  name: string;
  path: string;
  width: number;
  height: number;
}

export const GRASS_DECORATIONS: GrassDecoration[] = [
  { id: "grass_1", name: "Grass Tuft 1", path: "/sprites/tiles/grass/1.png", width: 5, height: 6 },
  { id: "grass_2", name: "Grass Tuft 2", path: "/sprites/tiles/grass/2.png", width: 9, height: 6 },
  { id: "grass_3", name: "Grass Tuft 3", path: "/sprites/tiles/grass/3.png", width: 5, height: 7 },
  { id: "grass_4", name: "Grass Tuft 4", path: "/sprites/tiles/grass/4.png", width: 8, height: 5 },
  { id: "grass_5", name: "Grass Tuft 5", path: "/sprites/tiles/grass/5.png", width: 6, height: 10 },
  { id: "grass_6", name: "Grass Tuft 6", path: "/sprites/tiles/grass/6.png", width: 5, height: 8 }
];

export const ALL_CHARACTERS = {
  orcs: ORC_ANIMATIONS,
  vampires: VAMPIRE_ANIMATIONS,
  skeletons: SKELETON_CRUSADER_ANIMATIONS,
  barbarians: BARBARIAN_ENEMIES,
  humanHeroes: HUMAN_HEROES,
  elfHeroes: ELF_HEROES
};

export function getCharacterAnimation(
  category: "orcs" | "vampires" | "skeletons",
  characterId: string,
  animationName: string
): CharacterAnimation | SequenceAnimation | undefined {
  const characters = ALL_CHARACTERS[category];
  const character = characters[characterId as keyof typeof characters];
  if (!character) return undefined;
  return character.animations[animationName];
}

export function getRandomGrass(): GrassDecoration {
  return GRASS_DECORATIONS[Math.floor(Math.random() * GRASS_DECORATIONS.length)];
}

export function generateFramePath(animation: SequenceAnimation, frameIndex: number): string {
  const paddedFrame = frameIndex.toString().padStart(3, '0');
  const filename = animation.sequencePattern.replace('{frame:03d}', paddedFrame);
  return `${animation.basePath}/${filename}`;
}
