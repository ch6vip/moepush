"use client"

import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Endpoint } from "@/lib/db/schema/endpoints"
import { EndpointGroupWithEndpoints } from "@/types/endpoint-group"
import { EndpointGroupTable } from "@/components/endpoint-group-table"

export function EndpointGroupsPageClient({
  availableEndpoints,
  initialGroups,
}: {
  availableEndpoints: Endpoint[]
  initialGroups: EndpointGroupWithEndpoints[]
}) {
  const router = useRouter()

  return (
    <Card className="bg-white/50 border-blue-100">
      <CardHeader>
        <CardTitle>接口组</CardTitle>
        <CardDescription>管理多个接口的聚合组</CardDescription>
      </CardHeader>
      <CardContent>
        <EndpointGroupTable
          groups={initialGroups}
          availableEndpoints={availableEndpoints}
          onGroupsUpdate={() => router.refresh()}
        />
      </CardContent>
    </Card>
  )
}
