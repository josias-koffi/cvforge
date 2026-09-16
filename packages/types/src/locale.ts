export const supportedLocales = ["fr", "en"] as const;
export type Locale = "fr" | "en";

export function isLocale(value: unknown): value is Locale {
  return (supportedLocales as readonly unknown[]).includes(value);
}
