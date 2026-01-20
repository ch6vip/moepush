"use client"

import { useCallback, useMemo, useState } from "react"

import { useToast } from "@/components/ui/use-toast"
import type { Endpoint } from "@/lib/db/schema/endpoints"
import { deleteEndpoint, toggleEndpointStatus } from "@/lib/services/endpoints"

export function useEndpointRowActions({ onEndpointsUpdate }: { onEndpointsUpdate: () => void }) {
  const { toast } = useToast()

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [endpointToDelete, setEndpointToDelete] = useState<Endpoint | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const [togglingId, setTogglingId] = useState<string | null>(null)

  const openDelete = useCallback((endpoint: Endpoint) => {
    setEndpointToDelete(endpoint)
    setDeleteDialogOpen(true)
  }, [])

  const confirmDelete = useCallback(async () => {
    if (!endpointToDelete) return

    try {
      setIsDeleting(true)
      await deleteEndpoint(endpointToDelete.id)
      setDeleteDialogOpen(false)
      onEndpointsUpdate()
      toast({ description: "接口已删除" })
    } catch (error) {
      console.error("Error deleting endpoint:", error)
      toast({
        variant: "destructive",
        description: "删除失败，请重试",
      })
    } finally {
      setIsDeleting(false)
    }
  }, [endpointToDelete, onEndpointsUpdate, toast])

  const toggleStatus = useCallback(
    async (endpointId: string) => {
      try {
        setTogglingId(endpointId)
        await toggleEndpointStatus(endpointId)
        onEndpointsUpdate()
        toast({ description: "推送接口状态已更新" })
      } catch (error) {
        toast({
          variant: "destructive",
          description: error instanceof Error ? error.message : "操作失败",
        })
      } finally {
        setTogglingId(null)
      }
    },
    [onEndpointsUpdate, toast],
  )

  return useMemo(() => {
    return {
      deleteDialog: {
        open: deleteDialogOpen,
        endpoint: endpointToDelete,
        pending: isDeleting,
        setOpen: setDeleteDialogOpen,
        openFor: openDelete,
        confirm: confirmDelete,
      },
      isRowToggling: (endpointId: string) => togglingId === endpointId,
      toggleStatus,
    }
  }, [confirmDelete, deleteDialogOpen, endpointToDelete, isDeleting, openDelete, toggleStatus, togglingId])
}

