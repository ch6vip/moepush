import { getDb } from "@/lib/db"
import { endpoints } from "@/lib/db/schema/endpoints"
import { and, eq, inArray } from "drizzle-orm"

type DbClient = Awaited<ReturnType<typeof getDb>>

export async function validateUserEndpointAccess(
  db: DbClient,
  userId: string,
  endpointIds: string[]
): Promise<boolean> {
  const validEndpoints = await db.query.endpoints.findMany({
    where: and(
      eq(endpoints.userId, userId),
      inArray(endpoints.id, endpointIds)
    )
  })

  return validEndpoints.length === endpointIds.length
}
