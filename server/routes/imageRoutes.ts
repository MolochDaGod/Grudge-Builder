import { Router } from "express";
import { imageStorageService, IMAGE_CATEGORIES } from "../services/imageStorageService";
import fs from "node:fs";
import path from "node:path";

const router = Router();

const ALLOWED_DIRECTORIES = [
  "client/public/sprites",
  "client/public/lore",
  "client/public/assets",
  "attached_assets",
  "public/sprites",
];

function isPathAllowed(filePath: string): boolean {
  const normalized = path.normalize(filePath);
  const resolved = path.resolve(normalized);
  
  if (normalized.includes("..")) {
    return false;
  }
  
  return ALLOWED_DIRECTORIES.some(dir => {
    const allowedPath = path.resolve(dir);
    return resolved.startsWith(allowedPath);
  });
}

function requireAdmin(req: any, res: any, next: any) {
  const isAdmin = req.headers["x-admin-access"] === "true" || 
                  req.query.admin === "true" ||
                  process.env.NODE_ENV === "development";
  
  if (!isAdmin) {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
}

router.get("/categories", (_req, res) => {
  res.json(IMAGE_CATEGORIES);
});

router.get("/queue/stats", (_req, res) => {
  const stats = imageStorageService.getQueueStats();
  res.json(stats);
});

router.get("/queue/jobs", (_req, res) => {
  const jobs = imageStorageService.getAllJobs();
  res.json(jobs);
});

router.get("/queue/job/:id", (req, res) => {
  const job = imageStorageService.getJob(req.params.id);
  if (!job) {
    return res.status(404).json({ error: "Job not found" });
  }
  res.json(job);
});

router.post("/queue/clear", (_req, res) => {
  imageStorageService.clearCompletedJobs();
  res.json({ success: true });
});

router.post("/upload/single", requireAdmin, async (req, res) => {
  try {
    const { localPath, category, customPath } = req.body;
    
    if (!localPath || !category) {
      return res.status(400).json({ error: "localPath and category are required" });
    }

    if (!isPathAllowed(localPath)) {
      return res.status(403).json({ error: "Path not allowed" });
    }

    if (!fs.existsSync(localPath)) {
      return res.status(400).json({ error: "File not found" });
    }

    const url = await imageStorageService.uploadImage(localPath, category, customPath);
    res.json({ success: true, url });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Upload failed" });
  }
});

router.post("/upload/base64", async (req, res) => {
  try {
    const { data, fileName, category } = req.body;
    
    if (!data || !fileName || !category) {
      return res.status(400).json({ error: "data, fileName, and category are required" });
    }

    const url = await imageStorageService.uploadBase64(data, fileName, category);
    res.json({ success: true, url });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Upload failed" });
  }
});

router.post("/upload/directory", requireAdmin, async (req, res) => {
  try {
    const { localDir, category, recursive = true } = req.body;
    
    if (!localDir || !category) {
      return res.status(400).json({ error: "localDir and category are required" });
    }

    if (!isPathAllowed(localDir)) {
      return res.status(403).json({ error: "Path not allowed" });
    }

    if (!fs.existsSync(localDir)) {
      return res.status(400).json({ error: "Directory not found" });
    }

    const jobIds = await imageStorageService.queueDirectoryUpload(localDir, category, recursive);
    res.json({ success: true, jobIds, count: jobIds.length });
  } catch (error) {
    console.error("Queue error:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Queue failed" });
  }
});

router.get("/list/:category", async (req, res) => {
  try {
    const images = await imageStorageService.listImages(req.params.category);
    res.json(images);
  } catch (error) {
    console.error("List error:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "List failed" });
  }
});

router.post("/migrate/sprites", requireAdmin, async (req, res) => {
  try {
    const spritesDir = path.resolve("client/public/sprites");
    
    if (!fs.existsSync(spritesDir)) {
      return res.status(400).json({ error: "Sprites directory not found" });
    }

    const jobIds = await imageStorageService.queueDirectoryUpload(spritesDir, "sprites", true);
    res.json({ 
      success: true, 
      message: `Queued ${jobIds.length} sprites for migration`,
      jobIds 
    });
  } catch (error) {
    console.error("Migration error:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Migration failed" });
  }
});

export default router;
