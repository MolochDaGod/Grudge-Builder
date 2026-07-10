/**
 * Player ships API — Railway Postgres SSOT for dock craft + fleet roster.
 *
 * GET  /api/ships              — roster for authenticated account
 * POST /api/ships/ensure-starter — ensure free Argon Raft / rowboat
 * POST /api/ships/build        — craft ship at dock (catalog costs)
 * POST /api/ships/active       — set active ship { shipId }
 * POST /api/ships/sync         — optional body.ships[] merge from localStorage migration
 */
import type { Express, Request, Response, NextFunction } from "express";
import { db } from "../db";
import { playerShips, accounts } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { SHIP_CATALOG_BY_SIZE, RTS_SOUTH_DOCK, type ShipSize } from "@shared/definitions/shipCatalog";

type AuthedRequest = Request & {
  userId?: string;
  accountId?: string;
  grudgeId?: string;
};

function extractUserId(req: Request): string {
  const r = req as AuthedRequest;
  return r.userId || r.accountId || (req as any).user?.id || "guest";
}

async function resolveAccountId(req: Request): Promise<{ accountId: string; userId: string } | null> {
  const userId = extractUserId(req);
  const bodyAccount = (req.body?.accountId || req.query?.accountId) as string | undefined;

  // Prefer account linked to user
  try {
    const byUser = await db.select().from(accounts).where(eq(accounts.userId, userId)).limit(1);
    if (byUser[0]) return { accountId: byUser[0].id, userId };

    // Some tokens put grudge id / account uuid as userId
    const byId = await db.select().from(accounts).where(eq(accounts.id, userId)).limit(1);
    if (byId[0]) return { accountId: byId[0].id, userId };

    if (bodyAccount) {
      const byBody = await db.select().from(accounts).where(eq(accounts.id, bodyAccount)).limit(1);
      if (byBody[0]) return { accountId: byBody[0].id, userId };
      // Guest / puter path: allow client accountId string as soft key
      return { accountId: bodyAccount, userId };
    }
  } catch {
    /* table may not exist yet in some envs */
  }

  if (bodyAccount) return { accountId: bodyAccount, userId };
  if (userId && userId !== "guest") return { accountId: userId, userId };
  return null;
}

function rowToShip(row: typeof playerShips.$inferSelect) {
  return {
    id: row.id,
    name: row.name,
    size: row.size,
    hullColor: row.hullColor,
    sailColor: row.sailColor,
    cannons: row.cannons,
    crewIds: row.crewIds || [],
    captainId: row.captainId,
    hp: row.hp,
    maxHp: row.maxHp,
    speed: row.speed,
    zoneX: row.zoneX,
    zoneY: row.zoneY,
    dockId: row.dockId,
    isActive: row.isActive,
    isDamaged: row.isDamaged,
    travelDestination: row.travelDestination ?? null,
    travelStartedAt: row.travelStartedAt ?? null,
    travelArrivalAt: row.travelArrivalAt ?? null,
    createdAt: row.createdAt,
  };
}

function catalogStats(size: string) {
  const entry = SHIP_CATALOG_BY_SIZE[size as ShipSize] || SHIP_CATALOG_BY_SIZE.rowboat;
  return {
    entry,
    maxHp: entry.maxHp,
    speed: entry.oceanSpeed,
    cannons: entry.cannonSlots,
  };
}

export function registerShipRoutes(
  app: Express,
  requireAuth: (req: Request, res: Response, next: NextFunction) => void,
): void {
  /** GET /api/ships — full roster */
  app.get("/api/ships", requireAuth, async (req, res) => {
    try {
      const acc = await resolveAccountId(req);
      if (!acc) return res.status(401).json({ error: "Account required" });

      const rows = await db
        .select()
        .from(playerShips)
        .where(eq(playerShips.accountId, acc.accountId))
        .orderBy(desc(playerShips.createdAt));

      const ships = rows.map(rowToShip);
      const active = ships.find((s) => s.isActive) || ships[0] || null;

      res.json({
        ships,
        activeShipId: active?.id ?? null,
        dockId: active?.dockId || RTS_SOUTH_DOCK.id,
        source: "railway",
      });
    } catch (e) {
      console.error("[ships] GET failed:", e);
      res.status(500).json({
        error: e instanceof Error ? e.message : "Failed to load ships",
        hint: "Run migrations/007_player_ships.sql on Railway Postgres",
      });
    }
  });

  /** POST /api/ships/ensure-starter */
  app.post("/api/ships/ensure-starter", requireAuth, async (req, res) => {
    try {
      const acc = await resolveAccountId(req);
      if (!acc) return res.status(401).json({ error: "Account required" });

      const existing = await db
        .select()
        .from(playerShips)
        .where(eq(playerShips.accountId, acc.accountId))
        .limit(1);

      if (existing[0]) {
        return res.json({
          ships: (await db.select().from(playerShips).where(eq(playerShips.accountId, acc.accountId))).map(rowToShip),
          activeShipId: existing[0].id,
          dockId: existing[0].dockId,
          source: "railway",
        });
      }

      const { entry, maxHp, speed, cannons } = catalogStats("rowboat");
      const captainId = (req.body?.captainId as string) || null;
      const [created] = await db
        .insert(playerShips)
        .values({
          accountId: acc.accountId,
          userId: acc.userId,
          captainId,
          name: req.body?.name || "Starter Argon Raft",
          size: "rowboat",
          hullColor: "brown",
          sailColor: "white",
          cannons,
          hp: maxHp,
          maxHp,
          speed,
          dockId: RTS_SOUTH_DOCK.id,
          isActive: true,
        })
        .returning();

      res.status(201).json({
        ships: [rowToShip(created)],
        activeShipId: created.id,
        dockId: created.dockId,
        source: "railway",
      });
    } catch (e) {
      console.error("[ships] ensure-starter failed:", e);
      res.status(500).json({ error: e instanceof Error ? e.message : "ensure-starter failed" });
    }
  });

  /** POST /api/ships/build */
  app.post("/api/ships/build", requireAuth, async (req, res) => {
    try {
      const acc = await resolveAccountId(req);
      if (!acc) return res.status(401).json({ error: "Account required" });

      const size = (req.body?.size || "rowboat") as ShipSize;
      const entry = SHIP_CATALOG_BY_SIZE[size];
      if (!entry) return res.status(400).json({ error: `Unknown ship size: ${size}` });

      const existing = await db
        .select()
        .from(playerShips)
        .where(and(eq(playerShips.accountId, acc.accountId), eq(playerShips.size, size)));

      if (!entry.starterFree && existing.length > 0) {
        return res.status(400).json({ error: `You already own a ${entry.label}.` });
      }

      // Clear previous active
      await db
        .update(playerShips)
        .set({ isActive: false, updatedAt: Date.now() })
        .where(eq(playerShips.accountId, acc.accountId));

      const { maxHp, speed, cannons } = catalogStats(size);
      const [created] = await db
        .insert(playerShips)
        .values({
          accountId: acc.accountId,
          userId: acc.userId,
          captainId: req.body?.captainId || null,
          name: req.body?.name || entry.label,
          size,
          hullColor: req.body?.hullColor || "brown",
          sailColor: req.body?.sailColor || "white",
          cannons,
          hp: maxHp,
          maxHp,
          speed,
          dockId: req.body?.dockId || RTS_SOUTH_DOCK.id,
          zoneX: req.body?.zoneX ?? 50,
          zoneY: req.body?.zoneY ?? 50,
          isActive: true,
        })
        .returning();

      const all = await db
        .select()
        .from(playerShips)
        .where(eq(playerShips.accountId, acc.accountId));

      res.status(201).json({
        ship: rowToShip(created),
        ships: all.map(rowToShip),
        activeShipId: created.id,
        dockId: created.dockId,
        cost: {
          gold: entry.craftGold,
          wood: entry.craftWood,
          iron: entry.craftIron,
          cloth: entry.craftCloth,
        },
        source: "railway",
      });
    } catch (e) {
      console.error("[ships] build failed:", e);
      res.status(500).json({ error: e instanceof Error ? e.message : "build failed" });
    }
  });

  /** POST /api/ships/active { shipId } */
  app.post("/api/ships/active", requireAuth, async (req, res) => {
    try {
      const acc = await resolveAccountId(req);
      if (!acc) return res.status(401).json({ error: "Account required" });
      const shipId = req.body?.shipId as string;
      if (!shipId) return res.status(400).json({ error: "shipId required" });

      const [ship] = await db
        .select()
        .from(playerShips)
        .where(and(eq(playerShips.id, shipId), eq(playerShips.accountId, acc.accountId)))
        .limit(1);

      if (!ship) return res.status(404).json({ error: "Ship not found" });

      await db
        .update(playerShips)
        .set({ isActive: false, updatedAt: Date.now() })
        .where(eq(playerShips.accountId, acc.accountId));

      const [updated] = await db
        .update(playerShips)
        .set({ isActive: true, updatedAt: Date.now() })
        .where(eq(playerShips.id, shipId))
        .returning();

      res.json({ ship: rowToShip(updated), source: "railway" });
    } catch (e) {
      console.error("[ships] active failed:", e);
      res.status(500).json({ error: e instanceof Error ? e.message : "active failed" });
    }
  });

  /** POST /api/ships/sync — migrate localStorage roster once */
  app.post("/api/ships/sync", requireAuth, async (req, res) => {
    try {
      const acc = await resolveAccountId(req);
      if (!acc) return res.status(401).json({ error: "Account required" });

      const incoming = Array.isArray(req.body?.ships) ? req.body.ships : [];
      const existing = await db
        .select()
        .from(playerShips)
        .where(eq(playerShips.accountId, acc.accountId));

      if (existing.length > 0) {
        return res.json({
          ships: existing.map(rowToShip),
          activeShipId: existing.find((s) => s.isActive)?.id ?? existing[0]?.id ?? null,
          dockId: existing[0]?.dockId || RTS_SOUTH_DOCK.id,
          source: "railway",
          migrated: 0,
        });
      }

      let activeId: string | null = req.body?.activeShipId || null;
      let migrated = 0;
      for (const s of incoming) {
        const size = (s.size || "rowboat") as ShipSize;
        const { maxHp, speed, cannons } = catalogStats(size);
        const values: typeof playerShips.$inferInsert = {
          accountId: acc.accountId,
          userId: acc.userId,
          captainId: s.captainId || null,
          name: s.name || "Ship",
          size,
          hullColor: s.hullColor || "brown",
          sailColor: s.sailColor || "white",
          cannons: s.cannons ?? cannons,
          crewIds: Array.isArray(s.crewIds) ? s.crewIds : [],
          hp: s.hp ?? maxHp,
          maxHp: s.maxHp ?? maxHp,
          speed: s.speed ?? speed,
          zoneX: s.zoneX ?? 50,
          zoneY: s.zoneY ?? 50,
          dockId: s.dockId || RTS_SOUTH_DOCK.id,
          isActive: s.id === activeId || (!activeId && migrated === 0),
          isDamaged: !!s.isDamaged,
          createdAt: s.createdAt || Date.now(),
        };
        if (typeof s.id === "string" && s.id.length > 8) {
          values.id = s.id;
        }
        const [row] = await db.insert(playerShips).values(values).returning();
        if (!activeId) activeId = row.id;
        migrated++;
      }

      const all = await db
        .select()
        .from(playerShips)
        .where(eq(playerShips.accountId, acc.accountId));

      res.json({
        ships: all.map(rowToShip),
        activeShipId: activeId,
        dockId: all[0]?.dockId || RTS_SOUTH_DOCK.id,
        source: "railway",
        migrated,
      });
    } catch (e) {
      console.error("[ships] sync failed:", e);
      res.status(500).json({ error: e instanceof Error ? e.message : "sync failed" });
    }
  });
}
