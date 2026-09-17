import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestDatabase, type TestDatabase } from "../database/testing/test-database";
import { PgCreditOffersStore } from "./offers.pg-store";
import { CreditOffersService } from "./offers.service";
import { offerInput } from "./testing/offer-fixtures";

const MISSING_ID = "7a1d6e2c-4b8f-4e3a-9c5d-1f2e3a4b5c6d";

describe("CreditOffersService", () => {
  let testDatabase: TestDatabase;
  let store: PgCreditOffersStore;
  const sync = { sync: vi.fn() };

  beforeAll(async () => {
    testDatabase = await createTestDatabase();
    store = new PgCreditOffersStore(testDatabase.db);
  });

  afterAll(async () => {
    await testDatabase.close();
  });

  beforeEach(async () => {
    await testDatabase.reset();
    sync.sync.mockReset().mockImplementation(async (offer: { id: string }) => ({
      stripePriceId: `price_${offer.id}`,
      stripeProductId: `prod_${offer.id}`,
    }));
  });

  it("creates an offer and stores its Stripe ids", async () => {
    const service = new CreditOffersService(store, sync);

    const { offer, stripeSyncError } = await service.create(offerInput());

    expect(stripeSyncError).toBeNull();
    expect(offer).toMatchObject({
      stripePriceId: `price_${offer.id}`,
      stripeProductId: `prod_${offer.id}`,
    });
    expect(offer.stripeSyncedAt).not.toBeNull();
  });

  it("keeps the edit and reports the error when Stripe fails", async () => {
    const service = new CreditOffersService(store, sync);
    const { offer } = await service.create(offerInput());
    sync.sync.mockRejectedValueOnce(new Error("rate limited"));

    const result = await service.update(offer.id, offerInput({ priceCents: 799 }));

    expect(result.offer.priceCents).toBe(799);
    expect(result.stripeSyncError).toContain("rate limited");
  });

  it("saves without Stripe and flags the offer as unsynchronised", async () => {
    const service = new CreditOffersService(store, null);

    const result = await service.create(offerInput());

    expect(result.offer.stripePriceId).toBeNull();
    expect(result.stripeSyncError).toMatch(/STRIPE_SECRET_KEY/);
    await expect(service.syncAll()).rejects.toBeInstanceOf(ServiceUnavailableException);
    await expect(service.getPurchasableOffer(result.offer.id)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it("rejects a duplicate slug", async () => {
    const service = new CreditOffersService(store, sync);
    await service.create(offerInput());

    await expect(service.create(offerInput())).rejects.toBeInstanceOf(ConflictException);
  });

  it("keeps a single featured offer and only among active ones", async () => {
    const service = new CreditOffersService(store, sync);
    const first = (await service.create(offerInput({ slug: "one" }))).offer;
    const second = (await service.create(offerInput({ slug: "two" }))).offer;
    const draft = (await service.create(offerInput({ slug: "draft", status: "draft" }))).offer;

    await service.feature(first.id);
    await service.feature(second.id);

    const featured = (await service.listForAdmin()).filter((offer) => offer.isFeatured);
    expect(featured.map((offer) => offer.slug)).toEqual(["two"]);
    await expect(service.feature(draft.id)).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.feature(MISSING_ID)).rejects.toBeInstanceOf(NotFoundException);
  });

  it("archives an offer, unfeatures it and hides it from the public catalogue", async () => {
    const service = new CreditOffersService(store, sync);
    const { offer } = await service.create(offerInput());
    await service.feature(offer.id);

    const archived = await service.archive(offer.id);

    expect(archived.offer).toMatchObject({ isFeatured: false, status: "archived" });
    await expect(service.listPublic()).resolves.toEqual([]);
    await expect(service.getPurchasableOffer(offer.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(service.update(MISSING_ID, offerInput())).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("lists public offers in display order without Stripe fields", async () => {
    const service = new CreditOffersService(store, sync);
    await service.create(offerInput({ slug: "late", sortOrder: 30 }));
    await service.create(offerInput({ slug: "early", sortOrder: 1 }));

    const offers = await service.listPublic();

    expect(offers.map((offer) => offer.slug)).toEqual(["early", "late"]);
    expect(offers[0]).not.toHaveProperty("stripePriceId");
    expect(offers[0]).not.toHaveProperty("status");
  });

  it("resynchronises every offer", async () => {
    const service = new CreditOffersService(store, sync);
    await service.create(offerInput({ slug: "one" }));
    await service.create(offerInput({ slug: "two" }));
    sync.sync.mockClear();

    const results = await service.syncAll();

    expect(results).toHaveLength(2);
    expect(sync.sync).toHaveBeenCalledTimes(2);
  });

  it("returns a purchasable active offer with its price id", async () => {
    const service = new CreditOffersService(store, sync);
    const { offer } = await service.create(offerInput());

    await expect(service.getPurchasableOffer(offer.id)).resolves.toMatchObject({
      id: offer.id,
      stripePriceId: `price_${offer.id}`,
    });
  });
});
