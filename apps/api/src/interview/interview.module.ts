import { Module } from "@nestjs/common";
import type { OpenRouterTranscriptionService } from "../ai/openrouter-transcription.service";
import {
  OPENROUTER_SERVICE,
  OPENROUTER_TRANSCRIPTION_SERVICE,
  OpenRouterModule,
} from "../ai/openrouter.module";
import type { OpenRouterService } from "../ai/openrouter.service";
import { ApplicationsModule } from "../applications/applications.module";
import { ApplicationsService } from "../applications/applications.service";
import { AuthModule } from "../auth/auth.module";
import { DATABASE, type Database } from "../database/database.types";
import { InterviewPurgeService } from "./interview-purge.service";
import { InterviewController } from "./interview.controller";
import { InterviewService } from "./interview.service";
import { PgInterviewStore } from "./interview.pg-store";
import { INTERVIEW_STORE, type InterviewStore } from "./interview.types";

@Module({
  imports: [AuthModule, OpenRouterModule, ApplicationsModule],
  controllers: [InterviewController],
  providers: [
    {
      provide: INTERVIEW_STORE,
      inject: [DATABASE],
      useFactory: (db: Database) => new PgInterviewStore(db),
    },
    {
      provide: InterviewService,
      useFactory: (
        openRouter: OpenRouterService,
        transcription: OpenRouterTranscriptionService,
        applicationsService: ApplicationsService,
        store: InterviewStore,
      ) =>
        new InterviewService(
          store,
          openRouter,
          transcription,
          applicationsService,
        ),
      inject: [
        OPENROUTER_SERVICE,
        OPENROUTER_TRANSCRIPTION_SERVICE,
        ApplicationsService,
        INTERVIEW_STORE,
      ],
    },
    {
      provide: InterviewPurgeService,
      useFactory: (store: InterviewStore) => new InterviewPurgeService(store),
      inject: [INTERVIEW_STORE],
    },
  ],
  exports: [INTERVIEW_STORE, InterviewService],
})
export class InterviewModule {}
