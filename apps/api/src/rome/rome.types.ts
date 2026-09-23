export interface RomeMetier {
  code: string;
  libelle: string;
  domaineCode: string;
  domaineLibelle: string;
  grandDomaineCode: string;
  grandDomaineLibelle: string;
}

export interface RomeAppellation {
  code: string;
  libelle: string;
  libelleCourt: string;
  /** Lower case, no accents: what an autocomplete compares with. */
  libelleSearch: string;
  metierCode: string;
}

export interface RomeCompetence {
  code: string;
  /** `SAVOIR`, `COMPETENCE-DETAILLEE`, `MACRO-SAVOIR-FAIRE`, `MACRO-SAVOIR-ETRE-PROFESSIONNEL`. */
  type: string;
  libelle: string;
}

export interface RomeMetierCompetence {
  metierCode: string;
  competenceCode: string;
}

/** Each ROME API publishes its own version number; kept to cite the source. */
export interface RomeVersions {
  metiers: string | null;
  competences: string | null;
  fichesMetiers: string | null;
}

export interface RomeReferential {
  metiers: RomeMetier[];
  appellations: RomeAppellation[];
  competences: RomeCompetence[];
  links: RomeMetierCompetence[];
  versions: RomeVersions;
}

export type RomeCounts = Record<
  "metiers" | "appellations" | "competences" | "links",
  number
>;

export type RomeEntity = "metier" | "appellation" | "competence";

export interface RomeSubstitution {
  id: string;
  entity: RomeEntity;
  oldCode: string;
  newCode: string;
}

/**
 * A table that stores ROME codes for users, and must follow a substitution.
 * `scope` lists the columns that, together with `column`, must stay unique:
 * rewriting a code a user already has would otherwise create a duplicate.
 */
export interface RomeCodeHolder {
  table: string;
  column: string;
  entity: RomeEntity;
  scope: string[];
}

export type RomeHolderOutcome = {
  rewritten: number;
  duplicatesRemoved: number;
};

export type RomeSyncStatus = "running" | "done" | "failed";

export interface RomeSyncRun {
  id: string;
  status: RomeSyncStatus;
  stats: Record<string, unknown> | null;
  startedAt: Date;
  finishedAt: Date | null;
}

export const ROME_STORE = Symbol("ROME_STORE");

export interface RomeStore {
  /** The lock: `null` when a sync is already running elsewhere. */
  claimRun(): Promise<RomeSyncRun | null>;
  recoverStale(olderThanMs: number): Promise<number>;
  finishRun(
    runId: string,
    outcome: { status: "done" | "failed"; stats: Record<string, unknown> },
  ): Promise<void>;
  lastRun(status?: "done"): Promise<RomeSyncRun | null>;
  counts(): Promise<RomeCounts>;
  codes(entity: RomeEntity): Promise<Set<string>>;
  /** Replaces the whole referential in one transaction, or changes nothing. */
  replace(referential: RomeReferential): Promise<void>;
  recordSubstitutions(
    substitutions: Array<Omit<RomeSubstitution, "id">>,
  ): Promise<number>;
  pendingSubstitutions(): Promise<RomeSubstitution[]>;
  /** Rewrites one substitution in every holder of its entity, then stamps it. */
  applySubstitution(
    substitution: RomeSubstitution,
    holders: readonly RomeCodeHolder[],
  ): Promise<Record<string, RomeHolderOutcome>>;
}
