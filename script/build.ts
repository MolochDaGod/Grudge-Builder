import { build as esbuild } from "esbuild";
import { build as viteBuild } from "vite";
import { rm, readFile, cp } from "fs/promises";
import path from "path";

const TRANSIENT_IO_CODES = new Set(["EBUSY", "ENOENT", "EPERM", "EACCES", "ENOTEMPTY"]);

function isTransientIoError(err: unknown): boolean {
  const code = (err as NodeJS.ErrnoException | undefined)?.code;
  return typeof code === "string" && TRANSIENT_IO_CODES.has(code);
}

/** Windows-safe recursive delete (retries on EPERM/ENOTEMPTY). */
async function removeDirSafe(target: string, retries = 5): Promise<void> {
  const { existsSync } = await import("fs");
  if (!existsSync(target)) return;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      await rm(target, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
      return;
    } catch (e: any) {
      if (attempt === retries - 1) throw e;
      await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
    }
  }
}

/** Copy tree with retries for transient Windows file-lock races. */
async function copyDirSafe(src: string, dest: string, retries = 5): Promise<void> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      await cp(src, dest, { recursive: true, dereference: true });
      return;
    } catch (e: any) {
      if (!isTransientIoError(e) || attempt === retries - 1) throw e;
      await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
    }
  }
}

/** Copy static public trees after Vite (avoids prepare-out-dir EBUSY on Windows). */
async function copyPublicToDist(): Promise<void> {
  const { spawn } = await import("node:child_process");
  await new Promise<void>((resolve, reject) => {
    const child = spawn(process.execPath, ["script/copy-public-to-dist.mjs"], {
      cwd: process.cwd(),
      stdio: "inherit",
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`copy-public-to-dist exited with ${code}`));
    });
  });
}

// Native / binary modules that must never be bundled
const nativeModules = [
  "node-sass",
  "node-gimp",
  "node-unrar-js",
  "gamedig",
  "pngjs",
  "bufferutil",
  "utf-8-validate",
  "@google-cloud/storage",
];

// server deps to bundle to reduce openat(2) syscalls
// which helps cold start times
const allowlist = [
  "@google/generative-ai",
  "axios",
  "connect-pg-simple",
  "cors",
  "date-fns",
  "drizzle-orm",
  "drizzle-zod",
  "express",
  "express-rate-limit",
  "express-session",
  "jsonwebtoken",
  "memorystore",
  "multer",
  "nanoid",
  "nodemailer",
  "openai",
  "passport",
  "passport-local",
  "pg",
  "stripe",
  "uuid",
  "ws",
  "xlsx",
  "zod",
  "zod-validation-error",
];

async function buildAll() {
  await removeDirSafe("dist");

  // Client build: skip gracefully if client/ directory is absent (Railway deploys server-only)
  const { existsSync } = await import("fs");
  let clientBuilt = false;
  if (existsSync("client")) {
    console.log("cleaning client/dist for build...");
    await removeDirSafe("client/dist");
    await new Promise((r) => setTimeout(r, 400));
    console.log("building client...");
    try {
      await viteBuild();
      await copyPublicToDist();
      clientBuilt = existsSync("client/dist/index.html");
      if (!clientBuilt) {
        throw new Error("Vite finished but client/dist/index.html is missing");
      }
    } catch (e: any) {
      console.error("client build failed:", e.message);
      process.exit(1);
    }
  } else {
    console.log("client/ not found — skipping Vite build (server-only deploy)");
  }

  console.log("building server...");
  const pkg = JSON.parse(await readFile("package.json", "utf-8"));
  const allDeps = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ];
  const externals = [
    ...allDeps.filter((dep) => !allowlist.includes(dep)),
    ...nativeModules,
  ];

  await esbuild({
    entryPoints: ["server/index.ts"],
    platform: "node",
    bundle: true,
    format: "esm",
    outfile: "dist/index.js",
    alias: {
      "@shared": path.resolve("shared"),
    },
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    minify: true,
    external: externals,
    logLevel: "info",
  });

  // Copy client build output into dist/public so server/static.ts can find it.
  // static.ts resolves path.resolve(__dirname, "public") → dist/public in prod.
  if (clientBuilt) {
    console.log("copying client dist → dist/public...");
    await removeDirSafe("dist/public");
    try {
      await copyDirSafe("client/dist", "dist/public");
    } catch (e: any) {
      console.error("client copy failed:", e.message);
      process.exit(1);
    }
  } else if (!existsSync("client")) {
    console.log("no client/dist — server-only deploy (no static files)");
  }
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
