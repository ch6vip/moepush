import { auth } from "@/lib/auth"
import { getDb } from "@/lib/db"
import { endpoints } from "@/lib/db/schema/endpoints"
import { channels } from "@/lib/db/schema/channels"
import { pushLogs } from "@/lib/db/schema/push-logs"
import { desc, eq } from "drizzle-orm"
import { Channel } from "@/lib/channels"
import { EndpointsTabs } from "@/components/endpoints-tabs"
import { PushLogsCard } from "@/components/push-logs-card"

export const runtime = "edge"

async function getEndpoints(userId: string) {
  const db = await getDb()
  return db.query.endpoints.findMany({
    where: eq(endpoints.userId, userId),
    orderBy: (endpoints, { desc }) => [desc(endpoints.createdAt)],
  })
}

async function getChannels(userId: string) {
  const db = await getDb()
  return db.query.channels.findMany({
    where: eq(channels.userId, userId),
    orderBy: (channels, { desc }) => [desc(channels.createdAt)],
  })
}

async function getRecentPushLogs(userId: string) {
  const db = await getDb()
  return db
    .select({
      id: pushLogs.id,
      requestId: pushLogs.requestId,
      endpointId: pushLogs.endpointId,
      status: pushLogs.status,
      responseBody: pushLogs.responseBody,
      createdAt: pushLogs.createdAt,
      endpointName: endpoints.name,
    })
    .from(pushLogs)
    .leftJoin(endpoints, eq(pushLogs.endpointId, endpoints.id))
    .where(eq(endpoints.userId, userId))
    .orderBy(desc(pushLogs.createdAt))
    .limit(20)
}

export default async function EndpointsPage() {
  const session = await auth()

  const [endpointList, channelList, recentLogs] = await Promise.all([
    getEndpoints(session!.user!.id!),
    getChannels(session!.user!.id!),
    getRecentPushLogs(session!.user!.id!),
  ])

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-500 to-indigo-500 text-transparent bg-clip-text">
          接口管理
        </h1>
        <p className="text-muted-foreground mt-2">
          管理您的推送接口
        </p>
      </div>

      <EndpointsTabs 
        initialEndpoints={endpointList}
        channels={channelList as Channel[]} 
      />

      <PushLogsCard logs={recentLogs as any} />
    </div>
  )
} 
