"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { KeyRoundIcon, PlusIcon } from "lucide-react"
import { toast } from "sonner"
import {
  AGENT_SCOPE_LABELS,
  AGENT_SCOPE_PRESETS,
  AGENT_TOKEN_DEFAULT_DAILY_CREDIT_CAP,
  AGENT_TOKEN_MAX_DAILY_CREDIT_CAP,
  AGENT_TOKEN_NAME_MAX_LENGTH,
} from "@cvforge/types"

import { createAgentToken } from "@/app/(app)/compte/agents/actions"
import { CopyButton } from "@/components/account/agents/copy-button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
const DEFAULT_NAME = "Claude Code"

type CreatedToken = { token: string; mcpUrl: string }

function connectCommand({ mcpUrl, token }: CreatedToken) {
  return `claude mcp add --transport http jobspark ${mcpUrl} --header "Authorization: Bearer ${token}"`
}

/**
 * "Connecter un agent": the form in a modal, which then shows the token — the
 * only time it is ever shown. Closing the modal forgets it.
 */
export function CreateAgentTokenDialog() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [name, setName] = useState(DEFAULT_NAME)
  const [preset, setPreset] = useState<Preset>("assistant")
  const [ttlDays, setTtlDays] = useState("30")
  const [cap, setCap] = useState(String(AGENT_TOKEN_DEFAULT_DAILY_CREDIT_CAP))
  const [created, setCreated] = useState<CreatedToken | null>(null)
  const scopes = AGENT_SCOPE_PRESETS[preset]

  const changeOpen = (next: boolean) => {
    setOpen(next)
    if (!next) {
      setCreated(null)
      setName(DEFAULT_NAME)
    }
  }

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

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusIcon />
          Connecter un agent
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        {created ? (
          <>
            <DialogHeader>
              <DialogTitle>Votre jeton</DialogTitle>
              <DialogDescription>
                Il ne sera plus jamais affiché. Lancez cette commande dans un
                terminal pour connecter Claude Code.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3">
              <code className="block rounded-md bg-muted p-3 text-xs break-all">
                {connectCommand(created)}
              </code>
              <div className="flex flex-wrap gap-2">
                <CopyButton value={connectCommand(created)}>
                  Copier la commande
                </CopyButton>
                <CopyButton variant="ghost" value={created.token}>
                  Copier le jeton seul
                </CopyButton>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => changeOpen(false)}>
                J&apos;ai copié le jeton
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Connecter un agent</DialogTitle>
              <DialogDescription>
                Créez un jeton pour que votre agent (Claude Code, avec
                l&apos;extension Chrome) agisse sur votre compte : profil,
                offres, alertes, candidatures, CV et lettres.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4">
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
                <FieldLabel htmlFor="agent-token-preset">
                  Permissions
                </FieldLabel>
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
                  L&apos;agent lit votre profil, dont votre nom, votre e-mail et
                  votre téléphone, et les transmet au service d&apos;IA qui le
                  fait fonctionner. Ne partagez jamais ce jeton ; révoquez-le
                  dans l&apos;onglet Jetons à tout moment.
                </AlertDescription>
              </Alert>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => changeOpen(false)}>
                Annuler
              </Button>
              <Button onClick={submit} disabled={pending || !name.trim()}>
                {pending ? <Spinner /> : <KeyRoundIcon />}
                Créer le jeton
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
