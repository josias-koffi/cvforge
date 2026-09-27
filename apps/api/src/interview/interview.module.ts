import { Module } from "@nestjs/common";
import type { AiUsageRecorder } from "../ai/ai-usage";
import type { OpenAiRealtimeService } from "../ai/openai-realtime.service";
import {
  AI_USAGE_RECORDER,
  OPENAI_REALTIME_SERVICE,
  OPENROUTER_SERVICE,
  OpenRouterModule,
} from "../ai/openrouter.module";
import type { OpenRouterService } from "../ai/openrouter.service";
import { ApplicationsModule } from "../applications/applications.module";
import { ApplicationsService } from "../applications/applications.service";
import { CompanyContextService } from "../applications/company-context.service";
import { AuthModule } from "../auth/auth.module";
import { CreditsModule } from "../credits/credits.module";
import { CreditsService } from "../credits/credits.service";
import { DATABASE, type Database } from "../database/database.types";
import { InterviewPurgeService } from "./interview-purge.service";
import { InterviewProgressService } from "./interview-progress.service";
import { InterviewRealtimeService } from "./interview-realtime.service";
import { InterviewReportService } from "./interview-report.service";
import { InterviewController } from "./interview.controller";
import { InterviewService } from "./interview.service";
import { PgInterviewStore } from "./interview.pg-store";
import { INTERVIEW_STORE, type InterviewStore } from "./interview.types";

@Module({
  imports: [AuthModule, OpenRouterModule, ApplicationsModule, CreditsModule],
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
        applicationsService: ApplicationsService,
        companyContext: CompanyContextService,
        store: InterviewStore,
        creditsService: CreditsService,
      ) =>
        new InterviewService(
          store,
          applicationsService,
          companyContext,
          new InterviewReportService(openRouter),
          creditsService,
        ),
      inject: [
        OPENROUTER_SERVICE,
        ApplicationsService,
        CompanyContextService,
        INTERVIEW_STORE,
        CreditsService,
      ],
    },
    {
      provide: InterviewRealtimeService,
      useFactory: (
        store: InterviewStore,
        realtime: OpenAiRealtimeService,
        recorder: AiUsageRecorder,
      ) => new InterviewRealtimeService(store, realtime, recorder),
      inject: [INTERVIEW_STORE, OPENAI_REALTIME_SERVICE, AI_USAGE_RECORDER],
    },
    {
      provide: InterviewProgressService,
      useFactory: (store: InterviewStore) =>
        new InterviewProgressService(store),
      inject: [INTERVIEW_STORE],
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
