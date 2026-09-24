import {
  Controller,
  Get,
  Inject,
  Param,
  Req,
  UnauthorizedException,
} from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import { HiringCompaniesService } from "./hiring-companies.service";

type RequestLike = {
  headers: { cookie?: string };
};

/**
 * "Entreprises qui recrutent" (US-119). Reads the weekly copy only: showing
 * the page never calls France Travail.
 */
@Controller("profiles/:profileId/hiring-companies")
export class HiringCompaniesController {
  constructor(
    @Inject(HiringCompaniesService)
    private readonly hiringCompanies: HiringCompaniesService,
    @Inject(AuthService) private readonly authService: AuthService,
  ) {}

  /** Scoped to the session's e-mail: another's profile reads as no search. */
  @Get()
  async readHiringCompanies(
    @Param("profileId") profileId: string,
    @Req() request: RequestLike,
  ) {
    const session = this.authService.readSessionFromCookieHeader(
      request.headers.cookie,
    );

    if (!session) {
      throw new UnauthorizedException("A valid session is required.");
    }

    return this.hiringCompanies.view(session.email, profileId);
  }
}
