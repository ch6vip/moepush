import type { DrizzleD1Database } from "drizzle-orm/d1"

import * as schema from "../db/schema"
import { getEndpointWithCache } from "../cache/endpoint"
import { safeInterpolate } from "../template"
import { sendChannelMessage } from "../channels"
import { pushLogs } from "../db/schema/push-logs"

type Db = DrizzleD1Database<typeof schema>

export type PushResult = {
  requestId: string
  endpointId: string
  ok: boolean
  httpStatus: number
  responseBody: string | null
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function errToString(err: unknown) {
  if (err instanceof Error) return err.message
  return String(err)
}

async function persistPushLog(db: Db, values: typeof pushLogs.$inferInsert) {
  try {
    await db.insert(pushLogs).values(values)
  } catch (error) {
    // Delivery outcome must not be changed or retried because audit-log storage failed.
    console.error("[PUSH_LOG_WRITE_FAILED]", { requestId: values.requestId, endpointId: values.endpointId, status: values.status }, error)
  }
}

export async function executePush({
  db,
  cache,
  requestId,
  endpointId,
  body,
}: {
  db: Db
  cache: Cache
  requestId: string
  endpointId: string
  body: unknown
}): Promise<PushResult> {
  const endpoint = await getEndpointWithCache(db, cache, endpointId)

  if (!endpoint || !endpoint.channel) {
    const responseBody = "endpoint_not_found_or_channel_missing"
    await persistPushLog(db, { id: crypto.randomUUID(), requestId, endpointId, userId: null, status: "failed", responseBody })
    return { requestId, endpointId, ok: false, httpStatus: 404, responseBody }
  }

  if (endpoint.status !== "active") {
    const responseBody = "endpoint_disabled"
    await persistPushLog(db, { id: crypto.randomUUID(), requestId, endpointId, userId: endpoint.userId, status: "failed", responseBody })
    return { requestId, endpointId, ok: false, httpStatus: 403, responseBody }
  }

  let processedTemplate: string
  try {
    processedTemplate = safeInterpolate(endpoint.rule, { body })
  } catch (error) {
    const responseBody = `template_error: ${errToString(error)}`
    await persistPushLog(db, { id: crypto.randomUUID(), requestId, endpointId, userId: endpoint.userId, status: "failed", responseBody })
    return { requestId, endpointId, ok: false, httpStatus: 400, responseBody }
  }

  let messageObj: unknown
  try {
    messageObj = JSON.parse(processedTemplate)
  } catch (error) {
    const responseBody = `template_json_error: ${errToString(error)}`
    await persistPushLog(db, { id: crypto.randomUUID(), requestId, endpointId, userId: endpoint.userId, status: "failed", responseBody })
    return { requestId, endpointId, ok: false, httpStatus: 400, responseBody }
  }

  const timeoutMs = endpoint.timeoutMs ?? 8000
  const retryCount = endpoint.retryCount ?? 3
  const maxAttempts = retryCount + 1
  let lastError: string | null = null

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
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

      await persistPushLog(db, {
        id: crypto.randomUUID(), requestId, endpointId, userId: endpoint.userId,
        status: "success", responseBody: "",
      })
      return { requestId, endpointId, ok: true, httpStatus: 200, responseBody: "" }
    } catch (error) {
      lastError = errToString(error)
      if (attempt < maxAttempts) {
        const backoffMs = Math.min(2000, 300 * Math.pow(2, attempt - 1))
        await sleep(backoffMs)
      }
    }
  }

  const responseBody = lastError ?? "send_failed"
  await persistPushLog(db, {
    id: crypto.randomUUID(), requestId, endpointId, userId: endpoint.userId,
    status: "failed", responseBody,
  })
  return { requestId, endpointId, ok: false, httpStatus: 502, responseBody }
}
