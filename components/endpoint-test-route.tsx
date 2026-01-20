"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2, Send } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import type { Endpoint } from "@/lib/db/schema/endpoints"
import { testEndpoint } from "@/lib/services/endpoints"

export function EndpointTestRoute({ endpoint }: { endpoint: Endpoint }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  const [isPending, setIsPending] = useState(false)

  const canTest = endpoint.status === "active"

  const shouldAutorun = useMemo(() => {
    return searchParams.get("autorun") === "1"
  }, [searchParams])

  const runTest = useCallback(async () => {
    if (!canTest) return

    setIsPending(true)
    try {
      await testEndpoint(endpoint.id, endpoint.rule)
      toast({
        title: "测试成功",
        description: "消息已成功推送",
      })
    } catch (error) {
      console.error("Test endpoint error:", error)
      toast({
        title: "测试失败",
        description: error instanceof Error ? error.message : "请检查配置是否正确",
        variant: "destructive",
      })
    } finally {
      setIsPending(false)
    }
  }, [canTest, endpoint.id, endpoint.rule, toast])

  useEffect(() => {
    if (!shouldAutorun) return
    if (!canTest) return
    void runTest()
  }, [shouldAutorun, canTest, runTest])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold">测试推送</h1>
        <p className="text-muted-foreground mt-2">
          Endpoint: <span className="font-mono text-sm">{endpoint.id}</span>
        </p>
      </div>

      <Card className="bg-white/50 border-blue-100">
        <CardHeader>
          <CardTitle>{endpoint.name}</CardTitle>
          <CardDescription>
            {canTest ? "发送一条测试消息到该 Endpoint" : "该 Endpoint 已禁用，无法测试"}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-2">
          <Button onClick={runTest} disabled={!canTest || isPending}>
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            立即测试
          </Button>
          <Button variant="outline" onClick={() => router.back()} disabled={isPending}>
            返回
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
