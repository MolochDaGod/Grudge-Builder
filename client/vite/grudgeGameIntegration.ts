import fs from "node:fs";
import path from "node:path";
import type { Plugin } from "vite";

const MARKER = path.join(
  "artifacts",
  "grudge-game",
  "src",
  "pages",
  "world",
  "WorldPage.tsx",
);

/** Resolve grudge-character-animator root (must exist before Vite starts). */
export function resolveGrudgeMonorepoRoot(repoRoot: string): string {
  const candidates = [
    process.env.GRUDGE_MONOREPO_ROOT,
    path.resolve(repoRoot, "vendor/grudge-character-animator"),
    path.resolve(repoRoot, "../../repos/grudge-character-animator"),
  ].filter(Boolean) as string[];

  for (const root of candidates) {
    if (fs.existsSync(path.join(root, MARKER))) return root;
  }

  throw new Error(
    "grudge-character-animator not found. Run: node client/ensure-grudge-monorepo.mjs",
  );
}

export function grudgeGameAliases(monorepoRoot: string): Record<string, string> {
  const ggSrc = path.join(monorepoRoot, "artifacts/grudge-game/src");
  const lib = (name: string) => path.join(monorepoRoot, "lib", name);

  return {
    "@grudge-game": ggSrc,
    "@workspace/character-kit": path.join(lib("character-kit"), "src/index.ts"),
    "@workspace/character-kit/gear": path.join(
      lib("character-kit"),
      "src/gearPresets.ts",
    ),
    "@workspace/game-content": path.join(lib("game-content"), "src/index.ts"),
    "@workspace/game-content/multiplayer": path.join(
      lib("game-content"),
      "src/multiplayer.ts",
    ),
    "@workspace/api-client-react": path.join(
      lib("api-client-react"),
      "src/index.ts",
    ),
    "@workspace/api-spec": path.join(lib("api-spec"), "src/index.ts"),
    "@workspace/api-zod": path.join(lib("api-zod"), "src/index.ts"),
  };
}

function resolveAtImport(
  relativePath: string,
  ggSrc: string,
  builderSrc: string,
  importer?: string,
): string {
  const norm = importer?.replace(/\\/g, "/") ?? "";
  const root = norm.includes("/artifacts/grudge-game/") ? ggSrc : builderSrc;
  const base = path.resolve(root, relativePath);
  for (const ext of [".tsx", ".ts", ".jsx", ".js", ".json"]) {
    const candidate = base + ext;
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }
  if (fs.existsSync(base) && fs.statSync(base).isFile()) return base;
  if (fs.existsSync(base) && fs.statSync(base).isDirectory()) {
    for (const index of ["/index.ts", "/index.tsx", "/index.js"]) {
      const candidate = base + index;
      if (fs.existsSync(candidate)) return candidate;
    }
  }
  return base;
}

/**
 * Dual `@/` resolver: grudge-builder client/src vs grudge-game src, chosen by importer path.
 * Must replace the static `"@": client/src` alias — that alias wins over resolveId plugins.
 */
export function grudgeAtAliasEntry(clientDir: string, monorepoRoot: string) {
  const ggSrc = path.join(monorepoRoot, "artifacts/grudge-game/src");
  const builderSrc = path.join(clientDir, "src");

  return {
    find: /^@\/(.+)$/,
    replacement: "$1",
    customResolver(source: string, importer?: string) {
      return resolveAtImport(source, ggSrc, builderSrc, importer);
    },
  };
}

/** Legacy plugin kept for root vite.config parity (client build uses grudgeAtAliasEntry). */
export function grudgeGameAtAliasPlugin(monorepoRoot: string): Plugin {
  const ggSrc = path.join(monorepoRoot, "artifacts/grudge-game/src");

  return {
    name: "grudge-game-at-alias",
    enforce: "pre",
    resolveId(source, importer) {
      if (!importer || !source.startsWith("@/")) return null;
      const norm = importer.replace(/\\/g, "/");
      if (!norm.includes("/artifacts/grudge-game/")) return null;
      const rel = source.slice(2);
      const base = path.resolve(ggSrc, rel);
      for (const ext of ["", ".ts", ".tsx", ".js", ".jsx"]) {
        const candidate = base + ext;
        if (fs.existsSync(candidate)) return candidate;
      }
      return base;
    },
  };
}

export function grudgeGameManualChunk(id: string): string | undefined {
  if (!id.includes("node_modules")) return undefined;
  if (id.includes("@dimforge/")) return "rapier-vendor";
  if (
    id.includes("/three/") ||
    id.includes("three-stdlib") ||
    id.includes("@react-three/") ||
    id.includes("/meshline/")
  ) {
    return "three-vendor";
  }
  if (id.includes("/artifacts/grudge-game/")) return "grudge-world";
  return undefined;
}