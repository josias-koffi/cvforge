import type { LucideIcon } from "lucide-react"
import { cn } from "cn"

import { Button } from "@/components/ui/button"

export type ChipAction = {
  icon: LucideIcon
  label: string
  onClick: () => void
}

/**
 * A job or a skill, with what can be done to it right there. Shared by the
 * ROME jobs and the CV skills, which are decided the same way: one click,
 * applied at once.
 */
export function SearchChip({
  actions,
  children,
  disabled,
  title,
  tone = "outline",
}: {
  actions: ChipAction[]
  children: React.ReactNode
  disabled: boolean
  title?: string
  tone?: "outline" | "solid"
}) {
  return (
    <li
      title={title}
      className={cn(
        "flex items-center gap-1 rounded-md py-1 pr-1 pl-3 text-sm",
        tone === "solid"
          ? "bg-primary text-primary-foreground"
          : "border border-border bg-background"
      )}
    >
      {children}
      {actions.map(({ icon: Icon, label, onClick }) => (
        <Button
          key={label}
          type="button"
          size="icon"
          variant="ghost"
          className="size-7"
          disabled={disabled}
          aria-label={label}
          onClick={onClick}
        >
          <Icon className="size-4" />
        </Button>
      ))}
    </li>
  )
}
