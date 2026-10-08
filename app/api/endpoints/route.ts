import { auth } from "@/lib/auth"
import { getDb } from "@/lib/db"
import { channels, endpoints, createEndpointRequestSchema } from "@/lib/db/schema"
import { generateId } from "@/lib/utils"
import { readJsonBody, InvalidJsonBodyError } from "@/lib/security"
import { eq, and } from "drizzle-orm"
import { NextResponse } from "next/server"
import { z } from "zod"

export const runtime = "edge"

export async function GET() {
  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) return new NextResponse("Unauthorized", { status: 401 })

    const db = await getDb()
    const endpointList = await db.query.endpoints.findMany({
      where: eq(endpoints.userId, userId),
      orderBy: (endpoint, { desc }) => [desc(endpoint.createdAt)],
    })
    return NextResponse.json(endpointList)
  } catch (error) {
    console.error("[ENDPOINTS_GET]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) return new NextResponse("Unauthorized", { status: 401 })

    const json = await readJsonBody(req)
    const body = createEndpointRequestSchema.parse(json)
    const db = await getDb()
    const channel = await db.query.channels.findFirst({
      where: and(eq(channels.id, body.channelId), eq(channels.userId, userId)),
      columns: { id: true },
    })
    if (!channel) return NextResponse.json({ error: "推送渠道不存在或无权访问" }, { status: 400 })

    const inserted = await db.insert(endpoints).values({
      ...body,
      id: generateId(),
      userId,
    }).returning()
    return NextResponse.json(inserted[0])
  } catch (error) {
    if (error instanceof InvalidJsonBodyError || error instanceof z.ZodError) {
      return new NextResponse(error instanceof z.ZodError ? error.message : "Invalid JSON body", { status: 400 })
    }
    console.error("[ENDPOINTS_POST]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
