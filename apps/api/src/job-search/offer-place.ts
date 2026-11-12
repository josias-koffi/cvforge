import { departmentsWithin, findCommuneByCode } from "../shared/geo/communes";
import type { JobSearchNear } from "./jobs.types";

/** The radii a candidate can pick around a city, in km. */
export const SEARCH_RADII_KM = [10, 20, 30, 50, 100] as const;
export const DEFAULT_RADIUS_KM = 20;

/** The city a search is centred on, as the page shows it back. */
export interface OfferSearchPlace {
  code: string;
  name: string;
  department: string;
  radiusKm: number;
}

/**
 * "Around Nantes, 20 km", from the commune's INSEE code and a radius.
 *
 * The code rather than the name: "Saint-Denis" is a dozen communes, the code
 * is one. An unknown code searches everywhere instead of failing — a stale
 * link should still show offers.
 */
export function readOfferPlace(
  code: string | undefined,
  radius: string | undefined,
): { place: OfferSearchPlace; near: JobSearchNear } | null {
  const commune = /^\d[\dAB]\d{3}$/.test(code?.trim() ?? "")
    ? findCommuneByCode(code)
    : null;

  if (!commune) return null;

  const asked = Number(radius);
  const radiusKm = (SEARCH_RADII_KM as readonly number[]).includes(asked)
    ? asked
    : DEFAULT_RADIUS_KM;

  return {
    near: {
      // Offers without coordinates are kept when their department is one the
      // circle reaches, as the morning selection does.
      departments: departmentsWithin(
        commune.latitude,
        commune.longitude,
        radiusKm,
      ),
      latitude: commune.latitude,
      longitude: commune.longitude,
      radiusKm,
    },
    place: {
      code: commune.code,
      department: commune.department,
      name: commune.name,
      radiusKm,
    },
  };
}
