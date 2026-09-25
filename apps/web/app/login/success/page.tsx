import { redirect } from "next/navigation"

import { safeNextPath } from "@/lib/next-path"
import { loadOnboardingStatus } from "@/lib/onboarding"
import { requireSession } from "@/lib/session"

export default async function LoginSuccessPage({
  searchParams,
}: PageProps<"/login/success">) {
  await requireSession()

  // A free tool's link opens where the tool left off (US-133).
  const next = safeNextPath((await searchParams).next)
  const { completedAt } = await loadOnboardingStatus()

  // A first sign-in goes through the onboarding first (US-150), and the
  // tool's screen after it.
  if (!completedAt) {
    redirect(next ? `/bienvenue?next=${encodeURIComponent(next)}` : "/bienvenue")
  }

  redirect(next ?? "/dashboard")
}
