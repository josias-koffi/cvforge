"use client"

import type { ComponentProps } from "react"
import { CopyIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"

/** Copies `value` to the clipboard and says so. */
export function CopyButton({
  value,
  children,
  ...props
}: { value: string } & ComponentProps<typeof Button>) {
  const copy = async () => {
    await navigator.clipboard.writeText(value)
    toast.success("Copié.")
  }

  return (
    <Button variant="outline" {...props} onClick={copy}>
      <CopyIcon />
      {children}
    </Button>
  )
}
