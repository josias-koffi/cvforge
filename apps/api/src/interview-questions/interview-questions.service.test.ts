import {
  BadRequestException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LIKELY_QUESTIONS_RESPONSE_FORMAT } from "../interview/interview.prompts";
import {
  InterviewQuestionsService,
  parseQuestions,
} from "./interview-questions.service";

const OFFER = `Chef de projet digital H/F. Vous pilotez la refonte du site e-commerce,
coordonnez les equipes techniques et marketing, suivez le budget et les delais,
animez les rituels agiles et rendez compte au comite de direction. Maitrise de
Jira, de Google Analytics et des methodes Scrum attendue.`;

const QUESTION = {
  intent: "Verifier qu'il sait arbitrer sous contrainte.",
  kind: "situational",
  question: "Le budget de la refonte est depasse de 20 % : que faites-vous ?",
};

function answer(questions: unknown[]) {
  return JSON.stringify({ questions });
}

describe("InterviewQuestionsService", () => {
  let chat: ReturnType<typeof vi.fn>;
  let service: InterviewQuestionsService;

  beforeEach(() => {
    chat = vi.fn().mockResolvedValue(answer(Array(5).fill(QUESTION)));
    service = new InterviewQuestionsService({ chat });
  });

  it("returns five questions from one short, schema-bound model call", async () => {
    await expect(
      service.generate({ locale: "fr", offerText: `  ${OFFER}  ` }),
    ).resolves.toEqual({ questions: Array(5).fill(QUESTION) });

    expect(chat).toHaveBeenCalledTimes(1);
    const [messages, options] = chat.mock.calls[0]!;

    expect(messages[0].content).toContain("in French only");
    expect(JSON.parse(messages[1].content)).toEqual({ offerText: OFFER });
    expect(options).toMatchObject({
      maxTokens: 900,
      provider: { require_parameters: true },
      responseFormat: LIKELY_QUESTIONS_RESPONSE_FORMAT,
    });
    expect(options.responseFormat.json_schema.strict).toBe(true);
  });

  it("asks for English questions on the English page", async () => {
    await service.generate({ locale: "en", offerText: OFFER });

    expect(chat.mock.calls[0]![0][0].content).toContain("in English only");
  });

  it("refuses an offer too short before spending a model call", async () => {
    await expect(
      service.generate({ locale: "fr", offerText: "Chef de projet" }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(chat).not.toHaveBeenCalled();
  });

  /** A provider outage is a clean 503 the landing words, never a 500. */
  it("turns an OpenRouter failure into a 503 with its own code", async () => {
    chat.mockRejectedValue(new Error("OpenRouter request failed: 502"));

    const failure = await service
      .generate({ locale: "fr", offerText: OFFER })
      .catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(ServiceUnavailableException);
    expect(
      (failure as ServiceUnavailableException).getResponse(),
    ).toMatchObject({ code: "QUESTIONS_UNAVAILABLE" });
  });

  it("turns an answer off the schema into the same 503", async () => {
    chat.mockResolvedValue(answer([QUESTION, QUESTION]));

    await expect(
      service.generate({ locale: "fr", offerText: OFFER }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});

describe("parseQuestions", () => {
  it.each([
    ["text that is not JSON", "Voici vos questions :"],
    ["no questions array", JSON.stringify({ items: [] })],
    ["null", "null"],
    ["four questions", answer(Array(4).fill(QUESTION))],
    ["six questions", answer(Array(6).fill(QUESTION))],
    [
      "an unknown kind",
      answer([...Array(4).fill(QUESTION), { ...QUESTION, kind: "trick" }]),
    ],
    [
      "an empty question",
      answer([...Array(4).fill(QUESTION), { ...QUESTION, question: "  " }]),
    ],
    [
      "a rambling intent",
      answer([
        ...Array(4).fill(QUESTION),
        { ...QUESTION, intent: "x".repeat(301) },
      ]),
    ],
    [
      "a question that is not an object",
      answer([...Array(4).fill(QUESTION), null]),
    ],
  ])("refuses %s", (_label, raw) => {
    expect(parseQuestions(raw)).toBeNull();
  });

  it("keeps only the known fields, trimmed", () => {
    const parsed = parseQuestions(
      answer(
        Array(5).fill({
          ...QUESTION,
          extra: "dropped",
          question: `  ${QUESTION.question}  `,
        }),
      ),
    );

    expect(parsed?.[0]).toEqual(QUESTION);
  });
});
