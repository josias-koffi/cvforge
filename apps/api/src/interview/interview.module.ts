import { Module } from "@nestjs/common";
import { resolve } from "node:path";
import {
  OPENROUTER_SERVICE,
  OpenRouterModule,
} from "../ai/openrouter.module";
import type { OpenRouterService } from "../ai/openrouter.service";
import { AuthModule } from "../auth/auth.module";
import { InterviewController } from "./interview.controller";
import { InterviewService } from "./interview.service";
import { FileInterviewStore } from "./interview.store";

@Module({
  imports: [AuthModule, OpenRouterModule],
  controllers: [InterviewController],
  providers: [
    {
      provide: InterviewService,
      useFactory: (openRouter: OpenRouterService) =>
        new InterviewService(
          new FileInterviewStore(
            resolve(process.cwd(), ".data", "interviews-state.json"),
          ),
          openRouter,
        ),
      inject: [OPENROUTER_SERVICE],
    },
  ],
  exports: [InterviewService],
})
export class InterviewModule {}
