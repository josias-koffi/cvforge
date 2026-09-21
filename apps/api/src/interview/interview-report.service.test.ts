import { ServiceUnavailableException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import type { OpenRouterService } from "../ai/openrouter.service";
import type { StoredApplication } from "../applications/applications.types";
import { InterviewReportService } from "./interview-report.service";
import type { StoredInterviewSession } from "./interview.types";

const REPORT = {
  improvements: ["Chiffrer les resultats", "Raccourcir les reponses"],
  metrics: [
    { detail: "Propos structures.", key: "clarity", label: "Clarte", score: 7 },
    { detail: "Mots-cles couverts.", key: "keywords", label: "Mots-cles", score: 6 },
    { detail: "Debit regulier.", key: "pacing", label: "Rythme", score: 8 },
    { detail: "Peu d'hesitations.", key: "hesitations", label: "Hesitations", score: 7 },
    { detail: "Reponses en phase.", key: "relevance", label: "Pertinence", score: 8 },
  ],
  overallScore: 7,
  summary: "Entretien solide, a chiffrer davantage.",
};

function makeSession(): StoredInterviewSession {
  return {
    chunks: [],
    language: "fr",
    messages: [],
    profile: "standard",
    transcript: "Bonjour, j'ai mene la refonte du back-office.",
  } as unknown as StoredInterviewSession;
}

function setup(chat: unknown) {
  return new InterviewReportService({ chat } as unknown as OpenRouterService);
}

const answering = (payload: unknown) =>
  vi.fn().mockResolvedValue(JSON.stringify(payload));

describe("InterviewReportService", () => {
  it("scores the session from the model's answer", async () => {
    const service = setup(answering(REPORT));

    const report = await service.generate(makeSession(), null);

    expect(report.overallScore).toBe(7);
    expect(report.metrics).toHaveLength(5);
    expect(report.summary).toBe("Entretien solide, a chiffrer davantage.");
  });

  it("asks for enough tokens to hold the whole schema", async () => {
    // A summary, three improvements and five written metric details do not
    // fit in 500 tokens. They did not: the answer came back cut mid-string,
    // `JSON.parse` threw, and finishing an interview failed outright.
    const chat = answering(REPORT);
    const service = setup(chat);

    await service.generate(makeSession(), null);

    const [, options] = chat.mock.calls[0] as [unknown, { maxTokens: number }];
    expect(options.maxTokens).toBeGreaterThanOrEqual(1000);
  });

  it("reports a truncated answer as a failed call, not a crash", async () => {
    // What the candidate used to get: `SyntaxError: Unterminated string in
    // JSON at position 2300`, as a 500, with nothing they could act on.
    const service = setup(vi.fn().mockResolvedValue('{"summary":"Entretien so'));

    await expect(service.generate(makeSession(), null)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it("keeps the measured statistics, which owe the model nothing", async () => {
    const service = setup(answering(REPORT));

    const report = await service.generate(makeSession(), null);

    expect(report.transcriptStats).toBeDefined();
  });

  it("drops a metric it does not recognise rather than showing a nameless score", async () => {
    const service = setup(
      answering({
        ...REPORT,
        metrics: [...REPORT.metrics, { detail: "?", key: "vibes", label: "Vibes", score: 9 }],
      }),
    );

    const report = await service.generate(makeSession(), null);

    expect(report.metrics.map((metric) => metric.key)).not.toContain("vibes");
  });

  it("survives an answer missing the fields it promised", async () => {
    const service = setup(answering({ summary: "Court." }));

    const report = await service.generate(makeSession(), null);

    expect(report.improvements).toEqual([]);
    expect(report.metrics).toEqual([]);
    expect(report.overallScore).toBe(0);
  });

  it("describes the offer to the grader when there is one", async () => {
    const chat = answering(REPORT);
    const service = setup(chat);
    const application = {
      extracted: {
        companyName: "Acme",
        jobTitle: "Ingenieur plateforme",
        requirements: ["TypeScript"],
        responsibilities: ["Fiabiliser la plateforme"],
        summary: "Poste plateforme.",
      },
    } as unknown as StoredApplication;

    await service.generate(makeSession(), application);

    const [messages] = chat.mock.calls[0] as [Array<{ content: string }>];
    expect(messages[1]!.content).toContain("Acme");
  });
});
