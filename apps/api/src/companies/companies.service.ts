import {
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from "@nestjs/common";
import type { CompaniesStore } from "./companies.pg-store";
import type { CompanySources } from "./company-sources";
import type { StoredCompany } from "./company-record";
import type { EmployerPagesSource } from "./employer-pages.source";

const HOUR_MS = 60 * 60_000;
/** A company's record changes yearly at most: a month is plenty. */
const REFRESH_EVERY_MS = 30 * 24 * HOUR_MS;
const CHECK_INTERVAL_MS = HOUR_MS;
/** A hundred companies at two calls a second: under two minutes an hour. */
const MAX_READS_PER_CHECK = 100;

export type CompaniesRefreshOutcome =
  | { status: "skipped"; reason: "running" }
  | { status: "done"; read: number; unknown: number; failed: number };

/**
 * The company behind each establishment La Bonne Boîte lists (US-121), read
 * monthly in the background from public sources, with its France Travail
 * employer page when Pages employeurs is enabled (US-116). Pages only read
 * the copy.
 */
export class CompaniesService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CompaniesService.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    private readonly store: CompaniesStore,
    private readonly sources: Pick<CompanySources, "read">,
    private readonly employerPages: Pick<EmployerPagesSource, "isAvailable" | "find">,
    private readonly now: () => number = Date.now,
  ) {}

  onModuleInit() {
    this.timer = setInterval(() => {
      void this.refreshDue().catch((error: unknown) => {
        this.logger.error(`Companies refresh failed: ${String(error)}`);
      });
    }, CHECK_INTERVAL_MS);
    this.timer.unref?.();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async refreshDue(limit = MAX_READS_PER_CHECK): Promise<CompaniesRefreshOutcome> {
    if (this.running) return { reason: "running", status: "skipped" };

    this.running = true;
    try {
      const employerPages = this.employerPages.isAvailable();
      const due = await this.store.due(
        new Date(this.now() - REFRESH_EVERY_MS),
        limit,
        { employerPages },
      );
      let read = 0;
      let unknown = 0;
      let failed = 0;

      for (const { department, name, siren } of due) {
        const record = await this.sources.read(siren);

        if (record === undefined) {
          failed += 1;
          continue;
        }

        // A failed page keeps the one already known: `undefined` is not "none".
        const page =
          record && employerPages
            ? await this.employerPages.find(
                siren,
                [name, record.legalName],
                department,
              )
            : undefined;

        await this.store.save(siren, record, new Date(this.now()), page);
        if (record) read += 1;
        else unknown += 1;
      }

      if (due.length > 0) {
        this.logger.log(
          `Companies: ${read} read, ${unknown} unknown, ${failed} failed.`,
        );
      }

      return { failed, read, status: "done", unknown };
    } finally {
      this.running = false;
    }
  }

  /** The records already read, by SIREN. */
  async bySiren(sirens: readonly string[]): Promise<Map<string, StoredCompany>> {
    const rows = await this.store.findMany([...new Set(sirens)]);

    return new Map(rows.map((row) => [row.siren, row]));
  }
}
