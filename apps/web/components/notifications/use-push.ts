"use client"

import { useCallback, useEffect, useState, useSyncExternalStore } from "react"
import type { PushSubscriptionInput } from "@cvforge/types"
import { toast } from "sonner"

import { subscribePush, unsubscribePush } from "@/app/(app)/notifications/actions"
import {
  currentPushSubscription,
  readPushPermission,
  subscribeToPush,
  type PushPermission,
} from "@/lib/push"

export type PushState = {
  /** Null until the browser was read: render nothing that would flicker. */
  permission: PushPermission | null
  subscribed: boolean
  busy: boolean
  enable: () => Promise<boolean>
  disable: () => Promise<void>
}

// The browser exposes no event for a permission change made in this tab: it
// is re-read on every render, and enabling re-renders through `busy`.
const noSubscription = () => () => {}

/** Whether this browser receives the job alerts, and the means to change it. */
export function usePush(publicKey: string | null): PushState {
  const permission = useSyncExternalStore<PushPermission | null>(
    noSubscription,
    readPushPermission,
    () => null
  )
  const [subscribed, setSubscribed] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    currentPushSubscription()
      .then((subscription) => {
        if (!cancelled) setSubscribed(Boolean(subscription))
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [])

  const enable = useCallback(async () => {
    if (!publicKey) return false
    setBusy(true)
    try {
      const subscription = await subscribeToPush(publicKey)
      if (!subscription) {
        toast.error("Notifications refusées par le navigateur.")
        return false
      }
      const result = await subscribePush(
        subscription.toJSON() as PushSubscriptionInput
      )
      if (!result.ok) {
        toast.error(result.message)
        return false
      }
      setSubscribed(true)
      toast.success(result.message)
      return true
    } catch {
      toast.error("Impossible d'activer les notifications sur ce navigateur.")
      return false
    } finally {
      setBusy(false)
    }
  }, [publicKey])

  const disable = useCallback(async () => {
    setBusy(true)
    try {
      const subscription = await currentPushSubscription()
      if (subscription) {
        await subscription.unsubscribe()
        const result = await unsubscribePush(subscription.endpoint)
        if (result.ok) toast.success(result.message)
      }
      setSubscribed(false)
    } finally {
      setBusy(false)
    }
  }, [])

  return { busy, disable, enable, permission, subscribed }
}
