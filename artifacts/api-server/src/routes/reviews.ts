import { Router, type IRouter } from "express";
import { db, reviewsTable, restaurantsTable } from "@workspace/db";
import { eq, and, avg } from "drizzle-orm";
import {
  CreateReviewBody,
  DeleteReviewParams,
  ListReviewsQueryParams,
} from "@workspace/api-zod";
import { requireAuth, requireRole, type AuthedRequest } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/reviews", async (req, res): Promise<void> => {
  const queryParams = ListReviewsQueryParams.safeParse(req.query);

  let conditions: any[] = [];

  if (queryParams.success) {
    const { restaurantId, userId } = queryParams.data;
    if (restaurantId) conditions.push(eq(reviewsTable.restaurantId, restaurantId));
    if (userId) conditions.push(eq(reviewsTable.userId, userId));
  }

  const reviews = conditions.length > 0
    ? await db.select().from(reviewsTable).where(and(...conditions))
    : await db.select().from(reviewsTable);

  res.json(reviews);
});

router.post("/reviews", requireAuth, async (req: AuthedRequest, res): Promise<void> => {
  const parsed = CreateReviewBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const userId = req.userId!;

  const [review] = await db.insert(reviewsTable).values({
    ...parsed.data,
    userId,
    userName: req.userName ?? "Customer",
    orderId: parsed.data.orderId ?? null,
    comment: parsed.data.comment ?? null,
  }).returning();

  // Update restaurant rating
  const [ratingResult] = await db
    .select({ avgRating: avg(reviewsTable.rating) })
    .from(reviewsTable)
    .where(eq(reviewsTable.restaurantId, parsed.data.restaurantId));

  if (ratingResult?.avgRating) {
    const [countResult] = await db
      .select({ count: eq(reviewsTable.restaurantId, parsed.data.restaurantId) })
      .from(reviewsTable)
      .where(eq(reviewsTable.restaurantId, parsed.data.restaurantId));

    await db.update(restaurantsTable).set({
      rating: Number(ratingResult.avgRating),
    }).where(eq(restaurantsTable.id, parsed.data.restaurantId));
  }

  res.status(201).json(review);
});

router.delete("/reviews/:id", requireAuth, async (req: AuthedRequest, res): Promise<void> => {
  const params = DeleteReviewParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [existing] = await db.select().from(reviewsTable).where(eq(reviewsTable.id, params.data.id)).limit(1);
  if (!existing) {
    res.status(404).json({ error: "Review not found" });
    return;
  }
  if (existing.userId !== req.userId && req.userRole !== "admin") {
    res.status(403).json({ error: "Not authorized to delete this review" });
    return;
  }

  await db.delete(reviewsTable).where(eq(reviewsTable.id, params.data.id));
  res.sendStatus(204);
});

/**
 * Restaurant owner posts a public reply to a customer review.
 * Displayed beneath the original review in the app.
 */
router.patch("/reviews/:id/reply", requireRole("admin", "restaurant_owner"), async (req: AuthedRequest, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const reply = typeof req.body?.reply === "string" ? req.body.reply.trim() : "";
  if (!reply || reply.length < 2) {
    res.status(400).json({ error: "reply is required (min 2 characters)" });
    return;
  }
  if (reply.length > 1000) {
    res.status(400).json({ error: "reply trop long (1000 caractères max)" });
    return;
  }

  const [existing] = await db.select().from(reviewsTable).where(eq(reviewsTable.id, id)).limit(1);
  if (!existing) { res.status(404).json({ error: "Review not found" }); return; }

  // Ownership check — non-admins must own the restaurant being reviewed.
  if (req.userRole !== "admin") {
    const [restaurant] = await db
      .select({ ownerId: restaurantsTable.ownerId })
      .from(restaurantsTable)
      .where(eq(restaurantsTable.id, existing.restaurantId))
      .limit(1);
    if (!restaurant || restaurant.ownerId !== req.userId) {
      res.status(403).json({ error: "Forbidden: you do not own this restaurant" });
      return;
    }
  }

  const [updated] = await db
    .update(reviewsTable)
    .set({ ownerReply: reply, ownerRepliedAt: new Date() })
    .where(eq(reviewsTable.id, id))
    .returning();

  res.json(updated);
});

export default router;
