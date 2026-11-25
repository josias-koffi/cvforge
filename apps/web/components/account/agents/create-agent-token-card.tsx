"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { CopyIcon, KeyRoundIcon } from "lucide-react"
import { toast } from "sonner"
import {
  AGENT_SCOPE_LABELS,
  AGENT_SCOPE_PRESETS,
  AGENT_TOKEN_DEFAULT_DAILY_CREDIT_CAP,
  AGENT_TOKEN_MAX_DAILY_CREDIT_CAP,
  AGENT_TOKEN_NAME_MAX_LENGTH,
} from "@cvforge/types"

import { createAgentToken } from "@/app/(app)/compte/agents/actions"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
  assistant: "Assistant complet (Claude Code)",
  extension: "Extension JobSpark (sans modification du profil)",
  readOnly: "Lecture seule",
}

const TTL_OPTIONS = [7, 30, 90]

function connectCommand(mcpUrl: string, token: string) {
  return `claude mcp add --transport http jobspark ${mcpUrl} --header "Authorization: Bearer ${token}"`
}

export function CreateAgentTokenCard() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [name, setName] = useState("Claude Code")
  const [preset, setPreset] = useState<Preset>("assistant")
  const [ttlDays, setTtlDays] = useState("30")
  const [cap, setCap] = useState(String(AGENT_TOKEN_DEFAULT_DAILY_CREDIT_CAP))
  const [created, setCreated] = useState<{
    token: string
    mcpUrl: string
  } | null>(null)
  const scopes = AGENT_SCOPE_PRESETS[preset]

  const submit = () =>
    startTransition(async () => {
      const result = await createAgentToken({
        dailyCreditCap: Number(cap),
        name,
        scopes: [...scopes],
        ttlDays: Number(ttlDays),
      })

      if (!result.ok) {
        toast.error(result.message)
        return
      }

      setCreated({ mcpUrl: result.mcpUrl, token: result.token })
      router.refresh()
    })

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text)
    toast.success("Copié.")
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Connecter un agent</CardTitle>
        <CardDescription>
          Créez un jeton pour que votre agent (Claude Code, avec
          l&apos;extension Chrome) agisse sur votre compte : profil, offres,
          alertes, candidatures, CV et lettres.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <Field>
          <FieldLabel htmlFor="agent-token-name">Nom</FieldLabel>
          <Input
            id="agent-token-name"
            maxLength={AGENT_TOKEN_NAME_MAX_LENGTH}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="agent-token-preset">Permissions</FieldLabel>
          <Select
            value={preset}
            onValueChange={(value) => setPreset(value as Preset)}
          >
            <SelectTrigger id="agent-token-preset" className="w-full">
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
          <FieldDescription>
            {scopes.map((scope) => AGENT_SCOPE_LABELS[scope]).join(" · ")}
          </FieldDescription>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="agent-token-ttl">Valable</FieldLabel>
            <Select value={ttlDays} onValueChange={setTtlDays}>
              <SelectTrigger id="agent-token-ttl" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TTL_OPTIONS.map((days) => (
                  <SelectItem key={days} value={String(days)}>
                    {days} jours
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="agent-token-cap">
              Crédits par jour, au plus
            </FieldLabel>
            <Input
              id="agent-token-cap"
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
        </div>
        <Alert>
          <AlertTitle>Vos données vont à l&apos;agent choisi</AlertTitle>
          <AlertDescription>
            L&apos;agent lit votre profil, dont votre nom, votre e-mail et votre
            téléphone, et les transmet au service d&apos;IA qui le fait
            fonctionner. Ne partagez jamais ce jeton ; révoquez-le ici à tout
            moment.
          </AlertDescription>
        </Alert>
      </CardContent>
      <CardFooter>
        <Button onClick={submit} disabled={pending || !name.trim()}>
          {pending ? <Spinner /> : <KeyRoundIcon />}
          Créer le jeton
        </Button>
      </CardFooter>
      <Dialog
        open={created !== null}
        onOpenChange={(open) => !open && setCreated(null)}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Votre jeton</DialogTitle>
            <DialogDescription>
              Il ne sera plus jamais affiché. Lancez cette commande dans un
              terminal pour connecter Claude Code.
            </DialogDescription>
          </DialogHeader>
          {created ? (
            <div className="grid gap-3">
              <code className="block rounded-md bg-muted p-3 text-xs break-all">
                {connectCommand(created.mcpUrl, created.token)}
              </code>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() =>
                    copy(connectCommand(created.mcpUrl, created.token))
                  }
                >
                  <CopyIcon />
                  Copier la commande
                </Button>
                <Button variant="ghost" onClick={() => copy(created.token)}>
                  <CopyIcon />
                  Copier le jeton seul
                </Button>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button onClick={() => setCreated(null)}>
              J&apos;ai copié le jeton
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
