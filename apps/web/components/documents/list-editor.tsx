"use client"

import { useState } from "react"
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import { restrictToVerticalAxis } from "@dnd-kit/modifiers"
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import type { Locale } from "@cvforge/types"
import { GripVerticalIcon, PlusIcon, Trash2Icon } from "lucide-react"

import { CurrentCheckbox, DateField } from "@/components/documents/date-field"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { datePatch, periodPatch, type DateSpecKeys, type PeriodSpecKeys } from "@/lib/date-patch"
import { moveItem } from "@/lib/reorder"
import { cn } from "@/lib/utils"

type BaseSpec<T> = { key: keyof T & string; label: string; wide?: boolean }

export type TextSpec<T> = BaseSpec<T> & {
  /** "lines" edits a string[] as one entry per line. */
  type?: "text" | "multiline" | "lines"
}

export type FieldSpec<T> =
  | TextSpec<T>
  /** Date structurée (`key`) ; l'ancien texte libre (`legacyKey`) est régénéré à chaque édition. */
  | (BaseSpec<T> & { type: "date" } & DateSpecKeys)
  /** Début / fin / en cours ; `key` est la date de début. */
  | (BaseSpec<T> & { type: "period" } & PeriodSpecKeys)

type FieldValue = string | string[]
type Patch = Record<string, unknown>

function ItemSpecField<T extends object>({
  id,
  item,
  locale,
  onPatch,
  spec,
}: {
  id: string
  item: T
  locale: Locale
  onPatch: (patch: Patch) => void
  spec: FieldSpec<T>
}) {
  const inputId = `${id}-${spec.key}`
  const record = item as Record<string, unknown>
  const text = (key: string) => String(record[key] ?? "")

  if (spec.type === "date") {
    return (
      <DateField
        id={inputId}
        label={spec.label}
        legacy={text(spec.legacyKey)}
        locale={locale}
        value={text(spec.key)}
        onChange={(value) => onPatch(datePatch(spec, value, locale))}
      />
    )
  }

  if (spec.type === "period") {
    const current = record[spec.currentKey] === true
    const hasStructured = Boolean(text(spec.key) || text(spec.endKey) || current)
    const legacyStart = text(spec.legacyStartKey)
    const legacyEnd = spec.legacyEndKey ? text(spec.legacyEndKey) : ""
    const change = (part: Parameters<typeof periodPatch>[2]) =>
      onPatch(periodPatch({ ...spec, startKey: spec.key }, record, part, locale))
    return (
      <div className="flex flex-col gap-3 @lg/editor:col-span-full">
        <div className="grid gap-4 @lg/editor:grid-cols-2">
          <DateField
            id={`${inputId}-start`}
            label="Début"
            legacy={hasStructured ? "" : legacyStart}
            locale={locale}
            value={text(spec.key)}
            onChange={(start) => change({ start })}
          />
          {current ? (
            <Field>
              <FieldLabel>Fin</FieldLabel>
              <p className="text-sm text-muted-foreground">En cours</p>
            </Field>
          ) : (
            <DateField
              id={`${inputId}-end`}
              label="Fin"
              legacy={hasStructured ? "" : legacyEnd}
              locale={locale}
              value={text(spec.endKey)}
              onChange={(end) => change({ end })}
            />
          )}
        </div>
        <CurrentCheckbox
          id={`${inputId}-current`}
          checked={current}
          onChange={(value) => change({ current: value })}
        />
      </div>
    )
  }

  return (
    <SpecField
      id={id}
      spec={spec}
      value={record[spec.key] as FieldValue}
      onChange={(next) => onPatch({ [spec.key]: next })}
    />
  )
}

export function SpecField<T extends object>({
  id,
  onChange,
  spec,
  value,
}: {
  id: string
  onChange: (value: FieldValue) => void
  spec: TextSpec<T>
  value: FieldValue
}) {
  const inputId = `${id}-${spec.key}`

  return (
    <Field className={spec.wide || spec.type ? "@lg/editor:col-span-full" : undefined}>
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
        <Input id={inputId} value={value as string} onChange={(event) => onChange(event.target.value)} />
      )}
    </Field>
  )
}

/** Field rows; `columns` is the widest count, reached progressively as the editor grows. */
export function FieldGrid({
  children,
  columns = 2,
}: {
  children: React.ReactNode
  columns?: 2 | 3
}) {
  return (
    <div
      className={cn(
        "grid gap-4 @lg/editor:grid-cols-2",
        columns === 3 && "@4xl/editor:grid-cols-3"
      )}
    >
      {children}
    </div>
  )
}

type ListEditorProps<T extends object> = {
  addLabel: string
  createItem: () => NoInfer<T>
  fields: FieldSpec<T>[]
  id: string
  itemTitle: (item: T, index: number) => string
  items: T[]
  /** Langue du document : format des dates et noms de mois. */
  locale?: Locale
  onChange: (items: T[]) => void
}

let idSequence = 0
const nextItemId = () => `item-${++idSequence}`

/** Ids propres à l'interface (jamais enregistrés) pour que les clés suivent les éléments déplacés. */
function useItemIds(length: number) {
  const [ids, setIds] = useState(() => Array.from({ length }, nextItemId))
  let current = ids

  // Liste modifiée de l'extérieur (import, restauration) : on réaligne les ids.
  if (ids.length !== length) {
    current =
      ids.length > length
        ? ids.slice(0, length)
        : [...ids, ...Array.from({ length: length - ids.length }, nextItemId)]
    setIds(current)
  }

  return [current, setIds] as const
}

function SortableItem({
  children,
  id,
  title,
  onRemove,
}: {
  children: React.ReactNode
  id: string
  onRemove: () => void
  title: string
}) {
  const { attributes, isDragging, listeners, setActivatorNodeRef, setNodeRef, transform, transition } =
    useSortable({ id })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn("rounded-lg border bg-background p-4", isDragging && "relative z-10 shadow-lg")}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1">
          <Button
            ref={setActivatorNodeRef}
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <GripVerticalIcon />
            <span className="sr-only">Déplacer {title}</span>
          </Button>
          <span className="truncate text-sm font-medium">{title}</span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 text-muted-foreground"
          onClick={onRemove}
        >
          <Trash2Icon />
          <span className="sr-only">Supprimer</span>
        </Button>
      </div>
      {children}
    </div>
  )
}

export function ListEditor<T extends object>({
  addLabel,
  createItem,
  fields,
  id,
  itemTitle,
  items,
  locale = "fr",
  onChange,
}: ListEditorProps<T>) {
  const [ids, setIds] = useItemIds(items.length)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const patch = (index: number, changes: Patch) =>
    onChange(items.map((item, current) => (current === index ? { ...item, ...changes } : item)))

  const remove = (index: number) => {
    setIds(ids.filter((_, current) => current !== index))
    onChange(items.filter((_, current) => current !== index))
  }

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over) return
    const from = ids.indexOf(String(active.id))
    const to = ids.indexOf(String(over.id))
    const reordered = moveItem(items, from, to)
    if (reordered === items) return
    setIds(moveItem(ids, from, to))
    onChange(reordered)
  }

  return (
    <div className="flex flex-col gap-4">
      <DndContext
        id={`${id}-dnd`}
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis]}
        onDragEnd={onDragEnd}
      >
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          {items.map((item, index) => (
            <SortableItem
              key={ids[index]}
              id={ids[index]}
              title={itemTitle(item, index)}
              onRemove={() => remove(index)}
            >
              <FieldGrid>
                {fields.map((spec) => (
                  <ItemSpecField
                    key={spec.key}
                    id={`${id}-${index}`}
                    item={item}
                    locale={locale}
                    spec={spec}
                    onPatch={(changes) => patch(index, changes)}
                  />
                ))}
              </FieldGrid>
            </SortableItem>
          ))}
        </SortableContext>
      </DndContext>
      <Button
        type="button"
        variant="outline"
        className="self-start"
        onClick={() => {
          setIds([...ids, nextItemId()])
          onChange([...items, createItem()])
        }}
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
