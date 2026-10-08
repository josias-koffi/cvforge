import type { SearchLocation } from "@cvforge/types";
import { findCommuneByCode, findCommuneByName } from "../shared/geo/communes";

/**
 * A search location with its point and department, found from its INSEE code
 * or, failing that, its name.
 *
 * The city a profile gives is stored as typed ("Paris"), without coordinates
 * or department, and such a location matched no offer at all: 5 searches out
 * of 6 in production had one (2026-10-08). Read and written through here, it
 * works without the candidate having to pick the city again.
 */
export function placeLocation(location: SearchLocation): SearchLocation {
  if (
    location.latitude !== null &&
    location.longitude !== null &&
    location.department
  ) {
    return location;
  }

  const commune =
    findCommuneByCode(location.inseeCode) ?? findCommuneByName(location.label);
  if (!commune) return location;

  return {
    ...location,
    department: location.department || commune.department,
    inseeCode: location.inseeCode || commune.code,
    latitude: location.latitude ?? commune.latitude,
    longitude: location.longitude ?? commune.longitude,
  };
}
