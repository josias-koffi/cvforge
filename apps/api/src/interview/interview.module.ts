import { Module } from "@nestjs/common";
import { resolve } from "node:path";
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

const INTERVIEW_STORE = Symbol("INTERVIEW_STORE");

@Module({
  imports: [AuthModule, OpenRouterModule, ApplicationsModule],
  controllers: [InterviewController],
  providers: [
    {
      provide: INTERVIEW_STORE,
      useFactory: () =>
        new FileInterviewStore(
          resolve(process.cwd(), ".data", "interviews-state.json"),
        ),
    },
    {
      provide: InterviewService,
      useFactory: (
        openRouter: OpenRouterService,
        applicationsService: ApplicationsService,
        store: FileInterviewStore,
      ) => new InterviewService(store, openRouter, applicationsService),
      inject: [OPENROUTER_SERVICE, ApplicationsService, INTERVIEW_STORE],
    },
    {
      provide: InterviewPurgeService,
      useFactory: (store: FileInterviewStore) => new InterviewPurgeService(store),
      inject: [INTERVIEW_STORE],
    },
  ],
  exports: [InterviewService],
})
export class InterviewModule {}
