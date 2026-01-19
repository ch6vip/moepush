"use client"

import { useState, useEffect } from "react"
import { Loader2 } from "lucide-react"
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
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"

interface TestPushDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string | React.ReactNode
  initialContent: string
  isTesting: boolean
  onTest: (testData: any) => Promise<void>
}

export function TestPushDialog({
  open,
  onOpenChange,
  title,
  description,
  initialContent,
  isTesting,
  onTest,
}: TestPushDialogProps) {
  const [testContent, setTestContent] = useState(initialContent)
  const { toast } = useToast()

  // 当对话框打开或 initialContent 变化时，更新内容
  useEffect(() => {
    if (open) {
      setTestContent(initialContent)
    }
  }, [open, initialContent])

  const handleFormatJson = () => {
    try {
      const parsed = JSON.parse(testContent)
      setTestContent(JSON.stringify(parsed, null, 4))
      toast({
        description: "JSON 格式化成功",
      })
    } catch (error) {
      console.error("Error formatting JSON:", error)
      toast({
        variant: "destructive",
        description: "无法格式化：内容不是有效的 JSON 格式",
      })
    }
  }

  const handleTest = async () => {
    if (!testContent.trim()) {
      toast({
        variant: "destructive",
        description: "请输入测试内容",
      })
      return
    }

    let testData: any
    // 尝试解析为 JSON，如果失败则作为纯文本字符串
    try {
      testData = JSON.parse(testContent)
    } catch (error) {
      // 不是有效的 JSON，将其作为纯文本字符串使用
      console.error("Error parsing JSON:", error)
      testData = testContent.trim()
    }

    try {
      await onTest(testData)
      onOpenChange(false)
    } catch (error) {
      console.error("Error during test push:", error)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div>{description}</div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="test-content">
                测试内容 <span className="text-red-500">*</span>
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleFormatJson}
              >
                格式化 JSON
              </Button>
            </div>
            <Textarea
              id="test-content"
              placeholder='JSON 格式: {"message": "示例消息"}&#10;或纯文本: 示例消息内容'
              value={testContent}
              onChange={(e) => setTestContent(e.target.value)}
              className="font-mono text-sm min-h-[200px]"
            />
            <p className="text-xs text-muted-foreground">
              支持 JSON 对象（如 {`{"message": "内容"}`}）或纯文本字符串
            </p>
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction
            disabled={isTesting || !testContent.trim()}
            onClick={handleTest}
          >
            {isTesting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            确认发送
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}