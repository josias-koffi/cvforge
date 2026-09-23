import {
  searchSectors,
  type SearchCompanySize,
  type SearchCompanyValue,
  type SearchContractType,
  type searchExperienceLevels,
  type searchRemoteModes,
  type SearchSectorId,
} from "@cvforge/types"

/** The labels of every choice on "Ma recherche", apart from the form itself. */
export const CONTRACT_OPTIONS: ReadonlyArray<{
  id: SearchContractType
  label: string
}> = [
  { id: "cdi", label: "CDI" },
  { id: "cdd", label: "CDD" },
  { id: "interim", label: "Intérim" },
  { id: "freelance", label: "Freelance" },
  { id: "stage", label: "Stage" },
  { id: "alternance", label: "Alternance" },
  { id: "vie", label: "VIE" },
]

export const EXPERIENCE_LABELS: Record<
  (typeof searchExperienceLevels)[number],
  string
> = {
  confirme: "Confirmé (3 à 5 ans)",
  debutant: "Débutant",
  junior: "Junior (1 à 3 ans)",
  senior: "Senior (plus de 5 ans)",
}

export const REMOTE_LABELS: Record<(typeof searchRemoteModes)[number], string> =
  {
    any: "Peu importe",
    full_remote: "100 % télétravail",
    hybrid: "Hybride",
    onsite: "Sur site",
  }

export const SIZE_OPTIONS: ReadonlyArray<{
  id: SearchCompanySize
  label: string
}> = [
  { id: "tpe", label: "TPE (moins de 10)" },
  { id: "pme", label: "PME (10 à 250)" },
  { id: "eti", label: "ETI (250 à 5000)" },
  { id: "ge", label: "Grand groupe" },
]

export const VALUE_OPTIONS: ReadonlyArray<{
  id: SearchCompanyValue
  label: string
}> = [
  { id: "societe_mission", label: "Société à mission" },
  { id: "ess", label: "Économie sociale et solidaire" },
  { id: "egapro_75plus", label: "Index égalité ≥ 75" },
  { id: "bilan_ges", label: "Bilan carbone publié" },
]

export const SECTOR_OPTIONS = searchSectors.map((sector) => ({
  id: sector.id as SearchSectorId,
  label: sector.label,
}))
