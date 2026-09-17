import { Module } from "@nestjs/common";
import {
  OPENROUTER_SERVICE,
  OpenRouterModule,
} from "../ai/openrouter.module";
import type { OpenRouterService } from "../ai/openrouter.service";
import { ApplicationsModule } from "../applications/applications.module";
import { ApplicationsService } from "../applications/applications.service";
import { AuthModule } from "../auth/auth.module";
import { InterviewPurgeService } from "./interview-purge.service";
import { InterviewController } from "./interview.controller";
import { InterviewService } from "./interview.service";
import { FileInterviewStore } from "./interview.store";
import { resolveInterviewConfig } from "./interview.config";
import { INTERVIEW_STORE, type InterviewStore } from "./interview.types";

@Module({
  imports: [AuthModule, OpenRouterModule, ApplicationsModule],
  controllers: [InterviewController],
  providers: [
    {
      provide: INTERVIEW_STORE,
      useFactory: () =>
        new FileInterviewStore(
          resolveInterviewConfig(process.env).stateFilePath,
        ),
    },
    {
      provide: InterviewService,
      useFactory: (
        openRouter: OpenRouterService,
        applicationsService: ApplicationsService,
        store: InterviewStore,
      ) => new InterviewService(store, openRouter, applicationsService),
      inject: [OPENROUTER_SERVICE, ApplicationsService, INTERVIEW_STORE],
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
