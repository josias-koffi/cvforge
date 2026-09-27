import { isAcquisitionStep, isAcquisitionTool, isLocale } from "@cvforge/types";
import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { hashIp } from "../shared/ip-hash";
import {
  ACQUISITION_EVENT_STORE,
  type AcquisitionEventStore,
} from "./acquisition.types";

export const INVALID_EVENT_MESSAGE = "Evenement inconnu.";

export type AcquisitionEventRequest = {
  tool: unknown;
  step: unknown;
  locale: unknown;
  ip: string;
};

/** `YYYY-MM-DD` in UTC: the day a visitor is counted in. */
export function toIsoDay(timestamp: number) {
  return new Date(timestamp).toISOString().slice(0, 10);
}

/**
 * Records one step of a free tool's funnel (US-131).
 *
 * Every value is checked against a closed list: this route is public and
 * unauthenticated, so anything else it accepted would be free text written by
 * strangers. The one-row-per-visitor-per-day index and the rate limit of the
 * `events` policy (US-132) bound what a single address can write.
 */
@Injectable()
export class AcquisitionEventsService {
  constructor(
    @Inject(ACQUISITION_EVENT_STORE)
    private readonly store: AcquisitionEventStore,
    private readonly ipHashSecret: string,
    private readonly now: () => number = Date.now,
  ) {}

  async record(request: AcquisitionEventRequest) {
    const { step, tool } = request;

    if (!isAcquisitionTool(tool) || !isAcquisitionStep(step)) {
      throw new BadRequestException(INVALID_EVENT_MESSAGE);
    }

    const day = toIsoDay(this.now());

    await this.store.record({
      day,
      // The day goes into the hash so it rotates: the same visitor is a
      // stranger tomorrow, and nobody can be followed across days.
      ipHash: hashIp(`${day}:${request.ip}`, this.ipHashSecret),
      locale: isLocale(request.locale) ? request.locale : "fr",
      step,
      tool,
    });
  }
}
