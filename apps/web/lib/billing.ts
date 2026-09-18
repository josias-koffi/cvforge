export type PurchaseAvailability = {
  available: boolean
  reason: "stripe_unavailable" | "ai_credits_exhausted" | null
}
