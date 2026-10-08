import { fold } from "../text";
import { COMMUNES_DATA } from "./communes.data";

/**
 * Where a French commune is, from its INSEE code or its name.
 *
 * Measured on production (2026-10-08): 82 % of the offers had no coordinates,
 * so a candidate's 25 km radius fell back to "same department" — and a city
 * typed in the profile ("Paris") was stored with neither, matching nothing.
 * France Travail always sends the commune's code, which places 87 % of them.
 */

export interface Commune {
  code: string;
  department: string;
  latitude: number;
  longitude: number;
  population: number;
  name: string;
}

let byCode: Map<string, Commune> | null = null;
let byName: Map<string, Commune[]> | null = null;

function load(): Map<string, Commune> {
  if (byCode) return byCode;

  byCode = new Map();
  for (const line of COMMUNES_DATA.split("\n")) {
    const [code, department, latitude, longitude, population, name] =
      line.split(";");
    if (!code || !department || !name) continue;

    byCode.set(code, {
      code,
      department,
      latitude: Number(latitude),
      longitude: Number(longitude),
      name,
      population: Number(population),
    });
  }

  return byCode;
}

export function findCommuneByCode(
  code: string | null | undefined,
): Commune | null {
  if (!code) return null;

  return load().get(code.trim()) ?? null;
}

/**
 * The commune a name means: within a department when one is known ("59 -
 * Lille" in an offer), otherwise the most populous of that name, since
 * "Valence" typed by a candidate is far more likely the Drôme's 65 000
 * inhabitants than the village in Tarn-et-Garonne. Without a department,
 * arrondissements are left out: "Paris" is the city, not its 1st.
 */
export function findCommuneByName(
  name: string,
  department = "",
): Commune | null {
  const key = fold(name);
  if (!key) return null;

  if (!byName) {
    byName = new Map();
    for (const commune of load().values()) {
      const folded = fold(commune.name);
      byName.set(folded, [...(byName.get(folded) ?? []), commune]);
    }
  }

  const candidates = (byName.get(key) ?? []).filter((commune) =>
    department ? commune.department === department : !isArrondissement(commune),
  );

  return candidates.reduce<Commune | null>(
    (best, commune) =>
      !best || commune.population > best.population ? commune : best,
    null,
  );
}

/** Paris 1er (75101), Lyon (6938x) and Marseille (132xx) arrondissements. */
function isArrondissement(commune: Commune): boolean {
  return /^(751\d\d|6938\d|132\d\d)$/.test(commune.code);
}

const EARTH_RADIUS_KM = 6371;

export function haversineKm(
  latitudeA: number,
  longitudeA: number,
  latitudeB: number,
  longitudeB: number,
): number {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const deltaLatitude = toRadians(latitudeB - latitudeA);
  const deltaLongitude = toRadians(longitudeB - longitudeA);
  const a =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(toRadians(latitudeA)) *
      Math.cos(toRadians(latitudeB)) *
      Math.sin(deltaLongitude / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

/**
 * The departments a circle reaches: 25 km around Paris is Paris and the three
 * departments around it, and an offer in Boulogne must be in the pool.
 */
export function departmentsWithin(
  latitude: number,
  longitude: number,
  radiusKm: number,
): string[] {
  const found = new Set<string>();

  for (const commune of load().values()) {
    if (
      haversineKm(latitude, longitude, commune.latitude, commune.longitude) <=
      radiusKm
    ) {
      found.add(commune.department);
    }
  }

  return [...found].sort();
}
