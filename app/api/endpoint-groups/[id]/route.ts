import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getDb } from "@/lib/db"
import { endpointGroups, endpointToGroup } from "@/lib/db/schema/endpoint-groups"
import { validateUserEndpointAccess } from "@/lib/services/endpoint-groups-validation"
import { and, eq } from "drizzle-orm"
import { z } from "zod"
import { InvalidJsonBodyError, readJsonBody } from "@/lib/security"

export const runtime = "edge"

const updateEndpointGroupSchema = z.object({
  name: z.string().trim().min(1, "名称不能为空").max(50),
  endpointIds: z.array(z.string().min(1)).min(1, "至少需要一个接口"),
}).strict()

type RouteContext = { params: Promise<{ id: string }> }

export async function PUT(request: Request, { params }: RouteContext) {
  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const { id } = await params
    const body = updateEndpointGroupSchema.parse(await readJsonBody(request))
    const db = await getDb()
    const group = await db.query.endpointGroups.findFirst({
      where: and(eq(endpointGroups.id, id), eq(endpointGroups.userId, userId)),
    })
    if (!group) return NextResponse.json({ error: "接口组不存在或无权访问" }, { status: 404 })

    const hasAccess = await validateUserEndpointAccess(db, userId, body.endpointIds)
    if (!hasAccess) return NextResponse.json({ error: "部分接口不存在或无权访问" }, { status: 400 })

    await db.update(endpointGroups).set({ name: body.name, updatedAt: new Date() })
      .where(and(eq(endpointGroups.id, id), eq(endpointGroups.userId, userId)))
    await db.delete(endpointToGroup).where(eq(endpointToGroup.groupId, id))
    await db.insert(endpointToGroup).values(body.endpointIds.map((endpointId) => ({ groupId: id, endpointId })))
    return NextResponse.json({ success: true, id })
  } catch (error) {
    if (error instanceof InvalidJsonBodyError || error instanceof z.ZodError) {
      return NextResponse.json({ error: error instanceof z.ZodError ? error.issues[0]?.message : "Invalid JSON body" }, { status: 400 })
    }
    console.error("更新接口组失败:", error)
    return NextResponse.json({ error: "更新接口组失败" }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const { id } = await params
    const db = await getDb()
    const group = await db.query.endpointGroups.findFirst({
      where: and(eq(endpointGroups.id, id), eq(endpointGroups.userId, userId)),
      columns: { id: true },
    })
    if (!group) return NextResponse.json({ error: "接口组不存在或无权访问" }, { status: 404 })
    await db.delete(endpointToGroup).where(eq(endpointToGroup.groupId, id))
    await db.delete(endpointGroups).where(and(eq(endpointGroups.id, id), eq(endpointGroups.userId, userId)))
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("删除接口组失败:", error)
    return NextResponse.json({ error: "删除接口组失败" }, { status: 500 })
  }
}
