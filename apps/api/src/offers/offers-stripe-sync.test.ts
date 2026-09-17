import type { AdminCreditOffer } from "@cvforge/types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CREDIT_OFFER_TAX_CODE, OfferStripeSync } from "./offers-stripe-sync";
import { offerInput } from "./testing/offer-fixtures";

function offer(overrides: Partial<AdminCreditOffer> = {}): AdminCreditOffer {
  return {
    ...offerInput(),
    createdAt: "2026-09-17T10:00:00.000Z",
    currency: "eur",
    id: "offer-1",
    isFeatured: false,
    stripePriceId: null,
    stripeProductId: null,
    stripeSyncedAt: null,
    updatedAt: "2026-09-17T10:00:00.000Z",
    ...overrides,
  };
}

describe("OfferStripeSync", () => {
  const stripe = {
    prices: { create: vi.fn(), retrieve: vi.fn(), update: vi.fn() },
    products: { create: vi.fn(), update: vi.fn() },
  };
  const sync = new OfferStripeSync(stripe as never);

  beforeEach(() => {
    vi.resetAllMocks();
    stripe.products.create.mockResolvedValue({ id: "prod_new" });
    stripe.products.update.mockResolvedValue({ id: "prod_1" });
    stripe.prices.create.mockResolvedValue({ id: "price_new" });
  });

  it("creates the product and an inclusive-tax price for a new offer", async () => {
    await expect(sync.sync(offer())).resolves.toEqual({
      stripePriceId: "price_new",
      stripeProductId: "prod_new",
    });
    expect(stripe.products.create).toHaveBeenCalledWith(
      expect.objectContaining({
        active: true,
        metadata: { offerId: "offer-1", slug: "discovery" },
        // Required by Managed Payments, which is on by default.
        tax_code: CREDIT_OFFER_TAX_CODE,
      }),
      { idempotencyKey: "credit-offer-product-offer-1" },
    );
    expect(stripe.prices.create).toHaveBeenCalledWith(
      expect.objectContaining({
        currency: "eur",
        product: "prod_new",
        tax_behavior: "inclusive",
        unit_amount: 599,
      }),
    );
    expect(stripe.products.update).toHaveBeenCalledWith("prod_new", {
      default_price: "price_new",
    });
    expect(stripe.prices.update).not.toHaveBeenCalled();
  });

  it("keeps the current price when the amount did not change", async () => {
    stripe.prices.retrieve.mockResolvedValue({
      currency: "eur",
      id: "price_1",
      product: "prod_1",
      unit_amount: 599,
    });

    await expect(
      sync.sync(offer({ stripePriceId: "price_1", stripeProductId: "prod_1" })),
    ).resolves.toEqual({ stripePriceId: "price_1", stripeProductId: "prod_1" });
    expect(stripe.prices.create).not.toHaveBeenCalled();
  });

  it("replaces and archives the price when the amount changed", async () => {
    stripe.prices.retrieve.mockResolvedValue({
      currency: "eur",
      id: "price_1",
      product: "prod_1",
      unit_amount: 499,
    });

    await expect(
      sync.sync(offer({ stripePriceId: "price_1", stripeProductId: "prod_1" })),
    ).resolves.toEqual({ stripePriceId: "price_new", stripeProductId: "prod_1" });
    expect(stripe.products.update).toHaveBeenCalledWith("prod_1", { default_price: "price_new" });
    expect(stripe.prices.update).toHaveBeenCalledWith("price_1", { active: false });
  });

  it("deactivates the product of an archived offer", async () => {
    stripe.prices.retrieve.mockResolvedValue({
      currency: "eur",
      id: "price_1",
      product: "prod_1",
      unit_amount: 599,
    });

    await sync.sync(
      offer({ status: "archived", stripePriceId: "price_1", stripeProductId: "prod_1" }),
    );

    expect(stripe.products.update).toHaveBeenCalledWith(
      "prod_1",
      expect.objectContaining({ active: false, tax_code: CREDIT_OFFER_TAX_CODE }),
    );
  });
});
