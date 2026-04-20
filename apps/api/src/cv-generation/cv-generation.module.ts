import { Module } from "@nestjs/common";
import { OpenRouterModule, OPENROUTER_SERVICE } from "../ai/openrouter.module";
import { AuthModule } from "../auth/auth.module";
import { resolveApplicationsConfig } from "../applications/applications.config";
import { FileApplicationsStore } from "../applications/applications.store";
import { CvGenerationController } from "./cv-generation.controller";
import { CvGenerationService } from "./cv-generation.service";
import { CvPdfExportService } from "./cv-pdf-export.service";

@Module({
  imports: [AuthModule, OpenRouterModule],
  controllers: [CvGenerationController],
  providers: [
    {
      provide: CvGenerationService,
      inject: [OPENROUTER_SERVICE],
      useFactory: (
        openRouterService: ConstructorParameters<typeof CvGenerationService>[1],
      ) =>
        new CvGenerationService(
          new FileApplicationsStore(
            resolveApplicationsConfig(process.env).stateFilePath,
          ),
          openRouterService,
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
