"use client"

import { useState } from "react"
import type { Locale } from "@cvforge/types"
import { LanguagesIcon } from "lucide-react"

import { translateDocument } from "@/app/(app)/candidatures/[id]/documents-actions"
import { ActionButton } from "@/components/feedback/action-button"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { creditCostLabel } from "@/lib/format"

const languageLabels: Record<Locale, string> = { en: "Anglais", fr: "Français" }

export function TranslateDialog({
  currentLanguage,
  disabled,
  kind,
  offerId,
}: {
  currentLanguage?: Locale
  /** Unsaved edits would be lost: the translation starts from the saved document. */
  disabled: boolean
  kind: "cv" | "letter"
  offerId: string
}) {
  const [open, setOpen] = useState(false)
  const [target, setTarget] = useState<Locale>(currentLanguage === "en" ? "fr" : "en")
  const documentLabel = kind === "cv" ? "le CV" : "la lettre"

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          title={disabled ? "Enregistrez vos modifications avant de traduire" : undefined}
        >
          <LanguagesIcon />
          Traduire
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Traduire {documentLabel}</DialogTitle>
          <DialogDescription>
            Tout le contenu est traduit dans la langue choisie, vos modifications comprises.
            Votre nom et vos coordonnées ne sont pas envoyés à l&apos;IA. La version actuelle reste
            dans l&apos;historique.{" "}
            {creditCostLabel(kind === "cv" ? "cv_generation" : "letter_generation")}.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <ToggleGroup
            type="single"
            value={target}
            onValueChange={(value) => value && setTarget(value as Locale)}
            variant="outline"
          >
            {(["en", "fr"] as const).map((locale) => (
              <ToggleGroupItem key={locale} value={locale}>
                {languageLabels[locale]}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          {currentLanguage ? (
            <p className="text-xs text-muted-foreground">
              Langue actuelle : {languageLabels[currentLanguage]}
            </p>
          ) : null}
        </div>
        <DialogFooter>
          <ActionButton
            spark
            pendingLabel="Traduction en cours…"
            action={async () => {
              const result = await translateDocument(offerId, kind, target)
              if (result.ok) setOpen(false)
              return result
            }}
          >
            <LanguagesIcon />
            Traduire en {languageLabels[target].toLowerCase()}
          </ActionButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
