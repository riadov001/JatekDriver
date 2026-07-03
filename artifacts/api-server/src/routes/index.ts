import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import restaurantsRouter from "./restaurants";
import menuRouter from "./menu";
import ordersRouter from "./orders";
import usersRouter from "./users";
import driversRouter from "./drivers";
import reviewsRouter from "./reviews";
import rewardsRouter from "./rewards";
import adminRouter from "./admin";
import favoritesRouter from "./favorites";
import addressesRouter from "./addresses";
import paymentMethodsRouter from "./paymentMethods";
import supportTicketsRouter from "./supportTickets";
import notificationPrefsRouter from "./notificationPrefs";
import userConsentsRouter from "./userConsents";
import quotesRouter from "./quotes";
import backendRouter from "./backend";
import contentRouter from "./content";
import promoCodesRouter from "./promoCodes";
import chatRouter from "./chat";
import notificationsRouter from "./notifications";
import referralsRouter from "./referrals";
import remoteConfigRouter from "./remoteConfig";
import { subscribe } from "../lib/sse";
import { requireAuth, type AuthedRequest } from "../middlewares/auth";
import { db, ordersTable, restaurantsTable, driversTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(restaurantsRouter);
router.use(menuRouter);
router.use(ordersRouter);
router.use(usersRouter);
router.use(driversRouter);
router.use(reviewsRouter);
router.use(rewardsRouter);
router.use(adminRouter);
router.use(favoritesRouter);
router.use(addressesRouter);
router.use(paymentMethodsRouter);
router.use(supportTicketsRouter);
router.use(notificationPrefsRouter);
router.use(userConsentsRouter);
router.use(quotesRouter);
router.use(backendRouter);
router.use(contentRouter);
router.use(promoCodesRouter);
router.use(chatRouter);
router.use(notificationsRouter);
router.use(referralsRouter);
router.use(remoteConfigRouter);

/**
 * SSE endpoint — clients subscribe to one or more channels:
 *   GET /api/events?channels=order:5,restaurant:2
 * Channels:
 *   order:{id}            → order status + driver location for customer tracking
 *   restaurant:{id}       → new incoming orders (for restaurant dashboard)
 *   available_orders      → orders ready for pickup (for driver app)
 *   driver:{id}           → driver's own status + location stream
 *   driver_orders:{id}    → orders newly assigned to a driver
 *   admin_tracking        → global live ops dashboard: every order_status change,
 *                            every driver_location ping, plus driver_offline events
 */
const ADMIN_ROLES = new Set(["admin", "super_admin"]);

/**
 * Verifies the authenticated user is allowed to subscribe to a given SSE
 * channel. Without this check any logged-in user (e.g. a customer or a
 * driver) could pass an arbitrary channel name — such as `admin_tracking`
 * or another driver's `driver:{id}` — and silently receive every driver's
 * live GPS position. Admins/super_admins may subscribe to anything.
 */
async function isChannelAuthorized(req: AuthedRequest, channel: string): Promise<boolean> {
  const role = req.userRole ?? "";
  const userId = req.userId;
  if (!userId) return false;
  if (ADMIN_ROLES.has(role)) return true;

  if (channel === "admin_tracking") return false;

  if (channel === "available_orders") {
    return role === "driver";
  }

  const [, rawId] = channel.split(":");
  const id = rawId ? parseInt(rawId, 10) : NaN;
  if (isNaN(id)) return false;

  if (channel.startsWith("driver_orders:") || channel.startsWith("driver:")) {
    const [driver] = await db.select().from(driversTable).where(eq(driversTable.id, id)).limit(1);
    return !!driver && driver.userId === userId;
  }

  if (channel.startsWith("restaurant:")) {
    const [restaurant] = await db
      .select()
      .from(restaurantsTable)
      .where(eq(restaurantsTable.id, id))
      .limit(1);
    return !!restaurant && restaurant.ownerId === userId;
  }

  if (channel.startsWith("order:")) {
    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id)).limit(1);
    if (!order) return false;
    if (order.userId === userId) return true;
    const [restaurant] = await db
      .select()
      .from(restaurantsTable)
      .where(eq(restaurantsTable.id, order.restaurantId))
      .limit(1);
    if (restaurant && restaurant.ownerId === userId) return true;
    if (order.driverId) {
      const [driver] = await db
        .select()
        .from(driversTable)
        .where(eq(driversTable.id, order.driverId))
        .limit(1);
      if (driver && driver.userId === userId) return true;
    }
    return false;
  }

  // Unknown channel pattern — deny by default.
  return false;
}

router.get("/events", requireAuth, async (req: AuthedRequest, res) => {
  const raw = (req.query.channels as string) ?? "";
  const requested = raw.split(",").map((c) => c.trim()).filter(Boolean);
  if (requested.length === 0) {
    res.status(400).json({ error: "channels query param required" });
    return;
  }

  const authChecks = await Promise.all(
    requested.map(async (channel) => ({ channel, ok: await isChannelAuthorized(req, channel) })),
  );
  const channels = authChecks.filter((c) => c.ok).map((c) => c.channel);
  const denied = authChecks.filter((c) => !c.ok).map((c) => c.channel);

  if (channels.length === 0) {
    res.status(403).json({ error: "Not authorized for any requested channel", denied });
    return;
  }

  subscribe(req, res, channels);
});

export default router;
