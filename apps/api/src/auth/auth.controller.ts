import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Inject,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
} from "@nestjs/common";
import { AuthMailerService } from "./auth-mailer.service";
import { AuthService } from "./auth.service";

type CookieResponse = {
  cookie: (name: string, value: string, options: object) => void;
  redirect: (statusCode: number, url: string) => unknown;
};

type RequestLike = {
  headers: {
    cookie?: string;
  };
};

@Controller("auth")
export class AuthController {
  constructor(
    @Inject(AuthService) private readonly authService: AuthService,
    @Inject(AuthMailerService) private readonly authMailer: AuthMailerService,
  ) {}

  @Post("passwordless/request")
  async requestMagicLink(
    @Body() body: { consentAccepted?: boolean; email?: string },
  ) {
    const result = this.authService.requestMagicLink(
      body.email ?? "",
      body.consentAccepted === true,
    );

    await this.authMailer.sendMagicLinkEmail(result);

    return {
      email: result.email,
      expiresAt: result.expiresAt,
      sessionDurationDays: result.sessionDurationDays,
    };
  }

  @Get("email/health")
  getEmailHealth() {
    return this.authMailer.getHealth();
  }

  @Post("invitations")
  createInvitation(
    @Body() body: { email?: string; role?: string },
    @Req() request: RequestLike,
  ) {
    return this.authService.createInvitation(
      request.headers.cookie,
      body.email ?? "",
      body.role,
    );
  }

  @Get("invitations/preview")
  previewInvitation(@Query("token") token: string) {
    return this.authService.previewInvitation(token);
  }

  @Post("invitations/consume")
  consumeInvitation(
    @Body() body: { consentAccepted?: boolean; token?: string },
    @Res({ passthrough: true }) response: CookieResponse,
  ) {
    const result = this.authService.consumeInvitation(
      body.token ?? "",
      body.consentAccepted === true,
    );

    response.cookie(result.cookie.name, result.cookie.value, result.cookie.options);

    return {
      session: result.session,
    };
  }

  @Get("passwordless/consume")
  consumeMagicLink(
    @Query("token") token: string,
    @Query("redirectTo") redirectTo: string | undefined,
    @Res() response: CookieResponse,
  ) {
    const result = this.authService.consumeMagicLink(token, redirectTo);

    response.cookie(result.cookie.name, result.cookie.value, result.cookie.options);

    return response.redirect(302, result.redirectUrl);
  }

  @Post("passwordless/consume")
  consumeMagicLinkForApi(
    @Body() body: { token?: string; redirectTo?: string },
    @Res({ passthrough: true }) response: CookieResponse,
  ) {
    const result = this.authService.consumeMagicLink(
      body.token ?? "",
      body.redirectTo,
    );

    response.cookie(result.cookie.name, result.cookie.value, result.cookie.options);

    return {
      session: result.session,
      redirectUrl: result.redirectUrl,
    };
  }

  @Get("session")
  readSession(@Req() request: RequestLike) {
    const session = this.authService.readSessionFromCookieHeader(
      request.headers.cookie,
    );

    if (!session) {
      throw new UnauthorizedException("No valid session is present.");
    }

    return {
      authenticated: true,
      session,
    };
  }

  @Get("session/admin")
  readAdminSession(@Req() request: RequestLike) {
    const session = this.authService.readSessionFromCookieHeader(
      request.headers.cookie,
    );

    if (!session) {
      throw new UnauthorizedException("No valid session is present.");
    }

    if (session.role !== "admin") {
      throw new ForbiddenException("Admin access is required.");
    }

    return {
      authenticated: true,
      session,
    };
  }

  @Post("logout")
  logout(@Res({ passthrough: true }) response: CookieResponse) {
    const cookie = this.authService.clearSessionCookie();

    response.cookie(cookie.name, cookie.value, cookie.options);

    return {
      authenticated: false,
    };
  }
}
