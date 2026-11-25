"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

import type { BaseProfile } from "@/lib/profile-model"

type Sync = {
  dirty: boolean
  /** The profile the server page rendered, refreshed by `router.refresh()`. */
  initialProfile: BaseProfile
  savedProfile: BaseProfile
  setProfile: (profile: BaseProfile) => void
  setSavedProfile: (profile: BaseProfile) => void
}

/**
 * Keeps the editor on the stored profile while nothing is being edited.
 *
 * An agent can write to the profile through the MCP server while the page is
 * open. Coming back to the tab re-renders the server page; when the stored
 * version is newer than the one loaded and the form holds no unsaved edit, the
 * form adopts it. With unsaved edits it is left alone: the save will then be
 * refused as a conflict rather than erase the agent's changes.
 */
export function useServerProfileSync({
  dirty,
  initialProfile,
  savedProfile,
  setProfile,
  setSavedProfile,
}: Sync) {
  const router = useRouter()

  useEffect(() => {
    if (dirty) return

    const refresh = () => {
      if (document.visibilityState === "visible") router.refresh()
    }

    window.addEventListener("focus", refresh)
    document.addEventListener("visibilitychange", refresh)
    return () => {
      window.removeEventListener("focus", refresh)
      document.removeEventListener("visibilitychange", refresh)
    }
  }, [dirty, router])

  const serverSavedAt = initialProfile.meta.lastSavedAt
  const loadedSavedAt = savedProfile.meta.lastSavedAt

  useEffect(() => {
    if (dirty || !serverSavedAt || serverSavedAt === loadedSavedAt) return
    if (loadedSavedAt && serverSavedAt < loadedSavedAt) return

    setProfile(initialProfile)
    setSavedProfile(initialProfile)
    // Only a newer stored save should replace the form, not every new object.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty, serverSavedAt, loadedSavedAt])
}
