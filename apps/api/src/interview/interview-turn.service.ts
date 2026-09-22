import {
  INTERVIEW_CHUNK_STATUS_FAILED,
  INTERVIEW_CHUNK_STATUS_TRANSCRIBED,
  INTERVIEW_SESSION_STATUS_ERROR,
  INTERVIEW_SESSION_STATUS_READY,
  type InterviewAnswerPartRequest,
  type InterviewTranscriptionChunkRequest,
  type InterviewTurnEvent,
} from "@cvforge/types";
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  PayloadTooLargeException,
} from "@nestjs/common";
import type { OpenRouterTranscriptionService } from "../ai/openrouter-transcription.service";
import type { OpenRouterVoiceService } from "../ai/openrouter-voice.service";
import {
  buildAgenda,
  countExchanges,
  elapsedSince,
  resolveAgendaState,
} from "./interview.agenda";
import { buildOpeningInstruction, buildTurnPrompt } from "./interview.prompts";
import { createTurnLog } from "./interview.turn-log";
import {
  selectPromptMessages,
  summarizeCoveredGround,
  appendMessage,
  joinTranscript,
  normalizeTranscript,
  nowIso,
} from "./interview.stats";
import {
  AnswerTooLongError,
  InterviewAnswerBuffer,
  TooManyAnswersError,
  answerKey,
} from "./interview-answer-buffer";
import type { InterviewStore, StoredInterviewSession } from "./interview.types";
import { sortChunks, summarizeInterviewSession } from "./interview.types";
import { wrapPcm16InWav } from "./wav";

/**
 * Runs one spoken turn: the candidate's answer in, the interviewer's voice out.
 *
 * Two calls go out at once. The speech-to-speech model answers the audio
 * directly — that is what the candidate hears, and it starts speaking in about
 * a second. Transcription runs alongside purely to record what the candidate
 * said, because the report is built from their words (hesitations, keyword
 * coverage, pacing). Running it in sequence would add its own latency to every
 * turn for a result nobody is waiting on.
 */
@Injectable()
export class InterviewTurnService {
  constructor(
    private readonly store: InterviewStore,
    private readonly voice: OpenRouterVoiceService,
    private readonly transcription: OpenRouterTranscriptionService,
    private readonly answers: InterviewAnswerBuffer = new InterviewAnswerBuffer(),
  ) {}

  /**
   * Takes one piece of an answer while the candidate is still speaking.
   *
   * The session is loaded rather than assumed: the turn id comes from the
   * browser, and this is what keeps someone from feeding audio into an
   * interview that is not theirs.
   */
  async appendAnswerPart(
    userEmail: string,
    sessionId: string,
    request: InterviewAnswerPartRequest,
  ): Promise<{ parts: number }> {
    const session = await this.store.findByIdForUserEmail(userEmail, sessionId);
    if (!session) throw new NotFoundException("Session d'interview introuvable.");

    if (!Number.isInteger(request.part) || request.part < 0) {
      throw new BadRequestException("Position de fragment invalide.");
    }

    const audio = Buffer.from(request.audioBase64, "base64");
    if (audio.length === 0) {
      throw new BadRequestException("Fragment audio vide.");
    }

    try {
      const parts = this.answers.append(
        answerKey(userEmail, sessionId, request.chunkId),
        request.part,
        audio,
      );

      return { parts };
    } catch (error) {
      if (error instanceof AnswerTooLongError) {
        throw new PayloadTooLargeException(error.message);
      }
      if (error instanceof TooManyAnswersError) {
        throw new PayloadTooLargeException(error.message);
      }
      throw error;
    }
  }

  private readonly logger = new Logger(InterviewTurnService.name);

  async *streamTurn(
    userEmail: string,
    sessionId: string,
    request: InterviewTranscriptionChunkRequest,
  ): AsyncGenerator<InterviewTurnEvent, void, undefined> {
    const session = await this.store.findByIdForUserEmail(userEmail, sessionId);
    if (!session) throw new NotFoundException("Session d'interview introuvable.");

    // Already handled: replaying it would charge for the turn twice.
    if (session.chunks.some((chunk) => chunk.chunkId === request.chunkId)) {
      yield { type: "done", startedAt: session.startedAt };
      return;
    }

    const audio = this.resolveAnswerAudio(userEmail, sessionId, request);
    if (audio === null) {
      yield { type: "error", message: "Aucun enregistrement à envoyer." };
      return;
    }

    const turnLog = createTurnLog(this.logger, "interview.turn", sessionId);
    const transcribing = this.transcribeAside(
      audio,
      request.chunkId,
      session.language,
    );
    let candidateText: string | null = null;
    let emittedCandidate = false;
    let reply = "";

    try {
      for await (const event of this.voice.streamTurn({
        audio,
        history: selectPromptMessages(session.messages).map((message) => ({
          content: message.content,
          role: message.role,
        })),
        onTelemetry: turnLog.onTelemetry,
        systemPrompt: this.buildPrompt(session),
      })) {
        if (event.type === "audio") {
          turnLog.markFirstAudio();
          yield { type: "audio", data: event.data };
        } else {
          reply += event.text;
          yield { type: "reply", text: event.text };
        }

        // Surfaced as soon as it is ready, between two audio frames, so the
        // candidate's own words appear without holding the voice back.
        candidateText ??= transcribing.settled;
        if (candidateText !== null && !emittedCandidate) {
          emittedCandidate = true;
          yield { type: "candidate", text: candidateText };
        }
      }
    } catch (error) {
      const message = describe(error, "Le recruteur n'a pas pu repondre.");
      turnLog.write();
      await this.recordFailure(session, request, message);
      yield { type: "error", message };
      return;
    }

    // Stamped before the await, so what is measured is the wait the turn
    // actually incurred — zero when transcription had already settled while
    // the voice was still streaming, which is the whole point of running it
    // alongside.
    const waitStartedAt = Date.now();
    const transcript = (await transcribing.promise) ?? "";
    const waitedMs = Date.now() - waitStartedAt;
    if (!emittedCandidate) yield { type: "candidate", text: transcript };

    // Written before the save so the line lands even if persistence fails,
    // and late enough to show whether transcription held the turn open.
    turnLog.write({ durationMs: transcribing.durationMs, waitedMs });

    await this.recordTurn(session, request, transcript, reply.trim());

    // Counted after the turn is recorded, so this exchange is part of it: the
    // goodbye that just played is what completes the agenda.
    yield {
      closed: this.isInterviewOver(session),
      startedAt: session.startedAt,
      type: "done",
    };
  }

  /**
   * Whether the recruiter has nothing left to ask.
   *
   * The studio waits for this rather than for the clock. An interview whose
   * closing has been delivered leaves the candidate sitting in front of a
   * recruiter that has already said goodbye, which is its worst moment.
   */
  private isInterviewOver(session: StoredInterviewSession): boolean {
    const agenda = buildAgenda(session.profile, session.durationMinutes, {
      hasContext: session.context !== null,
    });

    return resolveAgendaState(agenda, {
      elapsedMs: elapsedSince(session.startedAt),
      exchanges: countExchanges(session.messages),
    }).isComplete;
  }

  /**
   * The brief for this turn: the recruiter, the job, and where the interview
   * has got to. Recomputed each time, because the phase moves.
   */
  private buildPrompt(session: StoredInterviewSession) {
    const agenda = buildAgenda(session.profile, session.durationMinutes, {
      hasContext: session.context !== null,
    });
    const window = selectPromptMessages(session.messages);
    const dropped = session.messages.filter(
      (message) => !window.includes(message),
    );

    return buildTurnPrompt({
      agendaState: resolveAgendaState(agenda, {
        elapsedMs: elapsedSince(session.startedAt),
        exchanges: countExchanges(session.messages),
      }),
      context: session.context,
      coveredGround: summarizeCoveredGround(
        dropped,
        session.language === "en" ? "en" : "fr",
      ),
      language: session.language,
      profile: session.profile,
    });
  }

  /**
   * The interviewer's opening words, before the candidate has said anything.
   *
   * Nothing is transcribed here — there is no candidate audio — so this is the
   * voice stream alone. Replaying it on a session that has already started is
   * a no-op rather than a second greeting, which is what a page reload would
   * otherwise produce.
   */
  async *streamOpening(
    userEmail: string,
    sessionId: string,
  ): AsyncGenerator<InterviewTurnEvent, void, undefined> {
    const session = await this.store.findByIdForUserEmail(userEmail, sessionId);
    if (!session) throw new NotFoundException("Session d'interview introuvable.");

    if (session.messages.length > 0) {
      yield { type: "done", startedAt: session.startedAt };
      return;
    }

    const turnLog = createTurnLog(this.logger, "interview.opening", sessionId);
    let reply = "";

    try {
      for await (const event of this.voice.streamTurn({
        history: [],
        instruction: buildOpeningInstruction(session.language),
        onTelemetry: turnLog.onTelemetry,
        systemPrompt: this.buildPrompt(session),
      })) {
        if (event.type === "audio") {
          turnLog.markFirstAudio();
          yield { type: "audio", data: event.data };
        } else {
          reply += event.text;
          yield { type: "reply", text: event.text };
        }
      }
    } catch (error) {
      const message = describe(error, "Le recruteur n'a pas pu repondre.");
      turnLog.write();
      yield { type: "error", message };
      return;
    }

    turnLog.write();

    await this.recordOpening(session, reply.trim());

    yield { type: "done", startedAt: session.startedAt };
  }

  private async recordOpening(
    session: StoredInterviewSession,
    reply: string,
  ) {
    if (!reply) return;

    const timestamp = nowIso();

    session.messages = appendMessage(session.messages, {
      content: reply,
      role: "assistant",
      timestamp,
    });
    session.transcript = joinTranscript(session);
    session.lastError = null;
    session.recoverable = true;
    session.status = INTERVIEW_SESSION_STATUS_READY;
    session.updatedAt = timestamp;
    // The interview begins when somebody speaks, not when credits were spent:
    // the candidate may have opened the session minutes earlier, and the
    // agenda must not have burned its budget waiting for them.
    session.startedAt ??= timestamp;

    await this.store.save(session);
  }

  /**
   * The answer, whether it came in this request or ahead of it.
   *
   * A body with audio in it is the whole answer, as it always was. An empty
   * one means the studio streamed the pieces up while the candidate was
   * talking, so what is left is to assemble them and write the header the
   * speech models need. Null when there is neither.
   */
  private resolveAnswerAudio(
    userEmail: string,
    sessionId: string,
    request: InterviewTranscriptionChunkRequest,
  ): { base64: string; format: string } | null {
    const key = answerKey(userEmail, sessionId, request.chunkId);

    if (request.chunkBase64.length > 0) {
      // Whatever was buffered under this id is not going to be used now.
      this.answers.discard(key);

      return { base64: request.chunkBase64, format: request.format };
    }

    const streamed = this.answers.take(key);
    if (!streamed || streamed.length === 0) return null;

    return {
      base64: wrapPcm16InWav(streamed).toString("base64"),
      format: "wav",
    };
  }

  /**
   * Starts transcription immediately and exposes its result both as a promise
   * and as a plain value once settled, so the streaming loop can pick it up
   * without awaiting.
   */
  private transcribeAside(
    audio: { base64: string; format: string },
    chunkId: string,
    language: string,
  ) {
    const state: {
      promise: Promise<string | null>;
      settled: string | null;
      /** How long the call took, from its own start. Null until it settles. */
      durationMs: number | null;
    } = {
      durationMs: null,
      promise: Promise.resolve(null),
      settled: null,
    };
    const startedAt = Date.now();
    const stamp = () => {
      state.durationMs = Date.now() - startedAt;
    };

    state.promise = this.transcription
      .transcribe({
        audioBase64: audio.base64,
        format: audio.format,
        // The session already knows. Left undefined, the model guessed from
        // the audio — and guessed English on anything that was not clearly
        // speech, which is how a French interview came back as "Thank you."
        language,
      })
      .then((text) => {
        stamp();
        state.settled = normalizeTranscript(text);
        return state.settled;
      })
      .catch((error: unknown) => {
        stamp();
        // The turn still works without it; only the report loses detail.
        this.logger.warn(
          `Interview transcription failed for ${chunkId}: ${describe(
            error,
            "unknown",
          )}`,
        );
        return null;
      });

    return state;
  }

  private async recordTurn(
    session: StoredInterviewSession,
    request: InterviewTranscriptionChunkRequest,
    transcript: string,
    reply: string,
  ) {
    const timestamp = nowIso();

    session.chunks = sortChunks([
      ...session.chunks,
      {
        chunkId: request.chunkId,
        createdAt: timestamp,
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

    if (transcript) {
      session.messages = appendMessage(session.messages, {
        content: transcript,
        role: "user",
        timestamp,
      });
    }

    if (reply) {
      session.messages = appendMessage(session.messages, {
        content: reply,
        role: "assistant",
        timestamp,
      });
    }

    session.transcript = joinTranscript(session);
    session.lastError = null;
    session.recoverable = true;
    session.status = INTERVIEW_SESSION_STATUS_READY;
    session.updatedAt = timestamp;
    // The interview begins when somebody speaks, not when credits were spent:
    // the candidate may have opened the session minutes earlier, and the
    // agenda must not have burned its budget waiting for them.
    session.startedAt ??= timestamp;

    await this.store.save(session);
  }

  private async recordFailure(
    session: StoredInterviewSession,
    request: InterviewTranscriptionChunkRequest,
    message: string,
  ) {
    const timestamp = nowIso();

    session.chunks = sortChunks([
      ...session.chunks,
      {
        chunkId: request.chunkId,
        createdAt: timestamp,
        endedAt: request.endedAt,
        errorMessage: message,
        isFinal: request.isFinal,
        mimeType: request.mimeType,
        sequence: request.sequence,
        startedAt: request.startedAt,
        status: INTERVIEW_CHUNK_STATUS_FAILED,
        transcript: "",
      },
    ]);
    session.lastError = message;
    // The session survives: the candidate can simply speak again.
    session.recoverable = true;
    session.status = INTERVIEW_SESSION_STATUS_ERROR;
    session.updatedAt = timestamp;

    await this.store.save(session);
  }

  /** Summarises the session the way the REST endpoints do. */
  async readSession(userEmail: string, sessionId: string) {
    const session = await this.store.findByIdForUserEmail(userEmail, sessionId);
    if (!session) throw new NotFoundException("Session d'interview introuvable.");

    return summarizeInterviewSession(session);
  }
}

function describe(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}
