import type {
  InterviewReport,
  InterviewReportMetric,
} from "@cvforge/types";
import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { withOpenRouterHttpErrors } from "../ai/openrouter.exception";
import type { OpenRouterService } from "../ai/openrouter.service";
import type { StoredApplication } from "../applications/applications.types";
import { buildContextSnapshot, describeContext } from "./interview.context";
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

/**
 * The schema asks for a summary, three improvements and five scored metrics,
 * each with its own written detail. 500 tokens did not fit them: the answer
 * was cut mid-string and `JSON.parse` threw, so finishing an interview failed
 * outright — seven times in one afternoon, always around 2 300 characters.
 * The candidate had already paid for the session and could not get a report.
 */
const REPORT_MAX_TOKENS = 1200;

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

type ParsedReport = {
  improvements?: unknown;
  metrics?: InterviewReportMetric[];
  overallScore?: unknown;
  summary?: unknown;
};

/**
 * A malformed answer is a failed call, not a crash.
 *
 * Raw `JSON.parse` surfaced as `SyntaxError: Unterminated string in JSON at
 * position 2300` — a 500 with no bearing on what the candidate should do. The
 * session stays unfinished either way, so the credit is not lost and they can
 * try again; this only says so in words they can act on.
 */
function parseReport(raw: string): ParsedReport {
  try {
    return JSON.parse(raw) as ParsedReport;
  } catch {
    throw new ServiceUnavailableException(
      "L'analyse de l'entretien n'a pas abouti. Reessayez dans un instant.",
    );
  }
}

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
              describeContext(buildContextSnapshot(application), "en"),
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
          feature: "interview_report",
          maxTokens: REPORT_MAX_TOKENS,
          provider: INTERVIEW_CHAT_PROVIDER,
          responseFormat: REPORT_RESPONSE_FORMAT,
          temperature: 0.2,
        },
      ),
    );

    const parsed = parseReport(raw);

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
