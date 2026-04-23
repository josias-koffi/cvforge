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
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type {
  CvContentUpdateRequest,
  CvGenerationRequest,
  LetterContentUpdateRequest,
  LetterGenerationRequest,
} from "@cvforge/types";
import { AuthService } from "../auth/auth.service";
import { CvImportService, type CvImportFile } from "./cv-import.service";
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
    @Inject(CvImportService)
    private readonly cvImportService: CvImportService,
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

  @Post("cv-import/extract")
  @UseInterceptors(
    FileInterceptor("cvFile", {
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async extractCvProfile(
    @UploadedFile() file: CvImportFile | undefined,
    @Req() request: RequestLike,
  ) {
    const session = this.authService.readSessionFromCookieHeader(
      request.headers.cookie,
    );

    if (!session) {
      throw new UnauthorizedException("A valid session is required.");
    }

    return this.cvImportService.extractProfileFromCv(session.email, file);
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

  @Get(":applicationId/cv/versions")
  listCvVersions(
    @Param("applicationId") applicationId: string,
    @Req() request: RequestLike,
  ) {
    const session = this.authService.readSessionFromCookieHeader(
      request.headers.cookie,
    );

    if (!session) {
      throw new UnauthorizedException("A valid session is required.");
    }

    return {
      versions: this.cvGenerationService.listCvVersions(
        session.email,
        applicationId,
      ),
    };
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

  @Get(":applicationId/letter/versions")
  listLetterVersions(
    @Param("applicationId") applicationId: string,
    @Req() request: RequestLike,
  ) {
    const session = this.authService.readSessionFromCookieHeader(
      request.headers.cookie,
    );

    if (!session) {
      throw new UnauthorizedException("A valid session is required.");
    }

    return {
      versions: this.cvGenerationService.listLetterVersions(
        session.email,
        applicationId,
      ),
    };
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

  @Get(":applicationId/cv/docx")
  @Header(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  )
  async exportDocx(
    @Param("applicationId") applicationId: string,
    @Req() request: RequestLike,
  ) {
    const session = this.authService.readSessionFromCookieHeader(
      request.headers.cookie,
    );

    if (!session) {
      throw new UnauthorizedException("A valid session is required.");
    }

    const { docx, filename } = await this.cvPdfExportService.exportDocx(
      session.email,
      applicationId,
    );

    return new StreamableFile(docx, {
      disposition: `attachment; filename="${filename}"`,
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
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

  @Get(":applicationId/letter/docx")
  @Header(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  )
  async exportLetterDocx(
    @Param("applicationId") applicationId: string,
    @Req() request: RequestLike,
  ) {
    const session = this.authService.readSessionFromCookieHeader(
      request.headers.cookie,
    );

    if (!session) {
      throw new UnauthorizedException("A valid session is required.");
    }

    const { docx, filename } = await this.cvPdfExportService.exportLetterDocx(
      session.email,
      applicationId,
    );

    return new StreamableFile(docx, {
      disposition: `attachment; filename="${filename}"`,
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
  }
}
