import type { CreditHistoryKind, CreditLedgerEntry } from "@cvforge/types"

/**
 * The credit history filters, in the URL in French (`?type=depenses`) and
 * sent to the API by direction (`kind=spent`).
 */
export const CREDIT_HISTORY_FILTERS = [
  { kind: null, label: "Tout", type: null },
  { kind: "spent", label: "Dépenses", type: "depenses" },
  { kind: "earned", label: "Recharges", type: "recharges" },
] as const satisfies readonly {
  kind: CreditHistoryKind | null
  label: string
  type: string | null
}[]

export type CreditHistoryType = NonNullable<
  (typeof CREDIT_HISTORY_FILTERS)[number]["type"]
>

export const creditActionLabels: Record<CreditLedgerEntry["action"], string> = {
  admin_grant: "Crédits offerts",
  cv_generation: "Génération de CV",
  cv_import: "Import de CV",
  interview_session: "Entretien simulé",
  job_digest_rerank: "Classement IA des offres du jour",
  letter_generation: "Génération de lettre",
  offer_enrichment: "Analyse d'offre",
  stripe_purchase: "Achat de crédits",
  welcome_grant: "Crédits de bienvenue",
}

function readParam(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined
}

/** The page and filter asked for; anything unreadable means "first page, everything". */
export function parseCreditHistoryParams(
  params: Record<string, string | string[] | undefined>
) {
  const page = Number(readParam(params.page))
  const filter =
    CREDIT_HISTORY_FILTERS.find(
      ({ type }) => type !== null && type === readParam(params.type)
    ) ?? CREDIT_HISTORY_FILTERS[0]

  return {
    kind: filter.kind,
    page: Number.isInteger(page) && page > 0 ? page : 1,
    type: filter.type,
  }
}

/** The ledger writes "Achat Stripe <pack> (<price> cents)": only the pack is for the reader. */
const STRIPE_PURCHASE_NOTE = /^Achat Stripe (.+) \(\d+ cents\)$/

/**
 * What a line adds to its label, if anything. The ledger notes are written for
 * support ("Generation CV"), so only those that say something the label does
 * not are shown: the length of an interview, the pack bought, the reason for a
 * gift.
 */
export function creditEntryDetail(entry: CreditLedgerEntry): string | null {
  switch (entry.action) {
    case "interview_session":
      return entry.metadata.durationMinutes
        ? `${entry.metadata.durationMinutes} min`
        : null
    case "stripe_purchase":
      return entry.note?.match(STRIPE_PURCHASE_NOTE)?.[1] ?? null
    case "admin_grant":
      return entry.note
    default:
      return null
  }
}
