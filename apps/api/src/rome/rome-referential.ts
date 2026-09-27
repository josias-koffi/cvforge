import type {
  RomeAppellation,
  RomeCompetence,
  RomeCounts,
  RomeMetier,
  RomeMetierCompetence,
  RomeReferential,
  RomeVersions,
} from "./rome.types";

/**
 * Raw shapes of the three bulk calls, as read on 2026-09-23 (version 61).
 * Everything is optional: a field France Travail drops must cost a row, not
 * the whole sync.
 */
export interface RawMetier {
  code?: string;
  libelle?: string;
  domaineProfessionnel?: {
    code?: string;
    libelle?: string;
    grandDomaine?: { code?: string; libelle?: string };
  };
  appellations?: Array<{
    code?: string;
    libelle?: string;
    libelleCourt?: string;
  }>;
}

export interface RawFicheMetier {
  code?: string;
  groupesCompetencesMobilisees?: Array<{
    competences?: Array<{ code?: string }>;
  }>;
  groupesSavoirs?: Array<{ savoirs?: Array<{ code?: string }> }>;
}

export interface RawCompetence {
  code?: string;
  type?: string;
  libelle?: string;
}

/**
 * The attribution the reuse licence asks for, wherever ROME data is shown.
 */
export function romeAttribution(versions: RomeVersions | null): string {
  const version = versions?.metiers ?? versions?.competences ?? null;

  return `Source : ROME 4.0, France Travail${version ? ` (version ${version})` : ""}`;
}

/** "Développeur / Développeuse œnologie" → "developpeur / developpeuse oenologie". */
export function normalizeForSearch(label: string): string {
  return label
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae")
    .replace(/\s+/g, " ")
    .trim();
}

export interface MappedReferential {
  referential: RomeReferential;
  /** Rows left out because a required field or a referenced code was missing. */
  dropped: RomeCounts;
}

export function toReferential(
  raw: {
    metiers: RawMetier[];
    fiches: RawFicheMetier[];
    competences: RawCompetence[];
  },
  versions: RomeVersions,
): MappedReferential {
  const metiers = uniqueBy(raw.metiers.map(toMetier), (metier) => metier.code);
  const competences = uniqueBy(
    raw.competences.map(toCompetence),
    (competence) => competence.code,
  );
  const metierCodes = new Set(metiers.map((metier) => metier.code));
  const competenceCodes = new Set(
    competences.map((competence) => competence.code),
  );

  const rawAppellationCount = raw.metiers.flatMap(
    (metier) => metier.appellations ?? [],
  ).length;
  // An appellation whose métier was dropped would break the foreign key.
  const appellations = uniqueBy(
    raw.metiers
      .flatMap(appellationsOf)
      .filter(
        (appellation) => appellation && metierCodes.has(appellation.metierCode),
      ),
    (appellation) => appellation.code,
  );

  const linkCandidates = raw.fiches.flatMap(linksOf);
  const links = uniqueBy(
    linkCandidates.filter(
      (link) =>
        metierCodes.has(link.metierCode) &&
        competenceCodes.has(link.competenceCode),
    ),
    (link) => `${link.metierCode}|${link.competenceCode}`,
  );

  return {
    dropped: {
      appellations: rawAppellationCount - appellations.length,
      competences: raw.competences.length - competences.length,
      links: linkCandidates.length - links.length,
      metiers: raw.metiers.length - metiers.length,
    },
    referential: { appellations, competences, links, metiers, versions },
  };
}

const MIN_KEPT_RATIO = 0.9;

/**
 * Why a new download is refused. A referential that shrank by more than a
 * tenth is far likelier to be a truncated answer than a reform of the ROME,
 * and replacing on it would silently empty candidates' suggestions.
 */
export function shrinkageProblem(
  current: RomeCounts,
  next: RomeCounts,
): string | null {
  for (const key of Object.keys(next) as Array<keyof RomeCounts>) {
    if (next[key] === 0) return `${key}: the download is empty`;

    if (current[key] > 0 && next[key] < current[key] * MIN_KEPT_RATIO) {
      return `${key}: ${next[key]} against ${current[key]} today`;
    }
  }

  return null;
}

export function countsOf(referential: RomeReferential): RomeCounts {
  return {
    appellations: referential.appellations.length,
    competences: referential.competences.length,
    links: referential.links.length,
    metiers: referential.metiers.length,
  };
}

/** Codes present today and absent from the download: retired by France Travail. */
export function retiredCodes(
  current: Set<string>,
  next: readonly { code: string }[],
): string[] {
  const kept = new Set(next.map((entry) => entry.code));

  return [...current].filter((code) => !kept.has(code)).sort();
}

function toMetier(raw: RawMetier): RomeMetier | null {
  const domaine = raw.domaineProfessionnel;
  const grandDomaine = domaine?.grandDomaine;

  if (!raw.code || !raw.libelle || !domaine?.code || !grandDomaine?.code)
    return null;

  return {
    code: raw.code,
    domaineCode: domaine.code,
    domaineLibelle: domaine.libelle ?? "",
    grandDomaineCode: grandDomaine.code,
    grandDomaineLibelle: grandDomaine.libelle ?? "",
    libelle: raw.libelle,
  };
}

function appellationsOf(raw: RawMetier): Array<RomeAppellation | null> {
  const metierCode = raw.code;

  return (raw.appellations ?? []).map((appellation) =>
    metierCode && appellation.code && appellation.libelle
      ? {
          code: appellation.code,
          libelle: appellation.libelle,
          libelleCourt: appellation.libelleCourt || appellation.libelle,
          libelleSearch: normalizeForSearch(appellation.libelle),
          metierCode,
        }
      : null,
  );
}

function toCompetence(raw: RawCompetence): RomeCompetence | null {
  return raw.code && raw.type && raw.libelle
    ? { code: raw.code, libelle: raw.libelle, type: raw.type }
    : null;
}

function linksOf(raw: RawFicheMetier): RomeMetierCompetence[] {
  const metierCode = raw.code;
  if (!metierCode) return [];

  const codes = [
    ...(raw.groupesCompetencesMobilisees ?? []).flatMap(
      (group) => group.competences ?? [],
    ),
    ...(raw.groupesSavoirs ?? []).flatMap((group) => group.savoirs ?? []),
  ].map((entry) => entry.code);

  return codes
    .filter((code): code is string => Boolean(code))
    .map((competenceCode) => ({ competenceCode, metierCode }));
}

function uniqueBy<T>(items: Array<T | null>, key: (item: T) => string): T[] {
  const seen = new Map<string, T>();

  for (const item of items) {
    if (item && !seen.has(key(item))) seen.set(key(item), item);
  }

  return [...seen.values()];
}
