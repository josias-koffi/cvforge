import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  UnauthorizedException,
  Req,
} from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import { ApplicationsService } from "./applications.service";

type RequestLike = {
  headers: {
    cookie?: string;
  };
};

@Controller("applications")
export class ApplicationsController {
  constructor(
    @Inject(ApplicationsService)
    private readonly applicationsService: ApplicationsService,
    @Inject(AuthService) private readonly authService: AuthService,
  ) {}

  @Get()
  listApplications(@Req() request: RequestLike) {
    const session = this.authService.readSessionFromCookieHeader(
      request.headers.cookie,
    );

    if (!session) {
      throw new UnauthorizedException("A valid session is required.");
    }

    return {
      applications: this.applicationsService.listApplications(session.email),
    };
  }

  @Get("summary")
  listSummary(@Req() request: RequestLike) {
    const session = this.authService.readSessionFromCookieHeader(
      request.headers.cookie,
    );

    if (!session) {
      throw new UnauthorizedException("A valid session is required.");
    }

    return {
      summary: this.applicationsService.listApplicationSummary(session.email),
    };
  }

  @Post("import-from-url")
  async importFromUrl(
    @Body() body: { url?: string },
    @Req() request: RequestLike,
  ) {
    const session = this.authService.readSessionFromCookieHeader(
      request.headers.cookie,
    );

    if (!session) {
      throw new UnauthorizedException("A valid session is required.");
    }

    return {
      application: await this.applicationsService.importFromUrl(
        session.email,
        body.url ?? "",
      ),
    };
  }

  @Post("import-from-text")
  async importFromText(
    @Body() body: { offerText?: string },
    @Req() request: RequestLike,
  ) {
    const session = this.authService.readSessionFromCookieHeader(
      request.headers.cookie,
    );

    if (!session) {
      throw new UnauthorizedException("A valid session is required.");
    }

    return {
      application: await this.applicationsService.importFromText(
        session.email,
        body.offerText ?? "",
      ),
    };
  }

  @Post(":applicationId/status")
  updateStatus(
    @Param("applicationId") applicationId: string,
    @Body() body: { status?: string },
    @Req() request: RequestLike,
  ) {
    const session = this.authService.readSessionFromCookieHeader(
      request.headers.cookie,
    );

    if (!session) {
      throw new UnauthorizedException("A valid session is required.");
    }

    return {
      application: this.applicationsService.updateStatus(
        session.email,
        applicationId,
        body.status ?? "",
      ),
    };
  }
}
