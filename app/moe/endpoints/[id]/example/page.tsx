import { notFound } from "next/navigation"
import { and, eq } from "drizzle-orm"

import { auth } from "@/lib/auth"
import { getDb } from "@/lib/db"
import { endpoints } from "@/lib/db/schema/endpoints"
import { EndpointExampleRoute } from "@/components/endpoint-example-route"

export const runtime = "edge"

async function getEndpoint(userId: string, endpointId: string) {
  const db = await getDb()
  return db.query.endpoints.findFirst({
    where: and(eq(endpoints.id, endpointId), eq(endpoints.userId, userId)),
  })
}

export default async function EndpointExamplePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  const { id } = await params

  const endpoint = await getEndpoint(session!.user!.id!, id)
  if (!endpoint) notFound()

  return <EndpointExampleRoute endpoint={endpoint} />
}

