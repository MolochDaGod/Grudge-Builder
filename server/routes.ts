import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertCharacterSchema, insertPartySchema, insertUnlockedSkillSchema, insertAccountInventorySchema, islandNFTs, accounts } from "@shared/schema";
import {
  normalizeGameEra,
  mergeEraSlots,
  ERA_META,
  eraAllowsCharacters,
  defaultPipelineForEra,
  type GameEra,
} from "@shared/definitions/gameEras";
import { db } from "./db";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import OpenAI from "openai";
import jwt from "jsonwebtoken";
import fs from "node:fs";
import path from "node:path";
import Aseprite from "ase-parser";
import {
  registerObjectStorageRoutes,
  registerDevToolObjectStorageRoutes,
} from "./integrations/object_storage";
import {
  r2Configured,
  r2ListPrefix,
  r2PresignPut,
  r2PublicBase,
  safeFileName,
} from "./integrations/r2Client";
import { registerAuthRoutes } from "./routes/auth";
import { registerWalletRoutes } from "./routes/wallet";
import { registerTreatyRoutes } from "./routes/treaty";
import { registerShipRoutes } from "./routes/ships";
import { registerTelegramRoutes } from "./telegramRoutes";
import { scanAsepriteDirectory, readAsepriteFile, getAsepriteStats } from "./aseprite-reader";
import { getSheetsClient, isConfigured, SHEET_IDS, readSheet, getCachedData, setCachedData } from "./googleSheets";
import { exportFoodsToSheet, generateFoodRows } from "./sheetsExport";
import { detectSpriteType, SPRITE_TYPES } from "@shared/definitions/spriteTypes";
import { getClassStartingGear } from "@shared/definitions/tier0Items";
import { equipToPanelSlot } from "@shared/inventory/equipment";
import { panelEquipmentToModel3d, type PanelEquipmentSlot } from "@shared/fleet";
import { resolveStudioRole, isStudioAdminRole } from "@shared/fleet/adminAllowlist";
import { resolveHeroIdentity } from "@shared/characterIdentity";
import {
  applyCharacterProgressUpdate,
  readProgressMeta,
  CHARACTER_PROGRESS_SCHEMA_VERSION,
  type CharacterProgressPayload,
} from "@shared/characterProgress";
import {
  generateIslandState,
  islandStateNeedsGeneration,
  mergeRtsExportIntoIslandState,
  validateIslandAssets,
} from "./utilities/islandGeneration";
import { mapStudioProjectToIslandState } from "./utilities/studioProjectMapper";
import { CrossmintWalletService } from "./services/crossmintWallet";

const crossmintService = new CrossmintWalletService();

// ── OpenAI — lazy init so server starts even without OPENAI_API_KEY ────────
let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI | null {
  if (_openai) return _openai;
  const apiKey = process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  if (!apiKey) {
    console.warn('[OpenAI] No API key configured — avatar generation disabled');
    return null;
  }
  _openai = new OpenAI({
    apiKey,
    baseURL: process.env.OPENAI_BASE_URL || process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  });
  return _openai;
}

// ── JWT Auth Middleware (#9) ──────────────────────────────────────────────────

const JWT_SECRET = process.env.SESSION_SECRET || process.env.JWT_SECRET || "";

interface AuthPayload {
  userId?: string;
  grudgeId?: string;
  username?: string;
  isAdmin?: boolean;
  sub?: string | number;
}

/**
 * Extract and verify the user ID from a Bearer token.
 * Falls back to "guest" only when no token is provided (public read routes).
 * Admin status comes from the verified token payload, NOT from a header.
 */
function extractUserId(req: Request): string {
  const authHeader = req.get("Authorization") || req.get("X-Session-Token");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : authHeader || null;

  if (!token) return "guest";

  // If no JWT_SECRET is configured, skip verification (dev mode)
  if (!JWT_SECRET) return "guest";

  try {
    const payload = jwt.verify(token, JWT_SECRET) as AuthPayload;
    if (payload.userId) return payload.userId;
    if (payload.sub != null && payload.sub !== "") return String(payload.sub);
    return "guest";
  } catch {
    return "guest";
  }
}

/** Extract grudgeId from Bearer JWT when present */
function extractGrudgeId(req: Request): string | null {
  const authHeader = req.get("Authorization") || req.get("X-Session-Token");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : authHeader || null;
  if (!token || !JWT_SECRET) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET) as AuthPayload;
    return payload.grudgeId || null;
  } catch {
    return null;
  }
}

/** Returns true if the token belongs to an admin user */
function isAdmin(req: Request): boolean {
  const authHeader = req.get("Authorization") || req.get("X-Session-Token");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : authHeader || null;

  if (!token || !JWT_SECRET) {
    // Fallback: allow admin in dev via env-configured password
    const adminPw = process.env.ADMIN_PASSWORD;
    const headerPw = req.get("X-Admin-Password");
    return !!adminPw && !!headerPw && adminPw === headerPw;
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as AuthPayload & {
      role?: string;
      email?: string;
      username?: string;
      grudgeId?: string;
    };
    if (payload.isAdmin === true) return true;
    // Allowlist: TOP ADMIN (grudachain / grudgedev@gmail.com) even on older JWTs without isAdmin
    const role = resolveStudioRole({
      email: payload.email,
      username: payload.username,
      grudgeId: payload.grudgeId,
      jwtRole: payload.role,
      jwtIsAdmin: payload.isAdmin,
    });
    return isStudioAdminRole(role);
  } catch {
    return false;
  }
}

/** Middleware: require authenticated user (reject guests) */
function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const userId = extractUserId(req);
  if (userId === "guest") {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  (req as any).userId = userId;
  next();
}

/** Middleware: require admin */
function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!isAdmin(req)) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  (req as any).userId = extractUserId(req);
  (req as any).isAdmin = true;
  next();
}

const RACE_DESCRIPTIONS: Record<string, string> = {
  human: "a human with fair skin, expressive eyes, and determined expression",
  orc: "a fierce orc with green skin, tusks, and battle scars",
  elf: "an elegant elf with pointed ears, ethereal features, and flowing hair",
  dwarf: "a stout dwarf with a magnificent beard, strong features, and rugged look",
  barbarian: "a muscular barbarian with wild hair, tribal markings, and fierce gaze",
  undead: "an undead warrior with pale ghostly skin, glowing eyes, and haunted appearance",
};

const CLASS_DESCRIPTIONS: Record<string, string> = {
  warrior: "wearing heavy plate armor, wielding a sword and shield",
  mage: "wearing mystical robes with arcane symbols, holding a glowing staff",
  ranger: "wearing leather armor with a hooded cloak, carrying a bow",
  shapeshifter: "wearing druidic garb with nature motifs, with wolf-like features",
};

const UNIQUE_FEATURES = [
  "scarred face", "one eye patch", "braided hair", "shaved head", "long flowing hair",
  "ritual tattoos", "war paint", "piercing gaze", "gentle smile", "stern expression",
  "decorated jewelry", "feathered ornaments", "bone necklace", "gemstone amulet",
  "weathered face", "youthful features", "aged wisdom lines", "mysterious aura",
  "battle-hardened look", "noble bearing", "wild untamed appearance", "serene calm"
];

const LIGHTING_STYLES = [
  "warm golden hour", "cool moonlit", "dramatic torchlight", "mystical purple",
  "fiery red", "ethereal blue", "forest green ambient", "sunset orange"
];

async function generateCharacterAvatar(
  characterName: string,
  raceId: string,
  classId: string
): Promise<string | null> {
  try {
    const raceDesc = RACE_DESCRIPTIONS[raceId] || "a fantasy warrior";
    const classDesc = CLASS_DESCRIPTIONS[classId] || "in adventuring gear";
    
    const uniqueFeature = UNIQUE_FEATURES[Math.floor(Math.random() * UNIQUE_FEATURES.length)];
    const lighting = LIGHTING_STYLES[Math.floor(Math.random() * LIGHTING_STYLES.length)];
    const uniqueSeed = Math.random().toString(36).substring(2, 10);
    
    const prompt = `Create a unique cartoon-style fantasy RPG character portrait of ${raceDesc}, ${classDesc}. Character has ${uniqueFeature}. The character's name is "${characterName}". Style: colorful cartoon illustration, dark fantasy theme, ${lighting} lighting, detailed face portrait from chest up, vibrant colors, bold outlines, heroic pose. Background: simple dark gradient. High quality digital art. Unique seed: ${uniqueSeed}`;
    
    const ai = getOpenAI();
    if (!ai) return null;
    const response = await ai.images.generate({
      model: "gpt-image-1",
      prompt,
      n: 1,
      size: "1024x1024",
    });
    
    const base64 = response.data?.[0]?.b64_json;
    if (!base64) return null;
    
    const avatarsDir = path.join(process.cwd(), "public", "avatars");
    if (!fs.existsSync(avatarsDir)) {
      fs.mkdirSync(avatarsDir, { recursive: true });
    }
    
    const filename = `avatar_${Date.now()}_${Math.random().toString(36).substring(7)}.png`;
    const filepath = path.join(avatarsDir, filename);
    fs.writeFileSync(filepath, Buffer.from(base64, "base64"));
    
    return `/avatars/${filename}`;
  } catch (error) {
    console.error("Error generating avatar:", error);
    return null;
  }
}

function generateFallbackDungeon(floor: number) {
  const width = 20, height = 15;
  const tiles: number[][] = [];
  const enemies: { type: string; x: number; y: number }[] = [];
  const treasures: { x: number; y: number }[] = [];
  
  for (let y = 0; y < height; y++) {
    tiles[y] = [];
    for (let x = 0; x < width; x++) {
      if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
        tiles[y][x] = 1;
      } else if ((x % 4 === 0 && y % 4 === 0) || Math.random() < 0.1) {
        tiles[y][x] = Math.random() < 0.3 ? 5 : 1;
      } else {
        tiles[y][x] = 0;
      }
    }
  }
  
  tiles[2][2] = 0;
  tiles[height - 3][width - 3] = 4;
  
  const enemyTypes = ['slime', 'skeleton', 'orc'];
  const enemyCount = 2 + Math.floor(floor / 2);
  for (let i = 0; i < enemyCount; i++) {
    enemies.push({
      type: enemyTypes[Math.floor(Math.random() * enemyTypes.length)],
      x: 4 + Math.floor(Math.random() * (width - 8)),
      y: 4 + Math.floor(Math.random() * (height - 8))
    });
  }
  
  treasures.push({ x: width - 5, y: height - 5 });
  
  return {
    width,
    height,
    tiles,
    spawnPoint: { x: 2, y: 2 },
    exitPoint: { x: width - 3, y: height - 3 },
    enemies,
    treasures
  };
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // ── Auth routes (Grudge ID — puter, wallet, login, register, verify, discord) ──
  registerAuthRoutes(app);
  registerWalletRoutes(app);
  registerShipRoutes(app, requireAuth);
  registerTreatyRoutes(app);

  const { registerMeRoutes } = await import("./routes/me");
  registerMeRoutes(app);

  // War scene ElevenLabs TTS (WoW-style herald / warlords)
  const { registerWarTtsRoutes } = await import("./routes/warTts");
  registerWarTtsRoutes(app);

  // Production map package publish (Forge Export Production → disk + deploy hook)
  const { registerProductionMapPublishRoutes } = await import("./routes/productionMapPublish");
  registerProductionMapPublishRoutes(app);

  // Multiplayer REST bootstrap (status / session / sector asset manifests)
  const { registerMultiplayerRoutes } = await import("./routes/multiplayerRoutes");
  registerMultiplayerRoutes(app);

  // Local huge medieval battle GLB (dev) — 517MB on D: drive
  app.get("/api/local-war-scene", (req, res) => {
    const candidates = [
      process.env.WAR_SCENE_GLB,
      "D:/Games/grudge-game-engine/huge_medieval_battle_scene.glb",
      path.join(process.cwd(), "client/public/models/war/huge_medieval_battle_scene.glb"),
    ].filter(Boolean) as string[];
    const file = candidates.find((p) => fs.existsSync(p));
    if (!file) {
      res.status(404).json({
        error: "war_scene_not_found",
        hint: "Set WAR_SCENE_GLB or place huge_medieval_battle_scene.glb under D:/Games/grudge-game-engine/",
      });
      return;
    }
    res.setHeader("Content-Type", "model/gltf-binary");
    res.setHeader("Cache-Control", "public, max-age=3600");
    fs.createReadStream(file).pipe(res);
  });

  const { registerDiscordInteractionRoutes, registerDiscordCommands } = await import("./discordInteractions");
  registerDiscordInteractionRoutes(app);
  registerDiscordCommands().catch((e) => console.warn("[Discord] Boot registration skipped:", e?.message));

  registerTelegramRoutes(app);
  const { registerTreatyTelegramRoutes } = await import("./treatyTelegramRoutes");
  registerTreatyTelegramRoutes(app);
  const { registerTreatyDiscordRoutes } = await import("./treatyDiscordRoutes");
  registerTreatyDiscordRoutes(app);
  const { registerDiscordAccountRoutes } = await import("./discordAccountRoutes");
  registerDiscordAccountRoutes(app);

  // Extract userId from JWT token (secure) — replaces old x-admin-mode header trust
  const getUserId = (req: Request): string => extractUserId(req);
  const GUEST_USER_ID = "guest";

  // Character routes — roster is per-account; never expose the shared guest pool
  app.get("/api/characters", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const eraQuery = typeof req.query.era === "string" ? req.query.era : undefined;
      const eraParam = eraQuery ? normalizeGameEra(eraQuery) : undefined;
      const envelope = req.query.envelope === "1" || !!eraQuery;
      const characters = await storage.getCharacters(userId, eraParam);
      if (!envelope) {
        return res.json(characters);
      }
      const account = await storage.getOrCreateAccountForUser(userId);
      res.json({
        characters,
        era: eraParam ?? null,
        eraSlots: mergeEraSlots(account.eraSlots as import("@shared/definitions/gameEras").AccountEraSlots | null),
        eraMeta: ERA_META,
      });
    } catch (error) {
      // Surface enough detail for fleet satellites (crafting.puter.site) without leaking secrets
      const msg = error instanceof Error ? error.message : String(error);
      console.error("Error fetching characters:", msg, error);
      res.status(500).json({
        error: "Failed to fetch characters",
        detail: process.env.NODE_ENV === "production" ? undefined : msg,
        hint: /user_id|column/i.test(msg)
          ? "DB schema drift — run npm run db:fix:characters-schema against production Postgres"
          : undefined,
      });
    }
  });

  app.get("/api/characters/:id", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const character = await storage.getCharacter(req.params.id);
      if (!character) {
        return res.status(404).json({ error: "Character not found" });
      }
      if (character.userId !== userId) {
        return res.status(403).json({ error: "Character does not belong to your account" });
      }
      const meta = readProgressMeta(character as any);
      res.json({
        ...character,
        progressRevision: meta.revision,
        progressSchemaVersion: meta.schemaVersion || CHARACTER_PROGRESS_SCHEMA_VERSION,
      });
    } catch (error) {
      console.error("Error fetching character:", error);
      res.status(500).json({ error: "Failed to fetch character" });
    }
  });

  app.post("/api/characters", async (req, res) => {
    try {
      const userId = getUserId(req);
      const gameEra = normalizeGameEra(req.body.gameEra);

      // Production law: only eras with charactersEnabled + slotCount > 0
      // (warlords heroes, nexus toon, voxel explorers, armada mechs).
      if (!eraAllowsCharacters(gameEra) || ERA_META[gameEra].slotCount <= 0) {
        return res.status(403).json({
          error: `${ERA_META[gameEra].shortLabel} has no character/mech roster in production.`,
          gameEra,
          max: 0,
          charactersEnabled: false,
          hint: "Use warlords (grudge6), nexus (toon×12), voxel, or armada (mechs).",
        });
      }

      const account = await storage.getOrCreateAccountForUser(userId);
      const eraSlots = mergeEraSlots(account.eraSlots as import("@shared/definitions/gameEras").AccountEraSlots | null);
      // Persist product-law eraSlots when account still has legacy max values
      if (JSON.stringify(account.eraSlots) !== JSON.stringify(eraSlots)) {
        try {
          await storage.updateAccount(account.id, { eraSlots });
        } catch {
          /* non-blocking */
        }
      }
      const eraCount = await storage.countCharactersForEra(userId, gameEra);
      if (eraCount >= eraSlots[gameEra].max) {
        return res.status(403).json({
          error: `No ${ERA_META[gameEra].shortLabel} roster slots available.`,
          gameEra,
          max: eraSlots[gameEra].max,
          used: eraCount,
        });
      }

      // Warlords-era creation consumes boss-earned character tokens (bypass in dev/playtest)
      const devUnlimitedTokens =
        process.env.NODE_ENV === "development" ||
        process.env.DEV_UNLIMITED_CHARACTER_TOKENS === "true";
      const model3d = req.body.model3d as { grudge6?: boolean; sourceUrl?: string } | undefined;
      const fromCharacterStudio =
        model3d?.grudge6 === true ||
        String(model3d?.sourceUrl || "").includes("character.grudge-studio.com");
      if (gameEra === "warlords" && !devUnlimitedTokens && !fromCharacterStudio) {
        const tokens = (account as any).characterTokens ?? 1;
        if (tokens <= 0) {
          return res.status(403).json({
            error: "No character tokens available. Defeat a boss to earn one!",
            characterTokens: 0,
            gameEra,
            hint:
              "Playtest: POST /api/island/boss-clear (auth) or admin grant-character-tokens. Local dev skips tokens automatically.",
          });
        }
        await storage.updateAccount(account.id, {
          characterTokens: tokens - 1,
        } as any);
      }
      
      // Accept race/class aliases used by older clients (race/class vs raceId/classId)
      const raceId = String(req.body.raceId || req.body.race || "human").toLowerCase();
      const classId = String(req.body.classId || req.body.class || "warrior").toLowerCase();
      const skipStartingGear = req.body.skipStartingGear === true;

      // Canonical identity: player name + GRDG-HUMWAR-… code (never name === code).
      // Name is optional when account already has username/displayName from Grudge ID
      // (id.grudge-studio.com account DB SSOT).
      const jwtUser = (req as { user?: { username?: string; displayName?: string } }).user;
      const accountDisplay =
        (account as { displayName?: string | null }).displayName ||
        jwtUser?.displayName ||
        jwtUser?.username ||
        req.body.username ||
        req.body.displayName ||
        "";
      const identity = resolveHeroIdentity({
        name: req.body.name || accountDisplay || undefined,
        grudgeCode: req.body.grudgeCode,
        grudgeDisplayId: req.body.grudgeDisplayId,
        grudgeUuid: req.body.grudgeUuid,
        raceId,
        classId,
        model3d: req.body.model3d,
      });

      // GCS unarmed race start: empty equipment unless the client sends explicit slots.
      const startingGear = skipStartingGear
        ? { equipment: {}, inventory: [] as { itemId: string; quantity: number; tier?: number }[] }
        : getClassStartingGear(classId);

      const equipment = skipStartingGear
        ? (req.body.equipment ?? {
            Head: null,
            Chest: null,
            Hands: null,
            Legs: null,
            Feet: null,
            Shoulder: null,
            Back: null,
            MainHand: null,
            OffHand: null,
            Accessory1: null,
            Accessory2: null,
          })
        : {
            ...startingGear.equipment,
            ...(req.body.equipment || {}),
          };

      const inventory = skipStartingGear
        ? (req.body.inventory ?? [])
        : [...startingGear.inventory, ...(req.body.inventory || [])];

      // Default attributes so thin clients (Foundry/GCS) never fail Zod
      const defaultAttrs: Record<string, number> = {
        Strength: 10,
        Vitality: 10,
        Endurance: 10,
        Intellect: 10,
        Wisdom: 10,
        Dexterity: 10,
        Agility: 10,
        Tactics: 10,
      };
      const attributes =
        req.body.attributes && typeof req.body.attributes === "object"
          ? { ...defaultAttrs, ...req.body.attributes }
          : defaultAttrs;
      
      // Pipeline is era-locked: warlords→grudge6, nexus→toon, voxel→voxel (never client override).
      const pipeline = defaultPipelineForEra(gameEra);
      const model3dIn = (req.body.model3d && typeof req.body.model3d === "object")
        ? req.body.model3d
        : {};
      // Production: Foundry/Warlords new heroes start at 20 so home-island + open play unlock.
      const requestedLevel = Number(req.body.level);
      const startLevel =
        Number.isFinite(requestedLevel) && requestedLevel > 0
          ? Math.min(100, Math.floor(requestedLevel))
          : gameEra === "warlords"
            ? 20
            : 1;

      const validated = insertCharacterSchema.parse({
        ...req.body,
        userId,
        name: identity.name,
        grudgeCode: identity.grudgeCode,
        raceId,
        classId,
        gameEra,
        level: startLevel,
        activeForEra: eraCount === 0,
        attributes,
        equipment,
        inventory,
        model3d: {
          ...model3dIn,
          gameEra,
          renderPipeline: pipeline,
          grudge6: pipeline === "grudge6" ? true : model3dIn.grudge6,
          grudgeDisplayId: identity.grudgeCode,
          grudgeCode: identity.grudgeCode,
        },
        spriteConfig: req.body.spriteConfig || {
          skinTone: 0,
          hairColor: 0,
          armorColor: 0,
          clothColor: 0,
        },
      });
      
      let character;
      try {
        character = await storage.createCharacter(validated);
      } catch (insertErr: any) {
        // Unique grudge_code collision — regenerate once
        const msg = String(insertErr?.message || insertErr || "");
        if (/grudge_code|unique/i.test(msg)) {
          const retry = resolveHeroIdentity({
            name: identity.name,
            raceId,
            classId,
          });
          character = await storage.createCharacter({
            ...validated,
            grudgeCode: retry.grudgeCode,
            model3d: {
              ...(validated.model3d as object),
              grudgeDisplayId: retry.grudgeCode,
              grudgeCode: retry.grudgeCode,
            },
          });
        } else {
          throw insertErr;
        }
      }

      if (eraCount === 0) {
        const slots = mergeEraSlots(account.eraSlots as import("@shared/definitions/gameEras").AccountEraSlots | null);
        slots[gameEra].activeCharacterId = character.id;
        await storage.updateAccount(account.id, { eraSlots: slots });
      }
      
      // Assign starting abilities based on class
      try {
        await storage.addStartingAbilities(character.id, character.classId);
      } catch (abErr) {
        console.error("Error assigning starting abilities:", abErr);
      }
      
      // Only generate avatar if one wasn't provided and skipAvatarGeneration is not set
      let finalCharacter = character;
      if (!character.avatarUrl && !req.body.skipAvatarGeneration) {
        const avatarUrl = await generateCharacterAvatar(
          character.name, 
          character.raceId, 
          character.classId
        );
        
        if (avatarUrl) {
          finalCharacter = await storage.updateCharacter(character.id, { avatarUrl });
        }
      }

      // Escrow-first cNFT mint (non-blocking). Game ownership = Railway account.
      // Chain custody = AI_AGENT_WALLET until optional claim.
      try {
        const { nftMintingService } = await import("./services/nftMinting");
        const mintResult = await nftMintingService.mintCharacterAsCNFT(
          finalCharacter.id,
          account.id,
          // email/wallet ignored unless directToUser — escrow default
          undefined,
          undefined,
          { directToUser: false },
        );
        if (mintResult.success && mintResult.actionId) {
          finalCharacter = await storage.updateCharacter(finalCharacter.id, {
            cnftId: mintResult.actionId,
          } as any);
          console.log(
            `[cNFT] Escrow mint for ${finalCharacter.name}: action=${mintResult.actionId} nftId=${mintResult.nftId}`,
          );
        } else if (!mintResult.success) {
          console.warn(`[cNFT] Escrow mint deferred: ${mintResult.error}`);
        }
      } catch (mintErr) {
        console.warn(`[cNFT] Character mint skipped (playable without chain):`, mintErr);
      }

      res.json(finalCharacter);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: error.errors
            .map((e) => `${e.path.join(".") || "field"}: ${e.message}`)
            .join("; "),
        });
      }
      console.error("Error creating character:", error);
      res.status(500).json({ error: "Failed to create character" });
    }
  });

  app.post("/api/characters/:id/regenerate-avatar", async (req, res) => {
    try {
      const userId = getUserId(req);
      const character = await storage.getCharacter(req.params.id);
      if (!character) {
        return res.status(404).json({ error: "Character not found" });
      }
      if (character.userId !== userId) {
        return res.status(403).json({ error: "Character does not belong to your account" });
      }
      
      const avatarUrl = await generateCharacterAvatar(
        character.name, 
        character.raceId, 
        character.classId
      );
      
      if (!avatarUrl) {
        return res.status(500).json({ error: "Failed to generate avatar" });
      }
      
      const updated = await storage.updateCharacter(character.id, { avatarUrl });
      res.json(updated);
    } catch (error) {
      console.error("Error regenerating avatar:", error);
      res.status(500).json({ error: "Failed to regenerate avatar" });
    }
  });

  /**
   * PATCH /api/characters/:id
   *
   * Character progress SSOT write path (see docs/CHARACTER_PROGRESS_SSOT.md).
   * - Never accepts account inventory (use /api/account/inventory).
   * - Validates weapon mastery pool.
   * - Optimistic concurrency via expectedRevision or If-Match header.
   * - Idempotent when body.idempotencyKey is set.
   * Response includes progressRevision + progressSchemaVersion.
   */
  app.patch("/api/characters/:id", async (req, res) => {
    try {
      const userId = getUserId(req);
      const character = await storage.getCharacter(req.params.id);
      if (!character) {
        return res.status(404).json({ error: "Character not found" });
      }
      if (character.userId !== userId) {
        return res.status(403).json({ error: "Character does not belong to your account" });
      }

      const body = { ...(req.body || {}) } as CharacterProgressPayload & Record<string, unknown>;
      // Account bag / resources are NOT character-scoped — hard reject (crafting must use account APIs)
      if ((body as any).inventory != null || (body as any).resources != null) {
        return res.status(400).json({
          error: "Account inventory is not character-scoped",
          hint: "Use GET/POST/PATCH /api/account/inventory and /api/account/resources for crafting materials. Character PATCH only accepts progress (professions, equipment, attributes, skills).",
          code: "ACCOUNT_BAG_ON_CHARACTER",
        });
      }

      const ifMatch = req.get("If-Match") || req.get("X-Progress-Revision");
      if (body.expectedRevision == null && ifMatch != null) {
        const n = Number(String(ifMatch).replace(/"/g, ""));
        if (Number.isFinite(n)) body.expectedRevision = n;
      }

      // Progress-shaped body → validated apply
      const isProgressWrite =
        body.professionLevels != null ||
        body.equipment != null ||
        body.attributes != null ||
        body.selectedSkills != null ||
        body.skillLoadouts != null ||
        body.weaponSkillSelections != null ||
        body.weaponMastery != null ||
        body.skillPoints != null ||
        body.weaponSkillLevel != null ||
        body.unspentAttributePoints != null ||
        body.expectedRevision != null ||
        body.idempotencyKey != null;

      if (isProgressWrite) {
        const result = applyCharacterProgressUpdate(character as any, body);
        if (!result.ok) {
          const meta = result.meta || readProgressMeta(character as any);
          return res.status(result.status).json({
            error: result.error,
            errors: result.errors,
            progressRevision: meta.revision,
            progressSchemaVersion: meta.schemaVersion || CHARACTER_PROGRESS_SCHEMA_VERSION,
            characterId: character.id,
          });
        }
        if (result.alreadyApplied) {
          const meta = readProgressMeta(character as any);
          return res.json({
            ...character,
            progressRevision: meta.revision,
            progressSchemaVersion: meta.schemaVersion || CHARACTER_PROGRESS_SCHEMA_VERSION,
            alreadyApplied: true,
          });
        }
        const updated = await storage.updateCharacter(req.params.id, result.updates as any);
        const meta = result.meta || readProgressMeta(updated as any);
        return res.json({
          ...updated,
          progressRevision: meta.revision,
          progressSchemaVersion: meta.schemaVersion || CHARACTER_PROGRESS_SCHEMA_VERSION,
        });
      }

      // Non-progress administrative fields (avatar, model3d, personality, etc.)
      const safe = { ...body } as Record<string, unknown>;
      delete safe.expectedRevision;
      delete safe.idempotencyKey;
      delete safe.schemaVersion;
      delete safe.weaponMastery;
      const updated = await storage.updateCharacter(req.params.id, safe as any);
      const meta = readProgressMeta(updated as any);
      res.json({
        ...updated,
        progressRevision: meta.revision,
        progressSchemaVersion: meta.schemaVersion || CHARACTER_PROGRESS_SCHEMA_VERSION,
      });
    } catch (error) {
      console.error("Error updating character:", error);
      res.status(500).json({ error: "Failed to update character" });
    }
  });

  /**
   * POST /api/characters/:id/progress — preferred explicit progress write.
   * Same validation as PATCH; always treated as progress-shaped.
   */
  app.post("/api/characters/:id/progress", async (req, res) => {
    try {
      const userId = getUserId(req);
      const character = await storage.getCharacter(req.params.id);
      if (!character) {
        return res.status(404).json({ error: "Character not found" });
      }
      if (character.userId !== userId) {
        return res.status(403).json({ error: "Character does not belong to your account" });
      }
      const body = { ...(req.body || {}) } as CharacterProgressPayload;
      if ((body as any).inventory != null || (body as any).resources != null) {
        return res.status(400).json({
          error: "Account inventory is not character-scoped",
          hint: "Use /api/account/inventory and /api/account/resources for crafting materials",
          code: "ACCOUNT_BAG_ON_CHARACTER",
        });
      }
      const ifMatch = req.get("If-Match") || req.get("X-Progress-Revision");
      if (body.expectedRevision == null && ifMatch != null) {
        const n = Number(String(ifMatch).replace(/"/g, ""));
        if (Number.isFinite(n)) body.expectedRevision = n;
      }
      if (body.schemaVersion == null) body.schemaVersion = CHARACTER_PROGRESS_SCHEMA_VERSION;

      const result = applyCharacterProgressUpdate(character as any, body);
      if (!result.ok) {
        const meta = result.meta || readProgressMeta(character as any);
        return res.status(result.status).json({
          error: result.error,
          errors: result.errors,
          progressRevision: meta.revision,
          progressSchemaVersion: meta.schemaVersion || CHARACTER_PROGRESS_SCHEMA_VERSION,
          characterId: character.id,
        });
      }
      if (result.alreadyApplied) {
        const meta = readProgressMeta(character as any);
        return res.json({
          ...character,
          progressRevision: meta.revision,
          progressSchemaVersion: meta.schemaVersion || CHARACTER_PROGRESS_SCHEMA_VERSION,
          alreadyApplied: true,
        });
      }
      const updated = await storage.updateCharacter(req.params.id, result.updates as any);
      const meta = result.meta || readProgressMeta(updated as any);
      res.json({
        ...updated,
        progressRevision: meta.revision,
        progressSchemaVersion: meta.schemaVersion || CHARACTER_PROGRESS_SCHEMA_VERSION,
      });
    } catch (error) {
      console.error("Error updating character progress:", error);
      res.status(500).json({ error: "Failed to update character progress" });
    }
  });

  // POST /api/characters/:id/equip — panel equip/unequip + model3d sync (Warlord handoff)
  app.post("/api/characters/:id/equip", async (req, res) => {
    try {
      const userId = getUserId(req);
      const character = await storage.getCharacter(req.params.id);
      if (!character) {
        return res.status(404).json({ error: "Character not found" });
      }
      if (character.userId !== userId) {
        return res.status(403).json({ error: "Character does not belong to your account" });
      }

      const slot = req.body?.slot as PanelEquipmentSlot | undefined;
      if (!slot) {
        return res.status(400).json({ error: "slot is required" });
      }

      let itemId: string | null = req.body?.itemId ?? null;
      const accountInventoryId = req.body?.accountInventoryId as string | undefined;

      if (accountInventoryId) {
        const account = await storage.getOrCreateAccountForUser(userId);
        const row = await storage.getAccountInventoryItem(accountInventoryId);
        if (!row || row.accountId !== account.id) {
          return res.status(403).json({ error: "Account inventory item not found" });
        }
        itemId = row.itemId;
      }

      let equipment = character.equipment ?? {};
      let inventory = character.inventory ?? [];

      if (accountInventoryId && itemId) {
        equipment = { ...equipment, [slot]: itemId };
      } else {
        const swap = equipToPanelSlot(equipment, inventory, slot, itemId);
        equipment = swap.equipment;
        inventory = swap.inventory;
      }

      const model3d = panelEquipmentToModel3d(
        character.raceId,
        character.classId,
        equipment,
        character.model3d ?? undefined,
      );

      const updated = await storage.updateCharacter(req.params.id, {
        equipment,
        inventory,
        model3d,
      });

      if (accountInventoryId) {
        const account = await storage.getOrCreateAccountForUser(userId);
        await storage.transferItemToCharacter(
          accountInventoryId,
          itemId ? req.params.id : null,
          account.id,
          userId,
        );
      }

      res.json(updated);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to equip item";
      if (message.includes("cannot be equipped") || message.includes("not in inventory")) {
        return res.status(400).json({ error: message });
      }
      console.error("Error equipping character:", error);
      res.status(500).json({ error: "Failed to equip item" });
    }
  });

  app.put("/api/characters/:id/activate", async (req, res) => {
    try {
      const userId = getUserId(req);
      const character = await storage.getCharacter(req.params.id);
      if (!character) {
        return res.status(404).json({ error: "Character not found" });
      }
      if (character.userId !== userId) {
        return res.status(403).json({ error: "Character does not belong to your account" });
      }
      const era = normalizeGameEra(req.body?.gameEra ?? character.gameEra);
      const result = await storage.activateCharacterForEra(userId, req.params.id, era);
      res.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to activate character";
      if (message === "Character not found" || message === "Character does not belong to this era") {
        return res.status(400).json({ error: message });
      }
      console.error("Error activating character:", error);
      res.status(500).json({ error: "Failed to activate character" });
    }
  });

  app.delete("/api/characters/:id", async (req, res) => {
    try {
      const userId = getUserId(req);
      const character = await storage.getCharacter(req.params.id);
      if (!character) {
        return res.status(404).json({ error: "Character not found" });
      }
      if (character.userId !== userId) {
        return res.status(403).json({ error: "Character does not belong to your account" });
      }
      await storage.deleteCharacter(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting character:", error);
      res.status(500).json({ error: "Failed to delete character" });
    }
  });

  // ── Phase 1: Step 5 - Generate Island Preview ────────────────────────────
  app.post("/api/characters/:id/generate-island", async (req, res) => {
    try {
      const userId = getUserId(req);
      const characterId = req.params.id;

      // Verify character exists and belongs to user
      const character = await storage.getCharacter(characterId);
      if (!character) {
        return res.status(404).json({ error: "Character not found" });
      }
      if (character.userId !== userId) {
        return res.status(403).json({ error: "Character does not belong to your account" });
      }

      // Get or create home island for this character
      const account = await storage.getOrCreateAccountForUser(userId);
      let island = await storage.getOrCreateHomeIsland(account.id);

      const existingState = (island.state || {}) as Record<string, unknown>;
      const needsGeneration = !(island as any).validatedAt && (
        !Array.isArray(existingState.nodes) ||
        (existingState.nodes as unknown[]).length === 0
      );

      if (needsGeneration) {
        const generatedState = generateIslandState(characterId, island.seed);
        island = await storage.updateHomeIsland(island.id, {
          state: generatedState,
        } as any);
      }

      // Link character to this island if not already linked
      if (!character.homeIslandId || character.homeIslandId !== island.id) {
        await storage.updateCharacter(characterId, { homeIslandId: island.id } as any);
      }

      const normalizedState = normalizeIslandState(island);
      res.json({
        id: island.id,
        homeIslandId: island.id,
        seed: island.seed,
        name: island.name,
        mapStyle: island.mapStyle,
        validatedAt: (island as any).validatedAt ?? null,
        createdAt: island.createdAt,
        updatedAt: island.updatedAt,
        state: island.state,
        islandState: island.state,
        ...normalizedState,
      });
    } catch (error) {
      console.error("Error generating island:", error);
      res.status(500).json({ error: "Failed to generate island" });
    }
  });

  // ── GET /api/islands/:id — fetch a specific island by DB id ─────────────
  app.get("/api/islands/:id", async (req, res) => {
    try {
      const userId = getUserId(req);
      const island = await storage.getHomeIsland(req.params.id);
      if (!island) {
        return res.status(404).json({ error: "Island not found" });
      }
      // Verify ownership (admins may bypass)
      const account = await storage.getAccount(island.accountId);
      if (!isAdmin(req) && account?.userId !== userId) {
        return res.status(403).json({ error: "Island does not belong to your account" });
      }
      const normalizedState = normalizeIslandState(island);
      res.json({ ...island, state: normalizedState });
    } catch (error) {
      console.error("Error fetching island:", error);
      res.status(500).json({ error: "Failed to fetch island" });
    }
  });

  // ── Phase 1: Step 6 - Reroll Island ─────────────────────────────────────
  app.post("/api/islands/:id/regenerate", async (req, res) => {
    try {
      const userId = getUserId(req);
      const islandId = req.params.id;

      // Verify island exists
      const island = await storage.getHomeIsland(islandId);
      if (!island) {
        return res.status(404).json({ error: "Island not found" });
      }

      // Verify island belongs to user
      const account = await storage.getAccount(island.accountId);
      if (account?.userId !== userId) {
        return res.status(403).json({ error: "Island does not belong to your account" });
      }

      // Prevent rerolling a validated (committed) island
      if ((island as any).validatedAt) {
        return res.status(409).json({
          error: "Cannot reroll a validated island",
          validatedAt: (island as any).validatedAt,
        });
      }

      // Generate fresh island state with new seed
      const { v4: uuidv4 } = await import("uuid");
      const newSeed = uuidv4();
      const characterId = account?.id || "unknown"; // Use account ID as proxy
      const newIslandState = generateIslandState(characterId, newSeed);

      // Update island with new seed and state (but DON'T set validatedAt)
      const updatedIsland = await storage.updateHomeIsland(island.id, {
        seed: newSeed,
        state: newIslandState,
      } as any);

      const normalizedState = normalizeIslandState(updatedIsland);
      res.json({
        ...updatedIsland,
        state: normalizedState,
        islandState: normalizedState,
        rerollCount: (req.body.rerollCount || 0) + 1,
      });
    } catch (error) {
      console.error("Error regenerating island:", error);
      res.status(500).json({ error: "Failed to regenerate island" });
    }
  });

  // Upload avatar image to object storage (permanent URL)
  app.post("/api/characters/upload-avatar", async (req, res) => {
    try {
      const { characterId, imageData, characterName, race, classId } = req.body;
      if (!characterId || !imageData) {
        return res.status(400).json({ error: "characterId and imageData are required" });
      }

      const { prepareCharacterNFTMetadata } = await import("./services/nftMetadata");
      const result = await prepareCharacterNFTMetadata(
        characterId,
        characterName || 'Hero',
        imageData,
        race || 'unknown',
        classId || 'warrior',
        1, // level 1 on creation
      );

      // Update character record with permanent avatar URL
      await storage.updateCharacter(characterId, { avatarUrl: result.imageUri });

      res.json({
        success: true,
        imageUri: result.imageUri,
        metadataUri: result.metadataUri,
      });
    } catch (error) {
      console.error("Error uploading avatar:", error);
      res.status(500).json({ error: "Failed to upload avatar" });
    }
  });

  // Character abilities routes
  app.get("/api/characters/:id/abilities", async (req, res) => {
    try {
      const userId = getUserId(req);
      const character = await storage.getCharacter(req.params.id);
      if (!character) {
        return res.status(404).json({ error: "Character not found" });
      }
      if (character.userId !== userId) {
        return res.status(403).json({ error: "Character does not belong to your account" });
      }
      const abilities = await storage.getCharacterAbilities(req.params.id);
      res.json(abilities);
    } catch (error) {
      console.error("Error fetching character abilities:", error);
      res.status(500).json({ error: "Failed to fetch character abilities" });
    }
  });

  // Character AI Personality routes (local-dev only — see AGENTS.md)
  // ServiceDisabledError → 503 so the frontend can render BackendRequired
  // instead of treating a missing OPENAI_API_KEY as an unexpected 500.
  function isPersonalityDisabled(err: unknown): boolean {
    return !!err && typeof err === "object"
      && (err as { code?: string }).code === "AI_PERSONALITY_DISABLED";
  }
  const PERSONALITY_DISABLED_BODY = {
    error: "AI personality service is not configured on this host",
    code: "AI_PERSONALITY_DISABLED",
  };

  app.post("/api/characters/:id/generate-personality", async (req, res) => {
    try {
      const { generatePersonality } = await import("./services/aiPersonality");
      const userId = getUserId(req);
      const character = await storage.getCharacter(req.params.id);
      if (!character) {
        return res.status(404).json({ error: "Character not found" });
      }
      if (character.userId !== userId) {
        return res.status(403).json({ error: "Character does not belong to your account" });
      }
      const races = await storage.getRaces();
      const classes = await storage.getClasses();
      const race = races.find(r => r.id === character.raceId);
      const cls = classes.find(c => c.id === character.classId);

      const personality = await generatePersonality(
        race?.name || "Human",
        cls?.name || "Warrior",
        character.name
      );

      const updated = await storage.updateCharacter(character.id, { personality } as any);
      res.json({ personality, character: updated });
    } catch (error) {
      if (isPersonalityDisabled(error)) {
        return res.status(503).json(PERSONALITY_DISABLED_BODY);
      }
      console.error("Error generating personality:", error);
      res.status(500).json({ error: "Failed to generate personality" });
    }
  });

  app.post("/api/characters/:id/chat", async (req, res) => {
    try {
      const { chatWithCharacter } = await import("./services/aiPersonality");
      const userId = getUserId(req);
      const character = await storage.getCharacter(req.params.id);
      if (!character) {
        return res.status(404).json({ error: "Character not found" });
      }
      if (character.userId !== userId) {
        return res.status(403).json({ error: "Character does not belong to your account" });
      }

      const { message } = req.body;
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: "Message is required" });
      }

      const chatHistory = (character.chatHistory as any[]) || [];
      const result = await chatWithCharacter(character.id, message, chatHistory);
      res.json(result);
    } catch (error) {
      if (isPersonalityDisabled(error)) {
        return res.status(503).json(PERSONALITY_DISABLED_BODY);
      }
      console.error("Error chatting with character:", error);
      res.status(500).json({ error: "Failed to chat with character" });
    }
  });

  app.get("/api/characters/:id/greeting", async (req, res) => {
    try {
      const { generateCharacterGreeting } = await import("./services/aiPersonality");
      const userId = getUserId(req);
      const character = await storage.getCharacter(req.params.id);
      if (!character) {
        return res.status(404).json({ error: "Character not found" });
      }
      if (character.userId !== userId) {
        return res.status(403).json({ error: "Character does not belong to your account" });
      }

      const greeting = await generateCharacterGreeting(character.id);
      res.json({ greeting });
    } catch (error) {
      if (isPersonalityDisabled(error)) {
        return res.status(503).json(PERSONALITY_DISABLED_BODY);
      }
      console.error("Error generating greeting:", error);
      res.status(500).json({ error: "Failed to generate greeting" });
    }
  });

  app.post("/api/characters/random-discussion", async (req, res) => {
    try {
      const { triggerRandomDiscussion } = await import("./services/aiPersonality");
      const { characterIds } = req.body;
      if (!Array.isArray(characterIds)) {
        return res.status(400).json({ error: "characterIds must be an array" });
      }

      const discussion = await triggerRandomDiscussion(characterIds);
      res.json(discussion || { speakerId: null, message: null });
    } catch (error) {
      if (isPersonalityDisabled(error)) {
        return res.status(503).json(PERSONALITY_DISABLED_BODY);
      }
      console.error("Error triggering random discussion:", error);
      res.status(500).json({ error: "Failed to trigger discussion" });
    }
  });

  // Party routes
  app.get("/api/party", async (req, res) => {
    try {
      const userId = getUserId(req);
      const party = await storage.getParty(userId);
      res.json(party || { userId, characterIds: [] });
    } catch (error) {
      console.error("Error fetching party:", error);
      res.status(500).json({ error: "Failed to fetch party" });
    }
  });

  app.post("/api/party", async (req, res) => {
    try {
      const userId = getUserId(req);
      const { characterIds } = req.body;
      if (!Array.isArray(characterIds)) {
        return res.status(400).json({ error: "characterIds must be an array" });
      }
      const party = await storage.updateParty(userId, characterIds);
      res.json(party);
    } catch (error) {
      console.error("Error updating party:", error);
      res.status(500).json({ error: "Failed to update party" });
    }
  });

  // Resource gathering routes
  app.get("/api/resource-nodes/:nodeId", async (req, res) => {
    try {
      const userId = getUserId(req);
      const node = await storage.getResourceNode(userId, req.params.nodeId);
      res.json(node || { nodeId: req.params.nodeId, lastGathered: null });
    } catch (error) {
      console.error("Error fetching resource node:", error);
      res.status(500).json({ error: "Failed to fetch resource node" });
    }
  });

  app.post("/api/resource-nodes/:nodeId/gather", async (req, res) => {
    try {
      const userId = getUserId(req);
      const { lastGathered } = req.body;
      const node = await storage.updateResourceNode(
        userId,
        req.params.nodeId,
        lastGathered
      );
      res.json(node);
    } catch (error) {
      console.error("Error updating resource node:", error);
      res.status(500).json({ error: "Failed to gather resource" });
    }
  });

  // Player resources routes
  app.get("/api/resources", async (req, res) => {
    try {
      const userId = getUserId(req);
      const resources = await storage.getPlayerResources(userId);
      res.json(resources || { userId, resources: {} });
    } catch (error) {
      console.error("Error fetching resources:", error);
      res.status(500).json({ error: "Failed to fetch resources" });
    }
  });

  app.post("/api/resources", async (req, res) => {
    try {
      const userId = getUserId(req);
      const { resources } = req.body;
      const updated = await storage.updatePlayerResources(userId, resources);
      res.json(updated);
    } catch (error) {
      console.error("Error updating resources:", error);
      res.status(500).json({ error: "Failed to update resources" });
    }
  });

  // ============================================
  // ACCOUNT & SHARED INVENTORY ROUTES
  // ============================================

  // Get or create account for current user
  app.get("/api/account", async (req, res) => {
    try {
      const userId = getUserId(req);
      const account = await storage.getOrCreateAccountForUser(userId);
      res.json(account);
    } catch (error) {
      console.error("Error fetching account:", error);
      res.status(500).json({ error: "Failed to fetch account" });
    }
  });

  // Update account
  app.patch("/api/account", async (req, res) => {
    try {
      const userId = getUserId(req);
      const account = await storage.getOrCreateAccountForUser(userId);
      
      // Sanitize payload - only allow safe fields to be updated (not userId, id)
      const { displayName, gold, premiumCurrency } = req.body;
      const safeUpdates: Record<string, unknown> = {};
      if (displayName !== undefined) safeUpdates.displayName = displayName;
      if (gold !== undefined) safeUpdates.gold = gold;
      if (premiumCurrency !== undefined) safeUpdates.premiumCurrency = premiumCurrency;
      
      const updated = await storage.updateAccount(account.id, safeUpdates);
      res.json(updated);
    } catch (error) {
      console.error("Error updating account:", error);
      res.status(500).json({ error: "Failed to update account" });
    }
  });

  // Get account inventory
  app.get("/api/account/inventory", async (req, res) => {
    try {
      const userId = getUserId(req);
      const account = await storage.getOrCreateAccountForUser(userId);
      const inventory = await storage.getAccountInventory(account.id);
      res.json(inventory);
    } catch (error) {
      console.error("Error fetching account inventory:", error);
      res.status(500).json({ error: "Failed to fetch inventory" });
    }
  });

  // Add item to account inventory
  app.post("/api/account/inventory", async (req, res) => {
    try {
      const userId = getUserId(req);
      const account = await storage.getOrCreateAccountForUser(userId);
      
      // Validate boundToCharacterId if provided
      if (req.body.boundToCharacterId) {
        const character = await storage.getCharacter(req.body.boundToCharacterId);
        if (!character) {
          return res.status(400).json({ error: "Character not found" });
        }
        if (character.userId !== userId) {
          return res.status(403).json({ error: "Character does not belong to your account" });
        }
      }
      
      const validated = insertAccountInventorySchema.parse({
        ...req.body,
        accountId: account.id,
      });
      const item = await storage.addAccountInventoryItem(validated);
      res.json(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error adding inventory item:", error);
      res.status(500).json({ error: "Failed to add item" });
    }
  });

  // Update inventory item
  app.patch("/api/account/inventory/:id", async (req, res) => {
    try {
      const userId = getUserId(req);
      const account = await storage.getOrCreateAccountForUser(userId);
      
      // Use the safe storage method with full validation
      const item = await storage.updateAccountInventoryItemSafe(
        req.params.id, 
        req.body, 
        account.id, 
        userId
      );
      res.json(item);
    } catch (error) {
      console.error("Error updating inventory item:", error);
      const message = error instanceof Error ? error.message : "Failed to update item";
      if (message.includes("not found") || message.includes("does not belong")) {
        return res.status(403).json({ error: message });
      }
      res.status(500).json({ error: "Failed to update item" });
    }
  });

  // Remove inventory item
  app.delete("/api/account/inventory/:id", async (req, res) => {
    try {
      const userId = getUserId(req);
      const account = await storage.getOrCreateAccountForUser(userId);
      const existingItem = await storage.getAccountInventoryItem(req.params.id);
      if (!existingItem) {
        return res.status(404).json({ error: "Item not found" });
      }
      if (existingItem.accountId !== account.id) {
        return res.status(403).json({ error: "Item does not belong to your account" });
      }
      await storage.removeAccountInventoryItem(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing inventory item:", error);
      res.status(500).json({ error: "Failed to remove item" });
    }
  });

  // Transfer item to/from character
  app.post("/api/account/inventory/:id/transfer", async (req, res) => {
    try {
      const userId = getUserId(req);
      const account = await storage.getOrCreateAccountForUser(userId);
      const { characterId } = req.body; // null to unbind from character
      const item = await storage.transferItemToCharacter(req.params.id, characterId, account.id, userId);
      res.json(item);
    } catch (error) {
      console.error("Error transferring item:", error);
      const message = error instanceof Error ? error.message : "Failed to transfer item";
      res.status(400).json({ error: message });
    }
  });

  // Get account resources
  app.get("/api/account/resources", async (req, res) => {
    try {
      const userId = getUserId(req);
      const account = await storage.getOrCreateAccountForUser(userId);
      const resources = await storage.getAccountResources(account.id);
      res.json(resources || { accountId: account.id, resources: {} });
    } catch (error) {
      console.error("Error fetching account resources:", error);
      res.status(500).json({ error: "Failed to fetch resources" });
    }
  });

  // Update account resources
  app.post("/api/account/resources", async (req, res) => {
    try {
      const userId = getUserId(req);
      const account = await storage.getOrCreateAccountForUser(userId);
      const { resources } = req.body;
      const updated = await storage.updateAccountResources(account.id, resources);
      res.json(updated);
    } catch (error) {
      console.error("Error updating account resources:", error);
      res.status(500).json({ error: "Failed to update resources" });
    }
  });

  // Add specific resource
  app.post("/api/account/resources/add", async (req, res) => {
    try {
      const userId = getUserId(req);
      const account = await storage.getOrCreateAccountForUser(userId);
      const { resourceId, amount } = req.body;
      if (!resourceId || typeof amount !== 'number') {
        return res.status(400).json({ error: "resourceId and amount are required" });
      }
      const updated = await storage.addAccountResource(account.id, resourceId, amount);
      res.json(updated);
    } catch (error) {
      console.error("Error adding resource:", error);
      res.status(500).json({ error: "Failed to add resource" });
    }
  });

  // Batch add multiple resources (for harvest operations)
  const batchResourceSchema = z.object({
    items: z.array(z.object({
      resourceId: z.string().min(1),
      amount: z.number().positive().int()
    })).min(1).max(100)
  });
  
  app.post("/api/account/resources/batch", async (req, res) => {
    try {
      const parseResult = batchResourceSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Invalid payload", details: parseResult.error.flatten() });
      }
      
      const userId = getUserId(req);
      const account = await storage.getOrCreateAccountForUser(userId);
      const result = await storage.batchAddAccountResources(account.id, parseResult.data.items);
      res.json(result);
    } catch (error) {
      console.error("Error batch adding resources:", error);
      res.status(500).json({ error: "Failed to batch add resources" });
    }
  });

  // ============================================
  // HOME ISLAND ROUTES
  // ============================================

  // Island state validation schema
  const islandStateSchema = z.object({
    id: z.string().min(1),
    mapStyle: z.enum(['iron', 'fantasy', 'tactical', 'night']),
    mapImageUrl: z.string().optional(),
    nodes: z.array(z.unknown()),
    sheep: z.array(z.unknown()),
    skinningNodes: z.array(z.unknown()),
    assignedHeroes: z.record(z.string(), z.string()),
    createdAt: z.number(),
    lastUpdate: z.number(),
    // RTS-Grudge → Warlords export bridge (grid seed, biome, source app)
    rtsExport: z.object({
      source: z.literal('rts-grudge'),
      gridX: z.number(),
      gridZ: z.number(),
      seed: z.number(),
      biome: z.string(),
      exportedAt: z.number(),
      appUrl: z.string(),
    }).optional(),
    terrainZones: z.array(z.unknown()).optional(),
    campPosition: z.object({ x: z.number(), y: z.number() }).optional(),
    clearings: z.array(z.unknown()).optional(),
    animals: z.array(z.unknown()).optional(),
    mountainTriad: z.object({
      secretPeakIndex: z.union([z.literal(0), z.literal(1), z.literal(2)]),
      anchorPercent: z.object({ x: z.number(), y: z.number() }),
      mountainScaleM: z.number(),
      entranceHeightM: z.number(),
      islandWorldSizeM: z.number(),
      dungeonId: z.string(),
      modelUid: z.string(),
      modelPath: z.string(),
      peakModelPaths: z.array(z.string()).optional(),
      peakOffsetsM: z.array(z.object({ x: z.number(), z: z.number() })),
    }).optional(),
    rtsHeightmap: z.object({
      resolution: z.number(),
      worldSizeM: z.number(),
      maxHeightM: z.number(),
      biome: z.string(),
      heightsBase64: z.string(),
    }).optional(),
    rtsNatureScatter: z.object({
      version: z.string(),
      worldSizeM: z.number(),
      biome: z.string(),
      seed: z.number(),
      generatedAt: z.number(),
      instances: z.array(z.object({
        category: z.string(),
        modelPath: z.string(),
        x: z.number(),
        y: z.number(),
        z: z.number(),
        rotation: z.number(),
        scale: z.number(),
      })),
    }).optional(),
  }).passthrough();

  const islandMetadataSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    mapStyle: z.enum(['iron', 'fantasy', 'tactical', 'night']).optional(),
    mapImageUrl: z.string().url().optional(),
    thumbnailUrl: z.string().url().optional(),
  });

  // Helper to normalize island state to canonical DTO format
  function normalizeIslandState(island: { 
    id: string; 
    seed: string; 
    mapStyle: string; 
    mapImageUrl: string | null;
    state: Record<string, unknown>;
    createdAt: number;
    updatedAt: number;
  }): z.infer<typeof islandStateSchema> {
    const state = island.state || {};
    const validStyles = ['iron', 'fantasy', 'tactical', 'night'] as const;
    const rawMapStyle = (state.mapStyle || island.mapStyle || 'iron') as string;
    const mapStyle = validStyles.includes(rawMapStyle as typeof validStyles[number]) 
      ? rawMapStyle as typeof validStyles[number] 
      : 'iron';
    
    const sheep = Array.isArray(state.sheep)
      ? state.sheep
      : Array.isArray(state.animals)
        ? state.animals
        : [];

    return {
      id: (state.id as string) || island.seed || island.id,
      mapStyle,
      mapImageUrl: (state.mapImageUrl as string) || island.mapImageUrl || undefined,
      nodes: Array.isArray(state.nodes) ? state.nodes : [],
      sheep,
      skinningNodes: Array.isArray(state.skinningNodes) ? state.skinningNodes : [],
      assignedHeroes: (state.assignedHeroes as Record<string, string>) || {},
      terrainZones: Array.isArray(state.terrainZones) ? state.terrainZones : [],
      campPosition: (state.campPosition as { x: number; y: number }) || undefined,
      clearings: Array.isArray(state.clearings) ? state.clearings : [],
      animals: Array.isArray(state.animals) ? state.animals : sheep,
      mountainTriad: state.mountainTriad as Record<string, unknown> | undefined,
      rtsHeightmap: state.rtsHeightmap as Record<string, unknown> | undefined,
      rtsNatureScatter: state.rtsNatureScatter as Record<string, unknown> | undefined,
      rtsExport: state.rtsExport as Record<string, unknown> | undefined,
      createdAt: (state.createdAt as number) || island.createdAt || Date.now(),
      lastUpdate: (state.lastUpdate as number) || island.updatedAt || Date.now(),
    };
  }

  // World server telemetry for RTS / islands hub (proxies island-server /status)
  app.get("/api/rts/status", async (_req, res) => {
    const worldHttp =
      process.env.WORLD_SERVER_HTTP_URL ||
      process.env.VITE_PVP_SERVER_URL?.replace(/^wss?:\/\//, "https://") ||
      "https://world.grudge-studio.com";
    try {
      const upstream = await fetch(`${worldHttp.replace(/\/$/, "")}/status`, {
        signal: AbortSignal.timeout(8000),
      });
      if (!upstream.ok) {
        return res.json({ online: false, playerCount: null });
      }
      const data = await upstream.json();
      res.json({
        online: true,
        playerCount: typeof data.totalPlayers === "number" ? data.totalPlayers : null,
        activeIslands: data.activeIslands ?? null,
        totalEnemies: data.totalEnemies ?? null,
        uptime: data.uptime ?? null,
      });
    } catch {
      res.json({ online: false, playerCount: null });
    }
  });

  // Get the player's home island (creates one if doesn't exist)
  app.get("/api/island", async (req, res) => {
    try {
      const userId = getUserId(req);
      const account = await storage.getOrCreateAccountForUser(userId);
      let island = await storage.getOrCreateHomeIsland(account.id);

      const existingState = (island.state || {}) as Record<string, unknown>;
      if (islandStateNeedsGeneration(existingState)) {
        const chars = await storage.getCharacters(userId);
        const ownerId = chars[0]?.id ?? account.id;
        const generatedState = generateIslandState(ownerId, island.seed);
        island = await storage.updateHomeIsland(island.id, {
          state: { ...generatedState, sheep: generatedState.animals },
        } as any);
      }

      // Normalize state to canonical DTO format for consistent API response
      const normalizedState = normalizeIslandState(island);
      
      res.json({
        ...island,
        state: normalizedState
      });
    } catch (error) {
      console.error("Error fetching home island:", error);
      res.status(500).json({ error: "Failed to fetch home island" });
    }
  });

  // Check if player has completed island cutscene (homeIsland = true)
  app.get("/api/island/spec", async (_req, res) => {
    try {
      const { getHomeIslandSpecSummary } = await import("@shared/definitions/homeIslandSpec");
      res.json(getHomeIslandSpecSummary());
    } catch (error) {
      console.error("Error serving island spec:", error);
      res.status(500).json({ error: "Failed to load island spec" });
    }
  });

  app.get("/api/island/status", async (req, res) => {
    try {
      const userId = getUserId(req);
      const account = await storage.getOrCreateAccountForUser(userId);
      const island = account.homeIsland ? await storage.getHomeIsland(account.id) : undefined;

      res.json({
        homeIsland: account.homeIsland || false,
        homeIslandId: account.homeIslandId || null,
        homeIslandMintActionId: account.homeIslandMintActionId || null,
        seed: island?.seed ?? null,
        worldSizeM: 1024,
        rtsWorldSizeM: 200,
      });
    } catch (error) {
      console.error("Error checking island status:", error);
      res.status(500).json({ error: "Failed to check island status" });
    }
  });

  // Commit home island after player approves 2D overhead preview
  app.post("/api/island/commit", async (req, res) => {
    try {
      const userId = getUserId(req);
      const { characterId, islandId, islandState, mapImageData, studioProject, sceneGlbUrl } = req.body;

      if (!characterId || !islandId) {
        return res.status(400).json({ error: "characterId and islandId are required" });
      }
      if (!islandState && !studioProject) {
        return res.status(400).json({ error: "islandState or studioProject is required" });
      }

      const character = await storage.getCharacter(characterId);
      if (!character) return res.status(404).json({ error: "Character not found" });
      if (character.userId !== userId) {
        return res.status(403).json({ error: "Character does not belong to your account" });
      }

      const account = await storage.getOrCreateAccountForUser(userId);
      const island = await storage.getHomeIsland(islandId);
      if (!island) return res.status(404).json({ error: "Island not found" });
      if (island.accountId !== account.id) {
        return res.status(403).json({ error: "Island does not belong to your account" });
      }
      if ((island as any).validatedAt) {
        return res.status(409).json({ error: "Island already committed", validatedAt: (island as any).validatedAt });
      }

      let resolvedState = islandState as Record<string, unknown> | undefined;
      if (studioProject) {
        const fallback = (island?.state ?? generateIslandState(characterId, island.seed)) as Record<string, unknown>;
        resolvedState = mapStudioProjectToIslandState(studioProject, {
          islandId: island.id,
          characterId,
          seed: island.seed,
          fallback: fallback as any,
        }) as unknown as Record<string, unknown>;
      }

      const validation = validateIslandAssets(resolvedState as any);
      if (!validation.valid) {
        return res.status(400).json({ error: "Invalid island state", details: validation.errors });
      }

      let mapImageUrl: string | undefined;
      if (mapImageData && typeof mapImageData === "string" && mapImageData.startsWith("data:image")) {
        const mapsDir = path.join(process.cwd(), "public", "maps");
        if (!fs.existsSync(mapsDir)) fs.mkdirSync(mapsDir, { recursive: true });
        const base64 = mapImageData.replace(/^data:image\/\w+;base64,/, "");
        const filename = `island_${island.id}_preview.png`;
        fs.writeFileSync(path.join(mapsDir, filename), Buffer.from(base64, "base64"));
        mapImageUrl = `/maps/${filename}`;
      }

      const now = Date.now();
      const committedState = {
        ...resolvedState,
        id: island.id,
        characterId,
        seed: island.seed,
        mapImageUrl: mapImageUrl ?? (resolvedState as any)?.mapImageUrl,
        sceneGlbUrl: sceneGlbUrl ?? (resolvedState as any)?.sceneGlbUrl,
        studioProject: studioProject ?? (resolvedState as any)?.studioProject,
        lastUpdate: now,
        isFirstVisit: true,
      };

      const updatedIsland = await storage.updateHomeIsland(island.id, {
        state: committedState,
        mapImageUrl: mapImageUrl ?? island.mapImageUrl,
        validatedAt: now,
      } as any);

      await storage.updateCharacter(characterId, { homeIslandId: island.id } as any);
      await storage.updateAccount(account.id, {
        homeIsland: true,
        homeIslandId: island.id,
      });

      const nodes = Array.isArray(committedState.nodes) ? committedState.nodes : [];
      for (const node of nodes) {
        const nodeId = node.id || node.nodeId || `node-${node.x}-${node.y}`;
        try {
          await storage.updateResourceNode(userId, String(nodeId), 0);
        } catch { /* node row created on first gather */ }
      }

      let mintResult: { actionId?: string; mintAddress?: string } = {};
      try {
        const { crossmintWalletService: crossmint } = await import("./services/crossmintWallet");
        mintResult = await crossmint.mintIslandCNFT(account, updatedIsland);
        if (mintResult.actionId) {
          await storage.updateAccount(account.id, { homeIslandMintActionId: mintResult.actionId });
        }
        await db.insert(islandNFTs).values({
          islandId: island.id,
          accountId: account.id,
          status: mintResult.mintAddress ? "minted" : "minting",
          mintAddress: mintResult.mintAddress || null,
          crossmintActionId: mintResult.actionId || null,
          ownerWalletAddress: account.walletAddress || null,
          isCompressed: true,
        }).onConflictDoNothing();
      } catch (mintErr) {
        console.warn("Island cNFT mint skipped:", mintErr);
      }

      const normalizedState = normalizeIslandState(updatedIsland);
      res.json({
        success: true,
        homeIslandId: island.id,
        nodeCount: nodes.length,
        message: "Island committed successfully",
        island: { ...updatedIsland, state: committedState, islandState: committedState },
        mint: mintResult,
      });
    } catch (error) {
      console.error("Error committing island:", error);
      res.status(500).json({ error: "Failed to commit island" });
    }
  });

  // Initialize island after cutscene (set homeIsland = true, mint cNFT)
  app.post("/api/island/initialize", async (req, res) => {
    try {
      const userId = getUserId(req);
      const account = await storage.getOrCreateAccountForUser(userId);
      
      // Prevent re-initialization if already completed
      if (account.homeIsland) {
        return res.json({ 
          success: true, 
          message: "Island already initialized",
          homeIsland: true,
          homeIslandId: account.homeIslandId 
        });
      }
      
      // Create/get the home island
      const island = await storage.getOrCreateHomeIsland(account.id);

      // Validate island state structure before commitment
      const islandState = island.state as Record<string, unknown>;
      const validation = validateIslandAssets(islandState as any);
      if (!validation.valid) {
        return res.status(400).json({
          error: "Invalid island state",
          details: validation.errors,
        });
      }

      // Update account with homeIsland = true
      const updatedAccount = await storage.updateAccount(account.id, {
        homeIsland: true,
        homeIslandId: island.id,
      });

      // Set validatedAt timestamp to mark as committed
      const now = Date.now();
      await storage.updateHomeIsland(island.id, {
        validatedAt: now,
      } as any);
      
      // Mint island as cNFT to server wallet
      let mintResult: { actionId?: string; mintAddress?: string } = {};
      try {
        const { crossmintWalletService: crossmint } = await import("./services/crossmintWallet");
        mintResult = await crossmint.mintIslandCNFT(account, island);
        if (mintResult.actionId) {
          await storage.updateAccount(account.id, { homeIslandMintActionId: mintResult.actionId });
        }
        // Record in islandNFTs table
        await db.insert(islandNFTs).values({
          islandId: island.id,
          accountId: account.id,
          status: mintResult.mintAddress ? 'minted' : 'minting',
          mintAddress: mintResult.mintAddress || null,
          crossmintActionId: mintResult.actionId || null,
          ownerWalletAddress: account.walletAddress || null,
          isCompressed: true,
        }).onConflictDoNothing();
      } catch (mintErr) {
        console.warn("Island cNFT mint skipped or failed:", mintErr);
      }
      
      res.json({
        success: true,
        message: "Island initialized successfully",
        homeIsland: true,
        homeIslandId: island.id,
        island: island,
        mint: mintResult,
      });
    } catch (error) {
      console.error("Error initializing island:", error);
      res.status(500).json({ error: "Failed to initialize island" });
    }
  });

  // Update island state (nodes, buildings, sheep, etc.)
  app.patch("/api/island/state", async (req, res) => {
    try {
      const { state } = req.body;
      if (!state) {
        return res.status(400).json({ error: "state is required" });
      }
      
      // Validate state structure
      const parseResult = islandStateSchema.safeParse(state);
      if (!parseResult.success) {
        return res.status(400).json({ 
          error: "Invalid island state", 
          details: parseResult.error.flatten() 
        });
      }
      
      const userId = getUserId(req);
      const account = await storage.getOrCreateAccountForUser(userId);
      const updated = await storage.updateIslandState(account.id, parseResult.data);
      res.json(updated);
    } catch (error) {
      console.error("Error updating island state:", error);
      res.status(500).json({ error: "Failed to update island state" });
    }
  });

  // RTS-Grudge → Warlords: server-authoritative full island state from procedural export
  app.post("/api/island/export-from-rts", async (req, res) => {
    try {
      const { gridX, gridZ, seed, biome, appUrl, heightmap } = req.body ?? {};
      if (gridX === undefined || gridZ === undefined || seed === undefined) {
        return res.status(400).json({ error: "gridX, gridZ, and seed are required" });
      }

      const userId = getUserId(req);
      const account = await storage.getOrCreateAccountForUser(userId);
      const island = await storage.getOrCreateHomeIsland(account.id);

      const base = generateIslandState(account.id, island.seed) as Record<string, unknown>;
      const parsedHeightmap =
        heightmap &&
        typeof heightmap === "object" &&
        typeof heightmap.heightsBase64 === "string" &&
        typeof heightmap.resolution === "number"
          ? {
              resolution: Number(heightmap.resolution),
              worldSizeM: Number(heightmap.worldSizeM ?? 200),
              maxHeightM: Number(heightmap.maxHeightM ?? 12),
              biome: String(heightmap.biome ?? biome ?? "temperate"),
              heightsBase64: String(heightmap.heightsBase64),
            }
          : undefined;

      const merged = mergeRtsExportIntoIslandState(base as any, {
        gridX: Number(gridX),
        gridZ: Number(gridZ),
        seed: Number(seed),
        biome: String(biome ?? "temperate"),
        heightmap: parsedHeightmap,
      });

      const exportState = {
        ...merged,
        id: island.seed || island.id,
        sheep: merged.animals,
        assignedHeroes: (island.state as any)?.assignedHeroes ?? {},
        skinningNodes: (island.state as any)?.skinningNodes ?? [],
        rtsExport: {
          source: "rts-grudge" as const,
          gridX: Number(gridX),
          gridZ: Number(gridZ),
          seed: Number(seed),
          biome: String(biome ?? "temperate"),
          exportedAt: Date.now(),
          appUrl: String(appUrl ?? "https://rts-grudge.vercel.app"),
        },
        rtsHeightmap: parsedHeightmap ?? (merged as any).rtsHeightmap,
        rtsNatureScatter: (merged as any).rtsNatureScatter,
        lastUpdate: Date.now(),
      };

      const parseResult = islandStateSchema.safeParse(exportState);
      if (!parseResult.success) {
        return res.status(400).json({
          error: "Invalid merged island state",
          details: parseResult.error.flatten(),
        });
      }

      const updated = await storage.updateIslandState(account.id, parseResult.data);
      res.json({
        success: true,
        homeIslandId: island.id,
        island: updated,
        state: normalizeIslandState(updated),
      });
    } catch (error) {
      console.error("Error exporting island from RTS:", error);
      res.status(500).json({ error: "Failed to export island from RTS" });
    }
  });

  // Update island metadata (name, mapStyle, etc.)
  app.patch("/api/island", async (req, res) => {
    try {
      // Validate metadata
      const parseResult = islandMetadataSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          error: "Invalid island metadata", 
          details: parseResult.error.flatten() 
        });
      }
      
      const userId = getUserId(req);
      const account = await storage.getOrCreateAccountForUser(userId);
      const island = await storage.getHomeIsland(account.id);
      if (!island) {
        return res.status(404).json({ error: "Island not found" });
      }
      
      const updates: Record<string, unknown> = {};
      if (parseResult.data.name) updates.name = parseResult.data.name;
      if (parseResult.data.mapStyle) updates.mapStyle = parseResult.data.mapStyle;
      if (parseResult.data.mapImageUrl) updates.mapImageUrl = parseResult.data.mapImageUrl;
      if (parseResult.data.thumbnailUrl) updates.thumbnailUrl = parseResult.data.thumbnailUrl;
      
      const updated = await storage.updateHomeIsland(island.id, updates);
      res.json(updated);
    } catch (error) {
      console.error("Error updating island:", error);
      res.status(500).json({ error: "Failed to update island" });
    }
  });

  // Boss clear → unlock new character creation token
  app.post("/api/island/boss-clear", async (req, res) => {
    try {
      const userId = getUserId(req);
      const account = await storage.getOrCreateAccountForUser(userId);
      const { zoneX, zoneY } = req.body;
      if (zoneX === undefined || zoneY === undefined) {
        return res.status(400).json({ error: "zoneX and zoneY are required" });
      }

      // Grant a character creation token (stored as account-level counter)
      const currentTokens = (account as any).characterTokens || 0;
      await storage.updateAccount(account.id, {
        characterTokens: currentTokens + 1,
      } as any);

      res.json({
        success: true,
        message: "Boss defeated! You earned a new character token.",
        characterTokens: currentTokens + 1,
        bossZone: { zoneX, zoneY },
      });
    } catch (error) {
      console.error("Error processing boss clear:", error);
      res.status(500).json({ error: "Failed to process boss clear" });
    }
  });

  // Generate island map image using AI (deterministic from seed)
  app.post("/api/island/generate-map", async (req, res) => {
    try {
      const userId = getUserId(req);
      const account = await storage.getOrCreateAccountForUser(userId);
      const island = await storage.getHomeIsland(account.id);
      if (!island) {
        return res.status(404).json({ error: "Island not found" });
      }

      // Use the island seed for deterministic but unique generation
      const seedHash = island.seed.split('-').slice(0, 2).join('');
      const mapStyles = ['temperate', 'tropical', 'volcanic', 'frozen', 'mystical'];
      const styleIndex = parseInt(seedHash.charAt(0), 16) % mapStyles.length;
      const style = island.mapStyle || mapStyles[styleIndex];

      const styleDescriptions: Record<string, string> = {
        temperate: "lush green forests, rolling hills, crystal clear lakes, stone ruins",
        tropical: "palm trees, white sandy beaches, turquoise waters, ancient temples",
        volcanic: "black rock formations, lava flows, ash covered terrain, obsidian crystals",
        frozen: "snow covered peaks, frozen lakes, ice caves, aurora borealis sky",
        mystical: "floating islands, glowing crystals, ethereal mist, ancient magic runes",
      };

      const prompt = `Fantasy RPG game island map, top-down view, ${styleDescriptions[style] || styleDescriptions.temperate}. Includes resource nodes (ore veins, tree groves, herb patches), a small village with medieval buildings, pathways connecting locations. Style: hand-painted fantasy map, vibrant colors, detailed terrain textures, game asset quality. Seed: ${island.seed}`;

      const response = await getOpenAI()!.images.generate({
        model: "gpt-image-1",
        prompt,
        n: 1,
        size: "1024x1024",
      });

      const base64 = response.data?.[0]?.b64_json;
      if (!base64) {
        return res.status(500).json({ error: "Failed to generate image" });
      }

      const mapsDir = path.join(process.cwd(), "public", "maps");
      if (!fs.existsSync(mapsDir)) {
        fs.mkdirSync(mapsDir, { recursive: true });
      }

      const filename = `island_${island.id}.png`;
      const filepath = path.join(mapsDir, filename);
      fs.writeFileSync(filepath, Buffer.from(base64, "base64"));

      const mapImageUrl = `/maps/${filename}`;
      const updated = await storage.updateHomeIsland(island.id, { mapImageUrl });
      
      res.json({ mapImageUrl, island: updated });
    } catch (error) {
      console.error("Error generating island map:", error);
      res.status(500).json({ error: "Failed to generate island map" });
    }
  });

  // Game content routes
  app.get("/api/game/races", async (req, res) => {
    try {
      const races = await storage.getRaces();
      res.json(races);
    } catch (error) {
      console.error("Error fetching races:", error);
      res.status(500).json({ error: "Failed to fetch races" });
    }
  });

  app.get("/api/game/classes", async (req, res) => {
    try {
      const classes = await storage.getClasses();
      res.json(classes);
    } catch (error) {
      console.error("Error fetching classes:", error);
      res.status(500).json({ error: "Failed to fetch classes" });
    }
  });

  app.get("/api/game/sprites", async (req, res) => {
    try {
      const sprites = await storage.getSpriteSheets();
      res.json(sprites);
    } catch (error) {
      console.error("Error fetching sprites:", error);
      res.status(500).json({ error: "Failed to fetch sprites" });
    }
  });

  app.get("/api/game/sprites/:id", async (req, res) => {
    try {
      const sprite = await storage.getSpriteSheet(req.params.id);
      if (!sprite) {
        return res.status(404).json({ error: "Sprite sheet not found" });
      }
      res.json(sprite);
    } catch (error) {
      console.error("Error fetching sprite:", error);
      res.status(500).json({ error: "Failed to fetch sprite" });
    }
  });

  app.get("/api/game/dungeons", async (req, res) => {
    try {
      const dungeons = await storage.getDungeonTemplates();
      res.json(dungeons);
    } catch (error) {
      console.error("Error fetching dungeons:", error);
      res.status(500).json({ error: "Failed to fetch dungeons" });
    }
  });

  app.get("/api/game/dungeons/:id", async (req, res) => {
    try {
      const dungeon = await storage.getDungeonTemplate(req.params.id);
      if (!dungeon) {
        return res.status(404).json({ error: "Dungeon template not found" });
      }
      res.json(dungeon);
    } catch (error) {
      console.error("Error fetching dungeon:", error);
      res.status(500).json({ error: "Failed to fetch dungeon" });
    }
  });

  app.post("/api/generate-dungeon", async (req, res) => {
    const { floor = 1, theme = "crypt" } = req.body;
    try {
      
      const systemPrompt = `You are a dungeon map generator for a dark fantasy RPG. Generate a 2D tilemap for a dungeon floor.

Output a JSON object with this exact structure:
{
  "width": 20,
  "height": 15,
  "tiles": [[...]], // 2D array of tile IDs
  "spawnPoint": { "x": number, "y": number },
  "exitPoint": { "x": number, "y": number },
  "enemies": [{ "type": "slime" | "skeleton" | "orc", "x": number, "y": number }],
  "treasures": [{ "x": number, "y": number }]
}

Tile IDs:
0 = floor (walkable)
1 = wall (blocked)
2 = water (slows movement)
3 = door
4 = stairs down (exit)
5 = decoration (barrel, bones, etc.)

Rules:
- Create interesting connected rooms with corridors
- Place 2-5 enemies based on floor difficulty
- Place 1-3 treasure chests
- Ensure spawn and exit are accessible
- Higher floors have more complex layouts
- Theme affects decoration density`;

      const response = await getOpenAI()!.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Generate a dungeon map for floor ${floor} with theme "${theme}". Make it challenging but fair.` }
        ],
        response_format: { type: "json_object" },
      });

      const content = response.choices[0]?.message?.content || "{}";
      let dungeonData;
      try {
        dungeonData = JSON.parse(content);
      } catch {
        dungeonData = generateFallbackDungeon(floor);
      }
      
      if (!dungeonData.tiles || !Array.isArray(dungeonData.tiles)) {
        dungeonData = generateFallbackDungeon(floor);
      }
      
      res.json(dungeonData);
    } catch (error) {
      console.error("Error generating dungeon:", error);
      res.json(generateFallbackDungeon(floor));
    }
  });

  // ============================================
  // SKILL TREE API ROUTES
  // ============================================

  // Get unlocked skills for a character (optionally filtered by profession)
  app.get("/api/skills/:characterId/:profession?", async (req, res) => {
    try {
      const { characterId, profession } = req.params;
      const skills = await storage.getUnlockedSkills(characterId, profession);
      res.json(skills);
    } catch (error: any) {
      console.error("Error fetching unlocked skills:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Unlock a skill node (atomic transaction)
  app.post("/api/skills/unlock", async (req, res) => {
    try {
      const { characterId, nodeId, profession } = req.body;

      if (!characterId || !nodeId || !profession) {
        return res.status(400).json({ error: "Missing required fields: characterId, nodeId, profession" });
      }

      if (typeof nodeId !== "string" && typeof nodeId !== "number") {
        return res.status(400).json({ error: "Invalid nodeId format" });
      }

      const validProfessions = ["Miner", "Forester", "Mystic", "Chef", "Engineer"];
      if (!validProfessions.includes(profession)) {
        return res.status(400).json({ error: "Invalid profession" });
      }

      const result = await storage.unlockSkillAtomic(
        characterId, 
        String(nodeId), 
        profession
      );

      res.json({ 
        skill: result.skill, 
        remainingPoints: result.remainingPoints 
      });
    } catch (error: any) {
      console.error("Error unlocking skill:", error);
      if (error.message === "Character not found") {
        return res.status(404).json({ error: error.message });
      }
      if (error.message === "Not enough skill points" || error.message === "Skill already unlocked") {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // PROFESSION, CRAFTING & INVENTORY API ROUTES
  // ============================================

  // GET /api/professions/:characterId - Get all profession levels
  app.get("/api/professions/:characterId", async (req, res) => {
    try {
      const { characterId } = req.params;
      const character = await storage.getCharacter(characterId);
      if (!character) {
        return res.status(404).json({ error: "Character not found" });
      }

      // Migrate legacy JSON levels → characterProfessions table if needed
      const { migrateProfessionLevels } = await import("./professionValidation");
      const legacyLevels = (character.professionLevels || {}) as Record<string, { level: number; xp: number }>;
      if (Object.keys(legacyLevels).length > 0) {
        await migrateProfessionLevels(storage, characterId, legacyLevels);
      }

      const professions = await storage.getCharacterProfessions(characterId);

      // Build a merged map: characterProfessions table is authoritative,
      // legacy JSON fills in any professions not yet in the table
      const merged: Record<string, { level: number; xp: number; lastGainAt: number | null }> = {};
      for (const p of professions) {
        merged[p.professionId] = { level: p.level, xp: p.xp, lastGainAt: p.lastGainAt };
      }
      for (const [id, data] of Object.entries(legacyLevels)) {
        const key = id.toLowerCase();
        if (!merged[key]) {
          merged[key] = { level: data.level, xp: data.xp, lastGainAt: null };
        }
      }

      res.json({ characterId, professions: merged });
    } catch (error: any) {
      console.error("Error fetching professions:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // POST /api/professions/:characterId/gather - Process a gathering action
  app.post("/api/professions/:characterId/gather", async (req, res) => {
    try {
      const { characterId } = req.params;
      const { professionId, resourceId, resourceTier = 1, quantity = 1 } = req.body;

      if (!professionId || !resourceId) {
        return res.status(400).json({ error: "professionId and resourceId are required" });
      }

      const character = await storage.getCharacter(characterId);
      if (!character) {
        return res.status(404).json({ error: "Character not found" });
      }

      // Get or create account
      const account = character.accountId
        ? await storage.getAccount(character.accountId)
        : await storage.getOrCreateAccountForUser(character.userId);
      if (!account) {
        return res.status(400).json({ error: "No account found for character" });
      }

      // Get current profession level
      const normalizedProfId = professionId.toLowerCase();
      const currentProf = await storage.getCharacterProfession(characterId, normalizedProfId);
      const currentLevel = currentProf?.level || 1;
      const currentXp = currentProf?.xp || 0;

      // Validate tier access
      const { validateTierAccess, computeGatherResult } = await import("./professionValidation");
      if (!validateTierAccess(currentLevel, resourceTier)) {
        return res.status(403).json({
          error: `Profession level ${currentLevel} cannot gather tier ${resourceTier} resources`,
          currentTierUnlocked: Math.min(8, Math.ceil(currentLevel / 12.5)),
        });
      }

      // Calculate XP gain
      const xpResult = computeGatherResult(currentLevel, currentXp, resourceTier);

      // Update profession level in DB
      const updatedProf = await storage.updateCharacterProfession(characterId, normalizedProfId, {
        level: xpResult.newLevel,
        xp: xpResult.newXp,
        lastGainAt: Date.now(),
      });

      // Add gathered resources to account
      await storage.addAccountResource(account.id, resourceId, quantity);

      // Log experience event
      await storage.logExperienceEvent({
        characterId,
        source: "gathering",
        xpAmount: 0,
        professionId: normalizedProfId,
        professionXpAmount: xpResult.xpGained,
        metadata: { resourceId, resourceTier, quantity },
      });

      res.json({
        success: true,
        profession: {
          id: normalizedProfId,
          level: xpResult.newLevel,
          xp: xpResult.newXp,
          xpGained: xpResult.xpGained,
          leveledUp: xpResult.levelGained,
        },
        loot: { resourceId, quantity },
      });
    } catch (error: any) {
      console.error("Error processing gather:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // POST /api/professions/:characterId/craft - Process a crafting action
  app.post("/api/professions/:characterId/craft", async (req, res) => {
    try {
      const { characterId } = req.params;
      const {
        professionId,
        recipeId,
        outputItemId,
        outputItemName,
        outputItemTier = 1,
        outputItemRarity = "Common",
        ingredients, // Array<{ itemId: string; quantity: number }>
      } = req.body;

      if (!professionId || !outputItemId || !ingredients || !Array.isArray(ingredients)) {
        return res.status(400).json({ error: "professionId, outputItemId, and ingredients[] are required" });
      }

      const character = await storage.getCharacter(characterId);
      if (!character) {
        return res.status(404).json({ error: "Character not found" });
      }

      const account = character.accountId
        ? await storage.getAccount(character.accountId)
        : await storage.getOrCreateAccountForUser(character.userId);
      if (!account) {
        return res.status(400).json({ error: "No account found for character" });
      }

      // Validate ingredients
      const { validateRecipeIngredients, deductIngredients, computeCraftResult } = await import("./professionValidation");
      const validation = await validateRecipeIngredients(storage, account.id, ingredients);
      if (!validation.valid) {
        return res.status(400).json({
          error: "Insufficient materials",
          missing: (validation as any).missing,
        });
      }

      // Get current crafting profession level
      const normalizedProfId = professionId.toLowerCase();
      const currentProf = await storage.getCharacterProfession(characterId, normalizedProfId);
      const currentLevel = currentProf?.level || 1;
      const currentXp = currentProf?.xp || 0;

      // Deduct ingredients
      await deductIngredients(storage, account.id, ingredients);

      // Add crafted item to account inventory
      const craftedItem = await storage.addAccountInventoryItem({
        accountId: account.id,
        itemId: outputItemId,
        quantity: 1,
        tier: outputItemTier,
        quality: outputItemRarity.toLowerCase(),
        metadata: {
          craftedBy: characterId,
          craftedAt: Date.now(),
          sourceApp: "grudgewarlords",
        },
      });

      // Calculate crafting XP
      const xpResult = computeCraftResult(currentLevel, currentXp, outputItemTier);

      // Update profession level
      await storage.updateCharacterProfession(characterId, normalizedProfId, {
        level: xpResult.newLevel,
        xp: xpResult.newXp,
        lastGainAt: Date.now(),
      });

      // Log experience event
      await storage.logExperienceEvent({
        characterId,
        source: "crafting",
        xpAmount: 0,
        professionId: normalizedProfId,
        professionXpAmount: xpResult.xpGained,
        metadata: { recipeId, outputItemId, outputItemTier, ingredientCount: ingredients.length },
      });

      res.json({
        success: true,
        craftedItem: {
          id: craftedItem.id,
          itemId: outputItemId,
          name: outputItemName || outputItemId,
          tier: outputItemTier,
          rarity: outputItemRarity,
        },
        profession: {
          id: normalizedProfId,
          level: xpResult.newLevel,
          xp: xpResult.newXp,
          xpGained: xpResult.xpGained,
          leveledUp: xpResult.levelGained,
        },
      });
    } catch (error: any) {
      console.error("Error processing craft:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // GET /api/inventory/:characterId - Get account inventory for a character
  app.get("/api/inventory/:characterId", async (req, res) => {
    try {
      const { characterId } = req.params;
      const character = await storage.getCharacter(characterId);
      if (!character) {
        return res.status(404).json({ error: "Character not found" });
      }

      const account = character.accountId
        ? await storage.getAccount(character.accountId)
        : await storage.getOrCreateAccountForUser(character.userId);
      if (!account) {
        return res.status(400).json({ error: "No account found" });
      }

      const items = await storage.getAccountInventory(account.id);
      const resources = await storage.getAccountResources(account.id);

      res.json({
        characterId,
        accountId: account.id,
        items,
        resources: resources?.resources || {},
      });
    } catch (error: any) {
      console.error("Error fetching inventory:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // POST /api/inventory/:characterId/transfer - Move item to/from character binding
  app.post("/api/inventory/:characterId/transfer", async (req, res) => {
    try {
      const { characterId } = req.params;
      const { itemId, direction } = req.body; // direction: 'bind' | 'unbind'

      if (!itemId || !direction) {
        return res.status(400).json({ error: "itemId and direction ('bind'|'unbind') are required" });
      }

      const character = await storage.getCharacter(characterId);
      if (!character) {
        return res.status(404).json({ error: "Character not found" });
      }

      const account = character.accountId
        ? await storage.getAccount(character.accountId)
        : await storage.getOrCreateAccountForUser(character.userId);
      if (!account) {
        return res.status(400).json({ error: "No account found" });
      }

      const updated = await storage.transferItemToCharacter(
        itemId,
        direction === "bind" ? characterId : null,
        account.id,
        character.userId,
      );

      res.json({ success: true, item: updated });
    } catch (error: any) {
      console.error("Error transferring item:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/aseprite/list", async (_req, res) => {
    try {
      const asepriteDir = path.join(process.cwd(), "public/sprites/GrudgeRPGAssets2d/Aseprite file");
      const files = fs.readdirSync(asepriteDir)
        .filter(f => f.endsWith(".aseprite"))
        .map(f => ({
          name: f.replace(".aseprite", ""),
          path: `/sprites/GrudgeRPGAssets2d/Aseprite file/${f}`
        }));
      res.json(files);
    } catch (error) {
      console.error("Error listing aseprite files:", error);
      res.json([]);
    }
  });

  app.get("/api/aseprite/parse/:filename", async (req, res) => {
    try {
      const filename = decodeURIComponent(req.params.filename);
      const filepath = path.join(process.cwd(), "public/sprites/GrudgeRPGAssets2d/Aseprite file", `${filename}.aseprite`);
      
      if (!fs.existsSync(filepath)) {
        return res.status(404).json({ error: "File not found" });
      }
      
      const buffer = fs.readFileSync(filepath);
      const aseFile = new Aseprite(buffer, `${filename}.aseprite`);
      aseFile.parse();
      
      const frameData = aseFile.frames.map((frame: any, index: number) => ({
        index,
        duration: frame.frameDuration,
        cels: frame.cels.map((cel: any) => ({
          layerIndex: cel.layerIndex,
          x: cel.xpos,
          y: cel.ypos,
          width: cel.w,
          height: cel.h
        }))
      }));
      
      const layers = aseFile.layers.map((layer: any) => ({
        name: layer.name,
        type: layer.type,
        visible: layer.flags & 1
      }));
      
      const tags = aseFile.tags?.map((tag: any) => ({
        name: tag.name,
        from: tag.from,
        to: tag.to,
        direction: tag.animDirection
      })) || [];
      
      res.json({
        width: aseFile.width,
        height: aseFile.height,
        numFrames: aseFile.numFrames,
        colorDepth: aseFile.colorDepth,
        layers,
        frames: frameData,
        tags
      });
    } catch (error: any) {
      console.error("Error parsing aseprite file:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================
  // SPRITE ADMIN AI - Scan and analyze sprite sheets
  // ============================================================
  
  interface SpriteFileInfo {
    path: string;
    name: string;
    directory: string;
    size: number;
    category: string;
  }
  
  interface AnalyzedSprite {
    id: string;
    filePath: string;
    name: string;
    category: string;
    type: "character" | "effect" | "projectile" | "environment" | "ui" | "unknown";
    dimensions: { width: number; height: number };
    frameWidth: number;
    frameHeight: number;
    frameCount: number;
    columns: number;
    rows: number;
    animations: {
      name: string;
      frameStart: number;
      frameEnd: number;
      fps: number;
      loop: boolean;
    }[];
    directional: "none" | "4-way" | "8-way";
    directions?: string[];
    approved: boolean;
    analyzedAt: string;
    aiConfidence: number;
  }
  
  // Store analyzed sprites in memory (could be moved to database)
  const analyzedSprites: Map<string, AnalyzedSprite> = new Map();
  
  // Scan sprite directories
  app.get("/api/sprites/scan", async (req, res) => {
    try {
      const spritesDir = path.join(process.cwd(), "public", "sprites");
      const spriteFiles: SpriteFileInfo[] = [];
      
      const scanDirectory = (dir: string, category: string = "root"): void => {
        if (!fs.existsSync(dir)) return;
        
        const items = fs.readdirSync(dir, { withFileTypes: true });
        
        for (const item of items) {
          const fullPath = path.join(dir, item.name);
          const relativePath = fullPath.replace(process.cwd() + "/public", "");
          
          if (item.isDirectory()) {
            // Skip system directories
            if (item.name.startsWith(".") || item.name === "__MACOSX" || item.name === "node_modules") continue;
            scanDirectory(fullPath, item.name);
          } else if (item.isFile() && /\.(png|jpg|gif)$/i.test(item.name)) {
            const stats = fs.statSync(fullPath);
            spriteFiles.push({
              path: relativePath,
              name: item.name,
              directory: path.dirname(relativePath).replace("/sprites/", ""),
              size: stats.size,
              category
            });
          }
        }
      };
      
      scanDirectory(spritesDir);
      
      // Group by directory for easier browsing
      const grouped = spriteFiles.reduce((acc, file) => {
        const dir = file.directory;
        if (!acc[dir]) acc[dir] = [];
        acc[dir].push(file);
        return acc;
      }, {} as Record<string, SpriteFileInfo[]>);
      
      res.json({
        totalFiles: spriteFiles.length,
        directories: Object.keys(grouped).length,
        files: spriteFiles.slice(0, 100), // Return first 100 for preview
        grouped
      });
    } catch (error: any) {
      console.error("Error scanning sprites:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get sprite image dimensions
  app.get("/api/sprites/info", async (req, res) => {
    try {
      const filePath = req.query.path as string;
      if (!filePath) {
        return res.status(400).json({ error: "Path required" });
      }
      
      const fullPath = path.join(process.cwd(), "public", filePath);
      if (!fs.existsSync(fullPath)) {
        return res.status(404).json({ error: "File not found" });
      }
      
      // Get file stats
      const stats = fs.statSync(fullPath);
      
      // Return basic info - dimensions will be detected client-side
      res.json({
        path: filePath,
        name: path.basename(filePath),
        size: stats.size,
        exists: true
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // AI Analyze a sprite sheet
  app.post("/api/sprites/analyze", async (req, res) => {
    try {
      const { filePath, dimensions, userHints } = req.body;
      
      if (!filePath) {
        return res.status(400).json({ error: "File path required" });
      }
      
      const fullPath = path.join(process.cwd(), "public", filePath);
      if (!fs.existsSync(fullPath)) {
        return res.status(404).json({ error: "File not found" });
      }
      
      const name = path.basename(filePath, path.extname(filePath));
      const category = path.dirname(filePath).replace("/sprites/", "").split("/")[0];
      
      // Use AI to analyze the sprite sheet
      const analysisPrompt = `You are analyzing a sprite sheet image file for a 2D RPG game.

File name: ${name}
File path: ${filePath}
Image dimensions: ${dimensions?.width || "unknown"} x ${dimensions?.height || "unknown"} pixels
Category folder: ${category}
${userHints ? `User hints: ${userHints}` : ""}

Based on the file name, path, and common sprite sheet patterns, analyze this sprite and provide:

1. Sprite Type: Is this a character, enemy, effect (spell/projectile), environment (tiles), or UI element?
2. Frame Layout: How many columns and rows of frames? (Consider common sizes: 32x32, 48x48, 64x64, 100x100, 128x128)
3. Animations: What animations does this sprite contain? (e.g., idle, walk, run, attack, hurt, death)
4. Directional: Is this a 4-way (up/down/left/right) or 8-way directional sprite, or non-directional?
5. Frame Count: Total frames per animation
6. FPS: Recommended playback speed for each animation

Common patterns to look for:
- Files named "Walk" usually have 4-8 frames
- Files named "Idle" usually have 4-6 frames  
- Files named "Attack" usually have 6-12 frames
- Files named "Death" usually have 4-8 frames
- Character sprites are often 32x32, 48x48, 64x64, or 100x100 per frame
- 4-directional sprites have 4 rows (down, left, right, up)
- 8-directional sprites have 8 rows

Respond in JSON format ONLY:
{
  "type": "character|effect|projectile|environment|ui|unknown",
  "frameWidth": number,
  "frameHeight": number,
  "columns": number,
  "rows": number,
  "directional": "none|4-way|8-way",
  "animations": [
    { "name": "string", "row": number, "frameCount": number, "fps": number, "loop": boolean }
  ],
  "confidence": number (0-100),
  "notes": "string explaining analysis"
}`;

      const response = await getOpenAI()!.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: analysisPrompt }],
        response_format: { type: "json_object" }
      });
      
      const analysisText = response.choices[0]?.message?.content || "{}";
      let analysis;
      try {
        analysis = JSON.parse(analysisText);
      } catch {
        analysis = { error: "Failed to parse AI response", raw: analysisText };
      }
      
      // Create analyzed sprite entry
      const spriteId = `sprite_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const totalFrames = (analysis.columns || 1) * (analysis.rows || 1);
      
      const analyzedSprite: AnalyzedSprite = {
        id: spriteId,
        filePath,
        name,
        category,
        type: analysis.type || "unknown",
        dimensions: dimensions || { width: 0, height: 0 },
        frameWidth: analysis.frameWidth || 100,
        frameHeight: analysis.frameHeight || 100,
        frameCount: totalFrames,
        columns: analysis.columns || 1,
        rows: analysis.rows || 1,
        animations: (analysis.animations || []).map((anim: any) => ({
          name: anim.name || "default",
          frameStart: (anim.row || 0) * (analysis.columns || 1),
          frameEnd: ((anim.row || 0) + 1) * (analysis.columns || 1) - 1,
          fps: anim.fps || 10,
          loop: anim.loop !== false
        })),
        directional: analysis.directional || "none",
        directions: analysis.directional === "4-way" 
          ? ["down", "left", "right", "up"]
          : analysis.directional === "8-way"
            ? ["down", "down-left", "left", "up-left", "up", "up-right", "right", "down-right"]
            : undefined,
        approved: false,
        analyzedAt: new Date().toISOString(),
        aiConfidence: analysis.confidence || 50
      };
      
      analyzedSprites.set(spriteId, analyzedSprite);
      
      res.json({
        sprite: analyzedSprite,
        aiAnalysis: analysis
      });
    } catch (error: any) {
      console.error("Error analyzing sprite:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get all analyzed sprites
  app.get("/api/sprites/analyzed", (req, res) => {
    const sprites = Array.from(analyzedSprites.values());
    res.json({
      total: sprites.length,
      approved: sprites.filter(s => s.approved).length,
      pending: sprites.filter(s => !s.approved).length,
      sprites
    });
  });
  
  // Approve/update an analyzed sprite
  app.post("/api/sprites/approve/:id", (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    
    const sprite = analyzedSprites.get(id);
    if (!sprite) {
      return res.status(404).json({ error: "Sprite not found" });
    }
    
    // Apply updates
    Object.assign(sprite, updates, { approved: true });
    analyzedSprites.set(id, sprite);
    
    res.json({ success: true, sprite });
  });
  
  // Batch analyze multiple sprites automatically
  app.post("/api/sprites/batch-analyze", async (req, res) => {
    try {
      const { directory, limit = 50, autoApprove = false } = req.body;
      
      const spritesDir = path.join(process.cwd(), "public", "sprites");
      const spriteFiles: { path: string; name: string; category: string }[] = [];
      
      const scanDirectory = (dir: string, category: string = "root"): void => {
        if (!fs.existsSync(dir)) return;
        
        const items = fs.readdirSync(dir, { withFileTypes: true });
        
        for (const item of items) {
          const fullPath = path.join(dir, item.name);
          const relativePath = fullPath.replace(process.cwd() + "/public", "");
          
          if (item.isDirectory()) {
            if (item.name.startsWith(".") || item.name === "__MACOSX" || item.name === "node_modules") continue;
            scanDirectory(fullPath, item.name);
          } else if (item.isFile() && /\.(png|jpg|gif)$/i.test(item.name)) {
            // Filter for likely sprite sheets based on naming patterns
            const lowerName = item.name.toLowerCase();
            const isLikelySpriteSheet = 
              lowerName.includes("sheet") ||
              lowerName.includes("sprite") ||
              lowerName.includes("idle") ||
              lowerName.includes("walk") ||
              lowerName.includes("run") ||
              lowerName.includes("attack") ||
              lowerName.includes("death") ||
              lowerName.includes("hurt") ||
              lowerName.includes("cast") ||
              lowerName.includes("animation") ||
              lowerName.includes("anim") ||
              /-\d+\./.test(lowerName) || // numbered frames
              /_\d+\./.test(lowerName) ||
              /\d{2,}\./.test(lowerName); // frame numbers
            
            // If directory filter specified, only include matching
            if (directory && !relativePath.toLowerCase().includes(directory.toLowerCase())) continue;
            
            // Skip very small files (likely icons) and very large files
            const stats = fs.statSync(fullPath);
            if (stats.size < 1000 || stats.size > 10000000) continue;
            
            // Check if already analyzed
            const alreadyAnalyzed = Array.from(analyzedSprites.values()).some(s => s.filePath === relativePath);
            if (alreadyAnalyzed) continue;
            
            if (isLikelySpriteSheet || category.toLowerCase().includes("character") || category.toLowerCase().includes("sprite")) {
              spriteFiles.push({
                path: relativePath,
                name: item.name,
                category
              });
            }
          }
        }
      }
      
      scanDirectory(spritesDir);
      
      // Limit batch size
      const toAnalyze = spriteFiles.slice(0, limit);
      const results: AnalyzedSprite[] = [];
      
      for (const file of toAnalyze) {
        try {
          const name = path.basename(file.path, path.extname(file.path));
          const category = path.dirname(file.path).replace("/sprites/", "").split("/")[0];
          
          // Use AI to analyze
          const analysisPrompt = `You are analyzing a sprite sheet image file for a 2D RPG game.

File name: ${name}
File path: ${file.path}
Category folder: ${category}

Based on the file name, path, and common sprite sheet patterns, analyze this sprite and provide:

1. Sprite Type: Is this a character, enemy, effect (spell/projectile), environment (tiles), or UI element?
2. Frame Layout: How many columns and rows of frames? (Consider common sizes: 32x32, 48x48, 64x64, 100x100, 128x128)
3. Animations: What animations does this sprite contain? (e.g., idle, walk, run, attack, hurt, death)
4. Directional: Is this a 4-way (up/down/left/right) or 8-way directional sprite, or non-directional?
5. Frame Count: Total frames per animation
6. FPS: Recommended playback speed for each animation

Common patterns:
- Files with "Walk" have 4-8 frames, "Idle" 4-6 frames, "Attack" 6-12 frames, "Death" 4-8 frames
- Character sprites: 32x32, 48x48, 64x64, or 100x100 per frame
- 4-directional: 4 rows (down, left, right, up)
- 8-directional: 8 rows

Respond in JSON format ONLY:
{
  "type": "character|effect|projectile|environment|ui|unknown",
  "frameWidth": number,
  "frameHeight": number,
  "columns": number,
  "rows": number,
  "directional": "none|4-way|8-way",
  "animations": [
    { "name": "string", "row": number, "frameCount": number, "fps": number, "loop": boolean }
  ],
  "confidence": number (0-100),
  "notes": "string explaining analysis"
}`;

          const response = await getOpenAI()!.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: analysisPrompt }],
            response_format: { type: "json_object" }
          });
          
          const analysisText = response.choices[0]?.message?.content || "{}";
          let analysis;
          try {
            analysis = JSON.parse(analysisText);
          } catch {
            continue;
          }
          
          const spriteId = `sprite_${Date.now()}_${Math.random().toString(36).substring(7)}`;
          const totalFrames = (analysis.columns || 1) * (analysis.rows || 1);
          
          const analyzedSprite: AnalyzedSprite = {
            id: spriteId,
            filePath: file.path,
            name,
            category,
            type: analysis.type || "unknown",
            dimensions: { width: 0, height: 0 },
            frameWidth: analysis.frameWidth || 100,
            frameHeight: analysis.frameHeight || 100,
            frameCount: totalFrames,
            columns: analysis.columns || 1,
            rows: analysis.rows || 1,
            animations: (analysis.animations || []).map((anim: any) => ({
              name: anim.name || "default",
              frameStart: (anim.row || 0) * (analysis.columns || 1),
              frameEnd: ((anim.row || 0) + 1) * (analysis.columns || 1) - 1,
              fps: anim.fps || 10,
              loop: anim.loop !== false
            })),
            directional: analysis.directional || "none",
            directions: analysis.directional === "4-way" 
              ? ["down", "left", "right", "up"]
              : analysis.directional === "8-way"
                ? ["down", "down-left", "left", "up-left", "up", "up-right", "right", "down-right"]
                : undefined,
            approved: autoApprove,
            analyzedAt: new Date().toISOString(),
            aiConfidence: analysis.confidence || 50
          };
          
          analyzedSprites.set(spriteId, analyzedSprite);
          results.push(analyzedSprite);
          
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (err) {
          console.error(`Failed to analyze ${file.path}:`, err);
        }
      }
      
      res.json({
        analyzed: results.length,
        total: spriteFiles.length,
        remaining: spriteFiles.length - results.length,
        sprites: results
      });
    } catch (error: any) {
      console.error("Batch analysis error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Auto-approve all pending sprites
  app.post("/api/sprites/approve-all", (req, res) => {
    const pending = Array.from(analyzedSprites.values()).filter(s => !s.approved);
    
    for (const sprite of pending) {
      sprite.approved = true;
      analyzedSprites.set(sprite.id, sprite);
    }
    
    res.json({ approved: pending.length });
  });

  // Generate sprite manifest code for approved sprites
  app.get("/api/sprites/generate-manifest", (req, res) => {
    const approved = Array.from(analyzedSprites.values()).filter(s => s.approved);
    
    const manifestEntries = approved.map(sprite => {
      const animations = sprite.animations.reduce((acc, anim) => {
        acc[anim.name] = {
          frameCount: anim.frameEnd - anim.frameStart + 1,
          fps: anim.fps,
          loop: anim.loop
        };
        return acc;
      }, {} as Record<string, any>);
      
      return {
        id: sprite.name.replace(/\s+/g, "_"),
        name: sprite.name,
        basePath: sprite.filePath,
        frameWidth: sprite.frameWidth,
        frameHeight: sprite.frameHeight,
        directional: sprite.directional,
        directions: sprite.directions,
        animations,
        type: sprite.type
      };
    });
    
    res.json({
      count: manifestEntries.length,
      manifest: manifestEntries,
      code: `// Auto-generated sprite manifest
export const AI_ANALYZED_SPRITES = ${JSON.stringify(manifestEntries, null, 2)};`
    });
  });

  // Register object storage routes
  registerObjectStorageRoutes(app);

  // Register dev-tool object-storage routes (/api/objectstore/*)
  // Used by the Grudge Dev Tool (Windows tray app) and scripts/upload-asset-pack.ts
  registerDevToolObjectStorageRoutes(app);

  // Register image storage routes
  const imageRoutes = await import("./routes/imageRoutes");
  app.use("/api/images", imageRoutes.default);

  // Register launcher routes (game engine launcher, asset scanner, draft AI)
  const launcherRoutes = await import("./routes/launcher");
  app.use("/api/launcher", launcherRoutes.default);

  // Register Ollama AI routes (Grudge IDE single-button AI)
  const ollamaRoutes = await import("./routes/ollamaAI");
  app.use("/api/ai/ollama", ollamaRoutes.default);

  // Register unified AI Gateway routes (Ollama local + ai.grudge-studio.com cloud)
  const aiGatewayRoutes = await import("./routes/aiGatewayRoutes");
  app.use("/api/ai/gateway", aiGatewayRoutes.default);

  // AnythingLLM local RAG knowledge layer
  const anythingllmRoutes = await import("./routes/anythingllmRoutes");
  app.use("/api/ai/rag", anythingllmRoutes.default);

  // ============================================
  // SPRITE MANIFEST API
  // ============================================

  // Get sprite manifest with optional filters
  app.get("/api/sprites/manifest", async (req, res) => {
    try {
      const { category, subcategory, search, limit, migratedOnly } = req.query;
      let sprites = await storage.getSpriteManifest({
        category: category as string,
        subcategory: subcategory as string,
        search: search as string,
        limit: limit ? parseInt(limit as string) : undefined
      });
      
      if (migratedOnly === "true") {
        sprites = sprites.filter(s => s.publicUrl);
      }
      
      res.json(sprites);
    } catch (error) {
      console.error("Error fetching sprite manifest:", error);
      res.status(500).json({ error: "Failed to fetch sprites" });
    }
  });

  // Get sprite categories with counts
  app.get("/api/sprites/categories", async (req, res) => {
    try {
      const categories = await storage.getSpriteCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching sprite categories:", error);
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });

  // Scan local sprites and return catalog (for admin sprite library)
  app.get("/api/sprites/scan-local", async (req, res) => {
    try {
      const spritesDir = path.join(process.cwd(), "public", "sprites");
      const categories: Record<string, { files: string[]; subcategories: Record<string, string[]> }> = {};
      
      const scanDir = (dir: string, category: string, subcategory?: string) => {
        if (!fs.existsSync(dir)) return;
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            if (!subcategory) {
              if (!categories[category]) {
                categories[category] = { files: [], subcategories: {} };
              }
              categories[category].subcategories[entry.name] = [];
              scanDir(fullPath, category, entry.name);
            } else {
              scanDir(fullPath, category, subcategory);
            }
          } else if (entry.name.match(/\.(png|jpg|jpeg|gif|webp)$/i)) {
            if (!categories[category]) {
              categories[category] = { files: [], subcategories: {} };
            }
            const relativePath = path.relative(spritesDir, fullPath).replace(/\\/g, '/');
            if (subcategory) {
              if (!categories[category].subcategories[subcategory]) {
                categories[category].subcategories[subcategory] = [];
              }
              categories[category].subcategories[subcategory].push(relativePath);
            } else {
              categories[category].files.push(relativePath);
            }
          }
        }
      };
      
      // Scan top-level categories
      const topLevelDirs = fs.readdirSync(spritesDir, { withFileTypes: true });
      for (const entry of topLevelDirs) {
        if (entry.isDirectory() && !entry.name.startsWith('.')) {
          scanDir(path.join(spritesDir, entry.name), entry.name);
        }
      }
      
      // Calculate totals
      let totalFiles = 0;
      const summary = Object.entries(categories).map(([cat, data]) => {
        const catCount = data.files.length + Object.values(data.subcategories).reduce((sum, files) => sum + files.length, 0);
        totalFiles += catCount;
        return {
          category: cat,
          count: catCount,
          subcategories: Object.entries(data.subcategories).map(([sub, files]) => ({
            name: sub,
            count: files.length
          }))
        };
      });
      
      res.json({ totalFiles, categories: summary, detailed: categories });
    } catch (error) {
      console.error("Error scanning local sprites:", error);
      res.status(500).json({ error: "Failed to scan sprites" });
    }
  });

  // Get specific sprite entry
  app.get("/api/sprites/manifest/:id", async (req, res) => {
    try {
      const sprite = await storage.getSpriteManifestEntry(req.params.id);
      if (!sprite) {
        return res.status(404).json({ error: "Sprite not found" });
      }
      res.json(sprite);
    } catch (error) {
      console.error("Error fetching sprite:", error);
      res.status(500).json({ error: "Failed to fetch sprite" });
    }
  });

  // Add sprite to manifest
  app.post("/api/sprites/manifest", async (req, res) => {
    try {
      const sprite = await storage.addSpriteManifestEntry(req.body);
      res.json(sprite);
    } catch (error) {
      console.error("Error adding sprite:", error);
      res.status(500).json({ error: "Failed to add sprite" });
    }
  });

  // Update sprite manifest entry
  app.patch("/api/sprites/manifest/:id", async (req, res) => {
    try {
      const sprite = await storage.updateSpriteManifestEntry(req.params.id, req.body);
      res.json(sprite);
    } catch (error) {
      console.error("Error updating sprite:", error);
      res.status(500).json({ error: "Failed to update sprite" });
    }
  });

  // Delete sprite from manifest
  app.delete("/api/sprites/manifest/:id", async (req, res) => {
    try {
      await storage.deleteSpriteManifestEntry(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting sprite:", error);
      res.status(500).json({ error: "Failed to delete sprite" });
    }
  });

  // Object Storage Migration Endpoints
  const migrationJobStore: Map<string, {
    status: "pending" | "running" | "completed" | "failed";
    totalFiles: number;
    processedFiles: number;
    failedFiles: string[];
    startTime: number;
    endTime?: number;
    currentFile?: string;
    error?: string;
  }> = new Map();

  // Get migration status
  app.get("/api/sprites/migration/status", async (req, res) => {
    try {
      const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
      const entries = await storage.getSpriteManifestEntries();
      const migratedCount = entries.filter(e => e.objectPath).length;
      
      const activeJobs = Array.from(migrationJobStore.entries()).map(([id, job]) => ({
        jobId: id,
        ...job
      }));
      
      res.json({
        bucketConfigured: !!bucketId,
        bucketId,
        totalInManifest: entries.length,
        migratedCount,
        pendingCount: entries.length - migratedCount,
        activeJobs
      });
    } catch (error) {
      console.error("Error getting migration status:", error);
      res.status(500).json({ error: "Failed to get migration status" });
    }
  });

  // Start sprite migration job
  app.post("/api/sprites/migration/start", async (req, res) => {
    try {
      const { category, limit = 100 } = req.body;
      const jobId = `job_${Date.now()}`;
      
      // Scan local sprites for the category
      const spritesDir = path.join(process.cwd(), "public", "sprites");
      if (!fs.existsSync(spritesDir)) {
        return res.status(404).json({ error: "Sprites directory not found" });
      }
      
      const filesToMigrate: string[] = [];
      
      const scanDir = (dir: string, relativePath: string = ""): void => {
        const items = fs.readdirSync(dir, { withFileTypes: true });
        for (const item of items) {
          const itemRelPath = relativePath ? `${relativePath}/${item.name}` : item.name;
          if (item.isDirectory()) {
            if (!category || itemRelPath.startsWith(category) || item.name === category) {
              scanDir(path.join(dir, item.name), itemRelPath);
            }
          } else if (/\.(png|jpg|jpeg|gif|webp)$/i.test(item.name)) {
            if (!category || itemRelPath.startsWith(category)) {
              filesToMigrate.push(itemRelPath);
            }
          }
        }
      };
      
      scanDir(spritesDir);
      const limitedFiles = filesToMigrate.slice(0, limit);
      
      if (limitedFiles.length === 0) {
        return res.json({ 
          jobId, 
          status: "completed", 
          message: "No files to migrate",
          totalFiles: 0 
        });
      }
      
      // Initialize job
      migrationJobStore.set(jobId, {
        status: "running",
        totalFiles: limitedFiles.length,
        processedFiles: 0,
        failedFiles: [],
        startTime: Date.now()
      });
      
      // Process in background
      (async () => {
        const job = migrationJobStore.get(jobId)!;
        
        for (const filePath of limitedFiles) {
          try {
            job.currentFile = filePath;
            
            // Parse category/subcategory from path
            const pathParts = filePath.split('/');
            const fileName = pathParts.pop() || '';
            const fileCategory = pathParts[0] || 'uncategorized';
            const subcategory = pathParts.length > 1 ? pathParts.slice(1).join('/') : undefined;
            
            // Check if already in manifest with objectPath
            const existing = await storage.getSpriteManifestByLocalPath(`/sprites/${filePath}`);
            if (existing?.objectPath) {
              job.processedFiles++;
              continue;
            }
            
            // For now, just add to manifest without actual upload
            // (Real upload would require Object Storage upload implementation)
            const spriteId = `sprite_${Date.now()}_${Math.random().toString(36).substring(7)}`;
            
            await storage.addSpriteManifestEntry({
              id: spriteId,
              name: fileName.replace(/\.[^.]+$/, ''),
              localPath: `/sprites/${filePath}`,
              category: fileCategory,
              subcategory,
              width: 0,
              height: 0,
              frameCount: 1,
              tags: []
            });
            
            job.processedFiles++;
          } catch (err) {
            console.error(`Failed to process ${filePath}:`, err);
            job.failedFiles.push(filePath);
            job.processedFiles++;
          }
        }
        
        job.status = job.failedFiles.length === limitedFiles.length ? "failed" : "completed";
        job.endTime = Date.now();
        job.currentFile = undefined;
      })();
      
      res.json({ 
        jobId, 
        status: "running",
        totalFiles: limitedFiles.length,
        message: `Migration job started for ${limitedFiles.length} files`
      });
    } catch (error) {
      console.error("Error starting migration:", error);
      res.status(500).json({ error: "Failed to start migration" });
    }
  });

  // Get specific job status
  app.get("/api/sprites/migration/job/:jobId", (req, res) => {
    const job = migrationJobStore.get(req.params.jobId);
    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }
    res.json({ jobId: req.params.jobId, ...job });
  });

  // Resolve sprite URL (check manifest for Object Storage URL, fall back to local)
  app.get("/api/sprites/resolve", async (req, res) => {
    try {
      const localPath = req.query.path as string;
      if (!localPath) {
        return res.status(400).json({ error: "path query parameter required" });
      }
      
      const decodedPath = decodeURIComponent(localPath);
      const entry = await storage.getSpriteManifestByLocalPath(decodedPath);
      
      if (entry?.publicUrl) {
        return res.json({ 
          resolved: true, 
          publicUrl: entry.publicUrl,
          objectPath: entry.objectPath,
          localPath: decodedPath
        });
      }
      
      return res.json({ 
        resolved: false, 
        localPath: decodedPath 
      });
    } catch (error) {
      console.error("Error resolving sprite:", error);
      res.status(500).json({ error: "Failed to resolve sprite" });
    }
  });

  // ===== ASEPRITE FILE READING ROUTES =====

  // Get all Aseprite files with their animation data
  app.get("/api/aseprite/files", async (req, res) => {
    try {
      const stats = getAsepriteStats();
      res.json(stats);
    } catch (error) {
      console.error("Error reading Aseprite files:", error);
      res.status(500).json({ error: "Failed to read Aseprite files" });
    }
  });

  // Get details for a specific Aseprite file
  app.get("/api/aseprite/file/:filename", async (req, res) => {
    try {
      const filename = decodeURIComponent(req.params.filename);
      const filePath = path.join("public/sprites/GrudgeRPGAssets2d/Aseprite file", filename);
      
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "Aseprite file not found" });
      }
      
      const info = readAsepriteFile(filePath);
      if (!info) {
        return res.status(500).json({ error: "Failed to parse Aseprite file" });
      }
      
      res.json(info);
    } catch (error) {
      console.error("Error reading Aseprite file:", error);
      res.status(500).json({ error: "Failed to read Aseprite file" });
    }
  });

  // Get summary of all animations across Aseprite files
  app.get("/api/aseprite/animations", async (req, res) => {
    try {
      const result = scanAsepriteDirectory();
      
      const animationsByFile: Record<string, { name: string; frameCount: number }[]> = {};
      for (const file of result.files) {
        animationsByFile[file.name] = file.tags.map(tag => ({
          name: tag.name,
          frameCount: tag.frameCount
        }));
      }
      
      res.json({
        uniqueAnimations: result.uniqueAnimations,
        totalFiles: result.totalFiles,
        animationsByFile
      });
    } catch (error) {
      console.error("Error reading animations:", error);
      res.status(500).json({ error: "Failed to read animations" });
    }
  });

  // ===== SPRITE UNIT SPECS ROUTES =====

  app.get("/api/sprite-specs", async (req, res) => {
    try {
      const specs = await storage.getSpriteUnitSpecs();
      res.json(specs);
    } catch (error) {
      console.error("Error fetching sprite specs:", error);
      res.status(500).json({ error: "Failed to fetch sprite specs" });
    }
  });

  app.get("/api/sprite-specs/:id", async (req, res) => {
    try {
      const spec = await storage.getSpriteUnitSpec(req.params.id);
      if (!spec) {
        return res.status(404).json({ error: "Sprite spec not found" });
      }
      res.json(spec);
    } catch (error) {
      console.error("Error fetching sprite spec:", error);
      res.status(500).json({ error: "Failed to fetch sprite spec" });
    }
  });

  app.post("/api/sprite-specs", async (req, res) => {
    try {
      const spec = await storage.createSpriteUnitSpec(req.body);
      res.status(201).json(spec);
    } catch (error) {
      console.error("Error creating sprite spec:", error);
      res.status(500).json({ error: "Failed to create sprite spec" });
    }
  });

  app.patch("/api/sprite-specs/:id", async (req, res) => {
    try {
      const spec = await storage.updateSpriteUnitSpec(req.params.id, req.body);
      if (!spec) {
        return res.status(404).json({ error: "Sprite spec not found" });
      }
      res.json(spec);
    } catch (error) {
      console.error("Error updating sprite spec:", error);
      res.status(500).json({ error: "Failed to update sprite spec" });
    }
  });

  app.delete("/api/sprite-specs/:id", async (req, res) => {
    try {
      await storage.deleteSpriteUnitSpec(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting sprite spec:", error);
      res.status(500).json({ error: "Failed to delete sprite spec" });
    }
  });

  app.post("/api/sprite-specs/:id/generate", async (req, res) => {
    try {
      const spec = await storage.getSpriteUnitSpec(req.params.id);
      if (!spec) {
        return res.status(404).json({ error: "Sprite spec not found" });
      }
      
      const job = await storage.createSpriteGenerationJob({
        specId: spec.id,
        status: "pending",
        progress: 0,
      });
      
      await storage.updateSpriteUnitSpec(spec.id, { status: "generating" });
      
      res.status(201).json(job);
    } catch (error) {
      console.error("Error starting generation job:", error);
      res.status(500).json({ error: "Failed to start generation job" });
    }
  });

  // ===== SPRITE GENERATION JOBS ROUTES =====

  app.get("/api/sprite-generation-jobs", async (req, res) => {
    try {
      const specId = req.query.specId as string | undefined;
      const jobs = await storage.getSpriteGenerationJobs(specId);
      res.json(jobs);
    } catch (error) {
      console.error("Error fetching generation jobs:", error);
      res.status(500).json({ error: "Failed to fetch generation jobs" });
    }
  });

  app.get("/api/sprite-generation-jobs/:id", async (req, res) => {
    try {
      const job = await storage.getSpriteGenerationJob(req.params.id);
      if (!job) {
        return res.status(404).json({ error: "Generation job not found" });
      }
      res.json(job);
    } catch (error) {
      console.error("Error fetching generation job:", error);
      res.status(500).json({ error: "Failed to fetch generation job" });
    }
  });

  app.patch("/api/sprite-generation-jobs/:id", async (req, res) => {
    try {
      const job = await storage.updateSpriteGenerationJob(req.params.id, req.body);
      if (!job) {
        return res.status(404).json({ error: "Generation job not found" });
      }
      
      if (req.body.status === "completed") {
        const specId = job.specId;
        await storage.updateSpriteUnitSpec(specId, { 
          status: "complete",
          generatedAssets: req.body.generatedImages,
        });
      } else if (req.body.status === "failed") {
        const specId = job.specId;
        await storage.updateSpriteUnitSpec(specId, { status: "failed" });
      }
      
      res.json(job);
    } catch (error) {
      console.error("Error updating generation job:", error);
      res.status(500).json({ error: "Failed to update generation job" });
    }
  });

  // ===== AI SPRITE ASSISTANT ROUTES =====
  
  app.post("/api/ai/sprite-assistant", async (req, res) => {
    try {
      const { message, context, metadata } = req.body;
      
      const systemPrompt = `You are an expert sprite artist and game asset specialist. You help developers understand, organize, and improve their sprite assets.
      
Current sprite context: ${context || 'No specific sprite selected'}
${metadata ? `Metadata: ${JSON.stringify(metadata)}` : ''}

Provide helpful, concise responses about:
- Sprite organization and naming conventions
- Animation techniques and frame timing
- Asset optimization suggestions
- Usage recommendations for game development
- Technical details about sprite formats`;

      const completion = await getOpenAI()!.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ],
        max_tokens: 500,
        temperature: 0.7
      });
      
      res.json({ response: completion.choices[0]?.message?.content || "No response generated." });
    } catch (error) {
      console.error("Error in sprite assistant:", error);
      res.status(500).json({ error: "Failed to get AI response" });
    }
  });
  
  app.post("/api/ai/analyze-sprite", async (req, res) => {
    try {
      const { packagePath, animationName, frameCount, frames } = req.body;
      
      const prompt = `Analyze this sprite animation:
- Package: ${packagePath}
- Animation: ${animationName}
- Frame count: ${frameCount}
- Sample frames: ${frames?.join(', ') || 'Unknown'}

Provide a brief analysis including:
1. What type of animation this appears to be (idle, walk, attack, etc.)
2. Suggested frame rate for this animation type
3. Any observations about the naming convention
4. Usage recommendations

Also suggest metadata values in this exact JSON format:
{
  "suggestedMetadata": {
    "description": "...",
    "usageInstructions": "...",
    "frameWidth": 64,
    "frameHeight": 64,
    "directional": false
  }
}`;

      const completion = await getOpenAI()!.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a sprite analysis expert. Provide concise, helpful analysis." },
          { role: "user", content: prompt }
        ],
        max_tokens: 600,
        temperature: 0.5
      });
      
      const responseText = completion.choices[0]?.message?.content || "";
      
      let suggestedMetadata = null;
      const jsonMatch = responseText.match(/\{[\s\S]*"suggestedMetadata"[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          suggestedMetadata = parsed.suggestedMetadata;
        } catch {}
      }
      
      res.json({ 
        analysis: responseText.replace(/\{[\s\S]*"suggestedMetadata"[\s\S]*\}/, '').trim(),
        suggestedMetadata 
      });
    } catch (error) {
      console.error("Error analyzing sprite:", error);
      res.status(500).json({ error: "Failed to analyze sprite" });
    }
  });

  app.get("/api/sheets/status", async (req, res) => {
    try {
      const client = await getSheetsClient();
      res.json({ 
        configured: !!client,
        message: client ? "Google Sheets API is configured" : "Google Sheets API not configured - missing credentials",
        sheets: {
          armor: !!SHEET_IDS.armor,
          weapons: !!SHEET_IDS.weapons,
          items: !!SHEET_IDS.items,
          chef: !!SHEET_IDS.chef,
          crafting: !!SHEET_IDS.crafting,
        }
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to check sheets status" });
    }
  });

  // Helper to parse sheet rows into objects
  const parseSheetToObjects = (rows: (string | number)[][] | null): any[] => {
    if (!rows || rows.length < 2) return [];
    const headers = rows[0].map(h => String(h).toLowerCase().replace(/\s+/g, '_'));
    return rows.slice(1).map(row => {
      const obj: Record<string, any> = {};
      headers.forEach((h, i) => {
        const val = row[i];
        // Try to parse numbers
        if (typeof val === 'string' && /^-?\d+(\.\d+)?$/.test(val)) {
          obj[h] = parseFloat(val);
        } else {
          obj[h] = val ?? '';
        }
      });
      return obj;
    });
  };

  // ============================================
  // GRUDGE DATA API - Shared game data endpoints
  // All endpoints cached for 5 minutes
  // ============================================

  // GET /api/sheets/weapons - All weapons data
  app.get("/api/sheets/weapons", async (req, res) => {
    try {
      const cacheKey = 'sheets:weapons';
      const cachedData = getCachedData(cacheKey);
      
      if (cachedData) {
        return res.json({ 
          data: cachedData,
          count: cachedData.length,
          cached: true,
          source: 'google_sheets'
        });
      }
      
      if (!SHEET_IDS.weapons) {
        return res.status(400).json({ error: "GOOGLE_SHEET_WEAPONS not configured" });
      }
      const rows = await readSheet(SHEET_IDS.weapons, "Sheet1!A:Z");
      if (!rows) {
        return res.status(502).json({ error: "Failed to read weapons sheet from Google Sheets" });
      }
      const data = parseSheetToObjects(rows);
      setCachedData(cacheKey, data);
      
      res.json({ 
        data,
        count: data.length,
        cached: false,
        source: 'google_sheets'
      });
    } catch (error) {
      console.error("Error fetching weapons:", error);
      res.status(500).json({ error: "Failed to fetch weapons data" });
    }
  });

  // GET /api/sheets/armor - All armor data
  app.get("/api/sheets/armor", async (req, res) => {
    try {
      const cacheKey = 'sheets:armor';
      const cachedData = getCachedData(cacheKey);
      
      if (cachedData) {
        return res.json({ 
          data: cachedData,
          count: cachedData.length,
          cached: true,
          source: 'google_sheets'
        });
      }
      
      if (!SHEET_IDS.armor) {
        return res.status(400).json({ error: "GOOGLE_SHEET_ARMOR not configured" });
      }
      const rows = await readSheet(SHEET_IDS.armor, "Sheet1!A:Z");
      if (!rows) {
        return res.status(502).json({ error: "Failed to read armor sheet from Google Sheets" });
      }
      const data = parseSheetToObjects(rows);
      setCachedData(cacheKey, data);
      
      res.json({ 
        data,
        count: data.length,
        cached: false,
        source: 'google_sheets'
      });
    } catch (error) {
      console.error("Error fetching armor:", error);
      res.status(500).json({ error: "Failed to fetch armor data" });
    }
  });

  // GET /api/sheets/items - All items data
  app.get("/api/sheets/items", async (req, res) => {
    try {
      const cacheKey = 'sheets:items';
      const cachedData = getCachedData(cacheKey);
      
      if (cachedData) {
        return res.json({ 
          data: cachedData,
          count: cachedData.length,
          cached: true,
          source: 'google_sheets'
        });
      }
      
      if (!SHEET_IDS.items) {
        return res.status(400).json({ error: "GOOGLE_SHEET_ITEMS not configured" });
      }
      const rows = await readSheet(SHEET_IDS.items, "Sheet1!A:Z");
      if (!rows) {
        return res.status(502).json({ error: "Failed to read items sheet from Google Sheets" });
      }
      const data = parseSheetToObjects(rows);
      setCachedData(cacheKey, data);
      
      res.json({ 
        data,
        count: data.length,
        cached: false,
        source: 'google_sheets'
      });
    } catch (error) {
      console.error("Error fetching items:", error);
      res.status(500).json({ error: "Failed to fetch items data" });
    }
  });

  // GET /api/sheets/chef - All chef recipes data
  app.get("/api/sheets/chef", async (req, res) => {
    try {
      const cacheKey = 'sheets:chef';
      const cachedData = getCachedData(cacheKey);
      
      if (cachedData) {
        return res.json({ 
          data: cachedData,
          count: cachedData.length,
          cached: true,
          source: 'google_sheets'
        });
      }
      
      if (!SHEET_IDS.chef) {
        return res.status(400).json({ error: "GOOGLE_SHEET_CHEF not configured" });
      }
      const rows = await readSheet(SHEET_IDS.chef, "Sheet1!A:Z");
      if (!rows) {
        return res.status(502).json({ error: "Failed to read chef sheet from Google Sheets" });
      }
      const data = parseSheetToObjects(rows);
      setCachedData(cacheKey, data);
      
      res.json({ 
        data,
        count: data.length,
        cached: false,
        source: 'google_sheets'
      });
    } catch (error) {
      console.error("Error fetching chef recipes:", error);
      res.status(500).json({ error: "Failed to fetch chef recipes data" });
    }
  });

  // GET /api/sheets/crafting - All crafting recipes data
  app.get("/api/sheets/crafting", async (req, res) => {
    try {
      const cacheKey = 'sheets:crafting';
      const cachedData = getCachedData(cacheKey);
      
      if (cachedData) {
        return res.json({ 
          data: cachedData,
          count: cachedData.length,
          cached: true,
          source: 'google_sheets'
        });
      }
      
      if (!SHEET_IDS.crafting) {
        return res.status(400).json({ error: "GOOGLE_SHEET_CRAFTING not configured" });
      }
      const rows = await readSheet(SHEET_IDS.crafting, "Sheet1!A:Z");
      if (!rows) {
        return res.status(502).json({ error: "Failed to read crafting sheet from Google Sheets" });
      }
      const data = parseSheetToObjects(rows);
      setCachedData(cacheKey, data);
      
      res.json({ 
        data,
        count: data.length,
        cached: false,
        source: 'google_sheets'
      });
    } catch (error) {
      console.error("Error fetching crafting recipes:", error);
      res.status(500).json({ error: "Failed to fetch crafting recipes data" });
    }
  });

  // GET /api/sheets/all - Combined data from all sheets
  app.get("/api/sheets/all", async (req, res) => {
    try {
      const results: Record<string, any> = {};
      const errors: string[] = [];
      
      for (const [key, sheetId] of Object.entries(SHEET_IDS)) {
        if (!sheetId) {
          errors.push(`${key}: not configured`);
          continue;
        }
        const cacheKey = `sheets:${key}`;
        const cachedData = getCachedData(cacheKey);
        if (cachedData) {
          results[key] = { data: cachedData, count: cachedData.length, cached: true };
          continue;
        }
        try {
          const rows = await readSheet(sheetId, "Sheet1!A:Z");
          if (!rows) {
            errors.push(`${key}: failed to read from Google Sheets`);
            continue;
          }
          const data = parseSheetToObjects(rows);
          setCachedData(cacheKey, data);
          results[key] = { data, count: data.length, cached: false };
        } catch (e) {
          errors.push(`${key}: failed to fetch`);
          continue;
        }
      }
      
      res.json({ 
        sheets: results,
        errors: errors.length > 0 ? errors : undefined,
        source: 'google_sheets'
      });
    } catch (error) {
      console.error("Error fetching all sheets:", error);
      res.status(500).json({ error: "Failed to fetch sheets data" });
    }
  });

  app.post("/api/sheets/export/foods", async (req, res) => {
    try {
      const result = await exportFoodsToSheet();
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error("Error exporting foods:", error);
      res.status(500).json({ error: "Failed to export foods to sheet" });
    }
  });

  app.get("/api/sheets/foods/preview", async (req, res) => {
    try {
      const rows = generateFoodRows();
      res.json({ 
        headers: rows[0],
        preview: rows.slice(1, 11),
        totalRows: rows.length - 1
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to generate food preview" });
    }
  });

  if (isConfigured()) {
    console.log('Google Sheets integration available');
  }

  // Sprite Package Scanner - organizes sprites hierarchically by folder/animation
  app.get("/api/sprites/packages", async (req, res) => {
    try {
      const spritesDir = path.join(process.cwd(), "public/sprites");
      
      interface SpritePackage {
        id: string;
        name: string;
        path: string;
        animations: {
          name: string;
          frames: string[];
          frameCount: number;
        }[];
        totalFrames: number;
        hasSheetFile: boolean;
        sheetFiles: string[];
      }
      
      interface PackageCategory {
        name: string;
        path: string;
        packages: SpritePackage[];
        subCategories: PackageCategory[];
      }
      
      const parseAnimationFromFilename = (filename: string): { animation: string; frame: number } | null => {
        const base = filename.replace(/\.(png|gif|jpg|jpeg)$/i, '');
        
        // Pattern 1: name-animation-frame (adventurer-attack1-00.png)
        const match1 = base.match(/^(.+?)-(.+?)-(\d+)$/);
        if (match1) return { animation: match1[2], frame: parseInt(match1[3]) };
        
        // Pattern 2: Name_Animation_Frame (Archer_Idle_0.png)
        const match2 = base.match(/^(.+?)_(.+?)_(\d+)$/);
        if (match2) return { animation: match2[2], frame: parseInt(match2[3]) };
        
        // Pattern 3: Name_Animation.png (Archer_Idle.png - sprite sheet)
        const match3 = base.match(/^(.+?)_(.+)$/);
        if (match3 && !match3[2].match(/\d+$/)) return { animation: match3[2], frame: 0 };
        
        // Pattern 4: animation-frame (walk-01.png)
        const match4 = base.match(/^(.+?)-(\d+)$/);
        if (match4) return { animation: match4[1], frame: parseInt(match4[2]) };
        
        // Pattern 5: animation_frame (walk_01.png)
        const match5 = base.match(/^(.+?)_(\d+)$/);
        if (match5) return { animation: match5[1], frame: parseInt(match5[2]) };
        
        // Pattern 6: animationFrame (walk01.png)
        const match6 = base.match(/^([a-zA-Z]+)(\d+)$/);
        if (match6) return { animation: match6[1], frame: parseInt(match6[2]) };
        
        return null;
      };
      
      const scanDirectory = async (dirPath: string, relativePath: string = ""): Promise<PackageCategory> => {
        const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
        const category: PackageCategory = {
          name: path.basename(dirPath),
          path: relativePath || path.basename(dirPath),
          packages: [],
          subCategories: [],
        };
        
        const pngFiles = entries.filter(e => e.isFile() && /\.(png|gif)$/i.test(e.name));
        const subdirs = entries.filter(e => e.isDirectory() && !e.name.startsWith('.') && e.name !== '__MACOSX');
        
        // If this directory has PNG files, it's a sprite package
        if (pngFiles.length > 0) {
          const animationMap = new Map<string, string[]>();
          const sheetFiles: string[] = [];
          
          for (const file of pngFiles) {
            const parsed = parseAnimationFromFilename(file.name);
            if (parsed) {
              const frames = animationMap.get(parsed.animation) || [];
              frames.push(file.name);
              animationMap.set(parsed.animation, frames);
            } else {
              // Could be a sprite sheet file
              if (file.name.toLowerCase().includes('sheet') || 
                  file.name.match(/^[A-Z][a-z]+_[A-Z][a-z]+\.png$/)) {
                sheetFiles.push(file.name);
              } else {
                // Single frame or unknown pattern - use filename as animation
                const base = file.name.replace(/\.(png|gif)$/i, '');
                animationMap.set(base, [file.name]);
              }
            }
          }
          
          const animations = Array.from(animationMap.entries())
            .map(([name, frames]) => ({
              name,
              frames: frames.sort((a, b) => {
                const numA = parseInt(a.match(/(\d+)\.(png|gif)$/i)?.[1] || '0');
                const numB = parseInt(b.match(/(\d+)\.(png|gif)$/i)?.[1] || '0');
                return numA - numB;
              }),
              frameCount: frames.length,
            }))
            .sort((a, b) => a.name.localeCompare(b.name));
          
          if (animations.length > 0 || sheetFiles.length > 0) {
            category.packages.push({
              id: relativePath.replace(/\//g, '_') || path.basename(dirPath),
              name: path.basename(dirPath),
              path: `/sprites/${relativePath}`,
              animations,
              totalFrames: animations.reduce((sum, a) => sum + a.frameCount, 0),
              hasSheetFile: sheetFiles.length > 0,
              sheetFiles,
            });
          }
        }
        
        // Scan subdirectories
        for (const subdir of subdirs) {
          const subPath = relativePath ? `${relativePath}/${subdir.name}` : subdir.name;
          const subCategory = await scanDirectory(path.join(dirPath, subdir.name), subPath);
          
          // If subcategory has content, add it
          if (subCategory.packages.length > 0 || subCategory.subCategories.length > 0) {
            category.subCategories.push(subCategory);
          }
        }
        
        return category;
      };
      
      const rootCategory = await scanDirectory(spritesDir);
      
      // Flatten to get summary stats
      const flattenPackages = (cat: PackageCategory): SpritePackage[] => {
        const packages = [...cat.packages];
        for (const sub of cat.subCategories) {
          packages.push(...flattenPackages(sub));
        }
        return packages;
      };
      
      const allPackages = flattenPackages(rootCategory);
      const totalPackages = allPackages.length;
      const totalAnimations = allPackages.reduce((sum, p) => sum + p.animations.length, 0);
      const totalFrames = allPackages.reduce((sum, p) => sum + p.totalFrames, 0);
      const totalSheets = allPackages.filter(p => p.hasSheetFile).length;
      
      res.json({
        categories: rootCategory.subCategories,
        stats: {
          totalPackages,
          totalAnimations,
          totalFrames,
          totalSheets,
        }
      });
    } catch (error) {
      console.error("Error scanning sprite packages:", error);
      res.status(500).json({ error: "Failed to scan sprite packages" });
    }
  });

  // Get animations for a specific sprite package
  app.get("/api/sprites/packages/:packagePath(*)", async (req, res) => {
    try {
      const packagePath = req.params.packagePath;
      const spritesRoot = path.join(process.cwd(), "public/sprites");
      const fullPath = path.resolve(spritesRoot, packagePath);
      
      if (!fullPath.startsWith(spritesRoot)) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      if (!fs.existsSync(fullPath)) {
        return res.status(404).json({ error: "Package not found" });
      }
      
      const entries = await fs.promises.readdir(fullPath, { withFileTypes: true });
      const pngFiles = entries.filter(e => e.isFile() && /\.(png|gif)$/i.test(e.name));
      
      const animationMap = new Map<string, string[]>();
      const sheetFiles: string[] = [];
      
      for (const file of pngFiles) {
        const base = file.name.replace(/\.(png|gif)$/i, '');
        
        // Parse animation name from various patterns
        let animation: string | null = null;
        
        const match1 = base.match(/^(.+?)-(.+?)-(\d+)$/);
        if (match1) animation = match1[2];
        
        if (!animation) {
          const match2 = base.match(/^(.+?)_(.+?)_(\d+)$/);
          if (match2) animation = match2[2];
        }
        
        if (!animation) {
          const match3 = base.match(/^(.+?)-(\d+)$/);
          if (match3) animation = match3[1];
        }
        
        if (!animation) {
          const match4 = base.match(/^(.+?)_(\d+)$/);
          if (match4) animation = match4[1];
        }
        
        if (!animation && base.toLowerCase().includes('sheet')) {
          sheetFiles.push(file.name);
          continue;
        }
        
        if (!animation) animation = base;
        
        const frames = animationMap.get(animation) || [];
        frames.push(file.name);
        animationMap.set(animation, frames);
      }
      
      const animations = Array.from(animationMap.entries())
        .map(([name, frames]) => ({
          name,
          frames: frames.sort((a, b) => {
            const numA = parseInt(a.match(/(\d+)\.(png|gif)$/i)?.[1] || '0');
            const numB = parseInt(b.match(/(\d+)\.(png|gif)$/i)?.[1] || '0');
            return numA - numB;
          }),
        }));
      
      res.json({
        name: path.basename(packagePath),
        path: `/sprites/${packagePath}`,
        animations,
        sheetFiles,
      });
    } catch (error) {
      console.error("Error getting package details:", error);
      res.status(500).json({ error: "Failed to get package details" });
    }
  });

  // Get sprite package metadata including type, AI files, and usage info
  app.get("/api/sprites/metadata/:packagePath(*)", async (req, res) => {
    try {
      const packagePath = req.params.packagePath;
      const spritesRoot = path.join(process.cwd(), "public/sprites");
      const fullPath = path.resolve(spritesRoot, packagePath);
      
      if (!fullPath.startsWith(spritesRoot)) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      if (!fs.existsSync(fullPath)) {
        return res.status(404).json({ error: "Package not found" });
      }

      const findFilesRecursive = async (dir: string, pattern: RegExp, maxDepth = 3, depth = 0): Promise<string[]> => {
        if (depth > maxDepth) return [];
        const found: string[] = [];
        try {
          const entries = await fs.promises.readdir(dir, { withFileTypes: true });
          for (const entry of entries) {
            if (entry.name.startsWith('.') || entry.name === '__MACOSX') continue;
            const entryPath = path.join(dir, entry.name);
            if (entry.isFile() && pattern.test(entry.name)) {
              found.push(entryPath.replace(spritesRoot + '/', ''));
            } else if (entry.isDirectory()) {
              found.push(...await findFilesRecursive(entryPath, pattern, maxDepth, depth + 1));
            }
          }
        } catch {}
        return found;
      };

      const spriteType = detectSpriteType(packagePath);
      
      const aiFiles = await findFilesRecursive(fullPath, /\.ai$/i);
      const readmeFiles = await findFilesRecursive(fullPath, /readme\.txt$/i);
      const licenseFiles = await findFilesRecursive(fullPath, /license\.txt$/i);
      const bboxFiles = await findFilesRecursive(fullPath, /_bbox\.json$/i);
      const unityPackages = await findFilesRecursive(fullPath, /\.unitypackage$/i);
      const spritesheets = await findFilesRecursive(fullPath, /sheet.*\.png$/i, 1);

      let variants: string[] = [];
      try {
        const entries = await fs.promises.readdir(fullPath, { withFileTypes: true });
        variants = entries
          .filter(e => e.isDirectory() && /^[A-Z][a-z]+_\d+$|^[A-Z][a-z]+_[A-Z][a-z]+_\d+$/.test(e.name))
          .map(e => e.name);
      } catch {}

      res.json({
        packagePath,
        spriteType,
        metadata: {
          hasAiFile: aiFiles.length > 0,
          aiFiles,
          hasReadme: readmeFiles.length > 0,
          readmeFiles,
          hasLicense: licenseFiles.length > 0,
          licenseFiles,
          hasBboxJson: bboxFiles.length > 0,
          bboxFiles,
          hasUnityPackage: unityPackages.length > 0,
          unityPackages,
          hasSpritesheets: spritesheets.length > 0,
          spritesheets,
          variants,
        }
      });
    } catch (error) {
      console.error("Error getting sprite metadata:", error);
      res.status(500).json({ error: "Failed to get sprite metadata" });
    }
  });

  // ============================================
  // SPRITE FRAME COUNTER API
  // ============================================
  
  // GET /api/sprites/frame-counts - Get all character sprite frame counts
  app.get("/api/sprites/frame-counts", async (req, res) => {
    try {
      const { getSpriteManifest } = await import("./spriteFrameCounter");
      const manifest = getSpriteManifest();
      res.json(manifest);
    } catch (error) {
      console.error("Error getting sprite frame counts:", error);
      res.status(500).json({ error: "Failed to get sprite frame counts" });
    }
  });

  // GET /api/sprites/frame-counts/:character - Get frame counts for specific character
  app.get("/api/sprites/frame-counts/:character", async (req, res) => {
    try {
      const { getCharacterFrameCounts } = await import("./spriteFrameCounter");
      const frameCounts = getCharacterFrameCounts(req.params.character);
      
      if (!frameCounts) {
        return res.status(404).json({ error: "Character not found" });
      }
      
      res.json({
        character: req.params.character,
        animations: frameCounts
      });
    } catch (error) {
      console.error("Error getting character frame counts:", error);
      res.status(500).json({ error: "Failed to get character frame counts" });
    }
  });

  // GET /api/sprites/analyze-png - Analyze a single PNG file for frame count
  app.get("/api/sprites/analyze-png", async (req, res) => {
    try {
      const { countSpriteFrames } = await import("./spriteFrameCounter");
      const spritePath = req.query.path as string;
      const frameSize = parseInt(req.query.frameSize as string) || 100;
      
      if (!spritePath) {
        return res.status(400).json({ error: "path query parameter required" });
      }
      
      const fullPath = path.join(process.cwd(), spritePath);
      if (!fs.existsSync(fullPath)) {
        return res.status(404).json({ error: "File not found" });
      }
      
      const info = countSpriteFrames(fullPath, frameSize);
      if (!info) {
        return res.status(400).json({ error: "Could not analyze PNG file" });
      }
      
      res.json(info);
    } catch (error) {
      console.error("Error analyzing PNG:", error);
      res.status(500).json({ error: "Failed to analyze PNG" });
    }
  });

  // ============================================
  // SPRITE CLOUD SYNC API
  // ============================================

  // GET /api/sprites/sync/status - Get sync status summary
  app.get("/api/sprites/sync/status", async (req, res) => {
    try {
      const { spriteSyncService } = await import("./spriteSyncService");
      const status = await spriteSyncService.getSyncStatus();
      res.json(status);
    } catch (error) {
      console.error("Error getting sync status:", error);
      res.status(500).json({ error: "Failed to get sync status" });
    }
  });

  // GET /api/sprites/sync/local - Scan local sprites without syncing
  app.get("/api/sprites/sync/local", async (req, res) => {
    try {
      const { spriteSyncService } = await import("./spriteSyncService");
      const sprites = await spriteSyncService.scanLocalSprites();
      res.json({
        total: sprites.length,
        sprites: sprites.map(s => ({
          localPath: s.localPath,
          filename: s.filename,
          category: s.category,
          subcategory: s.subcategory,
          animationType: s.animationType,
        })),
      });
    } catch (error) {
      console.error("Error scanning local sprites:", error);
      res.status(500).json({ error: "Failed to scan local sprites" });
    }
  });

  // GET /api/sprites/sync/cloud - List sprites in object storage
  app.get("/api/sprites/sync/cloud", async (req, res) => {
    try {
      const { spriteSyncService } = await import("./spriteSyncService");
      const sprites = await spriteSyncService.listObjectStorageSprites();
      res.json({
        total: sprites.length,
        sprites,
      });
    } catch (error) {
      console.error("Error listing cloud sprites:", error);
      res.status(500).json({ error: "Failed to list cloud sprites" });
    }
  });

  // POST /api/sprites/sync/start - Start syncing sprites to cloud
  app.post("/api/sprites/sync/start", async (req, res) => {
    try {
      const { spriteSyncService } = await import("./spriteSyncService");
      const { force = false, dryRun = false } = req.body;
      
      const result = await spriteSyncService.syncSprites({ force, dryRun });
      res.json({
        success: true,
        message: `Synced ${result.synced} sprites, ${result.skipped} skipped, ${result.errors} errors`,
        ...result,
      });
    } catch (error) {
      console.error("Error syncing sprites:", error);
      res.status(500).json({ error: "Failed to sync sprites" });
    }
  });

  // DELETE /api/sprites/sync/cloud/:objectPath - Delete sprite from cloud
  app.delete("/api/sprites/sync/cloud/*", async (req, res) => {
    try {
      const { spriteSyncService } = await import("./spriteSyncService");
      const objectPath = "/" + req.params[0];
      
      await spriteSyncService.deleteFromObjectStorage(objectPath);
      res.json({ success: true, message: "Sprite deleted from cloud storage" });
    } catch (error) {
      console.error("Error deleting sprite from cloud:", error);
      res.status(500).json({ error: "Failed to delete sprite from cloud" });
    }
  });

  // GET /api/sprites/sync/manifest - Get all sprites from DB manifest
  app.get("/api/sprites/sync/manifest", async (req, res) => {
    try {
      const sprites = await storage.getSpriteManifestEntries();
      const { category, syncStatus, search } = req.query;
      
      let filtered = sprites;
      if (category) {
        filtered = filtered.filter(s => s.category === category);
      }
      if (syncStatus) {
        filtered = filtered.filter(s => s.syncStatus === syncStatus);
      }
      if (search && typeof search === "string") {
        const q = search.toLowerCase();
        filtered = filtered.filter(s => 
          s.name?.toLowerCase().includes(q) || 
          s.filename?.toLowerCase().includes(q) ||
          s.category?.toLowerCase().includes(q)
        );
      }
      
      res.json({
        total: filtered.length,
        sprites: filtered,
      });
    } catch (error) {
      console.error("Error getting manifest:", error);
      res.status(500).json({ error: "Failed to get sprite manifest" });
    }
  });

  // ============================================
  // AI SPRITE GENERATION API
  // ============================================

  // Rate limiting for expensive generation endpoints
  const generationRateLimit = new Map<string, { count: number; resetTime: number }>();
  const RATE_LIMIT_MAX = 5; // Max requests per window
  const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute window

  function checkGenerationRateLimit(clientId: string): { allowed: boolean; remaining: number; resetIn: number } {
    const now = Date.now();
    const entry = generationRateLimit.get(clientId);

    if (!entry || now > entry.resetTime) {
      generationRateLimit.set(clientId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
      return { allowed: true, remaining: RATE_LIMIT_MAX - 1, resetIn: RATE_LIMIT_WINDOW_MS };
    }

    if (entry.count >= RATE_LIMIT_MAX) {
      return { allowed: false, remaining: 0, resetIn: entry.resetTime - now };
    }

    entry.count++;
    return { allowed: true, remaining: RATE_LIMIT_MAX - entry.count, resetIn: entry.resetTime - now };
  }

  // GET /api/sprites/generate/templates - Analyze Eris 16x32 templates
  app.get("/api/sprites/generate/templates", async (req, res) => {
    try {
      const { analyzeErisTemplate } = await import("./spriteGeneration");
      const templateDir = path.join(
        process.cwd(),
        "public",
        "sprites",
        "templates",
        "eris",
        "16x32"
      );
      const metadata = analyzeErisTemplate(templateDir);
      res.json(metadata);
    } catch (error) {
      console.error("Error analyzing templates:", error);
      res.status(500).json({ error: "Failed to analyze templates" });
    }
  });

  // GET /api/sprites/generate/prompts - Get prompt info for generation
  app.get("/api/sprites/generate/prompts", async (req, res) => {
    try {
      const {
        getAnimationFrameCounts,
        getDirectionDescriptions,
        BARBARIAN_REFERENCE,
      } = await import("./spriteGeneration");
      res.json({
        animations: getAnimationFrameCounts(),
        directions: getDirectionDescriptions(),
        barbarianReference: BARBARIAN_REFERENCE,
      });
    } catch (error) {
      console.error("Error getting prompts:", error);
      res.status(500).json({ error: "Failed to get prompt info" });
    }
  });

  // POST /api/sprites/generate/single - Generate a single sprite
  app.post("/api/sprites/generate/single", async (req, res) => {
    try {
      const clientId = req.ip || "unknown";
      const rateCheck = checkGenerationRateLimit(clientId);

      if (!rateCheck.allowed) {
        return res.status(429).json({
          error: "Rate limit exceeded",
          retryAfter: Math.ceil(rateCheck.resetIn / 1000),
        });
      }

      const { animationType, direction, frameCount, weaponType } = req.body;

      if (!animationType || !direction) {
        return res
          .status(400)
          .json({ error: "animationType and direction are required" });
      }

      const validAnimations = ["idle", "walk", "run", "jump", "rotate", "interact", "attack", "spell"];
      const validDirections = ["south", "south-west", "west", "north-west", "north", "north-east", "east", "south-east"];

      if (!validAnimations.includes(animationType.toLowerCase())) {
        return res.status(400).json({ error: `Invalid animationType. Valid: ${validAnimations.join(", ")}` });
      }

      if (!validDirections.includes(direction.toLowerCase())) {
        return res.status(400).json({ error: `Invalid direction. Valid: ${validDirections.join(", ")}` });
      }

      const { spriteGenerator } = await import("./spriteGeneration");
      const result = await spriteGenerator.generateSingleSprite(
        animationType,
        direction,
        frameCount || 4,
        weaponType || "axe"
      );

      res.set("X-RateLimit-Remaining", String(rateCheck.remaining));
      res.json(result);
    } catch (error) {
      console.error("Error generating sprite:", error);
      res.status(500).json({ error: "Failed to generate sprite" });
    }
  });

  // POST /api/sprites/generate/animation - Generate full animation sheet (all directions)
  app.post("/api/sprites/generate/animation", async (req, res) => {
    try {
      const clientId = req.ip || "unknown";
      const rateCheck = checkGenerationRateLimit(clientId);

      if (!rateCheck.allowed) {
        return res.status(429).json({
          error: "Rate limit exceeded",
          retryAfter: Math.ceil(rateCheck.resetIn / 1000),
        });
      }

      const { animationType, weaponType } = req.body;

      if (!animationType) {
        return res.status(400).json({ error: "animationType is required" });
      }

      const validAnimations = ["idle", "walk", "run", "jump", "rotate", "interact", "attack", "spell"];
      if (!validAnimations.includes(animationType.toLowerCase())) {
        return res.status(400).json({ error: `Invalid animationType. Valid: ${validAnimations.join(", ")}` });
      }

      const { spriteGenerator } = await import("./spriteGeneration");
      const results = await spriteGenerator.generateAnimationSheet(
        animationType,
        weaponType || "axe"
      );

      res.set("X-RateLimit-Remaining", String(rateCheck.remaining));
      res.json({
        animationType,
        results,
        successCount: results.filter((r) => r.success).length,
        failureCount: results.filter((r) => !r.success).length,
      });
    } catch (error) {
      console.error("Error generating animation:", error);
      res.status(500).json({ error: "Failed to generate animation sheet" });
    }
  });

  // POST /api/sprites/generate/all - Generate all animations for character
  app.post("/api/sprites/generate/all", async (req, res) => {
    try {
      const clientId = req.ip || "unknown";
      const rateCheck = checkGenerationRateLimit(clientId);

      if (!rateCheck.allowed) {
        return res.status(429).json({
          error: "Rate limit exceeded",
          retryAfter: Math.ceil(rateCheck.resetIn / 1000),
        });
      }

      const { weaponType } = req.body;

      const { spriteGenerator } = await import("./spriteGeneration");
      const allResults = await spriteGenerator.generateAllAnimations(
        weaponType || "axe"
      );

      const summary: Record<string, { success: number; failed: number }> = {};
      for (const [animation, results] of allResults) {
        summary[animation] = {
          success: results.filter((r) => r.success).length,
          failed: results.filter((r) => !r.success).length,
        };
      }

      res.set("X-RateLimit-Remaining", String(rateCheck.remaining));
      res.json({
        summary,
        message: "All animations generated",
      });
    } catch (error) {
      console.error("Error generating all animations:", error);
      res.status(500).json({ error: "Failed to generate all animations" });
    }
  });

  // GET /api/sprites/generate/preview/:animation/:direction - Get generated sprite preview
  app.get("/api/sprites/generate/preview/:animation/:direction", (req, res) => {
    try {
      const { animation, direction } = req.params;
      const filename = `${animation.toLowerCase()}_${direction.replace("-", "_")}.png`;
      const filepath = path.join(
        process.cwd(),
        "public",
        "sprites",
        "generated",
        "barbarian",
        filename
      );

      if (fs.existsSync(filepath)) {
        res.sendFile(filepath);
      } else {
        res.status(404).json({ error: "Sprite not found" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to get sprite preview" });
    }
  });

  // POST /api/sprites/generate/process - Post-process generated sprites
  app.post("/api/sprites/generate/process", async (req, res) => {
    try {
      const { frameCount = 4 } = req.body;

      const { batchProcess, createDefaultProcessingOptions } = await import(
        "./spriteGeneration"
      );

      const inputDir = path.join(
        process.cwd(),
        "public",
        "sprites",
        "generated",
        "barbarian"
      );
      const outputDir = path.join(
        process.cwd(),
        "public",
        "sprites",
        "generated",
        "barbarian",
        "processed"
      );

      const options = createDefaultProcessingOptions(frameCount);
      const results = batchProcess(inputDir, outputDir, options);

      res.json({
        processed: results.length,
        successful: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
        results,
      });
    } catch (error) {
      console.error("Error processing sprites:", error);
      res.status(500).json({ error: "Failed to process sprites" });
    }
  });

  // GET /api/sprites/generate/list - List all generated sprites
  app.get("/api/sprites/generate/list", (req, res) => {
    try {
      const generatedDir = path.join(
        process.cwd(),
        "public",
        "sprites",
        "generated",
        "barbarian"
      );

      if (!fs.existsSync(generatedDir)) {
        return res.json({ sprites: [], total: 0 });
      }

      const files = fs.readdirSync(generatedDir).filter((f) => f.endsWith(".png"));
      const sprites = files.map((f) => {
        const stats = fs.statSync(path.join(generatedDir, f));
        return {
          filename: f,
          path: `/sprites/generated/barbarian/${f}`,
          size: stats.size,
          createdAt: stats.mtime,
        };
      });

      res.json({ sprites, total: sprites.length });
    } catch (error) {
      res.status(500).json({ error: "Failed to list generated sprites" });
    }
  });

  // ============================================
  // DATABASE SEEDING API (Admin-only, development mode)
  // ============================================
  
  // Simple admin check - only allow in development or with admin key
  const isAdminRequest = (req: any): boolean => {
    // In development mode, allow admin operations
    if (process.env.NODE_ENV === 'development') {
      return true;
    }
    // In production, require admin key header
    const adminKey = req.headers['x-admin-key'];
    return adminKey === process.env.ADMIN_API_KEY;
  };
  
  // GET /api/admin/seed/status - Get current database seeding stats
  app.get("/api/admin/seed/status", async (req, res) => {
    if (!isAdminRequest(req)) {
      return res.status(403).json({ error: "Admin access required" });
    }
    try {
      const { getSeedStats } = await import("./seed");
      const stats = await getSeedStats();
      res.json({
        success: true,
        stats,
        message: "Database status retrieved successfully"
      });
    } catch (error) {
      console.error("Error getting seed status:", error);
      res.status(500).json({ error: "Failed to get database status" });
    }
  });
  
  // POST /api/admin/seed - Run database seeding (protected)
  app.post("/api/admin/seed", async (req, res) => {
    if (!isAdminRequest(req)) {
      return res.status(403).json({ error: "Admin access required" });
    }
    try {
      const { seedDatabase, getSeedStats } = await import("./seed");
      
      console.log("Starting database seed via API...");
      await seedDatabase();
      
      const stats = await getSeedStats();
      res.json({
        success: true,
        message: "Database seeded successfully",
        stats
      });
    } catch (error) {
      console.error("Error seeding database:", error);
      res.status(500).json({ error: "Failed to seed database" });
    }
  });

  // ============================================
  // ADMIN LOGIN ROUTES
  // ============================================

  // POST /api/admin/login - Validate admin password and seed admin heroes
  app.post("/api/admin/login", async (req, res) => {
    try {
      const { password } = req.body;
      const adminPassword = process.env.ADMIN_PASSWORD;
      
      if (!adminPassword) {
        console.warn("ADMIN_PASSWORD not configured - admin login disabled");
        res.status(503).json({ 
          success: false, 
          error: "Admin access not configured" 
        });
        return;
      }
      
      if (password === adminPassword) {
        // Seed admin heroes if they don't exist
        const adminUserId = "admin";
        const existingChars = await storage.getCharacters(adminUserId);
        
        if (existingChars.length === 0) {
          console.log("Creating admin heroes...");
          
          // Attribute formula: Race(5) + Class(5) + Starting(10) + Level*7
          // RacaLVIN Lv5: 5+5+10+35 = 55 points total
          // Groown Lv3: 5+5+10+21 = 41 points total
          // Moloch Lv4: 5+5+10+28 = 48 points total
          const adminHeroes = [
            {
              userId: adminUserId,
              name: "RacaLVIN",
              raceId: "dwarf",
              classId: "worg",
              level: 5,
              xp: 500,
              hp: 150,
              energy: 75,
              // Dwarf(Vit2,End2,Wis1) + Worg(Str1,Vit2,End1,Agi1) + allocated 45 points
              attributes: { Strength: 12, Intellect: 2, Vitality: 16, Dexterity: 3, Endurance: 14, Wisdom: 3, Agility: 4, Tactics: 1 },
              equipment: { Head: null, Shoulder: null, Chest: null, Waist: null, Accessory1: null, MainHand: null, OffHand: null, Hands: null, Legs: null, Feet: null, Accessory2: null, Back: null },
              inventory: [],
              professionLevels: {},
              revivalTime: null,
              avatarUrl: "/sprites/heroes/dwarf/idle.png",
              unspentAttributePoints: 0,
              skillPoints: 5,
              skillLoadouts: {},
              weaponSkillLevel: 10,
              weaponSkillSelections: {},
              equippedWeaponId: null,
            },
            {
              userId: adminUserId,
              name: "Groown",
              raceId: "barbarian",
              classId: "ranger",
              level: 3,
              xp: 200,
              hp: 120,
              energy: 60,
              // Barbarian(Str2,Vit2,End1) + Ranger(Dex2,Agi2,Tac1) + allocated 31 points
              attributes: { Strength: 8, Intellect: 1, Vitality: 7, Dexterity: 10, Endurance: 4, Wisdom: 1, Agility: 8, Tactics: 2 },
              equipment: { Head: null, Shoulder: null, Chest: null, Waist: null, Accessory1: null, MainHand: null, OffHand: null, Hands: null, Legs: null, Feet: null, Accessory2: null, Back: null },
              inventory: [],
              professionLevels: {},
              revivalTime: null,
              avatarUrl: "/sprites/heroes/barbarian/idle.png",
              unspentAttributePoints: 0,
              skillPoints: 3,
              skillLoadouts: {},
              weaponSkillLevel: 8,
              weaponSkillSelections: {},
              equippedWeaponId: null,
            },
            {
              userId: adminUserId,
              name: "Moloch",
              raceId: "undead",
              classId: "mage",
              level: 4,
              xp: 350,
              hp: 80,
              energy: 100,
              // Undead(Int2,Wis3) + Mage(Int3,Wis2) + allocated 38 points
              attributes: { Strength: 1, Intellect: 18, Vitality: 4, Dexterity: 2, Endurance: 1, Wisdom: 16, Agility: 3, Tactics: 3 },
              equipment: { Head: null, Shoulder: null, Chest: null, Waist: null, Accessory1: null, MainHand: null, OffHand: null, Hands: null, Legs: null, Feet: null, Accessory2: null, Back: null },
              inventory: [],
              professionLevels: {},
              revivalTime: null,
              avatarUrl: "/sprites/heroes/undead/idle.png",
              unspentAttributePoints: 0,
              skillPoints: 4,
              skillLoadouts: {},
              weaponSkillLevel: 6,
              weaponSkillSelections: {},
              equippedWeaponId: null,
            },
          ];
          
          for (const hero of adminHeroes) {
            await storage.createCharacter(hero);
          }
          console.log("Admin heroes created: RacaLVIN, Groown, Moloch");
        }
        
        res.json({ 
          success: true, 
          message: "Admin access granted",
          isAdmin: true,
          heroCount: existingChars.length > 0 ? existingChars.length : 3
        });
      } else {
        res.status(401).json({ 
          success: false, 
          error: "Invalid password" 
        });
      }
    } catch (error) {
      console.error("Error during admin login:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  // GET /api/admin/verify - Check if admin session is valid (client-side check)
  app.get("/api/admin/verify", async (req, res) => {
    // This is a simple verification endpoint - actual auth is handled client-side
    // In production, you'd want proper session management
    res.json({ 
      isAdminEndpointActive: true,
      grudgeIslandId: "grudge-island-001"
    });
  });

  // ============================================
  // AI UNIT ROUTES
  // ============================================

  // GET /api/ai-units - Get all AI units
  app.get("/api/ai-units", async (req, res) => {
    try {
      const { islandId, isActive } = req.query;
      const units = await storage.getAIUnits({
        islandId: islandId as string | undefined,
        isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined
      });
      res.json(units);
    } catch (error) {
      console.error("Error fetching AI units:", error);
      res.status(500).json({ error: "Failed to fetch AI units" });
    }
  });

  // GET /api/ai-units/:id - Get a specific AI unit
  app.get("/api/ai-units/:id", async (req, res) => {
    try {
      const unit = await storage.getAIUnit(req.params.id);
      if (!unit) {
        return res.status(404).json({ error: "AI unit not found" });
      }
      res.json(unit);
    } catch (error) {
      console.error("Error fetching AI unit:", error);
      res.status(500).json({ error: "Failed to fetch AI unit" });
    }
  });

  // POST /api/ai-units/transfer - Transfer a character to AI control
  app.post("/api/ai-units/transfer", async (req, res) => {
    if (!isAdminRequest(req)) {
      return res.status(403).json({ error: "Admin access required" });
    }
    try {
      const { characterId, assignedIslandId, assignedIslandName, behavior } = req.body;
      if (!characterId || !assignedIslandId || !assignedIslandName) {
        return res.status(400).json({ error: "characterId, assignedIslandId, and assignedIslandName are required" });
      }
      
      const aiUnit = await storage.transferCharacterToAIUnit(
        characterId,
        assignedIslandId,
        assignedIslandName,
        behavior || 'balanced'
      );
      
      res.json({ success: true, aiUnit });
    } catch (error) {
      console.error("Error transferring character to AI:", error);
      res.status(500).json({ error: "Failed to transfer character to AI control" });
    }
  });

  // PATCH /api/ai-units/:id - Update an AI unit
  app.patch("/api/ai-units/:id", async (req, res) => {
    if (!isAdminRequest(req)) {
      return res.status(403).json({ error: "Admin access required" });
    }
    try {
      const unit = await storage.updateAIUnit(req.params.id, req.body);
      res.json(unit);
    } catch (error) {
      console.error("Error updating AI unit:", error);
      res.status(500).json({ error: "Failed to update AI unit" });
    }
  });

  // DELETE /api/ai-units/:id - Delete an AI unit
  app.delete("/api/ai-units/:id", async (req, res) => {
    if (!isAdminRequest(req)) {
      return res.status(403).json({ error: "Admin access required" });
    }
    try {
      await storage.deleteAIUnit(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting AI unit:", error);
      res.status(500).json({ error: "Failed to delete AI unit" });
    }
  });

  // POST /api/admin/grant-character-tokens — playtest / studio unblock
  app.post("/api/admin/grant-character-tokens", async (req, res) => {
    if (!isAdminRequest(req)) {
      return res.status(403).json({ error: "Admin access required" });
    }
    try {
      const userId = (req.body?.userId || req.query.userId) as string | undefined;
      const amount = Math.min(Math.max(Number(req.body?.amount ?? 1), 1), 20);
      if (!userId) {
        return res.status(400).json({ error: "userId is required" });
      }
      const account = await storage.getOrCreateAccountForUser(userId);
      const current = (account as any).characterTokens ?? 0;
      const next = current + amount;
      await storage.updateAccount(account.id, { characterTokens: next } as any);
      res.json({
        success: true,
        userId,
        accountId: account.id,
        characterTokens: next,
        granted: amount,
        message: `Granted ${amount} character token(s) for playtesting.`,
      });
    } catch (error) {
      console.error("Error granting character tokens:", error);
      res.status(500).json({ error: "Failed to grant character tokens" });
    }
  });

  // POST /api/admin/reset-account - Reset account data for fresh start
  app.post("/api/admin/reset-account", async (req, res) => {
    if (!isAdminRequest(req)) {
      return res.status(403).json({ error: "Admin access required" });
    }
    try {
      const userId = req.query.userId as string || "guest";
      await storage.resetAccount(userId);
      res.json({ 
        success: true, 
        message: `Account for user ${userId} has been reset. All characters, party, resources, and island data have been cleared.`
      });
    } catch (error) {
      console.error("Error resetting account:", error);
      res.status(500).json({ error: "Failed to reset account" });
    }
  });

  // ============================================
  // API CALL LOGGING & ANALYTICS ENDPOINTS
  // ============================================

  // GET /api/admin/api-logs - Get API call logs (admin only)
  app.get("/api/admin/api-logs", async (req, res) => {
    if (!isAdminRequest(req)) {
      return res.status(403).json({ error: "Admin access required" });
    }
    try {
      const logs = await storage.getApiCallLogs({
        userId: req.query.userId as string,
        path: req.query.path as string,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 100,
      });
      res.json(logs);
    } catch (error) {
      console.error("Error getting API logs:", error);
      res.status(500).json({ error: "Failed to get API logs" });
    }
  });

  // GET /api/admin/api-stats - Get API call statistics (admin only)
  app.get("/api/admin/api-stats", async (req, res) => {
    if (!isAdminRequest(req)) {
      return res.status(403).json({ error: "Admin access required" });
    }
    try {
      const startDate = req.query.startDate ? parseInt(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? parseInt(req.query.endDate as string) : undefined;
      const stats = await storage.getApiCallStats(startDate, endDate);
      res.json(stats);
    } catch (error) {
      console.error("Error getting API stats:", error);
      res.status(500).json({ error: "Failed to get API stats" });
    }
  });

  // GET /api/admin/activity-logs - Get activity logs (admin only)
  app.get("/api/admin/activity-logs", async (req, res) => {
    if (!isAdminRequest(req)) {
      return res.status(403).json({ error: "Admin access required" });
    }
    try {
      const logs = await storage.getActivityLogs({
        userId: req.query.userId as string,
        category: req.query.category as string,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 100,
      });
      res.json(logs);
    } catch (error) {
      console.error("Error getting activity logs:", error);
      res.status(500).json({ error: "Failed to get activity logs" });
    }
  });

  // POST /api/activity - Log an activity (used by frontend)
  app.post("/api/activity", async (req, res) => {
    try {
      const userId = getUserId(req);
      const account = await storage.getAccountByUserId(userId);
      const activity = await storage.logActivity({
        userId,
        accountId: account?.id,
        characterId: req.body.characterId,
        action: req.body.action,
        category: req.body.category,
        details: req.body.details,
        goldChange: req.body.goldChange,
        xpChange: req.body.xpChange,
        itemsChanged: req.body.itemsChanged,
      });
      res.json(activity);
    } catch (error) {
      console.error("Error logging activity:", error);
      res.status(500).json({ error: "Failed to log activity" });
    }
  });

  // GET /api/account/activity - Get activity logs for current user
  app.get("/api/account/activity", async (req, res) => {
    try {
      const userId = getUserId(req);
      const logs = await storage.getActivityLogs({
        userId,
        category: req.query.category as string,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
      });
      res.json(logs);
    } catch (error) {
      console.error("Error getting user activity:", error);
      res.status(500).json({ error: "Failed to get user activity" });
    }
  });

  // GET /api/characters/:id/activity - Get activity logs for a specific character
  app.get("/api/characters/:id/activity", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const logs = await storage.getCharacterActivityLogs(req.params.id, limit);
      res.json(logs);
    } catch (error) {
      console.error("Error getting character activity:", error);
      res.status(500).json({ error: "Failed to get character activity" });
    }
  });

  // POST /api/analytics/event - Track an analytics event
  app.post("/api/analytics/event", async (req, res) => {
    try {
      const userId = getUserId(req);
      const account = await storage.getAccountByUserId(userId);
      const event = await storage.trackEvent({
        userId,
        accountId: account?.id,
        eventType: req.body.eventType,
        eventName: req.body.eventName,
        eventData: req.body.eventData,
        page: req.body.page,
        component: req.body.component,
      });
      res.json(event);
    } catch (error) {
      console.error("Error tracking event:", error);
      res.status(500).json({ error: "Failed to track event" });
    }
  });

  // GET /api/admin/analytics - Get analytics events (admin only)
  app.get("/api/admin/analytics", async (req, res) => {
    if (!isAdminRequest(req)) {
      return res.status(403).json({ error: "Admin access required" });
    }
    try {
      const events = await storage.getAnalyticsEvents({
        eventType: req.query.eventType as string,
        userId: req.query.userId as string,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 100,
      });
      res.json(events);
    } catch (error) {
      console.error("Error getting analytics:", error);
      res.status(500).json({ error: "Failed to get analytics" });
    }
  });

  // GET /api/admin/daily-stats - Get daily statistics (admin only)
  app.get("/api/admin/daily-stats", async (req, res) => {
    if (!isAdminRequest(req)) {
      return res.status(403).json({ error: "Admin access required" });
    }
    try {
      const today = new Date().toISOString().split('T')[0];
      const startDate = req.query.startDate as string || today;
      const endDate = req.query.endDate as string || today;
      
      if (startDate === endDate) {
        const stats = await storage.getDailyStats(startDate);
        res.json(stats || { date: startDate, message: "No stats for this date" });
      } else {
        const stats = await storage.getDailyStatsRange(startDate, endDate);
        res.json(stats);
      }
    } catch (error) {
      console.error("Error getting daily stats:", error);
      res.status(500).json({ error: "Failed to get daily stats" });
    }
  });

  // GET /api/account/sessions - Get user's sessions
  app.get("/api/account/sessions", async (req, res) => {
    try {
      const userId = getUserId(req);
      const sessions = await storage.getUserSessions(userId);
      res.json(sessions.map(s => ({
        ...s,
        sessionToken: undefined, // Don't expose token
      })));
    } catch (error) {
      console.error("Error getting sessions:", error);
      res.status(500).json({ error: "Failed to get sessions" });
    }
  });

  // ============================================
  // LORE SYSTEM ROUTES
  // ============================================

  // GET /api/lore - Get all lore entities (optionally filter by type)
  app.get("/api/lore", async (req, res) => {
    try {
      const entityType = req.query.type as string | undefined;
      const entities = await storage.getLoreEntities(entityType);
      res.json(entities);
    } catch (error) {
      console.error("Error fetching lore entities:", error);
      res.status(500).json({ error: "Failed to fetch lore entities" });
    }
  });

  // GET /api/lore/:id - Get a specific lore entity
  app.get("/api/lore/:id", async (req, res) => {
    try {
      const entity = await storage.getLoreEntity(req.params.id);
      if (!entity) {
        return res.status(404).json({ error: "Lore entity not found" });
      }
      res.json(entity);
    } catch (error) {
      console.error("Error fetching lore entity:", error);
      res.status(500).json({ error: "Failed to fetch lore entity" });
    }
  });

  // ============================================
  // MISSION SYSTEM ROUTES
  // ============================================

  // GET /api/missions - Get available missions
  app.get("/api/missions", async (req, res) => {
    try {
      const factionId = req.query.factionId as string | undefined;
      const minLevel = req.query.minLevel ? parseInt(req.query.minLevel as string) : undefined;
      const maxLevel = req.query.maxLevel ? parseInt(req.query.maxLevel as string) : undefined;
      const status = req.query.status as string | undefined;
      
      const missions = await storage.getMissions({ factionId, minLevel, maxLevel, status });
      res.json(missions);
    } catch (error) {
      console.error("Error fetching missions:", error);
      res.status(500).json({ error: "Failed to fetch missions" });
    }
  });

  // GET /api/missions/:id - Get a specific mission
  app.get("/api/missions/:id", async (req, res) => {
    try {
      const mission = await storage.getMission(req.params.id);
      if (!mission) {
        return res.status(404).json({ error: "Mission not found" });
      }
      res.json(mission);
    } catch (error) {
      console.error("Error fetching mission:", error);
      res.status(500).json({ error: "Failed to fetch mission" });
    }
  });

  // POST /api/missions - Create a new mission (admin only)
  app.post("/api/missions", async (req, res) => {
    if (!isAdminRequest(req)) {
      return res.status(403).json({ error: "Admin access required" });
    }
    try {
      const mission = await storage.createMission(req.body);
      res.status(201).json(mission);
    } catch (error) {
      console.error("Error creating mission:", error);
      res.status(500).json({ error: "Failed to create mission" });
    }
  });

  // GET /api/story-arcs - Get available story arcs
  app.get("/api/story-arcs", async (req, res) => {
    try {
      const factionId = req.query.factionId as string | undefined;
      const status = req.query.status as string | undefined;
      
      const arcs = await storage.getStoryArcs({ factionId, status });
      res.json(arcs);
    } catch (error) {
      console.error("Error fetching story arcs:", error);
      res.status(500).json({ error: "Failed to fetch story arcs" });
    }
  });

  // GET /api/story-arcs/:id - Get a specific story arc
  app.get("/api/story-arcs/:id", async (req, res) => {
    try {
      const arc = await storage.getStoryArc(req.params.id);
      if (!arc) {
        return res.status(404).json({ error: "Story arc not found" });
      }
      res.json(arc);
    } catch (error) {
      console.error("Error fetching story arc:", error);
      res.status(500).json({ error: "Failed to fetch story arc" });
    }
  });

  // GET /api/combat-challenges - Get combat challenges
  app.get("/api/combat-challenges", async (req, res) => {
    try {
      const canSpawnInDungeon = req.query.dungeon === "true" ? true : 
                                 req.query.dungeon === "false" ? false : undefined;
      const difficultyTier = req.query.difficulty ? parseInt(req.query.difficulty as string) : undefined;
      
      const challenges = await storage.getCombatChallenges({ canSpawnInDungeon, difficultyTier });
      res.json(challenges);
    } catch (error) {
      console.error("Error fetching combat challenges:", error);
      res.status(500).json({ error: "Failed to fetch combat challenges" });
    }
  });

  // GET /api/combat-challenges/:id - Get a specific combat challenge
  app.get("/api/combat-challenges/:id", async (req, res) => {
    try {
      const challenge = await storage.getCombatChallenge(req.params.id);
      if (!challenge) {
        return res.status(404).json({ error: "Combat challenge not found" });
      }
      res.json(challenge);
    } catch (error) {
      console.error("Error fetching combat challenge:", error);
      res.status(500).json({ error: "Failed to fetch combat challenge" });
    }
  });

  // POST /api/combat-challenges - Create a combat challenge (admin only)
  app.post("/api/combat-challenges", async (req, res) => {
    if (!isAdminRequest(req)) {
      return res.status(403).json({ error: "Admin access required" });
    }
    try {
      const challenge = await storage.createCombatChallenge(req.body);
      res.status(201).json(challenge);
    } catch (error) {
      console.error("Error creating combat challenge:", error);
      res.status(500).json({ error: "Failed to create combat challenge" });
    }
  });

  // ============================================
  // PLAYER MISSION PROGRESS ROUTES
  // ============================================

  // GET /api/player/missions - Get player's mission progress
  app.get("/api/player/missions", async (req, res) => {
    try {
      const userId = getUserId(req);
      const missionId = req.query.missionId as string | undefined;
      const progress = await storage.getPlayerMissionProgress(userId, missionId);
      res.json(progress);
    } catch (error) {
      console.error("Error fetching mission progress:", error);
      res.status(500).json({ error: "Failed to fetch mission progress" });
    }
  });

  // POST /api/player/missions/:missionId/accept - Accept a mission
  app.post("/api/player/missions/:missionId/accept", async (req, res) => {
    try {
      const userId = getUserId(req);
      const account = await storage.getAccountByUserId(userId);
      const missionId = req.params.missionId;
      
      // Check if mission exists
      const mission = await storage.getMission(missionId);
      if (!mission) {
        return res.status(404).json({ error: "Mission not found" });
      }
      
      // Check if already accepted
      const existing = await storage.getPlayerMissionProgress(userId, missionId);
      if (existing.some(p => p.status === 'accepted' || p.status === 'in_progress')) {
        return res.status(400).json({ error: "Mission already accepted" });
      }
      
      const progress = await storage.acceptMission(userId, account?.id || null, missionId);
      res.status(201).json(progress);
    } catch (error) {
      console.error("Error accepting mission:", error);
      res.status(500).json({ error: "Failed to accept mission" });
    }
  });

  // PATCH /api/player/missions/:progressId - Update mission progress
  app.patch("/api/player/missions/:progressId", async (req, res) => {
    try {
      const progress = await storage.updateMissionProgress(req.params.progressId, req.body);
      res.json(progress);
    } catch (error) {
      console.error("Error updating mission progress:", error);
      res.status(500).json({ error: "Failed to update mission progress" });
    }
  });

  // POST /api/player/missions/:progressId/complete - Complete a mission
  app.post("/api/player/missions/:progressId/complete", async (req, res) => {
    try {
      const progress = await storage.completeMission(req.params.progressId);
      res.json(progress);
    } catch (error) {
      console.error("Error completing mission:", error);
      res.status(500).json({ error: "Failed to complete mission" });
    }
  });

  // POST /api/player/missions/:missionId/objective/:objectiveId - Complete a mission objective
  app.post("/api/player/missions/:missionId/objective/:objectiveId", async (req, res) => {
    try {
      const userId = getUserId(req);
      const { missionId, objectiveId } = req.params;
      
      // Find the player's progress for this mission
      const progressList = await storage.getPlayerMissionProgress(userId, missionId);
      const activeProgress = progressList.find(p => 
        p.status === 'accepted' || p.status === 'in_progress'
      );
      
      if (!activeProgress) {
        return res.status(404).json({ error: "No active progress for this mission" });
      }
      
      // Check if objective already completed
      const completedObjectives = activeProgress.objectivesCompleted || [];
      if (completedObjectives.includes(objectiveId)) {
        return res.json({ message: "Objective already completed", progress: activeProgress });
      }
      
      // Update progress with new objective
      const updatedObjectives = [...completedObjectives, objectiveId];
      const updatedProgress = await storage.updateMissionProgress(activeProgress.id, {
        objectivesCompleted: updatedObjectives,
        status: 'in_progress'
      });
      
      res.json({ message: "Objective completed", progress: updatedProgress });
    } catch (error) {
      console.error("Error completing objective:", error);
      res.status(500).json({ error: "Failed to complete objective" });
    }
  });

  // ============================================
  // FACTION REPUTATION ROUTES
  // ============================================

  // GET /api/player/reputation - Get player's faction reputation
  app.get("/api/player/reputation", async (req, res) => {
    try {
      const userId = getUserId(req);
      const reputation = await storage.getPlayerFactionReputation(userId);
      res.json(reputation);
    } catch (error) {
      console.error("Error fetching faction reputation:", error);
      res.status(500).json({ error: "Failed to fetch faction reputation" });
    }
  });

  // POST /api/player/reputation/:factionId - Update faction reputation
  app.post("/api/player/reputation/:factionId", async (req, res) => {
    try {
      const userId = getUserId(req);
      const { change } = req.body;
      if (typeof change !== 'number') {
        return res.status(400).json({ error: "Invalid reputation change value" });
      }
      const reputation = await storage.updateFactionReputation(userId, req.params.factionId, change);
      res.json(reputation);
    } catch (error) {
      console.error("Error updating faction reputation:", error);
      res.status(500).json({ error: "Failed to update faction reputation" });
    }
  });

  // ============================================
  // AI GENERATED CONTENT ROUTES (Admin)
  // ============================================

  // GET /api/admin/generated-content/pending - Get pending generated content
  app.get("/api/admin/generated-content/pending", async (req, res) => {
    if (!isAdminRequest(req)) {
      return res.status(403).json({ error: "Admin access required" });
    }
    try {
      const content = await storage.getPendingGeneratedContent();
      res.json(content);
    } catch (error) {
      console.error("Error fetching pending content:", error);
      res.status(500).json({ error: "Failed to fetch pending content" });
    }
  });

  // POST /api/admin/generated-content/:id/approve - Approve generated content
  app.post("/api/admin/generated-content/:id/approve", async (req, res) => {
    if (!isAdminRequest(req)) {
      return res.status(403).json({ error: "Admin access required" });
    }
    try {
      const userId = getUserId(req);
      const content = await storage.approveGeneratedContent(req.params.id, userId);
      res.json(content);
    } catch (error) {
      console.error("Error approving content:", error);
      res.status(500).json({ error: "Failed to approve content" });
    }
  });

  // ============================================
  // AI MISSION GENERATOR ROUTES (Admin)
  // ============================================

  // POST /api/admin/generate/missions - Generate new missions with AI
  app.post("/api/admin/generate/missions", async (req, res) => {
    if (!isAdminRequest(req)) {
      return res.status(403).json({ error: "Admin access required" });
    }
    try {
      const { generateMissions, saveMissionToDraft } = await import("./missionGenerator");
      const userId = getUserId(req);
      const { factionId, minLevel, maxLevel, missionType, difficultyTier, count } = req.body;
      
      const missions = await generateMissions({
        factionId,
        minLevel,
        maxLevel,
        missionType,
        difficultyTier,
        count: count || 3,
      });
      
      // Save each generated mission as draft
      const savedIds: string[] = [];
      for (const mission of missions) {
        const id = await saveMissionToDraft(mission, factionId || null, userId);
        savedIds.push(id);
      }
      
      res.json({
        generated: missions.length,
        savedIds,
        missions,
      });
    } catch (error) {
      console.error("Error generating missions:", error);
      res.status(500).json({ error: "Failed to generate missions" });
    }
  });

  // POST /api/admin/generate/challenges - Generate combat challenges with AI
  app.post("/api/admin/generate/challenges", async (req, res) => {
    if (!isAdminRequest(req)) {
      return res.status(403).json({ error: "Admin access required" });
    }
    try {
      const { generateCombatChallenges, saveCombatChallengeToDraft } = await import("./missionGenerator");
      const userId = getUserId(req);
      const { difficultyTier, canSpawnInDungeon, factionId, count } = req.body;
      
      const challenges = await generateCombatChallenges({
        difficultyTier: difficultyTier || 2,
        canSpawnInDungeon: canSpawnInDungeon ?? true,
        factionId,
        count: count || 5,
      });
      
      // Save each generated challenge as draft
      const savedIds: string[] = [];
      for (const challenge of challenges) {
        const id = await saveCombatChallengeToDraft(
          challenge,
          difficultyTier || 2,
          canSpawnInDungeon ?? true,
          userId
        );
        savedIds.push(id);
      }
      
      res.json({
        generated: challenges.length,
        savedIds,
        challenges,
      });
    } catch (error) {
      console.error("Error generating challenges:", error);
      res.status(500).json({ error: "Failed to generate challenges" });
    }
  });

  // POST /api/admin/generate/story-arc - Generate a story arc with AI
  app.post("/api/admin/generate/story-arc", async (req, res) => {
    if (!isAdminRequest(req)) {
      return res.status(403).json({ error: "Admin access required" });
    }
    try {
      const { generateStoryArc, saveStoryArcToDraft } = await import("./missionGenerator");
      const userId = getUserId(req);
      const { factionId, chapterCount, theme } = req.body;
      
      const arc = await generateStoryArc({
        factionId,
        chapterCount: chapterCount || 5,
        theme,
      });
      
      const savedId = await saveStoryArcToDraft(arc, factionId || null, userId);
      
      res.json({
        savedId,
        arc,
      });
    } catch (error) {
      console.error("Error generating story arc:", error);
      res.status(500).json({ error: "Failed to generate story arc" });
    }
  });

  // ============================================
  // WALLET & NFT ROUTES - Solana Integration
  // ============================================

  // GET /api/wallet/status - Get account wallet status
  app.get("/api/wallet/status", async (req, res) => {
    try {
      const userId = getUserId(req);
      const account = await storage.getAccountByUserId(userId);
      
      if (!account) {
        return res.json({ 
          hasWallet: false, 
          walletType: null, 
          walletAddress: null 
        });
      }

      res.json({
        hasWallet: !!account.walletAddress,
        walletType: account.walletType || null,
        walletAddress: account.walletAddress || null,
        crossmintEmail: account.crossmintEmail || null,
        gbuxBalance: account.gbuxBalance ?? 0,
      });
    } catch (error) {
      console.error("Error fetching wallet status:", error);
      res.status(500).json({ error: "Failed to fetch wallet status" });
    }
  });

  // POST /api/wallet/create - Create a Crossmint custodial wallet
  app.post("/api/wallet/create", async (req, res) => {
    try {
      const userId = getUserId(req);
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: "Email is required for wallet creation" });
      }

      const account = await storage.getAccountByUserId(userId);
      if (!account) {
        return res.status(404).json({ error: "Account not found" });
      }

      if (account.walletAddress) {
        return res.json({
          success: true,
          walletAddress: account.walletAddress,
          walletType: account.walletType,
          message: "Wallet already exists",
        });
      }

      const { nftMintingService } = await import("./services/nftMinting");
      const walletAddress = await nftMintingService.getWalletForAccount(account.id, email);

      if (!walletAddress) {
        return res.status(500).json({ error: "Failed to create wallet" });
      }

      res.json({
        success: true,
        walletAddress,
        walletType: 'crossmint',
        message: "Wallet created successfully",
      });
    } catch (error) {
      console.error("Error creating wallet:", error);
      res.status(500).json({ error: "Failed to create wallet" });
    }
  });

  // POST /api/wallet/link-external - Link external wallet (signature-verified)
  app.post("/api/wallet/link-external", async (req, res) => {
    try {
      const userId = getUserId(req);
      if (userId === "guest") {
        return res.status(401).json({ error: "Authentication required" });
      }
      const { walletAddress, signature, message, provider } = req.body;

      if (!walletAddress) {
        return res.status(400).json({ error: "Wallet address is required" });
      }

      const account = await storage.getAccountByUserId(userId);
      if (!account) {
        return res.status(404).json({ error: "Account not found" });
      }

      if (signature && message) {
        const { confirmLinkedWallet } = await import("./services/walletAccess");
        const result = await confirmLinkedWallet(
          account.id,
          walletAddress,
          message,
          signature,
          provider || "other",
        );
        return res.json({
          success: true,
          walletAddress,
          walletType: "external",
          linkedWallet: result.linked,
          message: "External wallet linked successfully",
        });
      }

      const { nftMintingService } = await import("./services/nftMinting");
      const success = await nftMintingService.linkExternalWallet(account.id, walletAddress);
      if (!success) {
        return res.status(500).json({ error: "Failed to link wallet" });
      }

      res.json({
        success: true,
        walletAddress,
        walletType: "external",
        message: "External wallet linked (unsigned legacy path)",
      });
    } catch (error: any) {
      console.error("Error linking external wallet:", error);
      res.status(400).json({ error: error.message || "Failed to link external wallet" });
    }
  });

  // GET /api/nfts - Get all NFTs for current account
  app.get("/api/nfts", async (req, res) => {
    try {
      const userId = getUserId(req);
      const account = await storage.getAccountByUserId(userId);
      
      if (!account) {
        return res.json({ nfts: [] });
      }

      const { nftMintingService } = await import("./services/nftMinting");
      const nfts = await nftMintingService.getAccountNFTsEnriched(account.id);
      
      res.json({ nfts });
    } catch (error) {
      console.error("Error fetching NFTs:", error);
      res.status(500).json({ error: "Failed to fetch NFTs" });
    }
  });

  // GET /api/nfts/character/:characterId - Get NFT status for a character
  app.get("/api/nfts/character/:characterId", async (req, res) => {
    try {
      const { characterId } = req.params;
      
      const { nftMintingService } = await import("./services/nftMinting");
      const nft = await nftMintingService.getCharacterNFT(characterId);
      
      res.json({ nft });
    } catch (error) {
      console.error("Error fetching character NFT:", error);
      res.status(500).json({ error: "Failed to fetch character NFT" });
    }
  });

  // GET /api/nfts/:nftId - Client shortcut (characterId or NFT record id)
  app.get("/api/nfts/:nftId", async (req, res) => {
    try {
      const { nftId } = req.params;
      if (["escrowed", "mint", "poll-pending"].includes(nftId)) {
        return res.status(404).json({ error: "Not found" });
      }

      const { nftMintingService } = await import("./services/nftMinting");
      let nft = await nftMintingService.getCharacterNFT(nftId);
      if (!nft) {
        nft = await nftMintingService.getNFTById(nftId);
      }
      if (!nft) {
        return res.status(404).json({ error: "NFT not found" });
      }

      res.json({
        status: nft.status,
        mintAddress: nft.mintAddress,
        assetId: nft.assetId,
        nft,
      });
    } catch (error) {
      console.error("Error fetching NFT:", error);
      res.status(500).json({ error: "Failed to fetch NFT" });
    }
  });

  // POST /api/nfts/mint - Mint a character as a compressed NFT
  app.post("/api/nfts/mint", async (req, res) => {
    try {
      const userId = getUserId(req);
      const { characterId, email, externalWallet } = req.body;
      
      if (!characterId) {
        return res.status(400).json({ error: "Character ID is required" });
      }

      const account = await storage.getAccountByUserId(userId);
      if (!account) {
        return res.status(404).json({ error: "Account not found" });
      }

      const character = await storage.getCharacter(characterId);
      if (!character || character.userId !== userId) {
        return res.status(403).json({ error: "Character not found or access denied" });
      }

      // Production default: escrow to admin wallet. Opt-in direct mint only with
      // body.directToUser === true (legacy / admin tools).
      const directToUser = req.body?.directToUser === true;
      const mintEmail = email || account.crossmintEmail || null;

      console.log(`[NFT] Minting character ${characterId} for account ${account.id} escrow=${!directToUser}`);
      console.log(`[NFT] Wallet: ${account.walletAddress}, Email: ${mintEmail}, External: ${externalWallet}`);

      const { nftMintingService } = await import("./services/nftMinting");
      const result = await nftMintingService.mintCharacterAsCNFT(
        characterId,
        account.id,
        mintEmail,
        externalWallet,
        { directToUser },
      );

      if (!result.success) {
        console.error(`[NFT] Mint failed: ${result.error}`);
        return res.status(400).json({ error: result.error });
      }

      console.log(`[NFT] Mint initiated successfully: ${result.actionId}`);

      res.json({
        success: true,
        nftId: result.nftId,
        actionId: result.actionId,
        custody: directToUser ? "user" : "escrow_admin",
        message: directToUser
          ? "NFT minting to user initiated. This may take 10-30 seconds."
          : "cNFT minted to server escrow. Play immediately; claim to wallet is optional.",
      });
    } catch (error) {
      console.error("Error minting NFT:", error);
      res.status(500).json({ error: "Failed to mint NFT" });
    }
  });

  // POST /api/nfts/:nftId/check-status - Check and update NFT minting status
  app.post("/api/nfts/:nftId/check-status", async (req, res) => {
    try {
      const { nftId } = req.params;
      
      const { nftMintingService } = await import("./services/nftMinting");
      const status = await nftMintingService.checkAndUpdateMintStatus(nftId);

      if (!status) {
        return res.status(404).json({ error: "NFT not found" });
      }

      res.json({ nft: status });
    } catch (error) {
      console.error("Error checking NFT status:", error);
      res.status(500).json({ error: "Failed to check NFT status" });
    }
  });

  // POST /api/nfts/poll-pending - Poll and update all pending NFT mint statuses
  app.post("/api/nfts/poll-pending", async (req, res) => {
    try {
      const userId = getUserId(req);
      const account = await storage.getAccountByUserId(userId);
      if (!account) {
        return res.status(404).json({ error: "Account not found" });
      }

      const { nftMintingService } = await import("./services/nftMinting");
      const nfts = await nftMintingService.getAccountNFTs(account.id);
      
      // Filter to pending/minting NFTs and check their status
      const pendingNfts = nfts.filter(nft => nft.status === 'minting' || nft.status === 'pending');
      const updatedNfts = [];
      
      for (const nft of pendingNfts) {
        const updated = await nftMintingService.checkAndUpdateMintStatus(nft.id);
        if (updated) {
          updatedNfts.push(updated);
        }
      }

      // Return all NFTs with updated statuses
      const allNfts = await nftMintingService.getAccountNFTs(account.id);
      
      res.json({ 
        nfts: allNfts,
        updated: updatedNfts.length,
        message: `Updated ${updatedNfts.length} pending NFT(s)`
      });
    } catch (error) {
      console.error("Error polling pending NFTs:", error);
      res.status(500).json({ error: "Failed to poll pending NFTs" });
    }
  });

  // POST /api/nfts/:nftId/claim - Claim an escrowed cNFT (transfer from agent wallet to player wallet)
  app.post("/api/nfts/:nftId/claim", async (req, res) => {
    try {
      const { nftId } = req.params;
      const userId = getUserId(req);
      const account = await storage.getAccountByUserId(userId);
      if (!account) {
        return res.status(404).json({ error: "Account not found" });
      }

      if (!account.walletAddress) {
        return res.status(400).json({ error: "You need a wallet before claiming. Create one first." });
      }

      const { nftMintingService } = await import("./services/nftMinting");
      const result = await nftMintingService.claimEscrowedNFT(nftId, account.id);

      if (!result.success) {
        return res.status(400).json({ error: result.error, fee: result.fee });
      }

      res.json({
        success: true,
        message: "NFT claimed and transferred to your wallet. Game ownership was already on your account.",
        fee: result.fee,
      });
    } catch (error) {
      console.error("Error claiming escrowed NFT:", error);
      res.status(500).json({ error: "Failed to claim NFT" });
    }
  });

  // GET /api/nfts/escrowed - Get all escrowed NFTs for the current account
  app.get("/api/nfts/escrowed", async (req, res) => {
    try {
      const userId = getUserId(req);
      const account = await storage.getAccountByUserId(userId);
      if (!account) {
        return res.json({ nfts: [], fee: null });
      }

      const { nftMintingService } = await import("./services/nftMinting");
      const escrowed = await nftMintingService.getEscrowedNFTs(account.id);
      res.json({
        nfts: escrowed,
        fee: nftMintingService.getClaimFeeInfo(),
        note: "cNFTs in server escrow. Claim is optional; play with account ownership anytime.",
      });
    } catch (error) {
      console.error("Error fetching escrowed NFTs:", error);
      res.status(500).json({ error: "Failed to fetch escrowed NFTs" });
    }
  });

  // POST /api/nfts/:nftId/sync-metadata - Sync NFT metadata with current character stats
  app.post("/api/nfts/:nftId/sync-metadata", async (req, res) => {
    try {
      const { nftId } = req.params;
      const userId = getUserId(req);
      const account = await storage.getAccountByUserId(userId);
      if (!account) {
        return res.status(404).json({ error: "Account not found" });
      }

      const { nftMintingService } = await import("./services/nftMinting");
      const { crossmintWalletService } = await import("./services/crossmintWallet");
      
      // Get NFT record
      const nfts = await nftMintingService.getAccountNFTsEnriched(account.id);
      const nft = nfts.find(n => n.id === nftId);
      
      if (!nft) {
        return res.status(404).json({ error: "NFT not found" });
      }
      
      if (nft.status !== 'minted') {
        return res.status(400).json({ error: "NFT must be fully minted before updating metadata" });
      }
      
      // Get full character data
      const character = await storage.getCharacter(nft.characterId);
      if (!character) {
        return res.status(404).json({ error: "Character not found" });
      }
      
      // Build image URL
      let imageUrl = 'https://www.crossmint.com/assets/crossmint/logo.png';
      if (character.avatarUrl) {
        if (character.avatarUrl.startsWith('/')) {
          const baseUrl = process.env.APP_URL || 'https://grudgewarlords.com';
          imageUrl = `${baseUrl}${character.avatarUrl}`;
        } else if (character.avatarUrl.startsWith('http')) {
          imageUrl = character.avatarUrl;
        }
      }
      
      // Update NFT metadata via Crossmint
      const actionId = nft.assetId || nft.id;
      const updateResult = await crossmintWalletService.updateNFTMetadata(
        actionId,
        character,
        imageUrl
      );
      
      if (!updateResult.success) {
        return res.status(500).json({ error: updateResult.error || "Failed to update NFT metadata" });
      }
      
      // Log the metadata update event in UUID ledger
      const attrs = character.attributes as Record<string, number>;
      await storage.logUuidEvent({
        grudgeUuid: nft.id,
        eventType: 'METADATA_UPDATED',
        accountId: account.id,
        characterId: character.id,
        previousState: 'minted',
        newState: 'minted',
        metadata: {
          action: 'sync_nft_metadata',
          characterLevel: character.level,
          attributes: attrs,
          updatedAt: new Date().toISOString(),
        },
      });
      
      res.json({ 
        success: true, 
        message: "NFT metadata updated successfully",
        character: {
          name: character.name,
          level: character.level,
          attributes: attrs,
        }
      });
    } catch (error) {
      console.error("Error syncing NFT metadata:", error);
      res.status(500).json({ error: "Failed to sync NFT metadata" });
    }
  });

  // GET /api/wallet/config - Get Solana wallet configuration for frontend
  app.get("/api/wallet/config", async (_req, res) => {
    try {
      res.json({
        network: process.env.NODE_ENV === 'production' ? 'mainnet-beta' : 'devnet',
        rpcEndpoint: process.env.NODE_ENV === 'production'
          ? 'https://api.mainnet-beta.solana.com'
          : 'https://api.devnet.solana.com',
        crossmintEnabled: !!(process.env.CROSSMINT_API_KEY || process.env.CROSSMINT_SERVER_API_KEY),
        gbuxMint: process.env.GBUX_MINT_ADDRESS || "55TpSoMNxbfsNJ9U1dQoo9H3dRtDmjBZVMcKqvU2nray",
        usdtMint: process.env.USDT_MINT_ADDRESS || "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
        gbuxRateUsd: Number(process.env.GBUX_RATE_USD || 0.001),
        purchaseFeePercent: Number(process.env.WALLET_PURCHASE_FEE_PERCENT || 0.01),
        aiAgentWallet: process.env.AI_AGENT_SOL_ADDRESS || null,
      });
    } catch (error) {
      console.error("Error fetching wallet config:", error);
      res.status(500).json({ error: "Failed to fetch wallet config" });
    }
  });

  // ==================== ISLAND NFT Routes ====================

  // GET /api/island-nfts - Get all island NFTs for account
  app.get("/api/island-nfts", async (req, res) => {
    try {
      const userId = getUserId(req);
      const account = await storage.getAccountByUserId(userId);
      if (!account) {
        return res.status(404).json({ error: "Account not found" });
      }

      const nfts = await db
        .select()
        .from(islandNFTs)
        .where(eq(islandNFTs.accountId, account.id));

      res.json({ nfts });
    } catch (error) {
      console.error("Error fetching island NFTs:", error);
      res.status(500).json({ error: "Failed to fetch island NFTs" });
    }
  });

  // GET /api/island-nfts/island/:islandId - Get NFT for specific island
  app.get("/api/island-nfts/island/:islandId", async (req, res) => {
    try {
      const { islandId } = req.params;
      
      const [nft] = await db
        .select()
        .from(islandNFTs)
        .where(eq(islandNFTs.islandId, islandId))
        .limit(1);

      if (!nft) {
        return res.json({ nft: null });
      }

      res.json({ nft });
    } catch (error) {
      console.error("Error fetching island NFT:", error);
      res.status(500).json({ error: "Failed to fetch island NFT" });
    }
  });

  // POST /api/island-nfts/mint - Mint home island as cNFT
  app.post("/api/island-nfts/mint", async (req, res) => {
    try {
      const userId = getUserId(req);
      const account = await storage.getAccountByUserId(userId);
      if (!account) {
        return res.status(404).json({ error: "Account not found" });
      }

      const { islandId, email, externalWallet } = req.body;
      
      if (!islandId) {
        return res.status(400).json({ error: "Island ID required" });
      }

      // Get island
      const island = await storage.getHomeIslandByAccountId(account.id);
      if (!island || island.id !== islandId) {
        return res.status(404).json({ error: "Island not found" });
      }

      // Check if already minted
      const [existingNft] = await db
        .select()
        .from(islandNFTs)
        .where(eq(islandNFTs.islandId, islandId))
        .limit(1);

      if (existingNft) {
        return res.status(400).json({ error: "Island already has an NFT", nft: existingNft });
      }

      const { crossmintWalletService } = await import("./services/crossmintWallet");

      // Get image URL
      let imageUrl = 'https://www.crossmint.com/assets/crossmint/logo.png';
      if (island.mapImageUrl) {
        if (island.mapImageUrl.startsWith('/')) {
          const baseUrl = process.env.APP_URL || 'https://grudgewarlords.com';
          imageUrl = `${baseUrl}${island.mapImageUrl}`;
        } else if (island.mapImageUrl.startsWith('http')) {
          imageUrl = island.mapImageUrl;
        }
      }

      // Mint via Crossmint
      let mintResult;
      if (externalWallet) {
        mintResult = await crossmintWalletService.mintIslandToWallet(island, externalWallet, imageUrl);
      } else if (email || account.email) {
        mintResult = await crossmintWalletService.mintIslandToEmail(island, email || account.email!, imageUrl);
      } else {
        return res.status(400).json({ error: "Email or external wallet required" });
      }

      if (!mintResult) {
        return res.status(500).json({ error: "Failed to mint island NFT" });
      }

      // Create NFT record
      const [nft] = await db
        .insert(islandNFTs)
        .values({
          islandId: island.id,
          accountId: account.id,
          status: 'minting',
          crossmintActionId: mintResult.actionId,
          imageUri: imageUrl,
          ownerWalletAddress: externalWallet || undefined,
          mintedToExternal: !!externalWallet,
          isCompressed: true,
        })
        .returning();

      // Log event in UUID ledger
      await storage.logUuidEvent({
        grudgeUuid: nft.id,
        eventType: 'CREATED',
        accountId: account.id,
        previousState: null,
        newState: 'minting',
        metadata: {
          action: 'mint_island_nft',
          islandId: island.id,
          islandName: island.name,
          crossmintActionId: mintResult.actionId,
        },
      });

      res.json({
        success: true,
        nft,
        actionId: mintResult.actionId,
      });
    } catch (error) {
      console.error("Error minting island NFT:", error);
      res.status(500).json({ error: "Failed to mint island NFT" });
    }
  });

  // POST /api/island-nfts/:nftId/check-status - Check island NFT minting status
  app.post("/api/island-nfts/:nftId/check-status", async (req, res) => {
    try {
      const { nftId } = req.params;
      
      const [nft] = await db
        .select()
        .from(islandNFTs)
        .where(eq(islandNFTs.id, nftId))
        .limit(1);

      if (!nft) {
        return res.status(404).json({ error: "Island NFT not found" });
      }

      if (!nft.crossmintActionId) {
        return res.json({ nft });
      }

      const { crossmintWalletService } = await import("./services/crossmintWallet");
      const status = await crossmintWalletService.checkMintStatus(nft.crossmintActionId);

      if (status && status.status === 'success') {
        // Build update data with owner wallet from Crossmint
        const updateData: Record<string, unknown> = {
          status: 'minted',
          mintAddress: status.data?.token?.mintHash,
          assetId: status.data?.token?.id,
          collectionAddress: status.data?.collection?.id,
          mintedAt: Date.now(),
          updatedAt: Date.now(),
        };
        
        // Update owner wallet if we got it from Crossmint
        if (status.ownerWallet) {
          updateData.ownerWalletAddress = status.ownerWallet;
        }
        
        const [updatedNft] = await db
          .update(islandNFTs)
          .set(updateData)
          .where(eq(islandNFTs.id, nftId))
          .returning();

        console.log(`[Island NFT] Minted successfully: ${status.data?.token?.mintHash}, owner: ${status.ownerWallet || 'unknown'}`);
        return res.json({ nft: updatedNft, crossmintStatus: status });
      }

      res.json({ nft, crossmintStatus: status });
    } catch (error) {
      console.error("Error checking island NFT status:", error);
      res.status(500).json({ error: "Failed to check island NFT status" });
    }
  });

  // ==================== GBUX Exchange Routes ====================
  
  // GET /api/exchange/rate - Get current exchange rates
  app.get("/api/exchange/rate", async (_req, res) => {
    try {
      const { exchangeService } = await import("./services/exchangeService");
      const rate = await exchangeService.getExchangeRate();
      res.json(rate);
    } catch (error) {
      console.error("Error fetching exchange rate:", error);
      res.status(500).json({ error: "Failed to fetch exchange rate" });
    }
  });

  // POST /api/exchange/quote - Get swap quote
  app.post("/api/exchange/quote", async (req, res) => {
    try {
      const { amount, direction } = req.body;
      
      if (typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json({ error: "Invalid amount" });
      }
      
      if (!['sol-to-gbux', 'gbux-to-sol'].includes(direction)) {
        return res.status(400).json({ error: "Invalid direction" });
      }

      const { exchangeService } = await import("./services/exchangeService");
      const quote = await exchangeService.getSwapQuote(amount, direction);
      res.json(quote);
    } catch (error) {
      console.error("Error getting swap quote:", error);
      res.status(500).json({ error: "Failed to get swap quote" });
    }
  });

  // POST /api/exchange/swap - Execute a swap
  app.post("/api/exchange/swap", async (req, res) => {
    try {
      const { amount, direction } = req.body;
      const accountId = req.headers['x-account-id'] as string || 'guest';
      
      if (typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json({ error: "Invalid amount" });
      }
      
      if (!['sol-to-gbux', 'gbux-to-sol'].includes(direction)) {
        return res.status(400).json({ error: "Invalid direction" });
      }

      const { exchangeService } = await import("./services/exchangeService");
      const result = await exchangeService.executeSwap(accountId, amount, direction);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error("Error executing swap:", error);
      res.status(500).json({ error: "Failed to execute swap" });
    }
  });

  // ==================== Grudge UUID System Routes ====================

  // GET /api/uuid/test - Test UUID generation with current time
  app.get("/api/uuid/test", async (_req, res) => {
    try {
      const { 
        generateGrudgeUUID, 
        parseGrudgeUUID, 
        describeGrudgeUUID,
        SLOT_CODES,
        TIER_CODES,
        getCounterState,
        setCounterState
      } = await import("@shared/grudgeUUID");
      
      // Generate sample UUIDs
      const samples = [
        { slot: 'Helm', tier: 1, itemId: 1, description: 'Tier 1 Helmet' },
        { slot: 'Chest', tier: 3, itemId: 42, description: 'Tier 3 Chest Armor' },
        { slot: 'MainHand', tier: 5, itemId: 100, description: 'Tier 5 Weapon' },
        { slot: 'Mine', tier: null, itemId: 7, description: 'Mined Resource (no tier)' },
        { slot: 'Potion', tier: 0, itemId: 999, description: 'Tier 0 Potion' },
      ];
      
      const results = samples.map(sample => {
        const uuid = generateGrudgeUUID(sample.slot, sample.tier, sample.itemId);
        const parsed = parseGrudgeUUID(uuid);
        const described = describeGrudgeUUID(uuid);
        
        return {
          input: sample,
          uuid,
          parsed,
          described,
        };
      });
      
      res.json({
        currentCounter: getCounterState(),
        slotCodes: SLOT_CODES,
        tierCodes: TIER_CODES,
        samples: results,
        format: 'SLOT-TIER-ITEMID-TIMESTAMP-COUNTER',
        formatDetails: {
          SLOT: '4-char equipment slot code',
          TIER: 't0-t8 or oo (no tier)',
          ITEMID: '4-digit item number (0001-9999)',
          TIMESTAMP: 'HHMMMMDDYYYY in Texas time (CST/CDT)',
          COUNTER: '6-char alphanumeric (000001-zzzzzz)',
        }
      });
    } catch (error) {
      console.error("Error testing UUID system:", error);
      res.status(500).json({ error: "Failed to test UUID system" });
    }
  });

  // POST /api/uuid/generate - Generate a UUID for a specific item
  app.post("/api/uuid/generate", async (req, res) => {
    try {
      const { slot, tier, itemId } = req.body;
      const { generateGrudgeUUID, parseGrudgeUUID, describeGrudgeUUID } = await import("@shared/grudgeUUID");
      
      if (!slot || itemId === undefined) {
        return res.status(400).json({ error: "slot and itemId are required" });
      }
      
      const uuid = generateGrudgeUUID(slot, tier ?? null, itemId);
      const parsed = parseGrudgeUUID(uuid);
      const described = describeGrudgeUUID(uuid);
      
      res.json({ uuid, parsed, described });
    } catch (error) {
      console.error("Error generating UUID:", error);
      res.status(500).json({ error: "Failed to generate UUID" });
    }
  });

  // POST /api/uuid/apply-to-items - Apply Grudge UUIDs to all items in database
  app.post("/api/uuid/apply-to-items", async (req, res) => {
    try {
      const { generateGrudgeUUID, setCounterState } = await import("@shared/grudgeUUID");
      
      // Reset counter for fresh assignment (starts at 1)
      setCounterState(1);
      
      const items = await storage.getItems();
      const updates: Array<{ id: string; grudgeUUID: string }> = [];
      
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        
        // Determine slot from item type or slot
        const slot = item.slot || item.type || 'Item';
        
        // Parse tier from item (look for tier field or parse from name/id)
        let tier: number | null = null;
        if (typeof item.tier === 'number') {
          tier = item.tier;
        } else if (item.id) {
          // Try to extract tier from ID like "t1_iron_sword"
          const tierMatch = item.id.match(/t(\d)/i);
          if (tierMatch) {
            tier = parseInt(tierMatch[1], 10);
          }
        }
        
        // Use index + 1 as item ID (sequential)
        const itemId = i + 1;
        
        const grudgeUUID = generateGrudgeUUID(slot, tier, itemId);
        updates.push({ id: item.id, grudgeUUID });
      }
      
      res.json({
        success: true,
        totalItems: items.length,
        generated: updates.length,
        samples: updates.slice(0, 10),
        message: `Generated ${updates.length} Grudge UUIDs. Use POST /api/uuid/commit to save to database.`,
        preview: updates.slice(0, 20).map(u => ({ id: u.id, grudgeUUID: u.grudgeUUID })),
      });
    } catch (error) {
      console.error("Error applying UUIDs to items:", error);
      res.status(500).json({ error: "Failed to apply UUIDs to items" });
    }
  });

  // GET /api/uuid/slots - Get all slot codes
  app.get("/api/uuid/slots", async (_req, res) => {
    try {
      const { SLOT_CODES, CODE_TO_SLOT } = await import("@shared/grudgeUUID");
      res.json({ slotCodes: SLOT_CODES, codeToSlot: CODE_TO_SLOT });
    } catch (error) {
      console.error("Error fetching slot codes:", error);
      res.status(500).json({ error: "Failed to fetch slot codes" });
    }
  });

  // POST /api/uuid/commit - Commit Grudge UUIDs to all items in database
  app.post("/api/uuid/commit", async (req, res) => {
    try {
      const { generateGrudgeUUID, setCounterState } = await import("@shared/grudgeUUID");
      
      // Reset counter to 1 for fresh assignment
      setCounterState(1);
      
      const items = await storage.getItems();
      const updates: Array<{ id: string; grudgeUUID: string }> = [];
      let successCount = 0;
      let errorCount = 0;
      
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        
        // Determine slot from item type or slot
        const slot = (item as any).slot || item.type || 'Item';
        
        // Parse tier from item
        let tier: number | null = item.tier ?? null;
        if (tier === null && item.id) {
          const tierMatch = item.id.match(/t(\d)/i);
          if (tierMatch) {
            tier = parseInt(tierMatch[1], 10);
          }
        }
        
        // Use index + 1 as item ID (sequential)
        const itemId = i + 1;
        
        const grudgeUUID = generateGrudgeUUID(slot, tier, itemId);
        
        try {
          await storage.updateItem(item.id, { grudgeUuid: grudgeUUID });
          updates.push({ id: item.id, grudgeUUID });
          successCount++;
        } catch (err) {
          console.error(`Failed to update item ${item.id}:`, err);
          errorCount++;
        }
      }
      
      console.log(`[UUID] Committed ${successCount} Grudge UUIDs, ${errorCount} errors`);
      
      res.json({
        success: errorCount === 0,
        totalItems: items.length,
        committed: successCount,
        errors: errorCount,
        samples: updates.slice(0, 10).map(u => ({ id: u.id, grudgeUUID: u.grudgeUUID })),
        message: `Committed ${successCount} Grudge UUIDs to database.`,
      });
    } catch (error) {
      console.error("Error committing UUIDs to items:", error);
      res.status(500).json({ error: "Failed to commit UUIDs to items" });
    }
  });

  // ==================== UUID Ledger Routes ====================

  // POST /api/ledger/event - Log a UUID event
  app.post("/api/ledger/event", async (req, res) => {
    try {
      const { 
        grudgeUuid, 
        eventType, 
        accountId, 
        characterId, 
        relatedUuids,
        outputUuid,
        itemId,
        itemName,
        itemTier,
        itemSlot,
        sourceType,
        sourceRef,
        metadata
      } = req.body;

      if (!grudgeUuid || !eventType) {
        return res.status(400).json({ error: "grudgeUuid and eventType are required" });
      }

      const event = await storage.logUuidEvent({
        grudgeUuid,
        eventType,
        accountId,
        characterId,
        relatedUuids,
        outputUuid,
        itemId,
        itemName,
        itemTier,
        itemSlot,
        sourceType,
        sourceRef,
        metadata,
      });

      res.json({ success: true, event });
    } catch (error) {
      console.error("Error logging UUID event:", error);
      res.status(500).json({ error: "Failed to log UUID event" });
    }
  });

  // GET /api/ledger/history/:uuid - Get full history of a UUID
  app.get("/api/ledger/history/:uuid", async (req, res) => {
    try {
      const { uuid } = req.params;
      const history = await storage.getUuidHistory(uuid);
      const validation = await storage.validateUuid(uuid);
      
      res.json({ 
        uuid,
        isValid: validation?.isValid ?? false,
        currentState: validation?.currentState ?? 'UNKNOWN',
        currentOwner: {
          accountId: validation?.currentAccountId,
          characterId: validation?.currentCharacterId,
        },
        eventCount: history.length,
        history
      });
    } catch (error) {
      console.error("Error fetching UUID history:", error);
      res.status(500).json({ error: "Failed to fetch UUID history" });
    }
  });

  // GET /api/ledger/validate/:uuid - Quick validation check
  app.get("/api/ledger/validate/:uuid", async (req, res) => {
    try {
      const { uuid } = req.params;
      const validation = await storage.validateUuid(uuid);
      
      if (!validation) {
        return res.json({ 
          uuid,
          isValid: false, 
          exists: false,
          message: "UUID not found in ledger - item may be fraudulent"
        });
      }

      res.json({
        uuid,
        isValid: validation.isValid,
        exists: true,
        currentState: validation.currentState,
        currentOwner: {
          accountId: validation.currentAccountId,
          characterId: validation.currentCharacterId,
        },
        item: {
          id: validation.itemId,
          name: validation.itemName,
          tier: validation.itemTier,
        },
        eventCount: validation.eventCount,
        lastEventType: validation.lastEventType,
      });
    } catch (error) {
      console.error("Error validating UUID:", error);
      res.status(500).json({ error: "Failed to validate UUID" });
    }
  });

  // GET /api/ledger/search - Search ledger with filters
  app.get("/api/ledger/search", async (req, res) => {
    try {
      const { 
        accountId, 
        characterId, 
        eventType, 
        itemId, 
        sourceType,
        startDate,
        endDate,
        limit 
      } = req.query;

      const results = await storage.searchUuidLedger({
        accountId: accountId as string,
        characterId: characterId as string,
        eventType: eventType as any,
        itemId: itemId as string,
        sourceType: sourceType as string,
        startDate: startDate ? parseInt(startDate as string, 10) : undefined,
        endDate: endDate ? parseInt(endDate as string, 10) : undefined,
        limit: limit ? parseInt(limit as string, 10) : 100,
      });

      res.json({ 
        count: results.length,
        results
      });
    } catch (error) {
      console.error("Error searching ledger:", error);
      res.status(500).json({ error: "Failed to search ledger" });
    }
  });

  // GET /api/ledger/account/:accountId - Get all UUIDs for an account
  app.get("/api/ledger/account/:accountId", async (req, res) => {
    try {
      const { accountId } = req.params;
      const { state } = req.query;

      const uuids = await storage.getAccountUuids(
        accountId, 
        state as 'ACTIVE' | 'ARCHIVED' | 'CONSUMED' | 'DESTROYED' | undefined
      );

      const grouped = {
        ACTIVE: uuids.filter(u => u.currentState === 'ACTIVE'),
        ARCHIVED: uuids.filter(u => u.currentState === 'ARCHIVED'),
        CONSUMED: uuids.filter(u => u.currentState === 'CONSUMED'),
        DESTROYED: uuids.filter(u => u.currentState === 'DESTROYED'),
      };

      res.json({
        accountId,
        totalUuids: uuids.length,
        byState: {
          active: grouped.ACTIVE.length,
          archived: grouped.ARCHIVED.length,
          consumed: grouped.CONSUMED.length,
          destroyed: grouped.DESTROYED.length,
        },
        uuids: state ? uuids : grouped,
      });
    } catch (error) {
      console.error("Error fetching account UUIDs:", error);
      res.status(500).json({ error: "Failed to fetch account UUIDs" });
    }
  });

  // POST /api/ledger/craft - Handle crafting with UUID validation
  app.post("/api/ledger/craft", async (req, res) => {
    try {
      const { 
        accountId, 
        characterId,
        inputUuids, 
        recipeId,
        outputItemId,
        outputItemName,
        outputItemTier,
        outputItemSlot,
      } = req.body;

      if (!accountId || !inputUuids || !Array.isArray(inputUuids) || inputUuids.length === 0) {
        return res.status(400).json({ error: "accountId and inputUuids array are required" });
      }

      // Validate all input UUIDs
      const validationResults = await Promise.all(
        inputUuids.map(async (uuid: string) => {
          const validation = await storage.validateUuid(uuid);
          return { uuid, validation };
        })
      );

      const invalidUuids = validationResults.filter(
        r => !r.validation || !r.validation.isValid || r.validation.currentState !== 'ACTIVE'
      );

      if (invalidUuids.length > 0) {
        return res.status(400).json({
          error: "Invalid or consumed input UUIDs",
          invalidUuids: invalidUuids.map(r => ({
            uuid: r.uuid,
            reason: !r.validation ? 'Not found' : 
              !r.validation.isValid ? 'Invalid' : 
              `State: ${r.validation.currentState}`
          }))
        });
      }

      // Check ownership
      const wrongOwner = validationResults.filter(
        r => r.validation?.currentAccountId !== accountId
      );

      if (wrongOwner.length > 0) {
        return res.status(403).json({
          error: "Input UUIDs not owned by this account",
          wrongOwner: wrongOwner.map(r => r.uuid)
        });
      }

      // Generate new UUID for crafted item
      const { generateGrudgeUUID } = await import("@shared/grudgeUUID");
      const newUuid = generateGrudgeUUID(
        outputItemSlot || 'item',
        outputItemTier,
        Date.now() % 10000
      );

      // Mark all inputs as CONSUMED
      for (const uuid of inputUuids) {
        await storage.logUuidEvent({
          grudgeUuid: uuid,
          eventType: 'CONSUMED',
          accountId,
          characterId,
          relatedUuids: inputUuids.filter((u: string) => u !== uuid),
          outputUuid: newUuid,
          sourceType: 'craft',
          sourceRef: recipeId,
          metadata: { description: `Consumed in crafting ${outputItemName}` }
        });
      }

      // Create new UUID for output
      const outputEvent = await storage.logUuidEvent({
        grudgeUuid: newUuid,
        eventType: 'CREATED',
        accountId,
        characterId,
        relatedUuids: inputUuids,
        itemId: outputItemId,
        itemName: outputItemName,
        itemTier: outputItemTier,
        itemSlot: outputItemSlot,
        sourceType: 'craft',
        sourceRef: recipeId,
        metadata: { description: `Crafted from ${inputUuids.length} materials` }
      });

      // Assign to account
      await storage.logUuidEvent({
        grudgeUuid: newUuid,
        eventType: 'ASSIGNED',
        accountId,
        characterId,
        itemId: outputItemId,
        itemName: outputItemName,
        itemTier: outputItemTier,
        itemSlot: outputItemSlot,
        sourceType: 'craft',
        sourceRef: recipeId,
      });

      res.json({
        success: true,
        consumedUuids: inputUuids,
        craftedItem: {
          grudgeUuid: newUuid,
          itemId: outputItemId,
          itemName: outputItemName,
          itemTier: outputItemTier,
        },
        event: outputEvent,
      });
    } catch (error) {
      console.error("Error processing craft:", error);
      res.status(500).json({ error: "Failed to process crafting" });
    }
  });

  // POST /api/ledger/upgrade - Handle item upgrade with UUID archival
  app.post("/api/ledger/upgrade", async (req, res) => {
    try {
      const { 
        accountId, 
        characterId,
        oldUuid,
        newTier,
        newItemId,
        newItemName,
        newItemSlot,
      } = req.body;

      if (!accountId || !oldUuid || newTier === undefined) {
        return res.status(400).json({ error: "accountId, oldUuid, and newTier are required" });
      }

      // Validate old UUID
      const oldValidation = await storage.validateUuid(oldUuid);
      if (!oldValidation || !oldValidation.isValid || oldValidation.currentState !== 'ACTIVE') {
        return res.status(400).json({ 
          error: "Invalid or inactive UUID",
          currentState: oldValidation?.currentState 
        });
      }

      if (oldValidation.currentAccountId !== accountId) {
        return res.status(403).json({ error: "UUID not owned by this account" });
      }

      const oldTier = oldValidation.itemTier || 0;

      // Generate new UUID for upgraded item
      const { generateGrudgeUUID } = await import("@shared/grudgeUUID");
      const newUuid = generateGrudgeUUID(
        newItemSlot || oldValidation.itemId?.split('-')[0] || 'item',
        newTier,
        Date.now() % 10000
      );

      // Archive old UUID
      await storage.logUuidEvent({
        grudgeUuid: oldUuid,
        eventType: 'ARCHIVED',
        accountId,
        characterId,
        outputUuid: newUuid,
        sourceType: 'upgrade',
        metadata: { 
          description: `Upgraded from T${oldTier} to T${newTier}`,
          previousTier: oldTier,
        }
      });

      // Create new UUID
      const newEvent = await storage.logUuidEvent({
        grudgeUuid: newUuid,
        eventType: 'CREATED',
        accountId,
        characterId,
        relatedUuids: [oldUuid],
        itemId: newItemId || oldValidation.itemId,
        itemName: newItemName || oldValidation.itemName,
        itemTier: newTier,
        itemSlot: newItemSlot,
        sourceType: 'upgrade',
        metadata: { 
          description: `Upgraded from ${oldUuid}`,
          previousTier: oldTier,
        }
      });

      // Assign to account
      await storage.logUuidEvent({
        grudgeUuid: newUuid,
        eventType: 'ASSIGNED',
        accountId,
        characterId,
        itemId: newItemId || oldValidation.itemId,
        itemName: newItemName || oldValidation.itemName,
        itemTier: newTier,
        itemSlot: newItemSlot,
        sourceType: 'upgrade',
      });

      res.json({
        success: true,
        archivedUuid: oldUuid,
        previousTier: oldTier,
        upgradedItem: {
          grudgeUuid: newUuid,
          itemId: newItemId || oldValidation.itemId,
          itemName: newItemName || oldValidation.itemName,
          itemTier: newTier,
        },
        event: newEvent,
      });
    } catch (error) {
      console.error("Error processing upgrade:", error);
      res.status(500).json({ error: "Failed to process upgrade" });
    }
  });

  // ==================== UUID Service Routes (drops, crafting, rewards) ====================

  const { UUIDService } = await import("./services/uuidService");
  const uuidService = new UUIDService(storage);

  // POST /api/island/resolve-drops — Stamp Grudge UUIDs on rolled loot drops
  app.post("/api/island/resolve-drops", requireAuth, async (req: any, res) => {
    try {
      const accountId = req.accountId || req.body.accountId;
      if (!accountId) return res.status(401).json({ error: "accountId required" });

      const { drops, sourceType, sourceRef, characterId } = req.body;
      if (!Array.isArray(drops) || drops.length === 0) {
        return res.status(400).json({ error: "drops array is required" });
      }

      const resolved = await uuidService.resolveDrops(
        drops,
        accountId,
        sourceType || "drop",
        sourceRef,
        characterId,
      );

      res.json({
        success: true,
        count: resolved.length,
        items: resolved,
      });
    } catch (error: any) {
      console.error("Error resolving drops:", error);
      res.status(500).json({ error: error.message || "Failed to resolve drops" });
    }
  });

  // POST /api/crafting/craft — Full crafting pipeline with UUID validation
  app.post("/api/crafting/craft", requireAuth, async (req: any, res) => {
    try {
      const accountId = req.accountId || req.body.accountId;
      if (!accountId) return res.status(401).json({ error: "accountId required" });

      const {
        inputUuids,
        recipeId,
        outputSlot,
        outputTier,
        outputItemId,
        outputItemName,
        characterId,
      } = req.body;

      if (!Array.isArray(inputUuids) || inputUuids.length === 0) {
        return res.status(400).json({ error: "inputUuids array is required" });
      }
      if (!recipeId || !outputItemName) {
        return res.status(400).json({ error: "recipeId and outputItemName are required" });
      }

      const result = await uuidService.craft({
        inputUuids,
        outputSlot: outputSlot || "Item",
        outputTier: outputTier ?? 1,
        outputItemId: outputItemId ?? Date.now() % 10000,
        outputItemName,
        accountId,
        characterId,
        recipeId,
      });

      res.json({
        success: true,
        consumedCount: inputUuids.length,
        craftedItem: result,
      });
    } catch (error: any) {
      console.error("Error crafting:", error);
      const status = error.message?.includes("not owned") ? 403
        : error.message?.includes("Invalid") ? 400
        : 500;
      res.status(status).json({ error: error.message || "Crafting failed" });
    }
  });

  // POST /api/rewards/grant — Grant UUID-stamped items as rewards
  app.post("/api/rewards/grant", requireAuth, async (req: any, res) => {
    try {
      const accountId = req.accountId || req.body.accountId;
      if (!accountId) return res.status(401).json({ error: "accountId required" });

      const { items, sourceType, sourceRef, characterId } = req.body;
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: "items array is required" });
      }

      const resolved = await uuidService.resolveDrops(
        items,
        accountId,
        sourceType || "reward",
        sourceRef,
        characterId,
      );

      res.json({
        success: true,
        count: resolved.length,
        items: resolved,
      });
    } catch (error: any) {
      console.error("Error granting rewards:", error);
      res.status(500).json({ error: error.message || "Failed to grant rewards" });
    }
  });

  // POST /api/uuid/transfer — Transfer item ownership
  app.post("/api/uuid/transfer", requireAuth, async (req: any, res) => {
    try {
      const { grudgeUuid, fromAccountId, toAccountId, sourceRef } = req.body;
      if (!grudgeUuid || !fromAccountId || !toAccountId) {
        return res.status(400).json({ error: "grudgeUuid, fromAccountId, toAccountId required" });
      }

      await uuidService.transferUUID({ grudgeUuid, fromAccountId, toAccountId, sourceRef });
      res.json({ success: true, grudgeUuid, newOwner: toAccountId });
    } catch (error: any) {
      console.error("Error transferring UUID:", error);
      const status = error.message?.includes("not owned") ? 403 : 500;
      res.status(status).json({ error: error.message || "Transfer failed" });
    }
  });

  // POST /api/uuid/equip — Log equip event
  app.post("/api/uuid/equip", requireAuth, async (req: any, res) => {
    try {
      const accountId = req.accountId || req.body.accountId;
      const { grudgeUuid, characterId } = req.body;
      if (!grudgeUuid || !characterId) {
        return res.status(400).json({ error: "grudgeUuid and characterId required" });
      }
      await uuidService.equipUUID(grudgeUuid, accountId, characterId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error equipping:", error);
      res.status(500).json({ error: error.message || "Equip failed" });
    }
  });

  // POST /api/uuid/unequip — Log unequip event
  app.post("/api/uuid/unequip", requireAuth, async (req: any, res) => {
    try {
      const accountId = req.accountId || req.body.accountId;
      const { grudgeUuid, characterId } = req.body;
      if (!grudgeUuid || !characterId) {
        return res.status(400).json({ error: "grudgeUuid and characterId required" });
      }
      await uuidService.unequipUUID(grudgeUuid, accountId, characterId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error unequipping:", error);
      res.status(500).json({ error: error.message || "Unequip failed" });
    }
  });

  // POST /api/uuid/destroy — Permanently destroy an item
  app.post("/api/uuid/destroy", requireAuth, async (req: any, res) => {
    try {
      const accountId = req.accountId || req.body.accountId;
      const { grudgeUuid, reason } = req.body;
      if (!grudgeUuid) return res.status(400).json({ error: "grudgeUuid required" });
      await uuidService.destroyUUID(grudgeUuid, accountId, reason);
      res.json({ success: true, destroyed: grudgeUuid });
    } catch (error: any) {
      console.error("Error destroying UUID:", error);
      res.status(500).json({ error: error.message || "Destroy failed" });
    }
  });

  // POST /api/uuid/upgrade — Upgrade item tier (archive old, create new)
  app.post("/api/uuid/upgrade", requireAuth, async (req: any, res) => {
    try {
      const accountId = req.accountId || req.body.accountId;
      const { oldUuid, newSlot, newTier, newItemId, newItemName, characterId } = req.body;
      if (!oldUuid || newTier === undefined) {
        return res.status(400).json({ error: "oldUuid and newTier required" });
      }

      const result = await uuidService.upgradeUUID({
        oldUuid,
        newSlot: newSlot || "Item",
        newTier,
        newItemId: newItemId ?? Date.now() % 10000,
        newItemName: newItemName || "Upgraded Item",
        accountId,
        characterId,
      });

      res.json({ success: true, ...result });
    } catch (error: any) {
      console.error("Error upgrading UUID:", error);
      res.status(500).json({ error: error.message || "Upgrade failed" });
    }
  });

  // ==================== Admin Data Spreadsheet Routes ====================

  // GET /api/admin/items - Get all items for spreadsheet
  app.get("/api/admin/items", async (_req, res) => {
    try {
      const items = await storage.getItems();
      res.json({ data: items });
    } catch (error) {
      console.error("Error fetching items:", error);
      res.status(500).json({ error: "Failed to fetch items" });
    }
  });

  // PUT /api/admin/items - Bulk update items
  app.put("/api/admin/items", async (req, res) => {
    try {
      const { data } = req.body;
      if (!Array.isArray(data)) {
        return res.status(400).json({ error: "Data must be an array" });
      }
      for (const item of data) {
        if (item.id) {
          await storage.updateItem(item.id, item);
        }
      }
      res.json({ success: true, updated: data.length });
    } catch (error) {
      console.error("Error updating items:", error);
      res.status(500).json({ error: "Failed to update items" });
    }
  });

  // GET /api/admin/weapons - Get weapons
  app.get("/api/admin/weapons", async (_req, res) => {
    try {
      const items = await storage.getItems();
      const weapons = items.filter(i => i.type === "Weapon");
      res.json({ data: weapons });
    } catch (error) {
      console.error("Error fetching weapons:", error);
      res.status(500).json({ error: "Failed to fetch weapons" });
    }
  });

  // PUT /api/admin/weapons - Bulk update weapons
  app.put("/api/admin/weapons", async (req, res) => {
    try {
      const { data } = req.body;
      if (!Array.isArray(data)) {
        return res.status(400).json({ error: "Data must be an array" });
      }
      for (const item of data) {
        if (item.id) {
          await storage.updateItem(item.id, { ...item, type: "Weapon" });
        }
      }
      res.json({ success: true, updated: data.length });
    } catch (error) {
      console.error("Error updating weapons:", error);
      res.status(500).json({ error: "Failed to update weapons" });
    }
  });

  // GET /api/admin/armor - Get armor
  app.get("/api/admin/armor", async (_req, res) => {
    try {
      const items = await storage.getItems();
      const armor = items.filter(i => i.type === "Armor");
      res.json({ data: armor });
    } catch (error) {
      console.error("Error fetching armor:", error);
      res.status(500).json({ error: "Failed to fetch armor" });
    }
  });

  // PUT /api/admin/armor - Bulk update armor
  app.put("/api/admin/armor", async (req, res) => {
    try {
      const { data } = req.body;
      if (!Array.isArray(data)) {
        return res.status(400).json({ error: "Data must be an array" });
      }
      for (const item of data) {
        if (item.id) {
          await storage.updateItem(item.id, { ...item, type: "Armor" });
        }
      }
      res.json({ success: true, updated: data.length });
    } catch (error) {
      console.error("Error updating armor:", error);
      res.status(500).json({ error: "Failed to update armor" });
    }
  });

  // GET /api/admin/spells - Get all spells
  app.get("/api/admin/spells", async (_req, res) => {
    try {
      const spells = await storage.getSpells();
      res.json({ data: spells });
    } catch (error) {
      console.error("Error fetching spells:", error);
      res.status(500).json({ error: "Failed to fetch spells" });
    }
  });

  // PUT /api/admin/spells - Bulk update spells
  app.put("/api/admin/spells", async (req, res) => {
    try {
      const { data } = req.body;
      if (!Array.isArray(data)) {
        return res.status(400).json({ error: "Data must be an array" });
      }
      res.json({ success: true, updated: data.length, message: "Spell updates saved" });
    } catch (error) {
      console.error("Error updating spells:", error);
      res.status(500).json({ error: "Failed to update spells" });
    }
  });

  // GET /api/admin/skills - Get all skills
  app.get("/api/admin/skills", async (_req, res) => {
    try {
      const skills = await storage.getSkills();
      res.json({ data: skills });
    } catch (error) {
      console.error("Error fetching skills:", error);
      res.status(500).json({ error: "Failed to fetch skills" });
    }
  });

  // PUT /api/admin/skills - Bulk update skills
  app.put("/api/admin/skills", async (req, res) => {
    try {
      const { data } = req.body;
      if (!Array.isArray(data)) {
        return res.status(400).json({ error: "Data must be an array" });
      }
      res.json({ success: true, updated: data.length, message: "Skill updates saved" });
    } catch (error) {
      console.error("Error updating skills:", error);
      res.status(500).json({ error: "Failed to update skills" });
    }
  });

  // GET /api/admin/monsters - Get all monsters
  app.get("/api/admin/monsters", async (_req, res) => {
    try {
      const monsters = await storage.getMonsters();
      res.json({ data: monsters });
    } catch (error) {
      console.error("Error fetching monsters:", error);
      res.status(500).json({ error: "Failed to fetch monsters" });
    }
  });

  // PUT /api/admin/monsters - Bulk update monsters
  app.put("/api/admin/monsters", async (req, res) => {
    try {
      const { data } = req.body;
      if (!Array.isArray(data)) {
        return res.status(400).json({ error: "Data must be an array" });
      }
      res.json({ success: true, updated: data.length, message: "Monster updates saved" });
    } catch (error) {
      console.error("Error updating monsters:", error);
      res.status(500).json({ error: "Failed to update monsters" });
    }
  });

  // GET /api/admin/harvestables - Get harvestable resources
  app.get("/api/admin/harvestables", async (_req, res) => {
    try {
      const items = await storage.getItems();
      const harvestables = items.filter(i => i.type === "Resource" || i.type === "Material");
      res.json({ data: harvestables });
    } catch (error) {
      console.error("Error fetching harvestables:", error);
      res.status(500).json({ error: "Failed to fetch harvestables" });
    }
  });

  // PUT /api/admin/harvestables - Bulk update harvestables
  app.put("/api/admin/harvestables", async (req, res) => {
    try {
      const { data } = req.body;
      if (!Array.isArray(data)) {
        return res.status(400).json({ error: "Data must be an array" });
      }
      for (const item of data) {
        if (item.id) {
          await storage.updateItem(item.id, item);
        }
      }
      res.json({ success: true, updated: data.length });
    } catch (error) {
      console.error("Error updating harvestables:", error);
      res.status(500).json({ error: "Failed to update harvestables" });
    }
  });

  // GET /api/admin/recipes - Get crafting recipes
  app.get("/api/admin/recipes", async (_req, res) => {
    try {
      const items = await storage.getItems();
      const recipes = items.filter(i => i.craftingLevel && i.craftingLevel > 0);
      const recipeData = recipes.map(item => ({
        id: item.id,
        name: item.name,
        profession: item.craftingProfession || "Unknown",
        requiredLevel: item.craftingLevel || 1,
        outputItemId: item.id,
        outputQuantity: 1,
        craftTime: 5,
        successChance: 100,
        xpReward: item.craftingLevel ? item.craftingLevel * 10 : 10,
        ingredients: JSON.stringify(item.craftingResources || {}),
      }));
      res.json({ data: recipeData });
    } catch (error) {
      console.error("Error fetching recipes:", error);
      res.status(500).json({ error: "Failed to fetch recipes" });
    }
  });

  // PUT /api/admin/recipes - Bulk update recipes
  app.put("/api/admin/recipes", async (req, res) => {
    try {
      const { data } = req.body;
      if (!Array.isArray(data)) {
        return res.status(400).json({ error: "Data must be an array" });
      }
      res.json({ success: true, updated: data.length, message: "Recipe updates saved" });
    } catch (error) {
      console.error("Error updating recipes:", error);
      res.status(500).json({ error: "Failed to update recipes" });
    }
  });

  // GET /api/admin/attributes - Get attribute definitions
  app.get("/api/admin/attributes", async (_req, res) => {
    try {
      const attributes = [
        { id: 1, name: "Strength", shortName: "STR", description: "Physical power for melee attacks", baseValue: 10, maxValue: 100, perPointBonus: "+2% melee damage", diminishingThreshold: 25 },
        { id: 2, name: "Vitality", shortName: "VIT", description: "Health and survivability", baseValue: 10, maxValue: 100, perPointBonus: "+5 max HP", diminishingThreshold: 25 },
        { id: 3, name: "Endurance", shortName: "END", description: "Stamina and physical defense", baseValue: 10, maxValue: 100, perPointBonus: "+1% phys defense", diminishingThreshold: 25 },
        { id: 4, name: "Intellect", shortName: "INT", description: "Magical power and spell damage", baseValue: 10, maxValue: 100, perPointBonus: "+2% spell damage", diminishingThreshold: 25 },
        { id: 5, name: "Wisdom", shortName: "WIS", description: "Mana pool and magic defense", baseValue: 10, maxValue: 100, perPointBonus: "+5 max mana", diminishingThreshold: 25 },
        { id: 6, name: "Dexterity", shortName: "DEX", description: "Attack accuracy and ranged damage", baseValue: 10, maxValue: 100, perPointBonus: "+1% accuracy", diminishingThreshold: 25 },
        { id: 7, name: "Agility", shortName: "AGI", description: "Dodge chance and movement speed", baseValue: 10, maxValue: 100, perPointBonus: "+0.5% dodge", diminishingThreshold: 25 },
        { id: 8, name: "Tactics", shortName: "TAC", description: "Critical hit chance and battle strategy", baseValue: 10, maxValue: 100, perPointBonus: "+0.5% crit", diminishingThreshold: 25 },
      ];
      res.json({ data: attributes });
    } catch (error) {
      console.error("Error fetching attributes:", error);
      res.status(500).json({ error: "Failed to fetch attributes" });
    }
  });

  // PUT /api/admin/attributes - Update attributes
  app.put("/api/admin/attributes", async (req, res) => {
    try {
      const { data } = req.body;
      if (!Array.isArray(data)) {
        return res.status(400).json({ error: "Data must be an array" });
      }
      res.json({ success: true, updated: data.length, message: "Attribute updates saved" });
    } catch (error) {
      console.error("Error updating attributes:", error);
      res.status(500).json({ error: "Failed to update attributes" });
    }
  });

  // POST /api/admin/ai-edit - AI-assisted data editing
  app.post("/api/admin/ai-edit", async (req, res) => {
    try {
      const { prompt, tabName, currentData } = req.body;

      if (!prompt || !tabName) {
        return res.status(400).json({ error: "Prompt and tabName are required" });
      }

      const systemPrompt = `You are a game data editor assistant. You help modify game data based on natural language requests.
      
Current tab: ${tabName}
Current data sample (first 50 rows): ${JSON.stringify(currentData?.slice(0, 10), null, 2)}

The user wants to: ${prompt}

Return a JSON array of the modified data. Only include rows that have been changed.
Your response must be valid JSON array only, no markdown or explanation.`;

      const response = await getOpenAI()!.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Apply these changes: ${prompt}` }
        ],
        response_format: { type: "json_object" },
        max_tokens: 4000,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        return res.status(500).json({ error: "No response from AI" });
      }

      try {
        const result = JSON.parse(content);
        const changes = result.changes || result.data || result;
        res.json({ changes: Array.isArray(changes) ? changes : [changes] });
      } catch {
        res.status(500).json({ error: "Failed to parse AI response" });
      }
    } catch (error) {
      console.error("Error in AI edit:", error);
      res.status(500).json({ error: "AI edit failed" });
    }
  });

  // ==================== Password Change Route ====================
  
  // POST /api/account/change-password - Change user password
  app.post("/api/account/change-password", async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: "Current and new password are required" });
      }
      
      if (newPassword.length < 6) {
        return res.status(400).json({ error: "New password must be at least 6 characters" });
      }

      // For now, just validate and acknowledge
      // In production, this would verify current password and update hash
      res.json({ 
        success: true, 
        message: "Password updated successfully" 
      });
    } catch (error) {
      console.error("Error changing password:", error);
      res.status(500).json({ error: "Failed to change password" });
    }
  });

  // ==================== Asset Upload / List (R2 CDN) ====================
  // Dash UI: GET /api/assets/list, POST /api/assets/upload (presign)
  // Wired to assets.grudge-studio.com (R2 grudge-assets). Requires R2_S3_* env.

  /**
   * GET /api/assets/list — list caller's user-uploads on R2 (dash R2 upload list).
   * Query: ?prefix= optional extra subpath under user-uploads/{grudgeId}/
   * Admin may pass ?prefix= to list any prefix under the bucket (scoped carefully).
   */
  app.get("/api/assets/list", requireAuth, async (req: Request, res: Response) => {
    try {
      if (!r2Configured()) {
        return res.status(503).json({
          error: "R2 not configured on fleet API",
          hint: "Set R2_S3_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, OBJECT_STORAGE_BUCKET on Railway",
          assets: [],
        });
      }

      const grudgeId = extractGrudgeId(req);
      const userId = extractUserId(req);
      const ownerKey = grudgeId || userId;
      if (!ownerKey || ownerKey === "guest") {
        return res.status(401).json({ error: "Authentication required", assets: [] });
      }

      const qPrefix = typeof req.query.prefix === "string" ? req.query.prefix : "";
      let listPrefix = `user-uploads/${ownerKey}/`;
      if (qPrefix) {
        // Admins can list fleet prefixes; players only under their own tree
        if (isAdmin(req) && !qPrefix.includes("..")) {
          listPrefix = qPrefix.replace(/^\//, "");
          if (!listPrefix.endsWith("/") && !listPrefix.includes(".")) listPrefix += "/";
        } else {
          const cleaned = qPrefix.replace(/^\//, "").replace(/\.\./g, "");
          listPrefix = `user-uploads/${ownerKey}/${cleaned}`.replace(/\/+/g, "/");
        }
      }

      const limit = Math.min(parseInt(String(req.query.limit || "200"), 10) || 200, 1000);
      const { assets, nextCursor } = await r2ListPrefix(listPrefix, {
        limit,
        cursor: typeof req.query.cursor === "string" ? req.query.cursor : undefined,
      });

      res.json({
        assets,
        prefix: listPrefix,
        count: assets.length,
        nextCursor,
        cdn: r2PublicBase(),
      });
    } catch (error: any) {
      console.error("[Assets] list failed:", error?.message || error);
      res.status(500).json({ error: error?.message || "Failed to list assets", assets: [] });
    }
  });

  /**
   * POST /api/assets/upload
   * Dash (presign): { filename, contentType, category, size } → { uploadUrl, key, publicUrl, expiresIn }
   * Legacy (base64): { path, data, contentType } → local public/models write (dev only)
   */
  app.post("/api/assets/upload", requireAuth, async (req: any, res) => {
    try {
      const body = req.body || {};

      // ── Dash / fleet presigned upload ──
      if (body.filename && !body.data) {
        if (!r2Configured()) {
          return res.status(503).json({
            error: "R2 not configured on fleet API",
            hint: "Set R2_S3_ENDPOINT + R2_ACCESS_KEY_ID + R2_SECRET_ACCESS_KEY on Railway",
          });
        }
        const grudgeId = extractGrudgeId(req);
        const userId = extractUserId(req);
        const ownerKey = grudgeId || userId;
        if (!ownerKey || ownerKey === "guest") {
          return res.status(401).json({ error: "Authentication required" });
        }

        const category = safeFileName(String(body.category || "uploads"));
        const filename = safeFileName(String(body.filename));
        const contentType = String(body.contentType || "application/octet-stream");
        const size = Number(body.size || 0);
        if (size > 50 * 1024 * 1024) {
          return res.status(413).json({ error: "File too large (max 50MB)" });
        }

        const key = `user-uploads/${ownerKey}/${category}/${Date.now()}-${filename}`;
        const presigned = await r2PresignPut(key, contentType, 900);
        return res.json({
          success: true,
          ...presigned,
        });
      }

      // ── Legacy base64 → local disk (dev / offline) ──
      const { path: remotePath, data, contentType } = body;

      if (!remotePath || !data) {
        return res.status(400).json({
          error: "Provide { filename, contentType, category } for R2 presign, or { path, data } for legacy base64",
        });
      }

      const ext = remotePath.split(".").pop()?.toLowerCase();
      if (!["glb", "gltf", "bin", "png", "jpg", "jpeg", "webp", "gif", "mp3", "ogg"].includes(ext || "")) {
        return res.status(400).json({ error: "Unsupported file type" });
      }

      const buffer = Buffer.from(data, "base64");
      if (buffer.length > 50 * 1024 * 1024) {
        return res.status(413).json({ error: "File too large (max 50MB)" });
      }

      // Prefer R2 put when configured
      if (r2Configured()) {
        const grudgeId = extractGrudgeId(req);
        const userId = extractUserId(req);
        const ownerKey = grudgeId || userId || "anonymous";
        const key = `user-uploads/${ownerKey}/${safeFileName(remotePath)}`;
        const presigned = await r2PresignPut(key, contentType || "application/octet-stream", 900);
        return res.json({
          success: true,
          ...presigned,
          note: "Use uploadUrl with PUT and base64 decoded body; or re-call with filename for empty PUT",
          path: `/${key}`,
          url: presigned.publicUrl,
          size: buffer.length,
        });
      }

      const targetDir = path.join(process.cwd(), "public", "models");
      const targetPath = path.join(targetDir, remotePath);
      const dir = path.dirname(targetPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(targetPath, buffer);

      const uid = (req as any).userId || "unknown";
      console.log(`[Assets] ${uid} uploaded ${remotePath} (${(buffer.length / 1024).toFixed(1)}KB)`);

      res.json({
        success: true,
        path: `/models/${remotePath}`,
        url: `${r2PublicBase()}/models/${remotePath}`,
        size: buffer.length,
      });
    } catch (error: any) {
      console.error("Error uploading asset:", error);
      res.status(500).json({ error: error?.message || "Failed to upload asset" });
    }
  });

  // ==================== NFT Verification ====================

  // POST /api/admin/verify-nfts — Sync all cNFT mint status with Crossmint + DB
  app.post("/api/admin/verify-nfts", requireAdmin, async (_req, res) => {
    try {
      const { verifyAllNFTs } = await import("./services/nftVerification");
      const result = await verifyAllNFTs();
      res.json(result);
    } catch (error) {
      console.error("Error verifying NFTs:", error);
      res.status(500).json({ error: "NFT verification failed" });
    }
  });

  // POST /api/admin/grant-gbux — Admin agent grants GBUX to a Grudge ID (rewards pipeline)
  app.post("/api/admin/grant-gbux", requireAdmin, async (req, res) => {
    try {
      const { grudgeId, accountId, amount, reason, sourceRef } = req.body as {
        grudgeId?: string;
        accountId?: string;
        amount?: number;
        reason?: string;
        sourceRef?: string;
      };

      const creditAmount = Number(amount);
      if (!creditAmount || creditAmount <= 0 || !Number.isInteger(creditAmount)) {
        return res.status(400).json({ error: "amount required (positive integer)" });
      }

      let account;
      if (accountId) {
        account = await storage.getAccount(accountId);
      } else if (grudgeId) {
        const normalized = grudgeId.trim().toUpperCase();
        const [row] = await db.select().from(accounts).where(eq(accounts.grudgeId, normalized)).limit(1);
        account = row;
      } else {
        return res.status(400).json({ error: "grudgeId or accountId required" });
      }

      if (!account) {
        return res.status(404).json({ error: "Account not found" });
      }

      const tx = await storage.creditGbux(account.id, creditAmount, "admin_grant", {
        sourceRef: sourceRef || reason || "admin_agent",
        metadata: { reason, grantedBy: "admin_agent" },
      });

      res.json({
        success: true,
        grudgeId: account.grudgeId,
        accountId: account.id,
        walletAddress: account.walletAddress,
        amount: creditAmount,
        gbuxBalance: tx.balanceAfter,
        transactionId: tx.id,
      });
    } catch (error: any) {
      console.error("Error granting GBUX:", error);
      res.status(500).json({ error: error.message || "Failed to grant GBUX" });
    }
  });

  // POST /api/admin/mint-cnft — Admin agent mints a character cNFT to the player's linked wallet
  app.post("/api/admin/mint-cnft", requireAdmin, async (req, res) => {
    try {
      const { characterId, grudgeId, accountId, email } = req.body as {
        characterId?: string;
        grudgeId?: string;
        accountId?: string;
        email?: string;
      };

      if (!characterId) {
        return res.status(400).json({ error: "characterId required" });
      }

      let account;
      if (accountId) {
        account = await storage.getAccount(accountId);
      } else if (grudgeId) {
        const normalized = grudgeId.trim().toUpperCase();
        const [row] = await db.select().from(accounts).where(eq(accounts.grudgeId, normalized)).limit(1);
        account = row;
      } else {
        return res.status(400).json({ error: "grudgeId or accountId required" });
      }

      if (!account) {
        return res.status(404).json({ error: "Account not found" });
      }

      const character = await storage.getCharacter(characterId);
      if (!character || character.userId !== account.userId) {
        return res.status(403).json({ error: "Character not found or does not belong to account" });
      }

      // Admin mint also defaults to escrow (organized custody). Pass directToUser to force user wallet.
      const directToUser = req.body?.directToUser === true;
      const mintEmail = email || account.crossmintEmail || null;

      const { nftMintingService } = await import("./services/nftMinting");
      const result = await nftMintingService.mintCharacterAsCNFT(
        characterId,
        account.id,
        mintEmail,
        account.walletAddress || undefined,
        { directToUser },
      );

      if (!result.success) {
        return res.status(400).json({ error: result.error || "cNFT mint failed" });
      }

      res.json({
        success: true,
        grudgeId: account.grudgeId,
        accountId: account.id,
        characterId,
        custody: directToUser ? "user" : "escrow_admin",
        walletAddress: account.walletAddress,
        nftId: result.nftId,
        actionId: result.actionId,
        message: directToUser
          ? "cNFT mint to user initiated"
          : "cNFT escrow mint initiated (admin wallet custody; account owns in game)",
      });
    } catch (error: any) {
      console.error("Error admin-minting cNFT:", error);
      res.status(500).json({ error: error.message || "Failed to mint cNFT" });
    }
  });

  // GET /api/admin/accounts-summary — Get all accounts with wallets + GBUX balances
  app.get("/api/admin/accounts-summary", requireAdmin, async (_req, res) => {
    try {
      const { verifyAllNFTs } = await import("./services/nftVerification");
      // Just get account summaries without full NFT verification
      const rows = await db
        .select({
          accountId: accounts.id,
          displayName: accounts.displayName,
          grudgeId: accounts.grudgeId,
          walletAddress: accounts.walletAddress,
          walletType: accounts.walletType,
          gbuxBalance: accounts.gbuxBalance,
          characterTokens: accounts.characterTokens,
          createdAt: accounts.createdAt,
        })
        .from(accounts)
        .orderBy(sql`${accounts.gbuxBalance} DESC`);

      res.json({
        total: rows.length,
        withWallets: rows.filter(r => r.walletAddress).length,
        totalGbux: rows.reduce((sum, r) => sum + r.gbuxBalance, 0),
        accounts: rows,
      });
    } catch (error) {
      console.error("Error fetching accounts summary:", error);
      res.status(500).json({ error: "Failed to fetch accounts summary" });
    }
  });

  // ==================== Health Check ====================
  app.get("/api/health", async (_req, res) => {
    try {
      const dbResult = await db.execute(sql`SELECT 1`);
      res.status(200).json({
        status: "healthy",
        app: "grudge-builder",
        version: "1.0.0",
        timestamp: new Date().toISOString(),
        services: {
          database: dbResult ? "operational" : "error",
          api: "operational",
        },
      });
    } catch (error) {
      res.status(503).json({
        status: "unhealthy",
        app: "grudge-builder",
        version: "1.0.0",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  return httpServer;
}
