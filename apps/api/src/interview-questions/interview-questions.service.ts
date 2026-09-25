import {
  interviewQuestionKinds,
  publicError,
  type InterviewQuestion,
  type PublicInterviewQuestionsResponse,
} from "@cvforge/types";
import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import type { OpenRouterService } from "../ai/openrouter.service";
import { acceptedOfferText } from "../ats/ats.validation";
import {
  buildLikelyQuestionsPrompt,
  LIKELY_QUESTIONS_COUNT,
  LIKELY_QUESTIONS_RESPONSE_FORMAT,
} from "../interview/interview.prompts";

export const QUESTIONS_UNAVAILABLE_MESSAGE =
  "Le generateur de questions ne repond pas pour le moment. Reessayez dans un instant.";

/**
 * Five questions of a sentence and five intents: about 400 tokens of JSON.
 * The margin is for a verbose fallback model, not an invitation to write more.
 */
const QUESTIONS_MAX_TOKENS = 900;
/** Providers that honour `response_format`; without it the schema is advisory. */
const QUESTIONS_PROVIDER = { require_parameters: true } as const;
/** A question is one sentence; anything longer is the model rambling. */
const MAX_QUESTION_CHARS = 300;
const MAX_INTENT_CHARS = 300;

/**
 * The free "likely interview questions" tool (US-141): an offer in, the five
 * questions a recruiter would most likely ask out, in one short model call.
 *
 * Holds no store: the offer lives for the duration of the request. And never
 * lets a provider failure through as a 500 — an outage, a timeout or an
 * answer off the schema all become the same 503 the landing can word.
 */
@Injectable()
export class InterviewQuestionsService {
  private readonly logger = new Logger(InterviewQuestionsService.name);

  constructor(private readonly openRouter: Pick<OpenRouterService, "chat">) {}

  async generate(request: {
    offerText: unknown;
    locale: unknown;
  }): Promise<PublicInterviewQuestionsResponse> {
    const offerText = acceptedOfferText(request.offerText);
    const locale = request.locale === "en" ? "en" : "fr";
    let raw: string;

    try {
      raw = await this.openRouter.chat(
        [
          { role: "system", content: buildLikelyQuestionsPrompt(locale) },
          { role: "user", content: JSON.stringify({ offerText }) },
        ],
        {
          feature: "interview_questions",
          maxTokens: QUESTIONS_MAX_TOKENS,
          provider: QUESTIONS_PROVIDER,
          responseFormat: LIKELY_QUESTIONS_RESPONSE_FORMAT,
          temperature: 0.4,
        },
      );
    } catch (error: unknown) {
      this.logger.warn(
        `Likely questions request failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw unavailable();
    }

    const questions = parseQuestions(raw);

    if (!questions) {
      this.logger.warn("Likely questions answer was off the schema.");
      throw unavailable();
    }

    return { questions };
  }
}

function unavailable() {
  return new ServiceUnavailableException(
    publicError("QUESTIONS_UNAVAILABLE", QUESTIONS_UNAVAILABLE_MESSAGE),
  );
}

/**
 * Exactly five complete questions, or null. A strict schema is a request, not
 * a guarantee: a fallback model may ignore it, and showing four questions or
 * an empty card would look broken rather than fail cleanly.
 */
export function parseQuestions(raw: string): InterviewQuestion[] | null {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  const items = (parsed as { questions?: unknown } | null)?.questions;

  if (!Array.isArray(items) || items.length !== LIKELY_QUESTIONS_COUNT) {
    return null;
  }

  const questions = items.map(toQuestion);

  return questions.every((question) => question !== null)
    ? (questions as InterviewQuestion[])
    : null;
}

function toQuestion(item: unknown): InterviewQuestion | null {
  const value = (item ?? {}) as Record<string, unknown>;
  const question = boundedText(value.question, MAX_QUESTION_CHARS);
  const intent = boundedText(value.intent, MAX_INTENT_CHARS);
  const kind = interviewQuestionKinds.find((known) => known === value.kind);

  return question && intent && kind ? { intent, kind, question } : null;
}

function boundedText(value: unknown, max: number) {
  const text = typeof value === "string" ? value.trim() : "";

  return text.length > 0 && text.length <= max ? text : null;
}
