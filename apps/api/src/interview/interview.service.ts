import {
  INTERVIEW_AI_STATUS_DONE,
  INTERVIEW_AI_STATUS_ERROR,
  INTERVIEW_AI_STATUS_GENERATING,
  INTERVIEW_AI_STATUS_IDLE,
  INTERVIEW_CHUNK_STATUS_FAILED,
  INTERVIEW_CHUNK_STATUS_TRANSCRIBED,
  INTERVIEW_SESSION_STATUS_ERROR,
  INTERVIEW_SESSION_STATUS_IDLE,
  INTERVIEW_SESSION_STATUS_READY,
  INTERVIEW_SESSION_STATUS_RECORDING,
  type Locale,
  type InterviewAIResponseEvent,
  type InterviewTranscriptionChunkRequest,
} from "@cvforge/types";
import { Injectable, NotFoundException } from "@nestjs/common";
import type { OpenRouterService } from "../ai/openrouter.service";
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

type InterviewLanguageConfig = {
  aiPrompt: string;
  label: string;
  transcriptionPrompt: string;
};

const LANGUAGE_CONFIG: Record<Locale, InterviewLanguageConfig> = {
  en: {
    aiPrompt: [
      "You are a human-sounding technical interviewer conducting a live mock interview.",
      "Respond in English only.",
      "Reply as spoken dialogue, not as an essay.",
      "Use exactly one natural follow-up question unless one short piece of feedback is more useful.",
      "Keep it concise: one short sentence, occasionally two.",
      "Do not mention being an AI assistant.",
      "Do not use bullet points, disclaimers, or generic helper phrasing.",
    ].join(" "),
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
    aiPrompt: [
      "Tu es un recruteur technique qui mene un entretien blanc en direct.",
      "Reponds uniquement en francais.",
      "Parle comme a l'oral, pas comme une fiche de cours.",
      "Pose exactement une question de relance naturelle, sauf si une courte remarque de feedback est plus utile.",
      "Reste concis: une phrase courte, parfois deux.",
      "Ne dis jamais que tu es une IA.",
      "N'utilise ni listes, ni avertissements, ni formulations d'assistant generique.",
    ].join(" "),
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

function nowIso() {
  return new Date().toISOString();
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

@Injectable()
export class InterviewService {
  constructor(
    private readonly store: InterviewStore,
    private readonly openRouter: OpenRouterService,
  ) {}

  startSession(userEmail: string, language: Locale = "fr") {
    const createdAt = nowIso();
    const session: StoredInterviewSession = {
      aiResponse: null,
      aiResponseGeneratedAt: null,
      aiStatus: INTERVIEW_AI_STATUS_IDLE,
      chunks: [],
      createdAt,
      id: `interview_${Date.now().toString(36)}`,
      language,
      lastError: null,
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

      session.chunks = sortChunks([
        ...session.chunks,
        {
          chunkId: request.chunkId,
          createdAt: nowIso(),
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

    session.aiStatus = INTERVIEW_AI_STATUS_GENERATING;
    session.aiResponse = null;
    session.aiResponseGeneratedAt = null;
    session.updatedAt = nowIso();
    this.store.save(session);

    let fullText = "";
    let chunkIndex = 0;

    try {
      const languageConfig = this.getLanguageConfig(session.language);
      const stream = this.openRouter.streamChat(
        [
          { role: "system", content: languageConfig.aiPrompt },
          {
            role: "user",
            content: `Candidate transcript (${languageConfig.label}): ${session.transcript}`,
          },
        ],
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

      session.aiResponse = fullText;
      session.aiResponseGeneratedAt = nowIso();
      session.aiStatus = INTERVIEW_AI_STATUS_DONE;
      session.updatedAt = nowIso();
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
}
