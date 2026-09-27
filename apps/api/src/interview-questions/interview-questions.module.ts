import { Module } from "@nestjs/common";
import { OPENROUTER_SERVICE, OpenRouterModule } from "../ai/openrouter.module";
import type { OpenRouterService } from "../ai/openrouter.service";
import { LeadsModule } from "../leads/leads.module";
import { PublicInterviewQuestionsController } from "./interview-questions.controller";
import { InterviewQuestionsService } from "./interview-questions.service";

/**
 * The free "likely interview questions" tool (US-141). Imports no database on
 * purpose: the offer is sent to the model and nothing is written.
 */
@Module({
  controllers: [PublicInterviewQuestionsController],
  imports: [LeadsModule, OpenRouterModule],
  providers: [
    {
      inject: [OPENROUTER_SERVICE],
      provide: InterviewQuestionsService,
      useFactory: (openRouter: OpenRouterService) =>
        new InterviewQuestionsService(openRouter),
    },
  ],
})
export class InterviewQuestionsModule {}
