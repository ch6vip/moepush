import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getDb } from "@/lib/db"
import { endpointGroups, endpointToGroup } from "@/lib/db/schema/endpoint-groups"
import { eq } from "drizzle-orm"
import { z } from "zod"

export const runtime = 'edge'

const updateEndpointGroupSchema = z.object({
  name: z.string().min(1, "名称不能为空"),
  endpointIds: z.array(z.string()).min(1, "至少需要一个接口"),
})

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    const db = await getDb()
    const { id } = await params
    
    const group = await db.query.endpointGroups.findFirst({
      where: (groups, { and, eq }) => and(
        eq(groups.id, id),
        eq(groups.userId, session!.user!.id!)
      )
    })

    if (!group) {
      return NextResponse.json(
        { error: "接口组不存在或无权访问" },
        { status: 404 }
      )
    }

    const body = await request.json()
    const validatedData = updateEndpointGroupSchema.parse(body)

    // 更新接口组名称
    await db.update(endpointGroups)
      .set({
        name: validatedData.name,
        updatedAt: new Date(),
      })
      .where(eq(endpointGroups.id, id))

    // 删除旧的关联关系
    await db.delete(endpointToGroup).where(eq(endpointToGroup.groupId, id))

    // 添加新的关联关系
    await db.insert(endpointToGroup).values(
      validatedData.endpointIds.map(endpointId => ({
        groupId: id,
        endpointId,
      }))
    )

    return NextResponse.json({ success: true, id })
  } catch (error) {
    console.error('更新接口组失败:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: '更新接口组失败' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    const db = await getDb()

    const { id } = await params
    
    const group = await db.query.endpointGroups.findFirst({
      where: (groups, { and, eq }) => and(
        eq(groups.id, id),
        eq(groups.userId, session!.user!.id!)
      )
    })

    if (!group) {
      return NextResponse.json(
        { error: "接口组不存在或无权访问" },
        { status: 404 }
      )
    }

    await db.delete(endpointToGroup).where(eq(endpointToGroup.groupId, id))
    
    await db.delete(endpointGroups).where(eq(endpointGroups.id, id))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('删除接口组失败:', error)
    return NextResponse.json(
      { error: '删除接口组失败' },
      { status: 500 }
    )
  }
} 