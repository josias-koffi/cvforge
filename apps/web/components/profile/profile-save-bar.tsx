"use client"

import { RotateCcwIcon, SaveIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { formatDateTime } from "@/lib/format"
import { cn } from "@/lib/utils"

/**
 * Saving is the step people miss — importing a CV or editing a tab only changes
 * the form in memory. So the control never scrolls away, and it says which of the
 * two states the profile is in instead of hiding it in a toast that has faded.
 * Below the cards on a large screen, where only they scroll; stuck to the
 * bottom of the page on a small one.
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
  // Never saved: a new profile, which only exists once saved, as is or not.
  const unsaved = lastSavedAt === null

  return (
    <div className="sticky bottom-0 z-10 -mx-1 px-1 pb-3 lg:static lg:pb-0">
      <div
        className={cn(
          "flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border bg-card/90 px-4 py-3 shadow-surface backdrop-blur",
          dirty && "border-warning/50"
        )}
      >
        <span
          aria-hidden
          className={cn(
            "size-2 shrink-0 rounded-full",
            dirty
              ? "bg-warning motion-safe:animate-pulse"
              : unsaved
                ? "bg-muted-foreground"
                : "bg-success"
          )}
        />
        <div className="min-w-0 flex-1" aria-live="polite">
          <p className="text-sm font-medium">
            {dirty
              ? "Modifications non enregistrées"
              : unsaved
                ? "Pas encore enregistré"
                : "Profil enregistré"}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {dirty
              ? "Relisez les champs, puis enregistrez pour les conserver."
              : unsaved
                ? "Enregistrez pour créer le profil."
                : `Dernier enregistrement : ${formatDateTime(lastSavedAt)}`}
          </p>
        </div>
        {dirty ? (
          <Button
            type="button"
            variant="ghost"
            disabled={saving}
            onClick={onReset}
          >
            <RotateCcwIcon />
            Annuler
          </Button>
        ) : null}
        <Button
          type="button"
          disabled={saving || (!dirty && !unsaved)}
          onClick={onSave}
        >
          {saving ? <Spinner /> : <SaveIcon />}
          Enregistrer
        </Button>
      </div>
    </div>
  )
}
