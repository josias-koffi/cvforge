import type { AtsScoreResult } from "@cvforge/ats-score";
import {
  BadRequestException,
  GoneException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { AuthMailerService } from "../auth/auth-mailer.service";
import type { AuthService } from "../auth/auth.service";
import { ATS_SCAN_STORE, type AtsScanStore } from "./ats.types";

export const CONSENT_REQUIRED_MESSAGE =
  "Vous devez accepter les conditions pour recevoir votre rapport.";
export const INVALID_EMAIL_MESSAGE = "Une adresse email valide est requise.";
export const SCAN_EXPIRED_MESSAGE =
  "Cette analyse a expire. Relancez une analyse pour obtenir un nouveau rapport.";

const EMAIL = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

export type UnlockRequest = {
  scanId: string;
  email: string;
  consentAccepted: boolean;
};

export type AtsUnlockResponse = {
  scanId: string;
  result: AtsScoreResult;
  /** Always true — the caller is told a link was sent, never whether an account existed. */
  magicLinkSent: boolean;
};

/**
 * Trades an email address for the full report.
 *
 * The report is returned **in the response**, not by email: sending the visitor
 * to their inbox to see what they just asked for loses most of them. The magic
 * link goes out alongside it and does the acquisition — it lands them signed in,
 * which is why no new auth mechanism exists here.
 */
@Injectable()
export class AtsUnlockService {
  constructor(
    @Inject(ATS_SCAN_STORE) private readonly store: AtsScanStore,
    private readonly authService: Pick<AuthService, "requestMagicLink">,
    private readonly authMailer: Pick<AuthMailerService, "sendMagicLinkEmail">,
    private readonly now: () => number = Date.now,
  ) {}

  async unlock(request: UnlockRequest): Promise<AtsUnlockResponse> {
    const email = request.email.trim().toLowerCase();

    if (!EMAIL.test(email)) {
      throw new BadRequestException(INVALID_EMAIL_MESSAGE);
    }

    // Sending the link creates an account, so the same explicit consent the
    // login form asks for is required here.
    if (!request.consentAccepted) {
      throw new BadRequestException(CONSENT_REQUIRED_MESSAGE);
    }

    const scan = await this.store.findById(request.scanId);

    if (!scan) {
      throw new NotFoundException("Analyse introuvable.");
    }

    if (new Date(scan.expiresAt).getTime() <= this.now()) {
      throw new GoneException(SCAN_EXPIRED_MESSAGE);
    }

    // Null when it was already unlocked: the store only lets the first write
    // through, so a replay returns the report without moving the address the
    // report was released to.
    await this.store.unlock(
      request.scanId,
      email,
      new Date(this.now()).toISOString(),
    );

    await this.sendMagicLink(email);

    return { magicLinkSent: true, result: scan.result, scanId: scan.id };
  }

  /**
   * Failures are swallowed on purpose, and that is a security property as much
   * as a robustness one: `requestMagicLink` throws 403 for a suspended account
   * and 400 for an unknown one without consent, so propagating would tell an
   * anonymous caller whether an address has an account here. The visitor gets
   * the report either way.
   */
  private async sendMagicLink(email: string) {
    try {
      const result = await this.authService.requestMagicLink(email, true);

      await this.authMailer.sendMagicLinkEmail(result);
    } catch (error: unknown) {
      console.error("[ats] magic link delivery failed", error);
    }
  }
}
