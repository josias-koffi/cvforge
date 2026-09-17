import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { ApplicationsModule } from "../applications/applications.module";
import {
  APPLICATIONS_STORE,
  type ApplicationsStore,
} from "../applications/applications.types";
import { TemplatesController } from "./templates.controller";
import { resolveTemplatesConfig } from "./templates.config";
import { FileTemplatesStore } from "./templates.store";
import { TemplatesService } from "./templates.service";
import { TEMPLATES_STORE, type TemplatesStore } from "./templates.types";

@Module({
  imports: [AuthModule, ApplicationsModule],
  controllers: [TemplatesController],
  providers: [
    {
      provide: TEMPLATES_STORE,
      useFactory: () =>
        new FileTemplatesStore(
          resolveTemplatesConfig(process.env).stateFilePath,
        ),
    },
    {
      provide: TemplatesService,
      inject: [TEMPLATES_STORE, APPLICATIONS_STORE],
      useFactory: (store: TemplatesStore, applicationsStore: ApplicationsStore) =>
        new TemplatesService(store, applicationsStore),
    },
  ],
  exports: [TEMPLATES_STORE, TemplatesService],
})
export class TemplatesModule {}
