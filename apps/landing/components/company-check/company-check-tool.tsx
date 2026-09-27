"use client"

import { useEffect, useId, useMemo, useRef, useState } from "react"
import { CircleAlertIcon, InfoIcon, SearchIcon } from "lucide-react"
import type {
  CompanyCheckMatch,
  PublicCompanyCheckResponse,
} from "@cvforge/types"

import {
  SparkPending,
  sparkPendingClassName,
} from "@/components/ats/spark-pending"
import { CompanyMatches } from "@/components/company-check/company-matches"
import { CompanySheet } from "@/components/company-check/company-sheet"
import { Button } from "@/components/ui/button"
import type { CompanyCheckDictionary } from "@/content/company-check/types"
import type { LandingDictionary } from "@/content/types"
import { scanErrorMessage } from "@/lib/ats-client"
import { toolFunnel } from "@/lib/ats-funnel"
import {
  fetchCompany,
  MIN_COMPANY_QUERY_CHARS,
  searchCompanies,
} from "@/lib/company-check-client"
import { format, type Locale } from "@/lib/i18n"
import { cn } from "@/lib/utils"

type Search = { query: string; matches: CompanyCheckMatch[] }

/**
 * The free "check an employer" tool (US-139): a name or a SIREN in, the
 * company's public record out. No account; the API asks the Annuaire des
 * entreprises and Egapro, and keeps nothing.
 */
export function CompanyCheckTool({
  dictionary,
  errors,
  locale,
}: {
  dictionary: CompanyCheckDictionary
  /** Every free tool's refusals are worded in one place. */
  errors: LandingDictionary["ats"]
  locale: Locale
}) {
  const [query, setQuery] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState<Search | null>(null)
  const [sheet, setSheet] = useState<PublicCompanyCheckResponse | null>(null)

  const sheetRef = useRef<HTMLDivElement>(null)
  const inputId = useId()
  const hintId = useId()

  const funnel = useMemo(() => toolFunnel("company_check", locale), [locale])

  // Counted once per visitor and day by the API (US-131).
  useEffect(() => {
    funnel.viewed()
  }, [funnel])

  // The sheet replaces the form: move the reader to it once it is mounted.
  useEffect(() => {
    if (sheet) sheetRef.current?.focus()
  }, [sheet])

  async function run(task: () => Promise<void>) {
    setBusy(true)
    setError(null)

    try {
      await task()
    } catch (caught) {
      setError(scanErrorMessage(caught, errors))
    } finally {
      setBusy(false)
    }
  }

  async function showSheet(siren: string) {
    const answer = await fetchCompany(siren)
    setSheet(answer)
    if (answer.status === "found") funnel.scanned()
  }

  function find() {
    const text = query.trim()
    if (text.length < MIN_COMPANY_QUERY_CHARS || busy) return

    return run(async () => {
      const { matches } = await searchCompanies(text)
      setSearch({ matches, query: text })
      // A SIREN, or a name only one company bears: straight to its record.
      if (matches.length === 1) await showSheet(matches[0]!.siren)
    })
  }

  if (sheet) {
    return (
      <div className="mx-auto w-full max-w-3xl">
        <CompanySheet
          dictionary={dictionary}
          errors={errors}
          locale={locale}
          onBack={
            search && search.matches.length > 1 ? () => setSheet(null) : null
          }
          onCtaClick={funnel.ctaClicked}
          onLeadSent={funnel.emailSubmitted}
          onRestart={() => {
            setSheet(null)
            setSearch(null)
            setQuery("")
          }}
          ref={sheetRef}
          result={sheet}
        />
      </div>
    )
  }

  const noMatch = search?.matches.length === 0

  return (
    <>
      <form
        className="mx-auto w-full max-w-2xl rounded-2xl border bg-card p-6 shadow-raised md:p-8"
        onSubmit={(event) => {
          event.preventDefault()
          void find()
        }}
      >
        <label className="block font-medium" htmlFor={inputId}>
          {dictionary.form.label}
        </label>
        <p className="mt-1 text-sm text-muted-foreground" id={hintId}>
          {dictionary.form.hint}
        </p>
        <input
          aria-describedby={hintId}
          autoComplete="off"
          className="mt-2 h-11 w-full rounded-lg border bg-background px-3 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-60"
          disabled={busy}
          id={inputId}
          maxLength={100}
          onChange={(event) => {
            setError(null)
            setQuery(event.target.value)
          }}
          placeholder={dictionary.form.placeholder}
          value={query}
        />

        <div aria-live="polite" className="text-sm" role="status">
          {/* Kept mounted and empty: a live region that appears with its
              message is often not read out. */}
          {error ? (
            <p className="mt-3 flex animate-rise-in items-start gap-1.5 text-destructive">
              <CircleAlertIcon className="mt-0.5 size-4 shrink-0" />
              {error}
            </p>
          ) : noMatch ? (
            <p className="mt-3 flex animate-rise-in items-start gap-1.5 text-muted-foreground">
              <InfoIcon className="mt-0.5 size-4 shrink-0" />
              {format(dictionary.results.noMatch, { query: search.query })}
            </p>
          ) : null}
        </div>

        <Button
          className={cn("mt-6 h-11 w-full text-base", sparkPendingClassName(busy))}
          disabled={query.trim().length < MIN_COMPANY_QUERY_CHARS || busy}
          size="lg"
          type="submit"
          variant="spark"
        >
          <SparkPending pending={busy} pendingLabel={dictionary.form.submitting}>
            <SearchIcon />
            {dictionary.form.submit}
          </SparkPending>
        </Button>

        <p className="mt-4 text-xs text-muted-foreground">
          {dictionary.form.privacyNote}
        </p>
      </form>

      {search && search.matches.length > 1 ? (
        <CompanyMatches
          dictionary={dictionary.results}
          disabled={busy}
          locale={locale}
          matches={search.matches}
          onOpen={(siren) => void run(() => showSheet(siren))}
        />
      ) : null}
    </>
  )
}
