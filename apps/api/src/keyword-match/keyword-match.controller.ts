import {
  Body,
  Controller,
  HttpCode,
  Inject,
  Post,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { PublicKeywordMatchResponse } from "@cvforge/types";
import { MAX_SCAN_BYTES } from "../ats/ats.validation";
import type { CvSourceFile } from "../cv-generation/cv-text-extraction";
import { LeadCaptureService } from "../leads/lead-capture.service";
import {
  acceptedOfferText,
  KeywordMatchService,
} from "./keyword-match.service";

/**
 * The free CV ↔ offer comparator (US-136). No session: a visitor tries it
 * before signing up. Both routes are metered by `RateLimitMiddleware`.
 */
@Controller("public/keyword-match")
export class PublicKeywordMatchController {
  constructor(
    @Inject(KeywordMatchService) private readonly matcher: KeywordMatchService,
    @Inject(LeadCaptureService) private readonly leads: LeadCaptureService,
  ) {}

  @Post()
  @HttpCode(200)
  @UseInterceptors(
    FileInterceptor("cvFile", { limits: { fileSize: MAX_SCAN_BYTES } }),
  )
  match(
    @UploadedFile() file: CvSourceFile | undefined,
    @Body() body: { offerText?: unknown },
  ): Promise<PublicKeywordMatchResponse> {
    return this.matcher.match({ file, offerText: body?.offerText });
  }

  /**
   * "Generate a CV for this offer": the magic link carries the offer, and the
   * application is created when it is redeemed. Answers the same whether the
   * address has an account or not.
   */
  @Post("lead")
  @HttpCode(202)
  async lead(
    @Body()
    body: {
      consentAccepted?: unknown;
      email?: unknown;
      offerText?: unknown;
    },
  ): Promise<{ magicLinkSent: true }> {
    const email = this.leads.acceptedEmail({
      consentAccepted: body?.consentAccepted,
      email: body?.email,
    });
    const offerText = acceptedOfferText(body?.offerText);

    await this.leads.sendLink(email, { kind: "offer", offerText });

    return { magicLinkSent: true };
  }
}
