/**
 * Standalone test server for Forge editor integration tests.
 * Mounts only the map/admin routes without needing database or Colyseus.
 * Run: node test-forge-server.mjs
 */

import express from "express";
import { createServer } from "http";

// ── Inline lore data (mirrors shared/definitions/lore.ts) ───────

const SECTOR_LORE = {
  NW: { position: "NW", name: "Dried Basin", subtitle: "The Scorched Flats", biome: "arid", difficulty: 3, description: "Sun-bleached salt flats.", controllingFaction: "crusade", hasVendors: true, hasDockyards: false, specialFeatures: ["salt_mines", "oasis_camps", "mirage_events"] },
  N:  { position: "N",  name: "Cathedral Highlands", subtitle: "Spires of the Faithful", biome: "highland", difficulty: 5, description: "Towering stone formations.", controllingFaction: "fabled", hasVendors: true, hasDockyards: false, specialFeatures: ["omni_shrines", "wind_bridges", "highland_beasts"] },
  NE: { position: "NE", name: "Crown Peaks", subtitle: "Roof of the World", biome: "mountain", difficulty: 7, description: "Jagged peaks.", controllingFaction: null, hasVendors: false, hasDockyards: false, specialFeatures: ["dwarf_ruins", "frost_wyrms", "storm_forges", "vertical_combat"] },
  W:  { position: "W",  name: "Switchyard", subtitle: "Iron and Smoke", biome: "industrial", difficulty: 4, description: "Massive dockyards.", controllingFaction: null, hasVendors: true, hasDockyards: true, specialFeatures: ["warship_construction", "faction_workshops", "trade_hub", "smuggler_docks"] },
  CENTER: { position: "CENTER", name: "Racalvin's Domain", subtitle: "The Pirate King's Waters", biome: "pirate", difficulty: 1, description: "Open waters ruled by Racalvin.", controllingFaction: null, hasVendors: true, hasDockyards: true, specialFeatures: ["pirate_king_throne", "arena", "faction_hqs", "merchant_guild", "neutral_docks", "tavern"] },
  E:  { position: "E",  name: "Junkyards", subtitle: "Graveyard of Ships", biome: "urban_ruin", difficulty: 6, description: "Sprawling wreckage.", controllingFaction: null, hasVendors: false, hasDockyards: false, specialFeatures: ["salvage_nodes", "bandit_camps", "hidden_caches", "wreck_dungeons"] },
  SW: { position: "SW", name: "Drowned Quarter", subtitle: "Where the Sea Reclaims", biome: "flooded", difficulty: 5, description: "Half-submerged ruins.", controllingFaction: "legion", hasVendors: false, hasDockyards: false, specialFeatures: ["underwater_temples", "undead_patrols", "flooded_dungeons", "tide_gates"] },
  S:  { position: "S",  name: "The Pit", subtitle: "Volcanic Creations", biome: "crater", difficulty: 8, description: "Volcanic caldera.", controllingFaction: "legion", hasVendors: false, hasDockyards: false, specialFeatures: ["volcanic_forges", "madra_temples", "lava_born_enemies", "ember_sanctuaries", "ash_sorcerers"] },
  SE: { position: "SE", name: "Grinding March", subtitle: "The Eternal Battlefield", biome: "contested", difficulty: 9, description: "Endgame PvP warzone.", controllingFaction: null, hasVendors: false, hasDockyards: false, specialFeatures: ["shattered_nexus", "faction_siege", "claim_wars", "world_boss_spawns", "relic_drops"] },
};

const HERO_ROSTER = [
  { id: "aurion", name: "Aurion", title: "The Radiant", factionId: "crusade", raceId: "human", classId: "mage", level: 50, sectorSpawn: "NW" },
  { id: "sigurd", name: "Sigurd", title: "The Unbreakable", factionId: "crusade", raceId: "human", classId: "warrior", level: 55, sectorSpawn: "N" },
  { id: "kael", name: "Kael", title: "The Shadowblade", factionId: "crusade", raceId: "human", classId: "ranger", level: 48, sectorSpawn: "W" },
  { id: "thrax", name: "Thrax", title: "The Savage", factionId: "crusade", raceId: "barbarian", classId: "warrior", level: 52, sectorSpawn: "CENTER" },
  { id: "vox", name: "Vox", title: "Skyhunter", factionId: "crusade", raceId: "barbarian", classId: "ranger", level: 48, sectorSpawn: "E" },
  { id: "gruk", name: "Gruk", title: "Skullcrusher", factionId: "legion", raceId: "orc", classId: "warrior", level: 58, sectorSpawn: "S" },
  { id: "nazgrim", name: "Nazgrim", title: "The Profane", factionId: "legion", raceId: "orc", classId: "necromancer", level: 53, sectorSpawn: "SW" },
  { id: "silesh", name: "Silesh", title: "The Dread", factionId: "legion", raceId: "undead", classId: "mage", level: 55, sectorSpawn: "SW" },
  { id: "bone", name: "Bone", title: "The Collector", factionId: "legion", raceId: "undead", classId: "warrior", level: 50, sectorSpawn: "SE" },
  { id: "aelindor", name: "Aelindor", title: "The Swift", factionId: "fabled", raceId: "elf", classId: "warrior", level: 50, sectorSpawn: "N" },
  { id: "silvaine", name: "Silvaine", title: "Starwhisper", factionId: "fabled", raceId: "elf", classId: "mage", level: 52, sectorSpawn: "NE" },
  { id: "lyra", name: "Lyra", title: "The Weaver", factionId: "fabled", raceId: "elf", classId: "cleric", level: 48, sectorSpawn: "CENTER" },
  { id: "fenwick", name: "Fenwick", title: "Shadowleaf", factionId: "fabled", raceId: "elf", classId: "rogue", level: 46, sectorSpawn: "W" },
  { id: "durgin", name: "Durgin", title: "Ironheart", factionId: "fabled", raceId: "dwarf", classId: "warrior", level: 55, sectorSpawn: "NE" },
  { id: "brenna", name: "Brenna", title: "The Forgemaster", factionId: "fabled", raceId: "dwarf", classId: "warrior", level: 50, sectorSpawn: "W" },
  { id: "thordak", name: "Thordak", title: "Runekeeper", factionId: "fabled", raceId: "dwarf", classId: "mage", level: 48, sectorSpawn: "N" },
  { id: "helga", name: "Helga", title: "The Mender", factionId: "fabled", raceId: "dwarf", classId: "cleric", level: 45, sectorSpawn: "CENTER" },
];

const FACTIONS = {
  crusade: { id: "crusade", name: "The Crusade", color: "#3b82f6" },
  legion:  { id: "legion",  name: "The Legion",  color: "#ef4444" },
  fabled:  { id: "fabled",  name: "The Fabled",   color: "#22c55e" },
};

function getTideHeight(t) {
  const phase = (t % 600000) / 600000;
  return Math.sin(phase * Math.PI * 2) * 2.0;
}

function getHeroesForSector(sid) {
  return HERO_ROSTER.filter(h => h.sectorSpawn === sid);
}

const SECTOR_IDS = ["NW", "N", "NE", "W", "CENTER", "E", "SW", "S", "SE"];

// ── Auth middleware ──────────────────────────────────────────

function requireAdmin(req, res, next) {
  if (!req.headers["x-admin-token"] && !req.query.admin) {
    return res.status(403).json({ error: "Admin required" });
  }
  next();
}

// ── App ─────────────────────────────────────────────────────

const app = express();
app.use(express.json());

// Public: world map
app.get("/api/map/world", (_req, res) => {
  const sectors = {};
  for (const id of SECTOR_IDS) {
    const lore = SECTOR_LORE[id];
    const heroes = getHeroesForSector(id);
    sectors[id] = {
      sectorId: id, name: lore.name, subtitle: lore.subtitle,
      biome: lore.biome, difficulty: lore.difficulty, description: lore.description,
      controllingFaction: lore.controllingFaction, hasVendors: lore.hasVendors,
      hasDockyards: lore.hasDockyards, specialFeatures: lore.specialFeatures,
      heroes: heroes.map(h => ({ id: h.id, name: h.name, title: h.title, factionId: h.factionId, level: h.level })),
      playerCount: 0,
    };
  }
  res.json({ sectors, tideHeight: getTideHeight(Date.now()), serverTime: Date.now(), factions: FACTIONS });
});

// Public: sector detail
app.get("/api/map/sector/:id", (req, res) => {
  const sid = req.params.id.toUpperCase();
  const lore = SECTOR_LORE[sid];
  if (!lore) return res.status(404).json({ error: `Unknown sector: ${sid}` });
  const heroes = getHeroesForSector(sid);
  res.json({
    ...lore,
    heroes: heroes.map(h => ({ id: h.id, name: h.name, title: h.title, factionId: h.factionId, raceId: h.raceId, classId: h.classId, level: h.level })),
    liveState: null,
    tideHeight: getTideHeight(Date.now()),
  });
});

// Public: tide
app.get("/api/map/tide", (_req, res) => {
  res.json({ tideHeight: getTideHeight(Date.now()), serverTime: Date.now() });
});

// Admin: players
app.get("/api/admin/players", requireAdmin, (_req, res) => {
  res.json({ players: [], totalOnline: 0 });
});

// Admin: player search
app.get("/api/admin/player/:uuid", requireAdmin, (req, res) => {
  res.json({ accountId: req.params.uuid, found: false, currentSector: null, position: null });
});

// Admin: teleport
app.post("/api/admin/teleport", requireAdmin, (req, res) => {
  const { accountId, targetSector, x, y, z } = req.body;
  if (!accountId || !targetSector) return res.status(400).json({ error: "accountId and targetSector required" });
  res.json({ ok: true, message: `Teleport queued: ${accountId} → ${targetSector} (${x ?? 0}, ${y ?? 0}, ${z ?? 0})` });
});

// Admin: sector edit
app.post("/api/admin/sector/:id/edit", requireAdmin, (req, res) => {
  const sid = req.params.id.toUpperCase();
  if (!SECTOR_LORE[sid]) return res.status(404).json({ error: `Unknown sector: ${sid}` });
  res.json({ ok: true, message: `Edits pushed to ${sid}`, edits: req.body });
});

// Admin: sector export
app.get("/api/admin/sector/:id/export", requireAdmin, (req, res) => {
  const sid = req.params.id.toUpperCase();
  const lore = SECTOR_LORE[sid];
  if (!lore) return res.status(404).json({ error: `Unknown sector: ${sid}` });
  res.json({
    version: 1, exportedAt: new Date().toISOString(), sectorId: sid, lore,
    heroes: getHeroesForSector(sid), terrain: null, npcs: [], claimFlags: [], buildings: [], harvestNodes: [],
  });
});

// Admin: sector import
app.post("/api/admin/sector/import", requireAdmin, (req, res) => {
  if (!req.body?.sectorId) return res.status(400).json({ error: "Invalid sector data" });
  res.json({ ok: true, message: `Sector ${req.body.sectorId} import queued` });
});

// ── Start ───────────────────────────────────────────────────

const PORT = 5000;
const server = createServer(app);
server.listen(PORT, () => {
  console.log(`[test-server] Forge test server running on http://localhost:${PORT}`);
  console.log(`[test-server] Ready for: node test-forge-e2e.mjs`);
});
