import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createSellableOffer } from "../billing/testing/billing-fixtures";
import {
  acquisitionEvents,
  aiUsageEvents,
  applications,
  authAccounts,
  creditLedgerEntries,
  creditOrders,
  toolQueries,
} from "../database/schema";
import {
  createTestDatabase,
  type TestDatabase,
} from "../database/testing/test-database";
import { CockpitService } from "./cockpit.service";
import { resolveWindow } from "./shared/metrics-window";

/**
 * Every tab of the cockpit against the real SQL (E26): an empty database must
 * answer zeros rather than fail, and a seeded one the figures it holds.
 */

const DAY = 86_400_000;
const NOW = new Date();
const ago = (days: number) => new Date(NOW.getTime() - days * DAY);
const NO_BALANCE = { getBalance: async () => null, isEnabled: false };

describe("CockpitService on Postgres", () => {
  let testDatabase: TestDatabase;
  let cockpit: CockpitService;

  beforeAll(async () => {
    testDatabase = await createTestDatabase();
    cockpit = new CockpitService(testDatabase.db, NO_BALANCE, 1);
  });

  afterAll(async () => {
    await testDatabase.close();
  });

  beforeEach(async () => {
    await testDatabase.reset();
  });

  async function seed() {
    const { db } = testDatabase;
    const offer = await createSellableOffer(db);
    const order = {
      credits: 50,
      currency: "eur" as const,
      offerId: offer.id,
      offerName: offer.name,
      priceCents: 1000,
    };

    await db.insert(authAccounts).values([
      { createdAt: ago(3), email: "a@example.com", onboardingCompletedAt: ago(3), role: "user" },
      { createdAt: ago(2), email: "b@example.com", role: "user" },
      { createdAt: ago(40), email: "old@example.com", role: "user" },
    ]);
    await db.insert(creditOrders).values([
      { ...order, paidAt: ago(1), status: "paid", userEmail: "a@example.com" },
      { ...order, paidAt: ago(1), status: "paid", userEmail: "a@example.com" },
      { ...order, status: "failed", userEmail: "b@example.com" },
      { ...order, createdAt: ago(40), paidAt: ago(40), status: "paid", userEmail: "old@example.com" },
    ] as never);
    const ledger = (action: string, amount: number, type = "ai_usage") => ({
      action: action as never,
      amount,
      balanceAfter: 0,
      createdAt: ago(1),
      type: type as never,
      userEmail: "a@example.com",
    });
    await db.insert(creditLedgerEntries).values([
      ledger("stripe_purchase", 100, "stripe_purchase"),
      ledger("cv_generation", -3),
      ledger("cv_generation", -3),
      ledger("letter_generation", -3),
      ledger("interview_session", -15),
    ]);
    const call = (feature: string, costUsd: number, status: "ok" | "error" = "ok") => ({
      costUsd,
      createdAt: ago(1),
      feature: feature as never,
      model: "mistral",
      promptTokens: 100,
      status,
    });
    await db.insert(aiUsageEvents).values([
      call("cv_generation", 0.02),
      call("cv_generation", 0.02),
      call("interview_voice", 0.3),
      call("ats_impact", 0, "error"),
    ]);
    const application = (id: string, companyName: string, title: string) => ({
      createdAt: ago(1),
      extracted: { companyName, title } as never,
      id,
      sourceType: "text" as const,
      status: "draft" as never,
      updatedAt: ago(1),
      userEmail: "a@example.com",
    });
    await db.insert(applications).values([
      application("app-1", "ACME", "Développeur web"),
      application("app-2", " acme ", "Développeur web"),
      application("app-3", "Globex", "Data analyst"),
    ]);
    await db.insert(toolQueries).values([
      { day: ago(1).toISOString().slice(0, 10), hits: 4, label: "HELPLINE", queryKey: "381983568", tool: "company_check" },
      { day: ago(0).toISOString().slice(0, 10), hits: 1, label: "HELPLINE", queryKey: "381983568", tool: "company_check" },
    ]);
    await db.insert(acquisitionEvents).values({
      day: ago(1).toISOString().slice(0, 10),
      ipHash: "h",
      locale: "fr",
      step: "view",
      tool: "ats",
    });
  }

  it.each(["7", "30", "90", "365", "all"] as const)(
    "answers every tab on an empty database over %s",
    async (period) => {
      const snapshot = await cockpit.snapshot(resolveWindow(period, NOW));

      expect(snapshot.overview.kpis.revenueCents.value).toBe(0);
      expect(snapshot.revenue.funnel.signups).toBe(0);
      expect(snapshot.aiCosts.trackingSince).toBeNull();
      expect(snapshot.usage.kpis.applications.value).toBe(0);
      expect(snapshot.market.topCompanies).toEqual([]);
      expect(snapshot.acquisition.funnels).toHaveLength(5);
      expect(snapshot.overview.revenueVsCost.length).toBeGreaterThan(0);
    },
  );

  it("reads money, activity and their previous period", async () => {
    await seed();
    const overview = await cockpit.overview.read(resolveWindow("30", NOW));

    expect(overview.kpis.revenueCents).toEqual({ previous: 1000, value: 2000 });
    expect(overview.kpis.signups).toEqual({ previous: 1, value: 2 });
    expect(overview.kpis.newBuyers.value).toBe(1);
    expect(overview.kpis.activeUsers.value).toBe(1);
    // 0.34 USD at a rate of 1.
    expect(overview.kpis.aiCostEurCents.value).toBe(34);
    expect(overview.kpis.grossMarginCents.value).toBe(1966);
    expect(overview.revenueVsCost).toHaveLength(30);
    expect(overview.revenueVsCost.reduce((sum, p) => sum + p.revenueCents, 0)).toBe(2000);
  });

  it("follows new accounts down to a second purchase", async () => {
    await seed();
    const revenue = await cockpit.revenue.read(resolveWindow("30", NOW));

    expect(revenue.funnel).toEqual({
      firstGeneration: 1,
      firstPurchase: 1,
      onboarded: 1,
      repeatPurchase: 1,
      signups: 2,
    });
    expect(revenue.kpis.averageBasketCents.value).toBe(1000);
    expect(revenue.abandonedCheckoutRate).toBeCloseTo(33.3);
    expect(revenue.repeatBuyerRate).toBe(50);
    expect(revenue.offers).toEqual([
      expect.objectContaining({ orders: 2, revenueCents: 2000 }),
    ]);
  });

  it("prices each billed unit against the credits it brings in", async () => {
    await seed();
    const aiCosts = await cockpit.aiCosts.read(resolveWindow("30", NOW));
    const cv = aiCosts.units.find((unit) => unit.action === "cv_generation");
    const interview = aiCosts.units.find((unit) => unit.action === "interview_session");

    expect(aiCosts.kpis.calls.value).toBe(4);
    expect(aiCosts.kpis.errorRate.value).toBe(25);
    // 30 € for 150 credits: 20 cents a credit; a CV is 3 credits.
    expect(aiCosts.creditValueEurCents).toBe(20);
    expect(cv).toMatchObject({ costPerUnitEurCents: 2, revenuePerUnitEurCents: 60, units: 2 });
    expect(interview).toMatchObject({ costPerUnitEurCents: 3, units: 10 });
    expect(aiCosts.series[0]).toHaveProperty("cv_generation");
  });

  it("ranks companies across spellings, and the free tools' searches", async () => {
    await seed();
    const market = await cockpit.market.read(resolveWindow("7", NOW));

    expect(market.topCompanies[0]).toEqual({ count: 2, label: "ACME" });
    expect(market.topJobTitles[0]).toEqual({ count: 2, label: "Développeur web" });
    expect(market.topCheckedCompanies).toEqual([{ count: 5, label: "HELPLINE" }]);
  });

  it("counts documents and the landing's visitors", async () => {
    await seed();
    const window = resolveWindow("7", NOW);
    const [usage, acquisition] = await Promise.all([
      cockpit.usage.read(window),
      cockpit.acquisition.read(window),
    ]);

    expect(usage.kpis.cvGenerated.value).toBe(2);
    expect(usage.kpis.lettersGenerated.value).toBe(1);
    expect(usage.onboardingRate).toBe(50);
    expect(acquisition.funnels.find((f) => f.tool === "ats")?.visitors).toBe(1);
    expect(acquisition.series.reduce((sum, p) => sum + (p.ats ?? 0), 0)).toBe(1);
  });
});
