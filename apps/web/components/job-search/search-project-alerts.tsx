"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import type { SearchProject } from "@cvforge/types"
import { CheckIcon } from "lucide-react"
import { toast } from "sonner"

import { saveSearchAlerts } from "@/app/(app)/ma-recherche/actions"
import {
  companiesSummary,
  jobSummary,
  placeSummary,
} from "@/components/job-search/search-criteria"
import { searchTabHref } from "@/components/job-search/search-tabs"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import type { SearchAlerts } from "@/lib/search-project"

/**
 * The morning selection: whether it comes, by e-mail, and ranked by the AI.
 * Each switch applies at once, like the job chips — and next to them, what
 * the selection is built from, since that is what a candidate who gets the
 * wrong offers comes here to find.
 */
export function SearchProjectAlerts({
  confirmedJobs,
  initialAlerts,
  profileId,
  project,
}: {
  confirmedJobs: number
  initialAlerts: SearchAlerts
  profileId: string
  project: SearchProject
}) {
  const [alerts, setAlerts] = useState(initialAlerts)
  const [pending, startSaving] = useTransition()

  const toggle = (key: keyof SearchAlerts, value: boolean) => {
    const previous = alerts
    const next = { ...alerts, [key]: value }
    setAlerts(next)

    startSaving(async () => {
      const result = await saveSearchAlerts(profileId, next)

      if (result.ok) {
        setAlerts(result.alerts)
      } else {
        setAlerts(previous)
        toast.error(result.message)
      }
    })
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <Card>
        <CardHeader>
          <CardTitle>Vos offres du jour</CardTitle>
          <CardDescription>
            Une sélection chaque matin, d&apos;après vos critères et vos
            métiers.
          </CardDescription>
          <CardAction>
            <span
              aria-live="polite"
              className="flex items-center gap-1.5 text-xs text-muted-foreground"
            >
              {pending ? (
                <>
                  <Spinner className="size-3" /> Enregistrement…
                </>
              ) : (
                <>
                  <CheckIcon className="size-3" /> Enregistré
                </>
              )}
            </span>
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col divide-y">
          <AlertSwitch
            checked={alerts.digestEnabled}
            label="Me proposer des offres chaque matin"
            onChange={(checked) => toggle("digestEnabled", checked)}
          />
          <AlertSwitch
            checked={alerts.emailEnabled}
            disabled={!alerts.digestEnabled}
            label="Recevoir la sélection par e-mail"
            onChange={(checked) => toggle("emailEnabled", checked)}
          />
          <AlertSwitch
            checked={alerts.aiRerankEnabled}
            disabled={!alerts.digestEnabled}
            label="Classement par l'IA, avec une phrase par offre expliquant pourquoi elle vous correspond"
            hint="1 crédit par sélection, débité seulement si le classement aboutit."
            onChange={(checked) => toggle("aiRerankEnabled", checked)}
          />
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle>Votre sélection se base sur</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="flex flex-col gap-3 text-sm">
            <Basis label="Le poste" value={jobSummary(project)} />
            <Basis label="Lieu" value={placeSummary(project)} />
            <Basis
              label="Secteurs et entreprises"
              value={companiesSummary(project)}
            />
            <Basis
              label="Métiers confirmés"
              value={confirmedJobs === 0 ? "Aucun" : String(confirmedJobs)}
            />
          </dl>
          <Button asChild variant="outline" size="sm" className="mt-4 w-full">
            <Link href={searchTabHref("/ma-recherche", profileId)}>
              Modifier mes critères
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

function AlertSwitch({
  checked,
  disabled,
  hint,
  label,
  onChange,
}: {
  checked: boolean
  disabled?: boolean
  hint?: string
  label: string
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="flex items-start justify-between gap-4 py-3 text-sm first:pt-0 last:pb-0">
      <span className="block">
        {label}
        {hint ? (
          <span className="block text-xs text-muted-foreground">{hint}</span>
        ) : null}
      </span>
      <Switch
        className="mt-0.5"
        checked={checked}
        disabled={disabled}
        onCheckedChange={onChange}
      />
    </label>
  )
}

function Basis({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  )
}
