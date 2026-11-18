"use server"

import { revalidatePath } from "next/cache"
import type {
  JobAlertPreferences,
  NotificationEmailPreferences,
  PushSubscriptionInput,
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

export async function markAllNotificationsRead() {
  const result = await runAction(
    () => api("/notifications/read-all", { method: "POST" }),
    "Tout est marqué comme lu."
  )

  revalidatePath("/", "layout")
  return result
}

/** This browser now receives the job alerts (E27). */
export async function subscribePush(subscription: PushSubscriptionInput) {
  return runAction(
    () =>
      api("/notifications/push/subscribe", {
        body: subscription,
        method: "POST",
      }),
    "Notifications activées sur cet appareil."
  )
}

export async function unsubscribePush(endpoint: string) {
  return runAction(
    () =>
      api("/notifications/push/unsubscribe", {
        body: { endpoint },
        method: "POST",
      }),
    "Notifications désactivées sur cet appareil."
  )
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
