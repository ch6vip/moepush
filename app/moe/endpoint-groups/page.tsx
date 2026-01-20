import { auth } from "@/lib/auth"
import { getDb } from "@/lib/db"
import { endpoints } from "@/lib/db/schema/endpoints"
import { endpointGroups } from "@/lib/db/schema/endpoint-groups"
import { eq } from "drizzle-orm"
import { EndpointGroupsPageClient } from "@/components/endpoint-groups-page"
import type { EndpointGroupWithEndpoints } from "@/types/endpoint-group"

export const runtime = "edge"

async function getEndpoints(userId: string) {
  const db = await getDb()
  return db.query.endpoints.findMany({
    where: eq(endpoints.userId, userId),
    orderBy: (endpoints, { desc }) => [desc(endpoints.createdAt)],
  })
}

async function getEndpointGroups(userId: string): Promise<EndpointGroupWithEndpoints[]> {
  const db = await getDb()
  const groups = await db.query.endpointGroups.findMany({
    where: eq(endpointGroups.userId, userId),
    orderBy: (endpointGroups, { desc }) => [desc(endpointGroups.createdAt)],
    with: {
      endpointToGroup: {
        with: {
          endpoint: true,
        },
      },
    },
  })

  return groups.map((group) => {
    const groupEndpoints = group.endpointToGroup
      .map((r) => r.endpoint)
      .filter((endpoint): endpoint is NonNullable<typeof endpoint> => endpoint != null)

    return {
      id: group.id,
      name: group.name,
      userId: group.userId,
      status: group.status,
      createdAt: group.createdAt ?? new Date(),
      updatedAt: group.updatedAt ?? new Date(),
      endpointIds: groupEndpoints.map((e) => e.id),
      endpoints: groupEndpoints,
    }
  })
}

export default async function EndpointGroupsPage() {
  const session = await auth()
  const [endpointList, groups] = await Promise.all([
    getEndpoints(session!.user!.id!),
    getEndpointGroups(session!.user!.id!),
  ])

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-500 to-indigo-500 text-transparent bg-clip-text">
          接口组管理
        </h1>
        <p className="text-muted-foreground mt-2">管理多个接口的聚合组</p>
      </div>

      <EndpointGroupsPageClient availableEndpoints={endpointList} initialGroups={groups} />
    </div>
  )
}
