"use client"

import { useRouter } from "next/navigation"
import type { UseFormReturn } from "react-hook-form"
import { Loader2, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CHANNEL_TEMPLATES, type Channel, type ChannelType } from "@/lib/channels"
import type { NewEndpoint } from "@/lib/db/schema/endpoints"
import { TemplateFields } from "@/components/template-fields"

export function EndpointForm({
  form,
  channels,
  selectedChannelType,
  setSelectedChannelType,
  selectedTemplateType,
  setSelectedTemplateType,
  isPending,
  onSubmit,
  onRequestClose,
}: {
  form: UseFormReturn<NewEndpoint>
  channels: Channel[]
  selectedChannelType: ChannelType | undefined
  setSelectedChannelType: (value: ChannelType | undefined) => void
  selectedTemplateType: string | undefined
  setSelectedTemplateType: (value: string | undefined) => void
  isPending: boolean
  onSubmit: (data: NewEndpoint) => void | Promise<void>
  onRequestClose: () => void
}) {
  const router = useRouter()

  const templates = selectedChannelType ? CHANNEL_TEMPLATES[selectedChannelType] : []
  const template = templates.find((t) => t.type === selectedTemplateType)

  return (
    <Form {...form}>
      <div className="max-h-[calc(80vh-160px)] overflow-y-auto">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4 px-1">
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    名称
                    <span className="text-red-500 ml-1">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="请输入接口名称" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="channelId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    推送渠道
                    <span className="text-red-500 ml-1">*</span>
                  </FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value)
                      const channel = channels.find((c) => c.id === value)
                      setSelectedChannelType(channel?.type)
                    }}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="选择推送渠道" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {channels.length > 0 ? (
                        <>
                          {channels.map((channel) => (
                            <SelectItem key={channel.id} value={channel.id}>
                              {channel.name}
                            </SelectItem>
                          ))}
                        </>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="w-full justify-start text-blue-600 hover:text-blue-700"
                          onClick={() => {
                            onRequestClose()
                            router.push("/moe/channels")
                          }}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          添加新渠道
                        </Button>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="timeoutMs"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>超时时间 (ms)</FormLabel>
                  <FormControl>
                    <Input type="number" min={1000} max={120000} step={500} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="retryCount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>失败重试次数</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} max={20} step={1} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="rule"
            render={({ field }) => (
              <FormItem>
                {selectedChannelType && (
                  <>
                    <FormLabel>
                      消息模版
                      <span className="text-red-500 ml-1">*</span>
                    </FormLabel>
                    <Select
                      onValueChange={(value) => {
                        setSelectedTemplateType(value)
                      }}
                      value={selectedTemplateType}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="选择消息类型" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {templates.map((t) => (
                          <SelectItem key={t.type} value={t.type}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {template && <p className="text-sm text-muted-foreground mb-2">{template.description}</p>}
                    {template ? (
                      <TemplateFields form={form} template={template} />
                    ) : (
                      <FormControl>
                        <Textarea
                          placeholder="请先选择消息类型"
                          className="font-mono resize-none h-32"
                          disabled
                          {...field}
                        />
                      </FormControl>
                    )}
                  </>
                )}
                {!selectedChannelType && (
                  <FormControl>
                    <Textarea
                      placeholder="请先选择推送渠道"
                      className="font-mono resize-none h-32"
                      disabled
                      {...field}
                    />
                  </FormControl>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onRequestClose} type="button">
              取消
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              提交
            </Button>
          </div>
        </form>
      </div>
    </Form>
  )
}
