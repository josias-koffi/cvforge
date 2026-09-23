import type { Metadata } from "next"
import {
  AI_CREDIT_COSTS,
  CREDITS_PER_INTERVIEW_MINUTE,
  estimateApplications,
  type CreditLedgerEntry,
  type CreditLedgerSummary,
  type CreditOrder,
  type PublicCreditOffer,
} from "@cvforge/types"
import { CoinsIcon } from "lucide-react"

import { BillingReturn } from "@/components/credits/billing-return"
import { CreditOfferCard } from "@/components/credits/credit-offer-card"
import { PurchaseUnavailableBanner } from "@/components/credits/purchase-unavailable-banner"
import { PurchasesTable } from "@/components/credits/purchases-table"
import { TableFrame } from "@/components/data-table/table-frame"
import { PageHeader } from "@/components/layout/page-header"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { api } from "@/lib/api"
import type { PurchaseAvailability } from "@/lib/billing"
import { formatApplications, formatCredits, formatDateTime } from "@/lib/format"

export const metadata: Metadata = { title: "Crédits" }

const actionLabels: Record<CreditLedgerEntry["action"], string> = {
  admin_grant: "Crédits offerts",
  cv_generation: "Génération de CV",
  cv_import: "Import de CV",
  interview_session: "Entretien simulé",
  job_digest_rerank: "Classement IA des offres du jour",
  letter_generation: "Génération de lettre",
  offer_enrichment: "Analyse d'offre",
  stripe_purchase: "Achat de crédits",
  welcome_grant: "Crédits de bienvenue",
}

export default async function CreditsPage() {
  const [{ credits }, { offers }, { orders }, availability] = await Promise.all([
    api<{ credits: CreditLedgerSummary }>("/credits/me"),
    api<{ offers: PublicCreditOffer[] }>("/public/credit-offers"),
    api<{ orders: CreditOrder[] }>("/billing/orders/me"),
    api<PurchaseAvailability>("/billing/purchase-availability"),
  ])
  const remainingApplications = estimateApplications(credits.balance)

  return (
    <>
      <BillingReturn />
      <PageHeader
        title="Crédits"
        description="Chaque génération consomme des crédits. Rechargez quand vous voulez, sans abonnement."
      />
      <PurchaseUnavailableBanner availability={availability} />
      <div className="grid gap-4 px-4 lg:px-6 @3xl/main:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Solde actuel</CardDescription>
            <CardTitle className="flex items-center gap-2 text-3xl tabular-nums">
              <span className="flex size-9 items-center justify-center rounded-lg bg-spark/20 text-spark-foreground dark:text-spark">
                <CoinsIcon className="size-5" strokeWidth={1.75} />
              </span>
              {credits.balance}
              {credits.isLowBalance ? <Badge variant="warning">Solde faible</Badge> : null}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              ≈ {formatApplications(remainingApplications)} restante
              {remainingApplications > 1 ? "s" : ""}
            </p>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>Analyse d&apos;offre : {formatCredits(AI_CREDIT_COSTS.offer_enrichment)}</li>
              <li>Import de CV : {formatCredits(AI_CREDIT_COSTS.cv_import)}</li>
              <li>
                Entretien simulé et rapport :{" "}
                {formatCredits(CREDITS_PER_INTERVIEW_MINUTE)} par minute
              </li>
              <li>CV généré : {formatCredits(AI_CREDIT_COSTS.cv_generation)}</li>
              <li>Lettre générée : {formatCredits(AI_CREDIT_COSTS.letter_generation)}</li>
            </ul>
          </CardContent>
        </Card>
        {offers.map((offer) => (
          <CreditOfferCard
            key={offer.id}
            offer={offer}
            purchasable={availability.available}
          />
        ))}
      </div>
      <section className="flex flex-col gap-3 px-4 lg:px-6">
        <h2 className="text-lg font-semibold">Achats</h2>
        <PurchasesTable orders={orders} />
      </section>
      <section className="flex flex-col gap-3 px-4 lg:px-6">
        <h2 className="text-lg font-semibold">Historique des crédits</h2>
        <TableFrame>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Opération</TableHead>
              <TableHead>Note</TableHead>
              <TableHead className="text-right">Montant</TableHead>
              <TableHead className="text-right">Solde</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {credits.history.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-20 text-center text-muted-foreground">
                  Aucune opération.
                </TableCell>
              </TableRow>
            ) : (
              credits.history.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="text-muted-foreground tabular-nums">
                    {formatDateTime(entry.createdAt)}
                  </TableCell>
                  <TableCell>{actionLabels[entry.action] ?? entry.action}</TableCell>
                  <TableCell className="max-w-64 truncate text-muted-foreground">
                    {entry.note ?? "—"}
                  </TableCell>
                  <TableCell
                    className={`text-right tabular-nums ${entry.amount > 0 ? "text-success" : ""}`}
                  >
                    {entry.amount > 0 ? `+${entry.amount}` : entry.amount}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{entry.balanceAfter}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </TableFrame>
      </section>
    </>
  )
}
