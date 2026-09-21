import type {
  InterviewReport,
  InterviewReportMetric,
} from "@cvforge/types";
import { Injectable } from "@nestjs/common";
import { withOpenRouterHttpErrors } from "../ai/openrouter.exception";
import type { OpenRouterService } from "../ai/openrouter.service";
import type { StoredApplication } from "../applications/applications.types";
import { REPORT_RESPONSE_FORMAT } from "./interview.prompts";
import { buildTranscriptStats, nowIso } from "./interview.stats";
import type { StoredInterviewSession } from "./interview.types";

/**
 * Text calls only need a provider honouring `response_format` — without it a
 * provider that ignores the schema answers with free-form prose and the parse
 * below yields an empty report. Routing stays open otherwise: pinning these
 * calls to Mistral took the whole interview down whenever its pool throttled.
 */
const INTERVIEW_CHAT_PROVIDER = {
  require_parameters: true,
} as const;

const METRIC_KEYS = new Set([
  "clarity",
  "keywords",
  "pacing",
  "hesitations",
  "relevance",
]);

const SYSTEM_PROMPTS = {
  en: [
    "You are evaluating a mock interview transcript.",
    "Score each metric from 0 to 10.",
    "Use the provided transcript statistics as supporting evidence, but assess the transcript content directly.",
    "Keep details concise, factual, and useful for a candidate.",
  ].join(" "),
  fr: [
    "Tu evalues la transcription d'un entretien blanc.",
    "Note chaque metrique de 0 a 10.",
    "Utilise les statistiques fournies comme indices, mais evalue directement le contenu de la transcription.",
    "Les details doivent rester concis, factuels et actionnables pour le candidat.",
  ].join(" "),
};

function clampScore(value: unknown) {
  return typeof value === "number"
    ? Math.max(0, Math.min(10, Math.round(value)))
    : 0;
}

function trimmed(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Turns a finished session into its scored report. Split out of
 * `InterviewService`, which was past the size the engineering spec allows.
 */
@Injectable()
export class InterviewReportService {
  constructor(private readonly openRouter: OpenRouterService) {}

  async generate(
    session: StoredInterviewSession,
    application: StoredApplication | null,
  ): Promise<InterviewReport> {
    const createdAt = nowIso();
    const transcriptStats = buildTranscriptStats(session, application);

    const raw = await withOpenRouterHttpErrors(() =>
      this.openRouter.chat(
        [
          {
            role: "system",
            content:
              session.language === "en" ? SYSTEM_PROMPTS.en : SYSTEM_PROMPTS.fr,
          },
          {
            role: "user",
            content: [
              `Interview language: ${session.language}`,
              `Recruiter profile: ${session.profile}`,
              describeApplication(application),
              `Transcript: ${session.transcript}`,
              `Average response duration (seconds): ${
                transcriptStats.averageResponseDurationSeconds ?? "unknown"
              }`,
              `Hesitation count: ${transcriptStats.hesitationCount}`,
              `Keyword coverage (%): ${transcriptStats.keywordCoverage}`,
              `Keyword mentions: ${
                transcriptStats.keywordMentions.join(", ") || "none"
              }`,
              `Response count: ${transcriptStats.responseCount}`,
            ].join("\n\n"),
          },
        ],
        {
          maxTokens: 500,
          provider: INTERVIEW_CHAT_PROVIDER,
          responseFormat: REPORT_RESPONSE_FORMAT,
          temperature: 0.2,
        },
      ),
    );

    const parsed = JSON.parse(raw) as {
      improvements?: unknown;
      metrics?: InterviewReportMetric[];
      overallScore?: unknown;
      summary?: unknown;
    };

    return {
      createdAt,
      improvements: Array.isArray(parsed.improvements)
        ? parsed.improvements.map(trimmed).filter((item) => item.length > 0)
        : [],
      metrics: normalizeMetrics(parsed.metrics),
      overallScore: clampScore(parsed.overallScore),
      summary: trimmed(parsed.summary),
      transcriptStats,
    };
  }
}

function describeApplication(application: StoredApplication | null) {
  if (!application) {
    return "No linked application context.";
  }

  return [
    `Offer title: ${application.extracted.title}`,
    `Company: ${application.extracted.companyName ?? "Unknown"}`,
    `Summary: ${application.extracted.summary}`,
    `Requirements: ${application.extracted.requirements.join(", ") || "None"}`,
    `Responsibilities: ${
      application.extracted.responsibilities.join(", ") || "None"
    }`,
  ].join("\n");
}

/** An unknown metric key is dropped rather than shown as a nameless score. */
function normalizeMetrics(metrics: unknown): InterviewReportMetric[] {
  if (!Array.isArray(metrics)) {
    return [];
  }

  return metrics
    .map((metric: InterviewReportMetric) => ({
      detail: trimmed(metric.detail),
      key: metric.key,
      label: trimmed(metric.label),
      score: clampScore(metric.score),
    }))
    .filter((metric): metric is InterviewReportMetric =>
      METRIC_KEYS.has(metric.key),
    );
}
