import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, jsonb, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ============================================
// USERS / GRUDGE ACCOUNTS - Central account system for all GRUDGE apps
// ============================================
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email"),
  displayName: text("display_name"),
  puterId: text("puter_id"),
  avatarUrl: text("avatar_url"),
  isPremium: boolean("is_premium").notNull().default(false),
  premiumUntil: timestamp("premium_until"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  lastLoginAt: timestamp("last_login_at"),
  settings: jsonb("settings").default(sql`'{}'::jsonb`),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  displayName: true,
  puterId: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Aliases for future naming
export const grudgeAccounts = users;
export const insertGrudgeAccountSchema = insertUserSchema;
export type InsertGrudgeAccount = InsertUser;
export type GrudgeAccount = User;

// ============================================
// CHARACTERS - Player characters for crafting game
// ============================================
export const characters = pgTable("characters", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  name: text("name").notNull(),
  profession: text("profession").notNull(),
  level: integer("level").notNull().default(1),
  experience: integer("experience").notNull().default(0),
  gold: integer("gold").notNull().default(1000),
  skillPoints: integer("skill_points").notNull().default(5),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const insertCharacterSchema = createInsertSchema(characters).omit({
  id: true,
  createdAt: true,
});

export type InsertCharacter = z.infer<typeof insertCharacterSchema>;
export type Character = typeof characters.$inferSelect;

// ============================================
// ISLANDS - Future expansion for island building
// ============================================
export const islands = pgTable("islands", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  islandType: text("island_type").notNull().default("starter"),
  level: integer("level").notNull().default(1),
  data: jsonb("data").default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const insertIslandSchema = createInsertSchema(islands).omit({
  id: true,
  createdAt: true,
});

export type InsertIsland = z.infer<typeof insertIslandSchema>;
export type Island = typeof islands.$inferSelect;

// ============================================
// BATTLE HISTORY - Combat records
// ============================================
export const battleHistory = pgTable("battle_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  characterId: varchar("character_id").references(() => characters.id),
  battleType: text("battle_type").notNull(),
  outcome: text("outcome").notNull(),
  rewards: jsonb("rewards").default(sql`'{}'::jsonb`),
  data: jsonb("data").default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const insertBattleHistorySchema = createInsertSchema(battleHistory).omit({
  id: true,
  createdAt: true,
});

export type InsertBattleHistory = z.infer<typeof insertBattleHistorySchema>;
export type BattleHistory = typeof battleHistory.$inferSelect;

// ============================================
// ACCOUNT ASSETS - Shared assets across games
// ============================================
export const accountAssets = pgTable("account_assets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  assetType: text("asset_type").notNull(),
  assetId: text("asset_id").notNull(),
  quantity: integer("quantity").notNull().default(1),
  metadata: jsonb("metadata").default(sql`'{}'::jsonb`),
  acquiredAt: timestamp("acquired_at").notNull().default(sql`now()`),
});

export const insertAccountAssetSchema = createInsertSchema(accountAssets).omit({
  id: true,
  acquiredAt: true,
});

export type InsertAccountAsset = z.infer<typeof insertAccountAssetSchema>;
export type AccountAsset = typeof accountAssets.$inferSelect;

// ============================================
// CHARACTER PROGRESSION TABLES
// ============================================

export const unlockedSkills = pgTable("unlocked_skills", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  characterId: varchar("character_id").notNull().references(() => characters.id, { onDelete: "cascade" }),
  nodeId: text("node_id").notNull(),
  profession: text("profession").notNull(),
  unlockedAt: timestamp("unlocked_at").notNull().default(sql`now()`),
});

export const insertUnlockedSkillSchema = createInsertSchema(unlockedSkills).omit({
  id: true,
  unlockedAt: true,
});

export type InsertUnlockedSkill = z.infer<typeof insertUnlockedSkillSchema>;
export type UnlockedSkill = typeof unlockedSkills.$inferSelect;

export const inventoryItems = pgTable("inventory_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  characterId: varchar("character_id").notNull().references(() => characters.id, { onDelete: "cascade" }),
  itemType: text("item_type").notNull(),
  itemName: text("item_name").notNull(),
  quantity: integer("quantity").notNull().default(0),
});

export const insertInventoryItemSchema = createInsertSchema(inventoryItems).omit({
  id: true,
});

export type InsertInventoryItem = z.infer<typeof insertInventoryItemSchema>;
export type InventoryItem = typeof inventoryItems.$inferSelect;

export const craftedItems = pgTable("crafted_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  characterId: varchar("character_id").notNull().references(() => characters.id, { onDelete: "cascade" }),
  itemType: text("item_type").notNull(),
  itemName: text("item_name").notNull(),
  profession: text("profession").notNull(),
  tier: integer("tier").notNull().default(1),
  equipped: boolean("equipped").notNull().default(false),
  infusions: jsonb("infusions").default(sql`'{}'::jsonb`),
  craftedAt: timestamp("crafted_at").notNull().default(sql`now()`),
});

export const insertCraftedItemSchema = createInsertSchema(craftedItems).omit({
  id: true,
  craftedAt: true,
});

export type InsertCraftedItem = z.infer<typeof insertCraftedItemSchema>;
export type CraftedItem = typeof craftedItems.$inferSelect;

export const unlockedRecipes = pgTable("unlocked_recipes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  characterId: varchar("character_id").notNull().references(() => characters.id, { onDelete: "cascade" }),
  recipeId: text("recipe_id").notNull(),
  unlockedAt: timestamp("unlocked_at").notNull().default(sql`now()`),
});

export const insertUnlockedRecipeSchema = createInsertSchema(unlockedRecipes).omit({
  id: true,
  unlockedAt: true,
});

export type InsertUnlockedRecipe = z.infer<typeof insertUnlockedRecipeSchema>;
export type UnlockedRecipe = typeof unlockedRecipes.$inferSelect;

export const shopTransactions = pgTable("shop_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  characterId: varchar("character_id").notNull().references(() => characters.id, { onDelete: "cascade" }),
  transactionType: text("transaction_type").notNull(),
  itemCategory: text("item_category").notNull(),
  itemId: text("item_id").notNull(),
  itemName: text("item_name").notNull(),
  quantity: integer("quantity").notNull().default(1),
  unitPrice: integer("unit_price").notNull(),
  totalPrice: integer("total_price").notNull(),
  tier: integer("tier"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const insertShopTransactionSchema = createInsertSchema(shopTransactions).omit({
  id: true,
  createdAt: true,
});

export type InsertShopTransaction = z.infer<typeof insertShopTransactionSchema>;
export type ShopTransaction = typeof shopTransactions.$inferSelect;

// ============================================
// ART ASSETS TABLE
// ============================================
export const artAssets = pgTable("art_assets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  slug: text("slug").notNull().unique(),
  category: text("category").notNull(),
  subtype: text("subtype"),
  filePath: text("file_path").notNull(),
  variant: text("variant"),
  metadata: jsonb("metadata").default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const insertArtAssetSchema = createInsertSchema(artAssets).omit({
  id: true,
  createdAt: true,
});

export type InsertArtAsset = z.infer<typeof insertArtAssetSchema>;
export type ArtAsset = typeof artAssets.$inferSelect;

// ============================================
// RELATIONS
// ============================================
export const usersRelations = relations(users, ({ many }) => ({
  characters: many(characters),
  islands: many(islands),
  battleHistory: many(battleHistory),
  accountAssets: many(accountAssets),
}));

export const charactersRelations = relations(characters, ({ one, many }) => ({
  user: one(users, {
    fields: [characters.userId],
    references: [users.id],
  }),
  unlockedSkills: many(unlockedSkills),
  inventoryItems: many(inventoryItems),
  craftedItems: many(craftedItems),
  unlockedRecipes: many(unlockedRecipes),
  shopTransactions: many(shopTransactions),
}));

export const islandsRelations = relations(islands, ({ one }) => ({
  user: one(users, {
    fields: [islands.userId],
    references: [users.id],
  }),
}));

export const battleHistoryRelations = relations(battleHistory, ({ one }) => ({
  user: one(users, {
    fields: [battleHistory.userId],
    references: [users.id],
  }),
  character: one(characters, {
    fields: [battleHistory.characterId],
    references: [characters.id],
  }),
}));

export const accountAssetsRelations = relations(accountAssets, ({ one }) => ({
  user: one(users, {
    fields: [accountAssets.userId],
    references: [users.id],
  }),
}));

export const unlockedSkillsRelations = relations(unlockedSkills, ({ one }) => ({
  character: one(characters, {
    fields: [unlockedSkills.characterId],
    references: [characters.id],
  }),
}));

export const inventoryItemsRelations = relations(inventoryItems, ({ one }) => ({
  character: one(characters, {
    fields: [inventoryItems.characterId],
    references: [characters.id],
  }),
}));

export const craftedItemsRelations = relations(craftedItems, ({ one }) => ({
  character: one(characters, {
    fields: [craftedItems.characterId],
    references: [characters.id],
  }),
}));

export const unlockedRecipesRelations = relations(unlockedRecipes, ({ one }) => ({
  character: one(characters, {
    fields: [unlockedRecipes.characterId],
    references: [characters.id],
  }),
}));

export const shopTransactionsRelations = relations(shopTransactions, ({ one }) => ({
  character: one(characters, {
    fields: [shopTransactions.characterId],
    references: [characters.id],
  }),
}));

// Legacy alias for backward compatibility
export const grudgeAccountsRelations = usersRelations;
