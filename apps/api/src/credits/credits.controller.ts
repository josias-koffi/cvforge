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
import { buildAdminUserDirectory } from "./admin-user-directory";
import { CreditsService } from "./credits.service";

@Controller("credits")
export class CreditsController {
  constructor(
    @Inject(CreditsService)
    private readonly creditsService: CreditsService,
    @Inject(AuthService) private readonly authService: AuthService,
  ) {}

  @Get("me")
  async getMyCredits(@Req() request: CookieRequest) {
    const session = requireSession(this.authService, request);

    return {
      credits: await this.creditsService.getSummaryForUser(session.email),
    };
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

    return {
      entry: await this.creditsService.grantCredits({
        adminEmail: session.email,
        credits: body.credits ?? 0,
        note: body.note ?? "",
        userEmail: (body.userEmail ?? "").trim().toLowerCase(),
      }),
    };
  }
}
