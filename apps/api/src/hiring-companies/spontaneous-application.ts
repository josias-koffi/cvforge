import {
  APPLICATION_SOURCE_SPONTANEOUS,
  APPLICATION_STATUS_DRAFT,
  type HiringCompany,
} from "@cvforge/types";
import type { StoredApplication } from "../applications/applications.types";
import { buildOfferPreview } from "../applications/offer-extraction";

/**
 * Names the company in the application list, and marks it: one spontaneous
 * application per establishment and profile, not one per click.
 */
export function spontaneousSourceLabel(company: Pick<HiringCompany, "name" | "siret">) {
  return `Candidature spontanée — ${company.name} (SIRET ${company.siret})`;
}

/**
 * An application with no offer behind it (US-120). Built from what La Bonne
 * Boîte said of the company, with no model call: creating it costs nothing,
 * only the CV and the letter do, as for any application.
 *
 * Requirements and responsibilities stay empty: nobody published any, and
 * inventing them would steer the CV toward a job description that does not
 * exist.
 */
export function spontaneousApplication(input: {
  id: string;
  userEmail: string;
  profileId: string;
  company: HiringCompany;
  now: Date;
}): StoredApplication {
  const { company } = input;
  const timestamp = input.now.toISOString();
  const place = [company.postcode, company.city].filter(Boolean).join(" ");
  const summary =
    `Candidature spontanée auprès de ${company.name}` +
    `${company.nafLabel ? ` (${company.nafLabel})` : ""}` +
    `${place ? `, ${place}` : ""}, pour un poste de ${company.romeLabel}. ` +
    "Aucune offre publiée : France Travail (La Bonne Boîte) estime que cette entreprise est susceptible d'embaucher dans ce métier.";

  return {
    createdAt: timestamp,
    cvContent: null,
    cvGeneratedAt: null,
    extracted: {
      companyName: company.name,
      contractType: null,
      language: "fr",
      location: place || null,
      requirements: [],
      responsibilities: [],
      salaryRange: null,
      summary,
      title: company.romeLabel,
    },
    id: input.id,
    letterContent: null,
    letterGeneratedAt: null,
    offerTextPreview: buildOfferPreview(summary),
    offerUrl: null,
    profileId: input.profileId,
    rawOfferText: summary,
    sourceLabel: spontaneousSourceLabel(company),
    sourceType: APPLICATION_SOURCE_SPONTANEOUS,
    status: APPLICATION_STATUS_DRAFT,
    statusHistory: [{ changedAt: timestamp, status: APPLICATION_STATUS_DRAFT }],
    updatedAt: timestamp,
    userEmail: input.userEmail,
  };
}
