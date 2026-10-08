import { auth } from "@/lib/auth"
import { getDb } from "@/lib/db"
import { channels, endpoints, updateEndpointRequestSchema } from "@/lib/db/schema"
import { invalidateEndpointCache } from "@/lib/cache/endpoint"
import { and, eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { z } from "zod"
import { InvalidJsonBodyError, readJsonBody } from "@/lib/security"

export const runtime = "edge"

export async function PATCH(req: Request, { params }: { params: Promise<{ endpointId: string }> }) {
  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) return new NextResponse("Unauthorized", { status: 401 })

    const json = await readJsonBody(req)
    const patch = updateEndpointRequestSchema.parse(json)
    const { endpointId } = await params
    const db = await getDb()
    const endpoint = await db.query.endpoints.findFirst({
      where: and(eq(endpoints.id, endpointId), eq(endpoints.userId, userId)),
    })
    if (!endpoint) return new NextResponse("Not found", { status: 404 })

    if (patch.channelId) {
      const channel = await db.query.channels.findFirst({
        where: and(eq(channels.id, patch.channelId), eq(channels.userId, userId)),
        columns: { id: true },
      })
      if (!channel) return NextResponse.json({ error: "推送渠道不存在或无权访问" }, { status: 400 })
    }

    const updated = await db.update(endpoints)
      .set(patch)
      .where(and(eq(endpoints.id, endpointId), eq(endpoints.userId, userId)))
      .returning()

    const cache = await caches.open("default")
    await invalidateEndpointCache(cache, endpointId)
    return NextResponse.json(updated[0])
  } catch (error) {
    if (error instanceof InvalidJsonBodyError || error instanceof z.ZodError) {
      return new NextResponse(error instanceof z.ZodError ? error.message : "Invalid JSON body", { status: 400 })
    }
    console.error("[ENDPOINT_PATCH]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ endpointId: string }> }) {
  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) return new NextResponse("Unauthorized", { status: 401 })

    const { endpointId } = await params
    const db = await getDb()
    const endpoint = await db.query.endpoints.findFirst({
      where: and(eq(endpoints.id, endpointId), eq(endpoints.userId, userId)),
      columns: { id: true },
    })
    if (!endpoint) return new NextResponse("Not found", { status: 404 })

    await db.delete(endpoints).where(and(eq(endpoints.id, endpointId), eq(endpoints.userId, userId)))
    const cache = await caches.open("default")
    await invalidateEndpointCache(cache, endpointId)
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error("[ENDPOINT_DELETE]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
