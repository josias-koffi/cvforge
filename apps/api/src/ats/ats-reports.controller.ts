import {
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Req,
} from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import { requireSession, type CookieRequest } from "../auth/request-session";
import { AtsReportsService } from "./ats-reports.service";
import type { AtsScanReport, AtsScanSummary } from "./ats.types";

const uuid = new ParseUUIDPipe({ version: "4" });

/** A signed-in user's own ATS reports from the landing (US-133). */
@Controller("ats/scans")
export class AtsReportsController {
  constructor(
    @Inject(AuthService) private readonly authService: AuthService,
    @Inject(AtsReportsService) private readonly reports: AtsReportsService,
  ) {}

  @Get()
  async list(
    @Req() request: CookieRequest,
  ): Promise<{ scans: AtsScanSummary[] }> {
    const { email } = requireSession(this.authService, request);

    return { scans: await this.reports.list(email) };
  }

  @Get(":scanId")
  get(
    @Req() request: CookieRequest,
    @Param("scanId", uuid) scanId: string,
  ): Promise<AtsScanReport> {
    const { email } = requireSession(this.authService, request);

    return this.reports.get(email, scanId);
  }
}
