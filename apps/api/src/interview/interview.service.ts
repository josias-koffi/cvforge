import {
  INTERVIEW_AI_STATUS_DONE,
  INTERVIEW_AI_STATUS_ERROR,
  INTERVIEW_AI_STATUS_GENERATING,
  INTERVIEW_AI_STATUS_IDLE,
  INTERVIEW_PROFILE_STANDARD,
  INTERVIEW_CHUNK_STATUS_FAILED,
  INTERVIEW_CHUNK_STATUS_TRANSCRIBED,
  INTERVIEW_SESSION_STATUS_COMPLETED,
  INTERVIEW_SESSION_STATUS_ERROR,
  INTERVIEW_SESSION_STATUS_IDLE,
  INTERVIEW_SESSION_STATUS_READY,
  INTERVIEW_SESSION_STATUS_RECORDING,
  type Locale,
  type InterviewAIResponseEvent,
  type InterviewRecruiterProfile,
  type InterviewTranscriptionChunkRequest,
} from "@cvforge/types";
import {
  Injectable,
  BadRequestException,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import type { OpenRouterTranscriptionService } from "../ai/openrouter-transcription.service";
import type { OpenRouterService } from "../ai/openrouter.service";
import type { ApplicationsService } from "../applications/applications.service";
import type { InterviewReportService } from "./interview-report.service";
import { buildConversation } from "./interview.prompts";
import {
  appendMessage,
  joinTranscript,
  nowIso,
  normalizeTranscript,
} from "./interview.stats";
import type { InterviewStore, StoredInterviewSession } from "./interview.types";
import { sortChunks, summarizeInterviewSession } from "./interview.types";

/**
 * Text calls only need a provider honouring `response_format`. Routing stays
 * open on purpose: pinning them to Mistral, as speech-to-text must be, took
 * the whole interview down whenever the shared Mistral pool was throttled.
 */
const INTERVIEW_CHAT_PROVIDER = {
  require_parameters: true,
} as const;

@Injectable()
export class InterviewService {
  constructor(
    private readonly store: InterviewStore,
    private readonly openRouter: OpenRouterService,
    private readonly transcription: OpenRouterTranscriptionService,
    private readonly applicationsService: ApplicationsService,
    private readonly reportService: InterviewReportService,
  ) {}

  private readonly logger = new Logger(InterviewService.name);

  async startSession(
    userEmail: string,
    language: Locale = "fr",
    profile: InterviewRecruiterProfile = INTERVIEW_PROFILE_STANDARD,
    applicationId = "",
  ) {
    const linkedApplicationId = applicationId.trim() || null;

    if (linkedApplicationId) {
      // Awaited: unawaited, an application owned by somebody else still created
      // a session, and the rejection surfaced as an unhandled promise.
      await this.applicationsService.getOwnedApplication(
        userEmail,
        linkedApplicationId,
      );
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

    await this.store.save(session);

    return {
      session: summarizeInterviewSession(session),
      sessionId: session.id,
    };
  }

  async getSession(userEmail: string, sessionId: string) {
    return summarizeInterviewSession(
      await this.getOwnedSession(userEmail, sessionId),
    );
  }

  finishSession(userEmail: string, sessionId: string) {
    return this.finishSessionInternal(userEmail, sessionId);
  }

  async prefetchNextQuestion(userEmail: string, sessionId: string) {
    const session = await this.getOwnedSession(userEmail, sessionId);

    if (!session.transcript || session.status === INTERVIEW_SESSION_STATUS_COMPLETED) {
      return summarizeInterviewSession(session);
    }

    try {
      const conversation = buildConversation(session.language, session.profile, session.messages);
      const question = await this.openRouter.chat(
        conversation,
        { maxTokens: 120, provider: INTERVIEW_CHAT_PROVIDER, temperature: 0.35 },
      );

      session.prefetchedQuestion = question.trim();
      session.updatedAt = nowIso();
      await this.store.save(session);
    } catch (error) {
      // Best-effort: a failed prefetch costs latency on the next turn, never the
      // session. Logged because silence here hid a broken model chain for weeks.
      this.logger.warn(
        `Interview prefetch failed for ${sessionId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    return summarizeInterviewSession(session);
  }

  private async finishSessionInternal(userEmail: string, sessionId: string) {
    const session = await this.getOwnedSession(userEmail, sessionId);

    if (!session.transcript.trim()) {
      throw new BadRequestException(
        "Aucune transcription disponible pour generer le rapport.",
      );
    }

    const linkedApplication = session.applicationId
      ? await this.applicationsService.getOwnedApplication(
          userEmail,
          session.applicationId,
        )
      : null;
    const report = await this.reportService.generate(session, linkedApplication);
    const completedAt = report.createdAt;

    session.completedAt = completedAt;
    session.lastError = null;
    session.report = report;
    session.recoverable = false;
    session.status = INTERVIEW_SESSION_STATUS_COMPLETED;
    session.updatedAt = completedAt;
    await this.store.save(session);

    if (linkedApplication) {
      await this.applicationsService.appendInterviewReport(
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
    const session = await this.getOwnedSession(userEmail, sessionId);
    const existingChunk = session.chunks.find(
      (chunk) => chunk.chunkId === request.chunkId,
    );

    if (existingChunk) {
      return summarizeInterviewSession(session);
    }

    try {
      const transcript = normalizeTranscript(
        await this.transcription.transcribe({
          audioBase64: request.chunkBase64,
          format: request.format,
          language: session.language,
        }),
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
      await this.store.save(session);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "La transcription audio a echoue.";

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
      await this.store.save(session);
    }

    return summarizeInterviewSession(session);
  }

  async *streamAIResponse(
    userEmail: string,
    sessionId: string,
  ): AsyncGenerator<InterviewAIResponseEvent, void, undefined> {
    const session = await this.getOwnedSession(userEmail, sessionId);

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
      await this.store.save(session);
      yield { index: 0, text: fullText, timestamp: prefetchTimestamp, type: "chunk" };
      yield { fullText, timestamp: nowIso(), type: "done" };
      return;
    }

    session.aiStatus = INTERVIEW_AI_STATUS_GENERATING;
    session.aiResponse = null;
    session.aiResponseGeneratedAt = null;
    session.updatedAt = nowIso();
    await this.store.save(session);

    let fullText = "";
    let chunkIndex = 0;

    try {
      const conversation = buildConversation(session.language, session.profile, session.messages);
      const stream = this.openRouter.streamChat(
        conversation,
        {
          maxTokens: 120,
          provider: INTERVIEW_CHAT_PROVIDER,
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
      await this.store.save(session);

      yield { fullText, timestamp: nowIso(), type: "done" };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "La generation IA a echoue.";

      session.aiStatus = INTERVIEW_AI_STATUS_ERROR;
      session.lastError = message;
      session.updatedAt = nowIso();
      await this.store.save(session);

      yield { message, timestamp: nowIso(), type: "error" };
    }
  }

  private async getOwnedSession(userEmail: string, sessionId: string) {
    const session = await this.store.findByIdForUserEmail(
      userEmail,
      sessionId,
    );

    if (!session) {
      throw new NotFoundException("Session d'interview introuvable.");
    }

    return session;
  }

}
