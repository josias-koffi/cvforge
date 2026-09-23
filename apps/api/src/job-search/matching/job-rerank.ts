import type { ScoredJob } from "./job-matching";

/**
 * The optional paid pass over a morning selection.
 *
 * The deterministic score ranks offers on what can be counted — words in a
 * title, skills present, distance, age. The model is asked for the thing that
 * cannot be counted: whether this offer actually suits this candidate, in one
 * sentence they can read over coffee.
 *
 * It **re-orders and explains**; it never adds an offer, and never removes
 * one. Anything the model invents is dropped at the door.
 */

export const MAX_RERANKED = 10;
const MAX_REASON_CHARS = 220;
/** What the model is shown per offer. The full advert would cost a fortune. */
const MAX_DESCRIPTION_CHARS = 700;

export interface RerankCandidate {
  id: string;
  title: string;
  companyName: string;
  locationLabel: string;
  contractType: string;
  description: string;
  matchedSkills: string[];
}

export interface RerankedEntry {
  id: string;
  rank: number;
  reason: string;
}

export const JOB_RERANK_SYSTEM_PROMPT = [
  "Tu aides un candidat à trier des offres d'emploi déjà présélectionnées pour lui.",
  "Tu classes ces offres de la plus pertinente à la moins pertinente pour SON profil,",
  "et tu écris pour chacune UNE phrase courte expliquant pourquoi elle lui correspond,",
  "en t'appuyant uniquement sur les faits fournis.",
  "",
  "Règles absolues :",
  "- N'invente aucune offre : tu ne peux utiliser que les identifiants fournis.",
  "- N'invente aucune compétence ni expérience du candidat.",
  "- Une phrase par offre, 200 caractères maximum, en français, sans superlatif creux.",
  '- Réponds uniquement en JSON : {"classement":[{"id":"...","raison":"..."}]}',
].join("\n");

/** The profile block is already pseudonymised by the caller. */
export function buildRerankUserMessage(
  profile: { headline: string; skills: string[]; targetRoles: string[] },
  candidates: readonly RerankCandidate[],
): string {
  return [
    "=== PROFIL DU CANDIDAT ===",
    JSON.stringify({
      competences: profile.skills,
      posteActuel: profile.headline,
      postesVises: profile.targetRoles,
    }),
    "=== FIN PROFIL ===",
    "",
    "=== OFFRES À CLASSER ===",
    JSON.stringify(
      candidates.map((candidate) => ({
        competencesCommunes: candidate.matchedSkills,
        contrat: candidate.contractType,
        entreprise: candidate.companyName,
        extrait: candidate.description.slice(0, MAX_DESCRIPTION_CHARS),
        id: candidate.id,
        intitule: candidate.title,
        lieu: candidate.locationLabel,
      })),
    ),
    "=== FIN OFFRES ===",
    "",
    `Classe ces ${candidates.length} offres, de la meilleure à la moins bonne.`,
  ].join("\n");
}

/**
 * Reads the model's answer against the offers actually sent.
 *
 * An unknown id is dropped, an offer the model forgot keeps its deterministic
 * place at the end: the candidate must never lose an offer because a model had
 * a bad day.
 */
export function readRerankResponse(
  raw: unknown,
  candidates: readonly ScoredJob[],
): RerankedEntry[] {
  const known = new Set(candidates.map((entry) => entry.job.id));
  const payload = (raw as { classement?: unknown })?.classement;
  const ranked: RerankedEntry[] = [];
  const seen = new Set<string>();

  if (Array.isArray(payload)) {
    for (const entry of payload) {
      if (typeof entry !== "object" || entry === null) continue;

      const id = String((entry as { id?: unknown }).id ?? "").trim();
      if (!known.has(id) || seen.has(id)) continue;

      seen.add(id);
      ranked.push({
        id,
        rank: ranked.length + 1,
        reason: readReason((entry as { raison?: unknown }).raison),
      });
    }
  }

  for (const candidate of candidates) {
    if (seen.has(candidate.job.id)) continue;

    ranked.push({ id: candidate.job.id, rank: ranked.length + 1, reason: "" });
  }

  return ranked;
}

function readReason(value: unknown): string {
  if (typeof value !== "string") return "";

  return value.trim().replace(/\s+/g, " ").slice(0, MAX_REASON_CHARS);
}

export function toRerankCandidates(
  scored: readonly ScoredJob[],
): RerankCandidate[] {
  return scored.map((entry) => ({
    companyName: entry.job.companyAnonymous ? "" : entry.job.companyName,
    contractType: entry.job.contractType,
    description: entry.job.description,
    id: entry.job.id,
    locationLabel: entry.job.locationLabel,
    matchedSkills: entry.matchedSkills,
    title: entry.job.title,
  }));
}
