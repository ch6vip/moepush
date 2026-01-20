import { eq } from "drizzle-orm"
import type { DrizzleD1Database } from "drizzle-orm/d1"

import * as schema from "../db/schema"
import { endpoints } from "../db/schema/endpoints"
import type { Endpoint } from "../db/schema/endpoints"
import type { Channel } from "../db/schema/channels"

export const ENDPOINT_CACHE_TTL_SECONDS = 60

type Db = DrizzleD1Database<typeof schema>
export type EndpointWithChannel = Endpoint & { channel: Channel | null }

function endpointCacheUrl(endpointId: string) {
  return `https://cache.moepush.local/endpoints/${encodeURIComponent(endpointId)}`
}

export function endpointCacheRequest(endpointId: string) {
  return new Request(endpointCacheUrl(endpointId))
}

export async function invalidateEndpointCache(cache: Cache, endpointId: string) {
  await cache.delete(endpointCacheRequest(endpointId))
}

export async function invalidateEndpointsByChannelId(
  db: Db,
  cache: Cache,
  channelId: string
) {
  const rows = await db.query.endpoints.findMany({
    where: eq(endpoints.channelId, channelId),
    columns: { id: true },
  })

  await Promise.all(rows.map((r) => invalidateEndpointCache(cache, r.id)))
}

export async function getEndpointWithCache(
  db: Db,
  cache: Cache,
  endpointId: string
): Promise<EndpointWithChannel | null> {
  const req = endpointCacheRequest(endpointId)
  const cached = await cache.match(req)
  if (cached) {
    try {
      return (await cached.json()) as EndpointWithChannel
    } catch {
      await cache.delete(req)
    }
  }

  const endpoint = await db.query.endpoints.findFirst({
    where: eq(endpoints.id, endpointId),
    with: {
      channel: true,
    },
  })

  if (!endpoint) return null

  await cache.put(
    req,
    new Response(JSON.stringify(endpoint), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": `public, max-age=${ENDPOINT_CACHE_TTL_SECONDS}`,
      },
    })
  )

  return endpoint as EndpointWithChannel
}
