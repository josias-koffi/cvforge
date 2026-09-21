import {
  estimateApplications,
  type ApplicationsKpiSummary,
  type InterviewProgressSummary,
} from "@cvforge/types"
import {
  BriefcaseBusinessIcon,
  CalendarCheckIcon,
  CoinsIcon,
  MicIcon,
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
import { formatApplications } from "@/lib/format"
import { formatDelta } from "@/lib/interview/labels"

type SectionCardsProps = {
  balance: number | null
  /** Null when the interview history could not be read; the card says so. */
  interviews: InterviewProgressSummary | null
  summary: ApplicationsKpiSummary
}

/** The interview average, or a nudge when there is nothing to average yet. */
function interviewCard(interviews: InterviewProgressSummary | null) {
  const score = interviews?.overallScoreAverage ?? null

  return {
    description: "Score d'entretien",
    footer:
      score === null
        ? "Aucun entretien terminé"
        : `${formatDelta(interviews?.overallScoreDelta ?? 0)} depuis la première session`,
    hint:
      score === null
        ? "Entraînez-vous avant le vrai"
        : `Moyenne sur ${interviews?.sessionCount} session${(interviews?.sessionCount ?? 0) > 1 ? "s" : ""}`,
    icon: MicIcon,
    tone: "bg-info/12 text-info",
    value: score === null ? "—" : `${score}/10`,
  }
}

export function SectionCards({
  balance,
  interviews,
  summary,
}: SectionCardsProps) {
  const counts = summary.statusCounts
  const cards = [
    {
      description: "Candidatures suivies",
      footer: `${counts.draft} en brouillon`,
      hint: "Toutes vos candidatures",
      icon: BriefcaseBusinessIcon,
      tone: "bg-primary/10 text-primary",
      value: summary.totalCount,
    },
    {
      description: "Candidatures envoyées",
      footer: `${counts.sent} en attente de réponse`,
      hint: "Hors brouillons",
      icon: SendIcon,
      tone: "bg-info/12 text-info",
      value: summary.totalCount - counts.draft,
    },
    {
      description: "Taux de réponse",
      footer: `${summary.respondedCount} réponse${summary.respondedCount > 1 ? "s" : ""} reçue${summary.respondedCount > 1 ? "s" : ""}`,
      hint: `${counts.interview_scheduled} entretien(s), ${counts.offer_received} offre(s)`,
      icon: CalendarCheckIcon,
      tone: "bg-success/12 text-success",
      value: `${summary.responseRate} %`,
    },
    {
      description: "Crédits",
      footer: "Solde disponible",
      hint:
        balance === null
          ? "Analyse, CV, lettre et entretien simulé"
          : `≈ ${formatApplications(estimateApplications(balance))}`,
      icon: CoinsIcon,
      tone: "bg-spark/20 text-spark-foreground dark:text-spark",
      value: balance ?? "—",
    },
    interviewCard(interviews),
  ]

  return (
    <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-3 @7xl/main:grid-cols-5">
      {cards.map((card, index) => (
        <Card
          key={card.description}
          className="@container/card rise-in transition-[box-shadow,transform] duration-200 ease-spark hover:-translate-y-0.5 hover:shadow-raised"
          style={{ "--stagger": index } as React.CSSProperties}
        >
          <CardHeader>
            <CardDescription>{card.description}</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {card.value}
            </CardTitle>
            <CardAction>
              <span className={`flex size-9 items-center justify-center rounded-lg ${card.tone}`}>
                <card.icon className="size-5" strokeWidth={1.75} />
              </span>
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
