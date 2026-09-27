import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  Post,
  Query,
} from "@nestjs/common";
import type {
  PublicCompanyCheckResponse,
  PublicCompanyCheckSearch,
} from "@cvforge/types";
import { ToolQueriesService } from "../acquisition/tool-queries.service";
import { LeadCaptureService } from "../leads/lead-capture.service";
import { CompanyCheckService } from "./company-check.service";

/**
 * The free "check an employer" tool (US-139). No session: a visitor tries it
 * before signing up. Every route is metered by `RateLimitMiddleware`.
 */
@Controller("public/company-check")
export class PublicCompanyCheckController {
  constructor(
    @Inject(CompanyCheckService) private readonly companies: CompanyCheckService,
    @Inject(LeadCaptureService) private readonly leads: LeadCaptureService,
    @Inject(ToolQueriesService) private readonly queries: ToolQueriesService,
  ) {}

  @Get()
  search(@Query("q") query: unknown): Promise<PublicCompanyCheckSearch> {
    return this.companies.search(query);
  }

  /** A company opened, not typed in the search box, is what gets counted. */
  @Get(":siren")
  async read(
    @Param("siren") siren: string,
  ): Promise<PublicCompanyCheckResponse> {
    const response = await this.companies.read(siren);
    this.queries.countCompany(response);
    return response;
  }

  /**
   * "See the companies that hire in your job": the magic link carries the
   * SIREN checked, and opens the list once redeemed. Answers the same
   * whether the address has an account or not.
   */
  @Post("lead")
  @HttpCode(202)
  async lead(
    @Body()
    body: { consentAccepted?: unknown; email?: unknown; siren?: unknown },
  ): Promise<{ magicLinkSent: true }> {
    const email = this.leads.acceptedEmail({
      consentAccepted: body?.consentAccepted,
      email: body?.email,
    });
    const siren = this.companies.acceptSiren(body?.siren);

    await this.leads.sendLink(email, { kind: "company", siren });

    return { magicLinkSent: true };
  }
}
