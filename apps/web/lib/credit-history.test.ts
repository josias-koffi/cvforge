import type { CreditLedgerEntry } from "@cvforge/types"
import { describe, expect, it } from "vitest"

import {
  creditEntryDetail,
  parseCreditHistoryParams,
} from "@/lib/credit-history"

function entry(overrides: Partial<CreditLedgerEntry>): CreditLedgerEntry {
  return {
    action: "cv_generation",
    amount: -3,
    balanceAfter: 10,
    createdAt: "2026-09-25T08:00:00.000Z",
    id: "entry-1",
    metadata: {},
    note: null,
    type: "ai_usage",
    userEmail: "user@example.com",
    ...overrides,
  }
}

describe("parseCreditHistoryParams", () => {
  it("reads the page and the filter", () => {
    expect(parseCreditHistoryParams({ page: "3", type: "depenses" })).toEqual({
      kind: "spent",
      page: 3,
      type: "depenses",
    })
    expect(parseCreditHistoryParams({ type: "recharges" })).toMatchObject({
      kind: "earned",
    })
  })

  it("falls back to the first page of everything", () => {
    expect(parseCreditHistoryParams({ page: "-2", type: "vols" })).toEqual({
      kind: null,
      page: 1,
      type: null,
    })
    expect(parseCreditHistoryParams({ page: ["2", "3"] })).toMatchObject({
      page: 1,
    })
  })
})

describe("creditEntryDetail", () => {
  it("keeps what the label does not say", () => {
    expect(
      creditEntryDetail(
        entry({
          action: "interview_session",
          metadata: { durationMinutes: 12 },
        })
      )
    ).toBe("12 min")
    expect(
      creditEntryDetail(
        entry({
          action: "stripe_purchase",
          amount: 60,
          note: "Achat Stripe Pack M (1900 cents)",
        })
      )
    ).toBe("Pack M")
    expect(
      creditEntryDetail(
        entry({ action: "admin_grant", note: "Geste commercial" })
      )
    ).toBe("Geste commercial")
  })

  it("hides the notes written for support", () => {
    expect(creditEntryDetail(entry({ note: "Generation CV" }))).toBeNull()
    expect(creditEntryDetail(entry({ action: "interview_session" }))).toBeNull()
    expect(
      creditEntryDetail(entry({ action: "stripe_purchase", note: "autre" }))
    ).toBeNull()
  })
})
