import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { endpointGroups, endpointToGroup } from '@/lib/db/schema/endpoint-groups'
import { eq } from 'drizzle-orm'
import { generateId } from '@/lib/utils'
import { executePush } from '@/lib/push/execute'

export const runtime = 'edge'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  try {
    const db = await getDb()
    const cache = await caches.open("default")

    const group = await db.query.endpointGroups.findFirst({
      where: eq(endpointGroups.id, id),
    })

    if (!group) {
      return NextResponse.json(
        { error: 'Group not found' },
        { status: 404 }
      )
    }

    if (group.status === "inactive") {
      return NextResponse.json(
        { error: 'Group is disabled' },
        { status: 403 }
      )
    }

    const relations = await db.query.endpointToGroup.findMany({
      where: eq(endpointToGroup.groupId, id),
      with: {
        endpoint: true
      }
    })

    const groupEndpoints = relations.map((r: any) => r.endpoint)

    if (groupEndpoints.length === 0) {
      return NextResponse.json(
        { error: 'Group has no endpoints' },
        { status: 400 }
      )
    }

    const results = await Promise.allSettled(
      groupEndpoints.map(async (endpoint: any) => {
        const requestId = generateId()
        const r = await executePush({
          db,
          cache,
          requestId,
          endpointId: endpoint.id,
          body,
        })

        return {
          endpointId: endpoint.id,
          name: endpoint.name,
          requestId,
          ok: r.ok,
          responseBody: r.responseBody,
        }
      })
    )

    const fulfilled = results.filter((r) => r.status === "fulfilled") as Array<
      PromiseFulfilledResult<{
        endpointId: string
        name: string
        requestId: string
        ok: boolean
        responseBody: string | null
      }>
    >

    const successCount = fulfilled.filter((r) => r.value.ok).length
    const failedCount = groupEndpoints.length - successCount

    return NextResponse.json({
      status: "done",
      message: `Group ${group.name} processed`,
      groupId: group.id,
      groupName: group.name,
      total: groupEndpoints.length,
      successCount,
      failedCount,
      details: results.map((r, i) => {
        const endpoint = groupEndpoints[i]
        if (r.status === "fulfilled") {
          return {
            endpointId: r.value.endpointId,
            endpoint: endpoint.name,
            requestId: r.value.requestId,
            status: r.value.ok ? "success" : "failed",
            error: r.value.ok ? undefined : r.value.responseBody ?? "failed",
          }
        }
        return {
          endpointId: endpoint.id,
          endpoint: endpoint.name,
          requestId: null,
          status: "failed",
          error: r.reason instanceof Error ? r.reason.message : String(r.reason),
        }
      }),
    })

  } catch (error) {
    console.error('Push group error:', error)
    return NextResponse.json(
      { error: 'Failed to process group push' },
      { status: 500 }
    )
  }
} 
