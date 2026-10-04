import { eq } from "drizzle-orm";
import { jobs } from "../database/schema";
import type { Database } from "../database/database.types";
import type { NormalizedJobListing } from "./job-search.types";

/** Test helpers shared by the retention tests (US-169). */

export function advert(
  externalId: string,
  overrides: Partial<NormalizedJobListing> = {},
) {
  return {
    applyUrl: "",
    companyAnonymous: false,
    companyName: `Entreprise ${externalId}`,
    contractType: "cdi",
    department: "44",
    description: `Offre ${externalId} à Nantes.`,
    externalId,
    latitude: null,
    locationLabel: "Nantes",
    longitude: null,
    partnerUrls: [],
    publishedAt: new Date().toISOString(),
    raw: {
      contact: { courriel: "rh@example.fr" },
      entreprise: { nom: "Acme" },
    },
    remote: false,
    salaryLabel: "",
    source: "france_travail",
    title: `Poste ${externalId}`,
    url: `https://example.com/${externalId}`,
    ...overrides,
  } as NormalizedJobListing;
}

export async function jobRow(db: Database, jobId: string) {
  const [row] = await db.select().from(jobs).where(eq(jobs.id, jobId));

  return row;
}
