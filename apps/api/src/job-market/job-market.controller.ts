import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Post,
  Query,
} from "@nestjs/common";
import type { PublicJobMarketResponse } from "@cvforge/types";
import { ToolQueriesService } from "../acquisition/tool-queries.service";
import { LeadCaptureService } from "../leads/lead-capture.service";
import { JobMarketService } from "./job-market.service";

/**
 * The free "does this job hire near me?" tool (US-137). No session: a visitor
 * tries it before signing up. Every route is metered by `RateLimitMiddleware`.
 */
@Controller("public/job-market")
export class PublicJobMarketController {
  constructor(
    @Inject(JobMarketService) private readonly jobMarket: JobMarketService,
    @Inject(LeadCaptureService) private readonly leads: LeadCaptureService,
    @Inject(ToolQueriesService) private readonly queries: ToolQueriesService,
  ) {}

  /** The job autocomplete, from the local ROME copy. */
  @Get("appellations")
  async suggest(@Query("q") query: unknown) {
    return { appellations: await this.jobMarket.suggest(query) };
  }

  @Get()
  async read(
    @Query("appellation") appellation: unknown,
    @Query("department") department: unknown,
  ): Promise<PublicJobMarketResponse> {
    const response = await this.jobMarket.read({ appellation, department });
    this.queries.countJob(response);
    return response;
  }

  /**
   * "Receive this job's offers every morning": the magic link carries the job
   * and the department, and the search is written when it is redeemed.
   * Answers the same whether the address has an account or not.
   */
  @Post("lead")
  @HttpCode(202)
  async lead(
    @Body()
    body: {
      appellation?: unknown;
      consentAccepted?: unknown;
      department?: unknown;
      email?: unknown;
    },
  ): Promise<{ magicLinkSent: true }> {
    const email = this.leads.acceptedEmail({
      consentAccepted: body?.consentAccepted,
      email: body?.email,
    });
    const { appellation, department } = await this.jobMarket.accept({
      appellation: body?.appellation,
      department: body?.department,
    });

    await this.leads.sendLink(email, {
      appellationCode: appellation.code,
      department,
      kind: "job_search",
    });

    return { magicLinkSent: true };
  }
}
