import {
  AI_CREDIT_ACTION_CV_GENERATION,
  AI_CREDIT_ACTION_LETTER_GENERATION,
  AI_CREDIT_ACTION_OFFER_ENRICHMENT,
  AI_CREDIT_COSTS,
  CREDIT_EVENT_AI_USAGE,
  CREDIT_EVENT_ADMIN_GRANT,
  CREDIT_EVENT_STRIPE_PURCHASE,
  type CreditLedgerEntry,
  type CreditLedgerSummary,
} from "@cvforge/types";
import {
  Injectable,
  HttpException,
  HttpStatus,
  UnprocessableEntityException,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type {
  ConsumeCreditsInput,
  CreditLedgerStore,
  CreditsConfig,
  GrantCreditsInput,
  StripePurchaseInput,
} from "./credits.types";

function buildAiUsageNote(action: ConsumeCreditsInput["action"]) {
  switch (action) {
    case AI_CREDIT_ACTION_OFFER_ENRICHMENT:
      return "Enrichissement contexte entreprise";
    case AI_CREDIT_ACTION_CV_GENERATION:
      return "Generation CV";
    case AI_CREDIT_ACTION_LETTER_GENERATION:
      return "Generation lettre de motivation";
  }
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

  getSummaryForUser(userEmail: string): CreditLedgerSummary {
    const history = this.store.listEntriesForUser(userEmail);
    const balance = history[0]?.balanceAfter ?? 0;

    return {
      balance,
      history,
      isLowBalance: balance < this.config.lowBalanceThreshold,
      lowBalanceThreshold: this.config.lowBalanceThreshold,
      userEmail,
    };
  }

  consumeCredits(input: ConsumeCreditsInput): CreditLedgerEntry {
    const current = this.getSummaryForUser(input.userEmail);
    const cost = AI_CREDIT_COSTS[input.action];

    if (current.balance < cost) {
      throw new InsufficientCreditsException(input.action);
    }

    return this.store.addEntry({
      action: input.action,
      amount: -cost,
      balanceAfter: current.balance - cost,
      createdAt: new Date().toISOString(),
      id: randomUUID(),
      metadata: {
        applicationId: input.applicationId,
      },
      note: buildAiUsageNote(input.action),
      type: CREDIT_EVENT_AI_USAGE,
      userEmail: input.userEmail,
    });
  }

  grantCredits(input: GrantCreditsInput): CreditLedgerEntry {
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

    const current = this.getSummaryForUser(input.userEmail);

    return this.store.addEntry({
      action: "admin_grant",
      amount: input.credits,
      balanceAfter: current.balance + input.credits,
      createdAt: new Date().toISOString(),
      id: randomUUID(),
      metadata: {
        adminEmail: input.adminEmail,
      },
      note,
      type: CREDIT_EVENT_ADMIN_GRANT,
      userEmail: input.userEmail,
    });
  }

  recordStripePurchase(input: StripePurchaseInput): CreditLedgerEntry {
    if (!Number.isInteger(input.credits) || input.credits <= 0) {
      throw new UnprocessableEntityException(
        "Le nombre de credits achetes doit etre un entier positif.",
      );
    }

    const existingEntry = this.getSummaryForUser(input.userEmail).history.find(
      (entry) =>
        entry.type === CREDIT_EVENT_STRIPE_PURCHASE &&
        (entry.metadata.stripeCheckoutSessionId === input.stripeCheckoutSessionId ||
          (input.stripePaymentIntentId != null &&
            entry.metadata.stripePaymentIntentId === input.stripePaymentIntentId)),
    );

    if (existingEntry) {
      return existingEntry;
    }

    const current = this.getSummaryForUser(input.userEmail);

    return this.store.addEntry({
      action: "stripe_purchase",
      amount: input.credits,
      balanceAfter: current.balance + input.credits,
      createdAt: new Date().toISOString(),
      id: randomUUID(),
      metadata: {
        packId: input.packId,
        stripeCheckoutSessionId: input.stripeCheckoutSessionId,
        stripePaymentIntentId: input.stripePaymentIntentId ?? undefined,
      },
      note: `Achat Stripe ${input.packId} (${input.amountCents} cents)`,
      type: CREDIT_EVENT_STRIPE_PURCHASE,
      userEmail: input.userEmail,
    });
  }
}
