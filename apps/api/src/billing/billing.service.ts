import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { createHmac, timingSafeEqual } from "node:crypto";
import {
  creditPackIds,
  creditPacks,
  type CreditPackId,
  type CreateCheckoutSessionResponse,
} from "@cvforge/types";
import { CreditsService } from "../credits/credits.service";
import type {
  BillingConfig,
  CreateCheckoutSessionInput,
  StripeWebhookInput,
} from "./billing.types";

type StripeCheckoutSession = {
  amount_total: number | null;
  customer_email: string | null;
  id: string;
  metadata?: Record<string, string | undefined>;
  payment_intent: string | null;
};

type StripeEvent = {
  data: {
    object: StripeCheckoutSession;
  };
  id: string;
  type: string;
};

function isCreditPackId(value: string): value is CreditPackId {
  return (creditPackIds as readonly string[]).includes(value);
}

function parseStripeJson<T>(payload: string, fallbackMessage: string): T {
  try {
    return JSON.parse(payload) as T;
  } catch {
    throw new BadGatewayException(fallbackMessage);
  }
}

function addFormValue(
  form: URLSearchParams,
  key: string,
  value: number | string | undefined,
) {
  if (value === undefined) {
    return;
  }

  form.set(key, String(value));
}

@Injectable()
export class BillingService {
  constructor(
    private readonly config: BillingConfig,
    private readonly creditsService: CreditsService,
  ) {}

  async createCheckoutSession(
    input: CreateCheckoutSessionInput,
  ): Promise<CreateCheckoutSessionResponse> {
    this.ensureStripeSecret();

    const pack = creditPacks[input.packId];
    const successUrl = new URL("/dashboard", this.config.appUrl);
    const cancelUrl = new URL("/dashboard", this.config.appUrl);

    successUrl.searchParams.set("billing", "success");
    successUrl.searchParams.set("pack", pack.id);
    successUrl.searchParams.set("session_id", "{CHECKOUT_SESSION_ID}");

    cancelUrl.searchParams.set("billing", "cancelled");
    cancelUrl.searchParams.set("pack", pack.id);

    const form = new URLSearchParams();
    addFormValue(form, "mode", "payment");
    addFormValue(form, "success_url", successUrl.toString());
    addFormValue(form, "cancel_url", cancelUrl.toString());
    addFormValue(form, "client_reference_id", input.userEmail);
    addFormValue(form, "customer_email", input.userEmail);
    addFormValue(form, "payment_method_types[0]", "card");
    addFormValue(form, "line_items[0][quantity]", 1);
    addFormValue(form, "line_items[0][price_data][currency]", pack.currency);
    addFormValue(
      form,
      "line_items[0][price_data][product_data][name]",
      `Pack ${pack.label} CVforge`,
    );
    addFormValue(
      form,
      "line_items[0][price_data][product_data][description]",
      `${pack.credits} credits CVforge`,
    );
    addFormValue(
      form,
      "line_items[0][price_data][unit_amount]",
      pack.priceCents,
    );
    addFormValue(form, "metadata[packId]", pack.id);
    addFormValue(form, "metadata[userEmail]", input.userEmail);
    addFormValue(form, "payment_intent_data[metadata][packId]", pack.id);
    addFormValue(
      form,
      "payment_intent_data[metadata][userEmail]",
      input.userEmail,
    );

    const response = await fetch(
      `${this.config.stripeApiBaseUrl}/checkout/sessions`,
      {
        body: form.toString(),
        headers: {
          Authorization: `Bearer ${this.config.stripeSecretKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        method: "POST",
      },
    );

    const payload = await response.text();

    if (!response.ok) {
      const error = parseStripeJson<{ error?: { message?: string } }>(
        payload,
        "Stripe a retourne une reponse invalide lors de la creation du checkout.",
      );
      const message =
        error.error?.message ??
        "La creation de la session de paiement Stripe a echoue.";

      throw new BadGatewayException(message);
    }

    const session = parseStripeJson<{ id?: string; url?: string }>(
      payload,
      "Stripe a retourne une session de checkout invalide.",
    );

    if (
      typeof session.id !== "string" ||
      !session.id ||
      typeof session.url !== "string" ||
      !session.url
    ) {
      throw new BadGatewayException(
        "Stripe n'a pas retourne d'URL de checkout exploitable.",
      );
    }

    return {
      checkoutUrl: session.url,
      sessionId: session.id,
    };
  }

  handleWebhook(input: StripeWebhookInput) {
    this.ensureWebhookSecret();

    const event = this.verifyAndParseEvent(input);

    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded":
        return {
          handled: "credited",
          entry: this.recordCheckoutSession(event.data.object),
        };
      case "checkout.session.async_payment_failed":
      case "payment_intent.payment_failed":
        return {
          handled: "payment_failed",
        };
      default:
        return {
          handled: "ignored",
        };
    }
  }

  private verifyAndParseEvent(input: StripeWebhookInput) {
    const signatureHeader = input.signatureHeader?.trim();

    if (!signatureHeader) {
      throw new BadRequestException("Stripe-Signature manquant.");
    }

    const elements = signatureHeader.split(",").map((element) => element.trim());
    const timestamp = elements
      .find((element) => element.startsWith("t="))
      ?.slice(2);
    const signatures = elements
      .filter((element) => element.startsWith("v1="))
      .map((element) => element.slice(3))
      .filter(Boolean);

    if (!timestamp || signatures.length === 0) {
      throw new BadRequestException("Signature Stripe invalide.");
    }

    const currentTimestamp = Math.floor(Date.now() / 1000);
    const timestampNumber = Number.parseInt(timestamp, 10);

    if (!Number.isInteger(timestampNumber)) {
      throw new BadRequestException("Horodatage Stripe invalide.");
    }

    if (
      Math.abs(currentTimestamp - timestampNumber) >
      this.config.webhookToleranceSeconds
    ) {
      throw new BadRequestException("Signature Stripe expiree.");
    }

    const expectedSignature = createHmac(
      "sha256",
      this.config.stripeWebhookSecret,
    )
      .update(`${timestamp}.${input.payload}`, "utf8")
      .digest("hex");

    const expectedBuffer = Buffer.from(expectedSignature, "hex");
    const valid = signatures.some((signature) => {
      try {
        const candidateBuffer = Buffer.from(signature, "hex");
        return (
          candidateBuffer.length === expectedBuffer.length &&
          timingSafeEqual(candidateBuffer, expectedBuffer)
        );
      } catch {
        return false;
      }
    });

    if (!valid) {
      throw new BadRequestException("Verification de signature Stripe echouee.");
    }

    return parseStripeJson<StripeEvent>(
      input.payload,
      "Le payload du webhook Stripe est invalide.",
    );
  }

  private recordCheckoutSession(session: StripeCheckoutSession) {
    const metadata = session.metadata ?? {};
    const packId = metadata.packId ?? "";
    const userEmail = (metadata.userEmail ?? session.customer_email ?? "")
      .trim()
      .toLowerCase();

    if (!isCreditPackId(packId)) {
      throw new BadRequestException("Le pack Stripe recu est inconnu.");
    }

    if (!userEmail) {
      throw new BadRequestException(
        "L'email utilisateur est manquant dans la session Stripe.",
      );
    }

    if (typeof session.id !== "string" || !session.id) {
      throw new BadRequestException("La session Stripe ne contient pas d'identifiant.");
    }

    const pack = creditPacks[packId];

    return this.creditsService.recordStripePurchase({
      amountCents: session.amount_total ?? pack.priceCents,
      credits: pack.credits,
      packId,
      stripeCheckoutSessionId: session.id,
      stripePaymentIntentId: session.payment_intent,
      userEmail,
    });
  }

  private ensureStripeSecret() {
    if (!this.config.stripeSecretKey) {
      throw new ServiceUnavailableException(
        "Stripe n'est pas configure: STRIPE_SECRET_KEY manquant.",
      );
    }
  }

  private ensureWebhookSecret() {
    if (!this.config.stripeWebhookSecret) {
      throw new ServiceUnavailableException(
        "Stripe n'est pas configure: STRIPE_WEBHOOK_SECRET manquant.",
      );
    }
  }
}
