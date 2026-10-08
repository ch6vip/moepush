"use client"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { Endpoint } from "@/lib/db/schema/endpoints"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { generateExampleBody } from "@/lib/generator"

interface EndpointExampleProps {
  endpoint: Endpoint | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EndpointExample({ endpoint, open, onOpenChange }: EndpointExampleProps) {
  const [origin, setOrigin] = useState("")

  useEffect(() => {
    setOrigin(window.location.origin)
  }, [])

  if (!endpoint) return null

  const baseUrl = origin || "https://your-domain.example"
  const exampleBody = generateExampleBody(endpoint.rule)
  const exampleJson = JSON.stringify(exampleBody, null, 6)
  const curlExample = `curl -X POST "${baseUrl}/api/push/${endpoint.id}" \\
  -H "Content-Type: application/json" \\
  -d '${exampleJson}'`
  const fetchExample = `await fetch("${baseUrl}/api/push/${endpoint.id}", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(${exampleJson})
})`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>接口示例</DialogTitle>
          <DialogDescription>查看接口调用示例和依赖的变量</DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="curl" className="mt-4">
          <TabsList>
            <TabsTrigger value="curl">cURL</TabsTrigger>
            <TabsTrigger value="fetch">Fetch</TabsTrigger>
          </TabsList>
          <TabsContent value="curl" className="mt-4">
            <div className="rounded-lg bg-muted p-4">
              <pre className="text-sm whitespace-pre-wrap break-all font-mono">{curlExample}</pre>
            </div>
          </TabsContent>
          <TabsContent value="fetch" className="mt-4">
            <div className="rounded-lg bg-muted p-4">
              <pre className="text-sm whitespace-pre-wrap break-all font-mono">{fetchExample}</pre>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
