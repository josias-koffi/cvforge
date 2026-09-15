import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Put,
  UnauthorizedException,
  Req,
} from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import { ApplicationsService } from "./applications.service";
import type { OfferUpdateInput } from "./applications.types";

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
    const session = this.requireSession(request);

    return {
      applications: this.applicationsService.listApplications(session.email),
    };
  }

  @Get("summary")
  listSummary(@Req() request: RequestLike) {
    const session = this.requireSession(request);

    return {
      summary: this.applicationsService.listApplicationSummary(session.email),
    };
  }

  @Get(":applicationId")
  getApplication(
    @Param("applicationId") applicationId: string,
    @Req() request: RequestLike,
  ) {
    const session = this.requireSession(request);

    return {
      application: this.applicationsService.getApplicationForUser(
        session.email,
        applicationId,
      ),
    };
  }

  @Get(":applicationId/offer")
  getOffer(
    @Param("applicationId") applicationId: string,
    @Req() request: RequestLike,
  ) {
    const session = this.requireSession(request);

    return this.applicationsService.getOfferForUser(
      session.email,
      applicationId,
    );
  }

  @Patch(":applicationId")
  updateOffer(
    @Param("applicationId") applicationId: string,
    @Body() body: OfferUpdateInput,
    @Req() request: RequestLike,
  ) {
    const session = this.requireSession(request);

    return {
      application: this.applicationsService.updateOffer(
        session.email,
        applicationId,
        body ?? {},
      ),
    };
  }

  @Post(":applicationId/re-extract")
  async reExtractOffer(
    @Param("applicationId") applicationId: string,
    @Body() body: { source?: string },
    @Req() request: RequestLike,
  ) {
    const session = this.requireSession(request);

    return {
      application: await this.applicationsService.reExtractOffer(
        session.email,
        applicationId,
        body.source ?? "",
      ),
    };
  }

  @Post("import-from-url")
  async importFromUrl(
    @Body() body: { url?: string },
    @Req() request: RequestLike,
  ) {
    const session = this.requireSession(request);

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
    const session = this.requireSession(request);

    return {
      application: await this.applicationsService.importFromText(
        session.email,
        body.offerText ?? "",
      ),
    };
  }

  @Put(":applicationId/profile")
  setProfile(
    @Param("applicationId") applicationId: string,
    @Body() body: { profileId?: string | null },
    @Req() request: RequestLike,
  ) {
    const session = this.requireSession(request);

    return {
      application: this.applicationsService.setProfile(
        session.email,
        applicationId,
        body?.profileId,
      ),
    };
  }

  @Post(":applicationId/status")
  updateStatus(
    @Param("applicationId") applicationId: string,
    @Body() body: { status?: string },
    @Req() request: RequestLike,
  ) {
    const session = this.requireSession(request);

    return {
      application: this.applicationsService.updateStatus(
        session.email,
        applicationId,
        body.status ?? "",
      ),
    };
  }

  private requireSession(request: RequestLike) {
    const session = this.authService.readSessionFromCookieHeader(
      request.headers.cookie,
    );

    if (!session) {
      throw new UnauthorizedException("A valid session is required.");
    }

    return session;
  }
}
