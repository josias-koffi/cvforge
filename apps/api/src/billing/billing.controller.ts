import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Post,
  Req,
} from "@nestjs/common";
import type { CreateCheckoutSessionRequest } from "@cvforge/types";
import { AuthService } from "../auth/auth.service";
import { requireSession, type CookieRequest } from "../auth/request-session";
import { CheckoutService } from "./checkout.service";
import { StripeWebhookService } from "./stripe-webhook.service";

type StripeWebhookRequest = {
  headers: { "stripe-signature"?: string };
  rawBody?: Buffer;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Controller("billing")
export class BillingController {
  constructor(
    @Inject(CheckoutService) private readonly checkout: CheckoutService,
    @Inject(StripeWebhookService) private readonly webhooks: StripeWebhookService,
    @Inject(AuthService) private readonly authService: AuthService,
  ) {}

  @Post("checkout-sessions")
  createCheckoutSession(
    @Body() body: Partial<CreateCheckoutSessionRequest>,
    @Req() request: CookieRequest,
  ) {
    const session = requireSession(this.authService, request);
    const offerId = typeof body?.offerId === "string" ? body.offerId : "";

    if (!UUID_PATTERN.test(offerId)) {
      throw new BadRequestException("L'offre demandee est invalide.");
    }

    return this.checkout.createCheckoutSession({ offerId, userEmail: session.email });
  }

  /**
   * Whether credits can be bought right now. A boolean on purpose: a buyer has
   * no business knowing our provider's balance (US-085).
   */
  @Get("purchase-availability")
  async readPurchaseAvailability(@Req() request: CookieRequest) {
    requireSession(this.authService, request);

    return this.checkout.readPurchaseAvailability();
  }

  @Get("orders/me")
  async listMyOrders(@Req() request: CookieRequest) {
    const session = requireSession(this.authService, request);

    return { orders: await this.checkout.listOrdersForUser(session.email) };
  }

  @Post("stripe/webhook")
  @HttpCode(200)
  handleStripeWebhook(@Req() request: StripeWebhookRequest) {
    return this.webhooks.handle(request.rawBody, request.headers["stripe-signature"]);
  }
}
