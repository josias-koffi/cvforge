"use client"

import { useState } from "react"
import type { AtsScoreDetail } from "@cvforge/types"
import { ChevronRightIcon, CircleAlertIcon, HistoryIcon } from "lucide-react"

import { AtsScoreBadge } from "@/components/applications/ats-score-badge"
import { AtsReport } from "@/components/ats/ats-report"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { ATS_FINDING_LABELS } from "@/lib/ats-report"

/**
 * The ATS score of a generated CV, opened from its badge (US-153): criterion
 * by criterion, each point raised with what to change. The engine already
 * computes all of it at every save; until now only the number reached the
 * screen.
 */
export function AtsScoreSheet({
  score,
  stale = false,
  defaultOpen = false,
}: {
  score: AtsScoreDetail | null | undefined
  /** Edits are pending: the analysis describes the last saved version. */
  stale?: boolean
  /** Opened on arrival, when a link asked for the analysis. */
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)

  // A score stored before the detail travelled has nothing to open.
  if (!score?.dimensions) {
    return <AtsScoreBadge score={score} stale={stale} />
  }

  const capping = score.cappedBy
    ? (ATS_FINDING_LABELS[score.cappedBy] ?? score.cappedBy)
    : null

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 px-1.5"
        >
          <AtsScoreBadge score={score} stale={stale} />
          <span className="text-muted-foreground">Voir l&apos;analyse</span>
          <ChevronRightIcon aria-hidden="true" className="text-muted-foreground" />
        </Button>
      </SheetTrigger>
      <SheetContent className="gap-0 overflow-y-auto data-[side=right]:w-full data-[side=right]:sm:w-[max(40vw,34rem)] data-[side=right]:sm:max-w-full">
        <SheetHeader className="border-b">
          <SheetTitle>Analyse ATS de ce CV</SheetTitle>
          <SheetDescription>
            Ce que les logiciels de tri des recruteurs retiendraient de ce CV,
            recalculé gratuitement à chaque enregistrement.
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-4 p-4">
          {stale ? (
            <Alert>
              <HistoryIcon />
              <AlertTitle>Modifications non enregistrées</AlertTitle>
              <AlertDescription>
                L&apos;analyse porte sur la dernière version enregistrée.
                Enregistrez pour la mettre à jour.
              </AlertDescription>
            </Alert>
          ) : null}
          <div className="flex flex-wrap items-center gap-4">
            <p className="text-5xl font-semibold tabular-nums">
              {score.overallScore}
              <span className="text-base font-normal text-muted-foreground">
                {" "}
                / 100
              </span>
            </p>
            <AtsScoreBadge score={score} />
          </div>
          {capping ? (
            <Alert variant="destructive">
              <CircleAlertIcon />
              <AlertTitle>Score plafonné</AlertTitle>
              <AlertDescription>
                Tant que ce point n&apos;est pas corrigé, le score ne peut pas
                monter plus haut : {capping}.
              </AlertDescription>
            </Alert>
          ) : null}
          <AtsReport result={score} findingsFirst />
        </div>
      </SheetContent>
    </Sheet>
  )
}
