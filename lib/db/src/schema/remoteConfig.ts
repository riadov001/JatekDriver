import { pgTable, serial, varchar, timestamp, integer } from "drizzle-orm/pg-core";

export const remoteConfigTable = pgTable("remote_config", {
  id: serial("id").primaryKey(),
  primaryUrl: varchar("primary_url", { length: 500 }).notNull().default("https://ma.jatek.app"),
  fallbackUrl1: varchar("fallback_url1", { length: 500 }),
  fallbackUrl2: varchar("fallback_url2", { length: 500 }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  updatedById: integer("updated_by_id"),
});

export type RemoteConfig = typeof remoteConfigTable.$inferSelect;
