import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { ApplicationsModule } from "../applications/applications.module";
import { DATABASE, type Database } from "../database/database.types";
import {
  APPLICATIONS_STORE,
  type ApplicationsStore,
} from "../applications/applications.types";
import { TemplatesController } from "./templates.controller";
import { PgTemplatesStore } from "./templates.pg-store";
import { TemplatesService } from "./templates.service";
import { TEMPLATES_STORE, type TemplatesStore } from "./templates.types";

@Module({
  imports: [AuthModule, ApplicationsModule],
  controllers: [TemplatesController],
  providers: [
    {
      provide: TEMPLATES_STORE,
      inject: [DATABASE],
      useFactory: (db: Database) => new PgTemplatesStore(db),
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
