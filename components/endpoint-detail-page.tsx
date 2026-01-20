"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { EndpointDialog } from "@/components/endpoint-dialog"
import { STATUS_COLORS, STATUS_LABELS } from "@/lib/constants/endpoints"
import type { Channel } from "@/lib/channels"
import { CHANNEL_LABELS } from "@/lib/channels"
import type { Endpoint } from "@/lib/db/schema/endpoints"
import { formatDate } from "@/lib/utils"

function formatRule(rule: string) {
  try {
    const parsed = JSON.parse(rule)
    return JSON.stringify(parsed, null, 2)
  } catch {
    return rule
  }
}

export function EndpointDetailPage({
  endpoint,
  channel,
  channels,
}: {
  endpoint: Endpoint
  channel: Channel | null
  channels: Channel[]
}) {
  const router = useRouter()
  const canTest = endpoint.status === "active"
  const statusClass = `inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${STATUS_COLORS[endpoint.status]}`
  const channelTypeLabel = channel?.type ? CHANNEL_LABELS[channel.type] : null

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{endpoint.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span className="font-mono">{endpoint.id}</span>
            <span className={statusClass}>{STATUS_LABELS[endpoint.status]}</span>
            <span>创建时间：{formatDate(endpoint.createdAt)}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/moe/endpoints">返回列表</Link>
          </Button>
          <EndpointDialog
            mode="edit"
            endpoint={endpoint}
            channels={channels}
            onSuccess={() => router.refresh()}
          />
          <Button variant="outline" asChild>
            <Link href={`/moe/endpoints/${endpoint.id}/example`}>查看示例</Link>
          </Button>
          {canTest ? (
            <Button asChild>
              <Link href={`/moe/endpoints/${endpoint.id}/test?autorun=1`}>测试推送</Link>
            </Button>
          ) : (
            <Button disabled>测试推送</Button>
          )}
        </div>
      </div>

      <Card className="bg-white/50 border-blue-100">
        <CardHeader>
          <CardTitle>基础信息</CardTitle>
          <CardDescription>只读展示当前 Endpoint 的配置与绑定信息</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-2">
            <div className="text-sm text-muted-foreground">绑定渠道</div>
            <div className="flex flex-wrap items-center gap-2">
              {channel ? (
                <>
                  <div className="font-medium">{channel.name}</div>
                  {channelTypeLabel && (
                    <div className="text-sm text-muted-foreground">({channelTypeLabel})</div>
                  )}
                </>
              ) : (
                <div className="text-sm text-muted-foreground">未知渠道（可能已删除）</div>
              )}
            </div>
          </div>

          <div className="grid gap-2">
            <div className="text-sm text-muted-foreground">消息模板 / 规则</div>
            <pre className="whitespace-pre-wrap break-all rounded-md border bg-muted p-4 text-sm font-mono">
              {formatRule(endpoint.rule)}
            </pre>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="grid gap-2">
              <div className="text-sm text-muted-foreground">超时时间 (ms)</div>
              <div className="font-medium">{endpoint.timeoutMs ?? 8000}</div>
            </div>
            <div className="grid gap-2">
              <div className="text-sm text-muted-foreground">失败重试次数</div>
              <div className="font-medium">{endpoint.retryCount ?? 3}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
