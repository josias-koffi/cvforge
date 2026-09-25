import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Query,
  Req,
} from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import {
  requireAdminSession,
  requireSession,
  type CookieRequest,
} from "../auth/request-session";
import { AdminAuditService } from "../admin/admin-audit.service";
import { buildAdminUserDirectory } from "./admin-user-directory";
import { CreditsService } from "./credits.service";

@Controller("credits")
export class CreditsController {
  constructor(
    @Inject(CreditsService)
    private readonly creditsService: CreditsService,
    @Inject(AuthService) private readonly authService: AuthService,
    @Inject(AdminAuditService) private readonly audit: AdminAuditService,
  ) {}

  @Get("me")
  async getMyCredits(@Req() request: CookieRequest) {
    const session = requireSession(this.authService, request);

    return {
      credits: await this.creditsService.getBalanceSummaryForUser(
        session.email,
      ),
    };
  }

  @Get("me/history")
  async getMyHistory(
    @Query("page") page: string | undefined,
    @Query("pageSize") pageSize: string | undefined,
    @Query("kind") kind: string | undefined,
    @Req() request: CookieRequest,
  ) {
    const session = requireSession(this.authService, request);

    return this.creditsService.getHistoryPageForUser(session.email, {
      kind,
      page,
      pageSize,
    });
  }

  @Get("users/:userEmail")
  async getUserCredits(
    @Param("userEmail") userEmail: string,
    @Req() request: CookieRequest,
  ) {
    const session = requireAdminSession(this.authService, request);

    return {
      requestedBy: session.email,
      credits: await this.creditsService.getSummaryForUser(
        userEmail.trim().toLowerCase(),
      ),
    };
  }

  @Get("admin/users")
  async listAdminUsers(
    @Query("page") pageValue: string | undefined,
    @Query("pageSize") pageSizeValue: string | undefined,
    @Query("query") queryValue: string | undefined,
    @Query("role") roleValue: string | undefined,
    @Req() request: CookieRequest,
  ) {
    const session = requireAdminSession(this.authService, request);

    return {
      ...(await buildAdminUserDirectory(
        await this.authService.listAccounts(),
        this.creditsService,
        {
          maxPageSize: 20,
          page: pageValue,
          pageSize: pageSizeValue,
          query: queryValue,
          role: roleValue,
        },
      )),
      requestedBy: session.email,
    };
  }

  @Post("admin/grants")
  async grantCredits(
    @Body() body: { credits?: number; note?: string; userEmail?: string },
    @Req() request: CookieRequest,
  ) {
    const session = requireAdminSession(this.authService, request);
    const userEmail = (body.userEmail ?? "").trim().toLowerCase();
    const credits = body.credits ?? 0;
    const note = body.note ?? "";
    // The service validates the amount and the mandatory note, so the audit
    // entry is written only once the grant actually happened.
    const entry = await this.creditsService.grantCredits({
      adminEmail: session.email,
      credits,
      note,
      userEmail,
    });

    await this.audit.recordCreditGrant({
      actorEmail: session.email,
      credits,
      note,
      targetEmail: userEmail,
    });

    return { entry };
  }
}
