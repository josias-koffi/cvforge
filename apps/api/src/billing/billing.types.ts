import type { CreditOrder } from "@cvforge/types";

export type BillingConfig = {
  appUrl: string;
  stripeSecretKey: string;
  stripeWebhookSecret: string;
};

export type NewCreditOrder = Pick<
  CreditOrder,
  "credits" | "currency" | "offerId" | "offerName" | "priceCents"
> & { userEmail: string };

export type StoredCreditOrder = CreditOrder & {
  ledgerEntryId: string | null;
  stripeCheckoutSessionId: string | null;
  userEmail: string;
};

export type CreditOrdersStore = {
  createPending: (order: NewCreditOrder) => Promise<StoredCreditOrder>;
  attachCheckoutSession: (id: string, sessionId: string) => Promise<void>;
  findById: (id: string) => Promise<StoredCreditOrder | null>;
  markPaid: (
    id: string,
    payment: { ledgerEntryId: string; stripePaymentIntentId: string | null },
  ) => Promise<void>;
  /** Moves a still-pending order to a terminal failure status. */
  markUnpaid: (id: string, status: "expired" | "failed") => Promise<void>;
  listForUser: (userEmail: string) => Promise<StoredCreditOrder[]>;
  /**
   * Account purge: the buyer's email is replaced, amounts and dates stay.
   * A settled payment is an accounting record we must be able to produce, so
   * the order is anonymised rather than deleted (RGPD, US-092).
   */
  anonymizeUserEmail: (userEmail: string) => Promise<number>;
};
