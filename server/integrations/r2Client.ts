/**
 * Cloudflare R2 (S3-compatible) client for fleet asset list/upload.
 * Env (any pair works):
 *   R2_S3_ENDPOINT + R2_ACCESS_KEY_ID + R2_SECRET_ACCESS_KEY
 *   or OBJECT_STORAGE_KEY + OBJECT_STORAGE_SECRET + R2_S3_ENDPOINT
 * Bucket: R2_BUCKET_ASSETS | OBJECT_STORAGE_BUCKET | grudge-assets
 * Public CDN: OBJECT_STORAGE_PUBLIC_URL | https://assets.grudge-studio.com
 */
import {
  S3Client,
  ListObjectsV2Command,
  PutObjectCommand,
  type ListObjectsV2CommandOutput,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

let cached: S3Client | null = null;

export function r2Configured(): boolean {
  const endpoint = process.env.R2_S3_ENDPOINT || process.env.OBJECT_STORAGE_S3_ENDPOINT;
  const key = process.env.R2_ACCESS_KEY_ID || process.env.OBJECT_STORAGE_KEY;
  const secret = process.env.R2_SECRET_ACCESS_KEY || process.env.OBJECT_STORAGE_SECRET;
  return !!(endpoint && key && secret);
}

export function r2Bucket(): string {
  return (
    process.env.R2_BUCKET_ASSETS ||
    process.env.OBJECT_STORAGE_BUCKET ||
    process.env.R2_BUCKET ||
    "grudge-assets"
  );
}

export function r2PublicBase(): string {
  return (
    process.env.OBJECT_STORAGE_PUBLIC_URL ||
    process.env.R2_PUBLIC_URL ||
    "https://assets.grudge-studio.com"
  ).replace(/\/$/, "");
}

function getClient(): S3Client {
  if (cached) return cached;
  const endpoint = (process.env.R2_S3_ENDPOINT || process.env.OBJECT_STORAGE_S3_ENDPOINT || "").replace(
    /\/$/,
    "",
  );
  const accessKeyId = process.env.R2_ACCESS_KEY_ID || process.env.OBJECT_STORAGE_KEY || "";
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || process.env.OBJECT_STORAGE_SECRET || "";
  const region = process.env.OBJECT_STORAGE_REGION || process.env.R2_REGION || "auto";
  if (!endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "R2 not configured — set R2_S3_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY on Railway",
    );
  }
  cached = new S3Client({
    region,
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true,
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
  return cached;
}

export interface R2ListItem {
  key: string;
  url: string;
  size: number;
  lastModified: string;
  contentType?: string;
}

export async function r2ListPrefix(
  prefix: string,
  opts?: { limit?: number; cursor?: string },
): Promise<{ assets: R2ListItem[]; nextCursor: string | null }> {
  const s3 = getClient();
  const bucket = r2Bucket();
  const out: R2ListItem[] = [];
  let token: string | undefined = opts?.cursor;
  const limit = Math.min(opts?.limit ?? 200, 1000);
  const base = r2PublicBase();

  // Single page for dash UI
  const res: ListObjectsV2CommandOutput = await s3.send(
    new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix.replace(/^\//, ""),
      MaxKeys: limit,
      ContinuationToken: token,
    }),
  );

  for (const o of res.Contents ?? []) {
    if (!o.Key || o.Key.endsWith("/")) continue;
    out.push({
      key: o.Key,
      url: `${base}/${o.Key}`,
      size: Number(o.Size ?? 0),
      lastModified: o.LastModified ? o.LastModified.toISOString() : new Date(0).toISOString(),
    });
  }

  return {
    assets: out,
    nextCursor: res.IsTruncated ? res.NextContinuationToken ?? null : null,
  };
}

export async function r2PresignPut(
  key: string,
  contentType: string,
  expiresIn = 900,
): Promise<{ uploadUrl: string; key: string; publicUrl: string; expiresIn: number }> {
  const s3 = getClient();
  const bucket = r2Bucket();
  const cleanKey = key.replace(/^\//, "");
  const cmd = new PutObjectCommand({
    Bucket: bucket,
    Key: cleanKey,
    ContentType: contentType || "application/octet-stream",
  });
  const uploadUrl = await getSignedUrl(s3, cmd, { expiresIn });
  return {
    uploadUrl,
    key: cleanKey,
    publicUrl: `${r2PublicBase()}/${cleanKey}`,
    expiresIn,
  };
}

/** Sanitize filename for object keys */
export function safeFileName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 180);
}
