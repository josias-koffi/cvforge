import {
  Body,
  Controller,
  Header,
  Get,
  Inject,
  NotFoundException,
  Param,
  Put,
  Post,
  StreamableFile,
  UnauthorizedException,
  Req,
} from "@nestjs/common";
import type {
  CvContentUpdateRequest,
  CvGenerationRequest,
  LetterContentUpdateRequest,
  LetterGenerationRequest,
} from "@cvforge/types";
import { AuthService } from "../auth/auth.service";
import { CvPdfExportService } from "./cv-pdf-export.service";
import { CvGenerationService } from "./cv-generation.service";

type RequestLike = {
  headers: { cookie?: string };
};

@Controller("applications")
export class CvGenerationController {
  constructor(
    @Inject(CvGenerationService)
    private readonly cvGenerationService: CvGenerationService,
    @Inject(CvPdfExportService)
    private readonly cvPdfExportService: CvPdfExportService,
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

  @Post(":applicationId/generate-letter")
  async generateLetter(
    @Param("applicationId") applicationId: string,
    @Body() body: LetterGenerationRequest,
    @Req() request: RequestLike,
  ) {
    const session = this.authService.readSessionFromCookieHeader(
      request.headers.cookie,
    );

    if (!session) {
      throw new UnauthorizedException("A valid session is required.");
    }

    const letterContent = await this.cvGenerationService.generateLetter(
      session.email,
      applicationId,
      body,
    );

    return { letterContent };
  }

  @Put(":applicationId/cv")
  updateCvContent(
    @Param("applicationId") applicationId: string,
    @Body() body: CvContentUpdateRequest,
    @Req() request: RequestLike,
  ) {
    const session = this.authService.readSessionFromCookieHeader(
      request.headers.cookie,
    );

    if (!session) {
      throw new UnauthorizedException("A valid session is required.");
    }

    const cvContent = this.cvGenerationService.updateCvContent(
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

  @Put(":applicationId/letter")
  updateLetterContent(
    @Param("applicationId") applicationId: string,
    @Body() body: LetterContentUpdateRequest,
    @Req() request: RequestLike,
  ) {
    const session = this.authService.readSessionFromCookieHeader(
      request.headers.cookie,
    );

    if (!session) {
      throw new UnauthorizedException("A valid session is required.");
    }

    const letterContent = this.cvGenerationService.updateLetterContent(
      session.email,
      applicationId,
      body,
    );

    return { letterContent };
  }

  @Get(":applicationId/letter")
  getLetterContent(
    @Param("applicationId") applicationId: string,
    @Req() request: RequestLike,
  ) {
    const session = this.authService.readSessionFromCookieHeader(
      request.headers.cookie,
    );

    if (!session) {
      throw new UnauthorizedException("A valid session is required.");
    }

    const letterContent = this.cvGenerationService.getLetterContent(
      session.email,
      applicationId,
    );

    if (!letterContent) {
      throw new NotFoundException("Aucune lettre générée pour cette candidature.");
    }

    return { letterContent };
  }

  @Get(":applicationId/cv/pdf")
  @Header("Content-Type", "application/pdf")
  async exportPdf(
    @Param("applicationId") applicationId: string,
    @Req() request: RequestLike,
  ) {
    const session = this.authService.readSessionFromCookieHeader(
      request.headers.cookie,
    );

    if (!session) {
      throw new UnauthorizedException("A valid session is required.");
    }

    const { filename, pdf } = await this.cvPdfExportService.exportPdf(
      session.email,
      applicationId,
    );

    return new StreamableFile(pdf, {
      disposition: `attachment; filename="${filename}"`,
      type: "application/pdf",
    });
  }

  @Get(":applicationId/letter/pdf")
  @Header("Content-Type", "application/pdf")
  async exportLetterPdf(
    @Param("applicationId") applicationId: string,
    @Req() request: RequestLike,
  ) {
    const session = this.authService.readSessionFromCookieHeader(
      request.headers.cookie,
    );

    if (!session) {
      throw new UnauthorizedException("A valid session is required.");
    }

    const { filename, pdf } = await this.cvPdfExportService.exportLetterPdf(
      session.email,
      applicationId,
    );

    return new StreamableFile(pdf, {
      disposition: `attachment; filename="${filename}"`,
      type: "application/pdf",
    });
  }
}
