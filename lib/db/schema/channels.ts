import { sql } from "drizzle-orm"
import { text, sqliteTable, index } from "drizzle-orm/sqlite-core"
import { createInsertSchema, createSelectSchema } from "drizzle-zod"
import { z } from "zod"
import { CHANNEL_TYPES } from "../../channels/constants"
import { isSafeHttpUrl } from "../../security"

export const channels = sqliteTable("channels", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type", { enum: Object.values(CHANNEL_TYPES) as [string, ...string[]] }).notNull(),
  webhook: text("webhook"),
  secret: text("secret"),
  corpId: text("corp_id"),
  agentId: text("agent_id"),
  botToken: text("bot_token"),
  chatId: text("chat_id"),
  status: text("status", { enum: ["active", "inactive"] }).notNull().default("active"),
  userId: text("user_id").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  userIdIdx: index("channels_user_id_idx").on(table.userId),
}))

const publicHttpUrl = (value: string) => isSafeHttpUrl(value)
const channelConfigSchema = createInsertSchema(channels).extend({
  name: z.string().trim().min(1, "名称不能为空").max(50, "名称不能超过50个字符"),
  type: z.nativeEnum(CHANNEL_TYPES),
  webhook: z.string().optional(),
  secret: z.string().optional(),
  corpId: z.string().optional(),
  agentId: z.string().optional(),
  userId: z.string().optional(),
  id: z.string().optional(),
  botToken: z.string().optional(),
  chatId: z.string().optional(),
})

export const insertChannelSchema = channelConfigSchema
  .refine((data) => data.type !== CHANNEL_TYPES.WECOM_APP || !!data.corpId, {
    message: "企业微信应用必须提供企业ID", path: ["corpId"],
  })
  .refine((data) => data.type !== CHANNEL_TYPES.WECOM_APP || !!data.agentId, {
    message: "企业微信应用必须提供应用ID", path: ["agentId"],
  })
  .refine((data) => data.type !== CHANNEL_TYPES.WECOM_APP || !!data.secret, {
    message: "企业微信应用必须提供应用Secret", path: ["secret"],
  })
  .refine((data) => {
    const webhookRequired = ![
      CHANNEL_TYPES.WECOM_APP, CHANNEL_TYPES.TELEGRAM, CHANNEL_TYPES.FEISHU,
      CHANNEL_TYPES.BARK, CHANNEL_TYPES.WEBHOOK,
    ].includes(data.type as any)
    return !webhookRequired || (!!data.webhook && publicHttpUrl(data.webhook))
  }, { message: "请输入有效的公网 Webhook 地址", path: ["webhook"] })
  .refine((data) => {
    if (![CHANNEL_TYPES.WEBHOOK, CHANNEL_TYPES.FEISHU, CHANNEL_TYPES.BARK].includes(data.type as any)) return true
    return !!data.webhook && publicHttpUrl(data.webhook)
  }, { message: "请输入有效的公网 HTTP(S) 地址", path: ["webhook"] })
  .refine((data) => data.type !== CHANNEL_TYPES.TELEGRAM || !!data.botToken, {
    message: "Telegram 机器人必须提供 Bot Token", path: ["botToken"],
  })
  .refine((data) => data.type !== CHANNEL_TYPES.TELEGRAM || !!data.chatId, {
    message: "Telegram 机器人必须提供 Chat ID", path: ["chatId"],
  })

export const createChannelRequestSchema = z.object({
  name: z.string().trim().min(1, "名称不能为空").max(50, "名称不能超过50个字符"),
  type: z.nativeEnum(CHANNEL_TYPES),
  webhook: z.string().optional(),
  secret: z.string().optional(),
  corpId: z.string().optional(),
  agentId: z.string().optional(),
  botToken: z.string().optional(),
  chatId: z.string().optional(),
}).strict()

export const updateChannelRequestSchema = z.object({
  name: z.string().trim().min(1, "名称不能为空").max(50, "名称不能超过50个字符").optional(),
  webhook: z.string().nullable().optional(),
  secret: z.string().nullable().optional(),
  corpId: z.string().nullable().optional(),
  agentId: z.string().nullable().optional(),
  botToken: z.string().nullable().optional(),
  chatId: z.string().nullable().optional(),
  status: z.enum(["active", "inactive"]).optional(),
}).strict().superRefine((data, context) => {
  if (data.webhook != null && !publicHttpUrl(data.webhook)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["webhook"], message: "请输入有效的公网 HTTP(S) 地址" })
  }
})

export const selectChannelSchema = createSelectSchema(channels)

export type Channel = typeof channels.$inferSelect
export type ChannelFormData = z.infer<typeof insertChannelSchema>
