import { parseLeadIntent, publicError, type LeadIntent } from "@cvforge/types";
import { BadRequestException, Injectable } from "@nestjs/common";
import type { AuthMailerService } from "../auth/auth-mailer.service";
import type { AuthService } from "../auth/auth.service";

export const CONSENT_REQUIRED_MESSAGE =
  "Vous devez accepter les conditions pour recevoir votre rapport.";
export const INVALID_EMAIL_MESSAGE = "Une adresse email valide est requise.";

const EMAIL = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

export type LeadRequest = { email: unknown; consentAccepted: unknown };

/**
 * Turns a free tool's visitor into an account (US-133): an address, an
 * explicit consent, and a magic link carrying what they were doing, so the app
 * opens where the tool left off.
 *
 * In two steps, so a tool can check its own state (a scan that expired, say)
 * between refusing a bad request and sending anything.
 */
@Injectable()
export class LeadCaptureService {
  constructor(
    private readonly authService: Pick<AuthService, "requestMagicLink">,
    private readonly authMailer: Pick<AuthMailerService, "sendMagicLinkEmail">,
  ) {}

  /** The normalised address, or a 400 the visitor can act on. */
  acceptedEmail(request: LeadRequest): string {
    const email =
      typeof request.email === "string"
        ? request.email.trim().toLowerCase()
        : "";

    if (!EMAIL.test(email)) {
      throw new BadRequestException(
        publicError("INVALID_EMAIL", INVALID_EMAIL_MESSAGE),
      );
    }

    // Sending the link creates an account, so the same explicit consent the
    // login form asks for is required here.
    if (request.consentAccepted !== true) {
      throw new BadRequestException(
        publicError("CONSENT_REQUIRED", CONSENT_REQUIRED_MESSAGE),
      );
    }

    return email;
  }

  /**
   * Never throws, and that is a security property as much as a robustness
   * one: `requestMagicLink` refuses a suspended account (403) and an unknown
   * one without consent (400), so propagating would tell an anonymous caller
   * whether an address has an account here.
   */
  async sendLink(email: string, intent: LeadIntent): Promise<void> {
    // Checked again here, whoever built it: tools build intents from visitor
    // input, and an unchecked one would be written to the database. An
    // invalid intent still gets the visitor a plain sign-in link.
    const checked = parseLeadIntent(intent);

    try {
      const link = await this.authService.requestMagicLink(
        email,
        true,
        checked,
      );

      await this.authMailer.sendMagicLinkEmail(link);
    } catch (error: unknown) {
      console.error(
        `[leads] magic link delivery failed (${intent.kind})`,
        error,
      );
    }
  }
}
