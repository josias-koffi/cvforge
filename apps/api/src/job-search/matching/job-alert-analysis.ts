import type { JobAlertAnalysis, JobAlertVerdict } from "@cvforge/types";
import { fold } from "../../shared/text";

/**
 * The paid analysis of one alert (E27, US-168): is this offer worth taking,
 * for this candidate, now?
 *
 * The deterministic score already said the offer matches. The model is asked
 * what a score cannot say: a verdict, the reasons in the candidate's terms,
 * what to watch out for, and what to bring forward when applying.
 *
 * It **adds** to the offer; it never rewrites it. Anything it attributes to
 * the candidate must exist in the profile: a cited skill or experience the
 * profile does not hold drops the point that cites it, the same guard as the
 * morning rerank.
 */

const MAX_POINTS = 3;
const MAX_POINT_CHARS = 240;
/** What the model is shown of the advert. The full text would cost a fortune. */
const MAX_DESCRIPTION_CHARS = 1500;

const VERDICTS: Record<string, JobAlertVerdict> = {
  a_considerer: "consider",
  a_passer: "skip",
  a_saisir: "seize",
};

export const JOB_ALERT_ANALYSIS_SYSTEM_PROMPT = [
  "Tu aides un candidat à décider, en quelques secondes, s'il doit postuler à une offre d'emploi qui vient de paraître.",
  "L'offre correspond déjà à sa recherche. Tu dis si elle vaut la peine d'être prise, en t'appuyant uniquement sur les faits fournis.",
  "",
  "Tu rends :",
  '- "verdict" : "a_saisir", "a_considerer" ou "a_passer" ;',
  '- "raisons" : 2 ou 3 raisons pour lesquelles elle vaut le coup (compétences qui collent, progression, salaire, lieu, taille d\'entreprise) ;',
  '- "vigilance" : les écarts avec le profil, les exigences manquantes, les indices d\'une annonce floue ou republiée (0 à 3) ;',
  '- "aMettreEnAvant" : quoi mettre en avant dans le CV et la lettre pour cette offre (1 à 3).',
  "",
  "Règles absolues :",
  '- Chaque raison et chaque point à mettre en avant liste dans "competences" et "experiences" ce qu\'il attribue au candidat, recopié tel quel depuis le profil.',
  "- N'attribue au candidat aucune compétence ni expérience absente du profil. Un point qui le fait sera supprimé.",
  "- Ne réécris pas l'offre et ne la résume pas : tu la commentes.",
  "- Phrases courtes, 200 caractères maximum chacune, en français, vouvoiement, sans superlatif creux.",
  '- Réponds uniquement en JSON : {"verdict":"...","raisons":[{"texte":"...","competences":[],"experiences":[]}],"vigilance":["..."],"aMettreEnAvant":[{"texte":"...","competences":[],"experiences":[]}]}',
].join("\n");

/** What the model is told about the candidate: what they do, never who they are. */
export interface AnalysisProfile {
  headline: string;
  skills: string[];
  /** Roles held, without the companies: enough to judge, nothing to identify. */
  experiences: Array<{ role: string; period: string }>;
}

export interface AnalysisOffer {
  title: string;
  companyName: string;
  locationLabel: string;
  contractType: string;
  salaryLabel: string;
  remote: boolean;
  description: string;
  matchedSkills: string[];
  /** What the offer asks that the CV does not show (US-126). */
  missingSkills: string[];
}

export function buildAnalysisUserMessage(
  profile: AnalysisProfile,
  offer: AnalysisOffer,
): string {
  return [
    "=== PROFIL DU CANDIDAT ===",
    JSON.stringify({
      competences: profile.skills,
      experiences: profile.experiences.map((item) => ({
        periode: item.period,
        poste: item.role,
      })),
      posteActuel: profile.headline,
    }),
    "=== FIN PROFIL ===",
    "",
    "=== OFFRE ===",
    JSON.stringify({
      competencesCommunes: offer.matchedSkills,
      competencesDemandeesAbsentesDuProfil: offer.missingSkills,
      contrat: offer.contractType,
      entreprise: offer.companyName || "non communiquée",
      extrait: offer.description.slice(0, MAX_DESCRIPTION_CHARS),
      intitule: offer.title,
      lieu: offer.locationLabel,
      salaire: offer.salaryLabel || "non communiqué",
      teletravail: offer.remote,
    }),
    "=== FIN OFFRE ===",
  ].join("\n");
}

/**
 * Reads the model's answer against the profile. Returns null when it has no
 * usable verdict: the call then counts as failed, and nothing is charged.
 */
export function readAnalysisResponse(
  raw: unknown,
  context: {
    profile: AnalysisProfile;
    offer: Pick<AnalysisOffer, "missingSkills">;
  },
): JobAlertAnalysis | null {
  const payload = (raw ?? {}) as Record<string, unknown>;
  const verdict =
    VERDICTS[fold(String(payload.verdict ?? "")).replace(/ /g, "_")];
  if (!verdict) return null;

  const grounded = groundedPoint(context);

  return {
    highlights: readList(payload.aMettreEnAvant, grounded),
    reasons: readList(payload.raisons, grounded),
    verdict,
    watchouts: readList(payload.vigilance, (entry) => readText(entry)),
  };
}

function readList(
  value: unknown,
  read: (entry: unknown) => string | null,
): string[] {
  if (!Array.isArray(value)) return [];

  const points: string[] = [];
  for (const entry of value) {
    const text = read(entry);
    if (text && !points.includes(text)) points.push(text);
    if (points.length === MAX_POINTS) break;
  }

  return points;
}

/**
 * A point about the candidate stands only if everything it cites is in the
 * profile, and if its text does not hand them a skill the offer asks and the
 * profile lacks — the most likely invention, since the model just read it.
 */
function groundedPoint(context: {
  profile: AnalysisProfile;
  offer: Pick<AnalysisOffer, "missingSkills">;
}) {
  const skills = new Set(context.profile.skills.map(fold));
  const roles = new Set(
    context.profile.experiences.map((item) => fold(item.role)),
  );
  const lacking = context.offer.missingSkills
    .map(fold)
    .filter((skill) => skill.length > 2 && !skills.has(skill));

  return (entry: unknown): string | null => {
    const point =
      typeof entry === "string"
        ? { texte: entry }
        : (entry as Record<string, unknown>);
    const text = readText(point?.texte);
    if (!text) return null;

    const cites = (list: unknown, known: Set<string>) =>
      !Array.isArray(list) ||
      list.every((item) => known.has(fold(String(item))));
    if (!cites(point.competences, skills) || !cites(point.experiences, roles))
      return null;

    const folded = ` ${fold(text)} `;
    if (lacking.some((skill) => folded.includes(` ${skill} `))) return null;

    return text;
  };
}

function readText(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const text = value.trim().replace(/\s+/g, " ").slice(0, MAX_POINT_CHARS);
  return text || null;
}
