import { Module } from "@nestjs/common";
import { OpenRouterModule, OPENROUTER_SERVICE } from "../ai/openrouter.module";
import { AuthModule } from "../auth/auth.module";
import { resolveApplicationsConfig } from "../applications/applications.config";
import { FileApplicationsStore } from "../applications/applications.store";
import { CreditsModule } from "../credits/credits.module";
import { CreditsService } from "../credits/credits.service";
import { resolveTemplatesConfig } from "../templates/templates.config";
import { FileTemplatesStore } from "../templates/templates.store";
import { CvGenerationController } from "./cv-generation.controller";
import { CvGenerationService } from "./cv-generation.service";
import { CvPdfExportService } from "./cv-pdf-export.service";

@Module({
  imports: [AuthModule, CreditsModule, OpenRouterModule],
  controllers: [CvGenerationController],
  providers: [
    {
      provide: CvGenerationService,
      inject: [OPENROUTER_SERVICE, CreditsService],
      useFactory: (
        openRouterService: ConstructorParameters<typeof CvGenerationService>[1],
        creditsService: ConstructorParameters<typeof CvGenerationService>[2],
      ) =>
        new CvGenerationService(
          new FileApplicationsStore(
            resolveApplicationsConfig(process.env).stateFilePath,
          ),
          openRouterService,
          creditsService,
          new FileTemplatesStore(resolveTemplatesConfig(process.env).stateFilePath),
        ),
    },
    {
      provide: CvPdfExportService,
      useFactory: () =>
        new CvPdfExportService(
          new FileApplicationsStore(
            resolveApplicationsConfig(process.env).stateFilePath,
          ),
        ),
    },
  ],
})
export class CvGenerationModule {}
