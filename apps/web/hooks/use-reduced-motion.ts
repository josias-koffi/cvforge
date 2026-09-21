import * as React from "react"

const QUERY = "(prefers-reduced-motion: reduce)"

function subscribe(onChange: () => void) {
  const mql = window.matchMedia(QUERY)
  mql.addEventListener("change", onChange)
  return () => mql.removeEventListener("change", onChange)
}

/**
 * Whether the visitor asked for less movement.
 *
 * `globals.css` already freezes CSS animations for them, but anything driven
 * by a render loop — a canvas, a shader — never sees that rule and has to ask
 * here. The server snapshot is `false`: the query cannot be answered there,
 * and the first client render corrects it.
 */
export function usePrefersReducedMotion() {
  return React.useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false
  )
}
