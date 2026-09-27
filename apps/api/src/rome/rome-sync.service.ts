import {
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from "@nestjs/common";
import {
  countsOf,
  retiredCodes,
  romeAttribution,
  shrinkageProblem,
} from "./rome-referential";
import type { RomeReferentialClient } from "./rome-referential.client";
import type {
  RomeCodeHolder,
  RomeEntity,
  RomeHolderOutcome,
  RomeReferential,
  RomeStore,
  RomeSubstitution,
} from "./rome.types";

const HOUR_MS = 60 * 60_000;
const DAY_MS = 24 * HOUR_MS;
/** The ROME changes a few times a year; a week is plenty, and cheap: three calls. */
const SYNC_EVERY_MS = 7 * DAY_MS;
/** After a failure, wait before the next attempt rather than retrying hourly. */
const RETRY_AFTER_FAILURE_MS = 6 * HOUR_MS;
const CHECK_INTERVAL_MS = HOUR_MS;
/** No sync takes this long; a `running` row this old belongs to a dead process. */
const STALE_RUN_MS = 2 * HOUR_MS;
/** Enough to recognise what France Travail retired, not a whole dump in a row. */
const RETIRED_SAMPLE = 20;
/**
 * Substitutions are asked one code at a time, at one call a second: a cap
 * keeps a sync short. Codes left over are asked at the next sync.
 */
const MAX_SUBSTITUTION_LOOKUPS = 200;

export type RomeSyncOutcome =
  | { status: "skipped"; reason: "unavailable" | "locked" | "not-due" }
  | { status: "done"; stats: Record<string, unknown> }
  | { status: "failed"; error: string };

/**
 * Keeps the local ROME referential in step with France Travail (ADR-024).
 *
 * Scheduled like the morning collection — a plain interval, no queue — and
 * safe for several API instances through the `rome_sync_runs` lock.
 */
export class RomeSyncService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RomeSyncService.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly store: RomeStore,
    private readonly client: RomeReferentialClient,
    /** Every table storing ROME codes for users; they follow substitutions. */
    private readonly holders: readonly RomeCodeHolder[],
    private readonly now: () => number = Date.now,
  ) {}

  onModuleInit() {
    this.timer = setInterval(() => {
      void this.runIfDue().catch((error: unknown) => {
        this.logger.error(`ROME sync check failed: ${String(error)}`);
      });
    }, CHECK_INTERVAL_MS);
    this.timer.unref?.();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async runIfDue(): Promise<RomeSyncOutcome> {
    if (!(await this.isDue())) return { reason: "not-due", status: "skipped" };

    return this.run();
  }

  /**
   * One sync: download, check, replace, then apply pending substitutions.
   * Replaying it changes nothing but the run log.
   */
  async run(): Promise<RomeSyncOutcome> {
    if (!this.client.isAvailable()) {
      return { reason: "unavailable", status: "skipped" };
    }

    await this.store.recoverStale(STALE_RUN_MS);
    const run = await this.store.claimRun();
    if (!run) return { reason: "locked", status: "skipped" };

    try {
      const stats = await this.sync();
      await this.store.finishRun(run.id, { stats, status: "done" });
      this.logger.log(
        `ROME referential synced: ${JSON.stringify(stats.counts)}`,
      );

      return { stats, status: "done" };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.store.finishRun(run.id, {
        stats: { error: message },
        status: "failed",
      });
      this.logger.warn(
        `ROME sync failed, previous referential kept: ${message}`,
      );

      return { error: message, status: "failed" };
    }
  }

  private async isDue(): Promise<boolean> {
    if (!this.client.isAvailable()) return false;

    const lastDone = await this.store.lastRun("done");
    if (lastDone && this.now() - lastDone.startedAt.getTime() < SYNC_EVERY_MS) {
      return false;
    }

    const last = await this.store.lastRun();
    return !(
      last?.status === "failed" &&
      this.now() - last.startedAt.getTime() < RETRY_AFTER_FAILURE_MS
    );
  }

  private async sync(): Promise<Record<string, unknown>> {
    const { referential, dropped } = await this.client.fetch();
    const next = countsOf(referential);
    const problem = shrinkageProblem(await this.store.counts(), next);

    if (problem) throw new Error(`download refused, ${problem}`);

    const retired = await this.retired(referential);
    await this.store.replace(referential);
    const lookups = await this.lookUpSubstitutions(referential);
    const substitutions = await this.applyPendingSubstitutions();

    return {
      counts: next,
      dropped,
      lookups,
      retired,
      source: romeAttribution(referential.versions),
      substitutions,
      versions: referential.versions,
    };
  }

  /**
   * Codes that vanished are only reported here: a user's saved code is never
   * deleted on a guess. The Substitutions API is what rewrites them.
   */
  private async retired(referential: RomeReferential) {
    const lists = listsOf(referential);
    const report: Partial<
      Record<RomeEntity, { count: number; sample: string[] }>
    > = {};

    for (const entity of Object.keys(lists) as RomeEntity[]) {
      const codes = retiredCodes(await this.store.codes(entity), lists[entity]);

      if (codes.length > 0) {
        report[entity] = {
          count: codes.length,
          sample: codes.slice(0, RETIRED_SAMPLE),
        };
      }
    }

    return report;
  }

  /**
   * Asks France Travail for the successor of every code a user still holds
   * that the new referential no longer lists, and records those it names.
   * Retired codes nobody holds are not asked: there is nothing to rewrite.
   */
  private async lookUpSubstitutions(referential: RomeReferential) {
    if (!this.client.substitutionsAvailable()) return { skipped: "unavailable" };

    const lists = listsOf(referential);
    const found: Array<Omit<RomeSubstitution, "id">> = [];
    const report = { asked: 0, failed: 0, recorded: 0, withoutSuccessor: 0 };

    for (const entity of Object.keys(lists) as RomeEntity[]) {
      const known = new Set(lists[entity].map((entry) => entry.code));
      const stale = [...(await this.store.heldCodes(entity, this.holders))]
        .filter((code) => !known.has(code))
        .sort();

      for (const oldCode of stale) {
        if (report.asked >= MAX_SUBSTITUTION_LOOKUPS) break;
        report.asked += 1;

        const newCode = await this.client.findSubstitution(entity, oldCode);
        if (newCode === undefined) report.failed += 1;
        else if (newCode === null) report.withoutSuccessor += 1;
        else found.push({ entity, newCode, oldCode });
      }
    }

    report.recorded = await this.store.recordSubstitutions(found);
    return report;
  }

  private async applyPendingSubstitutions() {
    const applied: Array<{
      entity: RomeEntity;
      oldCode: string;
      newCode: string;
      tables: Record<string, RomeHolderOutcome>;
    }> = [];

    for (const substitution of await this.store.pendingSubstitutions()) {
      const tables = await this.store.applySubstitution(
        substitution,
        this.holders,
      );
      applied.push({
        entity: substitution.entity,
        newCode: substitution.newCode,
        oldCode: substitution.oldCode,
        tables,
      });
      this.logger.log(
        `ROME ${substitution.entity} ${substitution.oldCode} → ${substitution.newCode}: ${JSON.stringify(tables)}`,
      );
    }

    return applied;
  }
}

function listsOf(
  referential: RomeReferential,
): Record<RomeEntity, readonly { code: string }[]> {
  return {
    appellation: referential.appellations,
    competence: referential.competences,
    metier: referential.metiers,
  };
}
