"use client"

import { useState } from "react"
import { BanIcon } from "lucide-react"
import type { AgentToolCall, AgentTokenSummary } from "@cvforge/types"

import { revokeAgentToken } from "@/app/(app)/compte/agents/actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useActionMutation } from "@/hooks/use-action-mutation"
import { formatDate, formatDateTime } from "@/lib/format"

const STATUS_BADGES = {
  active: { label: "Actif", variant: "success" },
  expired: { label: "Expiré", variant: "secondary" },
  revoked: { label: "Révoqué", variant: "secondary" },
} as const

export function AgentTokensList({ tokens }: { tokens: AgentTokenSummary[] }) {
  const [revoking, setRevoking] = useState<string | null>(null)
  const { pending, run } = useActionMutation(() => setRevoking(null))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Jetons</CardTitle>
        <CardDescription>
          Un jeton révoqué ou expiré ne donne plus aucun accès. « Me déconnecter
          partout » les coupe aussi.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {tokens.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucun agent connecté. Créez un jeton avec « Connecter un agent ».
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>État</TableHead>
                <TableHead>Crédits aujourd&apos;hui</TableHead>
                <TableHead>Dernier usage</TableHead>
                <TableHead>Expire le</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {tokens.map((token) => {
                const state = STATUS_BADGES[token.status]
                return (
                  <TableRow key={token.id}>
                    <TableCell>
                      <div className="font-medium">{token.name}</div>
                      <div className="text-xs text-muted-foreground">
                        jsk_…{token.lastFour}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={state.variant}>{state.label}</Badge>
                    </TableCell>
                    <TableCell>
                      {token.creditsSpentToday} / {token.dailyCreditCap}
                    </TableCell>
                    <TableCell>{formatDateTime(token.lastUsedAt)}</TableCell>
                    <TableCell>{formatDate(token.expiresAt)}</TableCell>
                    <TableCell className="text-right">
                      {token.status === "active" ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={pending && revoking === token.id}
                          onClick={() => {
                            setRevoking(token.id)
                            run(() => revokeAgentToken(token.id))
                          }}
                        >
                          <BanIcon />
                          Révoquer
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

const OUTCOME_LABELS: Record<AgentToolCall["outcome"], string> = {
  denied: "Refusé (plafond)",
  error: "Erreur",
  ok: "Réussi",
}

export function AgentActivityCard({ calls }: { calls: AgentToolCall[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Activité récente</CardTitle>
        <CardDescription>
          Les 50 dernières actions de vos agents. Seule l&apos;action est
          enregistrée, jamais son contenu ; le journal est effacé après 90
          jours.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {calls.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucune action pour l&apos;instant.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Résultat</TableHead>
                <TableHead className="text-right">Crédits</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {calls.map((call) => (
                <TableRow key={call.id}>
                  <TableCell>{formatDateTime(call.createdAt)}</TableCell>
                  <TableCell>{call.tokenName}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {call.tool}
                  </TableCell>
                  <TableCell>{OUTCOME_LABELS[call.outcome]}</TableCell>
                  <TableCell className="text-right">
                    {call.creditsSpent || "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
