import { auth } from "@/lib/auth"
import { getDb } from "@/lib/db"
import { channels, createChannelRequestSchema, insertChannelSchema } from "@/lib/db/schema"
import { generateId } from "@/lib/utils"
import { readJsonBody, InvalidJsonBodyError } from "@/lib/security"
import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { z } from "zod"

export const runtime = "edge"

export async function GET() {
  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) return new NextResponse("Unauthorized", { status: 401 })
    const db = await getDb()
    const channelList = await db.query.channels.findMany({
      where: eq(channels.userId, userId),
      orderBy: (channel, { desc }) => [desc(channel.createdAt)],
    })
    return NextResponse.json(channelList)
  } catch (error) {
    console.error("[CHANNELS_GET]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) return new NextResponse("Unauthorized", { status: 401 })
    const input = createChannelRequestSchema.parse(await readJsonBody(req))
    const body = insertChannelSchema.parse(input)
    const db = await getDb()
    const [channel] = await db.insert(channels).values({ ...body, id: generateId(), userId, status: "active" }).returning()
    return NextResponse.json(channel)
  } catch (error) {
    if (error instanceof InvalidJsonBodyError || error instanceof z.ZodError) {
      return new NextResponse(error instanceof z.ZodError ? error.message : "Invalid JSON body", { status: 400 })
    }
    console.error("[CHANNELS_POST]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
