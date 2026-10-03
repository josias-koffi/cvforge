"use client"

import { useOptimistic, useTransition } from "react"
import type { JobAlertPreferences as Preferences } from "@cvforge/types"
import { toast } from "sonner"

import { updateJobAlertPreference } from "@/app/(app)/notifications/actions"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
} from "@/components/ui/field"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

const THRESHOLDS: Array<{ value: Preferences["threshold"]; label: string }> = [
  { label: "Très proches", value: "close" },
  { label: "Toutes", value: "all" },
]

const RHYTHMS: Array<{ value: Preferences["rhythm"]; label: string }> = [
  { label: "Immédiat", value: "immediate" },
  { label: "Toutes les heures", value: "hourly" },
]

/**
 * "Nouvelle offre pour vous" (US-166): on or off, which offers, how often.
 * Free, whatever the settings. The AI analysis below is the paid option
 * (US-168), off by default, its price stated where it is switched on.
 */
export function JobAlertPreferences({
  disabled,
  preferences,
}: {
  disabled?: boolean
  preferences: Preferences
}) {
  const [optimistic, setOptimistic] = useOptimistic(preferences)
  const [, startTransition] = useTransition()

  function save(update: Partial<Preferences>) {
    startTransition(async () => {
      setOptimistic({ ...optimistic, ...update })
      const result = await updateJobAlertPreference(update)
      if (result.ok) toast.success(result.message)
      else toast.error(result.message)
    })
  }

  const off = disabled || !optimistic.enabled

  return (
    <div className="flex flex-col gap-6">
      <Field orientation="horizontal">
        <FieldContent>
          <FieldLabel htmlFor="job-alerts">Alertes nouvelles offres</FieldLabel>
          <FieldDescription>
            Un e-mail dans les minutes qui suivent la publication d&apos;une
            offre qui vous correspond. Gratuit.
          </FieldDescription>
        </FieldContent>
        <Switch
          id="job-alerts"
          checked={optimistic.enabled}
          disabled={disabled}
          onCheckedChange={(enabled) => save({ enabled })}
        />
      </Field>
      <Field>
        <FieldLabel id="job-alerts-threshold">Quelles offres</FieldLabel>
        <ToggleGroup
          aria-labelledby="job-alerts-threshold"
          type="single"
          variant="outline"
          value={optimistic.threshold}
          disabled={off}
          onValueChange={(value) =>
            value && save({ threshold: value as Preferences["threshold"] })
          }
        >
          {THRESHOLDS.map((option) => (
            <ToggleGroupItem key={option.value} value={option.value}>
              {option.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </Field>
      <Field>
        <FieldLabel id="job-alerts-rhythm">Rythme</FieldLabel>
        <ToggleGroup
          aria-labelledby="job-alerts-rhythm"
          type="single"
          variant="outline"
          value={optimistic.rhythm}
          disabled={off}
          onValueChange={(value) =>
            value && save({ rhythm: value as Preferences["rhythm"] })
          }
        >
          {RHYTHMS.map((option) => (
            <ToggleGroupItem key={option.value} value={option.value}>
              {option.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <FieldDescription>
          Rien entre 21 h et 7 h : ce qui arrive la nuit part en un seul e-mail
          à 7 h. Au-delà de 10 offres dans la journée, elles sont regroupées
          toutes les heures.
        </FieldDescription>
      </Field>
      <Separator />
      <Field orientation="horizontal">
        <FieldContent>
          <FieldLabel htmlFor="job-alerts-ai">
            Analyse IA de mes alertes
          </FieldLabel>
          <FieldDescription>
            Pour chaque offre : à saisir, à considérer ou à passer, pourquoi
            elle vaut le coup, les points de vigilance et quoi mettre en avant.
            1 crédit par jour où au moins une alerte est analysée, analyses
            illimitées ce jour-là (20 au plus). Sans crédit, l&apos;alerte part
            quand même, sans analyse.
          </FieldDescription>
        </FieldContent>
        <Switch
          id="job-alerts-ai"
          checked={optimistic.aiAnalysis}
          disabled={off}
          onCheckedChange={(aiAnalysis) => save({ aiAnalysis })}
        />
      </Field>
      <Field orientation="horizontal">
        <FieldContent>
          <FieldLabel htmlFor="job-alerts-ai-filter">
            Ne pas m&apos;alerter pour les offres « à passer »
          </FieldLabel>
          <FieldDescription>
            Elles restent dans vos offres du jour, avec leur analyse. Désactivé,
            vous recevez toutes vos alertes, comme sans l&apos;analyse.
          </FieldDescription>
        </FieldContent>
        <Switch
          id="job-alerts-ai-filter"
          checked={optimistic.aiFilter}
          disabled={off || !optimistic.aiAnalysis}
          onCheckedChange={(aiFilter) => save({ aiFilter })}
        />
      </Field>
    </div>
  )
}
