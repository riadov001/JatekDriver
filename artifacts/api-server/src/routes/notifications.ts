import { Router, type IRouter } from "express";
import { db, notificationsTable, usersTable } from "@workspace/db";
import { eq, and, isNull, desc } from "drizzle-orm";
import { requireAuth, type AuthedRequest } from "../middlewares/auth";
import { sendExpoPush } from "../lib/expoPush";

const router: IRouter = Router();

/** List my notifications (newest first, max 50) */
router.get("/notifications", requireAuth, async (req: AuthedRequest, res): Promise<void> => {
  const notifications = await db
    .select()
    .from(notificationsTable)
    .where(eq(notificationsTable.userId, req.userId!))
    .orderBy(desc(notificationsTable.createdAt))
    .limit(50);

  const unreadCount = notifications.filter((n) => !n.readAt).length;
  res.json({ notifications, unreadCount });
});

/** Mark a notification as read */
router.patch("/notifications/:id/read", requireAuth, async (req: AuthedRequest, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [notif] = await db
    .update(notificationsTable)
    .set({ readAt: new Date() })
    .where(and(eq(notificationsTable.id, id), eq(notificationsTable.userId, req.userId!)))
    .returning();

  if (!notif) { res.status(404).json({ error: "Notification not found" }); return; }
  res.json(notif);
});

/** Mark all my notifications as read */
router.patch("/notifications/read-all", requireAuth, async (req: AuthedRequest, res): Promise<void> => {
  await db
    .update(notificationsTable)
    .set({ readAt: new Date() })
    .where(and(eq(notificationsTable.userId, req.userId!), isNull(notificationsTable.readAt)));

  res.json({ success: true });
});

/** Delete a notification */
router.delete("/notifications/:id", requireAuth, async (req: AuthedRequest, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db
    .delete(notificationsTable)
    .where(and(eq(notificationsTable.id, id), eq(notificationsTable.userId, req.userId!)));
  res.json({ success: true });
});

/**
 * Register or update the Expo push token for the current user's device.
 * The mobile app calls this on each login/launch after obtaining the token.
 */
router.put("/push-token", requireAuth, async (req: AuthedRequest, res): Promise<void> => {
  const token = typeof req.body?.token === "string" ? req.body.token.trim() : null;
  if (!token) {
    res.status(400).json({ error: "token is required" });
    return;
  }
  if (!token.startsWith("ExponentPushToken[") && !token.startsWith("ExpoPushToken[")) {
    res.status(400).json({ error: "Invalid Expo push token format" });
    return;
  }

  await db
    .update(usersTable)
    .set({ pushToken: token })
    .where(eq(usersTable.id, req.userId!));

  res.json({ ok: true });
});

export default router;

/**
 * Insert an in-app notification row and, if the user has a registered
 * device token, also deliver an Expo push notification.
 * Never throws — failures are logged silently.
 */
export async function pushNotification(
  userId: number,
  type: string,
  title: string,
  body: string,
  data?: Record<string, unknown>,
) {
  try {
    await db.insert(notificationsTable).values({ userId, type, title, body, data: data ?? null });

    const [user] = await db
      .select({ pushToken: usersTable.pushToken })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);

    if (user?.pushToken) {
      await sendExpoPush([{
        to: user.pushToken,
        title,
        body,
        data,
        sound: "default",
        priority: "high",
      }]);
    }
  } catch (e) {
    console.error("[notifications] push failed", e);
  }
}
