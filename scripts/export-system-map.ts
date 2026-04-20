/**
 * Exports the typed manifest in `client/src/data/systemMap.ts` to a JSON snapshot
 * that is committed to `Grudge-Studio-Mission/docs/system-map.json`.
 *
 * Usage:
 *   npx tsx scripts/export-system-map.ts <out-path>
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { nodes, edges, readiness } from "../client/src/data/systemMap";

const outArg = process.argv[2] ?? "docs/system-map.json";
const out = resolve(outArg);

const payload = {
  generatedAt: new Date().toISOString(),
  counts: {
    nodes: nodes.length,
    edges: edges.length,
    readiness: readiness.length,
  },
  nodes,
  edges,
  readiness,
};

writeFileSync(out, JSON.stringify(payload, null, 2) + "\n", "utf8");
console.log(`[system-map] wrote ${out} (${nodes.length} nodes, ${edges.length} edges)`);
