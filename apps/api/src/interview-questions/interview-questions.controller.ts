import { Body, Controller, HttpCode, Inject, Post } from "@nestjs/common";
import type { PublicInterviewQuestionsResponse } from "@cvforge/types";
import { acceptedOfferText } from "../ats/ats.validation";
import { LeadCaptureService } from "../leads/lead-capture.service";
import { InterviewQuestionsService } from "./interview-questions.service";

/**
 * The free "likely interview questions" tool (US-141). No session: a visitor
 * tries it before signing up. Both routes are metered by
 * `RateLimitMiddleware`, the questions under a daily budget since each one
 * is a model call.
 */
@Controller("public/interview-questions")
export class PublicInterviewQuestionsController {
  constructor(
    @Inject(InterviewQuestionsService)
    private readonly questions: InterviewQuestionsService,
    @Inject(LeadCaptureService) private readonly leads: LeadCaptureService,
  ) {}

  @Post()
  @HttpCode(200)
  generate(
    @Body() body: { offerText?: unknown; locale?: unknown },
  ): Promise<PublicInterviewQuestionsResponse> {
    return this.questions.generate({
      locale: body?.locale,
      offerText: body?.offerText,
    });
  }

  /**
   * "Practise out loud with an AI recruiter": the magic link carries the
   * offer, which becomes an application the interview setup opens on.
   * Answers the same whether the address has an account or not.
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

    await this.leads.sendLink(email, { kind: "interview", offerText });

    return { magicLinkSent: true };
  }
}
