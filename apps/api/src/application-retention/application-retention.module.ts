import { LEGAL_DOCUMENT_PRIVACY } from "@cvforge/types";
import { Module } from "@nestjs/common";
import { ApplicationsModule } from "../applications/applications.module";
import { AuthModule } from "../auth/auth.module";
import { DATABASE, type Database } from "../database/database.types";
import { LegalDocumentsModule } from "../legal/legal.module";
import { LegalDocumentsService } from "../legal/legal.service";
import { NotificationsModule } from "../notifications/notifications.module";
import { NotificationsService } from "../notifications/notifications.service";
import { ApplicationRetentionController } from "./application-retention.controller";
import { PgApplicationRetentionStore } from "./application-retention.pg-store";
import { ApplicationRetentionService } from "./application-retention.service";

/** Applications untouched for a year: warned, then deleted (US-170). */
@Module({
  imports: [
    ApplicationsModule,
    AuthModule,
    LegalDocumentsModule,
    NotificationsModule,
  ],
  controllers: [ApplicationRetentionController],
  providers: [
    {
      provide: ApplicationRetentionService,
      inject: [DATABASE, NotificationsService, LegalDocumentsService],
      useFactory: (
        db: Database,
        notifications: NotificationsService,
        legal: LegalDocumentsService,
      ) =>
        new ApplicationRetentionService(
          new PgApplicationRetentionStore(db),
          notifications,
          async () => {
            const policy = await legal
              .getPublic(LEGAL_DOCUMENT_PRIVACY)
              .catch(() => null);

            return policy?.body.fr ?? null;
          },
        ),
    },
  ],
  exports: [ApplicationRetentionService],
})
export class ApplicationRetentionModule {}
