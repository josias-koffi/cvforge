import {
  Controller,
  Delete,
  Get,
  Inject,
  NotFoundException,
  Param,
  Req,
  UnauthorizedException,
} from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import { ProfileCompetencesService } from "./profile-competences.service";
import { ProfilesService } from "./profiles.service";

type RequestLike = {
  headers: { cookie?: string };
};

/** The ROME competences read in a profile's CV (US-125). */
@Controller("profiles/:profileId/rome-competences")
export class ProfileCompetencesController {
  constructor(
    @Inject(ProfileCompetencesService)
    private readonly competences: ProfileCompetencesService,
    @Inject(ProfilesService) private readonly profiles: ProfilesService,
    @Inject(AuthService) private readonly authService: AuthService,
  ) {}

  @Get()
  async listCompetences(
    @Param("profileId") profileId: string,
    @Req() request: RequestLike,
  ) {
    const email = await this.requireOwner(request, profileId);

    return { competences: await this.competences.list(email, profileId) };
  }

  /** Removed for good: the next reading of the CV will not bring it back. */
  @Delete(":code")
  async dismissCompetence(
    @Param("profileId") profileId: string,
    @Param("code") code: string,
    @Req() request: RequestLike,
  ) {
    const email = await this.requireOwner(request, profileId);

    return {
      competences: await this.competences.dismiss(email, profileId, code),
    };
  }

  private async requireOwner(request: RequestLike, profileId: string) {
    const session = this.authService.readSessionFromCookieHeader(
      request.headers.cookie,
    );

    if (!session) {
      throw new UnauthorizedException("A valid session is required.");
    }

    if (!(await this.profiles.findProfile(session.email, profileId))) {
      throw new NotFoundException("Ce profil est introuvable.");
    }

    return session.email;
  }
}
