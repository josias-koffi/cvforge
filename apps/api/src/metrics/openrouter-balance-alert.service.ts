import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { NOTIFICATION_TYPE_OPENROUTER_LOW_BALANCE } from "@cvforge/types";
import type { OpenRouterBalanceService } from "../ai/openrouter-balance.service";
import type { AuthService } from "../auth/auth.service";
import type { NotificationsService } from "../notifications/notifications.service";

const MS_PER_DAY = 86_400_000;

/** Where the alert takes the admin: the balance lives on the metrics screen. */
const ALERT_LINK_HREF = "/admin/metrics";

type AdminLister = Pick<AuthService, "listAccounts">;
type DailyNotifier = Pick<NotificationsService, "createOncePerDay">;

function formatCredits(value: number) {
  return value.toFixed(2);
}

/**
 * Checks the OpenRouter balance once a day and alerts every admin in-app when
 * it falls under the threshold.
 *
 * A plain `setInterval`, like `InterviewPurgeService` — no cron library, no
 * Redis, no queue (the constraint on E16). The point of the timer is that the
 * alert fires without an admin having to open the dashboard first; checking
 * only on read would warn nobody until someone looked.
 */
@Injectable()
export class OpenRouterBalanceAlertService
  implements OnModuleInit, OnModuleDestroy
{
  private intervalId: ReturnType<typeof setInterval> | null = null;
  /** The run started at boot, so shutdown can wait for it. */
  private pending: Promise<unknown> = Promise.resolve();

  constructor(
    private readonly balanceService: OpenRouterBalanceService,
    private readonly authService: AdminLister,
    private readonly notifications: DailyNotifier,
  ) {}

  onModuleInit() {
    this.scheduleCheck();
    this.intervalId = setInterval(() => this.scheduleCheck(), MS_PER_DAY);
  }

  /**
   * Awaiting the run started at boot matters for the one-shot scripts: they
   * close the database as soon as their own work is done, and a check still
   * in flight would then fail on a dead pool and print a stack trace that
   * looks like the script itself failed.
   */
  async onModuleDestroy() {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    await this.pending;
  }

  /**
   * Nothing awaits the scheduled check, so a failure would surface as an
   * unhandled rejection and take the API down. Logged, and the next run retries.
   */
  private scheduleCheck() {
    this.pending = this.checkBalance().catch((error: unknown) => {
      console.error("[openrouter] balance alert failed", error);
    });
  }

  /** Returns how many admins were alerted. */
  async checkBalance(): Promise<number> {
    if (!this.balanceService.isEnabled) {
      return 0;
    }

    const balance = await this.balanceService.getBalance();

    if (!balance) {
      return 0;
    }

    const threshold = this.balanceService.alertThreshold;

    if (balance.remaining >= threshold) {
      return 0;
    }

    const accounts = await this.authService.listAccounts();
    const admins = accounts.filter((account) => account.role === "admin");
    const staleSuffix = balance.stale
      ? " Valeur potentiellement perimee : la derniere lecture du solde a echoue."
      : "";
    let alerted = 0;

    for (const admin of admins) {
      const created = await this.notifications.createOncePerDay({
        linkHref: ALERT_LINK_HREF,
        message: `Le solde OpenRouter est descendu a ${formatCredits(balance.remaining)} credits, sous le seuil d'alerte de ${formatCredits(threshold)}. Rechargez le compte pour ne pas interrompre les generations.${staleSuffix}`,
        title: "Solde OpenRouter bas",
        type: NOTIFICATION_TYPE_OPENROUTER_LOW_BALANCE,
        userEmail: admin.email,
      });

      if (created) {
        alerted += 1;
      }
    }

    return alerted;
  }
}
