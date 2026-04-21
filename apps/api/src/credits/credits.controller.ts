import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Inject,
  Param,
  Post,
  Req,
  UnauthorizedException,
} from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import { CreditsService } from "./credits.service";

type RequestLike = {
  headers: { cookie?: string };
};

@Controller("credits")
export class CreditsController {
  constructor(
    @Inject(CreditsService)
    private readonly creditsService: CreditsService,
    @Inject(AuthService) private readonly authService: AuthService,
  ) {}

  @Get("me")
  getMyCredits(@Req() request: RequestLike) {
    const session = this.readSession(request);

    return {
      credits: this.creditsService.getSummaryForUser(session.email),
    };
  }

  @Get("users/:userEmail")
  getUserCredits(
    @Param("userEmail") userEmail: string,
    @Req() request: RequestLike,
  ) {
    const session = this.readAdminSession(request);

    return {
      requestedBy: session.email,
      credits: this.creditsService.getSummaryForUser(userEmail.trim().toLowerCase()),
    };
  }

  @Post("admin/grants")
  grantCredits(
    @Body() body: { credits?: number; note?: string; userEmail?: string },
    @Req() request: RequestLike,
  ) {
    const session = this.readAdminSession(request);

    return {
      entry: this.creditsService.grantCredits({
        adminEmail: session.email,
        credits: body.credits ?? 0,
        note: body.note ?? "",
        userEmail: (body.userEmail ?? "").trim().toLowerCase(),
      }),
    };
  }

  private readSession(request: RequestLike) {
    const session = this.authService.readSessionFromCookieHeader(
      request.headers.cookie,
    );

    if (!session) {
      throw new UnauthorizedException("A valid session is required.");
    }

    return session;
  }

  private readAdminSession(request: RequestLike) {
    const session = this.readSession(request);

    if (session.role !== "admin") {
      throw new ForbiddenException("Admin access is required.");
    }

    return session;
  }
}
