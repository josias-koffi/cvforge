import type { OnboardingStatus } from "@cvforge/types"

import { ApiError, api } from "@/lib/api"

type OnboardingResponse = { onboarding: OnboardingStatus }

/**
 * Where the account stands with the first-login onboarding (US-149).
 * Unreadable reads as done: an API hiccup must not trap a candidate in the
 * onboarding, while a missed one is only a checklist away. Anything else —
 * the redirect of an expired session first — goes through.
 */
export async function loadOnboardingStatus(): Promise<OnboardingStatus> {
  try {
    return (await api<OnboardingResponse>("/onboarding")).onboarding
  } catch (error) {
    if (!(error instanceof ApiError || error instanceof TypeError)) throw error

    return {
      completedAt: new Date(0).toISOString(),
      gettingStartedDismissedAt: new Date(0).toISOString(),
    }
  }
}

export async function writeOnboardingCompleted() {
  return (await api<OnboardingResponse>("/onboarding/complete", { method: "POST" }))
    .onboarding
}

export async function writeGettingStartedDismissed() {
  return (
    await api<OnboardingResponse>("/onboarding/getting-started/dismiss", {
      method: "POST",
    })
  ).onboarding
}
