import fs from "node:fs";
import path from "node:path";

// Asset types for categorization
export type AssetCategory =
  | "2d-sprite"
  | "3d-model"
  | "ui-kit"
  | "font"
  | "audio"
  | "script"
  | "game-project"
  | "animation"
  | "texture"
  | "unknown";

export interface DiscoveredAsset {
  id: string;
  name: string;
  category: AssetCategory;
  filePath: string;
  relativePath: string;
  extension: string;
  sizeBytes: number;
  sourceDir: string;
  modifiedAt: number;
  thumbnail?: string;
  metadata?: Record<string, unknown>;
}

export interface DiscoveredGame {
  id: string;
  name: string;
  engine: "grudgedot" | "godot" | "threejs" | "phaser" | "vite-web" | "html5" | "unknown";
  projectPath: string;
  configFile: string;
  description?: string;
  hasNodeModules: boolean;
  dependencies?: string[];
  scripts?: Record<string, string>;
  thumbnail?: string;
}

export interface ScanResult {
  assets: DiscoveredAsset[];
  games: DiscoveredGame[];
  scanDuration: number;
  totalFiles: number;
  scanPaths: string[];
}

// File extension to category mapping
const EXTENSION_MAP: Record<string, AssetCategory> = {
  // 2D sprites/images
  ".png": "2d-sprite",
  ".jpg": "2d-sprite",
  ".jpeg": "2d-sprite",
  ".gif": "2d-sprite",
  ".bmp": "2d-sprite",
  ".svg": "2d-sprite",
  ".ase": "2d-sprite",
  ".aseprite": "2d-sprite",
  ".psd": "ui-kit",
  // 3D models
  ".glb": "3d-model",
  ".gltf": "3d-model",
  ".fbx": "3d-model",
  ".obj": "3d-model",
  ".blend": "3d-model",
  ".dae": "3d-model",
  // Fonts
  ".ttf": "font",
  ".otf": "font",
  ".woff": "font",
  ".woff2": "font",
  // Audio
  ".mp3": "audio",
  ".ogg": "audio",
  ".wav": "audio",
  ".m4a": "audio",
  // Scripts/Templates
  ".lua": "script",
  ".gd": "script",
  // Animations
  ".anim": "animation",
  ".bvh": "animation",
  // Textures
  ".tga": "texture",
  ".dds": "texture",
  ".hdr": "texture",
  ".exr": "texture",
};

// Game engine detection patterns
const GAME_ENGINE_INDICATORS: Record<string, string[]> = {
  grudgedot: ["game.json"],
  godot: ["project.godot"],
  threejs: ["three"],
  phaser: ["phaser"],
  vite: ["vite"],
};

// Directories to skip during scanning
const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  ".venv",
  "__pycache__",
  ".next",
  "dist",
  ".cache",
  ".history",
  ".vscode",
  ".zencoder",
  ".zenflow",
]);

// Configured scan paths
const HOME = process.env.USERPROFILE || process.env.HOME || "";

export const SCAN_PATHS = [
  path.join(HOME, "Documents", "2dassets"),
  path.join(HOME, "Documents", "2scripts"),
  path.join(HOME, "Documents", "3DCharacters"),
  path.join(HOME, "Documents", "UI3"),
  path.join(HOME, "Documents", "UI4"),
  path.join(HOME, "Documents", "[VerArc Stash] Basic_Skills_and_Buffs"),
  path.join(HOME, "Documents", "1111111", "Grudge-Builder", "Grudge-Builder", "public"),
  "E:\\images",
  "E:\\GrudgeDefense",
  "E:\\GRUDGE-RTS",
  "E:\\Gamewithall",
  "E:\\Universols",
  "E:\\grudge-platform",
];

let cachedScanResult: ScanResult | null = null;
let lastScanTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function generateId(filePath: string): string {
  let hash = 0;
  for (let i = 0; i < filePath.length; i++) {
    const char = filePath.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function categorizeFile(ext: string): AssetCategory {
  return EXTENSION_MAP[ext.toLowerCase()] || "unknown";
}

function walkDirectory(
  dir: string,
  maxDepth: number = 4,
  currentDepth: number = 0
): { files: string[]; dirs: string[] } {
  const result: { files: string[]; dirs: string[] } = { files: [], dirs: [] };

  if (currentDepth > maxDepth) return result;

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return result;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      result.dirs.push(fullPath);
      const sub = walkDirectory(fullPath, maxDepth, currentDepth + 1);
      result.files.push(...sub.files);
      result.dirs.push(...sub.dirs);
    } else if (entry.isFile()) {
      result.files.push(fullPath);
    }
  }

  return result;
}

function detectGameProject(dir: string): DiscoveredGame | null {
  try {
    // Check for grudgeDot project
    const gdGameJson = path.join(dir, "game.json");
    if (fs.existsSync(gdGameJson)) {
      try {
        const content = JSON.parse(fs.readFileSync(gdGameJson, "utf-8"));
        if (content.properties || content.gdVersion) {
          return {
            id: generateId(dir),
            name: content.properties?.name || path.basename(dir),
            engine: "grudgedot",
            projectPath: dir,
            configFile: gdGameJson,
            description: content.properties?.description,
            hasNodeModules: false,
            thumbnail: undefined,
          };
        }
      } catch { /* not valid grudgeDot json */ }
    }

    // Check for Godot project
    const godotProject = path.join(dir, "project.godot");
    if (fs.existsSync(godotProject)) {
      const content = fs.readFileSync(godotProject, "utf-8");
      const nameMatch = content.match(/config\/name="([^"]+)"/);
      return {
        id: generateId(dir),
        name: nameMatch?.[1] || path.basename(dir),
        engine: "godot",
        projectPath: dir,
        configFile: godotProject,
        hasNodeModules: false,
      };
    }

    // Check for Node.js game project (Vite/Three.js/Phaser)
    const packageJson = path.join(dir, "package.json");
    if (fs.existsSync(packageJson)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(packageJson, "utf-8"));
        const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
        const depNames = Object.keys(allDeps);

        let engine: DiscoveredGame["engine"] = "unknown";
        if (depNames.some((d) => d.includes("phaser"))) engine = "phaser";
        else if (depNames.some((d) => d === "three" || d.includes("three"))) engine = "threejs";
        else if (depNames.some((d) => d === "vite")) engine = "vite-web";

        // Only count as a game project if it has game-related deps
        if (engine !== "unknown") {
          return {
            id: generateId(dir),
            name: pkg.name || path.basename(dir),
            engine,
            projectPath: dir,
            configFile: packageJson,
            description: pkg.description,
            hasNodeModules: fs.existsSync(path.join(dir, "node_modules")),
            dependencies: depNames.slice(0, 20),
            scripts: pkg.scripts,
          };
        }
      } catch { /* skip invalid json */ }
    }

    // Check for standalone HTML5 game
    const indexHtml = path.join(dir, "index.html");
    if (fs.existsSync(indexHtml)) {
      const content = fs.readFileSync(indexHtml, "utf-8");
      if (content.includes("canvas") || content.includes("game") || content.includes("phaser")) {
        return {
          id: generateId(dir),
          name: path.basename(dir),
          engine: "html5",
          projectPath: dir,
          configFile: indexHtml,
          hasNodeModules: false,
        };
      }
    }

    return null;
  } catch {
    return null;
  }
}

export async function scanAssets(forceFresh = false): Promise<ScanResult> {
  // Return cached result if fresh enough
  if (!forceFresh && cachedScanResult && Date.now() - lastScanTime < CACHE_TTL) {
    return cachedScanResult;
  }

  const startTime = Date.now();
  const assets: DiscoveredAsset[] = [];
  const games: DiscoveredGame[] = [];
  const seenGameDirs = new Set<string>();
  let totalFiles = 0;
  const validPaths: string[] = [];

  for (const scanPath of SCAN_PATHS) {
    if (!fs.existsSync(scanPath)) continue;
    validPaths.push(scanPath);

    const { files, dirs } = walkDirectory(scanPath, 4);
    totalFiles += files.length;

    // Check directories for game projects
    const allDirs = [scanPath, ...dirs];
    for (const dir of allDirs) {
      if (seenGameDirs.has(dir)) continue;
      const game = detectGameProject(dir);
      if (game) {
        games.push(game);
        seenGameDirs.add(dir);
      }
    }

    // Catalog asset files
    for (const filePath of files) {
      const ext = path.extname(filePath).toLowerCase();
      const category = categorizeFile(ext);
      if (category === "unknown") continue;

      let stat: fs.Stats;
      try {
        stat = fs.statSync(filePath);
      } catch {
        continue;
      }

      // Skip very small files (< 100 bytes) and very large (> 500MB)
      if (stat.size < 100 || stat.size > 500 * 1024 * 1024) continue;

      assets.push({
        id: generateId(filePath),
        name: path.basename(filePath, ext),
        category,
        filePath,
        relativePath: path.relative(scanPath, filePath),
        extension: ext,
        sizeBytes: stat.size,
        sourceDir: scanPath,
        modifiedAt: stat.mtimeMs,
      });
    }
  }

  const result: ScanResult = {
    assets,
    games,
    scanDuration: Date.now() - startTime,
    totalFiles,
    scanPaths: validPaths,
  };

  cachedScanResult = result;
  lastScanTime = Date.now();

  return result;
}

export function getAssetsByCategory(
  assets: DiscoveredAsset[],
  category: AssetCategory
): DiscoveredAsset[] {
  return assets.filter((a) => a.category === category);
}

export function searchAssets(
  assets: DiscoveredAsset[],
  query: string
): DiscoveredAsset[] {
  const lower = query.toLowerCase();
  return assets.filter(
    (a) =>
      a.name.toLowerCase().includes(lower) ||
      a.relativePath.toLowerCase().includes(lower) ||
      a.category.includes(lower)
  );
}

export function getAssetStats(assets: DiscoveredAsset[]) {
  const byCategory: Record<string, number> = {};
  const bySource: Record<string, number> = {};
  let totalSize = 0;

  for (const asset of assets) {
    byCategory[asset.category] = (byCategory[asset.category] || 0) + 1;
    const sourceKey = path.basename(asset.sourceDir);
    bySource[sourceKey] = (bySource[sourceKey] || 0) + 1;
    totalSize += asset.sizeBytes;
  }

  return { byCategory, bySource, totalSize, totalCount: assets.length };
}
