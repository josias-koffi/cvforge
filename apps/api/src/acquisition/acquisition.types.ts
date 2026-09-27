import type { AcquisitionStep, AcquisitionTool, Locale } from "@cvforge/types";

export const ACQUISITION_EVENT_STORE = Symbol("ACQUISITION_EVENT_STORE");

/** `day` is an ISO date (`YYYY-MM-DD`), the unit a visitor is counted in. */
export type NewAcquisitionEvent = {
  day: string;
  tool: AcquisitionTool;
  step: AcquisitionStep;
  locale: Locale;
  ipHash: string;
};

export type AcquisitionEventStore = {
  /** A visitor already counted for this step today is silently ignored. */
  record: (event: NewAcquisitionEvent) => Promise<void>;
  /** Drops every day strictly before `day`; answers how many rows went. */
  deleteBefore: (day: string) => Promise<number>;
};
