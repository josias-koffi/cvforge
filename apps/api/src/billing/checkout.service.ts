import type {
  CreateCheckoutSessionResponse,
  CreditOrder,
} from "@cvforge/types";
import {
  BadGatewayException,
  ServiceUnavailableException,
} from "@nestjs/common";
import type Stripe from "stripe";
import type { CreditOffersService } from "../offers/offers.service";
import type { BillingConfig, CreditOrdersStore } from "./billing.types";

/** Tags our sessions in the Stripe Dashboard (label + 8 random letters). */
export const CHECKOUT_INTEGRATION_IDENTIFIER = "cvspark_credit_packs_qhzmxvtk";

type CheckoutApi = { checkout: { sessions: Pick<Stripe["checkout"]["sessions"], "create"> } };

/** Just enough of `OpenRouterBalanceService` to refuse a sale (US-085). */
type CreditSupplyGuard = { isUnderCriticalThreshold: () => Promise<boolean> };

export class CheckoutService {
  constructor(
    private readonly config: BillingConfig,
    private readonly stripe: CheckoutApi | null,
    private readonly offers: Pick<CreditOffersService, "getPurchasableOffer">,
    private readonly orders: CreditOrdersStore,
    private readonly creditSupply: CreditSupplyGuard | null = null,
  ) {}

  /** Mirrors the guard in `createCheckoutSession`, for the front's banner. */
  async readPurchaseAvailability(): Promise<{
    available: boolean;
    reason: "stripe_unavailable" | "ai_credits_exhausted" | null;
  }> {
    if (!this.stripe) {
      return { available: false, reason: "stripe_unavailable" };
    }

    if (await this.creditSupply?.isUnderCriticalThreshold()) {
      return { available: false, reason: "ai_credits_exhausted" };
    }

    return { available: true, reason: null };
  }

  async createCheckoutSession(input: {
    offerId: string;
    userEmail: string;
  }): Promise<CreateCheckoutSessionResponse> {
    if (!this.stripe) {
      throw new ServiceUnavailableException(
        "Le paiement n'est pas disponible pour le moment.",
      );
    }

    // Refuse before creating an order: selling credits the AI provider can no
    // longer honour would mean refunding, so we stop at the door (US-085).
    if (await this.creditSupply?.isUnderCriticalThreshold()) {
      throw new ServiceUnavailableException(
        "L'achat de credits est momentanement suspendu : notre fournisseur d'IA est a court de credits. Reessayez dans quelques heures, nous rechargeons le compte.",
      );
    }

    const offer = await this.offers.getPurchasableOffer(input.offerId);
    // Snapshot: later edits of the offer never change what this buyer gets.
    const order = await this.orders.createPending({
      credits: offer.credits,
      currency: offer.currency,
      offerId: offer.id,
      offerName: offer.name,
      priceCents: offer.priceCents,
      userEmail: input.userEmail,
    });
    const successUrl = `${this.config.appUrl}/credits?billing=success&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${this.config.appUrl}/credits?billing=cancelled`;

    let session: Stripe.Checkout.Session;

    try {
      session = await this.stripe.checkout.sessions.create(
        {
          cancel_url: cancelUrl,
          client_reference_id: order.id,
          customer_email: input.userEmail,
          integration_identifier: CHECKOUT_INTEGRATION_IDENTIFIER,
          line_items: [{ price: offer.stripePriceId, quantity: 1 }],
          metadata: { offerId: offer.id, orderId: order.id },
          mode: "payment",
          payment_intent_data: { metadata: { offerId: offer.id, orderId: order.id } },
          success_url: successUrl,
        },
        { idempotencyKey: `credit-order-checkout-${order.id}` },
      );
    } catch (error) {
      await this.orders.markUnpaid(order.id, "failed");
      console.error("[billing] checkout session creation failed", error);
      throw new BadGatewayException("La creation du paiement Stripe a echoue.");
    }

    if (!session.url) {
      throw new BadGatewayException("Stripe n'a pas retourne d'URL de paiement.");
    }

    await this.orders.attachCheckoutSession(order.id, session.id);

    return { checkoutUrl: session.url, sessionId: session.id };
  }

  async listOrdersForUser(userEmail: string): Promise<CreditOrder[]> {
    const orders = await this.orders.listForUser(userEmail);

    return orders.map((order) => ({
      createdAt: order.createdAt,
      credits: order.credits,
      currency: order.currency,
      id: order.id,
      offerId: order.offerId,
      offerName: order.offerName,
      paidAt: order.paidAt,
      priceCents: order.priceCents,
      status: order.status,
    }));
  }
}
