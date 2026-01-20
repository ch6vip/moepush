import { sql } from "drizzle-orm"
import { index, sqliteTable, text } from "drizzle-orm/sqlite-core"
import { createSelectSchema } from "drizzle-zod"

export const pushLogs = sqliteTable(
  "push_logs",
  {
    id: text("id").primaryKey(),
    requestId: text("request_id").notNull(),
    userId: text("user_id"),
    endpointId: text("endpoint_id").notNull(),
    status: text("status", { enum: ["success", "failed"] }).notNull(),
    responseBody: text("response_body"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    userIdIdx: index("push_logs_user_id_idx").on(table.userId),
    endpointIdIdx: index("push_logs_endpoint_id_idx").on(table.endpointId),
    requestIdIdx: index("push_logs_request_id_idx").on(table.requestId),
    createdAtIdx: index("push_logs_created_at_idx").on(table.createdAt),
  })
)

export const selectPushLogSchema = createSelectSchema(pushLogs)

export type PushLog = typeof pushLogs.$inferSelect
