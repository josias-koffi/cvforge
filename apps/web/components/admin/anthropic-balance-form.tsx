"use client"

import type { AnthropicCreditSummary } from "@cvforge/types"
import { useState } from "react"

import { saveAnthropicBalance } from "@/app/(app)/admin/ai-models/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useActionMutation } from "@/hooks/use-action-mutation"
import { formatUsd } from "@/lib/admin-metrics/format"
import { formatDate } from "@/lib/format"

/** French keyboards type a comma; the API takes a number. */
function parseAmount(raw: string): number | null {
  const text = raw.trim().replace(",", ".")
  if (!text) return null

  const amount = Number(text)
  return Number.isFinite(amount) && amount >= 0 ? amount : null
}

export function AnthropicBalanceForm({
  credit,
}: {
  credit: AnthropicCreditSummary | null
}) {
  const [value, setValue] = useState("")
  const { pending, run } = useActionMutation(() => setValue(""))
  const amount = parseAmount(value)

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1.5">
          <Label htmlFor="anthropic-balance">Solde Claude actuel (en $)</Label>
          <Input
            className="w-40"
            id="anthropic-balance"
            inputMode="decimal"
            onChange={(event) => setValue(event.target.value)}
            placeholder="200"
            value={value}
          />
        </div>
        <Button
          disabled={pending || amount === null}
          onClick={() => amount !== null && run(() => saveAnthropicBalance(amount))}
          type="button"
        >
          Enregistrer
        </Button>
        {credit ? (
          <Button
            disabled={pending}
            onClick={() => run(() => saveAnthropicBalance(null))}
            type="button"
            variant="outline"
          >
            Retirer
          </Button>
        ) : null}
      </div>
      <p className="text-sm text-muted-foreground">
        {credit
          ? `Il reste environ ${formatUsd(credit.remainingUsd)} : ${formatUsd(credit.recordedUsd)} relevés le ${formatDate(credit.recordedAt)}, moins ${formatUsd(credit.spentUsd)} d'appels depuis.`
          : "Lisez le solde sur la console Claude et saisissez-le ici. Après une recharge, saisissez le nouveau solde."}
      </p>
    </div>
  )
}
