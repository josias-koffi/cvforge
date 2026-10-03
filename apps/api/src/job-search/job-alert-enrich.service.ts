import { randomUUID } from "node:crypto";
import {
  AI_CREDIT_ACTION_JOB_ALERT_ENRICH,
  type JobAlertAnalysis,
} from "@cvforge/types";
import {
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from "@nestjs/common";
import { withOpenRouterHttpErrors } from "../ai/openrouter.exception";
import type { OpenRouterService } from "../ai/openrouter.service";
import {
  InsufficientCreditsException,
  type CreditsService,
} from "../credits/credits.service";
import { extractJsonFromContent } from "../cv-generation/cv-generation.normalizers";
import type { NotificationsService } from "../notifications/notifications.service";
import type { ProfilesStore, StoredProfile } from "../profiles/profiles.types";
import type {
  AiAnalysisStatus,
  AlertMatchesStore,
  AlertToAnalyse,
} from "./alert-matches.pg-store";
import type { JobStreamCursorsStore } from "./job-stream.types";
import {
  buildAnalysisUserMessage,
  JOB_ALERT_ANALYSIS_SYSTEM_PROMPT,
  readAnalysisResponse,
  type AnalysisProfile,
} from "./matching/job-alert-analysis";
import { dateInParis } from "./paris-time";

/** Polled often: the analysis has a minute to land before the alert leaves. */
const ENRICH_INTERVAL_MS = 10_000;
/**
 * How long a candidate with the option waits for the analysis. The
 * dispatcher's one-minute timer comes on top: an enriched alert is held back
 * two minutes at most, then goes without its analysis.
 */
export const ANALYSIS_WAIT_MS = 60_000;
/** A model slower than this has missed the alert anyway. */
const CALL_TIMEOUT_MS = 45_000;
const BATCH = 50;
const LEASE_MS = 5 * 60_000;
const DEFAULT_DAILY_CAP = 20;
export const ENRICH_STREAM_KEY = "job_alert_enrich";

export interface JobAlertEnrichConfig {
  /** Analyses a day per candidate, failed ones included; past it, alerts go bare. */
  dailyCap: number;
}

/** Always on: runs only for candidates who turned the AI analysis on. */
export function resolveJobAlertEnrichConfig(
  env: NodeJS.ProcessEnv = process.env,
): JobAlertEnrichConfig {
  const cap = Number(env.JOB_ALERT_ENRICH_DAILY_CAP);

  return {
    dailyCap: Number.isInteger(cap) && cap >= 0 ? cap : DEFAULT_DAILY_CAP,
  };
}

export interface JobAlertEnricherDeps {
  alerts: Pick<
    AlertMatchesStore,
    "listToAnalyse" | "analysesOn" | "saveAnalysis"
  >;
  notifications: Pick<NotificationsService, "readJobAlertPreferences">;
  profiles: Pick<ProfilesStore, "findByUserEmail">;
  credits: Pick<CreditsService, "assertSufficientCredits" | "consumeCredits">;
  openRouter: Pick<OpenRouterService, "chat">;
  cursors: JobStreamCursorsStore;
  config: JobAlertEnrichConfig;
  now?: () => number;
  owner?: string;
}

export type EnrichResult =
  | { status: "skipped"; reason: string }
  | { status: "locked" }
  | {
      status: "done";
      outcomes: Partial<Record<AiAnalysisStatus, number>>;
      errors: string[];
    };

/**
 * The paid analysis of the alerts (E27, US-168), as a work queue of its own.
 *
 * The queue is the alerts themselves: fresh, unsent, not analysed yet. It
 * runs apart from the collection and from the e-mails, so a slow or broken
 * model costs an alert its analysis, never the alert.
 *
 * **Billing**: one credit a day, Paris time, debited after the day's first
 * analysis that succeeded — the following ones that day are free. A failed
 * call charges nothing. The debit carries a key unique per (candidate, day)
 * in the ledger, so two analyses finishing together cannot charge twice.
 */
export class JobAlertEnricher implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(JobAlertEnricher.name);
  private readonly now: () => number;
  private readonly owner: string;
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(private readonly deps: JobAlertEnricherDeps) {
    this.now = deps.now ?? Date.now;
    this.owner = deps.owner ?? randomUUID();
  }

  onModuleInit() {
    this.timer = setInterval(() => {
      void this.tick().catch((error: unknown) => {
        this.logger.error(`Alert analysis failed: ${String(error)}`);
      });
    }, ENRICH_INTERVAL_MS);
    this.timer.unref?.();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async tick(): Promise<EnrichResult> {
    if (this.running) return { reason: "already running", status: "skipped" };

    const lease = await this.deps.cursors.claim(
      ENRICH_STREAM_KEY,
      this.owner,
      LEASE_MS,
    );
    if (!lease) return { status: "locked" };

    this.running = true;

    try {
      return await this.analysePending();
    } finally {
      this.running = false;
      await this.deps.cursors.release(ENRICH_STREAM_KEY, this.owner);
    }
  }

  private async analysePending(): Promise<EnrichResult> {
    const queue = await this.deps.alerts.listToAnalyse(
      new Date(this.now() - ANALYSIS_WAIT_MS).toISOString(),
      BATCH,
    );
    const result = {
      errors: [] as string[],
      outcomes: {} as Record<string, number>,
      status: "done" as const,
    };
    const byUser = new Map<string, AlertToAnalyse[]>();
    for (const alert of queue) {
      byUser.set(alert.userEmail, [
        ...(byUser.get(alert.userEmail) ?? []),
        alert,
      ]);
    }

    // Candidates side by side, each one's alerts in turn: the day's first
    // success decides the debit, so a candidate's own analyses never race.
    await Promise.all(
      [...byUser].map(async ([userEmail, alerts]) => {
        try {
          for (const status of await this.analyseUser(userEmail, alerts)) {
            result.outcomes[status] = (result.outcomes[status] ?? 0) + 1;
          }
        } catch (error) {
          result.errors.push(`${userEmail}: ${String(error)}`);
        }
      }),
    );

    if (result.errors.length > 0) {
      this.logger.warn(
        `Analyses: ${result.errors.length} failure(s), first: ${result.errors[0]}`,
      );
    }

    return result;
  }

  private async analyseUser(userEmail: string, alerts: AlertToAnalyse[]) {
    const preferences =
      await this.deps.notifications.readJobAlertPreferences(userEmail);
    // Without the option, nothing is analysed and nothing waits.
    if (!preferences.enabled || !preferences.aiAnalysis) return [];

    const day = dateInParis(this.now());
    const usage = await this.deps.alerts.analysesOn(userEmail, day);
    const registry = await this.deps.profiles.findByUserEmail(userEmail);
    const statuses: AiAnalysisStatus[] = [];

    for (const alert of alerts) {
      const profile =
        registry?.profiles.find(
          (candidate) => candidate.id === alert.profileId,
        ) ??
        registry?.profiles[0] ??
        null;
      const outcome = await this.analyseOne(alert, profile, usage, day);

      await this.deps.alerts.saveAnalysis(alert.id, {
        analysis: outcome.analysis,
        at: new Date(this.now()).toISOString(),
        status: outcome.status,
      });
      if (outcome.status === "done") usage.done += 1;
      if (outcome.status === "done" || outcome.status === "failed")
        usage.attempts += 1;
      statuses.push(outcome.status);
    }

    return statuses;
  }

  private async analyseOne(
    alert: AlertToAnalyse,
    profile: StoredProfile | null,
    usage: { done: number; attempts: number },
    day: string,
  ): Promise<{ status: AiAnalysisStatus; analysis: JobAlertAnalysis | null }> {
    if (usage.attempts >= this.deps.config.dailyCap)
      return { analysis: null, status: "capped" };

    // The day is paid for once something succeeded; until then, an empty
    // balance means no call at all — the alert still goes, without analysis.
    const unpaid = usage.done === 0;
    if (unpaid && !(await this.canPay(alert.userEmail))) {
      return { analysis: null, status: "no_credit" };
    }

    const analysis = await this.callModel(alert, profile).catch(
      (error: unknown) => {
        this.logger.warn(
          `Analysis of alert ${alert.id} failed: ${String(error)}`,
        );
        return null;
      },
    );
    if (!analysis) return { analysis: null, status: "failed" };

    if (unpaid) {
      try {
        await this.deps.credits.consumeCredits({
          action: AI_CREDIT_ACTION_JOB_ALERT_ENRICH,
          idempotencyKey: `${AI_CREDIT_ACTION_JOB_ALERT_ENRICH}:${alert.userEmail}:${day}`,
          userEmail: alert.userEmail,
        });
      } catch (error) {
        // Spent elsewhere in the meantime: the analysis is not given away.
        if (error instanceof InsufficientCreditsException) {
          return { analysis: null, status: "no_credit" };
        }
        throw error;
      }
    }

    return { analysis, status: "done" };
  }

  private async canPay(userEmail: string): Promise<boolean> {
    try {
      await this.deps.credits.assertSufficientCredits(
        AI_CREDIT_ACTION_JOB_ALERT_ENRICH,
        userEmail,
      );
      return true;
    } catch (error) {
      if (error instanceof InsufficientCreditsException) return false;
      throw error;
    }
  }

  private async callModel(
    alert: AlertToAnalyse,
    profile: StoredProfile | null,
  ): Promise<JobAlertAnalysis | null> {
    const analysisProfile = toAnalysisProfile(profile);
    const offer = {
      ...alert.job,
      matchedSkills: alert.matchedSkills,
      missingSkills: alert.missingSkills,
    };
    const raw = await withTimeout(
      withOpenRouterHttpErrors(() =>
        this.deps.openRouter.chat(
          [
            { content: JOB_ALERT_ANALYSIS_SYSTEM_PROMPT, role: "system" },
            {
              content: buildAnalysisUserMessage(analysisProfile, offer),
              role: "user",
            },
          ],
          { feature: "job_alert_enrich", maxTokens: 700, temperature: 0.2 },
        ),
      ),
      CALL_TIMEOUT_MS,
    );

    return readAnalysisResponse(extractJsonFromContent<unknown>(raw), {
      offer,
      profile: analysisProfile,
    });
  }
}

/** No name, no contact, no employer: what the candidate does, never who they are. */
export function toAnalysisProfile(
  profile: StoredProfile | null,
): AnalysisProfile {
  return {
    experiences: (profile?.sections.experiences ?? [])
      .filter((item) => item.role.trim())
      .map((item) => ({ period: item.period, role: item.role })),
    headline: profile?.headline ?? "",
    skills: [
      ...(profile?.sections.technicalSkills ?? []),
      ...(profile?.sections.softSkills ?? []),
    ],
  };
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`no answer within ${ms} ms`)),
      ms,
    );
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
