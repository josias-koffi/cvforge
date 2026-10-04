import Link from "next/link"
import type { DraftApplication } from "@cvforge/types"
import { ArchiveIcon, DownloadIcon } from "lucide-react"

import { keepApplication } from "@/app/(app)/candidatures/actions"
import { ActionButton } from "@/components/feedback/action-button"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { formatDate } from "@/lib/format"

/**
 * The applications untouched for a year, about to be deleted (US-170): keep
 * them, or open them to download their documents first. Shown whatever the
 * e-mail preference, since the deletion happens either way.
 */
export function ExpiringApplications({
  applications,
}: {
  applications: DraftApplication[]
}) {
  const expiring = applications
    .filter((application) => application.deletionScheduledAt)
    .sort((left, right) =>
      (left.deletionScheduledAt ?? "").localeCompare(
        right.deletionScheduledAt ?? ""
      )
    )

  if (expiring.length === 0) return null

  return (
    <Card className="border-amber-500/40">
      <CardHeader>
        <CardTitle>
          {expiring.length > 1
            ? `${expiring.length} candidatures vont être supprimées`
            : "Une candidature va être supprimée"}
        </CardTitle>
        <CardDescription>
          Sans modification depuis un an, elles sont supprimées avec leurs CV,
          lettres et entretiens. « Garder » repousse la suppression d&apos;un an
          ; toute autre modification aussi.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="divide-y">
          {expiring.map((application) => (
            <li
              key={application.id}
              className="flex flex-wrap items-center justify-between gap-3 py-3"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">
                  {application.extracted.title}
                  {application.extracted.companyName
                    ? ` — ${application.extracted.companyName}`
                    : ""}
                </p>
                <p className="text-sm text-muted-foreground">
                  Supprimée le {formatDate(application.deletionScheduledAt)}
                </p>
              </div>
              <div className="flex gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link href={`/candidatures/${application.id}`}>
                    <DownloadIcon />
                    Ouvrir pour télécharger
                  </Link>
                </Button>
                <ActionButton
                  size="sm"
                  action={keepApplication.bind(null, application.id)}
                >
                  <ArchiveIcon />
                  Garder
                </ActionButton>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
