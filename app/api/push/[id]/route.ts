import { NextRequest } from "next/server"
import { getDb } from "@/lib/db"
import { generateId } from "@/lib/utils"
import { executePush } from "@/lib/push/execute"

export const runtime = "edge"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const db = await getDb()
    const cache = await caches.open("default")

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return new Response("Invalid JSON body", { status: 400 })
    }

    const requestId = generateId()

    const result = await executePush({
      db,
      cache,
      requestId,
      endpointId: id,
      body,
    })

    return new Response(
      JSON.stringify({
        requestId: result.requestId,
        status: result.ok ? "success" : "failed",
        responseBody: result.responseBody,
      }),
      { status: result.httpStatus }
    )

  } catch (error) {
    console.error("Push error:", error)
    return new Response(
      JSON.stringify({ message: error instanceof Error ? error.message : "Push failed" }),
      { status: 500 }
    )
  }
} 
