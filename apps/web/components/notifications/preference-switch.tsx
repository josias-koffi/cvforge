"use client"

import { useOptimistic, useTransition } from "react"
import type { NotificationEmailPreferences } from "@cvforge/types"
import { toast } from "sonner"

import { updateEmailPreference } from "@/app/(app)/notifications/actions"
import { Field, FieldContent, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Switch } from "@/components/ui/switch"

export function PreferenceSwitch({
  description,
  disabled,
  enabled,
  label,
  preference,
}: {
  description: string
  disabled?: boolean
  enabled: boolean
  label: string
  preference: keyof NotificationEmailPreferences
}) {
  const [optimistic, setOptimistic] = useOptimistic(enabled)
  const [, startTransition] = useTransition()

  return (
    <Field orientation="horizontal">
      <FieldContent>
        <FieldLabel htmlFor={preference}>{label}</FieldLabel>
        <FieldDescription>{description}</FieldDescription>
      </FieldContent>
      <Switch
        id={preference}
        checked={optimistic}
        disabled={disabled}
        onCheckedChange={(checked) =>
          startTransition(async () => {
            setOptimistic(checked)
            const result = await updateEmailPreference(preference, checked)
            if (result.ok) {
              toast.success(result.message)
            } else {
              toast.error(result.message)
            }
          })
        }
      />
    </Field>
  )
}
