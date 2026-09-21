"use client"

import { useRef, useState, useTransition } from "react"
import {
  CircleCheckIcon,
  FileTextIcon,
  TriangleAlertIcon,
  UploadIcon,
  XIcon,
} from "lucide-react"
import { toast } from "sonner"

import { importCvFile } from "@/app/(app)/profile/actions"
import { PendingContent, sparkClassName } from "@/components/feedback/pending-content"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { CV_ACCEPT, cvRejectionReason } from "@/lib/cv-upload"
import { creditCostLabel, formatFileSize } from "@/lib/format"
import { applyImportedCv, type BaseProfile } from "@/lib/profile-model"
import { cn } from "@/lib/utils"

type Analysis = { filename: string; limits: string[] }

/**
 * Entry point of the page: drop or pick a CV, see it sitting there, then analyse it.
 * The analysis only fills the form in memory, so the last state says so out loud —
 * the save bar is what actually persists it.
 */
export function CvDropzone({
  compact,
  onImported,
}: {
  /** Slimmer zone once the profile already holds something: importing is no longer the first move. */
  compact: boolean
  onImported: (update: (profile: BaseProfile) => BaseProfile) => void
}) {
  const [pending, startTransition] = useTransition()
  const [file, setFile] = useState<File | null>(null)
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const pick = (candidate: File | null | undefined) => {
    if (!candidate) return

    const reason = cvRejectionReason(candidate)

    if (reason) {
      toast.error(reason)
      return
    }

    setAnalysis(null)
    setFile(candidate)
  }

  const clear = () => {
    setFile(null)
    if (inputRef.current) inputRef.current.value = ""
  }

  const analyse = () => {
    if (!file) return

    startTransition(async () => {
      const formData = new FormData()
      formData.set("cvFile", file, file.name)
      const response = await importCvFile(formData)

      if (!response.ok) {
        toast.error(response.message)
        return
      }

      onImported((profile) => applyImportedCv(profile, response.result.extractedProfile))
      setAnalysis({ filename: file.name, limits: response.result.qualityLimits })
      clear()
      toast.success("CV lu : vérifiez les champs puis enregistrez.", { className: "spark" })
    })
  }

  return (
    <Card
      data-dragging={dragging || undefined}
      className={cn(
        "border-dashed transition-colors data-dragging:border-primary data-dragging:bg-primary/5",
        analysis && !file && "border-success/50 border-solid"
      )}
      onDragOver={(event) => {
        event.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault()
        setDragging(false)
        pick(event.dataTransfer.files?.[0])
      }}
    >
      <CardContent>
        <input
          ref={inputRef}
          type="file"
          accept={CV_ACCEPT}
          className="sr-only"
          aria-label="Fichier CV"
          onChange={(event) => pick(event.target.files?.[0])}
        />
        {file ? (
          <div className="flex flex-wrap items-center gap-3">
            <FileTextIcon className="text-primary size-5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{file.name}</p>
              <p className="text-muted-foreground text-xs">
                {formatFileSize(file.size)} · prêt à être analysé · {creditCostLabel("cv_import")}
              </p>
            </div>
            <Button
              type="button"
              variant="spark"
              className={sparkClassName(pending)}
              disabled={pending}
              onClick={analyse}
            >
              <PendingContent pending={pending} pendingLabel="Analyse en cours…" spark>
                <UploadIcon />
                Analyser mon CV
              </PendingContent>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Retirer le fichier"
              disabled={pending}
              onClick={clear}
            >
              <XIcon />
            </Button>
          </div>
        ) : analysis ? (
          <div className="flex flex-wrap items-center gap-3">
            <CircleCheckIcon className="text-success size-5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {analysis.filename} analysé — champs remplis ci-dessous
              </p>
              <p className="text-warning flex items-center gap-1.5 text-xs">
                <TriangleAlertIcon className="size-3.5 shrink-0" />
                Rien n&apos;est encore enregistré : relisez puis enregistrez.
              </p>
              {analysis.limits.length > 0 ? (
                <ul className="text-muted-foreground mt-1 list-inside list-disc text-xs">
                  {analysis.limits.map((limit) => (
                    <li key={limit}>{limit}</li>
                  ))}
                </ul>
              ) : null}
            </div>
            <Button type="button" variant="outline" onClick={() => inputRef.current?.click()}>
              <UploadIcon />
              Analyser un autre CV
            </Button>
          </div>
        ) : (
          <button
            type="button"
            className={cn(
              "flex w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-md text-center outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
              compact ? "py-2" : "py-8"
            )}
            onClick={() => inputRef.current?.click()}
          >
            <UploadIcon
              className={cn("text-muted-foreground", compact ? "size-5" : "mb-1 size-7")}
            />
            <span className="text-sm font-medium">
              Déposez votre CV ici ou <span className="text-primary underline">parcourir</span>
            </span>
            <span className="text-muted-foreground text-xs">
              PDF ou DOCX · 5 Mo max. · {creditCostLabel("cv_import")} · le profil se remplit tout
              seul
            </span>
          </button>
        )}
      </CardContent>
    </Card>
  )
}
