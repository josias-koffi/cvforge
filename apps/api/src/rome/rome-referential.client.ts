import type { FtHttpClient } from "../france-travail/ft-http.client";
import type { FtApiId } from "../france-travail/ft.config";
import {
  toReferential,
  type MappedReferential,
  type RawCompetence,
  type RawFicheMetier,
  type RawMetier,
} from "./rome-referential";
import type { RomeVersions } from "./rome.types";

/** The three APIs a sync reads; all of them must be enabled. */
export const ROME_SYNC_APIS: readonly FtApiId[] = [
  "rome-metiers",
  "rome-competences",
  "rome-fiches-metiers",
];

/**
 * `champs` narrows a bulk list to what the tables keep: without it the métier
 * list has no appellations and the fiche list no skills. Nested attributes
 * are selectable, but not every one is — `type` and `obsolete` are refused
 * (400 SELECTOR), which is why the skills come from their own list.
 */
const METIER_FIELDS =
  "code,libelle,domaineProfessionnel(code,libelle,grandDomaine(code,libelle)),appellations(code,libelle,libelleCourt)";
const FICHE_FIELDS =
  "code,groupesCompetencesMobilisees(competences(code)),groupesSavoirs(savoirs(code))";

export class RomeFetchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RomeFetchError";
  }
}

/**
 * Downloads the whole ROME 4.0 referential in three calls (about 11 MB,
 * measured 2026-09-23), rather than 1 911 fiche calls at one a second.
 */
export class RomeReferentialClient {
  constructor(private readonly franceTravail: FtHttpClient) {}

  isAvailable(): boolean {
    return ROME_SYNC_APIS.every((api) => this.franceTravail.isEnabled(api));
  }

  async fetch(): Promise<MappedReferential> {
    const metiers = await this.list<RawMetier>(
      "rome-metiers",
      "/metiers/metier",
      METIER_FIELDS,
    );
    const fiches = await this.list<RawFicheMetier>(
      "rome-fiches-metiers",
      "/fiches-rome/fiche-metier",
      FICHE_FIELDS,
    );
    const competences = await this.list<RawCompetence>(
      "rome-competences",
      "/competences/competence",
    );

    return toReferential(
      { competences, fiches, metiers },
      await this.versions(),
    );
  }

  private async list<T>(
    api: FtApiId,
    path: string,
    champs?: string,
  ): Promise<T[]> {
    const result = await this.franceTravail.request<T[]>(api, {
      path,
      query: { champs },
    });

    if (result.kind === "ok" && Array.isArray(result.data)) return result.data;

    // An empty or failed list must stop the sync: replacing on it would empty
    // the referential.
    throw new RomeFetchError(
      result.kind === "unavailable"
        ? `${api}${path}: ${result.reason} (${result.status ?? "no answer"}) ${result.detail}`.trim()
        : `${api}${path}: no list in the answer`,
    );
  }

  /**
   * Only cited, never required: a missing version must not fail the sync.
   * Retried once like any call — right after an 11 MB list, one came back
   * empty on 2026-09-23.
   */
  private async versions(): Promise<RomeVersions> {
    const [metiers, competences, fichesMetiers] = await Promise.all([
      this.version("rome-metiers", "/metiers/version"),
      this.version("rome-competences", "/competences/version"),
      this.version("rome-fiches-metiers", "/fiches-rome/version"),
    ]);

    return { competences, fichesMetiers, metiers };
  }

  private async version(api: FtApiId, path: string): Promise<string | null> {
    const result = await this.franceTravail.request<{ version?: unknown }>(
      api,
      { path },
    );

    return result.kind === "ok" && typeof result.data?.version === "string"
      ? result.data.version
      : null;
  }
}
