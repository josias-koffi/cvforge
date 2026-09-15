"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import type { ActionResult } from "@/lib/api"

export function useDocumentEditor<T>(
  initial: T,
  save: (content: T) => Promise<ActionResult>,
  normalize: (content: T) => T = (content) => content
) {
  const [draft, setDraft] = useState(initial)
  const [savedSnapshot, setSavedSnapshot] = useState(() => JSON.stringify(initial))
  const [saving, startSaving] = useTransition()
  const router = useRouter()

  return {
    dirty: JSON.stringify(draft) !== savedSnapshot,
    draft,
    restore: (content: T) => {
      setDraft(content)
      toast.info("Version restaurée dans l'éditeur. Enregistrez pour la conserver.")
    },
    save: () =>
      startSaving(async () => {
        const content = normalize(draft)
        const result = await save(content)

        if (result.ok) {
          setDraft(content)
          setSavedSnapshot(JSON.stringify(content))
          toast.success(result.message)
          router.refresh()
        } else {
          toast.error(result.message)
        }
      }),
    saving,
    setDraft,
  }
}
