import type { AdminCreditOffer, CreditOfferInput } from "@cvforge/types";

export type StripeCatalogIds = {
  stripePriceId: string;
  stripeProductId: string;
};

export type CreditOffersStore = {
  listAll: () => Promise<AdminCreditOffer[]>;
  listActive: () => Promise<AdminCreditOffer[]>;
  findById: (id: string) => Promise<AdminCreditOffer | null>;
  create: (input: CreditOfferInput) => Promise<AdminCreditOffer>;
  update: (id: string, input: CreditOfferInput) => Promise<AdminCreditOffer | null>;
  /** Makes `id` the only featured offer, in one transaction. */
  setFeatured: (id: string) => Promise<AdminCreditOffer | null>;
  setStripeIds: (id: string, ids: StripeCatalogIds) => Promise<AdminCreditOffer>;
};

export type OfferStripeSyncContract = {
  sync: (offer: AdminCreditOffer) => Promise<StripeCatalogIds>;
};
