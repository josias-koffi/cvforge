import type { CSSProperties } from "react"

/** Entrance order for the `rise-in` utility: each step waits 200 ms more. */
export function stagger(step: number) {
  return { "--stagger": step * 4 } as CSSProperties
}
