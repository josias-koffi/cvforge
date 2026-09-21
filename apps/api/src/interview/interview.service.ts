import {
  AI_CREDIT_ACTION_INTERVIEW_SESSION,
  INTERVIEW_DEFAULT_DURATION_MINUTES,
  INTERVIEW_AI_STATUS_IDLE,
  INTERVIEW_PROFILE_STANDARD,
  INTERVIEW_SESSION_STATUS_COMPLETED,
  INTERVIEW_SESSION_STATUS_IDLE,
  interviewSessionCost,
  isInterviewDuration,
  type Locale,
  type InterviewRecruiterProfile,
} from "@cvforge/types";
import { randomUUID } from "node:crypto";
import {
  Injectable,
  BadRequestException,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import type { ApplicationsService } from "../applications/applications.service";
import type { CompanyContextService } from "../applications/company-context.service";
import type { StoredApplication } from "../applications/applications.types";
import { buildContextSnapshot } from "./interview.context";
import type { CreditsService } from "../credits/credits.service";
import type { InterviewReportService } from "./interview-report.service";
import { nowIso } from "./interview.stats";
import type { InterviewStore, StoredInterviewSession } from "./interview.types";
import { summarizeInterviewSession } from "./interview.types";

/** How long an unused session stays reusable, so a double-click costs once. */
const REUSE_WINDOW_MS = 30 * 60 * 1000;

@Injectable()
export class InterviewService {
  constructor(
    private readonly store: InterviewStore,
    private readonly applicationsService: ApplicationsService,
    private readonly companyContext: CompanyContextService,
    private readonly reportService: InterviewReportService,
    private readonly creditsService: CreditsService,
  ) {}

  private readonly logger = new Logger(InterviewService.name);

  /**
   * The most recent session this user opened and never used, if it is still
   * fresh. Guards against a double-click on "Démarrer" costing twice: the
   * charge happens at creation, so a second creation is a second charge.
   */
  private async findReusableSession(userEmail: string) {
    const [latest] = await this.store.listByUserEmail(userEmail, { limit: 1 });

    if (
      !latest ||
      latest.status !== INTERVIEW_SESSION_STATUS_IDLE ||
      Date.now() - new Date(latest.createdAt).getTime() > REUSE_WINDOW_MS
    ) {
      return null;
    }

    const session = await this.store.findByIdForUserEmail(userEmail, latest.id);

    // An idle session with chunks would be an inconsistency; treat it as used.
    return session && session.chunks.length === 0 ? session : null;
  }

  async startSession(
    userEmail: string,
    language: Locale = "fr",
    profile: InterviewRecruiterProfile = INTERVIEW_PROFILE_STANDARD,
    applicationId = "",
    durationMinutes: number = INTERVIEW_DEFAULT_DURATION_MINUTES,
  ) {
    const linkedApplicationId = applicationId.trim() || null;
    // Resolved before the balance check, not with the rest of the session: it
    // is what the session costs, so checking a stale price would let someone
    // open a thirty-minute interview on a ten-minute balance.
    const duration = isInterviewDuration(durationMinutes)
      ? durationMinutes
      : INTERVIEW_DEFAULT_DURATION_MINUTES;
    const cost = interviewSessionCost(duration);
    let application: StoredApplication | null = null;

    if (linkedApplicationId) {
      // Awaited: unawaited, an application owned by somebody else still created
      // a session, and the rejection surfaced as an unhandled promise. The
      // result used to be discarded, which is why the recruiter knew nothing
      // about the job it was interviewing for.
      application = await this.applicationsService.getOwnedApplication(
        userEmail,
        linkedApplicationId,
      );
      // Derived once per application, here rather than at creation: it costs
      // a call, and most applications never lead to an interview. A failure
      // returns the application untouched, so the session still opens.
      application = await this.companyContext.ensureFor(application);
    }

    // A second click on "Démarrer" must not cost a second time. An untouched
    // session from the last few minutes is handed back as-is — but only if it
    // runs for as long as the one being asked for, since the two do not cost
    // the same and handing back the shorter one would silently ignore the
    // duration the candidate just picked.
    const reusable = await this.findReusableSession(userEmail);
    if (reusable && reusable.durationMinutes === duration) {
      return {
        session: summarizeInterviewSession(reusable),
        sessionId: reusable.id,
      };
    }

    // Checked before anything is written, so a user who cannot pay never gets
    // a session; `consumeCredits` re-checks inside its transaction.
    await this.creditsService.assertSufficientCredits(
      AI_CREDIT_ACTION_INTERVIEW_SESSION,
      userEmail,
      cost,
    );

    const createdAt = nowIso();
    const session: StoredInterviewSession = {
      applicationId: linkedApplicationId,
      aiResponse: null,
      aiResponseGeneratedAt: null,
      aiStatus: INTERVIEW_AI_STATUS_IDLE,
      chunks: [],
      completedAt: null,
      createdAt,
      id: `interview_${randomUUID()}`,
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
      durationMinutes: duration,
      // Stamped on the first spoken turn: the candidate may not reach the
      // studio for minutes, and the agenda must not spend its budget waiting.
      startedAt: null,
      context: buildContextSnapshot(application),
    };

    await this.store.save(session);

    // Charged after the session exists, never before: if the write fails the
    // user has lost nothing, and if the charge fails they get a free session.
    // Of the two ways this can go wrong, that is the right one.
    await this.creditsService.consumeCredits({
      action: AI_CREDIT_ACTION_INTERVIEW_SESSION,
      amount: cost,
      applicationId: linkedApplicationId ?? undefined,
      durationMinutes: duration,
      userEmail,
    });

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
