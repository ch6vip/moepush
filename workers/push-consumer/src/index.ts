import { drizzle, type DrizzleD1Database } from "drizzle-orm/d1"

import * as schema from "../../../lib/db/schema"
import { safeInterpolate } from "../../../lib/template"
import { sendChannelMessage } from "../../../lib/channels"
import type { PushQueueMessage } from "../../../lib/queues/types"
import { getEndpointWithCache } from "../../../lib/cache/endpoint"
import { pushLogs } from "../../../lib/db/schema/push-logs"

type Db = DrizzleD1Database<typeof schema>

async function handlePushMessage(
  db: Db,
  cache: Cache,
  message: Message<PushQueueMessage>
) {
  const { requestId, endpointId, body } = message.body ?? ({} as any)

  if (!requestId || typeof requestId !== "string" || !endpointId || typeof endpointId !== "string") {
    console.warn("Invalid message payload:", message.body)
    message.ack()
    return
  }

  const endpoint = await getEndpointWithCache(db, cache, endpointId)

  if (!endpoint || !endpoint.channel) {
    console.warn("Endpoint not found for message:", endpointId)
    await db.insert(pushLogs).values({
      id: crypto.randomUUID(),
      requestId,
      endpointId,
      status: "failed",
      responseBody: "endpoint_not_found_or_channel_missing",
    })
    message.ack()
    return
  }

  if (endpoint.status !== "active") {
    console.warn("Endpoint disabled for message:", endpointId)
    await db.insert(pushLogs).values({
      id: crypto.randomUUID(),
      requestId,
      endpointId,
      status: "failed",
      responseBody: "endpoint_disabled",
    })
    message.ack()
    return
  }

  const timeoutMs = endpoint.timeoutMs ?? 8000
  const retryCount = endpoint.retryCount ?? 3
  const maxAttempts = retryCount + 1

  let processedTemplate: string
  try {
    processedTemplate = safeInterpolate(endpoint.rule, { body })
  } catch (err) {
    console.error("Template processing failed:", err)
    await db.insert(pushLogs).values({
      id: crypto.randomUUID(),
      requestId,
      endpointId,
      status: "failed",
      responseBody: err instanceof Error ? `template_error: ${err.message}` : "template_error",
    })
    message.ack()
    return
  }

  let messageObj: any
  try {
    messageObj = JSON.parse(processedTemplate)
  } catch (err) {
    console.error("Template is not valid JSON:", err)
    await db.insert(pushLogs).values({
      id: crypto.randomUUID(),
      requestId,
      endpointId,
      status: "failed",
      responseBody: err instanceof Error ? `template_json_error: ${err.message}` : "template_json_error",
    })
    message.ack()
    return
  }

  try {
    await sendChannelMessage(endpoint.channel.type as any, messageObj, {
      webhook: endpoint.channel.webhook,
      secret: endpoint.channel.secret,
      corpId: endpoint.channel.corpId,
      agentId: endpoint.channel.agentId,
      botToken: endpoint.channel.botToken,
      chatId: endpoint.channel.chatId,
      timeoutMs,
    })
    await db.insert(pushLogs).values({
      id: crypto.randomUUID(),
      requestId,
      endpointId,
      status: "success",
      responseBody: "",
    })

    message.ack()
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err)
    console.error("Channel send failed:", reason)

    await db.insert(pushLogs).values({
      id: crypto.randomUUID(),
      requestId,
      endpointId,
      status: "failed",
      responseBody: reason,
    })

    if (message.attempts < maxAttempts) {
      message.retry({ delaySeconds: 5 })
      return
    }

    message.ack()
  }
}

export default {
  async queue(batch: MessageBatch<PushQueueMessage>, env: { DB: D1Database }) {
    const db = drizzle(env.DB, { schema })
    const cache = await caches.open("default")

    for (const message of batch.messages) {
      await handlePushMessage(db, cache, message)
    }
  },
}
