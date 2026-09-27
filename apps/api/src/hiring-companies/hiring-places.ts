import type { SearchLocation } from "@cvforge/types";

/**
 * Where La Bonne Boîte is asked to look, from one place of a search. It
 * insists on a place (422 without one) and takes the most precise first.
 */
export type HiringPlace =
  | { kind: "city"; citycode: string; distanceKm: number }
  | { kind: "geo"; latitude: number; longitude: number; distanceKm: number }
  | { kind: "department"; department: string };

/** La Bonne Boîte refuses a radius over 200 km (422, 2026-09-24). */
const MAX_DISTANCE_KM = 200;
const MIN_DISTANCE_KM = 1;

/** The commune and its radius, else the coordinates, else the department. */
export function placeOf(location: SearchLocation): HiringPlace | null {
  const distanceKm = Math.min(
    MAX_DISTANCE_KM,
    Math.max(MIN_DISTANCE_KM, Math.round(location.radiusKm)),
  );

  if (/^\d[\dAB]\d{3}$/.test(location.inseeCode)) {
    return { citycode: location.inseeCode, distanceKm, kind: "city" };
  }
  if (location.latitude !== null && location.longitude !== null) {
    return {
      distanceKm,
      kind: "geo",
      latitude: location.latitude,
      longitude: location.longitude,
    };
  }
  if (location.department) {
    return { department: location.department, kind: "department" };
  }

  return null;
}

/** Stable across candidates: two searches around Nantes at 30 km share a reading. */
export function placeKey(place: HiringPlace): string {
  switch (place.kind) {
    case "city":
      return `city:${place.citycode}:${place.distanceKm}`;
    case "geo":
      return `geo:${place.latitude.toFixed(3)},${place.longitude.toFixed(3)}:${place.distanceKm}`;
    case "department":
      return `dep:${place.department}`;
  }
}

export function queryKey(romeCode: string, place: HiringPlace): string {
  return `${romeCode}|${placeKey(place)}`;
}

/** The query string La Bonne Boîte reads for this place. */
export function placeQuery(place: HiringPlace): Record<string, string> {
  switch (place.kind) {
    case "city":
      return { citycode: place.citycode, distance: String(place.distanceKm) };
    case "geo":
      return {
        distance: String(place.distanceKm),
        latitude: String(place.latitude),
        longitude: String(place.longitude),
      };
    case "department":
      // `department` wants a name; the number goes in `department_number`.
      return { department_number: place.department };
  }
}
