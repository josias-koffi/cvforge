import { randomUUID } from "node:crypto";
import type {
  JobAlertNotificationOffer,
  JobAlertPreferences,
} from "@cvforge/types";
import {
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from "@nestjs/common";
import type { JobAlertInbox } from "../notifications/job-alert-inbox";
import type { NotificationsService } from "../notifications/notifications.service";
import type { PushNotifier } from "../notifications/push-notifier";
import type {
  AlertMatchesStore,
  AlertSendHistory,
  PendingAlert,
} from "./alert-matches.pg-store";
import { ANALYSIS_WAIT_MS } from "./job-alert-enrich.service";
import type { JobStreamCursorsStore } from "./job-stream.types";
import { dateInParis, hourInParis } from "./paris-time";

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
/** Checked every minute: an immediate alert leaves within a minute or two. */
const DISPATCH_INTERVAL_MS = MINUTE_MS;
/** Nothing goes out from 21:00 to 7:00, Paris time; 7:00 sends one notification. */
export const QUIET_HOURS = { from: 21, until: 7 } as const;
/** Default of `JOB_ALERT_DAILY_IMMEDIATE_CAP`, decided by the owner on 2026-10-02. */
const DEFAULT_DAILY_IMMEDIATE_CAP = 10;
/** Default of `JOB_ALERT_DAILY_PUSH_CAP`, decided by the owner on 2026-11-18. */
const DEFAULT_DAILY_PUSH_CAP = 2;
/** An alert older than this is the morning recap's business, not an alert's. */
const PENDING_WINDOW_MS = 24 * HOUR_MS;
const PENDING_BATCH = 500;
/** Offers named in one grouped notification; the rest follow in the next one. */
export const MAX_OFFERS_PER_NOTIFICATION = 20;
const LEASE_MS = 5 * MINUTE_MS;
export const ALERTS_STREAM_KEY = "job_alerts";

export interface JobAlertConfig {
  /** Offers a day sent one by one; past it, the candidate gets them grouped hourly. */
  dailyImmediateCap: number;
  /** Notifications a day that also buzz the devices; past it, in the app only. */
  dailyPushCap: number;
}

/** Always on: a candidate's own preferences decide whether alerts reach them. */
export function resolveJobAlertConfig(
  env: NodeJS.ProcessEnv = process.env,
): JobAlertConfig {
  return {
    dailyImmediateCap: readCap(
      env.JOB_ALERT_DAILY_IMMEDIATE_CAP,
      DEFAULT_DAILY_IMMEDIATE_CAP,
    ),
    dailyPushCap: readCap(env.JOB_ALERT_DAILY_PUSH_CAP, DEFAULT_DAILY_PUSH_CAP),
  };
}

function readCap(value: string | undefined, fallback: number): number {
  const cap = Number(value);

  return value !== undefined && Number.isInteger(cap) && cap >= 0
    ? cap
    : fallback;
}

export type AlertDispatchResult =
  | { status: "skipped"; reason: string }
  | { status: "locked" }
  | {
      status: "done";
      notifications: number;
      pushed: number;
      offers: number;
      waiting: number;
      errors: string[];
    };

type Notifications = Pick<NotificationsService, "readJobAlertPreferences">;

/**
 * Raises the "Nouvelle offre pour vous" notifications (E27, US-166): in the
 * app, and pushed to the devices the candidate enabled. No e-mail any more —
 * they used up the sending quota and cluttered inboxes (2026-11-18).
 *
 * Runs on its own timer, apart from the collection. Each candidate's
 * preferences decide the rhythm; three guards keep it from turning into spam
 * — a daily cap past which alerts are grouped, quiet hours, and at most
 * `dailyPushCap` pushes a day, the rest waiting in the app. Free: no credit.
 */
export class JobAlertDispatcher implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(JobAlertDispatcher.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    private readonly alerts: Pick<
      AlertMatchesStore,
      "listPending" | "sendHistory" | "markAlertSent"
    >,
    private readonly notifications: Notifications,
    private readonly inbox: Pick<JobAlertInbox, "add" | "countPushed">,
    private readonly push: Pick<PushNotifier, "notify">,
    private readonly cursors: JobStreamCursorsStore,
    private readonly config: JobAlertConfig,
    private readonly now: () => number = Date.now,
    private readonly owner: string = randomUUID(),
  ) {}

  onModuleInit() {
    this.timer = setInterval(() => {
      void this.tick().catch((error: unknown) => {
        this.logger.error(`Alert dispatch failed: ${String(error)}`);
      });
    }, DISPATCH_INTERVAL_MS);
    this.timer.unref?.();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async tick(): Promise<AlertDispatchResult> {
    if (this.running) return { reason: "already running", status: "skipped" };
    if (isQuietHour(this.now()))
      return { reason: "heures calmes", status: "skipped" };

    const lease = await this.cursors.claim(
      ALERTS_STREAM_KEY,
      this.owner,
      LEASE_MS,
    );
    if (!lease) return { status: "locked" };

    this.running = true;

    try {
      return await this.dispatchPending();
    } finally {
      this.running = false;
      await this.cursors.release(ALERTS_STREAM_KEY, this.owner);
    }
  }

  private async dispatchPending(): Promise<AlertDispatchResult> {
    const now = this.now();
    const pending = await this.alerts.listPending(
      new Date(now - PENDING_WINDOW_MS).toISOString(),
      PENDING_BATCH,
    );
    const byUser = groupByUser(pending);
    const history = await this.alerts.sendHistory(
      [...byUser.keys()],
      dateInParis(now),
    );
    const result = {
      errors: [] as string[],
      notifications: 0,
      offers: 0,
      pushed: 0,
      status: "done" as const,
      waiting: 0,
    };

    for (const [userEmail, userAlerts] of byUser) {
      try {
        const sent = await this.dispatchUser(
          userEmail,
          userAlerts,
          history.get(userEmail) ?? { lastSentAt: null, sentToday: 0 },
        );
        if (sent.offers === 0) result.waiting += userAlerts.length;
        else {
          result.notifications += 1;
          result.offers += sent.offers;
          if (sent.pushed) result.pushed += 1;
        }
      } catch (error) {
        // One candidate whose notification fails waits for the next minute;
        // the others are not held up.
        result.errors.push(`${userEmail}: ${String(error)}`);
      }
    }

    if (result.errors.length > 0) {
      this.logger.warn(
        `Alerts: ${result.errors.length} failure(s), first: ${result.errors[0]}`,
      );
    }

    return result;
  }

  /** How many offers went out to this candidate, 0 when they wait. */
  private async dispatchUser(
    userEmail: string,
    pending: PendingAlert[],
    history: AlertSendHistory,
  ): Promise<{ offers: number; pushed: boolean }> {
    const waiting = { offers: 0, pushed: false };
    const preferences =
      await this.notifications.readJobAlertPreferences(userEmail);
    // Turned off since: the morning recap takes the pending ones over.
    if (!preferences.enabled) return waiting;

    const now = this.now();
    if (!dueNow(preferences, history, this.config.dailyImmediateCap, now))
      return waiting;

    const batch = sendable(pending, preferences, now).slice(
      0,
      MAX_OFFERS_PER_NOTIFICATION,
    );
    const [first] = batch;
    if (!first) return waiting;

    const pushedToday = await this.inbox.countPushed(
      userEmail,
      dateInParis(now),
    );
    const pushed = pushedToday < this.config.dailyPushCap;
    const notification = await this.inbox.add({
      offers: batch.map((alert) => toOffer(alert, preferences.aiAnalysis)),
      pushed,
      reasons: alertReasons(first),
      userEmail,
    });

    await this.alerts.markAlertSent(
      batch.map((alert) => alert.id),
      new Date(now).toISOString(),
    );

    // After the alerts are marked: a push service that fails must not get
    // the same offers announced again next minute.
    if (pushed) {
      await this.push.notify(userEmail, {
        body: notification.message,
        tag: "job-alert",
        title: notification.title,
        url: notification.linkHref,
      });
    }

    return { offers: batch.length, pushed };
  }
}

function toOffer(
  alert: PendingAlert,
  withAnalysis: boolean,
): JobAlertNotificationOffer {
  return {
    companyName: alert.companyName,
    jobId: alert.jobId,
    locationLabel: alert.locationLabel,
    sourceLabel: sourceLabel(alert.source),
    title: alert.title,
    // Beside the offer, never in its place.
    verdict: withAnalysis ? (alert.aiAnalysis?.verdict ?? null) : null,
  };
}

/**
 * What can go now. With the paid analysis, a fresh alert waits for it a
 * minute at most; with the candidate's filter on, an offer the analysis
 * judged "à passer" is not sent — it stays in the app with its analysis.
 * Without the option, every alert goes, exactly as for anyone else.
 */
export function sendable(
  pending: readonly PendingAlert[],
  preferences: JobAlertPreferences,
  now: number,
): PendingAlert[] {
  if (!preferences.aiAnalysis) return [...pending];

  return pending.filter((alert) => {
    const analysing =
      alert.aiAnalysisStatus === null &&
      now - Date.parse(alert.detectedAt) < ANALYSIS_WAIT_MS;
    const skipped =
      preferences.aiFilter && alert.aiAnalysis?.verdict === "skip";

    return !analysing && !skipped;
  });
}

/**
 * Immediately while under the daily cap and on the immediate rhythm;
 * otherwise once an hour at most, counting from the last alert e-mail.
 */
export function dueNow(
  preferences: JobAlertPreferences,
  history: AlertSendHistory,
  dailyImmediateCap: number,
  now: number,
): boolean {
  const grouped =
    preferences.rhythm === "hourly" || history.sentToday >= dailyImmediateCap;
  if (!grouped || !history.lastSentAt) return true;

  return now - Date.parse(history.lastSentAt) >= HOUR_MS;
}

export function isQuietHour(now: number): boolean {
  const hour = hourInParis(now);

  return hour >= QUIET_HOURS.from || hour < QUIET_HOURS.until;
}

/** Why the offer matches, in the candidate's own words where possible. */
export function alertReasons(
  alert: Pick<PendingAlert, "matchedSkills" | "remote">,
): string[] {
  const reasons: string[] = [];

  if (alert.matchedSkills.length > 0) {
    reasons.push(
      `vos compétences en ${alert.matchedSkills.slice(0, 3).join(", ")}`,
    );
  }
  if (alert.remote) reasons.push("télétravail possible");
  if (reasons.length === 0)
    reasons.push("le poste que vous cherchez, près de chez vous");

  return reasons;
}

/** Cited on every offer: the France Travail licence asks for it. */
export function sourceLabel(source: PendingAlert["source"]): string {
  if (source === "france_travail") return "France Travail";
  if (source === "la_bonne_alternance") return "La bonne alternance";

  return "Site carrière de l'entreprise";
}

function groupByUser(
  alerts: readonly PendingAlert[],
): Map<string, PendingAlert[]> {
  const byUser = new Map<string, PendingAlert[]>();

  for (const alert of alerts) {
    byUser.set(alert.userEmail, [
      ...(byUser.get(alert.userEmail) ?? []),
      alert,
    ]);
  }

  return byUser;
}
