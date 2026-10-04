import {
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from "@nestjs/common";
import {
  deleteBefore,
  deletionScheduledAt,
  noticeGivenBefore,
  warnBefore,
} from "../applications/application-retention.rules";
import type { NotificationsService } from "../notifications/notifications.service";
import type {
  ApplicationRetentionStore,
  RetentionCutoffs,
  WarnedApplication,
} from "./application-retention.pg-store";

const DAY_MS = 86_400_000;

/**
 * The sentence the published privacy policy must carry before the first pass
 * (US-170): a candidate is told how long an application is kept before it is
 * deleted, not after.
 */
export const PRIVACY_POLICY_SENTENCE = "un an après leur dernière modification";

/** What one real pass did, kept in `application_retention_runs`. */
export interface ApplicationRetentionStats {
  warned: number;
  candidatesWarned: number;
  emailsSent: number;
  /** Warnings whose in-app notice or e-mail failed; the next pass does not retry them. */
  warningFailures: number;
  deleted: number;
  interviewSessionsDeleted: number;
  matchesDetached: number;
  notificationsDeleted: number;
}

/**
 * Deletes the applications untouched for a year (US-170), fifteen days after
 * warning their candidate, by e-mail and in the app.
 *
 * Same lifecycle as `AtsPurgeService`: at module start, then every 24 hours.
 * Several instances are safe: a warning is claimed by the update that marks
 * it, and the deletion re-reads the rule in its own transaction.
 *
 * **The daily pass starts after a first pass launched by hand**
 * (`applications:purge`), which refuses to run until the privacy policy
 * announces the rule. Nothing is warned or deleted before.
 */
export class ApplicationRetentionService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(ApplicationRetentionService.name);
  private timer: ReturnType<typeof setInterval> | null = null;
  private pending: Promise<unknown> = Promise.resolve();

  constructor(
    private readonly store: ApplicationRetentionStore,
    private readonly notifications: Pick<
      NotificationsService,
      "sendApplicationDeletionWarning"
    >,
    private readonly readPrivacyPolicy: () => Promise<string | null>,
    private readonly now: () => number = Date.now,
  ) {}

  onModuleInit() {
    this.schedulePass();
    this.timer = setInterval(() => this.schedulePass(), DAY_MS);
    this.timer.unref?.();
  }

  async onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;

    await this.pending;
  }

  /** Nothing awaits the pass: an error is logged, tomorrow's retries. */
  private schedulePass() {
    this.pending = this.runIfActivated().catch((error: unknown) => {
      this.logger.error(`Application retention failed: ${String(error)}`);
    });
  }

  async runIfActivated(): Promise<ApplicationRetentionStats | null> {
    if ((await this.store.listRuns(1)).length === 0) return null;

    return this.run();
  }

  /** One pass now: delete what is due, then warn what will be. */
  async run(): Promise<ApplicationRetentionStats> {
    const cutoffs = this.cutoffs();
    const deletion = await this.store.deleteDue(cutoffs);
    const warnedAt = new Date(this.now());
    const warned = await this.store.claimWarnings(cutoffs, warnedAt);
    const stats: ApplicationRetentionStats = {
      candidatesWarned: 0,
      deleted: deletion.applications,
      emailsSent: 0,
      interviewSessionsDeleted: deletion.interviewSessions,
      matchesDetached: deletion.matchesDetached,
      notificationsDeleted: deletion.notifications,
      warned: warned.length,
      warningFailures: 0,
    };

    for (const [userEmail, applications] of groupByCandidate(warned)) {
      try {
        const { emailed } =
          await this.notifications.sendApplicationDeletionWarning({
            applications: applications.map((application) => ({
              companyName: application.companyName,
              deletesAt: deletionScheduledAt({
                deletionWarnedAt: warnedAt.toISOString(),
                updatedAt: application.updatedAt,
              })!,
              id: application.id,
              title: application.title,
            })),
            userEmail,
          });
        stats.candidatesWarned += 1;
        if (emailed) stats.emailsSent += 1;
      } catch (error) {
        stats.warningFailures += 1;
        this.logger.error(
          `Deletion warning to a candidate failed: ${String(error)}`,
        );
      }
    }

    await this.store.recordRun({ ...stats });
    this.logger.log(`Application retention: ${JSON.stringify(stats)}`);

    return stats;
  }

  /** What a pass would do now, writing nothing. */
  preview(): Promise<{ toWarn: number; toDelete: number }> {
    return this.store.countDue(this.cutoffs());
  }

  /** True once the published privacy policy announces the rule. */
  async policyPublished(): Promise<boolean> {
    const policy = (await this.readPrivacyPolicy()) ?? "";

    return normalize(policy).includes(normalize(PRIVACY_POLICY_SENTENCE));
  }

  private cutoffs(): RetentionCutoffs {
    const now = this.now();

    return {
      deleteBefore: deleteBefore(now),
      noticeGivenBefore: noticeGivenBefore(now),
      warnBefore: warnBefore(now),
    };
  }
}

/** One warning per candidate, listing every application concerned. */
function groupByCandidate(warned: WarnedApplication[]) {
  const groups = new Map<string, WarnedApplication[]>();

  for (const application of warned) {
    const group = groups.get(application.userEmail) ?? [];
    group.push(application);
    groups.set(application.userEmail, group);
  }

  return groups;
}

function normalize(text: string) {
  return text.replace(/\s+/g, " ").toLowerCase();
}
