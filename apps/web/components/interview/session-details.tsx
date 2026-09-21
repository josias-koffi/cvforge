import type { InterviewSessionSummary } from "@cvforge/types"
import {
  CalendarIcon,
  GaugeIcon,
  MessagesSquareIcon,
  UserRoundIcon,
} from "lucide-react"

import { StatStrip } from "@/components/interview/stat-strip"
import { TranscriptThread } from "@/components/interview/transcript-thread"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { formatDate } from "@/lib/format"
import { profileLabels } from "@/lib/interview/labels"

/**
 * A finished session, read back.
 *
 * This is where the transcript lives: it is the whole record of what was
 * said, which is worth a page of its own and was only ever making the report
 * long. The report keeps the verdict.
 */
export function SessionDetails({
  session,
}: {
  session: InterviewSessionSummary
}) {
  const answers = session.messages.filter(
    (message) => message.role === "user"
  ).length

  return (
    <>
      <StatStrip
        className="px-4 lg:px-6"
        items={[
          {
            hint: "Ton du recruteur",
            icon: UserRoundIcon,
            label: "Profil",
            tone: "bg-primary/10 text-primary",
            value: profileLabels[session.profile],
          },
          {
            hint: `${session.durationMinutes} minutes prévues`,
            icon: CalendarIcon,
            label: "Date",
            tone: "bg-info/12 text-info",
            value: formatDate(session.completedAt ?? session.createdAt),
          },
          {
            hint: "Prises de parole",
            icon: MessagesSquareIcon,
            label: "Réponses",
            tone: "bg-spark/20 text-spark-foreground dark:text-spark",
            value: answers,
          },
          {
            hint: "Détail dans le rapport",
            icon: GaugeIcon,
            label: "Score global",
            tone: "bg-success/12 text-success",
            value: session.report ? (
              <>
                {session.report.overallScore}
                <span className="text-base text-muted-foreground">/10</span>
              </>
            ) : (
              "—"
            ),
          },
        ]}
      />

      <div className="px-4 lg:px-6">
        <Card>
          <CardHeader>
            <CardTitle>Transcription</CardTitle>
            <CardDescription>
              Ce qui a été dit, dans l&apos;ordre. L&apos;audio n&apos;est
              jamais conservé.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {session.messages.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucun échange enregistré.
              </p>
            ) : (
              <div className="flex max-h-[32rem] flex-col gap-4 overflow-y-auto pr-1">
                <TranscriptThread messages={session.messages} showTimestamps />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
