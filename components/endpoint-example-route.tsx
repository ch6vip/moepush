"use client"

import { useRouter } from "next/navigation"

import { EndpointExample } from "@/components/endpoint-example"
import type { Endpoint } from "@/lib/db/schema/endpoints"

export function EndpointExampleRoute({ endpoint }: { endpoint: Endpoint }) {
  const router = useRouter()

  return (
    <EndpointExample
      endpoint={endpoint}
      open
      onOpenChange={(open) => {
        if (!open) {
          if (window.history.length > 1) router.back()
          else router.push("/moe/endpoints")
        }
      }}
    />
  )
}
