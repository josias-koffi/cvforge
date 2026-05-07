import {
  INTERVIEW_AI_STATUS_DONE,
  INTERVIEW_AI_STATUS_ERROR,
  INTERVIEW_AI_STATUS_GENERATING,
  INTERVIEW_AI_STATUS_IDLE,
  INTERVIEW_PROFILE_AGGRESSIVE,
  INTERVIEW_PROFILE_BEHAVIORAL,
  INTERVIEW_PROFILE_PASSIVE,
  INTERVIEW_PROFILE_STANDARD,
  INTERVIEW_PROFILE_TECHNICAL,
  INTERVIEW_CHUNK_STATUS_FAILED,
  INTERVIEW_CHUNK_STATUS_TRANSCRIBED,
  INTERVIEW_SESSION_STATUS_COMPLETED,
  INTERVIEW_SESSION_STATUS_ERROR,
  INTERVIEW_SESSION_STATUS_IDLE,
  INTERVIEW_SESSION_STATUS_READY,
  INTERVIEW_SESSION_STATUS_RECORDING,
  type Locale,
  type InterviewAIResponseEvent,
  type InterviewMessage,
  type InterviewReport,
  type InterviewReportMetric,
  type InterviewRecruiterProfile,
  type InterviewTranscriptionChunkRequest,
} from "@cvforge/types";
import { Injectable, BadRequestException, NotFoundException } from "@nestjs/common";
import type { OpenRouterService } from "../ai/openrouter.service";
import type { ApplicationsService } from "../applications/applications.service";
import type { StoredApplication } from "../applications/applications.types";
import type { InterviewStore, StoredInterviewSession } from "./interview.types";
import { sortChunks, summarizeInterviewSession } from "./interview.types";

const STT_MODEL =
  process.env.INTERVIEW_STT_MODEL ?? "mistralai/voxtral-small-24b-2507";
const AI_MODEL =
  process.env.INTERVIEW_AI_MODEL ??
  process.env.OPENROUTER_MODEL ??
  "mistralai/mistral-small-2603";
const INTERVIEW_PROVIDER = {
  allow_fallbacks: false,
  order: ["mistral"] as string[],
  require_parameters: true,
} as const;
const MAX_MESSAGES = 20;
const HESITATION_TOKENS = [
  "euh",
  "heu",
  "hum",
  "uh",
  "um",
  "erm",
] as const;
const REPORT_RESPONSE_FORMAT = {
  type: "json_schema",
  json_schema: {
    name: "interview_report",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        overallScore: { type: "integer", minimum: 0, maximum: 10 },
        summary: { type: "string" },
        improvements: {
          type: "array",
          items: { type: "string" },
          minItems: 1,
          maxItems: 3,
        },
        metrics: {
          type: "array",
          minItems: 5,
          maxItems: 5,
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              key: {
                type: "string",
                enum: [
                  "clarity",
                  "keywords",
                  "pacing",
                  "hesitations",
                  "relevance",
                ],
              },
              label: { type: "string" },
              score: { type: "integer", minimum: 0, maximum: 10 },
              detail: { type: "string" },
            },
            required: ["key", "label", "score", "detail"],
          },
        },
      },
      required: ["overallScore", "summary", "improvements", "metrics"],
    },
  },
} as const;

type InterviewLanguageConfig = {
  label: string;
  transcriptionPrompt: string;
};

const LANGUAGE_CONFIG: Record<Locale, InterviewLanguageConfig> = {
  en: {
    label: "English",
    transcriptionPrompt: [
      "The speaker is expected to speak English.",
      "Transcribe exactly what is said in English.",
      "Keep the original wording, including questions.",
      "If a word is slightly unclear, return the closest literal guess instead of answering as an assistant.",
      "Return plain text only.",
    ].join(" "),
  },
  fr: {
    label: "French",
    transcriptionPrompt: [
      "La langue attendue du locuteur est le francais.",
      "Transcris exactement ce qui est dit en francais.",
      "Conserve la formulation originale, y compris les questions.",
      "Si un mot est un peu flou, renvoie la meilleure approximation litterale au lieu de repondre comme un assistant.",
      "Retourne uniquement le texte transcrit.",
    ].join(" "),
  },
};

const BASE_AI_PROMPTS: Record<Locale, string> = {
  en: [
    "You are a human-sounding mock interviewer conducting a live voice interview.",
    "Respond in English only.",
    "Reply as spoken dialogue, not as an essay.",
    "Use exactly one natural follow-up question unless one short piece of feedback is more useful.",
    "Keep it concise: one short sentence, occasionally two.",
    "Do not mention being an AI assistant.",
    "Do not use bullet points, disclaimers, or generic helper phrasing.",
  ].join(" "),
  fr: [
    "Tu es un recruteur qui mene un entretien blanc en direct.",
    "Reponds uniquement en francais.",
    "Parle comme a l'oral, pas comme une fiche de cours.",
    "Pose exactement une question de relance naturelle, sauf si une courte remarque de feedback est plus utile.",
    "Reste concis: une phrase courte, parfois deux.",
    "Ne dis jamais que tu es une IA.",
    "N'utilise ni listes, ni avertissements, ni formulations d'assistant generique.",
  ].join(" "),
};

const PROFILE_PROMPTS: Record<InterviewRecruiterProfile, Record<Locale, string>> = {
  [INTERVIEW_PROFILE_STANDARD]: {
    en: "Adopt a balanced HR interview style: calm, professional, and neutral.",
    fr: "Adopte un style RH classique: calme, professionnel et neutre.",
  },
  [INTERVIEW_PROFILE_AGGRESSIVE]: {
    en: "Be demanding and high-pressure with sharper follow-ups, but remain realistic and never insulting.",
    fr: "Sois exigeant et met une pression realiste avec des relances plus incisives, sans jamais etre insultant.",
  },
  [INTERVIEW_PROFILE_PASSIVE]: {
    en: "Be reserved and understated, with shorter prompts, occasional silence cues, and slightly vague follow-ups.",
    fr: "Sois reserve et peu expressif, avec des relances plus courtes, parfois vagues, et des silences implicites.",
  },
  [INTERVIEW_PROFILE_TECHNICAL]: {
    en: "Focus on hard skills, architecture, tools, debugging, and concrete technical scenarios.",
    fr: "Concentre-toi sur les hard skills, l'architecture, les outils, le debug et les mises en situation techniques.",
  },
  [INTERVIEW_PROFILE_BEHAVIORAL]: {
    en: "Focus on behavioral STAR questions covering situation, task, action, and result.",
    fr: "Concentre-toi sur des questions comportementales de type STAR: situation, tache, action, resultat.",
  },
};

function nowIso() {
  return new Date().toISOString();
}

function appendMessage(messages: InterviewMessage[], msg: InterviewMessage): InterviewMessage[] {
  const updated = [...messages, msg];
  if (updated.length <= MAX_MESSAGES) {
    return updated;
  }
  // Drop the oldest user+assistant pair to stay within context budget
  return updated.slice(updated.length - MAX_MESSAGES);
}

function normalizeTranscript(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function joinTranscript(session: StoredInterviewSession) {
  return sortChunks(session.chunks)
    .filter((chunk) => chunk.status === INTERVIEW_CHUNK_STATUS_TRANSCRIBED)
    .map((chunk) => chunk.transcript)
    .filter((chunk) => chunk.length > 0)
    .join(" ")
    .trim();
}

function normalizeToken(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ");
}

function extractKeywords(values: Array<string | null | undefined>) {
  return [...new Set(
    values
      .flatMap((value) => normalizeToken(value ?? "").split(/\s+/))
      .map((token) => token.trim())
      .filter((token) => token.length >= 4),
  )];
}

function countHesitations(transcript: string) {
  const normalized = normalizeToken(transcript);

  return HESITATION_TOKENS.reduce(
    (count, token) =>
      count +
      (normalized.match(new RegExp(`\\b${token}\\b`, "g"))?.length ?? 0),
    0,
  );
}

function averageChunkDurationSeconds(chunks: StoredInterviewSession["chunks"]) {
  const durations = chunks
    .map((chunk) => {
      const startedAt = new Date(chunk.startedAt).getTime();
      const endedAt = new Date(chunk.endedAt).getTime();

      if (!Number.isFinite(startedAt) || !Number.isFinite(endedAt) || endedAt <= startedAt) {
        return null;
      }

      return (endedAt - startedAt) / 1000;
    })
    .filter((value): value is number => value !== null);

  if (durations.length === 0) {
    return null;
  }

  return Math.round(
    durations.reduce((sum, value) => sum + value, 0) / durations.length,
  );
}

@Injectable()
export class InterviewService {
  constructor(
    private readonly store: InterviewStore,
    private readonly openRouter: OpenRouterService,
    private readonly applicationsService: ApplicationsService,
  ) {}

  startSession(
    userEmail: string,
    language: Locale = "fr",
    profile: InterviewRecruiterProfile = INTERVIEW_PROFILE_STANDARD,
    applicationId = "",
  ) {
    const linkedApplicationId = applicationId.trim() || null;

    if (linkedApplicationId) {
      this.applicationsService.getOwnedApplication(userEmail, linkedApplicationId);
    }

    const createdAt = nowIso();
    const session: StoredInterviewSession = {
      applicationId: linkedApplicationId,
      aiResponse: null,
      aiResponseGeneratedAt: null,
      aiStatus: INTERVIEW_AI_STATUS_IDLE,
      chunks: [],
      completedAt: null,
      createdAt,
      id: `interview_${Date.now().toString(36)}`,
      language,
      lastError: null,
      messages: [],
      prefetchedQuestion: null,
      profile,
      report: null,
      recoverable: true,
      status: INTERVIEW_SESSION_STATUS_IDLE,
      transcript: "",
      updatedAt: createdAt,
      userEmail,
    };

    this.store.save(session);

    return {
      session: summarizeInterviewSession(session),
      sessionId: session.id,
    };
  }

  getSession(userEmail: string, sessionId: string) {
    return summarizeInterviewSession(this.getOwnedSession(userEmail, sessionId));
  }

  finishSession(userEmail: string, sessionId: string) {
    return this.finishSessionInternal(userEmail, sessionId);
  }

  async prefetchNextQuestion(userEmail: string, sessionId: string) {
    const session = this.getOwnedSession(userEmail, sessionId);

    if (!session.transcript || session.status === INTERVIEW_SESSION_STATUS_COMPLETED) {
      return summarizeInterviewSession(session);
    }

    try {
      const conversation = this.buildConversation(session.language, session.profile, session.messages);
      const question = await this.openRouter.chat(
        conversation,
        { maxTokens: 120, model: AI_MODEL, provider: INTERVIEW_PROVIDER, temperature: 0.35 },
      );

      session.prefetchedQuestion = question.trim();
      session.updatedAt = nowIso();
      this.store.save(session);
    } catch {
      // prefetch is best-effort; never fail the session on prefetch error
    }

    return summarizeInterviewSession(session);
  }

  private async finishSessionInternal(userEmail: string, sessionId: string) {
    const session = this.getOwnedSession(userEmail, sessionId);

    if (!session.transcript.trim()) {
      throw new BadRequestException(
        "Aucune transcription disponible pour generer le rapport.",
      );
    }

    const linkedApplication = session.applicationId
      ? this.applicationsService.getOwnedApplication(userEmail, session.applicationId)
      : null;
    const report = await this.generateInterviewReport(session, linkedApplication);
    const completedAt = report.createdAt;

    session.completedAt = completedAt;
    session.lastError = null;
    session.report = report;
    session.recoverable = false;
    session.status = INTERVIEW_SESSION_STATUS_COMPLETED;
    session.updatedAt = completedAt;
    this.store.save(session);

    if (linkedApplication) {
      this.applicationsService.appendInterviewReport(
        userEmail,
        linkedApplication.id,
        report,
      );
    }

    return summarizeInterviewSession(session);
  }

  async transcribeChunk(
    userEmail: string,
    sessionId: string,
    request: InterviewTranscriptionChunkRequest,
  ) {
    const session = this.getOwnedSession(userEmail, sessionId);
    const existingChunk = session.chunks.find(
      (chunk) => chunk.chunkId === request.chunkId,
    );

    if (existingChunk) {
      return summarizeInterviewSession(session);
    }

    try {
      const transcript = normalizeTranscript(
        await this.openRouter.transcribeAudio(
          request.chunkBase64,
          request.format,
          {
            maxTokens: 64,
            model: STT_MODEL,
            provider: INTERVIEW_PROVIDER,
            temperature: 0,
            transcriptionPrompt: this.getLanguageConfig(session.language).transcriptionPrompt,
          },
        ),
      );

      const chunkTimestamp = nowIso();
      session.chunks = sortChunks([
        ...session.chunks,
        {
          chunkId: request.chunkId,
          createdAt: chunkTimestamp,
          endedAt: request.endedAt,
          errorMessage: null,
          isFinal: request.isFinal,
          mimeType: request.mimeType,
          sequence: request.sequence,
          startedAt: request.startedAt,
          status: INTERVIEW_CHUNK_STATUS_TRANSCRIBED,
          transcript,
        },
      ]);
      session.lastError = null;
      session.recoverable = true;
      session.status = request.isFinal
        ? INTERVIEW_SESSION_STATUS_READY
        : INTERVIEW_SESSION_STATUS_RECORDING;
      session.transcript = joinTranscript(session);
      if (transcript) {
        session.messages = appendMessage(session.messages, {
          role: "user",
          content: transcript,
          timestamp: chunkTimestamp,
        });
      }
      session.updatedAt = nowIso();
      this.store.save(session);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "La transcription Voxtral a echoue.";

      session.chunks = sortChunks([
        ...session.chunks,
        {
          chunkId: request.chunkId,
          createdAt: nowIso(),
          endedAt: request.endedAt,
          errorMessage,
          isFinal: request.isFinal,
          mimeType: request.mimeType,
          sequence: request.sequence,
          startedAt: request.startedAt,
          status: INTERVIEW_CHUNK_STATUS_FAILED,
          transcript: "",
        },
      ]);
      session.lastError = errorMessage;
      session.recoverable = true;
      session.status = INTERVIEW_SESSION_STATUS_ERROR;
      session.updatedAt = nowIso();
      this.store.save(session);
    }

    return summarizeInterviewSession(session);
  }

  async *streamAIResponse(
    userEmail: string,
    sessionId: string,
  ): AsyncGenerator<InterviewAIResponseEvent, void, undefined> {
    const session = this.getOwnedSession(userEmail, sessionId);

    if (!session.transcript) {
      yield { type: "error", message: "Aucune transcription disponible pour generer une reponse.", timestamp: nowIso() };
      return;
    }

    // Use prefetched question when available and clear it for the next turn
    if (session.prefetchedQuestion) {
      const fullText = session.prefetchedQuestion;
      const prefetchTimestamp = nowIso();
      session.messages = appendMessage(session.messages, {
        role: "assistant",
        content: fullText,
        timestamp: prefetchTimestamp,
      });
      session.prefetchedQuestion = null;
      session.aiResponse = fullText;
      session.aiResponseGeneratedAt = prefetchTimestamp;
      session.aiStatus = INTERVIEW_AI_STATUS_DONE;
      session.updatedAt = prefetchTimestamp;
      this.store.save(session);
      yield { index: 0, text: fullText, timestamp: prefetchTimestamp, type: "chunk" };
      yield { fullText, timestamp: nowIso(), type: "done" };
      return;
    }

    session.aiStatus = INTERVIEW_AI_STATUS_GENERATING;
    session.aiResponse = null;
    session.aiResponseGeneratedAt = null;
    session.updatedAt = nowIso();
    this.store.save(session);

    let fullText = "";
    let chunkIndex = 0;

    try {
      const conversation = this.buildConversation(session.language, session.profile, session.messages);
      const stream = this.openRouter.streamChat(
        conversation,
        {
          maxTokens: 120,
          model: AI_MODEL,
          provider: INTERVIEW_PROVIDER,
          temperature: 0.35,
        },
      );

      for await (const delta of stream) {
        fullText += delta;
        yield {
          index: chunkIndex++,
          text: delta,
          timestamp: nowIso(),
          type: "chunk",
        };
      }

      const aiTimestamp = nowIso();
      session.messages = appendMessage(session.messages, {
        role: "assistant",
        content: fullText,
        timestamp: aiTimestamp,
      });
      session.aiResponse = fullText;
      session.aiResponseGeneratedAt = aiTimestamp;
      session.aiStatus = INTERVIEW_AI_STATUS_DONE;
      session.updatedAt = aiTimestamp;
      this.store.save(session);

      yield { fullText, timestamp: nowIso(), type: "done" };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "La generation IA a echoue.";

      session.aiStatus = INTERVIEW_AI_STATUS_ERROR;
      session.lastError = message;
      session.updatedAt = nowIso();
      this.store.save(session);

      yield { message, timestamp: nowIso(), type: "error" };
    }
  }

  private getOwnedSession(userEmail: string, sessionId: string) {
    const session = this.store.findByIdForUserEmail(userEmail, sessionId);

    if (!session) {
      throw new NotFoundException("Session d'interview introuvable.");
    }

    return session;
  }

  private getLanguageConfig(language: Locale): InterviewLanguageConfig {
    return LANGUAGE_CONFIG[language] ?? LANGUAGE_CONFIG.fr;
  }

  private async generateInterviewReport(
    session: StoredInterviewSession,
    application: StoredApplication | null,
  ): Promise<InterviewReport> {
    const createdAt = nowIso();
    const transcriptStats = this.buildTranscriptStats(session, application);
    const applicationContext = application
      ? [
          `Offer title: ${application.extracted.title}`,
          `Company: ${application.extracted.companyName ?? "Unknown"}`,
          `Summary: ${application.extracted.summary}`,
          `Requirements: ${application.extracted.requirements.join(", ") || "None"}`,
          `Responsibilities: ${application.extracted.responsibilities.join(", ") || "None"}`,
        ].join("\n")
      : "No linked application context.";
    const reportPrompt =
      session.language === "en"
        ? [
            "You are evaluating a mock interview transcript.",
            "Score each metric from 0 to 10.",
            "Use the provided transcript statistics as supporting evidence, but assess the transcript content directly.",
            "Keep details concise, factual, and useful for a candidate.",
          ].join(" ")
        : [
            "Tu evalues la transcription d'un entretien blanc.",
            "Note chaque metrique de 0 a 10.",
            "Utilise les statistiques fournies comme indices, mais evalue directement le contenu de la transcription.",
            "Les details doivent rester concis, factuels et actionnables pour le candidat.",
          ].join(" ");

    const raw = await this.openRouter.chat(
      [
        {
          role: "system",
          content: reportPrompt,
        },
        {
          role: "user",
          content: [
            `Interview language: ${session.language}`,
            `Recruiter profile: ${session.profile}`,
            applicationContext,
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
        model: AI_MODEL,
        provider: INTERVIEW_PROVIDER,
        responseFormat: REPORT_RESPONSE_FORMAT,
        temperature: 0.2,
      },
    );

    const parsed = JSON.parse(raw) as {
      improvements?: string[];
      metrics?: InterviewReportMetric[];
      overallScore?: number;
      summary?: string;
    };
    const metrics = Array.isArray(parsed.metrics)
      ? parsed.metrics
          .map((metric) => ({
            detail: typeof metric.detail === "string" ? metric.detail.trim() : "",
            key: metric.key,
            label: typeof metric.label === "string" ? metric.label.trim() : "",
            score:
              typeof metric.score === "number"
                ? Math.max(0, Math.min(10, Math.round(metric.score)))
                : 0,
          }))
          .filter(
            (metric): metric is InterviewReportMetric =>
              metric.key === "clarity" ||
              metric.key === "keywords" ||
              metric.key === "pacing" ||
              metric.key === "hesitations" ||
              metric.key === "relevance",
          )
      : [];

    return {
      createdAt,
      improvements: Array.isArray(parsed.improvements)
        ? parsed.improvements
            .map((item) => (typeof item === "string" ? item.trim() : ""))
            .filter((item) => item.length > 0)
        : [],
      metrics,
      overallScore:
        typeof parsed.overallScore === "number"
          ? Math.max(0, Math.min(10, Math.round(parsed.overallScore)))
          : 0,
      summary: typeof parsed.summary === "string" ? parsed.summary.trim() : "",
      transcriptStats,
    };
  }

  private buildTranscriptStats(
    session: StoredInterviewSession,
    application: StoredApplication | null,
  ) {
    const keywords = application
      ? extractKeywords([
          application.extracted.title,
          application.extracted.summary,
          application.extracted.companyName,
          ...application.extracted.requirements,
          ...application.extracted.responsibilities,
        ])
      : [];
    const transcriptKeywords = new Set(extractKeywords([session.transcript]));
    const keywordMentions = keywords.filter((keyword) =>
      transcriptKeywords.has(keyword),
    );

    return {
      averageResponseDurationSeconds: averageChunkDurationSeconds(session.chunks),
      hesitationCount: countHesitations(session.transcript),
      keywordCoverage:
        keywords.length === 0
          ? 0
          : Math.round((keywordMentions.length / keywords.length) * 100),
      keywordMentions,
      responseCount: session.chunks.length,
    };
  }

  private buildAiPrompt(
    language: Locale,
    profile: InterviewRecruiterProfile,
  ) {
    const resolvedLanguage = language === "en" ? "en" : "fr";
    const resolvedProfile =
      PROFILE_PROMPTS[profile] !== undefined
        ? profile
        : INTERVIEW_PROFILE_STANDARD;

    return [
      BASE_AI_PROMPTS[resolvedLanguage],
      PROFILE_PROMPTS[resolvedProfile][resolvedLanguage],
    ].join(" ");
  }

  private buildConversation(
    language: Locale,
    profile: InterviewRecruiterProfile,
    messages: InterviewMessage[],
  ): Array<{ role: "system" | "user" | "assistant"; content: string }> {
    const recentMessages = messages.slice(-MAX_MESSAGES);
    return [
      { role: "system", content: this.buildAiPrompt(language, profile) },
      ...recentMessages.map((m) => ({ role: m.role, content: m.content })),
    ];
  }
}
