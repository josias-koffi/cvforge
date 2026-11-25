import {
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
  StreamableFile,
} from "@nestjs/common";
import { Public } from "../../auth/public.decorator";
import { CvPdfExportService } from "../../cv-generation/cv-pdf-export.service";
import { SignedFiles, type SignedFileClaim } from "./signed-files";

const DOCX_TYPE =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/**
 * Downloads behind the links `get_document_download_url` hands out. Public:
 * the signed, single-use link is the credential (ADR-032 §8).
 */
@Controller("mcp/files")
export class McpFilesController {
  constructor(
    @Inject(SignedFiles) private readonly signedFiles: SignedFiles,
    @Inject(CvPdfExportService) private readonly exporter: CvPdfExportService,
  ) {}

  @Public()
  @Get(":token")
  async download(@Param("token") token: string) {
    const claim = this.signedFiles.redeem(token);

    if (!claim) {
      throw new NotFoundException(
        "Lien expiré ou déjà utilisé : demandez-en un nouveau.",
      );
    }

    const { bytes, filename, type } = await this.export(claim);

    return new StreamableFile(bytes, {
      disposition: `attachment; filename="${filename}"`,
      type,
    });
  }

  private async export({
    applicationId,
    format,
    kind,
    userEmail,
  }: SignedFileClaim) {
    if (format === "docx") {
      const { docx, filename } =
        kind === "cv"
          ? await this.exporter.exportDocx(userEmail, applicationId)
          : await this.exporter.exportLetterDocx(userEmail, applicationId);

      return { bytes: docx, filename, type: DOCX_TYPE };
    }

    const { pdf, filename } =
      kind === "cv"
        ? await this.exporter.exportPdf(userEmail, applicationId)
        : await this.exporter.exportLetterPdf(userEmail, applicationId);

    return { bytes: pdf, filename, type: "application/pdf" };
  }
}
