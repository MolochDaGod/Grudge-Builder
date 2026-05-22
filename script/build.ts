import { build as esbuild } from "esbuild";
import { build as viteBuild } from "vite";
import { rm, readFile, cp } from "fs/promises";
import path from "path";

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
  "@colyseus/core",
  "@colyseus/monitor",
  "@colyseus/playground",
  "@colyseus/schema",
  "@colyseus/ws-transport",
  "colyseus",
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
  await rm("dist", { recursive: true, force: true });

  // Client build: skip gracefully if client/ directory is absent (Railway deploys server-only)
  try {
    const { existsSync } = await import("fs");
    if (existsSync("client")) {
      console.log("building client...");
      await viteBuild();
    } else {
      console.log("client/ not found — skipping Vite build (server-only deploy)");
    }
  } catch (e: any) {
    console.warn("client build skipped:", e.message);
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
    format: "cjs",
    outfile: "dist/index.cjs",
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
  try {
    const { existsSync } = await import("fs");
    if (existsSync("client/dist")) {
      console.log("copying client dist → dist/public...");
      await cp("client/dist", "dist/public", { recursive: true });
    } else {
      console.log("no client/dist — server-only deploy (no static files)");
    }
  } catch (e: any) {
    console.warn("client copy skipped:", e.message);
  }
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
