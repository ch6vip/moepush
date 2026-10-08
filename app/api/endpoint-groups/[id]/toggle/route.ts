import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getDb } from "@/lib/db"
import { endpointGroups } from "@/lib/db/schema/endpoint-groups"
import { and, eq } from "drizzle-orm"

export const runtime = "edge"

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const { id } = await params
    const db = await getDb()
    const group = await db.query.endpointGroups.findFirst({
      where: and(eq(endpointGroups.id, id), eq(endpointGroups.userId, userId)),
    })
    if (!group) return NextResponse.json({ error: "接口组不存在或无权访问" }, { status: 404 })

    const status = group.status === "active" ? "inactive" : "active"
    await db.update(endpointGroups).set({ status, updatedAt: new Date() })
      .where(and(eq(endpointGroups.id, id), eq(endpointGroups.userId, userId)))
    const updated = await db.query.endpointGroups.findFirst({
      where: and(eq(endpointGroups.id, id), eq(endpointGroups.userId, userId)),
      with: { endpointToGroup: { with: { endpoint: true } } },
    })
    return NextResponse.json(updated)
  } catch (error) {
    console.error("切换接口组状态失败:", error)
    return NextResponse.json({ error: "切换状态失败" }, { status: 500 })
  }
}
