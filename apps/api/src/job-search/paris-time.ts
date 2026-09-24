const PARIS_TIME_ZONE = "Europe/Paris";
/** Below every threshold: an hour we cannot read never opens a gate. */
const UNREADABLE_HOUR = -1;

/** The run is a Paris day, not a UTC one: 6:00 means 6:00 for the candidate. */
export function dateInParis(timestamp: number): string {
  return new Intl.DateTimeFormat("fr-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: PARIS_TIME_ZONE,
    year: "numeric",
  }).format(new Date(timestamp));
}

/**
 * Read from the formatted **parts**, not from the formatted string: a French
 * locale renders the hour as "08 h", and `Number("08 h")` is NaN — which then
 * fails every comparison silently and lets the run start at any hour.
 */
export function hourInParis(timestamp: number): number {
  const hour = new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    hour12: false,
    timeZone: PARIS_TIME_ZONE,
  })
    .formatToParts(new Date(timestamp))
    .find((part) => part.type === "hour")?.value;

  const parsed = Number(hour);

  // An hour we cannot read must not open the gate.
  return Number.isFinite(parsed) ? parsed % 24 : UNREADABLE_HOUR;
}
