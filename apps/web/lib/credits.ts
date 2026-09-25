import { cache } from "react"
import type { CreditBalanceSummary } from "@cvforge/types"

import { api } from "@/lib/api"

/**
 * The balance, asked once per request: the sidebar, the dashboard and the
 * credits header all show it, and would otherwise each make their own call.
 */
export const getCreditBalance = cache(async () => {
  const { credits } = await api<{ credits: CreditBalanceSummary }>(
    "/credits/me"
  )

  return credits
})
