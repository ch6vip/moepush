import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { endpointGroups, endpointToGroup } from '@/lib/db/schema/endpoint-groups'
import { eq } from 'drizzle-orm'
import { getRequestContext } from '@cloudflare/next-on-pages'
import { generateId } from '@/lib/utils'

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

    await getRequestContext().env.PUSH_QUEUE.sendBatch(
      groupEndpoints.map((endpoint: any) => ({
        body: {
          requestId: generateId(),
          endpointId: endpoint.id,
          body,
        },
        contentType: "json",
      }))
    )

    return NextResponse.json(
      {
        status: 'accepted',
        message: 'Accepted',
        groupId: group.id,
        groupName: group.name,
        total: groupEndpoints.length,
      },
      { status: 202 }
    )

  } catch (error) {
    console.error('Push group error:', error)
    return NextResponse.json(
      { error: 'Failed to enqueue group push' },
      { status: 500 }
    )
  }
} 
