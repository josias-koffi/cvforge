"use client"

import { useId, useState, type DragEvent } from "react"
import { CircleCheckIcon, FileTextIcon, FileUpIcon, XIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { LandingDictionary } from "@/content/types"
import { CV_ACCEPT, cvRejectionReason } from "@/lib/ats-client"
import { cn } from "@/lib/utils"

type Rejection = NonNullable<ReturnType<typeof cvRejectionReason>>

/**
 * Where the CV goes in: drop it, or click anywhere to browse.
 *
 * The whole zone is the input's label, so a click, a tap or Enter on the
 * focused input all open the file picker without any extra wiring. A refused
 * file shakes the zone; the reason itself is announced by the caller.
 */
export function CvDropZone({
  dictionary,
  file,
  locale,
  disabled,
  onFile,
  onReject,
}: {
  dictionary: LandingDictionary["ats"]["upload"]
  file: File | null
  locale: string
  disabled: boolean
  onFile: (file: File | null) => void
  onReject: (reason: Rejection) => void
}) {
  const [dragging, setDragging] = useState(false)
  const [shaking, setShaking] = useState(false)
  const inputId = useId()
  const hintId = useId()

  function pick(candidate: File | null | undefined) {
    if (!candidate || disabled) return

    const rejection = cvRejectionReason(candidate)

    if (rejection) {
      setShaking(true)
      onReject(rejection)
      return
    }

    onFile(candidate)
  }

  function leave(event: DragEvent<HTMLDivElement>) {
    // Moving over a child fires dragleave on the parent: only a real exit counts.
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setDragging(false)
    }
  }

  return (
    <div
      className={cn("mt-4", shaking && "animate-shake")}
      data-dragging={dragging || undefined}
      onAnimationEnd={() => setShaking(false)}
      onDragLeave={leave}
      onDragOver={(event) => {
        event.preventDefault()
        if (!disabled) setDragging(true)
      }}
      onDrop={(event) => {
        event.preventDefault()
        setDragging(false)
        pick(event.dataTransfer.files?.[0])
      }}
    >
      <input
        accept={CV_ACCEPT}
        aria-describedby={hintId}
        aria-label={dictionary.label}
        className="peer sr-only"
        disabled={disabled}
        id={inputId}
        onChange={(event) => {
          pick(event.target.files?.[0])
          // Cleared so picking the same file again, after a restart, still fires.
          event.target.value = ""
        }}
        type="file"
      />

      {file ? (
        <div
          className={cn(
            "flex animate-rise-in items-center gap-3 rounded-xl border bg-background p-4 transition-colors",
            dragging && "border-primary bg-primary/5"
          )}
        >
          <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FileTextIcon className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{file.name}</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>{formatSize(file.size, locale)}</span>
              <span aria-hidden="true">·</span>
              <CircleCheckIcon className="size-3.5 text-success" />
              <span>{dictionary.ready}</span>
            </p>
          </div>
          <Button
            aria-label={dictionary.remove}
            disabled={disabled}
            onClick={() => onFile(null)}
            size="icon"
            type="button"
            variant="ghost"
          >
            <XIcon />
          </Button>
        </div>
      ) : (
        <label
          className={cn(
            "group flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed bg-background px-6 py-10 text-center transition-all duration-200 ease-spark",
            "hover:border-primary/50 hover:bg-primary/[0.03]",
            "peer-focus-visible:border-primary peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50",
            dragging && "scale-[1.01] border-primary bg-primary/5"
          )}
          htmlFor={inputId}
        >
          <span
            className={cn(
              "mb-2 flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-transform duration-200 ease-spark",
              "group-hover:-translate-y-0.5",
              dragging ? "scale-110" : "motion-safe:animate-float"
            )}
          >
            {dragging ? (
              <FileUpIcon className="size-8" />
            ) : (
              <FileTextIcon className="size-8" />
            )}
          </span>
          <span className="text-base font-medium">
            {dragging ? dictionary.dropActive : dictionary.dropTitle}
          </span>
          {dragging ? null : (
            <span className="text-sm text-primary underline underline-offset-4 group-hover:no-underline">
              {dictionary.browse}
            </span>
          )}
          <span className="mt-1 text-xs text-muted-foreground" id={hintId}>
            {dictionary.hint}
          </span>
        </label>
      )}
    </div>
  )
}

/** "240 ko" / "1,2 Mo" in French, "240 kB" / "1.2 MB" in English. */
export function formatSize(bytes: number, locale: string) {
  const megabytes = bytes / (1024 * 1024)
  const [value, unit] =
    megabytes >= 1 ? [megabytes, "megabyte"] : [bytes / 1024, "kilobyte"]

  return new Intl.NumberFormat(locale, {
    style: "unit",
    unit,
    unitDisplay: "short",
    maximumFractionDigits: megabytes >= 1 ? 1 : 0,
  }).format(Math.max(value, 1))
}
