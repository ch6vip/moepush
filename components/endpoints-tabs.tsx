"use client"

import { useRouter } from "next/navigation"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { Channel } from "@/lib/channels"
import type { Endpoint } from "@/lib/db/schema/endpoints"
import { EndpointTable } from "@/components/endpoint-table"

export function EndpointsTabs({
  initialEndpoints,
  channels,
}: {
  initialEndpoints: Endpoint[]
  channels: Channel[]
}) {
  const router = useRouter()

  return (
    <Card className="bg-white/50 border-blue-100">
      <CardHeader>
        <CardTitle>推送接口</CardTitle>
        <CardDescription>管理所有的推送接口</CardDescription>
      </CardHeader>
      <CardContent>
        <EndpointTable endpoints={initialEndpoints} channels={channels} onEndpointsUpdate={() => router.refresh()} />
      </CardContent>
    </Card>
  )
}

