/**
 * The CVSpark identity as an e-mail client can take it: hex colours inline
 * (no CSS variables), a system font stack (no web font), a PNG logo (Gmail
 * shows no SVG). Values from `.project/marketing/cvspark-design-system.md`.
 */
export const MAIL_COLORS = {
  primary: "#2D5FFF",
  primaryDark: "#5B82FF",
  spark: "#FFB020",
  background: "#F7F8FA",
  backgroundDark: "#0B1220",
  card: "#FFFFFF",
  cardDark: "#141B2E",
  border: "#E2E5EA",
  borderDark: "#25304A",
  text: "#111827",
  textDark: "#F3F4F6",
  muted: "#6B7280",
  mutedDark: "#9CA3AF",
  tint: "#EEF2FF",
  tintDark: "#1C2748",
} as const;

export const MAIL_FONT =
  "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

export const MAIL_TAGLINE = "Les bonnes offres. Le bon CV. Une étincelle.";

/** Served by the landing (`apps/landing/public/email/`). */
export function mailLogoUrl(landingUrl: string) {
  return `${landingUrl}/email/cvspark-mark.png`;
}

export function mailLegalUrls(landingUrl: string) {
  return {
    privacy: `${landingUrl}/fr/legal/confidentialite`,
    terms: `${landingUrl}/fr/legal/cgu`,
  };
}

/** A path the app knows (`/candidatures?…`) made clickable from a mailbox. */
export function absoluteAppUrl(appUrl: string, pathOrUrl: string) {
  return /^https?:\/\//.test(pathOrUrl)
    ? pathOrUrl
    : `${appUrl}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
}

/**
 * Escapes what a third party wrote.
 *
 * Job titles, company names and the model's own sentences all end up inside
 * the HTML body of an e-mail we send in the candidate's name. None of it is
 * ours, so none of it goes in unescaped — URLs included, since they land in
 * attributes.
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function formatEuros(amountCents: number) {
  return new Intl.NumberFormat("fr-FR", {
    currency: "EUR",
    style: "currency",
  }).format(amountCents / 100);
}

/** « 26 septembre 2026 à 14:32 », Paris time: what the reader's clock says. */
export function formatParisDateTime(iso: string) {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return iso;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/Paris",
  }).format(date);
}
