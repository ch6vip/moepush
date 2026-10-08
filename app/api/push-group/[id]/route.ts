import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getDb } from "@/lib/db"
import { endpointGroups, endpointToGroup } from "@/lib/db/schema/endpoint-groups"
import { and, eq } from "drizzle-orm"
import { generateId } from "@/lib/utils"
import { executePush } from "@/lib/push/execute"
import { InvalidJsonBodyError, readJsonBody } from "@/lib/security"

export const runtime = "edge"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  let body: unknown
  try {
    body = await readJsonBody(request)
  } catch (error) {
    if (error instanceof InvalidJsonBodyError) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    throw error
  }

  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params
    const db = await getDb()
    const cache = await caches.open("default")
    const group = await db.query.endpointGroups.findFirst({
      where: and(eq(endpointGroups.id, id), eq(endpointGroups.userId, userId)),
    })
    if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 })
    if (group.status === "inactive") return NextResponse.json({ error: "Group is disabled" }, { status: 403 })

    const relations = await db.query.endpointToGroup.findMany({
      where: eq(endpointToGroup.groupId, id),
      with: { endpoint: true },
    })
    const groupEndpoints = relations
      .map((relation) => relation.endpoint)
      .filter((endpoint) => endpoint && endpoint.userId === userId)

    if (groupEndpoints.length === 0) return NextResponse.json({ error: "Group has no endpoints" }, { status: 400 })

    const results = await Promise.allSettled(groupEndpoints.map(async (endpoint) => {
      const requestId = generateId()
      const result = await executePush({ db, cache, requestId, endpointId: endpoint.id, body })
      return { endpointId: endpoint.id, name: endpoint.name, requestId, ok: result.ok, responseBody: result.responseBody }
    }))

    const fulfilled = results.filter((result) => result.status === "fulfilled") as Array<PromiseFulfilledResult<{
      endpointId: string; name: string; requestId: string; ok: boolean; responseBody: string | null
    }>>
    const successCount = fulfilled.filter((result) => result.value.ok).length
    const failedCount = groupEndpoints.length - successCount

    return NextResponse.json({
      status: "done",
      message: `Group ${group.name} processed`,
      groupId: group.id,
      groupName: group.name,
      total: groupEndpoints.length,
      successCount,
      failedCount,
      details: results.map((result, index) => {
        const endpoint = groupEndpoints[index]
        if (result.status === "fulfilled") {
          return {
            endpointId: result.value.endpointId,
            endpoint: endpoint.name,
            requestId: result.value.requestId,
            status: result.value.ok ? "success" : "failed",
            error: result.value.ok ? undefined : result.value.responseBody ?? "failed",
          }
        }
        return {
          endpointId: endpoint.id,
          endpoint: endpoint.name,
          requestId: null,
          status: "failed",
          error: result.reason instanceof Error ? result.reason.message : String(result.reason),
        }
      }),
    })
  } catch (error) {
    console.error("Push group error:", error)
    return NextResponse.json({ error: "Failed to process group push" }, { status: 500 })
  }
}
