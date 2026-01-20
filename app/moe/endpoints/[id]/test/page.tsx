import { notFound } from "next/navigation"
import { and, eq } from "drizzle-orm"

import { auth } from "@/lib/auth"
import { getDb } from "@/lib/db"
import { endpoints } from "@/lib/db/schema/endpoints"
import { EndpointTestRoute } from "@/components/endpoint-test-route"

export const runtime = "edge"

async function getEndpoint(userId: string, endpointId: string) {
  const db = await getDb()
  return db.query.endpoints.findFirst({
    where: and(eq(endpoints.id, endpointId), eq(endpoints.userId, userId)),
  })
}

export default async function EndpointTestPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  const { id } = await params

  const endpoint = await getEndpoint(session!.user!.id!, id)
  if (!endpoint) notFound()

  return <EndpointTestRoute endpoint={endpoint} />
}

