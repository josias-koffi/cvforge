"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

/**
 * The path a click on this link would open inside the app, or null when the
 * click should go through untouched: a new tab, a download, another site, or
 * an anchor on the same page (the outline's links).
 */
export function guardedHref(
  link: HTMLAnchorElement,
  event: Pick<
    MouseEvent,
    "altKey" | "button" | "ctrlKey" | "metaKey" | "shiftKey"
  >,
  current: Location
) {
  if (
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  ) {
    return null
  }
  if (link.target && link.target !== "_self") return null
  if (link.hasAttribute("download")) return null

  const url = new URL(link.href, current.href)

  if (url.origin !== current.origin) return null
  if (url.pathname === current.pathname && url.search === current.search)
    return null

  return `${url.pathname}${url.search}${url.hash}`
}

/**
 * Asks before unsaved edits are lost: on a link inside the app, with a dialog;
 * on closing or reloading the tab, with the browser's own prompt.
 *
 * The click is caught on the document, in the capture phase, before Next's
 * Link handles it — so every link counts, the breadcrumb and the sidebar
 * included, without each one having to know about the form.
 */
export function UnsavedChangesGuard({ dirty }: { dirty: boolean }) {
  const router = useRouter()
  const [target, setTarget] = useState<string | null>(null)

  useEffect(() => {
    if (!dirty) return

    const onClick = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest?.("a[href]")
      if (!(link instanceof HTMLAnchorElement)) return

      const href = guardedHref(link, event, window.location)
      if (!href) return

      event.preventDefault()
      event.stopPropagation()
      setTarget(href)
    }
    const onUnload = (event: BeforeUnloadEvent) => event.preventDefault()

    document.addEventListener("click", onClick, true)
    window.addEventListener("beforeunload", onUnload)
    return () => {
      document.removeEventListener("click", onClick, true)
      window.removeEventListener("beforeunload", onUnload)
    }
  }, [dirty])

  return (
    <AlertDialog
      open={target !== null}
      onOpenChange={(open) => !open && setTarget(null)}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Modifications non enregistrées</AlertDialogTitle>
          <AlertDialogDescription>
            Vos modifications seront perdues si vous quittez cette page sans
            enregistrer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Rester sur la page</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              if (target) router.push(target)
              setTarget(null)
            }}
          >
            Quitter sans enregistrer
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
