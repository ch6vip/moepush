import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatDate } from "@/lib/utils"

export function PushLogsCard({
  logs,
}: {
  logs: Array<{
    id: string
    requestId: string
    endpointId: string
    endpointName: string | null
    status: "success" | "failed"
    responseBody: string | null
    createdAt: string
  }>
}) {
  return (
    <Card className="bg-white/50 border-blue-100">
      <CardHeader>
        <CardTitle>最近推送记录</CardTitle>
        <CardDescription>用于排查是否推送成功，以及失败原因</CardDescription>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <div className="text-sm text-muted-foreground">暂无推送记录</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[170px]">时间</TableHead>
                <TableHead className="w-[180px]">接口</TableHead>
                <TableHead className="w-[90px]">状态</TableHead>
                <TableHead className="w-[180px]">Request ID</TableHead>
                <TableHead>返回/错误信息</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="whitespace-nowrap">{formatDate(log.createdAt)}</TableCell>
                  <TableCell className="font-medium">{log.endpointName ?? log.endpointId}</TableCell>
                  <TableCell>
                    <span
                      className={
                        log.status === "success"
                          ? "inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700"
                          : "inline-flex items-center rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700"
                      }
                    >
                      {log.status === "success" ? "成功" : "失败"}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{log.requestId}</TableCell>
                  <TableCell className="text-xs">
                    {log.responseBody ? (
                      <pre className="whitespace-pre-wrap break-all font-mono">
                        {log.responseBody.length > 400 ? `${log.responseBody.slice(0, 400)}...` : log.responseBody}
                      </pre>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

