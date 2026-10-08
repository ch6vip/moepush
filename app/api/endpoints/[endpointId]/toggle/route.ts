import { auth } from "@/lib/auth"
import { getDb } from "@/lib/db"
import { endpoints } from "@/lib/db/schema/endpoints"
import { invalidateEndpointCache } from "@/lib/cache/endpoint"
import { and, eq } from "drizzle-orm"
import { NextResponse } from "next/server"

export const runtime = "edge"

export async function POST(_request: Request, { params }: { params: Promise<{ endpointId: string }> }) {
  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) return new NextResponse("Unauthorized", { status: 401 })
    const { endpointId } = await params
    const db = await getDb()
    const endpoint = await db.query.endpoints.findFirst({
      where: and(eq(endpoints.id, endpointId), eq(endpoints.userId, userId)),
    })
    if (!endpoint) return new NextResponse("Not found", { status: 404 })

    const [updated] = await db.update(endpoints)
      .set({ status: endpoint.status === "active" ? "inactive" : "active" })
      .where(and(eq(endpoints.id, endpointId), eq(endpoints.userId, userId)))
      .returning()
    const cache = await caches.open("default")
    await invalidateEndpointCache(cache, endpointId)
    return NextResponse.json(updated)
  } catch (error) {
    console.error("[ENDPOINT_TOGGLE]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
