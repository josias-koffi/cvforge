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
};
