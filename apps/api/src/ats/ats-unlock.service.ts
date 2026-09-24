import { publicError } from "@cvforge/types";
import type { AtsScoreResult } from "@cvforge/ats-score";
import {
  GoneException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { LeadCaptureService } from "../leads/lead-capture.service";
import { ATS_SCAN_STORE, type AtsScanStore } from "./ats.types";

export {
  CONSENT_REQUIRED_MESSAGE,
  INVALID_EMAIL_MESSAGE,
} from "../leads/lead-capture.service";
export const SCAN_EXPIRED_MESSAGE =
  "Cette analyse a expire. Relancez une analyse pour obtenir un nouveau rapport.";

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
 * on this same report inside the app (`LeadCaptureService`, US-133).
 */
@Injectable()
export class AtsUnlockService {
  constructor(
    @Inject(ATS_SCAN_STORE) private readonly store: AtsScanStore,
    private readonly leads: Pick<
      LeadCaptureService,
      "acceptedEmail" | "sendLink"
    >,
    private readonly now: () => number = Date.now,
  ) {}

  async unlock(request: UnlockRequest): Promise<AtsUnlockResponse> {
    const email = this.leads.acceptedEmail(request);

    const scan = await this.store.findById(request.scanId);

    if (!scan) {
      throw new NotFoundException(
        publicError("SCAN_NOT_FOUND", "Analyse introuvable."),
      );
    }

    if (new Date(scan.expiresAt).getTime() <= this.now()) {
      throw new GoneException(
        publicError("SCAN_EXPIRED", SCAN_EXPIRED_MESSAGE),
      );
    }

    // Null when it was already unlocked: the store only lets the first write
    // through, so a replay returns the report without moving the address the
    // report was released to.
    await this.store.unlock(
      request.scanId,
      email,
      new Date(this.now()).toISOString(),
    );

    await this.leads.sendLink(email, { kind: "ats_scan", scanId: scan.id });

    return { magicLinkSent: true, result: scan.result, scanId: scan.id };
  }
}
