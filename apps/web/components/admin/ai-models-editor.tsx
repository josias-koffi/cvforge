"use client"

import {
  anthropicModels,
  isOpenRouterModelId,
  openRouterModelSuggestions,
  type AiFeatureModelRow,
  type AiFeatureModelsOverview,
  type AiModelChoice,
} from "@cvforge/types"
import { useState } from "react"

import { chooseAiModel, resetAiModel } from "@/app/(app)/admin/ai-models/actions"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useActionMutation } from "@/hooks/use-action-mutation"
import { aiFeatureLabels } from "@/lib/admin-metrics/labels"

const DEFAULT_VALUE = "default"
const CUSTOM_VALUE = "custom"

const valueOf = ({ provider, model }: AiModelChoice) => `${provider}:${model}`

function parseValue(value: string): AiModelChoice {
  const separator = value.indexOf(":")

  return {
    model: value.slice(separator + 1),
    provider: value.slice(0, separator) as AiModelChoice["provider"],
  }
}

const usdRate = (usd: number) =>
  usd.toLocaleString("fr-FR", { maximumFractionDigits: 2 })

export function AiModelsEditor({ overview }: { overview: AiFeatureModelsOverview }) {
  return (
    <div className="space-y-4">
      {overview.anthropicEnabled ? null : (
        <Alert>
          <AlertDescription>
            Claude n&apos;est pas disponible : renseignez ANTHROPIC_API_KEY sur le
            serveur pour pouvoir le choisir.
          </AlertDescription>
        </Alert>
      )}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fonctionnalité</TableHead>
              <TableHead>Modèle par défaut</TableHead>
              <TableHead className="w-96">Modèle utilisé</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {overview.features.map((row) => (
              <ModelRow
                anthropicEnabled={overview.anthropicEnabled}
                key={row.feature}
                row={row}
              />
            ))}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground">
        La voix et la transcription d&apos;entretien restent sur OpenAI Realtime. Les
        tarifs sont en dollars par million de tokens, entrée puis sortie.
      </p>
    </div>
  )
}

function ModelRow({
  anthropicEnabled,
  row,
}: {
  anthropicEnabled: boolean
  row: AiFeatureModelRow
}) {
  const [customOpen, setCustomOpen] = useState(false)
  const { pending, run } = useActionMutation(() => setCustomOpen(false))
  const [customModel, setCustomModel] = useState("")
  const label = aiFeatureLabels[row.feature]
  const current = row.choice ? valueOf(row.choice) : DEFAULT_VALUE
  const isUnlistedOpenRouter =
    row.choice?.provider === "openrouter" &&
    !(openRouterModelSuggestions as readonly string[]).includes(row.choice.model)

  const onSelect = (value: string) => {
    if (value === CUSTOM_VALUE) return setCustomOpen(true)

    setCustomOpen(false)
    if (value === DEFAULT_VALUE) return run(() => resetAiModel(row.feature))
    run(() => chooseAiModel(row.feature, parseValue(value)))
  }

  const customIsValid = isOpenRouterModelId(customModel.trim())

  return (
    <TableRow>
      <TableCell className="font-medium">{label}</TableCell>
      <TableCell className="font-mono text-xs">{row.defaultModel}</TableCell>
      <TableCell className="space-y-2">
        <Select
          disabled={pending}
          onValueChange={onSelect}
          value={customOpen ? CUSTOM_VALUE : current}
        >
          <SelectTrigger aria-label={`Modèle pour ${label}`} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={DEFAULT_VALUE}>Modèle par défaut</SelectItem>
            <SelectGroup>
              <SelectLabel>Claude (crédit direct)</SelectLabel>
              {anthropicModels.map((model) => (
                <SelectItem
                  disabled={!anthropicEnabled}
                  key={model.id}
                  value={`anthropic:${model.id}`}
                >
                  {model.label} · {usdRate(model.inputUsdPerMTok)} /{" "}
                  {usdRate(model.outputUsdPerMTok)} $
                </SelectItem>
              ))}
            </SelectGroup>
            <SelectGroup>
              <SelectLabel>OpenRouter</SelectLabel>
              {openRouterModelSuggestions.map((model) => (
                <SelectItem key={model} value={`openrouter:${model}`}>
                  {model}
                </SelectItem>
              ))}
              {isUnlistedOpenRouter && row.choice ? (
                <SelectItem value={current}>{row.choice.model}</SelectItem>
              ) : null}
              <SelectItem value={CUSTOM_VALUE}>Autre modèle OpenRouter…</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
        {customOpen ? (
          <div className="flex gap-2">
            <Input
              aria-label={`Identifiant OpenRouter pour ${label}`}
              onChange={(event) => setCustomModel(event.target.value)}
              placeholder="vendor/model"
              value={customModel}
            />
            <Button
              disabled={pending || !customIsValid}
              onClick={() =>
                run(() =>
                  chooseAiModel(row.feature, {
                    model: customModel.trim(),
                    provider: "openrouter",
                  })
                )
              }
              type="button"
            >
              Enregistrer
            </Button>
          </div>
        ) : null}
      </TableCell>
    </TableRow>
  )
}
