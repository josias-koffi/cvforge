import type { AdminCreditOffer } from "@cvforge/types";
import type Stripe from "stripe";
import type { OfferStripeSyncContract, StripeCatalogIds } from "./offers.types";

type StripeCatalogApi = {
  prices: Pick<Stripe["prices"], "create" | "retrieve" | "update">;
  products: Pick<Stripe["products"], "create" | "update">;
};

/**
 * Stripe Managed Payments refuses a checkout whose product has no tax code.
 * CVSpark sells access to a cloud-hosted AI used from a browser, by job
 * seekers rather than companies: "AIaaS - Cloud Based - Personal Use".
 */
export const CREDIT_OFFER_TAX_CODE = "txcd_10105001";

function productFields(offer: AdminCreditOffer) {
  return {
    active: offer.status === "active",
    description: offer.description.fr || undefined,
    metadata: { offerId: offer.id, slug: offer.slug },
    name: `CVSpark ${offer.name.fr} — ${offer.credits} crédits`,
    tax_code: CREDIT_OFFER_TAX_CODE,
  };
}

/**
 * Mirrors an offer into the Stripe catalogue of the current environment.
 *
 * Stripe prices are immutable, so a price change creates a new Price, makes
 * it the product's default and archives the previous one. Archiving an offer
 * deactivates its product; the default price cannot be archived on its own.
 */
export class OfferStripeSync implements OfferStripeSyncContract {
  constructor(private readonly stripe: StripeCatalogApi) {}

  async sync(offer: AdminCreditOffer): Promise<StripeCatalogIds> {
    const stripeProductId = offer.stripeProductId
      ? (await this.stripe.products.update(offer.stripeProductId, productFields(offer))).id
      : (
          await this.stripe.products.create(productFields(offer), {
            idempotencyKey: `credit-offer-product-${offer.id}`,
          })
        ).id;

    const stripePriceId = await this.ensurePrice(offer, stripeProductId);

    return { stripePriceId, stripeProductId };
  }

  private async ensurePrice(offer: AdminCreditOffer, productId: string) {
    if (offer.stripePriceId) {
      const current = await this.stripe.prices.retrieve(offer.stripePriceId);

      if (
        current.unit_amount === offer.priceCents &&
        current.currency === offer.currency &&
        current.product === productId
      ) {
        return current.id;
      }
    }

    const price = await this.stripe.prices.create({
      currency: offer.currency,
      metadata: { offerId: offer.id },
      product: productId,
      // Vision §11: prices are shown VAT included.
      tax_behavior: "inclusive",
      unit_amount: offer.priceCents,
    });

    await this.stripe.products.update(productId, { default_price: price.id });

    if (offer.stripePriceId) {
      await this.stripe.prices.update(offer.stripePriceId, { active: false });
    }

    return price.id;
  }
}
