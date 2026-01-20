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
    await db.insert(pushLogs).values({
      id: crypto.randomUUID(),
      requestId,
      endpointId,
      userId: null,
      status: "failed",
      responseBody,
    })
    return { requestId, endpointId, ok: false, httpStatus: 404, responseBody }
  }

  if (endpoint.status !== "active") {
    const responseBody = "endpoint_disabled"
    await db.insert(pushLogs).values({
      id: crypto.randomUUID(),
      requestId,
      endpointId,
      userId: endpoint.userId,
      status: "failed",
      responseBody,
    })
    return { requestId, endpointId, ok: false, httpStatus: 403, responseBody }
  }

  let processedTemplate: string
  try {
    processedTemplate = safeInterpolate(endpoint.rule, { body })
  } catch (err) {
    const responseBody = `template_error: ${errToString(err)}`
    await db.insert(pushLogs).values({
      id: crypto.randomUUID(),
      requestId,
      endpointId,
      userId: endpoint.userId,
      status: "failed",
      responseBody,
    })
    return { requestId, endpointId, ok: false, httpStatus: 400, responseBody }
  }

  let messageObj: any
  try {
    messageObj = JSON.parse(processedTemplate)
  } catch (err) {
    const responseBody = `template_json_error: ${errToString(err)}`
    await db.insert(pushLogs).values({
      id: crypto.randomUUID(),
      requestId,
      endpointId,
      userId: endpoint.userId,
      status: "failed",
      responseBody,
    })
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

      await db.insert(pushLogs).values({
        id: crypto.randomUUID(),
        requestId,
        endpointId,
        userId: endpoint.userId,
        status: "success",
        responseBody: "",
      })

      return { requestId, endpointId, ok: true, httpStatus: 200, responseBody: "" }
    } catch (err) {
      lastError = errToString(err)
      if (attempt < maxAttempts) {
        const backoffMs = Math.min(2000, 300 * Math.pow(2, attempt - 1))
        await sleep(backoffMs)
        continue
      }
    }
  }

  const responseBody = lastError ?? "send_failed"
  await db.insert(pushLogs).values({
    id: crypto.randomUUID(),
    requestId,
    endpointId,
    userId: endpoint.userId,
    status: "failed",
    responseBody,
  })
  return { requestId, endpointId, ok: false, httpStatus: 502, responseBody }
}
