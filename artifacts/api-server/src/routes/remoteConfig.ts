import { Router, type IRouter } from "express";
import { db, remoteConfigTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireRole, type AuthedRequest } from "../middlewares/auth";

const router: IRouter = Router();

async function getOrCreateConfig() {
  const [existing] = await db.select().from(remoteConfigTable).limit(1);
  if (existing) return existing;
  const [created] = await db
    .insert(remoteConfigTable)
    .values({ primaryUrl: "https://ma.jatek.app" })
    .returning();
  return created;
}

/** GET /remoteconfig — public, no auth required */
router.get("/remoteconfig", async (req, res) => {
  try {
    const config = await getOrCreateConfig();
    res.json({
      primaryUrl: config.primaryUrl,
      fallbackUrl1: config.fallbackUrl1 ?? null,
      fallbackUrl2: config.fallbackUrl2 ?? null,
      updatedAt: config.updatedAt,
    });
  } catch (err) {
    req.log.error(err, "Failed to fetch remote config");
    res.status(500).json({ error: "Internal server error" });
  }
});

/** PATCH /backend/remoteconfig — super_admin only */
router.patch(
  "/backend/remoteconfig",
  requireRole("super_admin"),
  async (req: AuthedRequest, res) => {
    try {
      const { primaryUrl, fallbackUrl1, fallbackUrl2 } = req.body as {
        primaryUrl?: string;
        fallbackUrl1?: string | null;
        fallbackUrl2?: string | null;
      };

      const current = await getOrCreateConfig();

      const [updated] = await db
        .update(remoteConfigTable)
        .set({
          ...(primaryUrl !== undefined && { primaryUrl }),
          ...(fallbackUrl1 !== undefined && { fallbackUrl1: fallbackUrl1 ?? null }),
          ...(fallbackUrl2 !== undefined && { fallbackUrl2: fallbackUrl2 ?? null }),
          updatedAt: new Date(),
          updatedById: req.userId ?? null,
        })
        .where(eq(remoteConfigTable.id, current.id))
        .returning();

      res.json({
        primaryUrl: updated.primaryUrl,
        fallbackUrl1: updated.fallbackUrl1 ?? null,
        fallbackUrl2: updated.fallbackUrl2 ?? null,
        updatedAt: updated.updatedAt,
      });
    } catch (err) {
      req.log.error(err, "Failed to update remote config");
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

export default router;
