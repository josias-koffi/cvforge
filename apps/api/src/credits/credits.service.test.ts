import {
  UnprocessableEntityException,
} from "@nestjs/common";
import { describe, expect, it } from "vitest";
import {
  CreditsService,
  InsufficientCreditsException,
} from "./credits.service";
import type { CreditLedgerStore } from "./credits.types";

function createStore(): CreditLedgerStore {
  const entries: Array<ReturnType<CreditLedgerStore["addEntry"]>> = [];

  return {
    addEntry(entry) {
      entries.push(entry);
      return entry;
    },
    listEntriesForUser(userEmail) {
      return entries
        .filter((entry) => entry.userEmail === userEmail)
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
    },
  };
}

describe("CreditsService", () => {
  it("tracks admin grants and resulting balance", () => {
    const service = new CreditsService(createStore(), {
      lowBalanceThreshold: 20,
      stateFilePath: "/tmp/unused.json",
    });

    const entry = service.grantCredits({
      adminEmail: "admin@example.com",
      credits: 50,
      note: "Bootstrap credits for QA",
      userEmail: "user@example.com",
    });

    expect(entry.balanceAfter).toBe(50);
    expect(service.getSummaryForUser("user@example.com")).toMatchObject({
      balance: 50,
      isLowBalance: false,
    });
  });

  it("debits the expected amount for CV generation", () => {
    const service = new CreditsService(createStore(), {
      lowBalanceThreshold: 20,
      stateFilePath: "/tmp/unused.json",
    });

    service.grantCredits({
      adminEmail: "admin@example.com",
      credits: 10,
      note: "Initial allocation",
      userEmail: "user@example.com",
    });

    const entry = service.consumeCredits({
      action: "cv_generation",
      applicationId: "app-001",
      userEmail: "user@example.com",
    });

    expect(entry.amount).toBe(-3);
    expect(entry.balanceAfter).toBe(7);
    expect(service.getSummaryForUser("user@example.com").history).toHaveLength(2);
  });

  it("rejects AI consumption when credits are insufficient", () => {
    const service = new CreditsService(createStore(), {
      lowBalanceThreshold: 20,
      stateFilePath: "/tmp/unused.json",
    });

    expect(() =>
      service.consumeCredits({
        action: "letter_generation",
        applicationId: "app-001",
        userEmail: "user@example.com",
      }),
    ).toThrow(InsufficientCreditsException);
  });

  it("requires a note for manual grants", () => {
    const service = new CreditsService(createStore(), {
      lowBalanceThreshold: 20,
      stateFilePath: "/tmp/unused.json",
    });

    expect(() =>
      service.grantCredits({
        adminEmail: "admin@example.com",
        credits: 10,
        note: "   ",
        userEmail: "user@example.com",
      }),
    ).toThrow(UnprocessableEntityException);
  });

  it("deduplicates repeated Stripe purchase events", () => {
    const service = new CreditsService(createStore(), {
      lowBalanceThreshold: 20,
      stateFilePath: "/tmp/unused.json",
    });

    const first = service.recordStripePurchase({
      amountCents: 999,
      credits: 550,
      packId: "starter",
      stripeCheckoutSessionId: "cs_test_123",
      stripePaymentIntentId: "pi_123",
      userEmail: "user@example.com",
    });

    const second = service.recordStripePurchase({
      amountCents: 999,
      credits: 550,
      packId: "starter",
      stripeCheckoutSessionId: "cs_test_123",
      stripePaymentIntentId: "pi_123",
      userEmail: "user@example.com",
    });

    expect(second.id).toBe(first.id);
    expect(service.getSummaryForUser("user@example.com").history).toHaveLength(1);
    expect(service.getSummaryForUser("user@example.com").balance).toBe(550);
  });
});
