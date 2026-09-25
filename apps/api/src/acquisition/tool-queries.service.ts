import { Logger } from "@nestjs/common";
import type {
  PublicCompanyCheckResponse,
  PublicJobMarketResponse,
} from "@cvforge/types";
import { toIsoDay } from "./acquisition-events.service";
import type { ToolQueryStore } from "./tool-queries.types";

/**
 * Counts what visitors look up in the free tools (US-155), for the cockpit's
 * "most searched employers and jobs". Only a search that found something is
 * counted: a typo is not a demand signal.
 *
 * Fire and forget, like the funnel events: a counter that fails to write must
 * never cost the visitor their answer.
 */
export class ToolQueriesService {
  private readonly logger = new Logger(ToolQueriesService.name);

  constructor(
    private readonly store: ToolQueryStore,
    private readonly now: () => number = Date.now,
  ) {}

  countCompany(response: PublicCompanyCheckResponse) {
    if (response.status !== "found") return;
    const { legalName, siren } = response.company;

    this.increment("company_check", siren, legalName, "");
  }

  countJob(response: PublicJobMarketResponse) {
    const { appellation, departmentLabel } = response;

    this.increment(
      "job_market",
      appellation.code,
      appellation.libelle,
      departmentLabel,
    );
  }

  private increment(
    tool: "company_check" | "job_market",
    queryKey: string,
    label: string,
    place: string,
  ) {
    this.store
      .increment({ day: toIsoDay(this.now()), label, place, queryKey, tool })
      .catch((error: unknown) => {
        this.logger.warn(
          `Tool query not counted (${tool}): ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      });
  }
}
