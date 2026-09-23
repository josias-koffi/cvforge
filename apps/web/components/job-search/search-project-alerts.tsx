"use client"

import type { SearchProject } from "@cvforge/types"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"

type AlertKey = "digestEnabled" | "emailEnabled" | "aiRerankEnabled"

/** The morning selection: whether it comes, by e-mail, and ranked by the AI. */
export function SearchProjectAlerts({
  project,
  onChange,
}: {
  project: SearchProject
  onChange: (key: AlertKey, value: boolean) => void
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Vos offres du jour</CardTitle>
        <CardDescription>
          Une sélection chaque matin, d&apos;après tout ce qui précède.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <label className="flex items-center gap-3 text-sm">
          <Switch
            checked={project.digestEnabled}
            onCheckedChange={(checked) => onChange("digestEnabled", checked)}
          />
          Me proposer des offres chaque matin
        </label>
        <label className="flex items-center gap-3 text-sm">
          <Switch
            checked={project.emailEnabled}
            disabled={!project.digestEnabled}
            onCheckedChange={(checked) => onChange("emailEnabled", checked)}
          />
          Recevoir la sélection par e-mail
        </label>
        <label className="flex items-start gap-3 text-sm">
          <Switch
            className="mt-0.5"
            checked={project.aiRerankEnabled}
            disabled={!project.digestEnabled}
            onCheckedChange={(checked) => onChange("aiRerankEnabled", checked)}
          />
          <span className="block">
            Classement par l&apos;IA, avec une phrase par offre expliquant
            pourquoi elle vous correspond
            <span className="block text-xs text-muted-foreground">
              1 crédit par sélection, débité seulement si le classement aboutit.
            </span>
          </span>
        </label>
      </CardContent>
    </Card>
  )
}
