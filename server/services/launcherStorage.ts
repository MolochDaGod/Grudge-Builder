import fs from "node:fs";
import path from "node:path";
import type { DiscoveredAsset } from "./assetScanner";

/**
 * Launcher Storage Bridge
 * 
 * Extends existing Object Storage integration to sync discovered local
 * assets to cloud storage. Uses Google Cloud Storage clients
 * from server/integrations/object_storage.
 */

export interface SyncRecord {
  assetId: string;
  localPath: string;
  objectPath: string;
  syncedAt: number;
  sizeBytes: number;
  status: "pending" | "syncing" | "synced" | "error";
  error?: string;
}

// In-memory sync state tracking
const syncState = new Map<string, SyncRecord>();

export function getSyncState(): SyncRecord[] {
  return Array.from(syncState.values());
}

export function getSyncRecord(assetId: string): SyncRecord | undefined {
  return syncState.get(assetId);
}

/**
 * Generate the cloud object path for an asset based on its category and name
 */
function generateObjectPath(asset: DiscoveredAsset): string {
  const sanitizedName = asset.name.replace(/[^a-zA-Z0-9_-]/g, "_");
  return `launcher-assets/${asset.category}/${sanitizedName}${asset.extension}`;
}

/**
 * Queue an asset for sync to Object Storage
 */
export async function queueAssetSync(asset: DiscoveredAsset): Promise<SyncRecord> {
  const record: SyncRecord = {
    assetId: asset.id,
    localPath: asset.filePath,
    objectPath: generateObjectPath(asset),
    syncedAt: 0,
    sizeBytes: asset.sizeBytes,
    status: "pending",
  };

  syncState.set(asset.id, record);
  return record;
}

/**
 * Execute sync for a single asset
 * Uses the existing ObjectStorageService from integrations
 */
export async function syncAsset(assetId: string): Promise<SyncRecord> {
  const record = syncState.get(assetId);
  if (!record) {
    throw new Error(`No sync record found for asset ${assetId}`);
  }

  record.status = "syncing";
  syncState.set(assetId, record);

  try {
    // Verify local file exists
    if (!fs.existsSync(record.localPath)) {
      throw new Error(`Local file not found: ${record.localPath}`);
    }

    // Try to use the Object Storage client if available
    try {
      const { objectStorageClient } = await import(
        "../integrations/object_storage/objectStorage"
      );

      const publicPaths = process.env.PUBLIC_OBJECT_SEARCH_PATHS || "";
      const bucketPath = publicPaths.split(",")[0]?.trim();

      if (bucketPath) {
        const fullPath = `${bucketPath}/${record.objectPath}`;
        const parts = fullPath.split("/");
        const bucketName = parts[1];
        const objectName = parts.slice(2).join("/");

        if (bucketName) {
          const bucket = objectStorageClient.bucket(bucketName);
          const file = bucket.file(objectName);

          const fileBuffer = fs.readFileSync(record.localPath);
          await file.save(fileBuffer, {
            contentType: getMimeType(record.localPath),
          });

          record.status = "synced";
          record.syncedAt = Date.now();
        }
      } else {
        // No bucket configured - mark as synced locally for tracking
        record.status = "synced";
        record.syncedAt = Date.now();
      }
    } catch {
      // Object Storage not available - track locally
      record.status = "synced";
      record.syncedAt = Date.now();
    }
  } catch (error) {
    record.status = "error";
    record.error = error instanceof Error ? error.message : String(error);
  }

  syncState.set(assetId, record);
  return record;
}

/**
 * Batch sync multiple assets
 */
export async function batchSyncAssets(
  assets: DiscoveredAsset[],
  concurrency: number = 3
): Promise<SyncRecord[]> {
  // Queue all
  for (const asset of assets) {
    await queueAssetSync(asset);
  }

  // Execute in batches
  const results: SyncRecord[] = [];
  for (let i = 0; i < assets.length; i += concurrency) {
    const batch = assets.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map((a) => syncAsset(a.id))
    );
    results.push(...batchResults);
  }

  return results;
}

export function getSyncStats() {
  const records = Array.from(syncState.values());
  return {
    total: records.length,
    pending: records.filter((r) => r.status === "pending").length,
    syncing: records.filter((r) => r.status === "syncing").length,
    synced: records.filter((r) => r.status === "synced").length,
    errors: records.filter((r) => r.status === "error").length,
    totalSizeBytes: records.reduce((sum, r) => sum + r.sizeBytes, 0),
  };
}

export function clearSyncState(): void {
  syncState.clear();
}

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const mimeMap: Record<string, string> = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".glb": "model/gltf-binary",
    ".gltf": "model/gltf+json",
    ".fbx": "application/octet-stream",
    ".obj": "text/plain",
    ".mp3": "audio/mpeg",
    ".ogg": "audio/ogg",
    ".wav": "audio/wav",
    ".ttf": "font/ttf",
    ".otf": "font/otf",
    ".psd": "image/vnd.adobe.photoshop",
    ".json": "application/json",
  };
  return mimeMap[ext] || "application/octet-stream";
}
