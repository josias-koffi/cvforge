import { sourcePriority } from "./dedup/job-keys";
import {
  emptyDetails,
  hostOf,
  type ListingForDetails,
  type OfferDetails,
  record,
  webUrl,
} from "./offer-details.types";
import { readBoardDetails } from "./sources/boards/boards.details";
import { readFranceTravailDetails } from "./sources/france-travail.details";

/** The details of one advert, read the way its source publishes them. */
export function readListingDetails(listing: ListingForDetails): OfferDetails {
  switch (listing.source) {
    case "france_travail":
      return readFranceTravailDetails(listing);
    case "la_bonne_alternance":
      return readLaBonneAlternanceDetails(listing);
    default:
      return readBoardDetails(listing);
  }
}

/**
 * The details of a job, from its best open advert: the source that already
 * wins the job's own fields. What that advert lacks is taken from the next
 * ones, since they describe the same offer — a company's board has the pay,
 * France Travail the profile it expects.
 */
export function readJobDetails(
  listings: ReadonlyArray<ListingForDetails & { closedAt: Date | null }>,
): OfferDetails | null {
  const ranked = listings
    .filter((listing) => listing.closedAt === null)
    .sort(
      (left, right) =>
        sourcePriority(right.source) - sourcePriority(left.source),
    )
    .map(readListingDetails);
  const [best, ...others] = ranked;

  return best ? others.reduce(fillFrom, best) : null;
}

function fillFrom(details: OfferDetails, other: OfferDetails): OfferDetails {
  const known = new Set(details.facts.map((fact) => fact.label));
  const either = <T>(own: T, theirs: T): T => (isEmpty(own) ? theirs : own);

  return {
    ...details,
    apply: details.apply ?? other.apply,
    companyBadges: either(details.companyBadges, other.companyBadges),
    companyDescription: either(
      details.companyDescription,
      other.companyDescription,
    ),
    companyWebsite: either(details.companyWebsite, other.companyWebsite),
    contact: details.contact ?? other.contact,
    education: either(details.education, other.education),
    experience: details.experience ?? other.experience,
    facts: [
      ...details.facts,
      ...other.facts.filter((fact) => !known.has(fact.label)),
    ],
    lacksCandidates: details.lacksCandidates || other.lacksCandidates,
    languages: either(details.languages, other.languages),
    licences: either(details.licences, other.licences),
    salary: details.salary ?? other.salary,
    sections: either(details.sections, other.sections),
    softSkills: either(details.softSkills, other.softSkills),
  };
}

function isEmpty(value: unknown): boolean {
  return value === "" || (Array.isArray(value) && value.length === 0);
}

/** La bonne alternance: its application form, and the employer's website. */
function readLaBonneAlternanceDetails(
  listing: ListingForDetails,
): OfferDetails {
  const applyUrl = webUrl(listing.applyUrl) || webUrl(listing.url);

  return {
    ...emptyDetails("la_bonne_alternance"),
    apply: applyUrl
      ? { host: hostOf(applyUrl), name: "", target: "source", url: applyUrl }
      : null,
    companyWebsite: listing.companyAnonymous
      ? ""
      : webUrl(record(record(listing.raw).workplace).website),
  };
}
