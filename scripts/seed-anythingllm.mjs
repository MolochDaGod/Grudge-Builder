#!/usr/bin/env node
/**
 * Seed AnythingLLM workspaces with Grudge Studio canonical knowledge.
 *
 * Usage:
 *   ANYTHINGLLM_API_KEY=... node scripts/seed-anythingllm.mjs
 */

const BASE = (process.env.ANYTHINGLLM_BASE_URL || "http://localhost:3001/api").replace(/\/$/, "");
const KEY = process.env.ANYTHINGLLM_API_KEY;
if (!KEY) {
  console.error("Set ANYTHINGLLM_API_KEY");
  process.exit(1);
}

const OBJECTSTORE = process.env.OBJECTSTORE_BASE_URL || "https://objectstore.grudge-studio.com/api/v1";

const WORKSPACE_DOCS = {
  "grudge-game-data": [
    { url: `${OBJECTSTORE}/game-data-manifest.json`, title: "game-data-manifest" },
    { url: `${OBJECTSTORE}/master-items.json`, title: "master-items" },
    { url: `${OBJECTSTORE}/master-recipes.json`, title: "master-recipes" },
    { url: `${OBJECTSTORE}/master-materials.json`, title: "master-materials" },
    { url: `${OBJECTSTORE}/master-harvest-nodes.json`, title: "master-harvest-nodes" },
    { url: `${OBJECTSTORE}/master-professionTrees.json`, title: "master-professionTrees" },
    { url: `${OBJECTSTORE}/master-weaponSkills.json`, title: "master-weaponSkills" },
    { url: `${OBJECTSTORE}/master-skillTrees.json`, title: "master-skillTrees" },
    { url: `${OBJECTSTORE}/master-professions.json`, title: "master-professions" },
  ],
  "grudge-fleet": [
    { url: "https://info.grudge-studio.com/grudge-guide.html", title: "grudge-guide" },
  ],
  "grudge-supabase": [
    {
      text: [
        "Grudge Supabase project: rdbkhvrpavhptxrmmwrc",
        "URL: https://rdbkhvrpavhptxrmmwrc.supabase.co",
        "Stack: @supabase/server for Edge Functions + Express middleware.",
        "Auth: publishable key in browser, secret key server-only.",
        "GrudgeBuilder paths: server/supabase/, supabase/functions/, supabase/config.toml",
        "Never expose SUPABASE_SECRET_KEY or service role to Vite client bundles.",
      ].join("\n"),
      title: "grudge-supabase-overview",
    },
  ],
};

async function api(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${KEY}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${path} ${res.status}: ${text}`);
  }
  return res.json();
}

async function listDocPaths() {
  const data = await api("/v1/documents");
  const paths = [];

  function walk(node, parts = []) {
    if (!node) return;
    if (node.type === "file" && node.id) {
      const inCustom = parts.includes("custom-documents");
      paths.push({
        path: [...parts, node.name].join("/"),
        apiPath: inCustom ? `custom-documents/${node.name}` : `custom-documents/${node.name}`,
        id: node.id,
        title: node.title || node.name,
        fileName: node.name,
      });
    }
    if (node.type === "folder" && Array.isArray(node.items)) {
      const next = node.name === "documents" ? parts : [...parts, node.name];
      for (const item of node.items) walk(item, next);
    }
  }

  walk(data.localFiles);
  return paths;
}

async function ensureWorkspace(slug, name) {
  const { workspaces } = await api("/v1/workspaces");
  if (workspaces?.some((w) => w.slug === slug)) return;
  await api("/v1/workspace/new", { name, slug });
  console.log(`created workspace: ${slug}`);
}

async function uploadLink(url, title) {
  return api("/v1/document/upload-link", { link: url, metadata: { title } });
}

async function uploadText(text, title) {
  return api("/v1/document/raw-text", { textContent: text, metadata: { title } });
}

async function attach(slug, adds) {
  if (!adds.length) return;
  await api(`/v1/workspace/${slug}/update-embeddings`, { adds, deletes: [] });
  console.log(`  attached ${adds.length} docs → ${slug}`);
}

async function main() {
  console.log("AnythingLLM seed starting…");
  const auth = await api("/v1/auth");
  if (!auth.authenticated) throw new Error("API key rejected");

  for (const slug of Object.keys(WORKSPACE_DOCS)) {
    await ensureWorkspace(slug, slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()));
  }

  const uploadedTitles = new Set();

  for (const [slug, docs] of Object.entries(WORKSPACE_DOCS)) {
    console.log(`\n[${slug}] ingesting ${docs.length} sources…`);
    for (const doc of docs) {
      if (doc.url) {
        await uploadLink(doc.url, doc.title);
      } else if (doc.text) {
        await uploadText(doc.text, doc.title);
      }
      uploadedTitles.add(doc.title);
      console.log(`  uploaded: ${doc.title}`);
    }
  }

  // Re-list documents and attach by title match
  const allPaths = await listDocPaths();
  for (const [slug, docs] of Object.entries(WORKSPACE_DOCS)) {
    const adds = [];
    for (const doc of docs) {
      const slug = doc.title.replace(/-/g, "").toLowerCase();
      const match = allPaths.find((p) => {
        const hay = `${p.title} ${p.fileName}`.toLowerCase().replace(/-/g, "");
        return p.title === doc.title || hay.includes(slug) || hay.includes(doc.title.replace(/-/g, ""));
      });
      if (match) adds.push(match.apiPath);
      else console.warn(`  warn: no file match for ${doc.title}`);
    }
    await attach(slug, [...new Set(adds)]);
  }

  console.log("\nDone. Test with:");
  console.log(`  curl -H "Authorization: Bearer $ANYTHINGLLM_API_KEY" -H "Content-Type: application/json" \\`);
  console.log(`    -d '{"message":"How many recipes in canonical game data?","mode":"query"}' \\`);
  console.log(`    ${BASE}/v1/workspace/grudge-game-data/chat`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});