import {
  Body,
  Controller,
  Get,
  Inject,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import { PrivacyService } from "./privacy.service";

type CookieResponse = {
  cookie: (name: string, value: string, options: object) => void;
};

type RequestLike = {
  headers: {
    cookie?: string;
  };
};

@Controller("privacy")
export class PrivacyController {
  constructor(
    @Inject(PrivacyService) private readonly privacyService: PrivacyService,
    @Inject(AuthService) private readonly authService: AuthService,
  ) {}

  @Get("export")
  exportUserData(@Req() request: RequestLike) {
    const session = this.readSession(request);

    return {
      exportData: this.privacyService.exportUserData(session.email),
    };
  }

  @Get("retention-policy")
  getRetentionPolicy(@Req() request: RequestLike) {
    this.readSession(request);

    return {
      policy: this.privacyService.getRetentionPolicy(),
    };
  }

  @Post("delete-account")
  deleteAccount(
    @Body() body: { confirmationEmail?: string },
    @Req() request: RequestLike,
    @Res({ passthrough: true }) response: CookieResponse,
  ) {
    const session = this.readSession(request);
    const result = this.privacyService.deleteUserData(
      session.email,
      body.confirmationEmail ?? "",
    );
    const cookie = this.authService.clearSessionCookie();

    response.cookie(cookie.name, cookie.value, cookie.options);

    return {
      result,
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
}
