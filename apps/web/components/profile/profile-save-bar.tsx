"use client"

import { useEffect } from "react"
import { RotateCcwIcon, SaveIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { formatDateTime } from "@/lib/format"
import { cn } from "@/lib/utils"

/**
 * Saving is the step people miss — importing a CV or editing a tab only changes
 * the form in memory. So the control never scrolls away, and it says which of the
 * two states the profile is in instead of hiding it in a toast that has faded.
 */
export function ProfileSaveBar({
  dirty,
  lastSavedAt,
  onReset,
  onSave,
  saving,
}: {
  dirty: boolean
  lastSavedAt: string | null
  onReset: () => void
  onSave: () => void
  saving: boolean
}) {
  useEffect(() => {
    if (!dirty) return

    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [dirty])

  return (
    <div className="sticky bottom-0 z-10 -mx-1 px-1 pb-3">
      <div
        className={cn(
          "bg-card/90 shadow-surface flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border px-4 py-3 backdrop-blur",
          dirty && "border-warning/50"
        )}
      >
        <span
          aria-hidden
          className={cn(
            "size-2 shrink-0 rounded-full",
            dirty ? "bg-warning motion-safe:animate-pulse" : "bg-success"
          )}
        />
        <div className="min-w-0 flex-1" aria-live="polite">
          <p className="text-sm font-medium">
            {dirty ? "Modifications non enregistrées" : "Profil enregistré"}
          </p>
          <p className="text-muted-foreground truncate text-xs">
            {dirty
              ? "Relisez les champs, puis enregistrez pour les conserver."
              : `Dernier enregistrement : ${formatDateTime(lastSavedAt)}`}
          </p>
        </div>
        {dirty ? (
          <Button type="button" variant="ghost" disabled={saving} onClick={onReset}>
            <RotateCcwIcon />
            Annuler
          </Button>
        ) : null}
        <Button type="button" disabled={saving || !dirty} onClick={onSave}>
          {saving ? <Spinner /> : <SaveIcon />}
          Enregistrer
        </Button>
      </div>
    </div>
  )
}
