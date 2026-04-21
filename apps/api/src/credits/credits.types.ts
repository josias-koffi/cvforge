import type {
  AiCreditAction,
  CreditLedgerEntry,
  CreditLedgerSummary,
} from "@cvforge/types";

export type CreditsConfig = {
  lowBalanceThreshold: number;
  stateFilePath: string;
};

export type CreditLedgerStore = {
  addEntry: (entry: CreditLedgerEntry) => CreditLedgerEntry;
  listEntriesForUser: (userEmail: string) => CreditLedgerEntry[];
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
  packId: string;
  stripeCheckoutSessionId: string;
  stripePaymentIntentId?: string | null;
  userEmail: string;
};

export type CreditsServiceContract = {
  consumeCredits: (input: ConsumeCreditsInput) => CreditLedgerEntry;
  getSummaryForUser: (userEmail: string) => CreditLedgerSummary;
  grantCredits: (input: GrantCreditsInput) => CreditLedgerEntry;
  recordStripePurchase: (input: StripePurchaseInput) => CreditLedgerEntry;
};
