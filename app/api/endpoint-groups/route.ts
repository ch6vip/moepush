import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getDb } from "@/lib/db"
import { endpointGroups, endpointToGroup } from "@/lib/db/schema/endpoint-groups"
import { validateUserEndpointAccess } from "@/lib/services/endpoint-groups-validation"
import { eq } from "drizzle-orm"
import { generateId } from "@/lib/utils"
import { z } from "zod"
import { InvalidJsonBodyError, readJsonBody } from "@/lib/security"

export const runtime = "edge"

export async function GET() {
  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const db = await getDb()
    const groups = await db.query.endpointGroups.findMany({
      where: eq(endpointGroups.userId, userId),
      orderBy: (group, { desc }) => [desc(group.createdAt)],
    })

    const result = []
    for (const group of groups) {
      const relations = await db.query.endpointToGroup.findMany({
        where: eq(endpointToGroup.groupId, group.id),
        with: { endpoint: true },
      })
      const groupEndpoints = relations
        .map((relation) => relation.endpoint)
        .filter((endpoint) => endpoint && endpoint.userId === userId)
      result.push({
        id: group.id,
        name: group.name,
        userId: group.userId,
        status: group.status,
        createdAt: group.createdAt ?? new Date(),
        updatedAt: group.updatedAt ?? new Date(),
        endpointIds: groupEndpoints.map((endpoint) => endpoint.id),
        endpoints: groupEndpoints,
      })
    }
    return NextResponse.json(result)
  } catch (error) {
    console.error("获取接口组失败:", error)
    return NextResponse.json({ error: "获取接口组失败" }, { status: 500 })
  }
}

const createEndpointGroupSchema = z.object({
  name: z.string().trim().min(1, "名称不能为空").max(50),
  endpointIds: z.array(z.string().min(1)).min(1),
}).strict()

export async function POST(request: Request) {
  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const validatedData = createEndpointGroupSchema.parse(await readJsonBody(request))
    const db = await getDb()
    const groupId = generateId()
    const hasEndpointAccess = await validateUserEndpointAccess(db, userId, validatedData.endpointIds)
    if (!hasEndpointAccess) {
      return NextResponse.json({ error: "部分接口不存在或无权访问" }, { status: 400 })
    }

    await db.insert(endpointGroups).values({
      id: groupId,
      name: validatedData.name,
      userId,
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    await db.insert(endpointToGroup).values(validatedData.endpointIds.map((endpointId) => ({ endpointId, groupId })))
    return NextResponse.json({ id: groupId })
  } catch (error) {
    if (error instanceof InvalidJsonBodyError || error instanceof z.ZodError) {
      return NextResponse.json({ error: error instanceof z.ZodError ? error.issues[0]?.message : "Invalid JSON body" }, { status: 400 })
    }
    console.error("创建接口组失败:", error)
    return NextResponse.json({ error: "创建接口组失败" }, { status: 500 })
  }
}
