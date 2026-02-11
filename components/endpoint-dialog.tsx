"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { useToast } from "@/components/ui/use-toast"
import { EndpointForm } from "@/components/endpoint-form"

import { insertEndpointSchema } from "@/lib/db/schema/endpoints"
import type { Endpoint, NewEndpoint } from "@/lib/db/schema/endpoints"
import type { Channel, ChannelType } from "@/lib/channels"
import { createEndpoint, updateEndpoint } from "@/lib/services/endpoints"
import { safeJsonParse } from "@/lib/utils"

interface EndpointDialogProps {
  mode?: "create" | "edit"
  endpoint?: Endpoint
  channels: Channel[]
  icon?: React.ReactNode
  onSuccess?: () => void
}

const getInitialChannelType = (channels: Channel[], endpoint?: Endpoint) => {
  if (endpoint) {
    const channel = channels.find((c) => c.id === endpoint.channelId)
    return channel?.type
  }
}

const getInitialTemplateType = (endpoint?: Endpoint) => {
  if (endpoint) {
    const rule = safeJsonParse<Record<string, string>>(endpoint.rule || "{}", {})
    return rule.msgtype || rule.parse_mode
  }
}

export function EndpointDialog({
  mode = "create",
  endpoint,
  channels,
  icon,
  onSuccess,
}: EndpointDialogProps) {
  const [open, setOpen] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const [selectedChannelType, setSelectedChannelType] = useState<ChannelType | undefined>(
    getInitialChannelType(channels, endpoint),
  )
  const [selectedTemplateType, setSelectedTemplateType] = useState<string | undefined>(
    getInitialTemplateType(endpoint),
  )

  const { toast } = useToast()

  const form = useForm<NewEndpoint>({
    resolver: zodResolver(insertEndpointSchema),
    defaultValues: {
      name: endpoint?.name ?? "",
      channelId: endpoint?.channelId ?? "",
      rule: endpoint?.rule ?? "",
      timeoutMs: endpoint?.timeoutMs ?? 8000,
      retryCount: endpoint?.retryCount ?? 3,
    },
  })

  async function onSubmit(data: NewEndpoint) {
    try {
      setIsPending(true)
      if (mode === "edit" && endpoint) {
        await updateEndpoint(endpoint.id, data)
        toast({ description: "接口已更新" })
      } else {
        await createEndpoint(data)
        toast({ description: "接口已创建" })
      }
      setOpen(false)
      form.reset()
      onSuccess?.()
    } catch (error) {
      console.error("Endpoint dialog error:", error)
      toast({
        variant: "destructive",
        description: mode === "edit" ? "更新失败，请重试" : "创建失败，请重试",
      })
    } finally {
      setIsPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {mode === "edit" ? (
          <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
            {icon}
            编辑
          </DropdownMenuItem>
        ) : (
          <Button size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            添加新的接口
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>{mode === "edit" ? "编辑推送接口" : "新建推送接口"}</DialogTitle>
          <DialogDescription>{mode === "edit" ? "修改现有的推送接口" : "添加一个新的推送接口"}</DialogDescription>
        </DialogHeader>

        <EndpointForm
          form={form}
          channels={channels}
          selectedChannelType={selectedChannelType}
          setSelectedChannelType={setSelectedChannelType}
          selectedTemplateType={selectedTemplateType}
          setSelectedTemplateType={setSelectedTemplateType}
          isPending={isPending}
          onSubmit={onSubmit}
          onRequestClose={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
