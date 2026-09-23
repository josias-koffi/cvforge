import {
  AI_CREDIT_ACTION_CV_GENERATION,
  AI_CREDIT_ACTION_CV_IMPORT,
  AI_CREDIT_ACTION_INTERVIEW_SESSION,
  AI_CREDIT_ACTION_JOB_DIGEST_RERANK,
  AI_CREDIT_ACTION_LETTER_GENERATION,
  AI_CREDIT_ACTION_OFFER_ENRICHMENT,
  AI_CREDIT_COSTS,
  CREDIT_EVENT_AI_USAGE,
  CREDIT_EVENT_ADMIN_GRANT,
  CREDIT_EVENT_STRIPE_PURCHASE,
  CREDIT_EVENT_WELCOME_GRANT,
  WELCOME_CREDITS,
  type CreditLedgerEntry,
  type CreditLedgerSummary,
} from "@cvforge/types";
import {
  Injectable,
  HttpException,
  HttpStatus,
  UnprocessableEntityException,
} from "@nestjs/common";
import type {
  ConsumeCreditsInput,
  CreditLedgerEntryDraft,
  CreditLedgerStore,
  CreditsConfig,
  GrantCreditsInput,
  StripePurchaseInput,
} from "./credits.types";

function buildAiUsageNote(
  action: ConsumeCreditsInput["action"],
  durationMinutes?: number,
) {
  if (action === AI_CREDIT_ACTION_INTERVIEW_SESSION && durationMinutes) {
    // Without the duration, a -10 and a -30 line read identically and the user
    // cannot reconcile their balance.
    return `Session d'entretien simule (${durationMinutes} min)`;
  }

  switch (action) {
    case AI_CREDIT_ACTION_OFFER_ENRICHMENT:
      return "Enrichissement contexte entreprise";
    case AI_CREDIT_ACTION_CV_GENERATION:
      return "Generation CV";
    case AI_CREDIT_ACTION_CV_IMPORT:
      return "Import CV";
    case AI_CREDIT_ACTION_LETTER_GENERATION:
      return "Generation lettre de motivation";
    case AI_CREDIT_ACTION_INTERVIEW_SESSION:
      return "Session d'entretien simule";
    case AI_CREDIT_ACTION_JOB_DIGEST_RERANK:
      return "Classement IA des offres du jour";
  }
}

/**
 * The action fixes the price unless the caller says otherwise. An explicit
 * amount is validated here rather than trusted: it is the only path by which a
 * caller could write an arbitrary number into the ledger.
 */
function resolveCost(action: ConsumeCreditsInput["action"], amount?: number) {
  if (amount === undefined) {
    return AI_CREDIT_COSTS[action];
  }

  if (!Number.isInteger(amount) || amount <= 0) {
    throw new UnprocessableEntityException(
      "Le montant debite doit etre un entier positif.",
    );
  }

  return amount;
}

export class InsufficientCreditsException extends HttpException {
  constructor(action: ConsumeCreditsInput["action"]) {
    super(
      `Credits insuffisants pour ${buildAiUsageNote(action).toLowerCase()}.`,
      HttpStatus.PAYMENT_REQUIRED,
    );
  }
}

@Injectable()
export class CreditsService {
  constructor(
    private readonly store: CreditLedgerStore,
    private readonly config: CreditsConfig,
  ) {}

  async getSummaryForUser(userEmail: string): Promise<CreditLedgerSummary> {
    const [balance, history] = await Promise.all([
      this.store.getBalance(userEmail),
      this.store.listEntriesForUser(userEmail),
    ]);

    return {
      balance,
      history,
      isLowBalance: balance < this.config.lowBalanceThreshold,
      lowBalanceThreshold: this.config.lowBalanceThreshold,
      userEmail,
    };
  }

  /**
   * Checks the balance without spending it, so a costly AI call is never made
   * for a user who could not pay for it anyway. `consumeCredits` re-checks
   * inside its transaction, which is what actually guarantees the balance.
   */
  async assertSufficientCredits(
    action: ConsumeCreditsInput["action"],
    userEmail: string,
    amount?: number,
  ): Promise<void> {
    const cost = resolveCost(action, amount);

    if ((await this.store.getBalance(userEmail)) < cost) {
      throw new InsufficientCreditsException(action);
    }
  }

  async consumeCredits(input: ConsumeCreditsInput): Promise<CreditLedgerEntry> {
    const result = await this.store.applyEntry({
      action: input.action,
      amount: -resolveCost(input.action, input.amount),
      metadata: {
        applicationId: input.applicationId,
        durationMinutes: input.durationMinutes,
      },
      note: buildAiUsageNote(input.action, input.durationMinutes),
      type: CREDIT_EVENT_AI_USAGE,
      userEmail: input.userEmail,
    });

    if (result.status === "insufficient_balance") {
      throw new InsufficientCreditsException(input.action);
    }

    return result.entry;
  }

  async grantCredits(input: GrantCreditsInput): Promise<CreditLedgerEntry> {
    if (!Number.isInteger(input.credits) || input.credits <= 0) {
      throw new UnprocessableEntityException(
        "Le nombre de credits attribues doit etre un entier positif.",
      );
    }

    const note = input.note.trim();

    if (!note) {
      throw new UnprocessableEntityException(
        "Une note explicative est obligatoire pour une attribution manuelle.",
      );
    }

    return this.applyCredit({
      action: "admin_grant",
      amount: input.credits,
      metadata: {
        adminEmail: input.adminEmail,
      },
      note,
      type: CREDIT_EVENT_ADMIN_GRANT,
      userEmail: input.userEmail,
    });
  }

  /** Idempotent per email: a second sign-in, or a racing one, adds nothing. */
  async grantWelcomeCredits(userEmail: string): Promise<CreditLedgerEntry> {
    return this.applyCredit(
      {
        action: "welcome_grant",
        amount: WELCOME_CREDITS,
        metadata: {},
        note: "Crédits de bienvenue",
        type: CREDIT_EVENT_WELCOME_GRANT,
        userEmail,
      },
      `welcome:${userEmail}`,
    );
  }

  async recordStripePurchase(
    input: StripePurchaseInput,
  ): Promise<CreditLedgerEntry> {
    if (!Number.isInteger(input.credits) || input.credits <= 0) {
      throw new UnprocessableEntityException(
        "Le nombre de credits achetes doit etre un entier positif.",
      );
    }

    return this.applyCredit(
      {
        action: "stripe_purchase",
        amount: input.credits,
        metadata: {
          offerId: input.offerId,
          orderId: input.orderId,
          stripeCheckoutSessionId: input.stripeCheckoutSessionId,
          stripePaymentIntentId: input.stripePaymentIntentId ?? undefined,
        },
        note: `Achat Stripe ${input.offerLabel} (${input.amountCents} cents)`,
        type: CREDIT_EVENT_STRIPE_PURCHASE,
        userEmail: input.userEmail,
      },
      `stripe:checkout:${input.stripeCheckoutSessionId}`,
    );
  }

  /** Positive movements cannot be refused for balance reasons. */
  private async applyCredit(
    draft: CreditLedgerEntryDraft,
    idempotencyKey?: string,
  ): Promise<CreditLedgerEntry> {
    const result = await this.store.applyEntry(draft, idempotencyKey);

    if (result.status === "insufficient_balance") {
      throw new Error("A credit movement cannot overdraw a balance.");
    }

    return result.entry;
  }
}
