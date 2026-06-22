import { build as esbuild } from "esbuild";
import { rm, readFile } from "fs/promises";
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
  // "openai" removed from allowlist — ESM-to-CJS conversion dumps source to stdout
  "passport",
  "passport-local",
  "pg",
  "stripe",
  "uuid",
  "ws",
  "xlsx",
  "zod",
  "zod-validation-error",
  "@solana/web3.js",
  "@solana/spl-token",
  "bs58",
];

async function buildServer() {
  await rm("dist", { recursive: true, force: true });

  console.log("building server (Railway deploy)...");
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

  console.log("server build complete → dist/index.cjs");
}

buildServer().catch((err) => {
  console.error(err);
  process.exit(1);
});
