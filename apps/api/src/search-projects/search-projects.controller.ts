import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Post,
  Put,
  Req,
  UnauthorizedException,
} from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import { SearchProjectsService } from "./search-projects.service";

type RequestLike = {
  headers: { cookie?: string };
};

@Controller("profiles/:profileId/search-project")
export class SearchProjectsController {
  constructor(
    @Inject(SearchProjectsService)
    private readonly searchProjects: SearchProjectsService,
    @Inject(AuthService) private readonly authService: AuthService,
  ) {}

  @Get()
  async getSearchProject(
    @Param("profileId") profileId: string,
    @Req() request: RequestLike,
  ) {
    const email = this.requireEmail(request);

    return {
      rome: await this.searchProjects.listRome(email, profileId),
      searchProject: await this.searchProjects.get(email, profileId),
    };
  }

  @Put()
  async saveSearchProject(
    @Param("profileId") profileId: string,
    @Body() body: { searchProject?: unknown },
    @Req() request: RequestLike,
  ) {
    const email = this.requireEmail(request);
    const searchProject = await this.searchProjects.save(
      email,
      profileId,
      body.searchProject,
    );

    return {
      rome: await this.searchProjects.listRome(email, profileId),
      searchProject,
    };
  }

  /** Confirms a suggested appellation, or one picked from the autocomplete. */
  @Put("rome/:code")
  async confirmRomeAppellation(
    @Param("profileId") profileId: string,
    @Param("code") code: string,
    @Req() request: RequestLike,
  ) {
    const email = this.requireEmail(request);

    return {
      rome: await this.searchProjects.confirmRome(email, profileId, code),
    };
  }

  @Delete("rome/:code")
  async dismissRomeAppellation(
    @Param("profileId") profileId: string,
    @Param("code") code: string,
    @Req() request: RequestLike,
  ) {
    const email = this.requireEmail(request);

    return {
      rome: await this.searchProjects.dismissRome(email, profileId, code),
    };
  }

  @Post("prefill")
  async prefillSearchProject(
    @Param("profileId") profileId: string,
    @Req() request: RequestLike,
  ) {
    const email = this.requireEmail(request);

    return {
      searchProject: await this.searchProjects.prefill(email, profileId),
    };
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
