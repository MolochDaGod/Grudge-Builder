import { objectStorageClient } from "./integrations/object_storage/objectStorage";
import { storage } from "./storage";
import { InsertSpriteManifest } from "@shared/schema";
import * as fs from "fs";
import * as path from "path";
import pLimit from "p-limit";

interface SyncResult {
  total: number;
  synced: number;
  skipped: number;
  errors: number;
  details: Array<{
    localPath: string;
    objectPath?: string;
    status: "synced" | "skipped" | "error";
    error?: string;
  }>;
}

interface LocalSprite {
  localPath: string;
  filename: string;
  category: string;
  subcategory?: string;
  animationType?: string;
  character?: string;
}

const SPRITE_FOLDERS = [
  { local: "client/public/sprites/GrudgeRPGAssets2d/Characters(100x100)", category: "characters", type: "character" },
  { local: "client/public/sprites/GrudgeRPGAssets2d/Magic(Projectile)", category: "effects", type: "projectile" },
  { local: "client/public/sprites/rpg", category: "monsters", type: "monster" },
  { local: "client/public/sprites/characters", category: "generated", type: "ai-generated" },
];

function parseObjectPath(fullPath: string): { bucketName: string; objectName: string } {
  if (!fullPath.startsWith("/")) {
    fullPath = `/${fullPath}`;
  }
  const pathParts = fullPath.split("/");
  if (pathParts.length < 3) {
    throw new Error("Invalid path: must contain at least a bucket name");
  }
  return {
    bucketName: pathParts[1],
    objectName: pathParts.slice(2).join("/"),
  };
}

export class SpriteSyncService {
  private publicDir: string;
  private bucketName: string;

  constructor() {
    const publicPaths = process.env.PUBLIC_OBJECT_SEARCH_PATHS || "";
    const paths = publicPaths.split(",").map(p => p.trim()).filter(Boolean);
    if (paths.length === 0) {
      throw new Error("PUBLIC_OBJECT_SEARCH_PATHS not set");
    }
    this.publicDir = paths[0];
    const { bucketName } = parseObjectPath(this.publicDir);
    this.bucketName = bucketName;
  }

  async scanLocalSprites(): Promise<LocalSprite[]> {
    const sprites: LocalSprite[] = [];

    for (const folder of SPRITE_FOLDERS) {
      if (!fs.existsSync(folder.local)) continue;

      await this.scanDirectory(folder.local, folder.category, sprites);
    }

    return sprites;
  }

  private async scanDirectory(dir: string, category: string, sprites: LocalSprite[]): Promise<void> {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        await this.scanDirectory(fullPath, category, sprites);
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".png")) {
        const relativePath = fullPath;
        const parsed = this.parseSpritePath(relativePath, category);
        sprites.push({
          localPath: relativePath,
          filename: entry.name,
          ...parsed,
        });
      }
    }
  }

  private parseSpritePath(localPath: string, baseCategory: string): {
    category: string;
    subcategory?: string;
    animationType?: string;
    character?: string;
  } {
    const parts = localPath.split(path.sep);
    
    if (localPath.includes("Characters(100x100)")) {
      const charIndex = parts.findIndex(p => p === "Characters(100x100)");
      const character = parts[charIndex + 1] || undefined;
      const filename = parts[parts.length - 1];
      const animationType = filename.replace(".png", "").toLowerCase();
      return {
        category: "characters",
        subcategory: character,
        animationType,
        character,
      };
    }

    if (localPath.includes("Magic(Projectile)")) {
      const filename = parts[parts.length - 1];
      return {
        category: "effects",
        subcategory: "projectiles",
        animationType: filename.replace(".png", "").toLowerCase(),
      };
    }

    if (localPath.includes("/rpg/")) {
      const rpgIndex = parts.findIndex(p => p === "rpg");
      const monsterType = parts[rpgIndex + 1] || undefined;
      const variant = parts[rpgIndex + 2] || undefined;
      const filename = parts[parts.length - 1];
      return {
        category: "monsters",
        subcategory: monsterType,
        animationType: filename.replace(".png", "").toLowerCase(),
        character: variant ? `${monsterType}/${variant}` : monsterType,
      };
    }

    return { category: baseCategory };
  }

  async uploadSprite(localPath: string, objectPath: string): Promise<{ publicUrl: string; fileSize: number }> {
    const fileBuffer = fs.readFileSync(localPath);
    const { bucketName, objectName } = parseObjectPath(objectPath);
    
    const bucket = objectStorageClient.bucket(bucketName);
    const file = bucket.file(objectName);
    
    await file.save(fileBuffer, {
      contentType: "image/png",
      metadata: {
        cacheControl: "public, max-age=31536000",
      },
    });

    return {
      publicUrl: `/objects/${objectName}`,
      fileSize: fileBuffer.length,
    };
  }

  buildObjectPath(sprite: LocalSprite): string {
    const parts = ["sprites"];
    
    if (sprite.category) parts.push(sprite.category);
    if (sprite.subcategory) parts.push(sprite.subcategory);
    
    parts.push(sprite.filename);
    
    return `${this.publicDir}/${parts.join("/")}`;
  }

  async syncSprites(options?: { force?: boolean; dryRun?: boolean }): Promise<SyncResult> {
    const { force = false, dryRun = false } = options || {};
    const result: SyncResult = { total: 0, synced: 0, skipped: 0, errors: 0, details: [] };
    
    const localSprites = await this.scanLocalSprites();
    result.total = localSprites.length;

    const limit = pLimit(5);
    
    const tasks = localSprites.map(sprite => 
      limit(async () => {
        try {
          const existing = await storage.getSpriteManifestByLocalPath(sprite.localPath);
          
          if (existing && existing.syncStatus === "synced" && !force) {
            result.skipped++;
            result.details.push({
              localPath: sprite.localPath,
              objectPath: existing.objectPath || undefined,
              status: "skipped",
            });
            return;
          }

          const objectPath = this.buildObjectPath(sprite);
          
          if (dryRun) {
            result.synced++;
            result.details.push({
              localPath: sprite.localPath,
              objectPath,
              status: "synced",
            });
            return;
          }

          const { publicUrl, fileSize } = await this.uploadSprite(sprite.localPath, objectPath);

          const frameData = await this.analyzeFrames(sprite.localPath);

          const manifestEntry: InsertSpriteManifest = {
            category: sprite.category,
            subcategory: sprite.subcategory,
            name: sprite.filename.replace(".png", ""),
            filename: sprite.filename,
            localPath: sprite.localPath,
            objectPath,
            publicUrl,
            width: frameData.width,
            height: frameData.height,
            frameCount: frameData.frameCount,
            frameWidth: frameData.frameWidth,
            frameHeight: frameData.frameHeight,
            animationType: sprite.animationType,
            tags: [sprite.category, sprite.subcategory, sprite.animationType].filter(Boolean) as string[],
            fileSize,
            mimeType: "image/png",
            syncStatus: "synced",
            syncError: null,
          };

          if (existing) {
            await storage.updateSpriteManifestEntry(existing.id, { ...manifestEntry, syncedAt: Date.now() });
          } else {
            await storage.addSpriteManifestEntry(manifestEntry);
          }

          result.synced++;
          result.details.push({
            localPath: sprite.localPath,
            objectPath,
            status: "synced",
          });
        } catch (error) {
          result.errors++;
          result.details.push({
            localPath: sprite.localPath,
            status: "error",
            error: error instanceof Error ? error.message : String(error),
          });
        }
      })
    );

    await Promise.all(tasks);
    return result;
  }

  private analyzeFrames(localPath: string): {
    width: number;
    height: number;
    frameCount: number;
    frameWidth: number;
    frameHeight: number;
  } {
    try {
      const { countSpriteFrames } = require("./spriteFrameCounter");
      const result = countSpriteFrames(localPath, 100);
      if (result) {
        return {
          width: result.width,
          height: result.height,
          frameCount: result.frameCount,
          frameWidth: result.frameWidth,
          frameHeight: result.frameHeight,
        };
      }
      return { width: 0, height: 0, frameCount: 1, frameWidth: 0, frameHeight: 0 };
    } catch {
      return { width: 0, height: 0, frameCount: 1, frameWidth: 0, frameHeight: 0 };
    }
  }

  async listObjectStorageSprites(): Promise<Array<{ name: string; path: string; size: number; updated: Date }>> {
    const { bucketName, objectName } = parseObjectPath(`${this.publicDir}/sprites`);
    const bucket = objectStorageClient.bucket(bucketName);
    
    const [files] = await bucket.getFiles({ prefix: objectName });
    
    return files.map(file => ({
      name: file.name.split("/").pop() || file.name,
      path: `/${bucketName}/${file.name}`,
      size: parseInt(file.metadata.size as string) || 0,
      updated: new Date(file.metadata.updated as string),
    }));
  }

  async deleteFromObjectStorage(objectPath: string): Promise<void> {
    const { bucketName, objectName } = parseObjectPath(objectPath);
    const bucket = objectStorageClient.bucket(bucketName);
    await bucket.file(objectName).delete();
  }

  async getSyncStatus(): Promise<{
    total: number;
    synced: number;
    pending: number;
    errors: number;
    lastSyncedAt?: number;
  }> {
    const all = await storage.getSpriteManifestEntries();
    const synced = all.filter((s: { syncStatus?: string | null }) => s.syncStatus === "synced");
    const pending = all.filter((s: { syncStatus?: string | null }) => s.syncStatus === "pending" || !s.syncStatus);
    const errors = all.filter((s: { syncStatus?: string | null }) => s.syncStatus === "error");
    
    const lastSynced = synced.sort((a: { syncedAt?: number | null }, b: { syncedAt?: number | null }) => 
      (b.syncedAt || 0) - (a.syncedAt || 0)
    )[0];
    
    return {
      total: all.length,
      synced: synced.length,
      pending: pending.length,
      errors: errors.length,
      lastSyncedAt: lastSynced?.syncedAt || undefined,
    };
  }
}

export const spriteSyncService = new SpriteSyncService();
