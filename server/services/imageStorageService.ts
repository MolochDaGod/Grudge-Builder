import { Storage, File } from "@google-cloud/storage";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "crypto";

export interface ImageCategory {
  name: string;
  basePath: string;
  cacheControl: string;
  description: string;
}

export const IMAGE_CATEGORIES: Record<string, ImageCategory> = {
  sprites: {
    name: "Sprites",
    basePath: "sprites",
    cacheControl: "public, max-age=31536000, immutable",
    description: "Game sprite assets (characters, items, effects)",
  },
  lore: {
    name: "Lore Art",
    basePath: "lore",
    cacheControl: "public, max-age=86400",
    description: "Lore and story artwork",
  },
  ui: {
    name: "UI Assets",
    basePath: "ui",
    cacheControl: "public, max-age=604800",
    description: "User interface elements",
  },
  avatars: {
    name: "Avatars",
    basePath: "avatars",
    cacheControl: "public, max-age=3600",
    description: "Character and player avatars",
  },
  maps: {
    name: "Maps",
    basePath: "maps",
    cacheControl: "public, max-age=86400",
    description: "World and dungeon maps",
  },
  generated: {
    name: "AI Generated",
    basePath: "generated",
    cacheControl: "public, max-age=3600",
    description: "AI-generated images",
  },
};

export interface UploadJob {
  id: string;
  localPath: string;
  cloudPath: string;
  category: string;
  status: "pending" | "uploading" | "completed" | "failed";
  error?: string;
  progress: number;
  createdAt: number;
  completedAt?: number;
}

export interface UploadQueueStats {
  pending: number;
  uploading: number;
  completed: number;
  failed: number;
  totalBytes: number;
  uploadedBytes: number;
}

function createImageStorageClient(): Storage {
  const inlineKey = process.env.GCS_SERVICE_ACCOUNT_KEY;
  const projectId = process.env.GCS_PROJECT_ID || "";
  if (inlineKey) {
    try {
      return new Storage({ credentials: JSON.parse(inlineKey), projectId });
    } catch { /* fall through */ }
  }
  return new Storage({ projectId: projectId || undefined });
}

const objectStorageClient = createImageStorageClient();

class ImageStorageService {
  private uploadQueue: Map<string, UploadJob> = new Map();
  private isProcessing = false;
  private concurrency = 3;
  private activeUploads = 0;

  getPublicBasePath(): string {
    const pathsStr = process.env.PUBLIC_OBJECT_SEARCH_PATHS || "";
    const paths = pathsStr.split(",").map(p => p.trim()).filter(p => p.length > 0);
    if (paths.length === 0) {
      throw new Error("PUBLIC_OBJECT_SEARCH_PATHS not configured");
    }
    return paths[0];
  }

  private getBucketAndPath(fullPath: string): { bucketName: string; objectName: string } {
    const normalized = fullPath.startsWith("/") ? fullPath : `/${fullPath}`;
    const parts = normalized.split("/").filter(p => p.length > 0);
    if (parts.length < 2) {
      throw new Error("Invalid path format");
    }
    return {
      bucketName: parts[0],
      objectName: parts.slice(1).join("/"),
    };
  }

  async uploadImage(
    localPath: string,
    category: keyof typeof IMAGE_CATEGORIES,
    customPath?: string
  ): Promise<string> {
    const categoryConfig = IMAGE_CATEGORIES[category];
    if (!categoryConfig) {
      throw new Error(`Unknown category: ${category}`);
    }

    const basePath = this.getPublicBasePath();
    const fileName = customPath || path.basename(localPath);
    const cloudPath = `${basePath}/${categoryConfig.basePath}/${fileName}`;
    
    const { bucketName, objectName } = this.getBucketAndPath(cloudPath);
    const bucket = objectStorageClient.bucket(bucketName);
    const file = bucket.file(objectName);

    const contentType = this.getContentType(localPath);

    await file.save(fs.readFileSync(localPath), {
      metadata: {
        contentType,
        cacheControl: categoryConfig.cacheControl,
        metadata: {
          category,
          uploadedAt: new Date().toISOString(),
          originalName: path.basename(localPath),
        },
      },
    });

    return this.getPublicUrl(cloudPath);
  }

  async uploadBuffer(
    buffer: Buffer,
    fileName: string,
    category: keyof typeof IMAGE_CATEGORIES,
    contentType: string = "image/png"
  ): Promise<string> {
    const categoryConfig = IMAGE_CATEGORIES[category];
    if (!categoryConfig) {
      throw new Error(`Unknown category: ${category}`);
    }

    const basePath = this.getPublicBasePath();
    const cloudPath = `${basePath}/${categoryConfig.basePath}/${fileName}`;
    
    const { bucketName, objectName } = this.getBucketAndPath(cloudPath);
    const bucket = objectStorageClient.bucket(bucketName);
    const file = bucket.file(objectName);

    await file.save(buffer, {
      metadata: {
        contentType,
        cacheControl: categoryConfig.cacheControl,
        metadata: {
          category,
          uploadedAt: new Date().toISOString(),
        },
      },
    });

    return this.getPublicUrl(cloudPath);
  }

  async uploadBase64(
    base64Data: string,
    fileName: string,
    category: keyof typeof IMAGE_CATEGORIES
  ): Promise<string> {
    const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      throw new Error("Invalid base64 data");
    }
    
    const contentType = matches[1];
    const buffer = Buffer.from(matches[2], "base64");
    
    return this.uploadBuffer(buffer, fileName, category, contentType);
  }

  queueUpload(localPath: string, category: string, cloudSubPath?: string): string {
    const id = randomUUID();
    const categoryConfig = IMAGE_CATEGORIES[category];
    
    if (!categoryConfig) {
      throw new Error(`Unknown category: ${category}`);
    }

    const basePath = this.getPublicBasePath();
    const fileName = cloudSubPath || path.basename(localPath);
    const cloudPath = `${basePath}/${categoryConfig.basePath}/${fileName}`;

    const job: UploadJob = {
      id,
      localPath,
      cloudPath,
      category,
      status: "pending",
      progress: 0,
      createdAt: Date.now(),
    };

    this.uploadQueue.set(id, job);
    this.processQueue();
    return id;
  }

  async queueDirectoryUpload(
    localDir: string,
    category: string,
    recursive = true
  ): Promise<string[]> {
    const jobIds: string[] = [];
    
    const processDir = async (dir: string, subPath: string = "") => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = subPath ? `${subPath}/${entry.name}` : entry.name;
        
        if (entry.isDirectory() && recursive) {
          await processDir(fullPath, relativePath);
        } else if (entry.isFile() && this.isImageFile(entry.name)) {
          const jobId = this.queueUpload(fullPath, category, relativePath);
          jobIds.push(jobId);
        }
      }
    };

    await processDir(localDir);
    return jobIds;
  }

  private isImageFile(fileName: string): boolean {
    const ext = path.extname(fileName).toLowerCase();
    return [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"].includes(ext);
  }

  private async processQueue() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (true) {
      const pendingJobs = Array.from(this.uploadQueue.values())
        .filter(j => j.status === "pending");
      
      if (pendingJobs.length === 0 || this.activeUploads >= this.concurrency) {
        break;
      }

      const availableSlots = this.concurrency - this.activeUploads;
      const jobsToProcess = pendingJobs.slice(0, availableSlots);

      await Promise.all(jobsToProcess.map(job => this.processJob(job)));
    }

    this.isProcessing = false;
  }

  private async processJob(job: UploadJob) {
    this.activeUploads++;
    job.status = "uploading";

    try {
      const { bucketName, objectName } = this.getBucketAndPath(job.cloudPath);
      const bucket = objectStorageClient.bucket(bucketName);
      const file = bucket.file(objectName);

      const categoryConfig = IMAGE_CATEGORIES[job.category];
      const contentType = this.getContentType(job.localPath);

      await file.save(fs.readFileSync(job.localPath), {
        metadata: {
          contentType,
          cacheControl: categoryConfig?.cacheControl || "public, max-age=3600",
          metadata: {
            category: job.category,
            uploadedAt: new Date().toISOString(),
            originalPath: job.localPath,
          },
        },
      });

      job.status = "completed";
      job.progress = 100;
      job.completedAt = Date.now();
    } catch (error) {
      job.status = "failed";
      job.error = error instanceof Error ? error.message : "Upload failed";
    }

    this.activeUploads--;
    this.processQueue();
  }

  getQueueStats(): UploadQueueStats {
    const jobs = Array.from(this.uploadQueue.values());
    return {
      pending: jobs.filter(j => j.status === "pending").length,
      uploading: jobs.filter(j => j.status === "uploading").length,
      completed: jobs.filter(j => j.status === "completed").length,
      failed: jobs.filter(j => j.status === "failed").length,
      totalBytes: 0,
      uploadedBytes: 0,
    };
  }

  getJob(id: string): UploadJob | undefined {
    return this.uploadQueue.get(id);
  }

  getAllJobs(): UploadJob[] {
    return Array.from(this.uploadQueue.values());
  }

  clearCompletedJobs() {
    const entries = Array.from(this.uploadQueue.entries());
    for (const [id, job] of entries) {
      if (job.status === "completed" || job.status === "failed") {
        this.uploadQueue.delete(id);
      }
    }
  }

  private getContentType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const types: Record<string, string> = {
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".gif": "image/gif",
      ".webp": "image/webp",
      ".svg": "image/svg+xml",
    };
    return types[ext] || "application/octet-stream";
  }

  private getPublicUrl(cloudPath: string): string {
    const { bucketName, objectName } = this.getBucketAndPath(cloudPath);
    return `https://storage.googleapis.com/${bucketName}/${objectName}`;
  }

  async listImages(category: string): Promise<string[]> {
    const categoryConfig = IMAGE_CATEGORIES[category];
    if (!categoryConfig) return [];

    const basePath = this.getPublicBasePath();
    const prefix = `${basePath}/${categoryConfig.basePath}/`.replace(/^\//, "");
    
    const { bucketName } = this.getBucketAndPath(basePath);
    const bucket = objectStorageClient.bucket(bucketName);
    
    try {
      const [files] = await bucket.getFiles({ prefix: prefix.split("/").slice(1).join("/") });
      return files.map(f => this.getPublicUrl(`/${bucketName}/${f.name}`));
    } catch (error) {
      console.error("Failed to list images:", error);
      return [];
    }
  }

  async deleteImage(cloudPath: string): Promise<boolean> {
    try {
      const { bucketName, objectName } = this.getBucketAndPath(cloudPath);
      const bucket = objectStorageClient.bucket(bucketName);
      const file = bucket.file(objectName);
      await file.delete();
      return true;
    } catch (error) {
      console.error("Failed to delete image:", error);
      return false;
    }
  }
}

export const imageStorageService = new ImageStorageService();
