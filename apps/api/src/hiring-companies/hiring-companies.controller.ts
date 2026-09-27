import {
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
  Post,
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
    return this.hiringCompanies.view(this.requireEmail(request), profileId);
  }

  /** One company of the list, with its record (US-121); 404 otherwise. */
  @Get(":siret")
  async readHiringCompany(
    @Param("profileId") profileId: string,
    @Param("siret") siret: string,
    @Req() request: RequestLike,
  ) {
    const detail = await this.hiringCompanies.detail(
      this.requireEmail(request),
      profileId,
      siret,
    );

    if (!detail) {
      throw new NotFoundException(
        "Cette entreprise ne figure plus parmi celles de votre recherche.",
      );
    }

    return detail;
  }

  /**
   * A spontaneous application to one of the companies listed (US-120). Free:
   * no model runs here, only the CV and the letter cost credits, later.
   */
  @Post(":siret/apply")
  async applySpontaneously(
    @Param("profileId") profileId: string,
    @Param("siret") siret: string,
    @Req() request: RequestLike,
  ) {
    const result = await this.hiringCompanies.applySpontaneously(
      this.requireEmail(request),
      profileId,
      siret,
    );

    if (result.outcome === "not_found") {
      throw new NotFoundException(
        "Cette entreprise ne figure plus parmi celles de votre recherche.",
      );
    }

    return result;
  }

  private requireEmail(request: RequestLike): string {
    const session = this.authService.readSessionFromCookieHeader(
      request.headers.cookie,
    );

    if (!session) {
      throw new UnauthorizedException("A valid session is required.");
    }

    return session.email;
  }
}
