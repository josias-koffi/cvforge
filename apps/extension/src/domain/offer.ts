import {
  AI_CREDIT_ACTION_CV_GENERATION,
  AI_CREDIT_ACTION_LETTER_GENERATION,
  AI_CREDIT_ACTION_OFFER_ENRICHMENT,
  AI_CREDIT_COSTS,
  APPLICATION_STATUS_DRAFT,
} from "@cvforge/types";

/** The fields of `list_applications` the extension relies on. */
export type ApplicationSummary = {
  id: string;
  offerUrl: string | null;
  status: string;
  title: string | null;
  company: string | null;
  cvGeneratedAt: string | null;
  letterGeneratedAt: string | null;
};

export type PreparationStep = "import" | "cv" | "letter";

export const STEP_COSTS: Record<PreparationStep, number> = {
  cv: AI_CREDIT_COSTS[AI_CREDIT_ACTION_CV_GENERATION],
  import: AI_CREDIT_COSTS[AI_CREDIT_ACTION_OFFER_ENRICHMENT],
  letter: AI_CREDIT_COSTS[AI_CREDIT_ACTION_LETTER_GENERATION],
};

/** Below this, a page's text is not an offer (same floor as the API). */
export const MIN_PAGE_TEXT = 50;
export const MAX_PAGE_TEXT = 30_000;

const TRACKING_PARAM =
  /^(utm_[a-z]+|gclid|fbclid|msclkid|mc_[a-z]+|_hs[a-z]+|ref|refid|trk|source|src)$/i;

/**
 * The same offer reached from a newsletter, a search or a share link: no
 * fragment, no tracking parameters, no trailing slash, host in lower case.
 */
export function normalizeOfferUrl(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;

  url.hash = "";
  for (const key of [...url.searchParams.keys()]) {
    if (TRACKING_PARAM.test(key)) url.searchParams.delete(key);
  }
  url.searchParams.sort();
  const path = url.pathname.replace(/\/+$/, "") || "/";
  return `${url.protocol}//${url.host.toLowerCase()}${path}${url.search}`;
}

/**
 * The page is the offer's, or its application form at a longer address on
 * the same site (Lever `…/apply`, Ashby `…/application`, Workable `…/apply/`).
 */
export function isOfferPage(offerUrl: string, pageUrl: string): boolean {
  const offer = normalizeOfferUrl(offerUrl);
  const page = normalizeOfferUrl(pageUrl);
  if (!offer || !page) return false;
  if (offer === page) return true;
  const a = new URL(offer);
  const b = new URL(page);
  return (
    a.host === b.host &&
    a.pathname !== "/" &&
    b.pathname.startsWith(`${a.pathname}/`)
  );
}

/** The candidate's application for this page, if there is one. */
export function findApplicationFor(
  applications: readonly ApplicationSummary[],
  pageUrl: string,
): ApplicationSummary | null {
  return (
    applications.find(
      (application) =>
        application.offerUrl !== null &&
        isOfferPage(application.offerUrl, pageUrl),
    ) ?? null
  );
}

export type PreparationPlan = {
  steps: PreparationStep[];
  cost: number;
  /** Already sent (or further): never prepared again from the extension. */
  alreadySent: boolean;
};

/** What is left to do for this offer, and what it costs. */
export function planPreparation(
  existing: ApplicationSummary | null,
): PreparationPlan {
  if (existing && existing.status !== APPLICATION_STATUS_DRAFT) {
    return { alreadySent: true, cost: 0, steps: [] };
  }
  const steps: PreparationStep[] = [];
  if (!existing) steps.push("import");
  if (!existing?.cvGeneratedAt) steps.push("cv");
  if (!existing?.letterGeneratedAt) steps.push("letter");

  return {
    alreadySent: false,
    cost: steps.reduce((sum, step) => sum + STEP_COSTS[step], 0),
    steps,
  };
}

/** The page text the API can structure, or null when there is not enough. */
export function usablePageText(text: string): string | null {
  const trimmed = text.replace(/\s+\n/g, "\n").trim();
  if (trimmed.length < MIN_PAGE_TEXT) return null;
  return trimmed.slice(0, MAX_PAGE_TEXT);
}

/** A page an offer can be read from (not chrome://, not the extension itself). */
export function isWebPage(url: string | undefined): url is string {
  return Boolean(url && /^https?:\/\//.test(url));
}
