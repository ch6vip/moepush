"use client"

import { useCallback, useMemo, useState } from "react"

export function useDeleteDialog<T>() {
  const [open, setOpen] = useState(false)
  const [item, setItem] = useState<T | null>(null)
  const [pending, setPending] = useState(false)

  const openFor = useCallback((target: T) => {
    setItem(target)
    setOpen(true)
  }, [])

  const close = useCallback(() => {
    setOpen(false)
  }, [])

  return useMemo(
    () => ({
      open,
      setOpen,
      item,
      pending,
      setPending,
      openFor,
      close,
    }),
    [close, item, open, openFor, pending],
  )
}
