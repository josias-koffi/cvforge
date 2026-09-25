import { WELCOME_CREDITS } from "@cvforge/types";
import { UnprocessableEntityException } from "@nestjs/common";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  createTestDatabase,
  type TestDatabase,
} from "../database/testing/test-database";
import { PgCreditLedgerStore } from "./credits.pg-store";
import {
  CreditsService,
  InsufficientCreditsException,
} from "./credits.service";

const USER = "user@example.com";

describe("CreditsService", () => {
  let testDatabase: TestDatabase;
  let service: CreditsService;

  beforeAll(async () => {
    testDatabase = await createTestDatabase();
  });

  afterAll(async () => {
    await testDatabase.close();
  });

  beforeEach(async () => {
    await testDatabase.reset();
    service = new CreditsService(new PgCreditLedgerStore(testDatabase.db), {
      lowBalanceThreshold: 20,
    });
  });

  function grant(credits: number, userEmail = USER) {
    return service.grantCredits({
      adminEmail: "admin@example.com",
      credits,
      note: "Initial allocation",
      userEmail,
    });
  }

  it("tracks admin grants and resulting balance", async () => {
    const entry = await grant(50);

    expect(entry.balanceAfter).toBe(50);
    await expect(service.getSummaryForUser(USER)).resolves.toMatchObject({
      balance: 50,
      isLowBalance: false,
    });
  });

  it("pages the history and falls back on bad paging values", async () => {
    for (const credits of [1, 2, 3]) await grant(credits);

    await expect(
      service.getHistoryPageForUser(USER, { page: "2", pageSize: "2" }),
    ).resolves.toMatchObject({
      entries: [{ amount: 1 }],
      filters: { kind: null },
      pagination: { page: 2, pageSize: 2, totalItems: 3, totalPages: 2 },
    });
    await expect(
      service.getHistoryPageForUser(USER, { kind: "stolen", page: "-1", pageSize: "500" }),
    ).resolves.toMatchObject({
      filters: { kind: null },
      pagination: { page: 1, pageSize: 50, totalPages: 1 },
    });
    await expect(
      service.getHistoryPageForUser("nobody@example.com", { kind: "spent" }),
    ).resolves.toMatchObject({
      entries: [],
      filters: { kind: "spent" },
      pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 1 },
    });
  });

  it("flags a balance under the threshold as low, without reading the ledger", async () => {
    await grant(5);

    await expect(service.getBalanceSummaryForUser(USER)).resolves.toEqual({
      balance: 5,
      isLowBalance: true,
      lowBalanceThreshold: 20,
      userEmail: USER,
    });
  });

  it("debits the expected amount for CV generation", async () => {
    await grant(10);

    const entry = await service.consumeCredits({
      action: "cv_generation",
      applicationId: "app-001",
      userEmail: USER,
    });
    const summary = await service.getSummaryForUser(USER);

    expect(entry.amount).toBe(-3);
    expect(entry.balanceAfter).toBe(7);
    expect(summary.history.map((item) => item.amount)).toEqual([-3, 10]);
  });

  it("debits the amount it is given rather than the action's base price", async () => {
    await grant(40);

    const entry = await service.consumeCredits({
      action: "interview_session",
      amount: 30,
      durationMinutes: 30,
      userEmail: USER,
    });

    expect(entry.amount).toBe(-30);
    expect(entry.balanceAfter).toBe(10);
    // A -10 and a -30 line are otherwise indistinguishable in the history.
    expect(entry.note).toBe("Session d'entretien simule (30 min)");
    expect(entry.metadata.durationMinutes).toBe(30);
  });

  it("falls back to the action's base price without an amount", async () => {
    await grant(10);

    const entry = await service.consumeCredits({
      action: "interview_session",
      userEmail: USER,
    });

    expect(entry.amount).toBe(-10);
  });

  it.each([0, -5, 2.5])("rejects a variable charge of %s", async (amount) => {
    await grant(50);

    await expect(
      service.consumeCredits({
        action: "interview_session",
        amount,
        userEmail: USER,
      }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
    await expect(service.getSummaryForUser(USER)).resolves.toMatchObject({
      balance: 50,
    });
  });

  it("checks the amount asked for, not the base price", async () => {
    await grant(10);

    await expect(
      service.assertSufficientCredits("interview_session", USER, 30),
    ).rejects.toBeInstanceOf(InsufficientCreditsException);
    await expect(
      service.assertSufficientCredits("interview_session", USER, 10),
    ).resolves.toBeUndefined();
  });

  it("rejects AI consumption when credits are insufficient", async () => {
    await expect(
      service.consumeCredits({
        action: "letter_generation",
        applicationId: "app-001",
        userEmail: USER,
      }),
    ).rejects.toBeInstanceOf(InsufficientCreditsException);
    await expect(
      service.assertSufficientCredits("letter_generation", USER),
    ).rejects.toBeInstanceOf(InsufficientCreditsException);
  });

  it("never overdraws under concurrent consumption", async () => {
    await grant(9);

    const results = await Promise.allSettled(
      Array.from({ length: 5 }, () =>
        service.consumeCredits({ action: "cv_generation", userEmail: USER }),
      ),
    );

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(3);
    await expect(service.getSummaryForUser(USER)).resolves.toMatchObject({
      balance: 0,
    });
  });

  it.each([
    [10, "   "],
    [0, "Note"],
    [1.5, "Note"],
  ])("rejects an invalid manual grant (%s credits, note %j)", async (credits, note) => {
    await expect(
      service.grantCredits({
        adminEmail: "admin@example.com",
        credits,
        note,
        userEmail: USER,
      }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it("deduplicates repeated Stripe purchase events", async () => {
    const purchase = {
      amountCents: 999,
      credits: 550,
      offerId: "offer-1",
      offerLabel: "Starter",
      orderId: "order-1",
      stripeCheckoutSessionId: "cs_test_123",
      stripePaymentIntentId: "pi_123",
      userEmail: USER,
    };

    const first = await service.recordStripePurchase(purchase);
    const second = await service.recordStripePurchase(purchase);
    const summary = await service.getSummaryForUser(USER);

    expect(second.id).toBe(first.id);
    expect(summary.history).toHaveLength(1);
    expect(summary.balance).toBe(550);
  });

  it("grants welcome credits only once per account", async () => {
    const first = await service.grantWelcomeCredits(USER);
    const second = await service.grantWelcomeCredits(USER);
    const summary = await service.getSummaryForUser(USER);

    expect(second.id).toBe(first.id);
    expect(first).toMatchObject({ action: "welcome_grant", type: "welcome_grant" });
    expect(summary.history).toHaveLength(1);
    expect(summary.balance).toBe(WELCOME_CREDITS);
  });

  it("rejects a Stripe purchase without credits", async () => {
    await expect(
      service.recordStripePurchase({
        amountCents: 999,
        credits: 0,
        offerId: "offer-1",
        offerLabel: "Starter",
        orderId: "order-0",
        stripeCheckoutSessionId: "cs_test_0",
        userEmail: USER,
      }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });
});
