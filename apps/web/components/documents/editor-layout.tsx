"use client"

import Link from "next/link"
import type { DocumentVersionSource } from "@cvforge/types"
import { DownloadIcon, HistoryIcon, SaveIcon } from "lucide-react"

import { DocumentPreview } from "@/components/documents/document-preview"
import type { AtsScoreSummary } from "@cvforge/types"

import { AtsScoreBadge } from "@/components/applications/ats-score-badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Spinner } from "@/components/ui/spinner"
import { formatDateTime } from "@/lib/format"

const versionSourceLabels: Record<DocumentVersionSource, string> = {
  generation: "IA",
  manual_save: "Manuel",
  translation: "Traduction",
}

export type VersionEntry<T> = {
  content: T
  createdAt: string
  id: string
  source: DocumentVersionSource
  versionNumber: number
}

type EditorLayoutProps<T> = {
  children: React.ReactNode
  dirty: boolean
  documentKind: "cv" | "letter"
  offerId: string
  onRestore: (content: T) => void
  onSave: () => void
  previewHtml: string
  saving: boolean
  /** The ATS score of the last saved version; absent on letters and unscored CVs. */
  score?: AtsScoreSummary | null
  toolbar?: React.ReactNode
  versions: VersionEntry<T>[]
}

export function EditorLayout<T>({
  children,
  dirty,
  documentKind,
  offerId,
  onRestore,
  onSave,
  previewHtml,
  saving,
  score,
  toolbar,
  versions,
}: EditorLayoutProps<T>) {
  const exportHref = (format: "pdf" | "docx") =>
    `/candidatures/${offerId}/export?document=${documentKind}&format=${format}`

  return (
    <div className="flex flex-col gap-4 px-4 lg:px-6">
      <div className="sticky top-0 z-20 -mx-4 flex flex-wrap items-center gap-2 border-b bg-background/95 px-4 py-2 backdrop-blur lg:-mx-6 lg:px-6">
        <Button onClick={onSave} disabled={saving || !dirty}>
          {saving ? <Spinner /> : <SaveIcon />}
          {saving ? "Enregistrement…" : "Enregistrer"}
        </Button>
        <span className="text-sm text-muted-foreground">
          {dirty ? "Modifications non enregistrées" : "À jour"}
        </span>
        {/* Describes the last saved version, so it is dimmed and says so while
            edits are pending rather than looking like it scores the screen. */}
        <AtsScoreBadge score={score} stale={dirty} />
        <div className="ml-auto flex flex-wrap gap-2">
          {toolbar}
          {versions.length > 0 ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <HistoryIcon />
                  Versions ({versions.length})
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>Restaurer dans l&apos;éditeur</DropdownMenuLabel>
                {[...versions].reverse().map((version) => (
                  <DropdownMenuItem key={version.id} onSelect={() => onRestore(version.content)}>
                    <span className="font-medium">v{version.versionNumber}</span>
                    <span className="text-muted-foreground">
                      {versionSourceLabels[version.source]} ·{" "}
                      {formatDateTime(version.createdAt)}
                    </span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
          <Button asChild variant="outline" className={dirty ? "pointer-events-none opacity-50" : undefined}>
            <a href={dirty ? undefined : exportHref("pdf")} aria-disabled={dirty}>
              <DownloadIcon />
              PDF
            </a>
          </Button>
          <Button asChild variant="outline" className={dirty ? "pointer-events-none opacity-50" : undefined}>
            <a href={dirty ? undefined : exportHref("docx")} aria-disabled={dirty}>
              <DownloadIcon />
              DOCX
            </a>
          </Button>
          <Button asChild variant="ghost">
            <Link href={`/candidatures/${offerId}`}>Retour à la candidature</Link>
          </Button>
        </div>
      </div>
      {dirty ? (
        <p className="text-xs text-muted-foreground">
          Enregistrez pour exporter la version affichée.
        </p>
      ) : null}
      <div className="grid items-start gap-6 @5xl/main:grid-cols-2">
        <div className="@container/editor flex min-w-0 flex-col gap-4">{children}</div>
        <div className="@5xl/main:sticky @5xl/main:top-16">
          <DocumentPreview html={previewHtml} title="Aperçu du document" />
        </div>
      </div>
    </div>
  )
}
