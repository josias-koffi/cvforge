import {
  Body,
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
  Post,
  UnauthorizedException,
  Req,
} from "@nestjs/common";
import type { CvGenerationRequest } from "@cvforge/types";
import { AuthService } from "../auth/auth.service";
import { CvGenerationService } from "./cv-generation.service";

type RequestLike = {
  headers: { cookie?: string };
};

@Controller("applications")
export class CvGenerationController {
  constructor(
    @Inject(CvGenerationService)
    private readonly cvGenerationService: CvGenerationService,
    @Inject(AuthService) private readonly authService: AuthService,
  ) {}

  @Post(":applicationId/generate-cv")
  async generateCv(
    @Param("applicationId") applicationId: string,
    @Body() body: CvGenerationRequest,
    @Req() request: RequestLike,
  ) {
    const session = this.authService.readSessionFromCookieHeader(
      request.headers.cookie,
    );

    if (!session) {
      throw new UnauthorizedException("A valid session is required.");
    }

    const cvContent = await this.cvGenerationService.generateCv(
      session.email,
      applicationId,
      body,
    );

    return { cvContent };
  }

  @Get(":applicationId/cv")
  getCvContent(
    @Param("applicationId") applicationId: string,
    @Req() request: RequestLike,
  ) {
    const session = this.authService.readSessionFromCookieHeader(
      request.headers.cookie,
    );

    if (!session) {
      throw new UnauthorizedException("A valid session is required.");
    }

    const cvContent = this.cvGenerationService.getCvContent(
      session.email,
      applicationId,
    );

    if (!cvContent) {
      throw new NotFoundException("Aucun CV généré pour cette candidature.");
    }

    return { cvContent };
  }
}
