import { departmentFromPostcode } from "../job-listing.normalize";
import type { ListingRome, NormalizedJobListing } from "../job-search.types";

/**
 * One offer as La bonne alternance publishes it, limited to the fields we
 * read. Every one of them is optional here: the payload is a third party's,
 * and its own schema marks most of them nullable.
 */
export interface LaBonneAlternanceOffer {
  identifier?: {
    id?: string | null;
    partner_job_id?: string | null;
    partner_label?: string | null;
  };
  workplace?: {
    name?: string | null;
    brand?: string | null;
    legal_name?: string | null;
    website?: string | null;
    location?: {
      address?: string | null;
      geopoint?: { coordinates?: number[]; type?: string } | null;
    } | null;
  };
  apply?: { url?: string | null };
  contract?: {
    type?: string[] | null;
    remote?: string | null;
  };
  offer?: {
    title?: string;
    description?: string;
    rome_codes?: string[];
    status?: string;
    publication?: { creation?: string | null; expiration?: string | null };
  };
}

/**
 * Identifiers the API can answer about, and those it cannot.
 *
 * Offers collected by La bonne alternance itself carry an `id` its "view one
 * offer" endpoint understands. Offers relayed from France Travail or from a
 * partner only carry that partner's own id, which the endpoint would answer
 * 404 for — and a 404 read as "this offer is closed" would drop a live offer
 * from a candidate's selection. They are prefixed so the source knows never
 * to ask.
 */
export const PARTNER_ID_PREFIX = "partner:";

/** The only status worth collecting: the others are filled or withdrawn. */
export const ACTIVE_STATUS = "Active";

export function toNormalizedListing(
  offer: LaBonneAlternanceOffer,
): NormalizedJobListing | null {
  const externalId = readExternalId(offer);
  const title = text(offer.offer?.title);
  const applyUrl = text(offer.apply?.url);

  // No apply link means no offer to show: the API gives no other address for
  // reading one, so the card would lead nowhere.
  if (!externalId || !title || !applyUrl) return null;

  // A search can return a filled or cancelled offer; collecting it would put
  // a dead advert in front of a candidate and, worse, let them spend a credit
  // applying to it.
  if (text(offer.offer?.status) !== ACTIVE_STATUS) return null;

  // Only the two alternance contracts exist here; the API returns nothing else.
  const companyName = readCompanyName(offer);
  const address = text(offer.workplace?.location?.address);

  return {
    applyUrl,
    companyAnonymous: companyName === "",
    companyName,
    contractType: "alternance",
    department: departmentFromAddress(address),
    description: text(offer.offer?.description),
    externalId,
    latitude: coordinate(offer.workplace?.location?.geopoint?.coordinates, 1),
    locationLabel: address,
    longitude: coordinate(offer.workplace?.location?.geopoint?.coordinates, 0),
    // The employer's own site, when given: it is what lets an offer relayed
    // here be recognised as one already collected from that company's board.
    partnerUrls: [text(offer.workplace?.website)].filter(Boolean),
    publishedAt: isoDate(offer.offer?.publication?.creation),
    raw: offer,
    remote: offer.contract?.remote === "remote" || offer.contract?.remote === "hybrid",
    ...readRome(offer),
    // The API publishes no pay, and inventing "selon profil" would be a lie.
    salaryLabel: "",
    source: "la_bonne_alternance",
    title,
    url: applyUrl,
  };
}

function readExternalId(offer: LaBonneAlternanceOffer): string {
  const own = text(offer.identifier?.id);
  if (own) return own;

  const partnerId = text(offer.identifier?.partner_job_id);
  if (!partnerId) return "";

  const label = text(offer.identifier?.partner_label) || "inconnu";

  return `${PARTNER_ID_PREFIX}${label}:${partnerId}`;
}

/** The name a candidate would recognise: the brand first, then the legal one. */
function readCompanyName(offer: LaBonneAlternanceOffer): string {
  return (
    text(offer.workplace?.brand) ||
    text(offer.workplace?.name) ||
    text(offer.workplace?.legal_name)
  );
}

/**
 * The department, from the postcode inside the free-form address.
 *
 * The API gives an address as one string ("12 rue de la Paix, 44000 Nantes")
 * and no department field, so the five digits are the only handle. Read from
 * the end: a street number can be five digits too, but the postcode always
 * comes last.
 */
export function departmentFromAddress(address: string): string {
  const matches = [...address.matchAll(/\b(\d{5})\b/g)];
  const last = matches.at(-1)?.[1];

  return departmentFromPostcode(last);
}

/**
 * One end of a GeoJSON coordinate pair, `[longitude, latitude]`.
 *
 * Taken from the GeoJSON convention, which the schema's own field
 * descriptions follow — its *examples* have the two swapped (48.85 shown as a
 * longitude), so they are not a reliable guide.
 */
function coordinate(
  coordinates: number[] | undefined,
  index: 0 | 1,
): number | null {
  const value = coordinates?.[index];

  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** The creation date, never the expiry: a repost must not look new. */
function isoDate(value: unknown): string | null {
  const parsed = Date.parse(text(value));

  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
}

/**
 * The ROME code the offer is filed under. La bonne alternance gives codes
 * only — no appellation, no skills — as a list, and the first one is kept.
 * On 2026-09-24 all 301 offers of a `romes=D1102` search carried D1102.
 */
function readRome(offer: LaBonneAlternanceOffer): { rome?: ListingRome } {
  const code = text(offer.offer?.rome_codes?.[0]).toUpperCase();

  return code ? { rome: { appellationLabel: "", code, competences: [] } } : {};
}
