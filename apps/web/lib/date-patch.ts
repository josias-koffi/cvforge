import { formatPartialDate, formatPeriod, resolvePeriodText, type Locale } from "@cvforge/types"

export type DateSpecKeys = { key: string; legacyKey: string }
export type PeriodSpecKeys = {
  currentKey: string
  endKey: string
  /** Absent : l'ancien champ unique (profil) reçoit la période complète. */
  legacyEndKey?: string
  legacyStartKey: string
}
export type PeriodChange = { current?: boolean; end?: string; start?: string }

/** Écrit la date structurée et régénère l'ancien texte, dans la langue du document. */
export function datePatch(spec: DateSpecKeys, value: string, locale: Locale) {
  return { [spec.key]: value, [spec.legacyKey]: formatPartialDate(value, locale) }
}

export function periodPatch(
  spec: PeriodSpecKeys & { startKey: string },
  item: Record<string, unknown>,
  change: PeriodChange,
  locale: Locale
) {
  const next = {
    current: change.current ?? item[spec.currentKey] === true,
    end: change.end ?? String(item[spec.endKey] ?? ""),
    start: change.start ?? String(item[spec.startKey] ?? ""),
  }
  if (next.current) next.end = ""
  const patch: Record<string, unknown> = {
    [spec.currentKey]: next.current,
    [spec.endKey]: next.end,
    [spec.startKey]: next.start,
  }
  if (spec.legacyEndKey) {
    const text = resolvePeriodText(next, "", "", locale)
    patch[spec.legacyStartKey] = text.start
    patch[spec.legacyEndKey] = text.end
  } else {
    patch[spec.legacyStartKey] = formatPeriod(next, locale)
  }
  return patch
}
