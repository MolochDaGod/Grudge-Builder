/**
 * NEW ROUTES FOR PHASE 1 CHARACTER CREATOR
 *
 * Add these routes to server/routes.ts after the existing island routes
 * These enable 6-step character creation with deterministic island generation and rerolling
 */

import { generateIslandState } from './islandGeneration';

/**
 * POST /api/characters/:id/generate-island
 * Generate a deterministic island for a character using character ID as seed
 * Creates home island if it doesn't exist, stores in homeIslands table
 * Returns full IslandState for preview in step 5
 */
export function registerCharacterIslandRoute(app: any, storage: any, db: any) {
  app.post("/api/characters/:id/generate-island", async (req: any, res: any) => {
    try {
      const userId = extractUserId(req);
      const characterId = req.params.id;

      // Get character
      const character = await storage.getCharacter(characterId);
      if (!character) {
        return res.status(404).json({ error: "Character not found" });
      }

      // Verify user owns character
      if (character.userId !== userId) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      // Get or create home island
      let island = await storage.getHomeIslandByCharacterId(characterId);

      if (!island) {
        // Create new home island with seed = character ID (deterministic)
        island = await storage.createHomeIsland({
          accountId: character.accountId,
          seed: characterId, // Use character ID as seed for determinism
          name: `${character.name}'s Home Island`,
          mapStyle: 'fantasy'
        });
      }

      // Generate island state from seed (deterministic - same seed = same structure)
      const islandState = generateIslandState(island.seed);

      // Update island with generated state
      await storage.updateHomeIsland(island.id, {
        state: islandState,
        mapStyle: islandState.mapStyle
      });

      // Return full island state for client preview
      res.json(islandState);
    } catch (error) {
      console.error("Error generating island:", error);
      res.status(500).json({ error: "Failed to generate island" });
    }
  });
}

/**
 * POST /api/islands/:id/regenerate
 * Reroll an island with a new deterministic seed
 * Used in step 6 to let users find different island configurations
 * Does NOT mint cNFT (ephemeral) - cNFT only mints on "Find Land" commitment
 */
export function registerIslandRegenerateRoute(app: any, storage: any) {
  app.post("/api/islands/:id/regenerate", async (req: any, res: any) => {
    try {
      const userId = extractUserId(req);
      const islandId = req.params.id;

      // Get island
      const island = await storage.getHomeIsland(islandId);
      if (!island) {
        return res.status(404).json({ error: "Island not found" });
      }

      // Verify user owns island (via account)
      const account = await storage.getAccount(island.accountId);
      if (!account || account.userId !== userId) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      // Generate new seed (timestamp-based or UUID)
      const newSeed = `${islandId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Generate NEW island state with new seed (different structure)
      const newIslandState = generateIslandState(newSeed);

      // Update island with new seed and state
      await storage.updateHomeIsland(island.id, {
        seed: newSeed,
        state: newIslandState,
        mapStyle: newIslandState.mapStyle
      });

      // Return new island state for client
      res.json(newIslandState);
    } catch (error) {
      console.error("Error regenerating island:", error);
      res.status(500).json({ error: "Failed to regenerate island" });
    }
  });
}

/**
 * ENHANCE: POST /api/characters
 * Modify existing character creation endpoint to:
 * 1. Accept spriteConfig from request
 * 2. Store spriteConfig in characters.spriteConfig
 * 3. Handle cNFT minting for avatar (existing)
 * 4. Store cnftId and cnftAddress in characters table
 *
 * Change in existing POST /api/characters handler:
 *
 * Before res.json(character) at line 326:
 *
 * // Store sprite configuration if provided
 * if (req.body.spriteConfig) {
 *   const updatedChar = await storage.updateCharacter(character.id, {
 *     spriteConfig: req.body.spriteConfig
 *   });
 *   character = updatedChar;
 * }
 *
 * // If minting is enabled and cNFT is created, store IDs
 * // This assumes Crossmint integration already exists
 * // Store the response: { cnftId, cnftAddress } from crossmint.mintCharacterCNFT()
 */

/**
 * ENHANCE: POST /api/island/initialize
 * Modify existing island initialization to:
 * 1. Accept islandState in request body
 * 2. Validate island assets before minting
 * 3. Mint island cNFT and store cnftId/cnftAddress
 * 4. Set validatedAt timestamp to lock island (make it persistent)
 *
 * Key changes to existing code (around line 949):
 *
 * // Get island state from request or from home island
 * const islandState = req.body.islandState || island.state;
 *
 * // Import and call validation
 * import { validateIslandAssets } from './islandGeneration';
 * const validation = validateIslandAssets(islandState);
 * if (!validation.valid) {
 *   return res.status(400).json({
 *     error: "Island validation failed",
 *     errors: validation.errors
 *   });
 * }
 *
 * // Mint island cNFT
 * const mintResult = await crossmint.mintIslandCNFT(account, island);
 *
 * // Update island with cNFT info and validated timestamp
 * const updated = await storage.updateHomeIsland(island.id, {
 *   cnftId: mintResult.tokenId,
 *   cnftAddress: mintResult.contractAddress,
 *   validatedAt: Date.now(),
 *   state: islandState
 * });
 *
 * // Update character to point to this island (if not already)
 * const character = await storage.getCharacter(req.body.characterId);
 * if (character && !character.homeIslandId) {
 *   await storage.updateCharacter(character.id, {
 *     homeIslandId: island.id
 *   });
 * }
 */

/**
 * Storage/Database Helper Functions Needed
 *
 * Add these to server/storage.ts:
 *
 * async getHomeIslandByCharacterId(characterId: string) {
 *   return db.query.homeIslands.findFirst({
 *     where: eq(homeIslands.characterId, characterId)
 *   });
 * }
 *
 * async createHomeIsland(data: { accountId: string; seed: string; name: string; mapStyle: string }) {
 *   return db.insert(homeIslands).values(data).returning().get();
 * }
 *
 * async updateHomeIsland(islandId: string, updates: any) {
 *   return db.update(homeIslands)
 *     .set(updates)
 *     .where(eq(homeIslands.id, islandId))
 *     .returning()
 *     .get();
 * }
 */
