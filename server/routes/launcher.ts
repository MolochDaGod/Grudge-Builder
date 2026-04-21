import { Router } from "express";
import { scanAssets, getAssetsByCategory, searchAssets, getAssetStats, type AssetCategory } from "../services/assetScanner";
import { getAI4AnimationStatus, getAnimationMappings, getModelById, getModelsForClass } from "../services/ai4animation";
import { getDraftRecommendations, analyzeCrewComposition, createDraftState, applyDraftAction, getUnitPool, type DraftAction } from "../services/draftAI";
import { batchSyncAssets, getSyncState, getSyncStats, clearSyncState } from "../services/launcherStorage";

const router = Router();

/**
 * GET /api/launcher/scan
 * Trigger a full asset scan across configured drive paths
 */
router.get("/scan", async (_req, res) => {
  try {
    const fresh = _req.query.fresh === "true";
    const result = await scanAssets(fresh);
    res.json({
      success: true,
      data: {
        assetCount: result.assets.length,
        gameCount: result.games.length,
        scanDuration: result.scanDuration,
        totalFiles: result.totalFiles,
        scanPaths: result.scanPaths,
        stats: getAssetStats(result.assets),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

/**
 * GET /api/launcher/games
 * List all discovered game projects
 */
router.get("/games", async (_req, res) => {
  try {
    const result = await scanAssets();
    res.json({ success: true, data: result.games });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

/**
 * GET /api/launcher/assets
 * Browse discovered assets, optionally filtered by category or search query
 */
router.get("/assets", async (req, res) => {
  try {
    const result = await scanAssets();
    let assets = result.assets;

    const category = req.query.category as string;
    const query = req.query.q as string;
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;

    if (category) {
      assets = getAssetsByCategory(assets, category as AssetCategory);
    }
    if (query) {
      assets = searchAssets(assets, query);
    }

    const total = assets.length;
    const page = assets.slice(offset, offset + limit);

    res.json({
      success: true,
      data: page,
      pagination: { total, limit, offset, hasMore: offset + limit < total },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

/**
 * GET /api/launcher/assets/stats
 * Get aggregate stats about discovered assets
 */
router.get("/assets/stats", async (_req, res) => {
  try {
    const result = await scanAssets();
    res.json({ success: true, data: getAssetStats(result.assets) });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

/**
 * POST /api/launcher/sync
 * Sync selected assets to Object Storage
 */
router.post("/sync", async (req, res) => {
  try {
    const { assetIds } = req.body as { assetIds: string[] };
    if (!Array.isArray(assetIds) || assetIds.length === 0) {
      return res.status(400).json({ success: false, error: "assetIds array required" });
    }

    const result = await scanAssets();
    const assetsToSync = result.assets.filter((a) => assetIds.includes(a.id));

    if (assetsToSync.length === 0) {
      return res.status(404).json({ success: false, error: "No matching assets found" });
    }

    const syncResults = await batchSyncAssets(assetsToSync);
    res.json({ success: true, data: syncResults });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

/**
 * GET /api/launcher/sync/status
 * Get current sync state
 */
router.get("/sync/status", (_req, res) => {
  res.json({
    success: true,
    data: { records: getSyncState(), stats: getSyncStats() },
  });
});

/**
 * DELETE /api/launcher/sync
 * Clear sync state
 */
router.delete("/sync", (_req, res) => {
  clearSyncState();
  res.json({ success: true });
});

/**
 * GET /api/launcher/ai-animations
 * Get AI4Animation models and status
 */
router.get("/ai-animations", (_req, res) => {
  try {
    const status = getAI4AnimationStatus();
    res.json({ success: true, data: status });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

/**
 * GET /api/launcher/ai-animations/mappings
 * Get Grudge Warlords animation mappings
 */
router.get("/ai-animations/mappings", (_req, res) => {
  try {
    const classId = _req.query.class as string;
    const mappings = classId ? getModelsForClass(classId) : getAnimationMappings();
    res.json({ success: true, data: mappings });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

/**
 * GET /api/launcher/ai-animations/:modelId
 * Get details for a specific AI4Animation model
 */
router.get("/ai-animations/:modelId", (req, res) => {
  const model = getModelById(req.params.modelId);
  if (!model) {
    return res.status(404).json({ success: false, error: "Model not found" });
  }
  res.json({ success: true, data: model });
});

/**
 * POST /api/launcher/launch
 * Get launch configuration for a game project
 */
router.post("/launch", async (req, res) => {
  try {
    const { gameId } = req.body as { gameId: string };
    const result = await scanAssets();
    const game = result.games.find((g) => g.id === gameId);

    if (!game) {
      return res.status(404).json({ success: false, error: "Game not found" });
    }

    // Return launch config based on engine type
    let launchCommand = "";
    let devServer = "";

    switch (game.engine) {
      case "godot":
        launchCommand = `E:\\GrudgeDefense\\Godot\\Godot_v4.1-stable_win64.exe --path "${game.projectPath}"`;
        break;
      case "threejs":
      case "phaser":
      case "vite-web":
        launchCommand = `cd "${game.projectPath}" && npm run dev`;
        devServer = `http://localhost:${game.engine === "phaser" ? "8080" : "5173"}`;
        break;
      case "html5":
        launchCommand = `start "${game.configFile}"`;
        break;
      case "grudgedev":
        launchCommand = `grudgedev "${game.configFile}"`;
        break;
    }

    res.json({
      success: true,
      data: {
        game,
        launchCommand,
        devServer,
        requiresInstall: !game.hasNodeModules && ["threejs", "phaser", "vite-web"].includes(game.engine),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

// ============================================
// DRAFT AI ROUTES (SwainBot Adaptation)
// ============================================

/**
 * GET /api/launcher/draft/units
 * Get the full unit pool for draft selection
 */
router.get("/draft/units", (_req, res) => {
  const race = _req.query.race as string;
  const classId = _req.query.class as string;
  let units = getUnitPool();

  if (race) units = units.filter((u) => u.race === race);
  if (classId) units = units.filter((u) => u.classId === classId);

  res.json({ success: true, data: units });
});

/**
 * POST /api/launcher/draft/recommend
 * Get AI draft recommendations for current state
 */
router.post("/draft/recommend", (req, res) => {
  try {
    const { state, topN } = req.body as { state?: any; topN?: number };
    const draftState = state || createDraftState();
    const recommendations = getDraftRecommendations(draftState, topN || 5);
    res.json({ success: true, data: recommendations });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

/**
 * POST /api/launcher/draft/pick
 * Apply a draft pick and get updated state
 */
router.post("/draft/pick", (req, res) => {
  try {
    const { state, action } = req.body as { state: any; action: DraftAction };
    if (!action || action.unitId === undefined || action.roleId === undefined) {
      return res.status(400).json({ success: false, error: "action with unitId and roleId required" });
    }
    const newState = applyDraftAction(state || createDraftState(), action);
    res.json({ success: true, data: newState });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

/**
 * POST /api/launcher/draft/analyze
 * Analyze a crew composition
 */
router.post("/draft/analyze", (req, res) => {
  try {
    const { team } = req.body as { team: DraftAction[] };
    if (!Array.isArray(team)) {
      return res.status(400).json({ success: false, error: "team array required" });
    }
    const analysis = analyzeCrewComposition(team);
    res.json({ success: true, data: analysis });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

/**
 * GET /api/launcher/tools
 * List available development tools
 */
router.get("/tools", (_req, res) => {
  const tools = [
    {
      id: "aseprite",
      name: "Aseprite",
      description: "Pixel art & sprite animation editor",
      path: "E:\\GrudgeDefense\\aseprite-v*",
      installed: true,
      category: "art",
    },
    {
      id: "godot",
      name: "Godot 4.1",
      description: "Open source game engine",
      path: "E:\\GrudgeDefense\\Godot\\Godot_v4.1-stable_win64.exe",
      installed: true,
      category: "engine",
    },
    {
      id: "grudgedev",
      name: "GrudgeDev",
      description: "Grudge Studio game editor & services manager",
      path: null,
      installed: true,
      category: "engine",
    },
    {
      id: "grudge-builder",
      name: "Grudge Builder",
      description: "Main Grudge Studio development platform",
      path: "C:\\Users\\nugye\\Documents\\1111111\\Grudge-Builder\\Grudge-Builder",
      installed: true,
      category: "platform",
    },
    {
      id: "grudge-studio",
      name: "Grudge Studio (Monorepo)",
      description: "Unified products - Warlord Crafting Suite",
      path: "C:\\Users\\nugye\\Documents\\1111111\\grudge-studio",
      installed: true,
      category: "platform",
    },
    {
      id: "grudgedev-assistant",
      name: "GrudgeDev Assistant",
      description: "AI agents + game server + cloud storage for GrudgeDev",
      path: "C:\\Users\\nugye\\Documents\\GitHub\\grudgedot-launcher",
      installed: true,
      category: "platform",
    },
  ];

  res.json({ success: true, data: tools });
});

export default router;
