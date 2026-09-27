"use client"

import { useEffect, useId, useMemo, useRef, useState } from "react"
import { CircleAlertIcon, MapPinnedIcon } from "lucide-react"
import {
  frenchDepartments,
  type PublicJobMarketResponse,
  type RomeAppellationOption,
} from "@cvforge/types"

import {
  SparkPending,
  sparkPendingClassName,
} from "@/components/ats/spark-pending"
import { AppellationCombobox } from "@/components/job-market/appellation-combobox"
import { JobMarketResult } from "@/components/job-market/job-market-result"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { LandingDictionary } from "@/content/types"
import { scanErrorMessage } from "@/lib/ats-client"
import { toolFunnel } from "@/lib/ats-funnel"
import { fetchJobMarket } from "@/lib/job-market-client"
import { cn } from "@/lib/utils"

/**
 * The free "does this job hire near me?" tool (US-137): a ROME job and a
 * department in, France Travail's figures for them out. No account, no
 * personal data, and no France Travail call on the way: the API reads its copy.
 */
export function JobMarketTool({
  dictionary,
  errors,
  locale,
}: {
  dictionary: LandingDictionary["jobMarket"]
  /** Every free tool's refusals are worded in one place. */
  errors: LandingDictionary["ats"]
  locale: string
}) {
  const [appellation, setAppellation] = useState<RomeAppellationOption | null>(
    null
  )
  const [department, setDepartment] = useState("")
  const [reading, setReading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<PublicJobMarketResponse | null>(null)

  const resultRef = useRef<HTMLDivElement>(null)
  const departmentId = useId()

  const funnel = useMemo(() => toolFunnel("job_market", locale), [locale])

  // Counted once per visitor and day by the API (US-131).
  useEffect(() => {
    funnel.viewed()
  }, [funnel])

  // The result replaces the form: move the reader to it once it is mounted.
  useEffect(() => {
    if (result) resultRef.current?.focus()
  }, [result])

  const ready = appellation !== null && department !== "" && !reading

  async function read() {
    if (!appellation || !ready) return

    setReading(true)
    setError(null)

    try {
      setResult(await fetchJobMarket(appellation.code, department))
      funnel.scanned()
    } catch (caught) {
      setError(scanErrorMessage(caught, errors))
    } finally {
      setReading(false)
    }
  }

  if (result) {
    return (
      <div className="mx-auto w-full max-w-3xl">
        <JobMarketResult
          dictionary={dictionary}
          errors={errors}
          locale={locale}
          onCtaClick={funnel.ctaClicked}
          onLeadSent={funnel.emailSubmitted}
          onRestart={() => {
            setResult(null)
            setError(null)
          }}
          ref={resultRef}
          result={result}
        />
      </div>
    )
  }

  return (
    <form
      className="mx-auto w-full max-w-2xl rounded-2xl border bg-card p-6 shadow-raised md:p-8"
      onSubmit={(event) => {
        event.preventDefault()
        void read()
      }}
    >
      <div className="grid gap-6 md:grid-cols-[1fr_18rem]">
        <AppellationCombobox
          disabled={reading}
          labels={dictionary.form}
          onSelect={(picked) => {
            setError(null)
            setAppellation(picked)
          }}
          selected={appellation}
        />
        <div>
          <label className="block font-medium" htmlFor={departmentId}>
            {dictionary.form.departmentLabel}
          </label>
          <Select
            disabled={reading}
            onValueChange={(value) => {
              setError(null)
              setDepartment(value)
            }}
            value={department}
          >
            <SelectTrigger className="mt-2" id={departmentId}>
              <SelectValue placeholder={dictionary.form.departmentPlaceholder} />
            </SelectTrigger>
            <SelectContent>
              {frenchDepartments.map(({ code, label }) => (
                <SelectItem key={code} textValue={label} value={code}>
                  <span className="flex items-baseline gap-3">
                    <span className="w-7 shrink-0 text-muted-foreground tabular-nums">
                      {code}
                    </span>
                    <span className="truncate">{label}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <p aria-live="polite" className="text-sm text-destructive" role="status">
        {/* Kept mounted and empty: a live region that appears with its
            message is often not read out. */}
        {error ? (
          <span className="mt-3 flex animate-rise-in items-start gap-1.5">
            <CircleAlertIcon className="mt-0.5 size-4 shrink-0" />
            {error}
          </span>
        ) : null}
      </p>

      <Button
        className={cn(
          "mt-6 h-11 w-full text-base",
          sparkPendingClassName(reading)
        )}
        disabled={!ready}
        size="lg"
        type="submit"
        variant="spark"
      >
        <SparkPending
          pending={reading}
          pendingLabel={dictionary.form.submitting}
        >
          <MapPinnedIcon />
          {dictionary.form.submit}
        </SparkPending>
      </Button>

      <p className="mt-4 text-xs text-muted-foreground">
        {dictionary.form.privacyNote}
      </p>
    </form>
  )
}
