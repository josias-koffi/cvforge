"use client"

import { useEffect, useRef, useState } from "react"

/** A commune as the official directory (geo.api.gouv.fr) describes it. */
export type Commune = {
  code: string
  nom: string
  departement?: { code: string }
  centre?: { coordinates: [number, number] }
}

const GEO_API = "https://geo.api.gouv.fr/communes"
const SEARCH_DEBOUNCE_MS = 250
const MIN_QUERY_LENGTH = 2

/**
 * The communes a typed name may mean, the most populous first, from the
 * official directory — so the INSEE code and the department come with them.
 *
 * Debounced, and each new letter cancels the request before it: the answers
 * cannot arrive out of order. Offline, the list is simply empty.
 */
export function useCommuneSearch(query: string, limit = 5) {
  const [matches, setMatches] = useState<Commune[]>([])
  const [answered, setAnswered] = useState("")
  const abortRef = useRef<AbortController | null>(null)
  const term = query.trim()

  useEffect(() => {
    if (term.length < MIN_QUERY_LENGTH) return

    const timer = setTimeout(async () => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      try {
        const url = `${GEO_API}?nom=${encodeURIComponent(term)}&fields=departement,centre&boost=population&limit=${limit}`
        const response = await fetch(url, { signal: controller.signal })
        setMatches(response.ok ? ((await response.json()) as Commune[]) : [])
        setAnswered(term)
      } catch {
        // Offline or aborted: no suggestions, the field still works.
        if (!controller.signal.aborted) setMatches([])
      }
    }, SEARCH_DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [term, limit])

  // Under two letters there is nothing to suggest; the last answer is not
  // shown for a term it was not given for.
  const current = term.length >= MIN_QUERY_LENGTH ? matches : []

  return {
    matches: current,
    /** Whether `matches` answers what is typed now, not a few letters ago. */
    settled: term.length >= MIN_QUERY_LENGTH && answered === term,
  }
}
