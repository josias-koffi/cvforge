import {
  Body,
  Controller,
  Get,
  Inject,
  Put,
  Req,
  UnauthorizedException,
} from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import { ProfilesService } from "./profiles.service";
import type { StoredProfileRegistry } from "./profiles.types";

type RequestLike = {
  headers: { cookie?: string };
};

@Controller("profiles")
export class ProfilesController {
  constructor(
    @Inject(ProfilesService) private readonly profilesService: ProfilesService,
    @Inject(AuthService) private readonly authService: AuthService,
  ) {}

  @Get()
  getProfiles(@Req() request: RequestLike) {
    const session = this.authService.readSessionFromCookieHeader(
      request.headers.cookie,
    );

    if (!session) {
      throw new UnauthorizedException("A valid session is required.");
    }

    return { registry: this.profilesService.getRegistry(session.email) };
  }

  @Put()
  saveProfiles(
    @Body() body: { registry?: StoredProfileRegistry },
    @Req() request: RequestLike,
  ) {
    const session = this.authService.readSessionFromCookieHeader(
      request.headers.cookie,
    );

    if (!session) {
      throw new UnauthorizedException("A valid session is required.");
    }

    if (
      !body.registry ||
      typeof body.registry !== "object" ||
      !Array.isArray(body.registry.profiles)
    ) {
      return { registry: this.profilesService.getRegistry(session.email) };
    }

    return {
      registry: this.profilesService.saveRegistry(session.email, body.registry),
    };
  }
}
