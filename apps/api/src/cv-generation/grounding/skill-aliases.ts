import { normalizeText } from "./text-normalize";

/**
 * Well-known spellings of the same skill. Each group resolves to its first
 * entry, so a profile saying "JavaScript" vouches for a generated "JS".
 *
 * Only exact synonyms belong here — never a broader or narrower technology,
 * which is what the grounding rules are meant to catch.
 */
const ALIAS_GROUPS: string[][] = [
  ["JavaScript", "JS", "ECMAScript"],
  ["TypeScript", "TS"],
  ["PostgreSQL", "Postgres", "PSQL"],
  ["Node.js", "NodeJS", "Node"],
  ["Kubernetes", "K8s"],
  ["GitHub Actions", "GH Actions"],
  ["CI/CD", "CICD", "Intégration continue", "Continuous Integration"],
  ["Amazon Web Services", "AWS"],
  ["Google Cloud Platform", "GCP"],
  ["Gestion de projet", "Project Management"],
  ["Travail en équipe", "Teamwork", "Esprit d'équipe"],
  ["Résolution de problèmes", "Problem Solving"],
  ["Interface utilisateur", "UI"],
  ["Expérience utilisateur", "UX"],
  ["Base de données", "BDD", "Database"],
  ["Machine Learning", "ML", "Apprentissage automatique"],
  ["Microsoft Excel", "Excel"],
  ["Adobe Photoshop", "Photoshop"],
];

/** Normalised spelling -> canonical normalised spelling. */
const ALIAS_LOOKUP: Map<string, string> = new Map(
  ALIAS_GROUPS.flatMap((group) => {
    const canonical = normalizeText(group[0]);
    return group.map((spelling) => [normalizeText(spelling), canonical]);
  }),
);

/** Collapses a skill onto its canonical spelling, or returns it unchanged. */
export function canonicalizeSkill(value: string): string {
  const normalized = normalizeText(value);
  return ALIAS_LOOKUP.get(normalized) ?? normalized;
}
