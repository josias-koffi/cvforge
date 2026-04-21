import {
  BadRequestException,
  Body,
  Controller,
  Inject,
  Post,
  Req,
  UnauthorizedException,
} from "@nestjs/common";
import {
  creditPackIds,
  type CreateCheckoutSessionRequest,
} from "@cvforge/types";
import { AuthService } from "../auth/auth.service";
import { BillingService } from "./billing.service";

type BillingRequest = {
  headers: {
    cookie?: string;
    "stripe-signature"?: string;
  };
  rawBody?: Buffer;
};

function isCreditPackId(value: string): value is CreateCheckoutSessionRequest["packId"] {
  return (creditPackIds as readonly string[]).includes(value);
}

@Controller("billing")
export class BillingController {
  constructor(
    @Inject(BillingService) private readonly billingService: BillingService,
    @Inject(AuthService) private readonly authService: AuthService,
  ) {}

  @Post("checkout-sessions")
  createCheckoutSession(
    @Body() body: Partial<CreateCheckoutSessionRequest>,
    @Req() request: BillingRequest,
  ) {
    const session = this.authService.readSessionFromCookieHeader(
      request.headers.cookie,
    );

    if (!session) {
      throw new UnauthorizedException("A valid session is required.");
    }

    const packId = typeof body.packId === "string" ? body.packId : "";

    if (!isCreditPackId(packId)) {
      throw new BadRequestException("Le pack demande est invalide.");
    }

    return this.billingService.createCheckoutSession({
      packId,
      userEmail: session.email,
    });
  }

  @Post("stripe/webhook")
  handleStripeWebhook(@Req() request: BillingRequest) {
    return this.billingService.handleWebhook({
      payload: request.rawBody?.toString("utf8") ?? "",
      signatureHeader: request.headers["stripe-signature"],
    });
  }
}
