import { Module } from "@nestjs/common";
import { OpenRouterModule, OPENROUTER_SERVICE } from "../ai/openrouter.module";
import { AuthModule } from "../auth/auth.module";
import { ApplicationsModule } from "../applications/applications.module";
import {
  APPLICATIONS_STORE,
  type ApplicationsStore,
} from "../applications/applications.types";
import { CreditsModule } from "../credits/credits.module";
import { CreditsService } from "../credits/credits.service";
import { TemplatesModule } from "../templates/templates.module";
import {
  TEMPLATES_STORE,
  type TemplatesStore,
} from "../templates/templates.types";
import { CvGenerationController } from "./cv-generation.controller";
import { CvGenerationService } from "./cv-generation.service";
import { CvImportService } from "./cv-import.service";
import { CvPdfExportService } from "./cv-pdf-export.service";

@Module({
  imports: [
    ApplicationsModule,
    AuthModule,
    CreditsModule,
    OpenRouterModule,
    TemplatesModule,
  ],
  controllers: [CvGenerationController],
  providers: [
    {
      provide: CvGenerationService,
      inject: [
        APPLICATIONS_STORE,
        OPENROUTER_SERVICE,
        CreditsService,
        TEMPLATES_STORE,
      ],
      useFactory: (
        applicationsStore: ApplicationsStore,
        openRouterService: ConstructorParameters<typeof CvGenerationService>[1],
        creditsService: ConstructorParameters<typeof CvGenerationService>[2],
        templatesStore: TemplatesStore,
      ) =>
        new CvGenerationService(
          applicationsStore,
          openRouterService,
          creditsService,
          templatesStore,
        ),
    },
    {
      provide: CvPdfExportService,
      inject: [APPLICATIONS_STORE],
      useFactory: (applicationsStore: ApplicationsStore) =>
        new CvPdfExportService(applicationsStore),
    },
    {
      provide: CvImportService,
      inject: [OPENROUTER_SERVICE, CreditsService],
      useFactory: (
        openRouterService: ConstructorParameters<typeof CvImportService>[0],
        creditsService: ConstructorParameters<typeof CvImportService>[1],
      ) => new CvImportService(openRouterService, creditsService),
    },
  ],
})
export class CvGenerationModule {}
