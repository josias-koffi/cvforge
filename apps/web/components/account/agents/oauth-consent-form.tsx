"use client"

import { useState, useTransition } from "react"
import { ShieldCheckIcon } from "lucide-react"
import { toast } from "sonner"
import {
  AGENT_SCOPE_LABELS,
  AGENT_SCOPE_PRESETS,
  AGENT_TOKEN_DEFAULT_DAILY_CREDIT_CAP,
  AGENT_TOKEN_MAX_DAILY_CREDIT_CAP,
  type OAuthConsentRequest,
} from "@cvforge/types"

import { decideAgentAccess } from "@/app/autoriser-agent/actions"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"

type Preset = keyof typeof AGENT_SCOPE_PRESETS

const PRESET_LABELS: Record<Preset, string> = {
  assistant: "Assistant complet",
  extension: "Sans modification du profil",
  readOnly: "Lecture seule",
}

/** What the agent asked for, read as the closest preset; full access by default. */
function initialPreset(
  requested: OAuthConsentRequest["requestedScopes"]
): Preset {
  const readOnly: readonly string[] = AGENT_SCOPE_PRESETS.readOnly

  return requested.length > 0 &&
    requested.every((scope) => readOnly.includes(scope))
    ? "readOnly"
    : "assistant"
}

export function OAuthConsentForm({
  consent,
  email,
  request,
}: {
  consent: OAuthConsentRequest
  email: string
  request: string
}) {
  const [pending, startTransition] = useTransition()
  const [preset, setPreset] = useState<Preset>(
    initialPreset(consent.requestedScopes)
  )
  const [cap, setCap] = useState(String(AGENT_TOKEN_DEFAULT_DAILY_CREDIT_CAP))
  const scopes = AGENT_SCOPE_PRESETS[preset]

  const answer = (approve: boolean) =>
    startTransition(async () => {
      const result = await decideAgentAccess({
        approve,
        dailyCreditCap: Number(cap),
        request,
        scopes: [...scopes],
      })

      if (result?.message) toast.error(result.message)
    })

  return (
    <Card>
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
          <ShieldCheckIcon className="size-5" />
        </div>
        <CardTitle className="text-xl">
          Autoriser {consent.clientName}
        </CardTitle>
        <CardDescription>
          {consent.clientName} demande à agir sur votre compte JobSpark ({email}
          ).
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-muted-foreground">
          Retour vers{" "}
          <span className="font-medium text-foreground">
            {consent.redirectHost}
          </span>
          <Badge variant="secondary">
            {consent.clientKind === "cimd"
              ? "Application identifiée"
              : "Application enregistrée"}
          </Badge>
        </div>
        <Field>
          <FieldLabel htmlFor="consent-preset">
            Ce que l&apos;agent pourra faire
          </FieldLabel>
          <Select
            value={preset}
            onValueChange={(value) => setPreset(value as Preset)}
          >
            <SelectTrigger id="consent-preset" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(PRESET_LABELS) as Preset[]).map((key) => (
                <SelectItem key={key} value={key}>
                  {PRESET_LABELS[key]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-muted-foreground">
            {scopes.map((scope) => (
              <li key={scope}>{AGENT_SCOPE_LABELS[scope]}</li>
            ))}
          </ul>
        </Field>
        <Field>
          <FieldLabel htmlFor="consent-cap">
            Crédits par jour, au plus
          </FieldLabel>
          <Input
            id="consent-cap"
            type="number"
            min={0}
            max={AGENT_TOKEN_MAX_DAILY_CREDIT_CAP}
            value={cap}
            onChange={(event) => setCap(event.target.value)}
          />
          <FieldDescription>
            Un CV ou une lettre coûte 3 crédits.
          </FieldDescription>
        </Field>
        <Alert>
          <AlertDescription>
            Vos données (dont nom, e-mail et téléphone) seront traitées par{" "}
            {consent.clientName}. Vous pourrez couper cet accès à tout moment
            dans Mon compte › Agents connectés.
          </AlertDescription>
        </Alert>
      </CardContent>
      <CardFooter className="flex gap-2">
        <Button
          className="flex-1"
          variant="outline"
          disabled={pending}
          onClick={() => answer(false)}
        >
          Refuser
        </Button>
        <Button
          className="flex-1"
          disabled={pending}
          onClick={() => answer(true)}
        >
          {pending ? <Spinner /> : null}
          Autoriser
        </Button>
      </CardFooter>
    </Card>
  )
}
