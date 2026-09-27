import type { JobSource } from "../../job-search.types";

/** The applicant tracking systems whose job boards are public and free. */
export const boardProviders = [
  "greenhouse",
  "lever",
  "ashby",
  "smartrecruiters",
  "workable",
  "recruitee",
  "personio",
  "welcomekit",
] as const;
export type BoardProvider = (typeof boardProviders)[number];

export interface DetectedBoard {
  provider: BoardProvider;
  /** How the provider names the company on its own API. */
  boardToken: string;
}

/**
 * Reads a job advert URL and tells which applicant tracking system publishes
 * it, and under which company token.
 *
 * This is how the company registry fills itself: from the links France Travail
 * carries for partner offers, and from the offers candidates import into their
 * own applications. Every provider is recognised here, including the ones
 * whose adapter is not written yet — a company found today is collected the
 * day its adapter lands.
 */
export function detectAtsBoard(rawUrl: string): DetectedBoard | null {
  const url = parseUrl(rawUrl);
  if (!url) return null;

  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  const segments = url.pathname.split("/").filter(Boolean);

  // boards.greenhouse.io/acme/jobs/42, job-boards.greenhouse.io/acme/jobs/42,
  // and the embedded form at boards.greenhouse.io/embed/job_app?for=acme
  if (host.endsWith("greenhouse.io")) {
    const embedded = url.searchParams.get("for");
    if (embedded) return board("greenhouse", embedded);

    const [first, second] = segments;
    if (first === "embed") return null;

    return board("greenhouse", first === "boards" ? second : first);
  }

  // jobs.lever.co/acme/uuid
  if (host.endsWith("lever.co")) return board("lever", segments[0]);

  // jobs.ashbyhq.com/acme/uuid
  if (host.endsWith("ashbyhq.com")) return board("ashby", segments[0]);

  // careers.smartrecruiters.com/Acme/... and jobs.smartrecruiters.com/Acme/...
  if (host.endsWith("smartrecruiters.com")) {
    const [first, second] = segments;

    return board("smartrecruiters", first === "oneclick-ui" ? second : first);
  }

  // apply.workable.com/acme/j/ABCDEF/ and acme.workable.com
  if (host.endsWith("workable.com")) {
    if (host === "apply.workable.com") return board("workable", segments[0]);

    return board("workable", host.replace(".workable.com", ""));
  }

  // acme.recruitee.com/o/job-slug
  if (host.endsWith("recruitee.com")) {
    return board("recruitee", host.replace(".recruitee.com", ""));
  }

  // acme.jobs.personio.de / .com / .eu
  const personio = /^(.+)\.jobs\.personio\.(de|com|eu)$/.exec(host);
  if (personio) return board("personio", personio[1]);

  // welcomekit.co/acme/… — Welcome to the Jungle's own hiring product. The
  // welcometothejungle.com pages are a catalogue, not a job board API, so they
  // are deliberately not detected here.
  if (host.endsWith("welcomekit.co")) return board("welcomekit", segments[0]);

  return null;
}

/** The source a board provider's offers are stored under. */
export function sourceForProvider(provider: BoardProvider): JobSource {
  return provider;
}

function board(provider: BoardProvider, token: string | undefined): DetectedBoard | null {
  const cleaned = token?.trim().replace(/^@/, "") ?? "";

  // A token with a dot or a space is a path fragment we misread, not a company.
  if (!cleaned || cleaned.length > 100 || /[\s./?#]/.test(cleaned)) return null;

  return { boardToken: cleaned, provider };
}

function parseUrl(rawUrl: string): URL | null {
  const trimmed = rawUrl?.trim();
  if (!trimmed) return null;

  try {
    return new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }
}
