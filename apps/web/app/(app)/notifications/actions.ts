"use server"

import { revalidatePath } from "next/cache"
import type {
  JobAlertPreferences,
  NotificationEmailPreferences,
} from "@cvforge/types"

import { api, runAction } from "@/lib/api"

export async function markNotificationRead(notificationId: string) {
  const result = await runAction(() =>
    api(`/notifications/${encodeURIComponent(notificationId)}/read`, {
      method: "POST",
    })
  )

  revalidatePath("/", "layout")
  return result
}

export async function updateEmailPreference(
  key: keyof NotificationEmailPreferences,
  enabled: boolean
) {
  return runAction(
    () =>
      api("/notifications/preferences", {
        body: { email: { [key]: enabled } },
        method: "POST",
      }),
    "Préférence enregistrée."
  )
}

/** One alert setting at a time (US-166); the others keep their value. */
export async function updateJobAlertPreference(
  update: Partial<JobAlertPreferences>
) {
  return runAction(
    () =>
      api("/notifications/preferences", {
        body: { jobAlerts: update },
        method: "POST",
      }),
    "Préférence enregistrée."
  )
}
