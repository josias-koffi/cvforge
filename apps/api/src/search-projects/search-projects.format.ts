import type { SearchContractType, SearchProject } from "@cvforge/types";

const CONTRACT_LABELS: Record<SearchContractType, string> = {
  alternance: "alternance",
  cdd: "CDD",
  cdi: "CDI",
  freelance: "freelance",
  interim: "intérim",
  stage: "stage",
  vie: "VIE",
};

const MONTHS = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];

/**
 * The one sentence a cover letter may say about what the candidate is looking
 * for: "Stage ou alternance (rythme 3j/2j) à partir de septembre 2026".
 *
 * It replaces the free-text `preferences.contractTypes` field, and it is the
 * only part of the search project that ever reaches a prompt — a target salary
 * or an excluded company has no business in a letter.
 */
export function formatContractSearch(project: SearchProject): string {
  const contracts = project.contractTypes.map(
    (contract) => CONTRACT_LABELS[contract],
  );
  if (contracts.length === 0) return "";

  const parts = [capitalize(joinWithOr(contracts))];
  const rhythm = project.apprenticeship?.rhythm.trim();
  if (rhythm) parts.push(`(rythme ${rhythm})`);

  const startDate =
    project.apprenticeship?.startDate || project.internship?.startDate || "";
  const start = formatMonth(startDate);
  if (start) parts.push(`à partir de ${start}`);

  return parts.join(" ");
}

function joinWithOr(values: string[]): string {
  if (values.length === 1) return values[0]!;

  return `${values.slice(0, -1).join(", ")} ou ${values.at(-1)}`;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** "2026-09-01" reads as "septembre 2026"; a day is noise in a letter. */
function formatMonth(isoDate: string): string {
  const match = /^(\d{4})-(\d{2})-\d{2}$/.exec(isoDate);
  if (!match) return "";

  const month = MONTHS[Number(match[2]) - 1];

  return month ? `${month} ${match[1]}` : "";
}
