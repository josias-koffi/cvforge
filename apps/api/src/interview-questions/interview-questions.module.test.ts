import "reflect-metadata";
import { describe, expect, it } from "vitest";
import { OPENROUTER_SERVICE, OpenRouterModule } from "../ai/openrouter.module";
import { LeadsModule } from "../leads/leads.module";
import { InterviewQuestionsModule } from "./interview-questions.module";
import { InterviewQuestionsService } from "./interview-questions.service";

type Provider = {
  provide?: unknown;
  inject?: unknown[];
  useFactory?: (...args: never[]) => unknown;
};

/** The model client and the lead capture, and no database (US-141). */
describe("InterviewQuestionsModule", () => {
  it("builds the service on the shared OpenRouter client", () => {
    const providers = Reflect.getMetadata(
      "providers",
      InterviewQuestionsModule,
    ) as Provider[];
    const provider = providers.find(
      (entry) => entry.provide === InterviewQuestionsService,
    );

    expect(provider?.inject).toEqual([OPENROUTER_SERVICE]);
    expect(provider?.useFactory?.({ chat: () => "" } as never)).toBeInstanceOf(
      InterviewQuestionsService,
    );
    expect(Reflect.getMetadata("imports", InterviewQuestionsModule)).toEqual([
      LeadsModule,
      OpenRouterModule,
    ]);
  });
});
