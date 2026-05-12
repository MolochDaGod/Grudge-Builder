/**
 * CODE ADDITIONS FOR server/routes.ts
 *
 * Copy these exact code blocks into server/routes.ts
 * Add them after the existing island routes (around line 1000+)
 */

// ════════════════════════════════════════════════════════════════════════════════
// IMPORT AT TOP OF routes.ts (line 1 area):
// ════════════════════════════════════════════════════════════════════════════════

import { generateIslandState, validateIslandAssets } from "./islandGeneration";

// ════════════════════════════════════════════════════════════════════════════════
// NEW ROUTE 1: POST /api/characters/:id/generate-island
// Add after existing character routes (around line 550+)
// ════════════════════════════════════════════════════════════════════════════════

app.post("/api/characters/:id/generate-island", async (req: any, res: any) => {
  try {
    const userId = extractUserId(req);
    const characterId = req.params.id;

    // Get character to verify ownership
    const character = await storage.getCharacter(characterId);
    if (!character) {
      return res.status(404).json({ error: "Character not found" });
    }

    // Verify user owns this character
    if (character.userId !== userId && character.accountId) {
      const account = await storage.getAccount(character.accountId);
      if (!account || account.userId !== userId) {
        return res.status(403).json({ error: "Unauthorized" });
      }
    }

    // Get or create home island for this character
    let island = await storage.getHomeIsland(character.homeIslandId) || null;

    if (!island) {
      // Create new home island with character ID as seed (deterministic)
      const createdIsland = await db
        .insert(homeIslands)
        .values({
          accountId: character.accountId,
          characterId: characterId,
          seed: characterId, // Use character ID as seed for determinism
          name: `${character.name}'s Home Island`,
          mapStyle: "fantasy"
        })
        .returning()
        .get();
      island = createdIsland;
    }

    // Generate island state from seed (deterministic - same seed = same structure)
    const islandState = generateIslandState(island.seed);

    // Update island with generated state
    await db
      .update(homeIslands)
      .set({
        state: islandState,
        mapStyle: islandState.mapStyle
      })
      .where(eq(homeIslands.id, island.id));

    // Return full island state for client preview
    res.json(islandState);
  } catch (error) {
    console.error("Error generating island:", error);
    res.status(500).json({ error: "Failed to generate island" });
  }
});

// ════════════════════════════════════════════════════════════════════════════════
// NEW ROUTE 2: POST /api/islands/:id/regenerate
// Add after the new POST /api/characters/:id/generate-island route
// ════════════════════════════════════════════════════════════════════════════════

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
    if (island.accountId) {
      const account = await storage.getAccount(island.accountId);
      if (!account || account.userId !== userId) {
        return res.status(403).json({ error: "Unauthorized" });
      }
    }

    // Generate new seed (timestamp-based with randomness)
    // This ensures same island can be rerolled many times with different results
    const newSeed = `${islandId}-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 11)}`;

    // Generate NEW island state with new seed (different structure)
    const newIslandState = generateIslandState(newSeed);

    // Update island with new seed and state
    await db
      .update(homeIslands)
      .set({
        seed: newSeed,
        state: newIslandState,
        mapStyle: newIslandState.mapStyle
      })
      .where(eq(homeIslands.id, island.id));

    // Return new island state for client
    res.json(newIslandState);
  } catch (error) {
    console.error("Error regenerating island:", error);
    res.status(500).json({ error: "Failed to regenerate island" });
  }
});

// ════════════════════════════════════════════════════════════════════════════════
// ENHANCEMENT 1: Modify existing POST /api/characters (around line 260)
// After the line: res.json(character); (line ~326)
// ════════════════════════════════════════════════════════════════════════════════

// ADD THIS BEFORE res.json(character):

// Store sprite configuration if provided
let finalCharacter = character;
if (req.body.spriteConfig) {
  finalCharacter = await storage.updateCharacter(character.id, {
    spriteConfig: req.body.spriteConfig
  } as any);
}

// If character was minted as cNFT and IDs returned, store them
// This assumes Crossmint integration already exists and returns { tokenId, contractAddress }
if (req.body.cnftId || req.body.cnftAddress) {
  finalCharacter = await storage.updateCharacter(finalCharacter.id, {
    cnftId: req.body.cnftId,
    cnftAddress: req.body.cnftAddress
  } as any);
}

res.json(finalCharacter);

// ════════════════════════════════════════════════════════════════════════════════
// ENHANCEMENT 2: Modify existing POST /api/island/initialize (around line 949)
// Add island state validation and cNFT minting
// ════════════════════════════════════════════════════════════════════════════════

// Replace the section starting at line 949 (app.post("/api/island/initialize")) with:

app.post("/api/island/initialize", async (req: any, res: any) => {
  try {
    const userId = extractUserId(req);
    const account = await storage.getOrCreateAccountForUser(userId);

    // Get island state from request or from home island
    const islandState = req.body.islandState || (await storage.getHomeIsland(account.id))?.state;
    if (!islandState) {
      return res.status(400).json({ error: "Island state not found" });
    }

    // Validate island assets before committing
    const validation = validateIslandAssets(islandState);
    if (!validation.valid) {
      return res.status(400).json({
        error: "Island validation failed",
        errors: validation.errors
      });
    }

    // Get or create the home island
    let island = await storage.getHomeIsland(account.id);
    if (!island) {
      island = await db
        .insert(homeIslands)
        .values({
          accountId: account.id,
          seed: islandState.id || `${account.id}-${Date.now()}`,
          name: "Home Island",
          mapStyle: islandState.mapStyle || "fantasy",
          state: islandState
        })
        .returning()
        .get();
    } else {
      // Update existing island with committed state
      island = await db
        .update(homeIslands)
        .set({
          state: islandState,
          mapStyle: islandState.mapStyle
        })
        .where(eq(homeIslands.id, island.id))
        .returning()
        .get();
    }

    // Mint island as cNFT to server wallet (assumes Crossmint integration exists)
    let mintResult = null;
    try {
      mintResult = await crossmint.mintIslandCNFT(account, island);

      // Record cNFT mint in database
      if (mintResult) {
        island = await db
          .update(homeIslands)
          .set({
            cnftId: mintResult.tokenId,
            cnftAddress: mintResult.contractAddress,
            validatedAt: Date.now()
          })
          .where(eq(homeIslands.id, island.id))
          .returning()
          .get();

        // Record in islandNFTs table (existing)
        await db.insert(islandNFTs).values({
          islandId: island.id,
          nftId: mintResult.tokenId,
          contractAddress: mintResult.contractAddress,
          ownerAddress: account.walletAddress || "server"
        });
      }
    } catch (mintErr) {
      console.warn("Island cNFT mint failed but proceeding:", mintErr);
      // Continue without minting - island is still created
    }

    // Link character to island if characterId provided
    if (req.body.characterId) {
      const character = await storage.getCharacter(req.body.characterId);
      if (character && character.userId === userId && !character.homeIslandId) {
        await storage.updateCharacter(character.id, {
          homeIslandId: island.id
        } as any);
      }
    }

    // Mark account as having initialized island
    await storage.updateAccount(account.id, {
      homeIslandId: island.id
    } as any);

    // Return success response
    res.json({
      success: true,
      islandId: island.id,
      characterId: req.body.characterId,
      cnftId: island.cnftId,
      cnftAddress: island.cnftAddress,
      launchUrl: `/rts-grudge?character=${req.body.characterId}&island=${island.id}`
    });
  } catch (error) {
    console.error("Error initializing island:", error);
    res.status(500).json({ error: "Failed to initialize island" });
  }
});

// ════════════════════════════════════════════════════════════════════════════════
// HELPER: Add homeIslands import at top of routes.ts (if not already present)
// ════════════════════════════════════════════════════════════════════════════════

import { homeIslands, islandNFTs } from "@shared/schema";

// ════════════════════════════════════════════════════════════════════════════════
// DATABASE SCHEMA: Ensure homeIslands table has these columns (migrations needed)
// ════════════════════════════════════════════════════════════════════════════════

/**
 * ALTER TABLE homeIslands ADD COLUMN IF NOT EXISTS characterId VARCHAR;
 * ALTER TABLE homeIslands ADD COLUMN IF NOT EXISTS seed TEXT NOT NULL DEFAULT uuid_generate_v4()::text;
 * ALTER TABLE homeIslands ADD COLUMN IF NOT EXISTS cnftId TEXT;
 * ALTER TABLE homeIslands ADD COLUMN IF NOT EXISTS cnftAddress TEXT;
 * ALTER TABLE homeIslands ADD COLUMN IF NOT EXISTS validatedAt BIGINT;
 */
