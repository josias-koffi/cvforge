import type { FtHttpClient } from "../france-travail/ft-http.client";
import { placeQuery, type HiringPlace } from "./hiring-places";

/** What one reading keeps of a company, before it is stored. */
export interface LbbCompany {
  siret: string;
  name: string;
  nafCode: string;
  nafLabel: string;
  city: string;
  postcode: string;
  department: string;
  latitude: number | null;
  longitude: number | null;
  headcountMin: number | null;
  headcountMax: number | null;
  hiringPotential: number;
  highPotential: boolean;
  reachableByEmail: boolean;
}

export interface LbbReading {
  hits: number;
  romeLabel: string;
  companies: LbbCompany[];
}

/** Shape read live on 2026-09-24, `GET /recherche`. */
interface LbbAnswer {
  hits?: number;
  items?: Array<{
    siret?: string;
    company_name?: string;
    office_name?: string;
    naf?: string;
    naf_label?: string;
    city?: string;
    postcode?: string;
    department_number?: string;
    location?: { lat?: number; lon?: number } | null;
    headcount_min?: number | null;
    headcount_max?: number | null;
    hiring_potential?: number;
    is_high_potential?: boolean;
    email?: string;
  }>;
  resolved_params?: { jobs?: Array<{ value?: string; display?: string }> };
}

/** The most La Bonne Boîte gives in one page (422 above). */
const PAGE_SIZE = 100;
const SIRET = /^\d{14}$/;

/**
 * La Bonne Boîte v2: the companies France Travail expects to hire in a ROME
 * job near a place, offer or not (US-119). One page of the best hundred per
 * job and place; the candidate is not shown more than that anyway.
 */
export class LaBonneBoiteSource {
  constructor(private readonly franceTravail: FtHttpClient) {}

  isAvailable(): boolean {
    return this.franceTravail.isEnabled("la-bonne-boite");
  }

  /** Null when it could not be asked: the previous reading is kept. */
  async search(romeCode: string, place: HiringPlace): Promise<LbbReading | null> {
    const result = await this.franceTravail.request<LbbAnswer>(
      "la-bonne-boite",
      {
        path: "/recherche",
        query: {
          page_size: String(PAGE_SIZE),
          rome: romeCode,
          ...placeQuery(place),
        },
      },
    );

    if (result.kind === "empty") {
      return { companies: [], hits: 0, romeLabel: "" };
    }
    if (result.kind === "unavailable") return null;

    return {
      companies: (result.data.items ?? []).flatMap((item) =>
        item.siret && SIRET.test(item.siret) && item.company_name
          ? [
              {
                city: item.city ?? "",
                department: item.department_number ?? "",
                // 0 to 0 is how the API says it does not know.
                headcountMax: item.headcount_max || null,
                headcountMin: item.headcount_max ? (item.headcount_min ?? 0) : null,
                highPotential: item.is_high_potential === true,
                hiringPotential: item.hiring_potential ?? 0,
                latitude: item.location?.lat ?? null,
                longitude: item.location?.lon ?? null,
                name: item.office_name || item.company_name,
                nafCode: item.naf ?? "",
                nafLabel: item.naf_label ?? "",
                postcode: item.postcode ?? "",
                reachableByEmail: item.email === "yes",
                siret: item.siret,
              },
            ]
          : [],
      ),
      hits: result.data.hits ?? 0,
      romeLabel:
        result.data.resolved_params?.jobs?.find((job) => job.value === romeCode)
          ?.display ?? "",
    };
  }
}
