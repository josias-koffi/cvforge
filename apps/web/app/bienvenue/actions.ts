"use server"

import { revalidatePath } from "next/cache"

import { runAction, type ActionResult } from "@/lib/api"
import {
  writeGettingStartedDismissed,
  writeOnboardingCompleted,
} from "@/lib/onboarding"

/** The last step's button: the next sign-in opens on the dashboard. */
export async function completeOnboarding(): Promise<ActionResult> {
  const result = await runAction(writeOnboardingCompleted)

  revalidatePath("/dashboard")
  return result
}

/** "Masquer" on the dashboard checklist: it does not come back. */
export async function dismissGettingStarted(): Promise<ActionResult> {
  const result = await runAction(writeGettingStartedDismissed)

  revalidatePath("/dashboard")
  return result
}
