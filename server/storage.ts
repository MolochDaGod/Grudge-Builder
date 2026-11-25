import { 
  users, 
  characters, 
  parties, 
  resourceNodes, 
  playerResources,
  races,
  classes,
  spriteSheets,
  dungeonTemplates,
  characterProfessions,
  experienceEvents,
  unlockedSkills,
  characterAbilities,
  items,
  spells,
  skills,
  monsters,
  accounts,
  accountInventory,
  accountResources,
  accountLearnedRecipes,
  homeIslands,
  spriteManifest,
  spriteUnitSpecs,
  spriteGenerationJobs,
  promptBlueprints,
  dungeonRuns,
  combatLogs,
  gameSaves,
  apiCallLogs,
  accountSessions,
  activityLogs,
  analyticsEvents,
  dailyStats,
  type User, 
  type InsertUser,
  type Character,
  type InsertCharacter,
  type Party,
  type InsertParty,
  type ResourceNode,
  type InsertResourceNode,
  type PlayerResources,
  type InsertPlayerResources,
  type Race,
  type GameClass,
  type SpriteSheet,
  type DungeonTemplate,
  type CharacterProfession,
  type InsertCharacterProfession,
  type ExperienceEvent,
  type InsertExperienceEvent,
  type ProfessionId,
  type UnlockedSkill,
  type InsertUnlockedSkill,
  type CharacterAbility,
  type InsertCharacterAbility,
  type Account,
  type InsertAccount,
  type AccountInventoryItem,
  type InsertAccountInventory,
  type AccountResources,
  type InsertAccountResources,
  type AccountLearnedRecipe,
  type HomeIsland,
  type InsertHomeIsland,
  type IslandState,
  type SpriteManifestEntry,
  type InsertSpriteManifest,
  type SpriteUnitSpec,
  type InsertSpriteUnitSpec,
  type SpriteGenerationJob,
  type InsertSpriteGenerationJob,
  type PromptBlueprint,
  type InsertPromptBlueprint,
  type AIUnit,
  type InsertAIUnit,
  type ApiCallLog,
  type InsertApiCallLog,
  type AccountSession,
  type InsertAccountSession,
  type ActivityLog,
  type InsertActivityLog,
  type AnalyticsEvent,
  type InsertAnalyticsEvent,
  type DailyStats,
  type InsertDailyStats,
  aiUnits,
  loreEntities,
  type LoreEntity,
  storyArcs,
  type StoryArc,
  type InsertStoryArc,
  missions,
  type Mission,
  type InsertMission,
  combatChallenges,
  type CombatChallenge,
  type InsertCombatChallenge,
  playerMissionProgress,
  type PlayerMissionProgress,
  type InsertPlayerMissionProgress,
  playerFactionReputation,
  type PlayerFactionReputation,
  generatedContent,
  type GeneratedContent,
  type InsertGeneratedContent,
  gbuxTransactions,
  type GbuxTransaction,
  type InsertGbuxTransaction,
  type GbuxEventType,
  GBUX_EVENT_TYPES,
  uuidLedger,
  type UuidLedger,
  type InsertUuidLedger,
  type UUIDEventType,
  UUID_EVENT_TYPES,
  uuidValidationCache,
  type UuidValidationCache,
  type InsertUuidValidationCache,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, like, sql, desc, count } from "drizzle-orm";
import { islandStateForStorage } from "./utilities/islandGeneration";

export interface IStorage {
  // Item methods
  getItems(): Promise<any[]>;
  getItem(id: string): Promise<any | undefined>;
  updateItem(id: string, updates: any): Promise<any>;
  
  // Spell methods
  getSpells(): Promise<any[]>;
  getSpell(id: string): Promise<any | undefined>;
  
  // Skill methods
  getSkills(): Promise<any[]>;
  getSkill(id: string): Promise<any | undefined>;
  
  // Monster methods
  getMonsters(): Promise<any[]>;
  getMonster(id: string): Promise<any | undefined>;

  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Character methods
  getCharacters(userId: string, era?: import("@shared/definitions/gameEras").GameEra): Promise<Character[]>;
  countCharactersForEra(userId: string, era: import("@shared/definitions/gameEras").GameEra): Promise<number>;
  getCharacter(id: string): Promise<Character | undefined>;
  createCharacter(character: InsertCharacter): Promise<Character>;
  activateCharacterForEra(
    userId: string,
    characterId: string,
    era: import("@shared/definitions/gameEras").GameEra,
  ): Promise<{ character: Character; eraSlots: import("@shared/definitions/gameEras").AccountEraSlots }>;
  updateCharacter(id: string, updates: Partial<InsertCharacter>): Promise<Character>;
  deleteCharacter(id: string): Promise<void>;

  // Party methods
  getParty(userId: string): Promise<Party | undefined>;
  updateParty(userId: string, characterIds: string[]): Promise<Party>;

  // Resource gathering methods
  getResourceNode(userId: string, nodeId: string): Promise<ResourceNode | undefined>;
  updateResourceNode(userId: string, nodeId: string, lastGathered: number): Promise<ResourceNode>;

  // Player resources methods
  getPlayerResources(userId: string): Promise<PlayerResources | undefined>;
  updatePlayerResources(userId: string, resources: Record<string, number>): Promise<PlayerResources>;

  // Game content methods
  getRaces(): Promise<Race[]>;
  getClasses(): Promise<GameClass[]>;
  getSpriteSheets(): Promise<SpriteSheet[]>;
  getSpriteSheet(id: string): Promise<SpriteSheet | undefined>;
  getDungeonTemplates(): Promise<DungeonTemplate[]>;
  getDungeonTemplate(id: string): Promise<DungeonTemplate | undefined>;

  // Profession methods
  getCharacterProfessions(characterId: string): Promise<CharacterProfession[]>;
  getCharacterProfession(characterId: string, professionId: string): Promise<CharacterProfession | undefined>;
  updateCharacterProfession(characterId: string, professionId: string, updates: {
    level?: number;
    xp?: number;
    lastGainAt?: number | null;
    lastDecayCheckAt?: number | null;
  }): Promise<CharacterProfession>;
  
  // Experience event methods
  logExperienceEvent(event: InsertExperienceEvent): Promise<ExperienceEvent>;
  getExperienceEvents(characterId: string, limit?: number): Promise<ExperienceEvent[]>;
  
  // Unlocked skills methods
  getUnlockedSkills(characterId: string, profession?: string): Promise<UnlockedSkill[]>;
  unlockSkill(skill: InsertUnlockedSkill): Promise<UnlockedSkill>;
  isSkillUnlocked(characterId: string, nodeId: string, profession: string): Promise<boolean>;

  // Character abilities methods
  getCharacterAbilities(characterId: string): Promise<CharacterAbility[]>;
  addCharacterAbility(ability: InsertCharacterAbility): Promise<CharacterAbility>;
  addStartingAbilities(characterId: string, classId: string): Promise<CharacterAbility[]>;

  // Account methods
  getAccount(id: string): Promise<Account | undefined>;
  getAccountByUserId(userId: string): Promise<Account | undefined>;
  getAccountByGrudgeId(grudgeId: string): Promise<Account | undefined>;
  getCharactersForAuth(
    userId: string,
    era?: import("@shared/definitions/gameEras").GameEra,
    grudgeId?: string | null,
  ): Promise<Character[]>;
  createAccount(account: InsertAccount): Promise<Account>;
  updateAccount(id: string, updates: Partial<InsertAccount>): Promise<Account>;
  getOrCreateAccountForUser(userId: string): Promise<Account>;

  // Account inventory methods
  getAccountInventory(accountId: string): Promise<AccountInventoryItem[]>;
  getAccountInventoryItem(id: string): Promise<AccountInventoryItem | undefined>;
  validateCharacterOwnership(characterId: string, userId: string): Promise<boolean>;
  addAccountInventoryItem(item: InsertAccountInventory, userId?: string): Promise<AccountInventoryItem>;
  updateAccountInventoryItem(id: string, updates: Partial<InsertAccountInventory>): Promise<AccountInventoryItem>;
  updateAccountInventoryItemSafe(id: string, updates: Partial<InsertAccountInventory>, accountId: string, userId?: string): Promise<AccountInventoryItem>;
  removeAccountInventoryItem(id: string): Promise<void>;
  transferItemToCharacter(itemId: string, characterId: string | null, accountId: string, userId: string): Promise<AccountInventoryItem>;

  // Account resources methods
  getAccountResources(accountId: string): Promise<AccountResources | undefined>;
  updateAccountResources(accountId: string, resources: Record<string, number>): Promise<AccountResources>;
  addAccountResource(accountId: string, resourceId: string, amount: number): Promise<AccountResources>;
  batchAddAccountResources(accountId: string, items: Array<{ resourceId: string; amount: number }>): Promise<AccountResources>;

  /** Account recipe book (learned ids). Not character profession XP. */
  getAccountLearnedRecipes(accountId: string): Promise<string[]>;
  learnAccountRecipes(accountId: string, recipeIds: string[]): Promise<string[]>;

  // Sprite manifest methods
  getSpriteManifest(options?: { category?: string; subcategory?: string; search?: string; limit?: number }): Promise<SpriteManifestEntry[]>;
  getSpriteManifestEntry(id: string): Promise<SpriteManifestEntry | undefined>;
  getSpriteByObjectPath(objectPath: string): Promise<SpriteManifestEntry | undefined>;
  addSpriteManifestEntry(entry: InsertSpriteManifest): Promise<SpriteManifestEntry>;
  updateSpriteManifestEntry(id: string, updates: Partial<InsertSpriteManifest> & { syncedAt?: number }): Promise<SpriteManifestEntry>;
  deleteSpriteManifestEntry(id: string): Promise<void>;
  getSpriteCategories(): Promise<{ category: string; count: number }[]>;

  // Sprite unit spec methods
  getSpriteUnitSpecs(): Promise<SpriteUnitSpec[]>;
  getSpriteUnitSpec(id: string): Promise<SpriteUnitSpec | undefined>;
  getSpriteUnitSpecByUnitId(unitId: string): Promise<SpriteUnitSpec | undefined>;
  createSpriteUnitSpec(spec: InsertSpriteUnitSpec): Promise<SpriteUnitSpec>;
  updateSpriteUnitSpec(id: string, updates: Partial<InsertSpriteUnitSpec>): Promise<SpriteUnitSpec>;
  deleteSpriteUnitSpec(id: string): Promise<void>;

  // Sprite generation job methods
  getSpriteGenerationJobs(specId?: string): Promise<SpriteGenerationJob[]>;
  getSpriteGenerationJob(id: string): Promise<SpriteGenerationJob | undefined>;
  createSpriteGenerationJob(job: InsertSpriteGenerationJob): Promise<SpriteGenerationJob>;
  updateSpriteGenerationJob(id: string, updates: Partial<InsertSpriteGenerationJob>): Promise<SpriteGenerationJob>;

  // Prompt blueprint methods
  getPromptBlueprints(): Promise<PromptBlueprint[]>;
  getDefaultPromptBlueprint(): Promise<PromptBlueprint | undefined>;
  createPromptBlueprint(blueprint: InsertPromptBlueprint): Promise<PromptBlueprint>;
  updatePromptBlueprint(id: string, updates: Partial<InsertPromptBlueprint>): Promise<PromptBlueprint>;

  // Home island methods
  getHomeIslandById(id: string): Promise<HomeIsland | undefined>;
  getHomeIslandByAccountId(accountId: string): Promise<HomeIsland | undefined>;
  /** Resolve by island row id, then by account id */
  getHomeIsland(idOrAccountId: string): Promise<HomeIsland | undefined>;
  createHomeIsland(island: InsertHomeIsland): Promise<HomeIsland>;
  updateHomeIsland(id: string, updates: Partial<InsertHomeIsland>): Promise<HomeIsland>;
  updateIslandState(accountId: string, state: IslandState): Promise<HomeIsland>;
  getOrCreateHomeIsland(accountId: string, seed?: string): Promise<HomeIsland>;

  // AI Unit methods
  getAIUnits(options?: { islandId?: string; isActive?: boolean }): Promise<AIUnit[]>;
  getAIUnit(id: string): Promise<AIUnit | undefined>;
  createAIUnit(unit: InsertAIUnit): Promise<AIUnit>;
  updateAIUnit(id: string, updates: Partial<InsertAIUnit>): Promise<AIUnit>;
  deleteAIUnit(id: string): Promise<void>;
  transferCharacterToAIUnit(characterId: string, assignedIslandId: string, assignedIslandName: string, behavior?: string): Promise<AIUnit>;

  // Account reset methods
  resetAccount(userId: string): Promise<void>;

  // API call logging methods
  logApiCall(log: InsertApiCallLog): Promise<ApiCallLog>;
  getApiCallLogs(options?: { userId?: string; path?: string; limit?: number }): Promise<ApiCallLog[]>;
  getApiCallStats(startDate?: number, endDate?: number): Promise<{ totalCalls: number; errorCount: number; avgResponseTime: number }>;

  // Account session methods
  createSession(session: InsertAccountSession): Promise<AccountSession>;
  getSession(token: string): Promise<AccountSession | undefined>;
  updateSessionActivity(token: string): Promise<AccountSession | undefined>;
  invalidateSession(token: string): Promise<void>;
  getUserSessions(userId: string): Promise<AccountSession[]>;

  // Activity log methods
  logActivity(activity: InsertActivityLog): Promise<ActivityLog>;
  getActivityLogs(options?: { userId?: string; category?: string; limit?: number }): Promise<ActivityLog[]>;
  getCharacterActivityLogs(characterId: string, limit?: number): Promise<ActivityLog[]>;

  // Analytics event methods
  trackEvent(event: InsertAnalyticsEvent): Promise<AnalyticsEvent>;
  getAnalyticsEvents(options?: { eventType?: string; userId?: string; limit?: number }): Promise<AnalyticsEvent[]>;

  // Daily stats methods
  getDailyStats(date: string): Promise<DailyStats | undefined>;
  updateDailyStats(date: string, updates: Partial<InsertDailyStats>): Promise<DailyStats>;
  getDailyStatsRange(startDate: string, endDate: string): Promise<DailyStats[]>;

  // Lore system methods
  getLoreEntities(entityType?: string): Promise<LoreEntity[]>;
  getLoreEntity(id: string): Promise<LoreEntity | undefined>;
  
  // Mission system methods
  getMissions(options?: { factionId?: string; minLevel?: number; maxLevel?: number; status?: string }): Promise<Mission[]>;
  getMission(id: string): Promise<Mission | undefined>;
  createMission(mission: InsertMission): Promise<Mission>;
  updateMission(id: string, updates: Partial<InsertMission>): Promise<Mission>;
  
  // Story arc methods
  getStoryArcs(options?: { factionId?: string; status?: string }): Promise<StoryArc[]>;
  getStoryArc(id: string): Promise<StoryArc | undefined>;
  createStoryArc(arc: InsertStoryArc): Promise<StoryArc>;
  
  // Combat challenge methods
  getCombatChallenges(options?: { canSpawnInDungeon?: boolean; difficultyTier?: number }): Promise<CombatChallenge[]>;
  getCombatChallenge(id: string): Promise<CombatChallenge | undefined>;
  createCombatChallenge(challenge: InsertCombatChallenge): Promise<CombatChallenge>;
  
  // Player mission progress methods
  getPlayerMissionProgress(userId: string, missionId?: string): Promise<PlayerMissionProgress[]>;
  acceptMission(userId: string, accountId: string | null, missionId: string): Promise<PlayerMissionProgress>;
  updateMissionProgress(id: string, updates: Partial<InsertPlayerMissionProgress>): Promise<PlayerMissionProgress>;
  completeMission(progressId: string): Promise<PlayerMissionProgress>;
  
  // Faction reputation methods
  getPlayerFactionReputation(userId: string): Promise<PlayerFactionReputation[]>;
  updateFactionReputation(userId: string, factionId: string, change: number): Promise<PlayerFactionReputation>;
  
  // AI generated content methods
  createGeneratedContent(content: InsertGeneratedContent): Promise<GeneratedContent>;
  getPendingGeneratedContent(): Promise<GeneratedContent[]>;
  approveGeneratedContent(id: string, reviewedBy: string): Promise<GeneratedContent>;

  // GBUX transaction methods
  creditGbux(accountId: string, amount: number, eventType: GbuxEventType, options?: {
    sourceRef?: string;
    sourceCharacterId?: string;
    metadata?: Record<string, unknown>;
  }): Promise<GbuxTransaction>;
  debitGbux(accountId: string, amount: number, eventType: GbuxEventType, options?: {
    sourceRef?: string;
    sourceCharacterId?: string;
    feeAmount?: number;
    feePercent?: number;
    metadata?: Record<string, unknown>;
  }): Promise<GbuxTransaction>;
  getGbuxTransactions(accountId: string, options?: { limit?: number; eventType?: GbuxEventType }): Promise<GbuxTransaction[]>;
  getGbuxBalance(accountId: string): Promise<number>;

  // UUID Ledger methods
  logUuidEvent(event: InsertUuidLedger): Promise<UuidLedger>;
  getUuidHistory(grudgeUuid: string): Promise<UuidLedger[]>;
  searchUuidLedger(options: {
    accountId?: string;
    characterId?: string;
    eventType?: UUIDEventType;
    itemId?: string;
    sourceType?: string;
    startDate?: number;
    endDate?: number;
    limit?: number;
  }): Promise<UuidLedger[]>;
  validateUuid(grudgeUuid: string): Promise<UuidValidationCache | undefined>;
  updateUuidValidation(grudgeUuid: string, updates: Partial<InsertUuidValidationCache>): Promise<UuidValidationCache>;
  getAccountUuids(accountId: string, state?: 'ACTIVE' | 'ARCHIVED' | 'CONSUMED' | 'DESTROYED'): Promise<UuidValidationCache[]>;
}

export class DatabaseStorage implements IStorage {
  // Item methods
  async getItems(): Promise<any[]> {
    return await db.select().from(items);
  }

  async getItem(id: string): Promise<any | undefined> {
    const [item] = await db.select().from(items).where(eq(items.id, id));
    return item || undefined;
  }

  async updateItem(id: string, updates: any): Promise<any> {
    const [updated] = await db
      .update(items)
      .set(updates)
      .where(eq(items.id, id))
      .returning();
    return updated;
  }

  // Spell methods
  async getSpells(): Promise<any[]> {
    return await db.select().from(spells);
  }

  async getSpell(id: string): Promise<any | undefined> {
    const [spell] = await db.select().from(spells).where(eq(spells.id, id));
    return spell || undefined;
  }

  // Skill methods
  async getSkills(): Promise<any[]> {
    return await db.select().from(skills);
  }

  async getSkill(id: string): Promise<any | undefined> {
    const [skill] = await db.select().from(skills).where(eq(skills.id, id));
    return skill || undefined;
  }

  // Monster methods
  async getMonsters(): Promise<any[]> {
    return await db.select().from(monsters);
  }

  async getMonster(id: string): Promise<any | undefined> {
    const [monster] = await db.select().from(monsters).where(eq(monsters.id, id));
    return monster || undefined;
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  // Character methods
  /**
   * Roster for a user. Prefer characters.user_id; fall back to account_id join
   * when legacy rows only have account_id (pre-user_id Neon).
   */
  async getCharacters(userId: string, era?: import("@shared/definitions/gameEras").GameEra): Promise<Character[]> {
    try {
      if (era) {
        return await db
          .select()
          .from(characters)
          .where(and(eq(characters.userId, userId), eq(characters.gameEra, era)));
      }
      return await db.select().from(characters).where(eq(characters.userId, userId));
    } catch (err) {
      // Legacy DBs may lack user_id / game_era — recover via account_id + raw SQL.
      console.error("[storage.getCharacters] primary query failed, legacy fallback:", (err as Error)?.message);
      const account = await this.getAccountByUserId(userId);
      if (!account?.id) return [];
      try {
        if (era) {
          return await db
            .select()
            .from(characters)
            .where(and(eq(characters.accountId, account.id), eq(characters.gameEra, era)));
        }
        return await db.select().from(characters).where(eq(characters.accountId, account.id));
      } catch (err2) {
        console.error("[storage.getCharacters] account_id fallback failed:", (err2 as Error)?.message);
        // Last resort: raw select by account_id without era columns
        try {
          const { pool } = await import("./db");
          if (!pool) return [];
          const r = await pool.query(
            `SELECT * FROM characters WHERE account_id = $1`,
            [account.id],
          );
          let rows = r.rows || [];
          if (era) {
            rows = rows.filter(
              (row: any) => !row.game_era || row.game_era === era || row.gameEra === era,
            );
          }
          return rows as Character[];
        } catch (err3) {
          console.error("[storage.getCharacters] raw fallback failed:", (err3 as Error)?.message);
          return [];
        }
      }
    }
  }

  async countCharactersForEra(userId: string, era: import("@shared/definitions/gameEras").GameEra): Promise<number> {
    const [row] = await db
      .select({ total: count() })
      .from(characters)
      .where(and(eq(characters.userId, userId), eq(characters.gameEra, era)));
    return Number(row?.total ?? 0);
  }

  async activateCharacterForEra(
    userId: string,
    characterId: string,
    era: import("@shared/definitions/gameEras").GameEra,
  ): Promise<{ character: Character; eraSlots: import("@shared/definitions/gameEras").AccountEraSlots }> {
    const { mergeEraSlots } = await import("@shared/definitions/gameEras");
    const character = await this.getCharacter(characterId);
    if (!character || character.userId !== userId) {
      throw new Error("Character not found");
    }
    if (character.gameEra !== era) {
      throw new Error("Character does not belong to this era");
    }

    const account = await this.getOrCreateAccountForUser(userId);
    const eraSlots = mergeEraSlots(account.eraSlots as import("@shared/definitions/gameEras").AccountEraSlots | null);

    await db
      .update(characters)
      .set({ activeForEra: false })
      .where(and(eq(characters.userId, userId), eq(characters.gameEra, era)));

    const [updated] = await db
      .update(characters)
      .set({ activeForEra: true })
      .where(eq(characters.id, characterId))
      .returning();

    eraSlots[era].activeCharacterId = characterId;
    await this.updateAccount(account.id, { eraSlots });

    return { character: updated, eraSlots };
  }

  async getCharacter(id: string): Promise<Character | undefined> {
    const [character] = await db.select().from(characters).where(eq(characters.id, id));
    return character || undefined;
  }

  async createCharacter(character: InsertCharacter): Promise<Character> {
    // Auto-populate accountId if not provided
    let accountId = character.accountId;
    if (!accountId && character.userId) {
      const account = await this.getAccountByUserId(character.userId);
      if (account) {
        accountId = account.id;
      }
    }
    const [newCharacter] = await db
      .insert(characters)
      .values({ ...character, accountId })
      .returning();
    return newCharacter;
  }

  async updateCharacter(id: string, updates: Partial<InsertCharacter>): Promise<Character> {
    const [updated] = await db
      .update(characters)
      .set(updates)
      .where(eq(characters.id, id))
      .returning();
    return updated;
  }

  async deleteCharacter(id: string): Promise<void> {
    await db.delete(characters).where(eq(characters.id, id));
  }

  // Party methods
  async getParty(userId: string): Promise<Party | undefined> {
    const [party] = await db.select().from(parties).where(eq(parties.userId, userId));
    return party || undefined;
  }

  async updateParty(userId: string, characterIds: string[]): Promise<Party> {
    // Limit to 3 characters
    const limited = characterIds.slice(0, 3);
    
    const existing = await this.getParty(userId);
    if (existing) {
      const [updated] = await db
        .update(parties)
        .set({ characterIds: limited, updatedAt: Date.now() })
        .where(eq(parties.userId, userId))
        .returning();
      return updated;
    } else {
      // Auto-populate accountId
      const account = await this.getAccountByUserId(userId);
      const [created] = await db
        .insert(parties)
        .values({ userId, characterIds: limited, accountId: account?.id })
        .returning();
      return created;
    }
  }

  // Resource node methods
  async getResourceNode(userId: string, nodeId: string): Promise<ResourceNode | undefined> {
    const [node] = await db
      .select()
      .from(resourceNodes)
      .where(and(eq(resourceNodes.userId, userId), eq(resourceNodes.nodeId, nodeId)));
    return node || undefined;
  }

  async updateResourceNode(userId: string, nodeId: string, lastGathered: number): Promise<ResourceNode> {
    const existing = await this.getResourceNode(userId, nodeId);
    if (existing) {
      const [updated] = await db
        .update(resourceNodes)
        .set({ lastGathered })
        .where(and(eq(resourceNodes.userId, userId), eq(resourceNodes.nodeId, nodeId)))
        .returning();
      return updated;
    } else {
      // Auto-populate accountId
      const account = await this.getAccountByUserId(userId);
      const [created] = await db
        .insert(resourceNodes)
        .values({ userId, nodeId, lastGathered, accountId: account?.id })
        .returning();
      return created;
    }
  }

  // Player resources methods
  async getPlayerResources(userId: string): Promise<PlayerResources | undefined> {
    const [resources] = await db
      .select()
      .from(playerResources)
      .where(eq(playerResources.userId, userId));
    return resources || undefined;
  }

  async updatePlayerResources(userId: string, resources: Record<string, number>): Promise<PlayerResources> {
    const existing = await this.getPlayerResources(userId);
    if (existing) {
      const [updated] = await db
        .update(playerResources)
        .set({ resources, updatedAt: Date.now() })
        .where(eq(playerResources.userId, userId))
        .returning();
      return updated;
    } else {
      // Auto-populate accountId
      const account = await this.getAccountByUserId(userId);
      const [created] = await db
        .insert(playerResources)
        .values({ userId, resources, accountId: account?.id })
        .returning();
      return created;
    }
  }

  async getRaces(): Promise<Race[]> {
    return db.select().from(races);
  }

  async getClasses(): Promise<GameClass[]> {
    return db.select().from(classes);
  }

  async getSpriteSheets(): Promise<SpriteSheet[]> {
    return db.select().from(spriteSheets);
  }

  async getSpriteSheet(id: string): Promise<SpriteSheet | undefined> {
    const [sheet] = await db.select().from(spriteSheets).where(eq(spriteSheets.id, id));
    return sheet || undefined;
  }

  async getDungeonTemplates(): Promise<DungeonTemplate[]> {
    return db.select().from(dungeonTemplates);
  }

  async getDungeonTemplate(id: string): Promise<DungeonTemplate | undefined> {
    const [template] = await db.select().from(dungeonTemplates).where(eq(dungeonTemplates.id, id));
    return template || undefined;
  }

  // Profession methods
  async getCharacterProfessions(characterId: string): Promise<CharacterProfession[]> {
    return db.select().from(characterProfessions).where(eq(characterProfessions.characterId, characterId));
  }

  async getCharacterProfession(characterId: string, professionId: string): Promise<CharacterProfession | undefined> {
    const [profession] = await db
      .select()
      .from(characterProfessions)
      .where(and(
        eq(characterProfessions.characterId, characterId),
        eq(characterProfessions.professionId, professionId)
      ));
    return profession || undefined;
  }

  async updateCharacterProfession(
    characterId: string, 
    professionId: string, 
    updates: {
      level?: number;
      xp?: number;
      lastGainAt?: number | null;
      lastDecayCheckAt?: number | null;
    }
  ): Promise<CharacterProfession> {
    const existing = await this.getCharacterProfession(characterId, professionId);
    
    if (existing) {
      const [updated] = await db
        .update(characterProfessions)
        .set(updates)
        .where(and(
          eq(characterProfessions.characterId, characterId),
          eq(characterProfessions.professionId, professionId)
        ))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(characterProfessions)
        .values({
          characterId,
          professionId,
          level: updates.level ?? 1,
          xp: updates.xp ?? 0,
          lastGainAt: updates.lastGainAt,
          lastDecayCheckAt: updates.lastDecayCheckAt,
        })
        .returning();
      return created;
    }
  }

  // Experience event methods
  async logExperienceEvent(event: InsertExperienceEvent): Promise<ExperienceEvent> {
    const [created] = await db
      .insert(experienceEvents)
      .values(event)
      .returning();
    return created;
  }

  async getExperienceEvents(characterId: string, limit = 100): Promise<ExperienceEvent[]> {
    return db
      .select()
      .from(experienceEvents)
      .where(eq(experienceEvents.characterId, characterId))
      .limit(limit);
  }

  // Unlocked skills methods
  async getUnlockedSkills(characterId: string, profession?: string): Promise<UnlockedSkill[]> {
    if (profession) {
      return db
        .select()
        .from(unlockedSkills)
        .where(and(
          eq(unlockedSkills.characterId, characterId),
          eq(unlockedSkills.profession, profession)
        ));
    }
    return db
      .select()
      .from(unlockedSkills)
      .where(eq(unlockedSkills.characterId, characterId));
  }

  async unlockSkill(skill: InsertUnlockedSkill): Promise<UnlockedSkill> {
    const [created] = await db
      .insert(unlockedSkills)
      .values(skill)
      .returning();
    return created;
  }

  async isSkillUnlocked(characterId: string, nodeId: string, profession: string): Promise<boolean> {
    const [skill] = await db
      .select()
      .from(unlockedSkills)
      .where(and(
        eq(unlockedSkills.characterId, characterId),
        eq(unlockedSkills.nodeId, nodeId),
        eq(unlockedSkills.profession, profession)
      ));
    return !!skill;
  }

  async unlockSkillAtomic(
    characterId: string, 
    nodeId: string, 
    profession: string
  ): Promise<{ skill: UnlockedSkill; remainingPoints: number }> {
    return await db.transaction(async (tx) => {
      const [character] = await tx
        .select()
        .from(characters)
        .where(eq(characters.id, characterId));
      
      if (!character) {
        throw new Error("Character not found");
      }
      
      const currentPoints = character.skillPoints || 0;
      if (currentPoints < 1) {
        throw new Error("Not enough skill points");
      }

      const [existingSkill] = await tx
        .select()
        .from(unlockedSkills)
        .where(and(
          eq(unlockedSkills.characterId, characterId),
          eq(unlockedSkills.nodeId, nodeId),
          eq(unlockedSkills.profession, profession)
        ));
      
      if (existingSkill) {
        throw new Error("Skill already unlocked");
      }

      const [skill] = await tx
        .insert(unlockedSkills)
        .values({ characterId, nodeId, profession })
        .returning();

      const newPoints = currentPoints - 1;
      await tx
        .update(characters)
        .set({ skillPoints: newPoints })
        .where(eq(characters.id, characterId));

      return { skill, remainingPoints: newPoints };
    });
  }

  // Character abilities methods
  async getCharacterAbilities(characterId: string): Promise<CharacterAbility[]> {
    return db
      .select()
      .from(characterAbilities)
      .where(eq(characterAbilities.characterId, characterId));
  }

  async addCharacterAbility(ability: InsertCharacterAbility): Promise<CharacterAbility> {
    const [created] = await db
      .insert(characterAbilities)
      .values(ability)
      .onConflictDoNothing()
      .returning();
    return created;
  }

  async addStartingAbilities(characterId: string, classId: string): Promise<CharacterAbility[]> {
    const [gameClass] = await db
      .select()
      .from(classes)
      .where(eq(classes.id, classId));
    
    if (!gameClass || !gameClass.startingAbilities || !Array.isArray(gameClass.startingAbilities)) {
      return [];
    }

    const abilities: CharacterAbility[] = [];
    const startingAbilities = gameClass.startingAbilities as string[];
    
    // Build lookup maps for spells and skills by referenceName
    const allSpells = await db.select().from(spells);
    const allSkills = await db.select().from(skills);
    const spellRefNames = new Set(allSpells.map(s => s.referenceName).filter(Boolean));
    const skillRefNames = new Set(allSkills.map(s => s.referenceName).filter(Boolean));
    
    for (let i = 0; i < startingAbilities.length; i++) {
      const referenceName = startingAbilities[i];
      // Determine ability type by checking if it exists in spells or skills tables
      let abilityType: 'spell' | 'skill' = 'skill';
      if (spellRefNames.has(referenceName)) {
        abilityType = 'spell';
      } else if (skillRefNames.has(referenceName)) {
        abilityType = 'skill';
      }
      
      const [created] = await db
        .insert(characterAbilities)
        .values({
          characterId,
          abilityReferenceName: referenceName,
          abilityType,
          abilityLevel: 1,
          slotIndex: i + 1 // Assign to slots 1-4
        })
        .onConflictDoNothing()
        .returning();
      
      if (created) {
        abilities.push(created);
      }
    }
    
    return abilities;
  }

  // Account methods
  async getAccount(id: string): Promise<Account | undefined> {
    const [account] = await db.select().from(accounts).where(eq(accounts.id, id));
    return account || undefined;
  }

  async getAccountByUserId(userId: string): Promise<Account | undefined> {
    const [account] = await db.select().from(accounts).where(eq(accounts.userId, userId));
    return account || undefined;
  }

  async getAccountByGrudgeId(grudgeId: string): Promise<Account | undefined> {
    if (!grudgeId) return undefined;
    try {
      const [account] = await db.select().from(accounts).where(eq(accounts.grudgeId, grudgeId));
      return account || undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Roster for authenticated requests — merge by users.id AND account_id / grudgeId
   * so Foundry-created heroes still appear when JWT claim shape differs slightly.
   */
  async getCharactersForAuth(
    userId: string,
    era?: import("@shared/definitions/gameEras").GameEra,
    grudgeId?: string | null,
  ): Promise<Character[]> {
    const byId = new Map<string, Character>();
    const addAll = (rows: Character[]) => {
      for (const c of rows) {
        if (c?.id) byId.set(String(c.id), c);
      }
    };

    addAll(await this.getCharacters(userId, era));

    // Account linked to this userId
    try {
      const acc = await this.getAccountByUserId(userId);
      if (acc?.id) {
        try {
          let rows = await db.select().from(characters).where(eq(characters.accountId, acc.id));
          if (era) rows = rows.filter((r) => !r.gameEra || r.gameEra === era);
          addAll(rows);
        } catch {
          /* column drift */
        }
        if (acc.userId && acc.userId !== userId) {
          addAll(await this.getCharacters(acc.userId, era));
        }
      }
    } catch {
      /* ignore */
    }

    // Account linked by grudgeId claim (Foundry / Grudge ID SSO)
    if (grudgeId) {
      try {
        const byG = await this.getAccountByGrudgeId(grudgeId);
        if (byG?.id) {
          try {
            let rows = await db.select().from(characters).where(eq(characters.accountId, byG.id));
            if (era) rows = rows.filter((r) => !r.gameEra || r.gameEra === era);
            addAll(rows);
          } catch {
            /* ignore */
          }
          if (byG.userId) addAll(await this.getCharacters(byG.userId, era));
        }
        // Some legacy rows used grudgeId string as characters.user_id
        addAll(await this.getCharacters(grudgeId, era));
      } catch {
        /* ignore */
      }
    }

    return Array.from(byId.values());
  }

  async createAccount(account: InsertAccount): Promise<Account> {
    const [created] = await db.insert(accounts).values(account).returning();
    return created;
  }

  async updateAccount(id: string, updates: Partial<InsertAccount>): Promise<Account> {
    const [updated] = await db
      .update(accounts)
      .set({ ...updates, updatedAt: Date.now() })
      .where(eq(accounts.id, id))
      .returning();
    return updated;
  }

  async getOrCreateAccountForUser(userId: string): Promise<Account> {
    const existing = await this.getAccountByUserId(userId);
    if (existing) {
      // Lazy wallet provision: existing accounts without a server wallet get one
      // on first touch (login / first character) — never a second wallet.
      if (!existing.walletAddress) {
        try {
          const { nftMintingService } = await import("./services/nftMinting");
          const addr = await nftMintingService.ensureAccountWallet(existing.id);
          if (addr) {
            const refreshed = await this.getAccountByUserId(userId);
            if (refreshed) return refreshed;
          }
        } catch (error) {
          console.warn(
            "[Storage] Lazy wallet provision failed (mint will retry):",
            error,
          );
        }
      }
      return existing;
    }
    
    // Get user for wallet initialization
    const user = await this.getUser(userId);
    
    // Initialize wallet and Grudge ID
    const { generateGrudgeId, generateWalletEmail } = await import("./services/walletHelper");
    const { crossmintWalletService } = await import("./services/crossmintWallet");
    
    const grudgeId = generateGrudgeId(userId);
    // Stable Crossmint locator by Grudge ID (not random email) so all eras share one wallet
    const email =
      user?.email ||
      crossmintWalletService.stableEmailForGrudgeId(grudgeId) ||
      generateWalletEmail(userId, user?.username);
    
    console.log(`[Storage] Creating account for user ${userId} with Grudge ID: ${grudgeId}`);
    
    // Provision singular server-side Crossmint Solana wallet (non-blocking if API down)
    let walletData: { walletAddress?: string; walletId?: string } = {};
    try {
      const wallet =
        (await crossmintWalletService.getOrCreateWalletForGrudgeId(grudgeId)) ||
        (await crossmintWalletService.getOrCreateWallet(email));
      if (wallet) {
        walletData = {
          walletAddress: wallet.address,
          walletId: wallet.id,
        };
        console.log(`[Storage] Created wallet ${wallet.address} for account grudgeId=${grudgeId}`);
      }
    } catch (error) {
      console.warn('[Storage] Wallet creation failed, continuing without wallet:', error);
    }
    
    return this.createAccount({ 
      userId,
      grudgeId,
      crossmintEmail: email,
      walletAddress: walletData.walletAddress,
      crossmintWalletId: walletData.walletId,
      walletType: walletData.walletAddress ? 'crossmint' : undefined,
    });
  }

  // Account inventory methods
  async getAccountInventory(accountId: string): Promise<AccountInventoryItem[]> {
    return db.select().from(accountInventory).where(eq(accountInventory.accountId, accountId));
  }

  async getAccountInventoryItem(id: string): Promise<AccountInventoryItem | undefined> {
    const [item] = await db.select().from(accountInventory).where(eq(accountInventory.id, id));
    return item || undefined;
  }

  async validateCharacterOwnership(characterId: string, userId: string): Promise<boolean> {
    const character = await this.getCharacter(characterId);
    return character !== undefined && character.userId === userId;
  }

  async addAccountInventoryItem(item: InsertAccountInventory, userId?: string): Promise<AccountInventoryItem> {
    // If boundToCharacterId is set and userId is provided, validate ownership
    if (item.boundToCharacterId && userId) {
      const isValid = await this.validateCharacterOwnership(item.boundToCharacterId, userId);
      if (!isValid) {
        throw new Error("Character does not belong to this user");
      }
    }
    
    const [created] = await db.insert(accountInventory).values(item).returning();
    return created;
  }

  async updateAccountInventoryItemSafe(
    id: string, 
    updates: Partial<InsertAccountInventory>, 
    accountId: string,
    userId?: string
  ): Promise<AccountInventoryItem> {
    // Validate item ownership
    const item = await this.getAccountInventoryItem(id);
    if (!item) {
      throw new Error("Item not found");
    }
    if (item.accountId !== accountId) {
      throw new Error("Item does not belong to this account");
    }
    
    // Never allow accountId to be changed
    const safeUpdates = { ...updates };
    delete (safeUpdates as Record<string, unknown>).accountId;
    delete (safeUpdates as Record<string, unknown>).id;
    
    // Validate character ownership if boundToCharacterId is being set
    if (safeUpdates.boundToCharacterId && userId) {
      const isValid = await this.validateCharacterOwnership(safeUpdates.boundToCharacterId, userId);
      if (!isValid) {
        throw new Error("Character does not belong to this user");
      }
    }
    
    const [updated] = await db
      .update(accountInventory)
      .set({ ...safeUpdates, updatedAt: Date.now() })
      .where(eq(accountInventory.id, id))
      .returning();
    return updated;
  }

  async updateAccountInventoryItem(id: string, updates: Partial<InsertAccountInventory>): Promise<AccountInventoryItem> {
    const [updated] = await db
      .update(accountInventory)
      .set({ ...updates, updatedAt: Date.now() })
      .where(eq(accountInventory.id, id))
      .returning();
    return updated;
  }

  async removeAccountInventoryItem(id: string): Promise<void> {
    await db.delete(accountInventory).where(eq(accountInventory.id, id));
  }

  async transferItemToCharacter(itemId: string, characterId: string | null, accountId: string, userId: string): Promise<AccountInventoryItem> {
    const item = await this.getAccountInventoryItem(itemId);
    if (!item) {
      throw new Error("Item not found");
    }
    if (item.accountId !== accountId) {
      throw new Error("Item does not belong to this account");
    }
    
    if (characterId !== null) {
      const character = await this.getCharacter(characterId);
      if (!character) {
        throw new Error("Character not found");
      }
      if (character.userId !== userId) {
        throw new Error("Character does not belong to your account");
      }
    }
    
    const [updated] = await db
      .update(accountInventory)
      .set({ boundToCharacterId: characterId, updatedAt: Date.now() })
      .where(eq(accountInventory.id, itemId))
      .returning();
    return updated;
  }

  // Account resources methods
  async getAccountResources(accountId: string): Promise<AccountResources | undefined> {
    const [resources] = await db
      .select()
      .from(accountResources)
      .where(eq(accountResources.accountId, accountId));
    return resources || undefined;
  }

  async updateAccountResources(accountId: string, resources: Record<string, number>): Promise<AccountResources> {
    const existing = await this.getAccountResources(accountId);
    if (existing) {
      const [updated] = await db
        .update(accountResources)
        .set({ resources, updatedAt: Date.now() })
        .where(eq(accountResources.accountId, accountId))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(accountResources)
        .values({ accountId, resources })
        .returning();
      return created;
    }
  }

  async addAccountResource(accountId: string, resourceId: string, amount: number): Promise<AccountResources> {
    const existing = await this.getAccountResources(accountId);
    const currentResources = existing?.resources || {};
    const newResources = {
      ...currentResources,
      [resourceId]: (currentResources[resourceId] || 0) + amount
    };
    return this.updateAccountResources(accountId, newResources);
  }

  async batchAddAccountResources(accountId: string, items: Array<{ resourceId: string; amount: number }>): Promise<AccountResources> {
    const existing = await this.getAccountResources(accountId);
    const currentResources = { ...(existing?.resources || {}) };
    
    for (const item of items) {
      if (item.resourceId && typeof item.amount === 'number' && item.amount > 0) {
        currentResources[item.resourceId] = (currentResources[item.resourceId] || 0) + item.amount;
      }
    }
    
    return this.updateAccountResources(accountId, currentResources);
  }

  async getAccountLearnedRecipes(accountId: string): Promise<string[]> {
    const rows = await db
      .select({ recipeId: accountLearnedRecipes.recipeId })
      .from(accountLearnedRecipes)
      .where(eq(accountLearnedRecipes.accountId, accountId));
    return rows.map((r) => r.recipeId);
  }

  async learnAccountRecipes(accountId: string, recipeIds: string[]): Promise<string[]> {
    const now = Date.now();
    const unique = [...new Set(recipeIds.filter(Boolean))];
    if (unique.length) {
      await db
        .insert(accountLearnedRecipes)
        .values(unique.map((recipeId) => ({ accountId, recipeId, learnedAt: now })))
        .onConflictDoNothing();
    }
    return this.getAccountLearnedRecipes(accountId);
  }

  // Sprite manifest methods
  async getSpriteManifest(options?: { category?: string; subcategory?: string; search?: string; limit?: number }): Promise<SpriteManifestEntry[]> {
    const conditions = [];
    if (options?.category) {
      conditions.push(eq(spriteManifest.category, options.category));
    }
    if (options?.subcategory) {
      conditions.push(eq(spriteManifest.subcategory, options.subcategory));
    }
    if (options?.search) {
      conditions.push(like(spriteManifest.name, `%${options.search}%`));
    }
    
    let query = db.select().from(spriteManifest);
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }
    
    const results = await query.orderBy(desc(spriteManifest.createdAt)).limit(options?.limit || 500);
    return results;
  }

  async getSpriteManifestEntry(id: string): Promise<SpriteManifestEntry | undefined> {
    const [entry] = await db.select().from(spriteManifest).where(eq(spriteManifest.id, id));
    return entry || undefined;
  }

  async getSpriteByObjectPath(objectPath: string): Promise<SpriteManifestEntry | undefined> {
    const [entry] = await db.select().from(spriteManifest).where(eq(spriteManifest.objectPath, objectPath));
    return entry || undefined;
  }

  async getSpriteManifestByLocalPath(localPath: string): Promise<SpriteManifestEntry | undefined> {
    const [entry] = await db.select().from(spriteManifest).where(eq(spriteManifest.localPath, localPath));
    return entry || undefined;
  }

  async getSpriteManifestEntries(): Promise<SpriteManifestEntry[]> {
    return db.select().from(spriteManifest);
  }

  async addSpriteManifestEntry(entry: InsertSpriteManifest): Promise<SpriteManifestEntry> {
    const [created] = await db.insert(spriteManifest).values(entry).returning();
    return created;
  }

  async updateSpriteManifestEntry(id: string, updates: Partial<InsertSpriteManifest> & { syncedAt?: number }): Promise<SpriteManifestEntry> {
    const [updated] = await db
      .update(spriteManifest)
      .set({ ...updates, syncedAt: updates.syncedAt ?? Date.now() })
      .where(eq(spriteManifest.id, id))
      .returning();
    return updated;
  }

  async deleteSpriteManifestEntry(id: string): Promise<void> {
    await db.delete(spriteManifest).where(eq(spriteManifest.id, id));
  }

  async getSpriteCategories(): Promise<{ category: string; count: number }[]> {
    const results = await db
      .select({ 
        category: spriteManifest.category, 
        count: count() 
      })
      .from(spriteManifest)
      .groupBy(spriteManifest.category);
    return results.map(r => ({ category: r.category, count: Number(r.count) }));
  }

  // Sprite unit spec methods
  async getSpriteUnitSpecs(): Promise<SpriteUnitSpec[]> {
    return db.select().from(spriteUnitSpecs).orderBy(desc(spriteUnitSpecs.createdAt));
  }

  async getSpriteUnitSpec(id: string): Promise<SpriteUnitSpec | undefined> {
    const [spec] = await db.select().from(spriteUnitSpecs).where(eq(spriteUnitSpecs.id, id));
    return spec || undefined;
  }

  async getSpriteUnitSpecByUnitId(unitId: string): Promise<SpriteUnitSpec | undefined> {
    const [spec] = await db.select().from(spriteUnitSpecs).where(eq(spriteUnitSpecs.unitId, unitId));
    return spec || undefined;
  }

  async createSpriteUnitSpec(spec: InsertSpriteUnitSpec): Promise<SpriteUnitSpec> {
    const [created] = await db.insert(spriteUnitSpecs).values(spec).returning();
    return created;
  }

  async updateSpriteUnitSpec(id: string, updates: Partial<InsertSpriteUnitSpec>): Promise<SpriteUnitSpec> {
    const [updated] = await db
      .update(spriteUnitSpecs)
      .set({ ...updates, updatedAt: Date.now() })
      .where(eq(spriteUnitSpecs.id, id))
      .returning();
    return updated;
  }

  async deleteSpriteUnitSpec(id: string): Promise<void> {
    await db.delete(spriteUnitSpecs).where(eq(spriteUnitSpecs.id, id));
  }

  // Sprite generation job methods
  async getSpriteGenerationJobs(specId?: string): Promise<SpriteGenerationJob[]> {
    if (specId) {
      return db.select().from(spriteGenerationJobs).where(eq(spriteGenerationJobs.specId, specId)).orderBy(desc(spriteGenerationJobs.createdAt));
    }
    return db.select().from(spriteGenerationJobs).orderBy(desc(spriteGenerationJobs.createdAt));
  }

  async getSpriteGenerationJob(id: string): Promise<SpriteGenerationJob | undefined> {
    const [job] = await db.select().from(spriteGenerationJobs).where(eq(spriteGenerationJobs.id, id));
    return job || undefined;
  }

  async createSpriteGenerationJob(job: InsertSpriteGenerationJob): Promise<SpriteGenerationJob> {
    const [created] = await db.insert(spriteGenerationJobs).values(job).returning();
    return created;
  }

  async updateSpriteGenerationJob(id: string, updates: Partial<InsertSpriteGenerationJob>): Promise<SpriteGenerationJob> {
    const [updated] = await db
      .update(spriteGenerationJobs)
      .set(updates)
      .where(eq(spriteGenerationJobs.id, id))
      .returning();
    return updated;
  }

  // Prompt blueprint methods
  async getPromptBlueprints(): Promise<PromptBlueprint[]> {
    return db.select().from(promptBlueprints).orderBy(desc(promptBlueprints.createdAt));
  }

  async getDefaultPromptBlueprint(): Promise<PromptBlueprint | undefined> {
    const [blueprint] = await db.select().from(promptBlueprints).where(eq(promptBlueprints.isDefault, true));
    return blueprint || undefined;
  }

  async createPromptBlueprint(blueprint: InsertPromptBlueprint): Promise<PromptBlueprint> {
    const [created] = await db.insert(promptBlueprints).values(blueprint).returning();
    return created;
  }

  async updatePromptBlueprint(id: string, updates: Partial<InsertPromptBlueprint>): Promise<PromptBlueprint> {
    const [updated] = await db
      .update(promptBlueprints)
      .set(updates)
      .where(eq(promptBlueprints.id, id))
      .returning();
    return updated;
  }

  // Home island methods
  async getHomeIslandById(id: string): Promise<HomeIsland | undefined> {
    const [island] = await db.select().from(homeIslands).where(eq(homeIslands.id, id));
    return island || undefined;
  }

  async getHomeIslandByAccountId(accountId: string): Promise<HomeIsland | undefined> {
    const [island] = await db.select().from(homeIslands).where(eq(homeIslands.accountId, accountId));
    return island || undefined;
  }

  async getHomeIsland(idOrAccountId: string): Promise<HomeIsland | undefined> {
    const byId = await this.getHomeIslandById(idOrAccountId);
    if (byId) return byId;
    return this.getHomeIslandByAccountId(idOrAccountId);
  }

  async createHomeIsland(island: InsertHomeIsland): Promise<HomeIsland> {
    const [created] = await db.insert(homeIslands).values(island).returning();
    return created;
  }

  async updateHomeIsland(id: string, updates: Partial<InsertHomeIsland>): Promise<HomeIsland> {
    const [updated] = await db
      .update(homeIslands)
      .set({ ...updates, updatedAt: Date.now() })
      .where(eq(homeIslands.id, id))
      .returning();
    return updated;
  }

  async updateIslandState(accountId: string, state: IslandState): Promise<HomeIsland> {
    const [updated] = await db
      .update(homeIslands)
      .set({ state, updatedAt: Date.now() })
      .where(eq(homeIslands.accountId, accountId))
      .returning();
    return updated;
  }

  async getOrCreateHomeIsland(accountId: string, seed?: string): Promise<HomeIsland> {
    const existing = await this.getHomeIslandByAccountId(accountId);
    if (existing) {
      return existing;
    }
    
    const islandSeed = seed || crypto.randomUUID();
    const generated = islandStateForStorage(accountId, islandSeed);
    const mapStyle = (generated.mapStyle || 'fantasy') as typeof generated.mapStyle;

    const island = await this.createHomeIsland({
      accountId,
      seed: islandSeed,
      name: generated.name || "Home Island",
      mapStyle,
      state: generated as unknown as Record<string, unknown>,
    });
    
    // Link the island UUID back to the account
    await db
      .update(accounts)
      .set({ homeIslandId: island.id, updatedAt: Date.now() })
      .where(eq(accounts.id, accountId));
    
    return island;
  }

  // AI Unit methods
  async getAIUnits(options?: { islandId?: string; isActive?: boolean }): Promise<AIUnit[]> {
    let query = db.select().from(aiUnits);
    
    if (options?.islandId) {
      query = query.where(eq(aiUnits.assignedIslandId, options.islandId)) as typeof query;
    }
    if (options?.isActive !== undefined) {
      query = query.where(eq(aiUnits.isActive, options.isActive)) as typeof query;
    }
    
    return await query;
  }

  async getAIUnit(id: string): Promise<AIUnit | undefined> {
    const [unit] = await db.select().from(aiUnits).where(eq(aiUnits.id, id));
    return unit || undefined;
  }

  async createAIUnit(unit: InsertAIUnit): Promise<AIUnit> {
    const [newUnit] = await db
      .insert(aiUnits)
      .values(unit as typeof aiUnits.$inferInsert)
      .returning();
    return newUnit;
  }

  async updateAIUnit(id: string, updates: Partial<InsertAIUnit>): Promise<AIUnit> {
    const [updated] = await db
      .update(aiUnits)
      .set({ ...updates, updatedAt: Date.now() } as Partial<typeof aiUnits.$inferInsert>)
      .where(eq(aiUnits.id, id))
      .returning();
    return updated;
  }

  async deleteAIUnit(id: string): Promise<void> {
    await db.delete(aiUnits).where(eq(aiUnits.id, id));
  }

  async transferCharacterToAIUnit(
    characterId: string,
    assignedIslandId: string,
    assignedIslandName: string,
    behavior: string = 'balanced'
  ): Promise<AIUnit> {
    const character = await this.getCharacter(characterId);
    if (!character) {
      throw new Error(`Character ${characterId} not found`);
    }

    // Get character abilities
    const abilities = await this.getCharacterAbilities(characterId);
    const abilityData = abilities.map(a => ({
      referenceName: a.abilityReferenceName,
      type: a.abilityType as 'spell' | 'skill',
      level: a.abilityLevel
    }));

    // Create AI unit from character data
    const aiUnit = await this.createAIUnit({
      name: character.name,
      sourceCharacterId: character.id,
      originAccountId: character.userId,
      raceId: character.raceId,
      classId: character.classId,
      level: character.level,
      attributes: character.attributes,
      equipment: character.equipment,
      abilities: abilityData,
      aiBehavior: behavior as 'aggressive' | 'defensive' | 'balanced' | 'support' | 'berserker',
      difficultyTier: Math.min(8, Math.max(1, Math.floor(character.level / 10) + 1)) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8,
      assignedIslandId,
      assignedIslandName,
      avatarUrl: character.avatarUrl,
      isActive: true,
    });

    return aiUnit;
  }

  async resetAccount(userId: string): Promise<void> {
    // Get account
    const account = await this.getAccountByUserId(userId);
    if (!account) {
      return;
    }

    // Delete all characters for this user
    await db.delete(characters).where(eq(characters.userId, userId));

    // Delete party
    await db.delete(parties).where(eq(parties.userId, userId));

    // Delete resource nodes
    await db.delete(resourceNodes).where(eq(resourceNodes.userId, userId));

    // Delete player resources
    await db.delete(playerResources).where(eq(playerResources.userId, userId));

    // Delete character abilities for this user's characters (already deleted with characters)
    // Delete dungeon runs
    await db.delete(dungeonRuns).where(eq(dungeonRuns.userId, userId));

    // Delete combat logs
    await db.delete(combatLogs).where(eq(combatLogs.userId, userId));

    // Delete game saves
    await db.delete(gameSaves).where(eq(gameSaves.userId, userId));

    // Delete account inventory
    await db.delete(accountInventory).where(eq(accountInventory.accountId, account.id));

    // Delete account resources
    await db.delete(accountResources).where(eq(accountResources.accountId, account.id));

    // Reset home island state
    const homeIsland = await this.getHomeIsland(account.id);
    if (homeIsland) {
      await db.delete(homeIslands).where(eq(homeIslands.accountId, account.id));
    }

    // Reset account gold and premium currency
    await db
      .update(accounts)
      .set({ 
        gold: 0, 
        premiumCurrency: 0, 
        homeIslandId: null,
        characterTokens: 1,
        updatedAt: Date.now() 
      })
      .where(eq(accounts.id, account.id));
  }

  // ============================================
  // API CALL LOGGING METHODS
  // ============================================

  async logApiCall(log: InsertApiCallLog): Promise<ApiCallLog> {
    const [entry] = await db
      .insert(apiCallLogs)
      .values(log)
      .returning();
    return entry;
  }

  async getApiCallLogs(options?: { userId?: string; path?: string; limit?: number }): Promise<ApiCallLog[]> {
    const conditions = [];
    if (options?.userId) {
      conditions.push(eq(apiCallLogs.userId, options.userId));
    }
    if (options?.path) {
      conditions.push(like(apiCallLogs.path, `%${options.path}%`));
    }
    
    const query = db
      .select()
      .from(apiCallLogs)
      .orderBy(desc(apiCallLogs.createdAt))
      .limit(options?.limit ?? 100);
    
    if (conditions.length > 0) {
      return await query.where(and(...conditions));
    }
    return await query;
  }

  async getApiCallStats(startDate?: number, endDate?: number): Promise<{ totalCalls: number; errorCount: number; avgResponseTime: number }> {
    const start = startDate ?? Date.now() - 24 * 60 * 60 * 1000; // Last 24 hours default
    const end = endDate ?? Date.now();
    
    const result = await db
      .select({
        totalCalls: count(),
        errorCount: sql<number>`COUNT(CASE WHEN ${apiCallLogs.statusCode} >= 400 THEN 1 END)`,
        avgResponseTime: sql<number>`COALESCE(AVG(${apiCallLogs.responseTimeMs}), 0)`,
      })
      .from(apiCallLogs)
      .where(and(
        sql`${apiCallLogs.createdAt} >= ${start}`,
        sql`${apiCallLogs.createdAt} <= ${end}`
      ));
    
    return {
      totalCalls: result[0]?.totalCalls ?? 0,
      errorCount: result[0]?.errorCount ?? 0,
      avgResponseTime: Math.round(result[0]?.avgResponseTime ?? 0),
    };
  }

  // ============================================
  // ACCOUNT SESSION METHODS
  // ============================================

  async createSession(session: InsertAccountSession): Promise<AccountSession> {
    const [entry] = await db
      .insert(accountSessions)
      .values(session)
      .returning();
    return entry;
  }

  async getSession(token: string): Promise<AccountSession | undefined> {
    const [session] = await db
      .select()
      .from(accountSessions)
      .where(eq(accountSessions.sessionToken, token));
    return session ?? undefined;
  }

  async updateSessionActivity(token: string): Promise<AccountSession | undefined> {
    const [updated] = await db
      .update(accountSessions)
      .set({ lastActiveAt: Date.now() })
      .where(eq(accountSessions.sessionToken, token))
      .returning();
    return updated ?? undefined;
  }

  async invalidateSession(token: string): Promise<void> {
    await db
      .update(accountSessions)
      .set({ isActive: false })
      .where(eq(accountSessions.sessionToken, token));
  }

  async getUserSessions(userId: string): Promise<AccountSession[]> {
    return await db
      .select()
      .from(accountSessions)
      .where(eq(accountSessions.userId, userId))
      .orderBy(desc(accountSessions.lastActiveAt));
  }

  // ============================================
  // ACTIVITY LOG METHODS
  // ============================================

  async logActivity(activity: InsertActivityLog): Promise<ActivityLog> {
    const [entry] = await db
      .insert(activityLogs)
      .values(activity)
      .returning();
    return entry;
  }

  async getActivityLogs(options?: { userId?: string; category?: string; limit?: number }): Promise<ActivityLog[]> {
    const conditions = [];
    if (options?.userId) {
      conditions.push(eq(activityLogs.userId, options.userId));
    }
    if (options?.category) {
      conditions.push(eq(activityLogs.category, options.category));
    }
    
    const query = db
      .select()
      .from(activityLogs)
      .orderBy(desc(activityLogs.createdAt))
      .limit(options?.limit ?? 100);
    
    if (conditions.length > 0) {
      return await query.where(and(...conditions));
    }
    return await query;
  }

  async getCharacterActivityLogs(characterId: string, limit: number = 50): Promise<ActivityLog[]> {
    return await db
      .select()
      .from(activityLogs)
      .where(eq(activityLogs.characterId, characterId))
      .orderBy(desc(activityLogs.createdAt))
      .limit(limit);
  }

  // ============================================
  // ANALYTICS EVENT METHODS
  // ============================================

  async trackEvent(event: InsertAnalyticsEvent): Promise<AnalyticsEvent> {
    const [entry] = await db
      .insert(analyticsEvents)
      .values(event)
      .returning();
    return entry;
  }

  async getAnalyticsEvents(options?: { eventType?: string; userId?: string; limit?: number }): Promise<AnalyticsEvent[]> {
    const conditions = [];
    if (options?.eventType) {
      conditions.push(eq(analyticsEvents.eventType, options.eventType));
    }
    if (options?.userId) {
      conditions.push(eq(analyticsEvents.userId, options.userId));
    }
    
    const query = db
      .select()
      .from(analyticsEvents)
      .orderBy(desc(analyticsEvents.createdAt))
      .limit(options?.limit ?? 100);
    
    if (conditions.length > 0) {
      return await query.where(and(...conditions));
    }
    return await query;
  }

  // ============================================
  // DAILY STATS METHODS
  // ============================================

  async getDailyStats(date: string): Promise<DailyStats | undefined> {
    const [stats] = await db
      .select()
      .from(dailyStats)
      .where(eq(dailyStats.date, date));
    return stats ?? undefined;
  }

  async updateDailyStats(date: string, updates: Partial<InsertDailyStats>): Promise<DailyStats> {
    const existing = await this.getDailyStats(date);
    
    if (existing) {
      const [updated] = await db
        .update(dailyStats)
        .set({ ...updates, updatedAt: Date.now() })
        .where(eq(dailyStats.date, date))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(dailyStats)
        .values({ date, ...updates })
        .returning();
      return created;
    }
  }

  async getDailyStatsRange(startDate: string, endDate: string): Promise<DailyStats[]> {
    return await db
      .select()
      .from(dailyStats)
      .where(and(
        sql`${dailyStats.date} >= ${startDate}`,
        sql`${dailyStats.date} <= ${endDate}`
      ))
      .orderBy(dailyStats.date);
  }

  // ============================================
  // LORE SYSTEM METHODS
  // ============================================

  async getLoreEntities(entityType?: string): Promise<LoreEntity[]> {
    if (entityType) {
      return await db
        .select()
        .from(loreEntities)
        .where(eq(loreEntities.entityType, entityType as any));
    }
    return await db.select().from(loreEntities);
  }

  async getLoreEntity(id: string): Promise<LoreEntity | undefined> {
    const [entity] = await db
      .select()
      .from(loreEntities)
      .where(eq(loreEntities.id, id));
    return entity ?? undefined;
  }

  // ============================================
  // MISSION SYSTEM METHODS
  // ============================================

  async getMissions(options?: { factionId?: string; minLevel?: number; maxLevel?: number; status?: string }): Promise<Mission[]> {
    const conditions = [];
    if (options?.factionId) {
      conditions.push(eq(missions.factionId, options.factionId));
    }
    if (options?.minLevel !== undefined) {
      conditions.push(sql`${missions.minLevel} >= ${options.minLevel}`);
    }
    if (options?.status) {
      conditions.push(eq(missions.status, options.status as any));
    }
    
    const query = db.select().from(missions).orderBy(desc(missions.createdAt));
    
    if (conditions.length > 0) {
      return await query.where(and(...conditions));
    }
    return await query;
  }

  async getMission(id: string): Promise<Mission | undefined> {
    const [mission] = await db
      .select()
      .from(missions)
      .where(eq(missions.id, id));
    return mission ?? undefined;
  }

  async createMission(mission: InsertMission): Promise<Mission> {
    const [created] = await db
      .insert(missions)
      .values(mission)
      .returning();
    return created;
  }

  async updateMission(id: string, updates: Partial<InsertMission>): Promise<Mission> {
    const [updated] = await db
      .update(missions)
      .set(updates)
      .where(eq(missions.id, id))
      .returning();
    return updated;
  }

  // ============================================
  // STORY ARC METHODS
  // ============================================

  async getStoryArcs(options?: { factionId?: string; status?: string }): Promise<StoryArc[]> {
    const conditions = [];
    if (options?.factionId) {
      conditions.push(eq(storyArcs.factionId, options.factionId));
    }
    if (options?.status) {
      conditions.push(eq(storyArcs.status, options.status as any));
    }
    
    const query = db.select().from(storyArcs);
    
    if (conditions.length > 0) {
      return await query.where(and(...conditions));
    }
    return await query;
  }

  async getStoryArc(id: string): Promise<StoryArc | undefined> {
    const [arc] = await db
      .select()
      .from(storyArcs)
      .where(eq(storyArcs.id, id));
    return arc ?? undefined;
  }

  async createStoryArc(arc: InsertStoryArc): Promise<StoryArc> {
    const [created] = await db
      .insert(storyArcs)
      .values(arc)
      .returning();
    return created;
  }

  // ============================================
  // COMBAT CHALLENGE METHODS
  // ============================================

  async getCombatChallenges(options?: { canSpawnInDungeon?: boolean; difficultyTier?: number }): Promise<CombatChallenge[]> {
    const conditions = [];
    if (options?.canSpawnInDungeon !== undefined) {
      conditions.push(eq(combatChallenges.canSpawnInDungeon, options.canSpawnInDungeon));
    }
    if (options?.difficultyTier !== undefined) {
      conditions.push(eq(combatChallenges.baseDifficultyTier, options.difficultyTier));
    }
    
    const query = db.select().from(combatChallenges);
    
    if (conditions.length > 0) {
      return await query.where(and(...conditions));
    }
    return await query;
  }

  async getCombatChallenge(id: string): Promise<CombatChallenge | undefined> {
    const [challenge] = await db
      .select()
      .from(combatChallenges)
      .where(eq(combatChallenges.id, id));
    return challenge ?? undefined;
  }

  async createCombatChallenge(challenge: InsertCombatChallenge): Promise<CombatChallenge> {
    const [created] = await db
      .insert(combatChallenges)
      .values(challenge)
      .returning();
    return created;
  }

  // ============================================
  // PLAYER MISSION PROGRESS METHODS
  // ============================================

  async getPlayerMissionProgress(userId: string, missionId?: string): Promise<PlayerMissionProgress[]> {
    const conditions = [eq(playerMissionProgress.userId, userId)];
    if (missionId) {
      conditions.push(eq(playerMissionProgress.missionId, missionId));
    }
    
    return await db
      .select()
      .from(playerMissionProgress)
      .where(and(...conditions))
      .orderBy(desc(playerMissionProgress.updatedAt));
  }

  async acceptMission(userId: string, accountId: string | null, missionId: string): Promise<PlayerMissionProgress> {
    const [progress] = await db
      .insert(playerMissionProgress)
      .values({
        userId,
        accountId,
        missionId,
        status: 'accepted',
        acceptedAt: Date.now(),
        attemptCount: 1,
      })
      .returning();
    return progress;
  }

  async updateMissionProgress(id: string, updates: Partial<InsertPlayerMissionProgress>): Promise<PlayerMissionProgress> {
    const [updated] = await db
      .update(playerMissionProgress)
      .set({ ...updates, updatedAt: Date.now() })
      .where(eq(playerMissionProgress.id, id))
      .returning();
    return updated;
  }

  async completeMission(progressId: string): Promise<PlayerMissionProgress> {
    const [updated] = await db
      .update(playerMissionProgress)
      .set({
        status: 'completed',
        completedAt: Date.now(),
        updatedAt: Date.now(),
      })
      .where(eq(playerMissionProgress.id, progressId))
      .returning();
    return updated;
  }

  // ============================================
  // FACTION REPUTATION METHODS
  // ============================================

  async getPlayerFactionReputation(userId: string): Promise<PlayerFactionReputation[]> {
    return await db
      .select()
      .from(playerFactionReputation)
      .where(eq(playerFactionReputation.userId, userId));
  }

  async updateFactionReputation(userId: string, factionId: string, change: number): Promise<PlayerFactionReputation> {
    const existing = await db
      .select()
      .from(playerFactionReputation)
      .where(and(
        eq(playerFactionReputation.userId, userId),
        eq(playerFactionReputation.factionId, factionId)
      ));
    
    if (existing.length > 0) {
      const newRep = Math.max(-1000, Math.min(1000, existing[0].reputation + change));
      const tier = this.getReputationTier(newRep);
      
      const [updated] = await db
        .update(playerFactionReputation)
        .set({
          reputation: newRep,
          tier,
          updatedAt: Date.now(),
        })
        .where(eq(playerFactionReputation.id, existing[0].id))
        .returning();
      return updated;
    } else {
      const tier = this.getReputationTier(change);
      const [created] = await db
        .insert(playerFactionReputation)
        .values({
          userId,
          factionId,
          reputation: Math.max(-1000, Math.min(1000, change)),
          tier,
        })
        .returning();
      return created;
    }
  }

  private getReputationTier(rep: number): 'hated' | 'hostile' | 'unfriendly' | 'neutral' | 'friendly' | 'honored' | 'exalted' {
    if (rep <= -800) return 'hated';
    if (rep <= -400) return 'hostile';
    if (rep <= -100) return 'unfriendly';
    if (rep <= 100) return 'neutral';
    if (rep <= 400) return 'friendly';
    if (rep <= 800) return 'honored';
    return 'exalted';
  }

  // ============================================
  // AI GENERATED CONTENT METHODS
  // ============================================

  async createGeneratedContent(content: InsertGeneratedContent): Promise<GeneratedContent> {
    const [created] = await db
      .insert(generatedContent)
      .values(content)
      .returning();
    return created;
  }

  async getPendingGeneratedContent(): Promise<GeneratedContent[]> {
    return await db
      .select()
      .from(generatedContent)
      .where(eq(generatedContent.status, 'pending'))
      .orderBy(desc(generatedContent.createdAt));
  }

  async approveGeneratedContent(id: string, reviewedBy: string): Promise<GeneratedContent> {
    const [updated] = await db
      .update(generatedContent)
      .set({
        status: 'approved',
        reviewedBy,
        reviewedAt: Date.now(),
      })
      .where(eq(generatedContent.id, id))
      .returning();
    return updated;
  }

  // ============================================
  // GBUX TRANSACTION METHODS
  // ============================================

  async creditGbux(
    accountId: string, 
    amount: number, 
    eventType: GbuxEventType,
    options?: {
      sourceRef?: string;
      sourceCharacterId?: string;
      metadata?: Record<string, unknown>;
    }
  ): Promise<GbuxTransaction> {
    if (amount <= 0) {
      throw new Error('Credit amount must be positive');
    }

    if (!GBUX_EVENT_TYPES.includes(eventType)) {
      throw new Error(`Invalid GBUX event type: ${eventType}`);
    }

    // Get current balance and update account
    const account = await this.getAccount(accountId);
    if (!account) {
      throw new Error(`Account not found: ${accountId}`);
    }

    const currentBalance = account.gbuxBalance || 0;
    const newBalance = currentBalance + amount;

    // Update account balance
    await db
      .update(accounts)
      .set({ 
        gbuxBalance: newBalance,
        updatedAt: Date.now()
      })
      .where(eq(accounts.id, accountId));

    // Create transaction record
    const [transaction] = await db
      .insert(gbuxTransactions)
      .values({
        accountId,
        amount,
        balanceAfter: newBalance,
        eventType,
        sourceRef: options?.sourceRef,
        sourceCharacterId: options?.sourceCharacterId,
        metadata: options?.metadata as any,
      })
      .returning();

    console.log(`[GBUX] Credit: ${amount} GBUX to account ${accountId} (${eventType})`);
    return transaction;
  }

  async debitGbux(
    accountId: string, 
    amount: number, 
    eventType: GbuxEventType,
    options?: {
      sourceRef?: string;
      sourceCharacterId?: string;
      feeAmount?: number;
      feePercent?: number;
      metadata?: Record<string, unknown>;
    }
  ): Promise<GbuxTransaction> {
    if (amount <= 0) {
      throw new Error('Debit amount must be positive');
    }

    if (!GBUX_EVENT_TYPES.includes(eventType)) {
      throw new Error(`Invalid GBUX event type: ${eventType}`);
    }

    // Get current balance
    const account = await this.getAccount(accountId);
    if (!account) {
      throw new Error(`Account not found: ${accountId}`);
    }

    const currentBalance = account.gbuxBalance || 0;
    if (currentBalance < amount) {
      throw new Error(`Insufficient GBUX balance: ${currentBalance} < ${amount}`);
    }

    const newBalance = currentBalance - amount;

    // Update account balance
    await db
      .update(accounts)
      .set({ 
        gbuxBalance: newBalance,
        updatedAt: Date.now()
      })
      .where(eq(accounts.id, accountId));

    // Create transaction record (negative amount for debit)
    const [transaction] = await db
      .insert(gbuxTransactions)
      .values({
        accountId,
        amount: -amount,
        balanceAfter: newBalance,
        eventType,
        sourceRef: options?.sourceRef,
        sourceCharacterId: options?.sourceCharacterId,
        feeAmount: options?.feeAmount || 0,
        feePercent: options?.feePercent || 0,
        metadata: options?.metadata as any,
      })
      .returning();

    console.log(`[GBUX] Debit: ${amount} GBUX from account ${accountId} (${eventType})`);
    return transaction;
  }

  async getGbuxTransactions(
    accountId: string, 
    options?: { limit?: number; eventType?: GbuxEventType }
  ): Promise<GbuxTransaction[]> {
    let query = db
      .select()
      .from(gbuxTransactions)
      .where(eq(gbuxTransactions.accountId, accountId))
      .orderBy(desc(gbuxTransactions.createdAt));

    if (options?.eventType) {
      query = db
        .select()
        .from(gbuxTransactions)
        .where(and(
          eq(gbuxTransactions.accountId, accountId),
          eq(gbuxTransactions.eventType, options.eventType)
        ))
        .orderBy(desc(gbuxTransactions.createdAt));
    }

    const results = await query.limit(options?.limit || 100);
    return results;
  }

  async getGbuxBalance(accountId: string): Promise<number> {
    const account = await this.getAccount(accountId);
    return account?.gbuxBalance || 0;
  }

  // UUID Ledger methods
  async logUuidEvent(event: InsertUuidLedger): Promise<UuidLedger> {
    // Validate event type
    if (!UUID_EVENT_TYPES.includes(event.eventType as any)) {
      throw new Error(`Invalid event type: ${event.eventType}. Valid types: ${UUID_EVENT_TYPES.join(', ')}`);
    }

    // Validate state transitions
    const existingCache = await this.validateUuid(event.grudgeUuid);
    
    if (existingCache) {
      const currentState = existingCache.currentState;
      const eventType = event.eventType;
      
      // Define valid transitions based on current state
      const validTransitions: Record<string, string[]> = {
        'ACTIVE': ['EQUIPPED', 'UNEQUIPPED', 'CONSUMED', 'UPGRADED', 'TRANSFERRED', 'DESTROYED', 'ARCHIVED', 'ASSIGNED'],
        'ARCHIVED': [], // Terminal state - no further transitions
        'CONSUMED': [], // Terminal state - no further transitions  
        'DESTROYED': [], // Terminal state - no further transitions
      };
      
      // Events that don't change state (always allowed on ACTIVE items)
      const nonStateChangingEvents = ['EQUIPPED', 'UNEQUIPPED', 'ASSIGNED'];
      
      // Check if transition is valid
      if (currentState !== 'ACTIVE' && !nonStateChangingEvents.includes(eventType)) {
        throw new Error(`Cannot apply ${eventType} to UUID in ${currentState} state. Only ACTIVE UUIDs can be modified.`);
      }
    }

    const [logged] = await db
      .insert(uuidLedger)
      .values(event)
      .returning();
    
    if (!existingCache) {
      // Create new cache entry
      await db
        .insert(uuidValidationCache)
        .values({
          grudgeUuid: event.grudgeUuid,
          isValid: true,
          currentState: event.eventType === 'CONSUMED' ? 'CONSUMED' 
            : event.eventType === 'ARCHIVED' ? 'ARCHIVED'
            : event.eventType === 'DESTROYED' ? 'DESTROYED' 
            : 'ACTIVE',
          currentAccountId: event.accountId,
          currentCharacterId: event.characterId,
          itemId: event.itemId,
          itemName: event.itemName,
          itemTier: event.itemTier,
          eventCount: 1,
          lastEventType: event.eventType,
        })
        .onConflictDoNothing();
    } else {
      // Update existing cache
      await this.updateUuidValidation(event.grudgeUuid, {
        currentState: event.eventType === 'CONSUMED' ? 'CONSUMED' 
          : event.eventType === 'ARCHIVED' ? 'ARCHIVED'
          : event.eventType === 'DESTROYED' ? 'DESTROYED' 
          : existingCache.currentState,
        currentAccountId: event.accountId || existingCache.currentAccountId,
        currentCharacterId: event.characterId || existingCache.currentCharacterId,
        eventCount: (existingCache.eventCount || 0) + 1,
        lastEventType: event.eventType,
      });
    }

    console.log(`[UUID] Event logged: ${event.eventType} for ${event.grudgeUuid}`);
    return logged;
  }

  async getUuidHistory(grudgeUuid: string): Promise<UuidLedger[]> {
    return await db
      .select()
      .from(uuidLedger)
      .where(eq(uuidLedger.grudgeUuid, grudgeUuid))
      .orderBy(desc(uuidLedger.createdAt));
  }

  async searchUuidLedger(options: {
    accountId?: string;
    characterId?: string;
    eventType?: UUIDEventType;
    itemId?: string;
    sourceType?: string;
    startDate?: number;
    endDate?: number;
    limit?: number;
  }): Promise<UuidLedger[]> {
    const conditions = [];

    if (options.accountId) {
      conditions.push(eq(uuidLedger.accountId, options.accountId));
    }
    if (options.characterId) {
      conditions.push(eq(uuidLedger.characterId, options.characterId));
    }
    if (options.eventType) {
      conditions.push(eq(uuidLedger.eventType, options.eventType));
    }
    if (options.itemId) {
      conditions.push(eq(uuidLedger.itemId, options.itemId));
    }
    if (options.sourceType) {
      conditions.push(eq(uuidLedger.sourceType, options.sourceType));
    }
    if (options.startDate) {
      conditions.push(sql`${uuidLedger.createdAt} >= ${options.startDate}`);
    }
    if (options.endDate) {
      conditions.push(sql`${uuidLedger.createdAt} <= ${options.endDate}`);
    }

    let query = db
      .select()
      .from(uuidLedger)
      .orderBy(desc(uuidLedger.createdAt))
      .limit(options.limit || 100);

    if (conditions.length > 0) {
      query = db
        .select()
        .from(uuidLedger)
        .where(and(...conditions))
        .orderBy(desc(uuidLedger.createdAt))
        .limit(options.limit || 100);
    }

    return await query;
  }

  async validateUuid(grudgeUuid: string): Promise<UuidValidationCache | undefined> {
    const [cache] = await db
      .select()
      .from(uuidValidationCache)
      .where(eq(uuidValidationCache.grudgeUuid, grudgeUuid));
    return cache || undefined;
  }

  async updateUuidValidation(grudgeUuid: string, updates: Partial<InsertUuidValidationCache>): Promise<UuidValidationCache> {
    const [updated] = await db
      .update(uuidValidationCache)
      .set({
        ...updates,
        updatedAt: Date.now(),
      })
      .where(eq(uuidValidationCache.grudgeUuid, grudgeUuid))
      .returning();
    
    if (!updated) {
      throw new Error(`UUID validation cache not found: ${grudgeUuid}`);
    }
    return updated;
  }

  async getAccountUuids(
    accountId: string, 
    state?: 'ACTIVE' | 'ARCHIVED' | 'CONSUMED' | 'DESTROYED'
  ): Promise<UuidValidationCache[]> {
    if (state) {
      return await db
        .select()
        .from(uuidValidationCache)
        .where(and(
          eq(uuidValidationCache.currentAccountId, accountId),
          eq(uuidValidationCache.currentState, state)
        ))
        .orderBy(desc(uuidValidationCache.updatedAt));
    }
    
    return await db
      .select()
      .from(uuidValidationCache)
      .where(eq(uuidValidationCache.currentAccountId, accountId))
      .orderBy(desc(uuidValidationCache.updatedAt));
  }
  // ============================================
  // PLAYER BLOCKS & WORLD ZONES
  // ============================================

  async getPlayerBlock(accountId: string) {
    const { playerBlocks } = await import("@shared/schema");
    const [block] = await db.select().from(playerBlocks).where(eq(playerBlocks.accountId, accountId));
    return block || undefined;
  }

  async createPlayerBlock(data: { accountId: string; puterUserId?: string; originX: number; originY: number; homeIslandSeed: number; zones: any[] }) {
    const { playerBlocks } = await import("@shared/schema");
    const [created] = await db.insert(playerBlocks).values(data).returning();
    return created;
  }

  async updatePlayerBlockZones(accountId: string, zones: any[]) {
    const { playerBlocks } = await import("@shared/schema");
    const [updated] = await db
      .update(playerBlocks)
      .set({ zones, updatedAt: Date.now() })
      .where(eq(playerBlocks.accountId, accountId))
      .returning();
    return updated;
  }

  async getAllPlayerBlockOrigins(): Promise<{ x: number; y: number }[]> {
    const { playerBlocks } = await import("@shared/schema");
    const blocks = await db.select({ originX: playerBlocks.originX, originY: playerBlocks.originY }).from(playerBlocks);
    return blocks.map(b => ({ x: b.originX, y: b.originY }));
  }

  async getWorldZone(zoneX: number, zoneY: number) {
    const { worldZones } = await import("@shared/schema");
    const [zone] = await db.select().from(worldZones).where(
      and(eq(worldZones.zoneX, zoneX), eq(worldZones.zoneY, zoneY))
    );
    return zone || undefined;
  }

  async upsertWorldZone(data: { zoneX: number; zoneY: number; type: string; islandSeed?: number; ownerId?: string; playerBlockId?: string; difficulty?: number; expiresAt?: number; lootTheme?: string; state?: any }) {
    const { worldZones } = await import("@shared/schema");
    const existing = await this.getWorldZone(data.zoneX, data.zoneY);
    if (existing) {
      const [updated] = await db.update(worldZones).set({ ...data, updatedAt: Date.now() }).where(eq(worldZones.id, existing.id)).returning();
      return updated;
    }
    const [created] = await db.insert(worldZones).values(data as any).returning();
    return created;
  }

  async captureWorldZone(zoneX: number, zoneY: number, accountId: string) {
    const { worldZones } = await import("@shared/schema");
    const [updated] = await db
      .update(worldZones)
      .set({ ownerId: accountId, updatedAt: Date.now() })
      .where(and(eq(worldZones.zoneX, zoneX), eq(worldZones.zoneY, zoneY)))
      .returning();
    return updated;
  }

  // ============================================
  // CHARACTER NFTs
  // ============================================

  async getCharacterNFT(characterId: string) {
    const { characterNFTs } = await import("@shared/schema");
    const [nft] = await db.select().from(characterNFTs).where(eq(characterNFTs.characterId, characterId));
    return nft || undefined;
  }

  async createCharacterNFT(data: { characterId: string; accountId: string; status?: string; mintAddress?: string; crossmintActionId?: string; ownerWalletAddress?: string; isCompressed?: boolean; metadataUri?: string; imageUri?: string }) {
    const { characterNFTs } = await import("@shared/schema");
    const [created] = await db.insert(characterNFTs).values(data as any).onConflictDoNothing().returning();
    return created;
  }

  async updateCharacterNFT(characterId: string, updates: { status?: string; mintAddress?: string; assetId?: string; crossmintActionId?: string; metadataUri?: string; imageUri?: string; mintedAt?: number }) {
    const { characterNFTs } = await import("@shared/schema");
    const [updated] = await db
      .update(characterNFTs)
      .set({ ...updates, updatedAt: Date.now() })
      .where(eq(characterNFTs.characterId, characterId))
      .returning();
    return updated;
  }

  // ============================================
  // ISLAND NFTs
  // ============================================

  async getIslandNFT(islandId: string) {
    const { islandNFTs } = await import("@shared/schema");
    const [nft] = await db.select().from(islandNFTs).where(eq(islandNFTs.islandId, islandId));
    return nft || undefined;
  }

  async createIslandNFT(data: { islandId: string; accountId: string; status?: string; mintAddress?: string; crossmintActionId?: string; ownerWalletAddress?: string; isCompressed?: boolean; metadataUri?: string; imageUri?: string }) {
    const { islandNFTs } = await import("@shared/schema");
    const [created] = await db.insert(islandNFTs).values(data as any).onConflictDoNothing().returning();
    return created;
  }

  async updateIslandNFT(islandId: string, updates: { status?: string; mintAddress?: string; assetId?: string; crossmintActionId?: string; metadataUri?: string; imageUri?: string; mintedAt?: number }) {
    const { islandNFTs } = await import("@shared/schema");
    const [updated] = await db
      .update(islandNFTs)
      .set({ ...updates, updatedAt: Date.now() })
      .where(eq(islandNFTs.islandId, islandId))
      .returning();
    return updated;
  }
}

export const storage = new DatabaseStorage();
