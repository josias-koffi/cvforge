"use client"

import { PlusIcon, Trash2Icon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

export type FieldSpec<T> = {
  key: keyof T & string
  label: string
  /** "lines" edits a string[] as one entry per line. */
  type?: "text" | "multiline" | "lines"
  wide?: boolean
}

type FieldValue = string | string[]

export function SpecField<T extends object>({
  id,
  onChange,
  spec,
  value,
}: {
  id: string
  onChange: (value: FieldValue) => void
  spec: FieldSpec<T>
  value: FieldValue
}) {
  const inputId = `${id}-${spec.key}`

  return (
    <Field className={spec.wide || spec.type ? "@lg/editor:col-span-2" : undefined}>
      <FieldLabel htmlFor={inputId}>{spec.label}</FieldLabel>
      {spec.type === "lines" ? (
        <Textarea
          id={inputId}
          rows={4}
          value={(value as string[]).join("\n")}
          onChange={(event) => onChange(event.target.value.split("\n"))}
        />
      ) : spec.type === "multiline" ? (
        <Textarea
          id={inputId}
          rows={4}
          value={value as string}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <Input
          id={inputId}
          value={value as string}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </Field>
  )
}

export function FieldGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 @lg/editor:grid-cols-2">{children}</div>
}

type ListEditorProps<T extends object> = {
  addLabel: string
  createItem: () => T
  fields: FieldSpec<T>[]
  id: string
  itemTitle: (item: T, index: number) => string
  items: T[]
  onChange: (items: T[]) => void
}

export function ListEditor<T extends object>({
  addLabel,
  createItem,
  fields,
  id,
  itemTitle,
  items,
  onChange,
}: ListEditorProps<T>) {
  const update = (index: number, key: keyof T, value: FieldValue) =>
    onChange(items.map((item, current) => (current === index ? { ...item, [key]: value } : item)))

  return (
    <div className="flex flex-col gap-4">
      {items.map((item, index) => (
        <div key={index} className="rounded-lg border p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <span className="truncate text-sm font-medium">{itemTitle(item, index)}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 text-muted-foreground"
              onClick={() => onChange(items.filter((_, current) => current !== index))}
            >
              <Trash2Icon />
              <span className="sr-only">Supprimer</span>
            </Button>
          </div>
          <FieldGrid>
            {fields.map((spec) => (
              <SpecField
                key={spec.key}
                id={`${id}-${index}`}
                spec={spec}
                value={(item as Record<string, unknown>)[spec.key] as FieldValue}
                onChange={(value) => update(index, spec.key, value)}
              />
            ))}
          </FieldGrid>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        className="self-start"
        onClick={() => onChange([...items, createItem()])}
      >
        <PlusIcon />
        {addLabel}
      </Button>
    </div>
  )
}

/** Drops blank lines produced while typing in "lines" fields. */
export function cleanLines(values: string[]) {
  return values.map((value) => value.trim()).filter(Boolean)
}
