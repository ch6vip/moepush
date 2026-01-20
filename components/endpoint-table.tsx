"use client"

import { useState } from "react"
import Link from "next/link"
import { Eye, Loader2, MoreHorizontal, Pencil, Power, Trash, Zap } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

import { EndpointDialog } from "@/components/endpoint-dialog"
import { useEndpointRowActions } from "@/components/hooks/use-endpoint-row-actions"
import { STATUS_COLORS, STATUS_LABELS } from "@/lib/constants/endpoints"
import { Channel } from "@/lib/channels"
import { Endpoint } from "@/lib/db/schema/endpoints"

interface EndpointTableProps {
  endpoints: Endpoint[]
  channels: Channel[]
  onEndpointsUpdate: () => void
}

export function EndpointTable({ endpoints, channels, onEndpointsUpdate }: EndpointTableProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const rowActions = useEndpointRowActions({ onEndpointsUpdate })

  const filteredEndpoints =
    endpoints?.filter((endpoint) => {
      if (!searchQuery.trim()) return true

      const channel = channels.find((c) => c.id === endpoint.channelId)
      const searchContent = [endpoint.id, endpoint.name, endpoint.rule, channel?.name]
        .join(" ")
        .toLowerCase()

      const keywords = searchQuery.toLowerCase().split(/\s+/)
      return keywords.every((keyword) => searchContent.includes(keyword))
    }) ?? []

  const getStatusBadgeClass = (status: Endpoint["status"]) => {
    return `inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${STATUS_COLORS[status]}`
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <div className="flex w-full max-w-sm items-center space-x-2">
          <Input
            placeholder="搜索接口的名称、内容或备注..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9"
          />
        </div>
        <EndpointDialog channels={channels} onSuccess={onEndpointsUpdate} />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>名称</TableHead>
              <TableHead>推送渠道</TableHead>
              <TableHead>消息模板</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>创建时间</TableHead>
              <TableHead className="w-[80px]">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEndpoints.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  {searchQuery ? "未找到匹配的接口" : "暂无接口"}
                </TableCell>
              </TableRow>
            ) : (
              filteredEndpoints.map((endpoint) => {
                const channel = channels.find((c) => c.id === endpoint.channelId)
                return (
                  <TableRow key={endpoint.id}>
                    <TableCell className="font-mono">{endpoint.id}</TableCell>
                    <TableCell>{endpoint.name}</TableCell>
                    <TableCell>{channel?.name}</TableCell>
                    <TableCell>
                      <Popover>
                        <PopoverTrigger className="text-left">
                          <code className="font-mono text-sm max-w-[200px] truncate block hover:text-blue-500">
                            {endpoint.rule}
                          </code>
                        </PopoverTrigger>
                        <PopoverContent className="w-[400px]">
                          <pre className="font-mono text-sm whitespace-pre-wrap break-all bg-muted p-2 rounded-md">
                            {JSON.stringify(JSON.parse(endpoint.rule || "{}"), null, 2)}
                          </pre>
                        </PopoverContent>
                        </Popover>
                    </TableCell>
                    <TableCell>
                      <span className={getStatusBadgeClass(endpoint.status)}>
                        {STATUS_LABELS[endpoint.status]}
                      </span>
                    </TableCell>
                    <TableCell>{endpoint.createdAt}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/moe/endpoints/${endpoint.id}`}>查看详情</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/moe/endpoints/${endpoint.id}/example`}>
                              <Eye className="h-4 w-4 mr-2" />
                              查看示例
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild disabled={endpoint.status !== "active"}>
                            <Link href={`/moe/endpoints/${endpoint.id}/test?autorun=1`}>
                              <Zap className="mr-2 h-4 w-4" />
                              测试推送
                            </Link>
                          </DropdownMenuItem>
                          <EndpointDialog
                            mode="edit"
                            endpoint={endpoint}
                            channels={channels}
                            onSuccess={onEndpointsUpdate}
                            icon={<Pencil className="h-4 w-4 mr-2" />}
                          />
                          <DropdownMenuItem
                            disabled={rowActions.isRowToggling(endpoint.id)}
                            onClick={() => rowActions.toggleStatus(endpoint.id)}
                          >
                            <Power className="h-4 w-4 mr-2" />
                            {endpoint.status === "active" ? "禁用" : "启用"}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => {
                              rowActions.deleteDialog.openFor(endpoint)
                            }}
                          >
                            <Trash className="h-4 w-4 mr-2" />
                            删除
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={rowActions.deleteDialog.open} onOpenChange={rowActions.deleteDialog.setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除接口 {rowActions.deleteDialog.endpoint?.name} 吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction disabled={rowActions.deleteDialog.pending} onClick={rowActions.deleteDialog.confirm}>
              {rowActions.deleteDialog.pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              确认
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
