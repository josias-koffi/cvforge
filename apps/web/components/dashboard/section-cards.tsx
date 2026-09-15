import type { ApplicationsKpiSummary } from "@cvforge/types"
import {
  BriefcaseBusinessIcon,
  CalendarCheckIcon,
  CoinsIcon,
  SendIcon,
} from "lucide-react"

import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type SectionCardsProps = {
  balance: number | null
  summary: ApplicationsKpiSummary
}

export function SectionCards({ balance, summary }: SectionCardsProps) {
  const counts = summary.statusCounts
  const cards = [
    {
      description: "Offres suivies",
      footer: `${counts.draft} en brouillon`,
      hint: "Toutes les offres importées",
      icon: BriefcaseBusinessIcon,
      value: summary.totalCount,
    },
    {
      description: "Candidatures envoyées",
      footer: `${counts.sent} en attente de réponse`,
      hint: "Hors brouillons",
      icon: SendIcon,
      value: summary.totalCount - counts.draft,
    },
    {
      description: "Taux de réponse",
      footer: `${summary.respondedCount} réponse${summary.respondedCount > 1 ? "s" : ""} reçue${summary.respondedCount > 1 ? "s" : ""}`,
      hint: `${counts.interview_scheduled} entretien(s), ${counts.offer_received} offre(s)`,
      icon: CalendarCheckIcon,
      value: `${summary.responseRate} %`,
    },
    {
      description: "Crédits IA",
      footer: "Solde disponible",
      hint: "1 crédit par extraction, 3 par document",
      icon: CoinsIcon,
      value: balance ?? "—",
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4 dark:*:data-[slot=card]:bg-card">
      {cards.map((card) => (
        <Card key={card.description} className="@container/card">
          <CardHeader>
            <CardDescription>{card.description}</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {card.value}
            </CardTitle>
            <CardAction>
              <card.icon className="size-5 text-muted-foreground" />
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 font-medium">{card.footer}</div>
            <div className="text-muted-foreground">{card.hint}</div>
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}
