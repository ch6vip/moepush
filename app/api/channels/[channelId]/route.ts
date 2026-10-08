import { auth } from "@/lib/auth"
import { getDb } from "@/lib/db"
import { channels, endpoints, insertChannelSchema, updateChannelRequestSchema } from "@/lib/db/schema"
import { invalidateEndpointsByChannelId } from "@/lib/cache/endpoint"
import { and, eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { z } from "zod"
import { InvalidJsonBodyError, readJsonBody } from "@/lib/security"

export const runtime = "edge"

type RouteContext = { params: Promise<{ channelId: string }> }

export async function PATCH(req: Request, { params }: RouteContext) {
  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) return new NextResponse("Unauthorized", { status: 401 })
    const patch = updateChannelRequestSchema.parse(await readJsonBody(req))
    const { channelId } = await params
    const db = await getDb()
    const channel = await db.query.channels.findFirst({
      where: and(eq(channels.id, channelId), eq(channels.userId, userId)),
    })
    if (!channel) return new NextResponse("Not found", { status: 404 })

    const merged = insertChannelSchema.parse({
      ...channel,
      ...patch,
      webhook: (patch.webhook === undefined ? channel.webhook : patch.webhook) ?? undefined,
      secret: (patch.secret === undefined ? channel.secret : patch.secret) ?? undefined,
      corpId: (patch.corpId === undefined ? channel.corpId : patch.corpId) ?? undefined,
      agentId: (patch.agentId === undefined ? channel.agentId : patch.agentId) ?? undefined,
      botToken: (patch.botToken === undefined ? channel.botToken : patch.botToken) ?? undefined,
      chatId: (patch.chatId === undefined ? channel.chatId : patch.chatId) ?? undefined,
    })

    const allowedPatch = {
      ...(patch.name !== undefined ? { name: merged.name } : {}),
      ...(patch.webhook !== undefined ? { webhook: patch.webhook } : {}),
      ...(patch.secret !== undefined ? { secret: patch.secret } : {}),
      ...(patch.corpId !== undefined ? { corpId: patch.corpId } : {}),
      ...(patch.agentId !== undefined ? { agentId: patch.agentId } : {}),
      ...(patch.botToken !== undefined ? { botToken: patch.botToken } : {}),
      ...(patch.chatId !== undefined ? { chatId: patch.chatId } : {}),
      ...(patch.status !== undefined ? { status: patch.status } : {}),
    }

    const [updated] = await db.update(channels).set(allowedPatch)
      .where(and(eq(channels.id, channelId), eq(channels.userId, userId)))
      .returning()
    const cache = await caches.open("default")
    await invalidateEndpointsByChannelId(db, cache, channelId)
    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof InvalidJsonBodyError || error instanceof z.ZodError) {
      return new NextResponse(error instanceof z.ZodError ? error.message : "Invalid JSON body", { status: 400 })
    }
    console.error("[CHANNEL_PATCH]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: RouteContext) {
  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) return new NextResponse("Unauthorized", { status: 401 })
    const { channelId } = await params
    const db = await getDb()
    const channel = await db.query.channels.findFirst({
      where: and(eq(channels.id, channelId), eq(channels.userId, userId)),
      columns: { id: true },
    })
    if (!channel) return new NextResponse("Not found", { status: 404 })

    const linkedEndpoint = await db.query.endpoints.findFirst({
      where: and(eq(endpoints.channelId, channelId), eq(endpoints.userId, userId)),
      columns: { id: true },
    })
    if (linkedEndpoint) {
      return NextResponse.json({ error: "该渠道仍被接口引用，请先删除或改绑相关接口" }, { status: 409 })
    }

    await db.delete(channels).where(and(eq(channels.id, channelId), eq(channels.userId, userId)))
    const cache = await caches.open("default")
    await invalidateEndpointsByChannelId(db, cache, channelId)
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error("[CHANNEL_DELETE]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
