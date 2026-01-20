import { NextRequest } from "next/server"
import { getDb } from "@/lib/db"
import { getRequestContext } from "@cloudflare/next-on-pages"
import { getEndpointWithCache } from "@/lib/cache/endpoint"
import { generateId } from "@/lib/utils"

export const runtime = "edge"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const db = await getDb()
    const cache = await caches.open("default")
    const endpoint = await getEndpointWithCache(db, cache, id)

    if (!endpoint || !endpoint.channel) {
      return new Response("Endpoint not found", { status: 404 })
    }

    if (endpoint.status !== "active") {
      return new Response("Endpoint is disabled", { status: 403 })
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return new Response("Invalid JSON body", { status: 400 })
    }

    await getRequestContext().env.PUSH_QUEUE.send({
      requestId: generateId(),
      endpointId: id,
      body,
    })

    return new Response(JSON.stringify({ message: "Accepted" }), { status: 202 })

  } catch (error) {
    console.error("Push error:", error)
    return new Response(
      JSON.stringify({ message: error instanceof Error ? error.message : "Push failed" }),
      { status: 500 }
    )
  }
} 
