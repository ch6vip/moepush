import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core"

export const registrationRateLimits = sqliteTable("registration_rate_limits", {
  addressHash: text("address_hash").primaryKey(),
  windowStartedAt: integer("window_started_at").notNull(),
  requestCount: integer("request_count").notNull(),
})
