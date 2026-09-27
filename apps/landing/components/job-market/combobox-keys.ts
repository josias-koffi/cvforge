/**
 * What a key does in the job combobox (US-137), kept apart from React so it is
 * tested without a DOM: the arrows move through the list and wrap, Enter picks
 * the highlighted option, Escape closes.
 */
export type ComboboxAction =
  | { type: "move"; index: number }
  | { type: "pick"; index: number }
  | { type: "close" }
  | null

export function comboboxAction(
  key: string,
  active: number,
  count: number,
  open: boolean
): ComboboxAction {
  switch (key) {
    case "ArrowDown":
      return count === 0 ? null : { type: "move", index: (active + 1) % count }
    case "ArrowUp":
      return count === 0
        ? null
        : { type: "move", index: active <= 0 ? count - 1 : active - 1 }
    case "Enter":
      return open && active >= 0 && active < count
        ? { type: "pick", index: active }
        : null
    case "Escape":
      return open ? { type: "close" } : null
    default:
      return null
  }
}
