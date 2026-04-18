export const supportedLocales = ["fr", "en"] as const;
export type Locale = "fr" | "en";

export const HEALTH_STATUS_OK = "ok" as const;

export interface ServiceHealth {
  status: "ok";
  service: string;
}
