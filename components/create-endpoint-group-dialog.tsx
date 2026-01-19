"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Plus, Loader2 } from "lucide-react"
import { useState, useEffect } from "react"
import type { ReactNode } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useToast } from "@/components/ui/use-toast"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { createEndpointGroup, updateEndpointGroup } from "@/lib/services/endpoint-groups"
import { useRouter } from "next/navigation"
import { EndpointGroupWithEndpoints } from "@/types/endpoint-group"
import { Endpoint } from "@/lib/db/schema/endpoints"
import { Checkbox } from "@/components/ui/checkbox"

const endpointGroupSchema = z.object({
  name: z.string().min(1, "名称不能为空"),
  endpointIds: z.array(z.string()).min(1, "至少需要选择一个接口"),
})

type EndpointGroupFormValues = z.infer<typeof endpointGroupSchema>

interface EndpointGroupDialogProps {
  mode?: "create" | "edit"
  group?: EndpointGroupWithEndpoints
  availableEndpoints: Endpoint[]
  icon?: ReactNode
  onSuccess?: () => void
}

export function EndpointGroupDialog({ 
  mode = "create", 
  group,
  availableEndpoints,
  icon,
  onSuccess,
}: EndpointGroupDialogProps) {
  const [open, setOpen] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const form = useForm<EndpointGroupFormValues>({
    resolver: zodResolver(endpointGroupSchema),
    defaultValues: {
      name: "",
      endpointIds: [],
    },
  })

  useEffect(() => {
    if (group && open && mode === "edit") {
      form.reset({
        name: group.name,
        endpointIds: group.endpointIds,
      })
    } else if (mode === "create" && open) {
      form.reset({
        name: "",
        endpointIds: [],
      })
    }
  }, [group, open, mode, form])

  const toggleEndpoint = (endpointId: string) => {
    const currentIds = form.getValues("endpointIds")
    const newIds = currentIds.includes(endpointId)
      ? currentIds.filter(id => id !== endpointId)
      : [...currentIds, endpointId]
    form.setValue("endpointIds", newIds, { shouldValidate: true })
  }

  async function onSubmit(data: EndpointGroupFormValues) {
    try {
      setIsPending(true)
      if (mode === "edit" && group) {
        await updateEndpointGroup(group.id, data)
        toast({ description: "接口组已更新" })
      } else {
        await createEndpointGroup(data)
        toast({ description: "接口组已创建" })
      }
      setOpen(false)
      form.reset()
      onSuccess?.()
      router.refresh()
    } catch (error) {
      console.error('Endpoint group dialog error:', error)
      toast({
        variant: "destructive",
        description: error instanceof Error ? error.message : (mode === "edit" ? "更新失败，请重试" : "创建失败，请重试")
      })
    } finally {
      setIsPending(false)
    }
  }

  const selectedCount = form.watch("endpointIds")?.length || 0

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
            添加新的接口组
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>
            {mode === "edit" ? "编辑接口组" : "新建接口组"}
          </DialogTitle>
          <DialogDescription>
            {mode === "edit" ? "修改现有的接口组" : "创建一个包含多个接口的接口组"}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <div className="max-h-[calc(80vh-160px)] overflow-y-auto">
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4 px-1">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      接口组名称
                      <span className="text-red-500 ml-1">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="请输入接口组名称" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="endpointIds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      选择接口
                      <span className="text-red-500 ml-1">*</span>
                    </FormLabel>
                    <div className="text-sm text-muted-foreground mb-2">
                      已选择 {selectedCount} 个接口
                    </div>
                    <div className="max-h-[300px] overflow-y-auto rounded-md border p-4">
                      <div className="space-y-3">
                        {availableEndpoints.length === 0 ? (
                          <div className="text-sm text-muted-foreground text-center py-8">
                            暂无可用接口，请先创建推送接口
                          </div>
                        ) : (
                          availableEndpoints.map(endpoint => (
                            <div key={endpoint.id} className="flex items-center space-x-3 rounded-md border p-3 hover:bg-accent transition-colors">
                              <Checkbox
                                checked={field.value.includes(endpoint.id)}
                                onCheckedChange={() => toggleEndpoint(endpoint.id)}
                              />
                              <div className="flex-1">
                                <div className="font-medium">{endpoint.name}</div>
                                <div className="text-xs text-muted-foreground font-mono">{endpoint.id}</div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setOpen(false)} type="button">
                  取消
                </Button>
                <Button 
                  type="submit"
                  disabled={isPending}
                >
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {mode === "edit" ? "保存修改" : "创建接口组"}
                </Button>
              </div>
            </form>
          </div>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

interface CreateEndpointGroupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedEndpoints: Endpoint[]
  onSuccess?: () => void
}

export function CreateEndpointGroupDialog({
  open,
  onOpenChange,
  selectedEndpoints,
  onSuccess,
}: CreateEndpointGroupDialogProps) {
  const { toast } = useToast()
  const router = useRouter()
  const [isPending, setIsPending] = useState(false)

  const form = useForm<EndpointGroupFormValues>({
    resolver: zodResolver(endpointGroupSchema),
    defaultValues: {
      name: "",
      endpointIds: selectedEndpoints.map((e) => e.id),
    },
  })

  useEffect(() => {
    if (!open) return
    form.reset({
      name: "",
      endpointIds: selectedEndpoints.map((e) => e.id),
    })
  }, [open, selectedEndpoints, form])

  const toggleEndpoint = (endpointId: string) => {
    const currentIds = form.getValues("endpointIds")
    const newIds = currentIds.includes(endpointId)
      ? currentIds.filter((id) => id !== endpointId)
      : [...currentIds, endpointId]
    form.setValue("endpointIds", newIds, { shouldValidate: true })
  }

  async function onSubmit(data: EndpointGroupFormValues) {
    try {
      setIsPending(true)
      await createEndpointGroup(data)
      toast({ description: "接口组已创建" })
      onOpenChange(false)
      form.reset()
      onSuccess?.()
      router.refresh()
    } catch (error) {
      console.error("Create endpoint group error:", error)
      toast({
        variant: "destructive",
        description: error instanceof Error ? error.message : "创建失败，请重试",
      })
    } finally {
      setIsPending(false)
    }
  }

  const selectedCount = form.watch("endpointIds")?.length || 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>创建接口组</DialogTitle>
          <DialogDescription>为已选择的接口创建一个新的接口组</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <div className="max-h-[calc(80vh-160px)] overflow-y-auto">
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4 px-1">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      接口组名称
                      <span className="text-red-500 ml-1">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="请输入接口组名称" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endpointIds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      已选择接口
                      <span className="text-red-500 ml-1">*</span>
                    </FormLabel>
                    <div className="text-sm text-muted-foreground mb-2">
                      当前包含 {selectedCount} 个接口
                    </div>
                    <div className="max-h-[300px] overflow-y-auto rounded-md border p-4">
                      <div className="space-y-3">
                        {selectedEndpoints.length === 0 ? (
                          <div className="text-sm text-muted-foreground text-center py-8">
                            暂无已选择接口
                          </div>
                        ) : (
                          selectedEndpoints.map((endpoint) => (
                            <div
                              key={endpoint.id}
                              className="flex items-center space-x-3 rounded-md border p-3 hover:bg-accent transition-colors"
                            >
                              <Checkbox
                                checked={field.value.includes(endpoint.id)}
                                onCheckedChange={() => toggleEndpoint(endpoint.id)}
                              />
                              <div className="flex-1">
                                <div className="font-medium">{endpoint.name}</div>
                                <div className="text-xs text-muted-foreground font-mono">{endpoint.id}</div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)} type="button">
                  取消
                </Button>
                <Button type="submit" disabled={isPending || selectedEndpoints.length === 0}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  创建接口组
                </Button>
              </div>
            </form>
          </div>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
