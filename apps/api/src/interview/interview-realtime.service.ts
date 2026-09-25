import { createHash } from "node:crypto";
import {
  INTERVIEW_SESSION_STATUS_COMPLETED,
  INTERVIEW_SESSION_STATUS_READY,
  type InterviewRealtimeCallResponse,
} from "@cvforge/types";
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import {
  NOOP_AI_USAGE_RECORDER,
  recordUsage,
  type AiUsageRecorder,
} from "../ai/ai-usage";
import type { OpenAiRealtimeService } from "../ai/openai-realtime.service";
import { InterviewCall, OVERTIME_GRACE_MS } from "./interview-call";
import { buildSessionPrompt, coveredGroundOf } from "./interview.session-prompt";
import { nowIso } from "./interview.stats";
import type { InterviewStore } from "./interview.types";

/** An SDP offer is a few kilobytes; anything far past that is not one. */
const MAX_OFFER_LENGTH = 64_000;

/**
 * Opens and tracks live interview calls (ADR-026).
 *
 * One call per session, held in this process: the sideband is a WebSocket
 * from this replica, so the call lives where it was opened. Opening a second
 * one — a reload, a dropped connection — ends the first.
 */
@Injectable()
export class InterviewRealtimeService {
  private readonly logger = new Logger(InterviewRealtimeService.name);
  private readonly calls = new Map<string, InterviewCall>();
  private readonly released = new WeakSet<InterviewCall>();

  constructor(
    private readonly store: InterviewStore,
    private readonly realtime: OpenAiRealtimeService,
    private readonly usageRecorder: AiUsageRecorder = NOOP_AI_USAGE_RECORDER,
  ) {}

  async startCall(
    userEmail: string,
    sessionId: string,
    offerSdp: unknown,
  ): Promise<InterviewRealtimeCallResponse> {
    if (
      typeof offerSdp !== "string" ||
      !offerSdp.startsWith("v=") ||
      offerSdp.length > MAX_OFFER_LENGTH
    ) {
      throw new BadRequestException("Offre de connexion invalide.");
    }

    await this.endCall(userEmail, sessionId);

    const session = await this.store.findByIdForUserEmail(userEmail, sessionId);
    if (!session) throw new NotFoundException("Session d'interview introuvable.");
    if (session.status === INTERVIEW_SESSION_STATUS_COMPLETED) {
      throw new BadRequestException("Cet entretien est déjà terminé.");
    }
    // Back from a pause: the clock was stopped, so the start moves forward by
    // the length of the pause and the agenda picks up where it was.
    if (session.pausedAt && session.startedAt) {
      const pausedMs = Date.now() - new Date(session.pausedAt).getTime();
      session.startedAt = new Date(
        new Date(session.startedAt).getTime() + Math.max(0, pausedMs),
      ).toISOString();
    }
    session.pausedAt = null;

    if (isPastDeadline(session.startedAt, session.durationMinutes)) {
      throw new BadRequestException("Le temps de cet entretien est écoulé.");
    }

    // The interview begins when the call connects, not when credits were
    // spent: the session may have been created minutes earlier.
    session.startedAt ??= nowIso();
    session.status = INTERVIEW_SESSION_STATUS_READY;
    session.updatedAt = nowIso();
    await this.store.save(session);

    const { answerSdp, callId } = await this.realtime.createCall({
      offerSdp,
      safetyIdentifier: createHash("sha256").update(userEmail).digest("hex").slice(0, 32),
      session: this.realtime.buildSession({
        instructions: buildSessionPrompt(session, coveredGroundOf(session)),
        language: session.language === "en" ? "en" : "fr",
      }),
    });

    const call = new InterviewCall(session, {
      hangup: () => this.realtime.hangup(callId),
      model: this.realtime.model,
      transcriptionModel: this.realtime.transcriptionModel,
      onUsage: ({ feature, usage }) => {
        if (usage.costUsd === 0 && usage.inputTokens === 0) return;
        recordUsage(this.usageRecorder, {
          completionTokens: usage.outputTokens,
          costUsd: usage.costUsd,
          durationMs: 0,
          fellBack: false,
          feature,
          model:
            feature === "interview_voice"
              ? this.realtime.model
              : this.realtime.transcriptionModel,
          promptTokens: usage.inputTokens,
          status: "ok",
        });
      },
      save: (current) => this.store.save(current),
    });

    // Two openings can cross while OpenAI answers; the older one is ended
    // rather than silently overwritten and left running.
    const previous = this.calls.get(sessionId);
    if (previous) void this.release(sessionId, previous, "client");
    this.calls.set(sessionId, call);
    call.attach(
      this.realtime.connect(callId, {
        onClose: () => void this.release(sessionId, call, "server"),
        onEvent: (event) => call.handle(event),
        onOpen: () => call.open(),
      }),
    );

    return { sdp: answerSdp, startedAt: session.startedAt };
  }

  /**
   * Ends the session's call, if this process holds one, and waits until what
   * was said is saved. Called before scoring, so the report reads it all.
   */
  async endCall(userEmail: string, sessionId: string): Promise<void> {
    const call = this.calls.get(sessionId);
    if (!call || call.session.userEmail !== userEmail) return;

    // Hung up at OpenAI too: a call nobody listens to still bills.
    await call.close("client");
    await this.release(sessionId, call, "client");
  }

  /**
   * Pauses the interview: the call is hung up and the clock stops until the
   * candidate resumes, which opens a new call where this one left off.
   */
  async pauseCall(
    userEmail: string,
    sessionId: string,
  ): Promise<{ pausedAt: string | null }> {
    await this.endCall(userEmail, sessionId);

    const session = await this.store.findByIdForUserEmail(userEmail, sessionId);
    if (!session) throw new NotFoundException("Session d'interview introuvable.");
    if (session.status === INTERVIEW_SESSION_STATUS_COMPLETED) {
      throw new BadRequestException("Cet entretien est déjà terminé.");
    }
    // Nothing to stop before the interview has begun.
    if (!session.startedAt) return { pausedAt: null };

    session.pausedAt ??= nowIso();
    session.updatedAt = nowIso();
    await this.store.save(session);

    return { pausedAt: session.pausedAt };
  }

  private async release(
    sessionId: string,
    call: InterviewCall,
    endedBy: "client" | "server",
  ) {
    if (this.calls.get(sessionId) === call) this.calls.delete(sessionId);
    // Ending a call closes its sideband, whose close lands back here.
    if (this.released.has(call)) return;
    this.released.add(call);

    const summary = await call.end(endedBy);
    this.logger.log(
      `interview.call session=${sessionId} endedBy=${summary.endedBy} responses=${summary.responses} interrupted=${summary.interrupted} truncated=${summary.truncated} inputTokens=${summary.usage.inputTokens} outputTokens=${summary.usage.outputTokens} costUsd=${summary.usage.costUsd.toFixed(4)}`,
    );
  }
}

function isPastDeadline(startedAt: string | null, durationMinutes: number) {
  if (!startedAt) return false;

  const deadline =
    new Date(startedAt).getTime() + durationMinutes * 60_000 + OVERTIME_GRACE_MS;

  return Date.now() > deadline;
}
