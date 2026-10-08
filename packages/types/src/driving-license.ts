/**
 * The French driving licence categories a candidate can tick on their
 * profile, in the order the licence itself prints them. Kept as plain codes:
 * a CV writes "Permis B", never "Véhicule léger".
 */
export const DRIVING_LICENSE_CATEGORIES = [
  "AM",
  "A1",
  "A2",
  "A",
  "B",
  "BE",
  "C1",
  "C1E",
  "C",
  "CE",
  "D1",
  "D1E",
  "D",
  "DE",
] as const;

export type DrivingLicenseCategory = (typeof DRIVING_LICENSE_CATEGORIES)[number];

/** Known categories only, once each, in licence order; anything else is dropped. */
export function normalizeDrivingLicenses(value: unknown): DrivingLicenseCategory[] {
  if (!Array.isArray(value)) return [];
  const known = new Set<string>();
  for (const item of value) {
    if (typeof item === "string") known.add(item.trim().toUpperCase());
  }
  return DRIVING_LICENSE_CATEGORIES.filter((category) => known.has(category));
}
