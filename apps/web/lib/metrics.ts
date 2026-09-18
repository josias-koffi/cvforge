export type AdminMetrics = {
  generatedAt: string
  activeWindowDays: number
  documents: {
    cvImportCount: number
    generatedCvCount: number
    generatedLetterCount: number
    offerEnrichmentCount: number
  }
  interviews: { completedCount: number; totalCount: number }
  users: { activeCount: number; adminCount: number; totalCount: number }
  applications: { totalCount: number }
  credits: { consumed: number; granted: number; sold: number }
  revenue: { currency: "eur"; grossCents: number; paidOrderCount: number }
  /** Null when OpenRouter supervision is off or the balance is unreadable. */
  apiCost: {
    estimatedEurCents: number
    stale: boolean
    usdToEurRate: number
    usedUsd: number
  } | null
  margin: { netEurCents: number; ratio: number | null } | null
}

export type OpenRouterBalanceResponse = {
  alertThreshold: number
  balance: {
    fetchedAt: string
    remaining: number
    stale: boolean
    totalCredits: number
    totalUsage: number
  } | null
  isLowBalance: boolean
  supervisionEnabled: boolean
}

/** OpenRouter credits are USD, so the same formatting as a dollar amount. */
export function formatUsd(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    currency: "USD",
    style: "currency",
  }).format(value)
}

export function formatRatio(ratio: number) {
  return new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 1,
    style: "percent",
  }).format(ratio)
}
