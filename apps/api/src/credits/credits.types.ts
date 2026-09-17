import type {
  AiCreditAction,
  CreditLedgerEntry,
  CreditLedgerSummary,
} from "@cvforge/types";

export type CreditsConfig = {
  lowBalanceThreshold: number;
};

/** A ledger write before the store assigns its id, balance and timestamp. */
export type CreditLedgerEntryDraft = Omit<
  CreditLedgerEntry,
  "id" | "balanceAfter" | "createdAt"
>;

export type ApplyLedgerEntryResult =
  | { status: "applied"; entry: CreditLedgerEntry }
  | { status: "duplicate"; entry: CreditLedgerEntry }
  | { status: "insufficient_balance"; balance: number };

export type CreditLedgerStore = {
  /**
   * Atomically appends an entry and moves the balance by `draft.amount`.
   * Refuses any write that would make the balance negative, and returns the
   * existing entry when `idempotencyKey` was already used.
   */
  applyEntry: (
    draft: CreditLedgerEntryDraft,
    idempotencyKey?: string,
  ) => Promise<ApplyLedgerEntryResult>;
  getBalance: (userEmail: string) => Promise<number>;
  listEntriesForUser: (userEmail: string) => Promise<CreditLedgerEntry[]>;
  listEntriesByAdminEmail: (adminEmail: string) => Promise<CreditLedgerEntry[]>;
  deleteByUserEmail: (userEmail: string) => Promise<number>;
  anonymizeAdminReferences: (adminEmail: string) => Promise<number>;
};

export type ConsumeCreditsInput = {
  action: AiCreditAction;
  applicationId?: string;
  userEmail: string;
};

export type GrantCreditsInput = {
  adminEmail: string;
  credits: number;
  note: string;
  userEmail: string;
};

export type StripePurchaseInput = {
  amountCents: number;
  credits: number;
  offerId: string;
  offerLabel: string;
  orderId: string;
  stripeCheckoutSessionId: string;
  stripePaymentIntentId?: string | null;
  userEmail: string;
};

export type CreditsServiceContract = {
  consumeCredits: (input: ConsumeCreditsInput) => Promise<CreditLedgerEntry>;
  getSummaryForUser: (userEmail: string) => Promise<CreditLedgerSummary>;
  grantCredits: (input: GrantCreditsInput) => Promise<CreditLedgerEntry>;
  recordStripePurchase: (input: StripePurchaseInput) => Promise<CreditLedgerEntry>;
};
