import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, jsonb, bigint, boolean, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table (already exists - keep as is)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  grudgeId: text("grudge_id").unique(), // Cross-game identifier: GRUDGE_<12_CHARS>
  email: text("email"), // Optional email for wallet and recovery
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Characters table
export const characters = pgTable("characters", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(), // Links to users if we add auth later
  accountId: varchar("account_id"), // UUID linking to accounts.id for sync
  /** Universe line: warlords | nexus | voxel | armada (GCS multi-era roster) */
  gameEra: text("game_era").notNull().default("warlords"),
  /** One active character per era per account */
  activeForEra: boolean("active_for_era").notNull().default(false),
  homeIslandId: varchar("home_island_id"), // UUID linking to home_islands.id for hero island association
  name: text("name").notNull(),
  /**
   * Human-facing Grudge hero code: GRDG-{RACE3}{CLASS3}-{suffix}
   * Distinct from `id` (Postgres UUID) and from account `grudgeId` (SSO).
   * SSOT generator: shared/characterIdentity.ts → makeCharacterGrudgeCode
   */
  grudgeCode: text("grudge_code"),
  raceId: text("race_id").notNull(),
  classId: text("class_id").notNull(),
  level: integer("level").notNull().default(0),
  xp: integer("xp").notNull().default(0),
  hp: integer("hp").notNull().default(100),
  energy: integer("energy").notNull().default(50),
  attributes: jsonb("attributes").notNull().$type<Record<string, number>>(),
  equipment: jsonb("equipment").notNull().$type<Record<string, string | null>>(),
  inventory: jsonb("inventory").notNull().$type<Array<{ itemId: string; quantity: number; tier?: number }>>().default(sql`'[]'::jsonb`),
  professionLevels: jsonb("profession_levels").notNull().$type<Record<string, { level: number; xp: number }>>().default(sql`'{}'::jsonb`),
  revivalTime: bigint("revival_time", { mode: "number" }), // Unix timestamp when hero can revive
  avatarUrl: text("avatar_url"), // AI-generated cartoon avatar
  // UMA-style 3D modular character appearance — persisted so character looks the same everywhere
  model3d: jsonb("model_3d").$type<{
    baseModelId: string;           // Race base model key (e.g. 'WK_Characters_customizable')
    equippedMeshes: Record<string, string>; // slot -> variant (e.g. { body: 'A', arms: 'B', head: 'C' })
    weaponSlots: Record<string, string>;    // weapon slot -> variant (e.g. { sword: 'A', shield: 'B' })
    faceVariant: string;           // Face mesh variant
    skinColor: string;             // Hex color override for skin material
    armorColor: string;            // Hex color override for armor tint
    capeEnabled: boolean;          // Whether cape is shown
    scale: number;                 // Character scale (default 1.0)
    grudge6?: boolean;
    sourceUrl?: string;
    gameEra?: 'warlords' | 'nexus' | 'voxel' | 'armada';
    voiceProfile?: string;
    shipId?: string;
    nexusMintId?: string;
    /** grudge6=warlords, toon=nexus 12, voxel=voxel, mech=armada mechs, armada_ship=legacy naval prop */
    renderPipeline?: 'grudge6' | 'toon' | 'voxel' | 'mech' | 'vrm' | 'armada_ship' | 'sprite2d';
    /** Mirror of characters.grudge_code for 3D clients that only read model3d */
    grudgeDisplayId?: string;
    grudgeCode?: string;
  }>().default(sql`'{"baseModelId":"default","equippedMeshes":{},"weaponSlots":{},"faceVariant":"A","skinColor":"#ffffff","armorColor":"#ffffff","capeEnabled":false,"scale":1.0}'::jsonb`),
  guildId: varchar("guild_id"),    // UUID linking to a guild/crew
  unspentAttributePoints: integer("unspent_attribute_points").notNull().default(0), // 7 points per level up
  skillPoints: integer("skill_points").notNull().default(1), // 1 point per level, starts with 1
  skillLoadouts: jsonb("skill_loadouts").notNull().$type<Record<string, {
    slots: {
      1: { skillId: string | null; upgradeLevel: number };
      2: { skillId: string | null; upgradeLevel: number };
      3: { skillId: string | null; upgradeLevel: number };
      4: { skillId: string | null; upgradeLevel: number };
    };
  }>>().default(sql`'{}'::jsonb`), // Skill loadouts per weapon type
  weaponSkillLevel: integer("weapon_skill_level").notNull().default(1), // 1-100 weapon mastery level
  weaponSkillSelections: jsonb("weapon_skill_selections").notNull().$type<Record<string, { hotkey2: string | null; hotkey3: string | null }>>().default(sql`'{}'::jsonb`), // Selected skills per weapon
  equippedWeaponId: text("equipped_weapon_id"), // Currently equipped weapon from weaponDatabase
  selectedSkills: jsonb("selected_skills").notNull().$type<Record<number, string>>().default(sql`'{}'::jsonb`), // Class skill tree selections by tier level
  // AI Personality System
  personality: jsonb("personality").$type<{
    trueGoals: string;      // What this character wants to achieve
    hobbies: string;        // What they like to do for fun
    obsessions: string;     // What they're obsessed with
    behavior: string;       // How they act and react
    catchphrase: string;    // Their signature saying
    fears: string;          // What they're afraid of
    generatedAt: number;    // When personality was generated
  }>(),
  chatTemperature: integer("chat_temperature").default(70), // 0-100, controls AI response creativity
  chatHistory: jsonb("chat_history").$type<Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
  }>>().default(sql`'[]'::jsonb`),
  // Phase 1: Sprite customization (HSL palette for 2D sprite colors)
  spriteConfig: jsonb("sprite_config").$type<{
    skinTone: number;   // 0-360 (HSL hue)
    hairColor: number;  // 0-360
    armorColor: number; // 0-360
    clothColor: number; // 0-360
  }>().default(sql`'{"skinTone":0,"hairColor":0,"armorColor":0,"clothColor":0}'::jsonb`),
  // Phase 1: cNFT tracking for character avatar
  cnftId: text("cnft_id"),           // Crossmint transaction ID
  cnftAddress: text("cnft_address"), // Solana mint address
  createdAt: bigint("created_at", { mode: "number" }).notNull().default(sql`extract(epoch from now()) * 1000`),
});

export const insertCharacterSchema = createInsertSchema(characters).omit({
  id: true,
  createdAt: true,
});

export type InsertCharacter = z.infer<typeof insertCharacterSchema>;
export type Character = typeof characters.$inferSelect;

// Party composition table
export const parties = pgTable("parties", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(), // One party per user for now
  accountId: varchar("account_id"), // UUID linking to accounts.id for sync
  characterIds: jsonb("character_ids").notNull().$type<string[]>().default(sql`'[]'::jsonb`), // Max 3
  updatedAt: bigint("updated_at", { mode: "number" }).notNull().default(sql`extract(epoch from now()) * 1000`),
});

export const insertPartySchema = createInsertSchema(parties).omit({
  id: true,
  updatedAt: true,
});

export type InsertParty = z.infer<typeof insertPartySchema>;
export type Party = typeof parties.$inferSelect;

// Resource nodes (for island gathering)
export const resourceNodes = pgTable("resource_nodes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  accountId: varchar("account_id"), // UUID linking to accounts.id for sync
  nodeId: text("node_id").notNull(), // References to client-side node definitions
  lastGathered: bigint("last_gathered", { mode: "number" }), // Unix timestamp
});

export const insertResourceNodeSchema = createInsertSchema(resourceNodes).omit({
  id: true,
});

export type InsertResourceNode = z.infer<typeof insertResourceNodeSchema>;
export type ResourceNode = typeof resourceNodes.$inferSelect;

// Player resources inventory
export const playerResources = pgTable("player_resources", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(),
  accountId: varchar("account_id"), // UUID linking to accounts.id for sync
  resources: jsonb("resources").notNull().$type<Record<string, number>>().default(sql`'{}'::jsonb`),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull().default(sql`extract(epoch from now()) * 1000`),
});

export const insertPlayerResourcesSchema = createInsertSchema(playerResources).omit({
  id: true,
  updatedAt: true,
});

export type InsertPlayerResources = z.infer<typeof insertPlayerResourcesSchema>;
export type PlayerResources = typeof playerResources.$inferSelect;

export const dungeonRuns = pgTable("dungeon_runs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  accountId: varchar("account_id"), // UUID linking to accounts.id for sync
  dungeonId: text("dungeon_id").notNull(),
  floorLevel: integer("floor_level").notNull().default(1),
  seed: integer("seed").notNull(),
  status: text("status").notNull().default("active"),
  partyState: jsonb("party_state").notNull().$type<{
    characters: Array<{
      id: string;
      hp: number;
      mana: number;
      x: number;
      y: number;
    }>;
  }>(),
  exploredTiles: jsonb("explored_tiles").notNull().$type<number[][]>().default(sql`'[]'::jsonb`),
  defeatedMonsters: jsonb("defeated_monsters").notNull().$type<string[]>().default(sql`'[]'::jsonb`),
  collectedLoot: jsonb("collected_loot").notNull().$type<Array<{ itemId: string; quantity: number }>>().default(sql`'[]'::jsonb`),
  startedAt: bigint("started_at", { mode: "number" }).notNull().default(sql`extract(epoch from now()) * 1000`),
  completedAt: bigint("completed_at", { mode: "number" }),
});

export const insertDungeonRunSchema = createInsertSchema(dungeonRuns).omit({
  id: true,
  startedAt: true,
  completedAt: true,
});

export type InsertDungeonRun = z.infer<typeof insertDungeonRunSchema>;
export type DungeonRun = typeof dungeonRuns.$inferSelect;

export const combatLogs = pgTable("combat_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  dungeonRunId: varchar("dungeon_run_id"),
  userId: varchar("user_id").notNull(),
  accountId: varchar("account_id"), // UUID linking to accounts.id for sync
  combatType: text("combat_type").notNull(),
  participants: jsonb("participants").notNull().$type<{
    heroes: Array<{ id: string; name: string; level: number }>;
    enemies: Array<{ id: string; name: string; level: number }>;
  }>(),
  actions: jsonb("actions").notNull().$type<Array<{
    turn: number;
    actorId: string;
    actorType: "hero" | "enemy";
    abilityId: string;
    targetId: string;
    damage: number;
    isCrit: boolean;
    effects: string[];
  }>>().default(sql`'[]'::jsonb`),
  result: text("result"),
  xpGained: integer("xp_gained").default(0),
  goldGained: integer("gold_gained").default(0),
  lootDropped: jsonb("loot_dropped").$type<Array<{ itemId: string; quantity: number }>>(),
  startedAt: bigint("started_at", { mode: "number" }).notNull().default(sql`extract(epoch from now()) * 1000`),
  endedAt: bigint("ended_at", { mode: "number" }),
});

export const insertCombatLogSchema = createInsertSchema(combatLogs).omit({
  id: true,
  startedAt: true,
  endedAt: true,
});

export type InsertCombatLog = z.infer<typeof insertCombatLogSchema>;
export type CombatLog = typeof combatLogs.$inferSelect;

export const characterAbilities = pgTable("character_abilities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  characterId: varchar("character_id").notNull(),
  abilityReferenceName: text("ability_reference_name").notNull(), // Uses reference name (no spaces, e.g., "BearForm")
  abilityType: text("ability_type").notNull(), // "spell" or "skill"
  abilityLevel: integer("ability_level").notNull().default(1), // Upgrade level for the ability
  slotIndex: integer("slot_index"), // Optional hotbar slot (1-4)
  unlockedAt: bigint("unlocked_at", { mode: "number" }).notNull().default(sql`extract(epoch from now()) * 1000`),
});

export const insertCharacterAbilitySchema = createInsertSchema(characterAbilities).omit({
  id: true,
  unlockedAt: true,
});

export type InsertCharacterAbility = z.infer<typeof insertCharacterAbilitySchema>;
export type CharacterAbility = typeof characterAbilities.$inferSelect;

export const gameSaves = pgTable("game_saves", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  saveName: text("save_name").notNull(),
  saveData: jsonb("save_data").notNull().$type<{
    characters: string[];
    party: string[];
    resources: Record<string, number>;
    gold: number;
    currentDungeon?: string;
    stats: {
      totalKills: number;
      totalDeaths: number;
      dungeonsCleared: number;
      playTime: number;
    };
  }>(),
  createdAt: bigint("created_at", { mode: "number" }).notNull().default(sql`extract(epoch from now()) * 1000`),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull().default(sql`extract(epoch from now()) * 1000`),
});

export const insertGameSaveSchema = createInsertSchema(gameSaves).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertGameSave = z.infer<typeof insertGameSaveSchema>;
export type GameSave = typeof gameSaves.$inferSelect;

// ============================================
// GAME CONTENT TABLES (Authoritative Data)
// ============================================

// Races table - authoritative race definitions
export const races = pgTable("races", {
  id: varchar("id", { length: 50 }).primaryKey(),
  name: text("name").notNull(),
  faction: text("faction").notNull(),
  description: text("description"),
  baseAttributes: jsonb("base_attributes").notNull().$type<Record<string, number>>(),
  passiveAbilities: jsonb("passive_abilities").$type<string[]>().default(sql`'[]'::jsonb`),
  spriteSheetId: text("sprite_sheet_id"),
  portraitPath: text("portrait_path"),
  // 3D model references for the engine
  modelUrl: text("model_url"),           // Base GLTF/FBX model URL (e.g. R2 CDN path)
  cavalryModelUrl: text("cavalry_model_url"), // Mounted model URL
  meshPrefix: text("mesh_prefix"),       // Equipment mesh prefix (e.g. 'WK_', 'ELF_', 'ORC_')
  textureVariants: jsonb("texture_variants").$type<Record<string, string>>(), // name -> texture URL
});

export type Race = typeof races.$inferSelect;

// Classes table - authoritative class definitions
export const classes = pgTable("classes", {
  id: varchar("id", { length: 50 }).primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  primaryAttribute: text("primary_attribute").notNull(),
  startingAbilities: jsonb("starting_abilities").$type<string[]>().default(sql`'[]'::jsonb`),
  baseStats: jsonb("base_stats").notNull().$type<{
    hp: number;
    mana: number;
    stamina: number;
  }>(),
  spriteVariant: text("sprite_variant"),
});

export type GameClass = typeof classes.$inferSelect;

// Items table - authoritative item definitions
export const items = pgTable("items", {
  id: varchar("id", { length: 100 }).primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  subType: text("sub_type"),
  rarity: text("rarity").notNull().default("common"),
  tier: integer("tier").notNull().default(1),
  description: text("description"),
  stats: jsonb("stats").$type<Record<string, number>>(),
  requirements: jsonb("requirements").$type<{ level?: number; attributes?: Record<string, number> }>(),
  spritePath: text("sprite_path"),
  stackable: boolean("stackable").default(false),
  maxStack: integer("max_stack").default(1),
  sellValue: integer("sell_value").default(0),
  grudgeUuid: varchar("grudge_uuid", { length: 40 }).unique(),
});

export type Item = typeof items.$inferSelect;

// Spells table - authoritative spell definitions
export const spells = pgTable("spells", {
  id: varchar("id", { length: 100 }).primaryKey(),
  name: text("name").notNull(),
  referenceName: text("reference_name").notNull(), // No spaces - used for scripting (e.g., "BearForm" not "Bear Form")
  school: text("school").notNull(),
  damageType: text("damage_type"),
  baseDamage: integer("base_damage"),
  manaCost: integer("mana_cost").notNull(),
  cooldown: integer("cooldown").default(0),
  range: integer("range").default(1),
  areaOfEffect: integer("area_of_effect").default(0),
  description: text("description"),
  levelRequired: integer("level_required").default(1),
  effects: jsonb("effects").$type<Array<{ type: string; value: number; duration?: number }>>(),
  visualEffect: jsonb("visual_effect").$type<{ animation: string; color: string; particles?: string }>(),
});

export type Spell = typeof spells.$inferSelect;

// Skills table - authoritative skill definitions
export const skills = pgTable("skills", {
  id: varchar("id", { length: 100 }).primaryKey(),
  name: text("name").notNull(),
  referenceName: text("reference_name").notNull(), // No spaces - used for scripting (e.g., "PowerStrike" not "Power Strike")
  weaponType: text("weapon_type").notNull(),
  damageType: text("damage_type"),
  damageMultiplier: integer("damage_multiplier").default(100),
  staminaCost: integer("stamina_cost").notNull(),
  cooldown: integer("cooldown").default(0),
  description: text("description"),
  levelRequired: integer("level_required").default(1),
  comboPosition: integer("combo_position"),
  effects: jsonb("effects").$type<Array<{ type: string; value: number; duration?: number }>>(),
  visualEffect: jsonb("visual_effect").$type<{ animation: string; color: string }>(),
});

export type Skill = typeof skills.$inferSelect;

// Monsters table - authoritative monster definitions
export const monsters = pgTable("monsters", {
  id: varchar("id", { length: 100 }).primaryKey(),
  name: text("name").notNull(),
  level: integer("level").notNull(),
  isBoss: boolean("is_boss").default(false),
  hp: integer("hp").notNull(),
  damage: integer("damage").notNull(),
  defense: integer("defense").default(0),
  speed: integer("speed").default(10),
  xpReward: integer("xp_reward").notNull(),
  goldReward: integer("gold_reward").default(0),
  abilities: jsonb("abilities").$type<string[]>().default(sql`'[]'::jsonb`),
  weaknesses: jsonb("weaknesses").$type<string[]>().default(sql`'[]'::jsonb`),
  resistances: jsonb("resistances").$type<string[]>().default(sql`'[]'::jsonb`),
  lootTable: jsonb("loot_table").$type<Array<{ itemId: string; chance: number; minQty?: number; maxQty?: number }>>(),
  spriteSheetId: text("sprite_sheet_id"),
  description: text("description"),
});

export type Monster = typeof monsters.$inferSelect;

// ============================================
// ASSET MANAGEMENT TABLES
// ============================================

// Sprite sheets table - metadata for sprite animations
export const spriteSheets = pgTable("sprite_sheets", {
  id: varchar("id", { length: 100 }).primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  filePath: text("file_path").notNull(),
  sheetWidth: integer("sheet_width").notNull(),
  sheetHeight: integer("sheet_height").notNull(),
  frameWidth: integer("frame_width").notNull(),
  frameHeight: integer("frame_height").notNull(),
  framesPerRow: integer("frames_per_row").notNull(),
  framesPerColumn: integer("frames_per_column").notNull(),
  anchorX: integer("anchor_x").default(50),
  anchorY: integer("anchor_y").default(100),
  animations: jsonb("animations").$type<Record<string, {
    row: number;
    frameCount: number;
    frameDuration: number;
  }>>(),
});

export type SpriteSheet = typeof spriteSheets.$inferSelect;

// Dungeon templates table - defines dungeon layouts and configurations
export const dungeonTemplates = pgTable("dungeon_templates", {
  id: varchar("id", { length: 100 }).primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  minLevel: integer("min_level").notNull().default(1),
  maxLevel: integer("max_level").notNull().default(10),
  floorCount: integer("floor_count").notNull().default(1),
  width: integer("width").notNull().default(50),
  height: integer("height").notNull().default(50),
  theme: text("theme").notNull().default("dungeon"),
  tilesetId: text("tileset_id"),
  monsterIds: jsonb("monster_ids").$type<string[]>().default(sql`'[]'::jsonb`),
  bossId: text("boss_id"),
  lootTable: jsonb("loot_table").$type<Array<{ itemId: string; chance: number }>>(),
  specialRooms: jsonb("special_rooms").$type<Array<{ type: string; chance: number }>>(),
});

export type DungeonTemplate = typeof dungeonTemplates.$inferSelect;

// Tilesets table - tile graphics for dungeons
export const tilesets = pgTable("tilesets", {
  id: varchar("id", { length: 100 }).primaryKey(),
  name: text("name").notNull(),
  filePath: text("file_path").notNull(),
  tileSize: integer("tile_size").notNull().default(32),
  tileDefinitions: jsonb("tile_definitions").$type<Record<string, {
    x: number;
    y: number;
    walkable: boolean;
    transparent: boolean;
  }>>(),
});

export type Tileset = typeof tilesets.$inferSelect;

// ============================================
// PROFESSION & EXPERIENCE SYSTEM
// ============================================

// Profession types for reference
export const PROFESSION_IDS = [
  'mining', 'logging', 'skinning', 'fishing', 'herbalism', 'scavenging',
  'miner', 'forester', 'mystic', 'engineer', 'chef'
] as const;
export type ProfessionId = typeof PROFESSION_IDS[number];

// Character profession levels with decay tracking
export const characterProfessions = pgTable("character_professions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  characterId: varchar("character_id").notNull(),
  professionId: text("profession_id").notNull(), // mining, logging, skinning, fishing, herbalism, scavenging, miner, forester, mystic, engineer, chef
  level: integer("level").notNull().default(1),
  xp: integer("xp").notNull().default(0),
  lastGainAt: bigint("last_gain_at", { mode: "number" }), // Last time XP was gained in this profession
  lastDecayCheckAt: bigint("last_decay_check_at", { mode: "number" }), // Last time decay was calculated
  createdAt: bigint("created_at", { mode: "number" }).notNull().default(sql`extract(epoch from now()) * 1000`),
});

export const insertCharacterProfessionSchema = createInsertSchema(characterProfessions).omit({
  id: true,
  createdAt: true,
});

export type InsertCharacterProfession = z.infer<typeof insertCharacterProfessionSchema>;
export type CharacterProfession = typeof characterProfessions.$inferSelect;

// Experience events for XP auditing
export const experienceEvents = pgTable("experience_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  characterId: varchar("character_id").notNull(),
  source: text("source").notNull(), // 'idle_harvesting', 'combat', 'dungeon_clear', 'crafting', 'quest', 'profession_use'
  xpAmount: integer("xp_amount").notNull(),
  professionId: text("profession_id"), // If this event also grants profession XP
  professionXpAmount: integer("profession_xp_amount"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(), // Additional context
  createdAt: bigint("created_at", { mode: "number" }).notNull().default(sql`extract(epoch from now()) * 1000`),
});

export const insertExperienceEventSchema = createInsertSchema(experienceEvents).omit({
  id: true,
  createdAt: true,
});

export type InsertExperienceEvent = z.infer<typeof insertExperienceEventSchema>;
export type ExperienceEvent = typeof experienceEvents.$inferSelect;

// Profession XP thresholds for tiered progression
// Level 1-50: Easy, level 50-90: Medium, level 90-100: Hard
export const PROFESSION_LEVEL_THRESHOLDS: Record<number, number> = (() => {
  const thresholds: Record<number, number> = {};
  let totalXp = 0;
  
  for (let level = 1; level <= 100; level++) {
    if (level <= 50) {
      totalXp += 100 * level; // Easy: 100, 200, 300... XP per level
    } else if (level <= 90) {
      totalXp += 300 * level; // Medium: Higher XP requirements
    } else {
      totalXp += 1000 * level; // Hard: Very high XP requirements
    }
    thresholds[level] = totalXp;
  }
  
  return thresholds;
})();

// Decay constants
export const PROFESSION_DECAY_GRACE_PERIOD_MS = 18 * 60 * 60 * 1000; // 18 hours
export const PROFESSION_DECAY_FULL_PERIOD_MS = 21 * 24 * 60 * 60 * 1000; // 21 days to go from 100 to 50
export const PROFESSION_MIN_LEVEL_AFTER_DECAY = 50; // Can't decay below 50

// ============================================
// UNLOCKED SKILL NODES
// ============================================

// Tracks which skill tree nodes characters have unlocked
export const unlockedSkills = pgTable("unlocked_skills", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  characterId: varchar("character_id").notNull(),
  nodeId: text("node_id").notNull(), // Matches the ID from profession tree data
  profession: text("profession").notNull(), // "Miner", "Forester", "Mystic", "Chef", "Engineer"
  unlockedAt: bigint("unlocked_at", { mode: "number" }).notNull().default(sql`extract(epoch from now()) * 1000`),
});

export const insertUnlockedSkillSchema = createInsertSchema(unlockedSkills).omit({
  id: true,
  unlockedAt: true,
});

export type InsertUnlockedSkill = z.infer<typeof insertUnlockedSkillSchema>;
export type UnlockedSkill = typeof unlockedSkills.$inferSelect;

// ============================================
// ACCOUNT-LEVEL SHARED INVENTORY
// ============================================

// Accounts table - central account for cross-app data sharing
export const accounts = pgTable("accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(), // Links to users table
  grudgeId: text("grudge_id").unique(), // Cross-game identifier: GRUDGE_<12_CHARS>
  displayName: text("display_name"),
  homeIslandId: varchar("home_island_id"), // UUID linking to home_islands.id
  homeIsland: boolean("home_island").notNull().default(false), // True after first island cutscene completed
  homeIslandMintActionId: text("home_island_mint_action_id"), // Crossmint action ID for island cNFT mint
  gold: integer("gold").notNull().default(0),
  premiumCurrency: integer("premium_currency").notNull().default(0),
  gbuxBalance: integer("gbux_balance").notNull().default(0), // GbuX token balance
  characterTokens: integer("character_tokens").notNull().default(1), // Tokens for creating new Warlords-era characters (1 free on account creation, +1 per boss clear)
  /** Per-era roster caps and active IDs (GCS). Product law: warlords 4 grudge6, nexus 12 toon, voxel 4, armada 4 mechs. */
  eraSlots: jsonb("era_slots").$type<{
    warlords: { max: number; activeCharacterId: string | null };
    nexus: { max: number; activeCharacterId: string | null };
    voxel: { max: number; activeCharacterId: string | null };
    armada: { max: number; activeCharacterId: string | null };
  }>().default(sql`'{"warlords":{"max":4,"activeCharacterId":null},"nexus":{"max":12,"activeCharacterId":null},"voxel":{"max":4,"activeCharacterId":null},"armada":{"max":4,"activeCharacterId":null}}'::jsonb`),
  accountXp: integer("account_xp").notNull().default(0), // Total aggregated XP from all characters
  avatarUrl: text("avatar_url"), // Custom avatar image URL
  // Solana wallet fields
  walletAddress: text("wallet_address"), // Solana wallet address (either Crossmint custodial or external)
  walletType: text("wallet_type"), // 'crossmint' (server-managed) or 'external' (WalletConnect)
  crossmintWalletId: text("crossmint_wallet_id"), // Crossmint's internal wallet identifier
  crossmintEmail: text("crossmint_email"), // Email used for Crossmint wallet (for recovery)
  createdAt: bigint("created_at", { mode: "number" }).notNull().default(sql`extract(epoch from now()) * 1000`),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull().default(sql`extract(epoch from now()) * 1000`),
});

export const insertAccountSchema = createInsertSchema(accounts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertAccount = z.infer<typeof insertAccountSchema>;
export type Account = typeof accounts.$inferSelect;

// Account inventory - normalized item storage at account level
// Items here are shared across all characters and apps
export const accountInventory = pgTable("account_inventory", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  accountId: varchar("account_id").notNull(), // Links to accounts table
  itemId: text("item_id").notNull(), // References items table or static item definitions
  quantity: integer("quantity").notNull().default(1),
  tier: integer("tier").default(1), // Item tier for crafted/upgraded items
  quality: text("quality").default("normal"), // normal, magic, rare, epic, legendary
  boundToCharacterId: varchar("bound_to_character_id"), // If null, available to all characters
  metadata: jsonb("metadata").$type<{
    craftedBy?: string; // Character ID who crafted it
    craftedAt?: number; // Timestamp
    enchantments?: string[]; // Applied enchantments
    durability?: number; // Current durability
    maxDurability?: number;
    customName?: string; // Player-given name
    sourceApp?: string; // Which app created this item
  }>(),
  createdAt: bigint("created_at", { mode: "number" }).notNull().default(sql`extract(epoch from now()) * 1000`),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull().default(sql`extract(epoch from now()) * 1000`),
});

export const insertAccountInventorySchema = createInsertSchema(accountInventory).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertAccountInventory = z.infer<typeof insertAccountInventorySchema>;
export type AccountInventoryItem = typeof accountInventory.$inferSelect;

// Account resources - centralized resource storage (replaces per-character resources)
export const accountResources = pgTable("account_resources", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  accountId: varchar("account_id").notNull().unique(), // One per account
  resources: jsonb("resources").notNull().$type<Record<string, number>>().default(sql`'{}'::jsonb`),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull().default(sql`extract(epoch from now()) * 1000`),
});

export const insertAccountResourcesSchema = createInsertSchema(accountResources).omit({
  id: true,
  updatedAt: true,
});

export type InsertAccountResources = z.infer<typeof insertAccountResourcesSchema>;
export type AccountResources = typeof accountResources.$inferSelect;

// Home Islands - each account gets one unique home island
// The state field is a flexible JSONB blob - the client transforms it to its own IslandState format
export const homeIslands = pgTable("home_islands", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  accountId: varchar("account_id").notNull().unique(), // One island per account
  seed: text("seed").notNull(), // UUID seed for deterministic generation
  name: text("name").notNull().default("Home Island"),
  mapStyle: text("map_style").notNull().default("iron"), // iron, fantasy, tactical, night
  mapImageUrl: text("map_image_url"), // Generated island map image
  thumbnailUrl: text("thumbnail_url"), // Low-res thumbnail
  state: jsonb("state").notNull().$type<Record<string, unknown>>().default(sql`'{}'::jsonb`),
  // Phase 1: cNFT tracking for island
  cnftId: text("cnft_id"),           // Crossmint transaction ID
  cnftAddress: text("cnft_address"), // Solana mint address
  // Phase 1: Validation timestamp (null = ephemeral, set = committed to gameplay)
  validatedAt: bigint("validated_at", { mode: "number" }), // Epoch milliseconds
  createdAt: bigint("created_at", { mode: "number" }).notNull().default(sql`extract(epoch from now()) * 1000`),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull().default(sql`extract(epoch from now()) * 1000`),
});

export const insertHomeIslandSchema = createInsertSchema(homeIslands).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertHomeIsland = z.infer<typeof insertHomeIslandSchema>;
export type HomeIsland = typeof homeIslands.$inferSelect;

// Island state type for client-side use
export type IslandState = NonNullable<HomeIsland['state']>;

// Sprite manifest - catalog of all sprites in object storage
export const spriteManifest = pgTable("sprite_manifest", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  category: text("category").notNull(), // e.g., 'heroes', 'enemies', 'effects', 'ui'
  subcategory: text("subcategory"), // e.g., 'human', 'orc', 'fire_spells'
  name: text("name").notNull(), // Display name
  filename: text("filename"), // Original filename
  localPath: text("local_path"), // Original local path (e.g., /sprites/heroes/human/idle.png)
  objectPath: text("object_path"), // Path in object storage (set after migration)
  publicUrl: text("public_url"), // CDN/public URL if available
  width: integer("width"),
  height: integer("height"),
  frameCount: integer("frame_count").default(1), // For animated sprites
  frameWidth: integer("frame_width"), // Individual frame width
  frameHeight: integer("frame_height"), // Individual frame height
  animationType: text("animation_type"), // 'idle', 'walk', 'attack', 'death', etc.
  tags: text("tags").array(), // Searchable tags
  metadata: jsonb("metadata").$type<{
    source?: string; // Original source/pack
    artist?: string;
    license?: string;
    directions?: number; // For directional sprites (4, 8)
    fps?: number; // Animation framerate
    loop?: boolean;
  }>(),
  fileSize: integer("file_size"), // In bytes
  mimeType: text("mime_type").default("image/png"),
  syncStatus: text("sync_status").default("pending"), // 'pending', 'syncing', 'synced', 'error'
  syncedAt: bigint("synced_at", { mode: "number" }),
  syncError: text("sync_error"),
  createdAt: bigint("created_at", { mode: "number" }).notNull().default(sql`extract(epoch from now()) * 1000`),
});

export const insertSpriteManifestSchema = createInsertSchema(spriteManifest).omit({
  id: true,
  createdAt: true,
  syncedAt: true,
});

export type InsertSpriteManifest = z.infer<typeof insertSpriteManifestSchema>;
export type SpriteManifestEntry = typeof spriteManifest.$inferSelect;

// ============================================
// AI SPRITE GENERATION SYSTEM
// ============================================

// Animation slot definitions for sprite units
export const AnimationSlots = [
  "idle", "walk", "walk2", "run", 
  "attack", "attack2", "attack3", 
  "cast", "heal", "hurt", "death", "block"
] as const;
export type AnimationSlot = typeof AnimationSlots[number];

// Sprite unit specification - defines a complete sprite unit for generation
export const spriteUnitSpecs = pgTable("sprite_unit_specs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(), // Display name (e.g., "Dark Knight", "Fire Mage")
  unitId: text("unit_id").notNull().unique(), // Folder/file identifier (e.g., "Dark Knight")
  
  // Classification
  category: text("category").notNull(), // "player", "enemy", "npc", "boss"
  race: text("race"), // "human", "orc", "elf", "undead", etc.
  classType: text("class_type"), // "warrior", "mage", "ranger", "priest"
  faction: text("faction"), // "crusade", "legion", "fabled"
  
  // Visual traits for AI generation
  traits: jsonb("traits").notNull().$type<{
    weapon?: string; // "sword", "axe", "staff", "bow"
    armor?: string; // "plate", "leather", "robes", "none"
    style?: string; // "dark", "holy", "fire", "ice", "nature"
    size?: string; // "small", "medium", "large"
    features?: string[]; // ["horns", "wings", "tail", "glowing_eyes"]
    colors?: { primary?: string; secondary?: string; accent?: string };
  }>().default(sql`'{}'::jsonb`),
  
  // Frame specifications
  frameWidth: integer("frame_width").notNull().default(100),
  frameHeight: integer("frame_height").notNull().default(100),
  
  // Animation configuration
  animations: jsonb("animations").notNull().$type<{
    [K in AnimationSlot]?: {
      enabled: boolean;
      frameCount: number;
      fps: number;
      loop: boolean;
      hasEffect?: boolean; // For attack effects
    };
  }>().default(sql`'{}'::jsonb`),
  
  // Generation status
  status: text("status").notNull().default("draft"), // "draft", "generating", "complete", "failed"
  generatedAssets: jsonb("generated_assets").$type<{
    base?: string[]; // Paths to base animation spritesheets
    withShadows?: string[]; // Paths to with-shadows versions
    splitEffects?: string[]; // Paths to split effect spritesheets
    projectiles?: string[]; // Paths to projectile effects
    shadowSprites?: string[]; // Paths to shadow-only sprites
    fullSheet?: string; // Path to combined spritesheet
  }>(),
  
  // Storage paths
  basePath: text("base_path"), // Root folder path after generation
  objectStoragePath: text("object_storage_path"), // Object storage location
  
  // AI generation metadata
  promptTemplate: text("prompt_template"), // Custom prompt override
  referenceImageUrl: text("reference_image_url"), // Reference for style consistency
  generationSettings: jsonb("generation_settings").$type<{
    model?: string;
    style?: string; // "pixel-art", "fantasy", "anime"
    quality?: string; // "draft", "standard", "high"
    seed?: number; // For reproducibility
  }>(),
  
  createdAt: bigint("created_at", { mode: "number" }).notNull().default(sql`extract(epoch from now()) * 1000`),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull().default(sql`extract(epoch from now()) * 1000`),
});

export const insertSpriteUnitSpecSchema = createInsertSchema(spriteUnitSpecs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSpriteUnitSpec = z.infer<typeof insertSpriteUnitSpecSchema>;
export type SpriteUnitSpec = typeof spriteUnitSpecs.$inferSelect;

// Sprite generation jobs - tracks AI generation tasks
export const spriteGenerationJobs = pgTable("sprite_generation_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  specId: varchar("spec_id").notNull(), // References spriteUnitSpecs
  
  // Job details
  status: text("status").notNull().default("pending"), // "pending", "processing", "completed", "failed"
  currentStep: text("current_step"), // "idle", "walk", "attack", etc.
  progress: integer("progress").notNull().default(0), // 0-100
  
  // Generation prompts used
  prompts: jsonb("prompts").$type<{
    [K in AnimationSlot]?: string;
  }>(),
  
  // Results
  generatedImages: jsonb("generated_images").$type<{
    [K in AnimationSlot]?: {
      url: string;
      localPath?: string;
      objectPath?: string;
      metadata?: Record<string, unknown>;
    };
  }>(),
  
  // Error tracking
  errors: jsonb("errors").$type<Array<{
    step: string;
    message: string;
    timestamp: number;
  }>>(),
  
  // Timing
  startedAt: bigint("started_at", { mode: "number" }),
  completedAt: bigint("completed_at", { mode: "number" }),
  createdAt: bigint("created_at", { mode: "number" }).notNull().default(sql`extract(epoch from now()) * 1000`),
});

export const insertSpriteGenerationJobSchema = createInsertSchema(spriteGenerationJobs).omit({
  id: true,
  createdAt: true,
});

export type InsertSpriteGenerationJob = z.infer<typeof insertSpriteGenerationJobSchema>;
export type SpriteGenerationJob = typeof spriteGenerationJobs.$inferSelect;

// Prompt blueprints - reusable templates for consistent AI generation
export const promptBlueprints = pgTable("prompt_blueprints", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  
  // Template structure
  basePrompt: text("base_prompt").notNull(), // Core prompt template with {placeholders}
  styleModifiers: jsonb("style_modifiers").$type<{
    pixelArt?: string;
    fantasy?: string;
    anime?: string;
  }>(),
  
  // Trait mappings - how to translate traits to prompt text
  traitMappings: jsonb("trait_mappings").$type<{
    races?: Record<string, string>; // e.g., { "orc": "green-skinned muscular orc" }
    classes?: Record<string, string>;
    weapons?: Record<string, string>;
    armors?: Record<string, string>;
    styles?: Record<string, string>;
  }>(),
  
  // Animation-specific prompts
  animationPrompts: jsonb("animation_prompts").$type<{
    [K in AnimationSlot]?: string; // Additional prompt text per animation
  }>(),
  
  // Quality settings
  negativePrompt: text("negative_prompt"),
  
  isDefault: boolean("is_default").default(false),
  createdAt: bigint("created_at", { mode: "number" }).notNull().default(sql`extract(epoch from now()) * 1000`),
});

export const insertPromptBlueprintSchema = createInsertSchema(promptBlueprints).omit({
  id: true,
  createdAt: true,
});

export type InsertPromptBlueprint = z.infer<typeof insertPromptBlueprintSchema>;
export type PromptBlueprint = typeof promptBlueprints.$inferSelect;

// ============================================
// AI UNITS - Converted player characters for AI control
// ============================================

export type AIBehavior = 'aggressive' | 'defensive' | 'balanced' | 'support' | 'berserker';
export type AIDifficulty = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export const aiUnits = pgTable("ai_units", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  
  sourceCharacterId: varchar("source_character_id"), 
  originAccountId: varchar("origin_account_id"),
  
  raceId: text("race_id").notNull(),
  classId: text("class_id").notNull(),
  level: integer("level").notNull().default(1),
  
  attributes: jsonb("attributes").notNull().$type<Record<string, number>>(),
  equipment: jsonb("equipment").notNull().$type<Record<string, string | null>>(),
  abilities: jsonb("abilities").notNull().$type<Array<{
    referenceName: string;
    type: 'spell' | 'skill';
    level: number;
  }>>().default(sql`'[]'::jsonb`),
  
  aiBehavior: text("ai_behavior").notNull().default('balanced').$type<AIBehavior>(),
  difficultyTier: integer("difficulty_tier").notNull().default(1).$type<AIDifficulty>(),
  
  assignedIslandId: varchar("assigned_island_id"),
  assignedIslandName: text("assigned_island_name"),
  
  learningData: jsonb("learning_data").$type<{
    totalBattles: number;
    wins: number;
    losses: number;
    favoriteAbilities: string[];
    avgDamageDealt: number;
    avgDamageTaken: number;
    lastBattleAt: number;
  }>().default(sql`'{"totalBattles": 0, "wins": 0, "losses": 0, "favoriteAbilities": [], "avgDamageDealt": 0, "avgDamageTaken": 0, "lastBattleAt": 0}'::jsonb`),
  
  isActive: boolean("is_active").notNull().default(true),
  avatarUrl: text("avatar_url"),
  
  createdAt: bigint("created_at", { mode: "number" }).notNull().default(sql`extract(epoch from now()) * 1000`),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull().default(sql`extract(epoch from now()) * 1000`),
});

export const insertAIUnitSchema = createInsertSchema(aiUnits).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertAIUnit = z.infer<typeof insertAIUnitSchema>;
export type AIUnit = typeof aiUnits.$inferSelect;

// ============================================
// API CALL LOGGING & ANALYTICS
// ============================================

// API call logs - tracks all API requests for usage analytics and debugging
export const apiCallLogs = pgTable("api_call_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id"), // Optional - may be anonymous requests
  accountId: varchar("account_id"), // Links to accounts table
  
  // Request details
  method: text("method").notNull(), // GET, POST, PUT, DELETE, PATCH
  path: text("path").notNull(), // /api/characters, /api/account, etc.
  statusCode: integer("status_code").notNull(),
  responseTimeMs: integer("response_time_ms"), // Response time in milliseconds
  
  // Request metadata
  userAgent: text("user_agent"),
  ipAddress: text("ip_address"),
  requestBody: jsonb("request_body").$type<Record<string, unknown>>(), // Sanitized request body
  
  // Error tracking
  errorMessage: text("error_message"),
  errorStack: text("error_stack"),
  
  createdAt: bigint("created_at", { mode: "number" }).notNull().default(sql`extract(epoch from now()) * 1000`),
});

export const insertApiCallLogSchema = createInsertSchema(apiCallLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertApiCallLog = z.infer<typeof insertApiCallLogSchema>;
export type ApiCallLog = typeof apiCallLogs.$inferSelect;

// Account sessions - tracks login sessions for security and analytics
export const accountSessions = pgTable("account_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  accountId: varchar("account_id").notNull(),
  
  // Session details
  sessionToken: text("session_token").notNull().unique(),
  userAgent: text("user_agent"),
  ipAddress: text("ip_address"),
  
  // Session state
  isActive: boolean("is_active").notNull().default(true),
  lastActiveAt: bigint("last_active_at", { mode: "number" }).notNull().default(sql`extract(epoch from now()) * 1000`),
  
  // Timing
  createdAt: bigint("created_at", { mode: "number" }).notNull().default(sql`extract(epoch from now()) * 1000`),
  expiresAt: bigint("expires_at", { mode: "number" }), // Optional expiration
});

export const insertAccountSessionSchema = createInsertSchema(accountSessions).omit({
  id: true,
  createdAt: true,
});

export type InsertAccountSession = z.infer<typeof insertAccountSessionSchema>;
export type AccountSession = typeof accountSessions.$inferSelect;

// Activity logs - tracks account-level activities for audit trail
export const activityLogs = pgTable("activity_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  accountId: varchar("account_id"),
  characterId: varchar("character_id"), // Optional - for character-specific activities
  
  // Activity details
  action: text("action").notNull(), // 'login', 'logout', 'character_create', 'item_craft', 'dungeon_enter', etc.
  category: text("category").notNull(), // 'auth', 'character', 'combat', 'crafting', 'trading', 'admin'
  details: jsonb("details").$type<Record<string, unknown>>(), // Additional context
  
  // Impact tracking
  goldChange: integer("gold_change").default(0), // +/- gold for transaction tracking
  xpChange: integer("xp_change").default(0), // XP changes
  itemsChanged: jsonb("items_changed").$type<Array<{ itemId: string; quantity: number; action: 'add' | 'remove' }>>(),
  
  createdAt: bigint("created_at", { mode: "number" }).notNull().default(sql`extract(epoch from now()) * 1000`),
});

export const insertActivityLogSchema = createInsertSchema(activityLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type ActivityLog = typeof activityLogs.$inferSelect;

// Analytics events - generic event tracking for analytics dashboard
export const analyticsEvents = pgTable("analytics_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id"),
  accountId: varchar("account_id"),
  
  // Event details
  eventType: text("event_type").notNull(), // 'page_view', 'button_click', 'feature_use', 'error', etc.
  eventName: text("event_name").notNull(), // Specific event identifier
  eventData: jsonb("event_data").$type<Record<string, unknown>>(), // Event-specific data
  
  // Context
  page: text("page"), // Current page/route
  component: text("component"), // UI component if applicable
  
  createdAt: bigint("created_at", { mode: "number" }).notNull().default(sql`extract(epoch from now()) * 1000`),
});

export const insertAnalyticsEventSchema = createInsertSchema(analyticsEvents).omit({
  id: true,
  createdAt: true,
});

export type InsertAnalyticsEvent = z.infer<typeof insertAnalyticsEventSchema>;
export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;

// Daily aggregated stats - for performance dashboards
export const dailyStats = pgTable("daily_stats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  date: text("date").notNull().unique(), // YYYY-MM-DD format
  
  // User metrics
  totalUsers: integer("total_users").notNull().default(0),
  activeUsers: integer("active_users").notNull().default(0),
  newUsers: integer("new_users").notNull().default(0),
  
  // Character metrics
  totalCharacters: integer("total_characters").notNull().default(0),
  charactersCreated: integer("characters_created").notNull().default(0),
  
  // Gameplay metrics
  dungeonRuns: integer("dungeon_runs").notNull().default(0),
  combatEncounters: integer("combat_encounters").notNull().default(0),
  itemsCrafted: integer("items_crafted").notNull().default(0),
  
  // API metrics
  apiCalls: integer("api_calls").notNull().default(0),
  apiErrors: integer("api_errors").notNull().default(0),
  avgResponseTimeMs: integer("avg_response_time_ms"),
  
  // Economy metrics
  goldCirculated: bigint("gold_circulated", { mode: "number" }).notNull().default(0),
  itemsTraded: integer("items_traded").notNull().default(0),
  
  createdAt: bigint("created_at", { mode: "number" }).notNull().default(sql`extract(epoch from now()) * 1000`),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull().default(sql`extract(epoch from now()) * 1000`),
});

export const insertDailyStatsSchema = createInsertSchema(dailyStats).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertDailyStats = z.infer<typeof insertDailyStatsSchema>;
export type DailyStats = typeof dailyStats.$inferSelect;

// ============================================
// GBUX TRANSACTION LEDGER
// ============================================

// Whitelist of earnable event types for GBUX validation
export const GBUX_EVENT_TYPES = [
  'dungeon_reward',
  'combat_reward',
  'quest_reward',
  'mission_reward',
  'harvest_reward',
  'crafting_reward',
  'daily_bonus',
  'achievement_reward',
  'ai_agent_transfer',  // Server-side AI moves (no fee)
  'swap_deposit',       // SOL -> GBUX (1% fee)
  'swap_withdrawal',    // GBUX -> SOL (5% fee)
  'admin_grant',        // Admin grants (audit trail)
  'telegram_purchase',  // Telegram Stars → GBUX (on-chain + ledger)
  'wallet_purchase',    // SOL/USDT → GBUX via linked third-party wallet
  'admin_debit',        // Admin debits (audit trail)
  'fee_collected',      // Fees collected by system
  'migration_credit',   // One-time gold migration
] as const;

export type GbuxEventType = typeof GBUX_EVENT_TYPES[number];

// Double-entry ledger for GBUX transactions
export const gbuxTransactions = pgTable("gbux_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  accountId: varchar("account_id").notNull(),
  
  // Transaction details
  amount: integer("amount").notNull(), // Positive = credit, negative = debit
  balanceAfter: integer("balance_after").notNull(), // Account balance after this transaction
  eventType: text("event_type").notNull().$type<GbuxEventType>(),
  
  // Source reference for audit trail
  sourceRef: text("source_ref"), // e.g., "dungeon_123", "mission_abc", "swap_tx_xyz"
  sourceCharacterId: varchar("source_character_id"), // Character that earned/spent
  
  // Fee tracking (for swaps/withdrawals)
  feeAmount: integer("fee_amount").default(0),
  feePercent: real("fee_percent").default(0),
  
  // Metadata for additional context
  metadata: jsonb("metadata").$type<{
    description?: string;
    relatedTxId?: string; // For double-entry linking
    solAmount?: number;   // For swap transactions
    exchangeRate?: number;
    externalWallet?: string; // For withdrawals
    ipAddress?: string;
  }>(),
  
  createdAt: bigint("created_at", { mode: "number" }).notNull().default(sql`extract(epoch from now()) * 1000`),
});

export const insertGbuxTransactionSchema = createInsertSchema(gbuxTransactions).omit({
  id: true,
  createdAt: true,
});

export type InsertGbuxTransaction = z.infer<typeof insertGbuxTransactionSchema>;
export type GbuxTransaction = typeof gbuxTransactions.$inferSelect;

// ============================================
// TELEGRAM ↔ GRUDGE ACCOUNT LINKS
// ============================================

export const telegramLinks = pgTable("telegram_links", {
  telegramUserId: text("telegram_user_id").primaryKey(),
  accountId: varchar("account_id").notNull(),
  walletAddress: text("wallet_address").notNull(),
  telegramUsername: text("telegram_username"),
  linkedAt: bigint("linked_at", { mode: "number" }).notNull().default(sql`extract(epoch from now()) * 1000`),
});

export const insertTelegramLinkSchema = createInsertSchema(telegramLinks).omit({
  linkedAt: true,
});

export type InsertTelegramLink = z.infer<typeof insertTelegramLinkSchema>;
export type TelegramLink = typeof telegramLinks.$inferSelect;

// ============================================
// LINKED THIRD-PARTY WALLETS (Phantom, Solflare, etc.)
// ============================================

export const LINKED_WALLET_PROVIDERS = [
  "phantom",
  "solflare",
  "backpack",
  "crossmint",
  /** EIP-6963 EVM providers (session connect; full Railway link uses personal_sign later) */
  "metamask",
  "binance",
  "coinbase",
  "brave",
  "okx",
  "rabby",
  "injected_evm",
  "other",
] as const;

export type LinkedWalletProvider = (typeof LINKED_WALLET_PROVIDERS)[number];

export const linkedWallets = pgTable("linked_wallets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  accountId: varchar("account_id").notNull(),
  walletAddress: text("wallet_address").notNull(),
  provider: text("provider").notNull().$type<LinkedWalletProvider>().default("other"),
  label: text("label"),
  isPrimary: boolean("is_primary").notNull().default(false),
  verifiedAt: bigint("verified_at", { mode: "number" }),
  createdAt: bigint("created_at", { mode: "number" }).notNull().default(sql`extract(epoch from now()) * 1000`),
});

export const insertLinkedWalletSchema = createInsertSchema(linkedWallets).omit({
  id: true,
  createdAt: true,
});

export type InsertLinkedWallet = z.infer<typeof insertLinkedWalletSchema>;
export type LinkedWallet = typeof linkedWallets.$inferSelect;

// ============================================
// WALLET PURCHASES (SOL / USDT → in-game GBUX)
// ============================================

export const WALLET_PURCHASE_CURRENCIES = ["SOL", "USDT"] as const;
export type WalletPurchaseCurrency = (typeof WALLET_PURCHASE_CURRENCIES)[number];

export const WALLET_PURCHASE_STATUSES = ["pending", "confirmed", "failed", "expired"] as const;
export type WalletPurchaseStatus = (typeof WALLET_PURCHASE_STATUSES)[number];

export const walletPurchases = pgTable("wallet_purchases", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  accountId: varchar("account_id").notNull(),
  linkedWalletAddress: text("linked_wallet_address"),
  currency: text("currency").notNull().$type<WalletPurchaseCurrency>(),
  amountIn: real("amount_in").notNull(),
  gbuxOut: integer("gbux_out").notNull(),
  status: text("status").notNull().$type<WalletPurchaseStatus>().default("pending"),
  txSignature: text("tx_signature"),
  treasuryAddress: text("treasury_address").notNull(),
  expiresAt: bigint("expires_at", { mode: "number" }).notNull(),
  metadata: jsonb("metadata").$type<{
    exchangeRate?: number;
    feePercent?: number;
    feeAmount?: number;
    solPriceUsd?: number;
    explorerUrl?: string;
  }>(),
  createdAt: bigint("created_at", { mode: "number" }).notNull().default(sql`extract(epoch from now()) * 1000`),
  confirmedAt: bigint("confirmed_at", { mode: "number" }),
});

export const insertWalletPurchaseSchema = createInsertSchema(walletPurchases).omit({
  id: true,
  createdAt: true,
});

export type InsertWalletPurchase = z.infer<typeof insertWalletPurchaseSchema>;
export type WalletPurchase = typeof walletPurchases.$inferSelect;

// ============================================
// TREATY CHAT — friends + direct messages
// ============================================

export const TREATY_FRIEND_STATUSES = ["pending", "accepted", "declined", "blocked"] as const;
export type TreatyFriendStatus = (typeof TREATY_FRIEND_STATUSES)[number];

export const treatyFriends = pgTable("treaty_friends", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  accountId: varchar("account_id").notNull(),
  friendAccountId: varchar("friend_account_id").notNull(),
  status: text("status").notNull().$type<TreatyFriendStatus>().default("pending"),
  initiatedBy: varchar("initiated_by").notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull().default(sql`extract(epoch from now()) * 1000`),
  respondedAt: bigint("responded_at", { mode: "number" }),
});

export const treatyDmThreads = pgTable("treaty_dm_threads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  accountLow: varchar("account_low").notNull(),
  accountHigh: varchar("account_high").notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull().default(sql`extract(epoch from now()) * 1000`),
});

export const treatyMessages = pgTable("treaty_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  threadId: varchar("thread_id").notNull(),
  senderAccountId: varchar("sender_account_id").notNull(),
  content: text("content").notNull(),
  readAt: bigint("read_at", { mode: "number" }),
  createdAt: bigint("created_at", { mode: "number" }).notNull().default(sql`extract(epoch from now()) * 1000`),
});

/** Group chats — account-scoped (Grudge ID), not character-scoped. */
export const TREATY_GROUP_ROLES = ["owner", "admin", "member"] as const;
export type TreatyGroupRole = (typeof TREATY_GROUP_ROLES)[number];

export const treatyGroups = pgTable("treaty_groups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  ownerAccountId: varchar("owner_account_id").notNull(),
  avatarUrl: text("avatar_url"),
  createdAt: bigint("created_at", { mode: "number" }).notNull().default(sql`extract(epoch from now()) * 1000`),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull().default(sql`extract(epoch from now()) * 1000`),
});

export const treatyGroupMembers = pgTable("treaty_group_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  groupId: varchar("group_id").notNull(),
  accountId: varchar("account_id").notNull(),
  role: text("role").notNull().$type<TreatyGroupRole>().default("member"),
  joinedAt: bigint("joined_at", { mode: "number" }).notNull().default(sql`extract(epoch from now()) * 1000`),
  lastReadAt: bigint("last_read_at", { mode: "number" }),
});

export const treatyGroupMessages = pgTable("treaty_group_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  groupId: varchar("group_id").notNull(),
  senderAccountId: varchar("sender_account_id").notNull(),
  content: text("content").notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull().default(sql`extract(epoch from now()) * 1000`),
});

/**
 * Server / fleet chat channels — public account chat for every Grudge game & studio page.
 * `gameId` scopes a channel (e.g. warlords, genesis, fleet). `slug` is unique globally.
 */
export const treatyServerChannels = pgTable("treaty_server_channels", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  /** Logical game / surface: fleet | warlords | genesis | grudge6 | forge | ... */
  gameId: text("game_id").notNull().default("fleet"),
  isPublic: integer("is_public").notNull().default(1),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: bigint("created_at", { mode: "number" }).notNull().default(sql`extract(epoch from now()) * 1000`),
});

export const treatyServerMessages = pgTable("treaty_server_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  channelId: varchar("channel_id").notNull(),
  senderAccountId: varchar("sender_account_id").notNull(),
  content: text("content").notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull().default(sql`extract(epoch from now()) * 1000`),
});

export type TreatyFriend = typeof treatyFriends.$inferSelect;
export type TreatyDmThread = typeof treatyDmThreads.$inferSelect;
export type TreatyMessage = typeof treatyMessages.$inferSelect;
export type TreatyGroup = typeof treatyGroups.$inferSelect;
export type TreatyGroupMember = typeof treatyGroupMembers.$inferSelect;
export type TreatyGroupMessage = typeof treatyGroupMessages.$inferSelect;
export type TreatyServerChannel = typeof treatyServerChannels.$inferSelect;
export type TreatyServerMessage = typeof treatyServerMessages.$inferSelect;

// ============================================
// UUID LEDGER SYSTEM
// ============================================

// Event types for UUID lifecycle tracking
export const UUID_EVENT_TYPES = [
  'CREATED',      // UUID generated (drops, rewards, crafting output)
  'ASSIGNED',     // UUID attached to user account
  'EQUIPPED',     // Item equipped to character
  'UNEQUIPPED',   // Item removed from character
  'UPGRADED',     // Item upgraded to new tier (old UUID archived)
  'CONSUMED',     // Item used in crafting or consumed
  'TRANSFERRED',  // Ownership transferred between accounts
  'DESTROYED',    // Item permanently destroyed
  'ARCHIVED',     // UUID moved to archive (superseded by upgrade)
] as const;

export type UUIDEventType = typeof UUID_EVENT_TYPES[number];

// UUID Ledger - append-only transaction log for all UUID events
export const uuidLedger = pgTable("uuid_ledger", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  grudgeUuid: varchar("grudge_uuid", { length: 40 }).notNull(),
  
  // Event details
  eventType: text("event_type").notNull().$type<UUIDEventType>(),
  
  // Ownership tracking
  accountId: varchar("account_id"),
  characterId: varchar("character_id"),
  
  // For crafting/upgrades - track input/output relationships
  relatedUuids: text("related_uuids").array(), // Input UUIDs consumed in crafting
  outputUuid: varchar("output_uuid", { length: 40 }), // Result UUID from upgrade/craft
  
  // Item reference (snapshot at event time)
  itemId: varchar("item_id"), // Reference to items.id
  itemName: text("item_name"),
  itemTier: text("item_tier"), // e.g. "t0", "t1", "t2"
  itemSlot: text("item_slot"),
  
  // Source of the event
  sourceType: text("source_type"), // 'drop', 'harvest', 'craft', 'reward', 'trade', 'admin'
  sourceRef: text("source_ref"), // e.g., "dungeon_123", "recipe_iron_sword", "trade_abc"
  
  // Additional metadata
  metadata: jsonb("metadata").$type<{
    description?: string;
    previousOwnerAccountId?: string; // For transfers
    previousTier?: number; // For upgrades
    recipeId?: string; // For crafting
    quantity?: number; // For stackable items
    validationHash?: string; // For anti-cheat verification
  }>(),
  
  // Timestamp
  createdAt: bigint("created_at", { mode: "number" }).notNull().default(sql`extract(epoch from now()) * 1000`),
});

export const insertUuidLedgerSchema = createInsertSchema(uuidLedger).omit({
  id: true,
  createdAt: true,
});

export type InsertUuidLedger = z.infer<typeof insertUuidLedgerSchema>;
export type UuidLedger = typeof uuidLedger.$inferSelect;

// UUID validation status cache for quick lookups
export const uuidValidationCache = pgTable("uuid_validation_cache", {
  grudgeUuid: varchar("grudge_uuid", { length: 40 }).primaryKey(),
  
  // Current state
  isValid: boolean("is_valid").notNull().default(true),
  currentState: text("current_state").notNull().$type<'ACTIVE' | 'ARCHIVED' | 'CONSUMED' | 'DESTROYED'>().default('ACTIVE'),
  
  // Current owner
  currentAccountId: varchar("current_account_id"),
  currentCharacterId: varchar("current_character_id"),
  
  // Item info
  itemId: varchar("item_id"),
  itemName: text("item_name"),
  itemTier: text("item_tier"), // e.g. "t0", "t1", "t2"
  
  // Timestamps
  createdAt: bigint("created_at", { mode: "number" }).notNull().default(sql`extract(epoch from now()) * 1000`),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull().default(sql`extract(epoch from now()) * 1000`),
  
  // Event counts for quick reference
  eventCount: integer("event_count").notNull().default(1),
  lastEventType: text("last_event_type").$type<UUIDEventType>(),
});

export const insertUuidValidationCacheSchema = createInsertSchema(uuidValidationCache).omit({
  createdAt: true,
  updatedAt: true,
});

export type InsertUuidValidationCache = z.infer<typeof insertUuidValidationCacheSchema>;
export type UuidValidationCache = typeof uuidValidationCache.$inferSelect;

// ============================================
// LORE & MISSION SYSTEM
// ============================================

// Lore entities - gods, factions, heroes, locations from Grudge universe
export type LoreEntityType = 'god' | 'faction' | 'hero' | 'location' | 'artifact' | 'creature' | 'event';

export const loreEntities = pgTable("lore_entities", {
  id: varchar("id").primaryKey(), // e.g., "god_odin", "faction_crusade", "hero_aurion"
  entityType: text("entity_type").notNull().$type<LoreEntityType>(),
  name: text("name").notNull(),
  title: text("title"), // e.g., "The All-Father", "The Golden Dawn"
  
  // Core lore data
  domain: text("domain"), // For gods: "War, Wisdom, Fate"
  factionId: text("faction_id"), // Links heroes/locations to factions
  patronGodId: text("patron_god_id"), // Links factions to gods
  
  description: text("description").notNull(),
  backstory: text("backstory"),
  
  // For heroes
  raceId: text("race_id"),
  classId: text("class_id"),
  level: integer("level"),
  
  // AI agent config for NPCs
  aiConfig: jsonb("ai_config").$type<{
    personalityTemperature?: number;
    responseStyle?: string;
    knowledgeDomains?: string[];
    canGiveQuests?: boolean;
    questTypes?: string[];
    hostileToFactions?: string[];
    friendlyToFactions?: string[];
  }>(),
  
  // Visual
  iconUrl: text("icon_url"),
  spriteUrl: text("sprite_url"),
  
  // Dialogue samples
  dialogueSamples: jsonb("dialogue_samples").$type<Record<string, string>>(),
  
  // Quest pool for hero NPCs
  questPool: jsonb("quest_pool").$type<Array<{
    id: string;
    title: string;
    description: string;
  }>>(),
  
  // Relationships
  relationships: jsonb("relationships").$type<Array<{
    targetId: string;
    type: 'rival' | 'friend' | 'mentor' | 'student' | 'enemy' | 'ally';
    description?: string;
  }>>(),
  
  createdAt: bigint("created_at", { mode: "number" }).notNull().default(sql`extract(epoch from now()) * 1000`),
});

export const insertLoreEntitySchema = createInsertSchema(loreEntities).omit({
  createdAt: true,
});

export type InsertLoreEntity = z.infer<typeof insertLoreEntitySchema>;
export type LoreEntity = typeof loreEntities.$inferSelect;

// Story arcs - overarching narrative chains
export type StoryArcStatus = 'draft' | 'active' | 'completed' | 'archived';

export const storyArcs = pgTable("story_arcs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  title: text("title").notNull(),
  description: text("description").notNull(),
  
  // Lore connections
  factionId: text("faction_id"), // Primary faction involved
  godId: text("god_id"), // Patron god theme
  heroId: text("hero_id"), // Quest giver hero
  
  // Arc structure
  actNumber: integer("act_number").notNull().default(1), // 1, 2, 3 for multi-act stories
  prerequisiteArcId: varchar("prerequisite_arc_id"), // Previous arc required
  
  // Requirements
  minLevel: integer("min_level").notNull().default(1),
  maxLevel: integer("max_level"),
  requiredRaceIds: jsonb("required_race_ids").$type<string[]>(),
  requiredClassIds: jsonb("required_class_ids").$type<string[]>(),
  
  // Rewards
  rewards: jsonb("rewards").$type<{
    xp: number;
    gold: number;
    items: Array<{ itemId: string; quantity: number }>;
    reputationChanges: Array<{ factionId: string; change: number }>;
    unlocksArcId?: string;
  }>(),
  
  // Generation metadata
  isAIGenerated: boolean("is_ai_generated").notNull().default(false),
  generationPrompt: text("generation_prompt"),
  approvalStatus: text("approval_status").notNull().default('approved').$type<'draft' | 'pending' | 'approved' | 'rejected'>(),
  
  status: text("status").notNull().default('active').$type<StoryArcStatus>(),
  createdAt: bigint("created_at", { mode: "number" }).notNull().default(sql`extract(epoch from now()) * 1000`),
});

export const insertStoryArcSchema = createInsertSchema(storyArcs).omit({
  id: true,
  createdAt: true,
});

export type InsertStoryArc = z.infer<typeof insertStoryArcSchema>;
export type StoryArc = typeof storyArcs.$inferSelect;

// Missions - individual quests within story arcs or standalone
export type MissionType = 'combat' | 'exploration' | 'escort' | 'gathering' | 'puzzle' | 'dialogue' | 'boss';
export type MissionStatus = 'draft' | 'active' | 'archived';

export const missions = pgTable("missions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Basic info
  title: text("title").notNull(),
  description: text("description").notNull(),
  briefingText: text("briefing_text"), // Quest giver dialogue
  completionText: text("completion_text"), // Success dialogue
  
  // Type and structure
  missionType: text("mission_type").notNull().$type<MissionType>(),
  storyArcId: varchar("story_arc_id"), // Optional arc linkage
  sequenceInArc: integer("sequence_in_arc"), // Order within arc
  
  // Lore connections
  questGiverId: text("quest_giver_id"), // Hero NPC who gives quest
  factionId: text("faction_id"),
  locationId: text("location_id"),
  
  // Requirements
  minLevel: integer("min_level").notNull().default(1),
  maxLevel: integer("max_level"),
  prerequisiteMissionIds: jsonb("prerequisite_mission_ids").$type<string[]>(),
  partySize: jsonb("party_size").$type<{ min: number; max: number; recommended: number }>().default(sql`'{"min": 1, "max": 3, "recommended": 1}'::jsonb`),
  
  // Combat configuration (for combat missions)
  combatChallengeId: varchar("combat_challenge_id"),
  
  // Objectives
  objectives: jsonb("objectives").$type<Array<{
    id: string;
    description: string;
    type: 'kill' | 'collect' | 'reach' | 'survive' | 'escort' | 'interact';
    target?: string;
    quantity?: number;
  }>>(),
  
  // Rewards
  rewards: jsonb("rewards").$type<{
    xp: number;
    gold: number;
    items: Array<{ itemId: string; quantity: number; chance?: number }>;
    reputationChanges?: Array<{ factionId: string; change: number }>;
  }>(),
  
  // Difficulty and scaling
  difficultyTier: integer("difficulty_tier").notNull().default(1), // 1-10
  isRepeatable: boolean("is_repeatable").notNull().default(false),
  cooldownMinutes: integer("cooldown_minutes"),
  
  // Generation metadata
  isAIGenerated: boolean("is_ai_generated").notNull().default(false),
  generationPrompt: text("generation_prompt"),
  approvalStatus: text("approval_status").notNull().default('approved').$type<'draft' | 'pending' | 'approved' | 'rejected'>(),
  
  status: text("status").notNull().default('active').$type<MissionStatus>(),
  createdAt: bigint("created_at", { mode: "number" }).notNull().default(sql`extract(epoch from now()) * 1000`),
});

export const insertMissionSchema = createInsertSchema(missions).omit({
  id: true,
  createdAt: true,
});

export type InsertMission = z.infer<typeof insertMissionSchema>;
export type Mission = typeof missions.$inferSelect;

// Combat challenges - reusable encounter templates
export const combatChallenges = pgTable("combat_challenges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  name: text("name").notNull(),
  description: text("description"),
  
  // Encounter composition
  encounterUnits: jsonb("encounter_units").$type<Array<{
    monsterId?: string;
    aiUnitId?: string;
    heroId?: string; // For lore hero fights
    count: number;
    spawnWave?: number;
    isElite?: boolean;
    isBoss?: boolean;
  }>>().notNull(),
  
  // Environment
  environment: jsonb("environment").$type<{
    terrainType?: string;
    weatherEffect?: string;
    lightingLevel?: number;
    hazards?: string[];
  }>(),
  
  // Modifiers (lore-based buffs/debuffs)
  encounterModifiers: jsonb("encounter_modifiers").$type<Array<{
    name: string;
    description: string;
    effect: Record<string, number>; // e.g., { criticalChance: 0.1 }
    appliesTo: 'player' | 'enemy' | 'all';
    godBlessing?: string; // e.g., "odin" for Odin's blessing
  }>>(),
  
  // Victory/defeat conditions
  victoryConditions: jsonb("victory_conditions").$type<Array<{
    type: 'defeat_all' | 'defeat_boss' | 'survive_turns' | 'protect_target';
    target?: string;
    value?: number;
  }>>().default(sql`'[{"type": "defeat_all"}]'::jsonb`),
  
  defeatConditions: jsonb("defeat_conditions").$type<Array<{
    type: 'party_wipe' | 'time_limit' | 'target_dies';
    target?: string;
    value?: number;
  }>>().default(sql`'[{"type": "party_wipe"}]'::jsonb`),
  
  // Difficulty scaling
  baseDifficultyTier: integer("base_difficulty_tier").notNull().default(1),
  levelScaling: boolean("level_scaling").notNull().default(true),
  
  // For dungeon integration
  canSpawnInDungeon: boolean("can_spawn_in_dungeon").notNull().default(false),
  dungeonFloorMin: integer("dungeon_floor_min"),
  dungeonFloorMax: integer("dungeon_floor_max"),
  
  // Generation metadata
  isAIGenerated: boolean("is_ai_generated").notNull().default(false),
  generationPrompt: text("generation_prompt"),
  approvalStatus: text("approval_status").notNull().default('approved').$type<'draft' | 'pending' | 'approved' | 'rejected'>(),
  
  createdAt: bigint("created_at", { mode: "number" }).notNull().default(sql`extract(epoch from now()) * 1000`),
});

export const insertCombatChallengeSchema = createInsertSchema(combatChallenges).omit({
  id: true,
  createdAt: true,
});

export type InsertCombatChallenge = z.infer<typeof insertCombatChallengeSchema>;
export type CombatChallenge = typeof combatChallenges.$inferSelect;

// Player mission progress - tracks individual player's quest state
export type MissionProgressStatus = 'available' | 'accepted' | 'in_progress' | 'completed' | 'failed' | 'abandoned';

export const playerMissionProgress = pgTable("player_mission_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  userId: varchar("user_id").notNull(),
  accountId: varchar("account_id"),
  missionId: varchar("mission_id").notNull(),
  
  status: text("status").notNull().default('available').$type<MissionProgressStatus>(),
  
  // Progress tracking
  objectivesCompleted: jsonb("objectives_completed").$type<Record<string, number>>().default(sql`'{}'::jsonb`), // objectiveId -> progress count
  
  // Combat stats for this mission
  combatStats: jsonb("combat_stats").$type<{
    encountersCompleted: number;
    totalDamageDealt: number;
    totalDamageTaken: number;
    heroDeaths: number;
    turnsElapsed: number;
  }>(),
  
  // Attempts and timing
  attemptCount: integer("attempt_count").notNull().default(0),
  acceptedAt: bigint("accepted_at", { mode: "number" }),
  completedAt: bigint("completed_at", { mode: "number" }),
  lastAttemptAt: bigint("last_attempt_at", { mode: "number" }),
  
  // Rewards claimed
  rewardsClaimed: boolean("rewards_claimed").notNull().default(false),
  
  createdAt: bigint("created_at", { mode: "number" }).notNull().default(sql`extract(epoch from now()) * 1000`),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull().default(sql`extract(epoch from now()) * 1000`),
});

export const insertPlayerMissionProgressSchema = createInsertSchema(playerMissionProgress).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPlayerMissionProgress = z.infer<typeof insertPlayerMissionProgressSchema>;
export type PlayerMissionProgress = typeof playerMissionProgress.$inferSelect;

// Player story arc progress
export const playerStoryArcProgress = pgTable("player_story_arc_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  userId: varchar("user_id").notNull(),
  accountId: varchar("account_id"),
  storyArcId: varchar("story_arc_id").notNull(),
  
  status: text("status").notNull().default('available').$type<'available' | 'in_progress' | 'completed'>(),
  
  currentMissionIndex: integer("current_mission_index").notNull().default(0),
  missionsCompleted: jsonb("missions_completed").$type<string[]>().default(sql`'[]'::jsonb`),
  
  startedAt: bigint("started_at", { mode: "number" }),
  completedAt: bigint("completed_at", { mode: "number" }),
  
  createdAt: bigint("created_at", { mode: "number" }).notNull().default(sql`extract(epoch from now()) * 1000`),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull().default(sql`extract(epoch from now()) * 1000`),
});

export const insertPlayerStoryArcProgressSchema = createInsertSchema(playerStoryArcProgress).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPlayerStoryArcProgress = z.infer<typeof insertPlayerStoryArcProgressSchema>;
export type PlayerStoryArcProgress = typeof playerStoryArcProgress.$inferSelect;

// Faction reputation tracking
export const playerFactionReputation = pgTable("player_faction_reputation", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  userId: varchar("user_id").notNull(),
  accountId: varchar("account_id"),
  factionId: text("faction_id").notNull(),
  
  // Reputation value (-1000 to +1000)
  reputation: integer("reputation").notNull().default(0),
  
  // Reputation tier
  tier: text("tier").notNull().default('neutral').$type<'hated' | 'hostile' | 'unfriendly' | 'neutral' | 'friendly' | 'honored' | 'exalted'>(),
  
  createdAt: bigint("created_at", { mode: "number" }).notNull().default(sql`extract(epoch from now()) * 1000`),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull().default(sql`extract(epoch from now()) * 1000`),
});

export const insertPlayerFactionReputationSchema = createInsertSchema(playerFactionReputation).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPlayerFactionReputation = z.infer<typeof insertPlayerFactionReputationSchema>;
export type PlayerFactionReputation = typeof playerFactionReputation.$inferSelect;

// AI Generated content cache - stores generated missions/challenges pending approval
export const generatedContent = pgTable("generated_content", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  contentType: text("content_type").notNull().$type<'mission' | 'story_arc' | 'combat_challenge' | 'dialogue' | 'quest_text'>(),
  
  // Generation context
  prompt: text("prompt").notNull(),
  loreContext: jsonb("lore_context").$type<{
    godId?: string;
    factionId?: string;
    heroId?: string;
    locationId?: string;
    playerLevel?: number;
  }>(),
  
  // Generated output
  generatedData: jsonb("generated_data").notNull().$type<Record<string, unknown>>(),
  
  // Approval workflow
  status: text("status").notNull().default('pending').$type<'pending' | 'approved' | 'rejected' | 'published'>(),
  reviewedBy: varchar("reviewed_by"),
  reviewNotes: text("review_notes"),
  
  // Deduplication
  contentHash: text("content_hash"),
  
  createdAt: bigint("created_at", { mode: "number" }).notNull().default(sql`extract(epoch from now()) * 1000`),
  reviewedAt: bigint("reviewed_at", { mode: "number" }),
});

export const insertGeneratedContentSchema = createInsertSchema(generatedContent).omit({
  id: true,
  createdAt: true,
});

export type InsertGeneratedContent = z.infer<typeof insertGeneratedContentSchema>;
export type GeneratedContent = typeof generatedContent.$inferSelect;

// ============================================
// CHARACTER NFTS - Solana compressed NFT tracking
// ============================================

export const characterNFTs = pgTable("character_nfts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  characterId: varchar("character_id").notNull().unique(), // Links to characters table (one NFT per character)
  accountId: varchar("account_id").notNull(), // Links to accounts table
  
  // NFT identifiers
  mintAddress: text("mint_address"), // Solana mint address once minted
  assetId: text("asset_id"), // Compressed NFT asset ID (Metaplex Read API)
  collectionAddress: text("collection_address"), // Collection the NFT belongs to
  
  // NFT metadata
  metadataUri: text("metadata_uri"), // Arweave/IPFS URI for off-chain metadata
  imageUri: text("image_uri"), // Permanent avatar image URL
  
  // Status tracking
  status: text("status").notNull().default('pending').$type<'pending' | 'minting' | 'minted' | 'upgrading' | 'transferred' | 'burned'>(),
  isCompressed: boolean("is_compressed").notNull().default(true), // cNFT vs regular NFT
  
  // Crossmint tracking
  crossmintActionId: text("crossmint_action_id"), // Crossmint mint action ID for polling
  
  // Ownership
  ownerWalletAddress: text("owner_wallet_address"), // Current owner's wallet
  mintedToExternal: boolean("minted_to_external").notNull().default(false), // True if minted to external wallet
  
  // Timestamps
  mintedAt: bigint("minted_at", { mode: "number" }),
  upgradedAt: bigint("upgraded_at", { mode: "number" }), // When cNFT was upgraded to regular NFT
  transferredAt: bigint("transferred_at", { mode: "number" }),
  
  createdAt: bigint("created_at", { mode: "number" }).notNull().default(sql`extract(epoch from now()) * 1000`),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull().default(sql`extract(epoch from now()) * 1000`),
});

export const insertCharacterNFTSchema = createInsertSchema(characterNFTs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCharacterNFT = z.infer<typeof insertCharacterNFTSchema>;
export type CharacterNFT = typeof characterNFTs.$inferSelect;

// ============================================
// ISLAND NFTs - Home Island cNFTs
// ============================================

export const islandNFTs = pgTable("island_nfts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  islandId: varchar("island_id").notNull().unique(), // Links to home_islands table (one NFT per island)
  accountId: varchar("account_id").notNull(), // Links to accounts table
  
  // NFT identifiers
  mintAddress: text("mint_address"), // Solana mint address once minted
  assetId: text("asset_id"), // Compressed NFT asset ID (Metaplex Read API)
  collectionAddress: text("collection_address"), // Collection the NFT belongs to
  
  // NFT metadata
  metadataUri: text("metadata_uri"), // Arweave/IPFS URI for off-chain metadata
  imageUri: text("image_uri"), // Island map image URL
  
  // Status tracking
  status: text("status").notNull().default('pending').$type<'pending' | 'minting' | 'minted' | 'upgrading' | 'transferred' | 'burned'>(),
  isCompressed: boolean("is_compressed").notNull().default(true), // cNFT vs regular NFT
  
  // Crossmint tracking
  crossmintActionId: text("crossmint_action_id"), // Crossmint mint action ID for polling
  
  // Ownership
  ownerWalletAddress: text("owner_wallet_address"), // Current owner's wallet
  mintedToExternal: boolean("minted_to_external").notNull().default(false), // True if minted to external wallet
  
  // Timestamps
  mintedAt: bigint("minted_at", { mode: "number" }),
  upgradedAt: bigint("upgraded_at", { mode: "number" }), // When cNFT was upgraded to regular NFT
  transferredAt: bigint("transferred_at", { mode: "number" }),
  
  createdAt: bigint("created_at", { mode: "number" }).notNull().default(sql`extract(epoch from now()) * 1000`),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull().default(sql`extract(epoch from now()) * 1000`),
});

export const insertIslandNFTSchema = createInsertSchema(islandNFTs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertIslandNFT = z.infer<typeof insertIslandNFTSchema>;
export type IslandNFT = typeof islandNFTs.$inferSelect;

// ============================================
// WORLD MAP - Zone ownership and player blocks
// ============================================

export const playerBlocks = pgTable("player_blocks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  accountId: varchar("account_id").notNull().unique(), // One block per account
  puterUserId: text("puter_user_id"), // Puter auth user ID (= Grudge ID source)
  originX: integer("origin_x").notNull(), // Top-left X of the 3×3 block
  originY: integer("origin_y").notNull(), // Top-left Y of the 3×3 block
  homeIslandSeed: integer("home_island_seed").notNull(),
  zones: jsonb("zones").notNull().$type<Array<{
    zoneX: number;
    zoneY: number;
    type: string;
    islandSeed?: number;
    islandProfile?: string;
    ownerId?: string;
    difficulty?: number;
    expiresAt?: number | null;
    lootTheme?: string;
    buildingCount?: number;
    isCleared?: boolean;
  }>>().default(sql`'[]'::jsonb`),
  createdAt: bigint("created_at", { mode: "number" }).notNull().default(sql`extract(epoch from now()) * 1000`),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull().default(sql`extract(epoch from now()) * 1000`),
});

export const insertPlayerBlockSchema = createInsertSchema(playerBlocks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPlayerBlock = z.infer<typeof insertPlayerBlockSchema>;
export type PlayerBlock = typeof playerBlocks.$inferSelect;

// ============================================
// PLAYER SHIPS — Railway SSOT (dock craft + ocean / world-map)
// Replaces client localStorage `grudge-ships:*` as authority.
// ============================================

export const playerShips = pgTable("player_ships", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  accountId: varchar("account_id").notNull(),
  userId: varchar("user_id"),
  /** Captain character UUID (optional until boarded) */
  captainId: varchar("captain_id"),
  name: text("name").notNull(),
  /** rowboat | sloop | brigantine | galleon | … (shipCatalog sizes) */
  size: text("size").notNull().default("rowboat"),
  hullColor: text("hull_color").notNull().default("brown"),
  sailColor: text("sail_color").notNull().default("white"),
  cannons: integer("cannons").notNull().default(0),
  crewIds: jsonb("crew_ids").notNull().$type<string[]>().default(sql`'[]'::jsonb`),
  hp: integer("hp").notNull().default(30),
  maxHp: integer("max_hp").notNull().default(30),
  speed: integer("speed").notNull().default(4),
  zoneX: integer("zone_x").notNull().default(50),
  zoneY: integer("zone_y").notNull().default(50),
  dockId: text("dock_id").notNull().default("south-dock"),
  isActive: boolean("is_active").notNull().default(false),
  isDamaged: boolean("is_damaged").notNull().default(false),
  travelDestination: jsonb("travel_destination").$type<{ zoneX: number; zoneY: number } | null>(),
  travelStartedAt: bigint("travel_started_at", { mode: "number" }),
  travelArrivalAt: bigint("travel_arrival_at", { mode: "number" }),
  createdAt: bigint("created_at", { mode: "number" }).notNull().default(sql`extract(epoch from now()) * 1000`),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull().default(sql`extract(epoch from now()) * 1000`),
});

export const insertPlayerShipSchema = createInsertSchema(playerShips).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPlayerShip = z.infer<typeof insertPlayerShipSchema>;
export type PlayerShip = typeof playerShips.$inferSelect;

export const worldZones = pgTable("world_zones", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  zoneX: integer("zone_x").notNull(),
  zoneY: integer("zone_y").notNull(),
  type: text("type").notNull().$type<'home' | 'wild' | 'fort' | 'boss' | 'event' | 'empty'>(),
  islandSeed: integer("island_seed"),
  islandProfile: text("island_profile"),
  ownerId: varchar("owner_id"), // Account ID who owns/captured this zone
  playerBlockId: varchar("player_block_id"), // Which player block this zone belongs to
  difficulty: integer("difficulty"),
  expiresAt: bigint("expires_at", { mode: "number" }),
  lootTheme: text("loot_theme"),
  buildingCount: integer("building_count").default(0),
  isCleared: boolean("is_cleared").default(false),
  state: jsonb("state").$type<Record<string, unknown>>(), // Zone-specific state (buildings, towers, etc.)
  createdAt: bigint("created_at", { mode: "number" }).notNull().default(sql`extract(epoch from now()) * 1000`),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull().default(sql`extract(epoch from now()) * 1000`),
});

export const insertWorldZoneSchema = createInsertSchema(worldZones).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertWorldZone = z.infer<typeof insertWorldZoneSchema>;
export type WorldZone = typeof worldZones.$inferSelect;

// ============================================
// INDEXES FOR PERFORMANCE
// ============================================

export * from "./models/chat";
