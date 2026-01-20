import { notFound } from "next/navigation"
import { and, eq } from "drizzle-orm"

import { auth } from "@/lib/auth"
import { getDb } from "@/lib/db"
import { endpoints } from "@/lib/db/schema/endpoints"
import { channels } from "@/lib/db/schema/channels"
import { EndpointDetailPage } from "@/components/endpoint-detail-page"
import type { Channel } from "@/lib/channels"

export const runtime = "edge"

async function getEndpoint(userId: string, endpointId: string) {
  const db = await getDb()
  return db.query.endpoints.findFirst({
    where: and(eq(endpoints.id, endpointId), eq(endpoints.userId, userId)),
  })
}

async function getChannel(userId: string, channelId: string) {
  const db = await getDb()
  return db.query.channels.findFirst({
    where: and(eq(channels.id, channelId), eq(channels.userId, userId)),
  })
}

async function getChannels(userId: string) {
  const db = await getDb()
  return db.query.channels.findMany({
    where: eq(channels.userId, userId),
    orderBy: (channels, { desc }) => [desc(channels.createdAt)],
  })
}

export default async function EndpointDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  const { id } = await params

  const endpoint = await getEndpoint(session!.user!.id!, id)
  if (!endpoint) notFound()

  const [channel, channelList] = await Promise.all([
    getChannel(session!.user!.id!, endpoint.channelId),
    getChannels(session!.user!.id!),
  ])

  return (
    <EndpointDetailPage
      endpoint={endpoint}
      channel={(channel as Channel) ?? null}
      channels={channelList as Channel[]}
    />
  )
}
