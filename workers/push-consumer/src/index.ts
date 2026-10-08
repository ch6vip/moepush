import { and, eq } from "drizzle-orm"
import { drizzle, type DrizzleD1Database } from "drizzle-orm/d1"

import * as schema from "../../../lib/db/schema"
import { safeInterpolate } from "../../../lib/template"
import { sendChannelMessage } from "../../../lib/channels"
import type { PushQueueMessage } from "../../../lib/queues/types"
import { getEndpointWithCache } from "../../../lib/cache/endpoint"
import { pushLogs } from "../../../lib/db/schema/push-logs"

type Db = DrizzleD1Database<typeof schema>

async function persistPushLog(db: Db, values: typeof pushLogs.$inferInsert) {
  try {
    await db.insert(pushLogs).values(values)
  } catch (error) {
    console.error("[PUSH_LOG_WRITE_FAILED]", { requestId: values.requestId, endpointId: values.endpointId, status: values.status }, error)
  }
}

async function handlePushMessage(db: Db, cache: Cache, message: Message<PushQueueMessage>) {
  const { requestId, endpointId, body } = message.body ?? ({} as any)
  if (!requestId || typeof requestId !== "string" || !endpointId || typeof endpointId !== "string") {
    console.warn("Invalid push queue payload")
    message.ack()
    return
  }

  const priorSuccess = await db.query.pushLogs.findFirst({
    where: and(eq(pushLogs.requestId, requestId), eq(pushLogs.endpointId, endpointId), eq(pushLogs.status, "success")),
    columns: { id: true },
  })
  if (priorSuccess) {
    message.ack()
    return
  }

  const endpoint = await getEndpointWithCache(db, cache, endpointId)
  if (!endpoint || !endpoint.channel) {
    await persistPushLog(db, { id: crypto.randomUUID(), requestId, endpointId, userId: endpoint?.userId ?? null, status: "failed", responseBody: "endpoint_not_found_or_channel_missing" })
    message.ack()
    return
  }
  if (endpoint.status !== "active") {
    await persistPushLog(db, { id: crypto.randomUUID(), requestId, endpointId, userId: endpoint.userId, status: "failed", responseBody: "endpoint_disabled" })
    message.ack()
    return
  }

  let messageObj: unknown
  try {
    messageObj = JSON.parse(safeInterpolate(endpoint.rule, { body }))
  } catch (error) {
    const reason = error instanceof Error ? error.message : "template_error"
    await persistPushLog(db, { id: crypto.randomUUID(), requestId, endpointId, userId: endpoint.userId, status: "failed", responseBody: reason })
    message.ack()
    return
  }

  let sendError: unknown
  try {
    await sendChannelMessage(endpoint.channel.type as any, messageObj, {
      webhook: endpoint.channel.webhook,
      secret: endpoint.channel.secret,
      corpId: endpoint.channel.corpId,
      agentId: endpoint.channel.agentId,
      botToken: endpoint.channel.botToken,
      chatId: endpoint.channel.chatId,
      timeoutMs: endpoint.timeoutMs ?? 8000,
    })
  } catch (error) {
    sendError = error
  }

  if (!sendError) {
    await persistPushLog(db, { id: crypto.randomUUID(), requestId, endpointId, userId: endpoint.userId, status: "success", responseBody: "" })
    message.ack()
    return
  }

  const reason = sendError instanceof Error ? sendError.message : String(sendError)
  await persistPushLog(db, { id: crypto.randomUUID(), requestId, endpointId, userId: endpoint.userId, status: "failed", responseBody: reason })
  const maxAttempts = (endpoint.retryCount ?? 3) + 1
  if (message.attempts < maxAttempts) {
    message.retry({ delaySeconds: 5 })
    return
  }
  message.ack()
}

export default {
  async queue(batch: MessageBatch<PushQueueMessage>, env: { DB: D1Database }) {
    const db = drizzle(env.DB, { schema })
    const cache = await caches.open("default")
    for (const message of batch.messages) await handlePushMessage(db, cache, message)
  },
}
