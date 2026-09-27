import { htmlToText } from "../../job-listing.normalize";
import {
  emptyDetails,
  facts,
  hostOf,
  list,
  type ListingForDetails,
  type OfferDetails,
  record,
  text,
  webUrl,
} from "../../offer-details.types";

/**
 * What a company's own job board says beyond the advert text. On a board,
 * the application form is the employer's own, and its careers page is the
 * board itself — derived from the advert's URL, which carries the company.
 */
export function readBoardDetails(listing: ListingForDetails): OfferDetails {
  const raw = record(listing.raw);
  const applyUrl = webUrl(listing.applyUrl) || webUrl(listing.url);
  const base: OfferDetails = {
    ...emptyDetails(listing.source),
    apply: applyUrl
      ? { host: hostOf(applyUrl), name: "", target: "employer", url: applyUrl }
      : null,
    companyWebsite: careersPage(listing.url),
  };

  switch (listing.source) {
    case "lever":
      return { ...base, ...readLever(raw) };
    case "ashby":
      return { ...base, ...readAshby(raw) };
    case "greenhouse":
      return { ...base, ...readGreenhouse(raw) };
    case "smartrecruiters":
      return { ...base, ...readSmartRecruiters(raw) };
    default:
      return base;
  }
}

/** Where each hosted board keeps a company's page: its first path segment. */
const HOSTED_BOARDS: Record<string, (company: string) => string> = {
  "boards.greenhouse.io": (company) =>
    `https://job-boards.greenhouse.io/${company}`,
  "job-boards.greenhouse.io": (company) =>
    `https://job-boards.greenhouse.io/${company}`,
  "jobs.ashbyhq.com": (company) => `https://jobs.ashbyhq.com/${company}`,
  "jobs.lever.co": (company) => `https://jobs.lever.co/${company}`,
  "jobs.smartrecruiters.com": (company) =>
    `https://careers.smartrecruiters.com/${company}`,
};

/**
 * The company's careers page. An advert served from the company's own domain
 * (a Greenhouse board embedded in a careers site) points to that site.
 */
export function careersPage(advertUrl: string): string {
  const url = webUrl(advertUrl);
  if (!url) return "";

  const { hostname, origin, pathname } = new URL(url);
  const hosted = HOSTED_BOARDS[hostname];
  if (!hosted) return origin;

  const company = pathname.split("/").find(Boolean);
  return company ? hosted(company) : "";
}

const WORKPLACE_LABELS: Record<string, string> = {
  hybrid: "Hybride",
  onsite: "Sur site",
  remote: "Télétravail",
};

function workplace(value: unknown): string {
  return WORKPLACE_LABELS[text(value).toLowerCase()] ?? "";
}

function readLever(raw: Record<string, unknown>): Partial<OfferDetails> {
  const categories = record(raw.categories);

  return {
    facts: facts([
      ["Contrat", text(categories.commitment)],
      ["Mode de travail", workplace(raw.workplaceType)],
      ["Service", text(categories.department)],
      ["Équipe", text(categories.team)],
    ]),
    salary: leverSalary(
      record(raw.salaryRange),
      text(raw.salaryDescriptionPlain),
    ),
    // Lever keeps "What we are looking for", "Benefits"… out of the description.
    sections: list(raw.lists).flatMap((entry) => {
      const title = text(record(entry).text).replace(/\s*:$/, "");
      const body = htmlToText(text(record(entry).content));
      return title && body ? [{ text: body, title }] : [];
    }),
  };
}

const INTERVALS: Record<string, string> = {
  "per-day-wage": "par jour",
  "per-hour-wage": "par heure",
  "per-month-salary": "par mois",
  "per-year-salary": "par an",
};

function leverSalary(
  range: Record<string, unknown>,
  comment: string,
): OfferDetails["salary"] {
  const amount = (value: unknown) =>
    typeof value === "number" && value > 0
      ? new Intl.NumberFormat("fr-FR", {
          currency: text(range.currency) || "EUR",
          maximumFractionDigits: 0,
          style: "currency",
        }).format(value)
      : "";
  const span = [amount(range.min), amount(range.max)]
    .filter(Boolean)
    .join(" – ");
  const label = span
    ? [span, INTERVALS[text(range.interval)] ?? ""].filter(Boolean).join(" ")
    : "";

  return label || comment ? { benefits: [], comment, label } : null;
}

const EMPLOYMENT_LABELS: Record<string, string> = {
  Contract: "Contrat de mission",
  FullTime: "Temps plein",
  Intern: "Stage",
  PartTime: "Temps partiel",
  Temporary: "Temporaire",
};

function readAshby(raw: Record<string, unknown>): Partial<OfferDetails> {
  const summary = text(record(raw.compensation).compensationTierSummary);

  return {
    facts: facts([
      [
        "Contrat",
        EMPLOYMENT_LABELS[text(raw.employmentType)] ?? text(raw.employmentType),
      ],
      ["Mode de travail", workplace(raw.workplaceType)],
      ["Service", text(raw.department)],
      ["Équipe", text(raw.team)],
    ]),
    salary: summary ? { benefits: [], comment: "", label: summary } : null,
  };
}

function readGreenhouse(raw: Record<string, unknown>): Partial<OfferDetails> {
  const names = (value: unknown) =>
    list(value)
      .map((entry) => text(record(entry).name))
      .filter(Boolean)
      .join(", ");

  return {
    facts: facts([
      ["Service", names(raw.departments)],
      ["Bureaux", names(raw.offices)],
    ]),
    education:
      text(raw.education) === "education_required"
        ? [{ label: "Diplôme exigé", required: true }]
        : [],
  };
}

function readSmartRecruiters(
  raw: Record<string, unknown>,
): Partial<OfferDetails> {
  // "Other" is SmartRecruiters' way of saying nothing.
  const label = (value: unknown) => {
    const read = text(record(value).label);
    return read.toLowerCase() === "other" ? "" : read;
  };
  const location = record(raw.location);

  return {
    facts: facts([
      ["Contrat", label(raw.typeOfEmployment)],
      [
        "Mode de travail",
        location.remote === true
          ? "Télétravail"
          : location.hybrid === true
            ? "Hybride"
            : "",
      ],
      ["Niveau", label(raw.experienceLevel)],
      ["Secteur", label(raw.industry)],
      ["Fonction", label(raw.function)],
      ["Service", label(raw.department)],
    ]),
  };
}
