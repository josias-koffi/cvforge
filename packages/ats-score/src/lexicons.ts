import { normalizeToken } from "./normalize";

/**
 * Action verbs, French and English, in the forms a CV actually uses: past
 * participles ("Réduit le temps de build") and bare infinitives.
 *
 * Stored accented and readable; `normalizeToken` folds both sides at comparison
 * time, so "développé" matches "developpe" without anyone maintaining a second
 * spelling of every entry.
 */
const ACTION_VERBS_FR = [
  "accompagné", "accéléré", "amélioré", "analysé", "augmenté", "automatisé",
  "cadré", "conçu", "construit", "coordonné", "créé", "défini", "déployé",
  "développé", "diminué", "dirigé", "divisé", "encadré", "fiabilisé", "formé",
  "géré", "implémenté", "industrialisé", "intégré", "lancé", "livré",
  "maintenu", "migré", "mis", "modernisé", "négocié", "optimisé", "orchestré",
  "piloté", "priorisé", "réduit", "refondu", "rédigé", "recruté", "résolu",
  "restructuré", "sécurisé", "simplifié", "standardisé", "structuré",
  "supervisé", "testé", "transformé",
] as const;

const ACTION_VERBS_EN = [
  "accelerated", "analyzed", "architected", "automated", "built", "coordinated",
  "created", "cut", "defined", "delivered", "deployed", "designed", "developed",
  "drove", "grew", "implemented", "improved", "increased", "introduced",
  "launched", "led", "maintained", "managed", "mentored", "migrated",
  "modernized", "negotiated", "optimized", "orchestrated", "owned",
  "prioritized", "rebuilt", "reduced", "refactored", "resolved", "scaled",
  "secured", "shipped", "simplified", "standardized", "streamlined",
  "structured", "supervised", "tested", "trained",
] as const;

/**
 * The other half of French CV writing, and the half a French recruiter expects:
 * the deverbal noun. "Réduction du temps de build de 40 %" is not a weaker
 * sentence than "Réduit le temps de build" — it is the standard register, the
 * one every French CV guide recommends, and the one our own generator produces.
 *
 * Judging it as passive cost every French CV the whole `actionVerbs` sub-score,
 * whatever it had actually achieved. A bullet opening on one of these names an
 * action just as squarely as a participle does.
 */
const ACTION_NOUNS_FR = [
  "accompagnement", "accélération", "amélioration", "analyse", "animation",
  "audit", "automatisation", "cadrage", "conception", "construction",
  "coordination", "création", "définition", "déploiement", "design",
  "développement", "diminution", "encadrement", "fiabilisation", "formation",
  "gestion", "implémentation", "industrialisation", "intégration", "lancement",
  "livraison", "maintenance", "mentorat", "migration", "mise", "modernisation",
  "négociation", "optimisation", "orchestration", "pilotage", "prise",
  "priorisation", "recrutement", "refactorisation", "refonte", "réduction",
  "rédaction", "résolution", "restructuration", "sécurisation", "simplification",
  "standardisation", "structuration", "supervision", "suivi", "transformation",
] as const;

const ACTION_OPENERS = new Set(
  [...ACTION_VERBS_FR, ...ACTION_VERBS_EN, ...ACTION_NOUNS_FR].map((word) =>
    normalizeToken(word).trim(),
  ),
);

/**
 * Section headings an ATS parser looks for. Matched on a normalised line, so
 * "EXPÉRIENCE PROFESSIONNELLE" and "experience professionnelle" are one entry.
 */
export const SECTION_HEADINGS = {
  certifications: ["certification", "certifications", "certificats", "licenses"],
  education: [
    "formation", "formations", "education", "diplomes", "diplome", "parcours academique",
  ],
  experience: [
    "experience", "experiences", "experience professionnelle",
    "experiences professionnelles", "parcours professionnel", "work experience",
    "employment history", "professional experience",
  ],
  languages: ["langue", "langues", "languages"],
  skills: [
    "competence", "competences", "competences cles", "competences techniques",
    "skills", "key skills", "technical skills", "savoir faire",
    "technologies", "stack technique",
  ],
  summary: [
    "profil", "resume", "a propos", "about", "summary", "objectif",
    "presentation", "profile",
  ],
} as const;

/**
 * Words a job ad is full of and a CV is not judged on: the boilerplate of
 * recruiting prose.
 *
 * Without this filter, pasting a whole offer drowns the handful of terms that
 * matter ("kubernetes", "postgresql") in fifty words of "nous recherchons un
 * profil motivé pour rejoindre notre équipe", and coverage collapses for
 * reasons that say nothing about the candidate.
 *
 * Four characters or fewer are already dropped by `extractKeywords`, so only
 * longer fillers are listed.
 */
const OFFER_STOPWORDS_FR = [
  "avec", "avez", "aurez", "autre", "autres", "aussi", "afin", "ainsi",
  "candidat", "candidate", "candidature", "cadre", "chez", "comme", "compte",
  "contrat", "dans", "depuis", "dont", "elle", "elles", "entre", "entreprise",
  "equipe", "etre", "experience", "fonction", "groupe", "jour", "leur", "leurs",
  "mission", "missions", "notre", "nous", "offre", "plus", "pour", "poste",
  "profil", "quotidien", "recherche", "recherchons", "rejoindre", "salaire",
  "sein", "sera", "seront", "societe", "sont", "sous", "stage", "teletravail",
  "toute", "toutes", "tous", "travail", "vers", "votre", "vous",
] as const;

const OFFER_STOPWORDS_EN = [
  "about", "also", "applicant", "apply", "around", "been", "being",
  "benefits", "candidate", "company", "contract", "from", "have", "hiring",
  "into", "join", "looking", "more", "must", "opportunity", "other",
  "position", "remote", "role", "salary", "search", "seeking", "some",
  "team", "that", "their", "them", "there", "these", "this", "those", "through",
  "using", "very", "what", "when", "where", "which", "while", "will", "with",
  "within", "work", "working", "years", "your",
] as const;

const OFFER_STOPWORDS = new Set(
  [...OFFER_STOPWORDS_FR, ...OFFER_STOPWORDS_EN].map((word) =>
    normalizeToken(word).trim(),
  ),
);

/** True when the term carries no signal about a candidate's fit. */
export function isOfferStopword(token: string) {
  return OFFER_STOPWORDS.has(token);
}

/**
 * True when a bullet opens on an action, in either register: a verb
 * ("Réduit le temps de build", "Reduced build time") or the deverbal noun a
 * French CV uses just as naturally ("Réduction du temps de build").
 *
 * A leading article is skipped so "Refonte" and "La refonte" are one thing.
 */
export function startsWithActionVerb(bullet: string) {
  const words = normalizeToken(bullet).trim().split(/\s+/).filter(Boolean);
  const first = words[0];

  if (first === undefined) return false;
  if (ACTION_OPENERS.has(first)) return true;

  return LEADING_ARTICLES.has(first) && ACTION_OPENERS.has(words[1] ?? "");
}

const LEADING_ARTICLES = new Set(["le", "la", "les", "l", "un", "une", "des"]);

/**
 * A number, a percentage, an amount or a duration — the difference between
 * "improved the build" and "cut the build from 12 to 4 minutes".
 */
const QUANTIFICATION = /\d|\b(doubl|tripl|quadrupl|half|moiti)/i;

export function isQuantified(bullet: string) {
  return QUANTIFICATION.test(bullet);
}
