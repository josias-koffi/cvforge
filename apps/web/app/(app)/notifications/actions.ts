"use server"

import { revalidatePath } from "next/cache"
import type { NotificationEmailPreferences } from "@cvforge/types"

import { api, runAction } from "@/lib/api"

export async function markNotificationRead(notificationId: string) {
  const result = await runAction(() =>
    api(`/notifications/${encodeURIComponent(notificationId)}/read`, { method: "POST" })
  )

  revalidatePath("/", "layout")
  return result
}

export async function updateEmailPreference(
  key: keyof NotificationEmailPreferences,
  enabled: boolean
) {
  return runAction(
    () => api("/notifications/preferences", { body: { email: { [key]: enabled } }, method: "POST" }),
    "Préférence enregistrée."
  )
}
