import {
  BadRequestException,
  ServiceUnavailableException,
} from "@nestjs/common";
import type Stripe from "stripe";
import type { CreditsService } from "../credits/credits.service";
import type { NotificationsService } from "../notifications/notifications.service";
import type { BillingConfig, CreditOrdersStore } from "./billing.types";

type WebhookApi = { webhooks: Pick<Stripe["webhooks"], "constructEvent"> };

export type WebhookOutcome =
  | "credited"
  | "already_credited"
  | "awaiting_payment"
  | "marked_failed"
  | "marked_expired"
  | "ignored";

function paymentIntentId(session: Stripe.Checkout.Session) {
  const intent = session.payment_intent;

  return typeof intent === "string" ? intent : (intent?.id ?? null);
}

/**
 * Fulfils credit orders from Stripe events, never from the success page.
 * Every handler is safe to replay: the ledger write is keyed on the
 * Checkout Session id, and status changes only move forward.
 */
export class StripeWebhookService {
  constructor(
    private readonly config: BillingConfig,
    private readonly stripe: WebhookApi | null,
    private readonly orders: CreditOrdersStore,
    private readonly credits: Pick<CreditsService, "recordStripePurchase">,
    private readonly notifications: Pick<
      NotificationsService,
      "sendCreditPurchaseConfirmationEmail"
    >,
  ) {}

  async handle(rawBody: Buffer | undefined, signature: string | undefined) {
    if (!this.stripe || !this.config.stripeWebhookSecret) {
      throw new ServiceUnavailableException("Webhook Stripe non configure.");
    }

    if (!rawBody || !signature) {
      throw new BadRequestException("Signature Stripe manquante.");
    }

    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        this.config.stripeWebhookSecret,
      );
    } catch {
      throw new BadRequestException("Signature Stripe invalide.");
    }

    return { eventId: event.id, outcome: await this.dispatch(event) };
  }

  private dispatch(event: Stripe.Event): Promise<WebhookOutcome> {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded":
        return this.fulfil(event.data.object);
      case "checkout.session.async_payment_failed":
        return this.close(event.data.object, "failed");
      case "checkout.session.expired":
        return this.close(event.data.object, "expired");
      default:
        return Promise.resolve("ignored");
    }
  }

  private async fulfil(session: Stripe.Checkout.Session): Promise<WebhookOutcome> {
    // Delayed payment methods complete the session before the money arrives.
    if (session.payment_status === "unpaid") {
      return "awaiting_payment";
    }

    const order = await this.findOrder(session);

    if (!order) {
      return "ignored";
    }

    const entry = await this.credits.recordStripePurchase({
      amountCents: session.amount_total ?? order.priceCents,
      credits: order.credits,
      offerId: order.offerId,
      offerLabel: order.offerName.fr,
      orderId: order.id,
      stripeCheckoutSessionId: session.id,
      stripePaymentIntentId: paymentIntentId(session),
      userEmail: order.userEmail,
    });
    const alreadyCredited = order.status === "paid" && order.ledgerEntryId === entry.id;

    await this.orders.markPaid(order.id, {
      ledgerEntryId: entry.id,
      stripePaymentIntentId: paymentIntentId(session),
    });

    if (alreadyCredited) {
      return "already_credited";
    }

    try {
      await this.notifications.sendCreditPurchaseConfirmationEmail({
        amountCents: session.amount_total ?? order.priceCents,
        credits: order.credits,
        offerName: order.offerName.fr,
        userEmail: order.userEmail,
      });
    } catch (error) {
      // The credits are granted; a mail outage must not make Stripe retry.
      console.error("[billing] purchase confirmation email failed", error);
    }

    return "credited";
  }

  private async close(
    session: Stripe.Checkout.Session,
    status: "expired" | "failed",
  ): Promise<WebhookOutcome> {
    const order = await this.findOrder(session);

    if (order) {
      await this.orders.markUnpaid(order.id, status);
    }

    return status === "failed" ? "marked_failed" : "marked_expired";
  }

  /** Sessions not created by this API (other products, CLI fixtures) are ignored. */
  private async findOrder(session: Stripe.Checkout.Session) {
    const orderId = session.metadata?.orderId;

    if (!orderId) {
      return null;
    }

    const order = await this.orders.findById(orderId);

    return order && order.stripeCheckoutSessionId !== null &&
      order.stripeCheckoutSessionId !== session.id
      ? null
      : order;
  }
}
